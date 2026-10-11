// #/chain — the on-chain ledger — and the agent-page panel (address, balance, 雇う x402).
// Everything shown as on-chain comes from js/chain.js; with chain mode off the page says SIM.
// See docs/ONCHAIN.md for the contract and the honesty rules.

import { h, clear, nameOf, placeShort, agentShort, clip, fmt } from './util.js';
import { plaque, sectionHead } from './components.js';

const MIN_SETUP_LAMPORTS = 120_000_000;      // what chain.js wants before it will start setup (~0.12 SOL)
const HIRE_LAMPORTS = 10_000_000;            // 0.01 SOL
const FAUCET = 'https://faucet.solana.com/';

const KIND = { trade: '取引', settle: '決算', setup: '開設', fund: '資金', hire: '雇用' };
const STATUS = { queued: ['待機', 'pending'], sent: ['送信中', 'pending'], confirmed: ['確定', 'confirmed'], failed: ['失敗', 'failed'] };
const VERB = { buy: '仕入れ', sell: '売却', craft: '細工' };

export const shortAddr = a => (a ? a.slice(0, 4) + '…' + a.slice(-4) : '—');
export const phantomPresent = () => { try { return !!((window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom)); } catch { return false; } };
const solOf = lamports => (lamports == null ? '—' : (lamports / 1e9).toFixed(3));

function explorers(ctx) {
    const m = ctx.chainMod || {};
    return {
        tx: sig => (m.explorerTx ? m.explorerTx(sig) : `https://explorer.solana.com/tx/${sig}?cluster=devnet`),
        addr: a => (m.explorerAddr ? m.explorerAddr(a) : `https://explorer.solana.com/address/${a}?cluster=devnet`)
    };
}

const ext = (href, text, cls = 'chain-link') => h('a', { class: cls, href, target: '_blank', rel: 'noopener noreferrer' }, text);

async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); btn.textContent = 'コピーしました ✓'; }
    catch { btn.textContent = '手動でコピーしてください'; }
    setTimeout(() => { btn.textContent = 'コピー'; }, 1800);
}

export function stateLabel(chain) {
    if (!chain) return 'SIM';
    return { off: 'SIM', loading: '読み込み中', 'needs-funds': '資金待ち', 'setting-up': '開設中', live: 'DEVNET LIVE', error: 'エラー' }[chain.state] || 'SIM';
}

// One line, in Japanese, saying what a ChainTx records. Built only from the tx's own fields.
export function summarize(W, tx) {
    const ops = tx.ops || [];
    if (tx.kind === 'trade' && ops.length) {
        const parts = ops.slice(0, 1).map(op => {
            const good = W.byId.good.get(op.good), place = W.byId.place.get(op.place);
            return `${good ? nameOf(good) : op.good || '品'} ×${op.qty ?? '?'} を ${place ? placeShort(place) : op.place || '市'} で${VERB[op.action] || op.action || '取引'}`
                + (op.amount != null ? ` · ${fmt(op.amount, 2)} KOGANE` : '');
        });
        if (ops.length > 1) parts.push(`ほか ${ops.length - 1} 件`);
        return parts.join(' ');
    }
    if (tx.kind === 'settle') return '決算の記録 ' + clip(tx.memo ? tx.memo.replace(/^zipangu:/, '') : '', 54);
    if (tx.kind === 'setup') return 'KOGANE の開設（ミント・口座・委任）';
    if (tx.kind === 'fund') return '財務庫への入金';
    if (tx.kind === 'hire') return 'x402 の支払い（雇用） ' + clip(tx.memo ? tx.memo.replace(/^zipangu:/, '') : '', 40);
    return clip(tx.memo || '', 60);
}

