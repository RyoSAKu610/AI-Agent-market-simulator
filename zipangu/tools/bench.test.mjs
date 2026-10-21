// 🏆 The human-likeness benchmark (js/bench.js, tools/bench.mjs): items are built only from
// people's decisions with every candidate's words, the question a model gets is the city's own,
// a player that chooses as the people did scores 100, and the CLI builds, runs and ranks.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import http from 'node:http';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { createRecorder, toJSONL } from '../js/research.js';
import { createHumanMind } from '../js/human.js';
import { sanitizeRecord } from '../js/donate.js';
import {
    BENCH_VERSION, itemsFromRecords, setHash, splitByDonor, promptFor, rulesPlayer, randomPlayer,
    scorePicks, bootstrap, cleanResult, buildBoard, verificationKey
} from '../js/bench.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'world');
const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
const load = () => {
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = read(stem + '.json');
    return buildWorld(raw);
};
const SPD = 240;

// ------------------------------------------------ people decide in a running city (a scripted "person" for the test)
const W = load();
const ids = [...W.byId.agent.keys()];
const human = createHumanMind({ agents: ids.slice(0, 3) });
const eco = createEconomy(W, { seed: 21, secondsPerDay: SPD, mind: human });
const recs = [];
createRecorder(eco, { sink: r => recs.push(r), cohortOf: human.cohortOf, kindOf: human.kindOf });
let k = 0;
for (let i = 0; i < 3 * SPD; i++) {
    eco.step(1);
    await new Promise(r => setImmediate(r));
    // the test's person: prefers going to see new places, else the second option, sometimes the first
    while (human.queue.length) {
        const q = human.queue[0];
        const visit = q.options.findIndex(o => o.kind === 'visit');
        human.answer(q.id, visit >= 0 ? visit + 1 : (k++ % 3 === 0 ? 1 : Math.min(2, q.options.length)), '気になるから');
    }
}
const humanRecs = recs.filter(r => r.by === 'human');
assert.ok(humanRecs.length >= 8, `people decided (${humanRecs.length})`);
// the record now keeps what the person read
for (const r of humanRecs) {
    assert.ok(r.cands.every(c => typeof c.text === 'string' && c.text.includes('：')), 'each candidate is kept in words');
    assert.ok(typeof r.label === 'string' && r.label && typeof r.sekki === 'string');
    assert.ok(Array.isArray(r.cargo));
}
// …and those words survive a donation
assert.equal(sanitizeRecord(humanRecs[0]).cands[0].text, humanRecs[0].cands[0].text);
assert.equal(sanitizeRecord(humanRecs[0]).label, humanRecs[0].label);

// ------------------------------------------------ items
const items = itemsFromRecords(recs);
assert.equal(items.length, new Set(humanRecs.map(r => [r.agent, r.T].join())).size, 'one item per human decision, nothing else');
assert.ok(items.every(it => it.human >= 1 && it.human <= it.options.length && it.options.every((o, i) => o.n === i + 1)));
assert.deepEqual(itemsFromRecords([...recs, ...recs]).map(i => i.id), items.map(i => i.id), 'the same moment twice counts once');
assert.equal(itemsFromRecords(recs.filter(r => r.by !== 'human')).length, 0);
assert.equal(itemsFromRecords([{ ...humanRecs[0], cands: humanRecs[0].cands.map(c => ({ ...c, text: undefined })) }]).length, 0, 'no words, no item');
assert.equal(setHash(items), setHash(items.slice().reverse()), 'the order does not change the fingerprint');

// ------------------------------------------------ the question is the city's own
{
    const it = items[0];
    const { system, user } = promptFor(W, it);
    const def = W.byId.agent.get(it.agent);
    assert.ok(system.includes('万華京ジパング') && system.includes('{"choice"'));
    assert.ok(def && system.includes(String(def.personality || '').slice(0, 10)), 'the resident\'s own persona');
    it.options.forEach((o, i) => assert.ok(user.includes(`${i + 1}. ${o.text}`), 'each candidate in the same words and order'));
    assert.ok(user.includes(it.situation.label) && user.includes(`第${it.situation.day}日`));
    assert.ok(!user.includes('最近のこと'), 'no recent history in benchmark questions');
    assert.ok(!user.includes(String(it.human) + '番') && !JSON.stringify({ system, user }).includes('"human"'), 'the answer is never in the question');
}

