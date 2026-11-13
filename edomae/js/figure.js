// 江戸前 Edomae — one resident drawn in ink.
//
// Figure space as in lib/ink.js: ~95 units tall, feet on y = 120, facing +x,
// standing on x = 40. The legs are always solved with lib/gait.js (even under a
// kimono); the garment is drawn around the solved knees and ankles so the hem
// opens and closes with the stride. Sleeves, tails, scarves, lanterns and bags
// hang on springs and pendulums. Nodes are created once; update() only rewrites
// attributes. No free-running sines: idle breathing is a keyed curve.

import { el, pen, shape, blot, paint, limb, solid, shoe, curve, f, pt, PEN, PAPER } from './lib/ink.js';
import { gait } from './lib/gait.js';
import { spring, pendulum, clamp, lerp, smooth, ease } from './lib/motion.js';
import { nightTint, toRGB, rgb, mix } from './lib/daynight.js';

const RAD = Math.PI / 180;
const UP_HIP = 70.8;                       // upper-body shapes are drawn for this hip height
const WAIST = [40, 69.6];                  // the body bends here (bows)
const SH_FAR = [37.4, 46.2], SH_NEAR = [43.2, 46.6];
const ARM = [17.4, 16.4];
const HEAD = [41.4, 33.2];
const WARM = toRGB('#ffd08a');

const oval = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)} a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0 a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
const L2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// Two-bone IK that prefers the elbow on the side of `pref` (a direction vector).
function ik(a, b, l1, l2, pref) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = clamp(Math.hypot(dx, dy), 0.5, l1 + l2 - 0.01);
    const th = Math.atan2(dy, dx);
    const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const c1 = [a[0] + l1 * Math.cos(th - al), a[1] + l1 * Math.sin(th - al)];
    const c2 = [a[0] + l1 * Math.cos(th + al), a[1] + l1 * Math.sin(th + al)];
    const s1 = (c1[0] - a[0]) * pref[0] + (c1[1] - a[1]) * pref[1];
    const s2 = (c2[0] - a[0]) * pref[0] + (c2[1] - a[1]) * pref[1];
    const e = s1 >= s2 ? c1 : c2;
    // the hand lands where it can reach along the shoulder→target line
    const hx = a[0] + Math.cos(th) * d, hy = a[1] + Math.sin(th) * d;
    return [e, [hx, hy]];
}
const swingArm = (sh, deg, bend = 9) => {
    const r = deg * RAD, e = [sh[0] + ARM[0] * Math.sin(r), sh[1] + ARM[0] * Math.cos(r)];
    const r2 = (deg + bend) * RAD;
    return [e, [e[0] + ARM[1] * Math.sin(r2), e[1] + ARM[1] * Math.cos(r2)]];
};

const HIDDEN_LEGS = new Set(['kimono', 'robe', 'paper', 'dogu']);
const WIDE_SLEEVE = new Set(['kimono', 'robe', 'hakama']);

// ------------------------------------------------------------------ static upper-body shapes (UP_HIP space)

function torsoPath(garment) {
    switch (garment) {
        case 'robe': return 'M34.8 43.4 Q30.2 46 30.4 53 Q29.6 61 30.2 70.2 L49.4 70.2 Q50.2 58 48.4 49.2 Q47 44.4 44.2 43.2 Q39.4 41.6 34.8 43.4Z';
        case 'coat': return 'M35.8 43.6 Q32.4 45.6 32.6 52 Q32.2 60 32.8 69.8 L47.6 69.8 Q48 58 46.8 49.4 Q45.8 44.6 43.4 43.4 Q39.6 42.4 35.8 43.6Z';
        case 'short': return 'M35.6 43.6 Q32 46 32.2 52.6 Q31.8 60.6 32.2 69.8 L47.8 69.8 Q48.4 57.4 46.8 48.8 Q45.6 44.4 43.4 43.4 Q39.4 42.4 35.6 43.6Z';
        case 'dogu': return 'M33.4 44.6 Q27.6 46.4 28.2 53.6 Q28.8 61.4 31.6 69.4 L48.6 69.4 Q51.6 61 51.8 53.2 Q51.6 46.2 46 44.2 Q39.8 42.4 33.4 44.6Z';
        case 'paper': return 'M36.4 42.8 Q32.6 50 31.6 69.6 L48.6 69.6 Q47.4 50.4 44 42.8 Q40.2 41.8 36.4 42.8Z';
        default: return 'M35.6 43.2 Q31.8 45.8 32 52.4 Q31.4 60.5 31.8 69.6 L48 69.6 Q48.6 57 46.9 48.6 Q45.8 44.2 43.6 43.2 Q39.6 42.2 35.6 43.2Z';
    }
}

function hairPath(style) {
    const [x, y] = HEAD;
    switch (style) {
        case 'topknot': return `M${x - 4.2} ${y + 0.8} Q${x - 4.8} ${y - 5.8} ${x + 0.4} ${y - 5.4} Q${x - 2.4} ${y - 3.4} ${x - 2.6} ${y + 0.4} Q${x - 3.4} ${y + 2.2} ${x - 4.2} ${y + 0.8}Z M${x - 1.6} ${y - 5.2} Q${x + 1.4} ${y - 8.4} ${x + 4.6} ${y - 7.6} Q${x + 1.8} ${y - 6.8} ${x} ${y - 4.8}Z`;
        case 'bun': return `M${x - 4.4} ${y + 1.4} Q${x - 5.2} ${y - 5.6} ${x + 0.4} ${y - 5.6} Q${x + 4.8} ${y - 5.4} ${x + 4.4} ${y - 1.4} Q${x + 1.6} ${y - 4} ${x - 1.6} ${y - 2.6} Q${x - 3.2} ${y - 1} ${x - 4.4} ${y + 1.4}Z ${oval(x - 4.4, y - 3.8, 2.6, 2.4)}`;
        case 'tied': return `M${x - 4.4} ${y + 1.2} Q${x - 5.4} ${y - 5.8} ${x + 0.6} ${y - 5.6} Q${x + 4.6} ${y - 5} ${x + 4.2} ${y - 1.8} Q${x + 1} ${y - 4.2} ${x - 2} ${y - 2.4} Q${x - 3.4} ${y - 0.8} ${x - 4.4} ${y + 1.2}Z`;
        case 'bob': return `M${x - 4.6} ${y + 3.6} Q${x - 5.8} ${y - 5.6} ${x + 0.4} ${y - 5.8} Q${x + 5.6} ${y - 5.4} ${x + 4.8} ${y - 0.6} L${x + 2.4} ${y - 0.8} Q${x + 1.6} ${y - 3.4} ${x - 1} ${y - 3} Q${x - 2.6} ${y} ${x - 2.4} ${y + 3.8} Z`;
        case 'long': return `M${x - 4.4} ${y + 1.2} Q${x - 5.6} ${y - 5.8} ${x + 0.6} ${y - 5.8} Q${x + 5} ${y - 5.2} ${x + 4.6} ${y - 1} Q${x + 1.2} ${y - 4} ${x - 1.8} ${y - 2.2} Q${x - 3} ${y} ${x - 4.4} ${y + 1.2}Z`;
        case 'short': return `M${x - 4.4} ${y + 0.8} Q${x - 5.2} ${y - 5.8} ${x + 0.6} ${y - 5.6} Q${x + 4.6} ${y - 5.2} ${x + 4.4} ${y - 1.6} Q${x + 2} ${y - 3.6} ${x - 1.4} ${y - 2.8} Q${x - 3.2} ${y - 1.2} ${x - 4.4} ${y + 0.8}Z`;
        default: return '';
    }
}

// ------------------------------------------------------------------ the figure

