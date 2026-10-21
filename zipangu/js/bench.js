// 🏆 The human-likeness benchmark (zipangu/bench/README.md).
//
// Every item is one moment when a person decided for a resident (js/human.js): the situation,
// the candidates exactly as they were worded, and what the person chose. A player — the rules,
// a random chooser, or any language model — gets the same question in the same words
// (js/mind.js buildPrompt, the prompt the city's own minds use) and picks one. The score says
// how much the player's choices look like the people's.
//
//   κ (kappa)   agreement with the person's choice, corrected for chance (0 = no better than
//               random among that item's candidates, 1 = always the same as the person)
//   mix         Jensen–Shannon divergence between the kinds of action the player and the
//               people chose (0 = the same mix)
//   top1 gap    |share of "the rules' first candidate" (player) − (people)|: whether the player
//               is more or less of a strict maximiser than people are
//   score       100 × the mean of max(κ, 0), 1 − mix and 1 − top1 gap
//
// Pure: no DOM, no network. tools/bench.mjs runs players; the page #/bench shows the board.
import { buildPrompt } from './mind.js';
import { jsDivergence, fitBeta } from './research.js';

export const BENCH_VERSION = 'zhb-1';

const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, '0'); };

// Decision records (the research log, a donation, a stored donation file) → benchmark items.
// Only decisions a person made, with every candidate's words present, count.
export function itemsFromRecords(records, { donor = null } = {}) {
    const out = [];
    for (const r of records || []) {
        if (!r || r.by !== 'human' || !Array.isArray(r.cands) || r.cands.length < 2 || !(r.chosen >= 0 && r.chosen < r.cands.length)) continue;
        if (!r.cands.every(c => c && typeof c.text === 'string' && c.text.length > 2)) continue;
        const options = r.cands.map((c, i) => ({ n: i + 1, kind: c.kind, text: c.text, score: Number(c.score) || 0, profit: Number(c.profit) || 0 }));
        const situation = { day: r.day ?? null, label: r.label || '', sekki: r.sekki || '', at: r.at || null, wallet: Number(r.wallet) || 0, cargo: Array.isArray(r.cargo) ? r.cargo : [] };
        out.push({
            id: 'i' + fnv([r.agent, r.T, r.day, ...options.map(o => o.text)].join('|')),
            agent: r.agent, situation, options, human: r.chosen + 1,
            thought: typeof r.thought === 'string' ? r.thought : null,
            donor: donor || r.donor || null
        });
    }
    // the same moment donated twice counts once
    const seen = new Set();
    return out.filter(it => (seen.has(it.id) ? false : (seen.add(it.id), true)));
}

// A stable fingerprint of a set: same items (in any order) → same hash.
export const setHash = items => fnv(items.map(i => i.id + ':' + i.human).sort().join(','));

// Splits items by donor into a public "dev" part and a held-back "test" part, so nobody can tune
// to the numbers that rank them. The same donor always lands on the same side.
export function splitByDonor(items, devShare = 0.3, seed = 1) {
    if (items.some(it => !it || typeof it.donor !== 'string' || !it.donor)) {
        throw new Error('Donor-level holdout requires a donor ID on every item; do not split donorless research logs.');
    }
    if (!(devShare > 0 && devShare < 1)) throw new Error('devShare must be between 0 and 1.');
    if (new Set(items.map(it => it.donor)).size < 2) {
        throw new Error('Donor-level dev/test split requires at least two distinct donors.');
    }
    const dev = [], test = [];
    for (const it of items) {
        const x = parseInt(fnv(seed + ':' + it.donor), 16) / 0xffffffff;
        (x < devShare ? dev : test).push(it);
    }
    if (!dev.length || !test.length) {
        throw new Error('Donor-level split produced an empty dev or test set; collect more donors or choose a different seed/share.');
    }
    return { dev, test };
}

// The question, worded exactly as the city asks its own minds.
export function promptFor(W, item, { lang = 'ja' } = {}) {
    const s = item.situation;
    const a = { id: item.agent, name: (W.byId.agent.get(item.agent) || {}).name || item.agent, wallet: s.wallet, at: s.at, carrying: s.cargo || [] };
    return buildPrompt(W, a, item.options, { clock: { day: s.day, label: s.label, sekki: s.sekki }, describe: o => o.text, lang, recent: [] });
}

// ------------------------------------------------------------ players

export const rulesPlayer = () => () => 1;           // the rules' first candidate, always
export function randomPlayer(seed = 1) {
    let s = (seed * 2654435761) >>> 0;
    const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return item => 1 + Math.floor(next() * item.options.length);
}

// ------------------------------------------------------------ scoring

const countKinds = (items, pickOf) => {
    const c = {};
    items.forEach((it, i) => { const p = pickOf(it, i); if (p) { const k = it.options[p - 1].kind; c[k] = (c[k] || 0) + 1; } });
    return c;
};
const clamp01 = x => Math.max(0, Math.min(1, x));

