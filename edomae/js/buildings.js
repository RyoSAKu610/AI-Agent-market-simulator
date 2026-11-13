// 江戸前 Edomae — one building (or structure) per district, in street elevation.
// The two Edo places are the hero: open shop fronts and cutaway rooms with people
// at work inside. The other places use archetypes per era family, parameterised by
// the district's seed, name and landmarks, so no two buildings come out the same.
// Signboards carry the district's own name from the data (never invented words).
//
// build(d, ctx) draws into ctx.g (building space: x centred, base y = 0, up is
// negative) and registers the living parts in ctx.live.

import { el, f, PAPER } from './lib/ink.js';
import { lerp } from './lib/motion.js';
import {
    SP, P, S, B, C, G, rect, wallRect, oval, text, tileRoof, hisashi, thatchRoof, koshi, mushiko, shojiGrid, brick, pane,
    noren, chochin, lamp, smoke, kokuDial, banner, pine, blossomTree, roundTree, bamboo, barrel, well, bench, water, GOLD, hoshigaki, asagao
} from './kit.js';
import { createSitter } from './sitter.js';
import { createSurface } from './water.js';
import { createBoat, createFrog, createTub, createBucket } from './waterlife.js';
import { signName } from './layout.js';

const lm = d => (d.landmarks || []).map(l => l.name_ja || '').join(' ') + ' ' + (d.name_ja || '') + ' ' + (d.summary || '');
const has = (d, ...w) => { const s = lm(d); return w.some(x => s.includes(x)); };

// ------------------------------------------------------------------ signboard

// A signboard is a link to the district page in the explorer (a tap on it is the way in).
function sign(ctx, x, y, w, { vertical = false, h = 0, colour = null, light = false } = {}) {
    const d = ctx.d, name = signName(d);
    const a = el('a', { href: `../zipangu/#/district/${d.id}`, class: 'sign' }, ctx.g);
    el('title', {}, a).textContent = `${name} — ${d.name_en || ''}`;
    if (vertical) {
        const hh = h || Math.min(70, name.length * 7.2 + 8);
        (colour ? C(a, rect(x - w / 2, y, x + w / 2, y + hh), colour, SP * 0.85) : S(a, rect(x - w / 2, y, x + w / 2, y + hh), SP * 0.85));
        P(a, rect(x - w / 2 + 1.6, y + 1.6, x + w / 2 - 1.6, y + hh - 1.6), SP * 0.35);
        const size = Math.min(w * 0.62, (hh - 6) / Math.max(1, name.length));
        text(a, x, y + hh / 2, name, size, { vertical: true, weight: 700, fill: light ? '#f6eedc' : 'currentColor' });
    } else {
        const hh = h || 11;
        (colour ? C(a, wallRect(x - w / 2, y, x + w / 2, y + hh, 0.4), colour, SP * 0.85) : S(a, wallRect(x - w / 2, y, x + w / 2, y + hh, 0.4), SP * 0.85));
        const size = Math.min(hh * 0.62, (w - 6) / Math.max(1, name.length) * 1.05);
        text(a, x, y + hh / 2 + 0.2, name, size, { weight: 700, fill: light ? '#f6eedc' : 'currentColor' });
    }
    ctx.live.signs.push(a);
    return a;
}

// ------------------------------------------------------------------ shared pieces

function posts(g, xs, y0, y1, w = SP) { P(g, xs.map(x => `M${f(x)} ${f(y0)} L${f(x)} ${f(y1)}`).join(' '), w); }

function win(ctx, x0, y0, x1, y1, kind = 'shoji', opts) {
    const w = pane(ctx.g, ctx.gl, x0, y0, x1, y1, ctx.rnd, opts);
    ctx.live.windows.push(w);
    if (kind === 'shoji') shojiGrid(ctx.g, x0, y0, x1, y1, Math.max(2, Math.round((x1 - x0) / 7)), Math.max(2, Math.round((y1 - y0) / 7)));
    else if (kind === 'mushiko') mushiko(ctx.g, x0 - 2, y0 - 2, x1 + 2, y1 + 2);
    else if (kind === 'sash') { P(ctx.g, `M${f((x0 + x1) / 2)} ${f(y0)} L${f((x0 + x1) / 2)} ${f(y1)} M${f(x0)} ${f((y0 + y1) / 2)} L${f(x1)} ${f((y0 + y1) / 2)}`, SP * 0.5); P(ctx.g, rect(x0, y0, x1, y1), SP * 0.85); }
    else if (kind === 'arch') { P(ctx.g, `M${f(x0)} ${f(y1)} L${f(x0)} ${f(y0 + (x1 - x0) / 2)} Q${f(x0)} ${f(y0)} ${f((x0 + x1) / 2)} ${f(y0)} Q${f(x1)} ${f(y0)} ${f(x1)} ${f(y0 + (x1 - x0) / 2)} L${f(x1)} ${f(y1)}Z M${f((x0 + x1) / 2)} ${f(y0)} L${f((x0 + x1) / 2)} ${f(y1)}`, SP * 0.75); }
    else if (kind === 'grid') { const d = []; for (let x = x0 + 4; x < x1; x += 4) d.push(`M${f(x)} ${f(y0)} L${f(x)} ${f(y1)}`); P(ctx.g, d.join(' '), SP * 0.35); P(ctx.g, rect(x0, y0, x1, y1), SP * 0.7); }
    else P(ctx.g, rect(x0, y0, x1, y1), SP * 0.8);
    return w;
}

// water in a building's space: a band from the far bank (yTop) to the building line
function waterAt(ctx, x0, x1, top, kind = null) {
    const fam = ctx.d && ctx.d.home;
    const k = kind || (/海|港|浜|渡し|海上|竜宮/.test((ctx.d && ctx.d.name_ja) || '') ? 'sea' : /池|蓮|鯉|淵/.test(lm(ctx.d)) ? 'pond' : /谷川|渓|水路/.test(lm(ctx.d)) ? 'stream' : 'river');
    const s = createSurface({ g: ctx.g, hl: ctx.hl, gl: ctx.gl, rnd: ctx.rnd }, { x0, x1, yTop: Math.min(top, -6) - 6, yBot: 0, kind: k, flow: k === 'pond' ? 0.25 : 0.7 });
    s.draw = (t, dt, wind, P) => s.update(t, dt, wind, P);
    ctx.live.surfaces.push(s);
    if ((k === 'pond' || k === 'stream') && x1 - x0 > 40) ctx.live.waterlife.push(createFrog(ctx, s, { side: 0.08 + ctx.rnd() * 0.2 }));
    return s;
}

function sitter(ctx, x, y, opts) {
    const s = createSitter(ctx.g, { x, y, seed: ctx.rnd(), colour: ctx.pick(['#34507a', '#7a5a3c', '#4f6b55', '#6a4a6a', '#8a5a3c', '#2f3f5f']), hair: ctx.pick(['topknot', 'bun', 'topknot']), ...opts });
    ctx.live.sitters.push(s);
    return s;
}

// interior goods on shelves: boxes, jars and scrolls on two shelves
function shelves(g, x0, x1, y0, y1, rnd) {
    S(g, rect(x0, y0, x1, y1), SP * 0.7);
    const rows = [y0 + (y1 - y0) * 0.45, y1 - 2];
    P(g, rows.map(y => `M${f(x0)} ${f(y)} L${f(x1)} ${f(y)}`).join(' '), SP * 0.6);
    for (const y of rows) for (let x = x0 + 2; x < x1 - 5; x += rnd(5, 9)) {
        const k = rnd();
        if (k < 0.4) S(g, rect(x, y - rnd(4, 7), x + rnd(3.5, 6), y), SP * 0.5);
        else if (k < 0.75) S(g, `M${f(x + 1)} ${f(y)} Q${f(x - 0.6)} ${f(y - 3)} ${f(x + 1.4)} ${f(y - 5)} L${f(x + 3.6)} ${f(y - 5)} Q${f(x + 5.6)} ${f(y - 3)} ${f(x + 4)} ${f(y)}Z`, SP * 0.5);
        else P(g, `M${f(x)} ${f(y - 1.4)} L${f(x + 6)} ${f(y - 1.4)} M${f(x)} ${f(y - 3)} L${f(x + 6)} ${f(y - 3)}`, SP * 0.5);
    }
}

// ------------------------------------------------------------------ EDO (hero)

// A two-storey machiya with an open shop front: the ground floor is cut away so
// the room, its raised floor, its shelves and the person working inside show.
function machiya(ctx, x0, x1, { label, task = 'abacus', noren: norenColour, upper = 'mushiko', storeys = 2, inner = true, lantern = true, door = 'koshi' } = {}) {
    const { g, rnd } = ctx;
    const w = x1 - x0, H1 = 60, H2 = storeys > 1 ? 44 : 0, eave = -(H1 + H2) - 2, ridge = eave - 30 - w * 0.06;
    // walls and posts
    S(g, wallRect(x0 + 6, -H1 - H2 - 2, x1 - 6, 0, 0.6));
    posts(g, [x0 + 6, x1 - 6], -H1 - H2 - 2, 0, SP * 1.2);
    // upper floor: plaster with a window that lights at night
    if (storeys > 1) {
        const wy0 = -H1 - H2 + 12, wy1 = -H1 - 8;
        if (upper === 'mushiko') win(ctx, x0 + w * 0.22, wy0, x1 - w * 0.22, wy1, 'mushiko', { sil: 'wave', silAt: 0.3, thr: 0.18 });
        else { win(ctx, x0 + 16, wy0, x0 + w * 0.46, wy1, 'shoji', { sil: 'wave', thr: 0.18 }); win(ctx, x0 + w * 0.54, wy0, x1 - 16, wy1, 'shoji', { sil: 'sit', silAt: 0.6 }); }
        P(g, `M${f(x0 + 6)} ${f(-H1 - 2)} L${f(x1 - 6)} ${f(-H1 - 2)}`, SP * 0.9);
    }
    tileRoof(g, { x0: x0 - 4, x1: x1 + 4, eave, ridge, inset: 22 });
    // the open shop: back wall, raised floor (agari), shelves, someone at work
    const sx0 = x0 + 9, sx1 = x0 + w * (door === 'none' ? 0.92 : 0.6);
    if (inner) {
        S(g, rect(sx0, -H1 + 4, sx1, 0), SP * 0.7);
        shelves(g, sx0 + 4, sx1 - 4, -H1 + 9, -24, rnd);
        S(g, rect(sx0, -12, sx1, -10.4), SP * 0.8);
        const tat = [];
        for (let x = sx0 + 2; x < sx1 - 1; x += 3.2) tat.push(`M${f(x)} -10.4 L${f(x - 0.4)} 0`);
        P(g, tat.join(' '), SP * 0.3);
        sitter(ctx, lerp(sx0, sx1, 0.38), -12, { task });
        win(ctx, sx0 + 2, -H1 + 5, sx1 - 2, -H1 + 8, 'plain', { thr: 0.05, lateOff: rnd() < 0.5 ? 1.04 : 9 });
        // the shop's lamplight spills onto the street after dark
        const sp = pane(g, ctx.gl, sx0 + 4, -2, sx1 - 4, 0, rnd, { thr: 0.12, lateOff: 9, spill: true });
        sp.n.setAttribute('d', ''); ctx.live.windows.push(sp);
    }
    // the other bay: lattice front or doors
    if (door === 'koshi') koshi(g, sx1 + 2, x1 - 8, -H1 + 6, -1);
    else if (door === 'shoji') { win(ctx, sx1 + 2, -H1 + 8, x1 - 8, -2, 'shoji'); }
    hisashi(g, x0 - 2, x1 + 2, -H1 - 2, 8);
    if (ctx.d && /^(sangaku|raiden)_/.test(ctx.d.id)) {
        // 干し柿 under the eave and a morning glory by the door: somebody lives here
        ctx.live.swing.push(hoshigaki(g, x1 - 18, -H1 + 2, 5 + Math.floor(rnd() * 3)));
        ctx.live.swing.push(hoshigaki(g, x1 - 24, -H1 + 2, 4 + Math.floor(rnd() * 3)));
        asagao(g, x1 - 12);
    }
    if (norenColour) ctx.live.norens.push(noren(g, sx0 + 4, sx1 - 4, -H1 + 6, 20, Math.max(2, Math.round((sx1 - sx0) / 22)), label || '', { colour: norenColour, rnd }));
    if (lantern) ctx.live.lanterns.push(chochin(g, ctx.gl, x1 - 12, -H1 + 2, rnd, { red: rnd() < 0.5 }));
    return { H1, H2, eave, ridge, sx0, sx1 };
}

function nagaya(ctx, x0, x1, units, { open = -1, task = 'write', kids = false } = {}) {
    const { g, rnd } = ctx;
    const H = 50, w = (x1 - x0) / units;
    S(g, wallRect(x0, -H, x1, 0, 0.4));
    tileRoof(g, { x0: x0 - 6, x1: x1 + 6, eave: -H - 2, ridge: -H - 24, inset: 16, tile: 5.8 });
    for (let i = 0; i < units; i++) {
        const a = x0 + i * w, b = a + w;
        posts(g, [a, b], -H, 0, SP * 1.1);
        if (i === open) {
            S(g, rect(a + 3, -H + 6, b - 3, 0), SP * 0.6);
            S(g, rect(a + 3, -10, b - 3, -8.6), SP * 0.7);
            for (let k = 0; k < (kids ? 2 : 1); k++) {
                const sx = lerp(a + 10, b - 18, kids ? k : 0.4);
                sitter(ctx, sx, -10, { task, scale: kids ? 0.4 : 0.5 });
                S(g, rect(sx + 8, -14.4, sx + 17, -13), SP * 0.6);
                P(g, `M${f(sx + 9)} -13 l0 3 M${f(sx + 16)} -13 l0 3`, SP * 0.5);
            }
            win(ctx, a + 4, -H + 7, b - 4, -H + 10, 'plain', { thr: 0.05 });
        } else {
            win(ctx, a + 4, -H + 10, a + w * 0.55, -6, 'shoji', i % 2 ? { sil: 'sit', silAt: 0.5 } : {});
            if (i === units - 1) asagao(g, b - 6);
            S(g, rect(a + w * 0.6, -H + 12, b - 4, 0), SP * 0.7);
            P(g, `M${f(a + w * 0.6 + 2)} ${f(-H + 22)} l${f(w * 0.4 - 8)} 0`, SP * 0.4);
        }
    }
    hisashi(g, x0 - 2, x1 + 2, -H + 2, 7, { tile: 6 });
    return { H };
}

