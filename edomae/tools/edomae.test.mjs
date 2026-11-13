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
const { tauOf, tOfTau, warm, legible, contrast } = await load('edomae/js/clock.js');
const { palette } = await load('edomae/js/lib/daynight.js');
const { gait } = await load('edomae/js/lib/gait.js');
const { lookOf, lookKey, companionOf } = await load('edomae/js/looks.js');
const news = await load('edomae/js/news.js');
const { frameFor, TALLEST } = await load('edomae/js/frame.js');
const WM = await load('edomae/js/watermath.js');

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

// ---------------------------------------------------------------- warm paper keeps its contrast
for (const tau of [0.3, 0.5, 0.72, 0.8, 0.95, 0.24]) {
    const P = warm(palette(tau));
    const diff = Math.abs(lum(P.ink) - lum(P.paper));
    assert.ok(diff > 0.4, `warm paper: ink and paper stay apart at τ=${tau} (${diff.toFixed(2)})`);
}
assert.ok(warm(palette(0.5)).paper[2] < palette(0.5).paper[2], 'warm paper is warmer than the reference by day');

// ---------------------------------------------------------------- headlines come from the economy's own feed
{
    const { createEconomy } = await load('zipangu/js/sim.js');
    const eco = createEconomy(W, { seed: 1 });
    const feed = [];
    eco.on('*', m => { if (m && m.message) feed.push(m); });
    eco.step(120);
    assert.ok(feed.length > 10, 'the economy produced a feed');
    const edo = new Set(L.byPlace.get('edo_raiden').districts.map(d => d.id));
    const m = news.pickHeadline(feed, edo);
    assert.ok(m && feed.includes(m), 'the headline is a real line from the feed');
    const h = news.headline(m, 40);
    assert.ok(h.length > 0 && h.length <= 40 && !/\s/.test(h), 'headline trimmed for a sheet');
    assert.ok(String(m.message).replace(/\s+/g, '').replace(/（[^）]*）/g, '').startsWith(h.replace(/…$/, '')), 'headline text is the message itself, not invented');
    const local = feed.slice(-60).filter(x => [x.district, x.from, x.to].some(d => edo.has(d)) && x.type in { event: 1, settle: 1, trade: 1, arrive: 1, depart: 1, encounter: 1, goal: 1 });
    if (local.length) assert.ok([m.district, m.from, m.to].some(d => edo.has(d)), 'a line about the place is preferred');
    assert.equal(news.pickHeadline([], edo), null, 'no feed, no headline');
    assert.equal(news.pickHeadline(feed, edo), m, 'deterministic for the same feed');
}

// ---------------------------------------------------------------- money: the right form for the place and the sim's own amount
assert.equal(news.moneyOf('edo', 10), 'zeni');
assert.equal(news.moneyOf('edo', 5000), 'koban', 'a large sum in Edo is gold');
assert.equal(news.moneyOf('sakura', 100), 'none', '桜の森 asks no price (charter)');
assert.equal(news.moneyOf('ginga', 10), 'ticket');
for (const fam of new Set(L.places.map(p => p.family))) assert.ok(news.MONEY[fam], `${fam} has a form of money`);
assert.equal(news.kanjiNumber(1234), '千二百三十四');
assert.equal(news.kanjiNumber(10), '十');
assert.equal(news.kanjiNumber(20500), '二万五百');
const raidenIds = new Set(L.byPlace.get('edo_raiden').districts.map(d => d.id));
const hotaru = news.currencyFor(W.currencies, raidenIds, W.baseCurrency);
assert.equal(hotaru.id, 'hotarusen', 'Late Edo pays in 蛍銭 (issued there)');
assert.equal(news.amountText(12, hotaru), '二十四蛍銭', 'amount converted with to_base');
assert.equal(news.currencyFor(W.currencies, new Set(['nowhere']), W.baseCurrency).id, W.baseCurrency.id, 'elsewhere: the base currency');
for (const c of ['food', 'material', 'energy', 'knowledge', 'luxury', 'service']) assert.ok(news.goodsOf(c), `goods for ${c}`);
assert.equal(news.goodsOf('service'), 'none', 'a service is paid with a bow and nothing handed back');
// ambient pacing is deterministic and inside its bounds
for (let n = 0; n < 50; n++) { const d = news.ambientDelay(7412, n, 6, 13); assert.ok(d >= 6 && d < 13); assert.equal(d, news.ambientDelay(7412, n, 6, 13)); }