// look: from looks.js. Returns { g, glow, look, gait, update(state), hit }
export function createFigure(parent, glowParent, look, { stripes } = {}) {
    const g = el('g', { class: 'resident' }, parent);
    const body = el('g', {}, g);
    const glowRoot = el('g', {}, glowParent);
    const glowBody = el('g', {}, glowRoot);
    const G = look.garment;
    const hidden = HIDDEN_LEGS.has(G);
    const walkG = gait({ kind: look.gaitKind });
    const restHip = walkG.ankleY - (walkG.thigh + walkG.shin) * 0.983;
    const colour = { main: look.main, sub: look.sub, accent: look.accent, apron: look.apron };

    // --- back to front
    const tailOut = look.tail ? el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 4.6, 'stroke-linecap': 'round' }, body) : null;
    const tailIn = look.tail ? el('path', { fill: 'none', stroke: PAPER, class: 'pp-stroke', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, body) : null;
    const hireBack = look.scarf === 'hire' ? paint(body, '#efe6f0', PEN * 0.7) : null;
    const farArmG = el('g', {}, body);
    const farArm = limb(farArmG, 3.5);
    if (!WIDE_SLEEVE.has(G) && G !== 'paper') solid(farArm, colour.main);
    const farSleeve = WIDE_SLEEVE.has(G) ? paint(farArmG, colour.main) : null;
    const farHand = el('ellipse', { rx: 1.7, ry: 1.45, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.7 }, farArmG);
    const longHair = look.hair === 'long' || look.hair === 'tied' ? el('path', { fill: look.hairColour || 'currentColor' }, body) : null;

    const legs = [], feet = [];
    for (let i = 0; i < 2; i++) {
        const lg = el('g', {}, body);
        const leg = hidden ? null : limb(lg, G === 'coat' ? 4.4 : 4.2);
        if (leg) solid(leg, G === 'coat' ? '#2e2c2c' : look.legs || colour.sub);
        const sock = (hidden || G === 'hakama') && !look.barefoot && !look.wheels ? shape(lg, PEN * 0.72) : null;
        const sole = look.wheels ? el('circle', { r: 3, fill: '#b98a3a', stroke: 'currentColor', 'stroke-width': PEN * 0.7 }, lg) : blot(lg);
        legs.push({ g: lg, leg });
        feet.push({ sock, sole });
    }
    const hakamaPanels = G === 'hakama' ? [paint(body, colour.sub), paint(body, colour.sub)] : null;
    const hakamaPleats = G === 'hakama' ? pen(body, PEN * 0.45) : null;
    const lower = hidden || G === 'coat' || G === 'short' ? paint(body, colour.main) : null;
    const lowerFold = lower ? pen(body, PEN * 0.5) : null;
    const lowerMarks = lower && look.pattern !== 'none' ? el('path', { fill: 'none', stroke: patternInk(look), 'stroke-width': PEN * 0.55, 'stroke-linecap': 'round' }, body) : null;
    const apron = look.apron ? paint(body, look.apron, PEN * 0.8) : null;
    const cords = look.prop === 'cords' ? pen(body, PEN * 0.6) : null;

    // upper body: static shapes in UP_HIP space, moved by one transform
    const up = el('g', {}, body);
    const pack = look.back === 'pack' ? paint(up, look.packColour || colour.sub, PEN * 0.9) : null;
    if (pack) {
        pack.setAttribute('d', 'M33.4 45 Q26.4 45.4 25.8 52.6 Q25.4 60.4 30.6 62.4 Q34 63 34.6 58Z');
        pen(up, PEN * 0.5).setAttribute('d', 'M27.2 50.4 Q30.6 53.2 33.6 50.6 M28.6 57.6 Q31 56 33.8 57.8');
    }
    const torso = paint(up, colour.main);
    torso.setAttribute('d', torsoPath(G));
    const torsoMarks = look.pattern !== 'none' ? el('path', { fill: 'none', stroke: patternInk(look), 'stroke-width': PEN * 0.55, 'stroke-linecap': 'round' }, up) : null;
    if (torsoMarks) torsoMarks.setAttribute('d', patternMarks(look.pattern, [[36.4, 52], [43, 49.6], [38.6, 59.4], [44.6, 57]]));
    const fold = pen(up, PEN * 0.5);
    fold.setAttribute('d', G === 'coat' ? 'M44.4 46 Q45.4 56 45.2 69.6 M42.8 50 l1.4 0.2 M43 56 l1.4 0.2 M43.2 62 l1.4 0.2' : G === 'short' ? 'M43.6 44.2 L45.4 69.6' : G === 'dogu' ? 'M33 52 q4 -3 8 0 q4 3 8 0 M32.4 60 q4.4 -3 8.4 0 q4 3 8.4 0' : G === 'paper' ? 'M40.2 43 L40.4 69.4 M36 56 L44.8 56' : 'M38 52.6 Q40.4 56 40.6 60');
    let obi = null;
    if (G === 'kimono' || G === 'hakama' || G === 'robe') {
        obi = paint(up, G === 'robe' ? colour.sub : colour.sub, PEN * 0.9);
        obi.setAttribute('d', G === 'robe' ? 'M30.4 63.6 Q40 62.6 49.6 63.6 L49.6 67.6 Q40 66.8 30.4 67.6Z' : 'M31.8 59.6 L47.9 60 L48 66.6 L31.7 66.2Z');
        if (G === 'kimono' && (look.hair === 'long' || look.hair === 'bob' || look.scarf === 'hire')) {
            const taiko = paint(up, colour.sub, PEN * 0.9);
            taiko.setAttribute('d', 'M32 58.4 L26.2 59.4 Q25.2 65.6 26.4 73 L32 71.8Z');
        }
    } else if (G === 'coat' || G === 'short') {
        const belt = pen(up, PEN * 1.5);
        belt.setAttribute('d', G === 'coat' ? 'M32.6 62.4 Q40 63.2 47.4 62.4' : 'M32.2 63.6 Q40 64.4 47.8 63.6');
        if (G === 'short') { belt.setAttribute('stroke', colour.sub); belt.removeAttribute('class'); }
    }
    const collar = shape(up, PEN * 0.8);
    collar.setAttribute('d', G === 'coat' ? 'M37 43.6 L41.4 52.4 L45 43.8 L43 43.2 L41.4 48.4 L39 43.2Z' : G === 'dogu' ? 'M35 44.4 Q40.6 47.4 46 44.2 Q40.6 45.4 35 44.4Z' : G === 'paper' ? 'M37 43 L41 49 L44 43Z' : 'M37.6 43.6 L41.6 53.6 L44.9 43.8 L43.1 43.2 L41.4 49.2 L39.3 43.3Z');
    if (G === 'short') { const eri = el('path', { d: 'M38.4 43.4 L42.8 69.8 L45.2 69.8 L41 43.2Z', fill: colour.sub, stroke: 'currentColor', 'stroke-width': PEN * 0.5 }, up); up.insertBefore(eri, collar); }
    const scarf = look.scarf === 'scarf' ? paint(up, colour.accent, PEN * 0.8) : null;
    if (scarf) scarf.setAttribute('d', 'M36.6 42.6 Q41 46.8 45.4 42.8 L45.6 45.6 Q41 49.6 36.4 45.4Z');
    const neck = limb(up, 3.1);
    neck.draw([[40.7, 44.6], [41, 37.6]], [0.2, 0.2]);
    const headN = look.hat === 'gearhead' ? paint(up, '#c8a24a', PEN) : look.hat === 'origami' ? shape(up, PEN) : el('ellipse', { cx: HEAD[0], cy: HEAD[1], rx: look.hat === 'goggles' ? 5.6 : 4.1, ry: look.hat === 'goggles' ? 5.4 : 5, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN }, up);
    if (look.hat === 'gearhead') {
        const [x, y] = HEAD, pts = [];
        for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 5.6 : 4.6; pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]); }
        headN.setAttribute('d', 'M' + pts.map(pt).join('L') + 'Z');
        pen(up, PEN * 0.6).setAttribute('d', `${oval(x, y, 2.2, 2.2)} M${x + 0.4} ${y - 3.6} l1 0`);
    }
    if (look.hat === 'origami') headN.setAttribute('d', `M${HEAD[0] - 4} ${HEAD[1] + 4} L${HEAD[0] - 1.4} ${HEAD[1] - 6} L${HEAD[0] + 7.6} ${HEAD[1] - 1.4} L${HEAD[0] + 3.4} ${HEAD[1] + 4.6}Z`);
    const hair = look.hair !== 'none' ? el('path', { fill: look.hairColour || 'currentColor' }, up) : null;
    if (hair) hair.setAttribute('d', hairPath(look.hair));
    const hat = buildHat(up, look);
    const hatLift = hat && hat.lift ? hat.lift : null;
    const nearArmG = el('g', {}, up);
    const nearArm = limb(nearArmG, 3.6);
    if (!WIDE_SLEEVE.has(G) && G !== 'paper') solid(nearArm, colour.main);
    const nearSleeve = WIDE_SLEEVE.has(G) ? paint(nearArmG, colour.main) : null;
    const nearHand = el('ellipse', { rx: 1.8, ry: 1.5, fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.7 }, nearArmG);
    const prop = buildProp(nearArmG, glowBody, look);
    const sheet = look.sheet ? buildSheet(up, look.sheet) : null;
    // a 番傘 for rain: oiled paper on bamboo ribs, opened over the head when it rains
    const umb = el('g', { style: 'display:none' }, up);
    const umbPole = pen(umb, PEN * 0.8);
    const umbTop = paint(umb, ['#c8403a', '#c9a868', '#34507a'][Math.floor(((look.id || '').length * 7 + (look.id || '').charCodeAt(0)) % 3)], PEN * 0.9);
    const umbRibs = pen(umb, PEN * 0.4);
    const umbFill = umbTop.getAttribute('fill');
    const hip = look.hip === 'jar' ? buildJars(body, glowBody, look) : null;
    const pouch = look.hip === 'pouch' ? paint(up, '#8a6a4a', PEN * 0.7) : null;
    if (pouch) pouch.setAttribute('d', 'M46.2 66 Q49.6 66.6 49.4 70.4 Q49 73.6 46.6 73.4 Q45 72 46.2 66Z');
    const marks = el('g', { opacity: 0, transform: 'translate(0 2)' }, up);
    const bang = pen(marks, PEN * 1.1); bang.setAttribute('d', 'M45.8 12.4 Q46.4 16.6 46 20.6 M46.1 24.2 l0.1 0.2');
    const dots = el('path', { fill: 'currentColor' }, marks);
    dots.setAttribute('d', `${oval(46, 20.4, 0.9, 0.9)} ${oval(49.4, 16.6, 1.15, 1.15)} ${oval(53.4, 12, 1.5, 1.5)}`);
    const hit = el('rect', { x: 24, y: 14, width: 34, height: 108, fill: 'transparent' }, body);

    // --- motion state
    const arms = [spring(60, 9), spring(60, 9)];
    const slv = spring(40, 6), tail = spring(26, 3.4), hairS = spring(30, 4.4), stole = spring(22, 3.2);
    const breath = curve([[0, 0], [look.breath * 0.42, 0.36], [look.breath * 0.62, 0.3], [look.breath * 0.9, 0.04]], look.breath);
    const flatFills = [[torso, colour.main], [lower, colour.main], [farSleeve, colour.main], [nearSleeve, colour.main], [obi, colour.sub],
        [pack, look.packColour || colour.sub], [umbTop, umbFill], [apron, look.apron], [scarf, colour.accent], [hakamaPanels && hakamaPanels[0], colour.sub], [hakamaPanels && hakamaPanels[1], colour.sub]]
        .filter(([n, c]) => n && c);
    let lastInk = -1;

    // a point in upper-body space → figure space, given the current upper transform
    let upDY = 0, upRot = 0;
    const upToFig = (x, y) => {
        const c = Math.cos(upRot * RAD), s = Math.sin(upRot * RAD);
        const dx = x - WAIST[0], dy = y - WAIST[1];
        return [WAIST[0] + dx * c - dy * s, WAIST[1] + dx * s + dy * c + upDY];
    };

    function update(st) {
        const { phase, go, t, dt, P, wind } = st;
        const act = st.act || {};
        const bow = ease(act.bow || 0), reach = ease(act.reach || 0), chin = ease(act.chin || 0), start = act.start || 0;
        const read = ease(act.read || 0), show = ease(act.show || 0), call = ease(act.call || 0), talk = act.talk || 0, umbrella = ease(act.umb || 0);
        const p = walkG.pose(phase, go);
        const b = p.bob, hy = p.hip[1];
        const iF = p.front, iR = 1 - iF;
        const aF = p.feet[iF].ankle, aR = p.feet[iR].ankle, kF = p.feet[iF].knee, kR = p.feet[iR].knee;

        // --- legs and feet; the leading leg on top
        for (let i = 0; i < 2; i++) {
            const fo = p.feet[i];
            if (legs[i].leg) legs[i].leg.draw([p.hip, fo.knee, fo.ankle], [0.3, 0.8]);
            drawFoot(feet[i], fo.ankle, fo.pitch, look, G);
        }
        body.insertBefore(legs[iF].g, legs[iR].g.nextSibling);

        // --- lower garment around the knees and ankles
        if (G === 'kimono' || G === 'robe' || G === 'paper' || G === 'dogu') {
            const wide = G === 'robe' ? 1.6 : G === 'dogu' ? 3.2 : G === 'paper' ? 1 : 0;
            const hemY = G === 'robe' ? 115.4 : G === 'dogu' ? 109 : G === 'paper' ? 112 : 112.6;
            const wB = [31.8 - wide * 0.6, hy - 1.2], wF = [47.9 + wide * 0.6, hy - 0.9];
            const hemF = [Math.max(46.6 + wide, aF[0] + 4.4), hemY], hemR = [Math.min(31.2 - wide, aR[0] - 2.6), hemY + 0.4];
            const kx = Math.max(kF[0] + 2.6 + wide * 0.5, 47.6 + wide * 0.5);
            lower.setAttribute('d', `M${pt(wB)} L${pt(wF)} C${f(48.8 + wide)} ${f(hy + 10)} ${f(kx)} ${f(kF[1] - 9)} ${f(kx)} ${f(kF[1])} Q${f(kx - 0.2)} ${f((kF[1] + hemF[1]) / 2 + 2)} ${pt(hemF)} Q${f((hemF[0] + hemR[0]) / 2)} ${f(hemY + 1.1)} ${pt(hemR)} Q${f(Math.min(30.8 - wide, hemR[0] + 1.6))} ${f(hy + 21)} ${pt(wB)}Z`);
            lowerFold.setAttribute('d', `M${f(44.4)} ${f(hy + 1.6)} Q${f(kF[0] - 0.6)} ${f(kF[1] + 3)} ${f(Math.max(42, aF[0] + 0.8))} ${f(hemY)} M${f(kR[0] + 1.6)} ${f(kR[1] - 4)} Q${f(kR[0] + 0.4)} ${f(kR[1] + 6)} ${f(Math.max(hemR[0] + 3, aR[0] + 1.4))} ${f(hemY - 0.2)}`);
        } else if (G === 'coat') {
            const fx = Math.max(kF[0] + 2.4, 46.4), hemY = hy + 21;
            lower.setAttribute('d', `M${f(32.6)} ${f(hy - 3)} L${f(47.6)} ${f(hy - 3)} Q${f(fx)} ${f(hy + 6)} ${f(Math.max(fx, aF[0] - 4))} ${f(hemY)} L${f(31)} ${f(hemY + 0.6)} Q${f(Math.min(31.4, kR[0] - 2))} ${f(hy + 8)} ${f(32.6)} ${f(hy - 3)}Z`);
            lowerFold.setAttribute('d', `M${f(44.6)} ${f(hy - 2)} Q${f(fx - 2)} ${f(hy + 8)} ${f(Math.max(fx - 2, aF[0] - 6))} ${f(hemY - 0.4)}`);
        } else if (G === 'short') {
            const fx = Math.max(lerp(40, kF[0], 0.5) + 6.4, 47.4), hemY = hy + 12;
            lower.setAttribute('d', `M${f(32.2)} ${f(hy - 2)} L${f(47.8)} ${f(hy - 2)} Q${f(fx)} ${f(hy + 4)} ${f(fx)} ${f(hemY)} Q${f(40)} ${f(hemY + 1.4)} ${f(31.4)} ${f(hemY + 0.6)} Q${f(31)} ${f(hy + 5)} ${f(32.2)} ${f(hy - 2)}Z`);
            lowerFold.setAttribute('d', `M${f(43.8)} ${f(hy - 1.4)} L${f(lerp(43.8, fx, 0.5))} ${f(hemY + 0.6)}`);
        } else if (G === 'hakama') {
            const panel = (k, a) => `M${f(34.2)} ${f(hy - 1)} Q${f(k[0] - 6.6)} ${f(k[1])} ${f(a[0] - 7.6)} ${f(a[1] - 3.2)} Q${f(a[0])} ${f(a[1] - 1.6)} ${f(a[0] + 7)} ${f(a[1] - 3.6)} Q${f(k[0] + 5.6)} ${f(k[1] - 2)} ${f(46.4)} ${f(hy - 1)}Z`;
            hakamaPanels[0].setAttribute('d', panel(kR, aR));
            hakamaPanels[1].setAttribute('d', panel(kF, aF));
            hakamaPleats.setAttribute('d', `M${f(39.6)} ${f(hy)} Q${f(kF[0] - 1)} ${f(kF[1])} ${f(aF[0] - 0.4)} ${f(aF[1] - 2.4)} M${f(42)} ${f(hy)} Q${f(kF[0] + 1.6)} ${f(kF[1])} ${f(aF[0] + 3.2)} ${f(aF[1] - 3)}`);
        }
        if (lowerMarks) lowerMarks.setAttribute('d', patternMarks(look.pattern, [[36.4, hy + 14], [42, hy + 26], [36, hy + 34], [43.6, hy + 9]], G === 'short' ? hy + 11 : 200));
        if (apron) {
            const fx = Math.max(kF[0] + 1.4, 46.6);
            apron.setAttribute('d', `M${f(34.4)} ${f(hy - 3)} L${f(47.4)} ${f(hy - 3)} Q${f(fx)} ${f(hy + 10)} ${f(fx - 0.4)} ${f(hy + 22)} L${f(36.4)} ${f(hy + 22.6)} Q${f(35)} ${f(hy + 10)} ${f(34.4)} ${f(hy - 3)}Z`);
        }
        if (cords) cords.setAttribute('d', [33, 37, 41, 45].map((x, i) => `M${f(x)} ${f(hy - 1)} Q${f(x - 0.6 + Math.sin(phase * 6.28 + i) * 0.4 * go)} ${f(hy + 6)} ${f(x + 0.4)} ${f(hy + 11 + (i % 2) * 2)}`).join(' '));

        // --- upper body rides on the hip; bows from the waist; a start lifts it
        const breathe = breath(t) * (1 - go * 0.7);
        upDY = hy - UP_HIP - breathe * 0.5 - start * 1.4;
        upRot = bow * 30 + 1.4 * go + look.stoop * 7;
        up.setAttribute('transform', `translate(0 ${f(upDY)}) rotate(${f(upRot)} ${WAIST[0]} ${WAIST[1]})`);

        // --- arms: swing opposite the legs through springs; gestures by IK
        const legSwing = clamp((p.feet[0].ankle[0] - 40) / (walkG.stride / 2), -1, 1);
        const farDeg = arms[0].step(-legSwing * 15 * go - start * 26, dt);
        const nearDeg = arms[1].step(legSwing * 13 * go + start * 30, dt);
        const holdsFront = look.prop === 'tray';
        let [fe, fh] = swingArm(SH_FAR, farDeg);
        let [ne, nh] = swingArm(SH_NEAR, nearDeg);
        if (holdsFront) {
            [fe, fh] = ik(SH_FAR, [51.6, 58.6], ARM[0], ARM[1], [0, 1]);
            [ne, nh] = ik(SH_NEAR, [55.4, 58.2], ARM[0], ARM[1], [0, 1]);
        }
        if (look.prop === 'carry') [ne, nh] = ik(SH_NEAR, [46.6, 39.6], ARM[0], ARM[1], [1, 0.6]);
        if (reach > 0.001) {
            const [e2, h2] = ik(SH_NEAR, [57.8, 54.4], ARM[0], ARM[1], [0, 1]);
            ne = L2(ne, e2, reach); nh = L2(nh, h2, reach);
        }
        if (chin > 0.001) {
            const [e2, h2] = ik(SH_NEAR, [45.6, 37.2], ARM[0], ARM[1], [1, 0.8]);
            ne = L2(ne, e2, chin); nh = L2(nh, h2, chin);
            const [e3, h3] = ik(SH_FAR, [44.4, 57.6], ARM[0], ARM[1], [0.3, 1]);   // the other hand props the elbow
            fe = L2(fe, e3, chin); fh = L2(fh, h3, chin);
        }
        if (talk) {
            // a small open-hand gesture while speaking (amplitude keyed by the caller)
            const [e2, h2] = ik(SH_NEAR, [52 + talk * 3, 56 - talk * 6], ARM[0], ARM[1], [0, 1]);
            ne = L2(ne, e2, Math.min(1, Math.abs(talk) * 2)); nh = L2(nh, h2, Math.min(1, Math.abs(talk) * 2));
        }
        if (read > 0.001 || show > 0.001) {
            // both hands hold the sheet up in front of the face; shown: lowered and turned to us
            const tN = L2([53.6, 46], [57, 60], show), tF = L2([49.6, 48], [51, 62], show);
            const [e2, h2] = ik(SH_NEAR, tN, ARM[0], ARM[1], [0, 1]);
            const [e3, h3] = ik(SH_FAR, tF, ARM[0], ARM[1], [0, 1]);
            const w = Math.max(read, show);
            ne = L2(ne, e2, w); nh = L2(nh, h2, w); fe = L2(fe, e3, w); fh = L2(fh, h3, w);
        }
        if (call > 0.001) {
            // the 読売 calls out: the free arm up with a sheet, then down
            const [e3, h3] = ik(SH_FAR, [52, 20], ARM[0], ARM[1], [1, -0.2]);
            fe = L2(fe, e3, call); fh = L2(fh, h3, call);
        }
        if (umbrella > 0.001 && look.prop !== 'tray' && look.prop !== 'carry') {
            const [e2, h2] = ik(SH_NEAR, [47.4, 50], ARM[0], ARM[1], [0.4, 1]);
            ne = L2(ne, e2, umbrella); nh = L2(nh, h2, umbrella);
        }
        farArm.draw([SH_FAR, fe, fh], [0.2, 0.5]);
        nearArm.draw([SH_NEAR, ne, nh], [0.2, 0.4]);
        farHand.setAttribute('cx', f(fh[0])); farHand.setAttribute('cy', f(fh[1]));
        nearHand.setAttribute('cx', f(nh[0])); nearHand.setAttribute('cy', f(nh[1]));
        const sv = slv.step(-1.4 + legSwing * 0.8 * go - wind * 0.4, dt);
        if (nearSleeve) nearSleeve.setAttribute('d', sleevePath(SH_NEAR, ne, nh, sv, G === 'robe' ? 1.4 : 1));
        if (farSleeve) farSleeve.setAttribute('d', sleevePath(SH_FAR, fe, fh, sv * 0.8, G === 'robe' ? 1.4 : 1));

        // --- hair, tail, stole: things that trail
        const trail = hairS.step(-go * 2.4 - wind * 1.4 + start * 3, dt);
        if (longHair) {
            const [x, y] = upToFig(HEAD[0] - 3.6, HEAD[1] - 1);
            const len = look.hair === 'long' ? 17 : 9;
            const tip = upToFig(HEAD[0] - 5 + trail * 0.6, HEAD[1] + len);
            longHair.setAttribute('d', `M${f(x)} ${f(y - 2)} Q${f(x - 3.2 + trail * 0.3)} ${f((y + tip[1]) / 2)} ${f(tip[0] - 1.2)} ${f(tip[1])} L${f(tip[0] + 1.6)} ${f(tip[1] - 0.4)} Q${f(x + 0.6)} ${f((y + tip[1]) / 2)} ${f(x + 2.2)} ${f(y - 1)}Z`);
        }
        if (tailOut) {
            const sw = tail.step(-go * 3 + wind * 2.2, dt) + (st.flick || 0) * 3;
            const d = `M${f(32)} ${f(hy + 2)} Q${f(20 + sw * 0.6)} ${f(hy + 6)} ${f(18 + sw)} ${f(hy - 10 + Math.abs(sw) * 0.4)}`;
            tailOut.setAttribute('d', d); tailIn.setAttribute('d', d);
        }
        if (hireBack) {
            const s = stole.step(-go * 4 - wind * 3, dt);
            const a = upToFig(36.4, 45), c = upToFig(46, 45.6);
            hireBack.setAttribute('d', `M${pt(a)} Q${f(28 + s)} ${f(hy - 6)} ${f(24 + s * 1.4)} ${f(hy + 18)} L${f(27 + s * 1.2)} ${f(hy + 20)} Q${f(31 + s * 0.6)} ${f(hy - 2)} ${f(c[0] - 4)} ${f(c[1] + 3)}Z`);
        }
        if (hatLift) hatLift(st.tip || 0, trail);
        if (prop) prop.update(nh, ne, { go, dt, wind, P, phase, t, accel: Math.cos(phase * Math.PI * 4) * 1.4 * go, upToFig, reach, call });
        if (sheet) sheet.update(nh, fh, Math.max(read, show), show, call, fh);
        if (umbrella > 0.001) {
            umb.style.display = '';
            const top = [nh[0] - 4 + (1 - umbrella) * 4, 14 + (1 - umbrella) * 26], k = umbrella;
            umbPole.setAttribute('d', `M${f(nh[0] - 0.4)} ${f(nh[1] + 3)} L${pt(top)}`);
            const r = 19 * k, dy = 6 * k;
            umbTop.setAttribute('d', `M${f(top[0] - r)} ${f(top[1] + dy)} Q${f(top[0] - r * 0.7)} ${f(top[1] - dy * 0.2)} ${pt(top)} Q${f(top[0] + r * 0.7)} ${f(top[1] - dy * 0.2)} ${f(top[0] + r)} ${f(top[1] + dy)} Q${f(top[0])} ${f(top[1] + dy * 0.5)} ${f(top[0] - r)} ${f(top[1] + dy)}Z`);
            umbRibs.setAttribute('d', [-0.8, -0.45, -0.15, 0.15, 0.45, 0.8].map(u => `M${pt(top)} L${f(top[0] + r * u)} ${f(top[1] + dy * (0.55 + 0.45 * Math.abs(u)))}`).join(' '));
        } else umb.style.display = 'none';
        fig.hand = upToFig(nh[0], nh[1]); fig.handFar = upToFig(fh[0], fh[1]);
        if (hip) hip.update(hy, { go, dt, wind, P, phase, t });

        // --- marks: ! for a start, … while thinking
        const mark = Math.max(start, chin * 0.9);
        marks.setAttribute('opacity', f(mark));
        bang.style.display = start > chin ? '' : 'none';
        dots.style.display = start > chin ? 'none' : '';

        // --- night tint for the flat colours (only when the palette moved)
        if (Math.abs(P.inkT - lastInk) > 0.01) {
            lastInk = P.inkT;
            for (const [n, c] of flatFills) n.setAttribute('fill', nightTint(c, P));
        }
        return p;
    }

    const fig = { g, body, glowRoot, glowBody, look, gait: walkG, restHip, update, hit, upToFig: (x, y) => upToFig(x, y), hand: [56, 70], handFar: [50, 70],
        setHeadline(text) { if (sheet) sheet.setText(text); } };
    return fig;
}