const EDO = {
    sangaku_takeda_karakuri_za(ctx, w) {
        const { g, rnd } = ctx;
        const m = machiya(ctx, -w / 2 + 6, w / 2 - 6, { task: 'pour', noren: '#2f3f2f', label: 'からくり', upper: 'shoji', door: 'none' });
        // stage curtain (jōshiki-maku) half drawn across the cut-away room
        const cx0 = m.sx0, cx1 = lerp(m.sx0, m.sx1, 0.3);
        const stripes = ['#2c2a2a', '#4f6b55', '#b86a3a'];
        for (let i = 0; i < 6; i++) C(g, rect(lerp(cx0, cx1, i / 6), -m.H1 + 4, lerp(cx0, cx1, (i + 1) / 6), -12), stripes[i % 3], SP * 0.4);
        // 出合い時計の櫓: a small drum tower on the roof with a clock whose hand walks the 刻
        const tx = 0, ty = m.ridge - 4;
        S(g, rect(tx - 13, ty - 26, tx + 13, ty + 2));
        P(g, `M${f(tx - 13)} ${f(ty - 8)} L${f(tx + 13)} ${f(ty - 8)} M${f(tx - 9)} ${f(ty + 2)} L${f(tx - 11)} ${f(ty + 10)} M${f(tx + 9)} ${f(ty + 2)} L${f(tx + 11)} ${f(ty + 10)}`, SP * 0.7);
        ctx.live.dials.push(kokuDial(g, tx, ty - 17, 6.6));
        tileRoof(g, { x0: tx - 20, x1: tx + 20, eave: ty - 26, ridge: ty - 40, inset: 10, tile: 4.6 });
        for (let i = 0; i < 3; i++) ctx.live.banners.push(banner(g, w / 2 - 20 - i * 15, -66, 0, 9, ['#b3412d', '#2f4d5c', '#c9a23a'][i], rnd, ['算額', '一礼', '人形'][i]));
        sign(ctx, -w * 0.18, -m.H1 - m.H2 + 2, 66, { h: 12, colour: '#2c2a2a', light: true });
    },
    sangaku_kaito_no_mori(ctx, w) {
        const { g, rnd } = ctx;
        // haiden with a deep sweeping roof, raised on a stone base
        const x0 = -w * 0.36, x1 = w * 0.18;
        S(g, rect(x0 - 6, -8, x1 + 6, 0));
        P(g, `M${f(x0 - 6)} -4 L${f(x1 + 6)} -4`, SP * 0.4);
        S(g, rect(x0, -54, x1, -8));
        posts(g, [x0 + 4, lerp(x0, x1, 0.33), lerp(x0, x1, 0.66), x1 - 4], -54, -8, SP * 1.2);
        win(ctx, lerp(x0, x1, 0.36), -48, lerp(x0, x1, 0.64), -14, 'grid');
        tileRoof(g, { x0: x0 - 16, x1: x1 + 16, eave: -52, ridge: -92, inset: 30, sori: 5, tile: 6 });
        // bell rope and offering box
        P(g, `M${f((x0 + x1) / 2)} -54 Q${f((x0 + x1) / 2 + 1)} -36 ${f((x0 + x1) / 2)} -22`, SP * 1.4);
        S(g, oval((x0 + x1) / 2, -55, 3, 2.6), SP * 0.7);
        S(g, rect((x0 + x1) / 2 - 10, -8, (x0 + x1) / 2 + 10, 0), SP * 0.8);
        P(g, `M${f((x0 + x1) / 2 - 10)} -5 l20 0 M${f((x0 + x1) / 2 - 10)} -3 l20 0`, SP * 0.4);
        // 千面額殿: sangaku boards — circles and triangles inscribed, as the problems are
        const bx0 = x1 + 14, bx1 = w / 2 - 8;
        S(g, rect(bx0, -48, bx1, 0));
        tileRoof(g, { x0: bx0 - 6, x1: bx1 + 6, eave: -48, ridge: -64, inset: 10, tile: 4.6 });
        for (let r = 0; r < 2; r++) for (let x = bx0 + 3; x < bx1 - 12; x += 13) {
            const y = -42 + r * 17;
            S(g, rect(x, y, x + 11, y + 13), SP * 0.6);
            const k = rnd();
            P(g, k < 0.33 ? `${oval(x + 5.5, y + 6.5, 4, 4)} ${oval(x + 4, y + 7.4, 1.8, 1.8)} ${oval(x + 7.2, y + 7.4, 1.8, 1.8)}` : k < 0.66 ? `M${f(x + 2)} ${f(y + 11)} L${f(x + 5.5)} ${f(y + 2)} L${f(x + 9)} ${f(y + 11)}Z ${oval(x + 5.5, y + 8, 2, 2)}` : `${rect(x + 2.4, y + 2.4, x + 8.6, y + 9.6)} ${oval(x + 5.5, y + 6, 3, 3)}`, SP * 0.4);
        }
        // a sacred tree with a shimenawa rope and paper streamers
        const tx = -w / 2 + 14;
        roundTree(g, tx, 108, rnd);
        P(g, `M${f(tx - 6)} -40 Q${f(tx)} -36 ${f(tx + 6)} -40`, SP * 1.4);
        P(g, `M${f(tx - 2)} -38 l-0.6 6 l1.4 0 l-0.8 4 M${f(tx + 3)} -38 l0.4 6 l1.4 0 l-0.6 4`, SP * 0.5);
        sign(ctx, (x0 + x1) / 2, -88, 14, { vertical: true, h: 40 });
        ctx.live.lanterns.push(chochin(g, ctx.gl, x0 + 6, -50, rnd, { label: '奉納', red: true }));
        ctx.live.lanterns.push(chochin(g, ctx.gl, x1 - 6, -50, rnd, { label: '奉納', red: true }));
    },
    sangaku_dojima_chouai(ctx, w) {
        const { g, rnd } = ctx;
        const x0 = -w / 2 + 8, x1 = w / 2 - 34, H = 58;
        S(g, rect(x0, -H, x1, 0));
        tileRoof(g, { x0: x0 - 8, x1: x1 + 8, eave: -H - 2, ridge: -H - 38, inset: 26 });
        posts(g, [x0 + 2, lerp(x0, x1, 0.25), lerp(x0, x1, 0.5), lerp(x0, x1, 0.75), x1 - 2], -H, 0, SP * 1.2);
        S(g, rect(x0 + 2, -12, x1 - 2, -10.4), SP * 0.8);
        // the trading floor: traders raising hands (te-yari), a clerk with an abacus
        sitter(ctx, lerp(x0, x1, 0.15), -12, { task: 'flag', dir: 1 });
        sitter(ctx, lerp(x0, x1, 0.42), -12, { task: 'abacus' });
        sitter(ctx, lerp(x0, x1, 0.66), -12, { task: 'flag', dir: -1 });
        for (let i = 0; i < 3; i++) win(ctx, lerp(x0, x1, 0.06 + i * 0.32), -H + 6, lerp(x0, x1, 0.28 + i * 0.32), -H + 14, 'grid');
        hisashi(g, x0 - 4, x1 + 4, -H + 2, 8);
        // 旗振り櫓: a flag-signal tower
        const tx = w / 2 - 18;
        P(g, `M${f(tx - 8)} 0 L${f(tx - 4)} -96 M${f(tx + 8)} 0 L${f(tx + 4)} -96 M${f(tx - 7)} -30 L${f(tx + 7)} -44 M${f(tx + 7)} -30 L${f(tx - 7)} -44 M${f(tx - 6)} -62 L${f(tx + 6)} -74 M${f(tx + 6)} -62 L${f(tx - 6)} -74`, SP * 0.8);
        S(g, rect(tx - 9, -100, tx + 9, -94));
        ctx.live.banners.push(banner(g, tx, -128, -100, 12, '#b3412d', rnd));
        barrel(g, x1 + 4); barrel(g, x1 + 14, 8, 9);
        sign(ctx, (x0 + x1) / 2, -H - 14, 64, { h: 12 });
    },
    sangaku_terakoya_nagaya(ctx, w) {
        const { g, rnd } = ctx;
        nagaya(ctx, -w / 2 + 8, w / 2 - 8, 3, { open: 1, task: 'write', kids: true });
        // 連鶴: strings of paper cranes hung out to dry from the eave
        for (let i = 0; i < 4; i++) {
            const x = -w / 2 + 22 + i * ((w - 50) / 3);
            const grp = G(g), p = { a: 0, v: 0, x, ph: rnd() * 6 };
            P(grp, 'M0 0 L0 22', SP * 0.4);
            for (let k = 0; k < 3; k++) S(grp, `M-3 ${6 + k * 7} L0 ${3 + k * 7} L3 ${6 + k * 7} L0 ${7.6 + k * 7}Z`, SP * 0.45);
            ctx.live.swing.push({ grp, x, y: -48, p, k: 12 });
        }
        sign(ctx, 0, -84, 12, { vertical: true, h: 34 });
        ctx.live.waterlife.push(createTub(ctx, -w / 2 + 26));
        ctx.live.smokes.push(smoke(g, w / 2 - 26, -76, rnd));
        P(g, `M${f(w / 2 - 28)} -64 L${f(w / 2 - 28)} -76 M${f(w / 2 - 24)} -64 L${f(w / 2 - 24)} -76`, SP * 0.8);
    },
    raiden_gennai_nagaya(ctx, w) {
        const { g, rnd } = ctx;
        nagaya(ctx, -w / 2 + 34, w / 2 - 8, 3, { open: 0, task: 'hammer' });
        // エレキテル稲荷: a little red shrine with a tiny torii
        const sx = -w / 2 + 18;
        C(g, `M${f(sx - 9)} 0 L${f(sx - 8)} -24 L${f(sx + 8)} -24 L${f(sx + 9)} 0Z`, '#b3412d');
        tileRoof(g, { x0: sx - 14, x1: sx + 14, eave: -24, ridge: -36, inset: 8, tile: 4.4 });
        C(g, `M${f(sx - 5)} -8 L${f(sx - 4.6)} -18 L${f(sx - 3.4)} -18 L${f(sx - 3)} -8Z M${f(sx + 5)} -8 L${f(sx + 4.6)} -18 L${f(sx + 3.4)} -18 L${f(sx + 3)} -8Z M${f(sx - 7)} -18 L${f(sx + 7)} -18 L${f(sx + 7.4)} -20 L${f(sx - 7.4)} -20Z`, '#b3412d', SP * 0.5);
        S(g, rect(sx - 4, -8, sx + 4, 0), SP * 0.5);
        P(g, `M${f(sx - 2)} -6 l1.4 -3 l-1 0 l1.6 -3`, SP * 0.6);
        // 雷瓶の井戸端: a well with lightning jars glowing beside it
        const wx = w / 2 - 34;
        well(g, wx); ctx.live.waterlife.push(createBucket(ctx, wx)); ctx.live.wells.push(wx);
        for (let i = 0; i < 3; i++) {
            const jx = wx + 12 + i * 5;
            const jar = el('path', { d: `M${f(jx - 1.8)} 0 Q${f(jx - 3)} -3.4 ${f(jx - 1.8)} -6.4 L${f(jx + 1.8)} -6.4 Q${f(jx + 3)} -3.4 ${f(jx + 1.8)} 0Z M${f(jx - 1)} -6.4 l0 -1.6 l2 0 l0 1.6`, fill: PAPER, stroke: 'currentColor', 'stroke-width': SP * 0.6 }, g);
            const glow = el('circle', { cx: f(jx), cy: -3.4, r: 9, fill: 'url(#e-coolglow)', opacity: 0 }, ctx.gl);
            ctx.live.jars.push({ n: jar, glow, ph: rnd() * 6 });
        }
        sign(ctx, 0, -78, 60, { h: 11 });
    },
    raiden_ryogoku_hotarubi(ctx, w) {
        const { g, rnd } = ctx;
        // the river: a bridge arching over it, a bank of stone, water strokes
        const bx0 = -w / 2 + 6, bx1 = w * 0.1;
        const river = waterAt(ctx, bx0, bx1, -7);
        ctx.live.waters.push(river);
        ctx.live.waterlife.push(createBoat(ctx, river));
        P(g, `M${f(bx0 - 2)} -6 Q${f((bx0 + bx1) / 2)} -40 ${f(bx1 + 2)} -6`, SP * 1.3);
        P(g, `M${f(bx0 - 2)} -12 Q${f((bx0 + bx1) / 2)} -46 ${f(bx1 + 2)} -12`, SP * 0.9);
        const rails = [];
        for (let x = bx0 + 6; x < bx1 - 4; x += 7) { const t = (x - bx0) / (bx1 - bx0), y = -6 - 34 * 4 * t * (1 - t) * 0.86; rails.push(`M${f(x)} ${f(y)} l0 -6`); }
        P(g, rails.join(' '), SP * 0.6);
        posts(g, [lerp(bx0, bx1, 0.25), lerp(bx0, bx1, 0.5), lerp(bx0, bx1, 0.75)], -34, 0, SP * 0.9);
        ctx.live.fireflies.push({ x0: bx0, x1: bx1, y0: -36, y1: -4 });
        for (const u of [0.32, 0.68]) ctx.live.lanterns.push(chochin(g, ctx.gl, lerp(bx0, bx1, u), -42 + Math.abs(u - 0.5) * 8, rnd, { r: 3.4, h: 8, red: true, thr: 0.12 }));
        // 光の版元: a print shop selling glowing prints, prints hung in the open front
        const m = machiya(ctx, bx1 + 6, w / 2 - 4, { task: 'sew', noren: '#7a2e3a', label: '版元', storeys: 2 });
        for (let i = 0; i < 4; i++) { const x = lerp(m.sx0 + 4, m.sx1 - 10, i / 3); S(g, rect(x, -m.H1 + 12, x + 7, -m.H1 + 22), SP * 0.5); P(g, `M${f(x + 1.4)} ${f(-m.H1 + 18)} q2 -3 4 0`, SP * 0.35); }
        sign(ctx, bx1 + 14, -m.H1 + 4, 10, { vertical: true, h: 40, colour: '#2c2a2a', light: true });
    },
    raiden_kunitomo_nichirin(ctx, w) {
        const { g, rnd } = ctx;
        // 日輪鏡の櫓: an open tower with a sun mirror and a telescope on its deck
        const tx = -w * 0.18;
        P(g, `M${f(tx - 24)} 0 L${f(tx - 14)} -110 M${f(tx + 24)} 0 L${f(tx + 14)} -110 M${f(tx - 21)} -36 L${f(tx + 21)} -36 M${f(tx - 18)} -72 L${f(tx + 18)} -72 M${f(tx - 21)} -36 L${f(tx + 18)} -72 M${f(tx + 21)} -36 L${f(tx - 18)} -72 M${f(tx - 24)} 0 L${f(tx + 21)} -36 M${f(tx + 24)} 0 L${f(tx - 21)} -36`, SP * 0.9);
        S(g, rect(tx - 26, -114, tx + 26, -108));
        P(g, `M${f(tx - 26)} -114 L${f(tx - 26)} -122 L${f(tx + 26)} -122 L${f(tx + 26)} -114 M${f(tx - 18)} -114 l0 -8 M${f(tx - 6)} -114 l0 -8 M${f(tx + 6)} -114 l0 -8 M${f(tx + 18)} -114 l0 -8`, SP * 0.6);
        const mirror = C(g, oval(tx - 10, -136, 10, 10), '#e8d48a');
        P(g, `${oval(tx - 10, -136, 6, 6)} M${f(tx - 10)} -126 L${f(tx - 10)} -114`, SP * 0.5);
        ctx.live.mirrors.push({ n: mirror, glow: el('circle', { cx: f(tx - 10), cy: -136, r: 30, fill: 'url(#e-sunglow2)', opacity: 0 }, ctx.gl) });
        S(g, `M${f(tx + 6)} -122 L${f(tx + 30)} -140 L${f(tx + 32)} -136 L${f(tx + 9)} -119Z`, SP * 0.8);
        P(g, `M${f(tx + 12)} -122 L${f(tx + 10)} -114 M${f(tx + 14)} -122 L${f(tx + 18)} -114`, SP * 0.6);
        // 気密の口金蔵: a white plaster storehouse
        const kx0 = w * 0.08, kx1 = w / 2 - 8;
        S(g, wallRect(kx0, -64, kx1, 0, 0.5));
        P(g, `M${f(kx0)} -18 L${f(kx1)} -18 M${f(kx0)} -14 L${f(kx1)} -14`, SP * 0.6);
        const nm = []; for (let x = kx0 + 3; x < kx1; x += 6) nm.push(`M${f(x)} -14 l3 -4 l3 4`); P(g, nm.join(' '), SP * 0.4);
        S(g, rect((kx0 + kx1) / 2 - 9, -44, (kx0 + kx1) / 2 + 9, -18), SP * 0.9);
        win(ctx, kx0 + 8, -56, kx0 + 18, -48, 'mushiko', { thr: 0.3 });
        tileRoof(g, { x0: kx0 - 6, x1: kx1 + 6, eave: -64, ridge: -86, inset: 14, tile: 5 });
        // 伊能測線の起点石: a survey stone
        S(g, `M${f(tx + 32)} 0 L${f(tx + 33)} -12 Q${f(tx + 36)} -14 ${f(tx + 39)} -12 L${f(tx + 40)} 0Z`, SP * 0.7);
        sign(ctx, tx, -104, 40, { h: 10 });
    },
    raiden_hisashige_kobo(ctx, w) {
        const { g, rnd } = ctx;
        const m = machiya(ctx, -w / 2 + 6, w / 2 - 36, { task: 'hammer', noren: '#4f6b55', label: '時計', upper: 'shoji', door: 'none' });
        // 親時計の間: the master clock stands in the open room, its hand walking the 刻
        const cx = lerp(m.sx0, m.sx1, 0.78);
        S(g, `M${f(cx - 11)} -12 L${f(cx - 9)} -40 L${f(cx + 9)} -40 L${f(cx + 11)} -12Z`, SP * 0.9);
        ctx.live.dials.push(kokuDial(g, cx, -50, 10));
        S(g, `M${f(cx - 12)} -60 L${f(cx)} -66 L${f(cx + 12)} -60Z`, SP * 0.8);
        const pend = P(g, '', SP * 0.7), bob = S(g, '', SP * 0.6);
        ctx.live.pendulums.push({ pend, bob, x: cx, y: -38, len: 20, w: 2.6 });
        // 刻斑の庭と鯰井戸: the catfish well in the garden
        well(g, w / 2 - 18); ctx.live.waterlife.push(createBucket(ctx, w / 2 - 18)); ctx.live.wells.push(w / 2 - 18);
        pine(g, w / 2 - 6, 62, rnd);
        ctx.live.smokes.push(smoke(g, -w / 2 + 30, m.ridge + 6, rnd));
        P(g, `M${f(-w / 2 + 28)} ${f(m.ridge + 18)} l0 -12 M${f(-w / 2 + 32)} ${f(m.ridge + 18)} l0 -12`, SP * 0.8);
        sign(ctx, -w * 0.12, -m.H1 - m.H2 + 2, 70, { h: 12, colour: '#3a2a20', light: true });
    }
};


