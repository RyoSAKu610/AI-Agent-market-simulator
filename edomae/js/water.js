// 江戸前 Edomae — water you can touch. Surfaces (river, stream, pond, sea, tub, puddle)
// carry a height field (watermath.js) that ripples and settles; things that touch them
// raise ripple rings, droplets and splash crowns.
//
// The look follows a careful splash drawing in ink: the crown is a set of solid tongues
// with a confident contour (thin on the lit side, heavy on the shadow side), a body tone
// with a darker underside, broken paper-white rim strokes on the lit edge and a crisp
// specular dot near each bulbous tip; tips pinch off into droplets that fly ballistic
// arcs and leave small rings. Rings lie on the surface as flattened ellipses with a pale
// crest arc and a dark trough arc, broken, overlapping. Reflections are horizontal
// slivers that the ripples displace: glitter by day, lantern and moon light by night.
//
// Highlights go on a layer outside the ink-wobble filter (`hl`) so they stay crisp; warm
// light goes on the screen-blended glow layer (`gl`). Everything is pooled; update()
// does nothing for surfaces whose place is off screen (the caller only calls it then).

import { el, f, pt, PAPER } from './lib/ink.js';
import { clamp, lerp, smooth } from './lib/motion.js';
import { toRGB, rgb, mix } from './lib/daynight.js';
import { createHeightField, ringAt, createPool, crownKeys } from './watermath.js';

const G = 160;                          // gravity for droplets, scene units/s²
const NIGHT_WATER = [24, 30, 56];
const TONES = {
    river: ['#a6c0c6', '#6d8f9b', '#4f6f7c'], pond: ['#a9c4b6', '#6e9384', '#4f7264'], sea: ['#9cc6cc', '#5f9aa4', '#3f7480'],
    stream: ['#b4ccd0', '#7e9ea6', '#5d7f88'], tub: ['#a6c0c6', '#6d8f9b', '#4f6f7c'], puddle: ['#b9c4c4', '#8f9c9e', '#5e6a6c']
};
const tone = (c, P, k = 0.78) => rgb(mix(toRGB(c), NIGHT_WATER, P.inkT * k));
// highlights: paper-white by day, pale ink at night (never a white blob on indigo)
const hiCol = P => rgb(mix([255, 255, 255], P.ink, P.inkT));

let uid = 0;

