// Zcash testnet primitives (js/zcash.js) checked offline: hashes against Node and Python
// (hashlib) answers, addresses against the official ZIP 320 vectors and a real testnet address,
// and v5 transaction ids and signature digests against the official ZIP 244 vectors.
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    sha256, ripemd160, hash160, blake2b, base58check, base58checkDecode, base58encode, base58decode, decodeTaddr, isTestnetTaddr,
    taddrFromPubkey, p2pkhScript, scriptForTaddr, opReturnScript, p2pkhScriptSig, serializeTx, txidDigest, txid, sighashAll,
    headerDigest, transparentDigest, conventionalFee, zatsToZec, zip321Uri, hexToBytes, bytesToHex, concat, compactSize,
    isV5Branch, V5_BRANCHES, MAX_OP_RETURN, txidToBytes, txidToHex
} from '../js/zcash.js';
import { opReturnData, readZcash } from '../js/chain-read.js';

const here = dirname(fileURLToPath(import.meta.url));
const node = (alg, b) => createHash(alg).update(b).digest('hex');

// ------------------------------------------------ hashes
for (const n of [0, 1, 3, 55, 56, 63, 64, 65, 119, 120, 127, 128, 129, 1000]) {
    const b = new Uint8Array(randomBytes(n));
    assert.equal(bytesToHex(sha256(b)), node('sha256', b), `sha256 of ${n} bytes`);
    assert.equal(bytesToHex(ripemd160(b)), node('ripemd160', b), `ripemd160 of ${n} bytes`);
    assert.equal(bytesToHex(blake2b(b, { outLen: 64 })), node('blake2b512', b), `blake2b-512 of ${n} bytes`);
}
assert.equal(bytesToHex(ripemd160(new TextEncoder().encode('abc'))), '8eb208f7e05d987a9b044a8e98c6b087f15a0bfc');
assert.equal(bytesToHex(blake2b(new TextEncoder().encode('abc'), { outLen: 64 })),
    'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923', 'RFC 7693');
// personalized BLAKE2b-256, known answers from Python's hashlib.blake2b(person=…)
const big = concat(new Uint8Array(Array.from({ length: 256 }, (_, i) => i)), new Uint8Array(Array.from({ length: 256 }, (_, i) => i)), new TextEncoder().encode('x'));
for (const [data, personal, want] of [
    [new Uint8Array(0), 'ZTxIdHeadersHash', 'e6f9967555b66ebd3bd806f976a6d2b559dbd87a587e0ab738d1c4d90332e695'],
    [new Uint8Array(Array.from({ length: 128 }, (_, i) => i)), 'ZTxIdOutputsHash', 'c6ec3614a258321228e73fdc0853053be8178dd5f8558df1f3d5aac9b91743f9'],
    [big, hexToBytes('5a636173685478486173685fd90a1977'), '0e3cc8698975683019f11afd1e07bb77c4c693f8f624b9ccd79983cfaa4df142'],
    [new TextEncoder().encode('abc'), 'Zcash___TxInHash', 'f19fe03b8d9677a01aee405f5344ff7b6b766e1fdeb229afe05788ba5e0c8fe6']
]) assert.equal(bytesToHex(blake2b(data, { personal })), want);
assert.throws(() => blake2b(new Uint8Array(0), { personal: 'short' }), /16 bytes/);
assert.equal(bytesToHex(hash160(hexToBytes('02' + '11'.repeat(32)))), node('ripemd160', createHash('sha256').update(hexToBytes('02' + '11'.repeat(32))).digest()));

// ------------------------------------------------ base58check and addresses
{
    const v = JSON.parse(readFileSync(join(here, 'fixtures', 'zip_0320_t_addr.json'), 'utf8'));
    for (const [taddr, hash] of v.vectors) assert.equal(base58check(concat(Uint8Array.of(0x1c, 0xb8), hexToBytes(hash))), taddr, 'mainnet t1 encoding (ZIP 320 vectors)');
    for (const [taddr] of v.vectors) assert.equal(decodeTaddr(taddr), null, 'a mainnet address is not a testnet address');
    // a real testnet address (Zebra's RPC documentation)
    const tm = 'tmYXBYJj1K7vhejSec5osXK2QsGa5MTisUQ';
    const d = decodeTaddr(tm);
    assert.equal(d.kind, 'p2pkh');
    assert.equal(base58check(concat(Uint8Array.of(0x1d, 0x25), d.hash)), tm, 'testnet P2PKH prefix 0x1d25 round-trips');
    assert.equal(bytesToHex(scriptForTaddr(tm)), '76a914' + bytesToHex(d.hash) + '88ac');
    assert.ok(isTestnetTaddr(tm));
    assert.equal(decodeTaddr(tm.slice(0, -1) + (tm.endsWith('Q') ? 'R' : 'Q')), null, 'bad checksum');
    assert.equal(decodeTaddr('not base58 0OIl'), null);
    assert.throws(() => base58checkDecode('11'), /too short/);
    assert.deepEqual(base58decode(base58encode(Uint8Array.of(0, 0, 7, 255))), Uint8Array.of(0, 0, 7, 255), 'leading zeros');
    const t2 = base58check(concat(Uint8Array.of(0x1c, 0xba), new Uint8Array(20)));
    assert.ok(t2.startsWith('t2') && decodeTaddr(t2).kind === 'p2sh');
    assert.equal(bytesToHex(scriptForTaddr(t2)), 'a914' + '00'.repeat(20) + '87');
    const addr = taddrFromPubkey(hexToBytes('03' + 'ab'.repeat(32)));
    assert.ok(addr.startsWith('tm') && addr.length === 35 && isTestnetTaddr(addr));
}