// ------------------------------------------------ scores
{
    const same = scorePicks(items, items.map(i => i.human));
    assert.equal(same.kappa, 1); assert.equal(same.mix, 0); assert.equal(same.top1Gap, 0); assert.equal(same.score, 100);
    const r = scorePicks(items, items.map(rulesPlayer()));
    assert.equal(r.top1, 1);
    assert.ok(r.score < 100);
    const rnd = randomPlayer(3);
    const rr = scorePicks(items, items.map(it => rnd(it)));
    assert.ok(rr.kappa < 0.6 && rr.score < 100);
    const none = scorePicks(items, items.map(() => null));
    assert.equal(none.answered, 0); assert.equal(none.accuracy, 0); assert.ok(none.kappa < 0);
    assert.equal(scorePicks([], []).n, 0);
    const ci = bootstrap(items, items.map(rulesPlayer()));
    assert.deepEqual(ci, bootstrap(items, items.map(rulesPlayer())), 'seeded: the same interval every time');
    assert.ok(ci.score[0] <= r.score + 1e-9 && r.score <= ci.score[1] + 1e-9);
    assert.equal(bootstrap(items.slice(0, 3), [1, 1, 1]), null, 'too few items for an interval');
}

// ------------------------------------------------ split and board
{
    const donorIds = ['d-0123456789abcdef', 'd-0', 'd-1', 'd-2'];
    const withDonors = items.map((it, i) => ({ ...it, donor: donorIds[i % donorIds.length] }));
    const s1 = splitByDonor(withDonors, 0.3, 1), s2 = splitByDonor(withDonors, 0.3, 1);
    assert.deepEqual(s1, s2);
    assert.equal(s1.dev.length + s1.test.length, withDonors.length);
    assert.ok(s1.dev.length > 0 && s1.test.length > 0, 'both sides of the holdout must be non-empty');
    const devDonors = new Set(s1.dev.map(i => i.donor));
    assert.ok(s1.test.every(i => !devDonors.has(i.donor)), 'a donor is on one side only');
    assert.throws(() => splitByDonor(withDonors.map(({ donor, ...item }) => item), 0.3, 1), /donor/i, 'a donorless source must not be split item by item');
    assert.throws(() => splitByDonor(withDonors.filter(i => i.donor === donorIds[0]), 0.3, 1), /two distinct donors/i, 'one donor cannot provide independent dev and test sets');
    const res = (name, score, kind = 'llm') => ({ bench: BENCH_VERSION, date: '2026-10-21', set: { name: 'v1.dev', hash: 'abc', n: 40 }, player: { kind, name, model: name }, metrics: { n: 40, score, kappa: 0.2, accuracy: 0.5, mix: 0.1, top1Gap: 0.1 } });
    const fakeVerified = { ...res('self-attested', 100), verified: true };
    assert.equal(cleanResult(fakeVerified).verified, false, 'submitted result JSON cannot self-assert verification');
    const key = verificationKey(fakeVerified);
    const verified = buildBoard([fakeVerified], { verifiedKeys: new Set([key]) });
    assert.equal(verified.entries[0].verified, true, 'only a matching maintainer manifest key verifies the exact result');
    const changed = { ...fakeVerified, metrics: { ...fakeVerified.metrics, score: 99 } };
    assert.equal(buildBoard([changed], { verifiedKeys: new Set([key]) }).entries[0].verified, false, 'editing verified metrics invalidates the key');
    const board = buildBoard([res('B', 60), res('A', 72), res('rules', 41, 'rules'), { bench: 'other' }, null, res('C', 72)], { updated: 'x' });
    assert.deepEqual(board.entries.map(e => e.name), ['A', 'C', 'B', 'rules']);
    assert.equal(board.entries.find(e => e.name === 'rules').baseline, true);
    assert.equal(cleanResult({ ...res('x', 1), bench: 'zhb-0' }), null, 'another version is not mixed in');
    assert.equal(cleanResult({ ...res('<b>'.repeat(40), 1) }).name.length, 60);
}

