// A small map of where a time-shard (or a realm) sits and which districts it
// holds: the same shard geometry the big map uses, drawn as inline SVG in the
// place's own palette. Pure DOM, read-only.

import { buildScene } from './map.js';
import { svg, h, accentOf, deepOf, lightOf, mixHex, rgba, districtShort, placeShort } from './util.js';

let sceneCache = null, sceneFor = null;
function sceneOf(W) {
    if (sceneFor !== W) { sceneCache = buildScene(W); sceneFor = W; }
    return sceneCache;
}

let uid = 0;

export function placeMiniMap(W, place) {
    const scene = sceneOf(W);
    const me = scene.placeById.get(place.id);
    if (!me) return null;
    const pal = (place.aesthetic && place.aesthetic.palette) || [];
    const accent = accentOf(pal), deep = mixHex(deepOf(pal), '#141a58', 0.55), light = lightOf(pal);
    const mine = scene.districts.filter(d => d.place === me && !d.isHub);

    // frame: the shard itself, or the realm's gem with its districts
    const pts = me.isEra ? me.poly.slice() : [[me.x - 9, me.y - 7], [me.x + 9, me.y + 7]];
    for (const d of mine) pts.push([d.x, d.y]);
    if (me.isEra) pts.push([scene.hub.x, scene.hub.y]);
    let x0 = Math.min(...pts.map(p => p[0])), x1 = Math.max(...pts.map(p => p[0]));
    let y0 = Math.min(...pts.map(p => p[1])), y1 = Math.max(...pts.map(p => p[1]));
    const pad = 5;
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
    let w = x1 - x0, hh = y1 - y0;
    const aspect = 1.55;                       // always a landscape card, whatever the wedge's shape
    if (w / hh < aspect) { const nw = hh * aspect; x0 -= (nw - w) / 2; w = nw; }
    else { const nh = w / aspect; y0 -= (nh - hh) / 2; hh = nh; }
    const u = w / 100;
    const id = 'mm' + (uid++);
    const f = n => n.toFixed(2);

    const kids = [
        svg('defs', {},
            svg('radialGradient', { id: id + 'g', cx: '35%', cy: '30%', r: '90%' },
                svg('stop', { offset: 0, 'stop-color': mixHex(light, accent, 0.4), 'stop-opacity': 0.95 }),
                svg('stop', { offset: 0.55, 'stop-color': accent, 'stop-opacity': 0.8 }),
                svg('stop', { offset: 1, 'stop-color': deep, 'stop-opacity': 0.95 })),
            svg('linearGradient', { id: id + 'b', x1: 0, y1: 0, x2: 1, y2: 1 },
                svg('stop', { offset: 0, 'stop-color': '#10154a' }), svg('stop', { offset: 1, 'stop-color': '#1b1f66' }))),
        svg('rect', { x: f(x0), y: f(y0), width: f(w), height: f(hh), fill: `url(#${id}b)` })
    ];
    // the other shards, faint, so the viewer sees where this one sits in the ring
    for (const e of scene.eras) {
        if (e === me) continue;
        kids.push(svg('polygon', {
            points: e.poly.map(p => f(p[0]) + ',' + f(p[1])).join(' '),
            fill: rgba(e.accent, 0.1), stroke: rgba('#f2c86b', 0.28), 'stroke-width': f(0.35 * u), 'stroke-linejoin': 'round'
        }));
    }
    if (me.isEra) {
        kids.push(svg('polygon', {
            points: me.poly.map(p => f(p[0]) + ',' + f(p[1])).join(' '),
            fill: `url(#${id}g)`, stroke: '#f6dc98', 'stroke-width': f(0.7 * u), 'stroke-linejoin': 'round'
        }));
    } else {
        kids.push(
            svg('circle', { cx: f(me.x), cy: f(me.y), r: f(7 * u), fill: rgba(accent, 0.22) }),
            svg('circle', { cx: f(me.x), cy: f(me.y), r: f(3.4 * u), fill: `url(#${id}g)`, stroke: '#f6dc98', 'stroke-width': f(0.6 * u) }));
    }
    // the hub clock, the shared centre
    kids.push(
        svg('circle', { cx: f(scene.hub.x), cy: f(scene.hub.y), r: f(2.2 * u), fill: 'none', stroke: '#f2c86b', 'stroke-width': f(0.55 * u) }),
        svg('circle', { cx: f(scene.hub.x), cy: f(scene.hub.y), r: f(0.8 * u), fill: '#fff4cf' }));
    const fs = 3.7 * u;
    const r = 1.5 * u;
    const taken = [];      // label boxes already placed, so names never sit on one another
    const boxOf = (cx, cy, text) => { const bw = text.length * fs * 1.02; return [cx - bw / 2, cy - fs * 0.62, cx + bw / 2, cy + fs * 0.45]; };
    const clash = b => taken.some(t => b[0] < t[2] && b[2] > t[0] && b[1] < t[3] && b[3] > t[1]);
    const marks = [];
    for (const d of mine) {
        marks.push(svg('path', { d: `M${f(d.x)} ${f(d.y - r)}L${f(d.x + r)} ${f(d.y)}L${f(d.x)} ${f(d.y + r)}L${f(d.x - r)} ${f(d.y)}Z`, fill: '#fff4cf', stroke: accent, 'stroke-width': f(0.5 * u) }));
        taken.push([d.x - r, d.y - r, d.x + r, d.y + r]);
    }
    for (const d of mine) {
        const nm = districtShort(d.raw);
        const w = nm.length * fs * 1.02;
        // below, above, right, left: the first spot that is free
        const spots = [[d.x, d.y + r + fs * 0.95, 'middle'], [d.x, d.y - r - fs * 0.35, 'middle'], [d.x + r + fs * 0.4, d.y + fs * 0.32, 'start'], [d.x - r - fs * 0.4, d.y + fs * 0.32, 'end']];
        let pick = spots[0];
        for (const sp of spots) {
            const cx = sp[2] === 'middle' ? sp[0] : sp[2] === 'start' ? sp[0] + w / 2 : sp[0] - w / 2;
            if (!clash(boxOf(cx, sp[1] - fs * 0.3, nm))) { pick = sp; break; }
        }
        const cx = pick[2] === 'middle' ? pick[0] : pick[2] === 'start' ? pick[0] + w / 2 : pick[0] - w / 2;
        taken.push(boxOf(cx, pick[1] - fs * 0.3, nm));
        marks.push(svg('text', {
            x: f(pick[0]), y: f(pick[1]), 'text-anchor': pick[2], 'font-size': f(fs), 'font-weight': 600,
            fill: '#fff6dc', stroke: 'rgba(8,10,40,.9)', 'stroke-width': f(fs * 0.28), 'paint-order': 'stroke', 'stroke-linejoin': 'round',
            'font-family': '"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho",serif'
        }, nm));
    }
    kids.push(...marks);
    const name = placeShort(place);
    const el = svg('svg', {
        class: 'mini-map', viewBox: `${f(x0)} ${f(y0)} ${f(w)} ${f(hh)}`, role: 'img',
        'aria-label': `${name}の見取り図。${mine.length ? '地区：' + mine.map(d => districtShort(d.raw)).join('、') : ''}`,
        preserveAspectRatio: 'xMidYMid meet'
    }, ...kids);
    return h('figure', { class: 'mini-map-fig' }, el,
        h('figcaption', null, me.isEra ? `${name}の見取り図 ・ 金の輪は万世時計` : `${name}の見取り図`));
}
