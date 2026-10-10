import { visualArt } from './visual-art.js';
import { visualOf, visualKey, visualSource } from './visual-manifest.js';
import { priceChart } from './price-chart.js';
// #/market — currencies, arbitrage hints and the price board.

import { goodQuotes } from './history.js';
import {
    h, clear, href, link, nameOf, placeShort, clip, fmt, fmtPrice, pct, stripParens, tagged
} from './util.js';
import { plaque, sectionHead, chip, spark, placeLink, goodLink, viaLabel, CATEGORY_LABEL, emptyNote } from './components.js';

const PAGE = 24;

function goodArtwork(W, good) {
    const creature = good.source_creature && W.byId.creature.get(good.source_creature);
    const place = W.placeOf(good.origin);
    const entity = creature || place;
    const type = creature ? 'creature' : place && W.byId.era.has(place.id) ? 'era' : 'realm';
    const visual = entity && visualOf(type, entity.id);
    return visual ? { visual, label: `${creature ? '由来の生き物' : '産地の景観'}：${nameOf(entity)}（商品そのものの絵ではありません）` } : null;
}

function issuerOf(W, id) {
    const d = W.byId.district.get(id);
    if (d) return link(href.district(d.id), nameOf(d));
    const p = W.byId.place.get(id);
    return p ? placeLink(p) : id;
}

function currencySection(ctx) {
    const { W, eco } = ctx;
    const base = W.baseCurrency;
    const cards = W.currencies.map((c, i) => plaque({ class: 'currency-card' + (c.base ? ' is-base' : '') + (i < 4 ? ' is-core' : '') },
        h('p', { class: 'kicker' }, c.base ? '基軸通貨' : i < 4 ? '主要通貨' : '手形・信用'),
        visualOf('currency', c.id) ? h('a', { href: '#/visual/' + visualKey(visualOf('currency', c.id)), 'aria-label': stripParens(c.name_ja) + 'の設定画を見る' }, visualArt(W, visualOf('currency', c.id), { size: 220, eco })) : null,
        h('h3', null, stripParens(c.name_ja)),
        h('p', { class: 'cur-en' }, c.name_en),
        h('p', { class: 'cur-rate' }, ['en', 'sangaku_tegata'].includes(c.id) ? `名目評価 ${fmt(c.to_base)} ${stripParens(base.name_ja)}（決済用の換算ではない）` : c.base ? '価格はすべてこの単位' : `1 = ${fmt(c.to_base, c.to_base < 1 ? 2 : 0)} ${stripParens(base.name_ja)}`),
        h('p', { class: 'cur-backing' }, clip(c.backing, 70)),
        c.id === 'yen_data' ? h('p', { class: 'ar-role' }, '¥20＝1刻。DATAは算額・翻案の素材。') : null,
        h('p', { class: 'cur-issuer' }, '発行：', issuerOf(W, c.issuer))));
    return h('section', { class: 'sec', 'aria-labelledby': 'cur' },
        sectionHead('通貨', '十の時片と八つの異界を結ぶ、いくつもの「お金」', 'cur'),
        h('div', { class: 'cards cards-currency' }, cards));
}

