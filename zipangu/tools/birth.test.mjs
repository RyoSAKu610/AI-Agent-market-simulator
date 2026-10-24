// 📜 Birth certificates (js/birth.js): a salted SHA-256 commitment to the soul card,
// a devnet memo that carries only the digest, and checks against a parsed transaction.
import assert from 'node:assert/strict';
import {
    BIRTH_MARK, canonicalCard, commitment, makeBirth, birthMemo, verifyBirth, memoOf, checkBirthTx, checkBirthMemo,
    loadBirths, saveBirth, forgetBirth, certificateFile, newSalt
} from '../js/birth.js';

const card = {
    id: 'trav_abc123', name: 'ソラ', from: 'Claude', personality: '好奇心', memories: ['星図', '旅'], values: ['誠実さ'],
    goal: 'knowledge', era: 'meiji_tamamushi', arrived: '2026-10-13', extra: 'ignored'
};
const SALT = '00112233445566778899aabbccddeeff';

// the same digest Python's hashlib gives for the same bytes (known answer)
assert.equal(await commitment(card, SALT), '98fadc995d3d10072be18622424261d5c1d0c467f80db4660fd7b9cedeff761d');
assert.equal(canonicalCard(card), canonicalCard({ ...card, extra: 'other', unknown: 1 }), 'only the card fields count');
assert.notEqual(await commitment(card, SALT), await commitment({ ...card, memories: ['星図'] }, SALT), 'any change changes the digest');
assert.notEqual(await commitment(card, SALT), await commitment(card, newSalt()), 'the salt changes the digest');
assert.match(newSalt(), /^[0-9a-f]{32}$/);
assert.notEqual(newSalt(), newSalt());

const birth = await makeBirth(card, { now: () => '2026-10-13T00:00:00.000Z' });
assert.equal(birth.v, 1);
assert.equal(birth.id, card.id);
assert.match(birth.digest, /^[0-9a-f]{64}$/);
assert.equal(birth.chain, null);
assert.equal(await verifyBirth(card, birth), true);
assert.equal(await verifyBirth({ ...card, name: 'ソラ2' }, birth), false, 'a changed card does not verify');
assert.equal(await verifyBirth({ ...card, id: 'trav_other' }, birth), false);
assert.equal(await verifyBirth(card, { ...birth, salt: 'zz' }), false);

// the memo reveals nothing from the card
const memo = birthMemo(birth);
assert.equal(memo, `zipangu:birth|v=1|id=trav_abc123|h=${birth.digest}`);
for (const word of ['ソラ', 'Claude', '好奇心', '星図', '誠実さ', 'meiji', SALT, birth.salt]) assert.ok(!memo.includes(word), `memo leaks ${word}`);
assert.ok(new TextEncoder().encode(memo).length <= 400);

