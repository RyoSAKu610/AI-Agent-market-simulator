import { creatureCanvas } from './creature-art.js';
import { visualFeature } from './visual-art.js';
// #/bestiary and #/creature/<id>

import {
    h, clear, href, link, tagged, placeShort, nameOf, accentOf, KIND_LABEL, RARITY_LABEL, RARITY_RANK
} from './util.js';
import {
    plaque, sectionHead, chip, creatureCard, creatureArt, placeLink, goodLink, emptyNote, progressBar,
    ACTIVITY_LABEL, MOVEMENT_LABEL, SOCIAL_LABEL, CADENCE_LABEL
} from './components.js';
import { notFound } from './view-place.js';


const RARITIES = ['common', 'uncommon', 'rare', 'legendary'];

function placesOfCreature(W, c) {
    return W.places.filter(p => (p.creatures || []).includes(c.id));
}

export function bestiaryView(ctx, query) {
    const { W } = ctx;
    const state = { kind: query.kind || '', place: query.place || '', rarity: query.rarity || '', q: query.q || '' };
    const kinds = Object.keys(KIND_LABEL).filter(k => W.creatures.some(c => c.kind === k));
    const placesWith = W.places.filter(p => (p.creatures || []).length);

    const grid = h('div', { class: 'creature-grid creature-grid-lg', role: 'list' });
    let stopped = matchMedia('(prefers-reduced-motion: reduce)').matches;
    grid.classList.toggle('is-still', stopped);
    const stop = h('button', { type: 'button', class: 'btn bestiary-stop', 'aria-pressed': String(stopped), onclick: () => {
        stopped = !stopped; grid.classList.toggle('is-still', stopped);
        stop.textContent = stopped ? '絵を動かす' : '絵を止める'; stop.setAttribute('aria-pressed', String(stopped));
    } }, stopped ? '絵を動かす' : '絵を止める');
    const count = h('p', { class: 'result-count', 'aria-live': 'polite' });

    const toggle = (key, value, label, cls = '') => {
        const b = h('button', {
            type: 'button', class: ('chip chip-btn ' + cls).trim(), 'aria-pressed': String(state[key] === value),
            onclick: () => { state[key] = state[key] === value ? '' : value; syncUrl(); paintButtons(); paintGrid(); }
        }, label);
        b.dataset.key = key; b.dataset.value = value;
        return b;
    };
    const kindBtns = kinds.map(k => toggle('kind', k, KIND_LABEL[k]));
    const rarityBtns = RARITIES.map(r => toggle('rarity', r, RARITY_LABEL[r], 'r-' + r));
    const placeSel = h('select', {
        'aria-label': '時片・異界で絞る',
        onchange: e => { state.place = e.target.value; syncUrl(); paintGrid(); }
    }, h('option', { value: '' }, 'すべての時片・異界'),
    placesWith.map(p => h('option', { value: p.id, selected: p.id === state.place }, placeShort(p))));
    const search = h('input', {
        type: 'search', placeholder: '名前で探す', 'aria-label': '名前で探す', value: state.q,
        oninput: e => { state.q = e.target.value.trim(); syncUrl(); paintGrid(); }
    });

    function syncUrl() {
        const qs = Object.entries(state).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
        try { history.replaceState(null, '', '#/bestiary' + (qs ? '?' + qs : '')); } catch { /* sandboxed frames */ }
    }

    function paintButtons() {
        for (const b of [...kindBtns, ...rarityBtns]) b.setAttribute('aria-pressed', String(state[b.dataset.key] === b.dataset.value));
    }

    function matches(c) {
        if (state.kind && c.kind !== state.kind) return false;
        if (state.rarity && c.rarity !== state.rarity) return false;
        if (state.place) {
            const p = W.byId.place.get(state.place);
            if (!p || !(p.creatures || []).includes(c.id)) return false;
        }
        if (state.q) {
            const hay = [c.name_ja, c.name_en, c.kana].join(' ').toLowerCase();
            if (!hay.includes(state.q.toLowerCase())) return false;
        }
        return true;
    }

    function paintGrid() {
        // the jewel butterflies lead (most iridescent first) unless the visitor has chosen a kind
        const irid = c => (c.visual && c.visual.iridescence) || 0;
        const lead = c => (!state.kind && c.kind === 'butterfly' ? 1 : 0);
        const list = W.creatures.filter(matches)
            .sort((a, b) => lead(b) - lead(a) || (lead(a) ? irid(b) - irid(a) : 0) || (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0) || a.kana.localeCompare(b.kana, 'ja'));
        clear(grid);
        for (const c of list) grid.append(h('div', { role: 'listitem' }, creatureCard(W, c, { artSize: 260, eco: ctx.eco })));
        count.textContent = `${list.length} / ${W.creatures.length} の生き物`;
        if (!list.length) grid.append(emptyNote('この条件の生き物は、まだ見つかっていません。'));
    }

    const el = h('div', { class: 'page' },
        h('header', { class: 'page-head' },
            h('h1', null, '生き物図鑑'),
            h('p', { class: 'lead' }, '宝石の翅の蝶から雲鯨まで。どの子も、落ちた鱗や贈り物だけを分けてくれる隣人で、生きたまま採ることは全時代で禁じられている。')),
        // on a phone the filters fold into one 絞り込み button so the creatures start on the first screen
        h('details', { class: 'filters-fold', open: window.innerWidth >= 900 || Object.values(state).some(Boolean) },
            h('summary', null, '絞り込み（種類・希少さ・名前）'),
            plaque({ class: 'filters' },
                h('div', { class: 'filter-row' }, h('span', { class: 'lbl' }, '種類'), h('div', { class: 'chips' }, kindBtns)),
                h('div', { class: 'filter-row' }, h('span', { class: 'lbl' }, '希少さ'), h('div', { class: 'chips' }, rarityBtns)),
                h('div', { class: 'filter-row filter-inputs' }, placeSel, search))),
        h('div', { class: 'bestiary-toolbar' }, count, stop), grid);
    paintButtons();
    paintGrid();
    return { el, title: '生き物図鑑', update() { grid.querySelectorAll('.art').forEach(a => a.update?.()); } };
}

