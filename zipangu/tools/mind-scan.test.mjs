// ⚡ Auto-connect (js/mind-scan.js): finds the minds a visitor can use without typing,
// ranks them, and never spends a model call or leaks a key while looking.
import assert from 'node:assert/strict';
import { scanMinds, pickBest, pickLocalModel, settingsFor, SCAN_ORDER, LMSTUDIO_BASE } from '../js/mind-scan.js';

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });
const calls = [];
// a fake internet: `up` maps a URL prefix to a response
const net = up => async (url, init = {}) => {
    calls.push({ url, init });
    for (const [prefix, res] of Object.entries(up)) if (String(url).startsWith(prefix)) return typeof res === 'function' ? res(init) : res;
    throw new TypeError('Failed to fetch');
};
const gpu = async () => ({ ok: true, f16: true }), noGpu = async () => ({ ok: false, reason: 'webgpu' });
const origin = 'https://example.test';

assert.equal(pickLocalModel(['nomic-embed-text', 'qwen2.5:7b', 'zzz']), 'qwen2.5:7b', 'a chat model, not an embedder');
assert.equal(pickLocalModel(['bge-m3', 'my-own-model']), 'my-own-model');
assert.equal(pickLocalModel(['nomic-embed-text']), '');

// nothing anywhere: every source reports why, and nothing is picked
{
    const r = await scanMinds({ fetchImpl: net({}), support: noGpu, origin });
    assert.deepEqual(r.map(x => x.id), SCAN_ORDER);
    assert.ok(r.every(x => !x.ok && x.reason));
    assert.equal(pickBest(r), null);
}
// a phone with WebGPU on the Netlify site: the in-browser model wins over the shared trial
{
    calls.length = 0;
    const seen = [];
    const r = await scanMinds({ fetchImpl: net({ '/.netlify/functions/zipangu-mind': json(200, { configured: true }) }), support: gpu, origin, onResult: x => seen.push(x.id) });
    assert.equal(pickBest(r).id, 'browser');
    assert.equal(r.find(x => x.id === 'demo').ok, true);
    assert.equal(seen.length, SCAN_ORDER.length, 'each result is reported as it lands');
    const probe = calls.find(c => String(c.url).includes('zipangu-mind'));
    assert.ok(String(probe.url).endsWith('?status') && !probe.init.method && !probe.init.body, 'the trial is only asked whether it is on: no model call, no quota');
    assert.deepEqual(settingsFor(pickBest(r), { scope: 'travellers', perHour: 30 }), { scope: 'travellers', perHour: 30, on: true, remember: false, key: '', provider: 'browser', base: '', model: '' });
}
// the trial exists but is switched off, or is busy
for (const [res, reason] of [[json(200, { configured: false }), 'not_configured'], [json(404, {}), 'absent'], [json(405, {}), 'absent'], [json(200, {}), 'absent']]) {
    const r = await scanMinds({ fetchImpl: net({ '/.netlify/functions/zipangu-mind': res }), support: noGpu, origin });
    assert.equal(r.find(x => x.id === 'demo').reason, reason);
}
assert.equal((await scanMinds({ fetchImpl: net({}), support: noGpu, origin: 'file://' })).find(x => x.id === 'demo').reason, 'absent', 'no trial from a file');
// Ollama and LM Studio on this computer beat the in-browser model; Ollama first
{
    const up = { 'http://localhost:11434/v1/models': json(200, { data: [{ id: 'nomic-embed-text' }, { id: 'llama3.2:3b' }] }), [LMSTUDIO_BASE + '/models']: json(200, { data: [{ id: 'qwen2.5-7b-instruct' }] }) };
    const r = await scanMinds({ fetchImpl: net(up), support: gpu, origin });
    const best = pickBest(r);
    assert.equal(best.id, 'ollama');
    assert.deepEqual(best.settings, { provider: 'ollama', base: '', model: 'llama3.2:3b' });
    assert.deepEqual(r.find(x => x.id === 'lmstudio').settings, { provider: 'custom', base: LMSTUDIO_BASE, model: 'qwen2.5-7b-instruct' });
    delete up['http://localhost:11434/v1/models'];
    assert.equal(pickBest(await scanMinds({ fetchImpl: net(up), support: gpu, origin })).id, 'lmstudio');
    assert.equal((await scanMinds({ fetchImpl: net({ 'http://localhost:11434/v1/models': json(200, { data: [] }) }), support: noGpu, origin })).find(x => x.id === 'ollama').reason, 'no_model');
}
// a key saved earlier that still works comes first, goes only to its own provider, and is kept
{
    calls.length = 0;
    const settings = { provider: 'openrouter', key: 'sk-test-1234567890', remember: true, model: '', base: '' };
    const r = await scanMinds({ settings, fetchImpl: net({ 'https://openrouter.ai/api/v1/models': json(200, { data: [{ id: 'deepseek/deepseek-chat' }] }) }), support: gpu, origin });
    const best = pickBest(r);
    assert.equal(best.id, 'saved');
    assert.equal(settingsFor(best, {}).key, 'sk-test-1234567890');
    assert.equal(settingsFor(best, {}).remember, true);
    for (const c of calls) {
        const sent = JSON.stringify(c.init.headers || {}) + String(c.init.body || '');
        assert.equal(sent.includes('sk-test'), String(c.url).startsWith('https://openrouter.ai/'), `the key goes only to its provider (${c.url})`);
    }
    const refused = await scanMinds({ settings, fetchImpl: net({ 'https://openrouter.ai/api/v1/models': json(401, {}) }), support: gpu, origin });
    assert.equal(refused.find(x => x.id === 'saved').reason, 'refused');
    assert.equal(pickBest(refused).id, 'browser', 'a dead key falls back to what works');
    assert.equal((await scanMinds({ settings: { provider: 'ollama', key: 'x' }, fetchImpl: net({}), support: noGpu, origin })).find(x => x.id === 'saved').reason, 'no_key');
}
// a "custom" provider with no address yet: the key is not sent anywhere (it would go to this site)
{
    calls.length = 0;
    const r = await scanMinds({ settings: { provider: 'custom', key: 'sk-test-1234567890', base: '' }, fetchImpl: net({ '/models': json(200, { data: [{ id: 'x' }] }) }), support: noGpu, origin });
    assert.equal(r.find(x => x.id === 'saved').reason, 'no_endpoint');
    assert.ok(calls.every(c => !JSON.stringify(c.init.headers || {}).includes('sk-test')), 'no key leaves without an endpoint');
}
// a server that sends its headers and then stalls on the body is cut off too
{
    const stall = async (url, init) => ({ ok: true, status: 200, json: () => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))) });
    const t0 = Date.now();
    const r = await scanMinds({ fetchImpl: stall, support: gpu, origin, timeoutMs: 60 });
    assert.ok(Date.now() - t0 < 1500, 'the scan ends');
    assert.equal(r.find(x => x.id === 'ollama').ok, false);
    const never = async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) });      // ignores the abort altogether
    assert.equal((await scanMinds({ fetchImpl: never, support: gpu, origin, timeoutMs: 60 })).find(x => x.id === 'ollama').reason, 'timeout');
}
// a place that never answers does not hold the scan up
{
    const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    const t0 = Date.now();
    const r = await scanMinds({ fetchImpl: hang, support: gpu, origin, timeoutMs: 60 });
    assert.ok(Date.now() - t0 < 1500);
    assert.equal(pickBest(r).id, 'browser');
}
console.log('mind scan tests passed');