export function marketView(ctx, query) {
    const { W, eco, history } = ctx;
    const cur = stripParens(W.baseCurrency.name_ja);
    const state = { cat: query.cat || '', place: query.place || '', q: query.q || '', shown: PAGE, open: query.good || '' };
    let chartGood = query.good || '', chartDistrict = '', chartArt = null, chartPeriod = 0;
    const chart = priceChart({ currency: cur });
    const chartTitle = h('h2', { id: 'selected-good-title' });
    const chartScope = h('p', { class: 'chart-scope' });
    const chartChange = h('p', { class: 'chart-change' });
    const chartOrigin = h('figure', { class: 'market-origin' });
    const chartOriginNote = h('p', { class: 'chart-origin-note' });
    const goodSelect = h('select', { 'aria-label': 'チャートの品目', onchange: e => selectChart(e.target.value) });
    const districtSelect = h('select', { 'aria-label': 'チャートの地区', onchange: e => { chartDistrict = e.target.value; updateChart(); } });
    const periodSelect = h('select', { 'aria-label': 'チャートの表示期間', onchange: e => { chartPeriod = Number(e.target.value); updateChart(); } },
        h('option', { value: 0 }, '全観測（最大72点）'), h('option', { value: 1 }, '直近一日'), h('option', { value: .5 }, '直近半日'));
    let expansionLocked = false;
    const compactButton = h('button', { type: 'button', class: 'btn chart-expand', 'aria-expanded': 'true', onclick: () => setCompact(!chartPanel.classList.contains('is-compact')) }, '品目リストを見る ↓');
    function setCompact(compact) { expansionLocked = !compact; chartPanel.classList.toggle('is-compact', compact); compactButton.textContent=compact?'チャートを開く ↑':'品目リストを見る ↓';compactButton.setAttribute('aria-expanded',String(!compact)); }
    function onScroll() { if (!expansionLocked && innerWidth<1100 && el.querySelector('.market-board').getBoundingClientRect().top<300) setCompact(true); }
    function onScrollIntent(event) { if (event.type === 'keydown' && !['PageDown','PageUp','ArrowDown','ArrowUp',' '].includes(event.key)) return; expansionLocked = false; }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onScrollIntent, { passive: true });
    window.addEventListener('touchmove', onScrollIntent, { passive: true });
    window.addEventListener('keydown', onScrollIntent);
    const chartPanel = h('aside', { class: 'market-chart-panel', 'aria-labelledby': 'selected-good-title' },
        h('p', { class: 'kicker' }, '堂島時層会所 ・ 観測相場'),
        h('div', { class: 'chart-selectors' }, goodSelect, districtSelect, periodSelect),
        h('div', { class: 'market-chart-identity' }, chartOrigin, h('div', null, chartTitle, chartScope, chartChange)), chartOriginNote, chart.el,
        compactButton, h('p', { class: 'chart-disclaimer' }, '街のシミュレーションで観測した価格。ローソク足・出来高は生成していません。'));
    function selectChart(id, reveal = false) {
        const changed = chartGood !== id; chartGood = id;
        if (changed) chartDistrict = '';
        const g = W.byId.good.get(id); if (!g) return;
        goodSelect.value = id;
        if (changed || !chartOrigin.childNodes.length) {
            clear(chartOrigin); const origin = goodArtwork(W, g);
            chartArt = origin ? visualArt(W, origin.visual, { size: 120, eco }) : null;
            if (chartArt) chartOrigin.append(chartArt);
            chartOriginNote.textContent = origin ? origin.label : '関連設定画は制作中';
        }
        for (const [key, ref] of rowRefs) ref.details.classList.toggle('is-chart-selected', key === id);
        updateChart();
        if (reveal && innerWidth < 1100) setCompact(false);
    }
    function updateChart() {
        const g = W.byId.good.get(chartGood); if (!g) return;
        const allowed = state.place ? new Set(W.districtsIn(state.place).map(d => d.id)) : null;
        const quotes = goodQuotes(eco, g.id).filter(q => !allowed || allowed.has(q.district));
        const ids = quotes.map(q => q.district);
        if (chartDistrict && !ids.includes(chartDistrict)) chartDistrict = '';
        const signature = state.place + '|' + ids.join('|');
        if (districtSelect.dataset.signature !== signature) {
            districtSelect.replaceChildren(h('option', { value: '' }, state.place ? 'この時片・異界の平均' : '全地区の平均'), ...ids.map(id => h('option', { value: id }, nameOf(W.byId.district.get(id)))));
            districtSelect.dataset.signature = signature;
        }
        districtSelect.value = chartDistrict;
        const allPoints = chartDistrict ? history.points(chartDistrict, g.id) : history.meanPoints(g.id, allowed ? ids : null);
        const points = chartPeriod && allPoints.length ? allPoints.filter(p => p.time >= allPoints.at(-1).time - chartPeriod) : allPoints;
        const price = chartDistrict ? quotes.find(q => q.district === chartDistrict)?.price : quotes.reduce((sum, q) => sum + q.price, 0) / quotes.length;
        chartTitle.textContent = nameOf(g);
        const scopeLabel = chartDistrict ? nameOf(W.byId.district.get(chartDistrict)) : `${state.place ? placeShort(W.byId.place.get(state.place)) : '全地区'}の単純平均（${quotes.length}地区）`;
        chartScope.textContent = `${scopeLabel} ・ ${g.unit || '一単位'} ・ ${points.length}観測${points.length ? `（${points[0].day}日 ${points[0].label}〜${points.at(-1).day}日 ${points.at(-1).label}）` : ''}`;
        const change = points.length > 1 ? points.at(-1).price / points[0].price - 1 : 0;
        chartChange.textContent = `現在 ${fmtPrice(price)} ${cur}　基準価格比 ${pct(price / g.base_price - 1)} ／ 観測期間の変化 ${pct(change)}`;
        chart.update(points, g.base_price);
    }

    // ---------------------------------------------------------- arbitrage hints
    const hintList = h('ol', { class: 'hints' });
    let hintStamp = 0;

    function routeBetween(a, b) {
        return (W.world.trade_routes || []).find(r => (r.from === a && r.to === b) || (r.from === b && r.to === a));
    }

    function computeHints() {
        const out = [];
        for (const g of W.goods) {
            const q = goodQuotes(eco, g.id);
            if (q.length < 2) continue;
            q.sort((a, b) => a.price - b.price);
            const lo = q[0], hi = q[q.length - 1];
            const spread = hi.price / lo.price - 1;
            if (spread < 0.15) continue;
            const route = routeBetween(lo.district, hi.district);
            out.push({ g, lo, hi, spread, route });
        }
        out.sort((a, b) => b.spread - a.spread);
        return out.slice(0, 8);
    }

    function paintHints() {
        const hints = computeHints();
        clear(hintList);
        if (!hints.length) { hintList.append(h('li', { class: 'empty' }, 'いまは目立った開きがありません。しばらくすると相場が動きます。')); return; }
        for (const x of hints) {
            const dl = W.byId.district.get(x.lo.district), dh = W.byId.district.get(x.hi.district);
            const pl = W.placeOf(x.lo.district), ph = W.placeOf(x.hi.district);
            const crossEra = pl && ph && pl.id !== ph.id;
            hintList.append(h('li', { class: 'hint' },
                h('div', { class: 'hint-top' }, goodLink(W, x.g.id), h('b', { class: 'hint-spread' }, pct(x.spread)),
                    crossEra ? chip('時代をまたぐ') : null, x.route ? chip(viaLabel(x.route.via), 'chip-via') : null),
                h('p', { class: 'hint-path' },
                    h('span', null, '仕入れ ', dl ? link(href.district(dl.id), nameOf(dl)) : '?', ` ${fmtPrice(x.lo.price)}`),
                    h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→'),
                    h('span', null, '売り ', dh ? link(href.district(dh.id), nameOf(dh)) : '?', ` ${fmtPrice(x.hi.price)}`)),
                x.route ? h('p', { class: 'hint-note' }, h('b', null, x.route.arbitrage_type || ''), ' ', tagged(clip(x.route.narrative, 90))) : null));
        }
    }

    // ---------------------------------------------------------- price board
    const board = h('div', { class: 'board', role: 'list' });
    const more = h('button', { type: 'button', class: 'btn', onclick: () => { state.shown += PAGE; paintBoard(true); } }, 'さらに表示');
    const count = h('p', { class: 'result-count', 'aria-live': 'polite' });
    const rowRefs = new Map();

    const cats = [...new Set(W.goods.map(g => g.category))];
    const catBtns = cats.map(c => h('button', {
        type: 'button', class: 'chip chip-btn', 'aria-pressed': String(state.cat === c), 'data-cat': c,
        onclick: () => { state.cat = state.cat === c ? '' : c; state.shown = PAGE; syncCat(); paintBoard(true); }
    }, CATEGORY_LABEL[c] || c));
    const syncCat = () => catBtns.forEach(b => b.setAttribute('aria-pressed', String(state.cat === b.dataset.cat)));

    const placeSel = h('select', {
        'aria-label': '時片・異界で絞る',
        onchange: e => { state.place = e.target.value; state.shown = PAGE; paintBoard(true); }
    }, h('option', { value: '' }, 'すべての時片・異界'),
    W.places.map(p => h('option', { value: p.id, selected: p.id === state.place }, placeShort(p))));
    const search = h('input', {
        type: 'search', placeholder: '品名で探す', 'aria-label': '品名で探す', value: state.q,
        oninput: e => { state.q = e.target.value.trim(); state.shown = PAGE; paintBoard(true); }
    });

    const placeDistricts = id => new Set(W.districtsIn(id).map(d => d.id));

    function rankedGoods() {
        const dset = state.place ? placeDistricts(state.place) : null;
        const rows = [];
        for (const g of W.goods) {
            if (state.cat && g.category !== state.cat) continue;
            if (state.q && !(g.name_ja + ' ' + g.name_en).toLowerCase().includes(state.q.toLowerCase())) continue;
            let q = goodQuotes(eco, g.id);
            if (dset) q = q.filter(x => dset.has(x.district));
            if (!q.length) continue;
            const mean = q.reduce((s, x) => s + x.price, 0) / q.length;
            rows.push({ g, q, mean, ratio: mean / g.base_price - 1 });
        }
        rows.sort((a, b) => (state.open === a.g.id ? -1 : state.open === b.g.id ? 1 : 0) || Math.abs(b.ratio) - Math.abs(a.ratio));
        return rows;
    }

    function goodRow(r) {
        const dir = r.ratio >= 0 ? 'up' : 'down';
        const sparkBox = h('span', { class: 'row-spark' });
        const priceEl = h('b', { class: 'row-price' });
        const chgEl = h('span', { class: 'row-chg' });
        const spreadEl = h('span', { class: 'row-spread' });
        const detail = h('div', { class: 'row-detail' });
        const details = h('details', { class: 'good-row', role: 'listitem', open: state.open === r.g.id },
            h('summary', null,
                h('span', { class: 'row-name' }, goodArtwork(W, r.g) ? h('img', { class: 'good-origin-thumb', src: visualSource(goodArtwork(W, r.g).visual), alt: goodArtwork(W, r.g).label, loading: 'lazy', decoding: 'async' }) : null,
                    h('strong', null, nameOf(r.g)), h('small', null, `${CATEGORY_LABEL[r.g.category] || r.g.category} ・ ${r.g.unit || ''}`)),
                sparkBox, priceEl, chgEl),
            h('div', { class: 'row-body' }, h('p', { class: 'row-desc' }, tagged(clip(r.g.description, 150))), spreadEl, detail));
        details.addEventListener('toggle', () => { if (details.open) { state.open = r.g.id; paintDetail(); } });
        details.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) selectChart(r.g.id); });
        details.addEventListener('focusin', () => selectChart(r.g.id));
        details.querySelector('summary').addEventListener('click', () => selectChart(r.g.id, true));
        details.querySelector('summary').setAttribute('aria-controls', 'selected-good-title');
        const ref = { g: r.g, sparkBox, priceEl, chgEl, spreadEl, detail, details, dir };
        function paintDetail() {
            if (!details.open) return;
            const q = goodQuotes(eco, r.g.id).sort((a, b) => a.price - b.price);
            clear(detail);
            for (const x of q) {
                const d = W.byId.district.get(x.district);
                const ratio = x.price / r.g.base_price - 1;
                detail.append(h('div', { class: 'dp-row' },
                    h('span', { class: 'dp-name' }, d ? link(href.district(d.id), nameOf(d)) : x.district, h('small', null, placeShort(W.placeOf(x.district)))),
                    spark(history.series(x.district, r.g.id), { w: 90, h: 22, color: ratio >= 0 ? '#f2b66b' : '#7fe0c8' }),
                    h('b', null, fmtPrice(x.price)),
                    h('span', { class: 'row-chg ' + (ratio >= 0 ? 'up' : 'down') }, pct(ratio))));
            }
        }
        ref.paintDetail = paintDetail;
        return ref;
    }

    function paintRowLive(ref, r) {
        const up = r.ratio >= 0;
        ref.priceEl.textContent = fmtPrice(r.mean) + ' ' + cur;
        ref.chgEl.textContent = (up ? '▲ ' : '▼ ') + pct(r.ratio).replace('+', '');
        ref.chgEl.className = 'row-chg ' + (up ? 'up' : 'down');
        const sorted = [...r.q].sort((a, b) => a.price - b.price);
        const lo = sorted[0], hi = sorted[sorted.length - 1];
        const dl = W.byId.district.get(lo.district), dh = W.byId.district.get(hi.district);
        ref.spreadEl.textContent = lo === hi ? '' : `安い：${dl ? nameOf(dl) : ''} ${fmtPrice(lo.price)} ／ 高い：${dh ? nameOf(dh) : ''} ${fmtPrice(hi.price)}（差 ${pct(hi.price / lo.price - 1)}）`;
        clear(ref.sparkBox);
        ref.sparkBox.append(spark(history.meanSeries(r.g.id), { w: 96, h: 26, color: up ? '#f2b66b' : '#7fe0c8' }));
    }

    let ranked = [];
    let shownIds = '';
    function paintBoard(rebuild) {
        ranked = rankedGoods();
        const slice = ranked.slice(0, state.shown);
        const ids = slice.map(r => r.g.id).join(',');
        if (rebuild) {
            clear(board); rowRefs.clear();
            for (const r of slice) { const ref = goodRow(r); rowRefs.set(r.g.id, ref); board.append(ref.details); }
            if (!slice.length) board.append(emptyNote('この条件の品は、いまは市に出ていません。'));
        } else if (ids !== shownIds) {
            // The ranking moved: keep the rows that stay (and whether they are open),
            // add the goods that came into the slice, drop the ones that left, in the new order.
            const focused = document.activeElement;
            const next = new Map();
            for (const r of slice) next.set(r.g.id, rowRefs.get(r.g.id) || goodRow(r));
            clear(board); rowRefs.clear();
            for (const [id, ref] of next) { rowRefs.set(id, ref); board.append(ref.details); }
            if (!slice.length) board.append(emptyNote('この条件の品は、いまは市に出ていません。'));
            if (focused && board.contains(focused)) focused.focus({ preventScroll: true });
        }
        shownIds = ids;
        for (const r of slice) { const ref = rowRefs.get(r.g.id); if (ref) { paintRowLive(ref, r); if (ref.details.open) ref.paintDetail(); } }
        more.hidden = ranked.length <= state.shown;
        count.textContent = `${ranked.length} 品目（動きの大きい順）`;
        if (rebuild) {
            goodSelect.replaceChildren(...ranked.map(r => h('option', { value: r.g.id }, nameOf(r.g))));
            selectChart(ranked.some(r => r.g.id === chartGood) ? chartGood : ranked[0]?.g.id || '');
            chartPanel.hidden = !ranked.length;
        } else updateChart();
    }

    paintHints();
    paintBoard(true);
    if (state.open) setTimeout(() => { const ref = rowRefs.get(state.open); if (ref) ref.details.scrollIntoView({ block: 'center' }); }, 60);

    const liveNote = h('p', { class: 'ar-role live-note' });
    const paintLive = () => { liveNote.textContent = `この取引は動いています。いままでに ${fmt(eco.stats.trades)} 件、出来高 ${fmt(eco.stats.volume)} ${cur}。`; };
    paintLive();
    let artworkStopped = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stopArt = h('button', { class: 'btn market-stop', type: 'button', 'aria-pressed': String(artworkStopped), onclick: () => { artworkStopped = !artworkStopped; el.classList.toggle('is-still', artworkStopped); stopArt.textContent=artworkStopped?'絵を動かす':'絵を止める';stopArt.setAttribute('aria-pressed',String(artworkStopped)); } }, artworkStopped?'絵を動かす':'絵を止める');
    chartPanel.prepend(stopArt);
    const el = h('div', { class: 'page' + (artworkStopped ? ' is-still' : '') },
        h('header', { class: 'page-head' },
            h('h1', null, '相場'),
            h('p', { class: 'lead' }, `価格は基軸通貨「${cur}」で表す。堂島時層会所が明け六つと暮れ六つに全時片の取引を清算し、エージェントたちは相場の開きを見て自分で動く。`),
            liveNote),
        h('div', { class: 'market-workspace' }, chartPanel,
        h('section', { class: 'sec market-board', 'aria-labelledby': 'board' },
            sectionHead('品目と価格', 'かざす・フォーカス・タップでチャートへ。開くと地区ごとの値も見える。', 'board'),
            plaque({ class: 'filters' },
                h('div', { class: 'filter-row' }, h('span', { class: 'lbl' }, '種類'), h('div', { class: 'chips' }, catBtns)),
                h('div', { class: 'filter-row filter-inputs' }, placeSel, search)),
            count, board, h('p', { class: 'more' }, more))),
        h('details', { class: 'sec market-hints' }, h('summary', null, '裁定のヒントを読む'), hintList),
        currencySection(ctx));

    return {
        el, title: '相場',
        update() {
            const now = performance.now();
            if (now - hintStamp > 4000) { hintStamp = now; paintHints(); }
            paintBoard(false);
            paintLive();
            if (chartArt) chartArt.update();
        },
        destroy() { chart.destroy(); window.removeEventListener('scroll', onScroll); window.removeEventListener('wheel', onScrollIntent); window.removeEventListener('touchmove', onScrollIntent); window.removeEventListener('keydown', onScrollIntent); }
    };
}
