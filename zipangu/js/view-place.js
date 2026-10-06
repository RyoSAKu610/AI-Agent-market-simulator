// #/place/<id> and #/district/<id>

import { creatureCanvas } from './creature-art.js';
import { renderMarkdown } from './markdown.js';
import {
    h, clear, href, link, tagged, placeShort, placeSub, nameOf, agentShort, clip, fmtPrice, accentOf, deepOf,
    lightOf, mixHex, stripParens
} from './util.js';
import {
    plaque, sectionHead, chip, swatches, placeLink, goodLink, creatureCard, stageBadge, avatar, emptyNote,
    butterflyFor, CADENCE_LABEL, viaLabel
} from './components.js';


export function notFound(what) {
    return { el: h('div', { class: 'page' }, plaque({ class: 'notice' }, h('h1', null, '見つかりません'), h('p', null, `${what}は、この世界のどこにもありませんでした。`), h('p', null, link('#/', '地図へ戻る')))) };
}

function section(id, title, sub, ...kids) {
    return h('section', { class: 'sec', 'aria-labelledby': id, id: 'sec-' + id }, sectionHead(title, sub, id), ...kids);
}

// A hero with the place's palette as stained glass and a jewel butterfly fluttering in it.
function hero(W, p, extra) {
    const pal = (p.aesthetic && p.aesthetic.palette) || [];
    const accent = accentOf(pal), deep = mixHex(deepOf(pal), '#141a58', 0.5), light = lightOf(pal);
    const fly = butterflyFor(W, p);
    const art = fly ? h('div', { class: 'hero-fly', 'aria-hidden': 'true' }, creatureCanvas(fly, 168)) : null;
    return h('header', {
        class: 'hero',
        style: { '--g0': deep, '--g1': mixHex(accent, deep, 0.78), '--g2': mixHex(accent, deep, 0.5), '--light': light }
    }, art,
    h('div', { class: 'hero-body' },
        extra.kicker ? h('p', { class: 'kicker' }, extra.kicker) : null,
        h('h1', null, extra.title),
        extra.sub ? h('p', { class: 'hero-sub' }, extra.sub) : null,
        extra.en ? h('p', { class: 'hero-en' }, extra.en) : null,
        extra.summary ? h('p', { class: 'hero-summary' }, extra.summary) : null,
        h('div', { class: 'hero-palette' }, swatches(pal), extra.chips || null),
        extra.nav || null));
}

function anchorNav(items) {
    return h('nav', { class: 'anchors', 'aria-label': 'このページの見出し' }, items.map(([id, label]) =>
        h('a', {
            href: '#/', onclick: e => {
                e.preventDefault();
                const t = document.getElementById('sec-' + id);
                if (t) t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
            }
        }, label)));
}

function districtCard(W, d, eco) {
    const makes = (d.produces || []).map(g => goodLink(W, g));
    const wants = (d.demands || []).map(g => goodLink(W, g));
    return h('article', { class: 'district-card' },
        h('h3', null, link(href.district(d.id), nameOf(d))),
        h('p', { class: 'dc-en' }, d.name_en),
        h('p', null, tagged(clip(d.summary, 120))),
        (d.landmarks || []).length ? h('details', null,
            h('summary', null, `名所 ${d.landmarks.length}`),
            h('ul', { class: 'landmarks' }, d.landmarks.map(l => h('li', null, h('strong', null, nameOf({ name_ja: l.name_ja })), '：', tagged(clip(l.description, 90)))))) : null,
        h('div', { class: 'makes' },
            makes.length ? h('p', null, h('span', { class: 'lbl' }, '作る'), makes) : null,
            wants.length ? h('p', null, h('span', { class: 'lbl lbl-want' }, '求む'), wants) : null));
}

function agentRow(W, eco, a, rows) {
    const live = eco.agents.get(a.id);
    const status = h('span', { class: 'ar-status' });
    const act = h('span', { class: 'ar-act' });
    const row = h('li', { class: 'agent-row' },
        avatar(W, a),
        h('div', { class: 'ar-main' },
            h('strong', null, link(href.agent(a.id), agentShort(a))),
            h('span', { class: 'ar-role' }, clip(a.role, 38)),
            h('span', { class: 'ar-live' }, status, act)));
    const paint = () => {
        if (!live) return;
        clear(status); status.append(stageBadge(live.stage));
        act.textContent = live.activity;
    };
    paint();
    rows.push(paint);
    return row;
}