// ------------------------------------------------------------------ parts

function patternInk(look) {
    const m = toRGB(look.main);
    const L = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    return L > 0.55 ? 'rgba(40,36,40,0.55)' : 'rgba(246,238,220,0.75)';
}

function patternMarks(kind, at, maxY = 200) {
    const out = [];
    for (const [x, y] of at) {
        if (y > maxY) continue;
        switch (kind) {
            case 'stripes': out.push(`M${f(x - 2)} ${f(y - 4)} Q${f(x - 2.3)} ${f(y)} ${f(x - 2)} ${f(y + 4)} M${f(x + 1.2)} ${f(y - 4)} Q${f(x + 0.9)} ${f(y)} ${f(x + 1.2)} ${f(y + 4)}`); break;
            case 'arrows': out.push(`M${f(x - 2)} ${f(y - 1)} L${f(x)} ${f(y + 1.4)} L${f(x + 2)} ${f(y - 1)} M${f(x - 2)} ${f(y + 2)} L${f(x)} ${f(y + 4.4)} L${f(x + 2)} ${f(y + 2)}`); break;
            case 'kasuri': out.push(`M${f(x - 1.2)} ${f(y)} l2.4 0 M${f(x)} ${f(y - 1.2)} l0 2.4`); break;
            case 'stars': out.push(`M${f(x - 1.4)} ${f(y)} l2.8 0 M${f(x)} ${f(y - 1.4)} l0 2.8 M${f(x - 1)} ${f(y - 1)} l2 2`); break;
            case 'bolts': out.push(`M${f(x - 1.6)} ${f(y - 2.6)} L${f(x + 0.6)} ${f(y - 0.2)} L${f(x - 0.6)} ${f(y + 0.4)} L${f(x + 1.6)} ${f(y + 2.8)}`); break;
            case 'snow': out.push(`M${f(x - 1.6)} ${f(y)} l3.2 0 M${f(x - 0.8)} ${f(y - 1.4)} l1.6 2.8 M${f(x + 0.8)} ${f(y - 1.4)} l-1.6 2.8`); break;
            case 'spiral': out.push(`M${f(x)} ${f(y)} q1.6 -0.4 1.4 1.2 q-0.4 1.6 -2.4 1 q-1.8 -0.8 -1 -2.8 q1 -2 3.6 -1.4`); break;
            default: break;
        }
    }
    return out.join(' ');
}

