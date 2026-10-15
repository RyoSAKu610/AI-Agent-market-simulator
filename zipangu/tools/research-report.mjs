#!/usr/bin/env node
// 🔬 Report: read decision logs (JSONL from tools/experiment.mjs, or the browser's export)
// and write a Markdown summary that compares conditions and shows change over time.
//
//   node tools/research-report.mjs runs/*.jsonl [--window 1] [--out report.md] [--csv windows.csv]
import { readFileSync, writeFileSync } from 'node:fs';
import { fromJSONL, byCondition, windows, trend, twoProportions, summarize, groupKey, groupOrder, distanceToHuman } from '../js/research.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : args[i + 1]; };
const files = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
if (!files.length) { console.error('usage: node tools/research-report.mjs <file.jsonl>... [--window days] [--out report.md] [--csv windows.csv]'); process.exit(2); }
const days = Number(opt('window', 1)) || 1;

const records = files.flatMap(f => fromJSONL(readFileSync(f, 'utf8')));
const groups = {};
for (const r of records) { const k = groupKey(r); (groups[k] = groups[k] || []).push(r); }
const sums = byCondition(records);

const f = (v, d = 3) => (v == null ? '—' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(d)) : String(v));
const pct = v => (v == null ? '—' : (v * 100).toFixed(1) + '%');
const conds = Object.keys(sums).sort(groupOrder);
const L = [];
L.push(`# 万華京ジパング — decision log report`, '');
L.push(`${records.length} decisions from ${files.length} file(s): ${files.join(', ')}. Window: ${days} in-world day(s).`, '');
L.push('## 1. Conditions side by side', '');
L.push('| measure | ' + conds.join(' | ') + ' |', '|---|' + conds.map(() => '---|').join(''));
const row = (label, fn) => L.push(`| ${label} | ` + conds.map(c => fn(sums[c])).join(' | ') + ' |');
row('decisions', s => f(s.n));
row('residents', s => f(s.agents));
row('model', s => s.model || '—');
row('top-1 agreement with the rules\' best (top1)', s => pct(s.top1));
row('mean rank chosen (0 = best)', s => f(s.meanRank));
row('rationality β (softmax fit)', s => (s.beta ? f(s.beta.beta, 1) + (s.beta.atEdge ? '+' : '') : '—'));
row('regret vs best expected profit', s => pct(s.regret));
row('choice entropy (bits)', s => f(s.kindEntropy));
row('explore share (visit)', s => pct(s.explore));
row('rest share', s => pct(s.rest));
row('realised earnings / in-world day', s => f(s.earnPerDay));
row('individuality (JS div. between residents)', s => f(s.individuality));
row('drift (JS div. first vs second half)', s => f(s.drift));
row('mean latency (ms)', s => f(s.latencyMs));
row('thoughts', s => (s.thoughts ? f(s.thoughts.n) : '—'));
row('thought length (chars)', s => (s.thoughts ? f(s.thoughts.meanLen, 1) : '—'));
row('thought distinct-2', s => (s.thoughts ? f(s.thoughts.distinct2) : '—'));
row('thoughts repeated verbatim', s => (s.thoughts ? pct(s.thoughts.repeatShare) : '—'));
for (const k of ['self', 'others', 'memory', 'emotion', 'reason', 'money']) row(`thoughts mentioning ${k}`, s => (s.thoughts ? pct(s.thoughts.share[k]) : '—'));
if (sums.human) {
    const dist = distanceToHuman(sums);
    const cell = (k, f2) => (dist[k] && dist[k][f2] != null ? f(dist[k][f2]) : '—');
    L.push('| **distance to the human: action mix (JS div.)** | ' + conds.map(c => cell(c, 'mix')).join(' | ') + ' |');
    L.push('| **distance to the human: \\|β − β_human\\|** | ' + conds.map(c => cell(c, 'beta')).join(' | ') + ' |');
    L.push('| **distance to the human: \\|top1 − top1_human\\|** | ' + conds.map(c => cell(c, 'top1')).join(' | ') + ' |');
}
L.push('');

