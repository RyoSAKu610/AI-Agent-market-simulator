// 江戸前 Edomae — things that touch the water: a boat sculled with an oar, a frog on
// the bank, a tub with a koi, a bucket drawn from a well. Each drives its surface
// (water.js) through poke() and splash(), so the water answers what they do.
// Motion is keyed or ballistic; nothing here allocates per frame.

import { el, f, pt, PAPER } from './lib/ink.js';
import { clamp, lerp, ease, smooth } from './lib/motion.js';
import { nightTint } from './lib/daynight.js';
import { SP, S, P, B, C, oval, rect } from './kit.js';
import { createSurface } from './water.js';
import { createSitter } from './sitter.js';

// a flat-bottomed boat that drifts along the river; the boatman sculls at the stern and
// every stroke of the oar pushes the water behind it
export function createBoat(ctx, sf, { colour = '#7a5a3c' } = {}) {
    const g = el('g', {}, ctx.g);
    const hull = C(g, 'M-15 -1 Q-16 3 -11 3.4 L11 3.4 Q16 3 17 -2 L13 -1Z', colour, SP * 0.8);
    P(g, 'M-13 0.4 L14 0.4', SP * 0.4);
    const man = createSitter(g, { x: -8, y: -1, scale: 0.42, task: 'pour', colour: '#34507a', hair: 'cap', seed: 0.4 });
    const oar = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.9, 'stroke-linecap': 'round' }, g);
    let x = lerp(sf.x0, sf.x1, 0.4), dir = 1, ph = 0, lastDip = 0, lastInk = -1;
    const y = lerp(sf.yTop, sf.yBot, 0.45);
    return {
        update(t, dt, P_) {
            ph += dt / 1.8;
            const u = ph % 1, sweep = Math.sin(u * Math.PI * 2);                 // the oar's stroke, keyed per cycle
            x += dir * (3.2 + 2.6 * Math.max(0, sweep)) * dt;
            if (x > sf.x1 - 20) dir = -1; if (x < sf.x0 + 20) dir = 1;
            const bob = sf.field.sample(x - sf.x0) * 0.6;
            g.setAttribute('transform', `translate(${f(x)} ${f(y + bob)}) scale(${dir} 1)`);
            const grip = [-10, -14], blade = [-19 - sweep * 3, 3];
            oar.setAttribute('d', `M${pt(grip)} L${pt(blade)}`);
            // the blade bites the water once a stroke: the surface is pushed behind the boat
            if (u > 0.2 && lastDip < 0.2) sf.poke(x - dir * 19, 0.5, 0.5);
            lastDip = u;
            man.draw(t, dt, P_);
            if (Math.abs(P_.inkT - lastInk) > 0.02) { lastInk = P_.inkT; hull.setAttribute('fill', nightTint(colour, P_)); }
        }
    };
}