function sleevePath(sh, e, h, sv, k) {
    const w = L2(e, h, 0.72);
    const drop = 10.5 * k;
    return `M${f(sh[0] - 2.4)} ${f(sh[1] - 1.6)} Q${f(e[0] + 1.2)} ${f(e[1] - 3)} ${f(w[0] + 2)} ${f(w[1] - 1.6)} L${f(w[0] + 1.4 + sv * 0.4)} ${f(w[1] + 2.6)} Q${f(e[0] + sv)} ${f(e[1] + drop)} ${f(e[0] - 4 + sv)} ${f(e[1] + drop - 1)} Q${f(sh[0] - 4.4 + sv * 0.4)} ${f(sh[1] + 12)} ${f(sh[0] - 2.4)} ${f(sh[1] - 1.6)}Z`;
}

function drawFoot(ft, ankle, pitch, look, G) {
    const r = pitch * RAD, c = Math.cos(r), s = Math.sin(r);
    const R = (px, py) => pt([ankle[0] + px * c - py * s, ankle[1] + px * s + py * c]);
    if (look.wheels) { ft.sole.setAttribute('cx', f(ankle[0] + 1)); ft.sole.setAttribute('cy', f(ankle[1] + 0.6)); return; }
    if (look.barefoot || G === 'dogu') { ft.sole.setAttribute('d', `M${R(-2.4, -1.4)} Q${R(-2.6, 1.6)} ${R(0, 1.8)} L${R(4.8, 1.8)} Q${R(5.6, 0.6)} ${R(4, -0.6)} Q${R(1, -1.2)} ${R(-2.4, -1.4)}Z`); return; }
    if (G === 'paper') { ft.sole.setAttribute('d', `M${R(-1.6, 1.4)} L${R(3.6, 1.4)} L${R(1.2, -2)}Z`); if (ft.sock) ft.sock.setAttribute('d', ''); return; }
    if (G === 'coat' || G === 'robe') { shoe(ft.sole, ankle, pitch); if (ft.sock) ft.sock.setAttribute('d', `M${R(-2.6, 0.2)} Q${R(-3, -4)} ${R(-0.4, -4.6)} L${R(1.6, -4)} Q${R(4, -2.4)} ${R(4.2, 0.2)}Z`); return; }
    if (G === 'kimono' || G === 'hakama') {
        // tabi on geta: a sole and two teeth, peeling off the front tooth
        ft.sole.setAttribute('d', `M${R(-4.2, 0.4)} L${R(5, 0.4)} L${R(5, 1.6)} L${R(3.6, 1.6)} L${R(3.6, 4)} L${R(2.3, 4)} L${R(2.3, 1.6)} L${R(-1.3, 1.6)} L${R(-1.3, 4)} L${R(-2.6, 4)} L${R(-2.6, 1.6)} L${R(-4.2, 1.6)}Z`);
        if (ft.sock) ft.sock.setAttribute('d', `M${R(-3.3, 0.4)} Q${R(-3.6, -4.8)} ${R(-0.6, -5.4)} L${R(1.6, -4.8)} Q${R(4.6, -3.2)} ${R(4.7, 0.4)}Z`);
        return;
    }
    // waraji: a thin straw sole tied over the foot
    ft.sole.setAttribute('d', `M${R(-2.4, 1)} Q${R(-2.8, 2.2)} ${R(-1.4, 2.2)} L${R(5.4, 2)} Q${R(6.4, 1.2)} ${R(5, 0.8)}Z M${R(-1.8, 0.6)} Q${R(0.6, -2.6)} ${R(3.2, 0.6)} L${R(2.6, 0.8)} Q${R(0.6, -1.4)} ${R(-1.2, 0.8)}Z`);
}

