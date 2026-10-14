// 🧪 A mixed society: residents of one world think in different ways at the same time.
//
// Each resident belongs to one cohort:
//   rules   — the economy's own rules choose (no model, fully offline)
//   mind    — a language model chooses (Qwen in the browser, or any model on an endpoint)
//   random  — a uniform chooser among the same candidates (a floor for comparisons)
// The cohorts share one world, one market and one clock, so differences between them are
// differences in how they choose, not in what they were offered.
//
// createSociety() returns an object with the same face as a single mind (js/mind.js), so
// sim.js, the HUD and the pages need not know whether one mind or many are running.

export const SOCIETY_KEY = 'zipangu.society.v1';
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,39}$/;

// A short, file-safe id for a model name: 'qwen/qwen-2.5-72b-instruct' → 'qwen-2.5-72b-instruct'.
export function cohortIdOf(model, taken = new Set()) {
    let id = String(model || 'mind').split('/').pop().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^[-.]+|-+$/g, '').slice(0, 32) || 'mind';
    let k = id, n = 2;
    while (taken.has(k)) k = `${id}-${n++}`;
    taken.add(k);
    return k;
}

// Checks a society description (JSON from a file or settings) and fills in defaults.
// { base?, keyEnv?, cohorts: [{ id?, kind?, model?, base?, keyEnv?, share }] }
export function parseSociety(spec) {
    const errors = [];
    const list = spec && Array.isArray(spec.cohorts) ? spec.cohorts : null;
    if (!list || !list.length) return { ok: false, errors: ['cohorts: at least one is needed'] };
    if (list.length > 12) errors.push('cohorts: at most 12');
    const taken = new Set(), cohorts = [];
    for (const [i, c] of list.entries()) {
        const kind = c.kind || (c.model ? 'mind' : 'rules');
        if (!['rules', 'mind', 'random'].includes(kind)) { errors.push(`cohorts[${i}].kind: rules | mind | random`); continue; }
        const share = Number(c.share ?? 1);
        if (!(share > 0)) { errors.push(`cohorts[${i}].share: a positive number`); continue; }
        let id = c.id ? String(c.id).toLowerCase() : null;
        if (id && (!ID_RE.test(id) || taken.has(id))) { errors.push(`cohorts[${i}].id: unique, a–z 0–9 . _ -`); continue; }
        if (!id) id = kind === 'mind' ? cohortIdOf(c.model, taken) : cohortIdOf(kind, taken); else taken.add(id);
        if (kind === 'mind' && typeof c.model !== 'string' && c.model !== null && c.model !== undefined) { errors.push(`cohorts[${i}].model: a string`); continue; }
        cohorts.push({ id, kind, share, model: kind === 'mind' ? (c.model || null) : null, base: kind === 'mind' ? c.base || spec.base || null : null, keyEnv: kind === 'mind' ? c.keyEnv || spec.keyEnv || null : null });
    }
    return errors.length ? { ok: false, errors } : { ok: true, cohorts };
}

// FNV-1a: a small stable hash so the same resident lands in the same cohort on every visit.
const hash01 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

