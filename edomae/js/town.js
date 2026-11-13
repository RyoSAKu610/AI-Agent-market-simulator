// 江戸前 Edomae — the townsfolk and their small dealings, so the street feels lived in.
//
// Every district has a keeper at its front; every place has townsfolk who stroll,
// stop to chat and bow, buy a skewer of dango or a 瓦版, and walk on. Edo has a 読売
// calling out with sheets over his arm and a knot of people reading one together.
// Townsfolk are unnamed scenery (no links, no trades in the economy); the residents
// are the economy's agents (residents.js), and when one trades here the keeper and the
// resident really exchange: coins or notes travel hand to hand on an arc with a glint,
// the goods come back the other way, both bow, and the sim's own amount floats up.
//
// Everything is in the ring frame: street position s, `off` in front of the building line.

import { el, place, f, pt, PAPER } from './lib/ink.js';
import { clamp, lerp, ease, smooth, seeded } from './lib/motion.js';
import { toRGB, rgb, mix } from './lib/daynight.js';
import { createFigure } from './figure.js';
import { lookOf, companionOf } from './looks.js';
import { arcDelta, hash01 } from './layout.js';
import { moneyOf, goodsOf, amountText, currencyFor, sheetOf, ambientDelay } from './news.js';
import { createDog, createCat, createFlock, createBeast, createRabbit } from './animals.js';
import { SP, oval, bench as drawBench, smoke, noren as drawNoren, chochin, text as drawText, C, S as shapeP, P as penP, rect, hisashi } from './kit.js';
import { createSitter } from './sitter.js';
import { createSurface } from './water.js';
import { createBirdCompanion, createButterflyCompanion } from './companions.js';
import { FS } from './residents.js';

const LANES = [5, 10, 15];

// what townsfolk of each family look like (words the look deriver understands)
const DRESS = {
    jomon: ['赤褐の衣、腰に結縄の束', '藍の衣、手に指し棒', '生成りの衣'],
    heian: ['藍の狩衣に烏帽子', '紅の袿', '萌黄の袿、髪は長い黒髪'],
    hiraizumi: ['金の狩衣', '白い小袖に紺の前掛け', '紺の作務衣'],
    sengoku: ['藍の作務衣に革の前掛け', '縞の着流しに三度笠', '紅の小袖'],
    edo: ['藍の着物、手に帳面', '紺の半纏に捻り鉢巻き', '紅の小袖、髪に簪', '縞の着流しに三度笠', '茶の作務衣に股引、背負子を背負う', '萌黄の着物、腰に手ぬぐい', '朱の小袖'],
    meiji: ['矢絣の着物に海老茶の袴', '黒の服', '紺の半纏に捻り鉢巻き'],
    taisho: ['臙脂と紫の矢絣の銘仙に海老茶の袴', '生成りの作業着、栗色の髪に革の飛行帽', '黒の服'],
    showa: ['白い開襟のサファリジャケット', '紺の作業着', '紅の服'],
    reiwa: ['生成りの作務衣に藍の前掛け', '黒の服', '橙の服'],
    ginga: ['黒の服', '紺の服', '白の服'],
    ihatov: ['生成りの作業着', '黒の服', '藍の作務衣'],
    tono: ['藍の筒袖に股引、頭に手ぬぐい', '紅の小袖', '茶の作務衣'],
    sakura: ['紅の小袖', '白い小袖', '藤の着物'],
    ryugu: ['珊瑚色の羽織', '藍の着物', '白の着物'],
    tsuki: ['藤色の簡素な衣', '白の着物', 'なよ竹色の簡素な衣'],
    tenshu: ['白絹の打掛', '檜色の作務衣', '紅の小袖'],
    yume: ['白い作務衣', '墨染の作務衣', '藍の着物']
};
// animals at home in each family (Edo richest); the charter holds everywhere
const FAUNA = {
    jomon: ['dog', 'flock'], heian: ['cat', 'ox', 'flock'], hiraizumi: ['horse', 'flock'], sengoku: ['packhorse', 'cat', 'flock'],
    edo: ['cat', 'flock', 'hens', 'dog'], meiji: ['cat', 'flock', 'horse'], taisho: ['cat', 'dog', 'flock'], showa: ['cat', 'dog', 'flock'],
    reiwa: ['cat', 'flock'], ginga: ['cat', 'flock'], ihatov: ['cat', 'flock', 'dog'], tono: ['horse', 'hens', 'flock'],
    sakura: ['flock'], ryugu: ['cat', 'flock'], tsuki: ['rabbit', 'ox'], tenshu: ['cat', 'flock'], yume: ['cat', 'flock']
};
const STALL = { edo: ['団子', 'dango'], sengoku: ['餅', 'dango'], meiji: ['蕎麦', 'soba'], taisho: ['焼芋', 'imo'], showa: ['焼芋', 'imo'], tono: ['団子', 'dango'] };
const KEEPER_COLOURS = ['#34507a', '#7a5a3c', '#4f6b55', '#6a4a6a', '#8a5a3c', '#2f3f5f', '#7a2e3a'];

