import { decodeHistory } from './history.js';
// One atomic localStorage value keeps clock, positions, promises and memories together.
export function journeyKey(seed) { return `zipangu.journey.v1:${seed}`; }
const STAGES = ['idle', 'react', 'think', 'travel', 'trade'];
const STEPS = ['go', 'buy', 'sell', 'craft', 'work', 'look', 'rest', 'request'];
const finite = n => Number.isFinite(n);
const natural = n => Number.isInteger(n) && n >= 0;
function ensure(ok) { if (!ok) throw new Error('記録の形式または世界との対応を確かめられません。'); }
export function validateJourney(data, W, seed) {
    ensure(data?.v === 1 && data.seed === seed && data.economy?.v === 1 && data.stories?.v === 1);
    const e = data.economy, s = data.stories;
    ensure(e.seed === seed && natural(e.tick) && natural(e.ran) && finite(e.elapsed) && e.elapsed >= 0
        && natural(e.rng) && natural(e.startSekki) && e.startSekki < 24 && natural(e.eventSeq || 0));
    ensure(Array.isArray(e.agents) && e.agents.length === W.agents.length && new Set(e.agents.map(a => a.id)).size === W.agents.length);
    ensure(Array.isArray(e.schedule) && Array.isArray(e.active) && e.markets && e.stats && e.pending && e.eventMult);
    for (const a of e.agents) {
        ensure(W.byId.agent.has(a.id) && W.byId.district.has(a.home) && (a.at === null || W.byId.district.has(a.at))
            && STAGES.includes(a.stage) && [a.x, a.y, a.ox, a.oy, a.wallet, a.timer, a.stageSince, a.goalProgress].every(finite)
            && a.wallet >= 0 && a.stats && a.needs && a.traits && a.visited && Array.isArray(a.carrying));
        ensure(['curiosity', 'reputation', 'fatigue'].every(k => finite(a.needs[k]))
            && ['risk', 'wander', 'diligence', 'capacity'].every(k => finite(a.traits[k]))
            && ['trips', 'distance', 'sales', 'buys', 'crafts', 'profit', 'gain', 'volume', 'homeSales', 'knowledgeSales', 'invested', 'daysRowed', 'profitSince'].every(k => finite(a.stats[k]))
            && a.stats.placesSold && finite(a.startWorth) && finite(a.milestone));
        for (const lot of a.carrying) ensure(W.byId.good.has(lot.good) && finite(lot.qty) && lot.qty > 0 && finite(lot.cost));
        if (a.trip) ensure(W.byId.district.has(a.trip.from) && W.byId.district.has(a.trip.to)
            && ['ginga_tetsudo', 'torii', 'chodo', 'kumoito', 'oshie', 'hojo_capsule', 'tamamushi_car', 'karasu_bikyaku'].includes(a.trip.via)
            && [a.trip.x0, a.trip.y0, a.trip.x1, a.trip.y1, a.trip.prog, a.trip.dist, a.trip.started].every(finite));
        ensure(a.stage !== 'travel' || a.trip);
        if (a.plan) ensure(Array.isArray(a.plan.steps) && natural(a.plan.i) && a.plan.i < a.plan.steps.length && a.plan.steps.every(st => STEPS.includes(st.type)
            && (st.type !== 'go' || W.byId.district.has(st.to)) && (!st.good || W.byId.good.has(st.good))));
        ensure(!a.requestQueue || (Array.isArray(a.requestQueue) && a.requestQueue.length <= 1));
        ensure(!a.inbox || (Array.isArray(a.inbox) && a.inbox.length <= 64));
        for (const letter of a.inbox || []) ensure(typeof letter.id === 'string' && W.byId.agent.has(letter.from) && typeof letter.body === 'string' && letter.body.length <= 120 && finite(letter.deposited));
        for (const r of [...(a.requestQueue || []), ...(a.plan?.request ? [a.plan.request] : [])]) {
            ensure(typeof r.id === 'string' && ['guide', 'observe', 'message'].includes(r.type) && W.byId.district.has(r.target)
                && (r.type !== 'message' || (W.byId.agent.has(r.recipient) && typeof r.body === 'string' && r.body.length <= 120)));
            ensure(s.people?.[a.id]?.requests?.some(saved => saved.id === r.id && ['queued', 'active'].includes(saved.status)));
        }
    }
    for (const ev of [...e.schedule, ...e.active]) ensure(W.byId.event.has(ev.id));
    for (const ev of e.schedule) ensure(finite(ev.at));
    for (const [id, row] of Object.entries(e.markets)) {
        ensure(W.byId.district.has(id));
        for (const [g, quote] of Object.entries(row)) ensure(W.byId.good.has(g) && finite(quote.anchor) && finite(quote.p));
    }
    ensure(natural(s.nextId) && s.nextId > 0 && natural(s.lastSeq) && s.lastSeq <= (e.eventSeq || 0)
        && s.people && Object.keys(s.people).length === W.agents.length);
    for (const a of W.agents) {
        const p = s.people[a.id];
        ensure(p && natural(p.trust) && p.trust <= 100 && natural(p.practice) && p.bonds && Array.isArray(p.earned) && p.earned.length <= 96);
        for (const [key, max] of [['chat', 24], ['chronicle', 40], ['memories', 8], ['requests', 16]]) ensure(Array.isArray(p[key]) && p[key].length <= max);
        for (const item of [...p.chat, ...p.chronicle, ...p.memories]) ensure(typeof item.text === 'string' && item.text.length <= 2000 && finite(item.T) && natural(item.day));
        for (const r of p.requests) ensure(/^promise-\d+$/.test(r.id) && Number(r.id.slice(8)) < s.nextId
            && ['queued', 'active', 'done'].includes(r.status) && W.byId.district.has(r.target));
    }
    if (data.history) {
        const h = decodeHistory(data.history);
        ensure(Array.isArray(h.times) && h.times.length <= 72 && Array.isArray(h.rows) && Array.isArray(h.means));
        for (const t of h.times) ensure(finite(t.time) && t.time <= e.tick / 288 && natural(t.day) && typeof t.label === 'string');
        for (const [key, prices] of h.rows) {
            const [d, g] = key.split('|');
            ensure(W.byId.district.has(d) && W.byId.good.has(g) && Array.isArray(prices) && prices.length === h.times.length && prices.every(finite));
        }
        for (const [g, prices] of h.means) ensure(W.byId.good.has(g) && Array.isArray(prices) && prices.length === h.times.length && prices.every(finite));
    }
    // JSON contains finite numbers only; reject accidental wrong types in sim counters.
    function inspect(value, depth = 0) { ensure(depth < 30); if (typeof value === 'number') ensure(finite(value)); else if (value && typeof value === 'object') for (const child of Object.values(value)) inspect(child, depth + 1); }
    inspect(data);
    return data;
}
export function loadJourney(storage, W, seed) {
    try {
        const raw = storage.getItem(journeyKey(seed));
        if (!raw) return { data: null, status: 'この端末で旅の記録を始めます。', blocked: false };
        const data = validateJourney(JSON.parse(raw), W, seed);
        return { data, status: '保存した時計と旅の続きから再開しました。閉じている間は時間を進めません。', blocked: false };
    } catch { return { data: null, status: '保存記録を読み取れません。元の記録を上書きせず、今回は一時的な世界を表示しています。', blocked: true }; }
}
export function saveJourney(storage, seed, eco, stories, history = null) {
    try {
        storage.setItem(journeyKey(seed), JSON.stringify({ v: 1, seed, economy: eco.snapshot(), stories: stories.snapshot(), history: history?.snapshot() || null }));
        return { ok: true, status: `保存済み：第${eco.clock.day}日 ${eco.clock.label}。このブラウザの、この端末だけの記録です。` };
    } catch { return { ok: false, status: 'この端末に保存できません。画面上の旅は続きますが、再読み込みで失われます。' }; }
}
