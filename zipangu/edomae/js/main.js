// 江戸前 Edomae — 万華京ジパング seen from the side, in line art.
//
// The world is a great globe seen edge-on: the street runs over its top, every
// district stands on it as a building in street elevation, and dragging turns the
// globe so the eighteen places come over the horizon one after another. The same
// economy as the explorer (js/sim.js) runs here, read-only: residents walk, trade,
// think and travel through the 時層鳥居, and the 万世時計 drives day and night.
//
// Flags: ?debug (no rAF; window.__step(seconds)) · ?tau=0.5 (pin the palette) ·
//        ?speed=N (economy speed) · ?at=<placeId> (start facing a place)
// Nothing is written to localStorage; the explorer's saves are never touched.

import { loadWorld } from '../../js/data.js';
import { createEconomy } from '../../js/sim.js';
import { el, inkDefs, f, pt, PAPER } from './lib/ink.js';
import { palette, applyPalette, rgb, nightTint, mix, toRGB } from './lib/daynight.js';
const WIN_A = toRGB('#ffd58a'), WIN_B = toRGB('#f0a24e');
import { pointerWind, clamp, lerp, smooth, seeded } from './lib/motion.js';
import { ringLayout, arcDelta, placeShortJa, placeSubJa, districtShortJa, hash01 } from './layout.js';
import { tauOf, kokuOfTau } from './clock.js';
import { buildDistrict, emptyLive } from './buildings.js';
import { torii as makeTorii, SP, oval } from './kit.js';
import { createSky } from './sky.js';
import { createLife } from './life.js';
import { createResidents } from './residents.js';

const q = new URLSearchParams(location.search);
const DEBUG = q.has('debug');
const PIN = q.has('tau') ? ((Number(q.get('tau')) % 1) + 1) % 1 : null;
const SPEED = q.has('speed') ? Math.max(0, Number(q.get('speed')) || 0) : 1;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const START_AT = q.get('at');

const stage = document.getElementById('stage');
const card = document.getElementById('card');
const hud = { koku: document.getElementById('koku'), sekki: document.getElementById('sekki'), place: document.getElementById('place-name'), placeSub: document.getElementById('place-sub'), hint: document.getElementById('hint'), cap: document.getElementById('caption') };

const W = await loadWorld('../world/');
const eco = createEconomy(W, { seed: 1 });
// the city is already busy when you arrive, and it is afternoon, so dusk comes soon
for (let i = 0; i < 600; i++) { const ta = tauOf(eco.clock); if (ta > 0.6 && ta < 0.72) break; eco.step(0.5); }

const layout = ringLayout(W);
const R = layout.R, LEN = layout.total;