// ctx: { g, hl, gl, rnd }  opts: { x0, x1, yTop (far bank), yBot (near bank), kind, lights: () => [{x, y, lit}] }
export function createSurface(ctx, { x0, x1, yTop = -8, yBot = 0, kind = 'river', lights = null, flow = 0.6, shape = 'band' } = {}) {
    const { g, hl, gl } = ctx;
    const rnd = ctx.rnd || Math.random;
    const W = x1 - x0, depth = yBot - yTop;
    const [cA, cB, cC] = TONES[kind] || TONES.river;
    const field = createHeightField(Math.max(8, Math.round(W / 2) + 1), { dx: W / Math.max(7, Math.round(W / 2)), c: kind === 'puddle' || kind === 'tub' ? 22 : 30 });
    const id = `w${uid++}`;
    // clip rings and slivers to the water
    const defs = el('defs', {}, g);
    const clip = el('clipPath', { id: `${id}-c` }, defs);
    const clipShape = shape === 'ellipse'
        ? el('ellipse', { cx: f((x0 + x1) / 2), cy: f((yTop + yBot) / 2), rx: f(W / 2), ry: f(depth / 2) }, clip)
        : el('path', { d: `M${f(x0)} ${f(yTop - 3)} L${f(x1)} ${f(yTop - 3)} L${f(x1)} ${f(yBot)} L${f(x0)} ${f(yBot)}Z` }, clip);
    const root = el('g', { class: 'water' }, g);
    const body = el('path', { stroke: 'none' }, root);
    const deep = el('path', { stroke: 'none' }, root);
    const wet = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.1, 'stroke-linecap': 'round', opacity: 0.55 }, root);
    const surf = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 0.74, 'stroke-linejoin': 'round' }, root);
    const strokes = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 0.42, 'stroke-linecap': 'round', 'clip-path': `url(#${id}-c)` }, root);
    const ringsG = el('g', { 'clip-path': `url(#${id}-c)` }, root);
    const hiRoot = el('g', {}, hl);
    const hiStrokes = el('path', { fill: 'none', 'stroke-width': 0.42, 'stroke-linecap': 'round' }, hiRoot);
    const glowRoot = el('g', {}, gl);
    // ellipse surfaces (puddles, tubs) are drawn as a lens; band surfaces as a strip under the far bank
    if (shape === 'ellipse') { body.setAttribute('d', ellipseD((x0 + x1) / 2, (yTop + yBot) / 2, W / 2, depth / 2)); deep.setAttribute('d', ellipseD((x0 + x1) / 2, (yTop + yBot) / 2 + depth * 0.18, W * 0.42, depth * 0.3)); }

    // --- far, calm strokes and near, busy ones (drift with the flow and the wind)
    const marks = Array.from({ length: Math.max(6, Math.round(W / 9)) }, (_, i) => {
        const v = rnd();                          // 0 far … 1 near
        return { x: x0 + rnd() * W, v, len: lerp(14, 4, v) * (0.7 + 0.6 * rnd()), sp: lerp(2, 7, v) * (0.6 + 0.8 * rnd()) };
    });

    // --- ripple rings
    const rings = createPool(10, () => ({ trough: el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 0.6, 'stroke-linecap': 'round', 'stroke-dasharray': '5 1.6 2 1.2', style: 'display:none' }, ringsG),
        crest: el('path', { fill: 'none', 'stroke-width': 0.4, 'stroke-linecap': 'round', 'stroke-dasharray': '3 2.2 6 1.4', style: 'display:none' }, hiRoot), x: 0, y: 0, t: 0, a0: 1, sp: 14, persp: 0.24 }));

    // --- droplets
    const drops = createPool(26, () => ({ n: el('path', { 'stroke-width': 0.38, stroke: 'currentColor', style: 'display:none' }, root),
        hi: el('circle', { r: 0.4, style: 'display:none' }, hiRoot), x: 0, y: 0, vx: 0, vy: 0, r: 1 }));

    // --- splash crowns
    const NT = 5;
    const crowns = createPool(3, () => {
        const cg = el('g', { style: 'display:none' }, root);
        const sheet = el('path', { stroke: 'currentColor', 'stroke-width': 0.6, 'stroke-linejoin': 'round' }, cg);
        const holes = el('path', { fill: PAPER, stroke: 'currentColor', 'stroke-width': 0.35 }, cg);
        const jet = el('path', { stroke: 'currentColor', 'stroke-width': 0.6, 'stroke-linejoin': 'round' }, cg);
        const tongues = Array.from({ length: NT }, () => ({ body: el('path', { stroke: 'currentColor', 'stroke-width': 0.55, 'stroke-linejoin': 'round' }, cg), shade: el('path', { stroke: 'none' }, cg), heavy: el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 0.95, 'stroke-linecap': 'round' }, cg) }));
        const hg = el('g', { style: 'display:none' }, hiRoot);
        const rims = el('path', { fill: 'none', 'stroke-width': 0.45, 'stroke-linecap': 'round', 'stroke-dasharray': '2.2 0.8 1 0.7' }, hg);
        const specs = el('path', { stroke: 'none' }, hg);
        return { cg, hg, sheet, holes, jet, tongues, rims, specs, x: 0, y: 0, t: 0, dur: 0.85, size: 1, seed: 1, thrown: 0 };
    });

    // --- reflections: glitter by day (crisp, on the highlight layer), light by night (glow layer)
    const glints = Array.from({ length: 7 }, () => ({ n: el('path', { fill: 'none', 'stroke-width': 0.7, 'stroke-linecap': 'round' }, hiRoot), x: x0 + rnd() * W, y: lerp(yTop + 1, yBot - 1, rnd()), ph: rnd() * 6, len: 2 + rnd() * 5 }));
    const slivers = Array.from({ length: 10 }, () => ({ n: el('path', { fill: 'none', stroke: '#ffd08a', 'stroke-width': 0.9, 'stroke-linecap': 'round', opacity: 0 }, glowRoot), j: rnd() }));
    let lightList = null;
    let lastInk = -1, poked = 0, t0 = 0;

    function ellipseD(cx, cy, rx, ry) { return `M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0 a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`; }
    // surface height at x (units, up negative) and the y of the water plane at depth v (0 far … 1 near)
    const hAt = x => clamp(field.sample(x - x0), -3, 3);
    const yAt = v => lerp(yTop, yBot, v);

    function ring(x, y, a0 = 1, sp = 14) {
        const r = rings.acquire(); if (!r) return;
        r.x = x; r.y = y; r.t = 0; r.a0 = a0; r.sp = sp; r.persp = 0.2 + 0.14 * ((y - yTop) / Math.max(1, depth));
        r.trough.style.display = ''; r.crest.style.display = '';
    }
    function drop(x, y, vx, vy, rr) {
        const d = drops.acquire(); if (!d) return;
        Object.assign(d, { x, y, vx, vy, r: rr, yS: y + 0.01 });
        d.n.style.display = ''; d.hi.style.display = '';
    }

    const api = {
        kind, x0, x1, yTop, yBot, field, rings, drops, crowns, lens: false,
        // a gentle disturbance (a fin, a dragonfly, a raindrop)
        poke(x, s = 1, v = 0.5) {
            field.poke(x - x0, -s * 14, 2.5);
            ring(x, yAt(v), s, 12 + 6 * s);
            poked = Math.min(1, poked + 0.2 * s);
        },
        // a splash: crown, droplets, a ring and a push to the surface
        splash(x, size = 1, v = 0.55) {
            x = clamp(x, x0 + 2, x1 - 2);
            const y = yAt(v);
            field.poke(x - x0, -size * 12, 3);
            ring(x, y, 1.3 * size, 16);
            ring(x, y, 0.8 * size, 8);                 // an inner ring trails the outer one
            const c = crowns.acquire();
            if (c) { Object.assign(c, { x, y, t: 0, size, seed: (x * 7.13 + size * 3.1) % 97, thrown: 0, dur: 0.75 + 0.2 * size }); c.cg.style.display = ''; c.hg.style.display = ''; }
            // a fine spray further out, thrown at once
            for (let i = 0; i < Math.round(4 + 6 * size); i++) {
                const a = (rnd() - 0.5) * 2.2, sp = (30 + 40 * rnd()) * Math.sqrt(size);
                drop(x + Math.sin(a) * 2, y - 1, Math.sin(a) * sp, -Math.cos(a) * sp - 10 * size, 0.35 + 0.35 * rnd());
            }
        },
        // a raindrop: a small ring and, now and then, a tiny coronet
        rain(x, v) {
            const y = yAt(v);
            field.poke(x - x0, -4, 1.5);
            ring(x, y, 0.55, 10);
            if (rnd() < 0.18) for (let i = 0; i < 2; i++) drop(x, y - 0.5, (rnd() - 0.5) * 18, -14 - rnd() * 10, 0.3);
        },
        setLights(fn) { lights = fn; lightList = null; },
        update(t, dt, wind, P) {
            t0 = t;
            // the current and the wind keep the surface alive (small, seeded pokes, not a sine)
            const rate = (flow + Math.abs(wind) * 1.6) * W / 60;
            if (rnd() < rate * dt) field.poke(rnd() * W, (rnd() - 0.5) * (3 + Math.abs(wind) * 6), 2 + rnd() * 3);
            field.step(dt);
            if (Math.abs(P.inkT - lastInk) > 0.01) {
                lastInk = P.inkT;
                if (shape === 'ellipse') { body.setAttribute('fill', tone(cA, P)); deep.setAttribute('fill', tone(cB, P)); }
                else { body.setAttribute('fill', tone(cA, P)); deep.setAttribute('fill', tone(cB, P)); }
                for (const c of crowns.items) { c.sheet.setAttribute('fill', tone(cA, P)); c.jet.setAttribute('fill', tone(cA, P)); for (const tg of c.tongues) { tg.body.setAttribute('fill', tone(cA, P)); tg.shade.setAttribute('fill', tone(cC, P)); } }
                for (const d of drops.items) d.n.setAttribute('fill', tone(cA, P));
                const hc = hiCol(P);
                hiStrokes.setAttribute('stroke', hc);
                for (const r of rings.items) r.crest.setAttribute('stroke', hc);
                for (const d of drops.items) d.hi.setAttribute('fill', hc);
                for (const c of crowns.items) { c.rims.setAttribute('stroke', hc); c.specs.setAttribute('fill', hc); }
                for (const gg of glints) gg.n.setAttribute('stroke', hc);
            }
            // --- the surface line, the body and the near-bank shade (band surfaces)
            if (shape !== 'ellipse') {
                const pts = [];
                for (let x = x0; x <= x1 + 0.01; x += 3) pts.push([x, yTop + hAt(x)]);
                const top = 'M' + pts.map(pt).join('L');
                surf.setAttribute('d', top);
                body.setAttribute('d', `${top} L${f(x1)} ${f(yBot)} L${f(x0)} ${f(yBot)}Z`);
                const midY = lerp(yTop, yBot, 0.55);
                deep.setAttribute('d', `M${f(x0)} ${f(midY)} Q${f((x0 + x1) / 2)} ${f(midY - 0.8 + hAt((x0 + x1) / 2) * 0.3)} ${f(x1)} ${f(midY)} L${f(x1)} ${f(yBot)} L${f(x0)} ${f(yBot)}Z`);
                wet.setAttribute('d', `M${f(x0 - 1)} ${f(yBot + 0.6)} L${f(x1 + 1)} ${f(yBot + 0.6)}`);
            } else if (!api.lens) {
                // a puddle: a thin broken rim (not a lid), a darker wet ring of street round it
                api.lens = true;
                surf.setAttribute('d', `M${f(x0 + W * 0.08)} ${f((yTop + yBot) / 2 - depth * 0.42)} A${f(W / 2)} ${f(depth / 2)} 0 0 1 ${f(x1 - W * 0.04)} ${f((yTop + yBot) / 2 + depth * 0.1)} M${f(x0 + W * 0.2)} ${f(yBot - 0.2)} A${f(W / 2)} ${f(depth / 2)} 0 0 1 ${f(x0 + 0.4)} ${f((yTop + yBot) / 2)}`);
                surf.setAttribute('stroke-width', 0.45);
                wet.setAttribute('d', ellipseD((x0 + x1) / 2, (yTop + yBot) / 2 + 0.3, W / 2 + 1.8, depth / 2 + 0.9));
                wet.setAttribute('stroke-width', 2.2); wet.setAttribute('opacity', 0.16);
            }
            // --- strokes on the water: long and calm far away, short and busy near
            const d = [], hd = [];
            for (const m of marks) {
                m.x += (m.sp * (kind === 'river' || kind === 'stream' || kind === 'sea' ? 1 : 0.15) + wind * lerp(2, 6, m.v)) * dt;
                if (m.x > x1) m.x -= W; if (m.x < x0) m.x += W;
                const y = yAt(lerp(0.15, 0.9, m.v)) + hAt(m.x) * lerp(0.3, 1, m.v);
                const tilt = field.slope(m.x - x0) * 6;
                const seg = `M${f(m.x)} ${f(y)} q${f(m.len / 2)} ${f(-0.5 + tilt)} ${f(m.len)} ${f(tilt * 0.5)}`;
                let near = false;
                for (const c of crowns.items) if (c.alive && Math.abs(m.x + m.len / 2 - c.x) < 9 * c.size) near = true;
                if (!near) (m.v < 0.45 ? hd : d).push(seg);
            }
            strokes.setAttribute('d', d.join(' '));
            hiStrokes.setAttribute('d', hd.join(' '));
            hiStrokes.setAttribute('opacity', f(0.55 * (1 - P.inkT * 0.4)));
            // --- rings: expand at the wave speed and fade; crest (pale, far side) and trough (dark, near side)
            for (const r of rings.items) if (r.alive) {
                r.t += dt;
                const { r: rad, a } = ringAt(r.t, { speed: r.sp, a0: r.a0 });
                if (a < 0.04 || rad > W) { r.trough.style.display = 'none'; r.crest.style.display = 'none'; rings.release(r); continue; }
                const ry = rad * r.persp;
                r.trough.setAttribute('d', `M${f(r.x - rad)} ${f(r.y)} A${f(rad)} ${f(ry)} 0 0 0 ${f(r.x + rad)} ${f(r.y)}`);
                r.crest.setAttribute('d', `M${f(r.x - rad * 0.92)} ${f(r.y - 0.4)} A${f(rad * 0.92)} ${f(ry * 0.92)} 0 0 1 ${f(r.x + rad * 0.92)} ${f(r.y - 0.4)} M${f(r.x - rad * 0.55)} ${f(r.y + ry * 0.2)} A${f(rad * 0.55)} ${f(ry * 0.55)} 0 0 0 ${f(r.x + rad * 0.55)} ${f(r.y + ry * 0.2)}`);
                r.trough.setAttribute('opacity', f(Math.min(1, a * 1.2)));
                r.crest.setAttribute('opacity', f(Math.min(1, a * 1.4)));
                r.trough.setAttribute('stroke-width', f(0.35 + 0.5 * a));
            }
            // --- droplets on ballistic arcs; they leave a small ring where they land
            for (const dp of drops.items) if (dp.alive) {
                dp.vy += G * dt; dp.x += dp.vx * dt; dp.y += dp.vy * dt;
                if (dp.y >= dp.yS && dp.vy > 0) { if (dp.x > x0 && dp.x < x1) { ring(dp.x, dp.yS, 0.3 + dp.r * 0.4, 9); field.poke(dp.x - x0, -dp.r * 6, 1.2); } dp.n.style.display = 'none'; dp.hi.style.display = 'none'; drops.release(dp); continue; }
                const a = Math.atan2(dp.vy, dp.vx), stretch = clamp(Math.hypot(dp.vx, dp.vy) / 80, 0, 0.9);
                const rx = dp.r * (1 + stretch), ry = dp.r * (1 - stretch * 0.3);
                dp.n.setAttribute('d', `${ellipseD(0, 0, rx, ry)}`);
                dp.n.setAttribute('transform', `translate(${f(dp.x)} ${f(dp.y)}) rotate(${f(a * 57.3)})`);
                dp.hi.setAttribute('cx', f(dp.x - dp.r * 0.35)); dp.hi.setAttribute('cy', f(dp.y - dp.r * 0.4)); dp.hi.setAttribute('r', f(Math.max(0.22, dp.r * 0.38)));
            }
            // --- splash crowns: keyed rise → open → pinch off → fall
            for (const c of crowns.items) if (c.alive) {
                c.t += dt;
                const u = c.t / c.dur;
                if (u >= 1) { c.cg.style.display = 'none'; c.hg.style.display = 'none'; crowns.release(c); continue; }
                drawCrown(c, crownKeys(u, NT, c.size, c.seed));
            }
            // --- reflections
            const day = 1 - P.inkT;
            for (const gg of glints) {
                const tw = Math.max(0, Math.sin(t * 2.3 + gg.ph * 3 + hAt(gg.x) * 2));
                const x = gg.x + field.slope(gg.x - x0) * 8;
                gg.n.setAttribute('d', `M${f(x)} ${f(gg.y + hAt(gg.x) * 0.6)} l${f(gg.len * tw)} 0`);
                gg.n.setAttribute('opacity', f(tw * (0.35 + 0.6 * day) * (1 - P.lamp * 0.6)));
            }
            if (!lightList && lights) lightList = lights();
            let k = 0;
            const night = smooth(0.25, 0.6, P.lamp);
            if (night > 0.01) {
                // lanterns and lit windows above the water, broken into slivers that the ripples move
                for (const L of lightList || []) {
                    if (k >= slivers.length - 2) break;
                    const lit = typeof L.lit === 'function' ? L.lit() : L.lit;
                    if (!(lit > 0.05) || L.x < x0 || L.x > x1) continue;
                    for (let j = 0; j < 2 && k < slivers.length - 2; j++, k++) {
                        const s = slivers[k], v = 0.25 + j * 0.4, y = yAt(v), dx = field.slope(L.x - x0) * 10 + Math.sin(t * 3 + s.j * 9) * 0.6;
                        const w = (3 + 4 * s.j) * (1 - j * 0.3);
                        s.n.setAttribute('d', `M${f(L.x + dx - w / 2)} ${f(y + hAt(L.x) * 0.5)} l${f(w)} 0`);
                        s.n.setAttribute('opacity', f(lit * night * (0.9 - j * 0.3)));
                        s.n.setAttribute('stroke', L.cool ? '#cfe6ff' : '#ffd08a');
                    }
                }
                // the moon's path: a short column of pale slivers mid-stream
                for (let j = 0; j < 2; j++, k++) {
                    const s = slivers[k], mx = (x0 + x1) / 2 + Math.sin(s.j * 7) * W * 0.2, y = yAt(0.2 + j * 0.45);
                    const w = (4 + 3 * j) * (0.6 + 0.4 * Math.abs(Math.sin(t * 1.7 + s.j * 5)));
                    s.n.setAttribute('d', `M${f(mx + field.slope(mx - x0) * 9 - w / 2)} ${f(y + hAt(mx) * 0.5)} l${f(w)} 0`);
                    s.n.setAttribute('opacity', f(P.night * 0.55));
                    s.n.setAttribute('stroke', '#e9e4ff');
                }
            }
            for (; k < slivers.length; k++) slivers[k].n.setAttribute('opacity', 0);
            poked = Math.max(0, poked - dt);
        },
        hit: null
    };

    // tapping the water drops a pebble there: the world splashes back
    const hit = el('path', { d: shape === 'ellipse' ? ellipseD((x0 + x1) / 2, (yTop + yBot) / 2, W / 2, depth / 2) : `M${f(x0)} ${f(yTop - 2)} L${f(x1)} ${f(yTop - 2)} L${f(x1)} ${f(yBot)} L${f(x0)} ${f(yBot)}Z`, fill: 'transparent', class: 'water-hit', style: 'cursor:pointer' }, root);
    api.hit = hit;

    function drawCrown(c, K) {
        const { x, y } = c;
        const n = K.tongues.length;
        const spread = 1.6 * c.size;
        const rimD = [], specD = [], holeD = [];
        let sheetL = null, sheetR = null;
        K.tongues.forEach((tg, i) => {
            const T = c.tongues[i];
            const s = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
            const bx = x + s * spread, by = y;
            const dir = [Math.sin(tg.lean), -Math.cos(tg.lean)], per = [Math.cos(tg.lean), Math.sin(tg.lean)];
            const L = Math.max(0.01, tg.len), r = tg.bulb, w = tg.base;
            const tip = [bx + dir[0] * L, by + dir[1] * L];
            if (i === 0) sheetL = [bx + dir[0] * L * 0.38, by + dir[1] * L * 0.38];
            if (i === n - 1) sheetR = [bx + dir[0] * L * 0.38, by + dir[1] * L * 0.38];
            if (L < 0.4) { T.body.setAttribute('d', ''); T.shade.setAttribute('d', ''); T.heavy.setAttribute('d', ''); return; }
            // throw the tip off as a droplet the moment it pinches
            if (tg.pinched && !(c.thrown & (1 << i))) {
                c.thrown |= 1 << i;
                const v = 55 * c.size * (0.6 + 0.4 * tg.jit);
                drop(tip[0], tip[1], dir[0] * v, dir[1] * v, r * 0.8);
            }
            const rr = tg.pinched ? r * 0.35 : r;
            const neck = 0.72 * L;
            const nL = [bx + dir[0] * neck - per[0] * rr * 0.55, by + dir[1] * neck - per[1] * rr * 0.55];
            const nR = [bx + dir[0] * neck + per[0] * rr * 0.55, by + dir[1] * neck + per[1] * rr * 0.55];
            const bL = [bx - per[0] * w, by - per[1] * w], bR = [bx + per[0] * w, by + per[1] * w];
            const cL = [bx + dir[0] * L * 0.35 - per[0] * w * 0.6, by + dir[1] * L * 0.35 - per[1] * w * 0.6];
            const cR = [bx + dir[0] * L * 0.35 + per[0] * w * 0.6, by + dir[1] * L * 0.35 + per[1] * w * 0.6];
            // a tapering tongue with a bulbous tip
            T.body.setAttribute('d', `M${pt(bL)} Q${pt(cL)} ${pt(nL)} A${f(rr)} ${f(rr)} 0 1 1 ${pt(nR)} Q${pt(cR)} ${pt(bR)}Z`);
            // its underside in the darker tone (the side away from the light, upper left)
            const mid = [bx + dir[0] * L * 0.5, by + dir[1] * L * 0.5];
            T.shade.setAttribute('d', `M${pt([bx, by])} Q${pt(mid)} ${pt([tip[0] - dir[0] * rr * 0.4, tip[1] - dir[1] * rr * 0.4])} L${pt(nR)} Q${pt(cR)} ${pt(bR)}Z`);
            // thick contour on the shadow side
            // thick contour only round the shadow side of the bulb (lower right), thin elsewhere
            const arcP = a => [tip[0] + rr * (Math.cos(a) * per[0] + Math.sin(a) * dir[0]), tip[1] + rr * (Math.cos(a) * per[1] + Math.sin(a) * dir[1])];
            T.heavy.setAttribute('d', 'M' + [0.45, 0.1, -0.3, -0.7, -1.05].map(a => pt(arcP(a))).join('L'));
            // broken paper-white rims: a short one up the lit edge of the neck, one round the lit side of the bulb
            const rM = [lerp(cL[0], nL[0], 0.35) + per[0] * 0.35, lerp(cL[1], nL[1], 0.35) + per[1] * 0.35];
            const rT = [nL[0] + per[0] * 0.3, nL[1] + per[1] * 0.3];
            rimD.push(`M${pt(rM)} L${pt(rT)}`);
            rimD.push('M' + [Math.PI - 0.2, Math.PI * 0.75, Math.PI * 0.55].map(a => pt([tip[0] + rr * 0.7 * (Math.cos(a) * per[0] + Math.sin(a) * dir[0]), tip[1] + rr * 0.7 * (Math.cos(a) * per[1] + Math.sin(a) * dir[1])])).join('L'));
            const sp = [tip[0] - per[0] * rr * 0.35 - dir[0] * rr * 0.1, tip[1] - per[1] * rr * 0.35 - dir[1] * rr * 0.1];
            specD.push(ellipseD(sp[0], sp[1], Math.max(0.25, rr * 0.32), Math.max(0.2, rr * 0.24)));
        });
        // the thin sheet between the tongues, torn with holes as it opens
        if (sheetL && sheetR && K.sheet > 0.05) {
            const top = y - 3.4 * c.size * K.sheet;
            c.sheet.setAttribute('d', `M${f(x - spread - 1.5 * c.size)} ${f(y)} Q${pt(sheetL)} ${f(x)} ${f(top)} Q${pt(sheetR)} ${f(x + spread + 1.5 * c.size)} ${f(y)}Z`);
            if (K.sheet > 0.5) { holeD.push(ellipseD(x - spread * 0.4, top + 1.6 * c.size, 0.7 * c.size, 0.45 * c.size), ellipseD(x + spread * 0.5, top + 2 * c.size, 0.5 * c.size, 0.35 * c.size)); }
        } else c.sheet.setAttribute('d', '');
        c.holes.setAttribute('d', holeD.join(' '));
        // the central jet
        if (K.jet > 0.3) { const jw = 0.9 * c.size, jt = y - K.jet; c.jet.setAttribute('d', `M${f(x - jw)} ${f(y)} Q${f(x - jw * 0.4)} ${f(jt + jw * 2)} ${f(x - jw * 0.3)} ${f(jt + jw)} A${f(jw * 0.6)} ${f(jw * 0.6)} 0 1 1 ${f(x + jw * 0.3)} ${f(jt + jw)} Q${f(x + jw * 0.4)} ${f(jt + jw * 2)} ${f(x + jw)} ${f(y)}Z`); specD.push(ellipseD(x - jw * 0.25, jt + jw * 0.6, 0.3 * c.size, 0.25 * c.size)); }
        else c.jet.setAttribute('d', '');
        c.rims.setAttribute('d', rimD.join(' '));
        c.specs.setAttribute('d', specD.join(' '));
    }
    return api;
}

