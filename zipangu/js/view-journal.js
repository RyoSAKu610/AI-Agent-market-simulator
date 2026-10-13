// #/journal — 📖 旅の記録帖: rank, today's おみくじ, the hidden residents and the 発見帖.

import { h, clear, href } from './util.js';
import { plaque, sectionHead, avatar, progressBar, placeLink, goodLink } from './components.js';
import { t, getLang } from './i18n.js';
import { RANKS, LUCK } from './progress.js';

const BADGE_EN = {
    day_one: 'Watch one whole day', week: 'Watch seven days', seasons: 'A full round of the 24 seasons', long_watch: 'Three hours of watching',
    creatures_10: 'Meet ten creatures', creatures_all: 'Meet every creature', works_5: 'Read five works', works_all: 'Read every work',
    places_all: 'Visit all ten eras and eight realms', districts_30: 'Walk thirty districts', agents_all: 'Open every resident’s page', visuals_10: 'Admire ten paintings',
    trades_100: 'Witness 100 trades', trades_1000: 'Witness 1,000 trades', trades_10000: 'Witness 10,000 trades', events_10: 'Be there for ten world events',
    thought_1: 'Hear an AI’s inner voice', thought_100: 'Hear 100 inner voices', summon_1: 'Bring your AI in', birth_chain: 'Inscribe a birth certificate',
    fortune_7: 'Draw seven fortunes', daikichi: 'Draw 大吉 (great luck)', found_1: 'Meet a hidden resident', found_3: 'Meet three hidden residents', found_all: 'Meet every hidden resident'
};
const en = () => getLang() !== 'ja';
const fmtTime = s => { const m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

export function journalView(ctx) {
    const { W, progress } = ctx;
    if (!progress) return { el: h('div', { class: 'page' }, h('p', null, '—')), title: t('journal.title') };

    const rankBox = h('div', { class: 'journal-rank' });
    const fortuneBox = h('div', { class: 'journal-fortune' });
    const hiddenBox = h('div', { class: 'hidden-grid' });
    const badgeBox = h('div', { class: 'badge-groups' });
    const statBox = h('dl', { class: 'facts facts-compact journal-stats' });

    function paintRank() {
        const r = progress.rank;
        clear(rankBox).append(
            h('p', { class: 'eyebrow' }, t('journal.rank')),
            h('h2', { class: 'journal-rank-name' }, r.name, en() ? h('small', null, ` · ${r.en}`) : null),
            h('p', { class: 'journal-points' }, t('journal.points', { n: r.points })),
            progressBar(r.frac, t('journal.toNext')),
            r.next ? h('p', { class: 'ar-role' }, t('journal.next', { n: r.toNext, name: r.next.name }), ' — ', r.next.unlock) : h('p', { class: 'ar-role' }, t('journal.max')),
            h('ol', { class: 'rank-ladder' }, RANKS.map((x, i) => h('li', { class: i <= r.index ? 'is-open' : 'is-locked' },
                h('b', null, (i <= r.index ? '✓ ' : '🔒 ') + x.name), ` (${x.at})`, h('span', null, ' — ' + x.unlock)))));
        rankBox.classList.toggle('is-gold', r.index >= 5);
    }

    function paintFortune() {
        clear(fortuneBox);
        const f = progress.todayFortune();
        if (progress.rank.index < 1) { fortuneBox.append(h('p', { class: 'ar-role' }, t('journal.fortuneLocked', { name: RANKS[1].name }))); return; }
        if (f) {
            const luck = LUCK.find(l => l.name === f.luck) || LUCK[4];
            const place = W.byId.place.get(f.place);
            fortuneBox.append(plaque({ class: 'omikuji is-open luck-' + LUCK.indexOf(luck) },
                h('p', { class: 'omikuji-luck' }, f.luck),
                h('p', null, luck.line),
                h('p', null, t('journal.luckyPlace'), ' ', placeLink(place)),
                f.good ? h('p', null, t('journal.luckyGood'), ' ', goodLink(W, f.good)) : null));
        }
        if (progress.canDraw()) {
            fortuneBox.append(h('button', { type: 'button', class: 'btn btn-primary btn-big omikuji-draw', onclick: e => {
                e.currentTarget.disabled = true;
                fortuneBox.classList.add('is-shaking');
                setTimeout(() => { fortuneBox.classList.remove('is-shaking'); progress.draw(); paintAll(); }, 900);
            } }, f ? t('journal.drawAgain') : t('journal.draw')));
        } else if (f) fortuneBox.append(h('p', { class: 'ar-role' }, t('journal.tomorrow')));
    }

    function paintHidden() {
        clear(hiddenBox);
        const r = progress.rank.index, found = progress.state.found;
        const near = r >= 3 ? new Set(progress.nearby(ctx.eco.clock).map(d => d.id)) : new Set();
        for (const d of W.hidden) {
            const met = found[d.id];
            const a = W.byId.agent.get(d.id);
            hiddenBox.append(met && a
                ? h('a', { class: 'hidden-card is-met', href: href.agent(d.id) }, avatar(W, a), h('b', null, a.name), h('small', null, String(met).slice(0, 10)))
                : h('div', { class: 'hidden-card is-unknown' + (near.has(d.id) ? ' is-near' : '') },
                    h('span', { class: 'hidden-silhouette', 'aria-hidden': 'true' }, '？'),
                    h('b', null, '？？？'),
                    h('small', null, r >= (d.appear.rank || 0) ? d.hint : t('journal.hintLocked')),
                    near.has(d.id) ? h('em', null, t('journal.near')) : null));
        }
    }

    function paintBadges() {
        clear(badgeBox);
        const list = progress.badges();
        const groups = [...new Set(list.map(b => b.group))];
        for (const g of groups) {
            const items = list.filter(b => b.group === g);
            badgeBox.append(h('section', { class: 'badge-group' },
                h('h3', null, g, h('small', null, ` ${items.filter(b => b.done).length}/${items.length}`)),
                h('ul', { class: 'badge-list' }, items.map(b => h('li', { class: b.done ? 'is-done' : '' },
                    h('span', { class: 'badge-mark', 'aria-hidden': 'true' }, b.done ? '🏅' : '·'),
                    h('span', { class: 'badge-title' }, b.title, en() && BADGE_EN[b.id] ? h('small', null, ' · ' + BADGE_EN[b.id]) : null),
                    b.done ? null : h('span', { class: 'badge-have' }, `${b.have}/${b.need}`))))));
        }
    }

    function paintStats() {
        const p = progress.state;
        clear(statBox);
        for (const [k, v] of [[t('journal.watched'), fmtTime(p.seconds)], [t('journal.days'), p.days], [t('journal.trades'), p.count.trades.toLocaleString()], [t('journal.thoughts'), p.count.thoughts], [t('journal.met'), `${Object.keys(p.found).length}/${W.hidden.length}`]]) {
            statBox.append(h('dt', null, k), h('dd', null, String(v)));
        }
    }

    function paintAll() { paintRank(); paintFortune(); paintHidden(); paintBadges(); paintStats(); }
    paintAll();
    const off = progress.on(type => { if (type !== 'tick') paintAll(); });

    const el = h('div', { class: 'page page-journal' },
        h('header', { class: 'page-head' }, h('h1', null, t('journal.title')), h('p', { class: 'lead' }, t('journal.lead'))),
        h('div', { class: 'journal-top' }, plaque({ class: 'journal-card' }, rankBox, statBox), plaque({ class: 'journal-card' }, h('h2', null, t('journal.fortune')), fortuneBox)),
        h('section', { class: 'sec', 'aria-labelledby': 'jr-hidden' }, sectionHead(t('journal.hidden'), t('journal.hiddenSub'), 'jr-hidden'), hiddenBox),
        h('section', { class: 'sec', 'aria-labelledby': 'jr-badges' }, sectionHead(t('journal.badges'), null, 'jr-badges'), badgeBox));
    let lastStat = 0;
    return {
        el, title: t('journal.title'),
        update() { const now = Date.now(); if (now - lastStat > 5000) { lastStat = now; paintStats(); paintRank(); if (progress.rank.index >= 3) paintHidden(); } },
        destroy() { off(); }
    };
}

// The way in from the map and from settings.
export function journalLink(ctx, cls = 'journal-map-link') {
    if (!ctx.progress) return null;
    const r = ctx.progress.rank;
    return h('a', { class: cls, href: '#/journal' }, `📖 ${t('journal.title')} · ${r.name}`);
}

