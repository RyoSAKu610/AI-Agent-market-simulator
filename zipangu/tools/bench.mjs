#!/usr/bin/env node
// 🏆 The human-likeness benchmark (js/bench.js, bench/README.md).
//
//   build  people's decisions → a set of items
//          node tools/bench.mjs build donations/ exports/*.jsonl --out bench/sets/v1 [--dev 0.3 --seed 1]
//          (reads research-log JSONL, donation files from the page, or stored donation files;
//           with --dev writes <out>.dev.jsonl (public) and <out>.test.jsonl (held back))
//   run    put every item to a player and score it
//          node tools/bench.mjs run --set bench/sets/v1.dev.jsonl --player rules|random|llm \
//               [--base URL --model NAME] [--name "label"] [--rpm 20] [--lang ja] [--out bench/results/x.json]
//          (an endpoint's key, if any, comes from ZIPANGU_LLM_KEY and is never written down)
//   board  results → the leaderboard the page shows
//          node tools/bench.mjs board bench/results --out bench/leaderboard.json
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { resolve as resolveProvider, complete, parseAnswer } from '../js/mind.js';
import { fromJSONL } from '../js/research.js';
import {
    BENCH_VERSION, itemsFromRecords, setHash, splitByDonor, promptFor, rulesPlayer, randomPlayer,
    scorePicks, bootstrap, buildBoard, verificationKey
} from '../js/bench.js';

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (name, def = null) => { const i = argv.indexOf('--' + name); return i < 0 ? def : argv[i + 1]; };
const positional = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--')));
const die = msg => { console.error(msg); process.exit(2); };

function loadWorld() {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
    const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = read(stem + '.json');
    return buildWorld(raw);
}
const walk = p => (statSync(p).isDirectory() ? readdirSync(p).flatMap(f => walk(join(p, f))) : [p]);
const readItems = file => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

// ------------------------------------------------------------ build
if (cmd === 'build') {
    if (!positional.length) die('usage: node tools/bench.mjs build <files or folders…> --out bench/sets/NAME [--dev 0.3]');
    const out = opt('out', 'bench/sets/set');
    const items = [];
    for (const file of positional.flatMap(walk)) {
        const text = readFileSync(file, 'utf8');
        if (file.endsWith('.jsonl')) { items.push(...itemsFromRecords(fromJSONL(text))); continue; }
        try {
            const j = JSON.parse(text);
            // a donation (from the page or as stored by the endpoint): records + donor
            if (Array.isArray(j.records)) items.push(...itemsFromRecords(j.records, { donor: j.donor || null }));
        } catch { console.error('skipped (not JSON): ' + file); }
    }
    const seen = new Set(), uniq = items.filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true)));
    mkdirSync(dirname(out), { recursive: true });
    const write = (path, list) => { writeFileSync(path, list.map(i => JSON.stringify(i)).join('\n') + (list.length ? '\n' : '')); console.error(`${path}: ${list.length} items, ${new Set(list.map(i => i.donor || '?')).size} donors, hash ${setHash(list)}`); };
    if (opt('dev')) {
        if (uniq.some(i => !i.donor)) die('--dev requires donor IDs for every item; raw research-log JSONL lacks donor metadata. Build without --dev, or use consented donation files with donor IDs.');
        let split;
        try { split = splitByDonor(uniq, Number(opt('dev')), Number(opt('seed', 1))); }
        catch (e) { die(e.message); }
        write(out + '.dev.jsonl', split.dev); write(out + '.test.jsonl', split.test);
    } else write(out + '.jsonl', uniq);
    process.exit(0);
}

