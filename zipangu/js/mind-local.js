// 🧠 A model that runs inside this browser: WebLLM with Alibaba's Qwen on WebGPU.
//
// No key, no server, no fee: the weights are downloaded once from the model's
// public repository, kept in the browser's cache, and every thought is worked
// out on this device. The model runs in a Web Worker (js/mind-worker.js) so
// the map keeps its frame rate while a resident thinks.
//
// Phases: idle (waiting to be started) → checking → loading (progress 0..1)
// → ready; or unsupported (no WebGPU) / error. Nothing is fetched before start().

export const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.85/lib/index.js';
const MODELS = { large: 'Qwen2.5-1.5B-Instruct', small: 'Qwen2.5-0.5B-Instruct' };
// Rough first-download sizes, for the text that asks before a phone downloads.
export const DOWNLOAD_MB = { large: 1000, small: 400 };
export const CONSENT_KEY = 'zipangu.mind.local.ok';

// Phones get the small model and a one-tap start (it is a big download on mobile data).
export function isPhone(nav = globalThis.navigator) {
    if (!nav) return false;
    if (nav.userAgentData && nav.userAgentData.mobile === true) return true;
    // iPadOS reports itself as a Mac; a touch screen gives it away.
    return /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '') || (nav.maxTouchPoints > 1 && /Macintosh/.test(nav.userAgent || ''));
}

export async function localSupport(nav = globalThis.navigator) {
    if (typeof Worker === 'undefined') return { ok: false, reason: 'worker' };
    if (!nav || !nav.gpu || typeof nav.gpu.requestAdapter !== 'function') return { ok: false, reason: 'webgpu' };
    let adapter = null;
    try { adapter = await nav.gpu.requestAdapter(); } catch { adapter = null; }
    if (!adapter) return { ok: false, reason: 'webgpu' };
    const f16 = !!(adapter.features && typeof adapter.features.has === 'function' && adapter.features.has('shader-f16'));
    return { ok: true, f16 };
}

export function pickModel({ phone = false, f16 = false } = {}) {
    return `${phone ? MODELS.small : MODELS.large}-${f16 ? 'q4f16_1' : 'q4f32_1'}-MLC`;
}

// The model's answer must be this shape; WebLLM constrains generation to it.
const ANSWER_SCHEMA = JSON.stringify({
    type: 'object',
    properties: { choice: { type: 'integer' }, thought: { type: 'string' } },
    required: ['choice', 'thought']
});

export function createLocalEngine({
    phone = isPhone(), nav = globalThis.navigator, WorkerImpl = globalThis.Worker,
    workerUrl = new URL('./mind-worker.js', import.meta.url), lib = WEBLLM_URL
} = {}) {
    const state = { phase: 'idle', progress: 0, text: '', error: '', model: pickModel({ phone, f16: false }), phone, sizeMB: phone ? DOWNLOAD_MB.small : DOWNLOAD_MB.large };
    const listeners = new Set();
    const pending = new Map();
    let worker = null, seq = 0, starting = null;
    const changed = () => { for (const fn of listeners) { try { fn(state); } catch { /* a listener must not stop the engine */ } } };
    const fail = (message) => {
        // a failed start can be tried again (e.g. the download broke off)
        if (worker) { try { worker.terminate(); } catch { /* already gone */ } }
        worker = null; starting = null;
        state.phase = 'error'; state.error = message;
        for (const p of pending.values()) p.reject(new Error(message));
        pending.clear();
        changed();
    };

    function call(type, payload) {
        const id = ++seq;
        return new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject });
            worker.postMessage({ id, type, ...payload });
        });
    }

    function start() {
        if (starting) return starting;
        starting = (async () => {
            state.phase = 'checking'; changed();
            const support = await localSupport(nav);
            if (!support.ok) { state.phase = 'unsupported'; state.error = support.reason; changed(); return false; }
            state.model = pickModel({ phone, f16: support.f16 });
            state.phase = 'loading'; state.progress = 0; changed();
            try {
                worker = new WorkerImpl(workerUrl, { type: 'module' });
            } catch (e) { fail(String(e && e.message || e)); return false; }
            worker.onmessage = ({ data: m }) => {
                if (!m) return;
                if (m.type === 'progress') {
                    state.progress = Math.max(state.progress, Math.min(1, Number(m.progress) || 0));
                    state.text = String(m.text || '').slice(0, 160);
                    changed();
                    return;
                }
                const p = pending.get(m.id);
                if (!p) return;
                pending.delete(m.id);
                if (m.ok) p.resolve(m); else p.reject(new Error(m.error || 'failed'));
            };
            worker.onerror = e => fail((e && e.message) || 'worker error');
            try {
                await call('load', { model: state.model, lib });
            } catch (e) { fail(String(e && e.message || e)); return false; }
            state.phase = 'ready'; state.progress = 1; changed();
            return true;
        })();
        return starting;
    }

    async function chat(system, user, { maxTokens = 160 } = {}) {
        if (state.phase !== 'ready') throw new Error('not ready');
        const m = await call('chat', {
            messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
            maxTokens, schema: ANSWER_SCHEMA
        });
        return { text: String(m.text || ''), model: state.model.replace(/-q4f(16|32)_1-MLC$/, '') };
    }

    return {
        state, start, chat,
        on: fn => { listeners.add(fn); return () => listeners.delete(fn); },
        stop() { if (worker) worker.terminate(); worker = null; starting = null; state.phase = 'idle'; state.progress = 0; changed(); }
    };
}