// ------------------------------------------------------------------ the six quieter places, drawn from their landmarks

// a round window that lights (丸窓)
function roundWin(ctx, x, y, r, opts) {
    const w = pane(ctx.g, ctx.gl, x - r, y - r, x + r, y + r, ctx.rnd, opts);
    w.n.setAttribute('d', oval(x, y, r, r));
    P(ctx.g, `${oval(x, y, r, r)} M${f(x - r)} ${f(y)} L${f(x + r)} ${f(y)}`, SP * 0.6);
    ctx.live.windows.push(w);
    return w;
}
// an open room seen from the street, with someone at work in it
function openRoom(ctx, x0, x1, y0, task, opts = {}) {
    const { g } = ctx;
    S(g, rect(x0, y0, x1, 0), SP * 0.6);
    S(g, rect(x0, -10, x1, -8.6), SP * 0.7);
    const lamp = win(ctx, x0 + 2, y0 + 1, x1 - 2, y0 + 4, 'plain', { thr: 0.04, spill: true });
    sitter(ctx, lerp(x0, x1, opts.at ?? 0.4), -10, { task, ...opts });
    return lamp;
}
const THIN = {
    // 月の都
    ryugu_fuji_dana(ctx, w) {
        FAMILY.tsuki(ctx, w);
        const { g, rnd } = ctx;
        // 地球をのぞむ縁側: a veranda where someone sits with tea looking at the earth
        S(g, rect(-w * 0.2, -12, w * 0.2, -9), SP * 0.8); posts(g, [-w * 0.18, w * 0.18], -9, 0, SP);
        sitter(ctx, -w * 0.05, -12, { task: 'tea', colour: '#8f78c8', hair: 'bun' });
        // 燕の軒: a swallow's nest under the beam, a swallow on its rim
        S(g, `M${f(w * 0.3)} -64 q4 6 8 0Z`, SP * 0.6); B(g, `M${f(w * 0.31)} -66 q2 -2 4 -1 l3 -1 l-2 2 q-2 2 -5 0Z`);
        ctx.live.lanterns.push(chochin(g, ctx.gl, w * 0.2, -60, rnd, { r: 4.4, h: 10 }));
    },
    ryugu_kaguya_chaya(ctx, w) {
        const { g, rnd } = ctx;
        // かぐや茶屋: a thatched tea house open to the street, tea being served in 一服の間
        const x0 = -w * 0.44, x1 = w * 0.18;
        S(g, wallRect(x0, -50, x1, 0, 0.4));
        thatchRoof(g, { x0: x0 - 10, x1: x1 + 10, eave: -48, ridge: -80, inset: 18, rnd });
        openRoom(ctx, x0 + 4, lerp(x0, x1, 0.62), -46, 'pour', { colour: '#a9b98a', hair: 'bun' });
        sitter(ctx, lerp(x0, x1, 0.5), -10, { task: 'tea', dir: -1, colour: '#6a4a8a' });
        // 空き釘の壁: a row of empty pegs (the robe is never worn)
        P(g, Array.from({ length: 5 }, (_, i) => `M${f(lerp(x0, x1, 0.68) + i * 4)} -40 l1.6 1.6`).join(' '), SP * 0.9);
        win(ctx, lerp(x0, x1, 0.68), -32, x1 - 4, -12, 'shoji', { sil: 'sit' });
        // 物語の秤: a balance hanging at the door
        P(g, `M${f(x1 - 6)} -46 L${f(x1 - 6)} -38 M${f(x1 - 12)} -38 L${f(x1)} -38 M${f(x1 - 12)} -38 l-2 5 l4 0Z M${f(x1)} -38 l-2 5 l4 0Z`, SP * 0.6);
        // 光る竹の坪庭: bamboo whose nodes glow at night
        bamboo(g, w * 0.26, 76, rnd);
        for (let i = 0; i < 4; i++) { const n = pane(g, ctx.gl, w * 0.26 + (i % 2) * 4.4 - 1, -18 - i * 14, w * 0.26 + (i % 2) * 4.4 + 1.4, -16 - i * 14, rnd, { thr: 0.1 + i * 0.05 }); ctx.live.windows.push(n); }
        sign(ctx, -w * 0.12, -66, 46, { h: 9 });
    },
    ryugu_gyusha_eki(ctx, w) {
        const { g, rnd } = ctx;
        // 牛車溜まり: an ox-carriage at rest, its shafts down; 銀の航路標 glowing on a post
        const cx = -w * 0.12;
        C(g, `M${f(cx - 22)} -16 L${f(cx - 22)} -46 Q${f(cx)} -54 ${f(cx + 22)} -46 L${f(cx + 22)} -16Z`, '#2c2a2a');
        S(g, rect(cx - 18, -42, cx + 18, -18), SP * 0.6);
        const sl = []; for (let y = -40; y < -18; y += 2.2) sl.push(`M${f(cx - 18)} ${f(y)} L${f(cx + 18)} ${f(y)}`); P(g, sl.join(' '), SP * 0.3);
        win(ctx, cx - 16, -40, cx + 16, -20, 'plain', { thr: 0.1, sil: 'sit' });
        S(g, oval(cx - 4, -15, 15, 15), SP * 0.9);
        P(g, `${oval(cx - 4, -15, 11, 11)} ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `M${f(cx - 4)} -15 L${f(cx - 4 + Math.cos(a) * 11)} ${f(-15 + Math.sin(a) * 11)}`; }).join(' ')}`, SP * 0.5);
        P(g, `M${f(cx + 22)} -22 L${f(cx + 52)} -2 M${f(cx + 22)} -26 L${f(cx + 52)} -4`, SP * 0.9);
        ctx.live.lamps.push(lamp(g, ctx.gl, w * 0.34, -64, rnd, { kind: 'post', tint: '#dfe6ff', thr: 0.05 }));
        sign(ctx, w * 0.24, -40, 10, { vertical: true, h: 0 });
    },
    ryugu_nandai_no_ma(ctx, w) {
        FAMILY.tsuki(ctx, w);
        const { g, rnd } = ctx;
        // 難題札の掲示板 and a 火鉢 still smoking
        S(g, rect(w * 0.3, -30, w * 0.46, -12), SP * 0.7); P(g, `M${f(w * 0.38)} -12 l0 12`, SP * 0.8);
        for (let i = 0; i < 5; i++) S(g, rect(w * 0.31 + i * 4.2, -28, w * 0.31 + i * 4.2 + 3, -18), SP * 0.4);
        C(g, `M${f(-w * 0.46)} 0 L${f(-w * 0.45)} -7 L${f(-w * 0.35)} -7 L${f(-w * 0.34)} 0Z`, '#5a4a3a', SP * 0.6);
        ctx.live.smokes.push(smoke(g, -w * 0.4, -8, rnd, { rate: 0.8, max: 4 }));
    },
    ryugu_mochitsuki_no_hara(ctx, w) {
        FAMILY.tsuki(ctx, w);
        const { g } = ctx;
        // 望月米の棚田: terraces stepping up behind the mortar
        P(g, [0, 1, 2, 3].map(i => `M${f(w * 0.06 + i * 10)} ${f(-6 - i * 7)} L${f(w * 0.46)} ${f(-6 - i * 7)} M${f(w * 0.06 + i * 10)} ${f(-6 - i * 7)} l-2 7`).join(' '), SP * 0.6);
        const rice = []; for (let i = 0; i < 18; i++) rice.push(`M${f(w * 0.12 + (i % 6) * 6 + Math.floor(i / 6) * 10)} ${f(-8 - Math.floor(i / 6) * 7)} l-1 -3 M${f(w * 0.12 + (i % 6) * 6 + Math.floor(i / 6) * 10)} ${f(-8 - Math.floor(i / 6) * 7)} l1 -3`); P(g, rice.join(' '), SP * 0.4);
    },
    // イーハトーヴ
    kenji_donguri_saibansho(ctx, w) {
        FAMILY.ihatov(ctx, w);
        const { g, rnd } = ctx;
        // 黄金いろの草地 and 白いきのこの馬車寄せ
        const gr = []; for (let i = 0; i < 30; i++) { const x = rnd(-w / 2 + 4, w / 2 - 4); gr.push(`M${f(x)} 0 q${f(rnd(-2, 2))} -4 ${f(rnd(-3, 3))} -7`); } P(g, gr.join(' '), SP * 0.4);
        for (const [x, h] of [[-w * 0.44, 14], [w * 0.42, 10]]) { S(g, `M${f(x - 7)} ${f(-h)} Q${f(x)} ${f(-h - 9)} ${f(x + 7)} ${f(-h)}Z`, SP * 0.7); S(g, rect(x - 2, -h, x + 2, 0), SP * 0.6); }
        sitter(ctx, w * 0.24, 0, { kind: 'stand', task: 'write', colour: '#5e6b2a' });
    },
    kenji_yamanekoken(ctx, w) {
        FAMILY.ihatov(ctx, w);
        const { g, rnd } = ctx;
        // 白熊のような犬の詰所: a kennel by the door, its big white dog asleep
        S(g, `M${f(w / 2 - 30)} 0 L${f(w / 2 - 30)} -14 L${f(w / 2 - 20)} -22 L${f(w / 2 - 10)} -14 L${f(w / 2 - 10)} 0Z`, SP * 0.8);
        B(g, `M${f(w / 2 - 24)} 0 L${f(w / 2 - 24)} -8 Q${f(w / 2 - 20)} -12 ${f(w / 2 - 16)} -8 L${f(w / 2 - 16)} 0Z`);
        S(g, `M${f(w / 2 - 8)} 0 Q${f(w / 2 - 9)} -8 ${f(w / 2)} -8 Q${f(w / 2 + 8)} -8 ${f(w / 2 + 8)} 0Z`, SP * 0.8);
        ctx.live.lamps.push(lamp(g, ctx.gl, -w / 2 + 2, -52, rnd));
    },
    kenji_yamanashi_tanigawa(ctx, w) {
        FAMILY.ihatov(ctx, w);
        const { g, rnd } = ctx;
        // 光の網の淵: light nets on the water; 蟹の親子の穴: two crabs at their holes
        C(g, Array.from({ length: 6 }, (_, i) => `M${f(-w * 0.4 + i * 14)} -4 q3 -2 6 0 q3 2 6 0`).join(' '), 'none', SP * 0.5).setAttribute('stroke', '#d9a928');
        for (const x of [-w * 0.1, w * 0.1]) { C(g, `M${f(x - 3)} -1 Q${f(x)} -5 ${f(x + 3)} -1Z`, '#b8432f', SP * 0.5); P(g, `M${f(x - 3)} -1 l-2 1 M${f(x + 3)} -1 l2 1 M${f(x - 1)} -4 l-1 -2 M${f(x + 1)} -4 l1 -2`, SP * 0.4); }
    },
    kenji_neko_jimusho(ctx, w) {
        const { g, rnd } = ctx;
        // 猫の第六事務所: an office open to the street, clerks at their desks with the 大原簿
        const x0 = -w * 0.42, x1 = w * 0.22;
        S(g, wallRect(x0, -60, x1, 0, 0.4));
        tileRoof(g, { x0: x0 - 8, x1: x1 + 8, eave: -60, ridge: -80, inset: 14, oni: false });
        openRoom(ctx, x0 + 4, x1 - 4, -52, 'write', { colour: '#2c2a2a', hair: 'cap', at: 0.3 });
        sitter(ctx, lerp(x0, x1, 0.68), -10, { task: 'abacus', colour: '#2c2a2a', hair: 'cap' });
        shelves(g, x0 + 6, x0 + 30, -50, -22, rnd);
        // かま猫の竈 with smoke; 電柱の列 with wires
        ctx.live.smokes.push(smoke(g, x1 - 6, -82, rnd));
        P(g, `M${f(w * 0.36)} 0 L${f(w * 0.36)} -96 M${f(w * 0.3)} -88 L${f(w * 0.42)} -88 M${f(w * 0.36)} -88 Q${f(w * 0.6)} -76 ${f(w * 0.8)} -86`, SP * 0.9);
        ctx.live.perches.push({ x0: w * 0.3, x1: w * 0.42, y: -88 });
        sign(ctx, (x0 + x1) / 2, -74, 54, { h: 9 });
    },
    kenji_isado_yoichi(ctx, w) {
        FAMILY.ihatov(ctx, w);
        const { g, rnd } = ctx;
        // 烏瓜の灯の並木: a row of blue snake-gourd lanterns; 幻燈の帳: a lantern-slide screen
        for (let i = 0; i < 5; i++) { const x = -w / 2 + 10 + i * (w - 20) / 4; P(g, `M${f(x)} 0 L${f(x)} -58`, SP * 0.6); const l = chochin(g, ctx.gl, x, -56, rnd, { r: 3.4, h: 7, thr: 0.05 }); ctx.live.lanterns.push(l); }
        const scr = pane(g, ctx.gl, w * 0.1, -50, w * 0.36, -30, rnd, { thr: 0.02 }); ctx.live.windows.push(scr);
        P(g, `${rect(w * 0.1, -50, w * 0.36, -30)} M${f(w * 0.12)} -30 L${f(w * 0.12)} 0 M${f(w * 0.34)} -30 L${f(w * 0.34)} 0 M${f(w * 0.16)} -36 q4 -8 8 0 q4 -6 8 0`, SP * 0.6);
    },
    // 昭和
    showa_kokubunji_pencil(ctx, w) {
        FAMILY.showa(ctx, w);
        const { g, rnd } = ctx;
        // 筆箭町工場の並び: little workshops with sawtooth roofs and lit panes
        for (let i = 0; i < 2; i++) { const a = -w * 0.48 + i * 22; P(g, `M${f(a)} -24 l6 -8 l0 8 l6 -8 l0 8 l6 -8 l0 8`, SP * 0.7); win(ctx, a + 2, -20, a + 16, -8, 'grid', { thr: 0.1 + i * 0.2 }); }
        sitter(ctx, w * 0.31, -34 + 34, { kind: 'stand', task: 'hammer', colour: '#3a5a8a', hair: 'cap' });
    },
    showa_tokyowan_kaijo(ctx, w) {
        FAMILY.showa(ctx, w);
        const { g, rnd } = ctx;
        // 丸窓団地と給水塔: round-windowed flats on the stilts, a water tower above
        for (let i = 0; i < 4; i++) roundWin(ctx, -w * 0.33 + i * w * 0.21, -82 - 10, 4.4, { thr: 0.1 + i * 0.12, sil: i % 2 ? 'sit' : null });
        S(g, oval(w * 0.32, -118, 10, 7), SP * 0.8); P(g, `M${f(w * 0.26)} -112 L${f(w * 0.24)} -86 M${f(w * 0.38)} -112 L${f(w * 0.4)} -86`, SP * 0.8);
    },
    showa_uchinoura_kumoito(ctx, w) {
        FAMILY.showa(ctx, w);
        const { g, rnd } = ctx;
        // 蓮池の蜘蛛座: a lotus pond at the foot of the tower; 方丈ステーション hut with its window lit
        ctx.live.waters.push(waterAt(ctx, -w * 0.46, -w * 0.14, -6));
        C(g, [-w * 0.4, -w * 0.3, -w * 0.2].map(x => oval(x, -6, 4, 1.4)).join(' '), '#4f7a55', SP * 0.4);
        C(g, oval(-w * 0.3, -9, 2, 2.4), '#e8a8bd', SP * 0.4);
        win(ctx, w * 0.22, -24, w * 0.38, -12, 'grid', { thr: 0.05, sil: 'sit' });
    },
    showa_banpaku_jima(ctx, w) {
        FAMILY.showa(ctx, w);
        const { g, rnd } = ctx;
        // 月面茶室の予約窓口 with a clerk; 未来の花壇 in bloom
        win(ctx, -w * 0.3, -24, -w * 0.12, -10, 'plain', { thr: 0.05, spill: true });
        sitter(ctx, -w * 0.21, -10 + 10 - 0.01, { kind: 'stand', task: 'abacus', colour: '#d9813a' });
        C(g, Array.from({ length: 8 }, (_, i) => oval(w * 0.1 + i * 5, -4 - (i % 2) * 2, 1.8, 1.8)).join(' '), '#e8b84a', SP * 0.4);
        P(g, Array.from({ length: 8 }, (_, i) => `M${f(w * 0.1 + i * 5)} 0 l0 ${f(-3 - (i % 2) * 2)}`).join(' '), SP * 0.4);
    },
    // 夢十夜回廊
    tenshu_yume_no_roka(ctx, w) {
        FAMILY.yume(ctx, w);
        const { g } = ctx;
        // 赤い日の天井 and the 文替所 window with its clerk
        C(g, oval(-w * 0.3, -66, 5, 5), '#c9482f', SP * 0.6);
        sitter(ctx, w * 0.2, -0.01, { kind: 'stand', task: 'write', colour: '#1f2a44' });
    },
    tenshu_hyakunen_yurizono(ctx, w) {
        FAMILY.yume(ctx, w);
        const { g, rnd } = ctx;
        // 暁の星の東屋: a small arbour; a gardener with the pearl-shell spoon
        posts(g, [w * 0.14, w * 0.4], -42, 0, SP);
        tileRoof(g, { x0: w * 0.08, x1: w * 0.46, eave: -42, ridge: -56, inset: 12, tile: 4.6, oni: false });
        ctx.live.lanterns.push(chochin(g, ctx.gl, w * 0.27, -40, rnd, { r: 3.6, h: 8 }));
        sitter(ctx, -w * 0.1, 0, { kind: 'stand', task: 'feed', colour: '#f2ead6' });
    },
    tenshu_unkei_no_yamamon(ctx, w) {
        FAMILY.yume(ctx, w);
        const { g } = ctx;
        // 薪の山 and 木の聞き台: a woodpile and a log on a stand being carved
        P(g, Array.from({ length: 4 }, (_, i) => `${oval(-w * 0.44 + i * 5, -3, 2.4, 2.4)} ${oval(-w * 0.42 + i * 5, -7.6, 2.4, 2.4)}`).join(' '), SP * 0.5);
        S(g, rect(w * 0.08, -24, w * 0.16, 0), SP * 0.8);
        sitter(ctx, w * 0.02, 0, { kind: 'stand', task: 'hammer', colour: '#3b3a40', hair: 'cap' });
    },
    tenshu_koi_no_ike(ctx, w) {
        FAMILY.yume(ctx, w);
        const { g } = ctx;
        // 鱗見の石 and a painter-monk washing his brush at the edge
        S(g, `M${f(w * 0.32)} -6 Q${f(w * 0.34)} -16 ${f(w * 0.42)} -14 Q${f(w * 0.46)} -8 ${f(w * 0.44)} -6Z`, SP * 0.7);
        sitter(ctx, -w * 0.36, -4, { task: 'write', colour: '#3b3a40', hair: 'cap' });
    },
    // 桜の森の満開の下
    tono_sakura_kido(ctx, w) {
        FAMILY.sakura(ctx, w);
        const { g } = ctx;
        // 停市の鐘 with its tongue tied in paper; 足袋の棚 by the gate
        P(g, `M${f(w * 0.32)} 0 L${f(w * 0.32)} -44 M${f(w * 0.28)} -44 L${f(w * 0.44)} -44 M${f(w * 0.4)} -44 l0 4`, SP * 0.9);
        S(g, `M${f(w * 0.37)} -40 L${f(w * 0.43)} -40 L${f(w * 0.44)} -30 L${f(w * 0.36)} -30Z`, SP * 0.7);
        P(g, `M${f(w * 0.39)} -30 l0 3 M${f(w * 0.38)} -28 l2 0`, SP * 0.5);
        S(g, rect(-w * 0.46, -18, -w * 0.3, 0), SP * 0.6); P(g, `M${f(-w * 0.46)} -9 l${f(w * 0.16)} 0`, SP * 0.4);
    },
    tono_sakura_hanamushiro(ctx, w) {
        FAMILY.sakura(ctx, w);
        const { g, rnd } = ctx;
        // 甘酒の釜: a sweet-sake kettle steaming at the edge of the felt
        C(g, `M${f(w * 0.4)} 0 L${f(w * 0.38)} -10 Q${f(w * 0.43)} -14 ${f(w * 0.48)} -10 L${f(w * 0.46)} 0Z`, '#5a4a3a', SP * 0.6);
        ctx.live.smokes.push(smoke(g, w * 0.43, -14, rnd, { rate: 1.4, max: 4 }));
    },
    tono_sakura_shijima(ctx, w) {
        FAMILY.sakura(ctx, w);
        // 満開の下の空き地: one person sits alone and quiet under the blossoms
        sitter(ctx, -w * 0.06, -0.01, { task: 'tea', colour: '#f2efe4', hair: 'bun' });
    },
    // 縄文
    jomon_roppon_yagura(ctx, w) {
        FAMILY.jomon(ctx, w);
        const { g, rnd } = ctx;
        // 森の暦の石輪: a ring of standing stones; 野焼きの窯場: the open firing pit, smoking
        S(g, Array.from({ length: 6 }, (_, i) => `M${f(-w * 0.48 + i * 5)} 0 L${f(-w * 0.48 + i * 5 + 0.6)} ${f(-6 - (i % 3) * 2)} L${f(-w * 0.48 + i * 5 + 3)} ${f(-5 - (i % 2) * 2)} L${f(-w * 0.48 + i * 5 + 3.4)} 0Z`).join(' '), SP * 0.6);
        ctx.live.smokes.push(smoke(g, w * 0.44, -4, rnd, { rate: 1.6, max: 5 }));
        C(g, `M${f(w * 0.38)} 0 Q${f(w * 0.44)} -6 ${f(w * 0.5)} 0Z`, '#9c5538', SP * 0.6);
    },
    jomon_hisui_kei(ctx, w) {
        FAMILY.jomon(ctx, w);
        // 大珠の研ぎ場: someone polishing a jade bead at the river stones
        sitter(ctx, w * 0.12, -2, { task: 'sew', colour: '#9c5538', hair: 'bun' });
    },
    jomon_kokuyo_no_watashi(ctx, w) {
        FAMILY.jomon(ctx, w);
        const { g } = ctx;
        // 貝の丘: the shell mound; 黒曜の検め台: obsidian laid out on a board
        C(g, Array.from({ length: 10 }, (_, i) => `M${f(w * 0.06 + i * 4)} ${f(-2 - (i % 3) * 2)} q2 -3 4 0Z`).join(' '), '#efe4d0', SP * 0.4);
        S(g, rect(-w * 0.02, -8, w * 0.04 + 2, -6), SP * 0.5);
        B(g, [0, 1, 2].map(i => `M${f(-w * 0.01 + i * 3)} -8 l1 -2.4 l1.4 2.4Z`).join(' '));
    }
};

