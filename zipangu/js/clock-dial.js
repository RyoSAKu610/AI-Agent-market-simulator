// 万世時計: a dial of the twelve branches whose hours stretch with the seasons
// (不定時法). Midnight is at the top; 卯 (明け六つ) sits to the east at dawn,
// 酉 (暮れ六つ) to the west at dusk. The ten gems on the bezel are the ten eras.

import { svg, accentOf } from './util.js';

// The branch that names each 刻, in koku order (明け六つ … 暁七つ).
const BRANCH_BY_KOKU = ['卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑', '寅'];

const pt = (r, deg) => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];

function arcPath(r0, r1, a0, a1) {
    const [x0, y0] = pt(r1, a0), [x1, y1] = pt(r1, a1), [x2, y2] = pt(r0, a1), [x3, y3] = pt(r0, a0);
    const large = a1 - a0 > 180 ? 1 : 0;
    const f = n => n.toFixed(2);
    return `M${f(x0)} ${f(y0)}A${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${r0} ${r0} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`;
}

export function createDial(W) {
    const uid = 'dial' + Math.random().toString(36).slice(2, 7);
    const root = svg('svg', {
        class: 'dial', viewBox: '-62 -62 124 124', role: 'img', 'aria-label': '万世時計',
        focusable: 'false'
    });
    const defs = svg('defs', {},
        svg('radialGradient', { id: `${uid}-face`, cx: '50%', cy: '50%', r: '50%' },
            svg('stop', { offset: '0', 'stop-color': '#232f86' }), svg('stop', { offset: '1', 'stop-color': '#0c1245' })),
        svg('linearGradient', { id: `${uid}-gold`, x1: '0', y1: '0', x2: '1', y2: '1' },
            svg('stop', { offset: '0', 'stop-color': '#fff1bf' }), svg('stop', { offset: '1', 'stop-color': '#d9a94c' })),
        svg('linearGradient', { id: `${uid}-bead`, x1: '0', y1: '0', x2: '1', y2: '1' },
            svg('stop', { offset: '0', 'stop-color': '#2ee6d6' }), svg('stop', { offset: '0.5', 'stop-color': '#8b5cf6' }),
            svg('stop', { offset: '1', 'stop-color': '#ff4fa3' })),
        svg('linearGradient', { id: `${uid}-day`, x1: '0', y1: '0', x2: '0', y2: '1' },
            svg('stop', { offset: '0', 'stop-color': '#f6dc98' }), svg('stop', { offset: '1', 'stop-color': '#c9923f' })),
        svg('linearGradient', { id: `${uid}-night`, x1: '0', y1: '0', x2: '0', y2: '1' },
            svg('stop', { offset: '0', 'stop-color': '#4a46a8' }), svg('stop', { offset: '1', 'stop-color': '#1a1f6e' }))
    );

    const face = svg('circle', { r: 56, fill: `url(#${uid}-face)`, stroke: `url(#${uid}-gold)`, 'stroke-width': 1.6 });
    const bezel = svg('g', { class: 'dial-gems' });
    const eras = [...W.eras].sort((a, b) => (a.order || 0) - (b.order || 0));
    eras.forEach((era, i) => {
        const [x, y] = pt(58.6, (i / eras.length) * 360 + 180 / eras.length);
        bezel.append(svg('circle', { cx: x.toFixed(2), cy: y.toFixed(2), r: 2.3, fill: accentOf(era.aesthetic && era.aesthetic.palette), stroke: '#fff4cf', 'stroke-width': 0.5 }));
    });

    const ring = svg('g', { class: 'dial-ring' });
    const letters = svg('g', { class: 'dial-letters' });

    const sun = svg('g', { class: 'dial-sun' },
        svg('circle', { r: 8.5, fill: `url(#${uid}-day)` }),
        ...Array.from({ length: 12 }, (_, i) => {
            const [x0, y0] = pt(11, i * 30), [x1, y1] = pt(14.5, i * 30);
            return svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#f6dc98', 'stroke-width': 1.3, 'stroke-linecap': 'round' });
        }));
    const moon = svg('g', { class: 'dial-moon' },
        svg('path', { d: 'M3 -9 A9.5 9.5 0 1 0 3 9 A7.2 7.2 0 1 1 3 -9Z', fill: `url(#${uid}-night)`, stroke: '#cfd2ff', 'stroke-width': 0.7 }));

    const hand = svg('g', { class: 'dial-hand' },
        svg('line', { x1: 0, y1: 4, x2: 0, y2: -45, stroke: '#fff4cf', 'stroke-width': 1.7, 'stroke-linecap': 'round' }),
        svg('circle', { cx: 0, cy: -47, r: 4, fill: `url(#${uid}-bead)`, stroke: '#fff4cf', 'stroke-width': 0.9 }));
    const hub = svg('circle', { r: 2.4, fill: '#fff4cf' });

    root.append(defs, face, bezel, ring, letters, sun, moon, hand, hub);

    let builtDay = null, angle = 0, lastT = null, segs = [];

    function build(clock) {
        ring.replaceChildren();
        letters.replaceChildren();
        segs = [];
        const dayStart = clock.dawn * 360, dusk = clock.dusk * 360;
        const dayStep = (dusk - dayStart) / 6, nightStep = (360 - (dusk - dayStart)) / 6;
        for (let k = 0; k < 12; k++) {
            const a0 = k < 6 ? dayStart + k * dayStep : dusk + (k - 6) * nightStep;
            const a1 = k < 6 ? a0 + dayStep : a0 + nightStep;
            const night = k >= 6;
            const seg = svg('path', {
                d: arcPath(31, 51, a0 + 0.5, a1 - 0.5),
                class: 'dial-seg ' + (night ? 'is-night' : 'is-day'),
                fill: night ? (k % 2 ? '#2a2f86' : '#1d2368') : (k % 2 ? '#e9c775' : '#f4d98f'),
                'fill-opacity': night ? 0.92 : 0.85,
                stroke: '#0c1245', 'stroke-width': 0.6
            });
            ring.append(seg);
            segs.push(seg);
            const [x, y] = pt(41, (a0 + a1) / 2);
            letters.append(svg('text', {
                x: x.toFixed(2), y: y.toFixed(2), 'text-anchor': 'middle', 'dominant-baseline': 'central',
                class: 'dial-letter', fill: night ? '#e6e8ff' : '#3a2a0c'
            }, BRANCH_BY_KOKU[k]));
        }
        builtDay = clock.day;
    }

    // Wrap the hand forward so it never spins back at midnight.
    function turn(t) {
        const target = t * 360;
        if (lastT != null && t < lastT - 0.5) angle += 360;
        lastT = t;
        return target + angle;
    }

    function update(clock) {
        if (builtDay !== clock.day) build(clock);
        hand.style.transform = `rotate(${turn(clock.t).toFixed(2)}deg)`;
        segs.forEach((s, i) => s.classList.toggle('is-now', i === clock.koku));
        root.classList.toggle('is-night', !!clock.isNight);
        root.setAttribute('aria-label', `万世時計：${clock.label}、${clock.sekki}（${clock.season}）`);
    }

    return { el: root, update };
}
