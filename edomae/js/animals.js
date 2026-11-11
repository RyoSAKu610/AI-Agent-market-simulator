// 江戸前 Edomae — pets and animals of the street, drawn by the style's animal rules:
// an open back line and a separate belly line, single-stroke legs ending in ink-dot
// feet, a small head with an ear. Motion is solved, not free sines: four-legged
// walkers use a planted-foot solver like gait.js (the stance foot slides back at
// exactly the travel speed), the cat blends keyed poses, sparrows hop in discrete
// hops and flush when someone walks through. Charter: no animal is caught, caged,
// leashed or harmed; a tap only startles or wakes them.
//
// Every animal lives in the ring frame (the group that turns with the globe): it
// stands at street position s, `off` units in front of the building line.

import { el, pen, shape, blot, f, pt, PAPER } from './lib/ink.js';
import { spring, clamp, lerp, smooth, ease, minJerk } from './lib/motion.js';
import { toRGB, rgb, mix } from './lib/daynight.js';
import { SP, oval } from './kit.js';

const RAD = Math.PI / 180;
const L2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// ------------------------------------------------------------------ the four-legged solver

// Animal space: ground y = 0, facing +x, body centred on x = 0. Legs: [front-near,
// front-far, hind-near, hind-far]; offsets are the leg phases (trot pairs diagonals).
export function quad({ stride = 10, period = 0.44, duty = 0.55, lift = 2.6, hipX = [8, -9], hipY = -11, leg = 11.4, gaitKind = 'trot' } = {}) {
    const phases = gaitKind === 'walk' ? [0.25, 0.75, 0, 0.5] : [0, 0.5, 0.5, 0];
    const speed = stride / (duty * period);
    const foot = (u, hx) => {
        u = ((u % 1) + 1) % 1;
        if (u < duty) return { x: hx + stride / 2 - (stride * u) / duty, y: 0, stance: true };
        const s = (u - duty) / (1 - duty);
        return { x: hx - stride / 2 + stride * minJerk(s), y: -lift * Math.sin(Math.PI * s), stance: false };
    };
    return {
        speed, period,
        pose(phase, go = 1) {
            const feet = phases.map((ph, i) => {
                const hx = i < 2 ? hipX[0] : hipX[1];
                const fo = foot(phase + ph, hx);
                if (go < 1) { fo.x = hx + (fo.x - hx) * go; fo.y *= go; }
                return fo;
            });
            // shoulder and hip heights from what the planted legs can reach
            const reach = (a, b, hx) => {
                let y = hipY;
                for (const fo of [a, b]) if (fo.stance || go < 1) { const dx = fo.x - hx; y = Math.max(y, fo.y - Math.sqrt(Math.max(1, leg * leg - dx * dx))); }
                return y;
            };
            const sh = [hipX[0], reach(feet[0], feet[1], hipX[0])];
            const hp = [hipX[1], reach(feet[2], feet[3], hipX[1])];
            return { feet, sh, hp };
        }
    };
}

// a leg as one stroke from the body to the foot, with a soft knee
const legPath = (top, foot, bend) => { const m = L2(top, [foot.x, foot.y], 0.5); return `M${pt(top)} Q${f(m[0] + bend)} ${f(m[1])} ${f(foot.x)} ${f(foot.y - 0.6)}`; };

// ------------------------------------------------------------------ dog (and fox)