function eventCard(W, eco, ev, painters) {
    const badge = h('span', { class: 'chip chip-live', hidden: true }, '開催中');
    const effects = (ev.effects || []).slice(0, 4).map(e => {
        const g = W.byId.good.get(e.good);
        const m = e.demand_multiplier;
        return chip(`${g ? nameOf(g) : e.good} ×${m}`, m >= 1 ? 'chip-up' : 'chip-down');
    });
    painters.push(() => { badge.hidden = !eco.activeEvents.some(a => (a.event || a).id === ev.id); });
    return h('article', { class: 'event-card' },
        h('h3', null, ev.name_ja, ' ', badge),
        h('p', { class: 'ev-meta' }, chip(CADENCE_LABEL[ev.cadence] || ev.cadence), ev.season ? chip(stripParens(ev.season).slice(0, 14)) : null),
        h('p', null, tagged(clip(ev.description, 130))),
        h('p', { class: 'chips' }, effects));
}

export function placeView(ctx, id) {
    const { W, eco } = ctx;
    const p = W.byId.place.get(id);
    if (!p) return notFound('その時片・異界');
    const isEra = W.byId.era.has(id);
    const painters = [];
    const dist = W.districtsIn(id);
    const distIds = new Set(dist.map(d => d.id));
    const sections = [];
    const nav = [];
    const add = (sid, label, el) => { nav.push([sid, label]); sections.push(el); };

    const kicker = isEra ? `時片 第${p.order}  ・  史実の頃：${p.real_period || ''}` : `異界${p.source ? '  ・  『' + p.source.work + '』' + (p.source.author ? '  ' + p.source.author : '') : ''}`;
    const chips = h('span', { class: 'hero-chips' },
        isEra && p.divergence ? chip(`分岐 ${p.divergence.year}`) : null,
        chip(`${dist.length} 地区`), chip(`${(p.creatures || []).length} の生き物`), chip(`${(p.agents || []).length} の住人`));

    // ---- あらまし
    if (p.lore) add('lore', 'あらまし', section('lore', 'あらまし', null,
        h('div', { class: 'prose lore' }, String(p.lore).split(/\n+/).map(t => h('p', null, tagged(t))))));

    // ---- divergence (eras)
    if (isEra && p.divergence) {
        const dv = p.divergence;
        add('divergence', '分岐点', section('divergence', '分岐点', `${dv.year} ・ ここで歴史が一歩だけ別の道へ`,
            h('div', { class: 'diverge' },
                h('div', { class: 'dv dv-fact' },
                    h('h3', null, h('span', { class: 'tag tag-fact' }, '史実'), '実際にあったこと'),
                    h('p', null, tagged(String(dv.real_anchor || '').replace(/^【史実】/, ''))),
                    (dv.figures || []).length ? h('ul', { class: 'figures' }, dv.figures.map(f =>
                        h('li', null, h('strong', null, f.name), h('span', { class: 'life' }, f.life), h('span', null, tagged(f.role))))) : null),
                h('div', { class: 'dv dv-fiction' },
                    h('h3', null, h('span', { class: 'tag tag-fiction' }, '創作'), 'もしも、こうだったら'),
                    h('p', null, tagged(String(dv.what_if || '').replace(/^【創作】/, ''))),
                    dv.fiction_note ? h('p', { class: 'fiction-note' }, tagged(dv.fiction_note)) : null))));
    }

    // ---- cascade timeline
    if (isEra && (p.cascade || []).length) {
        add('cascade', '時のつながり', section('cascade', '時のつながり', 'その分岐が、いまへ届くまで',
            h('ol', { class: 'timeline' }, p.cascade.map(c =>
                h('li', null, h('span', { class: 'tl-year' }, String(c.year)), h('p', null, tagged(c.event)))))));
    }

    if (isEra && (p.alt_present || []).length) {
        add('alt', 'ここでは当たり前', section('alt', 'ここでは当たり前', '今の世界ではありえないことが、ふつうに起こる',
            h('ul', { class: 'wonders' }, p.alt_present.map(w => h('li', null, h('span', { class: 'spark-gem', 'aria-hidden': 'true' }), h('p', null, tagged(w)))))));
    }

    if ((p.signature_tech || []).length) {
        add('tech', '時代の技', section('tech', '時代の技', null,
            h('div', { class: 'cards' }, p.signature_tech.map(t => plaque({ class: 'tech-card' }, h('h3', null, t.name), h('p', null, tagged(t.description)))))));
    }

    // ---- light, motifs, sound
    if (p.aesthetic) {
        const a = p.aesthetic;
        add('look', 'いろ・おと・ひかり', section('look', 'いろ・おと・ひかり', null,
            h('div', { class: 'look' },
                h('div', null, h('h3', null, '色'), h('div', { class: 'palette-big' }, (a.palette || []).map(c => h('span', { style: { background: c }, title: c }, h('b', null, c)))),
                    (a.motifs || []).length ? h('ul', { class: 'motifs' }, a.motifs.map(m => h('li', null, m))) : null),
                h('div', null, a.light ? [h('h3', null, 'ひかり'), h('p', null, a.light)] : null, a.soundscape ? [h('h3', null, 'おと'), h('p', null, a.soundscape)] : null))));
    }

    // ---- districts
    if (dist.length) add('districts', '地区', section('districts', '地区', '何が作られ、何が求められているか',
        h('div', { class: 'cards cards-districts' }, dist.map(d => districtCard(W, d, eco)))));

    // ---- creatures
    const creatures = (p.creatures || []).map(c => W.byId.creature.get(c)).filter(Boolean);
    if (creatures.length) add('creatures', '生き物', section('creatures', '生き物', '落鱗や贈り物だけを分けてくれる隣人たち',
        h('div', { class: 'creature-grid' }, creatures.map(c => creatureCard(W, c)))));

    // ---- agents (live)
    const agents = (p.agents || []).map(a => W.byId.agent.get(a)).filter(Boolean);
    if (agents.length) add('agents', '住人', section('agents', '住人', 'いま何をしているか（実況）',
        h('ul', { class: 'agent-rows' }, agents.map(a => agentRow(W, eco, a, painters)))));

    // ---- books
    const works = W.library.filter(w => w.placed_in === id);
    if (works.length) add('books', '書物', section('books', '書物', 'この地にある、没後の約束を果たした本',
        h('div', { class: 'cards' }, works.map(w => plaque({ class: 'work-mini' },
            h('h3', null, link(href.work(w.id), `『${w.title}』`)),
            h('p', { class: 'wm-author' }, w.author),
            h('p', null, clip(w.in_world_role, 90)))))));

    // ---- events
    const events = W.events.filter(e => e.where === id || distIds.has(e.where));
    if (events.length) add('events', '祭りと事件', section('events', '祭りと事件', null,
        h('div', { class: 'cards' }, events.map(e => eventCard(W, eco, e, painters)))));

    // ---- chapter
    const chapterBox = h('div', { class: 'chapter-body' }, h('p', { class: 'empty' }, '章を読み込んでいます…'));
    const chapterSec = section('chapter', '歩いてみる', 'この地の案内記', chapterBox);
    chapterSec.hidden = true;
    nav.push(['chapter', '案内記']);
    sections.push(chapterSec);
    ctx.loadDoc(isEra ? 'eras' : 'realms', id).then(md => {
        if (!md) return;
        chapterBox.replaceChildren(renderMarkdown(md));
        chapterSec.hidden = false;
    }).catch(() => {});

    // ---- connections
    const conn = (p.connections || []).map(c => W.byId.place.get(c)).filter(Boolean);
    if (conn.length) add('links', 'つながる先', section('links', 'つながる先', '時層鳥居や異界の線路でひらける道',
        h('p', { class: 'chips' }, conn.map(c => placeLink(c)))));

    const el = h('article', { class: 'page place-page' },
        hero(W, p, {
            kicker, title: placeShort(p), sub: placeSub(p), en: p.name_en, summary: p.summary, chips,
            nav: anchorNav(nav.filter(([sid]) => sid !== 'chapter' || true))
        }),
        h('div', { class: 'page-body' }, sections));

    return { el, title: placeShort(p), update: () => painters.forEach(fn => fn()), destroy() {} };
}

