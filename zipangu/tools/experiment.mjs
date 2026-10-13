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
//   rules   no model at all: the rules choose (fully offline, deterministic for a seed)
//   random  a chooser that picks uniformly among the same candidates (a floor to compare with)
//   llm     an OpenAI-compatible endpoint chooses and says what it thinks (Ollama, LM Studio,
//           llama.cpp server, or any provider; a key, if needed, comes from ZIPANGU_LLM_KEY)
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
import { createRecorder, summarize } from '../js/research.js';

const arg = (name, def = null) => { const i = process.argv.indexOf('--' + name); return i < 0 ? def : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const cond = arg('cond', 'rules'), seed = Number(arg('seed', 1)), days = Number(arg('days', 5));
const out = arg('out', `runs/${cond}-${seed}.jsonl`), lang = arg('lang', 'ja');
if (!['rules', 'random', 'llm'].includes(cond) || !(days > 0) || !Number.isFinite(seed)) {
    console.error('usage: node tools/experiment.mjs --cond rules|random|llm --seed N --days D [--out file.jsonl]');
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

// a seeded uniform chooser with the same interface as a mind
function randomMind(seed) {
    let s = (seed * 2654435761) >>> 0;
    const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return { wants: () => true, covers: () => true, now: () => Date.now(), patience: 1e9, ask: async (a, opts) => ({ choice: 1 + Math.floor(next() * opts.length), thought: '', model: 'random' }) };
}

const W = loadWorld();
let mind = null, model = null, base = null;
if (cond === 'random') mind = randomMind(seed);
if (cond === 'llm') {
    base = arg('base', 'http://localhost:11434/v1'); model = arg('model', 'qwen2.5:7b');
    const key = process.env.ZIPANGU_LLM_KEY || '';
    mind = createMind(W, { on: true, provider: key ? 'custom' : 'ollama', base, model, key, scope: 'all', perHour: 1e9 },
        { fetchImpl: globalThis.fetch, lang, keepPrompts: !!arg('keep-prompts', false) });
}
// the world waits for answers: track every call in flight
const pending = new Set();
if (mind) {
    const ask = mind.ask.bind(mind);
    mind.ask = (...a) => { const p = Promise.resolve(ask(...a)); pending.add(p); p.finally(() => pending.delete(p)); return p; };
    mind.patience = 1e9;
}

const SECONDS_PER_DAY = 240;
const eco = createEconomy(W, { seed, secondsPerDay: SECONDS_PER_DAY, mind });
const run = `${cond}-s${seed}-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}`;
mkdirSync(dirname(out) || '.', { recursive: true });
const file = createWriteStream(out);
const all = [];
const rec = createRecorder(eco, { run, cond, sink: r => { file.write(JSON.stringify(r) + '\n'); all.push(r); } });

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
const meta = { run, cond, seed, days, secondsPerDay: SECONDS_PER_DAY, model, base, lang, records: rec.count, seconds: Math.round((Date.now() - t0) / 1000),
    mind: mind && mind.status ? { asked: mind.status.asked, answered: mind.status.answered, failed: mind.status.failed } : null, finished: new Date().toISOString() };
writeFileSync(out.replace(/\.jsonl$/, '') + '.meta.json', JSON.stringify(meta, null, 1));
const s = summarize(all);
process.stderr.write(`\n${run}: ${s.n} decisions · top1 ${s.top1} · entropy ${s.kindEntropy} · β ${s.beta ? s.beta.beta : '—'} · earn/day ${s.earnPerDay}\n→ ${out}\n`);
