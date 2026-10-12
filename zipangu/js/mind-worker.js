// 🧠 Web Worker that holds the in-browser model (see js/mind-local.js).
// Messages in:  { id, type: 'load', model, lib }  |  { id, type: 'chat', messages, maxTokens, schema }
// Messages out: { type: 'progress', progress, text }  |  { id, ok, text?, error? }

let engine = null;

self.onmessage = async ({ data: m }) => {
    try {
        if (m.type === 'load') {
            const webllm = await import(m.lib);
            engine = await webllm.CreateMLCEngine(m.model, {
                initProgressCallback: p => self.postMessage({ type: 'progress', progress: p.progress, text: p.text })
            });
            self.postMessage({ id: m.id, ok: true });
        } else if (m.type === 'chat') {
            if (!engine) throw new Error('not loaded');
            const req = { messages: m.messages, max_tokens: m.maxTokens, temperature: 0.7 };
            let r;
            try {
                // Constrain the answer to {"choice": n, "thought": "..."}; small models then never break the format.
                r = await engine.chat.completions.create({ ...req, response_format: { type: 'json_object', schema: m.schema } });
            } catch {
                r = await engine.chat.completions.create(req);
            }
            const msg = r && r.choices && r.choices[0] && r.choices[0].message;
            self.postMessage({ id: m.id, ok: true, text: (msg && msg.content) || '' });
        }
    } catch (e) {
        self.postMessage({ id: m.id, ok: false, error: String((e && e.message) || e) });
    }
};
