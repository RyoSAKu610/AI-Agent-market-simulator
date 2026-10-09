// Reusable pieces shared by the views: plaques, chips, sparklines, creature
// cards, the jewel-butterfly emblem.

import { creatureCanvas } from './creature-art.js';
import { agentFaceCanvas } from './agent-art.js';
import { VIA, GOAL_LABELS } from './sim.js';
import {
    h, svg, link, href, accentOf, deepOf, lightOf, rgba, placeShort, nameOf,
    KIND_LABEL, RARITY_LABEL, clamp
} from './util.js';

export const STAGE_LABEL = { idle: '待機', react: '！ 反応', think: '💭 思案', travel: '🏃 移動', trade: '◆ 取引' };
export const CADENCE_LABEL = { daily: '毎日', weekly: '毎週', monthly: '毎月', seasonal: '季節ごと', yearly: '毎年', rare: 'まれに' };
export const ACTIVITY_LABEL = { diurnal: '昼行性', nocturnal: '夜行性', crepuscular: '薄明薄暮性', always: '一日じゅう' };
export const MOVEMENT_LABEL = { flutter: '羽ばたく', glide: '滑空する', swim: '泳ぐ', drift: '漂う', walk: '歩く', hover: '空にとどまる', still: 'じっとしている' };
export const SOCIAL_LABEL = { solitary: '単独', pair: 'つがい', swarm: '群れ', school: '魚群', herd: '群れ' };
export const CATEGORY_LABEL = {
    material: '素材', energy: 'エネルギー', food: '食', craft: '工芸', knowledge: '知識',
    art: '芸術', transport: '輸送', luxury: '贅沢品', service: 'サービス'
};

export const viaLabel = id => (VIA[id] ? VIA[id].label : id);
export const goalLabel = type => GOAL_LABELS[type] || type;

// ---------------------------------------------------------------- frames

// An 絵馬-shaped plaque: peaked top, gold edge, indigo glass inside.
export function plaque(attrs, ...kids) {
    const cls = ['ema', attrs && attrs.class].filter(Boolean).join(' ');
    return h('div', { ...attrs, class: cls }, h('div', { class: 'ema-in' }, ...kids));
}

export function sectionHead(title, sub, id) {
    return h('header', { class: 'section-head' },
        h('h2', { id }, h('span', { class: 'gem', 'aria-hidden': 'true' }), title),
        sub ? h('p', { class: 'section-sub' }, sub) : null);
}

export const chip = (text, cls = '') => h('span', { class: ('chip ' + cls).trim() }, text);

export function swatches(palette) {
    return h('span', { class: 'swatches', 'aria-hidden': 'true' },
        (palette || []).map(c => h('i', { style: { background: c } })));
}

export function placeLink(place, extra) {
    if (!place) return null;
    const pal = (place.aesthetic && place.aesthetic.palette) || [];
    return h('a', { class: 'place-link', href: href.place(place.id) },
        h('i', { class: 'dot', style: { background: accentOf(pal) } }), placeShort(place), extra || null);
}

export function goodLink(W, id) {
    const g = W.byId.good.get(id);
    return h('a', { class: 'chip chip-good', href: `#/market?good=${encodeURIComponent(id)}`, title: g ? g.name_en : id }, g ? nameOf(g) : id);
}

export function progressBar(value, label) {
    const v = clamp(value || 0, 0, 1);
    return h('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(v * 100), 'aria-label': label || '進み具合' },
        h('i', { style: { width: (v * 100).toFixed(1) + '%' } }));
}

// ---------------------------------------------------------------- sparkline

