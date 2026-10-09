// World loader. In the browser `loadWorld` fetches world/*.json (or reads the
// inlined window.__ZIPANGU_WORLD__); `buildWorld` is the pure part that Node
// tests use directly.

const STEMS = ['world', 'eras', 'realms', 'districts', 'creatures', 'goods',
    'currencies', 'agents', 'events', 'library'];
const TEXTS_FILE = 'library.texts.json';

export async function loadWorld(base = 'world/') {
    const inlined = typeof window !== 'undefined' && window.__ZIPANGU_WORLD__;
    if (inlined) return buildWorld(inlined);

    const dir = base.endsWith('/') ? base : base + '/';
    const raw = {};
    await Promise.all(STEMS.map(async stem => { raw[stem] = await fetchJson(dir + stem + '.json'); }));
    // The extracted texts are optional: the explorer still works without them.
    raw.texts = await fetchJson(dir + TEXTS_FILE).catch(() => ({ works: {} }));
    return buildWorld(raw);
}

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`loadWorld: ${url} → HTTP ${res.status}`);
    return res.json();
}

const list = v => (Array.isArray(v) ? v : []);

function indexById(items) {
    const map = new Map();
    for (const item of items) if (item && item.id != null && !map.has(item.id)) map.set(item.id, item);
    return map;
}

// raw: parsed files keyed by stem (library.texts.json → "texts").
export function buildWorld(raw = {}) {
    const W = {
        world: raw.world || {},
        eras: list(raw.eras),
        realms: list(raw.realms),
        districts: list(raw.districts),
        creatures: list(raw.creatures),
        goods: list(raw.goods),
        currencies: list(raw.currencies),
        agents: list(raw.agents),
        events: list(raw.events),
        library: list(raw.library),
        texts: raw.texts || raw['library.texts'] || { works: {} }
    };
    if (!W.texts.works) W.texts.works = {};

    const places = [...W.eras, ...W.realms];
    W.places = places;
    W.byId = {
        era: indexById(W.eras),
        realm: indexById(W.realms),
        place: indexById(places),
        district: indexById(W.districts),
        creature: indexById(W.creatures),
        good: indexById(W.goods),
        currency: indexById(W.currencies),
        agent: indexById(W.agents),
        event: indexById(W.events),
        work: indexById(W.library)
    };

    W.baseCurrency = W.currencies.find(c => c.base) || W.currencies[0] ||
        { id: 'koku', name_ja: '刻', name_en: 'KOKU', to_base: 1, base: true };

    // Accepts a district id (→ its era/realm) or a place id (→ itself).
    W.placeOf = id => {
        if (W.byId.place.has(id)) return W.byId.place.get(id);
        const d = W.byId.district.get(id);
        return d ? W.byId.place.get(d.home) || null : null;
    };

    // Districts inside an era/realm, or [district] for a district id.
    const districtsByPlace = new Map();
    for (const d of W.districts) {
        if (!districtsByPlace.has(d.home)) districtsByPlace.set(d.home, []);
        districtsByPlace.get(d.home).push(d);
    }
    W.districtsIn = id => {
        if (W.byId.district.has(id)) return [W.byId.district.get(id)];
        return districtsByPlace.get(id) || [];
    };

    W.textOf = workId => W.texts.works[workId] || null;
    return W;
}
