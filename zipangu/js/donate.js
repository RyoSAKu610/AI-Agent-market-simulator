// 🤝 Donating decision records to research, with consent (docs/DATA.md).
//
// Nothing leaves the device until the visitor reads what will be sent, ticks every consent box
// and presses "donate". What is sent is a whitelist of the decision record's fields (the
// situation, the candidates, the choice, who chose, the inner voice with private details
// masked, and what came of it) under a random donor id. Prompts, raw model answers, soul-card
// text, keys and anything not on the list are dropped. The endpoint
// (netlify/functions/zipangu-donate.mjs) checks everything again with the same functions.
//
// Imports nothing that touches the DOM, so the endpoint can use it as is.
import { redactSecrets } from './redact.js';

export const DONATION_FORMAT = 'zipangu-donation/1';
export const CONSENT_VERSION = '2026-10-15';
export const DATA_LICENSE = 'CC-BY-NC-4.0';
export const DATA_LICENSE_URL = 'https://creativecommons.org/licenses/by-nc/4.0/';
export const MAX_RECORDS = 2000;
// GitHub Pages has no functions; donations go to the Netlify build of the same site.
export const DONATE_ENDPOINT = 'https://neonmyths.netlify.app/.netlify/functions/zipangu-donate';
export const DONATED_KEY = 'zipangu.donated.v1';

const ID = /^[\w.:@/-]{1,80}$/;
const BY = new Set(['rules', 'mind', 'human', 'fallback']);
const KINDS = new Set(['trade', 'sell', 'craft', 'visit', 'work', 'rest']);
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
const id = v => (typeof v === 'string' && ID.test(v) ? v : null);
const text = (v, max) => {
    if (typeof v !== 'string') return null;
    const r = redactSecrets(v);
    const s = r.text.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
    return s ? Array.from(s).slice(0, max).join('') : null;
};

// One decision record → the fields that may be donated, cleaned; null if it is not a record.
export function sanitizeRecord(r) {
    if (!r || typeof r !== 'object' || !Array.isArray(r.cands) || !r.cands.length || r.cands.length > 5) return null;
    const cands = [];
    for (const c of r.cands) {
        if (!c || !KINDS.has(c.kind)) return null;
        cands.push({ kind: c.kind, good: id(c.good), to: id(c.to), profit: int(Math.round(c.profit), -1e9, 1e9) ?? 0,
            time: num(c.time, 0, 1000) ?? 0, score: num(c.score, -1e9, 1e9) ?? 0, text: text(c.text, 200) });
    }
    const chosen = int(r.chosen, -1, cands.length - 1);
    if (chosen === null || !BY.has(r.by) || !id(r.agent)) return null;
    const t = r.traits && typeof r.traits === 'object' ? r.traits : {};
    const out = {
        v: 1,
        run: id(r.run), cond: id(r.cond), cohort: id(r.cohort), cohortKind: id(r.cohortKind),
        T: num(r.T, 0, 1e7) ?? 0, day: int(r.day, 0, 1e7), koku: int(r.koku, 0, 11), season: typeof r.season === 'string' ? r.season.slice(0, 4) : null,
        label: text(r.label, 12), sekki: text(r.sekki, 12),
        agent: r.agent, by: r.by, goal: id(r.goal), at: id(r.at),
        wallet: int(Math.round(r.wallet), -1e12, 1e12), carrying: int(r.carrying, 0, 1e6),
        cargo: Array.isArray(r.cargo) ? r.cargo.slice(0, 20).map(l => ({ good: id(l && l.good), qty: int(l && l.qty, 0, 1e6) ?? 0 })).filter(l => l.good) : [],
        traits: { risk: num(t.risk, 0, 1), wander: num(t.wander, 0, 1), diligence: num(t.diligence, 0, 1), nightOwl: t.nightOwl === true, capacity: int(t.capacity, 0, 1000) },
        cands, chosen, kind: KINDS.has(r.kind) ? r.kind : null,
        model: typeof r.model === 'string' && /^[\w.:/@ -]{1,60}$/.test(r.model) ? r.model : null,
        thought: text(r.thought, 80),
        ms: int(Math.round(r.ms), 0, 1e8),
        out: r.out && typeof r.out === 'object' && Number.isFinite(r.out.dWallet) && Number.isFinite(r.out.dT)
            ? { dWallet: Math.round(r.out.dWallet), dT: +Number(r.out.dT).toFixed(4) } : null
    };
    return out;
}

