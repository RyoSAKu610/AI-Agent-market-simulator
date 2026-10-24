// Offline tests for js/chain-zcash.js (Zcash testnet) and the relay
// (netlify/functions/zipangu-zcash.mjs): the engine against a stand-in Zebra node that keeps a
// real UTXO set, a mempool and blocks, and recomputes every submitted transaction's txid from its
// bytes. Signing is stubbed here (secp256k1 is @noble/curves in the page; see the PR for the run
// with the real library).
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import {
    hexToBytes, bytesToHex, txid as txidOf, txidToHex, decodeTaddr, scriptForTaddr, taddrFromPubkey, opReturnScript, p2pkhScript, sighashAll
} from '../js/zcash.js';
import { opReturnData } from '../js/chain-read.js';

let fetched = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = () => { fetched++; throw new Error('network access at import time'); };
const realSetInterval = globalThis.setInterval;
let intervals = 0;
globalThis.setInterval = (...a) => { intervals++; return realSetInterval(...a); };
const { createChain, hireTag, verifyZcashPayment } = await import('../js/chain-zcash.js');
globalThis.setInterval = realSetInterval;
globalThis.fetch = realFetch;
assert.equal(fetched, 0, 'no fetch at import');
assert.equal(intervals, 0, 'no timers at import');

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'world');
const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
const raw = {};
for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = read(stem + '.json');
const W = buildWorld(raw);

// ---- a stand-in for @noble/curves: deterministic keys and DER-shaped signatures (not checked here)
let keySeq = 0;
const fakeNoble = {
    secp256k1: {
        utils: { randomPrivateKey: () => new Uint8Array(createHash('sha256').update('k' + ++keySeq).digest()) },
        getPublicKey: (priv, compressed) => { assert.equal(compressed, true); return Uint8Array.of(2, ...createHash('sha256').update(priv).digest()); },
        sign: (digest, priv, opts) => {
            assert.equal(digest.length, 32); assert.equal(opts.prehash, false); assert.equal(opts.lowS, true);
            const r = createHash('sha256').update(Buffer.concat([Buffer.from(digest), Buffer.from(priv)])).digest();
            return { toDERRawBytes: () => Uint8Array.of(0x30, 0x44, 0x02, 0x20, ...r, 0x02, 0x20, ...r.reverse()) };
        }
    }
};

