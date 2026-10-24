// Reading a transaction back from a test network with nothing but fetch: the memo it carries,
// whether it succeeded, and its slot or block. Birth certificates (js/view-birth.js) use this to
// check a certificate on the network it was written to, whichever network chain mode is on now,
// and the engines share the same parsers. No library, no state, no I/O at import.
//
//   { status: 'ok' | 'failed' | 'pending' | 'notfound', memo: string | null, slot: number | null }

import { networkOf, ZCASH_RELAY } from './networks.js';

export const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const ZCASH_RPC_KEY = 'zipangu.chain.zcash.rpc';

const notFound = { status: 'notfound', memo: null, slot: null };
const utf8 = bytes => { try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return null; } };
const fromHex = hex => {
    if (typeof hex !== 'string' || hex.length % 2 || !/^[0-9a-f]*$/i.test(hex)) return null;
    const b = new Uint8Array(hex.length / 2);
    for (let i = 0; i < b.length; i++) b[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return b;
};

// ------------------------------------------------------------ Solana devnet (SPL Memo)

export function memoFromSolana(parsed) {
    const ixs = (parsed && parsed.transaction && parsed.transaction.message && parsed.transaction.message.instructions) || [];
    const ix = ixs.find(i => i && (i.program === 'spl-memo' || String(i.programId || '') === MEMO_PROGRAM));
    return ix && typeof ix.parsed === 'string' ? ix.parsed : null;
}
export function readSolana(parsed) {
    if (!parsed) return notFound;
    const slot = Number.isFinite(parsed.slot) ? parsed.slot : null;
    return { status: parsed.meta && parsed.meta.err ? 'failed' : 'ok', memo: memoFromSolana(parsed), slot };
}

// ------------------------------------------------------------ EVM testnets (calldata as UTF-8)

export function memoFromCalldata(hex) {
    if (typeof hex !== 'string' || !/^0x/i.test(hex) || hex.length <= 2) return null;
    const b = fromHex(hex.slice(2));
    return b ? utf8(b) : null;
}
// tx = eth_getTransactionByHash, receipt = eth_getTransactionReceipt (raw JSON-RPC or ethers objects).
export function readEvm(tx, receipt) {
    if (!tx) return notFound;
    const memo = memoFromCalldata(tx.input ?? tx.data);
    if (!receipt) return { status: 'pending', memo, slot: null };
    const st = receipt.status;
    const ok = st === 1 || st === '0x1' || st === 1n;
    return { status: ok ? 'ok' : 'failed', memo, slot: receipt.blockNumber != null ? Number(receipt.blockNumber) : null };
}

// ------------------------------------------------------------ Zcash testnet (OP_RETURN)

// The bytes pushed after OP_RETURN in an output script (hex), or null if it is not one.
export function opReturnData(scriptHex) {
    const s = fromHex(String(scriptHex || ''));
    if (!s || s.length < 2 || s[0] !== 0x6a) return null;
    let len, at;
    if (s[1] >= 1 && s[1] <= 75) { len = s[1]; at = 2; }
    else if (s[1] === 0x4c && s.length >= 3) { len = s[2]; at = 3; }
    else if (s[1] === 0x4d && s.length >= 4) { len = s[2] | (s[3] << 8); at = 4; }
    else return null;
    return at + len === s.length ? s.slice(at) : null;
}
// raw = getrawtransaction(txid, 1) as Zebra or zcashd return it.
export function readZcash(raw) {
    if (!raw) return notFound;
    let memo = null;
    for (const o of Array.isArray(raw.vout) ? raw.vout : []) {
        const d = opReturnData(o && o.scriptPubKey && o.scriptPubKey.hex);
        if (d) { memo = utf8(d); break; }
    }
    const confirmed = Number(raw.confirmations) > 0;
    return { status: confirmed ? 'ok' : 'pending', memo, slot: confirmed && Number.isFinite(raw.height) ? raw.height : null };
}

// ------------------------------------------------------------ JSON-RPC

export class RpcError extends Error {
    constructor(message, code = null, status = null) { super(message); this.code = code; this.status = status; }
}
export async function rpcCall(url, method, params = [], { fetch: f = globalThis.fetch, timeoutMs = 20000, version = '2.0' } = {}) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
    try {
        const res = await f(url, {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ jsonrpc: version, id: Date.now(), method, params }), signal: ctl ? ctl.signal : undefined
        });
        let body = null;
        try { body = await res.json(); } catch { /* not JSON */ }
        if (body && body.error) throw new RpcError(String(body.error.message || body.error).slice(0, 200), body.error.code ?? null, res.status);
        if (!res.ok) throw new RpcError((body && body.message) || (body && body.error) || `HTTP ${res.status}`, null, res.status);
        if (!body || !('result' in body)) throw new RpcError('no result', null, res.status);
        return body.result;
    } finally { if (timer) clearTimeout(timer); }
}

// Where the Zcash JSON-RPC lives: a node the visitor set (ZCASH_RPC_KEY), else the relay
// (same-origin on the Netlify build).
export function zcashEndpoint(storage) {
    let custom = null;
    try { custom = storage ? storage.getItem(ZCASH_RPC_KEY) : null; } catch { /* fine */ }
    if (custom && /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/)/.test(custom)) return custom;
    try { if (typeof location !== 'undefined' && /\.netlify\.app$/.test(location.hostname)) return '/.netlify/functions/zipangu-zcash'; } catch { /* fine */ }
    return ZCASH_RELAY;
}

// Reads `txid` on network `netId` → { status, memo, slot }. Refuses an RPC on another chain.
export async function readMemo(netId, txid, { fetch: f = globalThis.fetch, storage } = {}) {
    const net = networkOf(netId);
    const o = { fetch: f };
    if (net.family === 'solana') {
        return readSolana(await rpcCall(net.rpc[0], 'getTransaction', [txid, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }], o));
    }
    if (net.family === 'evm') {
        const url = net.rpc[0];
        if (Number(await rpcCall(url, 'eth_chainId', [], o)) !== net.chainId) throw new Error(`${url} is not ${net.name}`);
        const [tx, receipt] = await Promise.all([rpcCall(url, 'eth_getTransactionByHash', [txid], o), rpcCall(url, 'eth_getTransactionReceipt', [txid], o)]);
        return readEvm(tx, receipt);
    }
    const url = zcashEndpoint(storage);
    const info = await rpcCall(url, 'getblockchaininfo', [], { ...o, version: '1.0' });
    if (!info || info.chain !== 'test') throw new Error('the Zcash node is not on testnet');
    try { return readZcash(await rpcCall(url, 'getrawtransaction', [txid, 1], { ...o, version: '1.0' })); }
    catch (e) { if (e instanceof RpcError && (e.code === -5 || e.code === -8)) return notFound; throw e; }
}