// ------------------------------------------------ the command line: build → run (rules, random, an endpoint) → board
{
    const dir = mkdtempSync(join(tmpdir(), 'zhb-'));
    writeFileSync(join(dir, 'log.jsonl'), toJSONL(recs));
    writeFileSync(join(dir, 'donation.json'), JSON.stringify({ donor: 'd-0123456789abcdef', records: humanRecs.slice(0, 2) }));
    writeFileSync(join(dir, 'donation2.json'), JSON.stringify({ donor: 'd-0', records: humanRecs.slice(2, 4) }));
    const cli = (...args) => spawnSync(process.execPath, [join(here, 'bench.mjs'), ...args], { encoding: 'utf8', env: { ...process.env, ZIPANGU_LLM_KEY: '' } });
    let r = cli('build', join(dir, 'log.jsonl'), join(dir, 'donation.json'), '--out', join(dir, 'sets', 'v1'));
    assert.equal(r.status, 0, r.stderr);
    const set = join(dir, 'sets', 'v1.jsonl');
    assert.equal(readFileSync(set, 'utf8').trim().split('\n').length, items.length, 'the donated duplicates are not counted twice');
    r = cli('build', join(dir, 'log.jsonl'), '--out', join(dir, 'sets', 'v2'), '--dev', '0.5');
    assert.notEqual(r.status, 0, 'raw research logs without donor IDs must not create a misleading donor holdout');
    assert.match(r.stderr, /donor/i);
    r = cli('build', join(dir, 'donation.json'), join(dir, 'donation2.json'), '--out', join(dir, 'sets', 'v2'), '--dev', '0.5');
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, 'sets', 'v2.dev.jsonl')) && existsSync(join(dir, 'sets', 'v2.test.jsonl')));
    for (const p of ['rules', 'random']) {
        r = cli('run', '--set', set, '--player', p, '--out', join(dir, 'results', p + '.json'));
        assert.equal(r.status, 0, r.stderr);
    }
    // a stand-in OpenAI-compatible endpoint that always answers 2
    const seen = [];
    const server = http.createServer((req, res) => {
        let body = ''; req.on('data', c => { body += c; });
        req.on('end', () => {
            seen.push(JSON.parse(body));
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ model: 'stand-in', choices: [{ message: { content: '{"choice": 2, "thought": "なんとなく"}' } }] }));
        });
    });
    await new Promise(ok => server.listen(0, '127.0.0.1', ok));
    const port = server.address().port;
    const child = spawn(process.execPath, [join(here, 'bench.mjs'), 'run', '--set', set, '--player', 'llm', '--base', `http://127.0.0.1:${port}/v1`, '--model', 'stand-in', '--name', 'Stand-in', '--out', join(dir, 'results', 'llm.json')], { env: { ...process.env, ZIPANGU_LLM_KEY: '' } });
    let err = ''; child.stderr.on('data', d => { err += d; });
    const code = await new Promise(ok => child.on('close', ok));
    server.close();
    assert.equal(code, 0, err);
    assert.equal(seen.length, items.length, 'one question per item');
    assert.ok(seen.every(b => b.messages.some(m => m.role === 'system') && b.model === 'stand-in'));
    const llm = JSON.parse(readFileSync(join(dir, 'results', 'llm.json'), 'utf8'));
    assert.equal(llm.bench, BENCH_VERSION); assert.equal(llm.player.name, 'Stand-in'); assert.equal(llm.set.n, items.length);
    assert.equal(llm.metrics.answered, items.length);
    assert.equal(llm.metrics.top1, 0, 'it always said 2');
    assert.ok(!JSON.stringify(llm).includes('127.0.0.1'), 'the endpoint is not written into the result');
    const testResultPath = join(dir, 'results', 'held-back-test.json');
    r = cli('run', '--set', join(dir, 'sets', 'v2.test.jsonl'), '--player', 'rules', '--out', testResultPath);
    assert.equal(r.status, 0, r.stderr);
    r = cli('verify-key', testResultPath);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.trim(), 'a held-back test result produces an exact verification key');
    r = cli('verify-key', join(dir, 'results', 'llm.json'));
    assert.notEqual(r.status, 0, 'a dev-set result is not eligible for verification');
    assert.match(r.stderr, /held-back/i);

    r = cli('board', join(dir, 'results'), '--out', join(dir, 'leaderboard.json'), '--sets', join(dir, 'sets'));
    assert.equal(r.status, 0, r.stderr);
    const board = JSON.parse(readFileSync(join(dir, 'leaderboard.json'), 'utf8'));
    assert.equal(board.entries.length, 3);
    assert.ok(board.sets.some(s => s.name === 'v1' && s.n === items.length));
    assert.ok(!board.sets.some(s => s.name.endsWith('.test')), 'the held-back set is never listed');
}
// the board in the repository is valid
{
    const board = JSON.parse(readFileSync(join(here, '..', 'bench', 'leaderboard.json'), 'utf8'));
    assert.equal(board.bench, BENCH_VERSION);
    assert.ok(Array.isArray(board.entries) && Array.isArray(board.sets));
}
console.log('bench tests passed');