// a train of the 時環線 that pulls into a station at night: it slows in, stands for its
// stop with lit windows and people getting on, and pulls out again (keyed, eased)
function stationTrain(ctx, x0, x1, y, { cars = 3, stop = 20 } = {}) {
    const { g, gl } = ctx;
    const tg = el('g', { style: 'display:none' }, g);
    const tgl = el('g', { style: 'display:none' }, gl);
    const CW = 30;
    const parts = Array.from({ length: cars }, (_, i) => {
        const cg = el('g', {}, tg);
        C(cg, i === 0 ? `M0 0 L0 -15 Q2 -19 10 -19 L${CW - 2} -19 L${CW} -15 L${CW} 0Z` : `M0 0 L0 -17 Q${CW / 2} -20 ${CW} -17 L${CW} 0Z`, '#1b2140', SP * 0.8);
        const wins = [];
        for (let k = 0; k < 4; k++) { const wx = 3 + k * 6.6; wins.push(el('rect', { x: f(wx), y: -14, width: 4.6, height: 5.4, fill: '#ffe2a0' }, cg)); }
        // a seated figure in some windows, as a silhouette against the light
        const sil = el('path', { d: `M${f(10)} -8.6 q0 -2.6 1.4 -3 q-1 -1.6 0.6 -2.2 q1.6 0.6 0.6 2.2 q1.4 0.4 1.4 3Z M${f(23.2)} -8.6 q0 -2.6 1.4 -3 q-1 -1.6 0.6 -2.2 q1.6 0.6 0.6 2.2 q1.4 0.4 1.4 3Z`, fill: '#3a2a26' }, cg);
        P(cg, `M2 0 l0 1.6 M${CW - 2} 0 l0 1.6`, SP * 0.6);
        const glw = el('ellipse', { rx: 20, ry: 9, fill: 'url(#e-warmglow)' }, tgl);
        return { cg, glw, sil };
    });
    let t = 0;
    const span = x1 - x0, L = cars * (CW + 2);
    return {
        draw(tt, dt, wind, Pal) {
            const on = smooth(0.35, 0.7, Pal.night);
            tg.style.display = on > 0.02 ? '' : 'none'; tgl.style.display = on > 0.02 ? '' : 'none';
            if (on <= 0.02) return;
            t += dt;
            const cyc = 9 + stop + 9 + 14, u = t % cyc;
            // in (eased to a stop), stand, out (eased from rest), then gone a while
            let x;
            if (u < 9) x = lerp(x1 + 20, x0 + span * 0.15, ease(u / 9));
            else if (u < 9 + stop) x = x0 + span * 0.15;
            else if (u < 18 + stop) x = lerp(x0 + span * 0.15, x0 - L - 30, ease((u - 9 - stop) / 9));
            else x = x1 + 400;
            tg.setAttribute('opacity', f(on)); tgl.setAttribute('opacity', f(on));
            parts.forEach((pp, i) => {
                const cx = x + i * (CW + 2);
                pp.cg.setAttribute('transform', `translate(${f(cx)} ${f(y)})`);
                pp.glw.setAttribute('cx', f(cx + CW / 2)); pp.glw.setAttribute('cy', f(y - 11));
                pp.sil.style.display = (u > 12 + i * 3 || u < 9) ? '' : 'none';       // they sit down one by one during the stop
            });
        }
    };
}

