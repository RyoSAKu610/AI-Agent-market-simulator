// 万華京オンチェーン on the EVM test networks: Robinhood Chain Testnet (ETH) and Arc Testnet
// (USDC). docs/ONCHAIN.md is the contract; the interface is the same as js/chain.js.
// No DOM, no rendering, no top-level I/O: importing this file does nothing. ethers is loaded
// lazily inside enable().
//
// Model. A throwaway treasury key pays every fee and deploys KOGANE (contracts/Kogane.sol, an
// ERC-20 whose deployer is the operator, as the treasury is every token account's delegate on
// Solana devnet). Each resident and each market has a throwaway address. A batch of trades is one
// `batch()` call that moves KOGANE between them and emits the memo. Settlements and birth
// certificates are 0-value transactions from the treasury to itself whose calldata is the memo
// in UTF-8. A hire is paid from the visitor's own wallet (EIP-1193) in the network's coin, with
// the memo as calldata, and is checked through our own RPC before the sim hears of it.
//
// Honesty: every hash, block and balance shown came from the RPC; the RPC and the wallet must
// both report the test network's chain id, or nothing is sent.

import {
    toBaseUnits, fromUnits, opsFromTrade, encodeMemo, createBatcher, byteLen, clean, hireMemo,
    storeOf, emitter, txLog, statsOf, sleep, errText, importFirst, TX_CAP
} from './chain-core.js';
import { networkOf, addChainParams, formatUnits, parseUnits } from './networks.js';
import { readEvm } from './chain-read.js';
import { KOGANE_ABI, KOGANE_BYTECODE } from './kogane.js';

const SDK = ['https://esm.sh/ethers@6.17.0', 'https://cdn.jsdelivr.net/npm/ethers@6.17.0/+esm'];
const VAULT_LIQUIDITY = 1_000_000;        // KOGANE each market starts with
const TOPUP_HEADROOM = 10_000;            // base units (100.00 KOGANE) added on top of a shortfall
const MINT_GROUP = 25;                    // owners per setup mint
const SETUP_GAS = 3_000_000n;             // deploy (~0.9M) + two mint batches (~0.7M each), with room
const RESERVE_GAS = 1_500_000n;           // below this much gas money, stop writing receipts
const MEMO_GAS = 60_000n;                 // a memo-only transaction, with room
const WAIT_MS = 120_000;
const HIRE_WAIT_MS = 180_000;

// ------------------------------------------------------------------ pure helpers

const enc = new TextEncoder();
export const memoHex = text => '0x' + Array.from(enc.encode(text), b => b.toString(16).padStart(2, '0')).join('');
const lower = a => String(a || '').toLowerCase();

// Plans one batch of trades against the local balance mirror (base units): the moves, plus a
// labelled top-up mint for any source that would run short. addrOf maps an agent or place id to
// its address. delta is what the mirror becomes if the batch confirms.
export function planTrades(ops, addrOf, mirror) {
    const delta = new Map();
    const bal = a => (mirror.has(a) ? mirror.get(a) + (delta.get(a) || 0) : null);
    const topups = new Map();
    const from = [], to = [], amount = [];
    for (const o of ops) {
        const units = toBaseUnits(o.amount);
        const src = addrOf(o.action === 'sell' ? o.place : o.agent), dst = addrOf(o.action === 'sell' ? o.agent : o.place);
        const have = bal(src);
        if (have != null && have < units) {
            const need = units - have + TOPUP_HEADROOM;
            const t = topups.get(src) || { label: (o.action === 'sell' ? 'p:' + o.place : 'a:' + o.agent), units: 0 };
            t.units += need; topups.set(src, t);
            delta.set(src, (delta.get(src) || 0) + need);
        }
        delta.set(src, (delta.get(src) || 0) - units);
        delta.set(dst, (delta.get(dst) || 0) + units);
        from.push(src); to.push(dst); amount.push(BigInt(units));
    }
    return {
        mintTo: [...topups.keys()], mintAmount: [...topups.values()].map(t => BigInt(t.units)), from, to, amount, delta,
        topLabel: [...topups.values()].map(t => `${t.label}:${fromUnits(t.units)}`).join(',')
    };
}

