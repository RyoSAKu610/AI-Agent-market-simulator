// 🤝 Data donations (js/donate.js, netlify/functions/zipangu-donate.mjs): only whitelisted,
// cleaned fields leave the device; nothing goes without full consent; the endpoint checks it
// all again, stores one file per donation in a private repository and lets the donor withdraw.
import assert from 'node:assert/strict';
import {
    sanitizeRecord, buildDonation, validateDonation, consentOf, consentComplete, newDonorId,
    loadDonated, saveDonated, undonated, markDonated, CONSENT_VERSION, DATA_LICENSE, MAX_RECORDS
} from '../js/donate.js';
import donate from '../../netlify/functions/zipangu-donate.mjs';

const record = (over = {}) => ({
    v: 1, run: 'run-2026-10-15-ab', cond: 'human', cohort: 'human', cohortKind: 'human', T: 1.25, day: 2, koku: 3, season: '春',
    agent: 'chomei', by: 'human', goal: 'wealth', wallet: 22360, carrying: 0, at: 'uchinoura',
    traits: { risk: 0.3, wander: 0.6, diligence: 0.5, nightOwl: true, capacity: 6 },
    cands: [{ kind: 'craft', good: 'g1', to: 'd1', profit: 3757, time: 0.17, score: 1.1 }, { kind: 'trade', good: 'g2', to: 'd2', profit: 789, time: 0.08, score: 0.9 }],
    chosen: 1, kind: 'trade', model: 'human', thought: '海の向こうへ。連絡は me@example.com か 090-1234-5678 まで', ms: 5400,
    raw: '{"secret":"raw answer"}', prompt: { system: 'soul card text', user: 'x' }, out: { dWallet: 1200, dT: 0.2 }, extra: 'nope', ...over
});

// ------------------------------------------------ what may leave the device
{
    const s = sanitizeRecord(record());
    assert.ok(s);
    for (const gone of ['raw', 'prompt', 'extra']) assert.ok(!(gone in s), `${gone} is never donated`);
    assert.ok(!s.thought.includes('example.com') && !s.thought.includes('1234-5678'), 'private details are masked: ' + s.thought);
    assert.ok(s.thought.startsWith('海の向こうへ'));
    assert.deepEqual(s.cands[1], { kind: 'trade', good: 'g2', to: 'd2', profit: 789, time: 0.08, score: 0.9, text: null });
    assert.equal(s.chosen, 1); assert.equal(s.by, 'human'); assert.equal(s.out.dWallet, 1200);
    assert.equal(sanitizeRecord(record({ cands: [] })), null);
    assert.equal(sanitizeRecord(record({ chosen: 5 })), null, 'a choice outside the candidates');
    assert.equal(sanitizeRecord(record({ by: 'admin' })), null);
    assert.equal(sanitizeRecord(record({ agent: '<img src=x>' })), null);
    assert.equal(sanitizeRecord(record({ cands: [{ kind: 'steal' }] })), null, 'unknown actions are refused');
    assert.equal(sanitizeRecord(record({ model: '<script>' })).model, null);
    assert.equal(sanitizeRecord(record({ thought: 'x'.repeat(500) })).thought.length, 80);
    assert.equal(sanitizeRecord(null), null);
}

// ------------------------------------------------ consent
assert.equal(consentComplete(consentOf({ license: true, age: true, thirdParty: true })), true);
for (const missing of ['license', 'age', 'thirdParty']) {
    const c = consentOf({ license: true, age: true, thirdParty: true, [missing]: false });
    assert.equal(consentComplete(c), false, `${missing} is required`);
}
assert.equal(consentComplete({ ...consentOf({ license: true, age: true, thirdParty: true }), version: '2020-01-01' }), false, 'an old consent text does not count');
assert.match(newDonorId(), /^d-[0-9a-f]{16}$/);

const consent = consentOf({ license: true, age: true, thirdParty: true });
const donor = newDonorId();
{
    const d = buildDonation([record(), { junk: true }, record({ by: 'rules', model: null, thought: null })], { donor, consent });
    assert.equal(d.records.length, 2); assert.equal(d.dropped, 1);
    assert.equal(validateDonation(d).ok, true);
    assert.equal(validateDonation({ ...d, consent: { ...consent, thirdParty: false } }).error, 'consent');
    assert.equal(validateDonation({ ...d, donor: 'me' }).error, 'donor');
    assert.equal(validateDonation({ ...d, records: [] }).error, 'records');
    assert.equal(validateDonation({ ...d, records: Array(MAX_RECORDS + 1).fill(record()) }).error, 'records');
    assert.equal(validateDonation({ ...d, format: 'other' }).error, 'format');
    // the endpoint cleans again even if a browser sent something it should not have
    const sneaky = validateDonation({ ...d, records: [{ ...record(), raw: 'x', thought: 'call 03-1234-5678' }] });
    assert.ok(sneaky.ok && !('raw' in sneaky.donation.records[0]) && !sneaky.donation.records[0].thought.includes('1234'));
}