export function createTown({ layer, glowLayer, fxLayer, hiLayer, groundLayer, layout, W, rnd: rnd0, onReaderTap, onFolkTap }) {
    const weather = { rain: 0, wet: 0 };
    const R = layout.R, L = layout.total;
    const rnd = rnd0 || seeded(77);
    const places = new Map();            // place id → { entry, folk:[], keepers:Map(districtId→folk), animals:[], benches:[], stall, readers:[] }
    const all = [];                      // every walking/standing townsperson
    const dogs = [];                     // companions and strays that follow someone

    const ringXY = (s, off, lx = 0, ly = 0) => { const a = s / R, x = lx, y = ly - (R - off); return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
    const trAt = (s, off, lift = 0) => `rotate(${f((s / R) * 57.29578)}) translate(0 ${f(-(R - off) - lift)})`;
    // a figure-space point of a person → the ring frame
    const figToRing = (p, fx, fy) => { const k = FS * p.look.scale; return ringXY(p.s, p.off, p.dir * k * (fx - 40), k * (fy - 120)); };

    function makeFolk(pe, { hint, id, role, s, lane = 0, off, scale = 1, sheet = null, prop = null, pointer = false }) {
        const look = lookOf({ id, sprite_hint: hint }, pe.place, pe.family);
        if (scale !== 1) look.scale = scale;
        if (sheet) look.sheet = sheet;
        if (prop) look.prop = prop;
        if (role === 'child' && look.gaitKind !== 'walk') look.gaitKind = 'walk';
        const fig = createFigure(layer, glowLayer, look);
        const p = { id, role, look, fig, pe, s, off: off ?? LANES[lane], dir: hash01(id, 'd') < 0.5 ? 1 : -1, phase: hash01(id, 'p'), go: 0, goT: 0, target: s,
            state: 'idle', timer: 2 + hash01(id, 't') * 6, act: { bow: 0, reach: 0, chin: 0, start: 0, read: 0, show: 0, call: 0, talk: 0 },
            visible: false, shown: null, busy: false, then: null, lastChat: -99, home: s };
        if (!pointer) fig.g.style.pointerEvents = 'none';
        else { fig.g.style.cursor = 'pointer'; fig.g.addEventListener('pointerup', e => { if (!e.__dragged) (role === 'reader' ? onReaderTap : onFolkTap) && (role === 'reader' ? onReaderTap(p) : onFolkTap(p)); }); }
        all.push(p);
        return p;
    }

    // ---------------------------------------------------------------- build every place
    for (const pe of layout.places) {
        const fam = pe.family;
        const pr = seeded(Math.floor(hash01(pe.id, 'town') * 2147483646) + 1);
        const pick = arr => arr[Math.floor(pr() * arr.length)];
        const dress = DRESS[fam] || DRESS.edo;
        const T = { entry: pe, folk: [], keepers: new Map(), animals: [], benches: [], readers: [], stall: null, decor: el('g', {}, fxLayer), ground: el('g', {}, groundLayer), nextAmbient: ambientDelay(pe.s0 | 0, 0, 4, 9), n: 0, money: moneyOf(fam) };
        T.decor.setAttribute('class', 'town-decor');
        places.set(pe.id, T);
        const dIds = new Set(pe.districts.map(d => d.id));
        T.currency = currencyFor(W.currencies, dIds, W.baseCurrency);
        // keepers: one at the front of every district
        for (const d of pe.districts) {
            const ks = d.x0 + 16 + hash01(d.id, 'k') * 10;
            const k = makeFolk(pe, { id: `${d.id}-keeper`, role: 'keeper', s: ks, off: 2.4, hint: pick(dress) });
            k.dir = 1; k.district = d.id;
            T.keepers.set(d.id, k); T.folk.push(k);
        }
        // strollers
        const nPass = pe.hero ? 4 : 2;
        for (let i = 0; i < nPass; i++) {
            const s = lerp(pe.s0 + 40, pe.s1 - 40, pr());
            const p = makeFolk(pe, { id: `${pe.id}-folk-${i}`, role: 'passer', s, lane: i % 3, hint: dress[i % dress.length] + (i === 1 && pe.hero ? '、手に提灯' : '') });
            T.folk.push(p);
        }
        // a child with a pinwheel who runs around a parent (Edo and the warm everyday places)
        if (pe.hero || ['meiji', 'taisho', 'showa', 'tono', 'ihatov'].includes(fam)) {
            const parent = T.folk.find(p => p.role === 'passer');
            const c = makeFolk(pe, { id: `${pe.id}-child`, role: 'child', s: parent.s + 12, lane: 2, scale: 0.7, prop: 'pinwheel', hint: pick(['紅の小袖', '萌黄の着物', '藍の着物、おかっぱ']) });
            c.parent = parent; T.folk.push(c);
        }
        // reading: a 読売 and a knot of readers in Edo; a reader and a paper boy later on
        const kind = sheetOf(fam);
        if (pe.hero || fam === 'sengoku') {
            const ys = pe.torii + 70;
            const y = makeFolk(pe, { id: `${pe.id}-yomiuri`, role: 'yomiuri', s: ys, lane: 1, prop: 'sheets', hint: '紺の半纏に三度笠' });
            y.dir = -1; T.yomiuri = y; T.folk.push(y);
            const r1 = makeFolk(pe, { id: `${pe.id}-reader-0`, role: 'reader', s: ys - 26, lane: 0, sheet: kind, hint: pick(dress), pointer: true });
            const r2 = makeFolk(pe, { id: `${pe.id}-reader-1`, role: 'reader', s: ys - 36, lane: 1, sheet: kind, hint: pick(dress), pointer: true });
            r1.dir = -1; r2.dir = 1; r1.act.read = 1; r2.lean = 1;      // one holds it, the other leans in to read along
            T.readers.push(r1, r2); T.folk.push(r1, r2);
        } else if (kind === 'shinbun' || ['heian', 'tenshu', 'yume'].includes(fam)) {
            const r1 = makeFolk(pe, { id: `${pe.id}-reader-0`, role: 'reader', s: pe.torii - 70, lane: 1, sheet: kind, hint: pick(dress), pointer: true });
            r1.act.read = 1; T.readers.push(r1); T.folk.push(r1);
            if (['meiji', 'taisho', 'showa'].includes(fam)) {
                const b = makeFolk(pe, { id: `${pe.id}-paperboy`, role: 'passer', s: pe.torii + 40, lane: 2, scale: 0.74, prop: 'sheets', hint: '紺の服、肩から郵便鞄' });
                T.folk.push(b);
            }
        }
        // a 縁台 (bench) with someone reading or taking tea, a cat beside them
        const bs = (pe.districts[pe.districts.length - 1] || pe.districts[0]).x1 - 4;
        const bg = el('g', { transform: trAt(bs, 3.6) }, T.decor);
        C(bg, 'M-17 -11 L17 -11 L17 -12.8 L-17 -12.8Z', '#c8403a', SP * 0.6);                // red felt on the bench
        drawBench(bg, -16, 16, 11);
        const benchSitters = [];
        const task = pe.hero ? 'read' : ({ sakura: 'read', tsuki: 'tea', jomon: 'feed', yume: 'read', ihatov: 'read', showa: 'read' })[fam] || pick(['tea', 'read', 'tea', 'feed']);
        benchSitters.push(createSitter(bg, { x: -7, y: -11 + 11 - 0.5, scale: FS, kind: 'bench', task, colour: KEEPER_COLOURS[Math.floor(pr() * KEEPER_COLOURS.length)], hair: pick(['topknot', 'bun', 'cap']), seed: pr() }));
        if (pe.hero) benchSitters.push(createSitter(bg, { x: 7, y: 0, scale: FS, kind: 'bench', task: 'tea', colour: '#6a4a6a', hair: 'bun', seed: pr() }));
        T.benches.push({ g: bg, sitters: benchSitters, s: bs });
        // a food stall with steam where the street has one
        if (STALL[fam]) {
            const ss = pe.s0 + 26;               // in the place's opening pad, clear of the first front
            const sg = el('g', { transform: trAt(ss, 3) }, T.decor);
            const gl = el('g', { transform: trAt(ss, 3) }, glowLayer);
            drawStall(sg, gl, T, STALL[fam], pr);
            const v = makeFolk(pe, { id: `${pe.id}-stall-keeper`, role: 'keeper', s: ss + 13, off: 2.4, hint: '紺の半纏に捻り鉢巻き' });
            v.dir = -1; T.stallKeeper = v; T.folk.push(v);
        }
        // animals
        for (const a of FAUNA[fam] || ['flock']) T.animals.push(makeAnimal(a, pe, T, pr, bs));
        // puddles: hollows in the street that fill when it rains and dry slowly afterwards
        T.puddles = [];
        const nP = pe.hero ? 4 : 2;
        for (let i = 0; i < nP; i++) {
            const ps = lerp(pe.s0 + 50, pe.s1 - 50, (i + 0.3 + pr() * 0.4) / nP), off = [7, 12, 16][i % 3], w = 26 + pr() * 18;
            const g = el('g', { transform: trAt(ps, off) }, T.ground);
            const hg = el('g', { transform: trAt(ps, off) }, hiLayer);
            const gg = el('g', { transform: trAt(ps, off) }, glowLayer);
            const inner = el('g', {}, g), hin = el('g', {}, hg), gin = el('g', {}, gg);
            const sf = createSurface({ g: inner, hl: hin, gl: gin, rnd: pr }, { x0: -w / 2, x1: w / 2, yTop: -2.6, yBot: 2.6, kind: 'puddle', shape: 'ellipse', flow: 0.05 });
            // the lanterns of the street are what a puddle reflects
            sf.setLights(() => []);
            T.puddles.push({ sf, s: ps, off, w, g: inner, hg: hin, gg: gin, k: -1 });
        }
        // a dog at the heel of one townsperson in the everyday places
        if (pe.hero || ['taisho', 'showa', 'jomon'].includes(fam)) {
            const owner = T.folk.find(p => p.role === 'passer' && p.id.endsWith('-0'));
            if (owner) dogs.push(makeDog(owner, pr() < 0.5 ? '#c9a06a' : '#ece6d8', false));
        }
    }

    function makeAnimal(kind, pe, T, pr, benchS) {
        const span = [pe.s0 + 20, pe.s1 - 20];
        if (kind === 'cat') {
            const cat = createCat(layer, glowLayer, { colour: pr() < 0.5 ? '#ece6d8' : '#4a4442', patch: pr() < 0.5 ? '#d08a4a' : '#2c2a2a', scale: 0.6 });
            // on the 縁台 beside a lone sitter; on a busy bench it curls up on the ground beside it
            const onBench = !pe.hero && pr() < 0.7;
            const s = onBench ? benchS + 10 : pe.hero ? benchS + 26 : lerp(span[0], span[1], pr());
            cat.place(trAt(s, onBench ? 3.6 : 3, onBench ? 11 : 0), pr() < 0.5 ? 1 : -1);
            cat.hit.addEventListener('pointerup', e => { if (!e.__dragged) cat.poke(); });
            let under = 0, lastUnder = -1;
            return { kind, a: cat, s, update(dt, t, P) {
                // in the rain the cat on the bench slips underneath it, and comes back up when it stops
                const want = onBench && weather.rain > 0.15 ? 1 : 0;
                under = want;
                const lift = onBench && !under ? 11 : 0, ss = under ? benchS + 4 : s;
                if (under !== lastUnder) { lastUnder = under; cat.place(trAt(ss, onBench ? 3.6 : 3, lift), cat.dir || 1); }
                cat.update(dt, t, P, (x, y) => ringXY(ss, onBench ? 3.6 : 3, x * cat.dir * cat.scale, y * cat.scale - lift));
            } };
        }
        if (kind === 'flock' || kind === 'hens') {
            const hen = kind === 'hens';
            const s0 = lerp(span[0], span[1], pr()), w = hen ? 30 : 46;
            const g = el('g', { transform: trAt(s0, hen ? 12 : 8) }, layer);
            const flock = createFlock(g, { n: hen ? 4 : 5, span: [0, w], perch: { x0: 0, x1: w, y: -70 }, hen, rnd: pr });
            return { kind, a: flock, s: s0 + w / 2, update(dt, t, P, near) { flock.update(dt, t, P, near ? x => near(s0 + x) : null); } };
        }
        if (kind === 'horse' || kind === 'packhorse' || kind === 'ox') {
            const beast = createBeast(layer, { kind: kind === 'ox' ? 'ox' : 'horse', colour: kind === 'ox' ? '#4a3a2c' : pr() < 0.5 ? '#8a5a3c' : '#c9b08a', load: kind === 'packhorse' ? '#c9b48a' : null, scale: 0.6 });
            const b = { kind, a: beast, s: lerp(span[0], span[1], pr()), dir: 1, target: 0, go: 0, wait: 3 };
            b.target = b.s;
            b.update = (dt, t, P, near, wind) => {
                const d = arcDelta(b.s, b.target, L);
                if (Math.abs(d) < 0.5) { b.go = Math.max(0, b.go - dt * 1.6); b.wait -= dt; if (b.wait < 0) { b.target = clamp(b.s + (pr() - 0.5) * 120, span[0], span[1]); b.wait = 6 + pr() * 10; } }
                else { b.dir = d > 0 ? 1 : -1; b.go = Math.min(1, b.go + dt * 1.2); }
                const v = beast.speed * b.go * dt;
                b.s += Math.abs(v) > Math.abs(d) ? d : b.dir * v;
                beast.place(trAt(b.s, 16), b.dir);
                beast.update(dt, t, P, { go: b.go, wind });
            };
            return b;
        }
        if (kind === 'rabbit') {
            const rb = createRabbit(layer, { scale: 0.6 });
            const s = lerp(span[0], span[1], pr());
            rb.place(trAt(s, 9));
            return { kind, a: rb, s, update(dt, t, P) { rb.update(dt, t, P); } };
        }
        if (kind === 'dog') {
            const stray = makeFolk(pe, { id: `${pe.id}-dogwalker`, role: 'passer', s: lerp(span[0], span[1], pr()), lane: 1, hint: (DRESS[pe.family] || DRESS.edo)[2] });
            T.folk.push(stray);
            const d = makeDog(stray, '#a0704a', false);
            dogs.push(d);
            return { kind, a: d.dog, s: stray.s, update() {} };
        }
        return { kind, update() {} };
    }

    // a dog (or fox) that keeps to its person's heel: it trots at its own gait when it
    // falls behind and sits when they stop — it is never on a lead
    function makeDog(owner, colour, fox) {
        const dog = createDog(layer, { colour, fox, scale: 0.6 });
        const d = { dog, owner, s: owner.s - 14, off: Math.min(16, owner.off + 3), go: 0, dir: 1 };
        return d;
    }
    function updateDog(d, dt, t, P, wind) {
        const o = d.owner;
        const vis = o.visible !== false && o.shown !== false && (o.mode === undefined || o.mode !== 'gone');
        d.dog.g.style.display = vis ? '' : 'none';
        if (!vis) { d.s = o.s - (o.dir || 1) * 14; return; }
        const want = o.s - (o.dir || 1) * 13;
        const gap = arcDelta(d.s, want, L);
        const far = Math.abs(gap);
        if (far > 60) { d.s = want; d.go = 0; }                      // caught up off screen (or after a gate)
        const goT = far > 6 ? 1 : 0;
        d.go = clamp(d.go + (goT > d.go ? dt * 3 : -dt * 3.4), 0, 1);
        if (far > 0.5) d.dir = gap > 0 ? 1 : -1; else d.dir = o.dir || d.dir;
        const v = d.dog.speed * d.go * dt;
        d.s += Math.abs(v) > far ? gap : d.dir * v;
        d.dog.place(trAt(d.s, d.off), d.dir);
        d.dog.update(dt, t, P, { go: d.go, sitting: (o.go || 0) < 0.1 && far < 8, wind });
    }

    // ---------------------------------------------------------------- the exchange of money and goods

    const POOL = 6;
    const slots = Array.from({ length: POOL }, () => {
        const g = el('g', { style: 'display:none', class: 'exchange' }, fxLayer);
        const money = el('g', {}, g), goods = el('g', {}, g);
        const mPath = el('path', { stroke: 'currentColor', 'stroke-width': SP * 0.7, 'stroke-linejoin': 'round' }, money);
        const mInk = el('path', { fill: 'none', stroke: 'currentColor', 'stroke-width': SP * 0.5 }, money);
        const gPath = el('path', { stroke: 'currentColor', 'stroke-width': SP * 0.8, 'stroke-linejoin': 'round' }, goods);
        const gInk = el('path', { fill: 'none', stroke: '#b3412d', 'stroke-width': SP * 0.7 }, goods);
        const glint = el('path', { fill: 'none', stroke: '#fff4c8', 'stroke-width': 0.8, 'stroke-linecap': 'round', opacity: 0 }, g);
        const glintGlow = el('circle', { r: 8, fill: 'url(#e-warmglow)', opacity: 0 }, glowLayer);
        const amount = el('text', { 'font-size': 6, 'font-weight': 700, fill: 'currentColor', 'text-anchor': 'middle', 'font-family': '"Shippori Mincho",serif', opacity: 0 }, g);
        return { g, money, goods, mPath, mInk, gPath, gInk, glint, glintGlow, amount, busy: false };
    });
    const exchanges = [];

    function drawMoney(sl, kind) {
        const [d, ink, fill] = MONEY_ART[kind] || MONEY_ART.coin;
        sl.mPath.setAttribute('d', d); sl.mPath.setAttribute('fill', fill); sl.mInk.setAttribute('d', ink);
        sl.money.style.display = kind === 'none' ? 'none' : '';
    }
    function drawGoods(sl, kind, colour) {
        const [d, ink] = GOODS_ART[kind] || ['', ''];
        sl.gPath.setAttribute('d', d); sl.gPath.setAttribute('fill', colour); sl.gInk.setAttribute('d', ink);
        sl.goods.style.display = d ? '' : 'none';
    }

    // payer hands money to payee; goods come back from payee (the seller) to payer
    function exchange(payer, payee, { money, goods = 'bundle', amount = '', colour = '#c8403a', done } = {}) {
        const sl = slots.find(x => !x.busy);
        if (!sl) { done && done(); return false; }
        sl.busy = true; sl.g.style.display = '';
        drawMoney(sl, money); drawGoods(sl, goods, colour);
        sl.amount.textContent = amount;
        for (const p of [payer, payee]) p.busy = true;
        // face each other
        const dd = arcDelta(payer.s, payee.s, L);
        payer.dir = dd >= 0 ? 1 : -1; payee.dir = -payer.dir;
        exchanges.push({ sl, payer, payee, t: 0, money, goods, done });
        return true;
    }

    function updateExchange(x, dt) {
        x.t += dt;
        const T = x.t, a = x.payer, b = x.payee, sl = x.sl;
        const pay = x.money === 'none' ? 0 : 1;
        // payer reaches out with the money, the payee reaches to take it, goods come back, both bow
        a.act.reach = T < 0.7 ? ease(T / 0.7) : T < 2.4 ? 1 : Math.max(0, 1 - (T - 2.4) / 0.5);
        b.act.reach = T < 0.8 ? 0 : T < 1.3 ? ease((T - 0.8) / 0.5) : T < 2.4 ? 1 : Math.max(0, 1 - (T - 2.4) / 0.5);
        const bow = T < 2.9 ? 0 : T < 3.4 ? ease((T - 2.9) / 0.5) : T < 3.9 ? 1 : Math.max(0, 1 - ease((T - 3.9) / 0.5));
        a.act.bow = bow; b.act.bow = bow;
        const ha = figToRing(a, a.fig.hand[0], a.fig.hand[1]), hb = figToRing(b, b.fig.hand[0], b.fig.hand[1]);
        const ang = (((a.s + b.s) / 2) / R) * 57.29578;
        const arc = (p, q, u, h) => [lerp(p[0], q[0], u) - Math.sin(ang / 57.29578) * h * Math.sin(Math.PI * u), lerp(p[1], q[1], u) - Math.cos(ang / 57.29578) * h * Math.sin(Math.PI * u)];
        // money: in the payer's hand → over to the payee's hand (0.5–1.4 s), then held there
        const mu = clamp((T - 0.5) / 0.9, 0, 1);
        const mp = mu < 1 ? arc(ha, hb, ease(mu), 6) : hb;
        sl.money.setAttribute('transform', `translate(${pt(mp)}) rotate(${f(ang)}) scale(0.8)`);
        sl.money.style.opacity = pay && T < 2.6 ? '1' : '0';
        // a glint as it lands
        const gu = clamp((T - 1.35) / 0.5, 0, 1);
        const gl = gu > 0 && gu < 1 ? Math.sin(Math.PI * gu) : 0;
        sl.glint.setAttribute('opacity', f(gl * pay));
        sl.glint.setAttribute('d', `M${f(hb[0] - 3.4 * gl)} ${f(hb[1] - 2)} L${f(hb[0] + 3.4 * gl)} ${f(hb[1] - 2)} M${f(hb[0])} ${f(hb[1] - 2 - 3.4 * gl)} L${f(hb[0])} ${f(hb[1] - 2 + 3.4 * gl)}`);
        sl.glintGlow.setAttribute('cx', f(hb[0])); sl.glintGlow.setAttribute('cy', f(hb[1])); sl.glintGlow.setAttribute('opacity', f(gl * 0.8 * pay));
        // goods: from the payee's hand back to the payer's (1.4–2.3 s), then carried off
        const gv = clamp((T - 1.4) / 0.9, 0, 1);
        const gp = gv <= 0 ? hb : gv < 1 ? arc(hb, ha, ease(gv), 5) : ha;
        sl.goods.setAttribute('transform', `translate(${pt(gp)}) rotate(${f(ang)}) scale(0.62)`);
        sl.goods.style.opacity = T > 1.3 && T < 3.0 ? '1' : '0';
        // the sim's amount floats up between them and fades
        const au = clamp((T - 1.4) / 2.6, 0, 1);
        const mid = ringXY((a.s + b.s) / 2, Math.min(a.off, b.off), 0, -58 - au * 10);
        sl.amount.setAttribute('transform', `translate(${pt(mid)}) rotate(${f(ang)})`);
        sl.amount.setAttribute('opacity', f(au > 0 && au < 1 ? Math.sin(Math.PI * Math.min(1, au * 1.6)) * (1 - au * 0.3) : 0));
        if (T > 4.5) {
            a.act.reach = 0; b.act.reach = 0; a.act.bow = 0; b.act.bow = 0;
            a.busy = false; b.busy = false;
            sl.busy = false; sl.g.style.display = 'none'; sl.glintGlow.setAttribute('opacity', 0);
            x.finished = true;
            x.done && x.done();
        }
    }

    // ---------------------------------------------------------------- walking townsfolk

    const speedOf = p => p.fig.gait.speed * FS * p.look.scale;
    function walkTo(p, s, then) {
        p.target = s; p.state = 'walk'; p.then = then || null;
        const d = arcDelta(p.s, s, L); if (Math.abs(d) > 0.01) p.dir = d > 0 ? 1 : -1;
    }

    function stepFolk(p, dt, t, P, wind, view) {
        const v = speedOf(p);
        if (p.state === 'walk') {
            const rem = arcDelta(p.s, p.target, L);
            p.goT = Math.abs(rem) < v * 0.24 ? 0 : 1;
            if (Math.abs(rem) < 0.6 && p.go < 0.05) { p.s = p.target; p.state = 'idle'; p.timer = 2 + Math.random() * 5; const th = p.then; p.then = null; th && th(); }
            else {
                p.go = clamp(p.go + (p.goT > p.go ? dt * 2.4 : -dt * 2.6), 0, 1);
                const ds = p.dir * v * p.go * dt * R / (R - p.off);
                p.s += Math.abs(ds) > Math.abs(rem) ? rem : ds;
            }
        } else p.go = clamp(p.go - dt * 2.6, 0, 1);
        p.phase += (dt / p.fig.gait.period) * p.go;
        p.fig.g.setAttribute('transform', trAt(p.s, p.off));
        p.fig.glowRoot.setAttribute('transform', trAt(p.s, p.off));
        place(p.fig.body, 0, 0, p.dir, FS * p.look.scale);
        place(p.fig.glowBody, 0, 0, p.dir, FS * p.look.scale);
        const pose = p.fig.update({ phase: p.phase, go: p.go, t, dt, P, wind, act: p.act });
        footfall(p, pose, p.pe.id);
    }
    // a foot coming down in a puddle throws a small crown (the foot itself stays planted)
    function footfall(p, pose, placeId) {
        if (weather.wet < 0.08 || !pose) return;
        const T = places.get(placeId); if (!T) return;
        p.stance = p.stance || [true, true];
        const k = FS * p.look.scale;
        for (let i = 0; i < 2; i++) {
            const st = pose.feet[i].stance;
            if (st && !p.stance[i] && p.go > 0.3) {
                const fs = p.s + p.dir * k * (pose.feet[i].ankle[0] - 40);
                for (const pd of T.puddles) {
                    const half = pd.w / 2 * pd.k;
                    if (Math.abs(arcDelta(pd.s, fs, L)) < half && Math.abs(pd.off - p.off) < 4.5) { pd.sf.splash(arcDelta(pd.s, fs, L) / Math.max(0.2, pd.k), 0.55, 0.5); break; }
                }
            }
            p.stance[i] = st;
        }
    }

    // each kind of townsperson decides what to do next (only while their place is in view)
    function think(p, T, t) {
        const pe = T.entry;
        if (p.busy) return;
        p.timer -= 1;
        if (p.role === 'passer' && p.state === 'idle' && !p.sheltering) {
            walkTo(p, clamp(p.s + (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 120), pe.s0 + 30, pe.s1 - 30));
        } else if (p.role === 'child' && p.parent) {
            const want = p.parent.s + (p.parent.dir || 1) * (p.parent.go > 0.3 ? 16 : (Math.random() < 0.5 ? 14 : -14));
            if (Math.abs(arcDelta(p.s, want, L)) > 8) walkTo(p, want);
        }
    }

    function chatPairs(T, t) {
        const free = T.folk.filter(p => p.role === 'passer' && p.state === 'walk' && !p.busy && t - p.lastChat > 25);
        for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) {
            const a = free[i], b = free[j];
            const d = arcDelta(a.s, b.s, L);
            if (Math.abs(d) < 22 && Math.abs(d) > 9 && a.dir !== b.dir) {
                // stop, face each other, a few words each, a bow, and on their way
                a.state = b.state = 'chat'; a.busy = b.busy = true; a.chatT = 0; a.chatWith = b; b.chatWith = a; b.chatT = -1;
                a.dir = d > 0 ? 1 : -1; b.dir = -a.dir; a.lastChat = b.lastChat = t;
                return;
            }
        }
    }
    function updateChat(a, dt) {
        a.chatT += dt;
        const b = a.chatWith, T = a.chatT;
        const speak = (p, from, to) => (T > from && T < to ? Math.sin((T - from) * 6) * 0.5 + 0.5 : 0);
        a.act.talk = speak(a, 0.6, 2.2) + speak(a, 3.6, 4.6);
        b.act.talk = speak(b, 2.2, 3.6);
        const bow = T < 4.8 ? 0 : T < 5.3 ? ease((T - 4.8) / 0.5) : Math.max(0, 1 - ease((T - 5.5) / 0.5));
        a.act.bow = b.act.bow = bow * 0.8;
        if (T > 6.2) {
            for (const p of [a, b]) { p.act.talk = 0; p.act.bow = 0; p.busy = false; p.state = 'idle'; p.timer = 1; p.chatWith = null; }
            walkTo(a, a.s + a.dir * -1 * 60); walkTo(b, b.s + b.dir * -1 * 60);
            a.chatT = -1;
        }
    }

    // a small purchase between a townsperson and a keeper (no amount: not the economy's money)
    function ambientBuy(T) {
        const buyer = T.folk.find(p => p.role === 'passer' && p.state !== 'chat' && !p.busy && p.visible);
        if (!buyer) return;
        let seller = null, goods = 'bundle';
        const r = Math.random();
        if (T.yomiuri && r < 0.35) { seller = T.yomiuri; goods = 'sheet'; }
        else if (T.stallKeeper && r < 0.7) { seller = T.stallKeeper; goods = 'skewer'; }
        else { const ks = [...T.keepers.values()].filter(k => !k.busy); seller = ks[Math.floor(Math.random() * ks.length)]; goods = Math.random() < 0.5 ? 'bundle' : 'box'; }
        if (!seller || seller.busy) return;
        buyer.busy = true;
        const side = arcDelta(seller.s, buyer.s, L) >= 0 ? 1 : -1;
        walkTo(buyer, seller.s + side * 23, () => {
            buyer.busy = false;
            exchange(buyer, seller, { money: T.money === 'zeni' ? 'zeni' : T.money, goods: T.money === 'none' ? 'none' : goods, colour: ['#c8403a', '#3a6a9a', '#c9a23a'][Math.floor(Math.random() * 3)] });
        });
    }

    // ---------------------------------------------------------------- per frame
    let thinkT = 0;
    function update(t, dt, P, wind, view, visiblePlaces, residentsNear) {
        thinkT -= dt;
        const doThink = thinkT < 0; if (doThink) thinkT = 0.5;
        const late = P.lamp > 0.88;
        for (const [id, T] of places) {
            const vis = visiblePlaces.has(id);
            if (T.shown !== vis) {
                T.shown = vis;
                T.decor.style.display = vis ? '' : 'none'; T.ground.style.display = vis ? '' : 'none';
                for (const p of T.folk) { p.fig.g.style.display = vis ? '' : 'none'; p.fig.glowRoot.style.display = vis ? '' : 'none'; p.shown = vis; p.visible = vis; p.away = undefined; }
                for (const a of T.animals) if (a.a && a.a.g) { a.a.g.style.display = vis ? '' : 'none'; if (a.a.gl) a.a.gl.style.display = vis ? '' : 'none'; }
            }
            if (!vis) continue;
            // who is walking here (for sparrows to notice)
            const walkers = T.folk.filter(p => p.go > 0.3).map(p => p.s).concat(residentsNear ? residentsNear(id) : []);
            const near = s => walkers.some(w => Math.abs(arcDelta(w, s, L)) < 14);
            if (doThink) { for (const p of T.folk) if (p.timer <= 0 || p.state === 'idle') think(p, T, t); chatPairs(T, t); }
            T.nextAmbient -= dt;
            if (T.nextAmbient < 0) { T.n++; T.nextAmbient = ambientDelay(T.entry.s0 | 0, T.n, 6, 13); ambientBuy(T); }
            for (const p of T.folk) {
                // late at night most strollers have gone home
                const away = late && p.role === 'passer' && hash01(p.id, 'night') < 0.6;
                if (p.away !== away) { p.away = away; p.fig.g.style.display = away ? 'none' : ''; }
                if (away) continue;
                if (p.chatWith && p.chatT >= 0) updateChat(p, dt);
                if (p.role === 'yomiuri' && !p.busy) { p.callT = (p.callT || 0) + dt; const c = p.callT % 7; p.act.call = c < 0.5 ? ease(c / 0.5) : c < 1.6 ? 1 : c < 2.1 ? 1 - ease((c - 1.6) / 0.5) : 0; }
                if (p.role === 'reader') {
                    // tapped: lower the sheet and turn it toward us for a few seconds, then read on
                    p.showT = Math.max(0, (p.showT || 0) - dt);
                    p.act.show = clamp(p.act.show + (p.showT > 0 ? dt : -dt) * 2.4, 0, 1);
                    if (p.lean) p.act.bow = 0.22 * (1 - p.act.show);
                }
                stepFolk(p, dt, t, P, wind, view);
            }
            for (const a of T.animals) a.update(dt, t, P, near, wind);
            // puddles grow with the wetness of the street and take the rain
            for (const pd of T.puddles) {
                const k = Math.round(weather.wet * 40) / 40;
                if (k !== pd.k) { pd.k = k; const tr = `scale(${f(Math.max(0.01, k))} ${f(Math.max(0.01, 0.6 + 0.4 * k))})`; pd.g.setAttribute('transform', tr); pd.hg.setAttribute('transform', tr); pd.gg.setAttribute('transform', tr); const v = k > 0.02 ? '' : 'none'; pd.g.style.display = v; pd.hg.style.display = v; pd.gg.style.display = v; }
                if (pd.k > 0.02) { if (weather.rain > 0 && Math.random() < weather.rain * 9 * dt) pd.sf.rain((Math.random() - 0.5) * pd.w * 0.9, 0.2 + Math.random() * 0.6); pd.sf.update(t, dt, wind, P); }
            }
            // rain: most people open a 番傘; the rest wait it out under an eave
            const raining = weather.rain > 0.12;
            for (const p of T.folk) {
                const brolly = hash01(p.id, 'umb') < 0.62 && p.role !== 'keeper';
                p.act.umb = clamp((p.act.umb || 0) + (raining && brolly ? dt : -dt) * 1.6, 0, 1);
                if (p.role === 'passer' && !brolly && !p.busy) {
                    if (raining && !p.sheltering) { p.sheltering = true; const k = [...T.keepers.values()].reduce((a, b) => Math.abs(arcDelta(p.s, b.s, L)) < Math.abs(arcDelta(p.s, a.s, L)) ? b : a); p.off = 3.6; walkTo(p, k.s + 12); }
                    else if (!raining && p.sheltering) { p.sheltering = false; p.off = LANES[hash01(p.id, 'lane') * 3 | 0]; }
                }
            }
            for (const b of T.benches) for (const s of b.sitters) s.draw(t, dt, P);
            if (T.stall) T.stall.draw(t, dt, wind, P);
        }
        for (const d of dogs) updateDog(d, dt, t, P, wind);
        for (const c of companions) c.c.update(dt, t, P, c.owner.visible !== false && c.owner.mode !== 'gone' && c.owner.shown !== false);
        for (let i = exchanges.length - 1; i >= 0; i--) { updateExchange(exchanges[i], dt); if (exchanges[i].finished) exchanges.splice(i, 1); }
    }

    // a resident's trade here: walk to the keeper and do the exchange for real
    function residentTrade(r, msg, good) {
        const pid = (layout.byDistrict.get(msg.district) || {}).place;
        const T = places.get(pid);
        if (!T) return false;
        const k = T.keepers.get(msg.district);
        if (!k || k.busy) return false;
        const money = moneyOf(T.entry.family, msg.total);
        const goods = msg.action === 'sell' || msg.action === 'buy' ? goodsOf(good && good.category) : 'box';
        const amount = money === 'none' ? '' : amountText(msg.total, T.currency);
        const side = arcDelta(k.s, r.s, L) >= 0 ? 1 : -1;
        r.external = true;
        return { keeper: k, spot: k.s + side * 23, start: () => {
            // a sale: the keeper pays the resident; a purchase or a craft: the resident pays
            const sell = msg.action === 'sell';
            exchange(sell ? k : r, sell ? r : k, { money, goods, amount, colour: ['#c8403a', '#3a6a9a', '#c9a23a', '#4f7a55'][Math.floor(hash01(msg.good || 'g') * 4)], done: () => { r.external = false; } });
        } };
    }

    // a bird or a butterfly that keeps a resident company
    const companions = [];
    function addCompanion(owner, spec) {
        const at = (fx, fy) => { const q = owner.fig.upToFig(fx, fy); return figToRing(owner, q[0], q[1]); };
        const angle = () => (owner.s / R) * 57.29578;
        const perch = o => { const side = Math.random() < 0.5 ? -1 : 1; return ringXY(o.s + side * (16 + Math.random() * 10), 2, 0, -50 - Math.random() * 10); };
        const c = spec.kind === 'bird' ? createBirdCompanion(layer, glowLayer, owner, { colour: spec.colour, at, angle, perch })
            : createButterflyCompanion(layer, glowLayer, owner, { colour: spec.colour, at, angle });
        companions.push({ owner, c });
        return c;
    }

    return { places, all, dogs, update, addCompanion, companions, exchange, residentTrade, makeDog, figToRing, footfall, weather, get busySlots() { return slots.filter(s => s.busy).length; } };
}