const BIG = {
    // 令和
    kokurin_hiroba(ctx, w) {
        FAMILY.reiwa(ctx, w);
        const { g, rnd } = ctx;
        // 万華鏡の石畳 and the 合作工房 open to the square, someone at a bench
        const st = []; for (let x = -w / 2 + 4; x < w / 2 - 4; x += 6) st.push(`M${f(x)} -1 l3 -1.4 l3 1.4`); P(g, st.join(' '), SP * 0.4);
        openRoom(ctx, w * 0.18, w * 0.46, -36, 'hammer', { colour: '#d9813a', hair: 'cap' });
        tileRoof(g, { x0: w * 0.15, x1: w * 0.49, eave: -36, ridge: -48, inset: 8, tile: 4.4, oni: false });
        // 憲章の算額殿: a small board hall
        S(g, rect(-w * 0.46, -30, -w * 0.24, 0), SP * 0.8);
        for (let i = 0; i < 3; i++) S(g, rect(-w * 0.44 + i * 7, -26, -w * 0.44 + i * 7 + 5.4, -18), SP * 0.45);
        tileRoof(g, { x0: -w * 0.49, x1: -w * 0.21, eave: -30, ridge: -42, inset: 8, tile: 4.4, oni: false });
        ctx.live.lanterns.push(chochin(g, ctx.gl, -w * 0.18, -34, rnd, { r: 3.6, h: 8, red: true }));
    },
    reiwa_dojima_kaisho(ctx, w) {
        FAMILY.reiwa(ctx, w);
        const { g, rnd } = ctx;
        // 大水盤の立会場: a great water basin at the foot of the tower, traders round it
        const basin = waterAt(ctx, -w * 0.3, w * 0.3, -6, 'pond');
        ctx.live.waters.push(basin);
        S(g, rect(-w * 0.32, -4, w * 0.32, 0), SP * 0.6);
        // 雷拍の拍子木櫓: a little clapper tower
        P(g, `M${f(w * 0.4)} 0 L${f(w * 0.4)} -40 M${f(w * 0.46)} 0 L${f(w * 0.46)} -40`, SP * 0.9);
        S(g, rect(w * 0.38, -46, w * 0.48, -40), SP * 0.8);
        sitter(ctx, w * 0.43, -40, { kind: 'stand', task: 'flag', scale: 0.4, colour: '#2c2a2a' });
    },
    reiwa_aozora_shoko(ctx, w) {
        FAMILY.reiwa(ctx, w);
        const { g } = ctx;
        // 昇り口の螺旋階段 up the side of the tower, a 栞雀 nest on the sill
        const sp = []; for (let y = -10; y > -140; y -= 12) sp.push(`M${f(w / 2 - 8)} ${f(y)} L${f(w / 2 + 2)} ${f(y - 6)} L${f(w / 2 - 8)} ${f(y - 12)}`); P(g, sp.join(' '), SP * 0.6);
        sitter(ctx, -w * 0.18, -0.01, { kind: 'bench', task: 'read', colour: '#3a5a8a' });
    },
    reiwa_neon_kyushigai(ctx, w) {
        FAMILY.reiwa(ctx, w);
        const { g, rnd } = ctx;
        // 蝋燭横丁: a candle alley of little lit stalls at the tower's foot; 雪見の喫茶
        for (let i = 0; i < 3; i++) { const a = -w / 2 + 6 + i * 16; S(g, rect(a, -16, a + 13, 0), SP * 0.6); win(ctx, a + 2, -14, a + 11, -6, 'plain', { thr: 0.02 + i * 0.05, sil: i === 1 ? 'sit' : null }); }
        ctx.live.lanterns.push(chochin(g, ctx.gl, -w / 2 + 28, -20, rnd, { r: 3, h: 7, red: true }));
        roundWin(ctx, w * 0.28, -60, 6, { thr: 0.1, sil: 'sit' });
    },
    reiwa_tabidachi_guchi(ctx, w) {
        FAMILY.reiwa(ctx, w);
        const { g } = ctx;
        // フジバカマの原 at the gate, and the 膝栗毛屋 counter where travellers set off
        P(g, Array.from({ length: 14 }, (_, i) => `M${f(-w / 2 + 4 + i * 3)} 0 q${f(i % 2 ? 1 : -1)} -5 0 -9`).join(' '), SP * 0.4);
        C(g, Array.from({ length: 14 }, (_, i) => oval(-w / 2 + 4 + i * 3, -9.4, 1.1, 1.1)).join(' '), '#c8a8c8', SP * 0.25);
        S(g, rect(w * 0.32, -14, w * 0.46, -10), SP * 0.7); P(g, `M${f(w * 0.33)} -10 l0 10 M${f(w * 0.45)} -10 l0 10`, SP * 0.6);
        sitter(ctx, w * 0.39, -0.01, { kind: 'stand', task: 'abacus', colour: '#7a5a3c' });
    },
    // 天守の異界
    tenshu_tomihime_no_miya(ctx, w) {
        FAMILY.tenshu(ctx, w);
        const { g, rnd } = ctx;
        // 秋の間と吊り花壇: hanging flower baskets swinging from the eaves; a lit great hall
        for (const x of [-w * 0.3, w * 0.3]) { const grp = G(g); P(grp, 'M0 0 L0 8', SP * 0.4); C(grp, 'M-4 8 Q0 13 4 8Z', '#c8a868', SP * 0.5); C(grp, `${oval(-2, 7, 1.4, 1.4)} ${oval(1.6, 6.6, 1.4, 1.4)}`, '#a24a7b', SP * 0.3); ctx.live.swing.push({ grp, x, y: -30, p: { a: 0, v: 0, ph: rnd() * 6 }, k: 10 }); }
        openRoom(ctx, -w * 0.16, w * 0.16, -24, 'sew', { colour: '#f2eee3', hair: 'bun' });
    },
    tenshu_tsuyu_rankan(ctx, w) {
        FAMILY.tenshu(ctx, w);
        const { g, rnd } = ctx;
        // 糸釣りの桟敷: a lady at the rail letting down a five-coloured thread with a dew drop
        sitter(ctx, -w * 0.3, -12, { task: 'feed', colour: '#f2eee3', hair: 'bun' });
        const cols = ['#c8403a', '#e8b84a', '#3a6a9a', '#4f7a55', '#a24a7b'];
        cols.forEach((c, i) => el('path', { d: `M${f(-w * 0.26 + i * 1.4)} -18 Q${f(-w * 0.24 + i * 2)} -6 ${f(-w * 0.25 + i * 1.6)} 0`, fill: 'none', stroke: c, 'stroke-width': 0.5 }, g));
        // 白露の瓶棚: a shelf of dew jars that catch the light
        S(g, rect(w * 0.22, -22, w * 0.44, -20.6), SP * 0.6);
        for (let i = 0; i < 4; i++) { const n = pane(g, ctx.gl, w * 0.24 + i * 5, -27, w * 0.24 + i * 5 + 3, -22, rnd, { thr: 0.05 }); n.n.setAttribute('d', `M${f(w * 0.24 + i * 5)} -22 Q${f(w * 0.235 + i * 5)} -25 ${f(w * 0.25 + i * 5)} -27 L${f(w * 0.27 + i * 5)} -27 Q${f(w * 0.285 + i * 5)} -25 ${f(w * 0.28 + i * 5)} -22Z`); ctx.live.windows.push(n); }
    },
    tenshu_bi_no_torihikijo(ctx, w) {
        const { g, rnd } = ctx;
        // 美の取引所: a white-clothed hall open to the street; three judges at their seats
        const x0 = -w * 0.44, x1 = w * 0.3;
        S(g, wallRect(x0, -54, x1, 0, 0.4));
        tileRoof(g, { x0: x0 - 10, x1: x1 + 10, eave: -54, ridge: -78, inset: 16, tile: 5.2 });
        openRoom(ctx, x0 + 4, x1 - 4, -48, 'write', { colour: '#2c2a2a', hair: 'cap', at: 0.2 });
        sitter(ctx, lerp(x0, x1, 0.5), -10, { task: 'abacus', colour: '#a24a7b', hair: 'bun' });
        sitter(ctx, lerp(x0, x1, 0.78), -10, { task: 'write', colour: '#d9be6e', hair: 'topknot' });
        S(g, rect(lerp(x0, x1, 0.3), -14, lerp(x0, x1, 0.42), -10), SP * 0.6);            // 螺鈿と雪の台
        C(g, oval(lerp(x0, x1, 0.36), -15.6, 2.6, 1.4), '#bfe3e8', SP * 0.4);
        ctx.live.lanterns.push(chochin(g, ctx.gl, x1 + 8, -48, rnd));
        sign(ctx, (x0 + x1) / 2, -70, 46, { h: 9 });
    },
    tenshu_hoshimi_no_ma(ctx, w) {
        FAMILY.tenshu(ctx, w);
        const { g } = ctx;
        // ゆらぎ星図の机: someone at the star-chart desk under the telescope
        sitter(ctx, -w * 0.3, -0.01, { kind: 'stand', task: 'write', colour: '#1b2547' });
        roundWin(ctx, w * 0.1, -46, 5, { thr: 0.05 });
    },
    tenshu_shishigashira_no_ma(ctx, w) {
        FAMILY.tenshu(ctx, w);
        const { g } = ctx;
        // 彫りかけの獅子頭たち and the 檜の木置き場: a carver at work among the half-carved heads
        sitter(ctx, -w * 0.28, -0.01, { task: 'hammer', colour: '#c49a6c', hair: 'cap' });
        for (let i = 0; i < 3; i++) { const x = -w * 0.12 + i * 9; C(g, `M${f(x - 4)} 0 L${f(x - 4)} -6 Q${f(x)} -11 ${f(x + 4)} -6 L${f(x + 4)} 0Z`, '#c49a6c', SP * 0.6); P(g, `M${f(x - 2)} -6 q2 1 4 0 M${f(x - 1)} -3 l2 0`, SP * 0.4); }
        P(g, Array.from({ length: 4 }, (_, i) => `M${f(w * 0.3)} ${f(-2 - i * 3)} L${f(w * 0.46)} ${f(-2 - i * 3)}`).join(' '), SP * 0.9);
    },
    // 銀河鉄道
    kenji_amanogawa_terminal(ctx, w) {
        FAMILY.ginga(ctx, w);
        const { g, rnd } = ctx;
        // 天気輪の柱 and the green-ticket window with its clerk
        P(g, `M${f(-w * 0.46)} 0 L${f(-w * 0.46)} -84`, SP * 1.2);
        for (let i = 0; i < 4; i++) { const n = pane(g, ctx.gl, -w * 0.46 - 2, -82 + i * 10, -w * 0.46 + 2, -78 + i * 10, rnd, { thr: 0, lateOff: 9 }); ctx.live.windows.push(n); }
        win(ctx, w * 0.26, -40, w * 0.4, -28, 'plain', { thr: 0.02, sil: 'sit' });
        S(g, rect(w * 0.24, -42, w * 0.42, -26), SP * 0.7);
        ctx.live.trains.push(stationTrain(ctx, -w / 2, w / 2, -10, { cars: 3, stop: 18 }));
        // waiting passengers on the bench
        sitter(ctx, -w * 0.2, -10, { kind: 'bench', task: 'read', colour: '#2f5bd3' });
    },
    kenji_hakucho_teishaba(ctx, w) {
        FAMILY.ginga(ctx, w);
        const { g, rnd } = ctx;
        // 二十分停車の大時計: the great clock on its post with the sign hanging under it
        P(g, `M${f(w * 0.38)} 0 L${f(w * 0.38)} -76`, SP * 1.2);
        ctx.live.dials.push(kokuDial(g, w * 0.38, -86, 10));
        const sg = G(g);
        P(sg, 'M-6 0 L-6 4 M6 0 L6 4', SP * 0.5);
        S(sg, rect(-9, 4, 9, 13), SP * 0.7);
        text(sg, 0, 8.5, '二十分停車', 2.9, { weight: 700 });
        ctx.live.swing.push({ grp: sg, x: w * 0.38, y: -76, p: { a: 0, v: 0, ph: rnd() * 6 }, k: 8 });
        ctx.live.trains.push(stationTrain(ctx, -w / 2, w / 2, -10, { cars: 4, stop: 20 }));
        // 水晶細工の銀杏: a crystal ginkgo glinting
        const n = pane(g, ctx.gl, -w * 0.44, -46, -w * 0.3, -30, rnd, { thr: 0.02 }); n.n.setAttribute('d', `M${f(-w * 0.37)} -30 L${f(-w * 0.44)} -40 Q${f(-w * 0.37)} -50 ${f(-w * 0.3)} -40Z`); ctx.live.windows.push(n);
        P(g, `M${f(-w * 0.37)} -30 L${f(-w * 0.37)} -10 ${n.n.getAttribute('d')}`, SP * 0.7);
        sitter(ctx, -w * 0.12, -10, { kind: 'stand', task: 'read', colour: '#9fc3e8' });
    },
    kenji_pliocene_kaigan(ctx, w) {
        FAMILY.ginga(ctx, w);
        const { g } = ctx;
        // 大学士の発掘場: the professor digging in the crystal sand
        sitter(ctx, w * 0.24, -10, { task: 'hammer', colour: '#5e6b2a', hair: 'cap' });
        S(g, `M${f(w * 0.3)} -10 Q${f(w * 0.36)} -16 ${f(w * 0.44)} -10Z`, SP * 0.6);
        ctx.live.trains.push(stationTrain(ctx, -w / 2, w / 2, -10, { cars: 3, stop: 14 }));
    },
    kenji_albireo_kansokujo(ctx, w) {
        FAMILY.ginga(ctx, w);
        const { g, rnd } = ctx;
        // 青宝玉と黄玉の球: the two spheres turning slowly over the observatory
        const sph = G(g);
        C(sph, oval(-5, 0, 4.4, 4.4), '#2f5bd3', SP * 0.6); C(sph, oval(5, 0, 4.4, 4.4), '#f2b33d', SP * 0.6);
        ctx.live.spinners.push({ g: sph, x: w * 0.26, y: -94, a: 0, speed: 0.4 });
        sitter(ctx, -w * 0.24, -10, { task: 'write', colour: '#0e1636', hair: 'cap' });
    }
};

// ------------------------------------------------------------------ the dressing pass
// Every district should show: someone at their work, a light for the night, something
// that swings in the wind, and a couple of props that say who lives there. This tops up
// whatever a district's own drawing left out, in the manner of its era.
const PROPS = {
    jomon: ['pots', 'cords', 'baskets'], heian: ['ox-cart-wheel', 'screens', 'pots'], hiraizumi: ['gold-boxes', 'baskets', 'barrels'],
    sengoku: ['barrels', 'crates', 'pots'], meiji: ['crates', 'bicycle', 'pots'], taisho: ['bicycle', 'crates', 'flowerpots'],
    showa: ['bicycle', 'crates', 'flowerpots'], reiwa: ['flowerpots', 'crates', 'bicycle'], ginga: ['crates', 'baskets', 'flowerpots'],
    ihatov: ['baskets', 'barrels', 'flowerpots'], tono: ['baskets', 'barrels', 'pots'], sakura: ['baskets', 'pots', 'flowerpots'],
    ryugu: ['shells', 'pots', 'baskets'], tsuki: ['pots', 'baskets', 'flowerpots'], tenshu: ['screens', 'pots', 'flowerpots'], yume: ['pots', 'screens', 'baskets']
};
const TASK = { jomon: 'sew', heian: 'write', hiraizumi: 'hammer', sengoku: 'hammer', meiji: 'write', taisho: 'sew', showa: 'hammer', reiwa: 'write', ginga: 'read', ihatov: 'write', tono: 'sew', sakura: 'tea', ryugu: 'abacus', tsuki: 'pour', tenshu: 'sew', yume: 'write' };
function prop(g, kind, x, rnd) {
    switch (kind) {
        case 'pots': C(g, `M${f(x - 3)} 0 Q${f(x - 5)} -4 ${f(x - 2)} -8 L${f(x + 2)} -8 Q${f(x + 5)} -4 ${f(x + 3)} 0Z M${f(x + 6)} 0 Q${f(x + 4.6)} -3 ${f(x + 7)} -5 L${f(x + 9)} -5 Q${f(x + 11)} -3 ${f(x + 10)} 0Z`, '#9c5538', SP * 0.6); break;
        case 'cords': P(g, Array.from({ length: 4 }, (_, i) => `M${f(x + i * 2.4)} -14 q1 6 0 12 m-1 -6 l2 0`).join(' '), SP * 0.5); P(g, `M${f(x - 2)} -14 L${f(x + 10)} -14`, SP * 0.8); break;
        case 'baskets': C(g, `M${f(x - 4)} -7 L${f(x + 4)} -7 L${f(x + 3)} 0 L${f(x - 3)} 0Z`, '#c8a868', SP * 0.6); P(g, `M${f(x - 3.6)} -4.6 l7.2 0 M${f(x - 3.3)} -2.3 l6.6 0`, SP * 0.35); break;
        case 'barrels': barrel(g, x); barrel(g, x + 9, 8, 8); break;
        case 'crates': S(g, rect(x - 5, -8, x + 5, 0), SP * 0.6); S(g, rect(x - 3, -15, x + 4, -8), SP * 0.6); P(g, `M${f(x - 5)} -4 l10 0 M${f(x - 3)} -11.5 l7 0`, SP * 0.35); break;
        case 'bicycle': P(g, `${oval(x - 6, -4, 4, 4)} ${oval(x + 6, -4, 4, 4)} M${f(x - 6)} -4 L${f(x - 1)} -10 L${f(x + 6)} -4 M${f(x - 1)} -10 L${f(x + 4)} -10 L${f(x + 6)} -4 M${f(x - 2)} -12 l3 0 M${f(x + 4)} -10 l0 -3 l2 0`, SP * 0.55); break;
        case 'flowerpots': for (let i = 0; i < 2; i++) { const px = x + i * 8; S(g, `M${f(px - 3)} 0 L${f(px - 3.6)} -5 L${f(px + 3.6)} -5 L${f(px + 3)} 0Z`, SP * 0.6); P(g, `M${f(px)} -5 q-2 -4 0 -8 M${f(px)} -6 q3 -3 2 -6`, SP * 0.45); C(g, `${oval(px, -13.4, 1.6, 1.6)} ${oval(px + 2, -12, 1.4, 1.4)}`, i ? '#e8b84a' : '#c8403a', SP * 0.3); } break;
        case 'gold-boxes': C(g, `${rect(x - 4, -6, x + 4, 0)} ${rect(x - 2.6, -11, x + 3, -6)}`, '#d9be6e', SP * 0.6); break;
        case 'ox-cart-wheel': S(g, oval(x, -9, 9, 9), SP * 0.8); P(g, `${oval(x, -9, 2, 2)} ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `M${f(x + Math.cos(a) * 2)} ${f(-9 + Math.sin(a) * 2)} L${f(x + Math.cos(a) * 8)} ${f(-9 + Math.sin(a) * 8)}`; }).join(' ')}`, SP * 0.45); break;
        case 'screens': for (let i = 0; i < 3; i++) S(g, rect(x - 9 + i * 6, -14, x - 3.6 + i * 6, 0), SP * 0.55); break;
        case 'shells': C(g, Array.from({ length: 4 }, (_, i) => `M${f(x + i * 4)} 0 q2 -3.4 4 0Z`).join(' '), '#efe4d0', SP * 0.4); break;
        default: break;
    }
}
function dress(entry, ctx, before) {
    const { g, rnd } = ctx, w = entry.w, fam = entry.family;
    const L = ctx.live;
    const ox = -w / 2 + 14;                               // the near-left corner of the frontage
    // someone at their work, in front of the building, on a mat or a bench
    if (L.sitters.length === before.sit) {
        C(g, rect(ox - 8, -1.4, ox + 18, 0), ['#c8403a', '#c8a868', '#34507a'][Math.floor(rnd() * 3)], SP * 0.5);
        sitter(ctx, ox + 2, -1.4, { task: TASK[fam] || 'write', dir: 1 });
    }
    // a light for the night: a hanging lantern (or a lamp in the later eras)
    if (L.lanterns.length === before.l && L.lamps.length === before.m) {
        if (['meiji', 'taisho', 'showa', 'reiwa', 'ginga'].includes(fam)) L.lamps.push(lamp(g, ctx.gl, w / 2 - 8, -46, rnd, { kind: fam === 'meiji' || fam === 'taisho' ? 'gas' : 'post' }));
        else L.lanterns.push(chochin(g, ctx.gl, w / 2 - 10, -36, rnd, { r: 3.6, h: 8, red: rnd() < 0.5 }));
        P(g, `M${f(w / 2 - 14)} -40 L${f(w / 2 - 6)} -40`, SP * 0.7);
    }
    // something in the wind: a small hanging sign (or a wind-chime in the old places)
    if (L.swing.length + L.banners.length + L.norens.length === before.sw) {
        const grp = G(g);
        P(grp, 'M-3 0 L-3 3 M3 0 L3 3', SP * 0.4);
        if (['meiji', 'taisho', 'showa', 'reiwa', 'ginga'].includes(fam)) { S(grp, rect(-6, 3, 6, 10), SP * 0.6); P(grp, 'M-4 6.5 l8 0', SP * 0.4); }
        else { C(grp, 'M-2.4 3 Q-3 8 0 9 Q3 8 2.4 3Z', '#3a6a9a', SP * 0.5); P(grp, 'M0 9 L0 14', SP * 0.35); S(grp, rect(-1.4, 14, 1.4, 18), SP * 0.35); }
        L.swing.push({ grp, x: ox + 26, y: -44, p: { a: 0, v: 0, ph: rnd() * 6 }, k: 11 });
        P(g, `M${f(ox + 20)} -44 L${f(ox + 32)} -44`, SP * 0.7);
    }
    // two props that say who lives here
    const kinds = PROPS[fam] || ['pots', 'baskets'];
    prop(g, kinds[Math.floor(rnd() * kinds.length)], w / 2 - 26, rnd);
    prop(g, kinds[Math.floor(rnd() * kinds.length)], -w / 2 + 34 + (L.sitters.length === before.sit ? 0 : 0), rnd);
}

function buildEdo(ctx, w) {
    const fn = EDO[ctx.d.id];
    if (fn) return fn(ctx, w);
    machiya(ctx, -w / 2 + 6, w / 2 - 6, { task: ctx.pick(['abacus', 'sew', 'write']), noren: ctx.pick(['#34507a', '#7a2e3a', '#4f6b55']) });
    sign(ctx, 0, -120, 60);
}

// ------------------------------------------------------------------ the other eras and realms