export const newDonorId = (rand = globalThis.crypto) => {
    const b = new Uint8Array(8);
    if (rand && rand.getRandomValues) rand.getRandomValues(b); else for (let i = 0; i < 8; i++) b[i] = Math.floor(Math.random() * 256);
    return 'd-' + Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
};

// The consent the visitor gave, in the shape the endpoint expects.
export function consentOf({ license = false, age = false, thirdParty = false, at = new Date().toISOString() } = {}) {
    return { version: CONSENT_VERSION, license: license ? DATA_LICENSE : null, age16: !!age, thirdParty: !!thirdParty, at };
}
export const consentComplete = c => !!(c && c.version === CONSENT_VERSION && c.license === DATA_LICENSE && c.age16 === true && c.thirdParty === true);

// → { format, consent, donor, records, dropped }
export function buildDonation(records, { donor, consent }) {
    const clean = [];
    let dropped = 0;
    for (const r of records.slice(0, MAX_RECORDS)) { const s = sanitizeRecord(r); if (s) clean.push(s); else dropped++; }
    return { format: DONATION_FORMAT, consent, donor, records: clean, dropped };
}

// The endpoint's check: the same whitelist again, never trusting the browser.
export function validateDonation(body) {
    if (!body || typeof body !== 'object' || body.format !== DONATION_FORMAT) return { ok: false, error: 'format' };
    if (!consentComplete(body.consent)) return { ok: false, error: 'consent' };
    if (typeof body.donor !== 'string' || !/^d-[0-9a-f]{16}$/.test(body.donor)) return { ok: false, error: 'donor' };
    if (!Array.isArray(body.records) || !body.records.length || body.records.length > MAX_RECORDS) return { ok: false, error: 'records' };
    const records = body.records.map(sanitizeRecord).filter(Boolean);
    if (!records.length) return { ok: false, error: 'records' };
    const at = typeof body.consent.at === 'string' && !Number.isNaN(Date.parse(body.consent.at)) ? new Date(body.consent.at).toISOString() : new Date().toISOString();
    return { ok: true, donation: { format: DONATION_FORMAT, consent: { ...body.consent, at }, donor: body.donor, records } };
}

// ------------------------------------------------------------ what this device already gave

// { donor, runs: { [run]: count already donated }, receipts: [{ id, token, n, at }] }
export function loadDonated(storage = globalThis.localStorage) {
    try {
        const s = JSON.parse(storage.getItem(DONATED_KEY) || '{}');
        const runs = {};
        for (const [k, v] of Object.entries(s.runs || {})) if (ID.test(k) && Number.isInteger(v) && v >= 0) runs[k] = v;
        const receipts = (Array.isArray(s.receipts) ? s.receipts : []).filter(r => r && /^zd-\d{6}-[0-9a-f]{12}$/.test(r.id) && /^[0-9a-f]{32}$/.test(r.token)).slice(-50);
        return { donor: typeof s.donor === 'string' && /^d-[0-9a-f]{16}$/.test(s.donor) ? s.donor : null, runs, receipts };
    } catch { return { donor: null, runs: {}, receipts: [] }; }
}
export function saveDonated(storage, d) {
    try { storage.setItem(DONATED_KEY, JSON.stringify(d)); return true; } catch { return false; }
}
// Records not yet donated: per run, those after the ones already sent (the store keeps order).
export function undonated(records, donated) {
    const seen = {}, out = [];
    for (const r of records) {
        const run = r.run || '-';
        seen[run] = (seen[run] || 0) + 1;
        if (seen[run] > (donated.runs[run] || 0)) out.push(r);
    }
    return out;
}
export function markDonated(donated, records) {
    const runs = { ...donated.runs };
    for (const r of records) { const run = r.run || '-'; runs[run] = (runs[run] || 0) + 1; }
    return { ...donated, runs };
}