// Did this transaction pay exactly the quote, on this chain, from this payer, with this memo?
// tx and receipt as ethers or the raw JSON-RPC return them. Pure so it can be unit-tested.
export function verifyEvmPayment(tx, receipt, quote, payer, chainId) {
    if (!tx) return { ok: false, reason: 'トランザクションが見つかりません / transaction not found' };
    if (!receipt) return { ok: false, reason: 'まだ確定していません / not confirmed yet' };
    const st = receipt.status;
    if (!(st === 1 || st === '0x1' || st === 1n)) return { ok: false, reason: 'トランザクションが失敗しています / transaction failed on-chain' };
    if (tx.chainId != null && Number(tx.chainId) !== chainId) return { ok: false, reason: 'ネットワークが違います / wrong chain' };
    if (lower(tx.to) !== lower(quote.payTo)) return { ok: false, reason: '宛先が一致しません / recipient mismatch' };
    let value;
    try { value = BigInt(tx.value); } catch { value = -1n; }
    if (value !== BigInt(quote.amount)) return { ok: false, reason: '金額が一致しません / amount mismatch' };
    if (lower(tx.input ?? tx.data) !== lower(memoHex(quote.memo))) return { ok: false, reason: 'メモが一致しません / memo mismatch' };
    if (payer && lower(tx.from) !== lower(payer)) return { ok: false, reason: '支払い元が一致しません / payer mismatch' };
    return { ok: true };
}

const unwrap = m => (m && m.Wallet ? m : (m && (m.ethers || m.default)) || m);
async function defaultLoadLib() { return unwrap(await importFirst(SDK)); }
const randomKey = () => {
    const b = new Uint8Array(32);
    globalThis.crypto.getRandomValues(b);
    return '0x' + Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
};
// Submissions from one key go one at a time, so two never take the same nonce.
function serial() {
    let tail = Promise.resolve();
    return fn => { const run = tail.then(fn, fn); tail = run.catch(() => {}); return run; };
}

// The visitor's EVM wallet: an EIP-6963 announcement (MetaMask preferred) or window.ethereum.
const announced = [];
let listening = false;
function listenForWallets() {
    if (listening || typeof window === 'undefined' || !window.addEventListener) return;
    listening = true;
    window.addEventListener('eip6963:announceProvider', e => { if (e && e.detail && e.detail.provider) announced.push(e.detail); });
    try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch { /* old browser */ }
}
export function injectedWallet() {
    if (typeof window === 'undefined') return null;
    const mm = announced.find(d => d.info && d.info.rdns === 'io.metamask');
    return (mm && mm.provider) || window.ethereum || (announced[0] && announced[0].provider) || null;
}

// ------------------------------------------------------------------ engine

