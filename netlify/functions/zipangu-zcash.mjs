// ⛓ Zcash testnet JSON-RPC relay for 万華京ジパング's chain mode (zipangu/js/chain-zcash.js,
// zipangu/docs/ONCHAIN.md). A page cannot call a Zcash node directly (no CORS, sometimes an API
// key), so it sends the few lightwalletd-style methods it needs here and this forwards them to
// one node.
//
// Only these methods, with checked parameters: getblockchaininfo, getaddressbalance,
// getaddressutxos, getaddresstxids, getrawtransaction, sendrawtransaction (version-5
// transactions only). Only testnet transparent addresses. If the node is not on the test chain,
// every call answers 503 not_testnet. The visitor's address is used only for rate limiting, in
// memory, and is never stored.
//
// Environment (Netlify site settings). Without the first, the endpoint answers 503 not_configured.
//   ZIPANGU_ZCASH_RPC_URL     JSON-RPC URL of a Zebra (or zcashd / Zaino) node on testnet
//   ZIPANGU_ZCASH_RPC_HEADER  optional "Name: value" header the node wants (e.g. "x-api-key: …")
//   ZIPANGU_ZCASH_RPC_AUTH    optional "user:password" for HTTP basic auth (zcashd-style nodes)
//   ZIPANGU_ZCASH_ORIGINS     optional extra allowed origins, comma separated
//                             (default: this site and https://ryosaku610.github.io)
import { decodeTaddr } from '../../zipangu/js/zcash.js';

const PER_MINUTE = 90;
const MAX_BODY = 40_000;
const MAX_RAW_TX = 20_000;                 // hex characters (10 KB)
const hits = new Map();
let testnet = { ok: null, at: 0 };

const env = name => {
    try { if (globalThis.Netlify && globalThis.Netlify.env) { const v = globalThis.Netlify.env.get(name); if (v) return v; } } catch { /* fall through */ }
    return typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
};
function allowedOrigin(req) {
    const origin = req.headers.get('origin');
    if (!origin) return { ok: true, origin: null };
    let host;
    try { host = new URL(origin).origin; } catch { return { ok: false }; }
    const self = new URL(req.url).origin;
    const extra = String(env('ZIPANGU_ZCASH_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
    return new Set([self, 'https://ryosaku610.github.io', ...extra]).has(host) ? { ok: true, origin: host } : { ok: false };
}
const respond = (body, status, origin) => new Response(JSON.stringify(body), {
    status,
    headers: {
        'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
        ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {})
    }
});
function limited(ip, now = Date.now()) {
    const list = (hits.get(ip) || []).filter(t => now - t < 60000);
    if (list.length >= PER_MINUTE) { hits.set(ip, list); return true; }
    list.push(now); hits.set(ip, list);
    if (hits.size > 5000) hits.clear();
    return false;
}

const addrs = v => Array.isArray(v) && v.length >= 1 && v.length <= 20 && v.every(a => typeof a === 'string' && a.length <= 40 && decodeTaddr(a));
const height = v => Number.isInteger(v) && v >= 0 && v <= 100_000_000;
const TXID = /^[0-9a-f]{64}$/;
// method → params check. Anything else is refused.
const METHODS = {
    getblockchaininfo: p => p.length === 0,
    getaddressbalance: p => p.length === 1 && p[0] && addrs(p[0].addresses) && Object.keys(p[0]).length === 1,
    getaddressutxos: p => p.length === 1 && p[0] && addrs(p[0].addresses) && Object.keys(p[0]).length === 1,
    getaddresstxids: p => p.length === 1 && p[0] && addrs(p[0].addresses) && height(p[0].start) && height(p[0].end) && p[0].end >= p[0].start && p[0].end - p[0].start <= 100_000 && Object.keys(p[0]).length === 3,
    getrawtransaction: p => p.length === 2 && typeof p[0] === 'string' && TXID.test(p[0]) && (p[1] === 0 || p[1] === 1),
    sendrawtransaction: p => p.length === 1 && typeof p[0] === 'string' && p[0].length <= MAX_RAW_TX && p[0].length % 2 === 0 && /^050000800a27a726[0-9a-f]+$/.test(p[0])
};
export const checkCall = body => {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return 'request';
    if (!Object.prototype.hasOwnProperty.call(METHODS, body.method)) return 'method';
    const params = body.params === undefined ? [] : body.params;
    if (!Array.isArray(params) || !METHODS[body.method](params)) return 'params';
    return null;
};

async function upstream(method, params, id) {
    const url = env('ZIPANGU_ZCASH_RPC_URL');
    const headers = { 'content-type': 'application/json', 'user-agent': 'zipangu-zcash' };
    const extra = env('ZIPANGU_ZCASH_RPC_HEADER');
    if (extra && /^[\w-]+:\s*.+$/.test(extra)) { const i = extra.indexOf(':'); headers[extra.slice(0, i).trim().toLowerCase()] = extra.slice(i + 1).trim(); }
    const auth = env('ZIPANGU_ZCASH_RPC_AUTH');
    if (auth) headers.authorization = 'Basic ' + Buffer.from(auth, 'utf8').toString('base64');
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }), signal: ctl.signal });
        const text = await res.text();
        let body;
        try { body = JSON.parse(text); } catch { return null; }
        return body && typeof body === 'object' && ('result' in body || 'error' in body) ? { result: body.result ?? null, error: body.error ?? null, id } : null;
    } catch { return null; } finally { clearTimeout(timer); }
}
// Is the node on the test chain? Asked once, remembered for ten minutes.
async function onTestnet(now = Date.now()) {
    if (testnet.ok !== null && now - testnet.at < 600_000) return testnet.ok;
    const r = await upstream('getblockchaininfo', [], 0);
    if (!r || !r.result) return null;                       // unreachable: ask again next time
    testnet = { ok: r.result.chain === 'test', at: now };
    return testnet.ok;
}

export default async (req, context = {}) => {
    const allow = allowedOrigin(req);
    if (!allow.ok) return respond({ error: 'forbidden_origin' }, 403, null);
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { 'access-control-allow-origin': allow.origin || '*', 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '600', vary: 'Origin' } });
    }
    if (req.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405, allow.origin);
    const url = env('ZIPANGU_ZCASH_RPC_URL');
    if (!url || !/^https?:\/\//.test(url)) return respond({ error: 'not_configured' }, 503, allow.origin);
    const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'anon';
    if (limited(ip)) return respond({ error: 'rate_limited' }, 429, allow.origin);
    const text = await req.text();
    if (text.length > MAX_BODY) return respond({ error: 'too_large' }, 413, allow.origin);
    let body;
    try { body = JSON.parse(text); } catch { return respond({ error: 'bad_json' }, 400, allow.origin); }
    const bad = checkCall(body);
    if (bad) return respond({ error: 'refused', detail: bad }, 400, allow.origin);
    const test = await onTestnet();
    if (test === null) return respond({ error: 'upstream' }, 502, allow.origin);
    if (!test) return respond({ error: 'not_testnet' }, 503, allow.origin);
    const out = await upstream(body.method, body.params || [], typeof body.id === 'number' || typeof body.id === 'string' ? body.id : 1);
    if (!out) return respond({ error: 'upstream' }, 502, allow.origin);
    return respond(out, 200, allow.origin);
};

// for tests
export const _reset = () => { hits.clear(); testnet = { ok: null, at: 0 }; };
