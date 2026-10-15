// 🤝 Donation endpoint for 万華京ジパング's research log (zipangu/js/donate.js, docs/DATA.md).
//
// POST   a donation (consent + records) → checked again against the same whitelist, stored as
//        one JSON file in a private GitHub repository, answered with an id and a delete token.
// DELETE { id, token } → removes that donation (only the holder of the token can).
//
// The visitor's address is used only for rate limiting in memory and is never stored. Only the
// sha-256 of the delete token is stored, never the token.
//
// Environment (Netlify site settings). Without the first two the endpoint answers 503
// not_configured and the page offers a file to send by hand.
//   ZIPANGU_DONATE_REPO     owner/name of a PRIVATE repository that receives donations
//   ZIPANGU_DONATE_TOKEN    fine-grained token: Contents read & write on that repository only
//   ZIPANGU_DONATE_BRANCH   optional, default "main"
//   ZIPANGU_DONATE_ORIGINS  optional extra allowed origins, comma separated
//                           (default: this site and https://ryosaku610.github.io)
import { validateDonation, MAX_RECORDS } from '../../zipangu/js/donate.js';

const PER_MINUTE = 6;
const MAX_BYTES = 2_500_000;
const hits = new Map();

const env = name => {
    try { if (globalThis.Netlify && globalThis.Netlify.env) { const v = globalThis.Netlify.env.get(name); if (v) return v; } } catch { /* fall through */ }
    return typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
};
function allowedOrigin(req) {
    const origin = req.headers.get('origin');
    if (!origin) return { ok: true, origin: null };     // same-origin navigation or a script
    let host;
    try { host = new URL(origin).origin; } catch { return { ok: false }; }
    const self = new URL(req.url).origin;
    const extra = String(env('ZIPANGU_DONATE_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
    const list = new Set([self, 'https://ryosaku610.github.io', ...extra]);
    return list.has(host) ? { ok: true, origin: host } : { ok: false };
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
const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
const randomHex = n => { const b = new Uint8Array(n); crypto.getRandomValues(b); return hex(b); };
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const ID_RE = /^zd-(\d{4})(\d{2})-[0-9a-f]{12}$/;
const pathOf = id => { const m = ID_RE.exec(id); return m ? `donations/${m[1]}/${m[2]}/${id}.json` : null; };

async function github(method, path, body) {
    const repo = env('ZIPANGU_DONATE_REPO'), token = env('ZIPANGU_DONATE_TOKEN');
    const branch = env('ZIPANGU_DONATE_BRANCH') || 'main';
    const url = `https://api.github.com/repos/${repo}/contents/${path}` + (method === 'GET' ? `?ref=${encodeURIComponent(branch)}` : '');
    const res = await fetch(url, {
        method,
        headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'zipangu-donate', ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify({ ...body, branch }) : undefined
    });
    return res;
}

export default async (req, context = {}) => {
    const allow = allowedOrigin(req);
    if (!allow.ok) return respond({ error: 'forbidden_origin' }, 403, null);
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { 'access-control-allow-origin': allow.origin || '*', 'access-control-allow-methods': 'POST, DELETE', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '600', vary: 'Origin' } });
    }
    if (req.method !== 'POST' && req.method !== 'DELETE') return respond({ error: 'method_not_allowed' }, 405, allow.origin);
    const repo = env('ZIPANGU_DONATE_REPO'), token = env('ZIPANGU_DONATE_TOKEN');
    if (!repo || !token || !/^[\w.-]+\/[\w.-]+$/.test(repo)) return respond({ error: 'not_configured' }, 503, allow.origin);
    const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'anon';
    if (limited(ip)) return respond({ error: 'rate_limited' }, 429, allow.origin);
    if (Number(req.headers.get('content-length') || 0) > MAX_BYTES) return respond({ error: 'too_large' }, 413, allow.origin);
    let body;
    try {
        const raw = await req.text();
        if (raw.length > MAX_BYTES) return respond({ error: 'too_large' }, 413, allow.origin);
        body = JSON.parse(raw);
    } catch { return respond({ error: 'bad_json' }, 400, allow.origin); }

    if (req.method === 'DELETE') {
        const path = pathOf(body && body.id);
        if (!path || typeof body.token !== 'string' || !/^[0-9a-f]{32}$/.test(body.token)) return respond({ error: 'bad_request' }, 400, allow.origin);
        const got = await github('GET', path);
        if (got.status === 404) return respond({ ok: true, already: true }, 200, allow.origin);
        if (!got.ok) return respond({ error: 'storage' }, 502, allow.origin);
        const file = await got.json();
        let stored;
        try { stored = JSON.parse(Buffer.from(file.content || '', 'base64').toString('utf8')); } catch { return respond({ error: 'storage' }, 502, allow.origin); }
        if (stored.tokenHash !== await sha256(body.token)) return respond({ error: 'forbidden' }, 403, allow.origin);
        const del = await github('DELETE', path, { message: `withdraw ${body.id}`, sha: file.sha });
        return del.ok ? respond({ ok: true }, 200, allow.origin) : respond({ error: 'storage' }, 502, allow.origin);
    }

    const v = validateDonation(body);
    if (!v.ok) return respond({ error: v.error, max: MAX_RECORDS }, 400, allow.origin);
    const now = new Date();
    const id = `zd-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}-${randomHex(6)}`;
    const deleteToken = randomHex(16);
    const stored = { id, received: now.toISOString(), ...v.donation, n: v.donation.records.length, tokenHash: await sha256(deleteToken) };
    const put = await github('PUT', pathOf(id), { message: `donation ${id} (${stored.n} records)`, content: b64(JSON.stringify(stored)) });
    if (!put.ok) return respond({ error: 'storage' }, 502, allow.origin);
    return respond({ ok: true, id, token: deleteToken, n: stored.n }, 201, allow.origin);
};