export function createDog(parent, { colour = '#c9a06a', fox = false, scale = 0.62 } = {}) {
    const g = el('g', { class: 'animal' }, parent);
    const body = el('g', {}, g);
    const q = quad({ stride: 9, period: 0.42, duty: 0.56, lift: 2.4 });
    const tail = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': fox ? 4.4 : 1.6, 'stroke-linecap': 'round' }, body);
    const tailIn = fox ? el('path', { fill: 'none', stroke: colour, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, body) : null;
    const farLegs = pen(body, SP * 1.6);
    const fill = el('path', { fill: colour, stroke: 'none' }, body);
    const back = pen(body, SP * 1.4), belly = pen(body, SP * 1.2);
    const nearLegs = pen(body, SP * 1.6);
    const dots = el('path', { fill: 'currentColor' }, body);
    const head = el('g', {}, body);
    el('path', { d: fox ? 'M-1 -3 Q2 -5.6 5.4 -3 L9.6 -1.2 Q6 0.6 2 1 Q-1.4 1 -1 -3Z' : 'M-1.2 -3 Q2 -5.4 5 -3.4 L8 -2 Q8.6 0.4 6 0.8 Q2 1.6 -0.6 0.6 Q-2 -1 -1.2 -3Z', fill: colour, stroke: 'currentColor', 'stroke-width': SP * 1.1, 'stroke-linejoin': 'round' }, head);
    el('path', { d: fox ? 'M0 -3.6 L1 -8.4 L3 -4.2Z' : 'M0.4 -3.8 Q-1.4 -6 -2 -2.6 Q-1.4 -1 0 -1.6Z', fill: fox ? colour : 'currentColor', stroke: 'currentColor', 'stroke-width': SP * 0.9, 'stroke-linejoin': 'round' }, head);
    el('circle', { cx: fox ? 9.4 : 8, cy: -1.4, r: 0.9, fill: 'currentColor' }, head);
    const collar = fox ? null : el('path', { fill: 'none', stroke: '#b3412d', 'stroke-width': 1.3, 'stroke-linecap': 'round' }, body);
    const wag = spring(30, 3), headS = spring(20, 4);
    let phase = 0, sit = 0, idleT = 2, look = 0, lastInk = -1;
    const fills = [fill, ...head.querySelectorAll('path')].filter(n => n.getAttribute('fill') === colour);
    return {
        g, q, speed: q.speed * scale, scale, s: 0, dir: 1, go: 0,
        update(dt, t, P, { go, sitting, wind = 0 }) {
            this.go = go;
            phase += (dt / q.period) * go;
            sit = clamp(sit + (sitting && go < 0.05 ? dt : -dt) * 2.6, 0, 1);
            const p = q.pose(phase, go);
            const se = ease(sit);
            // sitting: the hind end comes down onto the haunches, front legs stay straight
            const hp = [p.hp[0] + se * 3, lerp(p.hp[1], -4.6, se)];
            const sh = [p.sh[0], lerp(p.sh[1], -12.6, se)];
            const neck = [sh[0] + 3, sh[1] - 2.4 - se * 1.4];
            const feet = p.feet.map((fo, i) => i < 2 ? fo : (se > 0 ? { x: lerp(fo.x, hp[0] + 4, se), y: fo.y * (1 - se) } : fo));
            back.setAttribute('d', `M${f(hp[0] - 1)} ${f(hp[1] - 1.4)} Q${f((hp[0] + sh[0]) / 2)} ${f(Math.min(hp[1], sh[1]) - 3)} ${pt(neck)}`);
            belly.setAttribute('d', `M${f(hp[0] + 1.6)} ${f(hp[1] + 3.2)} Q${f((hp[0] + sh[0]) / 2)} ${f(Math.max(hp[1], sh[1]) + 4.6)} ${f(sh[0] - 0.6)} ${f(sh[1] + 3.4)}`);
            fill.setAttribute('d', `M${f(hp[0] - 1)} ${f(hp[1] - 1.4)} Q${f((hp[0] + sh[0]) / 2)} ${f(Math.min(hp[1], sh[1]) - 3)} ${pt(neck)} L${f(sh[0] - 0.6)} ${f(sh[1] + 3.4)} Q${f((hp[0] + sh[0]) / 2)} ${f(Math.max(hp[1], sh[1]) + 4.6)} ${f(hp[0] + 1.6)} ${f(hp[1] + 3.2)}Z`);
            const top = [[sh[0] + 0.6, sh[1] + 2], [sh[0] - 1.2, sh[1] + 2], [hp[0] + 0.8, hp[1] + 1.8], [hp[0] - 1, hp[1] + 1.6]];
            nearLegs.setAttribute('d', legPath(top[0], feet[0], 1) + ' ' + legPath(top[2], feet[2], -1.6));
            farLegs.setAttribute('d', legPath(top[1], feet[1], 1) + ' ' + legPath(top[3], feet[3], -1.6));
            dots.setAttribute('d', feet.map(fo => oval(fo.x + 0.6, fo.y - 0.5, 1.15, 0.8)).join(' '));
            // head: looks about when still; tail wags (springs), more when sitting with its person
            idleT -= dt; if (idleT < 0) { idleT = 1.6 + Math.random() * 3; look = go > 0.5 ? 0 : (Math.random() - 0.5) * 18; }
            const hr = headS.step(look - go * 4, dt);
            head.setAttribute('transform', `translate(${pt(neck)}) rotate(${f(hr)})`);
            const w = wag.step(Math.sin(t * (sit ? 9 : 5)) * (sit ? 1 : 0.4) * 5 + go * 3 - wind, dt);
            const tb = [hp[0] - 1.4, hp[1] - 1];
            const td = fox ? `M${pt(tb)} Q${f(tb[0] - 7)} ${f(tb[1] + 2 - w * 0.2)} ${f(tb[0] - 12)} ${f(tb[1] + 3 - w * 0.6)}` : `M${pt(tb)} Q${f(tb[0] - 4)} ${f(tb[1] - 4 - w * 0.3)} ${f(tb[0] - 5 + w * 0.2)} ${f(tb[1] - 8 + Math.abs(w) * 0.2)}`;
            tail.setAttribute('d', td); if (tailIn) tailIn.setAttribute('d', td);
            if (collar) collar.setAttribute('d', `M${f(neck[0] - 1.6)} ${f(neck[1] + 0.6)} q1.4 2.6 3.2 1.4`);
            if (Math.abs(P.inkT - lastInk) > 0.02) { lastInk = P.inkT; const c = rgb(mix(toRGB(colour), [30, 32, 52], P.inkT * 0.45)); for (const n of fills) n.setAttribute('fill', c); if (tailIn) tailIn.setAttribute('stroke', c); }
        },
        place(tr, dir) { this.dir = dir; g.setAttribute('transform', tr); body.setAttribute('transform', `scale(${f(dir * scale)} ${f(scale)})`); }
    };
}

// ------------------------------------------------------------------ horse / ox (walk, graze, swish)

export function createBeast(parent, { kind = 'horse', colour = '#8a5a3c', load = null, scale = 0.62 } = {}) {
    const g = el('g', { class: 'animal' }, parent);
    const body = el('g', {}, g);
    const ox = kind === 'ox';
    const q = quad({ stride: 14, period: 1.3, duty: 0.66, lift: 3, hipX: [15, -16], hipY: ox ? -20 : -24, leg: ox ? 19.6 : 23.6, gaitKind: 'walk' });
    const tail = pen(body, SP * 1.2);
    const farLegs = pen(body, SP * 2.2);
    const fill = el('path', { fill: colour, stroke: 'none' }, body);
    const back = pen(body, SP * 1.4), belly = pen(body, SP * 1.2);
    const nearLegs = pen(body, SP * 2.2);
    const hooves = el('path', { fill: 'currentColor' }, body);
    const pack = load ? el('path', { fill: load, stroke: 'currentColor', 'stroke-width': SP * 1.1, 'stroke-linejoin': 'round' }, body) : null;
    const packTie = load ? pen(body, SP * 0.7) : null;
    const neck = el('path', { fill: colour, stroke: 'currentColor', 'stroke-width': SP * 1.3, 'stroke-linejoin': 'round' }, body);
    const ear = pen(body, SP * 1.1);
    const mane = ox ? null : pen(body, SP * 0.7);
    const sw = spring(10, 1.6), graze = spring(3, 2.4);
    let phase = 0, swT = 2, swK = 0, gr = 0, grT = 4, lastInk = -1;
    return {
        g, q, speed: q.speed * scale, scale, s: 0, dir: 1,
        update(dt, t, P, { go, wind = 0 }) {
            phase += (dt / q.period) * go;
            const p = q.pose(phase, go);
            const sh = p.sh, hp = p.hp;
            const top = Math.min(sh[1], hp[1]) - (ox ? 7 : 6);
            back.setAttribute('d', `M${f(hp[0] - 3)} ${f(hp[1] - 3)} Q${f(0)} ${f(top)} ${f(sh[0] + 2)} ${f(sh[1] - 5)}`);
            belly.setAttribute('d', `M${f(hp[0] + 2)} ${f(hp[1] + 4)} Q0 ${f(Math.max(hp[1], sh[1]) + 7)} ${f(sh[0] - 2)} ${f(sh[1] + 4)}`);
            fill.setAttribute('d', `M${f(hp[0] - 3)} ${f(hp[1] - 3)} Q0 ${f(top)} ${f(sh[0] + 2)} ${f(sh[1] - 5)} L${f(sh[0] - 2)} ${f(sh[1] + 4)} Q0 ${f(Math.max(hp[1], sh[1]) + 7)} ${f(hp[0] + 2)} ${f(hp[1] + 4)} Q${f(hp[0] - 5)} ${f(hp[1] + 1)} ${f(hp[0] - 3)} ${f(hp[1] - 3)}Z`);
            const tops = [[sh[0], sh[1] + 2], [sh[0] - 2, sh[1] + 2], [hp[0] + 1, hp[1] + 2], [hp[0] - 1, hp[1] + 2]];
            nearLegs.setAttribute('d', legPath(tops[0], p.feet[0], 1.4) + ' ' + legPath(tops[2], p.feet[2], -2.4));
            farLegs.setAttribute('d', legPath(tops[1], p.feet[1], 1.4) + ' ' + legPath(tops[3], p.feet[3], -2.4));
            hooves.setAttribute('d', p.feet.map(fo => `M${f(fo.x - 1.4)} ${f(fo.y)} L${f(fo.x + 2)} ${f(fo.y)} L${f(fo.x + 1.4)} ${f(fo.y - 2)} L${f(fo.x - 1)} ${f(fo.y - 2)}Z`).join(' '));
            // grazing: the head goes down now and then while standing (keyed by a spring)
            grT -= dt; if (grT < 0) { grT = 3 + Math.random() * 5; gr = go < 0.1 && Math.random() < 0.6 ? 1 : 0; }
            const gz = graze.step(go < 0.1 ? gr : 0, dt);
            const nb = [sh[0] + 1, sh[1] - 4], hd = [sh[0] + (ox ? 9 : 10) + gz * 3, sh[1] - (ox ? 8 : 15) + gz * (ox ? 14 : 24)];
            neck.setAttribute('d', ox
                ? `M${f(nb[0] - 2)} ${f(nb[1] - 2)} Q${f(hd[0] - 4)} ${f(hd[1] - 4)} ${f(hd[0])} ${f(hd[1] - 2)} L${f(hd[0] + 5)} ${f(hd[1] + 3)} Q${f(hd[0] + 3)} ${f(hd[1] + 6)} ${f(hd[0] - 1)} ${f(hd[1] + 4)} Q${f(nb[0] + 1)} ${f(nb[1] + 6)} ${f(nb[0] - 2)} ${f(nb[1] + 6)}Z`
                : `M${f(nb[0] - 3)} ${f(nb[1])} Q${f(hd[0] - 6)} ${f((nb[1] + hd[1]) / 2 - 6)} ${f(hd[0] - 2)} ${f(hd[1] - 3)} L${f(hd[0] + 7)} ${f(hd[1] + 3)} Q${f(hd[0] + 7)} ${f(hd[1] + 6)} ${f(hd[0] + 3)} ${f(hd[1] + 5)} L${f(hd[0] - 1)} ${f(hd[1] + 3)} Q${f(nb[0] + 3)} ${f(nb[1] + 6)} ${f(nb[0] + 1)} ${f(nb[1] + 8)}Z`);
            ear.setAttribute('d', ox ? `M${f(hd[0] - 2)} ${f(hd[1] - 2)} q-3 -3 -6 -1 M${f(hd[0] - 1)} ${f(hd[1] - 2)} q1 -4 -2 -6` : `M${f(hd[0] - 2)} ${f(hd[1] - 3)} l-0.6 -4 l2 2.6`);
            if (mane) mane.setAttribute('d', `M${f(nb[0] - 3)} ${f(nb[1])} Q${f(hd[0] - 7)} ${f((nb[1] + hd[1]) / 2 - 7)} ${f(hd[0] - 3)} ${f(hd[1] - 4)} M${f(nb[0])} ${f(nb[1] - 3)} l-2 -1 M${f((nb[0] + hd[0]) / 2)} ${f((nb[1] + hd[1]) / 2 - 5)} l-2 -1`);
            // tail swish: a kick now and then, settling on a spring
            swT -= dt; if (swT < 0) { swT = 2 + Math.random() * 4; sw.kick((Math.random() < 0.5 ? -1 : 1) * 30); }
            const s = sw.step(wind * 2, dt);
            const tb = [hp[0] - 3, hp[1] - 2];
            tail.setAttribute('d', `M${pt(tb)} Q${f(tb[0] - 4 + s * 0.1)} ${f(tb[1] + 6)} ${f(tb[0] - 3 + s * 0.2)} ${f(tb[1] + (ox ? 14 : 16))}`);
            if (pack) {
                const by = Math.min(sh[1], hp[1]) - 4;
                pack.setAttribute('d', `M${f(-10)} ${f(by + 2)} Q-12 ${f(by - 9)} -4 ${f(by - 10)} L6 ${f(by - 10)} Q12 ${f(by - 9)} 10 ${f(by + 2)} Q0 ${f(by + 5)} -10 ${f(by + 2)}Z`);
                packTie.setAttribute('d', `M-4 ${f(by - 10)} L-6 ${f(by + 4)} M5 ${f(by - 10)} L6 ${f(by + 4)}`);
            }
            if (Math.abs(P.inkT - lastInk) > 0.02) { lastInk = P.inkT; const c = rgb(mix(toRGB(colour), [30, 32, 52], P.inkT * 0.45)); fill.setAttribute('fill', c); neck.setAttribute('fill', c); }
        },
        place(tr, dir) { g.setAttribute('transform', tr); body.setAttribute('transform', `scale(${f(dir * scale)} ${f(scale)})`); }
    };
}

// ------------------------------------------------------------------ cat: keyed poses

// Pose points (cat space, ground y = 0, facing +x): R rump, S shoulder, M mid-back,
// H head, T tail control and tip, F front feet, B hind foot.
const CAT = {
    curl:    { R: [6, -3.4], S: [-5, -3.6], M: [0.4, -7.4], H: [-8.4, -2.8], hr: 24, ear: 0.3, T1: [8, 2], T2: [-3, 1.4], F: [-7, 0], B: [5, 0] },
    sit:     { R: [3.4, -3], S: [-2.4, -11], M: [2.6, -9], H: [-3.4, -15.2], hr: 0, ear: 1, T1: [10, 0.4], T2: [12.4, -3.6], F: [-2.6, 0], B: [4, 0] },
    yawn:    { R: [3.4, -3], S: [-2.4, -11.4], M: [2.6, -9.4], H: [-3.8, -16.4], hr: -24, ear: 0.6, T1: [10, 0.4], T2: [12.4, -3.6], F: [-2.6, 0], B: [4, 0] },
    stretch: { R: [5.2, -10], S: [-7.4, -4.2], M: [-1.2, -7.6], H: [-12.4, -6], hr: -8, ear: 0.7, T1: [7.6, -16], T2: [6, -21], F: [-14.6, 0], B: [5.6, 0] },
    wash:    { R: [3.4, -3], S: [-2.4, -11], M: [2.6, -9], H: [-3, -13.8], hr: 26, ear: 1, T1: [10, 0.4], T2: [12.4, -2.6], F: [-3.4, -10], B: [4, 0] }
};
const lerpPose = (a, b, t) => { const o = {}; for (const k in a) o[k] = Array.isArray(a[k]) ? L2(a[k], b[k], t) : lerp(a[k], b[k], t); return o; };
const WAKE = [['sit', 0.8], ['yawn', 0.9], ['sit', 0.5], ['stretch', 1.4], ['sit', 0.6], ['wash', 0.5], ['sit', 0.4], ['wash', 0.5], ['sit', 1.2], ['curl', 1.2]];
const WAKE_T = WAKE.reduce((a, s) => a + s[1], 0);

export function createCat(parent, glowParent, { colour = '#ece6d8', patch = '#d08a4a', collar = '#b3412d', scale = 0.62 } = {}) {
    const g = el('g', { class: 'animal cat', style: 'cursor:pointer' }, parent);
    const body = el('g', {}, g);
    const gl = el('g', {}, glowParent);
    const tailO = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.8, 'stroke-linecap': 'round' }, body);
    const tailI = el('path', { fill: 'none', stroke: colour, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, body);
    const legs = pen(body, SP * 1.4);
    const torso = el('path', { fill: colour, stroke: 'currentColor', 'stroke-width': SP * 1.1, 'stroke-linejoin': 'round' }, body);
    const spot = el('path', { fill: patch }, body);
    const paws = el('path', { fill: 'currentColor' }, body);
    const head = el('g', {}, body);
    const ears = el('path', { fill: colour, stroke: 'currentColor', 'stroke-width': SP * 0.9, 'stroke-linejoin': 'round' }, head);
    el('ellipse', { rx: 3.9, ry: 3.4, fill: colour, stroke: 'currentColor', 'stroke-width': SP * 1.1, class: 'cat-head' }, head);
    const capN = el('path', { d: 'M-3.6 -1.2 Q-3 -3.4 -0.4 -3.4 Q-1.2 -1.4 -3.6 -1.2Z', fill: patch }, head);
    const mouth = el('path', { fill: '#6a2a2a', stroke: 'none' }, head);
    const collarN = el('path', { fill: 'none', stroke: collar, 'stroke-width': 1.2, 'stroke-linecap': 'round' }, body);
    const eyes = [el('circle', { r: 2.2, fill: 'url(#e-cateye)', opacity: 0 }, gl), el('circle', { r: 2.2, fill: 'url(#e-cateye)', opacity: 0 }, gl)];
    const hit = el('rect', { x: -16, y: -22, width: 34, height: 24, fill: 'transparent' }, body);
    let seq = -1, breath = 0, flick = 0, idle = 2, lastInk = -1;
    const tintNodes = [[torso, colour], [ears, colour], [head.querySelector('.cat-head'), colour], [spot, patch], [capN, patch]];
    return {
        g, gl, hit, scale,
        poke() { if (seq < 0) seq = 0; },
        get awake() { return seq >= 0; },
        update(dt, t, P, eyeAt) {
            let pose;
            if (seq >= 0) {
                seq += dt;
                let acc = 0, prev = 'curl', cur = WAKE[0][0], u = 1;
                for (const [name, d] of WAKE) { if (seq < acc + d) { cur = name; u = (seq - acc) / d; break; } acc += d; prev = name; cur = name; }
                if (seq > WAKE_T) seq = -1;
                pose = lerpPose(CAT[prev], CAT[cur], ease(Math.min(1, u * 1.6)));
            } else pose = lerpPose(CAT.curl, CAT.sit, smooth(0.45, 0.8, P.night));   // cats sit up and watch at night
            breath += dt;
            const b = Math.sin(breath * 1.7) * 0.32;       // breathing is the one allowed idle oscillation (±0.35)
            idle -= dt; if (idle < 0) { idle = 2 + Math.random() * 4; flick = 1; }
            flick = Math.max(0, flick - dt * 1.4);
            const R = pose.R, S = [pose.S[0], pose.S[1] - b], M = [pose.M[0], pose.M[1] - b * 1.4];
            torso.setAttribute('d', `M${f(R[0] + 1.4)} 0 Q${f(R[0] + 2.4)} ${f(R[1] - 1)} ${pt(R)} Q${pt(M)} ${pt(S)} Q${f(S[0] - 3)} ${f((S[1]) / 2)} ${f(S[0] - 2)} 0Z`);
            spot.setAttribute('d', oval((R[0] + M[0]) / 2 + 0.4, (R[1] + M[1]) / 2 + 1.2, 2.2, 1.4));
            const fl = Math.sin(t * 12) * 2.2 * flick;
            const T0 = [R[0] + 1, R[1] + 2], T1 = pose.T1, T2 = [pose.T2[0] + fl, pose.T2[1] - fl * 0.3];
            const td = `M${pt(T0)} Q${pt(T1)} ${pt(T2)}`;
            tailO.setAttribute('d', td); tailI.setAttribute('d', td);
            legs.setAttribute('d', `M${f(S[0] + 0.6)} ${f(S[1] + 3)} L${pt(pose.F)} M${f(R[0] - 0.6)} ${f(R[1] + 2)} L${pt(pose.B)}`);
            paws.setAttribute('d', `${oval(pose.F[0] - 0.4, pose.F[1] - 0.6, 1.3, 0.8)} ${oval(pose.B[0], pose.B[1] - 0.6, 1.3, 0.8)}`);
            head.setAttribute('transform', `translate(${f(pose.H[0])} ${f(pose.H[1] - b)}) rotate(${f(pose.hr)})`);
            const e = pose.ear;
            ears.setAttribute('d', `M-3.4 -1.6 L${f(-3.8 - (1 - e))} ${f(-6.6 + (1 - e) * 2.6)} L-0.8 -3.2Z M1 -3.4 L${f(3 + (1 - e))} ${f(-6.6 + (1 - e) * 2.6)} L3.8 -1.4Z`);
            mouth.setAttribute('d', pose.hr < -15 ? oval(-2.2, 1.4, 1.2, 1.4) : '');
            collarN.setAttribute('d', `M${f(S[0] - 1.4)} ${f(S[1] - 1.6)} q1.6 2.4 3.6 0.8`);
            // eyes glint at night: two small glows where the head is
            const lit = smooth(0.4, 0.8, P.night) * (pose.ear > 0.6 ? 1 : 0);
            if (eyeAt) for (let i = 0; i < 2; i++) { const [x, y] = eyeAt(pose.H[0] - 2.4 + i * 1.8, pose.H[1] - b - 0.6); eyes[i].setAttribute('cx', f(x)); eyes[i].setAttribute('cy', f(y)); eyes[i].setAttribute('opacity', f(lit)); }
            if (Math.abs(P.inkT - lastInk) > 0.02) { lastInk = P.inkT; for (const [n, c] of tintNodes) n.setAttribute('fill', rgb(mix(toRGB(c), [30, 32, 52], P.inkT * 0.4))); tailI.setAttribute('stroke', rgb(mix(toRGB(colour), [30, 32, 52], P.inkT * 0.4))); }
        },
        place(tr, dir) { g.setAttribute('transform', tr); gl.setAttribute('transform', tr); body.setAttribute('transform', `scale(${f(dir * scale)} ${f(scale)})`); this.dir = dir; }
    };
}