function tilesFor(chain) {
    const txs = chain.txs || [];
    const win = 180000, now = Date.now();
    const recent = txs.filter(t => t.status === 'confirmed' && now - (t.at || 0) < win).length;
    const span = Math.min(win, Math.max(30000, now - (chain.stats && chain.stats.since || now)));
    const perMin = recent / (span / 60000);
    const st = chain.stats || {};
    return [
        ['確定した取引', fmt(st.confirmed || 0), 'confirmed tx'],
        ['動いた KOGANE', fmt(st.volume || 0, 2), 'KOGANE moved'],
        ['毎分', perMin < 10 ? perMin.toFixed(1) : fmt(perMin), 'tx / min']
    ];
}

// ================================================================== #/chain

export function chainView(ctx) {
    const { W } = ctx;
    const E = () => explorers(ctx);
    let alive = true, busy = '', note = null, loadError = '';
    let wizKey = '', ledKey = '', statKey = '';
    const drawn = new Set();          // ledger rows already shown once (only new ones animate in)
    let ledgerFirst = true;
    const unsub = [];

    const modeBadge = h('span', { class: 'chain-badge' });
    const wizard = h('div', { class: 'chain-wizard' });
    const accounts = h('div', { class: 'chain-accounts' });
    const stats = h('div', { class: 'chain-stats', 'aria-live': 'polite' });
    const ledger = h('ol', { class: 'ledger', 'aria-label': 'オンチェーン台帳（新しい順）' });
    const ledgerSec = h('section', { class: 'sec' });
    const control = h('div', { class: 'chain-control' });

    const chain = () => ctx.chain;

    async function run(name, fn) {
        busy = name; note = null; paint(true);
        try {
            const r = await fn();
            if (r && r.ok === false) note = { bad: true, text: r.reason || '失敗しました' };
            else if (r && r.ok) note = { text: name === 'airdrop' ? 'エアドロップを受け取りました。' : name === 'fund' ? 'Phantom から送金しました。' : '完了しました。' };
        } catch (err) {
            note = { bad: true, text: String(err && err.message || err) };
            if (name === 'enable') {
                loadError = /import|fetch|module|load/i.test(note.text)
                    ? 'チェーンの部品を読み込めませんでした（単一ファイル版・オフラインでは使えません）：' + note.text : note.text;
                note = { bad: true, text: loadError };
            }
        }
        busy = '';
        if (alive) paint(true);
    }

    // ---------------------------------------------------- wizard
    function step(n, title, sub, state, ...body) {
        return h('li', { class: 'wiz-step is-' + state },
            h('span', { class: 'wiz-n', 'aria-hidden': 'true' }, state === 'done' ? '✓' : String(n)),
            h('div', { class: 'wiz-body' }, h('h3', null, title, h('small', null, sub)), ...body));
    }

    function paintWizard() {
        const c = chain(), s = c ? c.state : 'off';
        const lamports = c ? c.treasuryLamports : null;
        const enough = lamports != null && lamports >= MIN_SETUP_LAMPORTS;
        const key = JSON.stringify([s, c && c.error, busy, note, loadError, enough, lamports != null ? Math.round(lamports / 1e6) : null, phantomPresent()]);
        if (key === wizKey) return;
        wizKey = key;

        const noteEl = note ? h('p', { class: 'chain-note' + (note.bad ? ' is-bad' : ''), role: 'status' }, note.text) : null;
        const btn = (name, label, fn, primary, disabled) => h('button', {
            type: 'button', class: 'btn' + (primary ? ' btn-primary' : ''), disabled: !!(busy || disabled),
            onclick: () => run(name, fn)
        }, busy === name ? label.busy : label.text);
        const phantomHint = phantomPresent() ? null
            : h('p', { class: 'chain-hint' }, 'Phantom が見つかりません。', ext('https://phantom.app/', 'phantom.app'), ' から入れて、設定で Solana の Devnet（テストネット）を選んでください。');

        // 1 -- start
        const one = s === 'off' || s === 'error' || !c || s === 'loading'
            ? step(1, '起動', 'Enable', s === 'loading' || busy === 'enable' ? 'busy' : 'active',
                h('p', null, 'チェーンの部品を読み込み、この端末だけの使い捨てキー（devnet 専用）を作ります。押すまで、ネットワークには一切つながりません。'),
                s === 'error' ? h('p', { class: 'chain-note is-bad', role: 'alert' }, (c && c.error) || loadError || 'エラーが起きました') : null,
                loadError && s !== 'error' ? h('p', { class: 'chain-note is-bad', role: 'alert' }, loadError) : null,
                btn('enable', { text: s === 'error' ? 'もう一度ためす' : '⛓ オンチェーンを起動', busy: '読み込み中…' }, () => ctx.enableChain(), true))
            : step(1, '起動', 'Enable', 'done', h('p', { class: 'muted' }, '財務庫キーを用意しました。'));

        // 2 -- fund
        let two;
        if (s === 'needs-funds') {
            two = step(2, '資金', 'Fund', 'active',
                h('p', null, '財務庫の devnet SOL ', h('b', { class: 'chain-sol' }, solOf(lamports)), ' SOL ／ 開設には約 0.12 SOL が要ります。'),
                h('div', { class: 'chain-actions' },
                    btn('airdrop', { text: '💧 エアドロップ（1 SOL）', busy: '要求中…' }, () => c.requestAirdrop()),
                    btn('fund', { text: '👛 Phantom から 0.5 SOL', busy: 'Phantom で承認…' }, () => c.fundFromWallet(0.5), false, !phantomPresent()),
                    ext(FAUCET, 'faucet.solana.com ↗', 'btn')),
                phantomHint,
                h('div', { class: 'chain-addr' }, h('span', { class: 'lbl' }, '財務庫アドレス'), h('code', null, c.treasury || '—'),
                    c.treasury ? h('button', { type: 'button', class: 'btn btn-small', onclick: e => copy(c.treasury, e.currentTarget) }, 'コピー') : null),
                h('p', { class: 'muted' }, 'devnet の SOL に価値はありません。エアドロップが混み合っているときは、上の faucet に上のアドレスを貼ってください。'),
                c.error ? h('p', { class: 'chain-note is-bad', role: 'alert' }, clip(c.error, 240)) : null,
                noteEl);
        } else if (s === 'off' || s === 'error' || s === 'loading') {
            two = step(2, '資金', 'Fund', 'todo', h('p', { class: 'muted' }, '財務庫に devnet SOL を入れます（エアドロップ／Phantom／faucet）。'));
        } else {
            two = step(2, '資金', 'Fund', 'done', h('p', { class: 'muted' }, `財務庫 ${solOf(lamports)} SOL`));
        }

        // 3 -- setup
        let three;
        if (s === 'needs-funds') {
            three = step(3, '開設', 'Setup', enough ? 'active' : 'todo',
                h('p', null, 'KOGANE（光金）のミント、住人32人と市18か所の口座、委任の承認を作ります。数十回の取引になり、数分かかります。'),
                btn('setup', { text: enough ? '🏯 万華京を開設する' : 'faucet で入金したので開設を試す', busy: '開設中…' }, () => c.setup(), enough),
                enough ? h('p', { class: 'muted' }, 'エアドロップや Phantom で入金すると、自動で開設に進みます。')
                    : h('p', { class: 'muted' }, '残高が足りないときは「資金待ち」に戻ります。faucet で入れた場合は、このボタンで再確認します。'));
        } else if (s === 'setting-up') {
            const setupTxs = (c.txs || []).filter(t => t.kind === 'setup');
            const ok = setupTxs.filter(t => t.status === 'confirmed').length;
            three = step(3, '開設', 'Setup', 'busy',
                h('p', null, `開設中… 確定した開設取引 ${ok} / ${setupTxs.length}`),
                h('div', { class: 'meter chain-setup-bar', role: 'progressbar', 'aria-label': '開設の進み具合' }, h('i', { style: { width: setupTxs.length ? Math.round(ok / setupTxs.length * 100) + '%' : '8%' } })),
                h('p', { class: 'muted' }, 'このページを開いたままにしてください。途中で止まっても、次回の「開設」で続きから再開します。'),
                btn('setup', { text: '再開', busy: '続行中…' }, () => c.setup()));
        } else if (s === 'live') {
            three = step(3, '開設', 'Setup', 'done', h('p', { class: 'muted' }, 'KOGANE と口座が devnet に作られました。'));
        } else {
            three = step(3, '開設', 'Setup', 'todo', h('p', { class: 'muted' }, 'KOGANE のミントと口座を作ります。'));
        }

        const live = s === 'live' ? h('li', { class: 'wiz-step is-live' },
            h('span', { class: 'wiz-n', 'aria-hidden': 'true' }, '⛓'),
            h('div', { class: 'wiz-body' }, h('h3', null, 'LIVE', h('small', null, '稼働中')),
                h('p', null, 'いま住人が商いをするたび、devnet に取引が刻まれます。地図で金貨が飛ぶのを見てください。'),
                h('a', { class: 'btn btn-primary', href: '#/' }, '地図で見る →'))) : null;

        clear(wizard).append(h('ol', { class: 'wiz-steps' }, one, two, three, live));
    }

    // ---------------------------------------------------- accounts + stats + ledger
    function paintAccounts() {
        const c = chain();
        clear(accounts);
        if (!c || !c.treasury) return;
        const e = E();
        const row = (label, sub, addr) => h('div', { class: 'acct-row' },
            h('span', { class: 'lbl' }, label, h('small', null, sub)),
            addr ? h('span', { class: 'acct-val' }, h('code', { title: addr }, shortAddr(addr)), ext(e.addr(addr), 'Explorer ↗'),
                h('button', { type: 'button', class: 'btn btn-small', onclick: ev => copy(addr, ev.currentTarget) }, 'コピー')) : h('span', { class: 'muted' }, 'まだありません'));
        accounts.append(plaque({ class: 'chain-card' },
            row('財務庫', 'Treasury', c.treasury),
            row('KOGANE ミント', 'Mint', c.mint),
            h('div', { class: 'acct-row' }, h('span', { class: 'lbl' }, '財務庫の残高', h('small', null, 'SOL (devnet)')), h('span', { class: 'acct-val' }, h('b', null, solOf(c.treasuryLamports)), ' SOL'))));
    }

    function paintStats() {
        const c = chain();
        const live = c && c.state === 'live';
        const tiles = live ? tilesFor(c) : [['確定した取引', '—', 'confirmed tx'], ['動いた KOGANE', '—', 'KOGANE moved'], ['毎分', '—', 'tx / min']];
        const k = JSON.stringify(tiles) + live;
        if (k === statKey) return;
        statKey = k;
        clear(stats);
        for (const [label, val, en] of tiles) stats.append(h('div', { class: 'stat-tile' }, h('b', null, val), h('span', null, label), h('small', null, en)));
    }

    function paintLedger() {
        const c = chain();
        const txs = c ? (c.txs || []) : [];
        const key = txs.slice(0, 60).map(t => t.id + t.status + (t.sig ? 1 : 0) + (t.slot || '')).join('|') + (c ? c.state : '');
        if (key === ledKey) return;
        ledKey = key;
        clear(ledger);
        const e = E();
        if (!txs.length) {
            ledger.append(h('li', { class: 'ledger-empty' }, c && c.state === 'live'
                ? 'まだ取引がありません。住人が商いを始めると、ここに流れます。'
                : 'SIM — チェーンは動いていません。ここに表示されるのは、devnet が実際に返した取引だけです。'));
            return;
        }
        const shown = txs.slice(0, 60);
        for (const tx of shown) {
            const [label, cls] = STATUS[tx.status] || ['—', 'pending'];
            const ag = tx.ops && tx.ops[0] && tx.ops[0].agent && W.byId.agent.get(tx.ops[0].agent);
            ledger.append(h('li', { class: 'ledger-row st-' + cls + (drawn.has(tx.id) ? '' : ' is-new'), title: tx.memo || '' },
                h('span', { class: 'pill pill-' + cls }, label),
                h('span', { class: 'ledger-kind' }, KIND[tx.kind] || tx.kind),
                ag ? h('a', { class: 'ledger-who', href: `#/agent/${ag.id}` }, agentShort(ag)) : h('span', { class: 'ledger-who' }),
                h('span', { class: 'ledger-sum' }, summarize(W, tx), tx.status === 'failed' && tx.error ? h('em', null, ' — ' + clip(tx.error, 80)) : null),
                h('span', { class: 'ledger-slot' }, tx.slot != null ? `slot ${fmt(tx.slot)}` : ''),
                tx.sig ? ext(e.tx(tx.sig), '⛓ ' + tx.sig.slice(0, 6) + '… ↗', 'ledger-link') : h('span', { class: 'ledger-link muted' }, '署名待ち')));
        }
        if (ledgerFirst) ledger.querySelectorAll('.is-new').forEach(n => n.classList.remove('is-new'));   // the first paint is not news
        ledgerFirst = false;
        for (const tx of shown) drawn.add(tx.id);
    }

    function paintControl() {
        const c = chain();
        clear(control);
        if (!c || c.state === 'off') return;
        control.append(h('details', { class: 'chain-danger' }, h('summary', null, '停止・初期化 / Stop & reset'),
            h('p', { class: 'muted' }, '停止すると取引の記録を止めます（キーは残ります）。初期化はこの端末の使い捨てキーを忘れます。devnet のアカウントは消えません。'),
            h('div', { class: 'chain-actions' },
                h('button', { type: 'button', class: 'btn', onclick: () => { ctx.disableChain(); paint(true); } }, '⏹ オンチェーンを止める'),
                h('button', { type: 'button', class: 'btn btn-danger', onclick: () => {
                    if (!confirm('この端末のオンチェーン用キー（財務庫・住人・市）を忘れます。devnet の使い捨てキーですが、元に戻せません。続けますか？')) return;
                    ctx.resetChain(); paint(true);
                } }, '🗑 キーを初期化'))));
    }

    function paint(force) {
        if (!alive) return;
        const c = chain(), s = c ? c.state : 'off';
        modeBadge.textContent = s === 'live' ? 'DEVNET LIVE' : s === 'off' ? 'SIM' : stateLabel(c);
        modeBadge.className = 'chain-badge ' + (s === 'live' ? 'is-live' : s === 'error' ? 'is-error' : '');
        if (force) wizKey = '';
        paintWizard(); paintAccounts(); paintStats(); paintLedger();
        const ck = (c ? c.state : 'off');
        if (control.dataset.k !== ck || force) { control.dataset.k = ck; paintControl(); }
        ledgerSec.hidden = false;
    }

    // ---------------------------------------------------- page
    const honesty = plaque({ class: 'chain-honesty' },
        h('h2', null, '正直のきまり ', h('small', null, 'Honesty')),
        h('ul', null,
            h('li', null, h('b', null, 'devnet だけ。'), ' 本物の SOL・本物のお金は一切動きません。メインネットへの道は、コードにありません。'),
            h('li', null, h('b', null, '使い捨てのキー。'), ' 財務庫・住人・市のキーはこの端末の localStorage にあるテスト用で、ここに価値のあるものは置かないでください。あなたのウォレットは Phantom の承認画面でしか触れません。'),
            h('li', null, h('b', null, '署名は偽造しません。'), ' 署名・スロット・残高は、すべて RPC が返したものだけ。確定前は「待機」、失敗は「失敗」と出します。'),
            h('li', null, h('b', null, '止まっているときは SIM。'), ' チェーンが動いていないときは、地図もフィードも今までどおりのシミュレーションで、チェーンの数字は出しません。'),
            h('li', null, h('b', null, 'シムが正本。'), ' オンチェーンは領収書の層です。ただ一つ、確認できた x402 の支払いだけが、住人へのお願いを一件、シムに入れます。')));

    const el = h('div', { class: 'page chain-page' },
        h('header', { class: 'page-head chain-hero' },
            h('p', { class: 'kicker' }, 'Colosseum Crypto World’s Fair'),
            h('h1', null, '⛓ 万華京オンチェーン', h('small', null, 'Agents on Solana devnet')),
            h('p', { class: 'lead' }, '住人たちの仕入れ・細工・売りは、いつもシミュレーションの中で起きています。ここでスイッチを入れると、その一つ一つが Solana devnet の本物の取引になり、地図の上を金貨になって飛びます。', modeBadge)),
        h('div', { class: 'page-body' },
            h('section', { class: 'sec' }, sectionHead('はじめかた', '起動 → 資金 → 開設', 'ch-wiz'), wizard),
            h('section', { class: 'sec' }, sectionHead('アカウント', 'Treasury & KOGANE mint', 'ch-acct'), accounts),
            h('section', { class: 'sec' }, sectionHead('いまの数字', 'Live stats — RPC が確定させた分だけ', 'ch-stat'), stats),
            ledgerSec,
            honesty,
            control));
    ledgerSec.append(sectionHead('台帳', 'Ledger — 新しい順 / newest first', 'ch-led'), ledger);

    function subscribe() {
        const c = chain();
        if (!c || typeof c.on !== 'function') return;
        let timer = 0;
        const later = () => { if (timer) return; timer = setTimeout(() => { timer = 0; if (alive) paint(); }, 150); };
        for (const type of ['tx', 'state']) { const u = c.on(type, later); if (typeof u === 'function') unsub.push(u); }
    }
    let bound = null;
    function bind() { if (chain() && bound !== chain()) { bound = chain(); subscribe(); } }
    bind(); paint(true);

    return {
        el, title: 'オンチェーン',
        update() { bind(); paint(); },
        destroy() { alive = false; for (const u of unsub) { try { u(); } catch { /* fine */ } } }
    };
}

