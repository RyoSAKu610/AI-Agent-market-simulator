// #/live — 🏟 the arena: the live camera at full size, the standings and the head-to-head
// of the moment (js/arena.js), and three ways in for a first-time visitor.

import { h, clear, href, agentShort, nameOf, fmt } from './util.js';
import { plaque, avatar } from './components.js';
import { t } from './i18n.js';
import { createLiveCamera } from './live-camera.js';
import { createBoard, rivalry, METRICS } from './arena.js';

const ROWS = 10;
const ARROW_SECONDS = 8;      // how long a ▲/▼ stays after a row changes place

export function liveView(ctx) {
    const { W, eco } = ctx;
    const unit = String(W.baseCurrency.name_ja || '').replace(/（.*）/, '');
    const cam = createLiveCamera(ctx, { big: true, onPick: id => { location.hash = href.agent(id); } });
    const board = createBoard();
    const arrows = new Map();          // metric:id → { moved, until }
    let metric = 'gain', ticks = 0;

    const show = {
        gain: v => `${v >= 0 ? '+' : '−'}${fmt(Math.abs(v))} ${unit}`,
        goal: v => `${Math.round(v * 100)}%`,
        trades: v => fmt(v)
    };
    const who = id => W.byId.agent.get(id);
    const face = id => (who(id) ? avatar(W, who(id)) : h('span', { class: 'avatar' }));
    const label = id => (who(id) ? agentShort(who(id)) : id);

    // ------------------------------------------------ standings
    const list = h('ol', { class: 'arena-rows' });
    const tabs = h('div', { class: 'arena-tabs', role: 'tablist', 'aria-label': t('arena.board') },
        Object.keys(METRICS).map(m => h('button', { type: 'button', role: 'tab', class: 'arena-tab', dataset: { metric: m }, onclick: () => { metric = m; paintBoard(); } }, t('arena.tab.' + m))));
    function paintBoard() {
        const now = performance.now();
        for (const b of tabs.children) { const on = b.dataset.metric === metric; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', String(on)); }
        const rows = board.update(eco.agents, metric);
        const top = Math.max(1e-9, Math.abs(rows[0] ? rows[0].value : 0));
        clear(list);
        for (const r of rows.slice(0, ROWS)) {
            const key = metric + ':' + r.id;
            if (r.moved) arrows.set(key, { moved: r.moved, until: now + ARROW_SECONDS * 1000 });
            const arrow = arrows.get(key);
            const moved = arrow && arrow.until > now ? arrow.moved : 0;
            list.append(h('li', { class: 'arena-row' + (moved > 0 ? ' is-up' : moved < 0 ? ' is-down' : ''), dataset: { id: r.id } },
                h('span', { class: 'arena-rank' }, String(r.rank)),
                h('span', { class: 'arena-move', 'aria-label': moved ? `${moved > 0 ? '+' : '−'}${Math.abs(moved)}` : '' }, moved > 0 ? `▲${moved}` : moved < 0 ? `▼${-moved}` : ''),
                face(r.id),
                h('a', { class: 'arena-name', href: href.agent(r.id) }, label(r.id)),
                h('span', { class: 'arena-bar', 'aria-hidden': 'true' }, h('i', { style: { width: `${Math.max(0, Math.min(100, r.value / top * 100))}%` } })),
                h('span', { class: 'arena-value' }, show[metric](r.value))));
        }
    }

    // ------------------------------------------------ head-to-head
    const duel = h('div', { class: 'arena-duel' });
    let duelKey = '';
    function paintDuel() {
        const r = rivalry(eco.agents);
        if (!r) { clear(duel); duelKey = ''; return; }
        const value = { race: v => `${Math.round(v * 100)}%`, goods: v => `×${fmt(v)}`, lead: show.gain }[r.kind];
        const what = r.kind === 'race' ? nameOf(W.byId.district.get(r.what)) : r.kind === 'goods' ? nameOf(W.byId.good.get(r.what)) : '';
        const key = [r.kind, r.a, r.b, r.what].join('|');
        if (key !== duelKey) {
            duelKey = key;
            const side = (id, cls) => h('a', { class: 'duel-side ' + cls, href: href.agent(id) }, face(id), h('strong', null, label(id)), h('span', { class: 'duel-value' }));
            clear(duel).append(
                h('p', { class: 'duel-kind' }, t('arena.kind.' + r.kind, { what })),
                h('div', { class: 'duel-pair' }, side(r.a, 'duel-a'), h('span', { class: 'duel-vs', 'aria-hidden': 'true' }, 'VS'), side(r.b, 'duel-b')),
                h('div', { class: 'duel-bar', 'aria-hidden': 'true' }, h('i')),
                h('p', { class: 'duel-gap' }));
        }
        const [av, bv] = duel.querySelectorAll('.duel-value');
        av.textContent = value(r.av); bv.textContent = value(r.bv);
        const total = Math.abs(r.av) + Math.abs(r.bv);
        duel.querySelector('.duel-bar i').style.width = `${total ? Math.max(4, Math.min(96, Math.abs(r.av) / total * 100)) : 50}%`;
        duel.querySelector('.duel-gap').textContent = t('arena.gap', { name: label(r.a), gap: r.kind === 'race' ? `${Math.round(r.gap * 100)}%` : r.kind === 'goods' ? `×${fmt(r.gap)}` : `${fmt(r.gap)} ${unit}` });
    }

    const starters = h('nav', { class: 'arena-start', 'aria-label': t('arena.title') },
        h('a', { class: 'btn', href: '#/' }, t('arena.start.watch')),
        h('a', { class: 'btn', href: '#/settings' }, t('arena.start.connect')),
        h('a', { class: 'btn btn-primary', href: '#/summon' }, t('arena.start.summon')));

    const el = h('div', { class: 'page page-arena' },
        h('header', { class: 'arena-head' }, h('h1', null, t('arena.title')), h('p', { class: 'lead' }, t('arena.lead'))),
        starters,
        h('div', { class: 'arena-grid' },
            h('div', { class: 'arena-main' }, cam.el,
                plaque({ class: 'arena-card' }, h('h2', null, t('arena.vs')), duel)),
            plaque({ class: 'arena-card arena-board' }, h('h2', null, t('arena.board')), tabs, list)));

    paintBoard(); paintDuel();
    return {
        el, title: t('arena.title'),
        // once a second from the app: the duel every time, the table every third
        update() { paintDuel(); if (++ticks % 3 === 0) paintBoard(); },
        destroy() { cam.destroy(); }
    };
}
