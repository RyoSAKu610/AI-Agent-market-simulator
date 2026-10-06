// Small shared helpers: DOM building, Japanese name trimming, colour maths.
// Pure and DOM-light so every other module can import it.

// ------------------------------------------------------------------ DOM

const SVG_NS = 'http://www.w3.org/2000/svg';

function applyAttrs(el, attrs) {
    for (const [key, val] of Object.entries(attrs || {})) {
        if (val == null || val === false) continue;
        if (key === 'class') el.setAttribute('class', val);
        else if (key === 'style' && typeof val === 'object') {
            for (const [k, v] of Object.entries(val)) {
                if (k.startsWith('--')) el.style.setProperty(k, v); else el.style[k] = v;
            }
        }
        else if (key === 'dataset') Object.assign(el.dataset, val);
        else if (key === 'text') el.textContent = val;
        else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2), val);
        else el.setAttribute(key, val === true ? '' : val);
    }
}

function appendKids(el, kids) {
    for (const kid of kids) {
        if (kid == null || kid === false) continue;
        if (Array.isArray(kid)) appendKids(el, kid);
        else el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
}

export function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    applyAttrs(el, attrs);
    appendKids(el, kids);
    return el;
}

export function svg(tag, attrs, ...kids) {
    const el = document.createElementNS(SVG_NS, tag);
    applyAttrs(el, attrs);
    appendKids(el, kids);
    return el;
}

export function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
}

// 【史実】 and 【創作】 are the two voices of the world; they are always shown apart.
export function tagged(text) {
    const frag = document.createDocumentFragment();
    String(text || '').split(/(【史実】|【創作】)/).forEach(part => {
        if (!part) return;
        if (part === '【史実】') frag.append(h('span', { class: 'tag tag-fact', title: '史実：確かめられる歴史' }, '史実'));
        else if (part === '【創作】') frag.append(h('span', { class: 'tag tag-fiction', title: '創作：この世界の作り話' }, '創作'));
        else frag.append(document.createTextNode(part));
    });
    return frag;
}

// ------------------------------------------------------------------ names

export const stripParens = s => String(s == null ? '' : s).replace(/（[^）]*）|\([^)]*\)/g, '').trim();

// 縄文「結縄と漆の森」 → 縄文 ; plain names stay whole.
export function placeShort(p) {
    if (!p) return '';
    const full = stripParens(p.name_ja);
    const cut = full.split('「')[0].trim();
    return cut || full;
}

export function placeSub(p) {
    if (!p) return '';
    const m = stripParens(p.name_ja).match(/「([^」]*)」?/);
    return m ? m[1].trim() : '';
}

export const nameOf = o => stripParens(o && (o.name_ja || o.name || o.title || o.id)) || String((o && o.id) || '');

// 刻輪広場・万世時計 → 刻輪広場 (for tight map labels)
export const districtShort = d => stripParens(d && d.name_ja).split('・')[0] || stripParens(d && d.name_ja);

export const agentShort = a => stripParens(a && (a.name || a.name_ja || a.id)) || String((a && a.id) || '');

// ------------------------------------------------------------------ numbers and text

export function fmt(n, digits = 0) {
    if (!Number.isFinite(n)) return '–';
    const fixed = Math.abs(n) >= 1000 ? Math.round(n) : Number(n.toFixed(digits));
    return fixed.toLocaleString('ja-JP', { maximumFractionDigits: digits });
}

export function fmtPrice(n) {
    if (!Number.isFinite(n)) return '–';
    if (n >= 100) return Math.round(n).toLocaleString('ja-JP');
    if (n >= 10) return n.toFixed(1);
    return n.toFixed(2);
}

export function pct(ratio) {
    if (!Number.isFinite(ratio)) return '–';
    const v = Math.round(ratio * 100);
    return (v > 0 ? '+' : '') + v + '%';
}

export function clip(text, n) {
    const s = String(text || '');
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export const firstSentence = s => (String(s || '').match(/^[^。！？]*[。！？]?/) || [''])[0];

// ------------------------------------------------------------------ hashing and ranges

export function hash01(...parts) {
    let x = 0x811c9dc5;
    for (const ch of parts.join('|')) {
        x ^= ch.codePointAt(0);
        x = Math.imul(x, 0x01000193);
    }
    x ^= x >>> 16; x = Math.imul(x, 0x85ebca6b);
    x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function smooth(a, b, x) {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
}

// ------------------------------------------------------------------ colour

export function hexToRgb(hex) {
    let s = String(hex || '#000').replace('#', '');
    if (s.length === 3) s = s.replace(/./g, c => c + c);
    const n = parseInt(s, 16);
    return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [0, 0, 0];
}

export const rgba = (hex, a) => {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
};

export function mixHex(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    const c = A.map((v, i) => Math.round(lerp(v, B[i], t)));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

export function lum(hex) {
    const [r, g, b] = hexToRgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function chroma(hex) {
    const c = hexToRgb(hex);
    return (Math.max(...c) - Math.min(...c)) / 255;
}

const pal = p => (Array.isArray(p) && p.length ? p : ['#e8c36a', '#8b5cf6', '#2ee6d6', '#161a4a', '#ff4fa3']);

// The colour that carries a place: vivid and light enough to glow on indigo.
export function accentOf(palette) {
    const list = pal(palette);
    let best = list[0], bestScore = -1;
    for (const c of list) {
        const l = lum(c);
        const score = (chroma(c) + 0.25) * (l > 0.2 && l < 0.92 ? 1 : 0.25) * (0.5 + l);
        if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
}

export const deepOf = palette => pal(palette).reduce((a, b) => (lum(b) < lum(a) ? b : a));
export const lightOf = palette => pal(palette).reduce((a, b) => (lum(b) > lum(a) ? b : a));

// ------------------------------------------------------------------ misc

export const KIND_LABEL = {
    butterfly: '蝶', insect: '虫', fish: '魚', jellyfish: 'くらげ', bird: '鳥', beast: '獣',
    dragon: '龍', plant: '草木', spirit: '精霊', mineral: '鉱物'
};
export const RARITY_LABEL = { common: '並', uncommon: '珍', rare: '稀', legendary: '伝説' };
export const RARITY_RANK = { common: 1, uncommon: 2, rare: 3, legendary: 4 };

export const href = {
    place: id => `#/place/${id}`,
    district: id => `#/district/${id}`,
    creature: id => `#/creature/${id}`,
    agent: id => `#/agent/${id}`,
    work: id => `#/work/${id}`
};

export function link(to, ...kids) {
    return h('a', { href: to }, ...kids);
}
