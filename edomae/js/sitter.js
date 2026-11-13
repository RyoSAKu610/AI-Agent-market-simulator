// 江戸前 Edomae — someone at work inside an open shop front, seen from the street:
// kneeling (seiza) or standing at a bench, hands busy with a keyed task. Drawn in
// figure space (feet/knees on y = 120) and placed with place(). Life inside the
// cutaway rooms is what makes 横から生活が見える.

import { el, limb, curve, place, f, pt, PEN, PAPER } from './lib/ink.js';
import { C, oval } from './kit.js';
import { nightTint } from './lib/daynight.js';

// task → keyed hand path (dx, dy offsets from the rest hand) over its period
const clamp01 = x => Math.max(0, Math.min(1, x));
const TASKS = {
    abacus: { period: 1.2, x: [[0, 0], [0.15, 2.2], [0.3, 0.4], [0.45, 2.6], [0.6, -0.2], [0.9, 1.4]], y: [[0, 0], [0.15, 0.6], [0.3, 0], [0.6, 0.6], [0.9, 0]] },
    write: { period: 2.6, x: [[0, -3], [0.8, 0], [1.4, 3], [1.8, 2.6], [2.2, -2]], y: [[0, 0], [0.4, 1.4], [0.9, 0.2], [1.4, 1.2], [2.2, 0]] },
    hammer: { period: 0.9, x: [[0, 0], [0.3, -1.6], [0.45, 0.4], [0.7, 0]], y: [[0, 0], [0.3, -9], [0.42, 0.6], [0.6, 0]] },
    pour: { period: 4.2, x: [[0, 0], [1.4, 4], [2.6, 4.4], [3.6, 0]], y: [[0, 0], [1.4, -6], [2.6, -5], [3.6, 0]] },
    sew: { period: 1.6, x: [[0, 0], [0.5, 4], [0.8, 4.4], [1.2, 0.6]], y: [[0, 0], [0.5, -4], [0.8, -3], [1.2, 0]] },
    read: { period: 7, x: [[0, 0], [5.6, 0], [6.1, 1.6], [6.6, 0]], y: [[0, 0], [5.6, 0], [6.1, -1.6], [6.6, 0]] },
    tea: { period: 6.4, x: [[0, 0], [3.6, 0], [4.4, -9], [5.2, -9.4], [6, 0]], y: [[0, 0], [3.6, 0], [4.4, -16], [5.2, -16.4], [6, 0]] },
    feed: { period: 3.2, x: [[0, 0], [1.6, 0], [2, 7], [2.4, 6], [2.8, 0]], y: [[0, 0], [1.6, 0], [2, 6], [2.4, 7], [2.8, 0]] },
    flag: { period: 1.4, x: [[0, -4], [0.7, 6], [1.4, -4]], y: [[0, -18], [0.35, -22], [0.7, -18], [1.05, -22]] }
};

