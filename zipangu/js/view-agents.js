import { characterPanel } from './character-panel.js';
import { agentChainPanel } from './view-chain.js';
import { dramaPanel } from './drama-panel.js';
import { visualFeature, visualArt } from './visual-art.js';
import { visualOf } from './visual-manifest.js';
// #/agents and #/agent/<id>

import { h, clear, href, link, tagged, nameOf, agentShort, clip, fmt, stripParens } from './util.js';
import {
    plaque, sectionHead, avatar, stageBadge, progressBar, goalLabel, goodLink, placeLink, emptyNote,
    STAGE_LABEL, liveActivity, goalPct
} from './components.js';
import { notFound } from './view-place.js';
import { t } from './i18n.js';


const ORIGIN_LABEL = { neon_mythos: 'NEON MYTHOS の住人', native: '万華京の生え抜き', traveller: t('origin.traveller') };

function whereIs(W, live) {
    if (live.at) {
        const d = W.byId.district.get(live.at);
        return d ? nameOf(d) : live.at;
    }
    const to = live.target && W.byId.district.get(live.target);
    return to ? `${nameOf(to)}へ向かう途中` : '移動中';
}

export function agentsView(ctx, query) {
    const { W, eco } = ctx;
    const cur = stripParens(W.baseCurrency.name_ja);
    const state = { origin: query.origin || '', stage: query.stage || '', sort: query.sort || 'wallet', q: query.q || '' };
    const grid = h('div', { class: 'agent-grid', role: 'list' });
    const count = h('p', { class: 'result-count', 'aria-live': 'polite' });
    const cells = new Map();

    function card(a) {
        const live = eco.agents.get(a.id);
        const v = visualOf('agent', a.id);
        const art = v ? visualArt(W, v, { size: 160, eco }) : null;
        const stage = h('span', { class: 'ag-stage' });
        const act = h('p', { class: 'ag-act' });
        const wallet = h('b', { class: 'ag-wallet' });
        const where = h('span', { class: 'ag-where' });
        const goal = h('div', { class: 'ag-goal' });
        const meter = progressBar(0, `${agentShort(a)}の長期目標の進み具合`);
        const goalLabelEl = h('span', null);
        goal.append(goalLabelEl, meter);
        const el = h('a', { class: 'agent-card', href: href.agent(a.id), role: 'listitem' },
            h('div', { class: 'ag-head' }, avatar(W, a),
                h('div', { class: 'ag-id' }, h('strong', null, agentShort(a)), h('span', null, clip(a.role, 34)))),
            art, h('div', { class: 'ag-live' }, stage, where), act, goal, h('p', { class: 'ag-foot' }, h('span', null, '財布'), wallet), h('span', { class: 'ag-talk-entry' }, '話しかける・お願いする →'));
        const paint = () => {
            if (art) art.update();
            if (!live) return;
            clear(stage); stage.append(stageBadge(live.stage));
            act.textContent = liveActivity(live);
            act.hidden = !act.textContent;
            wallet.textContent = `${fmt(live.wallet)} ${cur}`;
            where.textContent = live.stage === 'travel' ? '' : whereIs(W, live);     // a trip already reads "→ where (by what)" below
            goalLabelEl.textContent = `${goalLabel(live.goalType)} ・ ${goalPct(live)}%`;
            const v = Math.max(0, Math.min(1, live.goalProgress || 0));
            meter.firstChild.style.width = (v * 100).toFixed(1) + '%';
            meter.setAttribute('aria-valuenow', String(Math.round(v * 100)));
        };
        paint();
        return { el, paint, a, live };
    }

    for (const a of W.agents) if (eco.agents.has(a.id)) cells.set(a.id, card(a));

    function visible() {
        const q = state.q.toLowerCase();
        const rows = [...cells.values()].filter(c => {
            if (state.origin && c.a.origin !== state.origin) return false;
            if (state.stage && c.live.stage !== state.stage) return false;
            if (q && !(c.a.name + c.a.name_ja + c.a.role).toLowerCase().includes(q)) return false;
            return true;
        });
        const by = {
            wallet: (x, y) => y.live.wallet - x.live.wallet,
            goal: (x, y) => y.live.goalProgress - x.live.goalProgress,
            name: (x, y) => agentShort(x.a).localeCompare(agentShort(y.a), 'ja')
        }[state.sort] || (() => 0);
        return rows.sort(by);
    }

    let shown = '';
    function layout() {
        const rows = visible();
        shown = rows.map(c => c.a.id).join(',');
        clear(grid);
        for (const c of rows) grid.append(c.el);
        if (!rows.length) grid.append(emptyNote('この条件の住人は、いまいません。'));
        count.textContent = `${rows.length} / ${cells.size} 人`;
    }

    const originBtns = Object.entries(ORIGIN_LABEL).map(([k, label]) => h('button', {
        type: 'button', class: 'chip chip-btn', 'aria-pressed': String(state.origin === k), 'data-k': k,
        onclick: () => { state.origin = state.origin === k ? '' : k; originBtns.forEach(b => b.setAttribute('aria-pressed', String(state.origin === b.dataset.k))); layout(); }
    }, label));
    const stageSel = h('select', { 'aria-label': 'いまの様子で絞る', onchange: e => { state.stage = e.target.value; layout(); } },
        h('option', { value: '' }, 'どんな様子でも'),
        Object.entries(STAGE_LABEL).map(([k, v]) => h('option', { value: k, selected: k === state.stage }, v.replace(/^[^\p{L}]+\s*/u, ''))));
    const sortSel = h('select', { 'aria-label': '並べ方', onchange: e => { state.sort = e.target.value; layout(); } },
        [['wallet', '財布の多い順'], ['goal', '長期目標の進んだ順'], ['name', '名前順']].map(([k, v]) => h('option', { value: k, selected: k === state.sort }, v)));
    const search = h('input', { type: 'search', placeholder: '名前・役割で探す', 'aria-label': '名前・役割で探す', value: state.q, oninput: e => { state.q = e.target.value.trim(); layout(); } });

    layout();
    const el = h('div', { class: 'page' },
        h('header', { class: 'page-head' },
            h('h1', null, '住人たち'),
            h('p', { class: 'lead' }, '自分の頭で仕入れ、運び、作り、交渉するAIエージェントたち。誰かに言われなくても、相場と祭りと自分の望みを見て動いている。')),
        plaque({ class: 'filters' },
            h('div', { class: 'filter-row' }, h('span', { class: 'lbl' }, '出身'), h('div', { class: 'chips' }, originBtns)),
            h('div', { class: 'filter-row filter-inputs' }, stageSel, sortSel, search)),
        count, grid);

    // Stages, wallets and goals change as the economy runs, so the stage filter and
    // the wallet/goal order are re-applied; the grid is rebuilt only when they move.
    function update() {
        for (const c of cells.values()) c.paint();
        if (visible().map(c => c.a.id).join(',') === shown) return;
        const focused = document.activeElement;
        layout();
        if (focused && grid.contains(focused)) focused.focus({ preventScroll: true });
    }

    return { el, title: '住人たち', update };
}

