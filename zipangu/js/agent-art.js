// A small neon-chibi face for every agent, drawn procedurally from what the
// world already says about them: the palette of their home district, the
// signature colour and the costume words in sprite_hint. It is an overlay: the
// map keeps its beads and rings, the avatar coin keeps its gradient and rim.
// Pure canvas, no images, so it costs nothing to ship.

import { hash01, mixHex, accentOf, deepOf, lightOf, rgba } from './util.js';

const SKIN = ['#ffe3c9', '#f8d3b3', '#efc19b', '#e2ab84'];
const HAIR_TONES = ['#2a1d3f', '#3b2740', '#1f2a4d', '#4a2f2a', '#26323f'];
const STYLES = ['bob', 'spiky', 'long', 'buns', 'topknot'];
const TAU = Math.PI * 2;

const has = (text, re) => re.test(text);

// Everything the painter needs, decided once per agent.
export function agentSpec(W, agent) {
    const d = W.byId.district.get(agent.home);
    const place = d && W.placeOf(d.id);
    const pal = (place && place.aesthetic && place.aesthetic.palette) || [];
    const hint = String(agent.sprite_hint || '');
    const id = String(agent.id);
    const neon = agent.origin !== 'native';
    const sigm = hint.match(/#([0-9a-fA-F]{6})/);
    const sig = sigm ? '#' + sigm[1] : null;
    const accent = sig || accentOf(pal);
    const light = lightOf(pal), deep = deepOf(pal);

    let skin = SKIN[Math.floor(hash01(id, 'skin') * SKIN.length)];
    if (has(hint, /土偶/)) skin = '#c97b55';
    else if (has(hint, /折り鶴|和紙|白木/)) skin = '#f6efe0';
    else if (has(hint, /からくり|真鍮|算機/)) skin = '#e7cd9d';
    else if (has(hint, /淡い藤色/)) skin = '#d9d0f2';

    let hair = mixHex(HAIR_TONES[Math.floor(hash01(id, 'hair') * HAIR_TONES.length)], deep, 0.25);
    if (has(hint, /栗色/)) hair = '#6a3f2a';
    if (has(hint, /#8800FF/)) hair = '#6a22c9';

    let style = STYLES[Math.floor(hash01(id, 'style') * STYLES.length)];
    if (has(hint, /総髪|束ね|まとめ/)) style = 'topknot';
    else if (has(hint, /おかっぱ|肩で切りそろえ/)) style = 'bob';
    else if (has(hint, /長い黒髪/)) style = 'long';
    else if (has(hint, /逆立/)) style = 'spiky';

    const acc = new Set();
    if (has(hint, /ゴーグル|拡大鏡/)) acc.add('goggles');
    if (has(hint, /烏帽子/)) acc.add('eboshi');
    if (has(hint, /笠/)) acc.add('kasa');
    if (has(hint, /手ぬぐい|鉢巻/)) acc.add('band');
    if (has(hint, /飛行帽/)) acc.add('cap');
    if (has(hint, /歯車|ねじ頭|からくり|算機/)) acc.add('gear');
    if (/neko|kitsune/i.test(id) || has(hint, /猫|狐/)) acc.add('ears');
    if (has(hint, /折り鶴/)) acc.add('beak');

    return {
        neon, skin, hair, style, acc, accent, light,
        body: neon ? '#1a1f5c' : mixHex(deep, '#141a58', 0.55),
        trim: neon ? accent : mixHex(accent, '#fff4cf', 0.35),
        eye: sig || mixHex(accent, light, 0.35),
        rim: neon ? '#ff4fa3' : accent
    };
}

// Paints the bust into a 100 x 100 box at the context's current transform.
export function paintBust(c, sp, { glow = true } = {}) {
    const path = (fn, fill, stroke, lw) => {
        c.beginPath(); fn(c);
        if (fill) { c.fillStyle = fill; c.fill(); }
        if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.lineJoin = 'round'; c.stroke(); }
    };
    const rim = on => {
        if (on && glow) { c.shadowColor = rgba(sp.rim, 0.95); c.shadowBlur = 6; } else { c.shadowBlur = 0; }
    };
    c.save();

    // hair behind the head
    rim(true);
    const back = {
        bob: k => { k.moveTo(20, 50); k.bezierCurveTo(16, 14, 84, 14, 80, 50); k.lineTo(80, 70); k.quadraticCurveTo(50, 78, 20, 70); k.closePath(); },
        long: k => { k.moveTo(20, 48); k.bezierCurveTo(14, 12, 86, 12, 80, 48); k.lineTo(86, 94); k.lineTo(14, 94); k.closePath(); },
        spiky: k => { k.moveTo(22, 46); k.lineTo(14, 20); k.lineTo(32, 28); k.lineTo(38, 8); k.lineTo(50, 24); k.lineTo(62, 6); k.lineTo(68, 28); k.lineTo(86, 18); k.lineTo(78, 46); k.closePath(); },
        buns: k => { k.moveTo(22, 46); k.bezierCurveTo(20, 16, 80, 16, 78, 46); k.closePath(); },
        topknot: k => { k.moveTo(22, 46); k.bezierCurveTo(20, 16, 80, 16, 78, 46); k.closePath(); }
    }[sp.style];
    path(back, sp.hair);
    if (sp.style === 'buns') { path(k => k.arc(21, 26, 10, 0, TAU), sp.hair); path(k => k.arc(79, 26, 10, 0, TAU), sp.hair); }
    if (sp.style === 'topknot') path(k => k.ellipse(50, 9, 8, 7, 0, 0, TAU), sp.hair);
    if (sp.acc.has('ears')) {
        path(k => { k.moveTo(22, 30); k.lineTo(26, 4); k.lineTo(44, 20); k.closePath(); }, sp.hair);
        path(k => { k.moveTo(78, 30); k.lineTo(74, 4); k.lineTo(56, 20); k.closePath(); }, sp.hair);
    }

    // shoulders and collar
    path(k => { k.moveTo(10, 101); k.bezierCurveTo(10, 72, 30, 70, 50, 70); k.bezierCurveTo(70, 70, 90, 72, 90, 101); k.closePath(); }, sp.body);
    rim(false);
    path(k => { k.moveTo(36, 72); k.lineTo(50, 90); k.lineTo(64, 72); }, null, sp.trim, 3);

    // neck and head
    path(k => k.rect(43, 62, 14, 14), mixHex(sp.skin, '#7a4a3a', 0.18));
    rim(true);
    path(k => k.ellipse(50, 47, 27, 26, 0, 0, TAU), sp.skin);
    rim(false);

    // fringe
    path(k => { k.moveTo(22, 48); k.bezierCurveTo(20, 14, 80, 14, 78, 48); k.bezierCurveTo(72, 36, 64, 40, 58, 30); k.bezierCurveTo(52, 40, 44, 34, 36, 40); k.bezierCurveTo(30, 42, 25, 44, 22, 48); k.closePath(); }, sp.hair);

    // eyes
    if (sp.acc.has('goggles')) {
        for (const ex of [37, 63]) {
            path(k => k.arc(ex, 52, 9, 0, TAU), rgba('#0a0d30', 0.9), sp.accent, 2.6);
            path(k => k.arc(ex, 52, 4, 0, TAU), sp.eye);
        }
        path(k => { k.moveTo(46, 52); k.lineTo(54, 52); }, null, sp.accent, 2.6);
    } else {
        for (const ex of [38, 62]) {
            path(k => k.ellipse(ex, 52, 5, 6.4, 0, 0, TAU), '#16102f');
            path(k => k.ellipse(ex, 53.2, 3.3, 4.4, 0, 0, TAU), sp.eye);
            path(k => k.arc(ex - 1.5, 50.2, 1.7, 0, TAU), '#ffffff');
        }
    }
    path(k => k.ellipse(31, 62, 5, 3, 0, 0, TAU), rgba('#ff7aa8', 0.38));
    path(k => k.ellipse(69, 62, 5, 3, 0, 0, TAU), rgba('#ff7aa8', 0.38));
    path(k => { k.moveTo(45, 66); k.quadraticCurveTo(50, 70, 55, 66); }, null, '#5a2a3a', 2);

    // costume words from sprite_hint
    if (sp.acc.has('kasa')) path(k => { k.moveTo(50, 2); k.lineTo(6, 36); k.quadraticCurveTo(50, 28, 94, 36); k.closePath(); }, '#e6c37a', '#8a6a2a', 2);
    if (sp.acc.has('eboshi')) path(k => { k.moveTo(34, 24); k.lineTo(40, 2); k.lineTo(62, 6); k.lineTo(66, 24); k.closePath(); }, '#18142e', sp.trim, 1.6);
    if (sp.acc.has('cap')) path(k => { k.moveTo(21, 40); k.bezierCurveTo(20, 8, 80, 8, 79, 40); k.closePath(); }, '#7a4b2a', '#c89a5a', 2);
    if (sp.acc.has('band')) {
        path(k => { k.moveTo(23, 32); k.quadraticCurveTo(50, 22, 77, 32); k.lineTo(77, 40); k.quadraticCurveTo(50, 30, 23, 40); k.closePath(); }, sp.trim);
        path(k => { k.moveTo(77, 36); k.lineTo(90, 30); k.lineTo(88, 44); k.closePath(); }, sp.trim);
    }
    if (sp.acc.has('gear')) {
        path(k => k.arc(50, 24, 7, 0, TAU), '#d9b25a', '#fff4cf', 1.4);
        path(k => { k.moveTo(46, 24); k.lineTo(54, 24); }, null, '#7a5a1a', 1.8);
    }
    if (sp.acc.has('beak')) path(k => { k.moveTo(50, 4); k.lineTo(42, 24); k.lineTo(58, 24); k.closePath(); }, '#fff9ea', '#e2532d', 1.6);
    // a hair tie in the signature colour; the NEON MYTHOS crew wear it at the side
    if (sp.neon) path(k => k.arc(76, 22, 4.5, 0, TAU), sp.trim);
    else if (sp.style === 'topknot') path(k => k.arc(50, 17, 3.2, 0, TAU), sp.trim);
    c.restore();
}

// A fresh canvas for the 住人 list and the agent pages, sharp at 2x.
export function agentFaceCanvas(W, agent, px) {
    const dpr = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    const side = Math.round(px * dpr);
    const cv = document.createElement('canvas');
    cv.width = side; cv.height = side;
    cv.className = 'avatar-face';
    const c = cv.getContext('2d');
    c.scale(side / 100, side / 100);
    paintBust(c, agentSpec(W, agent), { glow: false });
    return cv;
}

// One cached sprite per agent for the map, so a frame is only drawImage calls.
const spriteCache = new Map();
export const SPRITE_PAD = 8;
export function agentSprite(W, agent) {
    let cv = spriteCache.get(agent.id);
    if (cv) return cv;
    cv = document.createElement('canvas');
    cv.width = cv.height = 100 + SPRITE_PAD * 2;
    const c = cv.getContext('2d');
    c.translate(SPRITE_PAD, SPRITE_PAD);
    paintBust(c, agentSpec(W, agent), { glow: true });
    spriteCache.set(agent.id, cv);
    return cv;
}
