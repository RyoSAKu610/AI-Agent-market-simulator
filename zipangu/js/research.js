// 🔬 The decision log: rules-only residents and LLM-minded residents, side by side.
//
// The economy (sim.js) works out every resident's options from prices, routes and goals.
// Who picks among the best few is either the rules (fully offline, no model) or a mind
// (Qwen in the browser, or any LLM endpoint). sim.js reports each pick through
// eco.onDecision(); this module turns those reports into records, closes each record with
// what actually happened (the wallet's change until the resident's next decision), and
// computes the measures used to compare the two kinds of mind over time.
//
// Nothing here sends anything anywhere. In the browser the records stay on this device
// (IndexedDB) until the visitor exports them; tools/experiment.mjs writes them to a file.
//
// A record (one decision):
//   { v, run, cond, T, day, koku, season, agent, by, goal, wallet, carrying, at, traits,
//     cands: [{ kind, good, to, profit, time, score }], chosen, kind,
//     model?, thought?, ms?, raw?, prompt?, out: { dWallet, dT } | null }
// `by` is who chose: 'rules', 'mind', or 'fallback' (a mind was asked but the rules chose).
// `cands` is sorted by the rules' score, so chosen === 0 means "the rules' own best guess".

export const RECORD_VERSION = 1;
export const SETTINGS_KEY = 'zipangu.research.v1';

export function loadResearchSettings(storage = globalThis.localStorage) {
    try {
        const s = JSON.parse(storage.getItem(SETTINGS_KEY) || '{}');
        return { on: s.on === true, run: typeof s.run === 'string' && /^[\w-]{1,40}$/.test(s.run) ? s.run : null };
    } catch { return { on: false, run: null }; }
}
export function saveResearchSettings(storage, s) {
    try { storage.setItem(SETTINGS_KEY, JSON.stringify({ on: !!s.on, run: s.run || null })); return true; } catch { return false; }
}
export const newRunId = (rand = Math.random) => 'run-' + new Date().toISOString().slice(0, 10) + '-' + Math.floor(rand() * 1e6).toString(36);

// ------------------------------------------------------------ recording

// Listens to eco.onDecision. A record is handed to `sink` once it is closed: when the same
// resident decides again (out = what its wallet did meanwhile), or on flush() (out = null).
// `cohortOf(id)` (a mixed society, js/society.js) adds the resident's cohort and its kind.
export function createRecorder(eco, { sink, run = null, cond = null, cohortOf = null, kindOf = null } = {}) {
    const open = new Map();   // agent id → record waiting for its outcome
    let count = 0;
    const close = (rec, out) => { rec.out = out; count++; try { sink && sink(rec); } catch { /* the log must not stop the world */ } };
    const off = eco.onDecision(d => {
        const prev = open.get(d.agent);
        if (prev) close(prev, { dWallet: d.wallet - prev.wallet, dT: +(d.T - prev.T).toFixed(4) });
        const r = { v: RECORD_VERSION, run, cond: cond || (d.by === 'rules' || d.by === 'human' ? d.by : 'mind'), ...d };
        if (cohortOf) { r.cohort = cohortOf(d.agent); r.cohortKind = kindOf ? kindOf(d.agent) : null; }
        open.set(d.agent, r);
    });
    return {
        get count() { return count; },
        get pending() { return open.size; },
        flush() { for (const rec of open.values()) close(rec, null); open.clear(); },
        stop() { off(); }
    };
}

// ------------------------------------------------------------ measures

