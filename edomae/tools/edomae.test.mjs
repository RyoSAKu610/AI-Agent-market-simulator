// 江戸前 Edomae: the pure logic behind the line-art globe.
// Run: node edomae/tools/edomae.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// As in visuals.test.mjs, load browser modules as data: URLs (they import nothing).
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
// paths are from the repository root: edomae/ reads the world and the economy from zipangu/ (upstream, read-only)
const load = path => import(moduleUrl(readFileSync(new URL('../../' + path, import.meta.url), 'utf8')));
const { buildWorld } = await load('zipangu/js/data.js');
const { clockAt } = await load('zipangu/js/sim.js');
const { ringLayout, ringOrder, signName, arcDelta, standSpot } = await load('edomae/js/layout.js');
const { tauOf, tOfTau } = await load('edomae/js/clock.js');
const { palette } = await load('edomae/js/lib/daynight.js');
const { gait } = await load('edomae/js/lib/gait.js');
const { lookOf, lookKey } = await load('edomae/js/looks.js');

const read = stem => JSON.parse(readFileSync(new URL('../../zipangu/world/' + stem + '.json', import.meta.url), 'utf8'));
const W = buildWorld(Object.fromEntries(['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library'].map(k => [k, read(k)])));

// ---------------------------------------------------------------- ring layout
const L = ringLayout(W);
assert.equal(L.places.length, W.places.length, 'every place is on the ring');
assert.deepEqual(new Set(L.places.map(p => p.id)), new Set(W.places.map(p => p.id)), 'each place exactly once');
const slots = L.places.flatMap(p => p.districts.map(d => d.id));
assert.equal(slots.length, W.districts.length, 'every district gets a slot');
assert.equal(new Set(slots).size, slots.length, 'no district twice');
for (const id of slots) assert.ok(W.byId.district.has(id), `${id} exists in world data`);
for (const p of L.places) assert.ok(W.byId.place.has(p.id), `${p.id} exists in world data`);
assert.ok(L.R > 0 && Math.abs(L.R * 2 * Math.PI - L.total) < 1e-6, 'the ring closes');
let prevEnd = 0;
for (const p of L.places) {
    assert.ok(Math.abs(p.s0 - prevEnd) < 1e-9, `${p.id} starts where the previous place ends`);
    assert.ok(p.s1 > p.s0, `${p.id} has a positive arc`);
    prevEnd = p.s1;
    // districts and the torii sit inside the place's arc without overlapping each other
    const spans = [...p.districts.map(d => [d.x0, d.x1, d.id]), [p.torii - 43, p.torii + 43, 'torii']].sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < spans.length; i++) {
        assert.ok(spans[i][0] >= p.s0 && spans[i][1] <= p.s1, `${spans[i][2]} inside ${p.id}`);
        if (i) assert.ok(spans[i][0] >= spans[i - 1][1], `${spans[i - 1][2]} and ${spans[i][2]} do not overlap`);
    }
    for (const d of p.districts) assert.equal(W.byId.district.get(d.id).home, p.id, `${d.id} stands in its own place`);
}
assert.ok(Math.abs(prevEnd - L.total) < 1e-9, 'the last place closes the ring');
assert.deepEqual(JSON.parse(JSON.stringify(ringLayout(W).places.map(p => [p.id, p.s0, p.s1, p.torii, p.districts.map(d => [d.id, d.s, d.w])]))),
    JSON.parse(JSON.stringify(L.places.map(p => [p.id, p.s0, p.s1, p.torii, p.districts.map(d => [d.id, d.s, d.w])]))), 'layout is deterministic');
const order = ringOrder(W).map(p => p.id);
assert.equal(Math.abs(order.indexOf('edo_sangaku') - order.indexOf('edo_raiden')), 1, 'the two Edo places stand side by side');
for (const d of W.districts) {
    const name = signName(d);
    assert.ok(name && String(d.name_ja).replace(/（[^）]*）/g, '').includes(name), `signboard of ${d.id} uses its own name`);
}
assert.equal(arcDelta(10, L.total - 10, L.total), -20, 'arcDelta wraps');
for (const a of W.agents) { const s = standSpot(L, a.id, a.home), d = L.byDistrict.get(a.home); assert.ok(s >= d.x0 && s <= d.x1, `${a.id} stands in front of home`); }

