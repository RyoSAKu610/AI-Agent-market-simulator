// 万華京オンチェーン on Zcash testnet (TAZ). docs/ONCHAIN.md is the contract; the interface is the
// same as js/chain.js. No DOM, no rendering, no top-level I/O: importing this file does nothing.
// @noble/curves (secp256k1 signing) is loaded lazily inside enable(); everything else is
// js/zcash.js.
//
// Model. Zcash has no tokens yet (ZSAs are not deployed), so KOGANE stays in the sim and the chain
// gets receipts: a throwaway transparent treasury (tm…) writes each batch of trades, each
// settlement and each birth certificate as a version-5 transparent transaction whose OP_RETURN
// output carries the memo (≤ 80 bytes), paying the ZIP 317 fee and its change back to itself. Each
// resident has a transparent address. A hire is paid from the visitor's own Zcash wallet through a
// ZIP 321 request (a QR code): a transparent address cannot carry a memo, so the price carries a
// per-request tag of 1–999 zatoshis, and the engine waits until a confirmed transaction pays the
// resident exactly that amount.
//
// The node is reached through JSON-RPC (the Zebra/zcashd methods lightwalletd uses): the site's
// relay (netlify/functions/zipangu-zcash.mjs) or a node the visitor sets. A node that is not on
// the test chain is refused; a txid is shown only if the node returned it and it matches the
// transaction we built.

import {
    opsFromTrade, encodeMemo, createBatcher, byteLen, clean, hireMemo, storeOf, emitter, txLog, statsOf, sleep, errText,
    importFirst, TX_CAP
} from './chain-core.js';
import { networkOf, formatUnits, parseUnits } from './networks.js';
import { rpcCall, RpcError, readZcash, zcashEndpoint } from './chain-read.js';
import {
    taddrFromPubkey, scriptForTaddr, opReturnScript, p2pkhScriptSig, serializeTx, txid as txidOf, sighashAll, conventionalFee,
    isV5Branch, zip321Uri, hexToBytes, bytesToHex, MAX_OP_RETURN
} from './zcash.js';

const NET = networkOf('zcash-testnet');
const SDK = ['https://esm.sh/@noble/curves@1.9.7/secp256k1', 'https://cdn.jsdelivr.net/npm/@noble/curves@1.9.7/secp256k1/+esm'];
const MIN_LIVE_ZATS = 100_000n;           // 0.001 TAZ: a few receipts' worth of fees
const MIN_CHANGE = 10_000n;               // never make change smaller than this
const EXPIRY_DELTA = 40;                  // blocks (zcashd's default)
const HIRE_POLL_MS = 10_000;
const HIRE_TIMEOUT_MS = 20 * 60_000;

// ------------------------------------------------------------------ pure helpers

const enc = new TextEncoder();
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
// The per-request tag (1–999 zatoshis) that tells two hires to the same resident apart.
export const hireTag = requestId => 1 + (fnv(String(requestId)) % 999);

// Did this transaction (getrawtransaction verbose) pay the quote's address exactly the quoted
// amount, and is it in a block?
export function verifyZcashPayment(raw, quote) {
    if (!raw) return { ok: false, reason: 'トランザクションが見つかりません / transaction not found' };
    if (!(Number(raw.confirmations) > 0)) return { ok: false, reason: 'まだ確定していません / not confirmed yet' };
    const script = bytesToHex(scriptForTaddr(quote.payTo));
    const want = BigInt(quote.amount);
    const hit = (Array.isArray(raw.vout) ? raw.vout : []).some(o => o && o.scriptPubKey && String(o.scriptPubKey.hex).toLowerCase() === script
        && Number.isSafeInteger(o.valueZat) && BigInt(o.valueZat) === want);
    return hit ? { ok: true } : { ok: false, reason: '宛先か金額が一致しません / recipient or amount mismatch' };
}

// secp256k1 from @noble/curves (v1 or v2 API): compressed public keys, low-S DER signatures of a
// 32-byte digest (no hashing).
function signerOf(lib) {
    const s = (lib && (lib.secp256k1 || (lib.default && lib.default.secp256k1))) || lib;
    return {
        newKey() {
            const u = s.utils || {};
            return u.randomPrivateKey ? u.randomPrivateKey() : u.randomSecretKey();
        },
        pub: priv => s.getPublicKey(priv, true),
        sign(digest, priv) {
            const sig = s.sign(digest, priv, { lowS: true, prehash: false, format: 'der' });
            return sig instanceof Uint8Array ? sig : sig.toDERRawBytes();
        }
    };
}
async function defaultLoadLib() { return importFirst(SDK); }