if (groups.rules) {
    const a = groups.rules.filter(r => r.chosen >= 0);
    for (const other of conds.filter(c => c !== 'rules' && !c.includes('·'))) {
        const b = groups[other].filter(r => r.chosen >= 0);
        const t = twoProportions(a.filter(r => r.chosen === 0).length, a.length, b.filter(r => r.chosen === 0).length, b.length);
        if (t) L.push(`- top-1 agreement, rules − ${other}: ${(t.diff * 100).toFixed(1)} points (z = ${t.z}).`);
    }
    L.push('');
}

L.push('## 2. Change over time', '');
const csv = ['cond,from,to,n,top1,meanRank,beta,kindEntropy,explore,earnPerDay,drift,thoughtLen,distinct2,memory,emotion'];
for (const c of conds) {
    const w = windows(groups[c] || [], days);
    if (w.length < 2) continue;
    L.push(`### ${c}`, '', '| days | n | top1 | β | entropy | explore | earn/day | thought len | memory | emotion |', '|---|---|---|---|---|---|---|---|---|---|');
    for (const r of w) {
        L.push(`| ${f(r.from, 0)}–${f(r.to, 0)} | ${r.n} | ${pct(r.top1)} | ${r.beta ? f(r.beta.beta, 1) : '—'} | ${f(r.kindEntropy)} | ${pct(r.explore)} | ${f(r.earnPerDay)} | ${r.thoughts ? f(r.thoughts.meanLen, 1) : '—'} | ${r.thoughts ? pct(r.thoughts.share.memory) : '—'} | ${r.thoughts ? pct(r.thoughts.share.emotion) : '—'} |`);
        csv.push([c, r.from, r.to, r.n, r.top1, r.meanRank, r.beta ? r.beta.beta : '', r.kindEntropy, r.explore, r.earnPerDay ?? '', r.drift ?? '', r.thoughts ? r.thoughts.meanLen : '', r.thoughts ? r.thoughts.distinct2 : '', r.thoughts ? r.thoughts.share.memory : '', r.thoughts ? r.thoughts.share.emotion : ''].join(','));
    }
    const slope = k => trend(w, k);
    L.push('', `Trend per day — top1 ${f(slope('top1'), 4)}, entropy ${f(slope('kindEntropy'), 4)}, β ${f(slope(r => (r.beta ? r.beta.beta : NaN)), 3)}, thought length ${f(slope(r => (r.thoughts ? r.thoughts.meanLen : NaN)), 3)}.`, '');
}

L.push('## 3. How to read this', '',
    '- **top1 / mean rank / β** — how closely choices follow the economy\'s own expected-value score. The rules are a noisy maximiser by design; a model that keeps far lower β is choosing for reasons other than expected profit (persona, curiosity, mistakes). Which of those it is needs the thoughts and a human baseline, not β alone.',
    '- **regret / earnings** — what those choices cost or gained in the world itself.',
    '- **individuality / drift** — whether residents choose differently from one another, and whether each one\'s habits change over its own record.',
    '- **thoughts** — surface features of the stated reasons (length, variety, what they mention). They describe the text, not an inner state.',
    '- The model\'s weights do not change while the world runs. Change over time comes from what is in its prompt (recent choices, wallet, season), so "drift" here is in-context adaptation, not learning. See docs/RESEARCH.md.', '');
const md = L.join('\n');
const outFile = opt('out', null);
if (outFile) writeFileSync(outFile, md); else process.stdout.write(md);
const csvFile = opt('csv', null);
if (csvFile) writeFileSync(csvFile, csv.join('\n') + '\n');
if (outFile) console.error(`wrote ${outFile}${csvFile ? ' and ' + csvFile : ''} (${records.length} decisions, ${conds.length} conditions; overall top1 ${summarize(records).top1})`);
