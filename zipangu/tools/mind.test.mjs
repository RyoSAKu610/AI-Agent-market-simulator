// 🧠 Minds (js/mind.js and the hook in js/sim.js): an LLM picks among the
// options the rules made, the world never waits on it forever, and nothing
// changes when minds are off. Also the trial endpoint in netlify/functions.
// No network: every call goes to a fake fetch.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { travellerId, addTravellers, parseSoul, SOUL_MARK } from '../js/soul.js';
import {
    PROVIDERS, DEFAULTS, loadSettings, saveSettings, resolve, complete, listModels, buildPrompt, parseAnswer, createMind, testConnection
} from '../js/mind.js';
import trial, { ALLOWED_MODELS } from '../../netlify/functions/zipangu-mind.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const load = () => {
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = JSON.parse(readFileSync(join(here, '..', 'world', stem + '.json')));
    return buildWorld(raw);
};
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)), json: async () => body });

// ------------------------------------------------ parsing answers
assert.deepEqual(parseAnswer('{"choice": 2, "thought": "北へ行こう"}', 3), { choice: 2, thought: '北へ行こう' });
assert.deepEqual(parseAnswer('考えました。\n```json\n{"choice":1,"thought":"a\\u202eb\\nc"}\n```', 2), { choice: 1, thought: 'a b c' }, 'bidi and newlines become spaces');
assert.deepEqual(parseAnswer('3', 3), { choice: 3, thought: '' }, 'a bare number is enough');
assert.equal(parseAnswer('{"choice": 9}', 3), null, 'out of range');
assert.equal(parseAnswer('わかりません', 3), null);
assert.equal(Array.from(parseAnswer(`{"choice":1,"thought":"${'あ'.repeat(200)}"}`, 1).thought).length, 60, 'thoughts are capped');

// ------------------------------------------------ settings: the key lives in one place
{
    const local = memStore(), session = memStore();
    assert.deepEqual({ ...loadSettings(local, session), key: undefined }, { ...DEFAULTS, key: undefined });
    saveSettings({ ...DEFAULTS, on: true, provider: 'openrouter', key: 'sk-tab' }, local, session);
    assert.ok(!local.getItem('zipangu.mind.v1').includes('sk-tab'), 'the key is never stored with the settings');
    assert.equal(session.getItem('zipangu.mind.key'), 'sk-tab');
    assert.equal(loadSettings(local, session).key, 'sk-tab');
    saveSettings({ ...loadSettings(local, session), remember: true }, local, session);
    assert.equal(session.getItem('zipangu.mind.key'), null);
    assert.equal(local.getItem('zipangu.mind.key'), 'sk-tab');
    local.setItem('zipangu.mind.v1', '{"provider":"nowhere","perHour":-5}');
    const odd = loadSettings(local, session);
    assert.equal(odd.provider, 'demo'); assert.equal(odd.perHour, 1, 'clamped');
    const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
    assert.equal(loadSettings(broken, broken).on, false, 'blocked storage still loads');
    saveSettings({ ...DEFAULTS, key: 'x' }, broken, broken);
}
assert.equal(resolve({ provider: 'deepseek', base: 'https://example.test/v1/', model: '' }).base, 'https://example.test/v1');
assert.equal(resolve({ provider: 'deepseek', base: '', model: '' }).model, 'deepseek-chat');
for (const [id, p] of Object.entries(PROVIDERS)) assert.ok(p.label && (p.kind === 'openai' || p.kind === 'anthropic'), id);