const log2 = x => Math.log(x) / Math.LN2;
export function entropy(counts) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (!total) return 0;
    let h = 0;
    for (const c of Object.values(counts)) if (c > 0) h -= (c / total) * log2(c / total);
    return h;
}
// Jensen–Shannon divergence (bits, 0..1) between two count tables.
export function jsDivergence(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const ta = Object.values(a).reduce((x, y) => x + y, 0), tb = Object.values(b).reduce((x, y) => x + y, 0);
    if (!ta || !tb) return null;
    let d = 0;
    for (const k of keys) {
        const p = (a[k] || 0) / ta, q = (b[k] || 0) / tb, m = (p + q) / 2;
        if (p > 0) d += 0.5 * p * log2(p / m);
        if (q > 0) d += 0.5 * q * log2(q / m);
    }
    return d;
}
const countBy = (xs, f) => { const c = {}; for (const x of xs) { const k = f(x); c[k] = (c[k] || 0) + 1; } return c; };
const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// How strongly choices follow the rules' score: the β of a softmax (multinomial logit)
// P(i) ∝ exp(β · z_i), z = score / best score in that set, fitted by maximum likelihood on
// a grid. β → large: a strict maximiser; β ≈ 0: choices ignore the score (random).
// This is the "rationality" parameter of quantal-response models used for human choice data.
export function fitBeta(records, grid = null) {
    const sets = records.filter(r => r.chosen >= 0 && r.cands && r.cands.length >= 2).map(r => {
        const top = Math.max(...r.cands.map(c => c.score));
        return { z: r.cands.map(c => (top > 0 ? c.score / top : 0)), k: r.chosen };
    });
    if (sets.length < 5) return null;
    grid = grid || Array.from({ length: 121 }, (_, i) => i * 0.5);
    let best = { beta: 0, ll: -Infinity };
    for (const beta of grid) {
        let ll = 0;
        for (const { z, k } of sets) {
            const m = Math.max(...z.map(v => beta * v));
            const lse = m + Math.log(z.reduce((s, v) => s + Math.exp(beta * v - m), 0));
            ll += beta * z[k] - lse;
        }
        if (ll > best.ll) best = { beta, ll };
    }
    return { beta: best.beta, ll: +best.ll.toFixed(3), n: sets.length, atEdge: best.beta === grid[grid.length - 1] };
}

// Words that mark what a thought is about. Small, transparent lists (ja + en) so the
// counts can be reproduced and argued with; extend them in a paper's appendix, not silently.
export const LEXICON = {
    self: ['私', 'わたし', '僕', 'ぼく', '俺', 'うち', 'I ', "I'", ' me ', ' my ', 'myself'],
    others: ['みんな', '誰か', 'あの人', '仲間', '友', 'お客', 'they', 'friend', 'someone', 'people', 'customer'],
    memory: ['最近', 'この前', '前に', 'また', '昨日', 'いつも', 'again', 'last time', 'yesterday', 'before', 'always'],
    emotion: ['楽しい', '嬉しい', 'うれしい', '不安', '心配', '疲れ', 'わくわく', '怖い', '寂しい', '好き', '残念', 'happy', 'glad', 'worried', 'tired', 'excited', 'afraid', 'lonely', 'love', 'sad', 'curious'],
    reason: ['から', 'ので', 'だから', 'ため', 'なら', 'because', ' so ', 'since', 'therefore', 'if '],
    money: ['儲', '値', '稼', '安', '高', '売', '買', '刻', 'profit', 'price', 'cheap', 'sell', 'buy', 'margin', 'coin']
};
export function thoughtFeatures(thoughts) {
    const ts = thoughts.filter(t => typeof t === 'string' && t.trim());
    if (!ts.length) return null;
    const lens = ts.map(t => Array.from(t).length);
    // distinct-2 over character bigrams works for Japanese and English alike
    const bigrams = [], uniq = new Set();
    for (const t of ts) { const ch = Array.from(t); for (let i = 0; i + 1 < ch.length; i++) { const b = ch[i] + ch[i + 1]; bigrams.push(b); uniq.add(b); } }
    const share = {};
    for (const [k, words] of Object.entries(LEXICON)) {
        share[k] = ts.filter(t => { const s = ' ' + t + ' '; return words.some(w => s.includes(w) || s.toLowerCase().includes(w.toLowerCase())); }).length / ts.length;
    }
    const repeated = ts.length - new Set(ts).size;
    return { n: ts.length, meanLen: +mean(lens).toFixed(1), distinct2: bigrams.length ? +(uniq.size / bigrams.length).toFixed(3) : 0, repeatShare: +(repeated / ts.length).toFixed(3), share };
}

