// 江戸前 Edomae — the 32 residents on the street, driven by the economy.
//
// Travel is never a slide around the globe: on 'depart' a resident walks, at its
// gait's own speed, to the 時層鳥居 of its place and steps through; on 'arrive' it
// steps out of the destination's torii and walks to the district. While in transit
// it is not on the street. When the economy runs ahead of the walking, events
// queue; a resident who is behind and off screen finishes its walk at once (an
// off-screen snap), never by walking faster.

import { place, el, f } from './lib/ink.js';
import { clamp, ease, smooth } from './lib/motion.js';
import { createFigure } from './figure.js';
import { lookOf } from './looks.js';
import { familyOf, arcDelta, standSpot, hash01 } from './layout.js';

export const FS = 0.5;                     // figure scale: figures ≈ 48 scene units tall
const LANES = [5, 10, 15];                 // feet this far below the building line
const FADE = 0.9;                          // seconds to step through a torii

export function createResidents({ layer, glowLayer, layout, W, eco, onTap, toriiOf, passerPlaces = [], onTrade = null }) {
    const R = layout.R, L = layout.total;
    const list = [];
    const byId = new Map();
    const placeOfDistrict = id => (layout.byDistrict.get(id) || {}).place;

    for (const def of W.agents) {
        const a = eco.agents.get(def.id);
        if (!a) continue;
        const home = W.byId.district.get(def.home);
        const pl = home ? W.byId.place.get(home.home) : null;
        const look = lookOf(def, pl, familyOf(pl));
        const fig = createFigure(layer, glowLayer, look);
        const lane = look.lane;
        const r = {
            id: def.id, def, a, look, fig, lane, off: LANES[lane],
            s: 0, dir: hash01(def.id, 'dir') < 0.5 ? 1 : -1, phase: hash01(def.id, 'ph'), go: 0, goT: 0,
            mode: 'gone', purpose: null, target: 0, district: null, queue: [], fade: 1, fadeT: 0,
            gest: null, gestT: 0, act: { bow: 0, reach: 0, chin: 0, start: 0 }, startT: -1, lastStage: a.stage,
            idle: 4 + hash01(def.id, 'idle') * 10, visible: false, shown: null, tip: 0
        };
        if (a.at && layout.byDistrict.has(a.at)) { r.mode = 'stand'; r.district = a.at; r.s = standSpot(layout, r.id, a.at); }
        fig.g.addEventListener('pointerup', e => { if (!e.__dragged) onTap && onTap(r); });
        fig.g.style.cursor = 'pointer';
        list.push(r); byId.set(r.id, r);
    }
    // front lanes over back lanes, once (lanes never change)
    list.slice().sort((x, y) => x.lane - y.lane).forEach(r => layer.appendChild(r.fig.g));

    const speedOf = r => r.fig.gait.speed * FS * r.look.scale;
    const toriiS = placeId => { const p = layout.byPlace.get(placeId); return p ? p.torii : 0; };

    function setTransform(r) {
        const deg = (r.s / R) * 57.29578;
        const tr = `rotate(${f(deg)}) translate(0 ${f(-(R - r.off))})`;
        r.fig.g.setAttribute('transform', tr);
        r.fig.glowRoot.setAttribute('transform', tr);
        place(r.fig.body, 0, 0, r.dir, FS * r.look.scale);
        place(r.fig.glowBody, 0, 0, r.dir, FS * r.look.scale);
    }

    function startWalk(r, target, purpose) {
        r.mode = 'walk'; r.purpose = purpose; r.target = target; r.goT = 1;
        const d = arcDelta(r.s, target, L);
        if (Math.abs(d) > 0.01) r.dir = d > 0 ? 1 : -1;
    }

    // what happens when a leg of the journey ends
    function finishWalk(r) {
        r.s = r.target; r.go = 0; r.goT = 0;
        if (r.purpose === 'toGate') { r.mode = 'out'; r.fadeT = 0; const t = toriiOf(placeOfDistrict(r.district)); if (t && r.visible) t.pulse(); }
        else { r.mode = 'stand'; r.idle = 6 + Math.random() * 10; }
        r.purpose = null;
        if (r.after) { const a = r.after; r.after = null; a(); }
    }

    function processQueue(r) {
        if (!r.queue.length) return false;
        const ev = r.queue[0];
        if (ev.type === 'depart') {
            if (r.external) return false;                 // finishing a purchase first
            if ((r.mode === 'stand' || (r.mode === 'walk' && r.purpose === 'potter')) && !r.after) {
                r.queue.shift();
                const from = r.district && layout.byDistrict.has(r.district) ? r.district : ev.from;
                r.district = from;
                startWalk(r, toriiS(placeOfDistrict(from)), 'toGate');
                return true;
            }
            if (r.mode === 'gone') { r.queue.shift(); return true; }      // a depart we never saw them arrive for
            return false;
        }
        if (ev.type === 'arrive') {
            if (r.mode === 'gone') {
                r.queue.shift();
                r.district = ev.district;
                r.s = toriiS(placeOfDistrict(ev.district));
                r.mode = 'in'; r.fadeT = 0;
                const t = toriiOf(placeOfDistrict(ev.district)); if (t && r.visible) t.pulse();
                return true;
            }
            if (r.mode === 'stand' && r.district !== ev.district) {
                // the economy moved them without a depart we saw: go through the gate first
                r.queue.unshift({ type: 'depart', from: r.district, to: ev.district });
                return processQueue(r);
            }
            if (r.mode === 'stand') { r.queue.shift(); return true; }
            return false;
        }
        r.queue.shift();
        return true;
    }

    const visibleAt = (s, view) => Math.abs(arcDelta(view.s, s, L)) < view.half + 40;

    // finish whatever this resident is doing, instantly (only ever while off screen)
    function snapStep(r) {
        if (r.mode === 'walk') { r.s = r.target; finishWalk(r); return true; }
        if (r.mode === 'out') { r.mode = 'gone'; r.fade = 0; return true; }
        if (r.mode === 'in') { r.fade = 1; startWalk(r, standSpot(layout, r.id, r.district), 'fromGate'); return true; }
        return false;
    }

    function update(t, dt, P, wind, view) {
        for (const r of list) {
            const a = r.a;
            // the economy's stage drives the small gestures
            if (a.stage !== r.lastStage) {
                if (a.stage === 'react' && r.mode === 'stand') r.startT = 0;
                r.lastStage = a.stage;
            }
            for (let k = 0; k < 6; k++) {
                if (processQueue(r)) continue;
                const behind = r.queue.length >= 1;
                const offNow = !visibleAt(r.s, view);
                const offEnd = r.mode !== 'walk' || !visibleAt(r.target, view);
                if ((behind || r.mode === 'walk') && offNow && offEnd && snapStep(r)) continue;
                break;
            }
            const vis = r.mode !== 'gone' && visibleAt(r.s, view);
            r.visible = vis;
            if (r.shown !== vis) { r.fig.g.style.display = vis ? '' : 'none'; r.fig.glowRoot.style.display = vis ? '' : 'none'; r.shown = vis; }
            if (!vis) { if (r.mode === 'out' || r.mode === 'in') snapStep(r); continue; }

            // --- gestures
            if (r.gest && !r.external) {
                r.gestT += dt;
                const g = r.gest, T = r.gestT;
                const v = T < 0.5 ? 0 : T < 1.0 ? ease((T - 0.5) / 0.5) : T < 1.9 ? 1 : 1 - ease((T - 1.9) / 0.6);
                r.act.bow = g === 'bow' ? v : 0;
                r.act.reach = g === 'reach' ? v : 0;
                if (T > 2.6) { r.gest = null; r.act.bow = 0; r.act.reach = 0; }
            }
            const thinking = a.stage === 'think' && r.mode === 'stand';
            r.act.chin = clamp(r.act.chin + (thinking ? dt : -dt) * 2, 0, 1);
            if (r.startT >= 0) { r.startT += dt; r.act.start = Math.sin(Math.PI * clamp(r.startT / 0.7, 0, 1)) * (r.startT < 1.6 ? 1 : 0); if (r.startT > 1.6) { r.startT = -1; r.act.start = 0; } }
            r.tip = Math.max(0, r.tip - dt);

            // --- idle life: now and then a few steps along the frontage
            if (r.mode === 'stand' && !r.gest && !r.external && !thinking && r.queue.length === 0) {
                r.idle -= dt;
                if (r.idle < 0) {
                    const d = layout.byDistrict.get(r.district);
                    if (d) startWalk(r, clamp(r.s + (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 18), d.x0 + 12, d.x1 - 12), 'potter');
                    r.idle = 7 + Math.random() * 12;
                }
            }

            // --- fading through the gate
            if (r.mode === 'out') { r.fadeT += dt; r.fade = 1 - smooth(0, FADE, r.fadeT); if (r.fadeT >= FADE) { r.mode = 'gone'; r.fade = 0; } }
            else if (r.mode === 'in') { r.fadeT += dt; r.fade = smooth(0, FADE, r.fadeT); if (r.fadeT >= FADE) { r.fade = 1; startWalk(r, standSpot(layout, r.id, r.district), 'fromGate'); } }
            else r.fade = 1;

            // --- walking at exactly the gait's speed (feet planted)
            const v = speedOf(r);
            if (r.mode === 'walk') {
                const rem = Math.abs(arcDelta(r.s, r.target, L));
                r.goT = r.gest ? 0 : rem < v * 0.24 ? 0 : 1;
                if (rem < 0.6 && r.go < 0.05) finishWalk(r);
            } else r.goT = 0;
            r.go = clamp(r.go + (r.goT > r.go ? dt * 2.4 : -dt * 2.6), 0, 1);
            const ds = r.dir * v * r.go * dt * R / (R - r.off);
            if (r.mode === 'walk') {
                const rem = arcDelta(r.s, r.target, L);
                r.s += Math.abs(ds) > Math.abs(rem) ? rem : ds;
            }
            r.phase += (dt / r.fig.gait.period) * r.go;
            r.s = ((r.s % L) + L) % L;
            setTransform(r);
            r.fig.g.style.opacity = r.fade < 1 ? f(r.fade) : '';
            r.fig.update({ phase: r.phase, go: r.go, t, dt, P, wind, act: r.act, tip: r.tip });
        }
    }

    return {
        list, byId, update,
        depart(m) { const r = byId.get(m.agent); if (r) r.queue.push({ type: 'depart', from: m.from, to: m.to }); },
        arrive(m) { const r = byId.get(m.agent); if (r) r.queue.push({ type: 'arrive', district: m.district }); },
        trade(m) {
            const r = byId.get(m.agent);
            if (!r || r.mode !== 'stand' || !r.visible || r.gest || r.external) return;
            // walk over to the keeper and pay (or be paid) hand to hand
            const plan = onTrade && onTrade(r, m);
            if (plan) { r.after = plan.start; startWalk(r, plan.spot, 'potter'); }
            else { r.gest = m.action === 'sell' ? 'bow' : 'reach'; r.gestT = 0; }
        },
        greet(r) { if (!r.gest) { r.gest = 'bow'; r.gestT = 0; } },
        speedOf
    };
}