// ------------------------------------------------ ZIP 244: the official vectors
// A test-side parser of the bytes; the Orchard bundle's digest (ZIP 244 T.4) is computed here,
// so js/zcash.js's header, transparent and signature digests can be checked exactly.
function parseV5(hex) {
    const b = hexToBytes(hex); let i = 0;
    const u32 = () => { const v = new DataView(b.buffer, i, 4).getUint32(0, true); i += 4; return v; };
    const u64 = () => { const v = new DataView(b.buffer, i, 8).getBigUint64(0, true); i += 8; return v; };
    const cs = () => { const x = b[i++]; if (x < 0xfd) return x; if (x === 0xfd) { const v = b[i] | (b[i + 1] << 8); i += 2; return v; } return u32(); };
    const take = n => { const s = b.slice(i, i + n); i += n; return s; };
    const header = u32(), group = u32(), branchId = u32(), lockTime = u32(), expiryHeight = u32();
    const vin = [], vout = [];
    for (let n = cs(); n > 0; n--) { const prev = take(32), vout_ = u32(), sig = take(cs()), sequence = u32(); vin.push({ txid: txidToHex(prev), vout: vout_, scriptSig: sig, sequence }); }
    for (let n = cs(); n > 0; n--) { const value = u64(); vout.push({ value, script: take(cs()) }); }
    const transparentEnd = i;
    assert.equal(cs(), 0); assert.equal(cs(), 0, 'no Sapling in the chosen vectors');
    const sapEnd = i;
    const nA = cs(); const actions = [];
    for (let k = 0; k < nA; k++) actions.push({ cv: take(32), nf: take(32), rk: take(32), cmx: take(32), epk: take(32), enc: take(580), out: take(80) });
    const flags = take(1), valueBalance = take(8), anchor = take(32);
    const p = (s, ...parts) => blake2b(concat(...parts), { personal: s });
    const orchard = nA ? p('ZTxIdOrchardHash',
        p('ZTxIdOrcActCHash', ...actions.flatMap(a => [a.nf, a.cmx, a.epk, a.enc.slice(0, 52)])),
        p('ZTxIdOrcActMHash', ...actions.map(a => a.enc.slice(52, 564))),
        p('ZTxIdOrcActNHash', ...actions.flatMap(a => [a.cv, a.rk, a.enc.slice(564), a.out])),
        flags, valueBalance, anchor) : undefined;
    return { header, group, tx: { branchId, lockTime, expiryHeight, vin, vout }, orchard, bytes: b, transparentEnd, sapEnd };
}
{
    const { vectors } = JSON.parse(readFileSync(join(here, 'fixtures', 'zip_0244_transparent.json'), 'utf8'));
    assert.equal(vectors.length, 3);
    for (const v of vectors) {
        const p = parseV5(v.tx);
        assert.equal(p.header, 0x80000005); assert.equal(p.group, 0x26a7270a);
        p.tx.vin.forEach((x, k) => { x.value = BigInt(v.amounts[k]); x.scriptPubKey = hexToBytes(v.script_pubkeys[k]); });
        assert.equal(bytesToHex(txidDigest(p.tx, { orchard: p.orchard })), v.txid, 'txid digest (ZIP 244)');
        assert.equal(bytesToHex(sighashAll(p.tx, v.transparent_input, { orchard: p.orchard })), v.sighash_all, 'SIGHASH_ALL digest (ZIP 244 S.2)');
        // our serialization of the same transparent part is byte-identical
        const mine = serializeTx(p.tx);
        assert.equal(bytesToHex(mine.slice(0, p.transparentEnd + 2)), bytesToHex(p.bytes.slice(0, p.sapEnd)), 'header and transparent bundle bytes');
    }
}