// Everything for one group of records (one condition, or one time window).
export function summarize(records) {
    const rs = records.filter(r => r && Array.isArray(r.cands));
    if (!rs.length) return { n: 0 };
    const inSet = rs.filter(r => r.chosen >= 0);
    const kinds = countBy(rs, r => r.kind || '?');
    const regret = inSet.map(r => {
        const best = Math.max(...r.cands.map(c => c.profit));
        return best > 0 ? (best - r.cands[r.chosen].profit) / best : 0;
    });
    const closed = rs.filter(r => r.out && r.out.dT > 0);
    const dW = closed.reduce((s, r) => s + r.out.dWallet, 0), dT = closed.reduce((s, r) => s + r.out.dT, 0);
    // individuality: how differently residents choose (mean pairwise JS divergence of kind mixes)
    const byAgent = {};
    for (const r of rs) (byAgent[r.agent] = byAgent[r.agent] || []).push(r);
    const mixes = Object.values(byAgent).filter(x => x.length >= 8).map(x => countBy(x, r => r.kind || '?'));
    const pair = [];
    for (let i = 0; i < mixes.length; i++) for (let j = i + 1; j < mixes.length; j++) pair.push(jsDivergence(mixes[i], mixes[j]));
    // drift: does each resident choose differently in the second half of its own record?
    const drift = Object.values(byAgent).filter(x => x.length >= 16).map(x => {
        const s = [...x].sort((a, b) => a.T - b.T), h = Math.floor(s.length / 2);
        return jsDivergence(countBy(s.slice(0, h), r => r.kind || '?'), countBy(s.slice(h), r => r.kind || '?'));
    });
    const ms = rs.map(r => r.ms).filter(Number.isFinite);
    const models = countBy(rs.filter(r => r.model), r => r.model);
    return {
        n: rs.length,
        agents: Object.keys(byAgent).length,
        model: Object.keys(models).sort((a, b) => models[b] - models[a])[0] || null,
        top1: +(inSet.filter(r => r.chosen === 0).length / Math.max(1, inSet.length)).toFixed(3),
        meanRank: +mean(inSet.map(r => r.chosen)).toFixed(3),
        outOfSet: +((rs.length - inSet.length) / rs.length).toFixed(3),
        regret: regret.length ? +mean(regret).toFixed(3) : null,
        kindEntropy: +entropy(kinds).toFixed(3),
        kinds,
        explore: +((kinds.visit || 0) / rs.length).toFixed(3),
        rest: +((kinds.rest || 0) / rs.length).toFixed(3),
        // a rate over less than half a day of closed records is noise, not a number
        earnPerDay: dT >= 0.5 ? Math.round(dW / dT) : null,
        beta: fitBeta(rs),
        individuality: pair.length ? +mean(pair).toFixed(3) : null,
        drift: drift.length ? +mean(drift).toFixed(3) : null,
        latencyMs: ms.length ? Math.round(mean(ms)) : null,
        thoughts: thoughtFeatures(rs.map(r => r.thought))
    };
}

// Which group a record counts in. In a mixed society, its cohort; a decision the rules made for a
// model's resident (the model was busy or did not answer) is kept apart as "<cohort>·rules" or
// "<cohort>·fallback", so a cohort's numbers are only what that cohort chose.
export function groupKey(r) {
    if (r.cohort) {
        if (r.cohortKind === 'rules') return r.cohort;
        return r.by === 'mind' || r.by === 'human' ? r.cohort : `${r.cohort}·${r.by}`;
    }
    return r.by === 'fallback' ? 'fallback' : r.cond || r.by;
}
export function byCondition(records) {
    const g = {};
    for (const r of records) { const k = groupKey(r); (g[k] = g[k] || []).push(r); }
    return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, summarize(v)]));
}
// Group names in reading order: the rules, then each cohort, then the turns the rules took for one.
export const groupOrder = (a, b) => (a.includes('·') - b.includes('·')) || ((b === 'rules') - (a === 'rules')) || ((b === 'human') - (a === 'human')) || (a < b ? -1 : a > b ? 1 : 0);