// a frog that sits on the bank and now and then jumps in; it comes back up a while later
export function createFrog(ctx, sf, { side = 0.12 } = {}) {
    const g = el('g', { class: 'animal', style: 'cursor:pointer' }, ctx.g);
    const body = C(g, 'M-3 0 Q-3.4 -3.4 0 -3.6 Q3 -3.6 3.6 -1.4 Q2.6 0 -3 0Z', '#6f8f4a', SP * 0.7);
    B(g, `${oval(1.6, -3.2, 0.6, 0.6)}`);
    const legs = P(g, 'M-2.4 0 l-2 -1.4 l-1 1.4 M1.4 0 l1 0.4', SP * 0.6);
    const bankX = lerp(sf.x0, sf.x1, side), bankY = sf.yTop - 0.6;
    let state = 'sit', t0 = 0, wait = 4 + Math.random() * 6, jx = 0, lastInk = -1;
    const jump = () => { if (state === 'sit') { state = 'jump'; t0 = 0; jx = bankX + 10 + Math.random() * 18; } };
    g.addEventListener('pointerup', e => { if (!e.__dragged) jump(); });
    return {
        update(t, dt, P_) {
            t0 += dt;
            if (state === 'sit') { wait -= dt; if (wait < 0) jump(); g.setAttribute('transform', `translate(${f(bankX)} ${f(bankY)})`); g.style.display = ''; }
            else if (state === 'jump') {
                // a ballistic hop from the bank into the water
                const T = 0.5, u = clamp(t0 / T, 0, 1);
                const x = lerp(bankX, jx, u), y = lerp(bankY, lerp(sf.yTop, sf.yBot, 0.5), u) - 10 * Math.sin(Math.PI * u);
                g.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(-30 + 60 * u)})`);
                if (u >= 1) { sf.splash(jx, 0.5, 0.5); state = 'under'; t0 = 0; g.style.display = 'none'; }
            } else if (state === 'under' && t0 > 5 + Math.random() * 0.1) { state = 'sit'; wait = 6 + Math.random() * 8; sf.poke(bankX + 3, 0.4, 0.15); }
            if (Math.abs(P_.inkT - lastInk) > 0.02) { lastInk = P_.inkT; body.setAttribute('fill', nightTint('#6f8f4a', P_)); }
        }
    };
}

// a wooden tub of water with a koi that rises and flips its tail at the surface
export function createTub(ctx, x, { koi = '#d9813a' } = {}) {
    const g = ctx.g;
    S(g, `M${f(x - 11)} -12 L${f(x - 9.6)} 0 L${f(x + 9.6)} 0 L${f(x + 11)} -12Z`, SP * 0.9);
    P(g, `M${f(x - 10.6)} -8 L${f(x + 10.6)} -8 M${f(x - 10.2)} -3.6 L${f(x + 10.2)} -3.6`, SP * 0.6);
    const sf = createSurface({ g, hl: ctx.hl, gl: ctx.gl, rnd: ctx.rnd }, { x0: x - 10.6, x1: x + 10.6, yTop: -14.4, yBot: -9.6, kind: 'tub', shape: 'ellipse', flow: 0.05 });
    const fin = el('path', { fill: koi, stroke: 'currentColor', 'stroke-width': SP * 0.5, style: 'display:none' }, g);
    let wait = 3, t0 = -1;
    return {
        sf,
        update(t, dt, P_, wind) {
            wait -= dt;
            if (wait < 0 && t0 < 0) { t0 = 0; wait = 5 + Math.random() * 6; }
            if (t0 >= 0) {
                t0 += dt;
                // the koi's back and tail break the surface, flick, and go down
                const u = t0 / 1.2, up = Math.sin(Math.PI * clamp(u, 0, 1));
                fin.style.display = '';
                fin.setAttribute('d', `M${f(x - 4)} -12 Q${f(x - 1)} ${f(-12 - up * 2.4)} ${f(x + 3)} -12.4 L${f(x + 5)} ${f(-13.6 - up * 1.6)} L${f(x + 4.6)} -11.4Z`);
                if (t0 - dt < 0.55 && t0 >= 0.55) sf.splash(x + 4, 0.38, 0.5);
                if (u >= 1) { t0 = -1; fin.style.display = 'none'; }
            }
            sf.update(t, dt, wind, P_);
        }
    };
}

// a bucket on a rope, drawn up from the well and tipped, water dripping back
export function createBucket(ctx, x) {
    const g = el('g', {}, ctx.g);
    const rope = P(g, '', SP * 0.45);
    const bucket = S(g, '', SP * 0.6);
    const drips = Array.from({ length: 5 }, () => ({ n: el('circle', { r: 0.55, fill: '#a6c0c6', stroke: 'currentColor', 'stroke-width': 0.25, style: 'display:none' }, g), hi: el('circle', { r: 0.22, fill: PAPER, style: 'display:none' }, ctx.hl), x: 0, y: 0, vy: 0, on: false }));
    let ph = Math.random() * 10;
    return {
        update(t, dt) {
            ph += dt;
            const u = (ph % 10) / 10;
            // keyed: down (0–0.25), held (0.25–0.4), drawn up (0.4–0.65), held dripping (0.65–0.9), down again
            const y = u < 0.25 ? lerp(-20, -6, ease(u / 0.25)) : u < 0.4 ? -6 : u < 0.65 ? lerp(-6, -21, ease((u - 0.4) / 0.25)) : u < 0.9 ? -21 : lerp(-21, -20, (u - 0.9) / 0.1);
            rope.setAttribute('d', `M${f(x)} -22 L${f(x)} ${f(y - 3.4)}`);
            bucket.setAttribute('d', `M${f(x - 2.4)} ${f(y - 3.4)} L${f(x + 2.4)} ${f(y - 3.4)} L${f(x + 2)} ${f(y)} L${f(x - 2)} ${f(y)}Z`);
            const dripping = u > 0.62 && u < 0.92;
            for (const d of drips) {
                if (!d.on && dripping && Math.random() < dt * 3) { d.on = true; d.x = x + (Math.random() - 0.5) * 3; d.y = y + 0.4; d.vy = 0; d.n.style.display = ''; d.hi.style.display = ''; }
                if (d.on) {
                    d.vy += 160 * dt; d.y += d.vy * dt;
                    if (d.y > -8) { d.on = false; d.n.style.display = 'none'; d.hi.style.display = 'none'; continue; }
                    d.n.setAttribute('cx', f(d.x)); d.n.setAttribute('cy', f(d.y));
                    d.hi.setAttribute('cx', f(d.x - 0.2)); d.hi.setAttribute('cy', f(d.y - 0.25));
                }
            }
        }
    };
}
