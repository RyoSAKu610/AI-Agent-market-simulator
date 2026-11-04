// 🧳 Carrying a journey to another device or browser: one file with everything this
// site keeps in localStorage (journeys, AIs brought in, birth certificates, the
// test-network wallets and ledgers, the traveller's journal, settings). API keys are never
// included, nor anything that may carry one: the visitor's own Zcash node URL stays behind,
// and a model endpoint loses its user:password@ and ?query. On import only known keys are written, and each module re-checks its
// own data when it reads it back.

export const BACKUP_MARK = 'ZIPANGU-BACKUP/1';
const ALLOWED = /^zipangu\.(journey\.v1:\d{1,12}|travellers\.v1|births\.v1|progress\.v1|chain\.v1|chain\.on|chain\.net|chain\.(?:robinhood-testnet|arc-testnet|zcash-testnet)\.v1|lang|speed|welcome|mind\.v1|mind\.local\.ok)$/;
const MAX_VALUE = 4 * 1024 * 1024;

export const backupAllowed = key => ALLOWED.test(String(key));

// An endpoint typed in settings can hold a token (https://user:token@host/…, …?key=…).
export function scrubUrl(url) {
    try {
        const u = new URL(String(url));
        u.username = ''; u.password = ''; u.search = ''; u.hash = '';
        return u.href;
    } catch { return ''; }
}

function scrub(key, value) {
    if (key !== 'zipangu.mind.v1') return value;
    try {
        const s = JSON.parse(value);
        if (s && typeof s === 'object' && s.base) s.base = scrubUrl(s.base);
        return JSON.stringify(s);
    } catch { return value; }
}

export function makeBackup(storage, { now = () => new Date().toISOString() } = {}) {
    const items = {};
    for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!backupAllowed(k)) continue;           // zipangu.mind.key (an API key) and anything else stays behind
        const v = storage.getItem(k);
        if (typeof v === 'string' && v.length <= MAX_VALUE) items[k] = scrub(k, v);
    }
    return JSON.stringify({ format: BACKUP_MARK, at: now(), note: 'Kaleidoscope Zipangu backup. Holds your test-network wallet keys and the AIs you brought in: keep it private. No API keys are included.', items }, null, 1);
}

// → { ok, keys } or { ok: false, error: 'json' | 'format' | 'empty' }
export function readBackup(text) {
    let obj;
    try { obj = JSON.parse(String(text)); } catch { return { ok: false, error: 'json' }; }
    if (!obj || obj.format !== BACKUP_MARK || !obj.items || typeof obj.items !== 'object' || Array.isArray(obj.items)) return { ok: false, error: 'format' };
    const items = {};
    for (const [k, v] of Object.entries(obj.items)) if (backupAllowed(k) && typeof v === 'string' && v.length <= MAX_VALUE) items[k] = v;
    if (!Object.keys(items).length) return { ok: false, error: 'empty' };
    return { ok: true, items, at: String(obj.at || '').slice(0, 32) };
}

// Replaces what the file holds; keys the file does not mention are left as they are.
export function restoreBackup(storage, items) {
    let n = 0;
    for (const [k, v] of Object.entries(items)) {
        if (!backupAllowed(k)) continue;
        try { storage.setItem(k, v); n++; } catch { /* quota: keep going */ }
    }
    return n;
}