// ------------------------------------------------------------------ sparrows (and hens)

// A small flock on the street: hop in discrete hops, peck, flush up to a perch when
// someone walks through or on a tap, and come back down after a while.
export function createFlock(parent, { n = 5, span = [0, 60], perch = null, hen = false, rnd = Math.random } = {}) {
    const g = el('g', { class: 'flock', style: 'cursor:pointer' }, parent);
    const birds = Array.from({ length: n }, (_, i) => {
        const bg = el('g', {}, g);
        const chick = hen && i > 0;
        const k = hen ? (chick ? 0.55 : 1.5) : 1;
        const bodyN = el('path', { fill: hen ? (chick ? '#f2dc8a' : '#efe6d4') : PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.75, 'stroke-linejoin': 'round' }, bg);
        const capN = el('path', { fill: hen ? '#c8403a' : '#7a5a3c' }, bg);
        const wing = pen(bg, SP * 0.6), legs = pen(bg, SP * 0.6);
        return { bg, bodyN, capN, wing, legs, k, x: lerp(span[0], span[1], rnd()), y: 0, home: lerp(span[0], span[1], rnd()), face: rnd() < 0.5 ? -1 : 1,
            state: 'ground', t: rnd() * 2, hopT: -1, hx0: 0, hx1: 0, peck: 0, fly: 0, fx0: 0, fy0: 0, fx1: 0, fy1: 0, wait: 0 };
    });
    let flushT = 0;
    const flock = {
        g, birds,
        flush() {
            if (hen) { for (const b of birds) { b.hopT = 0; b.hx0 = b.x; b.hx1 = clamp(b.x + (rnd() < 0.5 ? -8 : 8), span[0], span[1]); } return; }
            for (const b of birds) if (b.state === 'ground') {
                b.state = 'up'; b.fly = 0; b.fx0 = b.x; b.fy0 = 0;
                b.fx1 = perch ? lerp(perch.x0, perch.x1, rnd()) : b.x + (rnd() - 0.5) * 30; b.fy1 = perch ? perch.y : -60 - rnd() * 20;
                b.face = b.fx1 > b.x ? 1 : -1; b.wait = 3 + rnd() * 4;
            }
            flushT = 4;
        },
        // near: is anyone walking within reach of x (flock space)?
        update(dt, t, P, near) {
            if (!hen && near) { for (const b of birds) if (b.state === 'ground' && near(b.x)) { flock.flush(); break; } }
            for (const b of birds) {
                b.t -= dt;
                let y = 0, flap = 0;
                if (b.state === 'ground') {
                    if (b.hopT >= 0) {
                        b.hopT += dt;
                        const u = clamp(b.hopT / (hen ? 0.32 : 0.16), 0, 1);
                        b.x = lerp(b.hx0, b.hx1, u); y = -Math.sin(Math.PI * u) * (hen ? 2 : 2.6) * b.k;
                        if (u >= 1) b.hopT = -1;
                    } else if (b.t < 0) {
                        const r = rnd();
                        if (r < 0.45) { b.hopT = 0; b.hx0 = b.x; const d = (hen ? 3 : 4) * b.k * (rnd() < 0.7 ? b.face : -b.face); b.hx1 = clamp(b.x + d, span[0], span[1]); if (b.hx1 === b.x) b.face *= -1; }
                        else if (r < 0.8) b.peck = 1;
                        else b.face *= -1;
                        b.t = hen ? 0.5 + rnd() * 1.6 : 0.25 + rnd() * 1.4;
                    }
                    b.peck = Math.max(0, b.peck - dt * 4);
                } else {
                    // up to the perch along an arc, wait, and come back down to the street
                    b.fly = Math.min(1, b.fly + dt / 0.9);
                    const u = ease(b.fly);
                    flap = b.fly < 1 ? 1 : 0;
                    b.x = lerp(b.fx0, b.fx1, u); y = lerp(b.fy0, b.fy1, u) - Math.sin(Math.PI * u) * 14;
                    if (b.fly >= 1) {
                        b.wait -= dt;
                        if (b.wait < 0) {
                            const down = b.state === 'up';
                            b.state = down ? 'down' : 'ground'; b.fly = down ? 0 : 1;
                            if (down) { b.fx0 = b.x; b.fy0 = b.fy1; b.fx1 = lerp(span[0], span[1], rnd()); b.fy1 = 0; b.face = b.fx1 > b.x ? 1 : -1; b.wait = 0; }
                            else { y = 0; }
                        }
                    }
                    if (b.state === 'down' && b.fly >= 1) { b.state = 'ground'; y = 0; }
                }
                b.y = y;
                const k = b.k, pk = b.peck * 1.6 * k, s = b.face;
                b.bg.setAttribute('transform', `translate(${f(b.x)} ${f(y)}) scale(${s} 1)`);
                b.bodyN.setAttribute('d', `M${f(-3.6 * k)} ${f(-3 * k)} Q${f(-3.4 * k)} ${f(-6 * k)} ${f(0.4 * k)} ${f(-6 * k)} Q${f(3.2 * k)} ${f(-6.4 * k + pk)} ${f(3.6 * k)} ${f(-4.4 * k + pk)} L${f(5.2 * k)} ${f(-4 * k + pk * 1.2)} L${f(3.4 * k)} ${f(-3.4 * k + pk)} Q${f(1.6 * k)} ${f(-1.6 * k)} ${f(-3.6 * k)} ${f(-3 * k)}Z M${f(-3.4 * k)} ${f(-3.6 * k)} L${f(-7 * k)} ${f((hen ? -6.4 : -2.4) * k)}`);
                b.capN.setAttribute('d', hen && k > 1 ? `M${f(1 * k)} ${f(-6 * k + pk)} q0.6 -2 1.6 -0.4 q0.6 -1.6 1.4 0.4Z` : oval(1.8 * k, -5.6 * k + pk, 1.5 * k, 0.8 * k));
                b.legs.setAttribute('d', b.state === 'ground' ? `M${f(-0.4 * k)} ${f(-2.4 * k)} L${f(-0.8 * k)} ${f(-y)} M${f(0.9 * k)} ${f(-2.4 * k)} L${f(1.1 * k)} ${f(-y)}` : '');
                b.wing.setAttribute('d', flap ? `M${f(-1 * k)} ${f(-4.6 * k)} q-3 ${f(-6 * Math.abs(Math.sin(t * 22 + b.home)))} -6 -2` : `M${f(-2.6 * k)} ${f(-4 * k)} q2.4 -0.8 4.4 0.2`);
            }
        }
    };
    g.addEventListener('pointerup', e => { if (!e.__dragged) flock.flush(); });
    return flock;
}

