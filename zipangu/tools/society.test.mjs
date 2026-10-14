// 🧪 Mixed societies (js/society.js): cohorts are checked, residents are split in proportion and
// stay put, one face drives many minds, the rules' residents never ask a model, and the
// decision log tells the cohorts apart.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { createRecorder, byCondition, groupKey } from '../js/research.js';
import {
    parseSociety, cohortIdOf, assignCohorts, createSociety, randomMind,
    loadSocietySettings, saveSocietySettings, browserCohorts
} from '../js/society.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
const load = () => {
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = read(stem + '.json');
    return buildWorld(raw);
};
const SPD = 240;

// ------------------------------------------------ describing a society
assert.equal(cohortIdOf('qwen/qwen-2.5-72b-instruct'), 'qwen-2.5-72b-instruct');
assert.equal(cohortIdOf('Moonshot AI/Kimi K2!'), 'kimi-k2');
{ const taken = new Set(); assert.equal(cohortIdOf('a/x', taken), 'x'); assert.equal(cohortIdOf('b/x', taken), 'x-2'); }
{
    const p = parseSociety({ base: 'https://openrouter.ai/api/v1', cohorts: [
        { id: 'rules', share: 10 }, { kind: 'random', share: 2 }, { model: 'qwen/qwen-2.5-72b-instruct', share: 5 }, { model: 'deepseek/deepseek-chat', share: 5, base: 'https://api.deepseek.com', keyEnv: 'DS_KEY' }] });
    assert.ok(p.ok, p.errors);
    assert.deepEqual(p.cohorts.map(c => [c.id, c.kind]), [['rules', 'rules'], ['random', 'random'], ['qwen-2.5-72b-instruct', 'mind'], ['deepseek-chat', 'mind']]);
    assert.equal(p.cohorts[2].base, 'https://openrouter.ai/api/v1', 'the shared base');
    assert.equal(p.cohorts[3].base, 'https://api.deepseek.com', 'a cohort may have its own');
    assert.equal(p.cohorts[3].keyEnv, 'DS_KEY');
    assert.equal(p.cohorts[0].base, null, 'the rules need no endpoint');
}
{
    const ex = parseSociety(JSON.parse(readFileSync(join(root, '..', 'tools', 'society.example.json'), 'utf8')));
    assert.ok(ex.ok, 'the example file in the docs is valid');
    assert.equal(ex.cohorts.find(c => c.id === 'qwen-local').base, 'http://localhost:11434/v1');
}
assert.equal(parseSociety({}).ok, false);
assert.equal(parseSociety({ cohorts: [{ id: 'a' }, { id: 'a' }] }).ok, false, 'ids are unique');
assert.equal(parseSociety({ cohorts: [{ id: 'Bad Id!' }] }).ok, false);
assert.equal(parseSociety({ cohorts: [{ kind: 'oracle' }] }).ok, false);
assert.equal(parseSociety({ cohorts: [{ share: 0 }] }).ok, false);

// ------------------------------------------------ who goes where
const W0 = load();
const ids = [...W0.byId.agent.keys()];
{
    const cohorts = [{ id: 'rules', share: 12 }, { id: 'random', share: 4 }, { id: 'a', share: 8 }, { id: 'b', share: 8 }];
    const s1 = assignCohorts(ids, cohorts, 3), s2 = assignCohorts([...ids].reverse(), cohorts, 3), s3 = assignCohorts(ids, cohorts, 4);
    const n = ids.length;
    assert.equal(Object.values(s1.counts).reduce((x, y) => x + y, 0), n, 'everyone has a cohort');
    for (const c of cohorts) assert.ok(Math.abs(s1.counts[c.id] - (n * c.share) / 32) <= 1, `${c.id} gets its share`);
    assert.ok(ids.every(id => s1.cohortOf(id) === s2.cohortOf(id)), 'the order of the list does not matter');
    assert.ok(ids.some(id => s1.cohortOf(id) !== s3.cohortOf(id)), 'another seed, another split');
    assert.ok(cohorts.some(c => c.id === s1.cohortOf('someone_met_later')), 'a newcomer still gets a cohort');
    assert.equal(s1.cohortOf('someone_met_later'), s1.cohortOf('someone_met_later'));
}

