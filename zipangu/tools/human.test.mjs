// 🙋 "You decide" (js/human.js): the person gets exactly the candidates a mind gets, their pick
// steers the resident and is logged as "human", everyone else is decided as before, and a
// released resident goes straight back to the rules.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { createRecorder, byCondition, groupKey, distanceToHuman, summarize } from '../js/research.js';
import { createHumanMind, loadHumanSettings, saveHumanSettings, MAX_HUMAN } from '../js/human.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
const load = () => {
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = read(stem + '.json');
    return buildWorld(raw);
};
const SPD = 240;
const tick = () => new Promise(r => setImmediate(r));

// ------------------------------------------------ settings
{
    const m = new Map(), st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
    assert.deepEqual(loadHumanSettings(st), { agents: [], holdTime: true });
    saveHumanSettings(st, { agents: ['a', 'b'], holdTime: false });
    assert.deepEqual(loadHumanSettings(st), { agents: ['a', 'b'], holdTime: false });
    m.set('zipangu.human.v1', '{"agents":["x","x","<img>","y","z","w"],"holdTime":"no"}');
    assert.deepEqual(loadHumanSettings(st), { agents: ['x', 'y', 'z'], holdTime: true }, `deduplicated, cleaned, at most ${MAX_HUMAN}`);
    m.set('zipangu.human.v1', 'nonsense');
    assert.deepEqual(loadHumanSettings(st), { agents: [], holdTime: true });
}

// ------------------------------------------------ a person decides for two residents in a running city
{
    const W = load();
    const ids = [...W.byId.agent.keys()];
    const [me1, me2] = ids;
    const human = createHumanMind({ agents: [me1, me2] });
    assert.ok(human.has(me1) && !human.has(ids[5]));
    assert.equal(human.adopt(ids[2]), true);
    assert.equal(human.adopt(ids[3]), false, 'at most three');
    human.release(ids[2]);
    const eco = createEconomy(W, { seed: 4, secondsPerDay: SPD, mind: human });
    const recs = [];
    const rec = createRecorder(eco, { sink: r => recs.push(r), cohortOf: human.cohortOf, kindOf: human.kindOf });
    let asked = 0, n = 0;
    const seen = [];
    human.onQueue(q => { asked = Math.max(asked, q.length); });
    for (let i = 0; i < 2 * SPD; i++) {
        eco.step(1);
        await tick();
        // the person answers whatever is waiting: always the last option, with a reason
        while (human.queue.length) {
            const q = human.queue[0];
            seen.push(q);
            n++;
            human.answer(q.id, n % 5 === 0 ? null : q.options.length, n % 2 ? 'なんとなく、遠くへ行ってみたい' : '');
        }
    }
    rec.flush();
    assert.ok(seen.length >= 6, `the person was asked (${seen.length})`);
    assert.ok(seen.every(q => q.agent === me1 || q.agent === me2), 'only for the residents they adopted');
    for (const q of seen) {
        assert.ok(q.options.length >= 2 && q.options.length <= 5);
        assert.ok(q.options.every((o, i) => o.n === i + 1 && typeof o.text === 'string' && o.text.length > 2), 'the same words a model reads');
        assert.ok(Number.isFinite(q.wallet) && q.clock && q.clock.label);
    }
    const mine = recs.filter(r => r.cohort === 'human');
    const picked = mine.filter(r => r.by === 'human');
    assert.ok(picked.length >= 4, `human decisions recorded (${picked.length})`);
    assert.ok(picked.every(r => r.chosen === r.cands.length - 1 && r.model === 'human' && Number.isFinite(r.ms)), 'the last option, as answered');
    assert.ok(picked.some(r => r.thought === 'なんとなく、遠くへ行ってみたい'));
    assert.ok(mine.some(r => r.by === 'fallback'), 'a skipped turn is left to the rules');
    assert.ok(recs.filter(r => r.cohort !== 'human').every(r => r.by === 'rules'), 'everyone else is decided by the rules');
    assert.equal(groupKey(picked[0]), 'human');
    assert.equal(groupKey(mine.find(r => r.by === 'fallback')), 'human·fallback');
    const g = byCondition(recs);
    assert.ok(g.human && g.rules);
    assert.equal(g.human.top1, 0, 'the person never took the rules\' first pick here');
    const d = distanceToHuman(g);
    assert.ok(d.rules && d.rules.mix >= 0 && d.rules.mix <= 1);
    assert.ok(human.logFor(me1).every(e => e.model === 'human'));
    assert.equal(human.status.answered + human.status.skipped, human.status.asked);
    // released: the next decision is the rules' again, and anything waiting is handed back
    human.release(me1); human.release(me2);
    const before = recs.length;
    const rec2 = createRecorder(eco, { sink: r => recs.push(r), cohortOf: human.cohortOf, kindOf: human.kindOf });
    for (let i = 0; i < SPD; i++) { eco.step(1); await tick(); }
    rec2.flush();
    assert.equal(human.queue.length, 0);
    assert.ok(recs.slice(before).every(r => r.by === 'rules' || r.by === 'fallback'));
}

// ------------------------------------------------ with nobody adopted, the city is the plain one
{
    const W1 = load(), W2 = load();
    const a = createEconomy(W1, { seed: 12, secondsPerDay: SPD, mind: createHumanMind({}) });
    const b = createEconomy(W2, { seed: 12, secondsPerDay: SPD });
    for (let i = 0; i < SPD; i++) { a.step(1); b.step(1); }
    assert.equal(JSON.stringify(a.stats), JSON.stringify(b.stats));
}

// ------------------------------------------------ over another mind: its residents are untouched
{
    const W = load();
    const ids = [...W.byId.agent.keys()];
    const model = { status: {}, now: () => 0, patience: 1e9, covers: () => true, wants: () => true, logFor: () => [], cohortOf: () => 'm', kindOf: () => 'mind',
        ask: async (a, opts) => ({ choice: 1, thought: 'model', model: 'fake' }) };
    const human = createHumanMind({ base: model, agents: [ids[0]] });
    assert.equal(human.cohortOf(ids[0]), 'human');
    assert.equal(human.cohortOf(ids[1]), 'm');
    assert.equal(human.kindOf(ids[1]), 'mind');
    const eco = createEconomy(W, { seed: 6, secondsPerDay: SPD, mind: human });
    const recs = [];
    createRecorder(eco, { sink: r => recs.push(r), cohortOf: human.cohortOf, kindOf: human.kindOf });
    for (let i = 0; i < SPD; i++) { eco.step(1); await tick(); while (human.queue.length) human.answer(human.queue[0].id, 1, ''); }
    assert.ok(recs.some(r => r.cohort === 'm' && r.by === 'mind' && r.model === 'fake'));
    assert.ok(recs.filter(r => r.agent === ids[0]).every(r => r.cohort === 'human'));
    assert.ok(summarize(recs.filter(r => r.cohort === 'human' && r.by === 'human')).n >= 1);
}
console.log('human tests passed');