// a parsed devnet transaction
const parsed = (text, err = null) => ({ meta: { err }, transaction: { message: { instructions: [
    { program: 'spl-memo', programId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr', parsed: text }
] } } });
assert.equal(memoOf(parsed(memo)), memo);
assert.deepEqual(checkBirthTx(parsed(memo), birth), { ok: true });
assert.deepEqual(checkBirthTx(null, birth), { ok: false, reason: 'notfound' });
assert.deepEqual(checkBirthTx(parsed(memo, { InstructionError: [0, 'x'] }), birth), { ok: false, reason: 'failed' });
assert.deepEqual(checkBirthTx(parsed(memo.replace(/.$/, c => (c === '0' ? '1' : '0'))), birth), { ok: false, reason: 'mismatch' }, 'one changed character is a mismatch');
assert.equal(memoOf({ transaction: { message: { instructions: [{ program: 'system', parsed: { type: 'transfer' } }] } } }), null);

// storage keeps only well-formed certificates
const mem = new Map();
const storage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
assert.ok(saveBirth(storage, birth));
assert.equal(saveBirth(storage, { ...birth, id: 'evil' }), false);
assert.equal(saveBirth(storage, { ...birth, digest: 'nothex' }), false);
assert.ok(saveBirth(storage, { ...birth, chain: { sig: '5'.repeat(88), slot: 7, verified: true, cluster: 'mainnet-beta' } }));
const back = loadBirths(storage)[card.id];
assert.deepEqual(back.chain, { net: 'solana-devnet', sig: '5'.repeat(88), slot: 7, verified: true, at: '' }, 'a record without a known network was written on Solana devnet');
assert.ok(saveBirth(storage, { ...birth, chain: { sig: '<img src=x>' } }));
assert.equal(loadBirths(storage)[card.id].chain, null, 'a signature that is not base58 is dropped');
mem.set('zipangu.births.v1', '{"a":{"v":1,"id":"trav_x","digest":"zz","salt":"zz"},"b":7}');
assert.deepEqual(loadBirths(storage), {});
mem.set('zipangu.births.v1', 'not json');
assert.deepEqual(loadBirths(storage), {});
saveBirth(storage, birth);
forgetBirth(storage, card.id);
assert.deepEqual(loadBirths(storage), {});

// the file the visitor keeps proves the birth on its own
const file = JSON.parse(certificateFile(card, { ...birth, chain: { sig: 'S1G', slot: 9 } }));
assert.equal(file.format, BIRTH_MARK);
assert.equal(file.chain.memo, memo);
assert.equal(file.chain.network, 'solana-devnet');
assert.equal(await commitment(file.card, file.salt), file.digest, 'card + salt in the file reproduce the digest');

// ------------------------------------------------ other test networks
// each network keeps its own kind of transaction id
const evmHash = '0x' + 'ab'.repeat(32), zTxid = 'cd'.repeat(32);
assert.ok(saveBirth(storage, { ...birth, chain: { net: 'arc-testnet', sig: evmHash, slot: 12, verified: true } }));
assert.deepEqual(loadBirths(storage)[card.id].chain, { net: 'arc-testnet', sig: evmHash, slot: 12, verified: true, at: '' });
assert.ok(saveBirth(storage, { ...birth, chain: { net: 'robinhood-testnet', sig: '5'.repeat(88) } }));
assert.equal(loadBirths(storage)[card.id].chain, null, 'a base58 signature is not an EVM hash');
assert.ok(saveBirth(storage, { ...birth, chain: { net: 'zcash-testnet', sig: zTxid, slot: 4500001 } }));
assert.equal(loadBirths(storage)[card.id].chain.net, 'zcash-testnet');
assert.ok(saveBirth(storage, { ...birth, chain: { net: 'zcash-testnet', sig: evmHash } }));
assert.equal(loadBirths(storage)[card.id].chain, null, 'a 0x hash is not a Zcash txid');
// the same memo on Solana and the EVM networks; a compact one in a Zcash OP_RETURN (80 bytes)
assert.equal(birthMemo(birth, 'arc-testnet'), memo);
assert.equal(birthMemo(birth, 'robinhood-testnet'), memo);
const zmemo = birthMemo(birth, 'zcash-testnet');
assert.match(zmemo, /^zipangu:b1\|trav_abc123\|[A-Za-z0-9_-]{43}$/);
assert.ok(new TextEncoder().encode(birthMemo({ ...birth, id: 'trav_' + 'z'.repeat(13) }, 'zcash-testnet')).length <= 80, 'the longest id still fits');
assert.equal(Buffer.from(zmemo.split('|')[2], 'base64url').toString('hex'), birth.digest, 'the compact memo carries the whole digest');
for (const word of ['ソラ', 'Claude', SALT, birth.salt]) assert.ok(!zmemo.includes(word));
// the check, on the shape js/chain-read.js returns
assert.deepEqual(checkBirthMemo({ status: 'ok', memo: zmemo }, birth, 'zcash-testnet'), { ok: true });
assert.deepEqual(checkBirthMemo({ status: 'ok', memo }, birth, 'zcash-testnet'), { ok: false, reason: 'mismatch' }, 'each network’s own memo');
assert.deepEqual(checkBirthMemo({ status: 'pending', memo: zmemo }, birth, 'zcash-testnet'), { ok: false, reason: 'pending' });
assert.deepEqual(checkBirthMemo({ status: 'failed', memo }, birth, 'arc-testnet'), { ok: false, reason: 'failed' });
assert.deepEqual(checkBirthMemo({ status: 'notfound', memo: null }, birth, 'arc-testnet'), { ok: false, reason: 'notfound' });
assert.deepEqual(checkBirthMemo(null, birth), { ok: false, reason: 'notfound' });
const zfile = JSON.parse(certificateFile(card, { ...birth, chain: { net: 'zcash-testnet', sig: zTxid, slot: 4500001 } }));
assert.deepEqual([zfile.chain.network, zfile.chain.memo, zfile.chain.explorer], ['zcash-testnet', zmemo, 'https://testnet.zcashexplorer.app/transactions/' + zTxid]);

console.log('birth tests passed');
