// #/agents and #/agent/<id>

import { h, clear, href, link, tagged, nameOf, agentShort, clip, fmt, stripParens } from './util.js';
import {
    plaque, sectionHead, avatar, stageBadge, progressBar, goalLabel, goodLink, placeLink, emptyNote,
    STAGE_LABEL, liveActivity, goalPct
} from './components.js';
import { notFound } from './view-place.js';


const ORIGIN_LABEL = { neon_mythos: 'NEON MYTHOS の住人', native: '万華京の生え抜き' };

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
            h('div', { class: 'ag-live' }, stage, where), act, goal, h('p', { class: 'ag-foot' }, h('span', null, '財布'), wallet));
        const paint = () => {
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

    function layout() {
        const rows = visible();
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

    return { el, title: '住人たち', update() { for (const c of cells.values()) c.paint(); } };
}

// ---------------------------------------------------------------- one agent

export function agentView(ctx, id) {
    const { W, eco } = ctx;
    const a = W.byId.agent.get(id);
    const live = eco.agents.get(id);
    if (!a) return notFound('その住人');
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
    const panel = plaque({ class: 'live-panel' },
        h('h2', null, h('span', { class: 'live-dot', 'aria-hidden': 'true' }), 'いま、何をしている？'),
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
                h('p', { class: 'chips' }, home ? h('a', { class: 'chip', href: href.district(home.id) }, nameOf(home)) : null, place ? placeLink(place) : null))),
        h('div', { class: 'page-body' },
            panel,
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

    return { el, title: agentShort(a), update: paint };
}
