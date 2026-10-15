// 🔬 The decision log (js/research.js + eco.onDecision in js/sim.js): recording leaves the
// world exactly as it was, records are well formed and closed with what really happened,
// rules / mind / fallback are told apart, and the measures give known answers.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import {
    createRecorder, summarize, byCondition, windows, trend, fitBeta, entropy, jsDivergence, thoughtFeatures,
    toJSONL, fromJSONL, loadResearchSettings, saveResearchSettings, twoProportions, newRunId
} from '../js/research.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
const load = () => {
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = read(stem + '.json');
    return buildWorld(raw);
};
const SPD = 240;
const fingerprint = eco => JSON.stringify({ stats: eco.stats, wallets: [...eco.agents.values()].map(a => [a.id, Math.round(a.wallet), a.at, a.stage]) });

// ------------------------------------------------ recording changes nothing
{
    const plain = createEconomy(load(), { seed: 5, secondsPerDay: SPD });
    const watched = createEconomy(load(), { seed: 5, secondsPerDay: SPD });
    const recs = [];
    const rec = createRecorder(watched, { run: 'test', sink: r => recs.push(r) });
    for (let i = 0; i < 2 * SPD; i++) { plain.step(1); watched.step(1); }
    assert.equal(fingerprint(watched), fingerprint(plain), 'the same seed gives the same world with or without the log');
    assert.ok(rec.count > 100, `decisions recorded (${rec.count})`);
    const pend = rec.pending;
    rec.flush();
    assert.equal(recs.length, rec.count);
    assert.equal(recs.filter(r => r.out === null).length, pend, 'open records close on flush without an outcome');
    for (const r of recs) {
        assert.equal(r.v, 1); assert.equal(r.run, 'test'); assert.equal(r.by, 'rules'); assert.equal(r.cond, 'rules');
        assert.ok(watched.agents.has(r.agent));
        assert.ok(r.cands.length >= 1 && r.cands.length <= 5);
        for (let i = 1; i < r.cands.length; i++) assert.ok(r.cands[i - 1].score >= r.cands[i].score, 'candidates are sorted by the rules\' score');
        assert.ok(Number.isInteger(r.chosen) && r.chosen >= -1 && r.chosen < r.cands.length);
        if (r.chosen >= 0) assert.equal(r.cands[r.chosen].kind, r.kind);
        assert.ok(!('thought' in r) && !('prompt' in r), 'the rules have no thoughts');
    }
    // an outcome is the wallet's change until the same resident's next decision
    const mine = recs.filter(r => r.agent === recs[0].agent).sort((a, b) => a.T - b.T);
    for (let i = 0; i + 1 < mine.length; i++) {
        assert.equal(mine[i].out.dWallet, mine[i + 1].wallet - mine[i].wallet);
        assert.ok(mine[i].out.dT > 0);
    }
    rec.stop();
    const before = rec.count;
    for (let i = 0; i < SPD; i++) watched.step(1);
    assert.equal(rec.count, before, 'a stopped recorder records nothing');
}

// ------------------------------------------------ a mind's choices, and its fallbacks
async function runWith(mind, days = 1) {
    const eco = createEconomy(load(), { seed: 9, secondsPerDay: SPD, mind });
    const recs = [];
    const rec = createRecorder(eco, { sink: r => recs.push(r) });
    for (let i = 0; i < days * SPD; i++) { eco.step(1); await new Promise(r => setImmediate(r)); }
    rec.flush();
    return recs;
}
{
    const second = { wants: () => true, covers: () => true, now: () => 0, patience: 1e9,
        ask: async (a, opts) => ({ choice: Math.min(2, opts.length), thought: '前に安かったから、また行こう', model: 'fake-1', ms: 12, raw: '{"choice":2}' }) };
    const recs = await runWith(second);
    const m = recs.filter(r => r.by === 'mind');
    assert.ok(m.length > 30, `mind decisions (${m.length})`);
    assert.ok(m.every(r => r.cond === 'mind' && r.model === 'fake-1' && r.thought.startsWith('前に') && r.raw === '{"choice":2}'));
    assert.ok(m.every(r => r.chosen === Math.min(1, r.cands.length - 1)), 'choice 2 is index 1 of the same candidates');
    assert.ok(m.every(r => Number.isFinite(r.ms)));
    const s = summarize(m);
    assert.equal(s.top1, 0, 'never the rules\' first choice');
    assert.equal(s.thoughts.share.memory, 1);
    assert.equal(s.thoughts.share.reason, 1);
    assert.equal(s.thoughts.repeatShare > 0.9, true);

    const silent = { wants: () => true, covers: () => true, now: () => 0, patience: 1e9, ask: async () => null };
    const f = await runWith(silent);
    assert.ok(f.some(r => r.by === 'fallback') && f.filter(r => r.by === 'fallback').every(r => !r.thought), 'a mind that does not answer leaves the rules to choose');
    assert.ok(byCondition(f).fallback.n > 0);
}

