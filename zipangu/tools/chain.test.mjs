// Offline tests for js/chain.js (no network, no wallet): pure helpers + an engine flow against an
// injected fake Solana library. Run: node tools/chain.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';

// ---- importing chain.js must be side-effect free (the single-file offline build imports it)
let fetched = 0;
globalThis.fetch = () => { fetched++; throw new Error('network access at import time'); };
const realSetInterval = globalThis.setInterval;
let intervals = 0;
globalThis.setInterval = (...a) => { intervals++; return realSetInterval(...a); };
const chainMod = await import('../js/chain.js');
globalThis.setInterval = realSetInterval;
assert.equal(fetched, 0, 'no fetch at import');
assert.equal(intervals, 0, 'no timers at import');
const { CLUSTER, explorerTx, explorerAddr, createChain, opsFromTrade, encodeMemo, createBatcher, toBaseUnits, verifyHireTx } = chainMod;

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
const raw = {};
for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = read(stem + '.json');
raw.texts = read('library.texts.json', { works: {} });
const W = buildWorld(raw);

// ---- constants / links
assert.equal(CLUSTER, 'devnet');
assert.equal(explorerTx('abc'), 'https://explorer.solana.com/tx/abc?cluster=devnet');
assert.equal(explorerAddr('xyz'), 'https://explorer.solana.com/address/xyz?cluster=devnet');

// ---- toBaseUnits
assert.equal(toBaseUnits(12.345), 1235);
assert.equal(toBaseUnits(0.004), 0);
for (const bad of [-5, NaN, undefined, null, 'x', Infinity, -Infinity]) assert.equal(toBaseUnits(bad), 0, String(bad));
assert.equal(toBaseUnits('7'), 700);
assert.ok(Number.isInteger(toBaseUnits(1e300)));

// ---- opsFromTrade
const district = W.districts[0];
const place = W.placeOf(district.id);
const op = opsFromTrade(W, { action: 'buy', agent: 'a1', district: district.id, good: 'g1', qty: 3, total: 120.456, seq: 9 });
assert.deepEqual(op, { action: 'buy', agent: 'a1', district: district.id, place: place.id, good: 'g1', qty: 3, amount: 120.46, seq: 9 });
assert.equal(opsFromTrade(W, { action: 'sell', agent: 'a1', district: district.id, good: 'g', qty: 1, total: 5 }).action, 'sell');
assert.equal(opsFromTrade(W, { action: 'craft', agent: 'a1', district: district.id, good: 'g', qty: 1, total: 5 }).action, 'craft');
assert.equal(opsFromTrade(W, { action: 'buy', agent: 'a1', district: 'nowhere', total: 5 }), null);
assert.equal(opsFromTrade(W, { action: 'buy', agent: 'a1', district: district.id, total: 0 }), null);
assert.equal(opsFromTrade(W, { action: 'bogus', agent: 'a1', district: district.id, total: 5 }), null);
assert.equal(opsFromTrade(W, null), null);

// ---- encodeMemo
const bytes = s => new TextEncoder().encode(s).length;
const m1 = encodeMemo('trade', [op]);
assert.ok(m1.startsWith('zipangu:trade'));
assert.ok(m1.includes('b:a1@' + place.id));
const many = Array.from({ length: 40 }, (_, i) => ({ ...op, agent: 'agent_' + i + '_あいうえお', good: 'good_with_a_rather_long_identifier_' + i, amount: 123456.78 }));
const m2 = encodeMemo('trade', many, { topup: 'a:x:1' });
assert.ok(m2.startsWith('zipangu:'));
assert.ok(bytes(m2) <= 400, `memo ${bytes(m2)} bytes`);
assert.ok(/\|\+\d+$/.test(m2), 'truncation is counted');
assert.ok(bytes(encodeMemo('settle', [], { huge: 'あ'.repeat(500) })) <= 400, 'hard trim keeps ≤400 bytes');
assert.ok(encodeMemo('settle', [], { huge: 'あ'.repeat(500) }).startsWith('zipangu:settle'));
assert.ok(encodeMemo('trade', [{ ...op, merged: 2 }]).includes('batched'));
assert.ok(!/[\n;]/.test(encodeMemo('trade', [], { label: 'a;b\nc' }).split('|')[1] || ''), 'separators in values are sanitised');

