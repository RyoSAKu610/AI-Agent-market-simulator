// 江戸前 Edomae — small companions that keep a resident company: a bird that rides a
// shoulder and makes short flights to a perch and back, and a butterfly that wanders
// round its person and settles on a sleeve when they stop. They are free: nothing ties
// them, they come back because they choose to. Motion is solved — springs toward
// targets chosen at random intervals, flights along eased arcs — and they answer their
// person: a bow or a trade or a tap sends the bird up with a flutter and the butterfly off.
//
// Positions are in the ring frame. `at(fx, fy)` turns a point in the owner's figure space
// into the ring frame; `angle()` gives the ground's tilt there (so a perch stays level).

import { el, f, pt, PAPER } from './lib/ink.js';
import { spring, clamp, lerp, ease, smooth } from './lib/motion.js';
import { toRGB, rgb, mix } from './lib/daynight.js';
import { SP, oval } from './kit.js';

export function createBirdCompanion(layer, glowLayer, owner, { colour = '#c9a23a', at, angle, perch } = {}) {
    const g = el('g', { class: 'companion' }, layer);
    const body = el('path', { fill: colour, stroke: 'currentColor', 'stroke-width': SP * 0.75, 'stroke-linejoin': 'round' }, g);
    const cap = el('path', { fill: 'currentColor' }, g);
    const wing = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.7, 'stroke-linecap': 'round' }, g);
    const legs = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.5 }, g);
    const st = { mode: 'ride', t: 0, wait: 6 + Math.random() * 6, from: [0, 0], to: [0, 0], x: 0, y: 0, face: 1, hop: 0, flap: 0, lastAct: 0 };
    let lastInk = -1;
    const shoulder = () => at(owner.look.hat && owner.look.hat !== 'none' ? 41 : 37.6, owner.look.hat && owner.look.hat !== 'none' ? 21 : 43.2);
    function fly(to, mode) { st.from = [st.x, st.y]; st.to = to; st.t = 0; st.mode = mode; st.face = to[0] >= st.x ? 1 : -1; }
    return {
        g,
        update(dt, t, P, visible) {
            g.style.display = visible ? '' : 'none';
            if (!visible) { st.mode = 'ride'; return; }
            const sh = shoulder();
            const act = (owner.act && (owner.act.bow + owner.act.reach + (owner.act.start || 0))) || 0;
            st.wait -= dt;
            // the person bows, trades or is startled: a little hop and a flutter
            if (act > 0.4 && st.lastAct <= 0.4 && st.mode === 'ride') st.hop = 1;
            st.lastAct = act;
            if (st.mode === 'ride') {
                st.x = sh[0]; st.y = sh[1] - st.hop * 4 * Math.sin(Math.PI * (1 - st.hop));
                st.hop = Math.max(0, st.hop - dt * 1.8);
                st.face = owner.dir || 1;
                // now and then, while its person stands still, off to a perch nearby
                if (st.wait < 0 && (owner.go || 0) < 0.2) { const pp = perch(owner); if (pp) fly(pp, 'out'); st.wait = 4 + Math.random() * 4; }
            } else {
                const target = st.mode === 'back' ? sh : st.to;
                if (st.mode === 'back') st.to = sh;
                st.t += dt / 0.75;
                const u = ease(clamp(st.t, 0, 1));
                const lift = Math.sin(Math.PI * clamp(st.t, 0, 1)) * 10;
                st.x = lerp(st.from[0], target[0], u); st.y = lerp(st.from[1], target[1], u) - lift;
                st.flap += dt * 22;
                if (st.t >= 1) {
                    if (st.mode === 'out') { st.mode = 'perch'; st.wait = 3 + Math.random() * 4; }
                    else { st.mode = 'ride'; st.wait = 8 + Math.random() * 8; }
                }
            }
            if (st.mode === 'perch') {
                // come back when the time is up, or when its person walks off
                const far = Math.hypot(sh[0] - st.x, sh[1] - st.y) > 40;
                if (st.wait < 0 || (owner.go || 0) > 0.4 && far || act > 0.4) fly(sh, 'back');
            }
            const flying = st.mode === 'out' || st.mode === 'back' || st.hop > 0.2;
            const k = 1.35, s = st.face;
            g.setAttribute('transform', `translate(${f(st.x)} ${f(st.y)}) rotate(${f(angle())}) scale(${s} 1)`);
            body.setAttribute('d', `M${f(-3.6 * k)} ${f(-3 * k)} Q${f(-3.4 * k)} ${f(-6 * k)} ${f(0.4 * k)} ${f(-6 * k)} Q${f(3.2 * k)} ${f(-6.4 * k)} ${f(3.6 * k)} ${f(-4.4 * k)} L${f(5.2 * k)} ${f(-4 * k)} L${f(3.4 * k)} ${f(-3.4 * k)} Q${f(1.6 * k)} ${f(-1.6 * k)} ${f(-3.6 * k)} ${f(-3 * k)}Z M${f(-3.4 * k)} ${f(-3.6 * k)} L${f(-7 * k)} ${f(-2.6 * k)}`);
            cap.setAttribute('d', oval(1.8 * k, -5.6 * k, 1.5 * k, 0.8 * k));
            wing.setAttribute('d', flying ? `M${f(-1 * k)} ${f(-4.4 * k)} q${f(-3 * k)} ${f(-6 * k * Math.abs(Math.sin(st.flap)))} ${f(-6 * k)} ${f(-2 * k)}` : `M${f(-2.6 * k)} ${f(-4 * k)} q${f(2.4 * k)} ${f(-0.8 * k)} ${f(4.4 * k)} ${f(0.2 * k)}`);
            legs.setAttribute('d', flying ? '' : `M${f(-0.4 * k)} ${f(-2.4 * k)} L${f(-0.8 * k)} 0 M${f(k)} ${f(-2.4 * k)} L${f(1.2 * k)} 0`);
            if (Math.abs(P.inkT - lastInk) > 0.02) { lastInk = P.inkT; body.setAttribute('fill', rgb(mix(toRGB(colour), [30, 32, 52], P.inkT * 0.4))); }
        }
    };
}