// ------------------------------------------------ one face, many minds
function fakeMind(name, choice) {
    const status = { state: 'ready', model: name, asked: 0, answered: 0, failed: 0, log: [] };
    const listeners = new Set();
    return {
        status, now: () => 0, patience: 1e9, covers: () => true, wants: () => true,
        on: fn => { listeners.add(fn); return () => listeners.delete(fn); },
        logFor: id => status.log.filter(e => e.agent === id),
        ask: async (a, opts) => {
            status.asked++; status.answered++;
            status.log.unshift({ agent: a.id, thought: name + ' thinks', model: name, at: status.asked });
            for (const fn of listeners) fn(status);
            return { choice: Math.min(choice, opts.length), thought: `${name}: 前に見た値段から決めた`, model: name, raw: '' };
        }
    };
}
async function run(cohorts, members, days = 1) {
    const W = load();
    const { cohortOf, counts } = assignCohorts([...W.byId.agent.keys()], cohorts, 7);
    const mind = createSociety({ cohorts, members, cohortOf });
    const eco = createEconomy(W, { seed: 7, secondsPerDay: SPD, mind });
    const recs = [];
    const rec = createRecorder(eco, { sink: r => recs.push(r), cohortOf: mind.cohortOf, kindOf: mind.kindOf });
    for (let i = 0; i < days * SPD; i++) { eco.step(1); await new Promise(r => setImmediate(r)); }
    rec.flush();
    return { recs, mind, counts, eco };
}
{
    const cohorts = [{ id: 'rules', kind: 'rules', share: 2 }, { id: 'alpha', kind: 'mind', share: 1 }, { id: 'beta', kind: 'mind', share: 1 }, { id: 'dice', kind: 'random', share: 1 }];
    const members = { alpha: fakeMind('alpha-1', 1), beta: fakeMind('beta-1', 3), dice: randomMind(5) };
    const { recs, mind } = await run(cohorts, members);
    assert.ok(recs.every(r => r.cohort && cohorts.some(c => c.id === r.cohort)));
    assert.ok(recs.filter(r => r.cohort === 'rules').every(r => r.by === 'rules' && !r.thought), 'the rules\' residents never ask a model');
    const alpha = recs.filter(r => r.cohort === 'alpha' && r.by === 'mind'), beta = recs.filter(r => r.cohort === 'beta' && r.by === 'mind');
    assert.ok(alpha.length > 10 && beta.length > 10, `both models chose (${alpha.length}, ${beta.length})`);
    assert.ok(alpha.every(r => r.model === 'alpha-1' && r.chosen === 0));
    assert.ok(beta.every(r => r.model === 'beta-1' && r.chosen === Math.min(2, r.cands.length - 1)));
    assert.ok(recs.filter(r => r.cohort === 'dice' && r.by === 'mind').every(r => r.model === 'random'));
    const g = byCondition(recs);
    assert.ok(g.rules && g.alpha && g.beta && g.dice, Object.keys(g).join(','));
    assert.equal(g.alpha.top1, 1); assert.equal(g.beta.top1, 0);
    assert.equal(groupKey({ cohort: 'alpha', cohortKind: 'mind', by: 'rules' }), 'alpha·rules', 'a model resident the rules chose for is kept apart');
    assert.equal(groupKey({ cohort: 'rules', cohortKind: 'rules', by: 'rules' }), 'rules');
    // the face: summed counts, merged log, per-resident routing
    assert.equal(mind.status.asked, members.alpha.status.asked + members.beta.status.asked + members.dice.status.asked);
    assert.equal(mind.status.model, '3 minds');
    assert.ok(mind.status.log.length > 0 && mind.status.log.every(e => e.cohort === 'alpha' || e.cohort === 'beta'));
    const someAlpha = recs.find(r => r.cohort === 'alpha').agent, someRules = recs.find(r => r.cohort === 'rules').agent;
    assert.ok(mind.covers(someAlpha) && !mind.covers(someRules));
    assert.ok(mind.logFor(someAlpha).every(e => e.model === 'alpha-1'));
    assert.deepEqual(mind.logFor(someRules), []);
    assert.equal(mind.kindOf(someRules), 'rules');
}
{
    // a society of the rules alone is the plain world
    const W1 = load(), W2 = load();
    const cohorts = [{ id: 'rules', kind: 'rules', share: 1 }];
    const { cohortOf } = assignCohorts([...W1.byId.agent.keys()], cohorts, 1);
    const a = createEconomy(W1, { seed: 11, secondsPerDay: SPD, mind: createSociety({ cohorts, members: {}, cohortOf }) });
    const b = createEconomy(W2, { seed: 11, secondsPerDay: SPD });
    for (let i = 0; i < SPD; i++) { a.step(1); b.step(1); }
    assert.equal(JSON.stringify(a.stats), JSON.stringify(b.stats));
}

// ------------------------------------------------ browser settings
{
    const m = new Map(), st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
    assert.deepEqual(loadSocietySettings(st), { on: false, aiShare: 50, models: [] });
    saveSocietySettings(st, { on: true, aiShare: 70, models: ['qwen/qwen-2.5-72b-instruct', 'deepseek/deepseek-chat'] });
    assert.deepEqual(loadSocietySettings(st), { on: true, aiShare: 70, models: ['qwen/qwen-2.5-72b-instruct', 'deepseek/deepseek-chat'] });
    m.set('zipangu.society.v1', '{"on":true,"aiShare":400,"models":["<img src=x>","ok/model"]}');
    assert.deepEqual(loadSocietySettings(st), { on: true, aiShare: 100, models: ['ok/model'] }, 'cleaned on the way in');
    const c = browserCohorts({ aiShare: 60, models: ['x/a', 'y/b'] });
    assert.deepEqual(c.map(x => [x.id, x.kind, x.share]), [['rules', 'rules', 40], ['a', 'mind', 30], ['b', 'mind', 30]]);
    assert.deepEqual(browserCohorts({ aiShare: 0, models: [] }).map(x => x.id), ['rules']);
    assert.deepEqual(browserCohorts({ aiShare: 100, models: [] }, 'Qwen').map(x => [x.id, x.model]), [['qwen', 'Qwen']]);
}
console.log('society tests passed');
