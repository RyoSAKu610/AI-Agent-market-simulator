// ⛓ The test networks chain mode runs on (js/networks.js) and reading a transaction back from
// any of them with fetch alone (js/chain-read.js). Offline: every RPC here is a stand-in.
import assert from 'node:assert/strict';
import {
    NETWORKS, NETWORK_IDS, DEFAULT_NETWORK, networkOf, isNetwork, explorerTxOf, explorerAddrOf,
    formatUnits, parseUnits, amountText, addChainParams
} from '../js/networks.js';
import {
    readSolana, memoFromSolana, readEvm, memoFromCalldata, opReturnData, readZcash, readMemo, zcashEndpoint, ZCASH_RPC_KEY, RpcError
} from '../js/chain-read.js';
import { encodeMemo, byteLen } from '../js/chain-core.js';

// ------------------------------------------------ the registry: test networks only
assert.deepEqual(NETWORK_IDS, ['solana-devnet', 'robinhood-testnet', 'arc-testnet', 'zcash-testnet']);
assert.equal(DEFAULT_NETWORK, 'solana-devnet');
for (const n of Object.values(NETWORKS)) {
    assert.ok(['devnet', 'testnet'].includes(n.kind), `${n.id} is a test network`);
    assert.ok(['solana', 'evm', 'zcash'].includes(n.family));
    assert.equal(formatUnits(n.hire.amount, n.currency.decimals), n.hire.text, `${n.id}: the hire price says what it charges`);
    assert.ok(parseUnits(n.fund.text, n.currency.decimals) > 0n);
    assert.ok(n.faucets.length && n.faucets.every(f => f.url.startsWith('https://')));
    assert.ok(n.rpc.every(u => u.startsWith('https://')));
    assert.ok(n.flushMs >= 2500 && n.maxOps >= 1 && n.memoBytes >= 80);
    for (const u of Object.values(n.explorer)) assert.ok(u.startsWith('https://'));
}
assert.equal(new Set(Object.values(NETWORKS).map(n => n.storageKey)).size, NETWORK_IDS.length, 'each network keeps its own keys and ledger');
assert.equal(NETWORKS['solana-devnet'].storageKey, 'zipangu.chain.v1', 'existing devnet wallets keep loading');
// chain ids from ethereum-lists (eip155-46630, eip155-5042002); never a mainnet id
assert.equal(NETWORKS['robinhood-testnet'].chainId, 46630);
assert.equal(NETWORKS['arc-testnet'].chainId, 5042002);
const MAINNETS = [1, 10, 8453, 42161, 4663, 5042];
for (const n of Object.values(NETWORKS)) if (n.family === 'evm') assert.ok(!MAINNETS.includes(n.chainId));
assert.deepEqual(Object.fromEntries(Object.values(NETWORKS).map(n => [n.id, [n.currency.symbol, n.currency.decimals]])),
    { 'solana-devnet': ['SOL', 9], 'robinhood-testnet': ['ETH', 18], 'arc-testnet': ['USDC', 18], 'zcash-testnet': ['TAZ', 8] });
assert.equal(NETWORKS['zcash-testnet'].token, null, 'no token on Zcash: receipts only');
assert.equal(NETWORKS['zcash-testnet'].memoBytes, 80, 'a standard OP_RETURN carries 80 bytes');
assert.equal(networkOf('nope').id, DEFAULT_NETWORK);
assert.equal(isNetwork('arc-testnet'), true); assert.equal(isNetwork('toString'), false);

// explorers
assert.equal(explorerTxOf('solana-devnet', 'abc'), 'https://explorer.solana.com/tx/abc?cluster=devnet');
assert.equal(explorerAddrOf('robinhood-testnet', '0xAb'), 'https://explorer.testnet.chain.robinhood.com/address/0xAb');
assert.equal(explorerTxOf('arc-testnet', '0x12'), 'https://explorer.testnet.arc.io/tx/0x12');
assert.equal(explorerTxOf('zcash-testnet', 'ff'), 'https://testnet.zcashexplorer.app/transactions/ff');
assert.equal(explorerTxOf('zcash-testnet', '<x>'), 'https://testnet.zcashexplorer.app/transactions/%3Cx%3E', 'ids are escaped');