// ---------------------------------------------------------------- one agent

// An AI brought in from outside: where it came from and what it chose to bring (its own words).
function travellerSection(a) {
    const tr = a.traveller;
    const list = (title, items) => (items || []).length ? h('div', { class: 'soul-list' }, h('h3', null, title), h('ul', null, items.map(x => h('li', null, x)))) : null;
    return h('section', { class: 'sec traveller-sec', 'aria-labelledby': 'ag-trav' }, sectionHead(t('origin.traveller'), `${t('summon.from')}：${tr.from}`, 'ag-trav'),
        plaque({ class: 'soul-preview' },
            tr.greeting ? h('p', { class: 'soul-greeting' }, `「${tr.greeting}」`) : null,
            list(t('summon.memories'), tr.memories),
            list(t('summon.values'), tr.values),
            h('p', { class: 'ar-role' }, t('summon.honest')),
            h('p', null, h('a', { href: '#/settings' }, t('settings.title') + ' →'))));
}

// 🧠 What a resident with a mind said to itself when it chose (js/mind.js).
function thoughtSection(ctx, a, live) {
    const mind = ctx.mind;
    const thinks = !!(mind && mind.wants(a.id));
    if (!thinks && !(live && live.thought)) {
        return a.traveller ? { el: h('section', { class: 'sec', 'aria-labelledby': 'ag-mind' }, sectionHead(t('mind.agentTitle'), null, 'ag-mind'),
            h('p', { class: 'ar-role' }, t('mind.agentOff'), ' ', h('a', { href: '#/settings' }, t('settings.title') + ' →'))) } : null;
    }
    const body = h('div', { class: 'mind-thoughts' });
    let seen = -1;
    function paint() {
        const log = mind ? mind.logFor(a.id) : [];
        const key = log.length ? log[0].at : (live && live.thought ? live.thought.T : 0);
        if (key === seen) return;
        seen = key;
        clear(body);
        if (!log.length && live && live.thought) log.push({ thought: live.thought.text, model: live.thought.model });
        if (!log.length) { body.append(h('p', { class: 'ar-role' }, t('mind.agentNone'))); return; }
        body.append(h('ul', { class: 'mind-log' }, log.slice(0, 6).map(e => h('li', null, `「${e.thought}」`, e.model ? h('small', null, ` ${e.model}`) : null))));
    }
    paint();
    return { el: h('section', { class: 'sec', 'aria-labelledby': 'ag-mind' }, sectionHead(t('mind.agentTitle'), null, 'ag-mind'), plaque({ class: 'lore-card' }, body)), update: paint };
}