// ------------------------------------------------------------------ the svg and its layers
const svg = el('svg', { role: 'img', 'aria-label': '万華京ジパングを横から見た線画の地球。江戸の町並みと住人の暮らしが、昼と夜で移ろう。 / The world of Kaleidoscope Zipangu drawn in line, seen from the side.' });
stage.appendChild(svg);
const ink = inkDefs(svg, 'e');
const defs = ink.defs;
const filterEl = defs.querySelector('filter');
filterEl.setAttribute('filterUnits', 'userSpaceOnUse');
const grad = (id, stops, radial = true, attrs = {}) => { const g = el(radial ? 'radialGradient' : 'linearGradient', { id, ...attrs }, defs); stops.forEach(([o, c, a]) => el('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, g)); };
grad('e-warmglow', [[0, '#ffd58a', 0.75], [0.45, '#ffb85c', 0.28], [1, '#ffb85c', 0]]);
grad('e-coolglow', [[0, '#bff4ff', 0.8], [0.5, '#7fd8ff', 0.25], [1, '#7fd8ff', 0]]);
grad('e-blueglow', [[0, '#9fb8ff', 0.8], [1, '#5f7fff', 0]]);
grad('e-fireflyglow', [[0, '#f6ffb0', 0.9], [1, '#d8ff6a', 0]]);
grad('e-gateglow', [[0, '#fff1c9', 0.55], [0.6, '#ffd9a0', 0.18], [1, '#ffd9a0', 0]]);
grad('e-sunglow', [[0, '#ffd9a0', 0.55], [1, '#ffd9a0', 0]]);
grad('e-sunglow2', [[0, '#ffe7a8', 0.5], [1, '#ffe7a8', 0]]);
grad('e-moonglow', [[0, '#e9e4ff', 0.35], [1, '#e9e4ff', 0]]);
grad('e-cone', [[0, '#fff1c2', 0.5], [1, '#fff1c2', 0]], false, { x1: 0, y1: 0, x2: 0, y2: 1 });

const skyL = el('g', {}, svg);
const scene = el('g', { filter: ink.filter }, svg);
const worldG = el('g', {}, scene);
const glowL = el('g', { class: 'glow' }, svg);
const glowWorld = el('g', {}, glowL);
const sky = createSky(skyL, el('g', {}, glowL), defs);

// the globe: a paper disc, the building line, the kerb, faint strata in the earth
const globe = el('g', {}, worldG);
el('circle', { r: f(R - 21), fill: PAPER, stroke: 'currentColor', 'stroke-width': SP }, globe);
el('circle', { r: f(R - 24), fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.55 }, globe);
el('circle', { r: f(R), fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.8 }, globe);
for (const [dr, w, dash] of [[70, 0.45, '2 7'], [130, 0.4, '1 9'], [210, 0.35, '3 14']]) el('circle', { r: f(R - dr), fill: 'none', stroke: 'currentColor', 'stroke-width': SP * w, 'stroke-dasharray': dash, opacity: 0.5 }, globe);
const ringG = el('g', {}, worldG);
const placesL = el('g', {}, ringG);
const walkersL = el('g', {}, ringG);
const lifeL = el('g', {}, ringG);
const glowRing = el('g', {}, glowWorld);
const placeGlowL = el('g', {}, glowRing);
const walkerGlowL = el('g', {}, glowRing);

// ------------------------------------------------------------------ places and their buildings
const places = [];
const toriiByPlace = new Map();
for (const entry of layout.places) {
    const deg = (entry.s0 / R) * 57.29578;
    const pg = el('g', { transform: `rotate(${f(deg)})`, 'data-place': entry.id }, placesL);
    const pgl = el('g', { transform: `rotate(${f(deg)})` }, placeGlowL);
    const lg = el('g', { transform: `rotate(${f(deg)})` }, lifeL);
    const live = emptyLive();
    const rnd = seeded(Math.floor(hash01(entry.id, 'place') * 2147483646) + 1);
    const at = u => `rotate(${f((u / R) * 57.29578)}) translate(0 ${f(-R)})`;
    groundFor(pg, entry, rnd);
    const waterSpans = [], blossoms = [], fireflies = [];
    for (const d of entry.districts) {
        const u = d.s - entry.s0;
        const g = el('g', { transform: at(u), 'data-district': d.id }, pg);
        const gl = el('g', { transform: at(u) }, pgl);
        const before = { waters: live.waters.length, blossoms: live.blossoms.length, fireflies: live.fireflies.length };
        const drnd = seeded(d.seed);
        buildDistrict(d, { g, gl, rnd: drnd, pick: arr => arr[Math.floor(drnd() * arr.length)], live, W });
        if (live.waters.length > before.waters) waterSpans.push([d.x0 - entry.s0, d.x1 - entry.s0]);
        // building space → place space (for petals and fireflies)
        const a = u / R, c = Math.cos(a), s = Math.sin(a);
        for (const [bx, by] of live.blossoms.slice(before.blossoms)) blossoms.push([bx * c - (by - R) * s, bx * s + (by - R) * c]);
        for (const fz of live.fireflies.slice(before.fireflies)) fireflies.push({ ...fz, base: u });
    }
    const tu = entry.torii - entry.s0;
    const tg = el('g', { transform: `${at(tu)} translate(0 3)` }, pg);
    const tgl = el('g', { transform: `${at(tu)} translate(0 3)` }, pgl);
    const gate = makeTorii(tg, tgl, rnd, { colour: entry.family === 'ginga' ? '#2f5bd3' : entry.family === 'ryugu' ? '#ee6a5a' : '#b3412d' });
    toriiByPlace.set(entry.id, gate);
    const life = createLife(lg, pgl, entry, W, R, { seed: Math.floor(hash01(entry.id, 'life') * 1e6) + 1, waterSpans, blossoms, fireflies });
    const tints = [...pg.querySelectorAll('[data-tint]')].map(n => [n, n.getAttribute('data-tint')]);
    places.push({ entry, g: pg, gl: pgl, lg, live, life, gate, tints, lastInk: -1, shown: true, pinkT: -1 });
}

// street paving and a little of each place's ground, so the globe visibly turns
function groundFor(pg, entry, rnd) {
    const ticks = [], under = [];
    const span = entry.s1 - entry.s0;
    const ringPt = (u, r) => { const a = u / R; return [Math.sin(a) * r, -Math.cos(a) * r]; };
    const step = entry.family === 'ginga' ? 7 : entry.family === 'meiji' || entry.family === 'reiwa' ? 11 : 17;
    for (let u = 4; u < span; u += step + rnd(-1, 1)) {
        const a = ringPt(u, R - 20.6), b = ringPt(u - 0.6, R - 23.4);
        ticks.push(`M${pt(a)} L${pt(b)}`);
    }
    if (entry.family === 'ginga') {
        for (const r of [R - 12, R - 15]) { const a = ringPt(0, r), b = ringPt(span / 2, r), c = ringPt(span, r); under.push(`M${pt(a)} A${f(r)} ${f(r)} 0 0 1 ${pt(c)}`); }
    }
    for (let i = 0; i < Math.round(span / 70); i++) {
        const u = rnd(10, span - 10), r = R - rnd(40, 200), [x, y] = ringPt(u, r), w = rnd(2, 6);
        under.push(i % 3 ? oval(x, y, w, w * 0.6) : `M${f(x - w)} ${f(y)} q${f(w)} ${f(-w * 0.6)} ${f(w * 2)} 0`);
    }
    const p1 = el('path', { d: ticks.join(' '), fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.5 }, pg);
    const p2 = el('path', { d: under.join(' '), fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.45, opacity: 0.55 }, pg);
    return [p1, p2];
}

// ------------------------------------------------------------------ residents
let selected = null;
const residents = createResidents({
    layer: walkersL, glowLayer: walkerGlowL, layout, W, eco, toriiOf: id => toriiByPlace.get(id), passerPlaces: ['edo_sangaku', 'edo_raiden'],
    onTap: r => { residents.greet(r); showResident(r); }
});
eco.on('depart', m => residents.depart(m));
eco.on('arrive', m => residents.arrive(m));
eco.on('trade', m => residents.trade(m));
for (const p of places) for (const c of p.life.critters) c.g.addEventListener('pointerup', e => { if (!e.__dragged) showCreature(c.c); });

// ------------------------------------------------------------------ view: rotation, drag, inertia
const startPlace = layout.byPlace.get(START_AT) || layout.byPlace.get('edo_sangaku');
let view = START_AT && layout.byPlace.get(START_AT) ? startPlace.mid : (startPlace.s1 - 60);
let vel = 0, VW = 960, VH = 540, GY = 400, ppu = 1, half = 600;
const drag = { id: null, x: 0, lastX: 0, lastT: 0, moved: false, v: 0 };
const wind = pointerWind(svg, 0.25);

function resize() {
    const r = stage.getBoundingClientRect();
    const cw = Math.max(200, r.width), ch = Math.max(160, r.height);
    ppu = clamp(cw / 640, 1.04, 1.9);
    VW = cw / ppu; VH = ch / ppu;
    GY = VH - clamp(VH * 0.18, 58, 170);
    svg.setAttribute('viewBox', `0 0 ${f(VW)} ${f(VH)}`);
    worldG.setAttribute('transform', `translate(${f(VW / 2)} ${f(GY + R)})`);
    glowWorld.setAttribute('transform', `translate(${f(VW / 2)} ${f(GY + R)})`);
    // the wobble only where there is ink to wobble: from above the tallest roofs down (not the empty sky)
    const fy0 = Math.max(0, GY - 330), fy1 = VH;
    for (const [k, v] of [['x', 0], ['y', fy0], ['width', VW], ['height', fy1 - fy0]]) filterEl.setAttribute(k, f(v));
    sky.resize(VW, VH, GY);
    half = Math.asin(Math.min(1, (VW / 2 + 90) / R)) * R + 60;
    render();
}

svg.addEventListener('pointerdown', e => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    drag.id = e.pointerId; drag.x = drag.lastX = e.clientX; drag.lastT = performance.now(); drag.moved = false; drag.v = 0; vel = 0;
});
svg.addEventListener('pointermove', e => {
    if (drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.lastX, now = performance.now();
    if (!drag.moved && Math.abs(e.clientX - drag.x) > 6) { drag.moved = true; svg.setPointerCapture(e.pointerId); card.classList.add('dragging'); hint(false); }
    if (drag.moved) {
        const du = dx / ppu;
        view -= du;
        drag.v = lerp(drag.v, -du / Math.max(0.008, (now - drag.lastT) / 1000), 0.4);
        render();
    }
    drag.lastX = e.clientX; drag.lastT = now;
});
// a capturing listener marks a drag's pointerup so taps on residents and signboards ignore it
svg.addEventListener('pointerup', e => { if (drag.id === e.pointerId && drag.moved) e.__dragged = true; }, true);
const endDrag = e => {
    if (drag.id !== e.pointerId) return;
    if (drag.moved) { vel = reduce ? 0 : clamp(drag.v, -2400, 2400); drag.wasDrag = true; setTimeout(() => { drag.wasDrag = false; }, 0); }
    else if (!e.target.closest || !e.target.closest('.resident, .critter, .sign')) hideCaption();
    drag.id = null; card.classList.remove('dragging');
};
svg.addEventListener('pointerup', endDrag);
svg.addEventListener('pointercancel', endDrag);
svg.addEventListener('click', e => { if (drag.wasDrag) { e.preventDefault(); e.stopPropagation(); } }, true);
svg.addEventListener('wheel', e => {
    e.preventDefault();
    view += (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / ppu * 0.8;
    hint(false); render();
}, { passive: false });
card.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const k = e.key === 'ArrowLeft' ? -1 : 1;
        if (reduce) { view += k * VW * 0.3; render(); } else vel = k * Math.max(Math.abs(vel), 520) * (Math.sign(vel) === k ? 1.15 : 1);
        hint(false);
    }
});

// ------------------------------------------------------------------ captions inside the card
function showResident(r) {
    selected = r;
    const a = r.a, d = W.byId.district.get(a.at || r.district || a.home);
    const pl = d ? W.byId.place.get(d.home) : null;
    const where = a.at ? `${districtShortJa(d)}・${placeShortJa(pl)}` : a.target ? `${districtShortJa(W.byId.district.get(a.target))}へ移動中` : '';
    fillCaption(r.def.name || r.def.name_ja, a.activity || '', where, `../#/agent/${r.id}`, '住人のページへ →');
}
function showCreature(c) {
    selected = null;
    const homes = (c.home || []).map(id => districtShortJa(W.byId.district.get(id))).filter(Boolean).slice(0, 2).join('・');
    fillCaption((c.name_ja || '').replace(/（[^）]*）/g, ''), c.name_en || '', homes, `../#/creature/${c.id}`, '図鑑で見る →');
}
function fillCaption(title, line, where, href, label) {
    const cap = hud.cap;
    cap.querySelector('b').textContent = title;
    cap.querySelector('.cap-line').textContent = line;
    cap.querySelector('.cap-where').textContent = where;
    const a = cap.querySelector('a'); a.href = href; a.textContent = label;
    cap.hidden = false;
}
function hideCaption() { hud.cap.hidden = true; selected = null; }
hud.cap.querySelector('button').addEventListener('click', hideCaption);

let hintOn = true;
function hint(on) { if (hintOn && !on) { hintOn = false; hud.hint.classList.add('gone'); } }
setTimeout(() => hint(false), 14000);

// ------------------------------------------------------------------ the frame
let T = 0, P = palette(PIN ?? tauOf(eco.clock)), tau = 0;
const sinceDuskOf = x => (x - 0.75 + 1) % 1;
let lastLabel = '', lastPlace = '';

function drawPlace(pl, t, dt) {
    const L = pl.live;
    if (Math.abs(P.inkT - pl.lastInk) > 0.01) { pl.lastInk = P.inkT; for (const [n, c] of pl.tints) n.setAttribute('fill', nightTint(c, P)); }
    const sd = sinceDuskOf(tau);
    const ginga = pl.entry.family === 'ginga';
    for (const w of L.windows) {
        let lit = smooth(w.thr, w.thr + 0.25, P.lamp);
        if (w.lateOff < 9 && sd > w.lateOff - 0.75 && sd < 0.5) lit = 0;
        if (ginga) lit = Math.max(lit, P.night * 0.9);
        if (Math.abs(lit - w.lit) > 0.002) {
            w.lit = lerp(w.lit, lit, DEBUG || reduce ? 1 : 0.08);
            w.n.style.fill = rgb(mix(P.paper, mix(WIN_A, WIN_B, w.warmth), w.lit * 0.92));
            w.glow.setAttribute('opacity', f(w.lit * 0.8));
        }
    }
    for (const n of L.norens) n.draw(t, dt, wind.value, tau, P);
    for (const l of L.lanterns) l.draw(t, dt, wind.value, P);
    for (const l of L.lamps) l.draw(t, dt, wind.value, P, ginga ? 0.3 + 0.7 * Math.max(P.night, smooth(0.3, 0.6, P.lamp)) : 1);
    for (const s of L.smokes) s.draw(t, dt, wind.value, P, 1);
    for (const w of L.waters) w.draw(t, dt, wind.value, P);
    for (const b of L.banners) b.draw(t, dt, wind.value);
    for (const d of L.dials) d.draw(clockNow());
    for (const s of L.sitters) s.draw(t, dt, P);
    for (const s of L.swing) { const p = s.p; p.v += (-p.a * s.k + wind.value * 0.7 + Math.sin(t * 1.1 + p.ph) * 0.15 - p.v * 1.4) * dt; p.a += p.v * dt; s.grp.setAttribute('transform', `translate(${f(s.x)} ${f(s.y)}) rotate(${f(-p.a * 57.3)})`); }
    for (const j of L.jars) { const o = (0.3 + 0.7 * smooth(0.2, 0.5, P.lamp)) * (0.8 + 0.2 * Math.sin(t * 9 + j.ph) * Math.sin(t * 3.7 + j.ph)); j.glow.setAttribute('opacity', f(o)); j.n.setAttribute('fill', rgb(P.paper.map((v, i) => lerp(v, [191, 244, 255][i], o * 0.7)))); }
    for (const m of L.mirrors) m.glow.setAttribute('opacity', f((1 - P.lamp) * 0.45 + P.sunset * 0.4));
    for (const p of L.pendulums) { const a = Math.sin(t * Math.PI) * 0.22; const x = p.x + Math.sin(a) * p.len, y = p.y + Math.cos(a) * p.len; p.pend.setAttribute('d', `M${f(p.x)} ${f(p.y)} L${f(x)} ${f(y)}`); p.bob.setAttribute('d', oval(x, y, p.w, p.w)); }
    for (const s of L.spinners) { s.a += (s.speed || 2.2) * (1 + Math.abs(wind.value)) * dt; s.g.setAttribute('transform', `translate(${f(s.x)} ${f(s.y)}) rotate(${f(s.a * 57.3)})`); }
    for (const s of L.signals) { const o = 0.2 + 0.8 * Math.max(P.night, smooth(0.3, 0.6, P.lamp)); s.glow.setAttribute('opacity', f(o)); }
    for (const n of L.neon) n.n.setAttribute('opacity', f(0.55 + 0.45 * smooth(0.2, 0.5, P.lamp) * (Math.sin(t * 13 + n.ph) > -0.95 ? 1 : 0.3)));
    pl.gate.draw(t, dt, P);
    pl.life.draw(t, dt, wind.value, P);
}

const clockNow = () => (PIN === null ? eco.clock : { koku: kokuIndex(PIN), phase: 0 });
function kokuIndex(x) { return x >= 0.25 && x < 0.75 ? Math.min(5, Math.floor((x - 0.25) / 0.5 * 6)) : 6 + Math.min(5, Math.floor(((x - 0.75 + 1) % 1) / 0.5 * 6)); }

function frame(t, dt, stepSim = true) {
    T = t;
    if (stepSim && SPEED > 0 && !reduce) eco.step(dt * SPEED);
    if (!drag.moved && Math.abs(vel) > 1) { view += vel * dt; vel *= Math.exp(-2.6 * dt); if (Math.abs(vel) < 4) vel = 0; }
    view = ((view % LEN) + LEN) % LEN;
    tau = PIN ?? tauOf(eco.clock);
    P = palette(tau);
    applyPalette(svg, P);
    card.style.setProperty('--ink', rgb(P.ink));
    card.style.setProperty('--paper', rgb(P.paper));
    wind.step(t);
    const deg = -(view / R) * 57.29578;
    ringG.setAttribute('transform', `rotate(${f(deg)})`);
    glowRing.setAttribute('transform', `rotate(${f(deg)})`);
    sky.draw(tau, t, dt, P, wind.value, P.night);
    let best = null, bestD = Infinity;
    for (const pl of places) {
        const e = pl.entry;
        const d0 = arcDelta(view, e.s0, LEN), d1 = arcDelta(view, e.s1, LEN);
        const vis = !(d0 > half || d1 < -half) || (d0 > d1);
        const show = vis && Math.min(Math.abs(d0), Math.abs(d1), Math.abs(arcDelta(view, e.mid, LEN))) < (e.s1 - e.s0) + half;
        if (pl.shown !== show) { pl.shown = show; const v = show ? '' : 'none'; pl.g.style.display = v; pl.gl.style.display = v; pl.lg.style.display = v; }
        if (show) drawPlace(pl, t, dt);
        const dm = Math.abs(arcDelta(view, e.mid, LEN));
        if (dm < bestD) { bestD = dm; best = pl; }
    }
    residents.update(t, dt, P, wind.value, { s: view, half });
    // the name of the place at the top, in faint ink
    if (best) {
        const span = (best.entry.s1 - best.entry.s0) / 2;
        const o = clamp(1 - bestD / span, 0, 1);
        if (lastPlace !== best.entry.id) { lastPlace = best.entry.id; hud.place.textContent = placeShortJa(best.entry.place); hud.placeSub.textContent = [placeSubJa(best.entry.place), (best.entry.place.name_en || '').split(' — ')[0]].filter(Boolean).join(' · '); }
        hud.place.parentElement.style.opacity = f(0.18 + 0.4 * o);
    }
    const label = PIN === null ? eco.clock.label : kokuOfTau(PIN);
    const sk = `${eco.clock.sekki || ''}`;
    if (label + sk !== lastLabel) { lastLabel = label + sk; hud.koku.textContent = label; hud.sekki.textContent = sk; }
    if (selected && selected.visible === false && selected.mode === 'gone') { /* caption stays; the resident is travelling */ }
}

let fps = { n: 0, since: performance.now(), value: 0 };
function render() { if (reduce || DEBUG) frame(T, 0, false); }

const api = {
    W, eco, layout, residents, places, sky,
    get view() { return view; }, set view(v) { view = v; render(); },
    get tau() { return tau; },
    get fps() { return fps.value; },
    face(id) { const p = layout.byPlace.get(id); if (p) { view = p.mid; vel = 0; render(); } return view; },
    walkTo(id) { return residents.byId.get(id); },
    resize
};
window.__edomae = api;

resize();
new ResizeObserver(() => resize()).observe(stage);

if (DEBUG) {
    let t = 0;
    frame(t, 1 / 60);
    window.__step = (s = 1) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) frame((t += 1 / 60), 1 / 60); return t; };
} else if (reduce) {
    frame(0, 1 / 60, false);
} else {
    let prev = performance.now();
    const tick = now => {
        const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
        fps.n++;
        if (now - fps.since > 1000) { fps.value = fps.n * 1000 / (now - fps.since); fps.n = 0; fps.since = now; }
        if (!document.hidden) frame(now / 1000, dt);
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}
document.documentElement.classList.add('ready');