// ------------------------------------------------ what this device already gave
{
    const m = new Map(), st = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
    assert.deepEqual(loadDonated(st), { donor: null, runs: {}, receipts: [] });
    const recs = [record({ run: 'a' }), record({ run: 'a' }), record({ run: 'b' })];
    let d = { donor, runs: {}, receipts: [] };
    assert.equal(undonated(recs, d).length, 3);
    d = markDonated(d, recs.slice(0, 2));
    assert.deepEqual(undonated(recs, d).map(r => r.run), ['b']);
    assert.deepEqual(undonated([...recs, record({ run: 'a' })], d).map(r => r.run), ['b', 'a'], 'later records of a run are new');
    saveDonated(st, { ...d, receipts: [{ id: 'zd-202610-0123456789ab', token: '0'.repeat(32), n: 2, at: 'x' }, { id: 'bad', token: 'x' }] });
    const back = loadDonated(st);
    assert.equal(back.donor, donor); assert.deepEqual(back.runs, { a: 2 }); assert.equal(back.receipts.length, 1);
    m.set('zipangu.donated.v1', 'nonsense');
    assert.deepEqual(loadDonated(st), { donor: null, runs: {}, receipts: [] });
}

// ------------------------------------------------ the endpoint, with GitHub stood in for
const files = new Map();
const calls = [];
globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method });
    const u = new URL(url);
    assert.equal(u.host, 'api.github.com');
    assert.equal(init.headers.authorization, 'Bearer test-token');
    const path = u.pathname.replace('/repos/me/donations/contents/', '');
    if (init.method === 'PUT') { const b = JSON.parse(init.body); files.set(path, { content: b.content, sha: 'sha-' + files.size }); return new Response('{}', { status: 201 }); }
    if (init.method === 'GET') { const f = files.get(path); return f ? new Response(JSON.stringify(f), { status: 200 }) : new Response('{}', { status: 404 }); }
    if (init.method === 'DELETE') { const b = JSON.parse(init.body); if (files.get(path)?.sha !== b.sha) return new Response('{}', { status: 409 }); files.delete(path); return new Response('{}', { status: 200 }); }
    return new Response('{}', { status: 500 });
};
const call = (method, body, origin = 'https://ryosaku610.github.io', extra = {}) => donate(new Request('https://neonmyths.netlify.app/.netlify/functions/zipangu-donate', {
    method, headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}), ...extra }, body: body == null ? undefined : JSON.stringify(body)
}), { ip: '1.2.3.' + Math.floor(Math.random() * 250) });
{
    const good = buildDonation([record(), record({ by: 'mind', cohort: 'qwen', cohortKind: 'mind', model: 'qwen/qwen-2.5-72b', thought: '安いうちに' })], { donor, consent });
    process.env.ZIPANGU_DONATE_REPO = ''; process.env.ZIPANGU_DONATE_TOKEN = '';
    assert.equal((await call('POST', good)).status, 503, 'not configured: the page offers a file instead');
    process.env.ZIPANGU_DONATE_REPO = 'me/donations'; process.env.ZIPANGU_DONATE_TOKEN = 'test-token';
    assert.equal((await call('POST', good, 'https://evil.example')).status, 403, 'other sites cannot post');
    const pre = await call('OPTIONS', null);
    assert.equal(pre.status, 204); assert.equal(pre.headers.get('access-control-allow-origin'), 'https://ryosaku610.github.io');
    assert.equal((await call('GET', null)).status, 405);
    assert.equal((await call('POST', { ...good, consent: { ...consent, age16: false } })).status, 400, 'no consent, no storage');
    assert.equal(files.size, 0);
    const res = await call('POST', good);
    assert.equal(res.status, 201);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://ryosaku610.github.io');
    const r = await res.json();
    assert.match(r.id, /^zd-\d{6}-[0-9a-f]{12}$/); assert.match(r.token, /^[0-9a-f]{32}$/); assert.equal(r.n, 2);
    const [[path, file]] = [...files];
    assert.ok(path.startsWith('donations/') && path.endsWith(r.id + '.json'));
    const stored = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    assert.equal(stored.consent.license, DATA_LICENSE); assert.equal(stored.consent.version, CONSENT_VERSION);
    assert.equal(stored.donor, donor); assert.equal(stored.records.length, 2);
    assert.ok(!JSON.stringify(stored).includes(r.token), 'the token itself is never stored');
    assert.ok(!JSON.stringify(stored).includes('1.2.3.'), 'no address is stored');
    assert.ok(!JSON.stringify(stored).includes('example.com'));
    // withdrawal: wrong token refused, right token removes it, a second time is harmless
    assert.equal((await call('DELETE', { id: r.id, token: 'f'.repeat(32) })).status, 403);
    assert.equal(files.size, 1);
    assert.equal((await call('DELETE', { id: r.id, token: r.token })).status, 200);
    assert.equal(files.size, 0);
    assert.equal((await (await call('DELETE', { id: r.id, token: r.token })).json()).already, true);
    assert.equal((await call('DELETE', { id: '../../etc', token: r.token })).status, 400, 'no paths from the outside');
    assert.equal((await call('POST', 'not json')).status, 400);
}
console.log('donate tests passed');
