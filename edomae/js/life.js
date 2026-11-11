// 江戸前 Edomae — ambient life: the creatures of each place (by creature.kind),
// fireflies on the river, cherry petals in the wind. Charter: creatures are never
// caught or harmed; a tap only startles them, and they come back by themselves.
//
// Everything here is drawn in a place's own frame (the place group rotates with
// the globe). ring(u, h) turns "arc offset u from the place start, height h above
// the street" into that frame.

import { el, pen, shape, blot, f, pt, PAPER } from './lib/ink.js';
import { clamp, lerp, smooth, seeded, spring } from './lib/motion.js';
import { nightTint, toRGB, rgb, mix } from './lib/daynight.js';
import { SP, oval } from './kit.js';

const ARCH = { butterfly: 'butterfly', insect: 'dragonfly', bird: 'bird', fish: 'fish', jellyfish: 'jelly', beast: 'beast', dragon: 'dragon' };

export function createLife(placeG, glowG, entry, W, R, { seed = 1, waterSpans = [], blossoms = [], fireflies = [] } = {}) {
    const rnd = seeded(seed);
    const g = el('g', { class: 'life' }, placeG);
    const gl = el('g', {}, glowG);
    const ring = (u, h) => { const a = u / R, r = R + h; return [Math.sin(a) * r, -Math.cos(a) * r]; };
    const angleAt = u => u / R * 57.29578;
    const ids = new Set(entry.districts.map(d => d.id));
    const spans = new Map(entry.districts.map(d => [d.id, [d.x0 - entry.s0, d.x1 - entry.s0]]));
    const mine = W.creatures.filter(c => (c.home || []).some(h => ids.has(h)));
    // a few creatures per place, chosen deterministically, different kinds first
    const chosen = [];
    const seen = new Set();
    for (const c of mine) if (!seen.has(c.kind) && chosen.length < 3) { seen.add(c.kind); chosen.push(c); }
    for (const c of mine) if (chosen.length < 3 && !chosen.includes(c)) chosen.push(c);
    const critters = chosen.map((c, i) => {
        const homeId = (c.home || []).find(h => ids.has(h));
        const span = spans.get(homeId) || [0, entry.s1 - entry.s0];
        return createCritter(g, gl, c, span, ring, angleAt, rnd, waterSpans);
    });

    // fireflies over the river at night
    const flies = [];
    for (const fz of fireflies) for (let i = 0; i < 14; i++) {
        flies.push({ u: lerp(fz.x0, fz.x1, rnd()), h: -lerp(fz.y0, fz.y1, rnd()), ph: rnd(0, 6), sp: rnd(0.4, 1.1), fz,
            dot: el('circle', { r: 0.9, fill: '#f6ffb0' }, g), glow: el('circle', { r: 6, fill: 'url(#e-fireflyglow)', opacity: 0 }, gl), x: 0, y: 0 });
    }
    // petals from the blossoms, carried by the wind
    const petals = blossoms.length ? Array.from({ length: 18 }, () => ({ n: el('path', { fill: '#f2c4d2', stroke: 'currentColor', 'stroke-width': 0.25 }, g), age: rnd(0, 6), life: rnd(4, 7), src: blossoms[Math.floor(rnd() * blossoms.length)], dx: 0 })) : [];

    return {
        critters,
        draw(t, dt, wind, P) {
            for (const c of critters) c.draw(t, dt, wind, P);
            const on = smooth(0.35, 0.7, P.lamp);
            for (const fl of flies) {
                fl.dot.style.display = on > 0.02 ? '' : 'none';
                if (on <= 0.02) { fl.glow.setAttribute('opacity', 0); continue; }
                fl.u += Math.sin(t * fl.sp + fl.ph) * 3 * dt + wind * 2 * dt;
                fl.h += Math.cos(t * fl.sp * 1.3 + fl.ph) * 2 * dt;
                fl.u = clamp(fl.u, fl.fz.x0, fl.fz.x1); fl.h = clamp(fl.h, -fl.fz.y0 - 4, 40);
                const [x, y] = ring(fl.u + fl.fz.base, fl.h);
                const blink = Math.max(0, Math.sin(t * 2.2 + fl.ph * 3)) ** 3;
                fl.dot.setAttribute('cx', f(x)); fl.dot.setAttribute('cy', f(y));
                fl.dot.setAttribute('opacity', f(on * (0.3 + 0.7 * blink)));
                fl.glow.setAttribute('cx', f(x)); fl.glow.setAttribute('cy', f(y)); fl.glow.setAttribute('opacity', f(on * blink));
            }
            for (const p of petals) {
                p.age += dt;
                if (p.age > p.life) { p.age = 0; p.dx = 0; p.src = blossoms[Math.floor(Math.random() * blossoms.length)]; }
                p.dx += (wind * 9 + 3) * dt;
                const u = p.age / p.life;
                const x = p.src[0] + p.dx + Math.sin(p.age * 2.4) * 3, y = p.src[1] + u * 70;
                const s = 1.4, a = p.age * 3;
                p.n.setAttribute('d', `M${f(x)} ${f(y)} l${f(Math.cos(a) * s)} ${f(Math.sin(a) * s * 0.6)} l${f(-Math.sin(a) * s * 0.5)} ${f(Math.cos(a) * s)}Z`);
                p.n.setAttribute('opacity', f(Math.min(1, (1 - u) * 3) * (y < 0 ? 1 : 0)));
            }
        }
    };
}