// picks[i] is the player's option number for items[i] (1-based), or null when it gave none.
export function scorePicks(items, picks) {
    const n = items.length;
    if (!n) return { n: 0 };
    let correct = 0, answered = 0, chance = 0, top1P = 0, top1H = 0;
    items.forEach((it, i) => {
        const p = picks[i];
        chance += 1 / it.options.length;
        if (it.human === 1) top1H++;
        if (Number.isInteger(p) && p >= 1 && p <= it.options.length) {
            answered++;
            if (p === it.human) correct++;
            if (p === 1) top1P++;
        }
    });
    const accuracy = correct / n, pChance = chance / n;
    const kappa = pChance < 1 ? (accuracy - pChance) / (1 - pChance) : 0;
    const mix = jsDivergence(countKinds(items, (it, i) => picks[i]), countKinds(items, it => it.human));
    const top1Gap = Math.abs(top1P / n - top1H / n);
    const asRecords = pickOf => items.map((it, i) => ({ cands: it.options.map(o => ({ score: o.score })), chosen: (pickOf(it, i) || 0) - 1 }));
    const betaP = fitBeta(asRecords((it, i) => picks[i])), betaH = fitBeta(asRecords(it => it.human));
    const score = 100 * (clamp01(kappa) + (1 - (mix ?? 1)) + (1 - top1Gap)) / 3;
    return {
        n, answered, accuracy: +accuracy.toFixed(4), chance: +pChance.toFixed(4), kappa: +kappa.toFixed(4),
        mix: mix == null ? null : +mix.toFixed(4), top1: +(top1P / n).toFixed(4), top1Human: +(top1H / n).toFixed(4), top1Gap: +top1Gap.toFixed(4),
        beta: betaP ? betaP.beta : null, betaHuman: betaH ? betaH.beta : null,
        score: +score.toFixed(2)
    };
}

// 95% bootstrap interval of the score and the accuracy (items resampled, seeded so it repeats).
export function bootstrap(items, picks, { rounds = 500, seed = 7 } = {}) {
    if (items.length < 5) return null;
    let s = seed >>> 0;
    const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const scores = [], accs = [];
    for (let b = 0; b < rounds; b++) {
        const idx = items.map(() => Math.floor(rnd() * items.length));
        const r = scorePicks(idx.map(i => items[i]), idx.map(i => picks[i]));
        scores.push(r.score); accs.push(r.accuracy);
    }
    const q = (xs, p) => { const a = xs.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.max(0, Math.round(p * (a.length - 1))))]; };
    return { score: [q(scores, 0.025), q(scores, 0.975)], accuracy: [q(accs, 0.025), q(accs, 0.975)] };
}

// ------------------------------------------------------------ the board

// A stable exact key for the benchmark result values that the public board displays.
// The allowlist containing these keys is maintained separately from participant result files.
export function verificationKey(r) {
    const player = r && r.player || {};
    const metrics = r && r.metrics || {};
    const set = r && r.set || {};
    const ci = r && r.ci || null;
    return JSON.stringify({
        bench: r && r.bench || null,
        set: { name: set.name || null, hash: set.hash || null, n: set.n ?? null },
        player: { kind: player.kind || null, name: player.name || null, model: player.model || null, lang: player.lang || null },
        metrics: {
            n: metrics.n ?? null, answered: metrics.answered ?? null, accuracy: metrics.accuracy ?? null,
            chance: metrics.chance ?? null, kappa: metrics.kappa ?? null, mix: metrics.mix ?? null,
            top1: metrics.top1 ?? null, top1Human: metrics.top1Human ?? null, top1Gap: metrics.top1Gap ?? null,
            beta: metrics.beta ?? null, betaHuman: metrics.betaHuman ?? null, score: metrics.score ?? null
        },
        ci
    });
}

// A result file → the row the board shows. Unknown or broken results are dropped.
// "verified" is never trusted from contributor-supplied result JSON.
export function cleanResult(r, { verifiedKeys = new Set() } = {}) {
    if (!r || r.bench !== BENCH_VERSION || !r.metrics || !(r.metrics.n > 0) || !r.player || typeof r.player.name !== 'string') return null;
    const m = r.metrics;
    return {
        name: String(r.player.name).slice(0, 60), kind: ['rules', 'random', 'llm', 'human'].includes(r.player.kind) ? r.player.kind : 'llm',
        model: r.player.model ? String(r.player.model).slice(0, 80) : null, baseline: r.player.kind === 'rules' || r.player.kind === 'random',
        set: r.set && typeof r.set.name === 'string' ? { name: r.set.name.slice(0, 40), hash: String(r.set.hash || '').slice(0, 16), n: r.set.n | 0 } : null,
        date: typeof r.date === 'string' ? r.date.slice(0, 10) : null, verified: verifiedKeys.has(verificationKey(r)),
        score: m.score, kappa: m.kappa, accuracy: m.accuracy, mix: m.mix, top1Gap: m.top1Gap, n: m.n, ci: r.ci && r.ci.score ? r.ci.score : null
    };
}
export function buildBoard(results, { updated = new Date().toISOString().slice(0, 10), verifiedKeys = new Set() } = {}) {
    const rows = results.map(r => cleanResult(r, { verifiedKeys })).filter(Boolean).sort((a, b) => b.score - a.score || b.n - a.n || (a.name < b.name ? -1 : 1));
    return { bench: BENCH_VERSION, updated, entries: rows };
}