// ---- batcher
{
    const b = createBatcher({ maxOps: 4, cap: 6 });
    for (let i = 0; i < 6; i++) b.push({ ...op, agent: 'a' + i, amount: 1, qty: 1 });
    assert.equal(b.size, 6);
    // at cap: same (agent, place, direction) merges; a different one still appends
    b.push({ ...op, agent: 'a0', amount: 2.5, qty: 2 });
    assert.equal(b.size, 6, 'merged, not appended');
    b.push({ ...op, agent: 'a0', action: 'sell', amount: 1, qty: 1 });
    assert.equal(b.size, 7, 'opposite direction is a different transfer');
    const first = b.take();
    assert.equal(first.length, 4);
    assert.equal(first[0].amount, 3.5);
    assert.equal(first[0].qty, 3);
    assert.ok(first[0].merged >= 2);
    assert.equal(b.size, 3);
    assert.equal(b.push({ ...op, amount: 0 }), false, 'zero amount rejected');
    b.clear(); assert.equal(b.size, 0);
}

// ---- verifyHireTx
{
    const quote = { payTo: 'AGENT', amount: 5000, memo: 'zipangu:x402:r1' };
    const parsed = (over = {}) => ({
        meta: { err: null },
        transaction: { message: { instructions: [
            { program: 'system', parsed: { type: 'transfer', info: { source: 'ME', destination: 'AGENT', lamports: 5000 } } },
            { program: 'spl-memo', programId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', parsed: 'zipangu:x402:r1' }
        ] } }, ...over
    });
    assert.equal(verifyHireTx(parsed(), quote, 'ME').ok, true);
    assert.equal(verifyHireTx(null, quote, 'ME').ok, false);
    assert.equal(verifyHireTx(parsed({ meta: { err: {} } }), quote, 'ME').ok, false);
    assert.equal(verifyHireTx(parsed(), { ...quote, amount: 4999 }, 'ME').ok, false);
    assert.equal(verifyHireTx(parsed(), { ...quote, payTo: 'OTHER' }, 'ME').ok, false);
    assert.equal(verifyHireTx(parsed(), { ...quote, memo: 'zipangu:x402:r2' }, 'ME').ok, false);
    assert.equal(verifyHireTx(parsed(), quote, 'SOMEONE').ok, false);
}

// ---- fake Solana library
let uid = 0;
const hex = u8 => Array.from(u8, b => b.toString(16).padStart(2, '0')).join('');
class PublicKey {
    constructor(v) { this.s = typeof v === 'string' ? v : 'K' + hex(v); }
    toBase58() { return this.s; }
    toBytes() { return new Uint8Array(32); }
    equals(o) { return o.s === this.s; }
}
class Keypair {
    constructor(secret) { this.secretKey = secret; this.publicKey = new PublicKey('P' + hex(secret.slice(0, 8))); }
    static generate() { const s = new Uint8Array(64); for (let i = 0; i < 64; i++) s[i] = Math.floor(Math.random() * 256); s[0] = uid++ & 255; s[1] = (uid >> 8) & 255; return new Keypair(s); }
    static fromSecretKey(s) { return new Keypair(s); }
}
class Transaction {
    constructor(o) { this.ixs = []; this.o = o; }
    add(...x) { this.ixs.push(...x); return this; }
    sign() {}
    serialize() { return { ixs: this.ixs }; }
}
class TransactionInstruction { constructor(o) { this.t = 'memo'; this.text = Buffer.from(o.data).toString('utf8'); } }
function makeLib(net) {
    class Connection {
        constructor(url) { this.url = url; }
        async getBalance() { return net.lamports; }
        async getAccountInfo() { return net.mintExists ? { data: new Uint8Array(82) } : null; }
        async getMultipleAccountsInfo(ks) { return ks.map(() => null); }
        async getLatestBlockhash() { return { blockhash: 'bh' + ++net.bh, lastValidBlockHeight: 1000 }; }
        async sendRawTransaction(tx) {
            net.sendAttempts++;
            const err = net.sendErrors.shift();
            if (err) throw new Error(err);
            const sig = 'SIG' + ++net.sigs;
            net.sent.push({ sig, ixs: tx.ixs });
            net.sigSet.add(sig);
            if (tx.ixs.some(i => i.t === 'mintTo' && !net.mintExists)) { /* setup tx */ }
            return sig;
        }
        async confirmTransaction() {
            const err = net.confirmErrors.shift();
            if (err) throw new Error(err);
            return { value: { err: null } };
        }
        async getSignatureStatuses(sigs) { return { value: sigs.map(() => ({ slot: 4242, confirmationStatus: 'confirmed' })) }; }
        async requestAirdrop() { throw new Error('429 Too Many Requests: airdrop limit'); }
        async getMinimumBalanceForRentExemptMint() { return 1461600; }
    }
    const web3 = {
        Connection, PublicKey, Keypair, Transaction, TransactionInstruction, LAMPORTS_PER_SOL: 1e9,
        SystemProgram: { createAccount: o => ({ t: 'createAccount', o }), transfer: o => ({ t: 'sol', o }) }
    };
    const token = {
        MINT_SIZE: 82, TOKEN_PROGRAM_ID: new PublicKey('TOKEN'),
        getMinimumBalanceForRentExemptMint: () => 1461600,
        getAssociatedTokenAddressSync: (mint, owner) => new PublicKey('ATA' + owner.toBase58()),
        createInitializeMintInstruction: () => ({ t: 'initMint' }),
        createAssociatedTokenAccountIdempotentInstruction: () => ({ t: 'ata' }),
        createApproveInstruction: () => ({ t: 'approve' }),
        createMintToInstruction: (m, a, auth, amt) => ({ t: 'mintTo', dest: a.toBase58(), amt }),
        createTransferInstruction: (s, d, auth, amt) => ({ t: 'transfer', src: s.toBase58(), dst: d.toBase58(), amt })
    };
    return { web3, token };
}
const fakeNet = (over = {}) => ({ lamports: 2e9, bh: 0, sigs: 0, sendAttempts: 0, sent: [], sigSet: new Set(), sendErrors: [], confirmErrors: [], mintExists: false, ...over });
function fakeEco() {
    const ls = { trade: new Set(), settle: new Set() };
    const agents = new Map(W.agents.map(a => [a.id, { id: a.id, wallet: 10000 }]));
    return {
        agents,
        on: (t, fn) => { ls[t].add(fn); return () => ls[t].delete(fn); },
        emit: (t, m) => ls[t].forEach(fn => fn(m)),
        listeners: () => ls.trade.size + ls.settle.size
    };
}
const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), m }; };
const trade = (n, action = 'buy', total = 10) => ({ type: 'trade', seq: n, action, agent: W.agents[n % 5].id, district: W.districts[n % 7].id, good: W.goods[n % 5].id, qty: 2, price: total / 2, total });
const isTransfer = i => i.t === 'transfer', isMemo = i => i.t === 'memo';

