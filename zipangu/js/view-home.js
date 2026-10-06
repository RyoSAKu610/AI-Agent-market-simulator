// #/ — the kaleidoscope map with the HUD laid over it.

import { createMap } from './map.js';
import { VIA } from './sim.js';
import {
    h, clear, href, placeShort, placeSub, nameOf, agentShort, firstSentence, clip, fmt, accentOf, KIND_LABEL, RARITY_LABEL
} from './util.js';
import { plaque, chip, swatches, creatureArt, stageBadge, progressBar, goalLabel, goodLink, avatar } from './components.js';

// How each vehicle looks on the map, for the legend (colours match map.js).
const VIA_SWATCH = {
    ginga_tetsudo: ['#9fc3e8', '夜に光る星の線路'],
    chodo: ['#d6c8ff', '点の蝶の道'],
    torii: ['#e2532d', '朱の破線'],
    kumoito: ['#e6ecf8', '細い銀の糸'],
    oshie: ['#f2e6ff', 'またたく切れ目'],
    hojo_capsule: ['#5fd1c8', 'ゆっくりのカプセル'],
    tamamushi_car: ['#7fe3a8', '緑金の尾'],
    karasu_bikyaku: ['#c9cdd6', '翼のしるし']
};

export function homeView(ctx) {
    const { W, eco, hud } = ctx;
    const canvas = h('canvas', {
        class: 'map-canvas', tabindex: '0',
        'aria-label': '万華京の地図。十の時片が万華鏡の鏡片として中心を囲み、八つの異界が縁に灯る。ドラッグで移動、ホイールかピンチで拡大、タップで選択。矢印キーで移動、プラスとマイナスで拡大縮小。'
    });
    const info = h('div', { class: 'info-slot' });
    let map = null;
    let current = null;

    const stage = h('div', { class: 'stage' });
    const insets = () => {
        const w = stage.clientWidth, hgt = stage.clientHeight;
        if (w >= 900) return { top: 0, right: 372, bottom: 0, left: 0 };       // the side column
        const sheet = info.classList.contains('is-open') ? info.offsetHeight + 16 : Math.min(130, hgt * 0.18);
        return { top: Math.min(190, hgt * 0.24), right: 0, bottom: sheet, left: 0 };
    };

    // zoom buttons: useful on desktop and for keyboard users
    const zoomBox = h('div', { class: 'zoom-box', role: 'group', 'aria-label': '地図の拡大縮小' },
        h('button', { type: 'button', 'aria-label': '拡大', onclick: () => map && map.zoomBy(1.4) }, '＋'),
        h('button', { type: 'button', 'aria-label': '縮小', onclick: () => map && map.zoomBy(1 / 1.4) }, '－'),
        h('button', { type: 'button', 'aria-label': '中心へ戻る', onclick: () => { if (map) map.reset(); select(null); } }, '◎'));

    const legend = h('details', { class: 'legend' },
        h('summary', null, '凡例'),
        h('ul', null, Object.entries(VIA_SWATCH).map(([id, [color, note]]) =>
            h('li', null, h('i', { style: { background: color } }), h('b', null, VIA[id] ? VIA[id].label : id), h('span', null, note)))),
        h('p', { class: 'legend-note' }, 'ひし形＝地区　◎＝万世時計　✦＝祭りの最中　丸い光＝エージェント'));

    // the same places as a list, for screen readers and keyboards
    const places = h('nav', { class: 'sr-places', 'aria-label': '時片と異界の一覧' },
        h('ul', null, W.places.map(p => h('li', null, h('a', { href: href.place(p.id) }, placeShort(p) + (placeSub(p) ? '：' + placeSub(p) : ''))))));

    // On wide screens the HUD, the info plaque and the feed share one column beside the map.
    const side = h('div', { class: 'side' }, hud.clockPanel, hud.ticker, info, hud.feed);
    stage.append(canvas, side, zoomBox, legend, places);

    // ------------------------------------------------ info plaque
    function select(sel) {
        current = sel;
        if (map) map.select(sel);
        clear(info);
        if (!sel) { info.classList.remove('is-open'); return; }
        const card = buildCard(sel);
        if (!card) { info.classList.remove('is-open'); return; }
        info.append(card.el);
        info.classList.add('is-open');
        current = { ...sel, update: card.update };
    }

    function closeButton() {
        return h('button', { type: 'button', class: 'info-close', 'aria-label': '閉じる', onclick: () => select(null) }, '×');
    }

    function buildCard(sel) {
        if (sel.type === 'place') return placeCard(W.byId.place.get(sel.id));
        if (sel.type === 'district') return districtCard(W.byId.district.get(sel.id));
        if (sel.type === 'agent') return agentCard(W.byId.agent.get(sel.id));
        if (sel.type === 'creature') return creatureCard(W.byId.creature.get(sel.id));
        return null;
    }

    function placeCard(p) {
        if (!p) return null;
        const pal = (p.aesthetic && p.aesthetic.palette) || [];
        const isEra = W.byId.era.has(p.id);
        const el = plaque({ class: 'info-card', style: { '--accent': accentOf(pal) } },
            closeButton(),
            h('div', { class: 'info-kicker' }, isEra ? `時片 ${p.real_period || ''}` : `異界 ${p.source ? '『' + p.source.work + '』' : ''}`, swatches(pal)),
            h('h2', { class: 'info-title' }, placeShort(p)),
            placeSub(p) ? h('p', { class: 'info-sub' }, placeSub(p)) : null,
            h('p', { class: 'info-text' }, clip(p.summary || firstSentence(p.lore), 120)),
            h('p', { class: 'info-chips' },
                chip(`${(p.districts || []).length} 地区`), chip(`${(p.creatures || []).length} の生き物`), chip(`${(p.agents || []).length} の住人`)),
            h('div', { class: 'info-actions' },
                h('a', { class: 'btn btn-primary', href: href.place(p.id) }, 'この時片を歩く →'),
                h('button', { type: 'button', class: 'btn', onclick: () => map && map.focus(p.id) }, '寄る')));
        return { el };
    }

    function districtCard(d) {
        if (!d) return null;
        const place = W.placeOf(d.id);
        const pal = (place && place.aesthetic && place.aesthetic.palette) || [];
        const el = plaque({ class: 'info-card', style: { '--accent': accentOf(pal) } },
            closeButton(),
            h('div', { class: 'info-kicker' }, '地区', place ? ` ・ ${placeShort(place)}` : '', swatches(pal)),
            h('h2', { class: 'info-title' }, nameOf(d)),
            h('p', { class: 'info-text' }, clip(d.summary, 110)),
            h('p', { class: 'info-chips' },
                (d.produces || []).slice(0, 3).map(g => goodLink(W, g)),
                (d.demands || []).length ? h('span', { class: 'info-wants' }, '求む') : null,
                (d.demands || []).slice(0, 2).map(g => goodLink(W, g))),
            h('div', { class: 'info-actions' },
                h('a', { class: 'btn btn-primary', href: href.district(d.id) }, 'この地区へ →'),
                h('button', { type: 'button', class: 'btn', onclick: () => map && map.focus(d.id) }, '寄る')));
        return { el };
    }

    function agentCard(a) {
        const live = a && eco.agents.get(a.id);
        if (!a || !live) return null;
        const status = h('p', { class: 'info-live' });
        const goal = h('div', { class: 'info-goal' });
        const wallet = h('span', { class: 'info-wallet' });
        const paint = () => {
            clear(status); status.append(stageBadge(live.stage), ' ', live.activity);
            clear(goal); goal.append(h('span', null, goalLabel(live.goalType)), progressBar(live.goalProgress, `${a.name}の長期目標の進み具合`));
            wallet.textContent = `${fmt(live.wallet)} ${W.baseCurrency.name_ja.replace(/（.*）/, '')}`;
        };
        paint();
        const el = plaque({ class: 'info-card' },
            closeButton(),
            h('div', { class: 'info-head' }, avatar(W, a),
                h('div', null, h('h2', { class: 'info-title' }, agentShort(a)), h('p', { class: 'info-sub' }, clip(a.role, 40)))),
            status, goal, wallet,
            h('div', { class: 'info-actions' },
                h('a', { class: 'btn btn-primary', href: href.agent(a.id) }, '素性を見る →'),
                h('button', { type: 'button', class: 'btn', onclick: () => map && map.focus(a.id) }, '追う')));
        return { el, update: paint };
    }

    function creatureCard(c) {
        if (!c) return null;
        const pal = (c.visual && c.visual.palette) || [];
        const el = plaque({ class: 'info-card info-creature', style: { '--accent': accentOf(pal) } },
            closeButton(),
            h('div', { class: 'info-head' }, creatureArt(c, 84, { lazy: false }),
                h('div', null,
                    h('h2', { class: 'info-title' }, nameOf(c)),
                    h('p', { class: 'info-sub' }, c.name_en),
                    h('p', { class: 'info-chips' }, chip(KIND_LABEL[c.kind] || c.kind), chip(RARITY_LABEL[c.rarity] || c.rarity, 'r-' + c.rarity)))),
            h('p', { class: 'info-text' }, clip(c.description, 90)),
            h('div', { class: 'info-actions' }, h('a', { class: 'btn btn-primary', href: href.creature(c.id) }, '図鑑で見る →')));
        return { el };
    }

    // ------------------------------------------------ lifecycle
    map = createMap(canvas, W, eco, {
        onSelect: select,
        getInsets: insets,
        view: ctx.mapView
    });
    if (ctx.pendingFocus) { const id = ctx.pendingFocus; ctx.pendingFocus = null; setTimeout(() => map && map.focus(id), 50); }

    return {
        el: stage,
        update() { if (current && current.update) current.update(); },
        destroy() {
            ctx.mapView = map.getView();
            map.destroy();
            map = null;
        },
        stats: () => (map ? map.getStats() : null),
        hits: () => (map ? map.getHits() : [])
    };
}

