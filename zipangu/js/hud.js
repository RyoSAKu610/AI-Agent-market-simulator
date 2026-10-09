// The HUD: 万世時計, the live feed of what the economy is doing, the base-currency
// ticker and the speed control. The elements are built once and re-mounted by
// whichever view wants them, so the feed keeps its history between pages.

import { createDial } from './clock-dial.js';
import { h, clear, stripParens, nameOf, fmt, fmtPrice, pct } from './util.js';
import { goodQuotes } from './history.js';

export const SPEEDS = [1, 4, 16];

const FEED_ICON = { trade: '◆', arrive: '▸', depart: '↗', event: '✦', settle: '⚖', goal: '★' };
const FEED_KEEP = 60;
// Words the feed uses without explaining; shown as a tooltip on the line.
const VIA_GLOSS = {
    torii: ['時層鳥居', '時層鳥居：時代と時代のあいだをつなぐ朱の鳥居。くぐると別の時片へ出る'],
    chodo: ['蝶道', '蝶道：宝石蝶が飛ぶ、ゆっくりした光の道'],
    ginga: ['銀河鉄道', '銀河鉄道：夜だけ走る、星の線路の列車'],
    cho: ['蝶守座', '蝶守座：宝石蝶と落鱗を見守る組合。聖地は蝶の集まる谷']
};

