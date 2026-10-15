#!/usr/bin/env node
// 🔬 Headless experiment: run the economy for N in-world days under one condition and write
// every resident's decisions to a JSONL file (js/research.js explains the record).
//
//   node tools/experiment.mjs --cond rules  --seed 1 --days 10 --out runs/rules-1.jsonl
//   node tools/experiment.mjs --cond random --seed 1 --days 10 --out runs/random-1.jsonl
//   node tools/experiment.mjs --cond llm    --seed 1 --days 10 --out runs/qwen7b-1.jsonl \
//        --base http://localhost:11434/v1 --model qwen2.5:7b [--lang en] [--keep-prompts]
//
// Conditions
//   node tools/experiment.mjs --society society.json --seed 1 --days 10 --out runs/society-1.jsonl [--rpm 20]
//
//   rules   no model at all: the rules choose (fully offline, deterministic for a seed)
//   random  a chooser that picks uniformly among the same candidates (a floor to compare with)
//   llm     an OpenAI-compatible endpoint chooses and says what it thinks (Ollama, LM Studio,
//           llama.cpp server, or any provider; a key, if needed, comes from ZIPANGU_LLM_KEY)
//   society a mixed society in one world (js/society.js): a JSON file lists cohorts, e.g.
//           { "base": "https://openrouter.ai/api/v1", "cohorts": [
//             { "id": "rules", "share": 10 }, { "id": "random", "kind": "random", "share": 4 },
//             { "model": "qwen/qwen-2.5-72b-instruct", "share": 6 }, { "model": "deepseek/deepseek-chat", "share": 6 } ] }
//           Each model cohort may set its own "base" and "keyEnv" (the name of the environment
//           variable that holds its key; default ZIPANGU_LLM_KEY). --rpm caps calls per minute
//           across all cohorts (free OpenRouter models allow 20).
//
// The world waits while a model thinks (as with a fast GPU), so slow endpoints change only how
// long the run takes, not what happens in it. Same seed + same condition = same world, except
// for what the model answers.
import { readFileSync, existsSync, writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { createMind } from '../js/mind.js';
import { createRecorder, summarize, byCondition } from '../js/research.js';
import { parseSociety, assignCohorts, createSociety, randomMind } from '../js/society.js';

const arg = (name, def = null) => { const i = process.argv.indexOf('--' + name); return i < 0 ? def : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const societyFile = arg('society', null);
const cond = societyFile ? 'society' : arg('cond', 'rules'), seed = Number(arg('seed', 1)), days = Number(arg('days', 5));
const rpm = Number(arg('rpm', 0)) || 0, keepPrompts = !!arg('keep-prompts', false);
const out = arg('out', `runs/${cond}-${seed}.jsonl`), lang = arg('lang', 'ja');
if (!['rules', 'random', 'llm', 'society'].includes(cond) || !(days > 0) || !Number.isFinite(seed)) {
    console.error('usage: node tools/experiment.mjs --cond rules|random|llm | --society file.json  --seed N --days D [--out file.jsonl]');
    process.exit(2);
}

function loadWorld() {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
    const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = read(stem + '.json');
    raw.texts = read('library.texts.json', { works: {} });
    return buildWorld(raw);
}

const W = loadWorld();
// calls per minute across every model (a sliding window), so free tiers are respected
const sent = [];
async function throttle() {
    if (!rpm) return;
    for (;;) {
        const t = Date.now();
        while (sent.length && t - sent[0] > 60000) sent.shift();
        if (sent.length < rpm) { sent.push(t); return; }
        await new Promise(r => setTimeout(r, 60000 - (t - sent[0]) + 50));
    }
}
// the world waits for answers: track every call in flight
const pending = new Set();
function headless(m) {
    if (!m) return m;
    const ask = m.ask.bind(m), covers = m.covers.bind(m);
    m.ask = (...a) => { const p = throttle().then(() => ask(...a)); pending.add(p); p.finally(() => pending.delete(p)); return p; };
    m.wants = id => covers(id);         // never "busy": the world waits instead
    m.patience = 1e9;
    return m;
}
const llm = (model, base, keyEnv) => {
    const key = process.env[keyEnv || 'ZIPANGU_LLM_KEY'] || '';
    return headless(createMind(W, { on: true, provider: key ? 'custom' : 'ollama', base, model, key, scope: 'all', perHour: 1e9 },
        { fetchImpl: globalThis.fetch, lang, keepPrompts, maxParallel: 64 }));
};
let mind = null, model = null, base = null, society = null, assignment = null;
if (cond === 'random') mind = headless(randomMind(seed));
if (cond === 'llm') {
    base = arg('base', 'http://localhost:11434/v1'); model = arg('model', 'qwen2.5:7b');
    mind = llm(model, base, null);
}
if (cond === 'society') {
    const parsed = parseSociety(JSON.parse(readFileSync(societyFile, 'utf8')));
    if (!parsed.ok) { console.error('society file: ' + parsed.errors.join('; ')); process.exit(2); }
    assignment = assignCohorts([...W.byId.agent.keys()], parsed.cohorts, seed);
    const members = {};
    for (const c of parsed.cohorts) {
        if (c.kind === 'random') members[c.id] = headless(randomMind(seed + c.id.length));
        if (c.kind === 'mind') members[c.id] = llm(c.model || 'qwen2.5:7b', c.base || 'http://localhost:11434/v1', c.keyEnv);
    }
    society = parsed.cohorts;
    mind = createSociety({ cohorts: parsed.cohorts, members, cohortOf: assignment.cohortOf });
    process.stderr.write('  cohorts: ' + Object.entries(assignment.counts).map(([k, n]) => `${k} ${n}`).join(' · ') + '\n');
}

const SECONDS_PER_DAY = 240;
const eco = createEconomy(W, { seed, secondsPerDay: SECONDS_PER_DAY, mind });
const run = `${cond}-s${seed}-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}`;
mkdirSync(dirname(out) || '.', { recursive: true });
const file = createWriteStream(out);
const all = [];
const rec = createRecorder(eco, { run, cond, sink: r => { file.write(JSON.stringify(r) + '\n'); all.push(r); },
    ...(mind && mind.society ? { cohortOf: mind.cohortOf, kindOf: mind.kindOf } : {}) });

const t0 = Date.now();
let lastShown = -1;
for (let s = 0; s < days * SECONDS_PER_DAY; s++) {
    eco.step(1);
    while (pending.size) await Promise.allSettled([...pending]);
    const day = Math.floor(eco.time);
    if (day !== lastShown) { lastShown = day; process.stderr.write(`\r  day ${day}/${days} · ${rec.count} decisions · ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
}
rec.flush(); rec.stop();
await new Promise(r => file.end(r));
const meta = { run, cond, seed, days, secondsPerDay: SECONDS_PER_DAY, model, base, lang, rpm, records: rec.count, seconds: Math.round((Date.now() - t0) / 1000),
    society: society ? society.map(c => ({ id: c.id, kind: c.kind, model: c.model, base: c.base, share: c.share, residents: assignment.counts[c.id] })) : null,
    mind: mind && mind.status ? { asked: mind.status.asked, answered: mind.status.answered, failed: mind.status.failed } : null, finished: new Date().toISOString() };
writeFileSync(out.replace(/\.jsonl$/, '') + '.meta.json', JSON.stringify(meta, null, 1));
const line = (k, s) => `${k}: ${s.n} decisions · top1 ${s.top1} · entropy ${s.kindEntropy} · β ${s.beta ? s.beta.beta : '—'} · earn/day ${s.earnPerDay}`;
process.stderr.write('\n' + (society ? Object.entries(byCondition(all)).map(([k, s]) => '  ' + line(k, s)).join('\n') : line(run, summarize(all))) + `\n→ ${out}\n`);
