// Trial endpoint for 万華京ジパング's AI minds (zipangu/js/mind.js, provider "demo").
//
// Lets a visitor try LLM-driven residents without a key of their own. The
// site's OpenRouter key stays here on the server; the browser only ever sees
// an OpenAI-style answer. Without OPENROUTER_API_KEY the endpoint answers 503
// not_configured and the page tells the visitor to bring their own key.
//
// Environment (Netlify site settings):
//   OPENROUTER_API_KEY   required to switch the trial on
//   ZIPANGU_MIND_MODEL   optional default model (an OpenRouter model id)

export const ALLOWED_MODELS = [
    'deepseek/deepseek-chat',
    'qwen/qwen-2.5-72b-instruct',
    'moonshotai/kimi-k2',
    'z-ai/glm-4.5'
];
const MAX_MESSAGES = 3;
const MAX_CHARS = 6000;
const MAX_TOKENS = 400;
const PER_MINUTE = 20;            // per visitor address, per warm instance (best effort)
const hits = new Map();

const env = name => {
    try { if (globalThis.Netlify && globalThis.Netlify.env) { const v = globalThis.Netlify.env.get(name); if (v) return v; } } catch { /* fall through */ }
    return typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});

function limited(ip, now = Date.now()) {
    const list = (hits.get(ip) || []).filter(t => now - t < 60000);
    if (list.length >= PER_MINUTE) { hits.set(ip, list); return true; }
    list.push(now);
    hits.set(ip, list);
    if (hits.size > 5000) hits.clear();
    return false;
}

export default async (req, context = {}) => {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
    // Only this site's own pages may use the trial from a browser.
    const origin = req.headers.get('origin');
    if (origin) {
        let same = false;
        try { same = new URL(origin).host === new URL(req.url).host; } catch { same = false; }
        if (!same) return json({ error: 'forbidden_origin' }, 403);
    }
    const key = env('OPENROUTER_API_KEY');
    if (!key) return json({ error: 'not_configured' }, 503);
    const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'anon';
    if (limited(ip)) return json({ error: 'rate_limited' }, 429);

    // a real request is a few KB; refuse anything big before reading it
    if (Number(req.headers.get('content-length') || 0) > 32_768) return json({ error: 'too_large' }, 413);
    let body;
    try {
        const text = await req.text();
        if (text.length > 32_768) return json({ error: 'too_large' }, 413);
        body = JSON.parse(text);
    } catch { return json({ error: 'bad_json' }, 400); }
    const messages = Array.isArray(body && body.messages) ? body.messages : null;
    if (!messages || !messages.length || messages.length > MAX_MESSAGES
        || !messages.every(m => m && (m.role === 'system' || m.role === 'user') && typeof m.content === 'string' && m.content.length <= MAX_CHARS)) {
        return json({ error: 'bad_messages' }, 400);
    }
    const fallbackModel = ALLOWED_MODELS.includes(env('ZIPANGU_MIND_MODEL')) ? env('ZIPANGU_MIND_MODEL') : ALLOWED_MODELS[0];
    const model = ALLOWED_MODELS.includes(body.model) ? body.model : fallbackModel;
    const maxTokens = Math.max(16, Math.min(MAX_TOKENS, Number(body.max_tokens) || 300));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    let res;
    try {
        res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST', signal: ctrl.signal,
            headers: {
                'content-type': 'application/json', authorization: `Bearer ${key}`,
                'HTTP-Referer': new URL(req.url).origin, 'X-Title': 'Kaleidoscope Zipangu (trial)'
            },
            body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.8, messages: messages.map(m => ({ role: m.role, content: m.content })) })
        });
    } catch {
        return json({ error: 'upstream_unreachable' }, 502);
    } finally { clearTimeout(timer); }
    if (!res.ok) return json({ error: 'upstream', status: res.status }, res.status === 429 ? 429 : 502);
    let data;
    try { data = await res.json(); } catch { return json({ error: 'upstream_format' }, 502); }
    const content = String(data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '').slice(0, 4000);
    return json({ choices: [{ message: { role: 'assistant', content } }], model: data.model || model });
};