// ------------------------------------------------------------------ art for money and goods (drawn around 0,0, ~6 units)

const zeniD = (() => { const d = []; for (let i = 0; i < 5; i++) d.push(oval(-6 + i * 3, -1 + Math.sin(i * 0.9) * 0.6, 1.5, 1.5)); return d.join(' '); })();
const MONEY_ART = {
    zeni: [zeniD, 'M-7.6 -1 Q0 1.6 7.6 -0.4 M-6 -1.6 l0 0.6 M-3 -1.1 l0 0.6 M0 -0.7 l0 0.6 M3 -0.7 l0 0.6 M6 -1 l0 0.6', '#b07a3a'],
    koban: [oval(0, -1, 3.2, 4.6), 'M-1.6 -4 l3.2 0 M-2.2 -2 l4.4 0 M-2.2 0 l4.4 0 M-1.6 2 l3.2 0', '#e2b84a'],
    coin: [`${oval(-1.6, -1, 2.4, 2.4)} ${oval(1.8, -0.4, 2.4, 2.4)}`, 'M1.8 -1.6 l0 2.4', '#d6a84a'],
    note: ['M-4.6 -3 L4.6 -3.6 L5 2.6 L-4.2 3.2Z', 'M-3 -1 l6 -0.4 M-3 1 l4 -0.2', '#e8e0c8'],
    cord: ['M-6 -1 q2 -2 4 0 q2 2 4 0 q2 -2 4 0', 'M-4 -1.4 l0 1 M0 -1 l0 1 M4 -1.4 l0 1', 'none'],
    leaf: ['M-3 -4 L3 -4.6 L3.4 2 L-2.6 2.6Z', 'M-1.6 -2 l3.4 -0.3', '#e6c35a'],
    token: ['M-2.6 -3.6 L2.6 -3.6 L2.6 1.6 L-2.6 1.6Z', 'M-1.4 -2 l2.8 0 M-1.4 0 l1.6 0', '#7fe3d8'],
    ticket: ['M-4.4 -2.6 L4.4 -2.6 L4.4 2.2 L-4.4 2.2Z', 'M-2.8 -1 l5.6 0 M-2.8 0.8 l3 0 M2.6 -2.6 l0 4.8', '#3fa77a'],
    scale: ['M0 -4.6 Q3.2 -1 0 2.4 Q-3.2 -1 0 -4.6Z', 'M0 -3 l0 4', '#9fd8f0'],
    pearl: [oval(0, -1, 2.6, 2.6), 'M-1 -2.2 q0.6 -0.6 1.4 -0.4', '#f4f0e8'],
    slip: ['M-1.8 -5 L1.8 -5 L1.8 3 L-1.8 3Z', 'M0 -3.6 l0 5.4', '#f2ead6'],
    none: ['', '', 'none']
};
const GOODS_ART = {
    bundle: ['M-5 0 Q-6 -6 -1 -6.4 Q4 -6.8 5 -1 Q5.4 2.4 0 2.6 Q-5 2.6 -5 0Z', 'M-1.6 -6.2 l-1.4 -2.4 M1.4 -6.4 l1.6 -2.2 M-4 -2 Q0 -3.4 4.6 -2.6'],
    box: ['M-4.6 -6 L4.6 -6 L4.6 2.4 L-4.6 2.4Z', 'M-4.6 -1.8 L4.6 -1.8 M0 -6 L0 2.4'],
    jar: ['M-2.6 2.4 Q-4.6 -1 -2.6 -4.4 L-1.6 -6 L1.6 -6 L2.6 -4.4 Q4.6 -1 2.6 2.4Z', 'M-1.6 -6 L1.6 -6'],
    scroll: ['M-6 -1.6 L6 -2.4 Q7.4 -0.6 6.2 0.8 L-5.8 1.6 Q-7.2 0 -6 -1.6Z', 'M-1 -2 l0.2 3.6'],
    sheet: ['M-4.4 -6 L4.4 -6.4 L4.8 4.4 L-4.2 4.8Z', 'M3 -5 l0 8 M1 -5 l0 8 M-1 -5 l0 4'],
    skewer: ['M-1 3 L1 -9 M-1.6 -1 a2 2 0 1 0 0.1 0 M-0.9 -4.6 a2 2 0 1 0 0.1 0 M-0.2 -8.2 a2 2 0 1 0 0.1 0', ''],
    none: ['', '']
};