// How far each group's way of choosing is from the person's (the "human" group): the
// Jensen–Shannon divergence of their action mixes (0 = the same mix) and the gap in β.
// Small numbers mean "chooses more like the person did" — on these measures only.
export function distanceToHuman(groups) {
    const human = groups.human;
    if (!human || !human.n) return {};
    const out = {};
    for (const [k, s] of Object.entries(groups)) {
        if (k === 'human' || !s.n) continue;
        out[k] = {
            mix: jsDivergence(s.kinds || {}, human.kinds || {}),
            beta: s.beta && human.beta ? +Math.abs(s.beta.beta - human.beta.beta).toFixed(2) : null,
            top1: s.top1 != null && human.top1 != null ? +Math.abs(s.top1 - human.top1).toFixed(3) : null
        };
    }
    return out;
}
// The same measures per window of `days` in-world days, to see change over time.
export function windows(records, days = 1) {
    const g = new Map();
    for (const r of records) { const w = Math.floor((r.T || 0) / days); if (!g.has(w)) g.set(w, []); g.get(w).push(r); }
    return [...g.entries()].sort((a, b) => a[0] - b[0]).map(([w, rs]) => ({ from: w * days, to: (w + 1) * days, ...summarize(rs) }));
}
// Least-squares slope of a measure across windows (per day): is it moving, and which way?
export function trend(rows, key) {
    const pts = rows.map(r => [(r.from + r.to) / 2, typeof key === 'function' ? key(r) : r[key]]).filter(([, y]) => Number.isFinite(y));
    if (pts.length < 3) return null;
    const mx = mean(pts.map(p => p[0])), my = mean(pts.map(p => p[1]));
    const sxx = pts.reduce((s, [x]) => s + (x - mx) ** 2, 0);
    return sxx ? +(pts.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0) / sxx).toFixed(5) : null;
}
// Two proportions (e.g. top1 of rules vs mind): difference and a z score.
export function twoProportions(k1, n1, k2, n2) {
    if (!n1 || !n2) return null;
    const p1 = k1 / n1, p2 = k2 / n2, p = (k1 + k2) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    return { diff: +(p1 - p2).toFixed(4), z: se ? +((p1 - p2) / se).toFixed(2) : null };
}

// ------------------------------------------------------------ files

export const toJSONL = records => records.map(r => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');
export function fromJSONL(text) {
    const out = [];
    for (const line of String(text).split('\n')) {
        if (!line.trim()) continue;
        try { const r = JSON.parse(line); if (r && Array.isArray(r.cands)) out.push(r); } catch { /* skip a broken line */ }
    }
    return out;
}

// ------------------------------------------------------------ browser storage (IndexedDB)

// A small store for records on this device. Falls back to memory when IndexedDB is missing.
export function openStore(name = 'zipangu-research', idb = globalThis.indexedDB) {
    const mem = [];
    if (!idb) return { add: r => { mem.push(r); }, all: async () => mem.slice(), count: async () => mem.length, clear: async () => { mem.length = 0; } };
    const db = new Promise((resolve, reject) => {
        const req = idb.open(name, 1);
        req.onupgradeneeded = () => req.result.createObjectStore('decisions', { autoIncrement: true });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    const tx = async (mode, fn) => {
        const d = await db;
        return new Promise((resolve, reject) => {
            const t = d.transaction('decisions', mode), st = t.objectStore('decisions');
            const req = fn(st);
            t.oncomplete = () => resolve(req && req.result);
            t.onerror = () => reject(t.error);
        });
    };
    let queue = [], timer = null;
    const flush = () => { const batch = queue; queue = []; timer = null; if (batch.length) tx('readwrite', st => { for (const r of batch) st.add(r); }).catch(() => {}); };
    return {
        add(r) { queue.push(r); if (!timer) timer = setTimeout(flush, 2000); },
        async all() { flush(); return (await tx('readonly', st => st.getAll())) || []; },
        async count() { return (await tx('readonly', st => st.count())) + queue.length; },
        async clear() { queue = []; await tx('readwrite', st => st.clear()); }
    };
}