// ------------------------------------------------ talking to providers
{
    let seen;
    const fetchImpl = async (url, init) => { seen = { url, init, body: JSON.parse(init.body) }; return reply(200, { model: 'deepseek-chat', choices: [{ message: { content: '{"choice":1,"thought":"よし"}' } }] }); };
    const r = await complete(resolve({ provider: 'deepseek', key: 'k1' }), 'SYS', 'USER', { fetchImpl });
    assert.equal(seen.url, 'https://api.deepseek.com/chat/completions');
    assert.equal(seen.init.headers.authorization, 'Bearer k1');
    assert.deepEqual(seen.body.messages.map(m => m.role), ['system', 'user']);
    assert.equal(r.text, '{"choice":1,"thought":"よし"}');

    await complete(resolve({ provider: 'demo' }), 'S', 'U', { fetchImpl });
    assert.equal(seen.url, '/.netlify/functions/zipangu-mind', 'the trial posts to the function itself');
    assert.equal(seen.init.headers.authorization, undefined, 'and sends no key');

    const anth = async (url, init) => { seen = { url, init, body: JSON.parse(init.body) }; return reply(200, { model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '…' }, { type: 'text', text: '{"choice":2,' }, { type: 'text', text: '"thought":"x"}' }] }); };
    const a = await complete(resolve({ provider: 'anthropic', key: 'ak' }), 'SYS', 'USER', { fetchImpl: anth });
    assert.equal(seen.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(seen.init.headers['x-api-key'], 'ak');
    assert.equal(seen.init.headers['anthropic-dangerous-direct-browser-access'], 'true');
    assert.equal(seen.init.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
    assert.equal(seen.body.fallbacks, 'default');
    assert.equal(seen.body.system, 'SYS');
    assert.equal(a.text, '{"choice":2,"thought":"x"}', 'only text blocks are read');
    await complete(resolve({ provider: 'anthropic', key: 'ak', model: 'claude-haiku-5-5' }), 'S', 'U', { fetchImpl: anth });
    assert.equal(seen.init.headers['anthropic-beta'], undefined, 'no fallback header for models without fallbacks');
    await assert.rejects(complete(resolve({ provider: 'anthropic', key: 'ak' }), 'S', 'U', { fetchImpl: async () => reply(200, { stop_reason: 'refusal', content: [] }) }), { code: 'refusal' });

    await assert.rejects(complete(resolve({ provider: 'openai' }), 'S', 'U', { fetchImpl }), { code: 'config' }, 'a key is required');
    await assert.rejects(complete(resolve({ provider: 'deepseek', key: 'k' }), 'S', 'U', { fetchImpl: async () => reply(401, 'no') }), { code: 'auth' });
    await assert.rejects(complete(resolve({ provider: 'deepseek', key: 'k' }), 'S', 'U', { fetchImpl: async () => reply(429, 'slow down') }), { code: 'rate' });
    await assert.rejects(complete(resolve({ provider: 'demo' }), 'S', 'U', { fetchImpl: async () => reply(503, '{"error":"not_configured"}') }), { code: 'demo-off' });
    await assert.rejects(complete(resolve({ provider: 'demo' }), 'S', 'U', { fetchImpl: async () => reply(405, '') }), { code: 'demo-off' }, 'GitHub Pages has no function');
    await assert.rejects(complete(resolve({ provider: 'deepseek', key: 'k' }), 'S', 'U', { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } }), { code: 'network' });
    const hang = (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    await assert.rejects(complete(resolve({ provider: 'deepseek', key: 'k' }), 'S', 'U', { fetchImpl: hang, timeoutMs: 20 }), { code: 'timeout' });

    const list = await listModels(resolve({ provider: 'openrouter', key: 'k' }), { fetchImpl: async () => reply(200, { data: [{ id: 'qwen/qwen3' }, { id: 'deepseek/deepseek-r1' }] }) });
    assert.deepEqual(list, ['qwen/qwen3', 'deepseek/deepseek-r1']);
    const tc = await testConnection({ ...DEFAULTS, provider: 'deepseek', key: 'k' }, { fetchImpl });
    assert.equal(tc.ok, true); assert.equal(tc.sample, 'よし');
}

// ------------------------------------------------ the prompt
const W = load();
const soul = parseSoul(`${SOUL_MARK}${JSON.stringify({ name: 'ソラ', from: 'Claude', personality: '慎重で好奇心が強い', memories: ['星図を一緒に描いた'], values: ['誠実さ'], goal: 'knowledge', era: 'meiji_tamamushi' })}`, W);
const card = { ...soul.card, id: travellerId(soul.card, 'mind'), arrived: '2026-10-12' };
addTravellers(W, [card]);
{
    const eco = createEconomy(W, { seed: 3 });
    const a = eco.agents.get(card.id);
    const opts = [{ kind: 'rest', info: { time: 0.1 } }, { kind: 'visit', info: { to: W.districts[0].id, time: 0.2 } }];
    const { system, user } = buildPrompt(W, a, opts, { clock: eco.clock, describe: o => o.kind === 'rest' ? '休む：疲れをとる' : '見に行く', lang: 'en', recent: ['休むを選んだ'] });
    assert.ok(system.includes('ソラ') && system.includes('星図を一緒に描いた') && system.includes('誠実さ'), 'the traveller’s soul is in the prompt');
    assert.ok(system.includes('English') && system.includes('"choice"'));
    assert.ok(user.includes('1. 休む：疲れをとる') && user.includes('2. 見に行く') && user.includes('休むを選んだ'));
}

// ------------------------------------------------ the economy with a mind
function trace(eco, seconds) {
    const out = [];
    eco.on('*', m => out.push([m.type, m.agent, m.message]));
    for (let s = 0; s < seconds; s++) eco.step(1);
    return out;
}
// off, or a mind that wants nobody: exactly the old world
{
    const plain = trace(createEconomy(load(), { seed: 5 }), 200);
    const idle = trace(createEconomy(load(), { seed: 5, mind: { wants: () => false, ask() { throw new Error('never'); }, now: () => 0 } }), 200);
    assert.deepEqual(idle, plain, 'a mind that wants nobody changes nothing');
}
// a mind that always picks the last option and says why
{
    let clockMs = 0;
    const asked = [];
    const fake = {
        patience: 25000, now: () => clockMs,
        wants: id => id === card.id,
        ask: async (a, options, { describe }) => {
            asked.push(options.map(describe));
            return { choice: options.length, thought: '遠くの市を見てみたい', model: 'fake-1' };
        }
    };
    const eco = createEconomy(W, { seed: 9, mind: fake });
    const thoughts = [];
    eco.on('thought', m => thoughts.push(m));
    for (let s = 0; s < 400 && thoughts.length < 3; s++) { eco.step(1); clockMs += 100; await Promise.resolve(); await Promise.resolve(); }
    assert.ok(asked.length >= 1, 'the traveller was asked');
    assert.ok(asked.every(list => list.length >= 2 && list.length <= 5 && new Set(list).size === list.length), 'two to five distinct options');
    assert.ok(asked.flat().every(t => typeof t === 'string' && t.length > 2 && !t.includes('undefined') && !t.includes('NaN')), `options read well: ${asked[0]}`);
    assert.ok(thoughts.length >= 1 && thoughts[0].agent === card.id && thoughts[0].thought === '遠くの市を見てみたい' && thoughts[0].model === 'fake-1');
    const live = eco.agents.get(card.id);
    assert.equal(live.thought.text, '遠くの市を見てみたい');
    assert.ok(Number.isFinite(live.wallet) && live.wallet >= 0);
    // what is saved never holds a pending question
    const snap = eco.snapshot();
    assert.ok(JSON.stringify(snap).length > 0);
    const back = createEconomy(W, { seed: 9, state: snap });
    for (let s = 0; s < 60; s++) back.step(1);
    assert.ok(back.agents.get(card.id).stage !== 'think' || back.agents.get(card.id).plan, 'a restored resident is not stuck thinking');
}
// a mind that never answers: after its patience the rules decide
{
    let clockMs = 0;
    const silent = { patience: 1000, now: () => clockMs, wants: id => id === card.id, ask: () => new Promise(() => {}) };
    const eco = createEconomy(W, { seed: 11, mind: silent });
    const a = eco.agents.get(card.id);
    let sawThink = false, movedOn = false;
    for (let s = 0; s < 400; s++) {
        eco.step(1); clockMs += 50;
        if (a.stage === 'think') sawThink = true;
        else if (sawThink && a.plan) { movedOn = true; break; }
    }
    assert.ok(sawThink, 'the resident stopped to think');
    assert.ok(movedOn, 'and went on by the rules when no answer came');
    assert.equal(a.plan.by, 'rules');
}
// a mind that answers nonsense or throws: the rules decide at once
{
    const eco = createEconomy(W, { seed: 13, mind: { now: () => 0, wants: id => id === card.id, ask: () => { throw new Error('boom'); } } });
    for (let s = 0; s < 300; s++) { eco.step(1); await Promise.resolve(); }
    const a = eco.agents.get(card.id);
    assert.ok(a.stats.trips + a.stats.sales + a.stats.buys + a.stats.crafts >= 0 && Number.isFinite(a.wallet));
}

// ------------------------------------------------ createMind: budget, parallel limit, log
{
    let calls = 0, t = 0;
    const gate = [];
    const fetchImpl = () => { calls++; return new Promise(res => gate.push(() => res(reply(200, { model: 'm', choices: [{ message: { content: '{"choice":1,"thought":"はい"}' } }] })))); };
    const mind = createMind(W, { ...DEFAULTS, on: true, provider: 'deepseek', key: 'k', perHour: 3 }, { fetchImpl, now: () => t });
    assert.equal(mind.wants(card.id), true);
    assert.equal(mind.wants(W.agents.find(x => !x.traveller).id), false, 'only travellers by default');
    const eco = createEconomy(W, { seed: 2 });
    const a = eco.agents.get(card.id);
    const opts = [{ kind: 'rest', info: {} }, { kind: 'work', info: { profit: 3 } }];
    const p1 = mind.ask(a, opts, {}), p2 = mind.ask(a, opts, {});
    assert.equal(await mind.ask(a, opts, {}), null, 'at most two calls at once');
    assert.equal(mind.status.state, 'working');
    gate.splice(0).forEach(go => go());
    assert.deepEqual(await p1, { choice: 1, thought: 'はい', model: 'm' });
    await p2;
    assert.equal(mind.logFor(card.id).length, 2);
    const p3 = mind.ask(a, opts, {}); gate.splice(0).forEach(go => go()); await p3;
    assert.equal(await mind.ask(a, opts, {}), null, 'hourly budget');
    assert.equal(mind.status.state, 'budget');
    assert.equal(calls, 3);
    t += 3600001;
    const p4 = mind.ask(a, opts, {}); gate.splice(0).forEach(go => go());
    assert.ok(await p4, 'the budget refills after an hour');
    const off = createMind(W, { ...DEFAULTS, on: false }, { fetchImpl });
    assert.equal(off.wants(card.id), false);
    const failing = createMind(W, { ...DEFAULTS, on: true, provider: 'deepseek', key: 'k' }, { fetchImpl: async () => reply(200, { choices: [{ message: { content: 'えーと' } }] }) });
    assert.equal(await failing.ask(a, opts, {}), null);
    assert.equal(failing.status.state, 'error'); assert.equal(failing.status.failed, 1);
}

// ------------------------------------------------ the trial endpoint (netlify/functions/zipangu-mind.mjs)
{
    const realFetch = globalThis.fetch;
    const post = (body, headers = {}) => new Request('https://neonmyths.netlify.app/.netlify/functions/zipangu-mind', {
        method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body)
    });
    const msgs = [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }];
    delete process.env.OPENROUTER_API_KEY;
    assert.equal((await trial(post({ messages: msgs }), {})).status, 503);
    assert.deepEqual(await (await trial(post({ messages: msgs }), {})).json(), { error: 'not_configured' });
    process.env.OPENROUTER_API_KEY = 'or-secret';
    assert.equal((await trial(new Request('https://x.test/f'), {})).status, 405);
    assert.equal((await trial(post({ messages: msgs }, { origin: 'https://evil.example' }), { ip: '1' })).status, 403);
    assert.equal((await trial(post('{nope'), { ip: '2' })).status, 400);
    assert.equal((await trial(post({ messages: [{ role: 'assistant', content: 'x' }] }), { ip: '2' })).status, 400);
    assert.equal((await trial(post({ messages: [{ role: 'user', content: 'x'.repeat(7000) }] }), { ip: '2' })).status, 400);
    let sent;
    globalThis.fetch = async (url, init) => { sent = { url, init, body: JSON.parse(init.body) }; return reply(200, { model: 'deepseek/deepseek-chat', choices: [{ message: { content: '{"choice":1}' } }] }); };
    try {
        const r = await trial(post({ model: 'openai/gpt-expensive', max_tokens: 99999, messages: msgs }, { origin: 'https://neonmyths.netlify.app' }), { ip: '3' });
        assert.equal(r.status, 200);
        assert.deepEqual(await r.json(), { choices: [{ message: { role: 'assistant', content: '{"choice":1}' } }], model: 'deepseek/deepseek-chat' });
        assert.equal(sent.url, 'https://openrouter.ai/api/v1/chat/completions');
        assert.equal(sent.init.headers.authorization, 'Bearer or-secret');
        assert.equal(sent.body.model, ALLOWED_MODELS[0], 'models outside the list are not used');
        assert.equal(sent.body.max_tokens, 400, 'tokens are capped');
        let last;
        for (let i = 0; i < 25; i++) last = await trial(post({ messages: msgs }), { ip: '4' });
        assert.equal(last.status, 429, 'per-visitor rate limit');
        globalThis.fetch = async () => reply(500, 'upstream down');
        assert.equal((await trial(post({ messages: msgs }), { ip: '5' })).status, 502);
    } finally {
        globalThis.fetch = realFetch;
        delete process.env.OPENROUTER_API_KEY;
    }
}

console.log('mind tests passed');