// ------------------------------------------------ measures with known answers
assert.equal(entropy({ a: 1, b: 1 }), 1);
assert.equal(entropy({ a: 4 }), 0);
assert.equal(entropy({}), 0);
assert.equal(jsDivergence({ a: 1 }, { a: 3 }), 0);
assert.equal(jsDivergence({ a: 1 }, { b: 1 }), 1);
assert.equal(jsDivergence({}, { a: 1 }), null);
{
    // a strict maximiser fits a large β; a uniform chooser fits β ≈ 0
    const cands = [{ score: 1, profit: 10 }, { score: 0.6, profit: 6 }, { score: 0.3, profit: 3 }];
    const maxi = Array.from({ length: 60 }, () => ({ cands, chosen: 0 }));
    const unif = Array.from({ length: 60 }, (_, i) => ({ cands, chosen: i % 3 }));
    assert.ok(fitBeta(maxi).beta >= 50 && fitBeta(maxi).atEdge);
    assert.ok(fitBeta(unif).beta <= 0.5);
    assert.equal(fitBeta(maxi.slice(0, 3)), null, 'too few choices to fit');
}
{
    const tf = thoughtFeatures(['I am tired, rest now', '儲けが出るから売りに行く', '儲けが出るから売りに行く', '', null]);
    assert.equal(tf.n, 3);
    assert.equal(tf.share.emotion, 1 / 3);
    assert.equal(tf.share.money, 2 / 3);
    assert.equal(tf.repeatShare, +(1 / 3).toFixed(3));
    assert.equal(thoughtFeatures([]), null);
}
{
    const rows = [{ from: 0, to: 1, top1: 0.5 }, { from: 1, to: 2, top1: 0.6 }, { from: 2, to: 3, top1: 0.7 }];
    assert.equal(trend(rows, 'top1'), 0.1);
    assert.equal(trend(rows.slice(0, 2), 'top1'), null);
    const t = twoProportions(80, 100, 50, 100);
    assert.equal(t.diff, 0.3); assert.ok(t.z > 4);
    const w = windows([{ T: 0.1, cands: [{ kind: 'rest', score: 1, profit: 0 }], chosen: 0, kind: 'rest' }, { T: 1.5, cands: [{ kind: 'work', score: 1, profit: 1 }], chosen: 0, kind: 'work' }], 1);
    assert.deepEqual(w.map(x => [x.from, x.n]), [[0, 1], [1, 1]]);
}

// ------------------------------------------------ files and settings
{
    const recs = [{ v: 1, cands: [], chosen: -1 }, { v: 1, cands: [{ kind: 'x' }], chosen: 0 }];
    const back = fromJSONL(toJSONL(recs) + '{broken\n{"no":"cands"}\n');
    assert.deepEqual(back, recs, 'round trip; broken lines and non-records are skipped');
    assert.equal(toJSONL([]), '');
    const m = new Map(), st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
    assert.deepEqual(loadResearchSettings(st), { on: false, run: null }, 'off unless turned on');
    saveResearchSettings(st, { on: true, run: 'run-x' });
    assert.deepEqual(loadResearchSettings(st), { on: true, run: 'run-x' });
    m.set('zipangu.research.v1', '{"on":"yes","run":"<img>"}');
    assert.deepEqual(loadResearchSettings(st), { on: false, run: null });
    assert.match(newRunId(() => 0.5), /^run-\d{4}-\d\d-\d\d-[0-9a-z]+$/);
}
console.log('research tests passed');