// ---- a stand-in Zebra node
function parseV5(hex) {
    const b = hexToBytes(hex); let i = 0;
    const u32 = () => { const v = new DataView(b.buffer, i, 4).getUint32(0, true); i += 4; return v; };
    const u64 = () => { const v = new DataView(b.buffer, i, 8).getBigUint64(0, true); i += 8; return v; };
    const cs = () => b[i++];
    const take = n => { const s = b.slice(i, i + n); i += n; return s; };
    assert.equal(u32(), 0x80000005); assert.equal(u32(), 0x26a7270a);
    const branchId = u32(), lockTime = u32(), expiryHeight = u32();
    const vin = [], vout = [];
    for (let n = cs(); n > 0; n--) vin.push({ txid: txidToHex(take(32)), vout: u32(), scriptSig: take(cs()), sequence: u32() });
    for (let n = cs(); n > 0; n--) { const value = u64(); vout.push({ value, script: take(cs()) }); }
    assert.deepEqual([...take(3)], [0, 0, 0], 'transparent only');
    assert.equal(i, b.length, 'nothing left over');
    return { branchId, lockTime, expiryHeight, vin, vout };
}
function makeNode(over = {}) {
    const node = {
        chain: 'test', blocks: 4_500_000, branch: '77190ad9', utxos: new Map(), mempool: new Map(), txs: new Map(), calls: [], sent: [],
        autoMine: false, rejectNext: null, lieTxid: false, status: 200, ...over
    };
    const addrOfScript = s => { const h = bytesToHex(s); return h.startsWith('76a914') && h.endsWith('88ac') && h.length === 50 ? h.slice(6, 46) : null; };
    node.owner = new Map();                      // hash160 hex → address
    node.track = addr => node.owner.set(bytesToHex(decodeTaddr(addr).hash), addr);
    const json = tx => ({
        hex: tx.hex, height: tx.height ?? undefined, confirmations: tx.height != null ? node.blocks - tx.height + 1 : 0,
        vout: tx.vout.map((o, n) => ({ n, value: Number(o.value) / 1e8, valueZat: Number(o.value), scriptPubKey: { hex: bytesToHex(o.script), type: o.script[0] === 0x6a ? 'nulldata' : 'pubkeyhash', addresses: node.owner.has(addrOfScript(o.script)) ? [node.owner.get(addrOfScript(o.script))] : undefined } }))
    });
    node.mine = () => {
        node.blocks++;
        for (const [id, tx] of node.mempool) {
            for (const i of tx.vin) node.utxos.delete(`${i.txid}:${i.vout}`);
            tx.vout.forEach((o, n) => { const h = addrOfScript(o.script); if (h && node.owner.has(h)) node.utxos.set(`${id}:${n}`, { address: node.owner.get(h), txid: id, outputIndex: n, script: bytesToHex(o.script), satoshis: Number(o.value), height: node.blocks }); });
            tx.height = node.blocks; node.txs.set(id, tx);
        }
        node.mempool.clear();
    };
    // a payment from someone's wallet, mined in the next block
    node.pay = (addr, zats) => {
        node.track(addr);
        const id = createHash('sha256').update('pay' + node.txs.size + addr + zats).digest('hex');
        node.mempool.set(id, { hex: '00', vin: [], vout: [{ value: BigInt(zats), script: scriptForTaddr(addr) }] });
        node.mine();
        return id;
    };
    const handle = (method, params) => {
        node.calls.push(method);
        if (method === 'getblockchaininfo') return { chain: node.chain, blocks: node.blocks, consensus: { chaintip: node.branch, nextblock: node.branch } };
        if (method === 'getaddressbalance') return { balance: [...node.utxos.values()].filter(u => params[0].addresses.includes(u.address)).reduce((n, u) => n + u.satoshis, 0), received: 0 };
        if (method === 'getaddressutxos') return [...node.utxos.values()].filter(u => params[0].addresses.includes(u.address));
        if (method === 'getaddresstxids') {
            const { addresses, start, end } = params[0];
            return [...node.txs.entries()].filter(([, t]) => t.height >= start && t.height <= end && t.vout.some(o => addresses.includes(node.owner.get(addrOfScript(o.script))))).map(([id]) => id);
        }
        if (method === 'getrawtransaction') {
            const t = node.txs.get(params[0]) || node.mempool.get(params[0]);
            if (!t) throw Object.assign(new Error('No such mempool or main chain transaction'), { code: -5 });
            return json(t);
        }
        if (method === 'sendrawtransaction') {
            if (node.rejectNext) { const m = node.rejectNext; node.rejectNext = null; throw Object.assign(new Error(m), { code: -26 }); }
            const tx = parseV5(params[0]);
            assert.equal(tx.branchId, parseInt(node.branch, 16), 'signed for the current branch');
            assert.ok(tx.expiryHeight > node.blocks && tx.expiryHeight <= node.blocks + 40, 'expires a little after the tip');
            let inValue = 0n;
            tx.vin.forEach((i, k) => {
                const u = node.utxos.get(`${i.txid}:${i.vout}`);
                if (!u) throw Object.assign(new Error('bad-txns-inputs-missingorspent'), { code: -25 });
                i.value = BigInt(u.satoshis); i.scriptPubKey = hexToBytes(u.script);
                // the scriptSig is <DER+0x01> <33-byte key> and the key hashes to the coin's address
                const sig = i.scriptSig; const sl = sig[0];
                assert.equal(sig[sl], 0x01, 'SIGHASH_ALL'); assert.equal(sig[sl + 1], 33);
                assert.equal(taddrFromPubkey(sig.slice(sl + 2)), u.address, 'signed by the coin’s key');
                void k;
            });
            const outValue = tx.vout.reduce((n, o) => n + o.value, 0n);
            const fee = inValue + tx.vin.reduce((n, i) => n + i.value, 0n) - outValue;
            assert.ok(fee >= 10000n, 'pays at least the ZIP 317 grace fee');
            const ops = tx.vout.filter(o => o.script[0] === 0x6a);
            assert.equal(ops.length, 1, 'one OP_RETURN');
            assert.ok(opReturnData(bytesToHex(ops[0].script)).length <= 80);
            const id = txidOf(tx);
            tx.hex = params[0];
            node.mempool.set(id, tx); node.sent.push({ id, tx, fee, memo: new TextDecoder().decode(opReturnData(bytesToHex(ops[0].script))) });
            if (node.autoMine) node.mine();
            return node.lieTxid ? 'ff'.repeat(32) : id;
        }
        throw Object.assign(new Error('Method not found'), { code: -32601 });
    };
    node.fetch = async (url, init) => {
        node.url = url;
        if (node.status !== 200) return { ok: false, status: node.status, json: async () => ({ error: 'not_configured' }) };
        const { method, params, jsonrpc } = JSON.parse(init.body);
        assert.equal(jsonrpc, '1.0');
        try { const result = handle(method, params); return { ok: true, status: 200, json: async () => ({ result, error: null }) }; }
        catch (e) { if (e instanceof assert.AssertionError) throw e; return { ok: true, status: 200, json: async () => ({ result: null, error: { code: e.code ?? -1, message: e.message } }) }; }
    };
    return node;
}
const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
function fakeEco() {
    const ls = { trade: new Set(), settle: new Set() };
    return { agents: new Map(W.agents.map(a => [a.id, { id: a.id, wallet: 10000 }])), on: (t, fn) => { ls[t].add(fn); return () => ls[t].delete(fn); }, emit: (t, m) => ls[t].forEach(fn => fn(m)), listeners: () => ls.trade.size + ls.settle.size };
}
const trade = (n, action = 'buy', total = 10) => ({ type: 'trade', seq: n, action, agent: W.agents[n % 5].id, district: W.districts[n % 7].id, good: W.goods[n % 5].id, qty: 2, total });
const make = (node, store = memStore(), eco = fakeEco()) => createChain(W, eco, { storage: store, rpc: 'https://relay.example/zcash', fetch: node.fetch, loadLib: async () => fakeNoble, pollMs: 20 });