// ---------------------------------------------------------------- district

export function districtView(ctx, id) {
    const { W, eco } = ctx;
    const d = W.byId.district.get(id);
    if (!d) return notFound('その地区');
    const place = W.placeOf(id);
    const painters = [];

    const priceTable = rowsFor(W, eco, d);
    const residents = (d.residents || []).map(c => W.byId.creature.get(c)).filter(Boolean);
    const here = [...eco.agents.values()].filter(a => a.home === id || a.at === id).map(a => W.byId.agent.get(a.id)).filter(Boolean);
    const routes = (W.world.trade_routes || []).filter(r => r.from === id || r.to === id);
    const events = W.events.filter(e => e.where === id);

    const sections = [];
    if (d.summary) sections.push(section('summary', 'この地区', null, h('p', { class: 'lead' }, tagged(d.summary))));
    if ((d.landmarks || []).length) sections.push(section('landmarks', '名所', null,
        h('div', { class: 'cards' }, d.landmarks.map(l => plaque({ class: 'tech-card' }, h('h3', null, l.name_ja), h('p', null, tagged(l.description)))))));
    sections.push(section('goods', '作るもの・求めるもの', '価格は基軸通貨で、いまの相場',
        h('div', { class: 'two-col' }, priceTable.make, priceTable.want)));
    if (d.ambience) sections.push(section('ambience', '空気', null, h('p', { class: 'lead' }, d.ambience)));
    if (residents.length) sections.push(section('residents', '棲む生き物', null, h('div', { class: 'creature-grid' }, residents.map(c => creatureCard(W, c)))));
    if ((d.agent_roles || []).length) sections.push(section('roles', 'ここで働く人びと', null, h('p', { class: 'chips' }, d.agent_roles.map(r => chip(r)))));
    if (here.length) sections.push(section('agents', 'いま・ここにいる／ここの住人', null, h('ul', { class: 'agent-rows' }, here.map(a => agentRow(W, eco, a, painters)))));
    if (routes.length) sections.push(section('routes', 'ここから出る道', null,
        h('ul', { class: 'route-list' }, routes.map(r => {
            const other = W.byId.district.get(r.from === id ? r.to : r.from);
            return h('li', null, h('b', null, viaLabel(r.via)), ' → ', other ? link(href.district(other.id), nameOf(other)) : '?', h('span', { class: 'rt-goods' }, ' ', (r.goods || []).slice(0, 3).map(g => goodLink(W, g))), h('p', null, tagged(clip(r.narrative, 110))));
        }))));
    if (events.length) sections.push(section('events', '祭りと事件', null, h('div', { class: 'cards' }, events.map(e => eventCard(W, eco, e, painters)))));

    const el = h('article', { class: 'page place-page' },
        hero(W, place || {}, {
            kicker: place ? `地区 ・ ${placeShort(place)}` : '地区', title: nameOf(d), en: d.name_en,
            chips: place ? placeLink(place) : null
        }),
        h('div', { class: 'page-body' }, sections));

    const paintPrices = priceTable.update;
    return { el, title: nameOf(d), update() { painters.forEach(fn => fn()); paintPrices(); } };
}

function rowsFor(W, eco, d) {
    const mk = (title, ids) => {
        const cells = ids.map(gid => {
            const g = W.byId.good.get(gid);
            const price = h('span', { class: 'gp-price' });
            const li = h('li', null, goodLink(W, gid), price);
            return { li, gid, g, price };
        });
        const box = h('div', null, h('h3', null, title), cells.length ? h('ul', { class: 'good-prices' }, cells.map(c => c.li)) : emptyNote('なし'));
        return { box, cells };
    };
    const make = mk('作るもの', d.produces || []), want = mk('求めるもの', d.demands || []);
    const update = () => {
        const row = eco.prices.get(d.id);
        for (const set of [make, want]) for (const c of set.cells) {
            const p = row && row.get(c.gid);
            c.price.textContent = Number.isFinite(p) ? fmtPrice(p) + ' ' + stripParens(W.baseCurrency.name_ja) : '—';
            if (c.g && Number.isFinite(p)) c.price.dataset.dir = p > c.g.base_price * 1.05 ? 'up' : p < c.g.base_price * 0.95 ? 'down' : 'flat';
        }
    };
    update();
    return { make: make.box, want: want.box, update };
}