// kind: 'kneel' | 'stand'; colour: garment; task: one of TASKS; hair: 'topknot' | 'bun' | 'cap'
export function createSitter(parent, { x, y, dir = 1, scale = 0.5, kind = 'kneel', colour = '#34507a', task = 'abacus', hair = 'topknot', seed = 0.3 }) {
    const g = el('g', {}, parent);
    place(g, x, y, dir, scale);
    const T = TASKS[task] || TASKS.abacus;
    const kx = curve(T.x, T.period), ky = curve(T.y, T.period);
    const kneel = kind === 'kneel', onBench = kind === 'bench';
    const hipY = kneel ? 106 : onBench ? 95 : 72, shY = hipY - 26, headY = shY - 12.6;
    const farArm = limb(g, 3.4);
    let lower = null;
    if (kneel) lower = C(g, `M28 120 Q26.4 111 31 106 L48 105.6 Q53.4 108 54.4 117 Q54.6 120 52 120Z`, colour, PEN);
    else if (onBench) {
        // sitting on a 縁台: thighs forward along the seat, shins down, feet on the ground
        lower = C(g, `M32 ${hipY - 3} Q31 ${hipY + 4} 34 ${hipY + 5} L52 ${hipY + 5.6} Q55.4 ${hipY + 6} 55.6 ${hipY + 12} L56 117 L49.6 117.4 L49.4 ${hipY + 11} L36 ${hipY + 10} Q31.6 ${hipY + 8} 32 ${hipY - 3}Z`, colour, PEN);
        el('path', { d: `M49.6 117 l7 0 l0 2.6 l-7 0Z`, fill: 'currentColor' }, g);
    }
    else lower = C(g, `M33 ${hipY - 2} L47 ${hipY - 2} Q49 ${hipY + 22} 48.4 116.4 L31.6 116.6 Q31 ${hipY + 20} 33 ${hipY - 2}Z`, colour, PEN);
    if (!kneel) el('path', { d: 'M33.4 116.4 l5.6 0 l0 2.6 l-5.6 0Z M41 116.4 l5.6 0 l0 2.6 l-5.6 0Z', fill: 'currentColor' }, g);
    const up = el('g', {}, g);
    const torso = C(up, `M35.4 ${shY - 2.6} Q31.6 ${shY} 31.8 ${shY + 6.6} Q31.4 ${shY + 15} 31.6 ${hipY} L48 ${hipY} Q48.6 ${shY + 11} 46.8 ${shY + 2.6} Q45.6 ${shY - 1.6} 43.4 ${shY - 2.6} Q39.4 ${shY - 3.6} 35.4 ${shY - 2.6}Z`, colour, PEN);
    el('path', { d: `M37.6 ${shY - 2.2} L41.6 ${shY + 7.8} L44.8 ${shY - 2} L43 ${shY - 2.6} L41.4 ${shY + 3.4} L39.2 ${shY - 2.4}Z`, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.8 }, up);
    const neck = limb(up, 3);
    neck.draw([[40.7, shY - 2], [41, shY - 8.6]], [0.2, 0.2]);
    el('ellipse', { cx: 41.4, cy: headY, rx: 4.1, ry: 5, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN }, up);
    const hx = 41.4, hy = headY;
    const hairD = hair === 'bun'
        ? `M${hx - 4.4} ${hy + 1.4} Q${hx - 5.2} ${hy - 5.6} ${hx + 0.4} ${hy - 5.6} Q${hx + 4.8} ${hy - 5.4} ${hx + 4.4} ${hy - 1.4} Q${hx + 1.6} ${hy - 4} ${hx - 1.6} ${hy - 2.6} Q${hx - 3.2} ${hy - 1} ${hx - 4.4} ${hy + 1.4}Z ${oval(hx - 4.4, hy - 3.8, 2.6, 2.4)}`
        : hair === 'cap'
            ? `M${hx - 4.8} ${hy - 1} Q${hx - 5} ${hy - 6.8} ${hx + 0.4} ${hy - 6.6} Q${hx + 5.4} ${hy - 6.4} ${hx + 5} ${hy - 1.6} L${hx + 6.8} ${hy - 1.2} L${hx - 4.8} ${hy - 1}Z`
            : `M${hx - 4.2} ${hy + 0.8} Q${hx - 4.8} ${hy - 5.8} ${hx + 0.4} ${hy - 5.4} Q${hx - 2.4} ${hy - 3.4} ${hx - 2.6} ${hy + 0.4} Q${hx - 3.4} ${hy + 2.2} ${hx - 4.2} ${hy + 0.8}Z M${hx - 1.6} ${hy - 5.2} Q${hx + 1.4} ${hy - 8.4} ${hx + 4.6} ${hy - 7.6} Q${hx + 1.8} ${hy - 6.8} ${hx} ${hy - 4.8}Z`;
    el('path', { d: hairD, fill: 'currentColor' }, up);
    const nearArm = limb(up, 3.6);
    const hand = el('ellipse', { rx: 1.8, ry: 1.5, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.7 }, up);
    const tool = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': PEN * 0.9, 'stroke-linecap': 'round' }, up);
    const shN = [43.2, shY + 0.6], shF = [37.4, shY + 0.4];
    const rest = kneel ? [54, hipY - 4] : onBench ? (task === 'read' ? [52, shY + 4] : [54, hipY - 2]) : [55, hipY - 6];
    const sheetN = task === 'read' ? el('path', { fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.8 }, up) : null;
    const sheetInk = task === 'read' ? el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': PEN * 0.4 }, up) : null;
    const cup = task === 'tea' ? el('path', { fill: '#e8dcc0', stroke: 'currentColor', 'stroke-width': PEN * 0.7 }, up) : null;
    let t0 = seed * 10, pause = 0, lastInk = -1;
    return {
        g,
        draw(t, dt, Pal) {
            // work comes in bursts with short pauses (randomised intervals, not shapes)
            pause -= dt;
            if (pause < -6 - seed * 4) pause = 1.2 + ((t * 7.3 + seed * 13) % 2.4);
            if (pause <= 0) t0 += dt;
            const h = [rest[0] + kx(t0), rest[1] + ky(t0)];
            const lean = pause > 0 ? 0 : 3 + ky(t0) * 0.1;
            up.setAttribute('transform', `rotate(${f(lean)} 40 ${hipY})`);
            const mid = [(shN[0] + h[0]) / 2 - 1, (shN[1] + h[1]) / 2 + 5];
            nearArm.draw([shN, mid, h], [0.2, 0.4]);
            hand.setAttribute('cx', f(h[0])); hand.setAttribute('cy', f(h[1]));
            farArm.draw([shF, [shF[0] + 6, shF[1] + 14], [rest[0] - 4, rest[1] + 2]], [0.2, 0.5]);
            if (sheetN) {
                // the paper held open in both hands, a page turned now and then
                const x0 = h[0] - 2, y0 = h[1] - 18, turn = clamp01((t0 % 7 - 5.6) / 1);
                sheetN.setAttribute('d', `M${f(x0)} ${f(y0)} L${f(x0 + 16 - turn * 6)} ${f(y0 - 1)} L${f(x0 + 16.6 - turn * 6)} ${f(y0 + 20)} L${f(x0 + 0.6)} ${f(y0 + 21)}Z`);
                const d = []; for (let x = x0 + 13 - turn * 5; x > x0 + 1.6; x -= 2.2) d.push(`M${f(x)} ${f(y0 + 2.4)} l0 ${x < x0 + 7 ? 7 : 15}`);
                sheetInk.setAttribute('d', d.join(' ') + ` M${f(x0 + 2)} ${f(y0 + 11)} L${f(x0 + 7)} ${f(y0 + 11)} L${f(x0 + 7)} ${f(y0 + 18)} L${f(x0 + 2)} ${f(y0 + 18)}Z`);
            }
            if (cup) cup.setAttribute('d', `M${f(h[0] - 1)} ${f(h[1] - 1)} L${f(h[0] - 1.6)} ${f(h[1] - 5.4)} L${f(h[0] + 3.4)} ${f(h[1] - 5.4)} L${f(h[0] + 2.8)} ${f(h[1] - 1)}Z`);
            tool.setAttribute('d', task === 'hammer' ? `M${pt(h)} l4 -6 M${f(h[0] + 2.6)} ${f(h[1] - 7.4)} l3 2` : task === 'write' ? `M${pt(h)} l2.6 -5.6` : task === 'flag' ? `M${pt(h)} l0 -12` : '');
            if (Math.abs(Pal.inkT - lastInk) > 0.02) { lastInk = Pal.inkT; for (const n of [lower, torso]) n.setAttribute('fill', nightTint(colour, Pal)); }
        }
    };
}
