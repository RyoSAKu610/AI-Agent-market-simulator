// 万華京オンチェーン — Solana devnet receipt layer (docs/ONCHAIN.md is the contract).
// No DOM, no rendering, no top-level I/O: importing this file does nothing. Libraries
// (@solana/web3.js, @solana/spl-token) are loaded lazily inside enable().
// Honesty rules: a signature/slot/balance is shown only if the RPC returned it; the
// sim stays the source of truth (this module only reads sim events).

export const CLUSTER = 'devnet';
const SDK = {
    web3: ['https://esm.sh/@solana/web3.js@1.98.0', 'https://cdn.jsdelivr.net/npm/@solana/web3.js@1.98.0/+esm'],
    token: ['https://esm.sh/@solana/spl-token@0.4.9', 'https://cdn.jsdelivr.net/npm/@solana/spl-token@0.4.9/+esm']
};
export const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
export const FAUCET_URL = 'https://faucet.solana.com';
export const STORAGE_KEY = 'zipangu.chain.v1';

const DECIMALS = 2;
const MEMO_MAX_BYTES = 400;
const FLUSH_MS = 2500;
const TX_CAP = 300;
const VAULT_LIQUIDITY = 1_000_000;       // KOGANE minted into each place vault
const TOPUP_HEADROOM = 10_000;           // base units (100.00 KOGANE) added on top of a shortfall
const MIN_SETUP_LAMPORTS = 120_000_000;  // mint rent + 50 ATAs + ~14 txs of fees ≈ 0.105 SOL
const SETUP_GROUP = 4;                   // owners per setup tx (each owner adds a signature + 2 keys)
const U64_MAX = (1n << 64n) - 1n;
const MAX_HIRE_LAMPORTS = 1_000_000_000; // 1 SOL guard against typos

export const explorerTx = sig => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
export const explorerAddr = a => `https://explorer.solana.com/address/${a}?cluster=${CLUSTER}`;

// ------------------------------------------------------------------ pure helpers

// KOGANE ui amount → integer base units (2 decimals). Never negative / NaN / Infinity.
export function toBaseUnits(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(Math.round(n * 10 ** DECIMALS), Number.MAX_SAFE_INTEGER);
}
const fromUnits = u => u / 10 ** DECIMALS;

// sim 'trade' event → one transfer op, or null when it cannot be mapped honestly.
// buy/craft move agent → place vault, sell moves vault → agent.
export function opsFromTrade(W, ev) {
    if (!ev || !['buy', 'sell', 'craft'].includes(ev.action) || !ev.agent) return null;
    const place = W && W.placeOf ? W.placeOf(ev.district) : null;
    const units = toBaseUnits(ev.total);
    if (!place || !units) return null;
    return {
        action: ev.action, agent: ev.agent, district: ev.district, place: place.id,
        good: ev.good || null, qty: Number(ev.qty) || 0, amount: fromUnits(units), seq: ev.seq ?? null
    };
}

const utf8 = new TextEncoder();
const byteLen = s => utf8.encode(s).length;
const clean = v => String(v ?? '').replace(/[\s|;=]+/g, '_');
const ACT = { buy: 'b', craft: 'c', sell: 's' };

// Memo text. Always starts with `zipangu:`, always ≤ 400 UTF-8 bytes: ops are dropped from
// the tail (counted as `+N`) and, as a last resort, characters are trimmed.
export function encodeMemo(kind, ops = [], extra = {}) {
    const head = [`zipangu:${clean(kind)}`];
    if (ops.some(o => o && o.merged)) head.push('batched');
    for (const [k, v] of Object.entries(extra || {})) if (v != null && v !== false) head.push(`${clean(k)}=${clean(v)}`);
    const parts = ops.map(o => `${ACT[o.action] || '?'}:${clean(o.agent)}@${clean(o.place)}:${clean(o.good)}x${o.qty}=${o.amount}`);
    const build = n => {
        const shown = parts.slice(0, n).join(';');
        const dropped = parts.length - n;
        return head.join('|') + (shown ? '|' + shown : '') + (dropped ? `|+${dropped}` : '');
    };
    let n = parts.length, s = build(n);
    while (byteLen(s) > MEMO_MAX_BYTES && n > 0) s = build(--n);
    while (byteLen(s) > MEMO_MAX_BYTES) s = s.slice(0, -1);   // head alone too long: trim chars
    return s;
}

