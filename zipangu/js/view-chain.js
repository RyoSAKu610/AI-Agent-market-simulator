// #/chain — the on-chain ledger — and the agent-page panel (address, balance, 雇う x402).
// Everything shown as on-chain comes from the engine of the chosen test network (js/chain.js,
// js/chain-evm.js, js/chain-zcash.js); with chain mode off the page says SIM.
// See docs/ONCHAIN.md for the contract and the honesty rules.

import { h, clear, nameOf, placeShort, agentShort, clip, fmt } from './util.js';
import { plaque, sectionHead } from './components.js';
import { NETWORKS, NETWORK_IDS, networkOf, explorerTxOf, explorerAddrOf } from './networks.js';
import { ZCASH_RPC_KEY } from './chain-read.js';
import { qrSvg } from './qr.js';

const KIND = { trade: '取引', settle: '決算', setup: '開設', fund: '資金', hire: '雇用', birth: '誕生証明' };
const STATUS = { queued: ['待機', 'pending'], sent: ['送信中', 'pending'], confirmed: ['確定', 'confirmed'], failed: ['失敗', 'failed'] };
const VERB = { buy: '仕入れ', sell: '売却', craft: '細工' };

// What differs between the networks, in words. Everything else is the same page.
const COPY = {
    'solana-devnet': {
        model: 'SOL · KOGANE は SPL トークン', wallet: 'Phantom', walletUrl: 'https://phantom.app/',
        walletHint: ' から入れて、設定で Solana の Devnet（テストネット）を選んでください。',
        enable: 'チェーンの部品を読み込み、この端末だけの使い捨てキー（devnet 専用）を作ります。押すまで、ネットワークには一切つながりません。',
        setup: 'KOGANE（光金）のミント、住人32人と市18か所の口座、委任の承認を作ります。数十回の取引になり、数分かかります。',
        setupDone: 'KOGANE と口座が devnet に作られました。', token: 'KOGANE ミント', tokenSub: 'Mint', where: 'slot'
    },
    'robinhood-testnet': {
        model: 'ETH · KOGANE は ERC-20', wallet: 'EVM ウォレット（MetaMask など）', walletUrl: 'https://metamask.io/',
        walletHint: ' などを入れてください。支払うときに Robinhood Chain Testnet（chain id 46630）への切り替え・追加をウォレットに頼みます。',
        enable: 'ethers を読み込み、この端末だけの使い捨てキー（テストネット専用）を作り、RPC が Robinhood Chain Testnet（chain id 46630）であることを確かめます。押すまで、ネットワークには一切つながりません。',
        setup: 'KOGANE（ERC-20、contracts/Kogane.sol）を Robinhood Chain Testnet にデプロイし、住人32人と市18か所に最初の光金を配ります（3件の取引）。',
        setupDone: 'KOGANE のコントラクトと配布が済みました。', token: 'KOGANE コントラクト', tokenSub: 'ERC-20', where: 'block'
    },
    'arc-testnet': {
        model: 'USDC（ガス代も USDC）· KOGANE は ERC-20', wallet: 'EVM ウォレット（MetaMask など）', walletUrl: 'https://metamask.io/',
        walletHint: ' などを入れてください。支払うときに Arc Testnet（chain id 5042002）への切り替え・追加をウォレットに頼みます。',
        enable: 'ethers を読み込み、この端末だけの使い捨てキー（テストネット専用）を作り、RPC が Arc Testnet（chain id 5042002）であることを確かめます。押すまで、ネットワークには一切つながりません。',
        setup: 'KOGANE（ERC-20、contracts/Kogane.sol）を Arc Testnet にデプロイし、住人32人と市18か所に最初の光金を配ります（3件の取引）。ガス代は USDC で払います。',
        setupDone: 'KOGANE のコントラクトと配布が済みました。', token: 'KOGANE コントラクト', tokenSub: 'ERC-20', where: 'block'
    },
    'zcash-testnet': {
        model: 'TAZ · トークンなし：取引は OP_RETURN の領収書', wallet: 'Zcash testnet ウォレット', walletUrl: 'https://z.cash/wallets/',
        walletHint: '',
        enable: '署名の部品（@noble/curves）を読み込み、この端末だけの使い捨てキー（テストネット専用）を作り、Zcash ノードが testnet であることを確かめます。押すまで、ネットワークには一切つながりません。',
        setup: 'Zcash にはトークンの仕組みがまだ無いため（ZSA は未導入）、開設はありません。光金はシムの中に置いたまま、取引・決算・誕生証明を OP_RETURN のメモ（80バイトまで）として刻みます。',
        setupDone: '開設はありません。財務庫に TAZ が入ると、そのまま記録が始まります。', token: null, tokenSub: null, where: 'block'
    }
};
const copyOf = net => COPY[networkOf(net).id];

export const shortAddr = a => (a ? a.slice(0, 6) + '…' + a.slice(-4) : '—');
export const phantomPresent = () => { try { return !!((window.phantom && window.phantom.solana) || (window.solana && window.solana.isPhantom)); } catch { return false; } };
const walletPresent = c => (c && typeof c.walletPresent === 'function' ? c.walletPresent() : phantomPresent());
const amount = (v, digits = 6) => (v == null ? '—' : Number(v).toLocaleString('ja-JP', { maximumFractionDigits: digits }));