// ---------------------------------------------------------------- companions
const comps = W.agents.map(a => [a.id, companionOf(a)]);
for (const [id, c] of comps) assert.deepEqual(c, companionOf(W.byId.agent.get(id)), `${id}: companion is deterministic`);
assert.equal(companionOf(W.byId.agent.get('kitsune')), null, 'the fox resident has no pet');
assert.equal(companionOf(W.byId.agent.get('yami')), null, 'nor the cat');
assert.equal((companionOf(W.byId.agent.get('nego')) || {}).kind, 'fox', 'NEGO-CHAN: 足元に伊曽保狐');
assert.equal((companionOf(W.byId.agent.get('hakuuchi')) || {}).kind, 'bird', 'HAKUUCHI: 足元に銀杏鳥');
const withPets = comps.filter(([, c]) => c).length;
assert.ok(withPets >= 6 && withPets <= 18, `some residents walk with an animal (${withPets})`);

// ---------------------------------------------------------------- framing: portrait vs landscape
// card sizes as the page lays them out (css px) and the HUD band height
const cards = { '360x640': [344, 541], '390x844': [374, 745], '430x932': [414, 833], '844x390': [820, 347], '768x1024': [744, 894], '1280x800': [1180, 536] };
for (const [name, [cw, ch]] of Object.entries(cards)) {
    const F = frameFor(cw, ch, { hudPx: 82 });
    assert.ok(Math.abs(F.VW * F.ppu - cw) < 1e-6 && Math.abs(F.VH * F.ppu - ch) < 1e-6, `${name}: the viewBox fills the card`);
    assert.ok(F.GY - TALLEST * 0.92 >= F.skyTop - 1, `${name}: the tallest fronts stay under the HUD band`);
    assert.ok(F.GY < F.VH - 40, `${name}: the street and the kerb are inside the card`);
    if (F.portrait) {
        assert.ok((F.VH - F.GY) / F.VH <= 0.2, `${name}: in portrait the earth is a modest band (${((F.VH - F.GY) / F.VH).toFixed(2)})`);
        assert.ok(48 * F.ppu >= 85, `${name}: people are drawn large on a phone (${(48 * F.ppu).toFixed(0)} px)`);
    } else assert.ok(F.GY / F.VH > 0.75, `${name}: in landscape the street runs low with the sky above`);
}
assert.equal(frameFor(374, 745, { hudPx: 82 }).portrait, true);
assert.equal(frameFor(820, 347, { hudPx: 82 }).portrait, false);
assert.deepEqual(frameFor(374, 745), frameFor(374, 745), 'framing is deterministic');

