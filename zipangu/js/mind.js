// 🧠 Minds: let a large language model decide for residents.
//
// The economy (sim.js) still works out every resident's options from prices,
// fares, events and goals. For a resident with a mind, the best few options are
// written out in words and an LLM picks one and says what it is thinking, in the
// resident's own voice. If the model is slow, fails or answers nonsense, the
// rules decide as before, so the world never stalls or breaks.
//
// By default the model runs inside this browser (js/mind-local.js: WebLLM +
// Qwen on WebGPU), so nothing leaves the device. Other providers are called
// straight from this browser with the visitor's own key (kept in sessionStorage,
// or localStorage if they ask), except the trial endpoint, a Netlify function
// that holds the site's key.

import { isTraveller } from './soul.js';

export const PROVIDERS = {
    browser: {
        label: 'この端末の中のAI（Qwen・無料・キー不要）', kind: 'local', base: '', model: 'Qwen2.5', keyless: true,
        note: 'Alibaba の Qwen をこのブラウザの中（WebGPU）で動かします。料金もキーもいらず、考えた中身は端末の外に出ません。最初だけモデルを読み込みます（PC 約1GB・スマホ 約0.4GB、2回目からは保存済み）。'
    },
    demo: {
        label: 'お試し（キー不要・このサイトの共有枠）', kind: 'openai', base: '/.netlify/functions/zipangu-mind', path: '',
        model: 'auto', keyless: true,
        note: 'Netlify 版のサイトでだけ動きます。共有の枠なので、混んでいると断られることがあります。'
    },
    openrouter: {
        label: 'OpenRouter（DeepSeek・Qwen・Kimi・GLM ほか多数）', kind: 'openai', base: 'https://openrouter.ai/api/v1',
        model: 'deepseek/deepseek-chat', keyUrl: 'https://openrouter.ai/keys',
        suggest: ['deepseek/deepseek-chat', 'qwen/qwen-2.5-72b-instruct', 'moonshotai/kimi-k2', 'z-ai/glm-4.5', 'anthropic/claude-haiku-5-5'],
        note: '1つのキーで中国のモデル（DeepSeek・Qwen・Kimi・GLM）も含め多くのモデルを選べます。無料のモデルもあります。'
    },
    deepseek: { label: 'DeepSeek（深度求索）', kind: 'openai', base: 'https://api.deepseek.com', model: 'deepseek-chat', keyUrl: 'https://platform.deepseek.com/api_keys' },
    qwen: { label: 'Qwen 通義千問（Alibaba Cloud Model Studio 国際版）', kind: 'openai', base: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', keyUrl: 'https://modelstudio.console.alibabacloud.com/' },
    kimi: { label: 'Kimi（Moonshot AI）', kind: 'openai', base: 'https://api.moonshot.ai/v1', model: 'moonshot-v1-8k', keyUrl: 'https://platform.moonshot.ai/' },
    glm: { label: 'GLM（智谱 Z.ai）', kind: 'openai', base: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', keyUrl: 'https://open.bigmodel.cn/' },
    anthropic: {
        label: 'Claude（Anthropic）', kind: 'anthropic', base: 'https://api.anthropic.com/v1',
        model: 'claude-opus-5-5', suggest: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5'], keyUrl: 'https://console.anthropic.com/'
    },
    openai: { label: 'OpenAI', kind: 'openai', base: 'https://api.openai.com/v1', model: '', keyUrl: 'https://platform.openai.com/api-keys' },
    gemini: { label: 'Google Gemini', kind: 'openai', base: 'https://generativelanguage.googleapis.com/v1beta/openai', model: '', keyUrl: 'https://aistudio.google.com/apikey' },
    ollama: {
        label: '自分のPCのモデル（Ollama）', kind: 'openai', base: 'http://localhost:11434/v1', model: 'qwen2.5:7b', keyless: true,
        note: 'Ollama を OLLAMA_ORIGINS="*" で起動すると、このページから使えます。データは自分のPCから出ません。'
    },
    custom: { label: 'そのほか（OpenAI 互換のURL）', kind: 'openai', base: '', model: '' }
};

const SETTINGS_KEY = 'zipangu.mind.v1';
const KEY_KEY = 'zipangu.mind.key';
// Out of the box residents think with the in-browser model: no key, no fee, nothing to set up.
export const DEFAULTS = { on: true, provider: 'browser', base: '', model: '', scope: 'all', perHour: 120, remember: false };

const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

export function loadSettings(storage = globalThis.localStorage, session = globalThis.sessionStorage) {
    const saved = safe(() => JSON.parse(storage.getItem(SETTINGS_KEY) || '{}'), {}) || {};
    const s = { ...DEFAULTS, ...saved };
    if (!PROVIDERS[s.provider]) s.provider = DEFAULTS.provider;
    s.perHour = Math.max(1, Math.min(2000, Number(s.perHour) || DEFAULTS.perHour));
    s.key = safe(() => (s.remember ? storage : session).getItem(KEY_KEY), null) || '';
    return s;
}

export function saveSettings(s, storage = globalThis.localStorage, session = globalThis.sessionStorage) {
    const { key, ...rest } = s;
    safe(() => storage.setItem(SETTINGS_KEY, JSON.stringify(rest)));
    // The key lives in one place only: this tab, or this device if asked.
    safe(() => storage.removeItem(KEY_KEY));
    safe(() => session.removeItem(KEY_KEY));
    if (key) safe(() => (s.remember ? storage : session).setItem(KEY_KEY, key));
}

// The endpoint actually used: a provider's default unless the visitor typed one.
export function resolve(s) {
    const p = PROVIDERS[s.provider] || PROVIDERS.custom;
    return { ...p, id: s.provider, base: String(s.base || p.base || '').replace(/\/+$/, ''), model: s.model || p.model || '', key: s.key || '' };
}

// ------------------------------------------------------------ talking to a model

export class MindError extends Error {
    constructor(code, message) { super(message); this.code = code; }
}

function explainHttp(status, text, cfg = {}) {
    // GitHub Pages and plain file servers have no trial endpoint.
    if (cfg.id === 'demo' && (status === 404 || status === 405 || (status === 503 && /not_configured/.test(text)))) {
        return new MindError('demo-off', 'このサイトではお試し枠が用意されていません。自分のキーを使うか、Netlify 版でお試しください。');
    }
    if (status === 401 || status === 403) return new MindError('auth', 'キーが通りませんでした（401/403）。キーとプロバイダを確かめてください。');
    if (status === 402) return new MindError('billing', '残高や支払い設定が必要です（402）。');
    if (status === 404) return new MindError('notfound', 'URLかモデル名が見つかりません（404）。');
    if (status === 429) return new MindError('rate', '混み合っているか、使える回数を超えました（429）。少し待つと戻ります。');
    return new MindError('http', `モデルの呼び出しに失敗しました（${status}）。`);
}

// One question, one answer. → { text, model }
export async function complete(cfg, system, user, { fetchImpl = globalThis.fetch, timeoutMs = 20000, maxTokens = 400 } = {}) {
    if (!cfg.base) throw new MindError('config', '接続先のURLを入れてください。');
    if (!cfg.keyless && !cfg.key) throw new MindError('config', 'APIキーを入れてください。');
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    let res;
    try {
        if (cfg.kind === 'anthropic') {
            const fallback = /^claude-(opus-5-5|sonnet-5-5|fable-5-1|opus-5)$/.test(cfg.model);
            res = await fetchImpl(`${cfg.base}/messages`, {
                method: 'POST', signal: ctrl?.signal,
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': cfg.key,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                    ...(fallback ? { 'anthropic-beta': 'server-side-fallback-2026-07-01' } : {})
                },
                body: JSON.stringify({
                    model: cfg.model, max_tokens: 2000, system,
                    messages: [{ role: 'user', content: user }],
                    output_config: { effort: 'low' },
                    ...(fallback ? { fallbacks: 'default' } : {})
                })
            });
        } else {
            const headers = { 'content-type': 'application/json' };
            if (cfg.key) headers.authorization = `Bearer ${cfg.key}`;
            if (cfg.id === 'openrouter' && typeof location !== 'undefined') { headers['HTTP-Referer'] = location.origin; headers['X-Title'] = 'Kaleidoscope Zipangu'; }
            const url = cfg.path === '' ? cfg.base : `${cfg.base}/chat/completions`;
            res = await fetchImpl(url, {
                method: 'POST', signal: ctrl?.signal, headers,
                body: JSON.stringify({ model: cfg.model || undefined, max_tokens: maxTokens, temperature: 0.8,
                    messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
            });
        }
    } catch (e) {
        if (e && e.name === 'AbortError') throw new MindError('timeout', 'モデルの返事が時間内に来ませんでした。');
        throw new MindError('network', 'つながりませんでした。ブラウザから直接呼べないプロバイダかもしれません（CORS）。OpenRouter 経由をお試しください。');
    } finally { if (timer) clearTimeout(timer); }
    const raw = await res.text();
    if (!res.ok) throw explainHttp(res.status, raw, cfg);
    let data;
    try { data = JSON.parse(raw); } catch { throw new MindError('format', '返事を読めませんでした。'); }
    if (cfg.kind === 'anthropic') {
        if (data.stop_reason === 'refusal') throw new MindError('refusal', 'モデルがこの依頼を断りました。');
        const text = (data.content || []).filter(b => b && b.type === 'text').map(b => b.text).join('');
        return { text, model: data.model || cfg.model };
    }
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    const text = Array.isArray(msg?.content) ? msg.content.map(p => p.text || '').join('') : String(msg?.content || '');
    return { text, model: data.model || cfg.model };
}

export async function listModels(cfg, { fetchImpl = globalThis.fetch } = {}) {
    if (cfg.path === '') return [];
    const headers = cfg.kind === 'anthropic'
        ? { 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }
        : (cfg.key ? { authorization: `Bearer ${cfg.key}` } : {});
    const res = await fetchImpl(`${cfg.base}/models`, { headers });
    if (!res.ok) throw explainHttp(res.status, '', cfg);
    const data = await res.json();
    return (data.data || data.models || []).map(m => m.id || m.name).filter(Boolean).slice(0, 400);
}

// ------------------------------------------------------------ the prompt

const LANG_NAME = { ja: '日本語', en: 'English', zh: '简体中文', ko: '한국어', es: 'español', de: 'Deutsch' };
const strip = s => String(s || '').replace(/（[^）]*）/g, '').trim();

export function buildPrompt(W, a, options, { clock = {}, describe, lang = 'ja', recent = [] } = {}) {
    const def = W.byId.agent.get(a.id) || {};
    const tr = def.traveller;
    const placeName = id => strip((W.byId.district.get(id) || {}).name_ja) || id;
    const goods = a.carrying.length ? a.carrying.map(l => `${strip((W.byId.good.get(l.good) || {}).name_ja) || l.good}×${l.qty}`).join('、') : 'なし';
    const system = [
        `あなたは「万華京ジパング」に暮らす住人「${strip(def.name || def.name_ja || a.name)}」です。${def.role || ''}`,
        `性格：${def.personality || ''}`,
        def.specialty ? `得意なこと：${def.specialty}` : '',
        def.long_term_ambition ? `長い望み：${def.long_term_ambition}` : '',
        tr && tr.memories && tr.memories.length ? `持ってきた思い出：${tr.memories.join('／')}` : '',
        tr && tr.values && tr.values.length ? `大切にしていること：${tr.values.join('、')}` : '',
        '万華京ジパングは、日本の十の時代と八つの物語の異界が重なる都で、住人が自分で仕入れ・運び・作り・交渉して時代をまたぐ経済を回しています。',
        '世界の掟：生き物を傷つけて採らない。値段のないものに値をつけない。人をだまさない。',
        `これから自分で次の行動を一つ選びます。候補の番号を一つ選び、そのときの心の声を一言（40字以内、${LANG_NAME[lang] || '日本語'}）で書いてください。`,
        '出力はJSONひとつだけ：{"choice": 番号, "thought": "心の声"}'
    ].filter(Boolean).join('\n');
    const user = [
        `いま：第${clock.day ?? '?'}日 ${clock.label || ''}（${clock.sekki || ''}）。${a.at ? placeName(a.at) + 'にいる' : '道中'}。`,
        `財布：${Math.round(a.wallet).toLocaleString('ja-JP')}刻。持ち物：${goods}。`,
        recent.length ? `最近のこと：${recent.slice(-3).join('／')}` : '',
        '候補：',
        ...options.map((o, i) => `${i + 1}. ${describe ? describe(o) : o.kind}`)
    ].filter(Boolean).join('\n');
    return { system, user };
}

// {"choice": 2, "thought": "…"} anywhere in the answer; a bare number also works.
export function parseAnswer(text, n) {
    const s = String(text || '');
    let choice = null, thought = '';
    const m = s.match(/\{[\s\S]*?\}/);
    if (m) { try { const o = JSON.parse(m[0]); choice = Number(o.choice); thought = String(o.thought || ''); } catch { /* fall through */ } }
    if (!Number.isInteger(choice)) { const d = s.match(/\b([1-9])\b/); choice = d ? Number(d[1]) : null; }
    if (!Number.isInteger(choice) || choice < 1 || choice > n) return null;
    thought = thought.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
    return { choice, thought: Array.from(thought).slice(0, 60).join('') };
}

// ------------------------------------------------------------ the mind the economy talks to

// `local` is the in-browser engine (js/mind-local.js) when the provider is "browser".
// Until it is ready, wants() is false and the economy runs exactly as without a mind.
const LOCAL_STATE = { idle: 'idle', checking: 'loading', loading: 'loading', ready: 'ready', unsupported: 'unsupported', error: 'error' };

export function createMind(W, settings, { fetchImpl, now = () => (globalThis.performance ? performance.now() : Date.now()), lang = 'ja', local = null } = {}) {
    const cfg = resolve(settings);
    const isLocal = cfg.kind === 'local';
    const engine = isLocal ? local : null;
    const status = { state: settings.on ? 'ready' : 'off', error: '', asked: 0, answered: 0, failed: 0, model: cfg.model, progress: 0, log: [] };
    const listeners = new Set();
    const calls = [];          // timestamps of calls in the last hour
    let inFlight = 0;
    const MAX_PARALLEL = isLocal ? 1 : 2;     // one GPU, one thought at a time
    const recentByAgent = new Map();
    const changed = () => { for (const fn of listeners) { try { fn(status); } catch { /* a listener must not stop the mind */ } } };

    if (isLocal) {
        const sync = st => {
            if (!settings.on) return;
            const next = LOCAL_STATE[st.phase] || 'error';
            // once running, the busy/ready/error of each call is reported by ask()
            if (!(st.phase === 'ready' && status.state !== 'loading' && status.state !== 'idle')) status.state = next;
            status.progress = st.progress || 0;
            status.model = st.model.replace(/-q4f(16|32)_1-MLC$/, '');
            status.error = st.phase === 'error' ? st.error || '' : '';
            changed();
        };
        if (engine) { engine.on(sync); sync(engine.state); } else if (settings.on) status.state = 'unsupported';
    }
    const ready = () => !isLocal || !!(engine && engine.state.phase === 'ready');

    // whether this resident thinks with the mind at all (whatever the mind is doing right now)
    function covers(id) {
        if (!settings.on || status.state === 'unsupported') return false;
        return settings.scope === 'all' || isTraveller(id);
    }
    function wants(id) {
        return ready() && inFlight < MAX_PARALLEL && covers(id);
    }

    async function ask(a, options, { clock, describe } = {}) {
        const t = now();
        while (calls.length && t - calls[0] > 3600000) calls.shift();
        // the in-browser model costs nothing, so it has no hourly cap
        if (!isLocal && calls.length >= settings.perHour) { status.state = 'budget'; changed(); return null; }
        if (inFlight >= MAX_PARALLEL || !ready()) return null;    // busy: the rules decide this time
        calls.push(t);
        inFlight++;
        status.asked++;
        status.state = 'working'; changed();
        try {
            const { system, user } = buildPrompt(W, a, options, { clock, describe, lang, recent: recentByAgent.get(a.id) || [] });
            const { text, model } = isLocal ? await engine.chat(system, user, { maxTokens: 160 }) : await complete(cfg, system, user, { fetchImpl });
            const ans = parseAnswer(text, options.length);
            if (!ans) throw new MindError('format', 'モデルの返事から選択を読み取れませんでした。');
            status.answered++;
            status.model = model || cfg.model;
            status.state = 'ready'; status.error = '';
            const entry = { agent: a.id, name: a.name, thought: ans.thought, option: options[ans.choice - 1].kind, model: status.model, ms: Math.round(now() - t), at: Date.now() };
            status.log = [entry, ...status.log].slice(0, 60);
            const mine = recentByAgent.get(a.id) || [];
            recentByAgent.set(a.id, [...mine, `${describe ? describe(options[ans.choice - 1]).split('：')[0] : entry.option}を選んだ`].slice(-3));
            changed();
            return { ...ans, model: status.model };
        } catch (e) {
            status.failed++;
            status.state = 'error'; status.error = e && e.message ? e.message : String(e);
            changed();
            return null;
        } finally { inFlight--; }
    }

    return {
        wants, covers, ask, now, patience: isLocal ? 40000 : 25000, status, cfg, engine,
        on: fn => { listeners.add(fn); return () => listeners.delete(fn); },
        logFor: id => status.log.filter(e => e.agent === id)
    };
}

// A short round trip to check the settings before turning minds on.
export async function testConnection(settings, { fetchImpl } = {}) {
    const cfg = resolve(settings);
    const t0 = Date.now();
    const { text, model } = await complete(cfg, 'あなたは接続テストに答える係です。', 'JSONだけで答えて：{"choice": 1, "thought": "つながりました"}', { fetchImpl, maxTokens: 60 });
    const ans = parseAnswer(text, 1);
    return { ok: !!ans, model, ms: Date.now() - t0, sample: ans ? ans.thought : String(text).slice(0, 80) };
}