// ---------------------------------------------------------------- tauOf: the 万世時計 → line-art day
for (const sk of [0, 3, 6, 9, 12, 15, 18, 21]) {
    for (let day = 0; day < 3; day++) {
        const c = clockAt(day + 0.5, sk);
        const at = t => tauOf({ ...c, t });
        assert.ok(Math.abs(at(c.dawn) - 0.25) < 1e-9, `dawn → 0.25 (sekki ${sk})`);
        assert.ok(Math.abs(at(c.dusk) - 0.75) < 1e-9, `dusk → 0.75 (sekki ${sk})`);
        assert.ok(Math.abs(at((c.dawn + c.dusk) / 2) - 0.5) < 1e-9, `noon → 0.5 (sekki ${sk})`);
        assert.ok(Math.abs(at(0.5) - 0.5) < 1e-9, 'midday of the clock is noon');
        assert.ok(at(0) < 1e-9 || at(0) > 1 - 1e-9, 'midnight → 0');
        assert.ok(Math.abs(tOfTau(at(0.31), c.dawn, c.dusk) - 0.31) < 1e-9, 'tOfTau inverts tauOf');
    }
    // continuous and monotonic across whole days from the real clock (unwrapped)
    let prev = null, acc = 0;
    for (let i = 0; i <= 3 * 1440; i++) {
        const T = i / 1440, c = clockAt(T, sk), x = tauOf(c);
        if (prev !== null) {
            let d = x - prev; if (d < -0.5) d += 1;
            assert.ok(d >= 0, `monotonic at T=${T} (sekki ${sk})`);
            assert.ok(d < 0.0025, `continuous at T=${T} (sekki ${sk}): jump ${d}`);
            acc += d;
        }
        prev = x;
    }
    assert.ok(Math.abs(acc - 3) < 1e-6, 'three days are three turns of the palette');
}

// ---------------------------------------------------------------- palette contrast
const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
for (const tau of [0.3, 0.5, 0.72, 0.8, 0.95, 0.24]) {
    const P = palette(tau);
    const diff = Math.abs(lum(P.ink) - lum(P.paper));
    assert.ok(diff > 0.4, `ink and paper stay apart at τ=${tau} (${diff.toFixed(2)})`);
}
assert.ok(palette(0.95).inkT > 0.9 && palette(0.5).inkT < 0.1, 'night ink is pale, day ink is dark');

// ---------------------------------------------------------------- gait: the planted foot does not slide
for (const kind of ['walk', 'shuffle']) {
    const g = gait({ kind });
    const dt = 1 / 240;
    let x = 0, phase = 0.03;
    const pivots = [null, null];
    let checked = 0;
    for (let i = 0; i < 240 * 3; i++) {
        const p = g.pose(phase);
        p.feet.forEach((fo, k) => {
            if (!fo.stance) { pivots[k] = null; return; }
            // the foot pivots on its toe at heel-off; that toe point must stay still on the ground
            const th = fo.pitch * Math.PI / 180, ox = -g.toe, oy = g.ankleY - g.ground;
            const px = fo.ankle[0] - (ox * Math.cos(th) - oy * Math.sin(th));
            const world = x + (px - 40);
            if (pivots[k] === null) pivots[k] = world;
            assert.ok(Math.abs(world - pivots[k]) < 1e-6, `${kind}: stance foot ${k} stays planted (drift ${world - pivots[k]})`);
            checked++;
        });
        phase += dt / g.period;
        x += g.speed * dt;
    }
    assert.ok(checked > 200, `${kind}: stance frames were checked`);
    // the body rises over the planted foot and dips at double support
    const bobs = Array.from({ length: 50 }, (_, i) => g.pose(i / 50).bob);
    assert.ok(Math.max(...bobs) - Math.min(...bobs) > 0.3, `${kind}: the hip rises and falls`);
}

// ---------------------------------------------------------------- residents' looks
const looks = W.agents.map(a => {
    const d = W.byId.district.get(a.home), pl = W.byId.place.get(d.home);
    const L1 = lookOf(a, pl, 'edo'), L2 = lookOf(a, pl, 'edo');
    assert.deepEqual(L1, L2, `${a.id}: look is deterministic`);
    for (const k of ['garment', 'gaitKind', 'main', 'hat', 'hair', 'prop']) assert.ok(L1[k], `${a.id}: ${k}`);
    assert.ok(/^#[0-9a-f]{6}$/i.test(L1.main) && /^#[0-9a-f]{6}$/i.test(L1.accent), `${a.id}: colours are hex`);
    return L1;
});
const keys = new Set(looks.map(lookKey));
assert.ok(keys.size >= W.agents.length - 1, `residents are told apart (${keys.size} distinct of ${W.agents.length})`);
assert.ok(new Set(looks.map(l => l.garment)).size >= 4 && new Set(looks.map(l => l.hat)).size >= 6 && new Set(looks.map(l => l.prop)).size >= 8, 'variety in garments, hats and props');

console.log(`edomae: ${L.places.length} places, ${slots.length} districts on a ring of radius ${Math.round(L.R)}; tauOf, contrast, planted feet and ${keys.size} distinct residents ok`);