// ---- flow: enable → setup → live, then batching
{
    const net = fakeNet(), eco = fakeEco(), store = memStore();
    const chain = createChain(W, eco, { storage: store, loadLib: async () => makeLib(net) });
    const states = [];
    chain.on('state', s => states.push(s));
    assert.equal(chain.state, 'off');
    assert.equal(chain.treasury, null);
    await chain.enable();
    assert.equal(chain.state, 'live', chain.error);
    assert.ok(states.includes('loading') && states.includes('setting-up'));
    assert.ok(chain.treasury && chain.mint);
    assert.equal(chain.addressOf('treasury'), chain.treasury);
    assert.ok(chain.addressOf(W.agents[0].id) && chain.ataOf(W.agents[0].id));
    assert.ok(chain.addressOf(W.eras[0].id) && chain.ataOf(W.realms[0].id));
    assert.equal(chain.addressOf('nobody'), null);
    const setupTxs = chain.txs.filter(t => t.kind === 'setup');
    assert.ok(setupTxs.length >= 2 && setupTxs.every(t => t.status === 'confirmed' && t.sig && t.slot === 4242));
    assert.ok(setupTxs.every(t => t.memo.startsWith('zipangu:setup')));
    assert.ok(eco.listeners() === 4 - 2, 'subscribed to trade + settle');

    // every owner got ATA + approve; mint to agents = wallet, to vaults = 1,000,000
    const mints = net.sent.flatMap(s => s.ixs).filter(i => i.t === 'mintTo');
    assert.equal(mints.length, W.agents.length + W.eras.length + W.realms.length);
    assert.ok(mints.some(m => m.amt === 1000000n * 100n) && mints.some(m => m.amt === 1000000n));

    // 11 trades → batches of ≤4 transfers, one memo each, one tx at a time
    net.sent.length = 0;
    for (let i = 0; i < 11; i++) eco.emit('trade', trade(i));
    assert.equal(chain.queued, 11);
    await chain.flush(); await chain.flush(); await chain.flush(); await chain.flush();
    const batches = net.sent.map(s => s.ixs);
    assert.equal(batches.length, 3, '11 ops → 4 + 4 + 3');
    for (const ixs of batches) {
        assert.ok(ixs.filter(isTransfer).length <= 4);
        assert.equal(ixs.filter(isMemo).length, 1);
        const memo = ixs.find(isMemo).text;
        assert.ok(memo.startsWith('zipangu:') && bytes(memo) <= 400);
    }
    assert.deepEqual(batches.map(b => b.filter(isTransfer).length), [4, 4, 3]);
    const tradeTxs = chain.txs.filter(t => t.kind === 'trade');
    assert.equal(tradeTxs.length, 3);
    assert.ok(tradeTxs.every(t => t.status === 'confirmed' && net.sigSet.has(t.sig) && t.slot === 4242));
    assert.ok(tradeTxs.every(t => t.memo.startsWith('zipangu:trade') && t.ops.length <= 4));
    assert.equal(chain.txs[0].id !== chain.txs[1].id, true);
    assert.equal(chain.stats.pending, 0);
    assert.equal(chain.stats.volume, 110);
    assert.ok(chain.stats.confirmed >= 3 + setupTxs.length);

    // sell reverses direction
    net.sent.length = 0;
    eco.emit('trade', trade(1, 'buy', 5)); eco.emit('trade', trade(1, 'sell', 5));
    await chain.flush();
    const [t1, t2] = net.sent[0].ixs.filter(isTransfer);
    assert.equal(t1.src, t2.dst); assert.equal(t1.dst, t2.src);

    // settle → memo-only tx
    net.sent.length = 0;
    eco.emit('settle', { kind: 'dawn', day: 3, label: '明け六つ', sales: 12, volume: 3456.7, top: W.agents[0].id, topProfit: 99.4 });
    await chain.flush();
    assert.equal(net.sent[0].ixs.length, 1);
    assert.ok(net.sent[0].ixs[0].text.startsWith('zipangu:settle'));
    assert.equal(chain.txs[0].kind, 'settle');
    assert.equal(chain.txs[0].status, 'confirmed');

    // low source balance → labelled mintTo top-up before the transfer
    net.sent.length = 0;
    eco.emit('trade', { ...trade(2), total: 50000 });   // wallet is only 10,000
    await chain.flush();
    const ixs = net.sent[0].ixs;
    assert.equal(ixs[0].t, 'mintTo');
    assert.equal(ixs[1].t, 'transfer');
    assert.ok(ixs.find(isMemo).text.includes('topup='));

    // persistence: same storage → same keys, history kept; secrets never leave storage
    const treasury = chain.treasury;
    chain.disable();
    assert.equal(chain.state, 'off');
    assert.equal(eco.listeners(), 0, 'disable unsubscribes');
    const saved = JSON.parse(store.getItem('zipangu.chain.v1'));
    assert.equal(saved.v, 1);
    assert.ok(Array.isArray(saved.treasury) && saved.txs.length > 3 && saved.setupDone === true);
    const again = createChain(W, eco, { storage: store, loadLib: async () => makeLib(net) });
    net.mintExists = true;
    await again.enable();
    assert.equal(again.state, 'live');
    assert.equal(again.treasury, treasury);
    assert.ok(again.txs.length > 3);
    again.disable();
    again.reset();
    assert.equal(store.getItem('zipangu.chain.v1'), null);
    assert.equal(again.state, 'off');
}