function explorers(ctx) {
    const m = ctx.chainMod || {}, net = ctx.chain && ctx.chain.network ? ctx.chain.network.id : (ctx.chainNet || 'solana-devnet');
    return {
        tx: sig => (m.explorerTx ? m.explorerTx(sig) : explorerTxOf(net, sig)),
        addr: a => (m.explorerAddr ? m.explorerAddr(a) : explorerAddrOf(net, a))
    };
}

const ext = (href, text, cls = 'chain-link') => h('a', { class: cls, href, target: '_blank', rel: 'noopener noreferrer' }, text);
// A ZIP 321 request as a QR code. The SVG is built here from the code's modules (js/qr.js); no
// text from the request is put into the markup.
function qrBox(uri) {
    const box = h('div', { class: 'zip321-qr', role: 'img', 'aria-label': 'ZIP 321 の QR コード' });
    const svg = qrSvg(uri);
    if (svg) box.innerHTML = svg;
    return box;
}

async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); btn.textContent = 'コピーしました ✓'; }
    catch { btn.textContent = '手動でコピーしてください'; }
    setTimeout(() => { btn.textContent = 'コピー'; }, 1800);
}

export function stateLabel(chain) {
    if (!chain) return 'SIM';
    const short = chain.network ? chain.network.short : 'DEVNET';
    return { off: 'SIM', loading: '読み込み中', 'needs-funds': '資金待ち', 'setting-up': '開設中', live: `${short} LIVE`, error: 'エラー' }[chain.state] || 'SIM';
}

// One line, in Japanese, saying what a ChainTx records. Built only from the tx's own fields.
export function summarize(W, tx, net = 'solana-devnet') {
    const ops = tx.ops || [];
    const family = networkOf(net).family;
    if (tx.kind === 'trade' && ops.length) {
        const parts = ops.slice(0, 1).map(op => {
            const good = W.byId.good.get(op.good), place = W.byId.place.get(op.place);
            return `${good ? nameOf(good) : op.good || '品'} ×${op.qty ?? '?'} を ${place ? placeShort(place) : op.place || '市'} で${VERB[op.action] || op.action || '取引'}`
                + (op.amount != null ? ` · ${fmt(op.amount, 2)} KOGANE` : '');
        });
        if (ops.length > 1) parts.push(`ほか ${ops.length - 1} 件`);
        return parts.join(' ') + (family === 'zcash' ? '（領収書）' : '');
    }
    if (tx.kind === 'settle') return '決算の記録 ' + clip(tx.memo ? tx.memo.replace(/^zipangu:/, '') : '', 54);
    if (tx.kind === 'setup') return family === 'evm' ? 'KOGANE の開設（デプロイ・配布）' : 'KOGANE の開設（ミント・口座・委任）';
    if (tx.kind === 'fund') return '財務庫への入金';
    if (tx.kind === 'birth') return '渡来したAIの誕生証明（指紋だけ。カードの中身は書きません） ' + clip(tx.memo ? (tx.memo.match(/h=([0-9a-f]{12})/) || tx.memo.match(/\|([A-Za-z0-9_-]{12})[A-Za-z0-9_-]*$/) || [])[1] || '' : '', 14);
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
    const zcash = chain.network && chain.network.family === 'zcash';
    return [
        ['確定した取引', fmt(st.confirmed || 0), 'confirmed tx'],
        [zcash ? '記録した KOGANE' : '動いた KOGANE', fmt(st.volume || 0, 2), zcash ? 'KOGANE recorded' : 'KOGANE moved'],
        ['毎分', perMin < 10 ? perMin.toFixed(1) : fmt(perMin), 'tx / min']
    ];
}

// ================================================================== #/chain