// Splits residents between cohorts in proportion to their shares (largest remainders), in a
// seeded but stable order. A resident not in `ids` (one met later) still gets a cohort, by hash.
export function assignCohorts(ids, cohorts, seed = 1) {
    const total = cohorts.reduce((s, c) => s + c.share, 0);
    const order = [...new Set(ids)].sort((a, b) => hash01(seed + ':' + a) - hash01(seed + ':' + b) || (a < b ? -1 : 1));
    const quota = cohorts.map(c => (order.length * c.share) / total);
    const counts = quota.map(Math.floor);
    let left = order.length - counts.reduce((s, n) => s + n, 0);
    for (const i of quota.map((q, i) => [q - Math.floor(q), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(x => x[1])) { if (left-- <= 0) break; counts[i]++; }
    const map = new Map();
    let k = 0;
    cohorts.forEach((c, i) => { for (let n = 0; n < counts[i]; n++) map.set(order[k++], c.id); });
    const pick = id => {
        if (map.has(id)) return map.get(id);
        let x = hash01(seed + ':' + id) * total;
        for (const c of cohorts) { if ((x -= c.share) < 0) return c.id; }
        return cohorts[cohorts.length - 1].id;
    };
    return { cohortOf: pick, counts: Object.fromEntries(cohorts.map((c, i) => [c.id, counts[i]])) };
}

// a seeded uniform chooser with the same face as a mind
export function randomMind(seed = 1) {
    let s = (seed * 2654435761) >>> 0;
    const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const status = { state: 'ready', model: 'random', asked: 0, answered: 0, failed: 0, progress: 1, error: '', log: [] };
    return {
        wants: () => true, covers: () => true, now: () => Date.now(), patience: 1e9, status,
        on: () => () => {}, logFor: () => [],
        ask: async (a, opts) => { status.asked++; status.answered++; return { choice: 1 + Math.floor(next() * opts.length), thought: '', model: 'random', raw: '' }; }
    };
}

const RANK = { working: 6, loading: 5, ready: 4, budget: 3, error: 2, idle: 1, unsupported: 0, off: 0 };

// One face over many minds. `members` maps cohort id → mind (or null for the rules).
export function createSociety({ cohorts, members, cohortOf, label = null }) {
    const kindOf = new Map(cohorts.map(c => [c.id, c.kind]));
    const minds = cohorts.filter(c => members[c.id]).map(c => [c.id, members[c.id]]);
    const listeners = new Set();
    const status = { state: 'idle', model: '', asked: 0, answered: 0, failed: 0, progress: 0, error: '', log: [], cohorts: {} };
    function refresh() {
        let best = null;
        status.asked = status.answered = status.failed = 0;
        const logs = [];
        for (const [id, m] of minds) {
            const st = m.status || {};
            status.asked += st.asked || 0; status.answered += st.answered || 0; status.failed += st.failed || 0;
            status.cohorts[id] = { state: st.state, model: st.model, asked: st.asked || 0, answered: st.answered || 0, failed: st.failed || 0 };
            if (!best || (RANK[st.state] ?? 0) > (RANK[best.state] ?? 0)) best = st;
            for (const e of st.log || []) logs.push({ ...e, cohort: id });
        }
        status.state = best ? best.state : 'off';
        status.progress = best ? best.progress || 0 : 0;
        status.error = minds.map(([, m]) => m.status && m.status.error).find(Boolean) || '';
        status.model = label || (minds.length === 1 ? (minds[0][1].status || {}).model || '' : `${minds.length} minds`);
        status.log = logs.sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 60);
        for (const fn of listeners) { try { fn(status); } catch { /* a listener must not stop the minds */ } }
    }
    for (const [, m] of minds) if (m.on) m.on(refresh);
    refresh();
    const memberOf = id => members[cohortOf(id)] || null;
    return {
        society: true, cohorts, cohortOf, kindOf: id => kindOf.get(cohortOf(id)) || 'rules', status,
        wants: id => { const m = memberOf(id); return !!(m && m.wants(id)); },
        covers: id => { const m = memberOf(id); return !!(m && m.covers(id)); },
        ask: (a, ...rest) => { const m = memberOf(a.id); return m ? m.ask(a, ...rest) : Promise.resolve(null); },
        now: () => (globalThis.performance ? performance.now() : Date.now()),
        get patience() { return Math.max(25000, ...minds.map(([, m]) => m.patience || 0)); },
        on: fn => { listeners.add(fn); return () => listeners.delete(fn); },
        logFor: id => { const m = memberOf(id); return m && m.logFor ? m.logFor(id) : []; },
        engine: (minds.find(([, m]) => m.engine) || [])[1]?.engine || null,
        refresh
    };
}

// ------------------------------------------------------------ browser settings

// { on, aiShare (0–100, the share of residents that think with a model), models: [] (remote only) }
export function loadSocietySettings(storage = globalThis.localStorage) {
    try {
        const s = JSON.parse(storage.getItem(SOCIETY_KEY) || '{}');
        const models = Array.isArray(s.models) ? s.models.filter(m => typeof m === 'string' && /^[\w.:/@-]{1,80}$/.test(m)).slice(0, 6) : [];
        const aiShare = Math.max(0, Math.min(100, Math.round(Number(s.aiShare ?? 50)) || 0));
        return { on: s.on === true, aiShare, models };
    } catch { return { on: false, aiShare: 50, models: [] }; }
}
export function saveSocietySettings(storage, s) {
    try { storage.setItem(SOCIETY_KEY, JSON.stringify({ on: !!s.on, aiShare: s.aiShare, models: s.models || [] })); return true; } catch { return false; }
}
// The cohorts the browser settings describe: the rules for (100 − aiShare)% of residents, and
// the rest split evenly between the listed models (or the one configured model).
export function browserCohorts({ aiShare, models }, defaultModel = null) {
    const list = models && models.length ? models : [defaultModel];
    const out = [];
    if (aiShare < 100) out.push({ id: 'rules', kind: 'rules', share: 100 - aiShare });
    if (aiShare > 0) { const taken = new Set(['rules']); for (const m of list) out.push({ id: cohortIdOf(m, taken), kind: 'mind', model: m, share: aiShare / list.length }); }
    return out;
}
