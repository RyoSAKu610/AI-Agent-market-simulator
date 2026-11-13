// 江戸前 Edomae — the drawing kit for architecture and street furniture.
// Buildings are street elevations drawn in building space: x centred on 0, the
// base on y = 0, up is negative. Every helper creates its nodes once; the few
// things that live (windows, lanterns, noren, lamps, smoke, clocks) return small
// objects with draw(...) that only rewrite attributes.

import { el, pen, shape, blot, f, pt, PAPER } from './lib/ink.js';
import { pendulum, clamp, lerp, smooth, ease, seeded } from './lib/motion.js';
import { toRGB, rgb, mix } from './lib/daynight.js';

export const SP = 0.74;                     // scene pen: figure pen × figure scale, shared by all architecture
export const JP = '"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","IPAMincho",serif';
export const RED = toRGB('#b3412d'), RED_NIGHT = toRGB('#6e2a22'), WARM = toRGB('#ffcf7e'), WARM_DEEP = toRGB('#f3a54d');
export const GOLD = '#c9a23a';

export const P = (g, d, w = SP) => { const n = pen(g, w); n.setAttribute('d', d); return n; };
export const S = (g, d, w = SP) => { const n = shape(g, w); n.setAttribute('d', d); return n; };
export const B = (g, d) => { const n = blot(g); n.setAttribute('d', d); return n; };
export const C = (g, d, colour, w = SP) => el('path', { d, fill: colour, stroke: 'currentColor', 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'data-tint': colour }, g);
export const G = parent => el('g', {}, parent);
export const rect = (x0, y0, x1, y1) => `M${f(x0)} ${f(y0)} L${f(x1)} ${f(y0)} L${f(x1)} ${f(y1)} L${f(x0)} ${f(y1)}Z`;
// a wall edge that bows a hair, so nothing is ruler-straight
export const wallRect = (x0, y0, x1, y1, bow = 0.5) => `M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2)} ${f(y0 - bow)} ${f(x1)} ${f(y0)} Q${f(x1 + bow)} ${f((y0 + y1) / 2)} ${f(x1)} ${f(y1)} L${f(x0)} ${f(y1)} Q${f(x0 - bow)} ${f((y0 + y1) / 2)} ${f(x0)} ${f(y0)}Z`;
export const oval = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0 a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;