export function createButterflyCompanion(layer, glowLayer, owner, { colour = '#7fc8e8', at, angle } = {}) {
    const g = el('g', { class: 'companion' }, layer);
    const wa = el('path', { fill: colour, stroke: 'currentColor', 'stroke-width': SP * 0.45 }, g);
    const wb = el('path', { fill: colour, stroke: 'currentColor', 'stroke-width': SP * 0.45, opacity: 0.85 }, g);
    const b = el('path', { fill: 'currentColor' }, g);
    const glow = el('circle', { r: 9, fill: 'url(#e-coolglow)', opacity: 0 }, glowLayer);
    const sx = spring(9, 5), sy = spring(9, 5);
    const st = { off: [8, -20], next: 0, still: 0, beat: 0, settled: 0, x: null, y: null, scared: 0 };
    let lastAct = 0, lastInk = -1;
    return {
        g,
        update(dt, t, P, visible) {
            g.style.display = visible ? '' : 'none';
            glow.style.display = visible ? '' : 'none';
            if (!visible) { st.x = null; return; }
            const head = at(41, 30), sleeve = at(owner.fig && owner.fig.hand ? owner.fig.hand[0] - 2 : 50, owner.fig && owner.fig.hand ? owner.fig.hand[1] - 6 : 64);
            if (st.x === null) { sx.x = head[0]; sy.x = head[1]; st.x = head[0]; st.y = head[1]; }
            const act = (owner.act && (owner.act.bow + owner.act.reach)) || 0;
            if (act > 0.4 && lastAct <= 0.4) { st.scared = 1.6; st.still = 0; }
            lastAct = act;
            st.scared = Math.max(0, st.scared - dt);
            st.still = (owner.go || 0) < 0.1 && st.scared <= 0 ? st.still + dt : 0;
            const settle = st.still > 2.5;
            st.settled = clamp(st.settled + (settle ? dt : -dt) * 1.5, 0, 1);
            // a wandering path: a new point round the head every second or so (wider when startled)
            st.next -= dt;
            if (st.next < 0) { const r = st.scared > 0 ? 26 : 14; st.off = [(Math.random() - 0.5) * 2 * r, -8 - Math.random() * (st.scared > 0 ? 34 : 22)]; st.next = 0.7 + Math.random() * 0.9; }
            const tx = settle ? sleeve[0] : head[0] + st.off[0], ty = settle ? sleeve[1] : head[1] + st.off[1];
            st.x = sx.step(tx, dt); st.y = sy.step(ty, dt);
            // wing beats: fast in the air, slow open-and-close when settled
            st.beat += dt * lerp(16, 2.2, st.settled);
            const open = settle ? 0.55 + 0.45 * Math.abs(Math.sin(st.beat)) : 0.2 + 0.8 * Math.abs(Math.sin(st.beat));
            const w = 4.2 * open;
            const face = sx.v >= 0 ? 1 : -1;
            g.setAttribute('transform', `translate(${f(st.x)} ${f(st.y)}) rotate(${f(angle())}) scale(${face} 1)`);
            wa.setAttribute('d', `M0 0 Q-2 ${f(-w - 2)} ${f(3)} ${f(-w)} Q3.4 -1 0 0Z`);
            wb.setAttribute('d', `M0 0 Q-3 ${f(w * 0.6 + 1)} 1.6 ${f(w * 0.5)} Q2 0.6 0 0Z`);
            b.setAttribute('d', 'M-2.2 0.4 Q0 -0.7 2.4 0 Q0 0.9 -2.2 0.4Z');
            // it glows a little after dark, as the world's butterflies do
            glow.setAttribute('cx', f(st.x)); glow.setAttribute('cy', f(st.y)); glow.setAttribute('opacity', f(P.night * 0.7));
            if (Math.abs(P.inkT - lastInk) > 0.02) { lastInk = P.inkT; const c = rgb(mix(toRGB(colour), [30, 32, 52], P.inkT * 0.3)); wa.setAttribute('fill', c); wb.setAttribute('fill', c); }
        }
    };
}