// a food stall: a roofed cart with a noren, a steaming pot and a lantern
function drawStall(g, gl, T, [label], pr) {
    C(g, 'M-14 0 L-14 -16 L14 -16 L14 0Z', '#8a5a3c', SP * 0.9);
    penP(g, 'M-14 -10 L14 -10 M-10 -16 L-10 0 M10 -16 L10 0', SP * 0.5);
    shapeP(g, oval(-9, 2, 2.8, 2.8), SP * 0.7); shapeP(g, oval(9, 2, 2.8, 2.8), SP * 0.7);
    penP(g, 'M-13 -16 L-13 -38 M13 -16 L13 -38', SP * 0.9);
    hisashi(g, -18, 18, -46, 8, { tile: 4.4 });
    shapeP(g, 'M-5 -16 Q-6 -22 -1 -22 L3 -22 Q7 -22 6 -16Z', SP * 0.7);
    const nr = drawNoren(g, -12, 12, -38, 9, 3, label, { colour: '#7a2e3a', open: [0.26, 0.97], rnd: pr });
    const steam = smoke(g, 1, -23, pr, { rate: 1.8, max: 4 });
    const lan = chochin(g, gl, 15, -36, pr, { r: 3.6, h: 8, red: true, label: label.slice(0, 1) });
    T.stall = { draw(t, dt, wind, P) { nr.draw(t, dt, wind, 0.5, P); steam.draw(t, dt, wind, P, 1); lan.draw(t, dt, wind, P); } };
}