// ---- failures are marked failed, never confirmed, never given a sig
{
    const net = fakeNet(), eco = fakeEco();
    const chain = createChain(W, eco, { storage: memStore(), loadLib: async () => makeLib(net) });
    await chain.enable();
    assert.equal(chain.state, 'live');

    net.sendErrors.push('simulation failed: custom program error 0x1');
    eco.emit('trade', trade(1));
    await chain.flush();
    let t = chain.txs[0];
    assert.equal(t.status, 'failed'); assert.equal(t.sig, null); assert.equal(t.slot, null);
    assert.match(t.error, /0x1/);
    assert.equal(chain.stats.failed, 1);

    // one retry on blockhash expiry, then success
    net.sendErrors.push('Blockhash not found');
    const before = net.sendAttempts;
    eco.emit('trade', trade(2));
    await chain.flush();
    t = chain.txs[0];
    assert.equal(net.sendAttempts - before, 2);
    assert.equal(t.status, 'confirmed'); assert.ok(net.sigSet.has(t.sig));

    // expiry twice → failed with the message
    net.sendErrors.push('Blockhash not found', 'Blockhash not found');
    eco.emit('trade', trade(3));
    await chain.flush();
    t = chain.txs[0];
    assert.equal(t.status, 'failed'); assert.equal(t.sig, null);
    assert.match(t.error, /Blockhash/);

    // confirmation timeout: sig is real (RPC returned it) but status is failed, not confirmed
    net.confirmErrors.push('Transaction was not confirmed in 30.00 seconds');
    eco.emit('trade', trade(4));
    await chain.flush();
    t = chain.txs[0];
    assert.equal(t.status, 'failed'); assert.ok(net.sigSet.has(t.sig)); assert.match(t.error, /not confirmed/);

    // invariants over everything recorded
    for (const x of chain.txs) {
        if (x.status === 'confirmed') assert.ok(net.sigSet.has(x.sig), 'confirmed ⇒ RPC-issued sig');
        if (x.sig) assert.ok(net.sigSet.has(x.sig), 'no invented sig: ' + x.sig);
        if (x.status === 'failed') assert.ok(x.error);
    }
    chain.disable();
}