// ------------------------------------------------ pure helpers
assert.equal(hireTag('a'), hireTag('a'));
for (const id of ['x', 'trav_1-abc', 'agent-lx2']) assert.ok(hireTag(id) >= 1 && hireTag(id) <= 999);
{
    const tm = 'tmYXBYJj1K7vhejSec5osXK2QsGa5MTisUQ';
    const q = { payTo: tm, amount: '100437' };
    const rawTx = (zats, confirmations = 1, script = bytesToHex(scriptForTaddr(tm))) => ({ confirmations, vout: [{ valueZat: zats, scriptPubKey: { hex: script } }] });
    assert.equal(verifyZcashPayment(rawTx(100437), q).ok, true);
    assert.equal(verifyZcashPayment(rawTx(100438), q).ok, false, 'one zatoshi off');
    assert.equal(verifyZcashPayment(rawTx(100437, 0), q).ok, false, 'still in the mempool');
    assert.equal(verifyZcashPayment(rawTx(100437, 1, bytesToHex(p2pkhScript(new Uint8Array(20)))), q).ok, false, 'someone else');
    assert.equal(verifyZcashPayment(null, q).ok, false);
}

// ------------------------------------------------ flow
{
    const node = makeNode(), store = memStore(), eco = fakeEco();
    const chain = make(node, store, eco);
    assert.equal(chain.network.id, 'zcash-testnet');
    assert.equal(chain.hasSetup, false); assert.equal(chain.balanceSymbol, 'TAZ');
    await chain.enable();
    assert.equal(chain.state, 'needs-funds', chain.error);
    assert.ok(decodeTaddr(chain.treasury), 'a testnet transparent address: ' + chain.treasury);
    assert.ok(chain.treasury.startsWith('tm'));
    assert.equal(chain.balance, 0);
    assert.ok(chain.addressOf(W.agents[0].id).startsWith('tm'));
    assert.equal(node.url, 'https://relay.example/zcash');
    assert.match(chain.fundUri('0.05'), /^zcash:tm[1-9A-HJ-NP-Za-km-z]{33}\?amount=0\.05&label=/);
    assert.equal((await chain.requestAirdrop()).ok, false);

    node.track(chain.treasury);
    node.pay(chain.treasury, 1_000_000);
    await chain.checkFunds();
    assert.equal(chain.state, 'live');
    assert.equal(chain.balance, 0.01);
    assert.equal(eco.listeners(), 2);

    // trades → one receipt per confirmed coin; memo ≤ 80 bytes; the node's txid is ours
    for (let i = 0; i < 5; i++) eco.emit('trade', trade(i));
    await chain.flush();
    assert.equal(node.sent.length, 1);
    const r1 = chain.txs.find(t => t.kind === 'trade');
    assert.equal(r1.status, 'sent'); assert.equal(r1.sig, node.sent[0].id);
    assert.ok(node.sent[0].memo.startsWith('zipangu:trade|n=5|v=50|'));
    assert.ok(new TextEncoder().encode(node.sent[0].memo).length <= 80);
    assert.equal(node.sent[0].fee, 20000n, 'the ZIP 317 fee: one input, change + memo');
    // the change is not in a block yet: the next batch waits, nothing is double-spent
    eco.emit('trade', trade(7));
    await chain.flush();
    assert.equal(node.sent.length, 1, 'waits for the change to confirm');
    assert.equal(chain.queued, 1);
    node.mine();
    await chain.flush();
    assert.equal(r1.status, 'confirmed'); assert.equal(r1.slot, node.blocks);
    assert.equal(node.sent.length, 2, 'the next receipt spends the confirmed change');
    assert.equal(chain.queued, 0);
    node.mine();

    // settle → a receipt
    eco.emit('settle', { kind: 'dawn', day: 3, label: '明け六つ', sales: 12, volume: 3456.7, top: W.agents[0].id, topProfit: 99.4 });
    await chain.flush();
    assert.ok(node.sent.at(-1).memo.startsWith('zipangu:settle|day=3'));
    node.mine();
    await chain.flush();
    assert.equal(chain.txs.find(t => t.kind === 'settle').status, 'confirmed');

    // a birth certificate (the compact memo that fits 80 bytes) and reading it back
    node.autoMine = true;
    const memo = 'zipangu:b1|trav_abc123|' + 'A'.repeat(43);
    const ins = await chain.inscribe('birth', memo);
    assert.equal(ins.ok, true, ins.reason);
    assert.equal(ins.slot, node.blocks);
    assert.deepEqual(await chain.readMemo(ins.sig), { status: 'ok', memo, slot: node.blocks });
    assert.equal((await chain.readMemo('00'.repeat(32))).status, 'notfound');
    assert.equal((await chain.inscribe('birth', 'zipangu:birth|v=1|id=trav_abc123|h=' + 'a'.repeat(64))).reason, 'memo', 'the long memo does not fit an OP_RETURN');
    node.autoMine = false;

    // hire: the quote carries a per-request tag; only an exact, confirmed payment counts
    const a0 = W.agents[0].id;
    const q = chain.quote(a0, 'req-1');
    assert.equal(q.status, 402); assert.equal(q.currency, 'TAZ');
    assert.equal(q.amount, String(100000 + hireTag('req-1')));
    assert.match(q.uri, new RegExp(`^zcash:${q.payTo}\\?amount=0\\.001\\d+&label=Kaleidoscope%20Zipangu&message=zipangu%3Ax402%3Areq-1$`));
    const phases = [];
    chain.on('hire', m => phases.push(m.phase));
    const pending = chain.hire(a0, { request: { id: 'req-1' } });
    await new Promise(r => setTimeout(r, 50));
    node.pay(q.payTo, Number(q.amount) + 1);          // the wrong amount: ignored
    await new Promise(r => setTimeout(r, 50));
    const paid = node.pay(q.payTo, Number(q.amount));
    const h = await pending;
    assert.equal(h.ok, true, h.reason); assert.equal(h.sig, paid);
    assert.deepEqual(phases.filter((p, i) => p !== phases[i - 1]), ['quote', 'signing', 'verified']);
    const hireRec = chain.txs.find(t => t.kind === 'hire');
    assert.equal(hireRec.status, 'confirmed'); assert.equal(hireRec.sig, paid);
    // the same payment cannot hire twice
    const again = await chain.hire(a0, { request: { id: 'req-1' }, timeoutMs: 100 });
    assert.equal(again.ok, false);
    // a visitor who pays as soon as the QR shows, and asks us to look a few blocks later
    const early = chain.quote(a0, 'req-early');
    assert.equal(early.since, node.blocks, 'the quote remembers the block it was shown at');
    const paidEarly = node.pay(early.payTo, Number(early.amount));
    node.mine(); node.mine(); node.mine();
    const h2 = await chain.hire(a0, { request: { id: 'req-early' }, timeoutMs: 2000 });
    assert.equal(h2.ok, true, h2.reason); assert.equal(h2.sig, paidEarly);
    const ctl = new AbortController(); ctl.abort();
    assert.match((await chain.hire(a0, { request: { id: 'req-9' }, signal: ctl.signal })).reason, /cancelled/);
    assert.equal(chain.quote(W.eras[0].id, 'r'), null, 'markets are not hired');
    assert.ok(await chain.balanceOf(a0) > 0.002);

    // a node that answers another txid, or rejects: failed, never confirmed, the coin is free again
    node.lieTxid = true;
    eco.emit('trade', trade(9));
    await chain.flush();
    assert.equal(chain.txs[0].status, 'failed'); assert.match(chain.txs[0].error, /another txid/);
    node.lieTxid = false; node.mempool.clear();
    node.rejectNext = 'bad-txns-fee';
    eco.emit('trade', trade(10));
    await chain.flush();
    assert.equal(chain.txs[0].status, 'failed'); assert.equal(chain.txs[0].sig, null);
    eco.emit('trade', trade(11));
    await chain.flush();
    assert.equal(chain.txs[0].status, 'sent', 'the coin was freed and spent again');
    // a receipt that never gets into a block fails once past its expiry height
    const lost = chain.txs[0];
    node.mempool.delete(lost.sig);
    node.blocks += 41;
    await chain.flush();
    assert.equal(lost.status, 'failed'); assert.match(lost.error, /expired/);
    for (const x of chain.txs) if (x.status === 'confirmed') assert.ok(node.txs.has(x.sig), 'confirmed ⇒ in a block');

    // persistence: same keys, the ledger and the used payments survive
    const treasury = chain.treasury, n = chain.txs.length;
    chain.disable();
    assert.equal(eco.listeners(), 0);
    const saved = JSON.parse(store.getItem('zipangu.chain.zcash-testnet.v1'));
    assert.equal(saved.net, 'zcash-testnet'); assert.ok(saved.used.includes(paid));
    const back = make(node, store, eco);
    await back.enable();
    assert.equal(back.treasury, treasury); assert.equal(back.txs.length, n);
    back.disable(); back.reset();
    assert.equal(store.getItem('zipangu.chain.zcash-testnet.v1'), null);
}