// Pending-op queue. take() hands out ≤ maxOps; once the queue holds `cap` ops, a new op
// folds into an existing one with the same (agent, place, direction) and is flagged `merged`.
export function createBatcher({ maxOps = 4, cap = 60 } = {}) {
    const items = [];
    const dir = o => (o.action === 'sell' ? 'in' : 'out');
    return {
        push(op) {
            if (!op || !toBaseUnits(op.amount)) return false;
            if (items.length >= cap) {
                const hit = items.find(o => o.agent === op.agent && o.place === op.place && dir(o) === dir(op));
                if (hit) {
                    hit.amount = fromUnits(toBaseUnits(hit.amount) + toBaseUnits(op.amount));
                    hit.qty += op.qty || 0;
                    hit.merged = (hit.merged || 1) + 1;
                    return true;
                }
            }
            items.push({ ...op });
            return true;
        },
        take() { return items.splice(0, maxOps); },
        get size() { return items.length; },
        peek() { return items.slice(); },
        clear() { items.length = 0; }
    };
}

// Checks a parsed devnet tx (getParsedTransaction) really paid `quote.amount` lamports from
// `payer` to `quote.payTo` with exactly `quote.memo`. Pure so it can be unit-tested.
export function verifyHireTx(parsed, quote, payer) {
    if (!parsed) return { ok: false, reason: 'トランザクションが見つかりません / transaction not found' };
    if (parsed.meta && parsed.meta.err) return { ok: false, reason: 'トランザクションが失敗しています / transaction failed on-chain' };
    const ixs = (parsed.transaction && parsed.transaction.message && parsed.transaction.message.instructions) || [];
    const pay = ixs.find(i => i.parsed && i.parsed.type === 'transfer' && i.parsed.info
        && i.parsed.info.destination === quote.payTo && Number(i.parsed.info.lamports) === quote.amount
        && (!payer || i.parsed.info.source === payer));
    if (!pay) return { ok: false, reason: '宛先か金額が一致しません / recipient or amount mismatch' };
    const memo = ixs.find(i => i.programId && String(i.programId) === MEMO_PROGRAM || i.program === 'spl-memo');
    if (!memo || memo.parsed !== quote.memo) return { ok: false, reason: 'メモが一致しません / memo mismatch' };
    return { ok: true };
}

// ------------------------------------------------------------------ lib loading

async function importFirst(urls) {
    let last;
    for (const u of urls) {
        try { return await import(/* @vite-ignore */ u); } catch (e) { last = e; }
    }
    throw last || new Error('import failed');
}
// Default loader: returns { web3, token }. Tests/Node inject their own.
async function defaultLoadLib() {
    const [web3, token] = await Promise.all([importFirst(SDK.web3), importFirst(SDK.token)]);
    return { web3, token };
}
const unwrap = m => (m && m.Keypair ? m : (m && m.default) || m);

const sleep = ms => new Promise(r => setTimeout(r, ms));
const errText = e => String((e && (e.message || e.error?.message)) || e || 'unknown error').slice(0, 300);
const isExpiry = msg => /block ?height exceeded|blockhash not found|expired/i.test(msg);

// ------------------------------------------------------------------ engine