function pitHouse(ctx, x, w, h) {
    const { g, rnd } = ctx;
    thatchRoof(g, { x0: x - w / 2, x1: x + w / 2, eave: -2, ridge: -h, inset: w * 0.42, round: 0.9, rnd });
    S(g, `M${f(x - 6)} 0 L${f(x - 5)} -16 Q${f(x)} -19 ${f(x + 5)} -16 L${f(x + 6)} 0Z`, SP * 0.8);
    B(g, `M${f(x - 3.6)} 0 L${f(x - 3)} -12 Q${f(x)} -14 ${f(x + 3)} -12 L${f(x + 3.6)} 0Z`);
    ctx.live.windows.push(pane(ctx.g, ctx.gl, x - 3, -12, x + 3, -1, rnd, { thr: 0.05 }));
    ctx.live.smokes.push(smoke(g, x, -h - 2, rnd, { rate: 0.9 }));
}

const FAMILY = {
    jomon(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '櫓')) {
            // six chestnut pillars, three decks, knotted cords hanging from the beams
            const xs = [-30, -18, -6, 6, 18, 30].map(x => x * (w / 150));
            P(g, xs.map(x => `M${f(x)} 0 Q${f(x + 0.8)} -60 ${f(x * 0.92)} -128`).join(' '), SP * 1.6);
            for (const y of [-42, -84, -124]) { S(g, rect(xs[0] - 6, y - 3, xs[5] + 6, y), SP); }
            for (let i = 0; i < 12; i++) { const x = lerp(xs[0], xs[5], i / 11), y = i % 2 ? -84 : -42; P(g, `M${f(x)} ${f(y)} Q${f(x + 0.6)} ${f(y + 10)} ${f(x)} ${f(y + 18)} m-1 -6 l2 0 m-2 -5 l2 0`, SP * 0.45); }
            thatchRoof(g, { x0: xs[0] - 10, x1: xs[5] + 10, eave: -126, ridge: -146, inset: 14, rnd });
            sign(ctx, xs[5] + 4, -36, 10, { vertical: true, h: 40, colour: '#b3261e', light: true });
        } else if (has(d, '渡し')) {
            ctx.live.waters.push(waterAt(ctx, -w / 2 + 4, w / 2 - 4, -6));
            S(g, `M${f(-w * 0.3)} -8 Q${f(-w * 0.32)} -2 ${f(-w * 0.2)} -2 L${f(w * 0.1)} -2 Q${f(w * 0.2)} -2 ${f(w * 0.18)} -8Z`, SP * 0.9);
            P(g, `M${f(-w * 0.05)} -8 L${f(-w * 0.15)} -50`, SP * 0.9);
            pitHouse(ctx, w * 0.3, 46, 40);
            sign(ctx, -w * 0.3, -40, 10, { vertical: true, h: 30 });
        } else {
            pitHouse(ctx, -w * 0.16, 64, 52);
            if (has(d, '渓')) { ctx.live.waters.push(waterAt(ctx, w * 0.08, w / 2 - 4, -5)); for (let i = 0; i < 4; i++) C(g, oval(w * 0.16 + i * 10, -5, 4, 3), '#78b596', SP * 0.6); }
            else { for (let i = 0; i < 2; i++) { roundTree(g, w * 0.16 + i * 22, 70 + i * 10, rnd); C(g, `M${f(w * 0.16 + i * 22 - 1.6)} -30 l3.2 0 l0 3 l-3.2 0Z`, '#b3261e', SP * 0.4); } }
            sign(ctx, -w * 0.16 + 38, -36, 10, { vertical: true, h: 34 });
        }
    },
    heian(ctx, w) {
        const { g, rnd, d } = ctx;
        const red = '#b3412d';
        if (has(d, '漏刻')) {
            // the water clock: four stepped tanks pouring down, and a hall behind
            for (let i = 0; i < 4; i++) { const x = -w * 0.34 + i * 14, y = -70 + i * 16; S(g, rect(x, y, x + 12, y + 12), SP * 0.8); P(g, `M${f(x + 12)} ${f(y + 8)} q3 0 3 6`, SP * 0.5); P(g, `M${f(x + 1)} 0 L${f(x + 1)} ${f(y + 12)} M${f(x + 11)} 0 L${f(x + 11)} ${f(y + 12)}`, SP * 0.5); }
            ctx.live.dials.push(kokuDial(g, -w * 0.34 + 66, -26, 8));
        } else if (has(d, '天文台')) {
            S(g, rect(-w * 0.4, -40, -w * 0.06, 0));
            P(g, `${oval(-w * 0.23, -60, 16, 16)} ${oval(-w * 0.23, -60, 16, 6)} M${f(-w * 0.23)} -76 L${f(-w * 0.23)} -40`, SP * 0.8);
        } else if (has(d, '水路')) {
            ctx.live.waters.push(waterAt(ctx, -w / 2 + 6, -w * 0.02, -6));
            P(g, `M${f(-w * 0.42)} -4 Q${f(-w * 0.22)} -22 ${f(-w * 0.04)} -4`, SP * 1.1);
            C(g, `M${f(-w * 0.42)} -8 Q${f(-w * 0.22)} -26 ${f(-w * 0.04)} -8 L${f(-w * 0.04)} -10 Q${f(-w * 0.22)} -28 ${f(-w * 0.42)} -10Z`, red, SP * 0.6);
        } else if (has(d, '桑')) {
            for (let i = 0; i < 3; i++) roundTree(g, -w * 0.38 + i * 18, 50, rnd);
        } else if (has(d, '宝庫')) {
            // azekura: a log storehouse on tall stilts
            posts(g, [-w * 0.38, -w * 0.22, -w * 0.06], -20, 0, SP * 1.4);
            S(g, rect(-w * 0.42, -60, -w * 0.02, -20));
            const logs = []; for (let y = -58; y < -20; y += 4) logs.push(`M${f(-w * 0.42)} ${f(y)} l${f(w * 0.4)} 0`); P(g, logs.join(' '), SP * 0.4);
            tileRoof(g, { x0: -w * 0.48, x1: w * 0.04, eave: -60, ridge: -82, inset: 16 });
        }
        // a shinden hall on a raised floor: vermilion posts, blinds, railings, a deep roof
        const x0 = has(d, '漏刻', '天文台', '水路', '桑', '宝庫') ? w * 0.04 : -w * 0.42, x1 = w * 0.44;
        S(g, rect(x0, -14, x1, -10));
        const pp = []; for (let x = x0 + 4; x < x1; x += (x1 - x0) / 4) pp.push(x);
        pp.forEach(x => C(g, rect(x - 1.6, -56, x + 1.6, 0), red, SP * 0.7));
        for (let i = 0; i < pp.length - 1; i++) {
            const a = pp[i] + 2, b = pp[i + 1] - 2;
            win(ctx, a, -50, b, -16, 'plain');
            const sl = []; for (let y = -48; y < -16; y += 2.2) sl.push(`M${f(a)} ${f(y)} L${f(b)} ${f(y)}`); P(g, sl.join(' '), SP * 0.28);
        }
        P(g, `M${f(x0 - 4)} -22 L${f(x1 + 4)} -22 M${f(x0 - 4)} -18 L${f(x1 + 4)} -18`, SP * 0.8);
        tileRoof(g, { x0: x0 - 16, x1: x1 + 16, eave: -56, ridge: -90, inset: 26, sori: 4, tile: 6.4, fill: null });
        sign(ctx, (x0 + x1) / 2, -74, Math.min(56, x1 - x0 - 30), { h: 10 });
        ctx.live.lanterns.push(chochin(g, ctx.gl, x1 - 4, -54, rnd));
    },
    hiraizumi(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '光堂')) {
            // the golden hall: gold walls, gold posts, a pyramidal roof with a jewel finial
            C(g, rect(-w * 0.3, -60, w * 0.3, 0), GOLD);
            posts(g, [-w * 0.3 + 3, -w * 0.1, w * 0.1, w * 0.3 - 3], -60, 0, SP * 1.2);
            win(ctx, -w * 0.08, -50, w * 0.08, -6, 'grid', { thr: 0.02, lateOff: 9 });
            C(g, `M${f(-w * 0.44)} -58 Q0 -62 ${f(w * 0.44)} -58 L${f(w * 0.06)} -96 L${f(-w * 0.06)} -96Z`, '#d9be6e');
            B(g, oval(0, -100, 3, 4));
            ctx.live.mirrors.push({ n: null, glow: el('ellipse', { cx: 0, cy: -40, rx: w * 0.4, ry: 50, fill: 'url(#e-sunglow2)', opacity: 0 }, ctx.gl) });
            sign(ctx, 0, -80, 34, { h: 9 });
        } else if (has(d, '港', '川')) {
            ctx.live.waters.push(waterAt(ctx, -w / 2 + 4, w * 0.1, -6));
            C(g, `M${f(-w * 0.36)} -6 L${f(-w * 0.32)} -12 L${f(w * 0.02)} -12 L${f(w * 0.06)} -6Z`, '#8a5a36');
            C(g, `M${f(-w * 0.16)} -12 L${f(-w * 0.16)} -60 L${f(-w * 0.02)} -20Z`, '#efe4c0', SP * 0.6);
            machiya(ctx, w * 0.12, w / 2 - 2, { task: 'abacus', noren: '#c9a23a', label: '金', storeys: 1 });
            sign(ctx, w * 0.3, -86, 40, { h: 10 });
        } else if (has(d, '丘', '谷')) {
            P(g, `M${f(-w / 2)} 0 Q${f(-w * 0.1)} -46 ${f(w / 2)} -8`, SP);
            pine(g, -w * 0.1, 80, rnd);
            const glints = []; for (let i = 0; i < 14; i++) glints.push(oval(rnd(-w * 0.4, w * 0.4), -rnd(2, 20), 1, 1));
            C(g, glints.join(' '), GOLD, SP * 0.3);
            sign(ctx, w * 0.3, -40, 10, { vertical: true, h: 34 });
        } else {
            const m = machiya(ctx, -w / 2 + 4, w / 2 - 4, { task: 'hammer', noren: '#c9a23a', label: '箔', storeys: 1 });
            for (let i = 0; i < 3; i++) ctx.live.banners.push(banner(g, lerp(-w / 2 + 14, w / 2 - 20, i / 2), -50, 0, 8, GOLD, rnd));
            sign(ctx, 0, m.eave - 12, 70, { h: 11 });
        }
    },
    sengoku(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '自鳴鐘')) {
            // a clock tower with a bell, a western dial on a Japanese tower
            S(g, rect(-22, -110, 22, 0));
            ctx.live.dials.push(kokuDial(g, 0, -80, 13));
            tileRoof(g, { x0: -34, x1: 34, eave: -110, ridge: -132, inset: 14 });
            S(g, `M-7 -132 Q0 -150 7 -132Z`, SP * 0.8);
            win(ctx, -8, -46, 8, -20, 'arch');
            machiya(ctx, 26, w / 2 - 2, { task: 'hammer', storeys: 1, inner: true, noren: '#2f4d5c' });
            sign(ctx, 0, -60, 30, { h: 9 });
        } else if (has(d, '楽市')) {
            // open market stalls with awnings, and a castle keep beyond them
            const kx = -w * 0.2;
            S(g, rect(kx - 22, -120, kx + 22, -70), SP * 0.6);
            tileRoof(g, { x0: kx - 30, x1: kx + 30, eave: -118, ridge: -134, inset: 14, tile: 5, rafters: false });
            tileRoof(g, { x0: kx - 22, x1: kx + 22, eave: -134, ridge: -148, inset: 10, tile: 4.6, rafters: false });
            for (let i = 0; i < 3; i++) {
                const x0 = -w / 2 + 6 + i * (w - 12) / 3, x1 = x0 + (w - 12) / 3 - 6;
                S(g, rect(x0 + 2, -18, x1 - 2, -14), SP * 0.7);
                posts(g, [x0 + 3, x1 - 3], -44, 0);
                C(g, `M${f(x0 - 2)} -40 L${f(x1 + 2)} -40 L${f(x1)} -48 L${f(x0)} -48Z`, ['#b3412d', '#efe4c0', '#2f4d5c'][i], SP * 0.7);
                for (let k = 0; k < 3; k++) S(g, oval(x0 + 8 + k * 7, -20, 3, 2.4), SP * 0.5);
            }
            sitter(ctx, -w / 2 + 30, 0, { kind: 'stand', task: 'pour' });
            sign(ctx, w * 0.3, -66, 46, { h: 10 });
        } else if (has(d, '灰吹き')) {
            S(g, `M${f(-w * 0.42)} 0 Q${f(-w * 0.3)} -60 ${f(-w * 0.08)} -70 Q${f(w * 0.1)} -60 ${f(w * 0.12)} 0Z`);
            B(g, `M${f(-w * 0.22)} 0 L${f(-w * 0.21)} -22 Q${f(-w * 0.16)} -28 ${f(-w * 0.11)} -22 L${f(-w * 0.1)} 0Z`);
            S(g, rect(w * 0.18, -34, w * 0.36, 0));
            P(g, `M${f(w * 0.24)} -34 L${f(w * 0.24)} -60 M${f(w * 0.3)} -34 L${f(w * 0.3)} -60`, SP);
            ctx.live.smokes.push(smoke(g, w * 0.27, -62, rnd, { rate: 1.6, max: 6 }));
            ctx.live.windows.push(pane(g, ctx.gl, w * 0.22, -16, w * 0.32, -4, rnd, { thr: 0, lateOff: 9 }));
            sign(ctx, w * 0.27, -74, 10, { vertical: true, h: 0 });
        } else {
            const m = machiya(ctx, -w / 2 + 4, w / 2 - 4, { task: has(d, '鍛冶') ? 'hammer' : 'write', noren: has(d, '銀') ? '#a8adb5' : '#2f4d5c', label: has(d, '銀') ? '活字' : '螺子', storeys: has(d, '銀') ? 2 : 1, upper: 'shoji' });
            if (has(d, '鍛冶')) { ctx.live.smokes.push(smoke(g, w / 2 - 22, m.ridge + 4, rnd, { rate: 1.4 })); P(g, `M${f(w / 2 - 24)} ${f(m.ridge + 18)} l0 -14 M${f(w / 2 - 20)} ${f(m.ridge + 18)} l0 -14`, SP * 0.8); }
            if (has(d, '銀')) { P(g, `M${f(-w / 2 + 10)} ${f(-m.H1 - 2)} L${f(w / 2 - 10)} ${f(-m.H1 - 2)} M${f(-w / 2 + 10)} ${f(-m.H1 - 10)} L${f(w / 2 - 10)} ${f(-m.H1 - 10)}`, SP * 0.6); const bal = []; for (let x = -w / 2 + 12; x < w / 2 - 10; x += 4) bal.push(`M${f(x)} ${f(-m.H1 - 10)} l0 8`); P(g, bal.join(' '), SP * 0.4); }
            sign(ctx, 0, m.eave - 14, 60, { h: 11 });
        }
    },
    meiji(ctx, w) {
        const { g, rnd, d } = ctx;
        const brickC = '#b06a4a';
        if (has(d, '凌雲閣')) {
            // a tall octagonal brick tower, narrowing floor by floor, an observation deck on top
            let y = 0, half = w * 0.26;
            for (let i = 0; i < 10; i++) {
                const hh = 18 - i * 0.4, nh = half * 0.97;
                C(g, `M${f(-half)} ${f(y)} L${f(-nh)} ${f(y - hh)} L${f(nh)} ${f(y - hh)} L${f(half)} ${f(y)}Z`, brickC, SP * 0.7);
                win(ctx, -4, y - hh + 4, 4, y - 4, 'arch', { thr: 0.1 + i * 0.04 });
                y -= hh; half = nh;
            }
            C(g, `M${f(-half - 4)} ${f(y)} L${f(half + 4)} ${f(y)} L${f(half)} ${f(y - 14)} L${f(-half)} ${f(y - 14)}Z`, '#efe4c0', SP * 0.7);
            P(g, `M0 ${f(y - 14)} Q2 ${f(y - 26)} 0 ${f(y - 34)}`, SP);
            ctx.live.lamps.push(lamp(g, ctx.gl, w * 0.36, -56, rnd));
            sign(ctx, -w * 0.36, -60, 10, { vertical: true, h: 46, colour: '#2c2a2a', light: true });
        } else if (has(d, '烏の丘')) {
            P(g, `M${f(-w / 2)} 0 Q0 -50 ${f(w / 2)} -2`, SP);
            P(g, `M${f(-w * 0.1)} -36 L${f(-w * 0.1)} -110 M${f(-w * 0.1 - 16)} -96 L${f(-w * 0.1 + 16)} -96`, SP * 1.2);
            ctx.live.perches.push({ x0: -w * 0.1 - 14, x1: -w * 0.1 + 14, y: -96 });
            S(g, rect(w * 0.12, -64, w * 0.4, -24));
            tileRoof(g, { x0: w * 0.08, x1: w * 0.44, eave: -64, ridge: -80, inset: 10, tile: 5 });
            win(ctx, w * 0.18, -56, w * 0.34, -34, 'sash');
            sign(ctx, w * 0.26, -94, 36, { h: 9 });
        } else {
            // brick front with arched windows, a cornice, gas lamps along the pavement
            const tall = has(d, '工場') ? 70 : 92, x0 = -w / 2 + 4, x1 = w / 2 - 4;
            C(g, wallRect(x0, -tall, x1, 0, 0.4), brickC, SP);
            brick(g, x0, -tall, x1, 0, rnd);
            const n = Math.max(2, Math.floor((x1 - x0) / 24));
            for (let r = 0; r < (tall > 80 ? 2 : 1); r++) for (let i = 0; i < n; i++) {
                const a = lerp(x0 + 10, x1 - 22, i / Math.max(1, n - 1)), y = -tall + 12 + r * 40;
                if (r === 1 && i === Math.floor(n / 2)) { S(g, `M${f(a - 2)} 0 L${f(a - 2)} -24 Q${f(a + 6)} -32 ${f(a + 14)} -24 L${f(a + 14)} 0Z`, SP * 0.9); continue; }
                win(ctx, a, y, a + 12, y + 24, 'arch');
            }
            S(g, rect(x0 - 3, -tall - 6, x1 + 3, -tall), SP);
            if (has(d, '工場')) tileRoof(g, { x0: x0 - 6, x1: x1 + 6, eave: -tall - 4, ridge: -tall - 26, inset: 18 });
            ctx.live.lamps.push(lamp(g, ctx.gl, x1 + 6 - w, -50, rnd));
            ctx.live.lamps.push(lamp(g, ctx.gl, x1 - 8, -50, rnd));
            sign(ctx, 0, -tall - 18, Math.min(80, w - 30), { h: 11, colour: '#2c2a2a', light: true });
        }
    },
    taisho(ctx, w) {
        const { g, rnd, d } = ctx;
        const x0 = -w / 2 + 6, x1 = w / 2 - 6, H = 76;
        // wooden western-style front: clapboard, sash windows, a bay window and a pediment
        S(g, wallRect(x0, -H, x1, 0, 0.5));
        const cl = []; for (let y = -H + 5; y < 0; y += 4.4) cl.push(`M${f(x0)} ${f(y)} L${f(x1)} ${f(y)}`); P(g, cl.join(' '), SP * 0.3);
        win(ctx, x0 + 10, -H + 12, x0 + 30, -H + 38, 'sash');
        win(ctx, x1 - 30, -H + 12, x1 - 10, -H + 38, 'sash');
        S(g, `M${f(-10)} 0 L${f(-10)} -34 L${f(10)} -34 L${f(10)} 0Z`, SP * 0.9);
        win(ctx, -7, -31, 7, -20, 'grid', { thr: 0.05 });
        tileRoof(g, { x0: x0 - 6, x1: x1 + 6, eave: -H - 2, ridge: -H - 26, inset: 22, tile: 6, oni: false });
        S(g, `M${f(-20)} ${f(-H - 2)} L0 ${f(-H - 18)} L20 ${f(-H - 2)}Z`, SP * 0.9);
        if (has(d, '天気')) {
            P(g, `M${f(x1 - 14)} ${f(-H - 14)} L${f(x1 - 14)} ${f(-H - 56)}`, SP);
            const cups = G(g);
            P(cups, `M-10 0 L10 0 M0 -10 L0 10`, SP * 0.7);
            for (const [cx, cy] of [[-10, 0], [10, 0], [0, -10], [0, 10]]) S(cups, oval(cx, cy, 2.2, 1.6), SP * 0.5);
            ctx.live.spinners.push({ g: cups, x: x1 - 14, y: -H - 56, a: 0 });
        } else if (has(d, '無線')) {
            P(g, `M${f(x0 + 10)} ${f(-H - 6)} L${f(x0 + 10)} ${f(-H - 60)} M${f(x1 - 10)} ${f(-H - 6)} L${f(x1 - 10)} ${f(-H - 60)} M${f(x0 + 10)} ${f(-H - 56)} Q0 ${f(-H - 48)} ${f(x1 - 10)} ${f(-H - 56)}`, SP * 0.7);
            for (let i = 0; i < 3; i++) ctx.live.banners.push(banner(g, x0 + 30 + i * 22, -H + 46, 0, 7, ['#7a2e3a', '#6a4a8a', '#c9a23a'][i], rnd));
        } else if (has(d, '雪の手紙')) {
            C(g, `M${f(x1 + 2)} 0 L${f(x1 + 2)} -22 Q${f(x1 + 7)} -28 ${f(x1 + 12)} -22 L${f(x1 + 12)} 0Z`, '#b3412d');
            P(g, `M${f(x1 + 4)} -16 l6 0`, SP * 0.7);
        } else {
            for (let i = 0; i < 4; i++) P(g, `M${f(x1 + 2 + i * 0)} 0`, SP);
            roundTree(g, x1 + 2, 54, rnd);
        }
        ctx.live.lamps.push(lamp(g, ctx.gl, x0 - 2, -48, rnd));
        sign(ctx, 0, -H + 2, Math.min(78, w - 70), { h: 10 });
    },
    showa(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, 'ペンシル')) {
            const rk = (x, h) => { S(g, `M${f(x - 2.4)} -10 L${f(x - 2.4)} ${f(-h)} L${f(x)} ${f(-h - 6)} L${f(x + 2.4)} ${f(-h)} L${f(x + 2.4)} -10Z`, SP * 0.7); C(g, `M${f(x - 2.4)} -10 L${f(x - 5)} -4 L${f(x + 5)} -4 L${f(x + 2.4)} -10Z`, '#d9813a', SP * 0.5); };
            P(g, `M${f(-w * 0.4)} 0 L${f(-w * 0.1)} -70 M${f(-w * 0.32)} 0 L${f(-w * 0.04)} -66`, SP);
            for (let i = 0; i < 5; i++) rk(-w * 0.1 + i * 9, 30 + i * 2);
            S(g, rect(w * 0.18, -34, w * 0.44, 0));
            win(ctx, w * 0.22, -28, w * 0.4, -16, 'grid');
            sign(ctx, w * 0.31, -46, 46, { h: 10 });
        } else if (has(d, '海上')) {
            ctx.live.waters.push(waterAt(ctx, -w / 2 + 2, w / 2 - 2, -8));
            posts(g, [-w * 0.36, -w * 0.12, w * 0.12, w * 0.36], -40, 0, SP * 1.3);
            S(g, rect(-w * 0.44, -76, w * 0.44, -40));
            for (let i = 0; i < 5; i++) win(ctx, -w * 0.4 + i * w * 0.17, -70, -w * 0.4 + i * w * 0.17 + w * 0.12, -48, 'sash');
            S(g, oval(0, -80, w * 0.2, 6), SP * 0.8);
            sign(ctx, 0, -98, 50, { h: 10 });
        } else if (has(d, '蜘蛛糸')) {
            const d1 = []; for (let y = 0; y > -200; y -= 14) d1.push(`M${f(-12 + y * 0.03)} ${f(y)} L${f(12 - y * 0.03)} ${f(y - 14)} M${f(12 - y * 0.03)} ${f(y)} L${f(-12 + y * 0.03)} ${f(y - 14)}`);
            P(g, `M-14 0 L-6 -200 M14 0 L6 -200 ${d1.join(' ')}`, SP * 0.6);
            P(g, `M0 -200 L0 -300`, SP * 0.4);
            S(g, rect(-6, -60, 6, -48), SP * 0.6);
            ctx.live.lamps.push(lamp(g, ctx.gl, 0, -204, rnd, { kind: 'post', tint: '#ff9a7a', thr: 0.05 }));
            S(g, rect(w * 0.18, -30, w * 0.42, 0));
            sign(ctx, w * 0.3, -44, 40, { h: 10 });
        } else {
            S(g, `M${f(-w * 0.42)} 0 L${f(-w * 0.42)} -30 Q${f(-w * 0.2)} -90 0 -92 Q${f(w * 0.2)} -90 ${f(w * 0.06)} -30 L${f(w * 0.06)} 0Z`);
            P(g, `M${f(-w * 0.36)} -40 Q${f(-w * 0.18)} -84 0 -86 M${f(-w * 0.18)} -76 L${f(-w * 0.18)} -10 M${f(-w * 0.06)} -88 L${f(-w * 0.06)} -10`, SP * 0.45);
            P(g, `M${f(w * 0.3)} 0 L${f(w * 0.3)} -120`, SP * 1.2);
            S(g, oval(w * 0.3, -124, 9, 5), SP * 0.8);
            win(ctx, -w * 0.32, -26, -w * 0.06, -6, 'grid');
            sign(ctx, w * 0.3, -96, 10, { vertical: true, h: 40 });
        }
    },
    reiwa(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '刻輪広場', '万世時計')) {
            S(g, `M${f(-w * 0.4)} 0 L${f(-w * 0.36)} -8 L${f(w * 0.36)} -8 L${f(w * 0.4)} 0Z`);
            P(g, `M-8 -8 L-6 -110 M8 -8 L6 -110`, SP * 1.1);
            ctx.live.dials.push(kokuDial(g, 0, -130, 24));
            const ring = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; ring.push(oval(Math.sin(a) * 30, -130 - Math.cos(a) * 30, 2.4, 2.4)); }
            C(g, ring.join(' '), '#c9a23a', SP * 0.4);
            sign(ctx, 0, -100, 40, { h: 9 });
        } else if (has(d, '旅立ち口')) {
            S(g, `M${f(-w * 0.42)} 0 L${f(-w * 0.42)} -60 Q0 -110 ${f(w * 0.42)} -60 L${f(w * 0.42)} 0 L${f(w * 0.3)} 0 L${f(w * 0.3)} -54 Q0 -92 ${f(-w * 0.3)} -54 L${f(-w * 0.3)} 0Z`);
            const ribs = []; for (let i = 1; i < 6; i++) { const t = i / 6; ribs.push(`M${f(lerp(-w * 0.42, w * 0.42, t))} ${f(-60 - Math.sin(Math.PI * t) * 46)} L${f(lerp(-w * 0.3, w * 0.3, t))} ${f(-54 - Math.sin(Math.PI * t) * 36)}`); }
            P(g, ribs.join(' '), SP * 0.5);
            ctx.live.lamps.push(lamp(g, ctx.gl, 0, -40, rnd, { kind: 'post', tint: '#bfe3ff', thr: 0.1 }));
            sign(ctx, 0, -100, 46, { h: 10 });
        } else {
            // towers: glass grids with lit floors, a neon or library front at street level
            const x0 = -w / 2 + 8, x1 = w / 2 - 8, tall = 150 + ctx.rnd() * 70;
            S(g, wallRect(x0, -tall, x1, 0, 0.3));
            const rows = Math.floor((tall - 40) / 12);
            for (let r = 0; r < rows; r++) win(ctx, x0 + 6, -tall + 8 + r * 12, x1 - 6, -tall + 16 + r * 12, 'grid', { thr: ctx.rnd(0.05, 0.6) });
            if (has(d, '書庫')) { S(g, rect(x0 + 4, -30, x1 - 4, 0)); const bk = []; for (let x = x0 + 6; x < x1 - 6; x += 2.4) bk.push(`M${f(x)} -26 l0 ${f(-rnd(4, 8))} M${f(x)} -12 l0 ${f(-rnd(4, 8))}`); P(g, bk.join(' '), SP * 0.6); }
            else if (has(d, 'ネオン')) { for (let i = 0; i < 4; i++) { const y = -30 - i * 22; const n = text(g, x1 - 6, y, ['酒', '湯', '本', '飯'][i], 9, { vertical: true, fill: ['#ff4fa3', '#2ee6d6', '#e8c36a', '#ff4fa3'][i] }); ctx.live.neon.push({ n, ph: rnd() * 6 }); } }
            else { S(g, rect(x0 + 4, -28, x1 - 4, 0)); win(ctx, x0 + 8, -24, x1 - 8, -4, 'grid', { thr: 0.02 }); }
            sign(ctx, 0, -40, Math.min(70, w - 26), { h: 10 });
        }
    },
    ginga(ctx, w) {
        const { g, rnd, d } = ctx;
        // a station: platform, canopy on iron posts, triangle signals (三角標), a station clock
        const x0 = -w / 2 + 6, x1 = w / 2 - 6;
        S(g, rect(x0, -10, x1, 0));
        P(g, `M${f(x0)} -6 L${f(x1)} -6`, SP * 0.4);
        posts(g, [x0 + 10, 0, x1 - 10], -60, -10, SP * 1.1);
        S(g, `M${f(x0 - 6)} -60 Q0 -66 ${f(x1 + 6)} -60 L${f(x1 + 2)} -68 Q0 -74 ${f(x0 - 2)} -68Z`);
        ctx.live.dials.push(kokuDial(g, 0, -44, 7));
        for (const [x, c] of [[x0 + 18, '#2f5bd3'], [x1 - 18, '#f2b33d']]) {
            P(g, `M${f(x)} -10 L${f(x)} -36`, SP);
            const tri = el('path', { d: `M${f(x - 6)} -36 L${f(x + 6)} -36 L${f(x)} -47Z`, fill: c, stroke: 'currentColor', 'stroke-width': SP * 0.7 }, g);
            ctx.live.signals.push({ n: tri, c, glow: el('circle', { cx: f(x), cy: -40, r: 20, fill: c === '#2f5bd3' ? 'url(#e-blueglow)' : 'url(#e-warmglow)', opacity: 0 }, ctx.gl) });
        }
        if (has(d, '観測')) { P(g, `${oval(w * 0.2, -90, 6, 6)} ${oval(w * 0.32, -96, 5, 5)}`, SP * 0.8); }
        if (has(d, '海岸')) { const sh = []; for (let i = 0; i < 8; i++) sh.push(`M${f(x0 + 10 + i * 12)} -12 q2 -3 4 0`); P(g, sh.join(' '), SP * 0.5); }
        ctx.live.lamps.push(lamp(g, ctx.gl, x0 + 30, -52, rnd, { kind: 'post', tint: '#cfe6ff', thr: 0 }));
        ctx.live.lamps.push(lamp(g, ctx.gl, x1 - 30, -52, rnd, { kind: 'post', tint: '#cfe6ff', thr: 0 }));
        ctx.live.awake.push(...ctx.live.lamps.slice(-2));
        sign(ctx, 0, -28, Math.min(84, w - 50), { h: 10, colour: '#0e1636', light: true });
    },
    ihatov(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '山猫軒')) {
            C(g, wallRect(-w / 2 + 8, -70, w / 2 - 8, 0, 0.4), '#e8e0cc');
            brick(g, -w / 2 + 8, -70, w / 2 - 8, 0, rnd);
            S(g, `M-10 0 L-10 -40 Q0 -48 10 -40 L10 0Z`, SP);
            text(g, 0, -24, '山猫軒', 4.4, { vertical: true, fill: '#c9a23a', weight: 700 });
            win(ctx, -w / 2 + 18, -54, -w / 2 + 34, -30, 'sash'); win(ctx, w / 2 - 34, -54, w / 2 - 18, -30, 'sash');
            tileRoof(g, { x0: -w / 2, x1: w / 2, eave: -70, ridge: -92, inset: 20, oni: false });
            sign(ctx, 0, -66, 50, { h: 9 });
        } else if (has(d, '谷川')) {
            ctx.live.waters.push(waterAt(ctx, -w / 2 + 4, w / 2 - 4, -8));
            roundTree(g, -w * 0.3, 70, rnd); roundTree(g, w * 0.28, 60, rnd);
            sign(ctx, 0, -30, 10, { vertical: true, h: 34 });
        } else if (has(d, '夜市')) {
            for (let i = 0; i < 3; i++) {
                const a = -w / 2 + 6 + i * (w - 12) / 3, b = a + (w - 12) / 3 - 6;
                posts(g, [a + 2, b - 2], -40, 0); C(g, `M${f(a - 2)} -40 L${f(b + 2)} -40 L${f(b)} -46 L${f(a)} -46Z`, ['#2e6e8e', '#b8432f', '#d9a928'][i], SP * 0.7);
                ctx.live.lanterns.push(chochin(g, ctx.gl, (a + b) / 2, -38, rnd));
            }
            sign(ctx, 0, -60, 48, { h: 10 });
        } else {
            S(g, wallRect(-w * 0.36, -54, w * 0.36, 0, 0.5));
            tileRoof(g, { x0: -w * 0.42, x1: w * 0.42, eave: -54, ridge: -74, inset: 14, oni: false });
            win(ctx, -w * 0.28, -44, -w * 0.06, -20, 'sash'); win(ctx, w * 0.06, -44, w * 0.28, -20, 'sash');
            if (has(d, 'どんぐり')) { const ac = []; for (let i = 0; i < 10; i++) ac.push(oval(rnd(-w / 2, w / 2), -2, 1.6, 2)); C(g, ac.join(' '), '#8a5a36', SP * 0.4); }
            sign(ctx, 0, -66, Math.min(70, w * 0.6), { h: 9 });
        }
    },
    tono(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '曲り家')) {
            S(g, wallRect(-w * 0.44, -36, w * 0.2, 0, 0.4));
            thatchRoof(g, { x0: -w * 0.5, x1: w * 0.26, eave: -34, ridge: -92, inset: 34, rnd });
            S(g, wallRect(w * 0.2, -30, w * 0.44, 0, 0.4));
            thatchRoof(g, { x0: w * 0.16, x1: w * 0.48, eave: -28, ridge: -62, inset: 12, rnd, cap: false });
            win(ctx, -w * 0.3, -28, -w * 0.08, -6, 'shoji');
            ctx.live.smokes.push(smoke(g, -w * 0.12, -92, rnd));
            sign(ctx, w * 0.32, -26, 10, { vertical: true, h: 24 });
        } else if (has(d, '水車')) {
            ctx.live.waters.push(waterAt(ctx, -w / 2 + 4, 0, -6));
            const wheel = G(g); const sp = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; sp.push(`M0 0 L${f(Math.cos(a) * 20)} ${f(Math.sin(a) * 20)}`); }
            P(wheel, `${oval(0, 0, 20, 20)} ${oval(0, 0, 16, 16)} ${sp.join(' ')}`, SP * 0.7);
            ctx.live.spinners.push({ g: wheel, x: -w * 0.18, y: -20, a: 0, speed: 0.6 });
            S(g, wallRect(w * 0.02, -40, w * 0.42, 0, 0.4)); thatchRoof(g, { x0: -w * 0.02, x1: w * 0.46, eave: -38, ridge: -66, inset: 16, rnd });
            sign(ctx, w * 0.22, -30, 10, { vertical: true, h: 26 });
        } else if (has(d, '帽子屋')) {
            const m = machiya(ctx, -w / 2 + 4, w / 2 - 4, { task: 'sew', noren: '#3e5a49', label: '帽子', storeys: 1 });
            for (let i = 0; i < 4; i++) { const x = lerp(m.sx0 + 6, m.sx1 - 6, i / 3); S(g, `M${f(x - 5)} ${f(-m.H1 + 24)} L${f(x + 5)} ${f(-m.H1 + 24)} L${f(x + 3)} ${f(-m.H1 + 18)} L${f(x - 3)} ${f(-m.H1 + 18)}Z`, SP * 0.5); }
            ctx.live.lamps.push(lamp(g, ctx.gl, w / 2 - 2, -46, rnd, { kind: 'andon' }));
            sign(ctx, 0, m.eave - 12, 56, { h: 10 });
        } else {
            for (let i = 0; i < 3; i++) roundTree(g, -w * 0.36 + i * 20, 48 + i * 8, rnd);
            S(g, wallRect(w * 0.06, -34, w * 0.4, 0, 0.4)); thatchRoof(g, { x0: w * 0.02, x1: w * 0.44, eave: -32, ridge: -58, inset: 14, rnd });
            sign(ctx, w * 0.23, -26, 10, { vertical: true, h: 24 });
        }
    },
    sakura(ctx, w) {
        const { g, rnd, d } = ctx;
        // the forest asks no price: trees, a gate without doors, mats, an empty pedestal
        const pts = blossomTree(g, -w * 0.22, 96 + rnd() * 20, rnd);
        const pts2 = blossomTree(g, w * 0.24, 84 + rnd() * 20, rnd);
        ctx.live.blossoms.push(...pts, ...pts2);
        if (has(d, '木戸')) { P(g, `M-12 0 L-12 -50 M12 0 L12 -50 M-16 -48 L16 -48 M-14 -42 L14 -42`, SP * 1.2); }
        if (has(d, '花筵')) {
            // 花見: two people kneeling on the red felt under the blossoms, tea between them
            C(g, rect(-30, -2, 30, 0), '#c8403a', SP * 0.6);
            sitter(ctx, -14, -2, { task: 'tea', dir: 1, colour: '#e8a8bd', hair: 'bun' });
            sitter(ctx, 12, -2, { task: 'pour', dir: -1, colour: '#6a4a8a' });
        }
        if (has(d, 'しじま')) S(g, rect(-10, -14, 10, 0), SP * 0.9);
        ctx.live.lanterns.push(chochin(g, ctx.gl, -w * 0.22 + 14, -50, rnd, { r: 4.6, h: 10 }));
        sign(ctx, 0, -40, 10, { vertical: true, h: 0 });
    },
    ryugu(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '玉の枝')) {
            P(g, `M0 0 Q-2 -40 0 -80 M0 -40 Q-14 -54 -24 -70 M0 -54 Q12 -66 22 -82`, SP * 1.1);
            const fr = []; for (let i = 0; i < 16; i++) fr.push(oval(rnd(-26, 26), -rnd(46, 96), 2, 2)); S(g, fr.join(' '), SP * 0.5);
            sign(ctx, w * 0.3, -40, 10, { vertical: true, h: 0 });
            return;
        }
        // the sea of the dragon palace behind the pavilion
        ctx.live.waters.push(waterAt(ctx, -w / 2 + 1, w / 2 - 1, -10, 'sea'));
        // a pavilion on coral-red columns, wave pattern on the frieze, a tortoise-shell roof
        const x0 = -w / 2 + 10, x1 = w / 2 - 10;
        const cols = []; for (let x = x0 + 4; x <= x1 - 2; x += (x1 - x0 - 6) / 4) cols.push(x);
        cols.forEach(x => C(g, `M${f(x - 2.4)} 0 Q${f(x - 3)} -30 ${f(x - 2.4)} -58 L${f(x + 2.4)} -58 Q${f(x + 3)} -30 ${f(x + 2.4)} 0Z`, '#ee6a5a', SP * 0.7));
        S(g, rect(x0 - 2, -68, x1 + 2, -58));
        const wv = []; for (let x = x0 + 2; x < x1 - 4; x += 6) wv.push(`M${f(x)} -60 a3 3 0 0 1 6 0 M${f(x + 1.4)} -60 a1.6 1.6 0 0 1 3.2 0`); P(g, wv.join(' '), SP * 0.4);
        C(g, `M${f(x0 - 12)} -66 Q0 -70 ${f(x1 + 12)} -66 L${f(x1 - 10)} -92 Q0 -96 ${f(x0 + 10)} -92Z`, '#1f8a8c');
        for (let i = 0; i < cols.length - 1; i++) win(ctx, cols[i] + 4, -50, cols[i + 1] - 4, -14, 'grid', { thr: 0.1 });
        if (has(d, '玉手箱', '銀行')) { C(g, rect(-6, -10, 6, 0), '#2c2a2a', SP * 0.6); P(g, `M-6 -5 L6 -5 M0 -10 L0 0`, SP * 0.6); }
        sign(ctx, 0, -86, Math.min(60, w * 0.5), { h: 10, colour: '#0b2545', light: true });
    },
    tsuki(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '藤棚')) {
            const x0 = -w / 2 + 8, x1 = w / 2 - 8;
            posts(g, [x0 + 4, 0, x1 - 4], -64, 0, SP * 1.2);
            P(g, `M${f(x0 - 4)} -64 L${f(x1 + 4)} -64 M${f(x0 - 2)} -68 L${f(x1 + 2)} -68`, SP);
            for (let x = x0; x < x1; x += 8) {
                const grp = G(g); const l = 10 + rnd() * 10;
                C(grp, `M-2.4 0 Q-3 ${f(l * 0.5)} 0 ${f(l)} Q3 ${f(l * 0.5)} 2.4 0Z`, '#8f78c8', SP * 0.4);
                ctx.live.swing.push({ grp, x, y: -64, p: { a: 0, v: 0, ph: rnd() * 6 }, k: 9 });
            }
            sign(ctx, x1 - 4, -60, 10, { vertical: true, h: 0 });
        } else if (has(d, '餅搗き')) {
            S(g, `M-14 0 L-12 -14 L12 -14 L14 0Z`); S(g, oval(0, -14, 12, 3), SP * 0.7);
            sitter(ctx, -24, 0, { kind: 'stand', task: 'hammer', colour: '#e8e4f2' });
            sign(ctx, w * 0.3, -40, 10, { vertical: true, h: 0 });
        } else {
            const x0 = -w * 0.4, x1 = w * 0.4;
            S(g, rect(x0, -50, x1, -6)); S(g, rect(x0 - 4, -8, x1 + 4, 0));
            win(ctx, x0 + 6, -44, x1 - 6, -14, 'shoji');
            if (has(d, '難題')) for (let i = 0; i < 5; i++) S(g, `M${f(x0 + 8 + i * (x1 - x0 - 16) / 5)} -14 l0 -14 q4 -6 8 0 l0 14Z`, SP * 0.6);
            thatchRoof(g, { x0: x0 - 10, x1: x1 + 10, eave: -48, ridge: -76, inset: 18, rnd });
            bamboo(g, x1 + 4, 70, rnd);
            sign(ctx, 0, -64, Math.min(56, w * 0.5), { h: 9 });
        }
    },
    tenshu(ctx, w) {
        const { g, rnd, d } = ctx;
        // white plaster floors stacked under tiled roofs, black lower boards, gold shachi
        const base = has(d, '天守', '第五重') ? 4 : 2;
        let y = 0, half = w * 0.38;
        for (let i = 0; i < base; i++) {
            const hh = 30 - i * 3;
            S(g, wallRect(-half, y - hh, half, y, 0.3));
            C(g, rect(-half, y - hh * 0.36, half, y), '#2c2a2a', SP * 0.6);
            win(ctx, -half * 0.5, y - hh + 6, half * 0.5, y - hh * 0.5, 'mushiko', { thr: 0.1 + i * 0.1 });
            tileRoof(g, { x0: -half - 10, x1: half + 10, eave: y - hh, ridge: y - hh - 12, inset: 12, tile: 5, oni: false, rafters: false });
            y -= hh + 12; half *= 0.8;
        }
        C(g, `M${f(-half - 6)} ${f(y + 12)} q-2 -8 -6 -10 q4 0 6 4Z M${f(half + 6)} ${f(y + 12)} q2 -8 6 -10 q-4 0 -6 4Z`, GOLD, SP * 0.6);
        if (has(d, '欄干', '秋草')) { P(g, `M${f(-w / 2 + 4)} -12 L${f(w / 2 - 4)} -12`, SP); const gr = []; for (let i = 0; i < 18; i++) { const x = rnd(-w / 2 + 6, w / 2 - 6); gr.push(`M${f(x)} 0 q${f(rnd(-3, 3))} -8 ${f(rnd(-5, 5))} -16`); } P(g, gr.join(' '), SP * 0.4); }
        if (has(d, '星見')) S(g, `M${f(w * 0.2)} ${f(y + 6)} L${f(w * 0.38)} ${f(y - 8)} L${f(w * 0.4)} ${f(y - 4)} L${f(w * 0.22)} ${f(y + 9)}Z`, SP * 0.7);
        sign(ctx, w * 0.42, -60, 10, { vertical: true, h: 0 });
    },
    yume(ctx, w) {
        const { g, rnd, d } = ctx;
        if (has(d, '山門')) {
            C(g, `M${f(-w * 0.36)} 0 L${f(-w * 0.34)} -76 L${f(-w * 0.28)} -76 L${f(-w * 0.26)} 0Z M${f(w * 0.36)} 0 L${f(w * 0.34)} -76 L${f(w * 0.28)} -76 L${f(w * 0.26)} 0Z`, '#c9482f');
            C(g, rect(-w * 0.38, -88, w * 0.38, -76), '#c9482f');
            tileRoof(g, { x0: -w * 0.5, x1: w * 0.5, eave: -88, ridge: -118, inset: 26, sori: 5 });
            pine(g, w * 0.42, 90, rnd);
            sign(ctx, 0, -86, 10, { vertical: true, h: 0 });
        } else if (has(d, '百合')) {
            const lil = []; for (let i = 0; i < 9; i++) { const x = -w * 0.4 + i * w * 0.1, h = 18 + rnd() * 14; lil.push(`M${f(x)} 0 Q${f(x + 1)} ${f(-h / 2)} ${f(x)} ${f(-h)}`); S(g, `M${f(x)} ${f(-h)} l-3 -6 l3 2 l3 -2Z`, SP * 0.5); }
            P(g, lil.join(' '), SP * 0.5);
            sign(ctx, w * 0.3, -40, 10, { vertical: true, h: 0 });
        } else if (has(d, '鯉')) {
            ctx.live.waters.push(waterAt(ctx, -w / 2 + 6, w / 2 - 6, -7));
            ctx.live.ponds.push({ x0: -w / 2 + 10, x1: w / 2 - 10, y: -6 });
            P(g, `M${f(-w * 0.3)} -6 Q0 -30 ${f(w * 0.3)} -6`, SP);
            sign(ctx, 0, -40, 10, { vertical: true, h: 0 });
        } else {
            // the corridor of dream rooms: ten fusuma, each with a white tanzaku
            const x0 = -w / 2 + 6, x1 = w / 2 - 6;
            S(g, rect(x0, -54, x1, 0));
            const n = 6;
            for (let i = 0; i < n; i++) { const a = lerp(x0 + 2, x1 - 2, i / n), b = lerp(x0 + 2, x1 - 2, (i + 1) / n); win(ctx, a + 1, -50, b - 1, -6, 'plain', { thr: 0.05 + i * 0.08 }); S(g, rect((a + b) / 2 - 1.6, -46, (a + b) / 2 + 1.6, -30), SP * 0.4); }
            tileRoof(g, { x0: x0 - 8, x1: x1 + 8, eave: -54, ridge: -74, inset: 14 });
            sign(ctx, 0, -66, Math.min(70, w * 0.5), { h: 9 });
        }
    }
};