// ---------------------------------------------------------------- one creature

function meter(label, value) {
    return h('div', { class: 'meter-row' }, h('span', null, label), progressBar(value, label), h('b', null, Math.round(value * 100) + '%'));
}

export function creatureView(ctx, id) {
    const { W } = ctx;
    const c = W.byId.creature.get(id);
    if (!c) return notFound('その生き物');
    const feature = visualFeature(ctx, 'creature', id);
    const v = c.visual || {};
    const pal = v.palette || [];
    const accent = accentOf(pal);
    const homes = (c.home || []).map(d => W.byId.district.get(d)).filter(Boolean);
    const places = placesOfCreature(W, c);
    const events = W.events.filter(e => (e.creatures || []).includes(c.id));
    const b = c.behavior || {};

    const idx = W.creatures.findIndex(x => x.id === c.id);
    const prev = W.creatures[(idx - 1 + W.creatures.length) % W.creatures.length];
    const next = W.creatures[(idx + 1) % W.creatures.length];

    const art = h('div', { class: 'creature-stage', style: { '--c1': pal[0] || '#8b5cf6', '--c2': pal[2] || accent, '--c3': pal[1] || '#2ee6d6' } },
        creatureArt(c, 300, { lazy: false }));

    const el = h('article', { class: 'page creature-page' },
        h('header', { class: 'creature-hero' },
            art,
            h('div', { class: 'creature-id' },
                h('p', { class: 'kicker' }, `${KIND_LABEL[c.kind] || c.kind} ・ ${RARITY_LABEL[c.rarity] || c.rarity} ・ 約${c.size_cm}cm`),
                h('h1', null, nameOf(c)),
                h('p', { class: 'hero-sub' }, c.kana),
                h('p', { class: 'hero-en' }, c.name_en),
                h('p', { class: 'chips' },
                    chip(KIND_LABEL[c.kind] || c.kind, 'chip-kind'), chip(RARITY_LABEL[c.rarity] || c.rarity, 'chip-rarity r-' + c.rarity),
                    b.activity ? chip(ACTIVITY_LABEL[b.activity] || b.activity) : null,
                    b.movement ? chip(MOVEMENT_LABEL[b.movement] || b.movement) : null,
                    b.social ? chip(SOCIAL_LABEL[b.social] || b.social) : null),
                h('p', { class: 'chips' }, places.map(p => placeLink(p))))),
        h('div', { class: 'page-body' },
            feature,
            feature ? h('details', { class: 'visual-compare' }, h('summary', null, '従来の動く描画も見る'), creatureCanvas(c, 300)) : null,
            h('section', { class: 'sec', 'aria-labelledby': 'cr-desc' }, sectionHead('すがた', null, 'cr-desc'), h('p', { class: 'lead' }, tagged(c.description))),
            h('section', { class: 'sec', 'aria-labelledby': 'cr-eco' }, sectionHead('くらし', '食べるもの・現れる時・経済でのはたらき', 'cr-eco'), h('p', { class: 'lead' }, tagged(c.ecology))),
            h('section', { class: 'sec', 'aria-labelledby': 'cr-lore' }, sectionHead('言い伝え', null, 'cr-lore'), plaque({ class: 'lore-card' }, h('p', null, tagged(c.lore)))),
            h('section', { class: 'sec', 'aria-labelledby': 'cr-beh' }, sectionHead('ふるまい', null, 'cr-beh'),
                h('dl', { class: 'facts' },
                    b.activity ? [h('dt', null, '活動'), h('dd', null, ACTIVITY_LABEL[b.activity] || b.activity)] : null,
                    b.movement ? [h('dt', null, '動き'), h('dd', null, MOVEMENT_LABEL[b.movement] || b.movement)] : null,
                    b.social ? [h('dt', null, '群れ方'), h('dd', null, SOCIAL_LABEL[b.social] || b.social)] : null,
                    h('dt', null, '大きさ'), h('dd', null, `約${c.size_cm}cm`))),
            h('section', { class: 'sec', 'aria-labelledby': 'cr-prod' }, sectionHead('産み出すもの', '分けてもらえるものだけが、経済に流れる', 'cr-prod'),
                (c.produces || []).length
                    ? h('div', { class: 'cards' }, c.produces.map(pr => plaque({ class: 'tech-card' }, h('h3', null, goodLink(W, pr.good)), h('p', null, tagged(pr.how)))))
                    : emptyNote('この子は何も産まない。いるだけでいい。')),
            homes.length ? h('section', { class: 'sec', 'aria-labelledby': 'cr-home' }, sectionHead('棲む場所', null, 'cr-home'),
                h('ul', { class: 'route-list' }, homes.map(d => h('li', null, link(href.district(d.id), nameOf(d)), ' ', W.placeOf(d.id) ? h('span', { class: 'ar-role' }, placeShort(W.placeOf(d.id))) : null)))) : null,
            h('section', { class: 'sec', 'aria-labelledby': 'cr-look' }, sectionHead('いろ', null, 'cr-look'),
                h('div', { class: 'look' },
                    h('div', { class: 'palette-big' }, pal.map(col => h('span', { style: { background: col }, title: col }, h('b', null, col)))),
                    h('div', null, meter('構造色の強さ', v.iridescence || 0), meter('光り方', v.glow || 0),
                        h('p', { class: 'ar-role' }, `模様：${v.pattern || '—'} ・ 形：${v.shape || '—'}`)))),
            events.length ? h('section', { class: 'sec', 'aria-labelledby': 'cr-ev' }, sectionHead('かかわる祭り', null, 'cr-ev'),
                h('ul', { class: 'route-list' }, events.map(e => h('li', null, h('b', null, e.name_ja), ' ', chip(CADENCE_LABEL[e.cadence] || e.cadence), h('p', null, tagged(e.description.slice(0, 110) + '…')))))) : null,
            h('nav', { class: 'pager', 'aria-label': '前後の生き物' },
                link(href.creature(prev.id), '← ', nameOf(prev)),
                link('#/bestiary', '図鑑に戻る'),
                link(href.creature(next.id), nameOf(next), ' →'))));
    return { el, title: nameOf(c), update() { if (feature) feature.update(); } };
}