// ---------------------------------------------------------------- water: the height field is stable and settles
{
    const hf = WM.createHeightField(60, { dx: 2, c: 30 });
    hf.poke(40, -30, 3);
    hf.step(1 / 60);
    let e0 = hf.energy(), steps = 0;
    const dts = [1 / 60, 1 / 30, 1 / 144, 0.05, 1 / 60, 0.2, 1 / 90];
    for (let i = 0; i < 4000; i++) {
        hf.step(dts[i % dts.length]);
        const e = hf.energy();
        assert.ok(Number.isFinite(e) && hf.h.every(Number.isFinite), 'no NaN in the field');
        assert.ok(e <= e0 * (1 + 1e-9) + 1e-12, `energy never grows without input (step ${i})`);
        e0 = e; steps++;
    }
    assert.ok(e0 < 1e-6, `the surface settles (${e0})`);
    // a disturbance spreads: a cell away from the poke moves after a while, not before
    const hf2 = WM.createHeightField(80, { dx: 2, c: 30 });
    hf2.poke(20, -30, 2);
    hf2.step(1 / 60);
    const far = () => Math.abs(hf2.h[60]);
    assert.ok(far() < 1e-3, 'not yet at the far cell');
    let reached = 0; for (let i = 0; i < 300; i++) { hf2.step(1 / 60); reached = Math.max(reached, far()); }
    assert.ok(reached > 1e-4, `the wave reaches the far cell (100 units at speed 30) (${reached})`);
    // rings: radius follows the wave speed, amplitude decays
    for (const t of [0, 0.25, 0.5, 1, 2]) { const r = WM.ringAt(t, { speed: 14 }); assert.ok(Math.abs(r.r - 14 * t) < 1e-9); }
    assert.ok(WM.ringAt(2).a < WM.ringAt(1).a && WM.ringAt(1).a < WM.ringAt(0.1).a, 'rings fade as they grow');
    // droplets land where the ballistic formula says
    for (const [y0, vy, ys] of [[0, -40, 0], [-5, -20, 2], [-3, 10, 0]]) {
        const tl = WM.landTime(y0, vy, 160, ys);
        const [, yl] = WM.ballistic(0, y0, 12, vy, 160, tl);
        assert.ok(Math.abs(yl - ys) < 1e-9, 'lands on the surface');
        let x = 0, y = y0, v = vy; const dt = 1 / 2000; let t = 0;
        while (!(y >= ys && v > 0) && t < 5) { v += 160 * dt; x += 12 * dt; y += v * dt; t += dt; }
        assert.ok(Math.abs(t - tl) < 0.01 && Math.abs(x - 12 * tl) < 0.15, 'stepped flight agrees with the formula');
    }
    // pools never exceed their caps
    const pool = WM.createPool(5, () => ({}));
    const got = []; for (let i = 0; i < 12; i++) { const it = pool.acquire(); if (it) got.push(it); }
    assert.equal(got.length, 5); assert.equal(pool.live, 5); assert.equal(pool.acquire(), null);
    pool.release(got[0]); assert.equal(pool.live, 4); assert.ok(pool.acquire());
    // the splash crown is a keyed sequence that ends
    const k0 = WM.crownKeys(0), k5 = WM.crownKeys(0.5), k1 = WM.crownKeys(1);
    assert.ok(k0.tongues.every(t => t.len === 0) && k5.tongues.some(t => t.len > 3) && k1.done, 'crown: rise → open → done');
    // rain: deterministic per day and seed; the rainy season rains more
    const sekkiOf = d => (4 + d) % 24;
    for (const T of [0.1, 3.4, 8.8, 12.05, 20.6]) assert.equal(WM.rainAt(T, sekkiOf, 1), WM.rainAt(T, sekkiOf, 1), 'rain is deterministic');
    const days = n => Array.from({ length: 400 }, (_, d) => WM.showerOf(d, n, 1)).filter(Boolean).length;
    assert.ok(days(9) > days(21) * 2, `夏至 rains more than 冬至 (${days(9)} vs ${days(21)})`);
    let maxR = 0; for (let T = 0; T < 48; T += 0.002) { const r = WM.rainAt(T, sekkiOf, 1); assert.ok(r >= 0 && r <= 1); maxR = Math.max(maxR, r); }
    assert.ok(maxR > 0.3, 'it does rain over two seasons');
    const w = []; for (let T = 0; T < 24; T += 0.01) w.push(WM.wetness(T, sekkiOf, 1));
    assert.ok(w.every(v => v >= 0 && v <= 1) && w.some(v => v > 0.2), 'the street gets wet and dries');
}

// ---------------------------------------------------------------- legible through both ink flips (every 0.002 of a day)
{
    let worst = 99;
    for (let i = 0; i < 500; i++) {
        const tau = i * 0.002, P = legible(warm(palette(tau)));
        const r = contrast(P.ink, P.paper);
        assert.ok(r >= 4.5 - 1e-6, `ink/paper contrast ≥ 4.5:1 at τ=${tau.toFixed(3)} (${r.toFixed(2)})`);
        worst = Math.min(worst, r);
    }
    // the day and night looks themselves are left exactly as they were
    for (const tau of [0.3, 0.5, 0.62, 0.9, 0.95, 0.05]) { const P = warm(palette(tau)); assert.equal(legible(P), P, `τ=${tau} unchanged`); }
}

console.log(`edomae: ${L.places.length} places, ${slots.length} districts on a ring of radius ${Math.round(L.R)}; tauOf, warm contrast, planted feet, ${keys.size} distinct residents, headlines, money, ${withPets} companions, framing and water ok`);
