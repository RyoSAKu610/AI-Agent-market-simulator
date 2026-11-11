// 江戸前 Edomae — the sky behind the globe: gradient, stars, sun and moon on their
// arcs, mist strokes by day, and at night the 銀河鉄道 crossing with lit windows.
// The sky does not rotate with the globe and is not ink-filtered.

import { el, pen, f, pt } from './lib/ink.js';
import { clamp, smooth, lerp, seeded } from './lib/motion.js';
import { rgb, mix, toRGB } from './lib/daynight.js';

const SUN_SPAN = [0.225, 0.55], MOON_SPAN = [0.775, 0.45];

export function createSky(root, glow, defs) {
    const grad = el('linearGradient', { id: 'e-sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    const s0 = el('stop', { offset: 0 }, grad), s1 = el('stop', { offset: 1 }, grad);
    const g = el('g', {}, root);
    const bg = el('rect', { x: 0, y: 0, width: 10, height: 10, fill: 'url(#e-sky)' }, g);
    const rnd = seeded(29);
    const starG = el('g', {}, g);
    const stars = Array.from({ length: 110 }, () => ({ u: rnd(), v: rnd(), r: rnd(0.35, 1.1), ph: rnd(0, 6), sp: rnd(0.6, 2.4), n: el('circle', { r: 1, fill: '#f5efda' }, starG) }));
    stars.forEach(s => s.n.setAttribute('r', f(s.r)));
    // the Milky Way: a faint band of dust the train runs along
    const milky = el('path', { fill: 'none', stroke: '#cfd8ff', 'stroke-width': 26, 'stroke-linecap': 'round', opacity: 0 }, g);
    const sunG = el('g', {}, g);
    el('circle', { r: 70, fill: 'url(#e-sunglow)' }, sunG);
    const sunDisk = el('circle', { r: 20, stroke: 'currentColor', 'stroke-width': 0.74 }, sunG);
    const moonG = el('g', {}, g);
    el('circle', { r: 56, fill: 'url(#e-moonglow)' }, moonG);
    const moonDisk = el('path', { fill: '#f3ecd6', stroke: '#f3ecd6', 'stroke-width': 0.6 }, moonG);
    const r = 14;
    moonDisk.setAttribute('d', `M0 ${-r} A${r} ${r} 0 1 1 0 ${r} A${r * 0.62} ${r} 0 1 0 0 ${-r}Z`);
    const mist = el('g', { opacity: 0.6 }, g);
    const bands = [[0.12, 0.42, 150], [0.55, 0.3, 190], [0.8, 0.5, 130], [0.33, 0.56, 100]].map(([u, v, w]) => ({ u, v, w, x: 0, n: pen(mist, 0.6) }));
    const cloudD = (x, y, w) => {
        const curl = (cx, cy, s) => `M${f(cx)} ${f(cy)} q${5 * s} 0 ${5 * s} -4 q0 -3.2 ${-3.2 * s} -3.2 q-2.2 0 -2.2 2.2 q0 1.4 1.4 1.4`;
        return `M${f(x)} ${f(y)} L${f(x + w)} ${f(y)} ${curl(x + w, y, 1)} ${curl(x, y, -1)} M${f(x + w * 0.18)} ${f(y - 7)} L${f(x + w * 0.66)} ${f(y - 7)} ${curl(x + w * 0.66, y - 7, 1)} M${f(x + w * 0.42)} ${f(y + 6.5)} L${f(x + w * 0.92)} ${f(y + 6.5)} ${curl(x + w * 0.42, y + 6.5, -1)}`;
    };

    // 銀河鉄道: seven cars with lit windows, riding a curve across the night sky
    const trainG = el('g', { opacity: 0 }, g);
    const trainGlow = el('g', { opacity: 0 }, glow);
    const cars = Array.from({ length: 7 }, (_, i) => {
        const cg = el('g', {}, trainG);
        el('path', { d: i === 0 ? 'M-9 3 L-9 -4 Q-6 -7 2 -7 L9 -5 L10 3Z' : 'M-9 3 L-9 -6 Q0 -8 9 -6 L9 3Z', fill: '#1b2140', stroke: '#e9e2c8', 'stroke-width': 0.6 }, cg);
        const wins = [-5.6, -1.6, 2.4].map(x => el('rect', { x, y: -4.4, width: 2.8, height: 3, fill: '#ffe2a0' }, cg));
        const gl = el('ellipse', { rx: 12, ry: 7, fill: 'url(#e-warmglow)' }, trainGlow);
        return { g: cg, gl, wins };
    });
    const smokeT = el('path', { fill: 'none', stroke: '#e9e2c8', 'stroke-width': 0.5, opacity: 0.6 }, trainG);
    let VW = 960, VH = 540, horizon = 400;
    let trainT = 8;

    const sunArc = u => [VW * 0.04 + VW * 0.92 * u, horizon - (horizon - VH * 0.1) * Math.sin(Math.PI * u)];
    const moonArc = u => [VW * 0.06 + VW * 0.88 * u, horizon - (horizon - VH * 0.14) * 0.92 * Math.sin(Math.PI * u)];
    const trainPath = u => [lerp(-60, VW + 60, u), VH * 0.5 - Math.sin(Math.PI * u) * VH * 0.2 + u * VH * 0.06];

    return {
        resize(w, h, hz) {
            VW = w; VH = h; horizon = hz;
            bg.setAttribute('width', f(w)); bg.setAttribute('height', f(h));
            for (const s of stars) { s.n.setAttribute('cx', f(s.u * w)); s.n.setAttribute('cy', f(s.v * hz * 0.92)); }
            const a = trainPath(0), b = trainPath(0.5), c = trainPath(1);
            milky.setAttribute('d', `M${pt(a)} Q${f(b[0])} ${f(2 * b[1] - (a[1] + c[1]) / 2)} ${pt(c)}`);
        },
        draw(tau, t, dt, P, wind, night) {
            s0.setAttribute('stop-color', rgb(P.top));
            s1.setAttribute('stop-color', rgb(P.bottom));
            starG.setAttribute('opacity', f(P.night));
            if (P.night > 0.01) for (const s of stars) s.n.setAttribute('opacity', f(0.55 + 0.45 * Math.sin(t * s.sp + s.ph)));
            milky.setAttribute('opacity', f(P.night * 0.05));
            const su = (tau - SUN_SPAN[0]) / SUN_SPAN[1];
            if (su > 0 && su < 1) {
                const [x, y] = sunArc(su);
                sunG.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
                sunG.style.display = '';
                sunDisk.setAttribute('fill', rgb(mix(toRGB('#fbf3df'), toRGB('#df5a3a'), P.sunset)));
            } else sunG.style.display = 'none';
            const mu = ((((tau - MOON_SPAN[0]) % 1) + 1) % 1) / MOON_SPAN[1];
            if (mu <= 1.02) {
                const [x, y] = moonArc(clamp(mu, 0, 1));
                moonG.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(-24)`);
                moonG.style.display = '';
                moonG.setAttribute('opacity', f(smooth(0, 0.08, mu) * smooth(1.02, 0.94, mu)));
            } else moonG.style.display = 'none';
            mist.setAttribute('opacity', f(0.6 - 0.45 * P.night));
            for (const b of bands) {
                b.x += (1.6 + wind * 3) * dt;
                const span = VW + b.w + 120;
                const x = ((b.u * VW + b.x) % span + span) % span - b.w - 60;
                b.n.setAttribute('d', cloudD(x, Math.max(VH * 0.27, b.v * horizon), b.w));
            }
            // the night train: runs only after dark, a crossing every ~50 s
            const on = smooth(0.3, 0.7, night);
            trainG.setAttribute('opacity', f(on));
            trainGlow.setAttribute('opacity', f(on));
            if (on > 0.01) {
                trainT += dt;
                const period = 52, cross = 34;
                const u0 = (trainT % period) / cross;
                for (let i = 0; i < cars.length; i++) {
                    const u = u0 - i * 0.028;
                    const c = cars[i];
                    if (u < 0 || u > 1) { c.g.style.display = 'none'; c.gl.style.display = 'none'; continue; }
                    c.g.style.display = ''; c.gl.style.display = '';
                    const p = trainPath(u), q = trainPath(u + 0.002);
                    const a = Math.atan2(q[1] - p[1], q[0] - p[0]) * 57.3;
                    c.g.setAttribute('transform', `translate(${pt(p)}) rotate(${f(a)})`);
                    c.gl.setAttribute('cx', f(p[0])); c.gl.setAttribute('cy', f(p[1] - 2));
                }
                const h = trainPath(clamp(u0, 0, 1));
                smokeT.setAttribute('d', u0 > 0 && u0 < 1 ? `M${f(h[0] + 6)} ${f(h[1] - 8)} q-6 -6 -14 -4 q-8 2 -16 -3` : '');
            }
        },
        trainActive: () => trainT
    };
}