export function createChain(W, eco, { storage, rpc = 'https://api.devnet.solana.com', loadLib = defaultLoadLib } = {}) {
    // storage: localStorage if present, else a throwaway in-memory shim. All access is guarded.
    let store = storage;
    if (store === undefined) { try { store = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { store = null; } }
    const mem = new Map();
    const read = () => { try { return store ? store.getItem(STORAGE_KEY) : mem.get(STORAGE_KEY) ?? null; } catch (e) { return null; } };
    const write = v => { try { if (store) store.setItem(STORAGE_KEY, v); else mem.set(STORAGE_KEY, v); } catch (e) { /* quota/private mode */ } };
    const wipe = () => { try { if (store) store.removeItem(STORAGE_KEY); mem.delete(STORAGE_KEY); } catch (e) { /* ignore */ } };

    const listeners = new Map();
    const emit = (type, msg) => { for (const fn of [...(listeners.get(type) || [])]) { try { fn(msg); } catch (e) { /* listener bug must not break the engine */ } } };

    let state = 'off', error = null;
    let lib = null, conn = null;                 // set in enable()
    let treasuryKp = null, mintKp = null;
    const agentKp = new Map(), placeKp = new Map();
    const addr = new Map(), ata = new Map();     // id → base58
    let treasuryLamports = null;
    let setupDone = false;
    let since = Date.now();
    let txs = [];
    let txSeq = 0;
    const mirror = new Map();                    // ata base58 → base units (approximate; from setup + confirmed transfers)
    const batcher = createBatcher({ maxOps: 4, cap: 60 });
    const settleQ = [];
    let inFlight = false, timer = null, unsubs = [], setupPromise = null, persistTimer = null, enabling = null;
    let confirmedSinceBalance = 0;

    const setState = (s, err = null) => { state = s; error = err; emit('state', s); };
    const ids = { agents: () => W.agents.map(a => a.id), places: () => [...W.eras, ...W.realms].map(p => p.id) };

    // -------- persistence
    function persist() {
        if (persistTimer) return;
        persistTimer = setTimeout(() => { persistTimer = null; persistNow(); }, 400);
        if (persistTimer.unref) persistTimer.unref();
    }
    function persistNow() {
        if (!treasuryKp) return;
        const sk = kp => Array.from(kp.secretKey);
        const obj = (m) => Object.fromEntries([...m].map(([k, kp]) => [k, sk(kp)]));
        write(JSON.stringify({
            v: 1, since, cluster: CLUSTER,
            treasury: sk(treasuryKp), mintKey: sk(mintKp), agents: obj(agentKp), places: obj(placeKp),
            setupDone, txs: txs.slice(0, TX_CAP)
        }));
    }
    function loadKeys() {
        const { Keypair } = lib.web3;
        const fromArr = a => Keypair.fromSecretKey(Uint8Array.from(a));
        let saved = null;
        try { saved = JSON.parse(read() || 'null'); } catch (e) { saved = null; }
        let fresh = true;
        try {
            if (saved && saved.v === 1 && saved.cluster === CLUSTER && saved.treasury && saved.mintKey) {
                treasuryKp = fromArr(saved.treasury); mintKp = fromArr(saved.mintKey);
                for (const id of ids.agents()) if (saved.agents && saved.agents[id]) agentKp.set(id, fromArr(saved.agents[id]));
                for (const id of ids.places()) if (saved.places && saved.places[id]) placeKp.set(id, fromArr(saved.places[id]));
                setupDone = !!saved.setupDone;
                since = saved.since || Date.now();
                txs = Array.isArray(saved.txs) ? saved.txs.slice(0, TX_CAP) : [];
                fresh = false;
            }
        } catch (e) { fresh = true; }
        if (fresh) {
            treasuryKp = Keypair.generate(); mintKp = Keypair.generate();
            agentKp.clear(); placeKp.clear(); txs = []; setupDone = false; since = Date.now();
        }
        for (const id of ids.agents()) if (!agentKp.has(id)) { agentKp.set(id, Keypair.generate()); setupDone = false; }
        for (const id of ids.places()) if (!placeKp.has(id)) { placeKp.set(id, Keypair.generate()); setupDone = false; }
        // A tx that was never sent when the page closed did not happen; a sent one is re-checked later.
        for (const t of txs) if (t.status === 'queued') { t.status = 'failed'; t.error = '送信前に中断 / interrupted before sending'; }
        txSeq = txs.reduce((m, t) => Math.max(m, Number(String(t.id).split('-').pop()) || 0), 0);
        derive();
        persistNow();
    }
    function derive() {
        const { getAssociatedTokenAddressSync } = lib.token;
        for (const [id, kp] of [...agentKp, ...placeKp]) {
            addr.set(id, kp.publicKey.toBase58());
            ata.set(id, getAssociatedTokenAddressSync(mintKp.publicKey, kp.publicKey).toBase58());
        }
        addr.set('treasury', treasuryKp.publicKey.toBase58());
    }

    // -------- tx records
    function newTx(kind, ops, memo) {
        const t = { id: `tx-${Date.now().toString(36)}-${++txSeq}`, kind, status: 'queued', sig: null, slot: null, error: null, ops, memo, at: Date.now() };
        txs.unshift(t);
        if (txs.length > TX_CAP) txs.length = TX_CAP;
        emit('tx', t); persist();
        return t;
    }
    function touch(t, patch) { Object.assign(t, patch); emit('tx', t); persist(); }

    // Build, sign, send, confirm one treasury-paid tx. One retry on blockhash expiry.
    // Never invents data: sig comes from sendRawTransaction, slot from getSignatureStatuses.
    async function submit(rec, ixs, signers) {
        const { Transaction } = lib.web3;
        let msg = 'unknown';
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const bh = await conn.getLatestBlockhash('confirmed');
                const tx = new Transaction({ feePayer: treasuryKp.publicKey, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight });
                tx.add(...ixs);
                tx.sign(...signers);
                const sig = await conn.sendRawTransaction(tx.serialize());
                touch(rec, { status: 'sent', sig, error: null });
                const res = await conn.confirmTransaction({ signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight }, 'confirmed');
                if (res && res.value && res.value.err) {
                    touch(rec, { status: 'failed', error: 'on-chain error: ' + JSON.stringify(res.value.err).slice(0, 200) });
                    return false;
                }
                let slot = null;
                try { const st = await conn.getSignatureStatuses([sig]); slot = st && st.value && st.value[0] ? st.value[0].slot ?? null : null; } catch (e) { /* slot stays null */ }
                touch(rec, { status: 'confirmed', slot, error: null });
                return true;
            } catch (e) {
                msg = errText(e);
                if (attempt === 0 && isExpiry(msg)) { touch(rec, { sig: null, error: 'retrying: ' + msg }); continue; }
                break;
            }
        }
        touch(rec, { status: 'failed', error: msg });
        return false;
    }

    const memoIx = text => {
        const { TransactionInstruction, PublicKey } = lib.web3;
        const data = typeof Buffer !== 'undefined' ? Buffer.from(text, 'utf8') : utf8.encode(text);
        return new TransactionInstruction({ keys: [], programId: new PublicKey(MEMO_PROGRAM), data });
    };

    // -------- setup (idempotent, resumable)
    async function readAtas(owners) {
        const infos = await conn.getMultipleAccountsInfo(owners.map(id => lib.web3.PublicKey ? new lib.web3.PublicKey(ata.get(id)) : ata.get(id)));
        return infos.map(info => {
            if (!info || !info.data || info.data.length < 165) return null;
            const d = info.data, dv = new DataView(d.buffer, d.byteOffset, d.byteLength);
            const hasDelegate = dv.getUint32(72, true) === 1;
            return {
                amount: Number(dv.getBigUint64(64, true)),
                delegate: hasDelegate ? new lib.web3.PublicKey(d.slice(76, 108)).toBase58() : null
            };
        });
    }
    function setup() {
        if (setupPromise) return setupPromise;
        setupPromise = (async () => {
            if (!lib || !conn) throw new Error('enable() first');
            if (state === 'live' && setupDone) return;
            setState('setting-up');
            const { SystemProgram, PublicKey } = lib.web3;
            const T = lib.token;
            try {
                await refreshBalance();
                const total = 1 + Math.ceil((agentKp.size + placeKp.size) / SETUP_GROUP);
                let step = 0;
                const mintInfo = await conn.getAccountInfo(mintKp.publicKey);
                if (!mintInfo) {
                    const rec = newTx('setup', [], `zipangu:setup|mint|1/${total}`);
                    const lamports = await T.getMinimumBalanceForRentExemptMint(conn);
                    const ok = await submit(rec, [
                        SystemProgram.createAccount({ fromPubkey: treasuryKp.publicKey, newAccountPubkey: mintKp.publicKey, lamports, space: T.MINT_SIZE, programId: T.TOKEN_PROGRAM_ID }),
                        T.createInitializeMintInstruction(mintKp.publicKey, DECIMALS, treasuryKp.publicKey, null),
                        memoIx(rec.memo)
                    ], [treasuryKp, mintKp]);
                    if (!ok) throw new Error(rec.error || 'mint creation failed');
                }
                step++;
                const owners = [...agentKp.keys(), ...placeKp.keys()];
                for (let i = 0; i < owners.length; i += SETUP_GROUP) {
                    const group = owners.slice(i, i + SETUP_GROUP);
                    step++;
                    // Atomic tx ⇒ an existing ATA with our delegate means the group already landed (resume).
                    const existing = await readAtas(group);
                    if (existing.every(a => a && a.delegate === addr.get('treasury'))) {
                        group.forEach((id, k) => mirror.set(ata.get(id), existing[k].amount));
                        continue;
                    }
                    const ixs = [], signers = [treasuryKp], minted = [];
                    for (const id of group) {
                        const kp = agentKp.get(id) || placeKp.get(id);
                        const isAgent = agentKp.has(id);
                        const wallet = isAgent ? eco.agents.get(id)?.wallet : VAULT_LIQUIDITY;
                        const units = toBaseUnits(isAgent ? wallet ?? 0 : VAULT_LIQUIDITY);
                        const a = new PublicKey(ata.get(id));
                        ixs.push(T.createAssociatedTokenAccountIdempotentInstruction(treasuryKp.publicKey, a, kp.publicKey, mintKp.publicKey));
                        ixs.push(T.createApproveInstruction(a, treasuryKp.publicKey, kp.publicKey, U64_MAX));
                        if (units) ixs.push(T.createMintToInstruction(mintKp.publicKey, a, treasuryKp.publicKey, BigInt(units)));
                        signers.push(kp);
                        minted.push([ata.get(id), units]);
                    }
                    const rec = newTx('setup', [], `zipangu:setup|ata+mint|${step}/${total}`);
                    ixs.push(memoIx(rec.memo));
                    if (!(await submit(rec, ixs, signers))) throw new Error(rec.error || 'setup tx failed');
                    minted.forEach(([k, u], j) => mirror.set(k, (existing[j]?.amount || 0) + u));
                }
                setupDone = true; persistNow();
                await refreshBalance();
                goLive();
            } catch (e) {
                // Half-finished setup is fine: setup() resumes from on-chain state.
                setState(isFunds(e) ? 'needs-funds' : 'error', errText(e));
            } finally { setupPromise = null; }
        })();
        return setupPromise;
    }
    const isFunds = e => /insufficient|0x1\b|debit an account|funds/i.test(errText(e));

    async function refreshBalance() {
        try { treasuryLamports = await conn.getBalance(treasuryKp.publicKey, 'confirmed'); } catch (e) { /* keep last known */ }
        return treasuryLamports;
    }

    // -------- live
    function goLive() {
        setState('live');
        unsubs.forEach(u => u()); unsubs = [];
        if (eco && eco.on) {
            unsubs.push(eco.on('trade', onTrade));
            unsubs.push(eco.on('settle', onSettle));
        }
        if (timer) clearInterval(timer);
        timer = setInterval(() => { flush(); }, FLUSH_MS);
        if (timer.unref) timer.unref();
        loadMirror().catch(() => {});
        recheckSent().catch(() => {});
    }
    async function loadMirror() {
        const owners = [...agentKp.keys(), ...placeKp.keys()];
        const infos = await readAtas(owners);
        owners.forEach((id, k) => { if (infos[k]) mirror.set(ata.get(id), infos[k].amount); });
    }
    async function recheckSent() {
        const pending = txs.filter(t => t.status === 'sent' && t.sig);
        if (!pending.length) return;
        const st = await conn.getSignatureStatuses(pending.map(t => t.sig), { searchTransactionHistory: true });
        pending.forEach((t, k) => {
            const s = st.value[k];
            if (!s) touch(t, { status: 'failed', error: '確認できませんでした / not found after reload' });
            else if (s.err) touch(t, { status: 'failed', error: 'on-chain error' });
            else if (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized') touch(t, { status: 'confirmed', slot: s.slot ?? null });
        });
    }
    function onTrade(ev) {
        const op = opsFromTrade(W, ev);
        if (op && ata.has(op.agent) && ata.has(op.place)) batcher.push(op);
    }
    function onSettle(ev) {
        if (settleQ.length < 10) settleQ.push(ev);
    }

    // Plan one batch: transfers + any labelled top-up mintTo, using the local balance mirror.
    function planBatch(ops) {
        const T = lib.token, { PublicKey } = lib.web3;
        const delta = new Map();   // ata → net change if the tx confirms
        const bal = k => (mirror.has(k) ? mirror.get(k) + (delta.get(k) || 0) : null);
        const topups = new Map();  // ata → { label, units }
        const transfers = [];
        for (const o of ops) {
            const units = toBaseUnits(o.amount);
            const from = o.action === 'sell' ? o.place : o.agent, to = o.action === 'sell' ? o.agent : o.place;
            const src = ata.get(from), dst = ata.get(to);
            const have = bal(src);
            if (have != null && have < units) {
                const need = units - have + TOPUP_HEADROOM;
                const t = topups.get(src) || { label: (o.action === 'sell' ? 'p:' : 'a:') + from, units: 0 };
                t.units += need; topups.set(src, t);
                delta.set(src, (delta.get(src) || 0) + need);
            }
            delta.set(src, (delta.get(src) || 0) - units);
            delta.set(dst, (delta.get(dst) || 0) + units);
            transfers.push(T.createTransferInstruction(new PublicKey(src), new PublicKey(dst), treasuryKp.publicKey, BigInt(units)));
        }
        const topIxs = [...topups].map(([k, t]) => T.createMintToInstruction(mintKp.publicKey, new PublicKey(k), treasuryKp.publicKey, BigInt(t.units)));
        const topLabel = [...topups.values()].map(t => `${t.label}:${fromUnits(t.units)}`).join(',');
        return { ixs: [...topIxs, ...transfers], delta, topLabel };
    }

    async function flush() {
        if (state !== 'live' || inFlight) return;
        if (!settleQ.length && !batcher.size) return;
        inFlight = true;
        try {
            if (settleQ.length) {
                const ev = settleQ.shift();
                const memo = encodeMemo('settle', [], { day: ev.day, label: ev.label, kind: ev.kind, sales: ev.sales, volume: Math.round(ev.volume), top: ev.top, profit: Math.round(ev.topProfit || 0) });
                const rec = newTx('settle', [], memo);
                await submit(rec, [memoIx(memo)], [treasuryKp]);
            } else {
                const ops = batcher.take();
                const plan = planBatch(ops);
                const memo = encodeMemo('trade', ops, plan.topLabel ? { topup: plan.topLabel } : {});
                const rec = newTx('trade', ops, memo);
                const ok = await submit(rec, [...plan.ixs, memoIx(memo)], [treasuryKp]);
                if (ok) for (const [k, d] of plan.delta) if (mirror.has(k)) mirror.set(k, Math.max(0, mirror.get(k) + d));
            }
            if (++confirmedSinceBalance >= 5) { confirmedSinceBalance = 0; await refreshBalance(); emit('state', state); }
        } catch (e) { /* submit() already recorded failures */ } finally { inFlight = false; }
    }

    // -------- public engine
    async function enable() {
        if (enabling) return enabling;
        if (state === 'live' || state === 'setting-up' || state === 'needs-funds') return chain;
        enabling = (async () => {
            setState('loading');
            try {
                if (!lib) {
                    const l = await loadLib();
                    lib = { web3: unwrap(l.web3), token: unwrap(l.token) };
                }
                if (!conn) conn = new lib.web3.Connection(rpc, 'confirmed');
                loadKeys();
                await refreshBalance();
                if (treasuryLamports == null) throw new Error('devnet RPC に接続できません / cannot reach devnet RPC');
                if (setupDone) {
                    const m = await conn.getAccountInfo(mintKp.publicKey).catch(() => 'err');
                    if (m === null) setupDone = false;   // devnet was reset or mint missing: redo (idempotent)
                }
                if (setupDone) goLive();
                else if (treasuryLamports >= MIN_SETUP_LAMPORTS) await setup();
                else setState('needs-funds');
            } catch (e) {
                setState('error', errText(e));
            } finally { enabling = null; }
            return chain;
        })();
        return enabling;
    }

    // After funding: continue into setup automatically if the treasury can now afford it.
    async function afterFunding() {
        await refreshBalance();
        emit('state', state);
        if (state === 'needs-funds' && treasuryLamports >= MIN_SETUP_LAMPORTS) setup();
    }

    async function requestAirdrop() {
        if (!conn || !treasuryKp) return { ok: false, reason: '先に有効化してください / enable chain mode first' };
        const rec = newTx('fund', [], 'devnet airdrop (faucet)');
        try {
            const sig = await conn.requestAirdrop(treasuryKp.publicKey, lib.web3.LAMPORTS_PER_SOL ?? 1e9);
            touch(rec, { status: 'sent', sig });
            const bh = await conn.getLatestBlockhash('confirmed');
            const res = await conn.confirmTransaction({ signature: sig, ...bh }, 'confirmed');
            if (res && res.value && res.value.err) throw new Error('airdrop tx failed');
            touch(rec, { status: 'confirmed' });
            afterFunding();
            return { ok: true, sig };
        } catch (e) {
            const m = errText(e);
            const reason = `devnet エアドロップを受け取れませんでした（混雑・429・上限など）。${FAUCET_URL} から treasury アドレスへ受け取ってください。 / The devnet airdrop failed (usually rate-limited); get SOL at ${FAUCET_URL} for the treasury address. (${m.slice(0, 120)})`;
            touch(rec, { status: 'failed', error: m });
            return { ok: false, reason };
        }
    }

    const phantom = () => (typeof window !== 'undefined' ? (window.phantom && window.phantom.solana) || window.solana : null);

    // Sign with Phantom, send through OUR devnet connection (so a Phantom set to mainnet can never spend real SOL).
    async function phantomPay(rec, to, lamports, memo) {
        const p = phantom();
        if (!p) throw new Error('Phantom が見つかりません / Phantom wallet not found');
        const { Transaction, SystemProgram, PublicKey } = lib.web3;
        if (!p.publicKey) await p.connect();
        const payer = p.publicKey;
        const bh = await conn.getLatestBlockhash('confirmed');
        const tx = new Transaction({ feePayer: payer, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight });
        tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: new PublicKey(to), lamports }), memoIx(memo));
        const signed = await p.signTransaction(tx);
        const sig = await conn.sendRawTransaction(signed.serialize());
        touch(rec, { status: 'sent', sig });
        return { sig, payer: payer.toBase58(), bh };
    }
    async function confirmSig(rec, sig, bh) {
        const res = await conn.confirmTransaction({ signature: sig, blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight }, 'confirmed');
        if (res && res.value && res.value.err) throw new Error('on-chain error: ' + JSON.stringify(res.value.err));
        let slot = null;
        try { const st = await conn.getSignatureStatuses([sig]); slot = st.value[0] ? st.value[0].slot ?? null : null; } catch (e) { /* null */ }
        touch(rec, { status: 'confirmed', slot });
    }

    async function fundFromWallet(sol) {
        const lamports = Math.round(Number(sol) * 1e9);
        if (!conn || !treasuryKp) return { ok: false, reason: '先に有効化してください / enable chain mode first' };
        if (!Number.isFinite(lamports) || lamports <= 0 || lamports > 5e9) return { ok: false, reason: '金額が正しくありません / invalid amount' };
        const rec = newTx('fund', [], `zipangu:fund|${lamports}`);
        try {
            const { sig, bh } = await phantomPay(rec, addr.get('treasury'), lamports, rec.memo);
            await confirmSig(rec, sig, bh);
            afterFunding();
            return { ok: true, sig };
        } catch (e) {
            touch(rec, { status: 'failed', error: errText(e) });
            return { ok: false, reason: errText(e) };
        }
    }

    // x402-style hire: 402 quote → Phantom signs → confirm → verify the parsed tx → only then ok.
    async function hire(agentId, { lamports, request } = {}) {
        const fail = reason => { emit('hire', { phase: 'failed', agentId, reason }); return { ok: false, reason }; };
        if (!conn || !addr.has(agentId) || !agentKp.has(agentId)) return fail('エージェントのアドレスがありません / agent address unavailable (enable chain mode)');
        if (!request || typeof request.id !== 'string' || !request.id) return fail('依頼が正しくありません / invalid request');
        if (!Number.isInteger(lamports) || lamports <= 0 || lamports > MAX_HIRE_LAMPORTS) return fail('金額が正しくありません / invalid amount');
        const quote = { status: 402, payTo: addr.get(agentId), amount: lamports, currency: 'SOL', cluster: CLUSTER, memo: `zipangu:x402:${request.id}`, agent: agentId };
        emit('hire', { phase: 'quote', agentId, quote });
        const rec = newTx('hire', [{ action: 'hire', agent: agentId, district: null, place: null, good: null, qty: 1, amount: lamports / 1e9 }], quote.memo);
        try {
            emit('hire', { phase: 'signing', agentId, quote });
            const { sig, payer, bh } = await phantomPay(rec, quote.payTo, lamports, quote.memo);
            emit('hire', { phase: 'confirming', agentId, quote, sig });
            await confirmSig(rec, sig, bh);
            let verdict = { ok: false, reason: 'not fetched' };
            for (let i = 0; i < 6; i++) {
                const parsed = await conn.getParsedTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }).catch(() => null);
                verdict = verifyHireTx(parsed, quote, payer);
                if (verdict.ok || parsed) break;
                await sleep(800);
            }
            if (!verdict.ok) { touch(rec, { status: 'failed', error: 'verification: ' + verdict.reason }); return fail(verdict.reason); }
            emit('hire', { phase: 'verified', agentId, quote, sig });
            return { ok: true, sig };
        } catch (e) {
            touch(rec, { status: 'failed', error: errText(e) });
            return fail(errText(e));
        }
    }

    async function balanceOf(id) {
        if (!conn || !ata.has(id)) return null;
        try {
            const r = await conn.getTokenAccountBalance(new lib.web3.PublicKey(ata.get(id)), 'confirmed');
            return r && r.value ? r.value.uiAmount : null;
        } catch (e) { return null; }
    }

    function disable() {
        unsubs.forEach(u => u()); unsubs = [];
        if (timer) { clearInterval(timer); timer = null; }
        if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; persistNow(); }
        setState('off');
    }
    function reset() {
        disable();
        wipe();
        agentKp.clear(); placeKp.clear(); addr.clear(); ata.clear(); mirror.clear();
        treasuryKp = mintKp = null; txs = []; setupDone = false; treasuryLamports = null;
        batcher.clear(); settleQ.length = 0;
        emit('tx', null);
        setState('off');
    }
    function on(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
        return () => listeners.get(type).delete(fn);
    }

    const chain = {
        get state() { return state; },
        get error() { return error; },
        get treasury() { return treasuryKp ? addr.get('treasury') : null; },
        get treasuryLamports() { return treasuryLamports; },
        get mint() { return mintKp ? mintKp.publicKey.toBase58() : null; },
        get txs() { return txs; },
        get stats() {
            let confirmed = 0, failed = 0, pending = 0, volume = 0;
            for (const t of txs) {
                if (t.status === 'confirmed') { confirmed++; if (t.kind === 'trade') for (const o of t.ops) volume += o.amount || 0; }
                else if (t.status === 'failed') failed++;
                else pending++;
            }
            return { confirmed, failed, pending, volume: Math.round(volume * 100) / 100, since };
        },
        get queued() { return batcher.size + settleQ.length; },
        addressOf: id => addr.get(id) ?? null,
        ataOf: id => ata.get(id) ?? null,
        enable, requestAirdrop, fundFromWallet, setup, disable, balanceOf, hire, reset, on,
        flush   // extra: send one batch now (the timer calls this every ~2.5 s)
    };
    return chain;
}