function buildHat(up, look) {
    const [x, y] = HEAD;
    const g = el('g', {}, up);
    let lift = null;
    switch (look.hat) {
        case 'kasa': {
            const k = paint(g, '#c8a868', PEN * 0.9);
            k.setAttribute('d', `M${x - 13.6} ${y - 1.6} Q${x - 6} ${y - 6.6} ${x + 0.4} ${y - 9.8} Q${x + 7} ${y - 6.4} ${x + 14.2} ${y - 1.2} Q${x} ${y - 3.2} ${x - 13.6} ${y - 1.6}Z`);
            pen(g, PEN * 0.4).setAttribute('d', `M${x - 9} ${y - 3.4} Q${x - 4} ${y - 6.6} ${x + 0.4} ${y - 9} M${x + 9} ${y - 3} Q${x + 4.6} ${y - 6.4} ${x + 0.6} ${y - 9} M${x - 4} ${y - 2.8} L${x + 0.4} ${y - 9.2} L${x + 4.6} ${y - 2.6}`);
            pen(g, PEN * 0.5).setAttribute('d', `M${x - 3.4} ${y - 1.8} Q${x - 4} ${y + 4} ${x - 1} ${y + 5.4} M${x + 3.6} ${y - 1.6} Q${x + 3.2} ${y + 3.4} ${x + 1} ${y + 5.4}`);
            lift = (tip) => g.setAttribute('transform', `translate(0 ${f(-tip * 3)}) rotate(${f(-tip * 8)} ${x} ${y})`);
            break;
        }
        case 'eboshi': {
            blot(g).setAttribute('d', `M${x - 4.4} ${y - 2.6} Q${x - 5} ${y - 9} ${x - 3.4} ${y - 13.6} Q${x - 1.4} ${y - 16.4} ${x + 1.4} ${y - 14.6} Q${x + 3.6} ${y - 10} ${x + 4.4} ${y - 3.4} Q${x} ${y - 4.6} ${x - 4.4} ${y - 2.6}Z`);
            pen(g, PEN * 0.6).setAttribute('d', `M${x - 4.4} ${y - 2} Q${x} ${y - 0.4} ${x + 4.4} ${y - 1.6}`);
            break;
        }
        case 'flightcap': {
            blot(g).setAttribute('d', `M${x - 4.8} ${y + 2} Q${x - 5.6} ${y - 6.4} ${x + 0.4} ${y - 6.4} Q${x + 5.8} ${y - 6} ${x + 5.2} ${y - 1.4} L${x + 6.4} ${y - 1} Q${x + 2} ${y - 1.4} ${x - 1.6} ${y - 0.6} L${x - 2.4} ${y + 3.2} Q${x - 3.8} ${y + 4.4} ${x - 4.8} ${y + 2}Z`);
            el('path', { d: `M${x - 3.8} ${y - 4.6} Q${x} ${y - 6.8} ${x + 4.6} ${y - 4.4}`, fill: 'none', stroke: look.accent, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, g);
            el('path', { d: oval(x + 2.6, y - 5.4, 1.6, 1.2), fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.5 }, g);
            break;
        }
        case 'hachimaki': {
            el('path', { d: `M${x - 4.2} ${y - 1.8} Q${x} ${y - 3.6} ${x + 4.2} ${y - 2.2}`, fill: 'none', stroke: '#e9e2d0', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, g);
            pen(g, PEN * 0.45).setAttribute('d', `M${x - 4.2} ${y - 3} Q${x} ${y - 4.8} ${x + 4.2} ${y - 3.4} M${x - 4.2} ${y - 0.6} Q${x} ${y - 2.4} ${x + 4.2} ${y - 1}`);
            const knot = pen(g, PEN * 0.8);
            lift = (tip, trail) => knot.setAttribute('d', `M${x - 4} ${y - 2} q${f(-2 + trail * 0.3)} -1 ${f(-4 + trail * 0.8)} ${f(-0.4 + Math.abs(trail) * 0.2)} M${x - 4} ${y - 1.6} q${f(-1.6 + trail * 0.2)} 1.2 ${f(-3.6 + trail * 0.7)} ${f(1.8)}`);
            break;
        }
        case 'hokamuri': {
            paint(g, '#e3dccb', PEN * 0.8).setAttribute('d', `M${x - 4.8} ${y + 3} Q${x - 6} ${y - 6.6} ${x + 0.6} ${y - 6.6} Q${x + 5.6} ${y - 6.2} ${x + 5} ${y + 0.4} Q${x + 2.6} ${y - 2.8} ${x - 0.4} ${y - 2.4} Q${x - 2} ${y + 2} ${x - 4.8} ${y + 3}Z`);
            pen(g, PEN * 0.5).setAttribute('d', `M${x + 3.4} ${y + 3} q1.6 1.4 0.4 2.8 M${x + 3.4} ${y + 3} q2.4 0.2 2.6 1.6`);
            break;
        }
        case 'earmuffs': {
            pen(g, PEN * 1.1).setAttribute('d', `M${x - 4.6} ${y} Q${x - 4.8} ${y - 8.4} ${x + 0.2} ${y - 8} Q${x + 4.8} ${y - 7.6} ${x + 4.4} ${y - 0.4}`);
            el('path', { d: `${oval(x - 4.2, y + 0.4, 1.8, 2.4)}`, fill: look.accent, stroke: 'currentColor', 'stroke-width': PEN * 0.6 }, g);
            break;
        }
        case 'goggles': {
            blot(g).setAttribute('d', `M${x - 4.6} ${y - 0.6} Q${x + 0.6} ${y - 3} ${x + 5.4} ${y - 0.8} Q${x + 0.6} ${y + 1.4} ${x - 4.6} ${y - 0.6}Z`);
            el('path', { d: `M${x - 3} ${y - 0.7} Q${x + 0.6} ${y - 2} ${x + 4} ${y - 0.8}`, fill: 'none', stroke: '#9fd0e8', 'stroke-width': 0.9, 'stroke-linecap': 'round' }, g);
            pen(g, PEN * 0.6).setAttribute('d', `M${x - 4.4} ${y - 5.2} q2 -1.6 4.4 -1.4 q2.6 0.4 4 2`);
            break;
        }
        case 'ears': {
            shape(g, PEN * 0.8).setAttribute('d', `M${x - 3.6} ${y - 3.6} L${x - 3.4} ${y - 9.6} L${x - 0.4} ${y - 5} Z M${x + 1.2} ${y - 5} L${x + 3.8} ${y - 9.8} L${x + 4.2} ${y - 3.4}Z`);
            blot(g).setAttribute('d', `M${x - 3} ${y - 4.6} L${x - 3} ${y - 7.6} L${x - 1.4} ${y - 5.2}Z M${x + 2.2} ${y - 5.2} L${x + 3.6} ${y - 8} L${x + 3.6} ${y - 4.6}Z`);
            break;
        }
        default: break;
    }
    if (look.hair === 'bun' && look.hat === 'none') {
        el('path', { d: `M${x - 7.8} ${y - 1.8} L${x - 1.8} ${y - 6.2}`, fill: 'none', stroke: 'currentColor', 'stroke-width': PEN * 0.7, 'stroke-linecap': 'round' }, g);
        el('circle', { cx: x - 1.4, cy: y - 6.6, r: 1.1, fill: look.accent, stroke: 'currentColor', 'stroke-width': 0.5 }, g);
    }
    return { g, lift };
}

// Things held in the near hand. update(hand, elbow, ctx) runs each frame.
function buildProp(armG, glowG, look) {
    const g = el('g', {}, armG);
    const fill = c => el('path', { fill: c, stroke: 'currentColor', 'stroke-width': PEN * 0.7, 'stroke-linejoin': 'round' }, g);
    switch (look.prop) {
        case 'tray': {
            const tray = blot(g), cup = shape(g, PEN * 0.6), steam = pen(g, PEN * 0.45);
            return { update(h, e, c) {
                const y = h[1] - 1.6;
                tray.setAttribute('d', `M${f(h[0] - 11)} ${f(y)} L${f(h[0] + 4)} ${f(y)} L${f(h[0] + 3)} ${f(y + 1.6)} L${f(h[0] - 10)} ${f(y + 1.6)}Z`);
                cup.setAttribute('d', `M${f(h[0] - 6)} ${f(y)} L${f(h[0] - 6.4)} ${f(y - 4.4)} L${f(h[0] - 0.6)} ${f(y - 4.4)} L${f(h[0] - 1)} ${f(y)}Z`);
                const s = Math.sin(c.t * 1.3) * 0.8;
                steam.setAttribute('d', `M${f(h[0] - 3.6)} ${f(y - 5.4)} q${f(1.4 + s)} -2.4 ${f(-0.2)} -4.6 q${f(-1.4 + s)} -2 ${f(0.4)} -4.2`);
            } };
        }
        case 'abacus': {
            const frame = fill('#7a5a3c'), beads = pen(g, PEN * 0.9);
            return { update(h) {
                frame.setAttribute('d', `M${f(h[0] - 1)} ${f(h[1] + 0.4)} L${f(h[0] + 9)} ${f(h[1] - 1.4)} L${f(h[0] + 9.8)} ${f(h[1] + 3.4)} L${f(h[0] - 0.2)} ${f(h[1] + 5.2)}Z`);
                beads.setAttribute('d', [1.6, 3.6, 5.6, 7.6].map(dx => `M${f(h[0] + dx)} ${f(h[1] - 0.4 - dx * 0.18)} l0.3 1.2 M${f(h[0] + dx + 0.3)} ${f(h[1] + 2.4 - dx * 0.18)} l0.2 1.2`).join(' '));
            } };
        }
        case 'lantern': {
            const stick = pen(g, PEN * 0.8), lg = el('g', {}, g);
            const bodyN = el('path', { d: 'M-3.4 4.6 Q-5 9.6 -3.4 14.6 L3.4 14.6 Q5 9.6 3.4 4.6Z', fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.75 }, lg);
            blot(lg).setAttribute('d', 'M-2.4 2.8 L2.4 2.8 L2.4 4.8 L-2.4 4.8Z M-2.4 14.4 L2.4 14.4 L2.4 16 L-2.4 16Z');
            pen(lg, PEN * 0.4).setAttribute('d', 'M-4.2 7.6 Q0 8.6 4.2 7.6 M-4.6 10.4 Q0 11.4 4.6 10.4 M-4.2 13 Q0 14 4.2 13 M0 0 L0 2.8');
            const gl = el('circle', { r: 26, fill: 'url(#e-warmglow)', opacity: 0 }, glowG);
            const pend = pendulum(20, 2.2);
            const tint = toRGB(look.accent && /^#(?:00|55|a4|bf)/i.test(look.accent) ? '#bff4ff' : '#ffd08a');
            return { update(h, e, c) {
                const tip = [h[0] + 13, h[1] - 8];
                stick.setAttribute('d', `M${f(h[0] - 1)} ${f(h[1] + 1)} Q${f(h[0] + 7)} ${f(h[1] - 5)} ${pt(tip)}`);
                const a = pend.step(-c.accel - c.wind * 0.6, c.dt);
                lg.setAttribute('transform', `translate(${pt(tip)}) rotate(${f(a * 57.3)})`);
                const lit = smooth(0.25, 0.55, c.P.lamp);
                bodyN.setAttribute('fill', rgb(mix(c.P.paper, tint, 0.25 + lit * 0.7)));
                const w = c.upToFig(tip[0] - Math.sin(a) * 9.6, tip[1] + Math.cos(a) * 9.6);
                gl.setAttribute('cx', f(w[0])); gl.setAttribute('cy', f(w[1])); gl.setAttribute('opacity', f(lit * 0.95));
            } };
        }
        case 'pole': {
            const pole = pen(g, PEN * 0.9);
            const lean = spring(18, 3);
            return { update(h, e, c) {
                const a = lean.step(-c.go * 0.08 - c.wind * 0.03, c.dt);
                const top = [h[0] + Math.sin(a + 0.08) * 46, h[1] - Math.cos(a + 0.08) * 46];
                const bot = [h[0] - Math.sin(a + 0.08) * 14, h[1] + Math.cos(a + 0.08) * 14];
                pole.setAttribute('d', `M${pt(bot)} Q${f((top[0] + bot[0]) / 2 + 0.6)} ${f((top[1] + bot[1]) / 2)} ${pt(top)}`);
            } };
        }
        case 'book': case 'scroll': {
            const n = fill(look.prop === 'book' ? '#3a5a8a' : '#e8dcc0');
            return { update(h, e) {
                const m = L2(e, h, 0.25);
                n.setAttribute('d', look.prop === 'book'
                    ? `M${f(m[0] - 2)} ${f(m[1] - 5)} L${f(m[0] + 3.6)} ${f(m[1] - 4)} L${f(m[0] + 2.6)} ${f(m[1] + 6)} L${f(m[0] - 3)} ${f(m[1] + 5)}Z`
                    : `M${f(m[0] - 6)} ${f(m[1] - 1.4)} L${f(m[0] + 6)} ${f(m[1] - 2.6)} Q${f(m[0] + 7.4)} ${f(m[1] - 0.6)} ${f(m[0] + 6.2)} ${f(m[1] + 0.8)} L${f(m[0] - 5.8)} ${f(m[1] + 2)} Q${f(m[0] - 7.2)} ${f(m[1] + 0.4)} ${f(m[0] - 6)} ${f(m[1] - 1.4)}Z`);
            } };
        }
        case 'hammer': {
            const handle = pen(g, PEN * 0.9), head = fill('#5a4a3a');
            return { update(h, e, c) {
                const dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
                const end = [h[0] + ux * 9, h[1] + uy * 9];
                handle.setAttribute('d', `M${f(h[0] - ux * 1.4)} ${f(h[1] - uy * 1.4)} L${pt(end)}`);
                const px = -uy, py = ux;
                head.setAttribute('d', `M${f(end[0] - px * 3.2)} ${f(end[1] - py * 3.2)} L${f(end[0] + px * 3.2)} ${f(end[1] + py * 3.2)} L${f(end[0] + px * 3.2 + ux * 2.6)} ${f(end[1] + py * 3.2 + uy * 2.6)} L${f(end[0] - px * 3.2 + ux * 2.6)} ${f(end[1] - py * 3.2 + uy * 2.6)}Z`);
            } };
        }
        case 'brush': {
            const n = pen(g, PEN * 0.7), tipN = blot(g);
            return { update(h, e) {
                const dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1;
                const a = [h[0] - dy / l * 4, h[1] + dx / l * 4], b = [h[0] + dy / l * 5, h[1] - dx / l * 5];
                n.setAttribute('d', `M${pt(a)} L${pt(b)}`);
                tipN.setAttribute('d', oval(b[0], b[1], 0.9, 0.9));
            } };
        }
        case 'keys': case 'scales': case 'satchel': case 'box': case 'ball': case 'mic': {
            const string = pen(g, PEN * 0.5), thing = fill(look.prop === 'box' ? '#2c2a2a' : look.prop === 'satchel' ? '#7a5a3c' : look.prop === 'ball' ? '#c8504a' : '#c9a23a');
            const extra = look.prop === 'box' ? el('path', { fill: 'none', stroke: '#c8504a', 'stroke-width': 0.9 }, g) : null;
            const pend = pendulum(16, 1.8);
            return { update(h, e, c) {
                const a = pend.step(-c.accel - c.wind * 0.4, c.dt);
                const len = look.prop === 'satchel' ? 3 : look.prop === 'scales' ? 6 : look.prop === 'keys' ? 3.4 : 0;
                const o = [h[0] + Math.sin(a) * len, h[1] + Math.cos(a) * len + 1];
                string.setAttribute('d', len ? `M${pt(h)} L${pt(o)}` : '');
                const [x, y] = o;
                let d;
                if (look.prop === 'scales') d = `M${f(x - 6)} ${f(y)} L${f(x + 6)} ${f(y)} M${f(x - 6)} ${f(y)} Q${f(x - 6)} ${f(y + 4)} ${f(x - 3.4)} ${f(y + 4)} L${f(x - 8.6)} ${f(y + 4)} Q${f(x - 6)} ${f(y + 4)} ${f(x - 6)} ${f(y)} M${f(x + 6)} ${f(y)} Q${f(x + 6)} ${f(y + 4)} ${f(x + 8.6)} ${f(y + 4)} L${f(x + 3.4)} ${f(y + 4)} Q${f(x + 6)} ${f(y + 4)} ${f(x + 6)} ${f(y)}`;
                else if (look.prop === 'keys') d = `${oval(x, y + 1.8, 2, 2)} M${f(x - 1)} ${f(y + 3.6)} l-0.6 3.2 M${f(x + 1)} ${f(y + 3.6)} l0.8 3`;
                else if (look.prop === 'satchel') d = `M${f(x - 4.4)} ${f(y)} L${f(x + 4.4)} ${f(y)} L${f(x + 4)} ${f(y + 7)} L${f(x - 4)} ${f(y + 7)}Z`;
                else if (look.prop === 'box') d = `M${f(x - 3.8)} ${f(y - 2)} L${f(x + 3.8)} ${f(y - 2)} L${f(x + 3.8)} ${f(y + 4.6)} L${f(x - 3.8)} ${f(y + 4.6)}Z`;
                else if (look.prop === 'ball') d = oval(x + 1, y - 1.6, 2, 1.8);
                else d = `M${f(x)} ${f(y - 1)} L${f(x + 5)} ${f(y - 4)} L${f(x + 5.6)} ${f(y - 1.6)}Z`;
                thing.setAttribute('d', d);
                if (look.prop === 'scales') thing.setAttribute('fill', 'none');
                if (extra) extra.setAttribute('d', `M${f(x - 3.8)} ${f(y + 1)} L${f(x + 3.8)} ${f(y + 1)} M${f(x)} ${f(y - 2)} L${f(x)} ${f(y + 4.6)}`);
            } };
        }
        case 'sheets': {
            // a 読売's stock of sheets draped over the forearm
            const stack = shape(g, PEN * 0.8), edge = pen(g, PEN * 0.45);
            return { update(h, e) {
                const m = L2(e, h, 0.55);
                stack.setAttribute('d', `M${f(m[0] - 7)} ${f(m[1] - 1)} L${f(m[0] + 6)} ${f(m[1] - 2.4)} L${f(m[0] + 7)} ${f(m[1] + 9)} L${f(m[0] - 6)} ${f(m[1] + 11)}Z`);
                edge.setAttribute('d', `M${f(m[0] - 6.4)} ${f(m[1] + 1)} L${f(m[0] + 6.4)} ${f(m[1] - 0.4)} M${f(m[0] - 6)} ${f(m[1] + 3)} L${f(m[0] + 6.6)} ${f(m[1] + 1.6)} M${f(m[0] + 2)} ${f(m[1] + 2)} l0 7 M${f(m[0] - 1)} ${f(m[1] + 2.6)} l0 7`);
            } };
        }
        case 'pinwheel': {
            // a child's 風車 on a stick, turning in the wind and faster when running
            const stick = pen(g, PEN * 0.7), wheel = el('g', {}, g);
            const cols = ['#c8403a', '#e8b84a', '#3a6a9a', '#4f7a55'];
            cols.forEach((c, i) => el('path', { d: 'M0 0 L0 -5.6 Q3.4 -4.6 0 0Z', fill: c, stroke: 'currentColor', 'stroke-width': PEN * 0.4, transform: `rotate(${i * 90})` }, wheel));
            let a = 0;
            return { update(h, e, c) {
                const tip = [h[0] + 3, h[1] - 14];
                stick.setAttribute('d', `M${f(h[0])} ${f(h[1] + 2)} L${pt(tip)}`);
                a += (2 + c.go * 14 + Math.abs(c.wind) * 6) * c.dt;
                wheel.setAttribute('transform', `translate(${pt(tip)}) rotate(${f(a * 57.3)})`);
            } };
        }
        case 'carry': {
            // a pole on the shoulder: a tamatebako behind, an Odawara lantern in front
            const pole = pen(g, PEN * 1.1), box = fill('#2c2a2a'), cord = el('path', { fill: 'none', stroke: '#c8504a', 'stroke-width': 0.9 }, g);
            const lan = el('path', { fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.7 }, g);
            const gl = el('circle', { r: 22, fill: 'url(#e-warmglow)', opacity: 0 }, glowG);
            const pb = pendulum(12, 1.6), pl = pendulum(18, 2);
            return { update(h, e, c) {
                const s0 = c.upToFig(22, 41.4), s1 = c.upToFig(66, 39.6);
                pole.setAttribute('d', `M${pt(s0)} Q${f((s0[0] + s1[0]) / 2)} ${f((s0[1] + s1[1]) / 2 + 1.2)} ${pt(s1)}`);
                const ab = pb.step(-c.accel - c.wind * 0.3, c.dt), al = pl.step(-c.accel * 1.2 - c.wind * 0.5, c.dt);
                const bx = s0[0] + 4 + Math.sin(ab) * 9, by = s0[1] + Math.cos(ab) * 9;
                box.setAttribute('d', `M${f(bx - 5.4)} ${f(by)} L${f(bx + 5.4)} ${f(by)} L${f(bx + 5.4)} ${f(by + 9)} L${f(bx - 5.4)} ${f(by + 9)}Z`);
                cord.setAttribute('d', `M${f(s0[0] + 4)} ${f(s0[1])} L${f(bx)} ${f(by)} M${f(bx - 5.4)} ${f(by + 4)} L${f(bx + 5.4)} ${f(by + 4)} M${f(bx)} ${f(by)} L${f(bx)} ${f(by + 9)}`);
                const lx = s1[0] - 2 + Math.sin(al) * 5, ly = s1[1] + Math.cos(al) * 5;
                const lit = smooth(0.25, 0.55, c.P.lamp);
                lan.setAttribute('d', `M${f(s1[0] - 2)} ${f(s1[1])} L${f(lx)} ${f(ly)} M${f(lx - 2.6)} ${f(ly)} L${f(lx + 2.6)} ${f(ly)} L${f(lx + 2.6)} ${f(ly + 9)} L${f(lx - 2.6)} ${f(ly + 9)}Z`);
                lan.setAttribute('fill', rgb(mix(c.P.paper, toRGB('#ff9a5a'), 0.3 + lit * 0.65)));
                gl.setAttribute('cx', f(lx)); gl.setAttribute('cy', f(ly + 4.5)); gl.setAttribute('opacity', f(lit));
            } };
        }
        default: return null;
    }
}

// 雷瓶: small glowing jars at the hip (they swing as the walker steps)
function buildJars(body, glowG, look) {
    const jars = [0, 1].slice(0, look.id === 'gennai_maru' ? 2 : 1).map(i => ({
        n: el('path', { fill: PAPER, stroke: 'currentColor', 'stroke-width': PEN * 0.7 }, body),
        p: pendulum(18, 2), dx: i * 4.2,
        gl: el('circle', { r: 12, fill: 'url(#e-coolglow)', opacity: 0 }, glowG)
    }));
    return { update(hy, c) {
        for (const j of jars) {
            const a = j.p.step(-Math.cos(c.phase * Math.PI * 4) * 1.2 * c.go - c.wind * 0.3, c.dt);
            const x = 46.4 + j.dx + Math.sin(a) * 3, y = hy + 1 + Math.cos(a) * 3;
            j.n.setAttribute('d', `M${f(46.4 + j.dx)} ${f(hy - 1)} L${f(x)} ${f(y)} M${f(x - 1.6)} ${f(y)} Q${f(x - 2.6)} ${f(y + 3)} ${f(x - 1.6)} ${f(y + 5.4)} L${f(x + 1.6)} ${f(y + 5.4)} Q${f(x + 2.6)} ${f(y + 3)} ${f(x + 1.6)} ${f(y)}Z`);
            const lit = smooth(0.2, 0.5, c.P.lamp);
            j.n.setAttribute('fill', rgb(mix(c.P.paper, toRGB('#bff4ff'), 0.3 + lit * 0.6)));
            j.gl.setAttribute('cx', f(x)); j.gl.setAttribute('cy', f(y + 2.8)); j.gl.setAttribute('opacity', f(lit * 0.8));
        }
    } };
}

// ------------------------------------------------------------------ 瓦版 / 新聞

// A printed sheet held in both hands: drawn big enough to read as paper — a masthead,
// columns of type as tick lines, a picture box, and the first characters of the real
// headline it carries. kind: 'kawaraban' (one woodblock sheet) | 'shinbun' (a folded paper).
function buildSheet(up, kind) {
    const g = el('g', {}, up);
    const paper = shape(g, PEN * 0.9);
    const fold = pen(g, PEN * 0.45);
    const mast = blot(g);
    const title = el('text', { 'font-size': 4.2, 'font-weight': 700, fill: PAPER, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': '"Shippori Mincho",serif', class: 'sheet-title' }, g);
    title.textContent = kind === 'kawaraban' ? '瓦版' : '新聞';
    const head = el('text', { 'font-size': 3.6, 'font-weight': 700, fill: 'currentColor', 'text-anchor': 'middle', 'font-family': '"Shippori Mincho",serif', 'writing-mode': 'vertical-rl' }, g);
    const lines = pen(g, PEN * 0.4);
    const pic = shape(g, PEN * 0.55);
    const picInk = pen(g, PEN * 0.45);
    let text = '';
    const W = kind === 'kawaraban' ? 22 : 24, H = kind === 'kawaraban' ? 28 : 30;
    // the static artwork, drawn once around (0,0); the group is moved and scaled per frame
    paper.setAttribute('d', `M${-W / 2} ${-H / 2} Q0 ${-H / 2 - 1} ${W / 2} ${-H / 2} L${W / 2 + 0.6} ${H / 2} Q0 ${H / 2 + 0.8} ${-W / 2 - 0.4} ${H / 2}Z`);
    if (kind === 'kawaraban') {
        mast.setAttribute('d', `M${W / 2 - 6.4} ${-H / 2 + 1.6} L${W / 2 - 1.6} ${-H / 2 + 1.6} L${W / 2 - 1.6} ${-H / 2 + 11} L${W / 2 - 6.4} ${-H / 2 + 11}Z`);
        title.setAttribute('x', W / 2 - 4); title.setAttribute('y', -H / 2 + 6.2); title.setAttribute('writing-mode', 'vertical-rl'); title.setAttribute('font-size', 3.4);
        head.setAttribute('x', W / 2 - 9.4); head.setAttribute('y', -H / 2 + 2);
        const d = []; for (let x = W / 2 - 13; x > -W / 2 + 1.6; x -= 2.2) d.push(`M${x.toFixed(1)} ${(-H / 2 + 2).toFixed(1)} l0 ${(x < -1 ? 9 : 24).toFixed(1)}`);
        lines.setAttribute('d', d.join(' '));
        pic.setAttribute('d', `M${-W / 2 + 1.6} ${-H / 2 + 13} L${-1} ${-H / 2 + 13} L${-1} ${H / 2 - 1.6} L${-W / 2 + 1.6} ${H / 2 - 1.6}Z`);
        picInk.setAttribute('d', `M${-W / 2 + 3} ${H / 2 - 4} q2 -5 4 -2 q2 -6 4 0 M${-W / 2 + 3.4} ${-H / 2 + 16} q2 -1.4 3.6 0`);
    } else {
        mast.setAttribute('d', `M${-W / 2 + 1.4} ${-H / 2 + 1.4} L${W / 2 - 1.4} ${-H / 2 + 1.4} L${W / 2 - 1.4} ${-H / 2 + 6.4} L${-W / 2 + 1.4} ${-H / 2 + 6.4}Z`);
        title.setAttribute('x', 0); title.setAttribute('y', -H / 2 + 3.9);
        head.setAttribute('x', W / 2 - 3.4); head.setAttribute('y', -H / 2 + 8);
        fold.setAttribute('d', `M${-W / 2} 0 L${W / 2} 0`);
        const d = []; for (let x = W / 2 - 7; x > -W / 2 + 1.4; x -= 2) d.push(`M${x.toFixed(1)} ${(-H / 2 + 8).toFixed(1)} l0 ${(x < -3 ? 6 : 12).toFixed(1)}`);
        for (let x = W / 2 - 2; x > -W / 2 + 1.4; x -= 2) d.push(`M${x.toFixed(1)} 2 l0 ${(H / 2 - 4).toFixed(1)}`);
        lines.setAttribute('d', d.join(' '));
        pic.setAttribute('d', `M${-W / 2 + 1.6} ${-H / 2 + 15} L${-3} ${-H / 2 + 15} L${-3} ${-1.6} L${-W / 2 + 1.6} ${-1.6}Z`);
        picInk.setAttribute('d', `M${-W / 2 + 3} ${-3.4} q2 -4 4 -1.6 q1.6 -3 3 0`);
    }
    return {
        setText(s) { if (s !== text) { text = s; head.textContent = s.slice(0, kind === 'kawaraban' ? 7 : 6); } },
        update(nh, fh, hold, show, call) {
            if (hold < 0.02) { g.style.display = 'none'; return; }
            g.style.display = '';
            const c = L2(nh, fh, 0.5);
            const k = 0.86 + 0.6 * show;
            g.setAttribute('transform', `translate(${f(c[0] + 2 + show * 2)} ${f(c[1] - 11 + show * 3)}) scale(${f(k)}) rotate(${f(-4 + show * 3)})`);
        }
    };
}
