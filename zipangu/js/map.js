// The kaleidoscope map. Eras are stained-glass shards around the hub, realms are
// gems set around the rim, trade routes are threads of light in the manner of
// their vehicle, agents are luminous chips and creatures drift over their homes.
// Everything is drawn on one Canvas 2D in a single rAF loop.

import { drawCreature } from './creature-art.js';
import { VIA } from './sim.js';
import { agentSprite, SPRITE_PAD } from './agent-art.js';
import { creaturePresence } from './creature-presence.js';
import { visualOf } from './visual-manifest.js';
import { drawVisualCreature, drawVisualAgent } from './visual-canvas.js';
import {
    hash01, clamp, lerp, smooth, rgba, mixHex, accentOf, deepOf, lightOf,
    placeShort, placeSub, districtShort, agentShort, RARITY_RANK
} from './util.js';

const TAU = Math.PI * 2;
const SERIF = '"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","IPAexMincho",serif';
const IRIS = ['#2ee6d6', '#8b5cf6', '#ff4fa3', '#e8c36a'];   // structural colour: teal → violet → magenta → gold
const LAMP = '#f2c86b';
const VERMILION = '#e2532d';
const MIN_ZOOM = 0.7, MAX_ZOOM = 9;

// Decoration that needs "random" numbers every frame reads this table instead
// of hashing strings sixty times a second.
const NOISE = Array.from({ length: 512 }, (_, i) => hash01('noise', i));
const nz = (seed, i, salt = 0) => NOISE[(seed + i * 37 + salt * 101) & 511];
const seedOf = id => Math.floor(hash01(id, 'seed') * 512);

// Colour strings used again and again every frame.
const SHEEN_STOPS = [[0, rgba(IRIS[0], 0)], [0.25, rgba(IRIS[0], 0.13)], [0.45, rgba(IRIS[1], 0.15)], [0.65, rgba(IRIS[2], 0.13)], [0.85, rgba(IRIS[3], 0.12)], [1, rgba(IRIS[3], 0)]];
const LEAD = rgba(LAMP, 0.42);
const RIM_OUTER = rgba(LAMP, 0.55), RIM_INNER = rgba(LAMP, 0.22);

// ---------------------------------------------------------------- geometry

function clipHalf(poly, nx, ny, c) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
        if (da <= 0) out.push(a);
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
            const t = da / (da - db);
            out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
    }
    return out;
}

function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}

function centroid(poly) {
    let x = 0, y = 0;
    for (const p of poly) { x += p[0]; y += p[1]; }
    return [x / poly.length, y / poly.length];
}

// One stained-glass cell per era: the Voronoi cell of its position inside the
// rim, pulled in a little so that a dark lead line shows between neighbours.
function shardPolygon(site, others, hub, rim, gap) {
    const steps = 72;
    let poly = [];
    for (let i = 0; i < steps; i++) {
        const a = (i / steps) * TAU;
        poly.push([hub.x + Math.cos(a) * (rim - gap), hub.y + Math.sin(a) * (rim - gap)]);
    }
    for (const o of others) {
        const dx = o.x - site.x, dy = o.y - site.y, len = Math.hypot(dx, dy);
        if (len < 1e-6) continue;
        const nx = dx / len, ny = dy / len;
        const mx = (site.x + o.x) / 2, my = (site.y + o.y) / 2;
        poly = clipHalf(poly, nx, ny, nx * mx + ny * my - gap);
        if (poly.length < 3) break;
    }
    return poly;
}

// A route's light thread is a cubic curve sampled once; `at(u)` walks it by arc length.
function buildCurve(route, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    let c1, c2;
    if (route.via === 'kumoito') {            // a silver thread hangs straight down, then lands
        const my = (a.y + b.y) / 2;
        c1 = [a.x, my]; c2 = [b.x, my];
    } else if (route.via === 'oshie') {       // a picture-crossing is a straight cut
        c1 = [a.x + dx / 3, a.y + dy / 3]; c2 = [a.x + (2 * dx) / 3, a.y + (2 * dy) / 3];
    } else {
        const bend = (hash01(route.id, 'bend') - 0.5) * 0.46 * len;
        const px = -dy / len * bend, py = dx / len * bend;
        c1 = [a.x + dx / 3 + px, a.y + dy / 3 + py]; c2 = [a.x + (2 * dx) / 3 + px, a.y + (2 * dy) / 3 + py];
    }
    const n = 56, pts = [], cum = [0];
    for (let i = 0; i <= n; i++) {
        const t = i / n, m = 1 - t;
        pts.push([
            m * m * m * a.x + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * b.x,
            m * m * m * a.y + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * b.y
        ]);
        if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = cum[n] || 1;
    return {
        pts, cum, total,
        at(u) {
            const d = clamp(u, 0, 1) * total;
            let lo = 0, hi = n;
            while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid; }
            const seg = cum[hi] - cum[lo] || 1, f = (d - cum[lo]) / seg;
            return [lerp(pts[lo][0], pts[hi][0], f), lerp(pts[lo][1], pts[hi][1], f), pts[hi][0] - pts[lo][0], pts[hi][1] - pts[lo][1]];
        }
    };
}

// ---------------------------------------------------------------- scene (built once from the world)

// What a realm feels like is read from its own name, not from an id list.
const REALM_FX = [
    ['stars', /銀河|星|天の川|galax|milky/i],
    ['petals', /桜|花|sakura|blossom/i],
    ['waves', /竜宮|蓬莱|海|ryugu|sea/i],
    ['moon', /月|moon|lunar/i],
    ['mist', /遠野|霧|河童|座敷|tono|mist/i],
    ['dew', /天守|城|白露|castle|tower/i],
    ['dream', /夢|dream/i],
    ['wheat', /イーハトーヴ|賢治|農|畑|ihatov|wheat/i]
];
const FX_FALLBACK = REALM_FX.map(f => f[0]);

function realmMotif(r) {
    const hay = [r.name_ja, r.name_en, r.source && r.source.work].join(' ');
    for (const [fx, re] of REALM_FX) if (re.test(hay)) return fx;
    return FX_FALLBACK[Math.floor(hash01(r.id, 'fx') * FX_FALLBACK.length)];
}

function placeInfo(p, isEra) {
    const pal = (p.aesthetic && p.aesthetic.palette) || [];
    const accent = accentOf(pal);
    return {
        raw: p, id: p.id, isEra, order: p.order || 0,
        x: p.map ? p.map.x : 50, y: p.map ? p.map.y : 50,
        pal, accent, deep: mixHex(deepOf(pal), '#1a2268', 0.55), light: lightOf(pal),
        name: placeShort(p), sub: placeSub(p),
        phase: hash01(p.id, 'phase') * TAU,
        seed: seedOf(p.id)
    };
}

export function buildScene(W) {
    const hubD = W.byId.district.get(W.world.hub && W.world.hub.id);
    const hub = hubD && hubD.map ? { x: hubD.map.x, y: hubD.map.y, id: hubD.id, d: hubD } : { x: 50, y: 50, id: null, d: null };

    const eras = W.eras.map(p => placeInfo(p, true)).sort((a, b) => a.order - b.order);
    const realms = W.realms.map(p => ({ ...placeInfo(p, false), fx: realmMotif(p) }));
    const placeById = new Map([...eras, ...realms].map(p => [p.id, p]));

    const maxEra = eras.reduce((m, e) => Math.max(m, Math.hypot(e.x - hub.x, e.y - hub.y)), 24);
    const rim = Math.max(30, maxEra + 3);
    for (const e of eras) {
        e.poly = shardPolygon(e, eras.filter(o => o !== e), hub, rim, 0.55);
        e.centre = centroid(e.poly);
        e.angle = Math.atan2(e.y - hub.y, e.x - hub.x);
        e.reach = e.poly.reduce((m, p) => Math.max(m, Math.hypot(p[0] - e.x, p[1] - e.y)), 1);
    }

    const districts = W.districts.filter(d => d.map).map(d => {
        const place = placeById.get(d.home) || null;
        return {
            raw: d, id: d.id, x: d.map.x, y: d.map.y, place,
            accent: place ? place.accent : LAMP, name: districtShort(d),
            isHub: d.id === hub.id, phase: hash01(d.id, 'lamp') * TAU,
            fillStr: rgba(mixHex(place ? place.accent : LAMP, '#10154a', 0.45), 0.96),
            strokeStr: rgba(mixHex(place ? place.accent : LAMP, '#ffffff', 0.35), 0.98)
        };
    });
    const districtById = new Map(districts.map(d => [d.id, d]));

    const routes = [];
    const routeByPair = new Map();
    for (const r of (W.world.trade_routes || [])) {
        const a = districtById.get(r.from), b = districtById.get(r.to);
        if (!a || !b) continue;
        const rt = { raw: r, id: r.id, via: r.via, from: a, to: b, curve: buildCurve(r, a, b), phase: hash01(r.id, 'ph'), seed: seedOf(r.id), flickSlot: -1, flicks: [] };
        routes.push(rt);
        routeByPair.set(r.from + '>' + r.to, rt);
        routeByPair.set(r.to + '>' + r.from, rt);
    }

    // Creatures drift near their home districts; neighbouring homes only, so a
    // creature never streaks across the whole world.
    const critters = [];
    for (const c of W.creatures) {
        const homes = (c.home || []).map(id => districtById.get(id)).filter(Boolean);
        if (!homes.length) continue;
        const near = homes.filter(h => Math.hypot(h.x - homes[0].x, h.y - homes[0].y) < 28).slice(0, 3);
        const mv = (c.behavior && c.behavior.movement) || 'drift';
        critters.push({
            c, homes: near, mv,
            ph: hash01(c.id, 'ph') * TAU, ph2: hash01(c.id, 'ph2') * TAU, ph3: hash01(c.id, 'ph3'),
            cycle: 70 + hash01(c.id, 'cyc') * 70,
            prio: (c.kind === 'butterfly' ? 6 : 0) + (RARITY_RANK[c.rarity] || 1) + hash01(c.id, 'p') * 2,
            activity: (c.behavior && c.behavior.activity) || 'always',
            scale: clamp((c.visual && c.visual.scale) || 1, 0.5, 3)
        });
    }
    const firefly = critters.find(k => k.c.id === 'rai_botaru');
    if (firefly) {
        const allHomes = firefly.c.home.map(id => districtById.get(id)).filter(Boolean);
        firefly.homes = [allHomes[0]];
        for (const home of allHomes.slice(1)) critters.push({ ...firefly, homes: [home], ph: hash01(home.id, 'firefly') * TAU });
    }
    critters.sort((a, b) => b.prio - a.prio);

    // The jewel butterfly that never leaves the hub: the most iridescent one.
    const jewel = critters.filter(k => k.c.kind === 'butterfly')
        .sort((a, b) => ((b.c.visual && b.c.visual.iridescence) || 0) - ((a.c.visual && a.c.visual.iridescence) || 0))[0] || null;

    return { hub, eras, realms, places: [...eras, ...realms], placeById, districts, districtById, routes, routeByPair, critters, jewel, rim };
}