export function createChain(W, eco, { network = 'robinhood-testnet', storage, rpc, loadLib = defaultLoadLib, wallet } = {}) {
    const NET = networkOf(network);
    if (NET.family !== 'evm') throw new Error(`${network} is not an EVM network`);
    const S = storeOf(storage, NET.storageKey);
    const { emit, on } = emitter();
    const log = txLog({ emit, changed: () => persist() });
    const lane = serial();
    const walletOf = () => wallet || injectedWallet();

    let state = 'off', error = null;
    let E = null, provider = null, treasury = null, kogane = null;
    const keys = new Map(), addr = new Map();        // id → private key / address (agents and places)
    let contractAddr = null, setupDone = false;
    let minted = new Set();
    let balanceWei = null, feeWei = null;
    let since = Date.now();
    const mirror = new Map();                        // address → KOGANE base units (from setup and confirmed batches)
    const batcher = createBatcher({ maxOps: NET.maxOps, cap: 60 });
    const settleQ = [];
    let inFlight = false, timer = null, unsubs = [], setupPromise = null, persistTimer = null, enabling = null, sentSinceBalance = 0;

    const setState = (s, err = null) => { state = s; error = err; emit('state', s); };
    const ids = { agents: () => W.agents.map(a => a.id), places: () => [...W.eras, ...W.realms].map(p => p.id) };
    const owners = () => [...ids.agents(), ...ids.places()];
    const units = (wei, digits = 6) => (wei == null ? null : Number(formatUnits(wei, NET.currency.decimals)).toFixed(digits) * 1);

    // -------- persistence
    function persist() {
        if (persistTimer) return;
        persistTimer = setTimeout(() => { persistTimer = null; persistNow(); }, 400);
        if (persistTimer.unref) persistTimer.unref();
    }
    function persistNow() {
        if (!treasury) return;
        const pick = list => Object.fromEntries(list.filter(id => keys.has(id)).map(id => [id, keys.get(id)]));
        S.write(JSON.stringify({
            v: 1, net: NET.id, chainId: NET.chainId, since, treasury: treasury.privateKey,
            agents: pick(ids.agents()), places: pick(ids.places()), contract: contractAddr, setupDone, minted: [...minted],
            txs: log.list.slice(0, TX_CAP)
        }));
    }
    function loadKeys() {
        let saved = null;
        try { saved = JSON.parse(S.read() || 'null'); } catch { saved = null; }
        const ok = saved && saved.v === 1 && saved.net === NET.id && saved.chainId === NET.chainId && /^0x[0-9a-f]{64}$/i.test(saved.treasury || '');
        keys.clear(); addr.clear(); minted = new Set();
        if (ok) {
            treasury = new E.Wallet(saved.treasury, provider);
            for (const id of ids.agents()) if (saved.agents && /^0x[0-9a-f]{64}$/i.test(saved.agents[id] || '')) keys.set(id, saved.agents[id]);
            for (const id of ids.places()) if (saved.places && /^0x[0-9a-f]{64}$/i.test(saved.places[id] || '')) keys.set(id, saved.places[id]);
            contractAddr = typeof saved.contract === 'string' && /^0x[0-9a-f]{40}$/i.test(saved.contract) ? saved.contract : null;
            setupDone = !!saved.setupDone && !!contractAddr;
            minted = new Set(Array.isArray(saved.minted) ? saved.minted : []);
            since = saved.since || Date.now();
            log.load(saved.txs);
        } else {
            treasury = new E.Wallet(randomKey(), provider);
            contractAddr = null; setupDone = false; since = Date.now(); log.load([]);
        }
        for (const id of owners()) if (!keys.has(id)) { keys.set(id, randomKey()); minted.delete(id); setupDone = false; }
        for (const [id, k] of keys) addr.set(id, E.computeAddress(k));
        addr.set('treasury', treasury.address);
        kogane = contractAddr ? new E.Contract(contractAddr, KOGANE_ABI, treasury) : null;
        persistNow();
    }

    // -------- RPC: the first URL that answers with this network's chain id
    async function connect() {
        const urls = rpc ? [rpc] : NET.rpc;
        let last = null;
        for (const url of urls) {
            try {
                const net = new E.Network(NET.name, NET.chainId);
                // no JSON-RPC batches (not every public RPC takes them), no 250 ms answer cache (a balance read
                // right after a payment must see it)
                const p = new E.JsonRpcProvider(url, net, { staticNetwork: net, batchMaxCount: 1, cacheTimeout: -1 });
                const id = Number(await p.send('eth_chainId', []));
                if (id !== NET.chainId) { last = new Error(`${url} は chain id ${id} です（${NET.name} は ${NET.chainId}） / wrong chain`); continue; }
                return p;
            } catch (e) { last = e; }
        }
        throw new Error(`${NET.name} の RPC に接続できません / cannot reach the RPC: ${errText(last)}`);
    }
    async function refreshBalance() {
        try { balanceWei = await provider.getBalance(treasury.address); } catch { /* keep the last one */ }
        try { const f = await provider.getFeeData(); feeWei = f.maxFeePerGas ?? f.gasPrice ?? feeWei; } catch { /* keep */ }
        return balanceWei;
    }
    const setupNeedWei = () => (feeWei == null ? null : feeWei * SETUP_GAS);
    const reserveWei = () => (feeWei == null ? 0n : feeWei * RESERVE_GAS);

    // -------- sending from the treasury. Hash from the RPC, block from the receipt; nothing invented.
    async function send(rec, req) {
        try {
            const resp = await lane(() => treasury.sendTransaction(req));
            log.touch(rec, { status: 'sent', sig: resp.hash, error: null });
            const receipt = await resp.wait(1, WAIT_MS);
            if (!receipt || receipt.status !== 1) { log.touch(rec, { status: 'failed', error: 'reverted' }); return null; }
            log.touch(rec, { status: 'confirmed', slot: receipt.blockNumber ?? null, error: null });
            return receipt;
        } catch (e) {
            log.touch(rec, { status: 'failed', error: errText(e) });
            return null;
        }
    }
    const selfMemo = memo => ({ to: treasury.address, value: 0n, data: memoHex(memo) });

    // -------- setup: deploy KOGANE, then mint each owner its starting balance (idempotent, resumable)
    function setup() {
        if (setupPromise) return setupPromise;
        setupPromise = (async () => {
            if (!E || !provider) throw new Error('enable() first');
            if (state === 'live' && setupDone) return;
            setState('setting-up');
            try {
                await refreshBalance();
                const list = owners();
                const total = 1 + Math.ceil(list.length / MINT_GROUP);
                if (contractAddr && (await provider.getCode(contractAddr)) === '0x') { contractAddr = null; kogane = null; minted.clear(); }
                if (!contractAddr) {
                    const rec = log.add('setup', [], `zipangu:setup|deploy|1/${total}`);
                    const receipt = await send(rec, { data: KOGANE_BYTECODE });
                    if (!receipt || !receipt.contractAddress) throw new Error(rec.error || 'deploy failed');
                    contractAddr = receipt.contractAddress;
                    kogane = new E.Contract(contractAddr, KOGANE_ABI, treasury);
                    minted.clear(); persistNow();
                }
                // resume: whoever already holds KOGANE was minted
                for (const id of list) if (!minted.has(id)) {
                    const b = await kogane.balanceOf(addr.get(id)).catch(() => 0n);
                    if (b > 0n) { minted.add(id); mirror.set(addr.get(id), Number(b)); }
                }
                const todo = list.filter(id => !minted.has(id));
                const agentSet = new Set(ids.agents());
                for (let i = 0; i < todo.length; i += MINT_GROUP) {
                    const group = todo.slice(i, i + MINT_GROUP);
                    // agents start with their sim wallet, markets with the vault liquidity (at least 0.01, so a resume can see it)
                    const amounts = group.map(id => BigInt(toBaseUnits(agentSet.has(id) ? eco.agents.get(id)?.wallet ?? 0 : VAULT_LIQUIDITY) || 1));
                    const memo = `zipangu:setup|mint|${1 + Math.ceil((list.length - todo.length + i + group.length) / MINT_GROUP)}/${total}`;
                    const rec = log.add('setup', [], memo);
                    const data = kogane.interface.encodeFunctionData('batch', [group.map(id => addr.get(id)), amounts, [], [], [], memo]);
                    if (!(await send(rec, { to: contractAddr, data }))) throw new Error(rec.error || 'mint failed');
                    group.forEach((id, k) => { minted.add(id); mirror.set(addr.get(id), Number(amounts[k])); });
                    persistNow();
                }
                setupDone = true; persistNow();
                await refreshBalance();
                goLive();
            } catch (e) {
                setState(isFunds(e) ? 'needs-funds' : 'error', errText(e));
            } finally { setupPromise = null; }
        })();
        return setupPromise;
    }
    const isFunds = e => /insufficient funds|INSUFFICIENT_FUNDS|exceeds balance|gas required exceeds/i.test(errText(e) + ' ' + (e && e.code));

    // -------- live
    function goLive() {
        setState('live');
        unsubs.forEach(u => u()); unsubs = [];
        if (eco && eco.on) {
            unsubs.push(eco.on('trade', ev => { const op = opsFromTrade(W, ev); if (op && addr.has(op.agent) && addr.has(op.place)) batcher.push(op); }));
            unsubs.push(eco.on('settle', ev => { if (settleQ.length < 10) settleQ.push(ev); }));
        }
        if (timer) clearInterval(timer);
        timer = setInterval(() => { flush(); }, NET.flushMs);
        if (timer.unref) timer.unref();
        loadMirror().catch(() => {});
        recheckSent().catch(() => {});
    }
    async function loadMirror() {
        if (!kogane) return;
        const list = owners();
        for (let i = 0; i < list.length; i += 10) {
            const part = list.slice(i, i + 10);
            const bs = await Promise.all(part.map(id => kogane.balanceOf(addr.get(id)).catch(() => null)));
            part.forEach((id, k) => { if (bs[k] != null) mirror.set(addr.get(id), Number(bs[k])); });
        }
    }
    async function recheckSent() {
        for (const t of log.list.filter(x => x.status === 'sent' && x.sig).slice(0, 20)) {
            const [tx, receipt] = await Promise.all([provider.getTransaction(t.sig).catch(() => null), provider.getTransactionReceipt(t.sig).catch(() => null)]);
            if (receipt) log.touch(t, receipt.status === 1 ? { status: 'confirmed', slot: receipt.blockNumber ?? null } : { status: 'failed', error: 'reverted' });
            else if (!tx) log.touch(t, { status: 'failed', error: '確認できませんでした / not found after reload' });
        }
    }

    async function flush() {
        if (state !== 'live' || inFlight) return;
        if (!settleQ.length && !batcher.size) return;
        inFlight = true;
        try {
            if (++sentSinceBalance >= 3 || balanceWei == null) { sentSinceBalance = 0; await refreshBalance(); emit('state', state); }
            if (balanceWei != null && balanceWei < reserveWei()) {
                // out of gas money: keep the queue, say so, wait for funds (afterFunding resumes)
                if (timer) { clearInterval(timer); timer = null; }
                setState('needs-funds', `${NET.currency.symbol} が残り少ないので、記録を止めました / paused: low ${NET.currency.symbol}`);
                return;
            }
            if (settleQ.length) {
                const ev = settleQ.shift();
                const memo = encodeMemo('settle', [], { day: ev.day, label: ev.label, kind: ev.kind, sales: ev.sales, volume: Math.round(ev.volume), top: ev.top, profit: Math.round(ev.topProfit || 0) }, NET.memoBytes);
                await send(log.add('settle', [], memo), selfMemo(memo));
            } else {
                const ops = batcher.take();
                const plan = planTrades(ops, id => addr.get(id), mirror);
                const memo = encodeMemo('trade', ops, plan.topLabel ? { topup: plan.topLabel } : {}, NET.memoBytes);
                const rec = log.add('trade', ops, memo);
                const data = kogane.interface.encodeFunctionData('batch', [plan.mintTo, plan.mintAmount, plan.from, plan.to, plan.amount, memo]);
                const receipt = await send(rec, { to: contractAddr, data });
                if (receipt) { for (const [a, d] of plan.delta) if (mirror.has(a)) mirror.set(a, Math.max(0, mirror.get(a) + d)); }
                else loadMirror().catch(() => {});          // a batch that may land later: trust the chain, not the mirror
            }
        } catch { /* send() already recorded failures */ } finally { inFlight = false; }
    }

    // -------- public engine
    async function enable() {
        if (enabling) return enabling;
        if (state === 'live' || state === 'setting-up' || state === 'needs-funds') return chain;
        enabling = (async () => {
            setState('loading');
            try {
                if (!E) E = unwrap(await loadLib());
                listenForWallets();
                if (!provider) provider = await connect();
                loadKeys();
                await refreshBalance();
                if (balanceWei == null) throw new Error(`${NET.name} の RPC に接続できません / cannot reach the RPC`);
                if (setupDone && (await provider.getCode(contractAddr).catch(() => '0x')) === '0x') { setupDone = false; contractAddr = null; kogane = null; minted.clear(); }
                if (setupDone) goLive();
                else if (setupNeedWei() != null && balanceWei >= setupNeedWei()) await setup();
                else setState('needs-funds');
            } catch (e) {
                setState('error', errText(e));
            } finally { enabling = null; }
            return chain;
        })();
        return enabling;
    }

    async function afterFunding() {
        await refreshBalance();
        emit('state', state);
        if (state !== 'needs-funds') return;
        if (setupDone) { if (balanceWei >= reserveWei()) goLive(); }
        else if (setupNeedWei() != null && balanceWei >= setupNeedWei()) setup();
    }

    async function requestAirdrop() {
        const f = NET.faucets[0];
        return { ok: false, reason: `${NET.name} にはエアドロップがありません。${f.url} で財務庫のアドレスに受け取ってください。 / No airdrop on ${NET.name}; use ${f.url}.` };
    }

    // The visitor's wallet must be on this network (switch or add it) before it is asked to pay.
    async function walletOnNetwork() {
        const w = walletOf();
        if (!w || typeof w.request !== 'function') throw new Error('EVM ウォレットが見つかりません / no EVM wallet (MetaMask etc.)');
        const accounts = await w.request({ method: 'eth_requestAccounts' });
        const payer = accounts && accounts[0];
        if (!payer) throw new Error('アカウントがありません / no account');
        const hex = '0x' + NET.chainId.toString(16);
        if (Number(await w.request({ method: 'eth_chainId' })) !== NET.chainId) {
            try { await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] }); }
            catch (e) {
                if (e && (e.code === 4902 || /unrecognized|not been added|unknown chain/i.test(e.message || ''))) {
                    await w.request({ method: 'wallet_addEthereumChain', params: [addChainParams(NET.id)] });
                } else throw e;
            }
            if (Number(await w.request({ method: 'eth_chainId' })) !== NET.chainId) throw new Error(`ウォレットを ${NET.name} に切り替えてください / switch the wallet to ${NET.name}`);
        }
        return { w, payer, hex };
    }
    // Pay from the visitor's wallet. The chainId field makes the wallet refuse if it is on any other chain.
    async function walletPay(rec, to, amount, memo) {
        const { w, payer, hex } = await walletOnNetwork();
        const hash = await w.request({ method: 'eth_sendTransaction', params: [{ from: payer, to, value: '0x' + BigInt(amount).toString(16), data: memoHex(memo), chainId: hex }] });
        if (typeof hash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error('ウォレットが取引を返しませんでした / the wallet returned no transaction');
        log.touch(rec, { status: 'sent', sig: hash });
        return { hash, payer };
    }

    async function fundFromWallet(text) {
        if (!provider || !treasury) return { ok: false, reason: '先に有効化してください / enable chain mode first' };
        const wei = parseUnits(text, NET.currency.decimals);
        if (wei == null || wei <= 0n || wei > parseUnits(NET.fund.text, NET.currency.decimals) * 50n) return { ok: false, reason: '金額が正しくありません / invalid amount' };
        const rec = log.add('fund', [], `zipangu:fund|${wei}`);
        try {
            const { hash } = await walletPay(rec, treasury.address, wei, rec.memo);
            const receipt = await provider.waitForTransaction(hash, 1, HIRE_WAIT_MS);
            if (!receipt || receipt.status !== 1) throw new Error('入金を確認できませんでした / funding not confirmed');
            log.touch(rec, { status: 'confirmed', slot: receipt.blockNumber ?? null });
            afterFunding();
            return { ok: true, sig: hash };
        } catch (e) {
            log.touch(rec, { status: 'failed', error: errText(e) });
            return { ok: false, reason: errText(e) };
        }
    }

    // The HTTP-402-style quote for hiring an agent (shown before anything is paid).
    function quote(agentId, requestId, amount = NET.hire.amount) {
        if (!addr.has(agentId) || !ids.agents().includes(agentId)) return null;
        return {
            status: 402, network: NET.id, chainId: NET.chainId, payTo: addr.get(agentId), amount: String(amount), currency: NET.currency.symbol,
            amountText: `${formatUnits(amount, NET.currency.decimals)} ${NET.currency.symbol}`, memo: hireMemo(requestId), agent: agentId
        };
    }

    // x402-style hire: quote → the wallet pays (to the agent, memo as calldata) → our RPC confirms → verify → ok.
    async function hire(agentId, { amount = NET.hire.amount, request } = {}) {
        const fail = reason => { emit('hire', { phase: 'failed', agentId, reason }); return { ok: false, reason }; };
        if (!provider || !addr.has(agentId) || !ids.agents().includes(agentId)) return fail('エージェントのアドレスがありません / agent address unavailable (enable chain mode)');
        if (!request || typeof request.id !== 'string' || !request.id) return fail('依頼が正しくありません / invalid request');
        let wei;
        try { wei = BigInt(amount); } catch { wei = 0n; }
        if (wei <= 0n || wei > BigInt(NET.hire.amount) * 100n) return fail('金額が正しくありません / invalid amount');
        const q = quote(agentId, request.id, wei);
        emit('hire', { phase: 'quote', agentId, quote: q });
        const rec = log.add('hire', [{ action: 'hire', agent: agentId, district: null, place: null, good: null, qty: 1, amount: Number(formatUnits(wei, NET.currency.decimals)) }], q.memo);
        try {
            emit('hire', { phase: 'signing', agentId, quote: q });
            const { hash, payer } = await walletPay(rec, q.payTo, wei, q.memo);
            emit('hire', { phase: 'confirming', agentId, quote: q, sig: hash });
            const receipt = await provider.waitForTransaction(hash, 1, HIRE_WAIT_MS);
            let verdict = { ok: false, reason: 'not fetched' };
            for (let i = 0; i < 6; i++) {
                const tx = await provider.getTransaction(hash).catch(() => null);
                verdict = verifyEvmPayment(tx, receipt, q, payer, NET.chainId);
                if (verdict.ok || tx) break;
                await sleep(800);
            }
            if (!verdict.ok) { log.touch(rec, { status: 'failed', error: 'verification: ' + verdict.reason }); return fail(verdict.reason); }
            log.touch(rec, { status: 'confirmed', slot: receipt.blockNumber ?? null });
            emit('hire', { phase: 'verified', agentId, quote: q, sig: hash });
            return { ok: true, sig: hash };
        } catch (e) {
            log.touch(rec, { status: 'failed', error: errText(e) });
            return fail(errText(e));
        }
    }

    // A memo-only transaction paid by the treasury (birth certificates, js/birth.js). It needs only
    // the fee, not the KOGANE setup, so it works as soon as the treasury holds a little gas money.
    async function inscribe(kind, memo) {
        if (!provider || !treasury) return { ok: false, reason: 'off' };
        if (typeof memo !== 'string' || !memo.startsWith('zipangu:') || byteLen(memo) > NET.memoBytes) return { ok: false, reason: 'memo' };
        await refreshBalance();
        if (balanceWei == null || feeWei == null || balanceWei < feeWei * MEMO_GAS) return { ok: false, reason: 'funds' };
        const rec = log.add(clean(kind), [], memo);
        const receipt = await send(rec, selfMemo(memo));
        return receipt ? { ok: true, sig: rec.sig, slot: rec.slot } : { ok: false, reason: rec.error || 'failed' };
    }
    async function readMemo(hash) {
        if (!provider) return { status: 'notfound', memo: null, slot: null };
        const [tx, receipt] = await Promise.all([provider.getTransaction(hash).catch(() => null), provider.getTransactionReceipt(hash).catch(() => null)]);
        return readEvm(tx, receipt);
    }

    async function balanceOf(id) {
        if (!kogane || !addr.has(id)) return null;
        try { return Number(await kogane.balanceOf(addr.get(id))) / 100; } catch { return null; }
    }

    function disable() {
        unsubs.forEach(u => u()); unsubs = [];
        if (timer) { clearInterval(timer); timer = null; }
        if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; persistNow(); }
        setState('off');
    }
    function reset() {
        disable();
        S.wipe();
        keys.clear(); addr.clear(); mirror.clear(); minted.clear();
        treasury = null; kogane = null; contractAddr = null; setupDone = false; balanceWei = null;
        log.clear(); batcher.clear(); settleQ.length = 0;
        emit('tx', null);
        setState('off');
    }

    const chain = {
        network: NET,
        hasSetup: true, canAirdrop: false, balanceSymbol: 'KOGANE',
        get state() { return state; },
        get error() { return error; },
        get treasury() { return treasury ? treasury.address : null; },
        get balance() { return units(balanceWei); },
        get balanceUnits() { return balanceWei; },
        get setupNeed() { return units(setupNeedWei()); },
        get contract() { return contractAddr; },
        get mint() { return contractAddr; },
        get txs() { return log.list; },
        get stats() { return statsOf(log.list, since); },
        get queued() { return batcher.size + settleQ.length; },
        addressOf: id => addr.get(id) ?? null,
        ataOf: id => addr.get(id) ?? null,
        walletPresent: () => !!walletOf(),
        checkFunds: afterFunding,         // after a faucet sent coins: read the balance and continue
        enable, requestAirdrop, fundFromWallet, setup, disable, balanceOf, quote, hire, reset, on, inscribe, readMemo,
        save() { if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; } persistNow(); },
        flush
    };
    return chain;
}