// ------------------------------------------------------------------ rabbit (the moon's mochi field)

export function createRabbit(parent, { scale = 0.6 } = {}) {
    const g = el('g', { class: 'animal' }, parent);
    const body = el('g', {}, g);
    const b = el('path', { fill: '#f4f0e8', stroke: 'currentColor', 'stroke-width': SP * 1.1, 'stroke-linejoin': 'round' }, body);
    const ears = el('path', { fill: '#f4f0e8', stroke: 'currentColor', 'stroke-width': SP * 0.9 }, body);
    const foot = el('path', { fill: 'currentColor' }, body);
    let hop = -1, wait = 2, x = 0, dir = 1, earT = 0;
    return {
        g, scale,
        update(dt, t, P) {
            wait -= dt;
            if (hop < 0 && wait < 0) { hop = 0; wait = 2 + Math.random() * 4; if (Math.random() < 0.3) dir *= -1; }
            let y = 0, stretch = 0;
            if (hop >= 0) { hop += dt; const u = clamp(hop / 0.36, 0, 1); x += dir * 14 * dt / 0.36; y = -Math.sin(Math.PI * u) * 5; stretch = Math.sin(Math.PI * u); if (u >= 1) hop = -1; }
            x = clamp(x, -14, 14);
            earT += dt;
            const ew = Math.abs(Math.sin(earT * 0.7)) > 0.97 ? 3 : 0;
            body.setAttribute('transform', `translate(${f(x)} ${f(y)}) scale(${f(dir * scale)} ${f(scale)})`);
            b.setAttribute('d', `M-7 0 Q${f(-9 - stretch * 2)} -8 -2 -9 Q3 -9.6 4 -6 Q7 -6 6.6 -3 Q6 -0.4 3 0Z`);
            ears.setAttribute('d', `M2.6 -8 Q${f(1 - ew)} -15 0 -16 Q-0.4 -12 1 -8Z M3.6 -7.6 Q${f(5 - ew * 0.4)} -14 5.4 -15 Q5.6 -11 4.6 -7.4Z`);
            foot.setAttribute('d', `${oval(-5, -0.6, 2.2, 0.8)} ${oval(4, -0.5, 1.1, 0.6)} ${oval(5.4, -5.2, 0.6, 0.6)}`);
        },
        place(tr) { g.setAttribute('transform', tr); }
    };
}
