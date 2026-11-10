// ⚡ Auto-connect: look for every AI mind this visitor can use right now, without typing
// anything, and pick the best one. Checked side by side, a couple of seconds at most:
//   saved    a key the visitor saved earlier still works
//   ollama   a model served by Ollama on this computer
//   lmstudio a model served by LM Studio on this computer
//   browser  this device can run the in-browser model (WebGPU)
//   demo     this site's keyless trial is switched on
// Nothing is sent anywhere except a "which models do you have?" question to each place;
// the trial is asked only whether it is switched on, which costs no model call and no quota.

import { PROVIDERS, resolve, listModels } from './mind.js';
import { localSupport } from './mind-local.js';

// Best first: a mind the visitor chose, then the bigger models on their own computer,
// then the small one in the browser, then the shared trial.
export const SCAN_ORDER = ['saved', 'ollama', 'lmstudio', 'browser', 'demo'];
export const LMSTUDIO_BASE = 'http://localhost:1234/v1';

const CHAT_HINT = /qwen|deepseek|llama|gemma|mistral|phi|glm|kimi|gpt|claude/i;
const NOT_CHAT = /embed|rerank|whisper|tts|bge-|nomic/i;
// → the model to think with, from what a local server offers
export function pickLocalModel(list) {
    const chat = (list || []).filter(m => m && !NOT_CHAT.test(m));
    return chat.find(m => CHAT_HINT.test(m)) || chat[0] || '';
}

// The deadline covers the whole answer, body included: a server that sends headers and
// then stalls is cut off too, so the timer is left to run out rather than cleared.
function withTimeout(fetchImpl, ms) {
    return (url, init = {}) => {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), ms);
        return fetchImpl(url, { ...init, signal: ctrl.signal });
    };
}

const miss = (id, reason) => ({ id, ok: false, reason });

async function probeLocalServer(id, cfg, settings, fetchImpl) {
    try {
        const model = pickLocalModel(await listModels(cfg, { fetchImpl }));
        return model ? { id, ok: true, model, settings: { ...settings, model } } : miss(id, 'no_model');
    } catch { return miss(id, 'absent'); }
}

const PROBES = {
    async saved({ settings, fetchImpl }) {
        const p = PROVIDERS[settings.provider];
        if (!settings.key || !p || p.keyless) return miss('saved', 'no_key');
        // without a full address the question (and the key) would go to this site instead
        if (!/^https?:\/\//i.test(resolve(settings).base)) return miss('saved', 'no_endpoint');
        try {
            await listModels(resolve(settings), { fetchImpl });
            return { id: 'saved', ok: true, model: resolve(settings).model, provider: settings.provider, settings: { provider: settings.provider, base: settings.base || '', model: settings.model || '', key: settings.key, remember: !!settings.remember } };
        } catch { return miss('saved', 'refused'); }
    },
    ollama: ({ fetchImpl }) => probeLocalServer('ollama', resolve({ provider: 'ollama' }), { provider: 'ollama', base: '' }, fetchImpl),
    lmstudio: ({ fetchImpl }) => probeLocalServer('lmstudio', resolve({ provider: 'custom', base: LMSTUDIO_BASE }), { provider: 'custom', base: LMSTUDIO_BASE }, fetchImpl),
    async browser({ support }) {
        const s = await support();
        return s.ok ? { id: 'browser', ok: true, model: PROVIDERS.browser.model, settings: { provider: 'browser', base: '', model: '' } } : miss('browser', s.reason || 'webgpu');
    },
    async demo({ fetchImpl, origin }) {
        if (!/^https?:/.test(origin || '')) return miss('demo', 'absent');
        try {
            // the endpoint's own status question: outside the trial's per-visitor request quota
            const res = await fetchImpl(PROVIDERS.demo.base + '?status');
            if (!res.ok) return miss('demo', 'absent');
            const body = await res.json();
            return body && body.configured === true ? { id: 'demo', ok: true, model: 'auto', settings: { provider: 'demo', base: '', model: '' } }
                : miss('demo', body && body.configured === false ? 'not_configured' : 'absent');
        } catch { return miss('demo', 'absent'); }
    }
};

// → [{ id, ok, model?, settings?, reason? }] in SCAN_ORDER. `onResult` hears each as it lands.
export async function scanMinds({ settings = {}, fetchImpl = globalThis.fetch, support = localSupport, origin = globalThis.location ? globalThis.location.origin : '', timeoutMs = 2500, onResult = null } = {}) {
    const f = withTimeout(fetchImpl, timeoutMs);
    return Promise.all(SCAN_ORDER.map(async id => {
        let r;
        // no source may hold the others up, whatever it does
        const late = new Promise(done => setTimeout(() => done(miss(id, 'timeout')), timeoutMs + 500));
        try { r = await Promise.race([PROBES[id]({ settings, fetchImpl: f, support, origin }), late]); } catch { r = miss(id, 'absent'); }
        if (onResult) onResult(r);
        return r;
    }));
}

// → the best mind found, or null (the city then runs by its rules alone)
export const pickBest = results => SCAN_ORDER.map(id => (results || []).find(r => r.id === id && r.ok)).find(Boolean) || null;

// → the settings to save for a found mind, keeping the visitor's other choices
export function settingsFor(found, current = {}) {
    const keep = { scope: current.scope || 'all', perHour: current.perHour || 120 };
    return { ...keep, on: true, remember: false, key: '', ...found.settings };
}
