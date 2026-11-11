// 江戸前 Edomae — the ring layout: where every place and district stands on the
// globe seen from the side. Pure: no DOM, no imports, deterministic, so Node tests
// (edomae/tools/edomae.test.mjs) load it as is.
//
// The street runs around the globe. Positions are arc lengths `s` (scene units)
// measured along the street from the start of the first place; the globe radius is
// whatever makes the ring close: R = total / 2π, angle = s / R.

// Architectural family of each era and realm (what the buildings look like).
export const FAMILY = {
    jomon_yuinawa: 'jomon', onmyoryo_rokoku: 'heian', hiraizumi_zipangu: 'hiraizumi',
    sengoku_neji: 'sengoku', edo_sangaku: 'edo', edo_raiden: 'edo', meiji_tamamushi: 'meiji',
    taisho_tenki: 'taisho', showa_hojo: 'showa', reiwa_mangekyo: 'reiwa',
    ginga_tetsudo: 'ginga', ihatov: 'ihatov', tono: 'tono', sakura_mori: 'sakura',
    ryugu_horai: 'ryugu', tsuki_no_miyako: 'tsuki', tenshu: 'tenshu', yume_juya: 'yume'
};
const ERA_FALLBACK = ['jomon', 'heian', 'hiraizumi', 'sengoku', 'edo', 'edo', 'meiji', 'taisho', 'showa', 'reiwa'];

export const HERO = new Set(['edo_sangaku', 'edo_raiden']);

export const SIZES = { pad: 46, gap: 24, torii: 86 };

// FNV-1a + avalanche, the same idea as util.js hash01 but self-contained.
export function hash01(...parts) {
    let x = 0x811c9dc5;
    for (const ch of parts.join('|')) {
        x ^= ch.codePointAt(0);
        x = Math.imul(x, 0x01000193);
    }
    x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b);
    x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
}

export const familyOf = place => {
    if (!place) return 'reiwa';
    if (FAMILY[place.id]) return FAMILY[place.id];
    if (Number.isFinite(place.order)) return ERA_FALLBACK[Math.max(0, Math.min(9, place.order - 1))];
    return 'realm';
};

// ------------------------------------------------------------------ Japanese names (always Japanese here)

export const stripParens = s => String(s == null ? '' : s).replace(/（[^）]*）|\([^)]*\)/g, '').trim();

// 縄文「結縄と漆の森」 → 縄文 (as util.js placeShort, but never English: the signboards are Japanese).
export function placeShortJa(p) {
    const full = stripParens(p && p.name_ja);
    return full.split('「')[0].trim() || full;
}
export function placeSubJa(p) {
    const m = stripParens(p && p.name_ja).match(/「([^」]*)」?/);
    return m ? m[1].trim() : '';
}
// 刻輪広場・万世時計 → 刻輪広場 (as util.js districtShort)
export const districtShortJa = d => stripParens(d && d.name_ja).split('・')[0] || stripParens(d && d.name_ja);

// The words painted on a district's signboard: its own name from the data, never invented.
// Prefers the most particular part (道頓堀・竹田からくり座 → 竹田からくり座).
export function signName(d) {
    const full = stripParens(d && d.name_ja);
    const parts = full.split(/・| ― /).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) return full;
    const last = parts[parts.length - 1];
    if (last.length >= 3 && last.length <= 11) return last;
    let best = parts[0];
    for (const p of parts) if (p.length > best.length && p.length <= 11) best = p;
    return best;
}

// ------------------------------------------------------------------ ring order

// Eras in their order; each realm follows the first era it connects to, so the
// realms sit next to the time-slices they open from. The two Edo places stay side
// by side (a realm anchored on the first Edo place moves after the second).
export function ringOrder(W) {
    const eras = [...W.eras].sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.id).localeCompare(String(b.id)));
    const eraIds = new Set(eras.map(e => e.id));
    const after = new Map(eras.map(e => [e.id, []]));
    const orphans = [];
    for (const r of W.realms) {
        let anchor = (r.connections || []).find(id => eraIds.has(id)) || null;
        if (anchor === 'edo_sangaku') anchor = 'edo_raiden';
        if (anchor && after.has(anchor)) after.get(anchor).push(r); else orphans.push(r);
    }
    const out = [];
    for (const e of eras) { out.push(e); out.push(...after.get(e.id)); }
    out.push(...orphans);
    return out;
}

// ------------------------------------------------------------------ the layout

export function districtWidth(d, family) {
    const h = hash01(d.id, 'w');
    if (family === 'edo') return Math.round(236 + 44 * h);
    if (family === 'reiwa' || family === 'meiji') return Math.round(128 + 40 * h);
    if (family === 'sakura') return Math.round(150 + 40 * h);
    return Math.round(134 + 46 * h);
}

// → { R, total, places: [...], byPlace: Map, byDistrict: Map }
// place: { id, place, family, hero, s0, s1, mid, torii, districts: [{ id, district, s, w, x0, x1, family, seed }] }
export function ringLayout(W) {
    const { pad, gap, torii: toriiW } = SIZES;
    const places = [];
    let s = 0;
    for (const p of ringOrder(W)) {
        const family = familyOf(p);
        const list = W.districts.filter(d => d.home === p.id);
        const half = Math.ceil(list.length / 2);
        const entry = { id: p.id, place: p, family, hero: HERO.has(p.id), s0: s, s1: 0, mid: 0, torii: 0, districts: [] };
        s += pad;
        list.forEach((d, i) => {
            if (i === half) { entry.torii = s + toriiW / 2; s += toriiW + gap; }
            const w = districtWidth(d, family);
            entry.districts.push({ id: d.id, district: d, place: p.id, s: s + w / 2, w, x0: s, x1: s + w, family, seed: Math.floor(hash01(d.id, 'seed') * 2147483646) + 1 });
            s += w + gap;
        });
        if (!list.length || half >= list.length) { entry.torii = s + toriiW / 2; s += toriiW + gap; }
        s += pad - gap;
        entry.s1 = s;
        entry.mid = (entry.s0 + entry.s1) / 2;
        places.push(entry);
    }
    const total = s;
    const R = total / (2 * Math.PI);
    const byPlace = new Map(places.map(p => [p.id, p]));
    const byDistrict = new Map();
    for (const p of places) for (const d of p.districts) byDistrict.set(d.id, d);
    return { R, total, places, byPlace, byDistrict };
}

// Signed shortest arc from a to b on a ring of length L.
export function arcDelta(a, b, L) {
    let d = (b - a) % L;
    if (d > L / 2) d -= L;
    if (d < -L / 2) d += L;
    return d;
}

// The place whose arc contains street position s (wrapped).
export function placeAtS(layout, s) {
    const L = layout.total;
    const x = ((s % L) + L) % L;
    for (const p of layout.places) if (x >= p.s0 && x < p.s1) return p;
    return layout.places[0];
}

// Where a resident stands in front of a district: a fixed spot along its frontage.
export function standSpot(layout, agentId, districtId) {
    const d = layout.byDistrict.get(districtId);
    if (!d) return null;
    const u = hash01(agentId, districtId, 'spot');
    return d.s + (u - 0.5) * (d.w - 36);
}