function createCritter(g, gl, c, span, ring, angleAt, rnd, waterSpans) {
    let kind = ARCH[c.kind] || 'mote';
    const pal = (c.visual && c.visual.palette) || ['#c9a23a', '#34507a'];
    const col = pal.find(x => /^#[0-9a-f]{6}$/i.test(x)) || '#c9a23a';
    const col2 = pal.find((x, i) => i > 0 && /^#[0-9a-f]{6}$/i.test(x)) || '#2c2a2a';
    const water = waterSpans.find(w => w[0] < span[1] && w[1] > span[0]);
    if (kind === 'fish' && !water) kind = 'airfish';
    const grp = el('g', { class: 'critter', style: 'cursor:pointer' }, g);
    el('title', {}, grp).textContent = (c.name_ja || '').replace(/（[^）]*）/g, '') + (c.name_en ? ' — ' + c.name_en : '');
    const body = el('g', {}, grp);
    const hit = el('circle', { r: 9, fill: 'transparent' }, grp);
    const glowN = el('circle', { r: 16, fill: 'url(#e-coolglow)', opacity: 0 }, gl);
    const st = { u: lerp(span[0] + 10, span[1] - 10, rnd()), h: kind === 'bird' || kind === 'beast' ? 0 : lerp(14, 60, rnd()), tu: 0, th: 0, t: 0, flee: 0, timer: rnd(0, 3), face: 1, hop: 0 };
    st.tu = st.u; st.th = st.h;
    const su = spring(6, 3.4, st.u), sh = spring(6, 3.4, st.h);
    let parts = {};
    const P2 = d => { const n = pen(body, SP * 0.8); n.setAttribute('d', d); return n; };
    switch (kind) {
        case 'butterfly': parts = { wingA: el('path', { fill: col, stroke: 'currentColor', 'stroke-width': SP * 0.6 }, body), wingB: el('path', { fill: col2, stroke: 'currentColor', 'stroke-width': SP * 0.6 }, body), b: blot(body) }; break;
        case 'dragonfly': parts = { wings: el('path', { fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.45, opacity: 0.85 }, body), b: el('path', { fill: col, stroke: 'currentColor', 'stroke-width': SP * 0.5 }, body) }; break;
        case 'bird': parts = { b: el('path', { fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.8 }, body), cap: el('path', { fill: col }, body), legs: pen(body, SP * 0.6), wing: pen(body, SP * 0.6) }; break;
        case 'beast': parts = { tail: el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, body), tailIn: el('path', { fill: 'none', stroke: col, 'stroke-width': 1.2, 'stroke-linecap': 'round' }, body), b: el('path', { fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.8 }, body), head: el('path', { fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.8 }, body), legs: pen(body, SP * 0.9) }; break;
        case 'fish': case 'airfish': parts = { b: el('path', { fill: col, stroke: 'currentColor', 'stroke-width': SP * 0.6 }, body), ring: pen(body, SP * 0.5) }; break;
        case 'jelly': parts = { b: el('path', { fill: col, 'fill-opacity': 0.5, stroke: 'currentColor', 'stroke-width': SP * 0.6 }, body), t: pen(body, SP * 0.4) }; break;
        case 'dragon': parts = { b: el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, body), bi: el('path', { fill: 'none', stroke: col, 'stroke-width': 1.1, 'stroke-linecap': 'round' }, body) }; break;
        default: parts = { b: el('circle', { r: 1.6, fill: col, stroke: 'currentColor', 'stroke-width': SP * 0.4 }, body) }; break;
    }
    const tintNodes = Object.values(parts).filter(n => n && n.getAttribute && /^#/.test(n.getAttribute('fill') || ''));
    const tintCols = tintNodes.map(n => n.getAttribute('fill'));
    let lastInk = -1;
    grp.addEventListener('pointerup', e => { if (!e.__dragged) { st.flee = 1; st.timer = 0; } });

    function wander() {
        const lo = span[0] + 6, hi = span[1] - 6;
        if (kind === 'bird' || kind === 'beast') { st.tu = clamp(st.u + (rnd() - 0.5) * 40, lo, hi); st.th = 0; st.timer = rnd(1.5, 4); }
        else if (kind === 'fish') { st.timer = rnd(3, 7); st.jump = 0; st.tu = clamp(lerp(water[0], water[1], rnd()), lo, hi); }
        else { st.tu = lerp(lo, hi, rnd()); st.th = kind === 'dragon' ? lerp(90, 150, rnd()) : lerp(10, 70, rnd()); st.timer = rnd(1.4, 3.6); }
    }
    wander();

    return {
        c, g: grp,
        draw(t, dt, wind, Pal) {
            st.t += dt; st.timer -= dt;
            if (st.flee > 0) {
                st.flee = Math.max(0, st.flee - dt * 0.4);
                if (kind === 'bird' || kind === 'butterfly' || kind === 'dragonfly') { st.th = 90; st.tu = st.u + 30 * st.face; }
                if (kind === 'beast') { st.tu = st.u - 30 * st.face; }
                if (kind === 'fish' && st.timer > 0) st.timer = 0;
            } else if (st.timer < 0) wander();
            const u = su.step(st.tu + (kind === 'butterfly' ? Math.sin(st.t * 2.1) * 4 : 0), dt);
            let h = sh.step(st.th + (kind === 'butterfly' ? Math.sin(st.t * 3.3) * 3 : kind === 'jelly' || kind === 'mote' || kind === 'airfish' ? Math.sin(st.t * 0.9) * 4 : 0), dt);
            const vu = u - st.u; st.u = u; st.h = h;
            if (Math.abs(vu) > 0.02) st.face = vu > 0 ? 1 : -1;
            let flap = 0, extra = '';
            if (kind === 'fish') {
                // a jump: out of the water and back, a ring where it went in
                const j = clamp(1 - st.timer / 1.2, 0, 1);
                h = st.timer < 1.2 ? Math.sin(Math.PI * j) * 16 - 3 : -3;
                extra = st.timer < 1.2 ? `rotate(${f((j - 0.5) * 120 * st.face)})` : '';
                body.style.opacity = st.timer < 1.2 ? 1 : 0;
            }
            const [x, y] = ring(u, h);
            body.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(angleAt(u))}) scale(${st.face} 1) ${extra}`);
            hit.setAttribute('cx', f(x)); hit.setAttribute('cy', f(y));
            switch (kind) {
                case 'butterfly': {
                    flap = Math.abs(Math.sin(st.t * (st.flee ? 18 : 11)));
                    const w = 5 * (0.25 + 0.75 * flap);
                    parts.wingA.setAttribute('d', `M0 0 Q${f(-2)} ${f(-w - 2)} ${f(3)} ${f(-w)} Q${f(3.4)} -1 0 0Z`);
                    parts.wingB.setAttribute('d', `M0 0 Q${f(-3)} ${f(w * 0.6 + 1)} ${f(1.6)} ${f(w * 0.5)} Q${f(2)} 0.6 0 0Z`);
                    parts.b.setAttribute('d', 'M-2.4 0.4 Q0 -0.8 2.6 0 Q0 1 -2.4 0.4Z');
                    break;
                }
                case 'dragonfly': {
                    const w = 0.6 + 0.4 * Math.abs(Math.sin(st.t * 30));
                    parts.wings.setAttribute('d', `M0 0 Q-2 ${f(-5 * w)} -6 ${f(-4 * w)} Q-3 -1 0 0Z M1 0 Q3 ${f(-5 * w)} 7 ${f(-4 * w)} Q4 -1 1 0Z`);
                    parts.b.setAttribute('d', 'M-8 0.3 L4 -0.3 Q5.4 0 4 0.6 L-8 0.8Z');
                    break;
                }
                case 'bird': {
                    const moving = Math.abs(vu) > 0.05 || h > 2;
                    st.hop = moving ? Math.abs(Math.sin(st.t * 12)) * 1.4 : 0;
                    const fly = h > 3;
                    parts.b.setAttribute('d', `M-3.6 ${f(-3 - st.hop)} Q-3.4 ${f(-6 - st.hop)} 0.4 ${f(-6 - st.hop)} Q3.6 ${f(-6.4 - st.hop)} 4 ${f(-4.4 - st.hop)} L5.6 ${f(-4.2 - st.hop)} L3.8 ${f(-3.4 - st.hop)} Q1.6 ${f(-1.6 - st.hop)} -3.6 ${f(-3 - st.hop)}Z M-3.4 ${f(-3.6 - st.hop)} L-7.4 ${f(-2.6 - st.hop)}`);
                    parts.cap.setAttribute('d', oval(2.2, -5.6 - st.hop, 1.6, 0.9));
                    parts.legs.setAttribute('d', fly ? '' : `M-0.4 ${f(-2.4 - st.hop)} L-0.8 0 M1 ${f(-2.4 - st.hop)} L1.2 0`);
                    parts.wing.setAttribute('d', fly ? `M-1 -4.4 q-3 ${f(-6 * Math.abs(Math.sin(st.t * 16)))} -6 ${f(-3)}` : `M-2.6 ${f(-4 - st.hop)} q2.4 -0.8 4.4 0.2`);
                    break;
                }
                case 'beast': {
                    const walking = Math.abs(vu) > 0.03;
                    const flick = Math.sin(st.t * 1.6) > 0.96 ? 2.4 : 0;
                    parts.b.setAttribute('d', walking ? 'M-8 -6 Q-8 -10 -3 -10 L5 -10 Q8 -10 8 -7 L8 -5 L-8 -5Z' : 'M-6 0 Q-8 -8 -2 -11 Q3 -12 4 -8 L5 0Z');
                    parts.head.setAttribute('d', walking ? 'M6 -10 L6 -15 L7.6 -12.6 L9.6 -15 L10 -11 Q11.6 -9 9 -7.4 L6.4 -7.6Z' : 'M1 -11 L1 -16.4 L2.8 -14 L4.8 -16.4 L5.2 -12 Q6.6 -10 4 -8.6 L1.4 -8.8Z');
                    const ph = st.t * 8;
                    parts.legs.setAttribute('d', walking ? `M-6 -5 L${f(-6 + Math.sin(ph) * 2)} 0 M-4 -5 L${f(-4 - Math.sin(ph) * 2)} 0 M5 -5 L${f(5 + Math.sin(ph) * 2)} 0 M7 -5 L${f(7 - Math.sin(ph) * 2)} 0` : 'M2 -4 L2.4 0 M3.6 -4 L4 0');
                    const td = walking ? `M-8 -8 Q-13 -9 -15 ${f(-13 - flick)}` : `M-5 -1 Q-11 0 -12 ${f(-5 - flick)}`;
                    parts.tail.setAttribute('d', td); parts.tailIn.setAttribute('d', td);
                    break;
                }
                case 'fish': case 'airfish': {
                    const wv = Math.sin(st.t * 6) * 1.2;
                    parts.b.setAttribute('d', `M-6 0 Q-2 -3.4 3.6 -1.4 Q6 0 3.6 1.4 Q-2 3.4 -6 0Z M-6 0 L${f(-9)} ${f(-2.6 + wv)} L${f(-9)} ${f(2.6 + wv)}Z`);
                    parts.ring.setAttribute('d', kind === 'fish' && st.timer > 1.2 && st.timer < 2 ? `M-6 10 q6 -2 12 0` : '');
                    break;
                }
                case 'jelly': {
                    const p = Math.sin(st.t * 2) * 0.8;
                    parts.b.setAttribute('d', `M-5 0 Q-5 ${f(-6 - p)} 0 ${f(-6 - p)} Q5 ${f(-6 - p)} 5 0 Q0 1.4 -5 0Z`);
                    parts.t.setAttribute('d', `M-3 0.6 q${f(p)} 4 0 8 M0 0.8 q${f(-p)} 4 0 9 M3 0.6 q${f(p)} 4 0 8`);
                    break;
                }
                case 'dragon': {
                    const d = []; for (let i = 0; i <= 12; i++) { const xx = -i * 4, yy = Math.sin(st.t * 1.6 - i * 0.6) * 3; d.push(`${i ? 'L' : 'M'}${f(xx)} ${f(yy)}`); }
                    parts.b.setAttribute('d', d.join(' ')); parts.bi.setAttribute('d', d.join(' '));
                    break;
                }
                default: break;
            }
            const glowOn = (kind === 'mote' || kind === 'jelly' || kind === 'dragonfly') ? 0.25 + 0.75 * Pal.night : 0;
            glowN.setAttribute('cx', f(x)); glowN.setAttribute('cy', f(y)); glowN.setAttribute('opacity', f(glowOn * 0.7));
            if (Math.abs(Pal.inkT - lastInk) > 0.02) { lastInk = Pal.inkT; tintNodes.forEach((n, i) => n.setAttribute('fill', nightTint(tintCols[i], Pal, 0.4))); }
        }
    };
}