// ------------------------------------------------ refusals
{
    const main = makeNode({ chain: 'main' });
    const c1 = make(main);
    await c1.enable();
    assert.equal(c1.state, 'error'); assert.match(c1.error, /not on testnet/);
    const odd = makeNode({ branch: 'e9ff75a6' });          // Canopy: v5 is not valid there
    const c2 = make(odd);
    await c2.enable();
    assert.equal(c2.state, 'error'); assert.match(c2.error, /unknown network upgrade/);
    const off = makeNode({ status: 503 });
    const c3 = make(off);
    await c3.enable();
    assert.equal(c3.state, 'error'); assert.match(c3.error, /ZIPANGU_ZCASH_RPC_URL/);
    const c4 = createChain(W, fakeEco(), { storage: memStore(), rpc: 'https://x', fetch: makeNode().fetch, loadLib: async () => { throw new Error('offline'); } });
    await c4.enable();
    assert.equal(c4.state, 'error'); assert.match(c4.error, /offline/);
    assert.equal((await c4.inscribe('birth', 'zipangu:b1')).reason, 'off');
    assert.equal((await c4.hire(W.agents[0].id, { request: { id: 'r' } })).ok, false);
    assert.throws(() => createChain(W, fakeEco(), { network: 'arc-testnet' }), /not the Zcash network/);
}