// ---------------------------------------------------------------- the map

export function createMap(canvas, W, economy, opts = {}) {
    const { onSelect, onHover, getInsets, view } = opts;
    const scene = buildScene(W);
    const ctx = canvas.getContext('2d');
    const reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const V = { cx: scene.hub.x, cy: scene.hub.y, zoom: 1, ...(view || {}) };

    let cw = 0, ch = 0, dpr = 1, base = 1, S = 1, ox = 0, oy = 0;
    let raf = 0, last = 0, running = true, destroyed = false;
    let selected = null, hovered = null, pointer = null;
    let night = economy.clock.isNight ? 1 : 0;
    let tween = null, fling = { x: 0, y: 0 };
    let hits = [];
    let reveal = null;       // a selection that should be panned into the free part of the map
    const smoothAgents = new Map();
    const stats = { frameMs: 0, fps: 0, creatures: 0, frames: 0 };
    let artPaused = reduce.matches, pauseTime = 0, frozenAgents = null, frozenClock = null;
    function pauseArtwork(paused) {
        frozenClock = paused ? { ...economy.clock } : null;
        artPaused = paused; pauseTime = performance.now() / 1000;
        frozenAgents = paused ? new Map([...economy.agents].map(([id, a]) => [id, { ...a, trip: a.trip ? { ...a.trip } : null }])) : null;
    }
    if (artPaused) pauseArtwork(true);
    const pointers = new Map();
    let gesture = null, tapStart = null, lastTap = { t: 0, x: 0, y: 0 };

    const insets = () => Object.assign({ top: 0, right: 0, bottom: 0, left: 0 }, getInsets ? getInsets() : null);
    const sx = x => ox + (x - V.cx) * S;
    const sy = y => oy + (y - V.cy) * S;
    const wx = px => (px - ox) / S + V.cx;
    const wy = py => (py - oy) / S + V.cy;
    const mobile = () => Math.min(cw, ch) < 640;

    // ------------------------------------------------ sizing and view

    function resize() {
        const rect = canvas.getBoundingClientRect();
        dpr = Math.min(2, window.devicePixelRatio || 1);
        cw = Math.max(1, Math.round(rect.width));
        ch = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        stepInsets(0, true);
        layout();
    }

    // Insets glide, so opening the info sheet slides the map instead of snapping it.
    let insNow = null;
    function stepInsets(dt, snap) {
        const target = insets();
        if (!insNow || snap) { insNow = { ...target }; return; }
        const k = 1 - Math.exp(-dt * 9);
        for (const key of Object.keys(target)) insNow[key] += (target[key] - insNow[key]) * k;
    }

    function layout() {
        const ins = insNow || insets();
        const aw = Math.max(80, cw - ins.left - ins.right), ah = Math.max(80, ch - ins.top - ins.bottom);
        base = Math.min(aw, ah) / 106;
        S = base * V.zoom;
        ox = ins.left + aw / 2;
        oy = ins.top + ah / 2;
    }

    function setZoomAt(px, py, zoom) {
        const wxp = wx(px), wyp = wy(py);
        V.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
        layout();
        V.cx = wxp - (px - ox) / S;
        V.cy = wyp - (py - oy) / S;
        clampView();
    }

    function clampView() {
        V.cx = clamp(V.cx, -15, 115);
        V.cy = clamp(V.cy, -15, 115);
    }

    function focusOn(x, y, zoom) {
        tween = { from: { cx: V.cx, cy: V.cy, zoom: V.zoom }, to: { cx: x, cy: y, zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) }, t0: performance.now(), dur: reduce.matches ? 1 : 750 };
    }

    // After the info sheet opens, bring the chosen agent or district into the part of the map the sheet leaves free.
    function revealSelected() {
        const target = insets();
        if (Math.abs(insNow.bottom - target.bottom) > 3 || Math.abs(insNow.top - target.top) > 3 || Math.abs(insNow.right - target.right) > 3) return;
        const sel = reveal; reveal = null;
        let pos = null;
        if (sel.type === 'agent') pos = smoothAgents.get(sel.id);
        else if (sel.type === 'district') pos = scene.districtById.get(sel.id);
        if (!pos) return;
        const x = sx(pos.x), y = sy(pos.y), m = 36;
        const ins = insNow;
        // slide the map only as far as it takes to put the selection inside the free area
        const dx = x < ins.left + m ? ins.left + m - x : x > cw - ins.right - m ? cw - ins.right - m - x : 0;
        const dy = y < ins.top + m ? ins.top + m - y : y > ch - ins.bottom - m ? ch - ins.bottom - m - y : 0;
        if (dx || dy) focusOn(clamp(V.cx - dx / S, -15, 115), clamp(V.cy - dy / S, -15, 115), V.zoom);
    }

    function locate(id) {
        const p = scene.placeById.get(id);
        if (p) return { x: p.x, y: p.y, zoom: p.isEra ? 2.4 : 3 };
        const d = scene.districtById.get(id);
        if (d) return { x: d.x, y: d.y, zoom: 4 };
        const a = economy.agents.get(id);
        if (a) return { x: a.x, y: a.y, zoom: 4 };
        const k = scene.critters.find(c => c.c.id === id);
        if (k) { const q = critterPos(k, performance.now() / 1000); return { x: q[0], y: q[1], zoom: 4 }; }
        return null;
    }

    // ------------------------------------------------ day and night

    function dayState() {
        const c = economy.clock;
        const w = 0.035;
        const day = smooth(c.dawn - w, c.dawn + w, c.t) * (1 - smooth(c.dusk - w, c.dusk + w, c.t));
        const bump = x => Math.exp(-(((c.t - x) / 0.045) ** 2));
        return { day, twilight: Math.max(bump(c.dawn), bump(c.dusk)), c };
    }

    // ------------------------------------------------ drawing helpers

    // A glow is one pre-painted radial sprite per colour, scaled and faded: the
    // same soft falloff as a gradient, without building a gradient every time.
    const glowSprites = new Map();
    function glowSprite(color) {
        let c = glowSprites.get(color);
        if (!c) {
            c = document.createElement('canvas');
            c.width = c.height = 128;
            const g = c.getContext('2d');
            const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
            gr.addColorStop(0, rgba(color, 1));
            gr.addColorStop(1, rgba(color, 0));
            g.fillStyle = gr;
            g.fillRect(0, 0, 128, 128);
            glowSprites.set(color, c);
        }
        return c;
    }

    function glow(x, y, r, color, a) {
        ctx.globalAlpha = clamp(a, 0, 1);
        ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
    }

    function star4(x, y, r, color, a) {
        ctx.fillStyle = rgba(color, a);
        ctx.beginPath();
        ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y);
        ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill();
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // Labels that must not overlap each other reserve a rectangle for the frame.
    let occupied = [];
    let agentLabels = [];
    function free(x, y, w, h) {
        for (const r of occupied) if (Math.abs(r[0] - x) * 2 < r[2] + w && Math.abs(r[1] - y) * 2 < r[3] + h) return false;
        return true;
    }

    function text(str, x, y, { size = 12, color = '#f3eedc', align = 'center', weight = 600, font = SERIF, halo = 'rgba(6,8,34,.9)', a = 1, avoid = false } = {}) {
        ctx.font = `${weight} ${size}px ${font}`;
        const w = ctx.measureText(str).width;
        if (align === 'center') x = clamp(x, Math.min(w / 2 + 4, cw / 2), Math.max(cw - w / 2 - 4, cw / 2));
        const cx = align === 'center' ? x : align === 'left' ? x + w / 2 : x - w / 2;
        if (avoid && !free(cx, y, w + 4, size * 1.1)) return false;
        occupied.push([cx, y, w + 4, size * 1.1]);
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(2.5, size * 0.28);
        ctx.strokeStyle = halo.replace(/[\d.]+\)$/, m => (parseFloat(m) * a) + ')');
        ctx.strokeText(str, x, y);
        ctx.globalAlpha = a;
        ctx.fillStyle = color;
        ctx.fillText(str, x, y);
        ctx.globalAlpha = 1;
        return true;
    }

    // ------------------------------------------------ layers

    function drawSky(t, ds) {
        const hx = sx(scene.hub.x), hy = sy(scene.hub.y);
        const R = Math.max(cw, ch) * 0.95;
        const n = 1 - ds.day;
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, R);
        g.addColorStop(0, mixHex('#3547a8', '#161c58', n));
        g.addColorStop(0.45, mixHex('#212e86', '#0d1240', n));
        g.addColorStop(1, mixHex('#0d1349', '#070a26', n));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);

        // stars show through the sky at the edges, brighter at night
        const stars = mobile() ? 46 : 90;
        for (let k = 0; k < 2; k++) {
            ctx.fillStyle = k ? LAMP : '#cfe0ff';
            for (let i = 0; i < stars; i++) {
                if ((i % 5 === 0) !== (k === 1)) continue;
                const tw = 0.5 + 0.5 * Math.sin(t * (0.6 + nz(5, i)) + i);
                ctx.globalAlpha = (0.12 + 0.55 * n) * (0.4 + 0.6 * tw);
                ctx.fillRect(nz(1, i) * cw, nz(3, i) * ch, 1.4, 1.4);
            }
        }
        ctx.globalAlpha = 1;
    }

    function drawMandala(t) {
        const hx = sx(scene.hub.x), hy = sy(scene.hub.y);
        const n = Math.max(6, scene.eras.length);
        const rim = scene.rim * S;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.lineWidth = 1;
        for (let k = 0; k < n; k++) {      // ten-fold spokes: one per era mirror
            const a = (k / n) * TAU + t * 0.01;
            const g = ctx.createLinearGradient(Math.cos(a) * rim, Math.sin(a) * rim, Math.cos(a) * rim * 1.7, Math.sin(a) * rim * 1.7);
            g.addColorStop(0, rgba(LAMP, 0.14)); g.addColorStop(1, rgba(LAMP, 0));
            ctx.strokeStyle = g;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * rim, Math.sin(a) * rim); ctx.lineTo(Math.cos(a) * rim * 1.7, Math.sin(a) * rim * 1.7);
            ctx.stroke();
        }
        ctx.setLineDash([1.5, 7]);
        ctx.lineDashOffset = -t * 1.5;
        ctx.strokeStyle = rgba('#cfe0ff', 0.28);
        ctx.beginPath(); ctx.arc(0, 0, rim * 1.09, 0, TAU); ctx.stroke();
        ctx.setLineDash([2, 12]);
        ctx.lineDashOffset = t * 1.2;
        ctx.strokeStyle = rgba(LAMP, 0.18);
        ctx.beginPath(); ctx.arc(0, 0, rim * 1.22, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Glass body and facets of one shard onto any context, in that context's own
    // units. `pts` is the outline, (cx, cy) the centre, R its reach. The cache
    // paints them once in world units; zoomed in, they are painted live.
    function paintGlass(c, e, pts, cx, cy, R, shimmerAt, mult, withBody) {
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15);
        g.addColorStop(0, rgba(mixHex(e.accent, e.deep, 0.5), 0.97));
        g.addColorStop(0.6, rgba(mixHex(e.deep, e.accent, 0.12), 0.97));
        g.addColorStop(1, rgba(e.deep, 0.98));
        if (withBody) {
            c.fillStyle = g;
            c.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
        }
        // facets: every edge is split in two and fanned from the centre
        c.globalCompositeOperation = 'lighter';
        const pal = e.pal.length ? e.pal : [e.accent];
        let k = 0;
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length];
            const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
            for (const [p, q] of [[a, m], [m, b]]) {
                const col = pal[(k + 1) % pal.length];
                const shimmer = 0.85 + 0.15 * Math.sin(shimmerAt * 0.6 + k * 1.3 + e.phase);
                const al = (0.09 + 0.16 * ((k * 7) % 5) / 4) * shimmer * mult;
                c.fillStyle = rgba(col, al);
                c.beginPath(); c.moveTo(cx, cy); c.lineTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.closePath(); c.fill();
                k++;
            }
        }
        c.globalCompositeOperation = 'source-over';
    }

    // One texture of all the glass, painted once; it is cheap to blit every frame.
    let glassCache = null;
    function glass() {
        if (glassCache) return glassCache;
        const rim = scene.rim + 1.5;
        const size = 1024, k = size / (rim * 2);
        const canvasEl = document.createElement('canvas');
        canvasEl.width = canvasEl.height = size;
        const c = canvasEl.getContext('2d');
        c.setTransform(k, 0, 0, k, -(scene.hub.x - rim) * k, -(scene.hub.y - rim) * k);
        for (const e of scene.eras) {
            c.save();
            c.beginPath();
            e.poly.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
            c.closePath(); c.clip();
            paintGlass(c, e, e.poly, e.x, e.y, e.reach, 0, 1, true);
            c.restore();
        }
        glassCache = { canvas: canvasEl, x: scene.hub.x - rim, y: scene.hub.y - rim, span: rim * 2 };
        return glassCache;
    }

    function drawGlassLayer() {
        const g = glass();
        ctx.drawImage(g.canvas, sx(g.x), sy(g.y), g.span * S, g.span * S);
    }

    function onScreen(pts) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
        return x1 > -20 && y1 > -20 && x0 < cw + 20 && y0 < ch + 20;
    }

    function drawShard(e, t, ds, emphasis, cached) {
        const pts = e.poly.map(p => [sx(p[0]), sy(p[1])]);
        if (!onScreen(pts)) return;
        const cx = sx(e.x), cy = sy(e.y);
        const R = e.reach * S;
        const n = 1 - ds.day;
        ctx.save();
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.clip();

        const pal = e.pal.length ? e.pal : [e.accent];
        if (!cached) paintGlass(ctx, e, pts, cx, cy, R, t, 1 - 0.25 * n, true);
        if (emphasis > 0.02) paintGlass(ctx, e, pts, cx, cy, R, t, 0.8 * emphasis, false);
        ctx.globalCompositeOperation = 'lighter';

        // structural-colour sheen sweeping across the glass (玉虫の翅)
        const dir = e.phase, shift = ((t * 0.035 + e.phase) % 1) * 3 - 1;
        const dx = Math.cos(dir) * R, dy = Math.sin(dir) * R;
        const sg = ctx.createLinearGradient(cx + dx * (shift - 1), cy + dy * (shift - 1), cx + dx * (shift + 1), cy + dy * (shift + 1));
        for (const [at, col] of SHEEN_STOPS) sg.addColorStop(at, col);
        ctx.fillStyle = sg;
        ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
        ctx.globalCompositeOperation = 'source-over';

        // inner crystal ring joined to the outer corners
        ctx.strokeStyle = rgba(e.light, 0.1 + 0.08 * emphasis);
        ctx.lineWidth = 1;
        ctx.beginPath();
        pts.forEach((p, i) => {
            const ix = lerp(cx, p[0], 0.5), iy = lerp(cy, p[1], 0.5);
            if (i) ctx.lineTo(ix, iy); else ctx.moveTo(ix, iy);
        });
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        pts.forEach(p => { ctx.moveTo(lerp(cx, p[0], 0.5), lerp(cy, p[1], 0.5)); ctx.lineTo(p[0], p[1]); });
        ctx.stroke();

        // drifting scale-light in this glass
        for (let i = 0; i < 4; i++) {
            const u = (t * (0.012 + 0.006 * i) + nz(e.seed, i)) % 1;
            const ang = nz(e.seed, i, 1) * TAU + t * 0.05;
            const rr = (0.2 + 0.7 * nz(e.seed, i, 2)) * R * 0.8;
            star4(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr - u * 6, 2 + 2 * Math.sin(u * Math.PI), pal[i % pal.length], 0.55 * Math.sin(u * Math.PI));
        }

        // 螺鈿: inlaid flecks that catch the light one after another
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 16; i++) {
            const ang = nz(e.seed, i, 3) * TAU, rr = Math.sqrt(nz(e.seed, i, 4)) * R * 0.95;
            const tw = Math.max(0, Math.sin(t * (0.6 + nz(e.seed, i, 5)) + i * 2.1)) ** 3;
            if (tw < 0.05) continue;
            ctx.fillStyle = rgba(IRIS[i % 4], 0.85 * tw);
            ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 0.8 + 1.5 * tw, 0, TAU); ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // lead line
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.lineJoin = 'round';
        ctx.strokeStyle = emphasis > 0.02 ? rgba(LAMP, 0.42 + 0.4 * emphasis) : LEAD;
        ctx.lineWidth = 1 + emphasis * 1.2;
        ctx.stroke();
        if (emphasis > 0.05) {
            ctx.strokeStyle = rgba(e.accent, 0.35 * emphasis);
            ctx.lineWidth = 5;
            ctx.stroke();
        }
    }

    function drawRim(t, ds) {
        const hx = sx(scene.hub.x), hy = sy(scene.hub.y), rim = scene.rim * S;
        ctx.strokeStyle = RIM_OUTER; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(hx, hy, rim, 0, TAU); ctx.stroke();
        ctx.strokeStyle = RIM_INNER; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(hx, hy, rim - 3, 0, TAU); ctx.stroke();
        // a jewel on the rim for each era, at its own bearing
        for (const e of scene.eras) {
            const x = hx + Math.cos(e.angle) * rim, y = hy + Math.sin(e.angle) * rim;
            glow(x, y, 9, e.accent, 0.45 + 0.2 * (1 - ds.day));
            ctx.fillStyle = e.accent;
            ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
            ctx.strokeStyle = rgba('#fff7dc', 0.8); ctx.lineWidth = 0.8;
            ctx.stroke();
        }
    }

    function drawConnections(sel) {
        if (!sel || (sel.type !== 'place' && sel.type !== 'district')) return;
        const p = sel.type === 'place' ? scene.placeById.get(sel.id) : scene.districtById.get(sel.id) && scene.districtById.get(sel.id).place;
        if (!p) return;
        ctx.save();
        ctx.setLineDash([3, 5]);
        ctx.lineWidth = 1;
        for (const cid of (p.raw.connections || [])) {
            const q = scene.placeById.get(cid);
            if (!q) continue;
            const mx = (p.x + q.x) / 2 + (q.y - p.y) * 0.12, my = (p.y + q.y) / 2 - (q.x - p.x) * 0.12;
            ctx.strokeStyle = rgba(p.accent, 0.5);
            ctx.beginPath(); ctx.moveTo(sx(p.x), sy(p.y)); ctx.quadraticCurveTo(sx(mx), sy(my), sx(q.x), sy(q.y)); ctx.stroke();
        }
        ctx.strokeStyle = rgba(p.accent, 0.3);
        for (const d of scene.districts) {
            if (d.place !== p) continue;
            ctx.beginPath(); ctx.moveTo(sx(p.x), sy(p.y)); ctx.lineTo(sx(d.x), sy(d.y)); ctx.stroke();
        }
        ctx.restore();
    }

    function tracePath(rt) {
        ctx.beginPath();
        rt.curve.pts.forEach((p, i) => (i ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1]))));
    }

    function drawRoute(rt, t, ds) {
        const n = 1 - ds.day;
        const z = Math.sqrt(V.zoom);
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // a hair of light so a route can always be found
        tracePath(rt);
        ctx.strokeStyle = 'rgba(207,224,255,0.07)'; ctx.lineWidth = 1; ctx.stroke();

        switch (rt.via) {
        case 'ginga_tetsudo': {            // starry rail, awake at night
            const vis = 0.2 + 0.8 * n;
            for (const off of [-1.6, 1.6]) {
                ctx.beginPath();
                rt.curve.pts.forEach((p, i) => {
                    const q = rt.curve.pts[Math.min(i + 1, rt.curve.pts.length - 1)], r0 = rt.curve.pts[Math.max(i - 1, 0)];
                    const tx = q[0] - r0[0], ty = q[1] - r0[1], l = Math.hypot(tx, ty) || 1;
                    const x = sx(p[0]) + (-ty / l) * off, y = sy(p[1]) + (tx / l) * off;
                    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
                });
                ctx.strokeStyle = rgba('#9fc3e8', 0.55 * vis); ctx.lineWidth = 0.9; ctx.stroke();
            }
            for (let i = 0; i < 14; i++) {     // sleepers made of stars
                const u = (i + 0.5) / 14, [x, y] = rt.curve.at(u);
                star4(sx(x), sy(y), 2.1 + 1.4 * Math.sin(t * 2 + i + rt.phase * 9) ** 2, i % 3 ? '#cfe6ff' : LAMP, 0.7 * vis);
            }
            const [x, y] = rt.curve.at((t * 0.035 + rt.phase) % 1);
            glow(sx(x), sy(y), 14, '#3fa77a', 0.75 * vis);
            ctx.fillStyle = rgba('#e8ffe9', 0.95 * vis);
            ctx.beginPath(); ctx.arc(sx(x), sy(y), 2.4, 0, TAU); ctx.fill();
            break;
        }
        case 'chodo': {                    // a dotted butterfly trail
            tracePath(rt);
            ctx.setLineDash([0.1, 6]); ctx.lineDashOffset = -t * 6; ctx.lineWidth = 2.4;
            ctx.strokeStyle = rgba('#d6c8ff', 0.7); ctx.stroke();
            ctx.setLineDash([]);
            for (let i = 0; i < 2; i++) {
                const [x, y, dx, dy] = rt.curve.at((t * 0.018 + rt.phase + i / 2) % 1);
                const flap = Math.abs(Math.sin(t * 9 + i * 2));
                const a = Math.atan2(dy, dx);
                ctx.save();
                ctx.translate(sx(x), sy(y)); ctx.rotate(a);
                ctx.fillStyle = rgba(IRIS[(i + Math.floor(rt.phase * 4)) % 4], 0.9);
                for (const side of [-1, 1]) {
                    ctx.beginPath(); ctx.ellipse(0, side * 2.2 * flap, 3.4, 2.4 * flap + 0.4, side * 0.5, 0, TAU); ctx.fill();
                }
                ctx.restore();
            }
            break;
        }
        case 'torii': {                    // vermilion dashes and a gate
            tracePath(rt);
            ctx.setLineDash([7, 5]); ctx.lineDashOffset = -t * 9; ctx.lineWidth = 1.7;
            ctx.strokeStyle = rgba(VERMILION, 0.8); ctx.stroke();
            ctx.setLineDash([]);
            const [x, y] = rt.curve.at(0.5);
            const px = sx(x), py = sy(y), s = 4.2 + z;
            ctx.strokeStyle = rgba(VERMILION, 0.95); ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(px - s * 0.7, py + s * 0.9); ctx.lineTo(px - s * 0.7, py - s * 0.5);
            ctx.moveTo(px + s * 0.7, py + s * 0.9); ctx.lineTo(px + s * 0.7, py - s * 0.5);
            ctx.moveTo(px - s, py - s * 0.6); ctx.lineTo(px + s, py - s * 0.6);
            ctx.moveTo(px - s * 0.8, py - s * 0.05); ctx.lineTo(px + s * 0.8, py - s * 0.05);
            ctx.stroke();
            break;
        }
        case 'kumoito': {                  // fine silver thread, hanging
            tracePath(rt);
            ctx.strokeStyle = rgba('#e6ecf8', 0.8); ctx.lineWidth = 0.8; ctx.stroke();
            const u = 0.5 + 0.5 * Math.sin(t * 0.35 + rt.phase * 6);
            const [x, y] = rt.curve.at(u);
            glow(sx(x), sy(y), 9, '#e6ecf8', 0.6);
            ctx.fillStyle = '#f6f9ff';
            ctx.beginPath(); ctx.arc(sx(x), sy(y), 1.8, 0, TAU); ctx.fill();
            break;
        }
        case 'oshie': {                    // a picture-crossing, flickering
            const pts = rt.curve.pts, segs = 14;
            const slot = Math.floor(t * 11);
            if (rt.flickSlot !== slot) {
                rt.flickSlot = slot;
                rt.flicks = Array.from({ length: segs }, (_, i) => hash01(rt.id, slot, i));
            }
            ctx.strokeStyle = '#f2e6ff'; ctx.lineWidth = 1.3;
            for (let i = 0; i < segs; i++) {
                const flick = rt.flicks[i];
                if (flick < 0.45) continue;
                const a = pts[Math.floor((i / segs) * (pts.length - 1))], b = pts[Math.floor(((i + 1) / segs) * (pts.length - 1))];
                ctx.globalAlpha = 0.25 + 0.65 * flick;
                ctx.beginPath(); ctx.moveTo(sx(a[0]), sy(a[1])); ctx.lineTo(sx(b[0]), sy(b[1])); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            break;
        }
        case 'hojo_capsule': {             // a slow home-sized capsule
            tracePath(rt);
            ctx.strokeStyle = rgba('#5fd1c8', 0.4); ctx.lineWidth = 1.3; ctx.stroke();
            const [x, y, dx, dy] = rt.curve.at((t * 0.012 + rt.phase) % 1);
            ctx.save(); ctx.translate(sx(x), sy(y)); ctx.rotate(Math.atan2(dy, dx));
            glow(0, 0, 12, '#5fd1c8', 0.45);
            roundRect(-6, -3, 12, 6, 3);
            ctx.fillStyle = '#d4fbf6'; ctx.fill();
            ctx.strokeStyle = rgba('#5fd1c8', 0.9); ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = rgba(LAMP, 0.9); ctx.fillRect(-1.5, -1, 3, 2);
            ctx.restore();
            break;
        }
        case 'tamamushi_car': {            // green-gold streak
            const vis = 0.4 + 0.6 * ds.day;
            tracePath(rt);
            ctx.strokeStyle = rgba('#1f9a6c', 0.18 * vis); ctx.lineWidth = 1.2; ctx.stroke();
            const head = (t * 0.16 + rt.phase) % 1, tail = Math.max(0, head - 0.14);
            const a = rt.curve.at(tail), b = rt.curve.at(head);
            const g = ctx.createLinearGradient(sx(a[0]), sy(a[1]), sx(b[0]), sy(b[1]));
            g.addColorStop(0, rgba('#1f9a6c', 0)); g.addColorStop(0.7, rgba('#7fe3a8', 0.8 * vis)); g.addColorStop(1, rgba('#f2d36b', vis));
            ctx.strokeStyle = g; ctx.lineWidth = 2.8;
            ctx.beginPath();
            const steps = 8;
            for (let i = 0; i <= steps; i++) {
                const p = rt.curve.at(lerp(tail, head, i / steps));
                if (i) ctx.lineTo(sx(p[0]), sy(p[1])); else ctx.moveTo(sx(p[0]), sy(p[1]));
            }
            ctx.stroke();
            glow(sx(b[0]), sy(b[1]), 9, '#f2d36b', 0.6 * vis);
            break;
        }
        case 'karasu_bikyaku': {           // small wing marks flying along
            tracePath(rt);
            ctx.setLineDash([1, 8]); ctx.strokeStyle = rgba('#c9cdd6', 0.25); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
            for (let i = 0; i < 3; i++) {
                const [x, y, dx, dy] = rt.curve.at((t * 0.07 + rt.phase + i / 3) % 1);
                const flap = Math.sin(t * 8 + i * 2);
                ctx.save(); ctx.translate(sx(x), sy(y)); ctx.rotate(Math.atan2(dy, dx));
                ctx.strokeStyle = '#d6dbe8'; ctx.fillStyle = '#2b2233'; ctx.lineWidth = 1.1;
                ctx.beginPath();
                ctx.moveTo(-1, 0); ctx.quadraticCurveTo(-3, -4.5 * flap, -6, -3 * flap);
                ctx.moveTo(-1, 0); ctx.quadraticCurveTo(-3, 4.5 * flap, -6, 3 * flap);
                ctx.stroke();
                ctx.beginPath(); ctx.ellipse(0, 0, 3, 1.5, 0, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.restore();
            }
            break;
        }
        default:
            tracePath(rt);
            ctx.strokeStyle = rgba(LAMP, 0.4); ctx.lineWidth = 1.2; ctx.stroke();
        }
        ctx.restore();
    }

    function drawRealm(r, t, ds, emphasis) {
        const x = sx(r.x), y = sy(r.y);
        const R = Math.max(10, 3 * S);
        const n = 1 - ds.day;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(x, y, R * 3, r.accent, 0.28 + 0.14 * n + 0.12 * emphasis);
        glow(x, y, R * 1.7, r.light, 0.22);
        ctx.globalCompositeOperation = 'source-over';

        // the gem: eight facets cut from the realm's palette
        const pal = r.pal.length ? r.pal : [r.accent];
        for (let i = 0; i < 8; i++) {
            const a0 = (i / 8) * TAU + r.phase * 0.1, a1 = ((i + 1) / 8) * TAU + r.phase * 0.1;
            const col = i % 2 ? mixHex(pal[i % pal.length], '#ffffff', 0.12) : mixHex(pal[(i + 2) % pal.length], r.deep, 0.35);
            ctx.fillStyle = rgba(col, 0.96);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a0) * R, y + Math.sin(a0) * R); ctx.lineTo(x + Math.cos(a1) * R, y + Math.sin(a1) * R); ctx.closePath(); ctx.fill();
        }
        ctx.strokeStyle = rgba('#fff4cf', 0.8 + 0.2 * emphasis); ctx.lineWidth = 1.1 + emphasis;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + r.phase * 0.1; i ? ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R) : ctx.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R); }
        ctx.closePath(); ctx.stroke();
        star4(x - R * 0.25, y - R * 0.3, R * 0.35, '#ffffff', 0.55 + 0.25 * Math.sin(t * 1.4 + r.phase));

        realmFx(r, x, y, R, t);
        ctx.restore();
    }

    // Each realm's own weather, a few particles each.
    function realmFx(r, x, y, R, t) {
        ctx.globalCompositeOperation = 'lighter';
        const c2 = r.light, ph = r.phase;
        switch (r.fx) {
        case 'stars':
            for (let i = 0; i < 7; i++) {
                const a = t * 0.3 + (i / 7) * TAU + ph;
                star4(x + Math.cos(a) * R * 2, y + Math.sin(a) * R * 1.1, 2.2 + Math.sin(t * 2 + i) ** 2 * 1.6, i % 2 ? c2 : '#ffffff', 0.85);
            }
            break;
        case 'petals':
            for (let i = 0; i < 7; i++) {
                const u = (t * 0.07 + i / 7 + nz(r.seed, i)) % 1;
                const px = x + Math.sin(u * 7 + i) * R * 1.4, py = y - R * 1.8 + u * R * 3.8;
                ctx.fillStyle = rgba('#f8c8d8', 0.85 * Math.sin(u * Math.PI));
                ctx.beginPath(); ctx.ellipse(px, py, 3, 1.6, u * 9 + i, 0, TAU); ctx.fill();
            }
            break;
        case 'waves':
            for (let i = 0; i < 3; i++) {
                const u = (t * 0.22 + i / 3) % 1;
                ctx.strokeStyle = rgba(c2, 0.55 * (1 - u)); ctx.lineWidth = 1.2;
                ctx.beginPath(); ctx.ellipse(x, y + R * 0.2, R * (1 + u * 1.6), R * (0.5 + u * 0.7), 0, 0, TAU); ctx.stroke();
            }
            for (let i = 0; i < 4; i++) {
                const u = (t * 0.12 + i / 4) % 1;
                ctx.strokeStyle = rgba('#ffffff', 0.7 * (1 - u)); ctx.lineWidth = 0.9;
                ctx.beginPath(); ctx.arc(x + Math.sin(i * 5 + t * 0.4) * R * 0.9, y + R - u * R * 2.4, 1.6 + i % 2, 0, TAU); ctx.stroke();
            }
            break;
        case 'moon':
            ctx.strokeStyle = rgba('#fff4cf', 0.45); ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(x, y, R * (1.5 + 0.12 * Math.sin(t * 0.8)), -2.4, 0.9); ctx.stroke();
            ctx.strokeStyle = rgba(c2, 0.3);
            ctx.beginPath(); ctx.arc(x, y, R * 2.1, 0.8, 3.4); ctx.stroke();
            star4(x + R * 1.5, y - R * 1.1, 3, '#fff4cf', 0.8);
            break;
        case 'mist':
            for (let i = 0; i < 3; i++) {
                const u = (t * 0.03 + i / 3) % 1;
                glow(x + (u - 0.5) * R * 5, y + (i - 1) * R * 0.6, R * 1.6, '#e6edf0', 0.2 * Math.sin(u * Math.PI));
            }
            break;
        case 'dew':
            for (let i = 0; i < 6; i++) {
                const u = (t * 0.09 + i / 6) % 1;
                ctx.fillStyle = rgba('#e8fbff', 0.8 * Math.sin(u * Math.PI));
                ctx.beginPath(); ctx.arc(x + (nz(r.seed, i, 6) - 0.5) * R * 3, y - R * 1.6 + u * R * 3.4, 1.6, 0, TAU); ctx.fill();
            }
            break;
        case 'dream':
            for (let i = 0; i < 6; i++) {
                const u = (t * 0.06 + i / 6) % 1;
                glow(x + Math.sin(u * 5 + i * 2) * R * 1.5, y + R * 1.6 - u * R * 3.4, 6, i % 2 ? LAMP : VERMILION, 0.6 * Math.sin(u * Math.PI));
            }
            break;
        case 'wheat':
            for (let i = 0; i < 8; i++) {
                const a = t * 0.5 + (i / 8) * TAU * 2 + ph;
                const rr = R * (1.2 + 0.8 * ((i * 0.37) % 1));
                ctx.fillStyle = rgba(i % 2 ? '#e8c36a' : '#9fd7a8', 0.75);
                ctx.fillRect(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6, 2, 2);
            }
            break;
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    function drawHub(t, ds) {
        const hx = sx(scene.hub.x), hy = sy(scene.hub.y);
        const R = Math.max(13, 4 * S);
        const n = scene.eras.length || 10;
        const c = economy.clock;
        glow(hx, hy, R * 2.8, LAMP, 0.28 + 0.2 * (1 - ds.day));
        ctx.save();
        ctx.translate(hx, hy);
        // the ten dials: one wedge per era, in its own colour
        scene.eras.forEach((e, i) => {
            const a0 = (i / n) * TAU - Math.PI / 2, a1 = ((i + 1) / n) * TAU - Math.PI / 2;
            ctx.fillStyle = rgba(mixHex(e.accent, '#10154a', 0.25), 0.95);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0 + 0.02, a1 - 0.02); ctx.closePath(); ctx.fill();
        });
        ctx.strokeStyle = rgba(LAMP, 0.95); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * 0.38, 0, TAU);
        ctx.fillStyle = '#10154a'; ctx.fill(); ctx.stroke();
        // hand: midnight at the top, one turn per day
        const ang = c.t * TAU - Math.PI / 2;
        ctx.strokeStyle = '#fff4cf'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ang) * R * 0.95, Math.sin(ang) * R * 0.95); ctx.stroke();
        ctx.fillStyle = LAMP;
        ctx.beginPath(); ctx.arc(Math.cos(ang) * R * 0.95, Math.sin(ang) * R * 0.95, 2.4, 0, TAU); ctx.fill();
        ctx.restore();
    }

    function drawDistricts(t, ds, emphasisPlace) {
        const n = 1 - ds.day;
        const r0 = clamp(2.4 + V.zoom * 0.9, 2.6, 7);
        ctx.save();
        for (const d of scene.districts) {
            const x = sx(d.x), y = sy(d.y);
            if (x < -30 || y < -30 || x > cw + 30 || y > ch + 30) continue;
            hits.push({ type: 'district', id: d.id, x, y, r: 13, pri: 2 });
            const lit = 0.3 + 0.7 * n;
            const pulse = 0.85 + 0.15 * Math.sin(t * 1.6 + d.phase);
            const focus = emphasisPlace && d.place === emphasisPlace ? 1 : 0;
            const sel = selected && selected.type === 'district' && selected.id === d.id;
            ctx.globalCompositeOperation = 'lighter';
            glow(x, y, r0 * (3.4 + focus), d.isHub ? LAMP : d.accent, (0.2 + 0.4 * lit * pulse) * (d.isHub ? 0.4 : 1));
            ctx.globalCompositeOperation = 'source-over';
            if (d.isHub) continue;
            // a lit window: diamond in the place's colour with a warm lamp inside
            ctx.fillStyle = d.fillStr;
            ctx.strokeStyle = d.strokeStr;
            ctx.lineWidth = 1 + (sel || focus ? 1 : 0);
            ctx.beginPath(); ctx.moveTo(x, y - r0); ctx.lineTo(x + r0, y); ctx.lineTo(x, y + r0); ctx.lineTo(x - r0, y); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 0.35 + 0.65 * lit * pulse;
            ctx.fillStyle = LAMP;
            ctx.beginPath(); ctx.arc(x, y, Math.max(1, r0 * 0.34), 0, TAU); ctx.fill();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    function eventSpot(id) {
        const d = scene.districtById.get(id);
        if (d) return { x: d.x, y: d.y };
        const p = scene.placeById.get(id);
        return p ? { x: p.x, y: p.y } : null;
    }

    function drawEvents(t) {
        for (const ae of economy.activeEvents) {
            const ev = ae.event || ae;
            const spot = eventSpot(ev.where);
            if (!spot) continue;
            const x = sx(spot.x), y = sy(spot.y);
            hits.push({ type: 'event', id: ev.id, x, y: y - 14, r: 12, pri: 3, label: ev.name_ja });
            const u = (t * 0.5) % 1;
            ctx.strokeStyle = rgba(LAMP, 0.7 * (1 - u)); ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.arc(x, y, 6 + u * 16, 0, TAU); ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            star4(x, y - 14, 5 + Math.sin(t * 3) * 1.2, '#fff1b8', 0.95);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    // ------------------------------------------------ creatures

    function critterPos(k, t) {
        const n = k.homes.length;
        let hx, hy;
        if (n === 1) { hx = k.homes[0].x; hy = k.homes[0].y; }
        else {
            const u = (t / k.cycle * n + k.ph3 * n) % n, i = Math.floor(u), f = u - i;
            const e = f < 0.75 ? 0 : smooth(0, 1, (f - 0.75) / 0.25);
            const a = k.homes[i], b = k.homes[(i + 1) % n];
            hx = lerp(a.x, b.x, e); hy = lerp(a.y, b.y, e);
        }
        let rx = 2.4, ry = 1.8, fx = 0.3;
        switch (k.mv) {
        case 'flutter': rx = 3.4; ry = 2.6; fx = 0.55; break;
        case 'glide': rx = 5; ry = 3.2; fx = 0.2; break;
        case 'swim': rx = 4; ry = 1.1; fx = 0.3; break;
        case 'walk': rx = 2.6; ry = 0.7; fx = 0.16; break;
        case 'hover': rx = 1.1; ry = 0.9; fx = 0.5; break;
        case 'still': rx = 0.35; ry = 0.35; fx = 0.2; break;
        }
        const a = t * fx + k.ph;
        return [
            hx + rx * Math.sin(a) + 0.35 * rx * Math.sin(a * 2.7 + k.ph2),
            hy - 1.6 + ry * Math.sin(a * 0.8 + k.ph2) + 0.3 * ry * Math.cos(a * 2.1)
        ];
    }

    function critterAlpha(k, ds, t) {
        const night = 1 - ds.day;
        let a = 1;
        if (k.activity === 'diurnal') a = 0.2 + 0.8 * ds.day;
        else if (k.activity === 'nocturnal') a = 0.2 + 0.8 * night;
        else if (k.activity === 'crepuscular') a = 0.3 + 0.7 * Math.min(1, ds.twilight * 1.6 + 0.2);
        // each creature rests part of the time so that over a minute many kinds are seen
        const u = (t / k.cycle + k.ph3) % 1;
        const duty = k.c.kind === 'butterfly' ? 0.75 : 0.5;
        const gate = smooth(0, 0.06, u) * smooth(0, 0.06, duty - u);
        return a * gate;
    }

    function drawCreatures(t, ds) {
        const limit = mobile() ? 12 : 26;
        const shown = [];
        for (const k of scene.critters) {
            if (!creaturePresence(k.c.id, { clock: frozenClock || economy.clock, activeEvents: economy.activeEvents, time: economy.time }).present) continue;
            const alwaysOn = scene.jewel === k;
            const alpha = alwaysOn ? 1 : critterAlpha(k, ds, t);
            if (alpha < 0.12) continue;
            let [px, py] = critterPos(k, t);
            if (alwaysOn) {                 // the jewel butterfly circles the hub
                const a = t * 0.45;
                px = scene.hub.x + Math.cos(a) * 6.5; py = scene.hub.y - 2 + Math.sin(a * 1.3) * 4.2;
            }
            const x = sx(px), y = sy(py);
            if (x < -60 || y < -60 || x > cw + 60 || y > ch + 60) continue;
            shown.push({ k, x, y, alpha });
            if (shown.length >= limit) break;
        }
        stats.creatures = shown.length;
        shown.sort((a, b) => a.y - b.y);
        const zoomK = 0.75 + 0.25 * Math.sqrt(V.zoom);
        for (const s of shown) {
            const art = visualOf('creature', s.k.c.id);
            const size = clamp((22 + 9 * s.k.scale) * zoomK * (mobile() ? 0.9 : 1.05) * (art ? 1.35 : 1), 26, 140);
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.globalAlpha = s.alpha;
            if (!art || !drawVisualCreature(ctx, art, t, size, !artPaused && !reduce.matches, { clock: frozenClock || economy.clock, region: s.k.homes[0]?.id === 'raiden_kunitomo_nichirin' ? 'west' : 'east' })) drawCreature(ctx, s.k.c, t, size);
            ctx.restore();
            hits.push({ type: 'creature', id: s.k.c.id, x: s.x, y: s.y, r: Math.max(14, size * 0.38), pri: 1 });
            if (selected && selected.type === 'creature' && selected.id === s.k.c.id) ringAround(s.x, s.y, size * 0.45, '#fff4cf', t);
        }
    }

    function ringAround(x, y, r, color, t) {
        ctx.save();
        ctx.strokeStyle = rgba(color, 0.9); ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 12;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.restore();
    }

    // ------------------------------------------------ agents

    function agentState(a, dt) {
        let s = smoothAgents.get(a.id);
        const tr = a.trip;
        const rt = tr && scene.routeByPair.get(tr.from + '>' + tr.to);
        const useCurve = rt && rt.via === tr.via;
        let tx = a.x, ty = a.y, prog = tr ? tr.prog : 0;
        if (!s) { s = { x: a.x, y: a.y, prog, stage: a.stage, since: 0 }; smoothAgents.set(a.id, s); }
        if (s.stage !== a.stage) { s.stage = a.stage; s.since = 0; }
        s.since += dt;
        const k = 1 - Math.exp(-dt * 7);
        if (tr && useCurve) {
            s.prog = lerp(s.prog, prog, k);
            const fwd = rt.from.id === tr.from;
            const p = rt.curve.at(fwd ? s.prog : 1 - s.prog);
            tx = p[0] + (a.ox || 0) * 0.4; ty = p[1] + (a.oy || 0) * 0.4;
            s.x = tx; s.y = ty;
        } else {
            s.prog = prog;
            s.x = lerp(s.x, tx, k); s.y = lerp(s.y, ty, k);
        }
        return s;
    }

    const agentAccent = a => {
        const d = scene.districtById.get(a.home);
        return d && d.place ? d.place.accent : LAMP;
    };

    function drawAgents(t, dt, ds) {
        const list = [];
        for (const a of (frozenAgents || economy.agents).values()) list.push({ a, s: agentState(a, artPaused ? 0 : dt) });
        const rank = { idle: 0, trade: 1, travel: 2, think: 3, react: 4 };
        list.sort((p, q) => (rank[p.a.stage] || 0) - (rank[q.a.stage] || 0));
        for (const { a, s } of list) {
            const x = sx(s.x), y = sy(s.y);
            if (x < -40 || y < -40 || x > cw + 40 || y > ch + 40) continue;
            const info = W.byId.agent.get(a.id) || {};
            const native = info.origin === 'native';
            const acc = native ? agentAccent(a) : '#7ff3e4';
            const col = s.col || (s.col = { ring: rgba(acc, 1), route: rgba(acc, 0.6), pill: rgba(acc, 0.8), bubble: rgba(acc, 0.95) });
            const isSel = selected && selected.type === 'agent' && selected.id === a.id;
            const isHover = hovered && hovered.type === 'agent' && hovered.id === a.id;
            hits.push({ type: 'agent', id: a.id, x, y, r: 15, pri: 4 });

            if (a.stage === 'travel' && a.trip) {          // the temporary neon route
                const tx = sx(scene.districtById.get(a.trip.to) ? scene.districtById.get(a.trip.to).x : s.x);
                const ty = sy(scene.districtById.get(a.trip.to) ? scene.districtById.get(a.trip.to).y : s.y);
                if (!scene.routeByPair.get(a.trip.from + '>' + a.trip.to)) {
                    ctx.save();
                    ctx.setLineDash([2, 6]); ctx.lineDashOffset = -t * 14; ctx.lineWidth = 1.4;
                    ctx.strokeStyle = col.route;
                    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
                    ctx.restore();
                }
            }

            ctx.globalCompositeOperation = 'lighter';
            const active = a.stage !== 'idle';
            glow(x, y, active ? 17 : 11, acc, active ? 0.65 : 0.4);
            ctx.globalCompositeOperation = 'source-over';
            // chip: a bright bead with a ring, a double ring for the NEON MYTHOS crew
            ctx.fillStyle = '#fffaf0';
            ctx.beginPath(); ctx.arc(x, y, 3.1, 0, TAU); ctx.fill();
            ctx.strokeStyle = col.ring; ctx.lineWidth = 1.7;
            ctx.beginPath(); ctx.arc(x, y, 5.2, 0, TAU); ctx.stroke();
            if (!native) {
                ctx.strokeStyle = rgba('#ff4fa3', 0.85); ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(x, y, 7.4, 0, TAU); ctx.stroke();
            }
            if (a.stage === 'trade') {
                ctx.strokeStyle = rgba(LAMP, 0.9 * (1 - (t * 1.5) % 1)); ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.arc(x, y, 6 + ((t * 1.5) % 1) * 10, 0, TAU); ctx.stroke();
            }
            if (isSel) ringAround(x, y, 12, '#fff4cf', t);

            // the neon-chibi face stands on the bead; the bead and rings above stay as they were
            const art = visualOf('agent', a.id);
            const fh = art ? (isSel || isHover ? clamp(60 + V.zoom * 9, 70, 110) : clamp(34 + V.zoom * 8, 40, 86)) : clamp(18 + Math.sqrt(V.zoom) * 5, 21, 34);
            const painted = art && drawVisualAgent(ctx, art, a.stage, x, y - 7, fh);
            if (info.id && !painted) ctx.drawImage(agentSprite(W, info), x - fh / 2 - fh * SPRITE_PAD / 100, y - 7 - fh - fh * SPRITE_PAD / 100, fh * (1 + SPRITE_PAD * 0.02), fh * (1 + SPRITE_PAD * 0.02));
            if (painted) hits.push({ type: 'agent', id: a.id, x, y: y - fh / 2, r: fh * .42, pri: isSel ? 5 : 4 });
            if (a.carrying && a.carrying.length) drawCargo(a, x + fh * 0.42, y - 8);
            const lift = info.id ? fh - 3 : 0;

            // ！ → 💭 → 🏃 above the head while the agent reacts, thinks, travels
            const glyph = { react: '！', think: '💭', travel: '🏃' }[a.stage];
            if (glyph) {
                const big = a.stage !== 'travel';      // the momentary reactions speak louder than a long walk
                const pop = smooth(0, 0.25, s.since);
                const bw = big ? 22 : 17, bh = big ? 20 : 16;
                const by = y - lift - (big ? 21 : 16) - (reduce.matches ? 0 : Math.sin(t * 5 + s.x) * 1.2) - (1 - pop) * 6;
                ctx.save();
                ctx.globalAlpha = pop * (big ? 1 : 0.9);
                ctx.translate(x, by);
                roundRect(-bw / 2, -bh / 2, bw, bh, big ? 8 : 6);
                ctx.fillStyle = 'rgba(14,18,60,.94)'; ctx.fill();
                ctx.strokeStyle = a.stage === 'react' ? VERMILION : col.bubble; ctx.lineWidth = 1.3; ctx.stroke();
                if (big) { ctx.beginPath(); ctx.moveTo(-3, bh / 2 - 0.5); ctx.lineTo(0, bh / 2 + 4); ctx.lineTo(3, bh / 2 - 0.5); ctx.fillStyle = 'rgba(14,18,60,.94)'; ctx.fill(); }
                ctx.font = a.stage === 'react' ? `800 15px ${SERIF}` : `${big ? 13 : 10.5}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = a.stage === 'react' ? '#ff7a55' : '#fff';
                ctx.fillText(glyph, 0, 0.5);
                ctx.restore();
            }
            const pri = isSel ? 9 : isHover ? 8 : a.stage === 'react' || a.stage === 'think' ? 6 : a.stage === 'travel' ? 4 : a.stage === 'trade' ? 3 : V.zoom >= 2.2 ? 1 : 0;
            if (pri > 0) agentLabels.push({ x, y, acc: col.pill, pri, nm: agentShort(W.byId.agent.get(a.id) || a) });
        }
    }

    // What the runner carries: a small gem-tag with the good's first character (and the count past one).
    const CARGO_HUE = { material: '#c9a36b', energy: '#ffd166', food: '#9be37f', craft: '#e8c36a', knowledge: '#9fc3ff', art: '#ff9ad0', transport: '#7fe3d8', luxury: '#e7b3ff', service: '#b9c2ff' };
    const cargoTag = new Map();
    function drawCargo(a, x, y) {
        const lot = a.carrying[0];
        let tag = cargoTag.get(lot.good);
        if (!tag) {
            const g = W.byId.good.get(lot.good);
            const nm = String((g && (g.name_ja || g.name)) || lot.good).replace(/（[^）]*）|\([^)]*\)/g, '').trim();
            tag = { ch: Array.from(nm)[0] || '品', hue: CARGO_HUE[g && g.category] || '#e8c36a' };
            cargoTag.set(lot.good, tag);
        }
        const more = a.carrying.length > 1 ? '+' : '';
        const str = tag.ch + (lot.qty > 1 || more ? String(lot.qty) + more : '');
        ctx.font = `700 9.5px ${SERIF}`;
        const w = Math.max(15, ctx.measureText(str).width + 8);
        roundRect(x - w / 2, y - 7.5, w, 15, 7.5);
        ctx.fillStyle = 'rgba(12,16,56,.92)'; ctx.fill();
        ctx.strokeStyle = tag.hue; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.fillStyle = '#fff6dc'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(str, x, y + 0.5);
    }

    // Name chips go on last and only where there is room.
    function drawAgentLabels() {
        agentLabels.sort((p, q) => q.pri - p.pri);
        const cap = V.zoom >= 1.8 ? 18 : mobile() ? 4 : 7;
        let n = 0;
        ctx.font = `600 11px ${SERIF}`;
        for (const l of agentLabels) {
            if (n >= cap && l.pri < 8) break;
            const w = ctx.measureText(l.nm).width + 12;
            if (l.pri < 8 && !free(l.x, l.y + 17, w, 16)) continue;
            occupied.push([l.x, l.y + 17, w, 16]);
            n++;
            roundRect(l.x - w / 2, l.y + 9, w, 16, 8);
            ctx.fillStyle = 'rgba(10,14,52,.84)'; ctx.fill();
            ctx.strokeStyle = l.acc; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#fff6dc'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(l.nm, l.x, l.y + 17.5);
        }
    }

    // ------------------------------------------------ particles, wash, weather

    function drawScales(t, ds) {
        if (reduce.matches) return;
        const count = mobile() ? 26 : 48;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < count; i++) {
            const u = (t * (0.015 + 0.02 * nz(7, i)) + nz(11, i)) % 1;
            const x = (nz(13, i) * cw + Math.sin(t * 0.4 + i) * 14) % cw;
            const y = ch * (1.05 - u * 1.15);
            ctx.globalAlpha = Math.sin(u * Math.PI) * (0.35 + 0.35 * (1 - ds.day));
            ctx.fillStyle = IRIS[i % 4];
            const r = 1.2 + nz(17, i) * 1.8;
            ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r * 1.5); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    function drawWash(t, ds) {
        const n = 1 - ds.day;
        if (n > 0.01) {
            ctx.fillStyle = `rgba(10,14,66,${0.34 * n})`;
            ctx.fillRect(0, 0, cw, ch);
        }
        if (ds.twilight > 0.02) {       // 逢う刻 and the hour before dawn: an amber breath over everything
            const g = ctx.createLinearGradient(0, ch, 0, 0);
            g.addColorStop(0, `rgba(255,150,80,${0.2 * ds.twilight})`);
            g.addColorStop(1, `rgba(255,120,150,${0.05 * ds.twilight})`);
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
            ctx.globalCompositeOperation = 'source-over';
        }
    }

    // 明け六つ: a band of gold sweeps from the east. 暮れ六つ: bells ripple out of the hub.
    function drawHourEffects(t, ds) {
        const c = ds.c;
        if (c.koku === 0) {
            const u = c.phase;
            const x = cw * (1.15 - 1.4 * u);
            const g = ctx.createLinearGradient(x - cw * 0.3, 0, x + cw * 0.3, 0);
            const a = 0.34 * Math.sin(Math.min(1, u) * Math.PI);
            g.addColorStop(0, 'rgba(255,200,120,0)'); g.addColorStop(0.5, `rgba(255,214,150,${a})`); g.addColorStop(1, 'rgba(255,120,150,0)');
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore();
        }
        if (c.koku === 6 && c.phase < 0.7) {
            const hx = sx(scene.hub.x), hy = sy(scene.hub.y);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const u = (c.phase * 2.2 + i / 4) % 1;
                ctx.strokeStyle = rgba(LAMP, 0.55 * (1 - u) * (1 - c.phase));
                ctx.beginPath(); ctx.arc(hx, hy, u * scene.rim * 1.5 * S, 0, TAU); ctx.stroke();
            }
            ctx.restore();
        }
    }

    function drawVignette() {
        const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.45, cw / 2, ch / 2, Math.max(cw, ch) * 0.8);
        g.addColorStop(0, 'rgba(4,6,30,0)'); g.addColorStop(1, 'rgba(4,6,30,0.45)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    }

    // ------------------------------------------------ labels

    function drawLabels(t, ds) {
        const z = V.zoom;
        const hoverPlace = hovered && hovered.type === 'place' ? hovered.id : null;
        const showSub = z >= 1.7;
        // Era and realm names keep out of each other's way: a name that would land on another is
        // nudged down (then up) by a line, and only dropped if there is still no room. The chosen
        // or hovered one always stays; the shards remain tappable either way.
        const stagger = (str, x, ly, size, opts, must) => {
            const step = size * 1.15;
            for (const k of [0, 1, -1, 2]) {
                if (text(str, x, ly + k * step, { ...opts, size, avoid: !must })) return ly + k * step;
                if (must) return ly;
            }
            return null;
        };
        const eraOrder = scene.eras.slice().sort((a, b) => ((selected && selected.id === b.id) || hoverPlace === b.id) - ((selected && selected.id === a.id) || hoverPlace === a.id));
        for (const e of eraOrder) {
            const x = sx(e.x), y = sy(e.y);
            const size = clamp(10.5 + Math.sqrt(z) * 2.3, 11, 22);
            const isHubEra = Math.hypot(e.x - scene.hub.x, e.y - scene.hub.y) < 5;
            const ly = y + (isHubEra ? Math.max(18, 5.6 * S) : 12 + z);
            const strong = (selected && selected.id === e.id) || hoverPlace === e.id;
            const at = stagger(e.name, x, ly, size, { color: strong ? '#ffffff' : '#fbf1d4', a: 0.95 }, strong);
            if (at != null && showSub && e.sub) text(e.sub, x, at + size * 1.15, { size: Math.max(9.5, size * 0.72), color: rgba(e.light, 0.95), weight: 500, a: 0.9 });
        }
        for (const r of scene.realms) {
            const x = sx(r.x), y = sy(r.y);
            const R = Math.max(10, 3 * S);
            const size = clamp(10 + Math.sqrt(z) * 2, 10.5, 20);
            const strong = (selected && selected.id === r.id) || hoverPlace === r.id;
            const at = stagger(r.name, x, y + R + size * 0.95, size, { color: strong ? '#ffffff' : '#e9f0ff', a: 0.95 }, strong);
            if (at != null && showSub && r.raw.source) text(`『${r.raw.source.work}』`, x, at + size * 1.15, { size: Math.max(9, size * 0.7), color: rgba(r.light, 0.9), weight: 500, a: 0.85 });
        }
        // hub name
        if (scene.hub.d && z >= 1.2) {
            const R = Math.max(13, 4 * S);
            text(scene.hub.d.name_ja.split('・')[0], sx(scene.hub.x), sy(scene.hub.y) - R - 10, { size: clamp(9.5 + z, 10, 15), color: '#fff3c9', weight: 600 });
        }
        // district names: for the focused place, or everywhere once zoomed in
        const focusPlace = selected && selected.type === 'place' ? scene.placeById.get(selected.id)
            : selected && selected.type === 'district' && scene.districtById.get(selected.id) ? scene.districtById.get(selected.id).place : null;
        const hoverD = hovered && hovered.type === 'district' ? hovered.id : null;
        for (const d of scene.districts) {
            if (d.isHub) continue;
            const show = z >= 2.6 || (focusPlace && d.place === focusPlace && z >= 1.4) || hoverD === d.id || (selected && selected.type === 'district' && selected.id === d.id);
            if (!show) continue;
            const x = sx(d.x), y = sy(d.y);
            if (x < -60 || y < -20 || x > cw + 60 || y > ch + 20) continue;
            text(d.name, x, y + 11 + z * 0.8, { size: clamp(9 + z * 0.9, 9.5, 14), color: '#f6efd8', weight: 500, a: 0.95, avoid: true });
        }
    }

    function drawTooltip() {
        if (!hovered || !pointer) return;
        let label = '', sub = '';
        if (hovered.type === 'place') { const p = scene.placeById.get(hovered.id); label = p.name; sub = p.sub; }
        else if (hovered.type === 'district') { const d = scene.districtById.get(hovered.id); label = d.name; sub = d.place ? d.place.name : ''; }
        else if (hovered.type === 'agent') { const a = W.byId.agent.get(hovered.id); const ea = economy.agents.get(hovered.id); label = agentShort(a); sub = ea ? ea.activity : ''; }
        else if (hovered.type === 'creature') { const c = W.byId.creature.get(hovered.id); label = c ? c.name_ja.replace(/（.*）/, '') : ''; sub = c ? c.name_en : ''; }
        else if (hovered.type === 'event') { label = hovered.label || '祭り'; sub = '開催中'; }
        if (!label) return;
        ctx.font = `700 13px ${SERIF}`;
        const w1 = ctx.measureText(label).width;
        ctx.font = `500 11px ${SERIF}`;
        const w2 = sub ? ctx.measureText(sub).width : 0;
        const w = Math.max(w1, w2) + 20, h = sub ? 38 : 24;
        let x = pointer.x + 14, y = pointer.y + 14;
        if (x + w > cw - 6) x = pointer.x - w - 10;
        if (y + h > ch - 6) y = pointer.y - h - 10;
        roundRect(x, y, w, h, 7);
        ctx.fillStyle = 'rgba(10,14,52,.94)'; ctx.fill();
        ctx.strokeStyle = rgba(LAMP, 0.8); ctx.lineWidth = 1; ctx.stroke();
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.font = `700 13px ${SERIF}`; ctx.fillStyle = '#fff3c9'; ctx.fillText(label, x + 10, y + (sub ? 12 : 12));
        if (sub) { ctx.font = `500 11px ${SERIF}`; ctx.fillStyle = '#b9c3ee'; ctx.fillText(sub, x + 10, y + 27); }
    }

    // ------------------------------------------------ frame

    function frame(now) {
        raf = 0;
        if (destroyed) return;
        if (!running) return;
        const t0 = performance.now();
        const dt = Math.min(0.1, last ? (now - last) / 1000 : 0.016);
        last = now;
        const tt = artPaused ? pauseTime : reduce.matches ? 0 : now / 1000;

        // view: tween and inertia
        if (tween) {
            const u = clamp((performance.now() - tween.t0) / tween.dur, 0, 1), e = u * u * (3 - 2 * u);
            V.cx = lerp(tween.from.cx, tween.to.cx, e); V.cy = lerp(tween.from.cy, tween.to.cy, e);
            V.zoom = Math.exp(lerp(Math.log(tween.from.zoom), Math.log(tween.to.zoom), e));
            if (u >= 1) tween = null;
        } else if (!gesture && (Math.abs(fling.x) > 0.05 || Math.abs(fling.y) > 0.05)) {
            V.cx -= fling.x / S; V.cy -= fling.y / S;
            fling.x *= 0.92; fling.y *= 0.92;
            clampView();
        }
        stepInsets(dt);
        layout();
        if (reveal && !tween && !gesture) revealSelected();

        const ds = dayState();
        night = lerp(night, 1 - ds.day, 1 - Math.exp(-dt * 3));
        hits = []; occupied = []; agentLabels = [];
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cw, ch);

        drawSky(tt, ds);
        drawMandala(tt);

        const focusPlace = (hovered && hovered.type === 'place' && hovered.id) || (selected && selected.type === 'place' && selected.id) || null;
        const cached = V.zoom < 2.2;       // zoomed in, the glass is painted live so it stays crisp
        if (cached) drawGlassLayer();
        for (const e of scene.eras) {
            const emphasis = e.id === focusPlace ? 1 : 0;
            drawShard(e, tt, ds, emphasis, cached);
            hits.push({ type: 'place', id: e.id, poly: e.poly, pri: 0 });
        }
        drawRim(tt, ds);
        drawConnections(selected && (selected.type === 'place' || selected.type === 'district') ? selected : hovered && hovered.type === 'place' ? hovered : null);
        drawWash(tt, ds);

        for (const rt of scene.routes) drawRoute(rt, tt, ds);
        for (const r of scene.realms) {
            drawRealm(r, tt, ds, r.id === focusPlace ? 1 : 0);
            const R = Math.max(10, 3 * S);
            hits.push({ type: 'place', id: r.id, x: sx(r.x), y: sy(r.y), r: R * 1.5, pri: 0.5 });
        }
        drawHub(tt, ds);
        drawDistricts(tt, ds, focusPlace ? scene.placeById.get(focusPlace) : null);
        drawEvents(tt);
        drawScales(tt, ds);
        drawCreatures(tt, ds);
        drawAgents(tt, dt, ds);
        drawHourEffects(tt, ds);
        drawVignette();
        drawLabels(tt, ds);
        drawAgentLabels();
        drawTooltip();

        const ms = performance.now() - t0;
        stats.frameMs = lerp(stats.frameMs || ms, ms, 0.1);
        stats.frames++;
        raf = requestAnimationFrame(frame);
    }

    function start() {
        if (!raf && running && !destroyed) { last = 0; raf = requestAnimationFrame(frame); }
    }

    // ------------------------------------------------ input

    function hitTest(px, py, touch) {
        let best = null, bestScore = -1;
        const wxp = wx(px), wyp = wy(py);
        for (const h of hits) {
            let ok = false, score = h.pri;
            if (h.poly) ok = pointInPoly(wxp, wyp, h.poly);
            else ok = Math.hypot(px - h.x, py - h.y) <= h.r + (touch ? 4 : 0);
            if (!ok) continue;
            if (touch) {
                // a fingertip means the nearest thing, not the highest-priority one nearby
                score = h.poly ? -1 + h.pri : 100 * (1 - Math.hypot(px - h.x, py - h.y) / (h.r + 4)) + h.pri * 0.5;
            } else if (!h.poly) score += 1 - Math.hypot(px - h.x, py - h.y) / (h.r + 8);
            if (score > bestScore) { best = h; bestScore = score; }
        }
        return best ? { type: best.type, id: best.id, label: best.label } : null;
    }

    const sameSel = (a, b) => (!a && !b) || (a && b && a.type === b.type && a.id === b.id);

    function localPoint(e) {
        const r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onPointerDown(e) {
        try { canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or already-ended pointer */ }
        const p = localPoint(e);
        pointers.set(e.pointerId, { ...p, touch: e.pointerType === 'touch' });
        fling.x = fling.y = 0;
        tween = null;
        if (pointers.size === 1) {
            gesture = { type: 'pan', moved: 0, lastX: p.x, lastY: p.y, t0: performance.now() };
            tapStart = { ...p, t: performance.now() };
        } else if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            gesture = { type: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: V.zoom, moved: 99 };
            tapStart = null;
        }
    }

    function onPointerMove(e) {
        const p = localPoint(e);
        pointer = p;
        if (!pointers.has(e.pointerId)) {
            const h = hitTest(p.x, p.y, false);
            if (!sameSel(h, hovered)) { hovered = h; canvas.style.cursor = h ? 'pointer' : 'grab'; if (onHover) onHover(h); }
            return;
        }
        pointers.set(e.pointerId, { ...p, touch: pointers.get(e.pointerId).touch });
        if (!gesture) return;
        if (gesture.type === 'pan' && pointers.size === 1) {
            const dx = p.x - gesture.lastX, dy = p.y - gesture.lastY;
            gesture.moved += Math.abs(dx) + Math.abs(dy);
            if (gesture.moved > 6) {
                V.cx -= dx / S; V.cy -= dy / S; clampView();
                fling.x = lerp(fling.x, dx, 0.5); fling.y = lerp(fling.y, dy, 0.5);
                canvas.style.cursor = 'grabbing';
            }
            gesture.lastX = p.x; gesture.lastY = p.y;
        } else if (gesture.type === 'pinch' && pointers.size >= 2) {
            const [a, b] = [...pointers.values()];
            const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
            setZoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, gesture.zoom * (d / gesture.d));
        }
    }

    function onPointerUp(e) {
        const p = localPoint(e);
        const rec = pointers.get(e.pointerId);
        pointers.delete(e.pointerId);
        if (gesture && gesture.type === 'pan' && tapStart && gesture.moved <= 6 && performance.now() - tapStart.t < 600) {
            tap(p, rec && rec.touch);
        }
        if (pointers.size === 0) { gesture = null; canvas.style.cursor = hovered ? 'pointer' : 'grab'; }
        else if (pointers.size === 1) {
            const [q] = [...pointers.values()];
            gesture = { type: 'pan', moved: 99, lastX: q.x, lastY: q.y };
        }
    }

    function tap(p, touch) {
        const now = performance.now();
        if (now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 24) {   // double tap zooms in
            setZoomAt(p.x, p.y, V.zoom * 1.9);
            lastTap = { t: 0, x: 0, y: 0 };
            return;
        }
        lastTap = { t: now, x: p.x, y: p.y };
        const h = hitTest(p.x, p.y, touch);
        selected = h && h.type !== 'event' ? h : h && h.type === 'event' ? null : null;
        if (onSelect) onSelect(selected ? { type: selected.type, id: selected.id } : null);
    }

    function onWheel(e) {
        e.preventDefault();
        const p = localPoint(e);
        tween = null;
        const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
        setZoomAt(p.x, p.y, V.zoom * k);
    }

    function onKey(e) {
        const step = 40 / S;
        const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (map[e.key]) { V.cx += map[e.key][0]; V.cy += map[e.key][1]; clampView(); e.preventDefault(); }
        else if (e.key === '+' || e.key === '=') { setZoomAt(cw / 2, ch / 2, V.zoom * 1.25); e.preventDefault(); }
        else if (e.key === '-' || e.key === '_') { setZoomAt(cw / 2, ch / 2, V.zoom / 1.25); e.preventDefault(); }
        else if (e.key === '0') { focusOn(scene.hub.x, scene.hub.y, 1); e.preventDefault(); }
    }

    function onLeave() { if (hovered) { hovered = null; if (onHover) onHover(null); } pointer = null; }
    const onVisibility = () => {
        running = !document.hidden;
        if (running) start();
    };

    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
    let ro = null;
    if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => resize()); ro.observe(canvas); }
    else window.addEventListener('resize', resize);

    resize();
    start();

    return {
        resize,
        destroy() {
            destroyed = true;
            if (raf) cancelAnimationFrame(raf);
            if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
            document.removeEventListener('visibilitychange', onVisibility);
            canvas.removeEventListener('pointerdown', onPointerDown);
            canvas.removeEventListener('pointermove', onPointerMove);
            canvas.removeEventListener('pointerup', onPointerUp);
            canvas.removeEventListener('pointercancel', onPointerUp);
            canvas.removeEventListener('pointerleave', onLeave);
            canvas.removeEventListener('wheel', onWheel);
            canvas.removeEventListener('keydown', onKey);
        },
        focus(id) {
            const spot = locate(id);
            if (spot) focusOn(spot.x, spot.y, spot.zoom);
        },
        select(sel) { selected = sel || null; reveal = selected && (selected.type === 'agent' || selected.type === 'district') ? selected : null; },
        getView: () => ({ cx: V.cx, cy: V.cy, zoom: V.zoom }),
        setView(v) { Object.assign(V, v); layout(); },
        getStats: () => ({ ...stats }),
        getHits: () => hits.filter(h => !h.poly).map(({ type, id, x, y }) => ({ type, id, x, y })),
        zoomBy(f) { setZoomAt(cw / 2, ch / 2, V.zoom * f); },
        pauseArtwork,
        reset() { focusOn(scene.hub.x, scene.hub.y, 1); }
    };
}

// For the sr-only list and the legend: what a place's map feel is.
export function mapLegend() {
    return Object.entries(VIA).map(([id, v]) => ({ id, label: v.label }));
}
