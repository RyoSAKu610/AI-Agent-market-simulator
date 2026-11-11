// daynight.js — time-of-day palette for line-art scenes.
// τ ∈ [0,1): 0 midnight · 0.25 dawn · 0.5 noon · 0.75 dusk.
//
// Ported to plain JavaScript (types stripped, same API) from lib/daynight.ts of
// line-art-animation by JDhruv14 — https://github.com/JDhruv14/line-art-animation
// MIT License, Copyright (c) 2026 JDhruv14. Full licence text: ../../THIRD_PARTY.md
// No imports, so Node tests can load it directly.
//
// Day is dark ink on warm paper. Night inverts it: pale ink on indigo paper, with
// warm light from windows and lanterns. The ink flips while the paper is mid-dark,
// so the low-contrast moment lasts about a second of a three-minute day.

export const toRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const rgb = c => `rgb(${c.map(v => Math.round(v)).join(',')})`;
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lum = c => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Sample a cyclic colour ramp at u ∈ [0,1). */
export function ramp(keys, u) {
    u = ((u % 1) + 1) % 1;
    const n = keys.length;
    let i = n - 1;
    for (let j = 0; j < n; j++) if (keys[j][0] <= u) i = j;
    const [p0, c0] = keys[i], [p1, c1] = keys[(i + 1) % n];
    const span = (i + 1 < n ? p1 : p1 + 1) - p0;
    let x = u - p0; if (x < 0) x += 1;
    return mix(toRGB(c0), toRGB(c1), smooth(0, 1, x / span));
}

export const SKY_TOP = [[0, '#0d1222'], [0.19, '#131a30'], [0.235, '#3d4066'], [0.27, '#cfd8e2'], [0.33, '#f3f2ee'], [0.5, '#f6f5f1'], [0.68, '#f3eee4'], [0.735, '#e3c6a6'], [0.762, '#5a5279'], [0.8, '#1b2140'], [0.86, '#0d1222']];
export const SKY_BOTTOM = [[0, '#1a2240'], [0.19, '#283050'], [0.235, '#d49884'], [0.27, '#f3d0b3'], [0.33, '#faf6ee'], [0.5, '#fcfbf7'], [0.68, '#f9efdc'], [0.735, '#f0a379'], [0.762, '#d47f68'], [0.8, '#383a60'], [0.86, '#1a2240']];
export const PAPERS = [[0, '#1a2036'], [0.19, '#1f263e'], [0.235, '#4a4561'], [0.27, '#ede4d8'], [0.33, '#fbf8f1'], [0.5, '#fdfcf8'], [0.68, '#faf4e8'], [0.735, '#f0dbc4'], [0.756, '#5d5571'], [0.8, '#262c48'], [0.86, '#1a2036']];
const INK_DARK = toRGB('#1c1c1c'), INK_LIGHT = toRGB('#efe6cf');

// palette(τ) → { top, bottom, paper, ink, inkT (0 day ink … 1 night ink), lamp (0 bright day … 1 dark;
// give each light its own threshold), night (stars, moon glow, fireflies), sunset (warm horizon light) }
export function palette(tau) {
    const top = ramp(SKY_TOP, tau), bottom = ramp(SKY_BOTTOM, tau), paper = ramp(PAPERS, tau);
    const L = lum(paper);
    const inkT = smooth(0.56, 0.36, L);
    return {
        top, bottom, paper, inkT,
        ink: mix(INK_DARK, INK_LIGHT, inkT),
        lamp: smooth(0.78, 0.4, L),
        night: smooth(0.42, 0.1, lum(top)),
        sunset: Math.max(smooth(0.67, 0.735, tau) * smooth(0.79, 0.745, tau), smooth(0.215, 0.245, tau) * smooth(0.3, 0.26, tau))
    };
}

/** Apply a palette to an <svg> drawn with ink.js (needs `.pp { fill: var(--paper) }` in CSS). */
export function applyPalette(svg, P) {
    svg.style.color = rgb(P.ink);
    svg.style.setProperty('--paper', rgb(P.paper));
}

/** Darken a flat colour (clothes, props) toward night so it sits in the inverted palette. */
export const nightTint = (colour, P, amount = 0.55) =>
    rgb(mix(toRGB(colour), mix(toRGB(colour), [12, 16, 30], 0.6), P.inkT * amount));