export function text(g, x, y, s, size, { vertical = false, weight = 600, anchor = 'middle', fill = 'currentColor', fit = 0, opacity = 1 } = {}) {
    const n = el('text', { x: f(x), y: f(y), 'font-size': f(size), 'font-family': JP, 'font-weight': weight, fill, 'text-anchor': anchor, 'dominant-baseline': 'central', opacity }, g);
    if (vertical) { n.setAttribute('writing-mode', 'vertical-rl'); n.setAttribute('text-orientation', 'upright'); }
    if (fit) { n.setAttribute('textLength', f(fit)); n.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    n.textContent = s;
    return n;
}

// ------------------------------------------------------------------ roofs

/** Tiled roof seen from the street: sweeping eave, round tile ends, tile channels to the ridge, rafter ends, stacked ridge. */
export function tileRoof(g, { x0, x1, eave, ridge, inset, tile = 5.4, sori = 2.6, depth = 2.4, oni = true, rafters = true, fill = null }) {
    const cx = (x0 + x1) / 2, half = (x1 - x0) / 2;
    const eaveY = x => eave - sori * Math.pow(Math.abs(x - cx) / half, 2.2);
    const body = fill ? C(g, '', fill) : S(g, '');
    body.setAttribute('d', `M${f(x0)} ${f(eaveY(x0))} Q${f(cx)} ${f(eave + sori * 0.6)} ${f(x1)} ${f(eaveY(x1))} L${f(x1 - inset)} ${f(ridge)} L${f(x0 + inset)} ${f(ridge)}Z`);
    const ch = [], ends = [];
    for (let x = x0 + tile * 0.8; x < x1 - tile * 0.4; x += tile) {
        const t = (x - x0) / (x1 - x0), ey = eaveY(x) - 0.4;
        const top = lerp(x0 + inset, x1 - inset, t);
        ch.push(`M${f(x)} ${f(ey - 1.4)} Q${f(lerp(x, top, 0.5) + (t - 0.5) * 2)} ${f(lerp(ey, ridge, 0.55))} ${f(top)} ${f(ridge + 1)}`);
        ends.push(oval(x, ey, 1.25, 1.25));
    }
    P(g, ch.join(' '), SP * 0.48);
    S(g, ends.join(' '), SP * 0.5);
    P(g, `M${f(x0 + 1)} ${f(eaveY(x0) + depth)} Q${f(cx)} ${f(eave + sori * 0.6 + depth)} ${f(x1 - 1)} ${f(eaveY(x1) + depth)}`, SP * 0.7);
    if (rafters) {
        const r = [];
        for (let x = x0 + 4.6; x < x1 - 3; x += 4.2) r.push(`M${f(x)} ${f(eaveY(x) + depth + 0.6)} l0 1.7`);
        P(g, r.join(' '), SP * 0.55);
    }
    const rx0 = x0 + inset - 4, rx1 = x1 - inset + 4;
    S(g, `M${f(rx0)} ${f(ridge - 5)} Q${f(cx)} ${f(ridge - 5.6)} ${f(rx1)} ${f(ridge - 5)} L${f(rx1)} ${f(ridge + 0.5)} L${f(rx0)} ${f(ridge + 0.5)}Z`, SP * 0.9);
    P(g, `M${f(rx0)} ${f(ridge - 2.4)} L${f(rx1)} ${f(ridge - 2.4)}`, SP * 0.45);
    if (oni) [rx0, rx1].forEach((x, i) => {
        const s = i ? 1 : -1;
        S(g, `M${f(x)} ${f(ridge + 0.5)} L${f(x)} ${f(ridge - 6)} Q${f(x + s * 0.5)} ${f(ridge - 10.6)} ${f(x + s * 4.4)} ${f(ridge - 11.4)} Q${f(x + s * 6.2)} ${f(ridge - 8.6)} ${f(x + s * 4.8)} ${f(ridge - 5.8)} L${f(x + s * 4.8)} ${f(ridge + 0.5)}Z`, SP * 0.8);
    });
    return body;
}

/** A small pent roof (hisashi) over a ground floor. */
export function hisashi(g, x0, x1, y, drop = 9, opts = {}) {
    return tileRoof(g, { x0, x1, eave: y + drop, ridge: y, inset: 2, tile: 5, sori: 1.4, oni: false, ...opts });
}

/** Thatched roof: a heavy mound with combed straw lines and a ridge cap. */
export function thatchRoof(g, { x0, x1, eave, ridge, inset = 18, round = 0.4, cap = true, rnd }) {
    const cx = (x0 + x1) / 2;
    S(g, `M${f(x0)} ${f(eave)} Q${f(x0 + inset * round)} ${f(lerp(eave, ridge, 0.55))} ${f(x0 + inset)} ${f(ridge)} L${f(x1 - inset)} ${f(ridge)} Q${f(x1 - inset * round)} ${f(lerp(eave, ridge, 0.55))} ${f(x1)} ${f(eave)} Q${f(cx)} ${f(eave + 2.4)} ${f(x0)} ${f(eave)}Z`, SP * 1.05);
    const d = [];
    for (let x = x0 + 4; x < x1 - 3; x += 3.6) {
        const t = (x - x0) / (x1 - x0), top = lerp(x0 + inset, x1 - inset, t) + (rnd ? rnd(-0.8, 0.8) : 0);
        d.push(`M${f(x)} ${f(eave + 0.6)} Q${f(lerp(x, top, 0.4))} ${f(lerp(eave, ridge, 0.5) + 1)} ${f(top)} ${f(ridge + 4 + (rnd ? rnd(0, 6) : 3))}`);
    }
    P(g, d.join(' '), SP * 0.4);
    P(g, `M${f(x0 + 2)} ${f(eave - 3)} Q${f(cx)} ${f(eave - 0.6)} ${f(x1 - 2)} ${f(eave - 3)}`, SP * 0.6);
    if (cap) {
        S(g, `M${f(x0 + inset - 5)} ${f(ridge + 1)} Q${f(cx)} ${f(ridge - 3)} ${f(x1 - inset + 5)} ${f(ridge + 1)} L${f(x1 - inset + 3)} ${f(ridge - 4)} Q${f(cx)} ${f(ridge - 7.4)} ${f(x0 + inset - 3)} ${f(ridge - 4)}Z`, SP * 0.8);
        const k = [];
        for (let x = x0 + inset; x < x1 - inset; x += 9) k.push(`M${f(x)} ${f(ridge - 5)} l1.6 5.4`);
        P(g, k.join(' '), SP * 0.6);
    }
}

// ------------------------------------------------------------------ walls and openings

/** Sen-bon kōshi: fine slats with a rhythm (every fourth full height), rails top and bottom. */
export function koshi(g, x0, x1, y0, y1, { gap = 2.3 } = {}) {
    const top = y0 + (y1 - y0) * 0.16;
    S(g, rect(x0, y0, x1, y1), SP * 0.85);
    const d = [`M${f(x0)} ${f(top)} L${f(x1)} ${f(top)}`, `M${f(x0)} ${f(y1 - 3)} L${f(x1)} ${f(y1 - 3)}`];
    let k = 0;
    for (let x = x0 + gap; x < x1 - 0.5; x += gap, k++) {
        if (k % 4 === 3) d.push(`M${f(x)} ${f(y0)} L${f(x)} ${f(y1)}`);
        else d.push(`M${f(x)} ${f(top)} L${f(x)} ${f(y1 - 3)}`);
    }
    P(g, d.join(' '), SP * 0.5);
}

/** Plaster window with fat bars (mushiko-mado). */
export function mushiko(g, x0, y0, x1, y1) {
    S(g, `M${f(x0 + 3)} ${f(y0)} L${f(x1 - 3)} ${f(y0)} Q${f(x1)} ${f(y0)} ${f(x1)} ${f(y0 + 3)} L${f(x1)} ${f(y1 - 3)} Q${f(x1)} ${f(y1)} ${f(x1 - 3)} ${f(y1)} L${f(x0 + 3)} ${f(y1)} Q${f(x0)} ${f(y1)} ${f(x0)} ${f(y1 - 3)} L${f(x0)} ${f(y0 + 3)} Q${f(x0)} ${f(y0)} ${f(x0 + 3)} ${f(y0)}Z`);
    const d = [];
    for (let x = x0 + 4; x < x1 - 3; x += 5) d.push(`M${f(x)} ${f(y0 + 2.4)} Q${f(x - 0.6)} ${f((y0 + y1) / 2)} ${f(x)} ${f(y1 - 2.4)} M${f(x + 2.4)} ${f(y0 + 2.4)} Q${f(x + 1.8)} ${f((y0 + y1) / 2)} ${f(x + 2.4)} ${f(y1 - 2.4)}`);
    P(g, d.join(' '), SP * 0.5);
}

/** Shoji grid over a pane. */
export function shojiGrid(g, x0, y0, x1, y1, nx = 3, ny = 4) {
    const d = [];
    for (let i = 1; i < nx; i++) { const x = lerp(x0, x1, i / nx); d.push(`M${f(x)} ${f(y0)} L${f(x)} ${f(y1)}`); }
    for (let j = 1; j < ny; j++) { const y = lerp(y0, y1, j / ny); d.push(`M${f(x0)} ${f(y)} L${f(x1)} ${f(y)}`); }
    P(g, d.join(' '), SP * 0.42);
    P(g, rect(x0, y0, x1, y1), SP * 0.8);
}

/** Brick courses as hatching. */
export function brick(g, x0, y0, x1, y1, rnd) {
    const d = [];
    let row = 0;
    for (let y = y0 + 4; y < y1 - 1; y += 4, row++) {
        d.push(`M${f(x0 + 0.6)} ${f(y)} L${f(x1 - 0.6)} ${f(y)}`);
        for (let x = x0 + (row % 2 ? 4 : 8); x < x1 - 1; x += 8 + (rnd ? rnd(-0.4, 0.4) : 0)) if (!rnd || rnd() > 0.25) d.push(`M${f(x)} ${f(y - 4)} l0 4`);
    }
    P(g, d.join(' '), SP * 0.35);
}

/** A window pane that lights up at night; drawn before its lattice. */
export function pane(g, gl, x0, y0, x1, y1, rnd, opts = {}) {
    const n = el('path', { d: rect(x0, y0, x1, y1), fill: PAPER }, g);
    const glow = el('ellipse', { cx: f((x0 + x1) / 2), cy: f((y0 + y1) / 2), rx: f((x1 - x0) * 0.9 + 10), ry: f((y1 - y0) * 0.9 + 10), fill: 'url(#e-warmglow)', opacity: 0 }, gl);
    const w = { n, glow, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, thr: opts.thr ?? rnd(0.12, 0.62), lateOff: opts.lateOff ?? (rnd() < 0.42 ? rnd(0.93, 1.12) : 9), warmth: rnd(), lit: 0, awake: opts.awake || 'night' };
    // someone at home, seen as a shadow on the lit paper (drawn before the lattice)
    if (opts.sil) {
        const cx = lerp(x0, x1, opts.silAt ?? 0.4), hh = Math.min(y1 - y0, 26), base = y1, s = hh / 22;
        w.sil = el('path', { d: `M${f(cx - 7 * s)} ${f(base)} Q${f(cx - 7 * s)} ${f(base - 9 * s)} ${f(cx - 2.6 * s)} ${f(base - 11 * s)} Q${f(cx - 4.4 * s)} ${f(base - 17 * s)} ${f(cx)} ${f(base - 18 * s)} Q${f(cx + 4.4 * s)} ${f(base - 17 * s)} ${f(cx + 2.6 * s)} ${f(base - 11 * s)} Q${f(cx + 7 * s)} ${f(base - 9 * s)} ${f(cx + 7 * s)} ${f(base)}Z`, fill: '#3a2a26', opacity: 0, class: 'sil' }, g);
        if (opts.sil === 'wave') {
            w.wave = el('path', { fill: 'none', stroke: '#3a2a26', 'stroke-width': 2.4 * s, 'stroke-linecap': 'round', opacity: 0 }, g);
            w.waveAt = [cx + 4 * s, base - 10 * s, s];
        }
    }
    // warm light spilling out of an open front onto the street
    if (opts.spill) w.spill = el('path', { d: `M${f(x0)} ${f(y1)} L${f(x1)} ${f(y1)} L${f(x1 + 10)} 12 L${f(x0 - 10)} 12Z`, fill: 'url(#e-spill)', opacity: 0 }, gl);
    return w;
}

/** 干し柿: persimmons drying on a string from the eave, swinging a little. */
export function hoshigaki(g, x, y, n = 6) {
    const grp = G(g);
    P(grp, `M0 0 L0 ${f(n * 4.4 + 2)}`, SP * 0.4);
    C(grp, Array.from({ length: n }, (_, i) => oval(0, 3 + i * 4.4, 1.9, 2.1)).join(' '), '#d9813a', SP * 0.5);
    return { grp, x, y, p: { a: 0, v: 0, ph: Math.random() * 6 }, k: 14 };
}

/** A potted morning glory by a door: pot, a bamboo stake, the vine and a few flowers. */
export function asagao(g, x) {
    S(g, `M${f(x - 5)} 0 L${f(x - 6)} -8 L${f(x + 6)} -8 L${f(x + 5)} 0Z`, SP * 0.7);
    P(g, `M${f(x)} -8 L${f(x)} -30 M${f(x)} -10 Q${f(x + 4)} -14 ${f(x)} -18 Q${f(x - 4)} -22 ${f(x)} -26 Q${f(x + 3)} -28 ${f(x + 1)} -31`, SP * 0.5);
    C(g, [[x + 3, -15], [x - 3.4, -21], [x + 2.4, -27]].map(([a, b]) => oval(a, b, 2.2, 2.2)).join(' '), '#5a6fc8', SP * 0.45);
    C(g, [[x + 3, -15], [x - 3.4, -21], [x + 2.4, -27]].map(([a, b]) => oval(a, b, 0.7, 0.7)).join(' '), '#f4f0e8', 0.2);
    P(g, `M${f(x - 2)} -12 q-3 -1 -3 -3 M${f(x + 2)} -24 q3 0 3.4 -2.6`, SP * 0.5);
}

// ------------------------------------------------------------------ things that live

/** Noren: cloth panels on a rod, blown by the wind; taken in after hours. */
export function noren(g, x0, x1, y, len, panels, label, { colour = '#34507a', open = [0.27, 0.86], light = '#f3ead6', rnd = Math.random } = {}) {
    const grp = G(g);
    P(grp, `M${f(x0 - 2)} ${f(y)} L${f(x1 + 2)} ${f(y)}`, SP * 1.2);
    const w = (x1 - x0) / panels;
    const cloth = Array.from({ length: panels }, (_, i) => ({ x: x0 + i * w, w: w - 0.8, n: C(grp, '', colour, SP * 0.75), p: pendulum(22, 3.2), ph: rnd() * 6 }));
    const lbl = label ? text(grp, (x0 + x1) / 2, y + len * 0.5, label, Math.min(len * 0.42, w * 0.9), { weight: 700, fill: light, fit: label.length > 3 ? (x1 - x0) * 0.8 : 0 }) : null;
    let show = -1;
    return {
        grp, colour,
        draw(t, dt, wind, tau, Pal) {
            const isOpen = open[1] > 1 ? tau > open[0] || tau < open[1] - 1 : tau > open[0] && tau < open[1];
            show = show < 0 ? (isOpen ? 1 : 0) : clamp(show + (isOpen ? dt : -dt) * 0.8, 0, 1);
            grp.setAttribute('opacity', f(show));
            if (show <= 0) return;
            grp.setAttribute('transform', `translate(0 ${f(-(1 - ease(show)) * 5)})`);
            let sw = 0;
            for (let i = 0; i < cloth.length; i++) {
                const c = cloth[i];
                const a = c.p.step(wind * 2.2 + Math.sin(t * 1.7 + c.ph) * 0.5, dt);
                const s = a * len * 0.45, flt = Math.sin(t * 3.1 + i) * 0.4;
                c.n.setAttribute('d', `M${f(c.x)} ${f(y)} L${f(c.x + c.w)} ${f(y)} Q${f(c.x + c.w + s * 0.4)} ${f(y + len * 0.6)} ${f(c.x + c.w + s + flt)} ${f(y + len)} L${f(c.x + s + flt)} ${f(y + len - 0.6)} Q${f(c.x + s * 0.4)} ${f(y + len * 0.6)} ${f(c.x)} ${f(y)}Z`);
                sw += s;
            }
            if (lbl) lbl.setAttribute('transform', `translate(${f(sw / cloth.length * 0.6)} 0)`);
        },
        poke() { for (const c of cloth) c.p.kick(2.4 + Math.random() * 2); }
    };
}

/** Chōchin lantern on a hook: swings, glows at night with its own threshold. */
export function chochin(g, gl, x, y, rnd, { r = 6.4, h = 15, label = '', red = false, thr } = {}) {
    const grp = G(g);
    const body = el('path', { d: `M${f(-r * 0.75)} 4 Q${f(-r * 1.18)} ${f(4 + h / 2)} ${f(-r * 0.75)} ${f(4 + h)} L${f(r * 0.75)} ${f(4 + h)} Q${f(r * 1.18)} ${f(4 + h / 2)} ${f(r * 0.75)} 4Z`, fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.8 }, grp);
    const ribs = [];
    for (let k = 1; k < 5; k++) { const yy = 4 + (h * k) / 5, wv = r * (1.18 - 0.3 * Math.abs(k / 5 - 0.5) * 2); ribs.push(`M${f(-wv * 0.95)} ${f(yy)} Q0 ${f(yy + 1)} ${f(wv * 0.95)} ${f(yy)}`); }
    P(grp, ribs.join(' '), SP * 0.4);
    B(grp, `M${f(-r * 0.6)} 2 L${f(r * 0.6)} 2 L${f(r * 0.6)} 4.4 L${f(-r * 0.6)} 4.4Z M${f(-r * 0.6)} ${f(4 + h - 0.4)} L${f(r * 0.6)} ${f(4 + h - 0.4)} L${f(r * 0.6)} ${f(6.4 + h)} L${f(-r * 0.6)} ${f(6.4 + h)}Z`);
    P(grp, 'M0 -4 L0 2', SP * 0.5);
    if (label) text(grp, 0, 4 + h / 2, label, h * 0.42, { vertical: label.length > 1, weight: 700, fill: red ? '#fbf3e6' : 'currentColor' });
    const glow = el('circle', { r: f(26 + r), fill: 'url(#e-warmglow)', opacity: 0 }, gl);
    const p = pendulum(10, 1.1, (rnd() - 0.5) * 0.1);
    const ph = rnd() * 6, T = thr ?? rnd(0.08, 0.3);
    return {
        grp, x, y, litV: 0,
        draw(t, dt, wind, Pal) {
            const a = p.step(wind * 0.5 + Math.sin(t * 0.9 + ph) * 0.14, dt);
            grp.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(-a * 57.3)})`);
            const lit = smooth(T, T + 0.2, Pal.lamp);
            this.litV = lit;
            const base = red ? mix(RED, RED_NIGHT, Pal.inkT * (1 - lit)) : Pal.paper;
            body.setAttribute('fill', rgb(mix(base, red ? toRGB('#ff8a4a') : WARM, lit * 0.95)));
            glow.setAttribute('cx', f(x + Math.sin(a) * -(h / 2 + 4))); glow.setAttribute('cy', f(y + Math.cos(a) * (h / 2 + 4)));
            glow.setAttribute('opacity', f(lit * (0.86 + 0.14 * Math.sin(t * 7 + ph) * Math.sin(t * 3.3))));
        },
        poke() { p.kick((Math.random() < 0.5 ? -1 : 1) * (1.8 + Math.random())); }
    };
}

/** A lamp on a post (gas lamp, andon, station lamp): a pane that lights, a cone of light. */
export function lamp(g, gl, x, top, rnd, { kind = 'gas', thr, tint = '#fff1c9' } = {}) {
    const grp = G(g);
    let node;
    if (kind === 'gas') {
        S(grp, `M${f(x - 1.4)} 0 L${f(x - 0.9)} ${f(top + 6)} L${f(x + 0.9)} ${f(top + 6)} L${f(x + 1.4)} 0Z`, SP * 0.8);
        P(grp, `M${f(x - 4)} ${f(top + 6)} L${f(x + 4)} ${f(top + 6)} M${f(x - 3)} ${f(top + 14)} l6 0`, SP * 0.6);
        node = el('path', { d: `M${f(x - 4.2)} ${f(top + 5)} L${f(x - 5.4)} ${f(top - 6)} L${f(x + 5.4)} ${f(top - 6)} L${f(x + 4.2)} ${f(top + 5)}Z`, fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.8 }, grp);
        S(grp, `M${f(x - 6.6)} ${f(top - 6)} L${f(x + 6.6)} ${f(top - 6)} L${f(x)} ${f(top - 12)}Z`, SP * 0.8);
        P(grp, `M${f(x)} ${f(top - 5)} l0 9.6`, SP * 0.4);
    } else if (kind === 'andon') {
        S(grp, `M${f(x - 1)} 0 L${f(x - 1)} ${f(top + 12)} M${f(x + 1)} 0 L${f(x + 1)} ${f(top + 12)}`, SP * 0.6);
        node = el('path', { d: rect(x - 5, top - 2, x + 5, top + 12), fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.8 }, grp);
        S(grp, `M${f(x - 7)} ${f(top - 2)} L${f(x + 7)} ${f(top - 2)} L${f(x + 5)} ${f(top - 6)} L${f(x - 5)} ${f(top - 6)}Z`, SP * 0.8);
        P(grp, `M${f(x - 5)} ${f(top + 5)} l10 0 M${f(x)} ${f(top - 2)} l0 14`, SP * 0.4);
    } else {
        P(grp, `M${f(x)} 0 Q${f(x + 0.6)} ${f(top / 2)} ${f(x)} ${f(top)}`, SP * 1.2);
        node = el('path', { d: oval(x, top - 3, 3.6, 3.6), fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.8 }, grp);
    }
    const cone = el('path', { d: `M${f(x - 3)} ${f(top + 4)} L${f(x - 22)} 0 L${f(x + 22)} 0 L${f(x + 3)} ${f(top + 4)}Z`, fill: 'url(#e-cone)', opacity: 0 }, gl);
    const glow = el('circle', { cx: f(x), cy: f(top), r: 22, fill: 'url(#e-warmglow)', opacity: 0 }, gl);
    const T = thr ?? rnd(0.15, 0.4), tintC = toRGB(tint);
    return {
        draw(t, dt, wind, Pal, awake = 1) {
            const on = smooth(T, T + 0.25, Pal.lamp) * awake;
            node.setAttribute('fill', rgb(mix(Pal.paper, tintC, on)));
            cone.setAttribute('opacity', f(on * 0.6));
            glow.setAttribute('opacity', f(on));
        }
    };
}

/** Smoke from a chimney or a kitchen: puffs that rise, swell, drift with the wind and fade. */
export function smoke(g, x, y, rnd, { rate = 1.2, max = 5 } = {}) {
    const grp = el('g', { opacity: 0.8 }, g);
    const puffs = Array.from({ length: max }, () => ({ n: pen(grp, SP * 0.6), age: rnd() * max / rate, life: max / rate, dx: 0 }));
    return {
        draw(t, dt, wind, Pal, on = 1) {
            grp.setAttribute('opacity', f(0.75 * on));
            if (on <= 0.01) return;
            for (const p of puffs) {
                p.age += dt;
                if (p.age > p.life) { p.age -= p.life; p.dx = 0; }
                const u = p.age / p.life;
                p.dx += (wind * 6 + 2) * dt;
                const r = 2 + u * 7, px = x + p.dx + Math.sin(u * 5 + t * 0.4) * 1.4, py = y - u * 38;
                p.n.setAttribute('d', `M${f(px - r)} ${f(py)} q${f(r * 0.2)} ${f(-r)} ${f(r)} ${f(-r * 0.8)} q${f(r * 0.9)} ${f(-0.2 * r)} ${f(r)} ${f(r * 0.9)}`);
                p.n.setAttribute('opacity', f(Math.sin(Math.PI * u) * 0.9));
            }
        }
    };
}

/** A clock face whose hand shows the 不定時法 koku (a 12-koku dial). */
export function kokuDial(g, x, y, r, { roman = false } = {}) {
    S(g, oval(x, y, r, r), SP * 0.9);
    const d = [];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; d.push(`M${f(x + Math.sin(a) * r * 0.78)} ${f(y - Math.cos(a) * r * 0.78)} L${f(x + Math.sin(a) * r * 0.92)} ${f(y - Math.cos(a) * r * 0.92)}`); }
    P(g, d.join(' '), SP * 0.5);
    const hand = P(g, '', SP * 0.9);
    B(g, oval(x, y, r * 0.09 + 0.4, r * 0.09 + 0.4));
    return {
        draw(clock) {
            const k = (clock.koku || 0) + (clock.phase || 0);
            const a = (k / 12) * Math.PI * 2;
            hand.setAttribute('d', `M${f(x)} ${f(y)} L${f(x + Math.sin(a) * r * 0.7)} ${f(y - Math.cos(a) * r * 0.7)}`);
        }
    };
}

/** A flag or banner (nobori) on a pole, flapping on a pendulum. */
export function banner(g, x, y0, y1, w, colour, rnd, label = '') {
    const grp = G(g);
    P(grp, `M${f(x)} ${f(y0 - 4)} L${f(x)} ${f(y1)}`, SP);
    const cloth = C(grp, '', colour, SP * 0.7);
    const lbl = label ? text(grp, x + w / 2, (y0 + y1) / 2 - 6, label, Math.min(w * 0.7, 6), { vertical: true, fill: '#f3ead6', weight: 700 }) : null;
    const p = pendulum(14, 1.8), ph = rnd() * 6;
    return {
        draw(t, dt, wind) {
            const a = p.step(wind * 1.4 + Math.sin(t * 1.3 + ph) * 0.3, dt);
            const s = a * 6;
            cloth.setAttribute('d', `M${f(x)} ${f(y0)} L${f(x + w + s * 0.3)} ${f(y0 + 0.4)} Q${f(x + w + s)} ${f((y0 + y1) / 2)} ${f(x + w + s * 1.2)} ${f(y1 - 14)} L${f(x)} ${f(y1 - 14)}Z`);
            if (lbl) lbl.setAttribute('transform', `translate(${f(s * 0.6)} 0)`);
        }
    };
}

// ------------------------------------------------------------------ plants and props (static)

export function pine(g, x, h, rnd) {
    const trunk = `M${f(x - 2)} 0 Q${f(x - 4)} ${f(-h * 0.4)} ${f(x + 3)} ${f(-h * 0.7)} Q${f(x + 6)} ${f(-h * 0.85)} ${f(x + 2)} ${f(-h)} M${f(x + 2)} 0 Q${f(x)} ${f(-h * 0.4)} ${f(x + 6)} ${f(-h * 0.66)}`;
    P(g, trunk, SP * 1.1);
    for (const [dx, dy, w] of [[-8, -h * 0.62, 16], [10, -h * 0.78, 14], [0, -h * 0.98, 18], [-12, -h * 0.84, 10]]) {
        const cx = x + dx + rnd(-1, 1), cy = dy;
        S(g, `M${f(cx - w)} ${f(cy)} Q${f(cx - w * 0.6)} ${f(cy - 6)} ${f(cx)} ${f(cy - 6.4)} Q${f(cx + w * 0.7)} ${f(cy - 6)} ${f(cx + w)} ${f(cy)} Q${f(cx)} ${f(cy + 2)} ${f(cx - w)} ${f(cy)}Z`, SP * 0.8);
        const n = [];
        for (let i = -w + 3; i < w - 2; i += 2.6) n.push(`M${f(cx + i)} ${f(cy - 0.6)} l${f(rnd(-0.6, 0.6))} -3`);
        P(g, n.join(' '), SP * 0.35);
    }
}

export function blossomTree(g, x, h, rnd, { colour = '#e8a8bd', count = 70 } = {}) {
    P(g, `M${f(x - 2.4)} 0 Q${f(x - 3)} ${f(-h * 0.45)} ${f(x - 10)} ${f(-h * 0.7)} M${f(x + 2.4)} 0 Q${f(x + 3)} ${f(-h * 0.5)} ${f(x + 12)} ${f(-h * 0.72)} M${f(x)} ${f(-h * 0.4)} Q${f(x + 1)} ${f(-h * 0.7)} ${f(x - 1)} ${f(-h * 0.86)}`, SP * 1.1);
    const blobs = [[x - 12, -h * 0.78, h * 0.26], [x + 13, -h * 0.8, h * 0.24], [x, -h * 0.93, h * 0.28]];
    for (const [cx, cy, r] of blobs) {
        const pts = [];
        for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI * 2; const rr = r + 1.6 * Math.abs(Math.sin(a * 5.5)); pts.push([cx + rr * Math.cos(a), cy + rr * 0.74 * Math.sin(a)]); }
        S(g, 'M' + pts.map(pt).join('L') + 'Z', SP * 0.75);
    }
    const fl = [], out = [];
    for (let i = 0; i < count; i++) {
        const [cx, cy, r] = blobs[i % 3], a = rnd(0, 6.28), d = Math.sqrt(rnd(0, 1)) * 0.92;
        const px = cx + Math.cos(a) * r * d, py = cy + Math.sin(a) * r * 0.7 * d, s = rnd(0.7, 1.2);
        out.push([px, py]);
        fl.push(`M${f(px)} ${f(py - s)} l${f(s * 0.95)} ${f(s * 0.7)} l${f(-s * 0.4)} ${f(s * 1.1)} l${f(-s * 1.1)} 0 l${f(-s * 0.4)} ${f(-s * 1.1)}Z`);
    }
    C(g, fl.join(' '), colour, SP * 0.3);
    return out;
}

export function roundTree(g, x, h, rnd, { leaves = true } = {}) {
    P(g, `M${f(x - 1.6)} 0 Q${f(x - 2)} ${f(-h * 0.5)} ${f(x - 1)} ${f(-h * 0.62)} M${f(x + 1.6)} 0 Q${f(x + 2)} ${f(-h * 0.5)} ${f(x + 1)} ${f(-h * 0.62)}`, SP);
    const r = h * 0.3, cy = -h * 0.72;
    const pts = [];
    for (let i = 0; i <= 36; i++) { const a = (i / 36) * Math.PI * 2; const rr = r + 1.4 * Math.sin(a * 7 + x); pts.push([x + rr * Math.cos(a), cy + rr * 0.86 * Math.sin(a)]); }
    S(g, 'M' + pts.map(pt).join('L') + 'Z', SP * 0.8);
    if (leaves) { const d = []; for (let i = 0; i < 16; i++) { const a = rnd(0, 6.28), dd = rnd(0, r * 0.8); d.push(`M${f(x + Math.cos(a) * dd)} ${f(cy + Math.sin(a) * dd * 0.8)} q1.2 -1 2.4 0`); } P(g, d.join(' '), SP * 0.4); }
}

export function bamboo(g, x, h, rnd) {
    for (let k = 0; k < 3; k++) {
        const bx = x + k * 4.4 + rnd(-1, 1), hh = h * rnd(0.8, 1.05), d = [];
        d.push(`M${f(bx - 0.9)} 0 Q${f(bx - 1.6)} ${f(-hh / 2)} ${f(bx + 1)} ${f(-hh)} M${f(bx + 0.9)} 0 Q${f(bx + 0.2)} ${f(-hh / 2)} ${f(bx + 2.6)} ${f(-hh)}`);
        for (let y = -10; y > -hh; y -= 10) d.push(`M${f(bx - 1.4)} ${f(y)} l2.6 0`);
        for (let y = -hh * 0.55; y > -hh; y -= 8) d.push(`M${f(bx + 1)} ${f(y)} q5 -1 8 2 M${f(bx)} ${f(y - 3)} q-4 -1 -7 2`);
        P(g, d.join(' '), SP * 0.6);
    }
}

export function barrel(g, x, w = 9, h = 10) {
    S(g, `M${f(x - w / 2)} 0 Q${f(x - w / 2 - 1.2)} ${f(-h / 2)} ${f(x - w / 2)} ${f(-h)} L${f(x + w / 2)} ${f(-h)} Q${f(x + w / 2 + 1.2)} ${f(-h / 2)} ${f(x + w / 2)} 0Z`, SP * 0.8);
    P(g, `M${f(x - w / 2 - 0.4)} ${f(-h * 0.3)} Q${f(x)} ${f(-h * 0.24)} ${f(x + w / 2 + 0.4)} ${f(-h * 0.3)} M${f(x - w / 2 - 0.4)} ${f(-h * 0.72)} Q${f(x)} ${f(-h * 0.66)} ${f(x + w / 2 + 0.4)} ${f(-h * 0.72)}`, SP * 0.55);
}

export function well(g, x) {
    S(g, `M${f(x - 9)} 0 L${f(x - 9)} -8 L${f(x + 9)} -8 L${f(x + 9)} 0Z`, SP * 0.85);
    P(g, `M${f(x - 9)} -4 l18 0 M${f(x - 3)} -8 l0 8 M${f(x + 3)} -8 l0 8`, SP * 0.4);
    P(g, `M${f(x - 7)} -8 L${f(x - 7)} -26 M${f(x + 7)} -8 L${f(x + 7)} -26 M${f(x - 10)} -26 Q${f(x)} -28 ${f(x + 10)} -26`, SP * 0.85);
    S(g, oval(x, -22, 2.2, 2.2), SP * 0.6);
    P(g, `M${f(x)} -20 L${f(x)} -13`, SP * 0.4);
    S(g, `M${f(x - 2.4)} -13 L${f(x + 2.4)} -13 L${f(x + 2)} -9.4 L${f(x - 2)} -9.4Z`, SP * 0.5);
}

export function bench(g, x0, x1, h = 6) {
    S(g, `M${f(x0)} ${f(-h)} L${f(x1)} ${f(-h)} L${f(x1)} ${f(-h - 1.6)} L${f(x0)} ${f(-h - 1.6)}Z`, SP * 0.7);
    P(g, `M${f(x0 + 2)} ${f(-h)} l0 ${f(h)} M${f(x1 - 2)} ${f(-h)} l0 ${f(h)}`, SP * 0.7);
}

/** Water seen in elevation: a band with drifting strokes; returns draw() for the strokes. */
export function water(g, x0, x1, y0, y1, rnd) {
    S(g, rect(x0, y0, x1, y1), SP * 0.7);
    const strokes = Array.from({ length: Math.max(3, Math.round((x1 - x0) / 14)) }, () => ({ x: rnd(x0, x1), y: rnd(y0 + 1.6, y1 - 1), w: rnd(4, 9), v: rnd(1, 3) }));
    const n = P(g, '', SP * 0.45);
    return {
        draw(t, dt, wind, Pal) {
            const d = [];
            for (const s of strokes) {
                s.x += (s.v + wind * 2) * dt;
                if (s.x > x1 - s.w) s.x = x0;
                if (s.x < x0) s.x = x1 - s.w;
                d.push(`M${f(s.x)} ${f(s.y)} q${f(s.w / 2)} -0.8 ${f(s.w)} 0`);
            }
            n.setAttribute('d', d.join(' '));
        }
    };
}

/** The 時層鳥居 that stands in every place: residents leave and arrive through it. */
export function torii(g, gl, rnd, { colour = '#b3412d', w = 54, h = 66 } = {}) {
    const grp = G(g);
    const x0 = -w / 2, x1 = w / 2;
    const shimmer = el('ellipse', { cx: 0, cy: f(-h * 0.42), rx: f(w * 0.36), ry: f(h * 0.42), fill: 'url(#e-gateglow)', opacity: 0.0 }, gl);
    const veil = el('path', { d: `M${f(x0 + 6)} 0 L${f(x0 + 6)} ${f(-h + 14)} L${f(x1 - 6)} ${f(-h + 14)} L${f(x1 - 6)} 0Z`, fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.35, 'stroke-dasharray': '1.4 2.6', opacity: 0.5 }, grp);
    C(grp, `M${f(x0 + 4.6)} 0 L${f(x0 + 6)} ${f(-h + 10)} L${f(x0 + 10)} ${f(-h + 10)} L${f(x0 + 10.6)} 0Z M${f(x1 - 4.6)} 0 L${f(x1 - 6)} ${f(-h + 10)} L${f(x1 - 10)} ${f(-h + 10)} L${f(x1 - 10.6)} 0Z`, colour);
    C(grp, `M${f(x0 + 1)} ${f(-h + 17)} L${f(x1 - 1)} ${f(-h + 17)} L${f(x1 - 1)} ${f(-h + 20.4)} L${f(x0 + 1)} ${f(-h + 20.4)}Z`, colour);
    C(grp, `M${f(x0 - 7)} ${f(-h + 4)} Q${f(0)} ${f(-h + 7.4)} ${f(x1 + 7)} ${f(-h + 4)} L${f(x1 + 9)} ${f(-h - 1.6)} Q${f(0)} ${f(-h + 2.6)} ${f(x0 - 9)} ${f(-h - 1.6)}Z`, colour);
    B(grp, `M${f(x0 - 9)} ${f(-h - 1.6)} Q0 ${f(-h + 2.6)} ${f(x1 + 9)} ${f(-h - 1.6)} L${f(x1 + 10)} ${f(-h - 4)} Q0 ${f(-h)} ${f(x0 - 10)} ${f(-h - 4)}Z`);
    S(grp, rect(-5, -h + 6, 5, -h + 16), SP * 0.6);
    text(grp, 0, -h + 11, '時層', 3.6, { vertical: true, weight: 700 });
    S(grp, `M${f(x0 + 2)} 0 L${f(x0 + 14)} 0 L${f(x0 + 13)} -3 L${f(x0 + 3)} -3Z M${f(x1 - 2)} 0 L${f(x1 - 14)} 0 L${f(x1 - 13)} -3 L${f(x1 - 3)} -3Z`, SP * 0.6);
    let pulse = 0;
    return {
        grp,
        pulse() { pulse = 1; },
        draw(t, dt, Pal) {
            pulse = Math.max(0, pulse - dt * 0.9);
            shimmer.setAttribute('opacity', f(0.14 + 0.25 * Pal.night + pulse * 0.8));
            veil.setAttribute('opacity', f(0.35 + pulse * 0.5));
        }
    };
}

export { seeded };
