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
    noren, chochin, lamp, smoke, kokuDial, banner, pine, blossomTree, roundTree, bamboo, barrel, well, bench, water, GOLD
} from './kit.js';
import { createSitter } from './sitter.js';
import { signName } from './layout.js';

const lm = d => (d.landmarks || []).map(l => l.name_ja || '').join(' ') + ' ' + (d.name_ja || '') + ' ' + (d.summary || '');
const has = (d, ...w) => { const s = lm(d); return w.some(x => s.includes(x)); };

// ------------------------------------------------------------------ signboard

// A signboard is a link to the district page in the explorer (a tap on it is the way in).
function sign(ctx, x, y, w, { vertical = false, h = 0, colour = null, light = false } = {}) {
    const d = ctx.d, name = signName(d);
    const a = el('a', { href: `../#/district/${d.id}`, class: 'sign' }, ctx.g);
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
        if (upper === 'mushiko') win(ctx, x0 + w * 0.22, wy0, x1 - w * 0.22, wy1, 'mushiko');
        else { win(ctx, x0 + 16, wy0, x0 + w * 0.46, wy1, 'shoji'); win(ctx, x0 + w * 0.54, wy0, x1 - 16, wy1, 'shoji'); }
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
    }
    // the other bay: lattice front or doors
    if (door === 'koshi') koshi(g, sx1 + 2, x1 - 8, -H1 + 6, -1);
    else if (door === 'shoji') { win(ctx, sx1 + 2, -H1 + 8, x1 - 8, -2, 'shoji'); }
    hisashi(g, x0 - 2, x1 + 2, -H1 - 2, 8);
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
            win(ctx, a + 4, -H + 10, a + w * 0.55, -6, 'shoji');
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
        well(g, wx);
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
        ctx.live.waters.push(water(g, bx0, bx1, -7, 0, rnd));
        P(g, `M${f(bx0 - 2)} -6 Q${f((bx0 + bx1) / 2)} -40 ${f(bx1 + 2)} -6`, SP * 1.3);
        P(g, `M${f(bx0 - 2)} -12 Q${f((bx0 + bx1) / 2)} -46 ${f(bx1 + 2)} -12`, SP * 0.9);
        const rails = [];
        for (let x = bx0 + 6; x < bx1 - 4; x += 7) { const t = (x - bx0) / (bx1 - bx0), y = -6 - 34 * 4 * t * (1 - t) * 0.86; rails.push(`M${f(x)} ${f(y)} l0 -6`); }
        P(g, rails.join(' '), SP * 0.6);
        posts(g, [lerp(bx0, bx1, 0.25), lerp(bx0, bx1, 0.5), lerp(bx0, bx1, 0.75)], -34, 0, SP * 0.9);
        ctx.live.fireflies.push({ x0: bx0, x1: bx1, y0: -36, y1: -4 });
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
        well(g, w / 2 - 18);
        pine(g, w / 2 - 6, 62, rnd);
        ctx.live.smokes.push(smoke(g, -w / 2 + 30, m.ridge + 6, rnd));
        P(g, `M${f(-w / 2 + 28)} ${f(m.ridge + 18)} l0 -12 M${f(-w / 2 + 32)} ${f(m.ridge + 18)} l0 -12`, SP * 0.8);
        sign(ctx, -w * 0.12, -m.H1 - m.H2 + 2, 70, { h: 12, colour: '#3a2a20', light: true });
    }
};

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
            ctx.live.waters.push(water(g, -w / 2 + 4, w / 2 - 4, -6, 0, rnd));
            S(g, `M${f(-w * 0.3)} -8 Q${f(-w * 0.32)} -2 ${f(-w * 0.2)} -2 L${f(w * 0.1)} -2 Q${f(w * 0.2)} -2 ${f(w * 0.18)} -8Z`, SP * 0.9);
            P(g, `M${f(-w * 0.05)} -8 L${f(-w * 0.15)} -50`, SP * 0.9);
            pitHouse(ctx, w * 0.3, 46, 40);
            sign(ctx, -w * 0.3, -40, 10, { vertical: true, h: 30 });
        } else {
            pitHouse(ctx, -w * 0.16, 64, 52);
            if (has(d, '渓')) { ctx.live.waters.push(water(g, w * 0.08, w / 2 - 4, -5, 0, rnd)); for (let i = 0; i < 4; i++) C(g, oval(w * 0.16 + i * 10, -5, 4, 3), '#78b596', SP * 0.6); }
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
            ctx.live.waters.push(water(g, -w / 2 + 6, -w * 0.02, -6, 0, rnd));
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
            ctx.live.waters.push(water(g, -w / 2 + 4, w * 0.1, -6, 0, rnd));
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
            ctx.live.waters.push(water(g, -w / 2 + 2, w / 2 - 2, -8, 0, rnd));
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
            ctx.live.waters.push(water(g, -w / 2 + 4, w / 2 - 4, -8, 0, rnd));
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
            ctx.live.waters.push(water(g, -w / 2 + 4, 0, -6, 0, rnd));
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
        if (has(d, '花筵')) C(g, rect(-26, -3, 26, 0), '#c8403a', SP * 0.6);
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
            ctx.live.waters.push(water(g, -w / 2 + 6, w / 2 - 6, -7, 0, rnd));
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
    const w = entry.w;
    ctx.d = entry.district;
    if (entry.family === 'edo') return buildEdo(ctx, w);
    const fn = FAMILY[entry.family] || FAMILY.reiwa;
    fn(ctx, w);
}

export function emptyLive() {
    return { windows: [], lanterns: [], norens: [], lamps: [], smokes: [], waters: [], banners: [], dials: [], sitters: [], signs: [], swing: [], jars: [], mirrors: [], pendulums: [], spinners: [], signals: [], neon: [], fireflies: [], perches: [], blossoms: [], ponds: [], awake: [] };
}
