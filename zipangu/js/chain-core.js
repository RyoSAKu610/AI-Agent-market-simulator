// What every chain engine shares (js/chain.js for Solana devnet, js/chain-evm.js for Robinhood
// Chain and Arc testnets, js/chain-zcash.js for Zcash testnet; docs/ONCHAIN.md): how a sim
// trade becomes an op, how ops become a memo, the pending-op queue, and the engine plumbing
// (guarded storage, listeners, the ledger of ChainTx records). Pure: no DOM, no network, no
// timers at import.

export const TX_CAP = 300;
const DECIMALS = 2;                       // KOGANE has two decimals on every network

// KOGANE ui amount → integer base units (2 decimals). Never negative / NaN / Infinity.
export function toBaseUnits(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(Math.round(n * 10 ** DECIMALS), Number.MAX_SAFE_INTEGER);
}
export const fromUnits = u => u / 10 ** DECIMALS;

// sim 'trade' event → one transfer op, or null when it cannot be mapped honestly.
// buy/craft move agent → place vault, sell moves vault → agent.
export function opsFromTrade(W, ev) {
    if (!ev || !['buy', 'sell', 'craft'].includes(ev.action) || !ev.agent) return null;
    const place = W && W.placeOf ? W.placeOf(ev.district) : null;
    const units = toBaseUnits(ev.total);
    if (!place || !units) return null;
    return {
        action: ev.action, agent: ev.agent, district: ev.district, place: place.id,
        good: ev.good || null, qty: Number(ev.qty) || 0, amount: fromUnits(units), seq: ev.seq ?? null
    };
}

const utf8 = new TextEncoder();
export const byteLen = s => utf8.encode(s).length;
export const clean = v => String(v ?? '').replace(/[\s|;=]+/g, '_');
const ACT = { buy: 'b', craft: 'c', sell: 's' };

// Memo text. Always starts with `zipangu:`, always ≤ maxBytes UTF-8 bytes (400 on Solana and the
// EVM networks, 80 in a Zcash OP_RETURN): ops are dropped from the tail (counted as `+N`) and,
// as a last resort, characters are trimmed.
export function encodeMemo(kind, ops = [], extra = {}, maxBytes = 400) {
    const head = [`zipangu:${clean(kind)}`];
    if (ops.some(o => o && o.merged)) head.push('batched');
    for (const [k, v] of Object.entries(extra || {})) if (v != null && v !== false) head.push(`${clean(k)}=${clean(v)}`);
    const parts = ops.map(o => `${ACT[o.action] || '?'}:${clean(o.agent)}@${clean(o.place)}:${clean(o.good)}x${o.qty}=${o.amount}`);
    const build = n => {
        const shown = parts.slice(0, n).join(';');
        const dropped = parts.length - n;
        return head.join('|') + (shown ? '|' + shown : '') + (dropped ? `|+${dropped}` : '');
    };
    let n = parts.length, s = build(n);
    while (byteLen(s) > maxBytes && n > 0) s = build(--n);
    while (byteLen(s) > maxBytes) s = s.slice(0, -1);   // head alone too long: trim chars
    return s;
}

// Pending-op queue. take() hands out ≤ maxOps; once the queue holds `cap` ops, a new op
// folds into an existing one with the same (agent, place, direction) and is flagged `merged`.
export function createBatcher({ maxOps = 4, cap = 60 } = {}) {
    const items = [];
    const dir = o => (o.action === 'sell' ? 'in' : 'out');
    return {
        push(op) {
            if (!op || !toBaseUnits(op.amount)) return false;
            if (items.length >= cap) {
                const hit = items.find(o => o.agent === op.agent && o.place === op.place && dir(o) === dir(op));
                if (hit) {
                    hit.amount = fromUnits(toBaseUnits(hit.amount) + toBaseUnits(op.amount));
                    hit.qty += op.qty || 0;
                    hit.merged = (hit.merged || 1) + 1;
                    return true;
                }
            }
            items.push({ ...op });
            return true;
        },
        take() { return items.splice(0, maxOps); },
        get size() { return items.length; },
        peek() { return items.slice(); },
        clear() { items.length = 0; }
    };
}

// ------------------------------------------------------------------ engine plumbing

// localStorage when present, else a throwaway in-memory shim. Every access is guarded.
export function storeOf(storage, key) {
    let store = storage;
    if (store === undefined) { try { store = typeof localStorage !== 'undefined' ? localStorage : null; } catch { store = null; } }
    const mem = new Map();
    return {
        read: () => { try { return store ? store.getItem(key) : mem.get(key) ?? null; } catch { return null; } },
        write: v => { try { if (store) store.setItem(key, v); else mem.set(key, v); } catch { /* quota or private mode */ } },
        wipe: () => { try { if (store) store.removeItem(key); mem.delete(key); } catch { /* ignore */ } }
    };
}

export function emitter() {
    const listeners = new Map();
    return {
        emit(type, msg) { for (const fn of [...(listeners.get(type) || [])]) { try { fn(msg); } catch { /* a listener bug must not break the engine */ } } },
        on(type, fn) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(fn);
            return () => listeners.get(type).delete(fn);
        }
    };
}

// The ledger: ChainTx records, newest first, capped. Ids keep counting after a reload.
// ChainTx = { id, kind, status: 'queued'|'sent'|'confirmed'|'failed', sig, slot, error, ops, memo, at }
export function txLog({ emit, changed }) {
    let txs = [], seq = 0;
    return {
        get list() { return txs; },
        load(saved) {
            txs = Array.isArray(saved) ? saved.slice(0, TX_CAP) : [];
            // A tx that was never sent when the page closed did not happen; a sent one is re-checked later.
            for (const t of txs) if (t.status === 'queued') { t.status = 'failed'; t.error = '送信前に中断 / interrupted before sending'; }
            seq = txs.reduce((m, t) => Math.max(m, Number(String(t.id).split('-').pop()) || 0), 0);
        },
        add(kind, ops, memo) {
            const t = { id: `tx-${Date.now().toString(36)}-${++seq}`, kind, status: 'queued', sig: null, slot: null, error: null, ops, memo, at: Date.now() };
            txs.unshift(t);
            if (txs.length > TX_CAP) txs.length = TX_CAP;
            emit('tx', t); changed();
            return t;
        },
        touch(t, patch) { Object.assign(t, patch); emit('tx', t); changed(); },
        clear() { txs = []; seq = 0; }
    };
}

// Counts over the ledger. volume = KOGANE moved by confirmed trades.
export function statsOf(txs, since) {
    let confirmed = 0, failed = 0, pending = 0, volume = 0;
    for (const t of txs) {
        if (t.status === 'confirmed') { confirmed++; if (t.kind === 'trade') for (const o of t.ops) volume += o.amount || 0; }
        else if (t.status === 'failed') failed++;
        else pending++;
    }
    return { confirmed, failed, pending, volume: Math.round(volume * 100) / 100, since };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const errText = e => String((e && (e.shortMessage || e.message || e.error?.message)) || e || 'unknown error').slice(0, 300);

// A per-request id for an x402-style hire, the same shape on every network.
export const hireMemo = requestId => `zipangu:x402:${requestId}`;

// Loads the first URL that imports; tests and Node inject their own loader instead.
export async function importFirst(urls) {
    let last;
    for (const u of urls) {
        try { return await import(/* @vite-ignore */ u); } catch (e) { last = e; }
    }
    throw last || new Error('import failed');
}