export function buildDistrict(entry, ctx) {
    const before = { w: ctx.live.windows.length, l: ctx.live.lanterns.length, m: ctx.live.lamps.length, s: ctx.live.surfaces.length, wl: ctx.live.wells.length, sit: ctx.live.sitters.length, sw: ctx.live.swing.length + ctx.live.banners.length + ctx.live.norens.length };
    buildDistrictInner(entry, ctx);
    if (entry.family !== 'edo') dress(entry, ctx, before);
    for (const x of ctx.live.wells.slice(before.wl)) ctx.live.wellsAbs.push(entry.s + x);
    // water reflects the lights of its own building
    const wins = ctx.live.windows.slice(before.w), lans = ctx.live.lanterns.slice(before.l);
    for (const sf of ctx.live.surfaces.slice(before.s)) {
        sf.u = entry.s;                                 // where this surface's building stands (for things that touch it)
        sf.setLights(() => [...wins.map(w => ({ x: w.cx, get lit() { return w.lit; } })), ...lans.map(l => ({ x: l.x, get lit() { return l.litV; } }))]);
    }
}

function buildDistrictInner(entry, ctx) {
    const w = entry.w;
    ctx.d = entry.district;
    if (entry.family === 'edo') return buildEdo(ctx, w);
    if (THIN[entry.id]) return THIN[entry.id](ctx, w);
    if (BIG[entry.id]) return BIG[entry.id](ctx, w);
    const fn = FAMILY[entry.family] || FAMILY.reiwa;
    fn(ctx, w);
}

export function emptyLive() {
    return { windows: [], lanterns: [], norens: [], lamps: [], smokes: [], waters: [], banners: [], dials: [], sitters: [], signs: [], swing: [], jars: [], mirrors: [], pendulums: [], spinners: [], signals: [], neon: [], fireflies: [], perches: [], blossoms: [], ponds: [], awake: [], surfaces: [], waterlife: [], wells: [], wellsAbs: [], trains: [] };
}