// ------------------------------------------------ a receipt transaction, end to end (signature stubbed)
{
    const spk = p2pkhScript(new Uint8Array(20).fill(7));
    const memo = new TextEncoder().encode('zipangu:trade|n=3|v=123.45|b:agent_1@era_x:silkx2=41.15|+2');
    assert.ok(memo.length <= MAX_OP_RETURN);
    const tx = {
        branchId: V5_BRANCHES.nu7, lockTime: 0, expiryHeight: 4500040,
        vin: [{ txid: 'aa'.repeat(32), vout: 1, value: 1_000_000n, scriptPubKey: spk, sequence: 0xffffffff }],
        vout: [{ value: 0n, script: opReturnScript(memo) }]
    };
    const fee = conventionalFee({ ...tx, vout: [...tx.vout, { value: 0n, script: spk }] });
    assert.equal(memo.length, 58);
    assert.equal(fee, 20000n, 'one P2PKH input; change (34 bytes) + a 58-byte memo output (69) = 103 bytes → 4 logical actions');
    tx.vout.push({ value: 1_000_000n - fee, script: spk });
    const id = txid(tx);
    const digest = sighashAll(tx, 0);
    assert.equal(digest.length, 32);
    tx.vin[0].scriptSig = p2pkhScriptSig(new Uint8Array(71).fill(0x30), hexToBytes('02' + '22'.repeat(32)));
    assert.equal(txid(tx), id, 'signatures are not part of the txid');
    assert.notEqual(bytesToHex(sighashAll({ ...tx, expiryHeight: 4500041 }, 0)), bytesToHex(digest), 'the header is signed');
    assert.notEqual(bytesToHex(sighashAll({ ...tx, branchId: V5_BRANCHES.nu6 }, 0)), bytesToHex(digest), 'the branch is signed (replay protection)');
    const raw = bytesToHex(serializeTx(tx));
    assert.ok(raw.startsWith('050000800a27a726d90a1977'), 'v5 header, version group, NU7 branch');
    assert.ok(raw.endsWith('000000'), 'no Sapling, no Orchard');
    // a node would answer getrawtransaction with this output; the reader finds the memo
    const back = readZcash({ confirmations: 1, height: 4500001, vout: tx.vout.map((o, n) => ({ n, valueZat: Number(o.value), scriptPubKey: { hex: bytesToHex(o.script) } })) });
    assert.equal(back.memo, new TextDecoder().decode(memo));
    assert.deepEqual(opReturnData(bytesToHex(opReturnScript(new Uint8Array(80).fill(65)))), new Uint8Array(80).fill(65), '80 bytes use OP_PUSHDATA1');
    assert.throws(() => opReturnScript(new Uint8Array(81)), /80 bytes/);
    assert.equal(conventionalFee({ vin: tx.vin, vout: [{ value: 0n, script: opReturnScript(new Uint8Array(80)) }, { value: 1n, script: spk }] }), 20000n, '80-byte memo + change: 4 actions');
    assert.equal(conventionalFee({ vin: tx.vin, vout: [{ value: 1n, script: spk }] }, 1000n), 2000n, 'the grace actions');
    assert.deepEqual(txidToBytes(txidToHex(new Uint8Array(32).map((_, i) => i))), new Uint8Array(32).map((_, i) => i));
    assert.deepEqual(headerDigest(tx), headerDigest({ ...tx, vin: [] }), 'the header digest does not see inputs');
    assert.notDeepEqual(transparentDigest(tx), transparentDigest({ ...tx, vin: [] }));
    assert.deepEqual(compactSize(300), Uint8Array.of(0xfd, 0x2c, 0x01));
}
assert.ok(isV5Branch(0x77190ad9) && isV5Branch(0xc2d6d0b4) && !isV5Branch(0xe9ff75a6), 'NU5 onwards; not Canopy');

// ------------------------------------------------ ZIP 321
assert.equal(zatsToZec(100437n), '0.00100437');
assert.equal(zatsToZec(150000000n), '1.5');
assert.equal(zatsToZec(0n), '0');
const tm = 'tmYXBYJj1K7vhejSec5osXK2QsGa5MTisUQ';
assert.equal(zip321Uri(tm, 100437n, { label: '万華京', message: 'zipangu:x402:a b' }),
    'zcash:tmYXBYJj1K7vhejSec5osXK2QsGa5MTisUQ?amount=0.00100437&label=%E4%B8%87%E8%8F%AF%E4%BA%AC&message=zipangu%3Ax402%3Aa%20b');
assert.throws(() => zip321Uri('t1V9mnyk5Z5cTNMCkLbaDwSskgJZucTLdgW', 1n), /testnet/);
console.log('zcash tests passed');