export function chainView(ctx) {
    const { W } = ctx;
    const E = () => explorers(ctx);
    let alive = true, busy = '', note = null, loadError = '';
    let wizKey = '', ledKey = '', statKey = '', pickKey = '';
    const drawn = new Set();          // ledger rows already shown once (only new ones animate in)
    let ledgerFirst = true;
    const unsub = [];

    const modeBadge = h('span', { class: 'chain-badge' });
    const picker = h('div', { class: 'net-picker', role: 'group', 'aria-label': 'ネットワーク / Network' });
    const wizard = h('div', { class: 'chain-wizard' });
    const accounts = h('div', { class: 'chain-accounts' });
    const stats = h('div', { class: 'chain-stats', 'aria-live': 'polite' });
    const ledger = h('ol', { class: 'ledger', 'aria-label': 'オンチェーン台帳（新しい順）' });
    const ledgerSec = h('section', { class: 'sec' });
    const control = h('div', { class: 'chain-control' });

    const chain = () => ctx.chain;
    const netId = () => (ctx.chain && ctx.chain.network ? ctx.chain.network.id : ctx.chainNet || 'solana-devnet');
    const NET = () => networkOf(netId());

    async function run(name, fn) {
        busy = name; note = null; paint(true);
        try {
            const r = await fn();
            if (r && r.ok === false) note = { bad: true, text: r.reason || '失敗しました' };
            else if (r && r.ok) note = { text: name === 'airdrop' ? 'エアドロップを受け取りました。' : name === 'fund' ? 'ウォレットから送金しました。' : '完了しました。' };
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

    // ---------------------------------------------------- network picker
    function paintPicker() {
        const cur = netId(), c = chain(), s = c ? c.state : 'off';
        const key = cur + s + busy;
        if (key === pickKey) return;
        pickKey = key;
        clear(picker).append(...NETWORK_IDS.map(id => {
            const n = NETWORKS[id];
            return h('button', {
                type: 'button', class: 'net-card' + (id === cur ? ' is-on' : ''), 'aria-pressed': String(id === cur), disabled: !!busy,
                onclick: () => {
                    if (id === cur) return;
                    if (c && ['live', 'setting-up', 'loading'].includes(s)
                        && !confirm(`いまの ${NET().name} の記録を止めて、${n.name} に切り替えますか？（${NET().name} の鍵と台帳はこの端末に残ります）`)) return;
                    ctx.setChainNetwork(id); note = null; loadError = ''; ledgerFirst = true; drawn.clear();
                    bound = null; bind(); paint(true);
                }
            },
            h('b', null, n.name), h('span', { class: 'net-kind' }, n.kind === 'devnet' ? 'devnet' : 'testnet'),
            h('small', null, COPY[id].model));
        }));
    }

    // ---------------------------------------------------- wizard
    function step(n, title, sub, state, ...body) {
        return h('li', { class: 'wiz-step is-' + state },
            h('span', { class: 'wiz-n', 'aria-hidden': 'true' }, state === 'done' ? '✓' : String(n)),
            h('div', { class: 'wiz-body' }, h('h3', null, title, h('small', null, sub)), ...body));
    }

    function zcashNode() {
        let cur = '';
        try { cur = (ctx.storage || localStorage).getItem(ZCASH_RPC_KEY) || ''; } catch { /* fine */ }
        const input = h('input', { type: 'url', class: 'net-rpc', value: cur, placeholder: 'https://… または http://localhost:18232/', 'aria-label': 'Zcash ノードの JSON-RPC URL' });
        const save = () => {
            const v = input.value.trim();
            try {
                const st = ctx.storage || localStorage;
                if (!v) st.removeItem(ZCASH_RPC_KEY);
                else if (/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/)/.test(v)) st.setItem(ZCASH_RPC_KEY, v);
                else { note = { bad: true, text: 'https:// か、手元のノード（http://localhost…）の URL にしてください。' }; paint(true); return; }
            } catch { /* private mode */ }
            note = { text: v ? 'このノードを使います。もう一度「起動」を押してください。' : 'サイトの中継に戻しました。' };
            paint(true);
        };
        return h('details', { class: 'net-node' }, h('summary', null, 'Zcash ノードの URL（任意） / Zcash node'),
            h('p', { class: 'muted' }, 'ふだんはこのサイトの中継（Netlify）を通して testnet のノードに問い合わせます。自分の Zebra / zcashd（CORS を許可したもの）を使うときは、その JSON-RPC の URL を入れてください。testnet でなければ使いません。'),
            h('div', { class: 'chain-actions' }, input, h('button', { type: 'button', class: 'btn btn-small', onclick: save }, '保存')));
    }

    function fundBlock(c, n, cp) {
        const s = c.state;
        const sym = n.currency.symbol;
        const faucets = n.faucets.map(f => ext(f.url, f.label + ' ↗', 'btn'));
        const addrRow = h('div', { class: 'chain-addr' }, h('span', { class: 'lbl' }, '財務庫アドレス'), h('code', null, c.treasury || '—'),
            c.treasury ? h('button', { type: 'button', class: 'btn btn-small', onclick: e => copy(c.treasury, e.currentTarget) }, 'コピー') : null);
        const need = c.setupNeed;
        const lead = h('p', null, '財務庫の残高 ', h('b', { class: 'chain-sol' }, amount(c.balance)), ` ${sym}（${n.name}） ／ `,
            n.family === 'zcash' ? `記録を始めるには ${amount(need)} ${sym} 以上が要ります。`
                : n.family === 'evm' ? `開設には約 ${amount(need)} ${sym} が要ります（いまのガス代からの見積り）。`
                    : '開設には約 0.12 SOL が要ります。');
        const btn = (name, label, fn, primary, disabled) => h('button', {
            type: 'button', class: 'btn' + (primary ? ' btn-primary' : ''), disabled: !!(busy || disabled), onclick: () => run(name, fn)
        }, busy === name ? label.busy : label.text);
        const actions = h('div', { class: 'chain-actions' });
        if (n.airdrop) actions.append(btn('airdrop', { text: '💧 エアドロップ（1 SOL）', busy: '要求中…' }, () => c.requestAirdrop()));
        if (n.family !== 'zcash') actions.append(btn('fund', { text: `👛 ${cp.wallet.split('（')[0]}から ${n.fund.text} ${sym}`, busy: 'ウォレットで承認…' }, () => c.fundFromWallet(n.fund.text), false, !walletPresent(c)));
        actions.append(...faucets);
        if (!n.airdrop) actions.append(btn('check', { text: '🔄 入金を確認', busy: '確認中…' }, async () => { await c.checkFunds(); return null; }));
        const body = [lead, actions];
        if (n.family === 'zcash' && c.fundUri && c.treasury) {
            const uri = c.fundUri(n.fund.text);
            if (uri) body.push(h('div', { class: 'zip321' }, qrBox(uri),
                h('div', null, h('p', { class: 'muted' }, `Zcash testnet ウォレットでこの QR を読み取ると、財務庫に ${n.fund.text} TAZ を送る画面になります。蛇口（faucet）から直接このアドレスに受け取ることもできます。`),
                    h('code', { class: 'zip321-uri' }, uri))));
        }
        if (!walletPresent(c) && n.family !== 'zcash') body.push(h('p', { class: 'chain-hint' }, `${cp.wallet}が見つかりません。`, ext(cp.walletUrl, cp.walletUrl.replace(/^https:\/\/|\/$/g, '')), cp.walletHint));
        body.push(addrRow, h('p', { class: 'muted' }, `${n.name} の ${sym} に価値はありません。` + (n.airdrop ? 'エアドロップが混み合っているときは、上の faucet に上のアドレスを貼ってください。' : '蛇口で受け取ったら「入金を確認」を押してください。')));
        if (c.error && s === 'needs-funds') body.push(h('p', { class: 'chain-note is-bad', role: 'alert' }, clip(c.error, 240)));
        return body;
    }

    function paintWizard() {
        const c = chain(), s = c ? c.state : 'off';
        const n = NET(), cp = copyOf(n.id);
        const need = c ? c.setupNeed : null, bal = c ? c.balance : null;
        const enough = bal != null && need != null && bal >= need;
        const key = JSON.stringify([n.id, s, c && c.error, busy, note, loadError, enough, bal, need, walletPresent(c)]);
        if (key === wizKey) return;
        wizKey = key;

        const noteEl = note ? h('p', { class: 'chain-note' + (note.bad ? ' is-bad' : ''), role: 'status' }, note.text) : null;
        const btn = (name, label, fn, primary, disabled) => h('button', {
            type: 'button', class: 'btn' + (primary ? ' btn-primary' : ''), disabled: !!(busy || disabled),
            onclick: () => run(name, fn)
        }, busy === name ? label.busy : label.text);

        // 1 -- start
        const one = s === 'off' || s === 'error' || !c || s === 'loading'
            ? step(1, '起動', 'Enable', s === 'loading' || busy === 'enable' ? 'busy' : 'active',
                h('p', null, cp.enable),
                n.family === 'zcash' ? zcashNode() : null,
                s === 'error' ? h('p', { class: 'chain-note is-bad', role: 'alert' }, (c && c.error) || loadError || 'エラーが起きました') : null,
                loadError && s !== 'error' ? h('p', { class: 'chain-note is-bad', role: 'alert' }, loadError) : null,
                btn('enable', { text: s === 'error' ? 'もう一度ためす' : `⛓ ${n.name} で起動`, busy: '読み込み中…' }, () => ctx.enableChain(), true),
                noteEl)
            : step(1, '起動', 'Enable', 'done', h('p', { class: 'muted' }, `財務庫キーを用意しました（${n.name}）。`));

        // 2 -- fund
        let two;
        if (s === 'needs-funds') two = step(2, '資金', 'Fund', 'active', ...fundBlock(c, n, cp), noteEl);
        else if (s === 'off' || s === 'error' || s === 'loading') two = step(2, '資金', 'Fund', 'todo', h('p', { class: 'muted' }, `財務庫に ${n.currency.name} を入れます（${n.airdrop ? 'エアドロップ／' : ''}${n.family === 'zcash' ? 'QR' : cp.wallet.split('（')[0]}／蛇口）。`));
        else two = step(2, '資金', 'Fund', 'done', h('p', { class: 'muted' }, `財務庫 ${amount(bal)} ${n.currency.symbol}`));

        // 3 -- setup
        let three;
        if (!n.token) {
            three = step(3, '開設', 'Setup', s === 'live' ? 'done' : 'todo', h('p', { class: 'muted' }, s === 'live' ? cp.setupDone : cp.setup));
        } else if (s === 'needs-funds') {
            three = step(3, '開設', 'Setup', enough ? 'active' : 'todo',
                h('p', null, cp.setup),
                btn('setup', { text: enough ? '🏯 万華京を開設する' : '入金したので開設を試す', busy: '開設中…' }, () => c.setup(), enough),
                enough ? h('p', { class: 'muted' }, 'ウォレットや蛇口で入金すると、自動で開設に進みます。')
                    : h('p', { class: 'muted' }, '残高が足りないときは「資金待ち」に戻ります。蛇口で入れた場合は、このボタンで再確認します。'));
        } else if (s === 'setting-up') {
            const setupTxs = (c.txs || []).filter(t => t.kind === 'setup');
            const ok = setupTxs.filter(t => t.status === 'confirmed').length;
            three = step(3, '開設', 'Setup', 'busy',
                h('p', null, `開設中… 確定した開設取引 ${ok} / ${setupTxs.length}`),
                h('div', { class: 'meter chain-setup-bar', role: 'progressbar', 'aria-label': '開設の進み具合' }, h('i', { style: { width: setupTxs.length ? Math.round(ok / setupTxs.length * 100) + '%' : '8%' } })),
                h('p', { class: 'muted' }, 'このページを開いたままにしてください。途中で止まっても、次回の「開設」で続きから再開します。'),
                btn('setup', { text: '再開', busy: '続行中…' }, () => c.setup()));
        } else if (s === 'live') {
            three = step(3, '開設', 'Setup', 'done', h('p', { class: 'muted' }, cp.setupDone));
        } else {
            three = step(3, '開設', 'Setup', 'todo', h('p', { class: 'muted' }, cp.setup));
        }

        const live = s === 'live' ? h('li', { class: 'wiz-step is-live' },
            h('span', { class: 'wiz-n', 'aria-hidden': 'true' }, '⛓'),
            h('div', { class: 'wiz-body' }, h('h3', null, 'LIVE', h('small', null, '稼働中')),
                h('p', null, n.family === 'zcash'
                    ? `いま住人が商いをするたび、${n.name} に領収書が刻まれます（ブロックごとに1件。まとめて書きます）。地図で金貨が飛ぶのを見てください。`
                    : `いま住人が商いをするたび、${n.name} に取引が刻まれます。地図で金貨が飛ぶのを見てください。`),
                h('a', { class: 'btn btn-primary', href: '#/' }, '地図で見る →'))) : null;

        clear(wizard).append(h('ol', { class: 'wiz-steps' }, one, two, three, live));
    }

    // ---------------------------------------------------- accounts + stats + ledger
    function paintAccounts() {
        const c = chain();
        clear(accounts);
        if (!c || !c.treasury) return;
        const e = E(), n = NET(), cp = copyOf(n.id);
        const row = (label, sub, addr) => h('div', { class: 'acct-row' },
            h('span', { class: 'lbl' }, label, h('small', null, sub)),
            addr ? h('span', { class: 'acct-val' }, h('code', { title: addr }, shortAddr(addr)), ext(e.addr(addr), 'Explorer ↗'),
                h('button', { type: 'button', class: 'btn btn-small', onclick: ev => copy(addr, ev.currentTarget) }, 'コピー')) : h('span', { class: 'muted' }, 'まだありません'));
        accounts.append(plaque({ class: 'chain-card' },
            row('財務庫', 'Treasury', c.treasury),
            cp.token ? row(cp.token, cp.tokenSub, c.contract || c.mint) : null,
            h('div', { class: 'acct-row' }, h('span', { class: 'lbl' }, '財務庫の残高', h('small', null, `${n.currency.symbol} (${n.kind})`)), h('span', { class: 'acct-val' }, h('b', null, amount(c.balance)), ` ${n.currency.symbol}`))));
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
        const key = netId() + txs.slice(0, 60).map(t => t.id + t.status + (t.sig ? 1 : 0) + (t.slot || '')).join('|') + (c ? c.state : '');
        if (key === ledKey) return;
        ledKey = key;
        clear(ledger);
        const e = E(), n = NET(), where = copyOf(n.id).where;
        if (!txs.length) {
            ledger.append(h('li', { class: 'ledger-empty' }, c && c.state === 'live'
                ? 'まだ取引がありません。住人が商いを始めると、ここに流れます。'
                : `SIM — チェーンは動いていません。ここに表示されるのは、${n.name} が実際に返した取引だけです。`));
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
                h('span', { class: 'ledger-sum' }, summarize(W, tx, n.id), tx.status === 'failed' && tx.error ? h('em', null, ' — ' + clip(tx.error, 80)) : null),
                h('span', { class: 'ledger-slot' }, tx.slot != null ? `${where} ${fmt(tx.slot)}` : ''),
                tx.sig ? ext(e.tx(tx.sig), '⛓ ' + tx.sig.replace(/^0x/, '').slice(0, 6) + '… ↗', 'ledger-link') : h('span', { class: 'ledger-link muted' }, '署名待ち')));
        }
        if (ledgerFirst) ledger.querySelectorAll('.is-new').forEach(x => x.classList.remove('is-new'));   // the first paint is not news
        ledgerFirst = false;
        for (const tx of shown) drawn.add(tx.id);
    }

    function paintControl() {
        const c = chain(), n = NET();
        clear(control);
        if (!c || c.state === 'off') return;
        control.append(h('details', { class: 'chain-danger' }, h('summary', null, '停止・初期化 / Stop & reset'),
            h('p', { class: 'muted' }, `停止すると取引の記録を止めます（キーは残ります）。初期化はこの端末の ${n.name} 用の使い捨てキーを忘れます。${n.name} のアカウントは消えません。`),
            h('div', { class: 'chain-actions' },
                h('button', { type: 'button', class: 'btn', onclick: () => { ctx.disableChain(); paint(true); } }, '⏹ オンチェーンを止める'),
                h('button', { type: 'button', class: 'btn btn-danger', onclick: () => {
                    if (!confirm(`この端末の ${n.name} 用のキー（財務庫・住人・市）を忘れます。テストネットの使い捨てキーですが、元に戻せません。続けますか？`)) return;
                    ctx.resetChain(); paint(true);
                } }, '🗑 キーを初期化'))));
    }

    function paint(force) {
        if (!alive) return;
        const c = chain(), s = c ? c.state : 'off';
        modeBadge.textContent = s === 'off' ? 'SIM' : stateLabel(c);
        modeBadge.className = 'chain-badge ' + (s === 'live' ? 'is-live' : s === 'error' ? 'is-error' : '');
        if (force) { wizKey = ''; pickKey = ''; }
        paintPicker(); paintWizard(); paintAccounts(); paintStats(); paintLedger();
        const ck = netId() + (c ? c.state : 'off');
        if (control.dataset.k !== ck || force) { control.dataset.k = ck; paintControl(); }
        ledgerSec.hidden = false;
    }

    // ---------------------------------------------------- page
    const honesty = plaque({ class: 'chain-honesty' },
        h('h2', null, '正直のきまり ', h('small', null, 'Honesty')),
        h('ul', null,
            h('li', null, h('b', null, 'テストネットだけ。'), ' Solana devnet・Robinhood Chain Testnet・Arc Testnet・Zcash testnet の、価値のない通貨だけが動きます。メインネットへの道は、コードにありません（EVM は RPC とウォレットの chain id を、Zcash はノードが testnet かを毎回確かめます）。'),
            h('li', null, h('b', null, '使い捨てのキー。'), ' 財務庫・住人・市のキーはこの端末の localStorage にあるテスト用で、ここに価値のあるものは置かないでください。あなたのウォレットは、そのウォレット自身の承認画面でしか触れません。'),
            h('li', null, h('b', null, '署名は偽造しません。'), ' 署名・ハッシュ・ブロック・残高は、すべて RPC が返したものだけ。確定前は「待機」、失敗は「失敗」と出します。'),
            h('li', null, h('b', null, '止まっているときは SIM。'), ' チェーンが動いていないときは、地図もフィードも今までどおりのシミュレーションで、チェーンの数字は出しません。'),
            h('li', null, h('b', null, 'シムが正本。'), ' オンチェーンは領収書の層です。ただ一つ、確認できた x402 の支払いだけが、住人へのお願いを一件、シムに入れます。'),
            h('li', null, h('b', null, 'Zcash は領収書だけ。'), ' Zcash にはまだトークンの仕組みが無いので、光金はシムの中のまま、鎖には OP_RETURN のメモだけを書きます。透明アドレスはメモを運べないため、雇うときの支払いは金額の端数（1〜999 zat）で依頼を見分けます。')));

    const el = h('div', { class: 'page chain-page' },
        h('header', { class: 'page-head chain-hero' },
            h('p', { class: 'kicker' }, 'Test networks only — 価値のある通貨は動きません'),
            h('h1', null, '⛓ 万華京オンチェーン', h('small', null, 'Agents on Solana devnet · Robinhood Chain · Arc · Zcash testnets')),
            h('p', { class: 'lead' }, '住人たちの仕入れ・細工・売りは、いつもシミュレーションの中で起きています。ここでネットワークを選んでスイッチを入れると、その一つ一つがテストネットの本物の取引になり、地図の上を金貨になって飛びます。', modeBadge)),
        h('div', { class: 'page-body' },
            h('section', { class: 'sec' }, sectionHead('ネットワーク', 'Network — 鍵と台帳はネットワークごとに別々', 'ch-net'), picker),
            h('section', { class: 'sec' }, sectionHead('はじめかた', '起動 → 資金 → 開設', 'ch-wiz'), wizard),
            h('section', { class: 'sec' }, sectionHead('アカウント', 'Treasury & KOGANE', 'ch-acct'), accounts),
            h('section', { class: 'sec' }, sectionHead('いまの数字', 'Live stats — RPC が確定させた分だけ', 'ch-stat'), stats),
            ledgerSec,
            honesty,
            control));
    ledgerSec.append(sectionHead('台帳', 'Ledger — 新しい順 / newest first', 'ch-led'), ledger);

    let bound = null;
    function subscribe() {
        const c = chain();
        if (!c || typeof c.on !== 'function') return;
        let timer = 0;
        const later = () => { if (timer) return; timer = setTimeout(() => { timer = 0; if (alive) paint(); }, 150); };
        for (const type of ['tx', 'state']) { const u = c.on(type, later); if (typeof u === 'function') unsub.push(u); }
    }
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
    const { stories } = ctx;
    let alive = true, hire = null, open = false, bal = { v: undefined, at: 0, busy: false };
    let requestId = '', waiting = null;
    const newRequestId = () => (requestId = `${a.id}-${Date.now().toString(36)}`);
    const body = h('div', { class: 'ach-body' });
    const el = h('section', { class: 'agent-chain', 'aria-label': 'オンチェーン' });
    el.append(body);
    const unsub = [];
    let bound = null, lastKey = '';

    const chain = () => ctx.chain;
    const E = () => explorers(ctx);
    const NET = () => networkOf(chain() && chain().network ? chain().network.id : ctx.chainNet);

    function phases() {
        const n = NET();
        const sign = n.family === 'zcash' ? '支払い待ち' : n.family === 'evm' ? '署名 ウォレット' : '署名 Phantom';
        return [['quote', '見積り 402'], ['signing', sign], ['confirming', '確認中'], ['verified', '検証 ✓']];
    }
    function phaseDots() {
        const P = phases();
        const cur = hire ? (hire.phase === 'failed' ? hire.failedAt || 'signing' : hire.phase) : 'quote';
        const idx = P.findIndex(p => p[0] === cur);
        return h('ol', { class: 'hire-phases' }, P.map(([k, label], i) =>
            h('li', { class: (i < idx || (hire && hire.phase === 'verified') ? 'is-done ' : '') + (i === idx ? (hire && hire.phase === 'failed' ? 'is-bad' : hire && hire.phase === 'verified' ? 'is-done' : 'is-now') : '') }, label)));
    }

    async function pay() {
        const c = chain();
        hire = { phase: 'signing' }; lastKey = ''; paint();
        const request = { id: requestId || newRequestId(), type: 'observe', district: a.home, title: stories ? stories.profile(a.id).task : '現地記録' };
        const q = c.quote ? c.quote(a.id, request.id) : null;
        waiting = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let res;
        try { res = await c.hire(a.id, { amount: q ? q.amount : undefined, request, signal: waiting ? waiting.signal : undefined }); }
        catch (err) { res = { ok: false, reason: String(err && err.message || err) }; }
        waiting = null;
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
        const n = NET();
        const q = c.quote ? c.quote(a.id, requestId || 'request-id') : null;
        const addr = c.addressOf(a.id);
        const pre = h('pre', null,
            h('b', null, 'HTTP/1.1 402 Payment Required'), '\n',
            `x-payment-network: ${n.id}${n.chainId ? ` (chain id ${n.chainId})` : ''}\n`,
            'payTo:   ', addr || '—', '\n',
            'amount:  ', q ? q.amountText : '—', q ? `  (${q.amount} ${n.currency.unit})` : '', '\n',
            n.family === 'zcash' ? `tag:     +${q ? q.tag : '?'} zat（この依頼の目印）` : `memo:    zipangu:x402:${requestId || '<request-id>'}`);
        const card = h('div', { class: 'quote402', role: 'group', 'aria-label': 'HTTP 402 支払い見積り' }, pre);
        if (n.family === 'zcash' && q && q.uri) {
            card.append(h('div', { class: 'zip321' }, qrBox(q.uri),
                h('div', null,
                    h('p', { class: 'muted' }, `Zcash testnet ウォレットでこの QR を読み取り、ぴったり ${q.amountText} を送ってください。透明アドレスはメモを運べないので、端数の ${q.tag} zat がこの依頼の目印です。ブロックに入るのを確かめてから、お願いを一件、シムに入れます。`),
                    h('code', { class: 'zip321-uri' }, q.uri), ' ',
                    h('button', { type: 'button', class: 'btn btn-small', onclick: ev => copy(q.uri, ev.currentTarget) }, 'コピー'))));
        } else {
            card.append(h('p', { class: 'muted' }, `${agentShort(a)} への支払いを ${n.name} で確認できたら、現地記録のお願いを一件、シムに入れます。メモにはこの依頼の ID を刻みます。`));
        }
        return card;
    }

    function hireBlock(c) {
        const n = NET(), cp = copyOf(n.id);
        const inflight = hire && (hire.phase === 'signing' || hire.phase === 'confirming');
        const wrap = h('div', { class: 'ach-hire' });
        const btn = h('button', { type: 'button', class: 'btn btn-primary', disabled: !!inflight, 'aria-expanded': String(open), onclick: () => { open = !open; if (open && !requestId) newRequestId(); if (!open && hire && !inflight) hire = null; lastKey = ''; paint(); } },
            `雇う (x402) ・ ${n.hire.text} ${n.currency.symbol}`);
        wrap.append(btn);
        if (!open && !hire) return wrap;
        wrap.append(quoteCard(c), phaseDots());
        const has = walletPresent(c);
        if (!has) {
            wrap.append(h('p', { class: 'chain-note is-bad', role: 'alert' }, `${cp.wallet}が見つかりません。`, ext(cp.walletUrl, cp.walletUrl.replace(/^https:\/\/|\/$/g, '')), cp.walletHint || ' を入れてから、もう一度ためしてください。'));
        } else if (!hire || hire.phase === 'failed') {
            wrap.append(h('p', { class: 'muted' }, n.family === 'solana' ? 'Phantom が Devnet になっているか確かめてください（本物の SOL は動きません）。'
                : n.family === 'evm' ? `ウォレットに ${n.name} への切り替えを頼みます（本物の ${n.currency.symbol} は動きません）。`
                    : '支払ったら、下のボタンで確認を始めてください（ブロックに入るまで待ちます。本物の ZEC は動きません）。'));
        }
        if (!hire || hire.phase === 'failed') {
            const label = n.family === 'zcash' ? (hire ? 'もう一度、支払いを待つ' : '🔍 支払ったので確認を始める')
                : n.family === 'evm' ? (hire ? 'もう一度ウォレットで支払う' : `💳 ウォレットで ${n.hire.text} ${n.currency.symbol} を支払って雇う`)
                    : (hire ? 'もう一度 Phantom で支払う' : '💳 Phantom で 0.01 SOL を支払って雇う');
            wrap.append(h('button', { type: 'button', class: 'btn btn-primary', disabled: !has, onclick: pay }, label));
        }
        if (hire && hire.phase === 'signing') wrap.append(h('p', { class: 'chain-note', role: 'status' }, n.family === 'zcash'
            ? `支払いを待っています…（${n.name} のブロックに入ると確定します。最長20分）`
            : 'ウォレットの画面で承認してください…（署名・送信・確認を待っています）'));
        if (hire && hire.phase === 'signing' && waiting) wrap.append(h('button', { type: 'button', class: 'btn btn-small', onclick: () => { if (waiting) waiting.abort(); } }, '待つのをやめる'));
        if (hire && hire.phase === 'confirming') wrap.append(h('p', { class: 'chain-note', role: 'status' }, 'ブロックでの確認を待っています…'));
        if (hire && hire.phase === 'failed') wrap.append(h('p', { class: 'chain-note is-bad', role: 'alert' }, '支払いは検証できませんでした：' + hire.reason + ' ／ お願いは入れていません。'));
        if (hire && hire.phase === 'verified') {
            wrap.append(h('p', { class: 'chain-note is-ok', role: 'status' }, '検証 ✓ ', hire.sig ? ext(E().tx(hire.sig), '⛓ ' + hire.sig.replace(/^0x/, '').slice(0, 8) + '… ↗') : null),
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
        const n = NET();
        const addr = live ? c.addressOf(a.id) : null;
        const key = JSON.stringify([n.id, live, addr, bal.v, open, requestId, hire && [hire.phase, hire.sig, hire.reason, hire.story && hire.story.ok], walletPresent(c), c && c.state, !!waiting]);
        if (key === lastKey) return;
        lastKey = key;
        clear(body);
        body.append(h('h2', null, '⛓ オンチェーン ', h('small', null, n.name)));
        if (!live) {
            body.append(h('p', { class: 'muted' }, h('span', { class: 'chain-badge' }, c && c.state && c.state !== 'off' ? stateLabel(c) : 'SIM'),
                ' オンチェーンは動いていません。この住人の財布はシミュレーションの数字です。 ', h('a', { href: '#/chain' }, '起動する →')));
            return;
        }
        const e = E();
        const sym = c.balanceSymbol || 'KOGANE';
        body.append(
            h('div', { class: 'acct-row' }, h('span', { class: 'lbl' }, 'アドレス'),
                addr ? h('span', { class: 'acct-val' }, h('code', { title: addr }, shortAddr(addr)), ext(e.addr(addr), 'Explorer ↗'),
                    h('button', { type: 'button', class: 'btn btn-small', onclick: ev => copy(addr, ev.currentTarget) }, 'コピー'))
                    : h('span', { class: 'muted' }, 'この住人の口座はまだありません')),
            h('div', { class: 'acct-row' }, h('span', { class: 'lbl' }, 'オンチェーン残高', h('small', null, 'RPC · 10秒ごと')),
                h('span', { class: 'acct-val' }, bal.v === undefined ? '読み込み中…' : bal.v === null ? '取得できませんでした'
                    : h('b', null, bal.v.toLocaleString('ja-JP', { maximumFractionDigits: sym === 'TAZ' ? 8 : 2 }) + ' ' + sym))));
        if (addr) body.append(hireBlock(c));
    }

    function bind() {
        const c = chain();
        if (!c || bound === c || typeof c.on !== 'function') return;
        bound = c;
        const u1 = c.on('hire', ev => {
            if (!hire || hire.phase === 'verified' || hire.phase === 'failed') return;
            const p = String((ev && (ev.phase || ev.status)) || '');
            if (/confirm|sent|submit/i.test(p)) { hire.phase = 'confirming'; hire.seen = 'confirming'; lastKey = ''; paint(); }
        });
        if (typeof u1 === 'function') unsub.push(u1);
        const u2 = c.on('state', () => { lastKey = ''; paint(); });
        if (typeof u2 === 'function') unsub.push(u2);
    }

    bind(); paint(); refreshBalance();
    return {
        el,
        update() { bind(); refreshBalance(); paint(); },
        destroy() { alive = false; if (waiting) waiting.abort(); for (const u of unsub) { try { u(); } catch { /* fine */ } } }
    };
}