// amounts without floating point
assert.equal(formatUnits(10n ** 16n, 18), '0.01');
assert.equal(formatUnits('100000', 8), '0.001');
assert.equal(formatUnits(0, 9), '0');
assert.equal(formatUnits(123456789n, 2), '1234567.89');
assert.equal(formatUnits('x', 2), '—');
assert.equal(parseUnits('0.01', 18), 10n ** 16n);
assert.equal(parseUnits('2', 18), 2n * 10n ** 18n);
assert.equal(parseUnits('1.234', 2), null, 'more decimals than the currency has');
for (const bad of ['', '-1', '1e3', 'abc', '0x10', null]) assert.equal(parseUnits(bad, 8), null, String(bad));
assert.equal(amountText('arc-testnet', '10000000000000000'), '0.01 USDC');
assert.deepEqual(addChainParams('robinhood-testnet'), {
    chainId: '0xb626', chainName: 'Robinhood Chain Testnet', nativeCurrency: { name: 'Robinhood Chain Testnet ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.testnet.chain.robinhood.com/rpc'], blockExplorerUrls: ['https://explorer.testnet.chain.robinhood.com']
});
assert.equal(addChainParams('arc-testnet').chainId, '0x4cef52');
assert.equal(addChainParams('zcash-testnet'), null);

// memos fit each network's carrier
for (const n of Object.values(NETWORKS)) {
    const ops = Array.from({ length: 9 }, (_, i) => ({ action: 'buy', agent: 'agent_' + i, place: 'era_x', good: 'good_' + i, qty: 2, amount: 123.45 }));
    const m = encodeMemo('trade', ops, { n: 9, v: 1111.05 }, n.memoBytes);
    assert.ok(m.startsWith('zipangu:trade') && byteLen(m) <= n.memoBytes, `${n.id}: ${byteLen(m)} bytes`);
}

