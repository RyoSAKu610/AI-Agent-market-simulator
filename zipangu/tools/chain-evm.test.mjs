// Offline tests for js/chain-evm.js (Robinhood Chain Testnet and Arc Testnet): the pure helpers,
// and the engine against a stand-in for ethers and an EVM wallet. No network, no packages.
// (The same engine was also run end to end with real ethers against a local EVM; see the PR.)
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildWorld } from '../js/data.js';

// ---- importing the engine must be side-effect free
let fetched = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = () => { fetched++; throw new Error('network access at import time'); };
const realSetInterval = globalThis.setInterval;
let intervals = 0;
globalThis.setInterval = (...a) => { intervals++; return realSetInterval(...a); };
const { createChain, planTrades, verifyEvmPayment, memoHex } = await import('../js/chain-evm.js');
const { KOGANE_ABI, KOGANE_BYTECODE } = await import('../js/kogane.js');
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

// ---- the contract the page deploys is the one in contracts/ (rebuilt with tools/kogane-build.mjs)
{
    const r = spawnSync(process.execPath, [join(here, 'kogane-build.mjs'), '--check'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.match(KOGANE_BYTECODE, /^0x[0-9a-f]{2000,}$/);
    assert.ok(!KOGANE_BYTECODE.includes('a264697066'), 'no IPFS metadata hash: the bytecode depends on the code alone');
    const fns = KOGANE_ABI.filter(x => x.type === 'function').map(x => x.name).sort();
    assert.deepEqual(fns, ['allowance', 'approve', 'balanceOf', 'batch', 'decimals', 'name', 'symbol', 'totalSupply', 'transfer', 'transferFrom', 'treasury']);
    assert.ok(KOGANE_ABI.some(x => x.type === 'event' && x.name === 'Memo'));
}

// ---- memoHex / planTrades / verifyEvmPayment
assert.equal(memoHex('zipangu:x'), '0x7a6970616e67753a78');
assert.equal(memoHex('光'), '0xe58589');
{
    const at = id => 'addr_' + id;
    const mirror = new Map([['addr_a1', 1000], ['addr_p1', 500000]]);
    const ops = [
        { action: 'buy', agent: 'a1', place: 'p1', amount: 5 },        // 500 units from a1 (has 1000)
        { action: 'buy', agent: 'a1', place: 'p1', amount: 7 },        // 700 more: a1 runs short → top-up
        { action: 'sell', agent: 'a1', place: 'p1', amount: 1 }        // the market pays back
    ];
    const p = planTrades(ops, at, mirror);
    assert.deepEqual(p.from, ['addr_a1', 'addr_a1', 'addr_p1']);
    assert.deepEqual(p.to, ['addr_p1', 'addr_p1', 'addr_a1']);
    assert.deepEqual(p.amount, [500n, 700n, 100n]);
    assert.deepEqual(p.mintTo, ['addr_a1']);
    assert.deepEqual(p.mintAmount, [700n - 500n + 10000n]);
    assert.equal(p.topLabel, 'a:a1:102');
    assert.equal(mirror.get('addr_a1') + p.delta.get('addr_a1'), 1000 + 10200 - 1200 + 100);
    assert.equal(planTrades([{ action: 'buy', agent: 'x', place: 'y', amount: 1 }], at, new Map()).mintTo.length, 0, 'an unknown balance is not topped up');
}
{
    const quote = { payTo: '0xAgent', amount: '100000000000000', memo: 'zipangu:x402:r1' };
    const tx = (over = {}) => ({ chainId: 46630n, to: '0xagent', from: '0xME', value: 100000000000000n, data: memoHex('zipangu:x402:r1'), ...over });
    const ok = { status: 1, blockNumber: 7 };
    assert.equal(verifyEvmPayment(tx(), ok, quote, '0xme', 46630).ok, true, 'addresses compare without case');
    assert.equal(verifyEvmPayment({ ...tx(), data: undefined, input: memoHex('zipangu:x402:r1'), value: '0x5af3107a4000', chainId: '0xb626' }, { status: '0x1' }, quote, '0xme', 46630).ok, true, 'raw JSON-RPC shapes');
    assert.equal(verifyEvmPayment(null, ok, quote, '0xme', 46630).ok, false);
    assert.equal(verifyEvmPayment(tx(), null, quote, '0xme', 46630).ok, false, 'not confirmed yet');
    assert.equal(verifyEvmPayment(tx(), { status: 0 }, quote, '0xme', 46630).ok, false, 'reverted');
    assert.equal(verifyEvmPayment(tx({ chainId: 1n }), ok, quote, '0xme', 46630).ok, false, 'mainnet');
    assert.equal(verifyEvmPayment(tx({ to: '0xother' }), ok, quote, '0xme', 46630).ok, false);
    assert.equal(verifyEvmPayment(tx({ value: 99999999999999n }), ok, quote, '0xme', 46630).ok, false);
    assert.equal(verifyEvmPayment(tx({ data: memoHex('zipangu:x402:r2') }), ok, quote, '0xme', 46630).ok, false);
    assert.equal(verifyEvmPayment(tx({ value: 'junk' }), ok, quote, '0xme', 46630).ok, false);
    assert.equal(verifyEvmPayment(tx(), ok, quote, '0xsomeone', 46630).ok, false);
}

// ---- a stand-in for ethers: an in-memory chain that runs KOGANE's batch() semantics
const lc = a => String(a).toLowerCase();
const addressOfKey = k => '0x' + createHash('sha256').update(String(k)).digest('hex').slice(0, 40);
const big = (k, v) => (typeof v === 'bigint' ? { $big: v.toString() } : v);
const unbig = (k, v) => (v && typeof v === 'object' && '$big' in v ? BigInt(v.$big) : v);
function makeChainNet(over = {}) {
    return {
        chainId: 46630, fee: 1_000_000n, balances: new Map(), kogane: new Map(), code: new Set(), txs: new Map(), receipts: new Map(),
        sent: [], sendErrors: [], revertNext: 0, block: 100, n: 0, rpcChainId: {}, down: new Set(), ...over
    };
}
function makeLib(net) {
    class Network { constructor(name, chainId) { this.name = name; this.chainId = BigInt(chainId); } }
    class JsonRpcProvider {
        constructor(url, network, opts) { this.url = url; this.opts = opts; }
        async send(method) {
            if (net.down.has(this.url)) throw new Error('fetch failed');
            if (method === 'eth_chainId') return '0x' + (net.rpcChainId[this.url] ?? net.chainId).toString(16);
            throw new Error('unexpected ' + method);
        }
        async getBalance(a) { return net.balances.get(lc(a)) ?? 0n; }
        async getFeeData() { return { maxFeePerGas: net.fee, gasPrice: net.fee }; }
        async getCode(a) { return net.code.has(lc(a)) ? '0x6080' : '0x'; }
        async getTransaction(h) { return net.txs.get(h) || null; }
        async getTransactionReceipt(h) { return net.receipts.get(h) || null; }
        async waitForTransaction(h) { return net.receipts.get(h) || null; }
    }
    const mine = (from, req) => {
        const err = net.sendErrors.shift();
        if (err) throw Object.assign(new Error(err), { code: /insufficient/i.test(err) ? 'INSUFFICIENT_FUNDS' : 'X' });
        const hash = '0x' + createHash('sha256').update('tx' + ++net.n).digest('hex');
        const value = BigInt(req.value || 0);
        const gas = 100_000n * net.fee;
        const bal = net.balances.get(lc(from)) ?? 0n;
        if (bal < value + gas) throw Object.assign(new Error('insufficient funds for gas * price + value'), { code: 'INSUFFICIENT_FUNDS' });
        net.balances.set(lc(from), bal - value - gas);
        if (req.to) net.balances.set(lc(req.to), (net.balances.get(lc(req.to)) ?? 0n) + value);
        let status = 1, contractAddress = null, logs = [];
        if (!req.to) { contractAddress = addressOfKey('contract' + net.n); net.code.add(lc(contractAddress)); net.deployData = req.data; }
        else if (net.code.has(lc(req.to)) && String(req.data).startsWith('FAKE:')) {
            const [fn, args] = JSON.parse(String(req.data).slice(5), unbig);
            assert.equal(fn, 'batch');
            const [mintTo, mintAmount, src, dst, amount, memo] = args;
            const k = new Map(net.kogane);
            mintTo.forEach((a, i) => k.set(lc(a), (k.get(lc(a)) || 0n) + mintAmount[i]));
            for (let i = 0; i < src.length; i++) {
                const have = k.get(lc(src[i])) || 0n;
                if (have < amount[i]) { status = 0; break; }
                k.set(lc(src[i]), have - amount[i]); k.set(lc(dst[i]), (k.get(lc(dst[i])) || 0n) + amount[i]);
            }
            if (status === 1) { net.kogane = k; logs = [{ memo }]; }
        }
        if (net.revertNext > 0) { net.revertNext--; status = 0; }
        const blockNumber = ++net.block;
        const tx = { hash, from, to: req.to || null, value, data: req.data || '0x', chainId: BigInt(net.chainId) };
        const receipt = { status, blockNumber, contractAddress, logs };
        net.txs.set(hash, tx); net.receipts.set(hash, receipt);
        net.sent.push({ from, req, receipt });
        return { hash, receipt };
    };
    class Wallet {
        constructor(pk, provider) { this.privateKey = pk; this.address = addressOfKey(pk); this.provider = provider; }
        async sendTransaction(req) {
            const { hash, receipt } = mine(this.address, req);
            return { hash, wait: async () => { if (receipt.status !== 1) throw new Error('transaction execution reverted'); return receipt; } };
        }
    }
    class Contract {
        constructor(address) { this.address = address; this.interface = { encodeFunctionData: (fn, args) => 'FAKE:' + JSON.stringify([fn, args], big) }; }
        async balanceOf(a) { return net.kogane.get(lc(a)) || 0n; }
    }
    const visitor = '0x' + 'ee'.repeat(20);
    const wallet = {
        chainId: net.chainId, calls: [],
        async request({ method, params }) {
            this.calls.push(method);
            if (method === 'eth_requestAccounts') return [visitor];
            if (method === 'eth_chainId') return '0x' + this.chainId.toString(16);
            if (method === 'wallet_switchEthereumChain') { if (this.refuseSwitch) throw Object.assign(new Error('User rejected'), { code: 4001 }); this.chainId = parseInt(params[0].chainId, 16); return null; }
            if (method === 'wallet_addEthereumChain') { this.chainId = parseInt(params[0].chainId, 16); return null; }
            if (method === 'eth_sendTransaction') {
                const p = params[0];
                assert.equal(parseInt(p.chainId, 16), net.chainId, 'the wallet is told which chain');
                if (this.cheat) Object.assign(p, this.cheat);
                return mine(p.from, { to: p.to, value: BigInt(p.value), data: p.data }).hash;
            }
            throw new Error('unexpected ' + method);
        }
    };
    net.balances.set(lc(visitor), 10n ** 21n);
    return { lib: { Network, JsonRpcProvider, Wallet, Contract, computeAddress: addressOfKey }, wallet, visitor };
}
function fakeEco() {
    const ls = { trade: new Set(), settle: new Set() };
    return {
        agents: new Map(W.agents.map(a => [a.id, { id: a.id, wallet: 10000 }])),
        on: (t, fn) => { ls[t].add(fn); return () => ls[t].delete(fn); },
        emit: (t, m) => ls[t].forEach(fn => fn(m)),
        listeners: () => ls.trade.size + ls.settle.size
    };
}
const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const trade = (n, action = 'buy', total = 10) => ({ type: 'trade', seq: n, action, agent: W.agents[n % 5].id, district: W.districts[n % 7].id, good: W.goods[n % 5].id, qty: 2, price: total / 2, total });
const bytes = s => new TextEncoder().encode(s).length;
const owners = W.agents.length + W.eras.length + W.realms.length;
const RPC = 'https://rpc.testnet.chain.robinhood.com/rpc';
const fund = (net, chain, wei) => net.balances.set(lc(chain.treasury), wei);

// ---- flow: enable → needs funds → fund from the wallet → deploy + mint → live → batches
{
    const net = makeChainNet(), eco = fakeEco(), store = memStore();
    const { lib, wallet, visitor } = makeLib(net);
    const chain = createChain(W, eco, { network: 'robinhood-testnet', storage: store, loadLib: async () => lib, wallet });
    assert.equal(chain.network.id, 'robinhood-testnet');
    assert.equal(chain.state, 'off'); assert.equal(chain.treasury, null);
    await chain.enable();
    assert.equal(chain.state, 'needs-funds', chain.error);
    assert.match(chain.treasury, /^0x[0-9a-f]{40}$/);
    assert.equal(chain.balance, 0);
    assert.ok(chain.setupNeed > 0);
    assert.equal(chain.canAirdrop, false);
    const air = await chain.requestAirdrop();
    assert.equal(air.ok, false); assert.match(air.reason, /faucet\.testnet\.chain\.robinhood\.com/);
    assert.equal((await chain.fundFromWallet('-1')).ok, false);
    assert.equal((await chain.fundFromWallet('1000')).ok, false, 'a typo-sized amount is refused');
    const f = await chain.fundFromWallet('0.002');
    assert.equal(f.ok, true, f.reason);
    for (let i = 0; i < 50 && chain.state !== 'live'; i++) await new Promise(r => setTimeout(r, 10));
    assert.equal(chain.state, 'live', chain.error);
    assert.ok(wallet.calls.includes('eth_sendTransaction'));
    const setupTxs = chain.txs.filter(t => t.kind === 'setup');
    assert.equal(setupTxs.length, 1 + Math.ceil(owners / 25), 'deploy + mint groups');
    assert.ok(setupTxs.every(t => t.status === 'confirmed' && net.txs.has(t.sig) && t.slot > 100));
    assert.equal(net.deployData, KOGANE_BYTECODE, 'the deployed code is KOGANE');
    assert.equal(net.kogane.get(lc(chain.addressOf(W.agents[0].id))), 1000000n, 'an agent starts with its sim wallet');
    assert.equal(net.kogane.get(lc(chain.addressOf(W.eras[0].id))), 100000000n, 'a market starts with 1,000,000 KOGANE');
    assert.equal(await chain.balanceOf(W.agents[0].id), 10000);
    assert.equal(chain.contract, chain.mint);
    assert.equal(eco.listeners(), 2, 'subscribed to trade + settle');

    // 25 trades → batches of ≤ 12 ops, one tx at a time, memo ≤ 400 bytes
    const sentBefore = net.sent.length;
    for (let i = 0; i < 25; i++) eco.emit('trade', trade(i));
    assert.equal(chain.queued, 25);
    await chain.flush(); await chain.flush(); await chain.flush();
    const batches = net.sent.slice(sentBefore).map(s => JSON.parse(String(s.req.data).slice(5), unbig)[1]);
    assert.deepEqual(batches.map(b => b[2].length), [12, 12, 1]);
    for (const b of batches) assert.ok(b[5].startsWith('zipangu:trade') && bytes(b[5]) <= 400);
    const trades = chain.txs.filter(t => t.kind === 'trade');
    assert.ok(trades.every(t => t.status === 'confirmed' && net.txs.has(t.sig)));
    assert.equal(chain.stats.volume, 250);

    // a trade bigger than the agent's balance → a labelled top-up mint in the same batch
    eco.emit('trade', { ...trade(2), total: 50000 });
    await chain.flush();
    const big1 = JSON.parse(String(net.sent.at(-1).req.data).slice(5), unbig)[1];
    assert.equal(big1[0].length, 1); assert.ok(big1[5].includes('topup='));
    assert.equal(chain.txs[0].status, 'confirmed');

    // settle → a memo-only self transaction
    eco.emit('settle', { kind: 'dawn', day: 3, label: '明け六つ', sales: 12, volume: 3456.7, top: W.agents[0].id, topProfit: 99.4 });
    await chain.flush();
    const s = net.sent.at(-1);
    assert.equal(s.req.to, chain.treasury); assert.equal(s.req.value, 0n);
    assert.equal((await chain.readMemo(s.receipt && chain.txs[0].sig)).memo.slice(0, 21), 'zipangu:settle|day=3|');

    // birth certificate memo, and the reader
    const memo = 'zipangu:birth|v=1|id=trav_x|h=' + 'a'.repeat(64);
    const ins = await chain.inscribe('birth', memo);
    assert.equal(ins.ok, true, ins.reason);
    assert.deepEqual(await chain.readMemo(ins.sig), { status: 'ok', memo, slot: ins.slot });
    assert.equal((await chain.inscribe('birth', 'not ours')).reason, 'memo');
    assert.equal((await chain.readMemo('0x' + '00'.repeat(32))).status, 'notfound');

    // hire: quote → wallet pays → verified; the agent's address received exactly the price
    const a0 = W.agents[0].id;
    const q = chain.quote(a0, 'req-1');
    assert.deepEqual([q.status, q.network, q.currency, q.amountText, q.memo], [402, 'robinhood-testnet', 'ETH', '0.0001 ETH', 'zipangu:x402:req-1']);
    assert.equal(chain.quote(W.eras[0].id, 'r'), null, 'markets are not hired');
    const phases = [];
    chain.on('hire', m => phases.push(m.phase));
    const before = net.balances.get(lc(chain.addressOf(a0))) ?? 0n;
    const h = await chain.hire(a0, { request: { id: 'req-1' } });
    assert.equal(h.ok, true, h.reason);
    assert.deepEqual(phases, ['quote', 'signing', 'confirming', 'verified']);
    assert.equal((net.balances.get(lc(chain.addressOf(a0))) ?? 0n) - before, 100000000000000n);
    // a wallet that pays less than quoted is caught by the check, and nothing is accepted
    wallet.cheat = { value: '0x1' };
    const bad = await chain.hire(a0, { request: { id: 'req-2' } });
    assert.equal(bad.ok, false); assert.match(bad.reason, /金額|amount/);
    assert.equal(chain.txs.find(t => t.kind === 'hire').status, 'failed');
    wallet.cheat = null;
    assert.equal((await chain.hire(a0, { request: { id: 'r' }, amount: '0' })).ok, false);
    assert.equal((await chain.hire(a0, { request: { id: 'r' }, amount: (10n ** 18n).toString() })).ok, false, 'a typo-sized hire is refused');
    assert.equal((await chain.hire(a0, { request: {} })).ok, false);
    // a wallet on another chain is switched first; one that refuses is not asked to pay
    wallet.chainId = 1;
    assert.equal((await chain.hire(a0, { request: { id: 'req-3' } })).ok, true, 'switched to the test network, then paid');
    assert.ok(wallet.calls.includes('wallet_switchEthereumChain'));
    wallet.chainId = 1; wallet.refuseSwitch = true;
    const sentNow = net.sent.length;
    assert.equal((await chain.hire(a0, { request: { id: 'req-4' } })).ok, false);
    assert.equal(net.sent.length, sentNow, 'nothing sent from a wallet on mainnet');
    wallet.refuseSwitch = false; wallet.chainId = net.chainId;
    void visitor;

    // out of gas money while live → pause, keep the queue, resume after funding
    fund(net, chain, 1n);
    eco.emit('trade', trade(3));
    await chain.flush(); await chain.flush(); await chain.flush();
    assert.equal(chain.state, 'needs-funds'); assert.match(chain.error, /low ETH|残り少ない/);
    assert.equal(chain.queued, 1, 'the trade waits');
    fund(net, chain, 10n ** 18n);
    await chain.checkFunds();
    assert.equal(chain.state, 'live');
    await chain.flush();
    assert.equal(chain.queued, 0);

    // a reverted batch is failed, keeps its hash, and is never confirmed
    net.revertNext = 1;
    eco.emit('trade', trade(4));
    await chain.flush();
    assert.equal(chain.txs[0].status, 'failed'); assert.ok(net.txs.has(chain.txs[0].sig));
    net.sendErrors.push('nonce too low');
    eco.emit('trade', trade(5));
    await chain.flush();
    assert.equal(chain.txs[0].status, 'failed'); assert.equal(chain.txs[0].sig, null); assert.match(chain.txs[0].error, /nonce/);
    for (const x of chain.txs) {
        if (x.sig) assert.ok(net.txs.has(x.sig), 'no invented hash: ' + x.sig);
        if (x.status === 'confirmed') assert.equal(net.receipts.get(x.sig).status, 1, 'confirmed ⇒ a successful receipt');
    }

    // persistence: same storage → same keys, contract and ledger; secrets stay in storage
    const treasury = chain.treasury, contract = chain.contract, n = chain.txs.length;
    chain.disable();
    assert.equal(chain.state, 'off'); assert.equal(eco.listeners(), 0);
    const saved = JSON.parse(store.getItem('zipangu.chain.robinhood-testnet.v1'));
    assert.deepEqual([saved.v, saved.net, saved.chainId, saved.setupDone, saved.contract], [1, 'robinhood-testnet', 46630, true, contract]);
    assert.equal(store.getItem('zipangu.chain.v1'), null, 'the Solana wallet is untouched');
    const again = createChain(W, eco, { network: 'robinhood-testnet', storage: store, loadLib: async () => lib, wallet });
    await again.enable();
    assert.equal(again.state, 'live', again.error);
    assert.deepEqual([again.treasury, again.contract, again.txs.length], [treasury, contract, n]);
    again.disable(); again.reset();
    assert.equal(store.getItem('zipangu.chain.robinhood-testnet.v1'), null);
}

// ---- the RPC must report the network's chain id; a fallback RPC is used when the first is down
{
    const net = makeChainNet({ rpcChainId: { [RPC]: 1 } });
    const { lib } = makeLib(net);
    const chain = createChain(W, fakeEco(), { network: 'robinhood-testnet', storage: memStore(), loadLib: async () => lib });
    await chain.enable();
    assert.equal(chain.state, 'needs-funds', 'the second RPC (right chain) is used');
    const net2 = makeChainNet({ chainId: 1 });
    const chain2 = createChain(W, fakeEco(), { network: 'robinhood-testnet', storage: memStore(), loadLib: async () => makeLib(net2).lib });
    await chain2.enable();
    assert.equal(chain2.state, 'error'); assert.match(chain2.error, /chain id|wrong chain/);
    const net3 = makeChainNet({ chainId: 5042002 });
    const chain3 = createChain(W, fakeEco(), { network: 'arc-testnet', storage: memStore(), loadLib: async () => makeLib(net3).lib });
    await chain3.enable();
    assert.equal(chain3.state, 'needs-funds');
    assert.equal(chain3.network.currency.symbol, 'USDC');
    assert.throws(() => createChain(W, fakeEco(), { network: 'solana-devnet', loadLib: async () => lib }), /not an EVM network/);
}
{   // library load failure → error state, no throw; hire refused before enable
    const chain = createChain(W, fakeEco(), { network: 'arc-testnet', storage: memStore(), loadLib: async () => { throw new Error('offline'); } });
    await chain.enable();
    assert.equal(chain.state, 'error'); assert.match(chain.error, /offline/);
    assert.equal((await chain.hire(W.agents[0].id, { request: { id: 'r' } })).ok, false);
    assert.equal((await chain.inscribe('birth', 'zipangu:birth')).reason, 'off');
}
{   // setup that fails midway ends in error and resumes without redeploying
    const net = makeChainNet(), eco = fakeEco();
    const { lib } = makeLib(net);
    const chain = createChain(W, eco, { network: 'robinhood-testnet', storage: memStore(), loadLib: async () => lib });
    await chain.enable();
    fund(net, chain, 10n ** 18n);
    net.sendErrors.push(null, 'execution reverted');      // deploy fine, first mint fails
    await chain.setup();
    assert.equal(chain.state, 'error');
    const deploys = net.sent.filter(s => !s.req.to).length;
    await chain.setup();
    assert.equal(chain.state, 'live', chain.error);
    assert.equal(net.sent.filter(s => !s.req.to).length, deploys, 'resumed without a second deploy');
    for (const id of [W.agents[0].id, W.realms[0].id]) assert.ok(net.kogane.get(lc(chain.addressOf(id))) > 0n);
    const mintedTwice = W.agents.filter(a => net.kogane.get(lc(chain.addressOf(a.id))) !== 1000000n);
    assert.equal(mintedTwice.length, 0, 'nobody was minted twice');
    chain.disable();
}
console.log('chain-evm tests passed');