// ------------------------------------------------------------------ engine

export function createChain(W, eco, { network = 'zcash-testnet', storage, rpc, fetch: fetchImpl, loadLib = defaultLoadLib, pollMs = HIRE_POLL_MS } = {}) {
    if (networkOf(network).family !== 'zcash') throw new Error(`${network} is not the Zcash network`);
    const S = storeOf(storage, NET.storageKey);
    const { emit, on } = emitter();
    const log = txLog({ emit, changed: () => persist() });
    const call = (method, params = []) => rpcCall(endpoint(), method, params, { version: '1.0', fetch: fetchImpl || globalThis.fetch });
    const endpoint = () => rpc || zcashEndpoint(storage === undefined ? (typeof localStorage !== 'undefined' ? localStorage : null) : storage);

    let state = 'off', error = null;
    let signer = null;
    let treasuryKey = null, treasuryPub = null, treasuryAddr = null;
    const keys = new Map(), addr = new Map();            // agent id → private key (hex) / tm… address
    const used = new Set();                              // payment txids already accepted for a hire
    const spent = new Set();                             // our outpoints in transactions not yet in a block
    const quoted = new Map();                            // request id → the tip when its quote was first shown
    let balanceZats = null, branchId = null, tip = null;
    let since = Date.now();
    const batcher = createBatcher({ maxOps: NET.maxOps, cap: 60 });
    const settleQ = [];
    let busy = false, timer = null, unsubs = [], persistTimer = null, enabling = null;

    const setState = (s, err = null) => { state = s; error = err; emit('state', s); };
    const agentIds = () => W.agents.map(a => a.id);

    // -------- persistence
    function persist() {
        if (persistTimer) return;
        persistTimer = setTimeout(() => { persistTimer = null; persistNow(); }, 400);
        if (persistTimer.unref) persistTimer.unref();
    }
    function persistNow() {
        if (!treasuryKey) return;
        S.write(JSON.stringify({
            v: 1, net: NET.id, since, treasury: treasuryKey, agents: Object.fromEntries(keys), used: [...used].slice(-200),
            txs: log.list.slice(0, TX_CAP)
        }));
    }
    function loadKeys() {
        let saved = null;
        try { saved = JSON.parse(S.read() || 'null'); } catch { saved = null; }
        keys.clear(); addr.clear(); used.clear(); spent.clear();
        const hex32 = v => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
        if (saved && saved.v === 1 && saved.net === NET.id && hex32(saved.treasury)) {
            treasuryKey = saved.treasury;
            for (const id of agentIds()) if (saved.agents && hex32(saved.agents[id])) keys.set(id, saved.agents[id]);
            for (const t of Array.isArray(saved.used) ? saved.used : []) if (/^[0-9a-f]{64}$/.test(t)) used.add(t);
            since = saved.since || Date.now();
            log.load(saved.txs);
            for (const t of log.list) if (t.status === 'sent' && t.spends) spent.add(t.spends);
        } else {
            treasuryKey = bytesToHex(signer.newKey()); since = Date.now(); log.load([]);
        }
        for (const id of agentIds()) if (!keys.has(id)) keys.set(id, bytesToHex(signer.newKey()));
        treasuryPub = signer.pub(hexToBytes(treasuryKey));
        treasuryAddr = taddrFromPubkey(treasuryPub);
        for (const [id, k] of keys) addr.set(id, taddrFromPubkey(signer.pub(hexToBytes(k))));
        addr.set('treasury', treasuryAddr);
        persistNow();
    }

    // -------- the node
    async function chainInfo() {
        const info = await call('getblockchaininfo');
        if (!info || info.chain !== 'test') throw new Error('この Zcash ノードは testnet ではありません / the node is not on testnet');
        const next = parseInt(info.consensus && info.consensus.nextblock, 16);
        if (!isV5Branch(next)) throw new Error(`知らないネットワークアップグレードです（${info.consensus && info.consensus.nextblock}） / unknown network upgrade`);
        branchId = next; tip = Number(info.blocks);
        return info;
    }
    async function refreshBalance() {
        try { const r = await call('getaddressbalance', [{ addresses: [treasuryAddr] }]); balanceZats = BigInt(r.balance); } catch { /* keep the last one */ }
        return balanceZats;
    }
    // The largest confirmed coin of the treasury that no transaction of ours is spending yet.
    async function pickUtxo() {
        const list = await call('getaddressutxos', [{ addresses: [treasuryAddr] }]);
        const free = (Array.isArray(list) ? list : []).filter(u => u && u.address === treasuryAddr && !spent.has(`${u.txid}:${u.outputIndex}`));
        free.sort((a, b) => b.satoshis - a.satoshis);
        return free[0] || null;
    }

    // -------- one receipt: spend one coin, OP_RETURN the memo, change back to the treasury
    async function sendMemo(kind, memo, ops, utxo) {
        const data = enc.encode(memo);
        if (data.length > MAX_OP_RETURN) throw new Error('memo over 80 bytes');
        const own = scriptForTaddr(treasuryAddr);
        const tx = {
            branchId, lockTime: 0, expiryHeight: tip + EXPIRY_DELTA,
            vin: [{ txid: utxo.txid, vout: utxo.outputIndex, value: BigInt(utxo.satoshis), scriptPubKey: hexToBytes(utxo.script), sequence: 0xffffffff }],
            vout: [{ value: 0n, script: opReturnScript(data) }, { value: 0n, script: own }]
        };
        const fee = conventionalFee(tx);
        const change = BigInt(utxo.satoshis) - fee;
        const rec = log.add(kind, ops, memo);
        if (change < MIN_CHANGE) { log.touch(rec, { status: 'failed', error: 'TAZ が足りません / not enough TAZ' }); return { ok: false, reason: 'funds', rec }; }
        tx.vout[1].value = change;
        tx.vin[0].scriptSig = p2pkhScriptSig(signer.sign(sighashAll(tx, 0), hexToBytes(treasuryKey)), treasuryPub);
        const expect = txidOf(tx);
        const outpoint = `${utxo.txid}:${utxo.outputIndex}`;
        spent.add(outpoint);
        rec.spends = outpoint; rec.expiry = tx.expiryHeight;
        try {
            const got = await call('sendrawtransaction', [bytesToHex(serializeTx(tx))]);
            if (got !== expect) throw new Error(`ノードが別の txid を返しました / the node returned another txid (${String(got).slice(0, 16)}…)`);
            log.touch(rec, { status: 'sent', sig: got, error: null });
            return { ok: true, rec };
        } catch (e) {
            spent.delete(outpoint);
            log.touch(rec, { status: 'failed', error: errText(e) });
            return { ok: false, reason: errText(e), rec };
        }
    }
    // Sent receipts: confirmed once in a block; failed once past their expiry height unseen.
    async function recheckSent() {
        for (const t of log.list.filter(x => x.status === 'sent' && x.sig).slice(0, 20)) {
            let raw = null, missing = false;
            try { raw = await call('getrawtransaction', [t.sig, 1]); } catch (e) { if (e instanceof RpcError && (e.code === -5 || e.code === -8)) missing = true; else continue; }
            if (raw && Number(raw.confirmations) > 0) { log.touch(t, { status: 'confirmed', slot: Number.isFinite(raw.height) ? raw.height : null }); spent.delete(t.spends); }
            else if (missing && tip != null && t.expiry != null && tip > t.expiry) { log.touch(t, { status: 'failed', error: '期限切れ / expired before a block took it' }); spent.delete(t.spends); }
        }
    }
    async function confirmOne(rec, waitMs) {
        const end = Date.now() + waitMs;
        while (Date.now() < end) {
            try {
                const raw = await call('getrawtransaction', [rec.sig, 1]);
                if (raw && Number(raw.confirmations) > 0) { log.touch(rec, { status: 'confirmed', slot: Number.isFinite(raw.height) ? raw.height : null }); spent.delete(rec.spends); return true; }
            } catch { /* not yet visible */ }
            await sleep(pollMs / 2);
        }
        return false;
    }

    // -------- live
    function goLive() {
        setState('live');
        unsubs.forEach(u => u()); unsubs = [];
        if (eco && eco.on) {
            unsubs.push(eco.on('trade', ev => { const op = opsFromTrade(W, ev); if (op && addr.has(op.agent)) batcher.push(op); }));
            unsubs.push(eco.on('settle', ev => { if (settleQ.length < 10) settleQ.push(ev); }));
        }
        if (timer) clearInterval(timer);
        timer = setInterval(() => { flush(); }, NET.flushMs);
        if (timer.unref) timer.unref();
    }
    async function lock(fn) {
        while (busy) await sleep(200);
        busy = true;
        try { return await fn(); } finally { busy = false; }
    }
    async function flush() {
        if (state !== 'live' || busy) return;
        await lock(async () => {
            try {
                await chainInfo();
                await recheckSent();
                if (!settleQ.length && !batcher.size) return;
                await refreshBalance();
                if (balanceZats != null && balanceZats < MIN_LIVE_ZATS / 2n) {
                    if (timer) { clearInterval(timer); timer = null; }
                    setState('needs-funds', 'TAZ が残り少ないので、記録を止めました / paused: low TAZ');
                    return;
                }
                const utxo = await pickUtxo();
                if (!utxo) return;                       // the last receipt's change is not in a block yet
                if (settleQ.length) {
                    const ev = settleQ.shift();
                    const memo = encodeMemo('settle', [], { day: ev.day, sales: ev.sales, volume: Math.round(ev.volume), top: ev.top }, NET.memoBytes);
                    await sendMemo('settle', memo, [], utxo);
                } else {
                    const ops = batcher.take();
                    const total = Math.round(ops.reduce((n, o) => n + (o.amount || 0), 0) * 100) / 100;
                    const memo = encodeMemo('trade', ops, { n: ops.length, v: total }, NET.memoBytes);
                    await sendMemo('trade', memo, ops, utxo);
                }
            } catch (e) { error = errText(e); emit('state', state); }
        });
    }

    // -------- public engine
    async function enable() {
        if (enabling) return enabling;
        if (state === 'live' || state === 'needs-funds') return chain;
        enabling = (async () => {
            setState('loading');
            try {
                if (!signer) signer = signerOf(await loadLib());
                await chainInfo();
                loadKeys();
                await refreshBalance();
                if (balanceZats == null) throw new Error('残高を読めません / cannot read the balance');
                if (balanceZats >= MIN_LIVE_ZATS) goLive(); else setState('needs-funds');
            } catch (e) {
                const msg = errText(e);
                setState('error', /not_configured|HTTP 503/.test(msg)
                    ? 'Zcash の中継が設定されていません（Netlify の ZIPANGU_ZCASH_RPC_URL）。下で自分のノードの URL を入れることもできます。 / the Zcash relay is not configured'
                    : msg);
            } finally { enabling = null; }
            return chain;
        })();
        return enabling;
    }
    async function afterFunding() {
        if (!treasuryAddr) return;
        await refreshBalance();
        emit('state', state);
        if (state === 'needs-funds' && balanceZats != null && balanceZats >= MIN_LIVE_ZATS) goLive();
    }
    async function requestAirdrop() {
        return { ok: false, reason: `Zcash testnet にはエアドロップがありません。${NET.faucets[0].url} で財務庫のアドレスに受け取ってください。 / No airdrop; use a faucet.` };
    }
    // Funding is a ZIP 321 request the visitor's wallet scans; there is nothing to sign here.
    const fundUri = text => {
        const z = parseUnits(text, NET.currency.decimals);
        return treasuryAddr && z ? zip321Uri(treasuryAddr, z, { label: 'Kaleidoscope Zipangu treasury' }) : null;
    };
    async function fundFromWallet() { return { ok: false, reason: 'QR コードで送ってください / pay the QR code from your wallet' }; }

    // The visitor may pay as soon as the QR is shown, before asking us to look: the search for the
    // payment starts at the block the quote was first shown at.
    function quote(agentId, requestId) {
        if (!addr.has(agentId) || !keys.has(agentId) || !requestId) return null;
        if (!quoted.has(requestId) && tip != null) {
            quoted.set(requestId, tip);
            if (quoted.size > 50) quoted.delete(quoted.keys().next().value);
        }
        const amount = BigInt(NET.hire.amount) + BigInt(hireTag(requestId));
        const memo = hireMemo(requestId);
        return {
            status: 402, network: NET.id, payTo: addr.get(agentId), amount: amount.toString(), currency: 'TAZ',
            amountText: `${formatUnits(amount, 8)} TAZ`, memo, agent: agentId, tag: hireTag(requestId), since: quoted.get(requestId) ?? tip,
            uri: zip321Uri(addr.get(agentId), amount, { label: 'Kaleidoscope Zipangu', message: memo })
        };
    }

    // x402-style hire: quote → the visitor's wallet pays the QR → wait for a confirmed payment of
    // exactly that amount to the resident → only then ok.
    async function hire(agentId, { request, signal, timeoutMs = HIRE_TIMEOUT_MS } = {}) {
        const fail = reason => { emit('hire', { phase: 'failed', agentId, reason }); return { ok: false, reason }; };
        if (!treasuryAddr || !addr.has(agentId) || !keys.has(agentId)) return fail('エージェントのアドレスがありません / agent address unavailable (enable chain mode)');
        if (!request || typeof request.id !== 'string' || !request.id) return fail('依頼が正しくありません / invalid request');
        const q = quote(agentId, request.id);
        emit('hire', { phase: 'quote', agentId, quote: q });
        let from;
        try { await chainInfo(); from = quoted.get(request.id) ?? tip; } catch (e) { return fail(errText(e)); }
        emit('hire', { phase: 'signing', agentId, quote: q });
        const end = Date.now() + timeoutMs;
        while (Date.now() < end) {
            if (signal && signal.aborted) return fail('取りやめました / cancelled');
            try {
                await chainInfo();
                const ids = await call('getaddresstxids', [{ addresses: [q.payTo], start: Math.max(1, from - 1), end: tip }]);
                for (const id of Array.isArray(ids) ? ids : []) {
                    if (used.has(id)) continue;
                    const raw = await call('getrawtransaction', [id, 1]).catch(() => null);
                    if (verifyZcashPayment(raw, q).ok) {
                        used.add(id);
                        const rec = log.add('hire', [{ action: 'hire', agent: agentId, district: null, place: null, good: null, qty: 1, amount: Number(formatUnits(q.amount, 8)) }], q.memo);
                        log.touch(rec, { status: 'confirmed', sig: id, slot: Number.isFinite(raw.height) ? raw.height : null });
                        persistNow();
                        emit('hire', { phase: 'verified', agentId, quote: q, sig: id });
                        return { ok: true, sig: id };
                    }
                }
            } catch (e) { emit('hire', { phase: 'signing', agentId, quote: q, note: errText(e) }); }
            await sleep(pollMs);
        }
        return fail('時間内に支払いを確認できませんでした / no payment within the time');
    }

    // A memo-only receipt (birth certificates, js/birth.js). Waits a little for its block.
    async function inscribe(kind, memo, { waitMs = 150_000 } = {}) {
        if (!treasuryAddr || !signer) return { ok: false, reason: 'off' };
        if (typeof memo !== 'string' || !memo.startsWith('zipangu:') || byteLen(memo) > NET.memoBytes) return { ok: false, reason: 'memo' };
        return lock(async () => {
            try {
                await chainInfo();
                await recheckSent();
                const utxo = await pickUtxo();
                if (!utxo) { await refreshBalance(); return { ok: false, reason: balanceZats > 0n ? 'busy' : 'funds' }; }
                const r = await sendMemo(clean(kind), memo, [], utxo);
                if (!r.ok) return { ok: false, reason: r.reason };
                await confirmOne(r.rec, waitMs);
                return { ok: true, sig: r.rec.sig, slot: r.rec.slot };
            } catch (e) { return { ok: false, reason: errText(e) }; }
        });
    }
    async function readMemo(id) {
        try { return readZcash(await call('getrawtransaction', [id, 1])); }
        catch (e) { if (e instanceof RpcError && (e.code === -5 || e.code === -8)) return { status: 'notfound', memo: null, slot: null }; throw e; }
    }
    async function balanceOf(id) {
        if (!addr.has(id)) return null;
        try { const r = await call('getaddressbalance', [{ addresses: [addr.get(id)] }]); return Number(r.balance) / 1e8; } catch { return null; }
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
        keys.clear(); addr.clear(); used.clear(); spent.clear();
        treasuryKey = treasuryPub = treasuryAddr = null; balanceZats = null;
        log.clear(); batcher.clear(); settleQ.length = 0;
        emit('tx', null);
        setState('off');
    }

    const chain = {
        network: NET,
        hasSetup: false, canAirdrop: false, balanceSymbol: 'TAZ',
        get state() { return state; },
        get error() { return error; },
        get treasury() { return treasuryAddr; },
        get balance() { return balanceZats == null ? null : Number(balanceZats) / 1e8; },
        get balanceUnits() { return balanceZats; },
        get setupNeed() { return Number(MIN_LIVE_ZATS) / 1e8; },
        get contract() { return null; },
        get mint() { return null; },
        get txs() { return log.list; },
        get stats() { return statsOf(log.list, since); },
        get queued() { return batcher.size + settleQ.length; },
        get endpoint() { return endpoint(); },
        addressOf: id => addr.get(id) ?? null,
        ataOf: id => addr.get(id) ?? null,
        walletPresent: () => true,            // any Zcash testnet wallet that scans a ZIP 321 QR
        checkFunds: afterFunding,
        fundUri,
        enable, requestAirdrop, fundFromWallet, setup: afterFunding, disable, balanceOf, quote, hire, reset, on, inscribe, readMemo,
        save() { if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; } persistNow(); },
        flush
    };
    return chain;
}