// ------------------------------------------------ reading a transaction back
{   // Solana: the SPL Memo instruction of a parsed transaction
    const parsed = (memo, err = null) => ({ slot: 77, meta: { err }, transaction: { message: { instructions: [{ program: 'spl-memo', programId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', parsed: memo }] } } });
    assert.deepEqual(readSolana(parsed('zipangu:x')), { status: 'ok', memo: 'zipangu:x', slot: 77 });
    assert.equal(readSolana(parsed('zipangu:x', { InstructionError: [0, 'x'] })).status, 'failed');
    assert.deepEqual(readSolana(null), { status: 'notfound', memo: null, slot: null });
    assert.equal(memoFromSolana({ transaction: { message: { instructions: [{ program: 'system' }] } } }), null);
}
{   // EVM: calldata as UTF-8, receipt status
    const hex = s => '0x' + Buffer.from(s, 'utf8').toString('hex');
    assert.equal(memoFromCalldata(hex('zipangu:birth|v=1')), 'zipangu:birth|v=1');
    assert.equal(memoFromCalldata(hex('光金')), '光金');
    assert.equal(memoFromCalldata('0x'), null);
    assert.equal(memoFromCalldata('0xff'), null, 'not UTF-8');
    assert.equal(memoFromCalldata('0x123'), null, 'odd length');
    assert.equal(memoFromCalldata('zz'), null);
    assert.deepEqual(readEvm({ input: hex('zipangu:a') }, { status: '0x1', blockNumber: '0x10' }), { status: 'ok', memo: 'zipangu:a', slot: 16 });
    assert.equal(readEvm({ data: hex('zipangu:a') }, { status: 1, blockNumber: 5 }).memo, 'zipangu:a', 'ethers objects use data');
    assert.equal(readEvm({ input: hex('zipangu:a') }, { status: '0x0', blockNumber: '0x10' }).status, 'failed');
    assert.equal(readEvm({ input: hex('zipangu:a') }, null).status, 'pending');
    assert.equal(readEvm(null, null).status, 'notfound');
}
{   // Zcash: OP_RETURN outputs
    const op = s => { const d = Buffer.from(s, 'utf8'); return (d.length <= 75 ? '6a' + d.length.toString(16).padStart(2, '0') : '6a4c' + d.length.toString(16).padStart(2, '0')) + d.toString('hex'); };
    assert.equal(Buffer.from(opReturnData(op('zipangu:t'))).toString(), 'zipangu:t');
    assert.equal(Buffer.from(opReturnData(op('z'.repeat(80)))).toString(), 'z'.repeat(80), 'OP_PUSHDATA1');
    assert.equal(opReturnData('76a914' + '00'.repeat(20) + '88ac'), null, 'P2PKH is not a memo');
    assert.equal(opReturnData('6a05aabb'), null, 'a push longer than the script');
    assert.equal(opReturnData('6a'), null);
    assert.equal(opReturnData('nothex'), null);
    const raw = (memo, confirmations) => ({ confirmations, height: 4500000, vout: [{ n: 0, valueZat: 9000, scriptPubKey: { hex: '76a914' + '00'.repeat(20) + '88ac' } }, { n: 1, valueZat: 0, scriptPubKey: { hex: op(memo) } }] });
    assert.deepEqual(readZcash(raw('zipangu:b1|trav_x|abc', 3)), { status: 'ok', memo: 'zipangu:b1|trav_x|abc', slot: 4500000 });
    assert.deepEqual(readZcash(raw('zipangu:b1', 0)), { status: 'pending', memo: 'zipangu:b1', slot: null });
    assert.equal(readZcash(null).status, 'notfound');
}
{   // readMemo with stand-in RPCs: the right chain or nothing
    const calls = [];
    const fakeFetch = answers => async (url, init) => {
        const body = JSON.parse(init.body);
        calls.push([url, body.method]);
        const a = answers[body.method];
        const out = typeof a === 'function' ? a(body.params) : a;
        return { ok: true, status: 200, json: async () => (out instanceof Error ? { error: { code: out.code, message: out.message } } : { result: out }) };
    };
    const hexMemo = '0x' + Buffer.from('zipangu:birth|v=1|id=trav_a|h=00', 'utf8').toString('hex');
    let r = await readMemo('arc-testnet', '0xabc', { fetch: fakeFetch({ eth_chainId: '0x4cef52', eth_getTransactionByHash: { input: hexMemo }, eth_getTransactionReceipt: { status: '0x1', blockNumber: '0x2a' } }) });
    assert.deepEqual(r, { status: 'ok', memo: 'zipangu:birth|v=1|id=trav_a|h=00', slot: 42 });
    assert.equal(calls[0][0], 'https://rpc.testnet.arc.io');
    await assert.rejects(readMemo('robinhood-testnet', '0xabc', { fetch: fakeFetch({ eth_chainId: '0x1' }) }), /not Robinhood Chain Testnet/, 'an RPC on mainnet is refused');
    r = await readMemo('solana-devnet', 'SIG', { fetch: fakeFetch({ getTransaction: { slot: 9, meta: { err: null }, transaction: { message: { instructions: [{ program: 'spl-memo', parsed: 'zipangu:m' }] } } } }) });
    assert.deepEqual(r, { status: 'ok', memo: 'zipangu:m', slot: 9 });
    const zFetch = over => fakeFetch({ getblockchaininfo: { chain: 'test', blocks: 4500100 }, getrawtransaction: Object.assign(new Error('No such mempool or main chain transaction'), { code: -5 }), ...over });
    assert.equal((await readMemo('zcash-testnet', 'ff', { fetch: zFetch({}) })).status, 'notfound');
    await assert.rejects(readMemo('zcash-testnet', 'ff', { fetch: zFetch({ getblockchaininfo: { chain: 'main' } }) }), /not on testnet/);
    const mem = new Map([[ZCASH_RPC_KEY, 'https://my-node.example/rpc']]);
    const storage = { getItem: k => mem.get(k) ?? null };
    calls.length = 0;
    await readMemo('zcash-testnet', 'ff', { fetch: zFetch({}), storage });
    assert.equal(calls[0][0], 'https://my-node.example/rpc', 'the visitor’s own node is used when set');
    assert.equal(zcashEndpoint({ getItem: () => 'javascript:alert(1)' }), 'https://neonmyths.netlify.app/.netlify/functions/zipangu-zcash', 'only https or a local node');
    assert.equal(zcashEndpoint({ getItem: () => 'http://localhost:18232/' }), 'http://localhost:18232/');
    assert.ok(new RpcError('x', -5) instanceof Error);
}
console.log('networks tests passed');