// ================================================================== agent page panel

export function agentChainPanel(ctx, a) {
    const { W, stories } = ctx;
    let alive = true, hire = null, open = false, bal = { v: undefined, at: 0, busy: false };
    let requestId = '';
    const newRequestId = () => (requestId = `${a.id}-${Date.now().toString(36)}`);
    const body = h('div', { class: 'ach-body' });
    const el = h('section', { class: 'agent-chain', 'aria-label': 'オンチェーン' });
    el.append(body);
    const unsub = [];
    let bound = null, lastKey = '';

    const chain = () => ctx.chain;
    const E = () => explorers(ctx);

    const PHASES = [['quote', '見積り 402'], ['signing', '署名 Phantom'], ['confirming', '確認中'], ['verified', '検証 ✓']];
    function phaseDots() {
        const cur = hire ? (hire.phase === 'failed' ? hire.failedAt || 'signing' : hire.phase) : 'quote';
        const idx = PHASES.findIndex(p => p[0] === cur);
        return h('ol', { class: 'hire-phases' }, PHASES.map(([k, label], i) =>
            h('li', { class: (i < idx || (hire && hire.phase === 'verified') ? 'is-done ' : '') + (i === idx ? (hire && hire.phase === 'failed' ? 'is-bad' : hire && hire.phase === 'verified' ? 'is-done' : 'is-now') : '') }, label)));
    }

    async function pay() {
        const c = chain();
        hire = { phase: 'signing' }; lastKey = ''; paint();
        const request = { id: requestId || newRequestId(), type: 'observe', district: a.home, title: stories ? stories.profile(a.id).task : '現地記録' };
        let res;
        try { res = await c.hire(a.id, { lamports: HIRE_LAMPORTS, request }); }
        catch (err) { res = { ok: false, reason: String(err && err.message || err) }; }
        if (!alive) { /* the page was left; the payment result still applies below */ }
        if (res && res.ok) {
            // Verified on-chain: only now does the sim hear about it, through the same door as the request buttons.
            const story = stories.request(a.id, 'observe');
            ctx.persistJourney && ctx.persistJourney();
            hire = { phase: 'verified', sig: res.sig, story };
        } else {
            hire = { phase: 'failed', reason: (res && res.reason) || '支払いを確認できませんでした', failedAt: hire && hire.seen || 'signing' };
        }
        if (res && res.ok) requestId = '';
        lastKey = ''; if (alive) paint();
    }

    function quoteCard(c) {
        const addr = c.addressOf(a.id);
        return h('div', { class: 'quote402', role: 'group', 'aria-label': 'HTTP 402 支払い見積り' },
            h('pre', null,
                h('b', null, 'HTTP/1.1 402 Payment Required'), '\n',
                'x-payment-network: solana-devnet\n',
                'payTo:   ', addr || '—', '\n',
                'amount:  0.01 SOL  (', fmt(HIRE_LAMPORTS), ' lamports)\n',
                'memo:    zipangu:x402:', requestId || '<request-id>'),
            h('p', { class: 'muted' }, `${agentShort(a)} への支払いを devnet で確認できたら、現地記録のお願いを一件、シムに入れます。メモにはこの依頼の ID を刻みます。`));
    }

    function hireBlock(c) {
        const inflight = hire && (hire.phase === 'signing' || hire.phase === 'confirming');
        const wrap = h('div', { class: 'ach-hire' });
        const btn = h('button', { type: 'button', class: 'btn btn-primary', disabled: !!inflight, 'aria-expanded': String(open), onclick: () => { open = !open; if (open && !requestId) newRequestId(); if (!open && hire && !inflight) hire = null; lastKey = ''; paint(); } },
            '雇う (x402) ・ 0.01 SOL');
        wrap.append(btn);
        if (!open && !hire) return wrap;
        wrap.append(quoteCard(c), phaseDots());
        if (!phantomPresent()) {
            wrap.append(h('p', { class: 'chain-note is-bad', role: 'alert' }, 'Phantom が見つかりません。', ext('https://phantom.app/', 'phantom.app'), ' を入れて、設定で Solana を Devnet（テストネット）にしてから、もう一度ためしてください。'));
        } else if (!hire || hire.phase === 'failed') {
            wrap.append(h('p', { class: 'muted' }, 'Phantom が Devnet になっているか確かめてください（本物の SOL は動きません）。'));
        }
        if (!hire || hire.phase === 'failed') {
            wrap.append(h('button', { type: 'button', class: 'btn btn-primary', disabled: !phantomPresent(), onclick: pay },
                hire ? 'もう一度 Phantom で支払う' : '💳 Phantom で 0.01 SOL を支払って雇う'));
        }
        if (hire && hire.phase === 'signing') wrap.append(h('p', { class: 'chain-note', role: 'status' }, 'Phantom の画面で承認してください…（署名・送信・確認を待っています）'));
        if (hire && hire.phase === 'confirming') wrap.append(h('p', { class: 'chain-note', role: 'status' }, 'ブロックでの確認を待っています…'));
        if (hire && hire.phase === 'failed') wrap.append(h('p', { class: 'chain-note is-bad', role: 'alert' }, '支払いは検証できませんでした：' + hire.reason + ' ／ お願いは入れていません。'));
        if (hire && hire.phase === 'verified') {
            wrap.append(h('p', { class: 'chain-note is-ok', role: 'status' }, '検証 ✓ ', hire.sig ? ext(E().tx(hire.sig), '⛓ ' + hire.sig.slice(0, 8) + '… ↗') : null),
                h('p', null, hire.story && hire.story.ok
                    ? `${agentShort(a)} が反応しました。地図で ！→💭→🏃 を見てください。`
                    : `支払いは確認できましたが、お願いは受け付けられませんでした：${hire.story && hire.story.reason || ''}`),
                h('a', { class: 'btn', href: '#/', onclick: () => { ctx.pendingFocus = a.id; } }, '地図で追う →'));
        }
        if (!inflight) wrap.append(h('button', { type: 'button', class: 'btn btn-small', onclick: () => { hire = null; open = false; requestId = ''; lastKey = ''; paint(); } }, '閉じる'));
        return wrap;
    }

    function refreshBalance() {
        const c = chain();
        if (!c || c.state !== 'live' || bal.busy || Date.now() - bal.at < 10000) return;
        bal.busy = true; bal.at = Date.now();
        Promise.resolve(c.balanceOf(a.id)).then(v => { bal.v = v == null ? null : v; }, () => { bal.v = null; })
            .finally(() => { bal.busy = false; if (alive) { lastKey = ''; paint(); } });
    }

    function paint() {
        if (!alive) return;
        const c = chain(), live = c && c.state === 'live';
        const addr = live ? c.addressOf(a.id) : null;
        const key = JSON.stringify([live, addr, bal.v, open, hire && [hire.phase, hire.sig, hire.reason, hire.story && hire.story.ok], phantomPresent(), c && c.state]);
        if (key === lastKey) return;
        lastKey = key;
        clear(body);
        body.append(h('h2', null, '⛓ オンチェーン ', h('small', null, 'Solana devnet')));
        if (!live) {
            body.append(h('p', { class: 'muted' }, h('span', { class: 'chain-badge' }, c && c.state && c.state !== 'off' ? stateLabel(c) : 'SIM'),
                ' オンチェーンは動いていません。この住人の財布はシミュレーションの数字です。 ', h('a', { href: '#/chain' }, '起動する →')));
            return;
        }
        const e = E();
        body.append(
            h('div', { class: 'acct-row' }, h('span', { class: 'lbl' }, 'アドレス'),
                addr ? h('span', { class: 'acct-val' }, h('code', { title: addr }, shortAddr(addr)), ext(e.addr(addr), 'Explorer ↗'),
                    h('button', { type: 'button', class: 'btn btn-small', onclick: ev => copy(addr, ev.currentTarget) }, 'コピー'))
                    : h('span', { class: 'muted' }, 'この住人の口座はまだありません')),
            h('div', { class: 'acct-row' }, h('span', { class: 'lbl' }, 'オンチェーン残高', h('small', null, 'RPC · 10秒ごと')),
                h('span', { class: 'acct-val' }, bal.v === undefined ? '読み込み中…' : bal.v === null ? '取得できませんでした' : h('b', null, bal.v.toLocaleString('ja-JP', { maximumFractionDigits: 2 }) + ' KOGANE'))));
        if (addr) body.append(hireBlock(c));
    }

    function bind() {
        const c = chain();
        if (!c || bound === c || typeof c.on !== 'function') return;
        bound = c;
        const u1 = c.on('hire', ev => {
            if (!hire || hire.phase === 'verified' || hire.phase === 'failed') return;
            const p = String((ev && (ev.phase || ev.status)) || '');
            if (/confirm|sent|submit|verif/i.test(p)) { hire.phase = 'confirming'; hire.seen = 'confirming'; lastKey = ''; paint(); }
        });
        if (typeof u1 === 'function') unsub.push(u1);
        const u2 = c.on('state', () => { lastKey = ''; paint(); });
        if (typeof u2 === 'function') unsub.push(u2);
    }

    bind(); paint(); refreshBalance();
    return {
        el,
        update() { bind(); refreshBalance(); paint(); },
        destroy() { alive = false; for (const u of unsub) { try { u(); } catch { /* fine */ } } }
    };
}