export function createHud(W, eco, { speed = 1, onSpeed = () => {} } = {}) {
    const dialBig = createDial(W);
    const dialMini = createDial(W);
    const cur = stripParens(W.baseCurrency.name_ja) || '刻';

    // ---------------------------------------------------- clock panel
    const koku = h('strong', { class: 'hud-koku' });
    const sekki = h('span', { class: 'hud-sekki' });
    const day = h('span', { class: 'hud-day' });
    const stats = h('span', { class: 'hud-stats' });
    const clockPanel = h('section', { class: 'hud-clock', 'aria-label': '万世時計と今の刻' },
        h('div', { class: 'hud-dial' }, dialBig.el),
        h('div', { class: 'hud-text' }, koku, sekki, day, stats));

    // ---------------------------------------------------- mini clock for the header
    const miniKoku = h('span', { class: 'mini-koku' });
    const miniSekki = h('span', { class: 'mini-sekki' });
    const mini = h('a', { class: 'mini-hud', href: '#/', 'aria-label': '地図へ戻る' },
        h('span', { class: 'mini-dial' }, dialMini.el),
        h('span', { class: 'mini-text' }, miniKoku, miniSekki));

    // ---------------------------------------------------- speed control
    const speedButtons = SPEEDS.map(s => h('button', {
        type: 'button', class: 'speed-btn', 'data-speed': s, 'aria-pressed': String(s === speed),
        'aria-label': `時の流れを${s}倍にする`,
        onclick: () => { setSpeed(s); onSpeed(s); }
    }, s + '×'));
    const speedEl = h('div', { class: 'speed', role: 'group', 'aria-label': '時の流れる速さ' }, speedButtons);
    function setSpeed(s) {
        speedButtons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s)));
    }

    // ---------------------------------------------------- ticker (base currency)
    const tickerItems = h('div', { class: 'ticker-items' });
    const ticker = h('div', {
        class: 'ticker', role: 'status', 'aria-label': `基軸通貨「${cur}」の相場`,
        title: `${cur}＝この世界のお金。▲▼は、品ごとの基準の値段に比べた今の値段`
    },
    h('span', { class: 'ticker-cur' }, cur),
    tickerItems,
    h('span', { class: 'ticker-note' }, `${cur}＝この世のお金 ・ ▲▼は基準の値段との差`));
    let movers = [], page = 0;
    // On a phone the ticker is a single line that rotates; on a wide screen it lists three.
    const phone = typeof matchMedia === 'function' ? matchMedia('(max-width: 899px)') : { matches: false };

    function computeMovers() {
        const rows = [];
        for (const g of W.goods) {
            const q = goodQuotes(eco, g.id);
            if (!q.length) continue;
            const mean = q.reduce((s, x) => s + x.price, 0) / q.length;
            rows.push({ g, mean, ratio: mean / g.base_price - 1 });
        }
        rows.sort((a, b) => Math.abs(b.ratio) - Math.abs(a.ratio));
        movers = rows.slice(0, 9);
    }

    function renderTicker() {
        if (!movers.length) return;
        const per = phone.matches ? 1 : 3, pages = Math.ceil(movers.length / per);
        const slice = movers.slice((page % pages) * per, (page % pages) * per + per);
        clear(tickerItems);
        for (const m of slice) {
            const up = m.ratio >= 0;
            tickerItems.append(h('a', { class: 'tick', href: `#/market?good=${encodeURIComponent(m.g.id)}` },
                h('span', { class: 'tick-name' }, nameOf(m.g)),
                h('span', { class: 'tick-price' }, fmtPrice(m.mean)),
                h('span', { class: 'tick-chg ' + (up ? 'up' : 'down') }, (up ? '▲' : '▼') + pct(m.ratio).replace('+', ''))));
        }
        page++;
    }

    // ---------------------------------------------------- feed
    const list = h('ol', { class: 'feed-list', 'aria-live': 'off' });
    const feedHead = h('button', {
        type: 'button', class: 'feed-head', 'aria-expanded': 'false',
        onclick: () => {
            const open = feed.classList.toggle('is-open');
            feedHead.setAttribute('aria-expanded', String(open));
        }
    }, h('span', { class: 'gem', 'aria-hidden': 'true' }), '世のうごき', h('span', { class: 'feed-chevron', 'aria-hidden': 'true' }, '▾'));
    const feed = h('section', { class: 'feed', 'aria-label': '世のうごき（取引・祭り・決算の速報）' }, feedHead, list);

    const queue = [];
    eco.on('*', msg => { if (msg && msg.message) queue.push(msg); if (queue.length > 200) queue.splice(0, 100); });

    function renderFeedItem(msg) {
        const body = [
            h('span', { class: 'feed-time' }, `${msg.label || ''}`),
            h('span', { class: 'feed-icon', 'aria-hidden': 'true' }, FEED_ICON[msg.type] || '•'),
            // the authored text puts a full space around names; a thin space keeps them apart without the wide gaps
            h('span', { class: 'feed-msg' }, String(msg.message).replace(/ +/g, '\u2009'))
        ];
        const el = msg.agent && W.byId.agent.has(msg.agent)
            ? h('a', { class: 'feed-item type-' + msg.type + ' is-new', href: `#/agent/${msg.agent}` }, ...body)
            : h('div', { class: 'feed-item type-' + msg.type + ' is-new' }, ...body);
        const gloss = Object.values(VIA_GLOSS).find(g => String(msg.message).includes(g[0]));
        if (gloss) el.title = gloss[1];
        return h('li', null, el);
    }

    // At 16× the economy talks faster than anyone can read: events and
    // settlements always get through, trades are sampled.
    function flushFeed() {
        if (!queue.length) return;
        const batch = queue.splice(0, queue.length);
        const important = batch.filter(m => m.type !== 'trade' && m.type !== 'depart' && m.type !== 'arrive');
        const common = batch.filter(m => !important.includes(m));
        const take = [...important.slice(-3), ...common.slice(-2)].sort((a, b) => a.T - b.T);
        for (const m of take) list.prepend(renderFeedItem(m));
        while (list.children.length > FEED_KEEP) list.lastChild.remove();
    }

    // ---------------------------------------------------- update
    let lastDay = null;
    function update() {
        const c = eco.clock;
        dialBig.update(c); dialMini.update(c);
        koku.textContent = c.label;
        sekki.textContent = `${c.sekki}・${c.season}`;
        day.textContent = `第${c.year}年 ${c.day}日目`;
        miniKoku.textContent = c.label;
        miniSekki.textContent = c.sekki;
        const st = eco.stats;
        stats.textContent = `取引 ${fmt(st.trades)} ・ 出来高 ${fmt(st.volume)}${cur}`;
        lastDay = c.day;
    }

    function slow() { computeMovers(); renderTicker(); }
    if (phone.addEventListener) phone.addEventListener('change', () => { page = 0; renderTicker(); });

    update();
    computeMovers();
    renderTicker();

    return { clockPanel, mini, speedEl, ticker, feed, update, setSpeed, flushFeed, slow, renderTicker, get day() { return lastDay; } };
}