// ---- needs-funds, airdrop failure, setup resume
{
    const net = fakeNet({ lamports: 0 }), eco = fakeEco();
    const chain = createChain(W, eco, { storage: memStore(), loadLib: async () => makeLib(net) });
    await chain.enable();
    assert.equal(chain.state, 'needs-funds');
    assert.equal(chain.treasuryLamports, 0);
    const r = await chain.requestAirdrop();
    assert.equal(r.ok, false);
    assert.ok(r.reason.includes('https://faucet.solana.com'));
    assert.equal(chain.txs[0].status, 'failed'); assert.equal(chain.txs[0].sig, null);
    const f = await chain.fundFromWallet(1);
    assert.equal(f.ok, false);                      // no Phantom in Node
    assert.equal(chain.state, 'needs-funds');
    net.lamports = 2e9;
    await chain.setup();
    assert.equal(chain.state, 'live', chain.error);
    chain.disable();
}
{   // a setup tx that fails midway ends in 'error' (not live) and can be resumed
    const net = fakeNet(), eco = fakeEco();
    net.sendErrors.push('x', 'x');   // mint creation fails (twice: no retry on non-expiry, but keep it robust)
    const chain = createChain(W, eco, { storage: memStore(), loadLib: async () => makeLib(net) });
    await chain.enable();
    assert.equal(chain.state, 'error');
    assert.ok(chain.error);
    net.sendErrors.length = 0;
    await chain.enable();
    assert.equal(chain.state, 'live', chain.error);
    chain.disable();
}
{   // library load failure → error state, no throw
    const chain = createChain(W, fakeEco(), { storage: memStore(), loadLib: async () => { throw new Error('offline'); } });
    await chain.enable();
    assert.equal(chain.state, 'error');
    assert.match(chain.error, /offline/);
}
{   // hire refuses before enable / on bad input
    const chain = createChain(W, fakeEco(), { storage: memStore(), loadLib: async () => makeLib(fakeNet()) });
    const phases = [];
    chain.on('hire', m => phases.push(m.phase));
    assert.equal((await chain.hire(W.agents[0].id, { lamports: 1000, request: { id: 'r' } })).ok, false);
    assert.deepEqual(phases, ['failed']);
}

{   // inscribe: a memo-only tx paid by the treasury (birth certificates); fee only, no setup needed
    const net = fakeNet({ lamports: 50_000 });
    const chain = createChain(W, fakeEco(), { storage: memStore(), loadLib: async () => makeLib(net) });
    assert.equal((await chain.inscribe('birth', 'zipangu:birth|v=1')).reason, 'off', 'refused before enable');
    await chain.enable();
    assert.equal(chain.state, 'needs-funds', 'too little for the token setup');
    const r = await chain.inscribe('birth', 'zipangu:birth|v=1|id=trav_x|h=' + 'a'.repeat(64));
    assert.equal(r.ok, true);
    assert.match(r.sig, /^SIG/);
    assert.equal(r.slot, 4242);
    assert.equal(net.sent.at(-1).ixs.length, 1, 'a single memo instruction');
    assert.equal(net.sent.at(-1).ixs[0].text, 'zipangu:birth|v=1|id=trav_x|h=' + 'a'.repeat(64));
    assert.equal(chain.txs[0].kind, 'birth');
    assert.equal((await chain.inscribe('birth', 'not ours')).reason, 'memo');
    assert.equal((await chain.inscribe('birth', 'zipangu:' + 'x'.repeat(500))).reason, 'memo');
    net.lamports = 0;
    assert.equal((await chain.inscribe('birth', 'zipangu:birth|v=1')).reason, 'funds');
    assert.equal(await chain.parsedTx('SIG1'), null, 'an RPC without the method reads as not found');
    chain.disable();
}

console.log('chain.test.mjs ok');