// ------------------------------------------------ the relay
{
    const relay = await import('../../netlify/functions/zipangu-zcash.mjs');
    const { checkCall } = relay;
    const tm = 'tmYXBYJj1K7vhejSec5osXK2QsGa5MTisUQ';
    assert.equal(checkCall({ method: 'getblockchaininfo', params: [] }), null);
    assert.equal(checkCall({ method: 'getaddressutxos', params: [{ addresses: [tm] }] }), null);
    assert.equal(checkCall({ method: 'getaddresstxids', params: [{ addresses: [tm], start: 1, end: 2 }] }), null);
    assert.equal(checkCall({ method: 'getrawtransaction', params: ['ab'.repeat(32), 1] }), null);
    assert.equal(checkCall({ method: 'sendrawtransaction', params: ['050000800a27a726' + '00'.repeat(40)] }), null);
    assert.equal(checkCall({ method: 'dumpprivkey', params: [tm] }), 'method');
    assert.equal(checkCall({ method: 'stop', params: [] }), 'method');
    assert.equal(checkCall({ method: 'toString' }), 'method');
    assert.equal(checkCall({ method: 'getaddressutxos', params: [{ addresses: ['t1V9mnyk5Z5cTNMCkLbaDwSskgJZucTLdgW'] }] }), 'params', 'mainnet addresses are refused');
    assert.equal(checkCall({ method: 'getaddressutxos', params: [{ addresses: [tm], chainInfo: true }] }), 'params');
    assert.equal(checkCall({ method: 'getaddresstxids', params: [{ addresses: [tm], start: 1, end: 200001 }] }), 'params');
    assert.equal(checkCall({ method: 'sendrawtransaction', params: ['040000800a27a726' + '00'.repeat(40)] }), 'params', 'v5 only');
    assert.equal(checkCall({ method: 'sendrawtransaction', params: ['050000800a27a726' + '00'.repeat(20000)] }), 'params', 'size cap');
    assert.equal(checkCall({ method: 'getrawtransaction', params: ['xyz', 1] }), 'params');
    assert.equal(checkCall([{ method: 'getblockchaininfo' }]), 'request', 'no batches');

    const req = (body, { origin = 'https://ryosaku610.github.io', method = 'POST' } = {}) => new Request('https://neonmyths.netlify.app/.netlify/functions/zipangu-zcash', { method, headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) }, body: method === 'POST' ? JSON.stringify(body) : undefined });
    const call = async (r, ctx = { ip: '1.2.3.4' }) => { const res = await relay.default(r, ctx); return { status: res.status, body: res.status === 204 ? null : await res.json(), headers: res.headers }; };
    delete process.env.ZIPANGU_ZCASH_RPC_URL;
    assert.equal((await call(req({ method: 'getblockchaininfo', params: [] }))).body.error, 'not_configured');
    assert.equal((await call(req({}, { origin: 'https://evil.example' }))).status, 403);
    assert.equal((await call(req(null, { method: 'OPTIONS' }))).status, 204);
    process.env.ZIPANGU_ZCASH_RPC_URL = 'https://zebra.example/';
    process.env.ZIPANGU_ZCASH_RPC_HEADER = 'x-api-key: secret-123';
    const node = makeNode();
    const seen = [];
    const saveFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
        seen.push({ url, headers: init.headers });
        const body = JSON.parse(init.body);
        const r = await node.fetch(url, { ...init, body: JSON.stringify({ ...body, jsonrpc: '1.0' }) });
        const j = await r.json();
        return { ok: true, status: 200, text: async () => JSON.stringify(j) };
    };
    relay._reset();
    let r = await call(req({ jsonrpc: '1.0', id: 7, method: 'getblockchaininfo', params: [] }));
    assert.equal(r.status, 200); assert.equal(r.body.result.chain, 'test'); assert.equal(r.body.id, 7);
    assert.equal(r.headers.get('access-control-allow-origin'), 'https://ryosaku610.github.io');
    assert.equal(seen[0].url, 'https://zebra.example/'); assert.equal(seen[0].headers['x-api-key'], 'secret-123', 'the key stays on the server');
    r = await call(req({ method: 'getrawtransaction', params: ['ab'.repeat(32), 1] }));
    assert.equal(r.status, 200); assert.equal(r.body.error.code, -5, 'node errors pass through');
    r = await call(req({ method: 'dumpprivkey', params: [] }));
    assert.equal(r.status, 400); assert.equal(r.body.error, 'refused');
    relay._reset();
    node.chain = 'main';
    r = await call(req({ method: 'getblockchaininfo', params: [] }));
    assert.equal(r.status, 503); assert.equal(r.body.error, 'not_testnet', 'a mainnet node is never relayed');
    relay._reset(); node.chain = 'test';
    let limitedAt = 0;
    for (let i = 0; i < 100 && !limitedAt; i++) if ((await call(req({ method: 'getblockchaininfo', params: [] }), { ip: '9.9.9.9' })).status === 429) limitedAt = i;
    assert.ok(limitedAt >= 80, 'rate limited per visitor');
    globalThis.fetch = saveFetch;
    delete process.env.ZIPANGU_ZCASH_RPC_URL; delete process.env.ZIPANGU_ZCASH_RPC_HEADER;
}
void sighashAll; void opReturnScript;
console.log('chain-zcash tests passed');