// ------------------------------------------------------------ run
if (cmd === 'run') {
    const setFile = opt('set'), kind = opt('player', 'rules');
    if (!setFile || !['rules', 'random', 'llm'].includes(kind)) die('usage: node tools/bench.mjs run --set FILE --player rules|random|llm [--base URL --model NAME]');
    const items = readItems(setFile);
    if (!items.length) die('the set has no items yet');
    const W = loadWorld();
    const lang = opt('lang', 'ja'), rpm = Number(opt('rpm', 0)) || 0;
    let pick, model = null;
    if (kind === 'rules') pick = rulesPlayer();
    if (kind === 'random') pick = randomPlayer(Number(opt('seed', 1)));
    if (kind === 'llm') {
        model = opt('model'); const base = opt('base', 'http://localhost:11434/v1');
        if (!model) die('--model is required for --player llm');
        const key = process.env.ZIPANGU_LLM_KEY || '';
        const cfg = { ...resolveProvider({ provider: key ? 'custom' : 'ollama', base, model, key }), base: base.replace(/\/+$/, ''), model, key, keyless: !key };
        const sent = [];
        pick = async item => {
            if (rpm) { for (;;) { const t = Date.now(); while (sent.length && t - sent[0] > 60000) sent.shift(); if (sent.length < rpm) { sent.push(t); break; } await new Promise(r => setTimeout(r, 60050 - (t - sent[0]))); } }
            const { system, user } = promptFor(W, item, { lang });
            try {
                const { text } = await complete(cfg, system, user, { maxTokens: 160, timeoutMs: 60000 });
                const ans = parseAnswer(text, item.options.length);
                return ans ? ans.choice : null;
            } catch (e) { console.error(`  ${item.id}: ${e.message}`); return null; }
        };
    }
    const picks = [];
    for (const [i, item] of items.entries()) {
        picks.push(await pick(item));
        if (kind === 'llm') process.stderr.write(`\r  ${i + 1}/${items.length}`);
    }
    const metrics = scorePicks(items, picks);
    const result = {
        bench: BENCH_VERSION, date: new Date().toISOString(),
        set: { name: basename(setFile).replace(/\.jsonl$/, ''), hash: setHash(items), n: items.length },
        player: { kind, name: opt('name', kind === 'llm' ? model : kind === 'rules' ? 'ルール（期待値の第一候補）' : 'ランダム'), model, lang },
        metrics, ci: bootstrap(items, picks)
    };
    const out = opt('out');
    if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(result, null, 1) + '\n'); }
    const m = metrics;
    console.error(`\n${result.player.name}: score ${m.score}${result.ci ? ` [${result.ci.score.join('–')}]` : ''} · κ ${m.kappa} · accuracy ${m.accuracy} (chance ${m.chance}) · mix ${m.mix} · top1 ${m.top1} vs people ${m.top1Human} · n ${m.n}${out ? ' → ' + out : ''}`);
    process.exit(0);
}

// ------------------------------------------------------------ maintainer verification key
if (cmd === 'verify-key') {
    const file = positional[0];
    if (!file || !existsSync(file)) die('usage: node tools/bench.mjs verify-key <result.json>');
    let result;
    try { result = JSON.parse(readFileSync(file, 'utf8')); } catch { die('result file is not valid JSON'); }
    if (!result || result.bench !== BENCH_VERSION || !result.metrics || !result.player || !result.set) die('result does not match this benchmark format');
    if (typeof result.set.name !== 'string' || !result.set.name.endsWith('.test')) die('only a result evaluated on a held-back *.test set can be verified');
    console.log(verificationKey(result));
    process.exit(0);
}

// ------------------------------------------------------------ board
if (cmd === 'board') {
    const dir = positional[0] || 'bench/results';
    const results = existsSync(dir) ? walk(dir).filter(f => f.endsWith('.json')).map(f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } }).filter(Boolean) : [];
    const verifiedPath = opt('verified', join(dirname(fileURLToPath(import.meta.url)), '..', 'bench', 'verified.json'));
    let manifest;
    try { manifest = existsSync(verifiedPath) ? JSON.parse(readFileSync(verifiedPath, 'utf8')) : { bench: BENCH_VERSION, entries: [] }; }
    catch { die('verification manifest is not valid JSON: ' + verifiedPath); }
    if (manifest.bench !== BENCH_VERSION || !Array.isArray(manifest.entries)) die('verification manifest must contain this bench version and an entries array');
    const verifiedKeys = new Set(manifest.entries.map(e => e && e.key).filter(k => typeof k === 'string'));
    const board = buildBoard(results, { verifiedKeys });
    // the public sets and how many people's decisions they hold (the held-back test set is not listed)
    const setsDir = opt('sets', 'bench/sets');
    board.sets = existsSync(setsDir) ? readdirSync(setsDir).filter(f => f.endsWith('.jsonl') && !f.endsWith('.test.jsonl')).map(f => {
        const items = readItems(join(setsDir, f));
        return { name: f.replace(/\.jsonl$/, ''), n: items.length, donors: new Set(items.map(i => i.donor || '?')).size, hash: setHash(items) };
    }) : [];
    board.target = Number(opt('target', 300));
    const out = opt('out', 'bench/leaderboard.json');
    writeFileSync(out, JSON.stringify(board, null, 1) + '\n');
    console.error(`${out}: ${board.entries.length} entries`);
    process.exit(0);
}
die('usage: node tools/bench.mjs build|run|board …  (see the top of this file)');