export function agentView(ctx, id) {
    const { W, eco } = ctx;
    const a = W.byId.agent.get(id);
    const live = eco.agents.get(id);
    if (!a) return notFound('その住人');
    const feature = visualFeature(ctx, 'agent', id, { size: 320 });
    const conversation = characterPanel(ctx, a, feature ? h('details', { class: 'character-art-details' }, h('summary', null, '人物の設定画を鑑賞する'), feature) : null);
    const talk = () => { conversation.el.querySelector('.character-dialogue').scrollIntoView({ block: 'start' }); conversation.el.querySelector('textarea').focus({ preventScroll: true }); };
    const theatre = dramaPanel(ctx, a, talk);
    const onchain = agentChainPanel(ctx, a);
    const thoughts = thoughtSection(ctx, a, live);
    const cur = stripParens(W.baseCurrency.name_ja);
    const home = W.byId.district.get(a.home);
    const place = home && W.placeOf(home.id);

    const stage = h('p', { class: 'live-stage' });
    const where = h('p', { class: 'live-where' });
    const carry = h('p', { class: 'live-carry' });
    const wallet = h('b', { class: 'live-wallet' });
    const meter = progressBar(0, '長期目標の進み具合');
    const goalText = h('span', { class: 'live-goal' });
    const stats = h('dl', { class: 'facts facts-compact' });
    const panel = h('details', { class: 'live-facts plaque' },
        h('summary', null, 'いまの荷物・財布・仕事の数字を見る'),
        stage, where, carry,
        h('div', { class: 'live-row' }, h('span', null, '財布'), wallet),
        h('div', { class: 'live-row live-row-goal' }, goalText, meter), stats);

    function paint() {
        if (!live) { clear(stage); stage.append('この住人は、いまは世界にいません。'); return; }
        clear(stage); stage.append(stageBadge(live.stage)); if (liveActivity(live)) stage.append(' ', liveActivity(live));
        where.textContent = `いる場所：${whereIs(W, live)}`;
        carry.textContent = live.carrying && live.carrying.length
            ? '運んでいるもの：' + live.carrying.map(l => `${stripParens((W.byId.good.get(l.good) || {}).name_ja || l.good)}×${l.qty}`).join('、')
            : '荷物：なし';
        wallet.textContent = `${fmt(live.wallet)} ${cur}`;
        goalText.textContent = `長期目標：${goalLabel(live.goalType)} ・ ${goalPct(live)}%`;
        const v = Math.max(0, Math.min(1, live.goalProgress || 0));
        meter.firstChild.style.width = (v * 100).toFixed(1) + '%';
        meter.setAttribute('aria-valuenow', String(Math.round(v * 100)));
        const st = live.stats || {};
        clear(stats);
        for (const [k, val] of [['旅', st.trips], ['売り', st.sales], ['仕入れ', st.buys], ['作った数', st.crafts], ['稼ぎ', st.gain != null ? fmt(st.gain) + ' ' + cur : null]]) {
            if (val == null) continue;
            stats.append(h('dt', null, k), h('dd', null, String(val)));
        }
    }
    paint();

    const rels = (a.relationships || []).map(r => {
        const other = W.byId.agent.get(r.agent);
        return h('li', null, other ? h('strong', null, link(href.agent(other.id), agentShort(other))) : h('strong', null, r.agent), h('span', null, tagged(r.type)));
    });

    const el = h('article', { class: 'page agent-page' },
        h('header', { class: 'agent-hero' },
            avatar(W, a),
            h('div', null,
                h('p', { class: 'kicker' }, ORIGIN_LABEL[a.origin] || a.origin),
                h('h1', null, agentShort(a)),
                h('p', { class: 'hero-sub' }, stripParens(a.name_ja) !== agentShort(a) ? a.name_ja : ''),
                h('p', { class: 'hero-summary' }, a.role),
                h('p', { class: 'chips' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: () => theatre.el.scrollIntoView({ block: 'start' }) }, 'いまの劇を観る'), h('button', { type: 'button', class: 'btn', onclick: talk }, '話しかける・お願いする'), h('a', { class: 'btn', href: '#/', onclick: () => { ctx.pendingFocus = id; } }, '地図で追う →'), home ? h('a', { class: 'chip', href: href.district(home.id) }, nameOf(home)) : null, place ? placeLink(place) : null))),
        h('div', { class: 'page-body' },
            theatre.el, panel, onchain.el, conversation.el,
            thoughts && thoughts.el,
            a.traveller ? travellerSection(a) : null,
            h('section', { class: 'sec', 'aria-labelledby': 'ag-person' }, sectionHead('人となり', null, 'ag-person'),
                h('p', { class: 'lead' }, tagged(a.personality)),
                h('dl', { class: 'facts' }, h('dt', null, '得意'), h('dd', null, tagged(a.specialty)))),
            h('section', { class: 'sec', 'aria-labelledby': 'ag-amb' }, sectionHead('長期の望み', '何年もかけて叶えたいこと', 'ag-amb'),
                plaque({ class: 'lore-card' }, h('p', null, tagged(a.long_term_ambition)))),
            (a.routines || []).length ? h('section', { class: 'sec', 'aria-labelledby': 'ag-rt' }, sectionHead('日課', '一日と一年のめぐり', 'ag-rt'),
                h('ol', { class: 'timeline timeline-routine' }, a.routines.map(r => h('li', null, h('p', null, tagged(r)))))) : null,
            (a.favored_goods || []).length ? h('section', { class: 'sec', 'aria-labelledby': 'ag-goods' }, sectionHead('ひいきの品', null, 'ag-goods'),
                h('p', { class: 'chips' }, a.favored_goods.map(g => goodLink(W, g)))) : null,
            rels.length ? h('section', { class: 'sec', 'aria-labelledby': 'ag-rel' }, sectionHead('縁のある人', null, 'ag-rel'), h('ul', { class: 'relations' }, rels)) : null,
            h('p', { class: 'pager' }, link('#/agents', '← 住人たちへ'))));

    return { el, title: agentShort(a), update() { paint(); theatre.update(); conversation.update(); onchain.update(); if (thoughts && thoughts.update) thoughts.update(); if (feature) feature.update(); }, destroy() { onchain.destroy(); } };
}