export function spark(values, { w = 120, h: ht = 32, color = '#e8c36a' } = {}) {
    const el = svg('svg', { class: 'spark', viewBox: `0 0 ${w} ${ht}`, width: w, height: ht, role: 'img', 'aria-label': '価格の推移' });
    const v = (values || []).filter(Number.isFinite);
    if (v.length < 2) {
        el.append(svg('line', { x1: 0, y1: ht / 2, x2: w, y2: ht / 2, stroke: rgba(color, 0.35), 'stroke-width': 1.2, 'stroke-dasharray': '2 4' }));
        return el;
    }
    const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || Math.max(1e-6, hi * 0.02);
    const pts = v.map((p, i) => [(i / (v.length - 1)) * (w - 4) + 2, ht - 3 - ((p - lo) / span) * (ht - 6)]);
    const line = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const id = 'sp' + Math.random().toString(36).slice(2, 7);
    el.append(
        svg('defs', {}, svg('linearGradient', { id, x1: 0, y1: 0, x2: 0, y2: 1 },
            svg('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 0.35 }), svg('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }))),
        svg('polygon', { points: `2,${ht} ${line} ${w - 2},${ht}`, fill: `url(#${id})` }),
        svg('polyline', { points: line, fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
        svg('circle', { cx: pts[pts.length - 1][0], cy: pts[pts.length - 1][1], r: 2.2, fill: '#fff4cf' }));
    return el;
}

// ---------------------------------------------------------------- creatures

// Canvases are only made when a card scrolls near the viewport: a bestiary of
// sixty animated creatures would otherwise paint them all at once.
let lazyObserver = null;
function observeLazy(el, make) {
    if (typeof IntersectionObserver !== 'function') { el.append(make()); return; }
    if (!lazyObserver) {
        lazyObserver = new IntersectionObserver(entries => {
            for (const en of entries) {
                if (!en.isIntersecting) continue;
                lazyObserver.unobserve(en.target);
                const fn = en.target.__make;
                en.target.__make = null;
                if (fn) en.target.append(fn());
            }
        }, { rootMargin: '200px' });
    }
    el.__make = make;
    lazyObserver.observe(el);
}

export function creatureArt(creature, size, { lazy = true, animate = true } = {}) {
    const box = h('div', { class: 'art', style: { width: size + 'px', height: size + 'px' } });
    const make = () => creatureCanvas(creature, size, { animate });
    if (lazy) observeLazy(box, make); else box.append(make());
    return box;
}

export function creatureCard(W, c) {
    const home = W.byId.district.get((c.home || [])[0]);
    const place = home && W.placeOf(home.id);
    const pal = (c.visual && c.visual.palette) || [];
    return h('a', { class: 'creature-card rarity-' + c.rarity, href: href.creature(c.id), style: { '--c1': pal[0] || '#8b5cf6', '--c2': pal[2] || '#2ee6d6' } },
        creatureArt(c, 132),
        h('div', { class: 'cc-body' },
            h('strong', { class: 'cc-name' }, nameOf(c)),
            h('span', { class: 'cc-en' }, c.name_en),
            h('span', { class: 'cc-meta' },
                chip(KIND_LABEL[c.kind] || c.kind, 'chip-kind'),
                chip(RARITY_LABEL[c.rarity] || c.rarity, 'chip-rarity r-' + c.rarity),
                place ? h('span', { class: 'cc-place' }, placeShort(place)) : null)));
}

// The jewel butterfly that is on every screen: the most iridescent one in the world.
export function jewelButterfly(W) {
    const flies = W.creatures.filter(c => c.kind === 'butterfly');
    flies.sort((a, b) => ((b.visual && b.visual.iridescence) || 0) - ((a.visual && a.visual.iridescence) || 0));
    return flies[0] || null;
}

export function butterflyFor(W, place) {
    const own = (place && place.creatures || []).map(id => W.byId.creature.get(id)).filter(c => c && c.kind === 'butterfly');
    own.sort((a, b) => ((b.visual && b.visual.iridescence) || 0) - ((a.visual && a.visual.iridescence) || 0));
    return own[0] || jewelButterfly(W);
}

// ---------------------------------------------------------------- agents

export function stageBadge(stage) {
    return h('span', { class: 'stage-badge stage-' + stage }, STAGE_LABEL[stage] || stage);
}

export function agentAccent(W, agent) {
    const d = W.byId.district.get(agent.home);
    const p = d && W.placeOf(d.id);
    return accentOf(p && p.aesthetic && p.aesthetic.palette);
}

// The coin keeps its jewel gradient and rim; the neon-chibi face sits in it.
export function avatar(W, agent) {
    const d = W.byId.district.get(agent.home);
    const p = d && W.placeOf(d.id);
    const pal = (p && p.aesthetic && p.aesthetic.palette) || [];
    return h('span', {
        class: 'avatar ' + (agent.origin === 'native' ? 'is-native' : 'is-neon'), 'aria-hidden': 'true',
        style: { '--a1': accentOf(pal), '--a2': lightOf(pal), '--a0': deepOf(pal) }
    }, agentFaceCanvas(W, agent, 96));
}

// What an agent is doing, without repeating the badge: the idle label says
// nothing new, and a trip reads as "→ where (by what)".
export function liveActivity(live) {
    const text = String((live && live.activity) || '').trim();
    if (!text) return '';
    const badge = (STAGE_LABEL[live.stage] || '').replace(/^[^\p{L}]+\s*/u, '');
    if (text === badge || text === STAGE_LABEL[live.stage]) return '';
    const trip = text.match(/^(.+?)へ(.+?)で移動中$/);
    if (trip) return `→ ${trip[1]}（${trip[2]}）`;   // the badge says 移動; this says where to and by what
    return text;
}

export const goalPct = live => Math.round(Math.max(0, Math.min(1, (live && live.goalProgress) || 0)) * 100);

export function emptyNote(text) {
    return h('p', { class: 'empty' }, text);
}

export { link };
