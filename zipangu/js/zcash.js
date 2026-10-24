// Zcash testnet primitives for chain mode (js/chain-zcash.js, docs/ONCHAIN.md): the hashes, the
// transparent testnet addresses (tm…), version-5 transparent transactions (ZIP 225) with their
// ZIP 244 transaction id and signature digests, the ZIP 317 conventional fee, OP_RETURN memo
// outputs and ZIP 321 payment URIs.
//
// Only transparent parts: no Sapling or Orchard bundles are ever built. Signing is not here; the
// engine signs the 32-byte digest with secp256k1 (@noble/curves). Hashes are implemented here so
// the whole transaction can be checked offline against the official test vectors
// (tools/zcash.test.mjs). Pure: no I/O, no globals.

// ------------------------------------------------------------ bytes

export const hexToBytes = hex => {
    const s = String(hex);
    if (s.length % 2 || !/^[0-9a-f]*$/i.test(s)) throw new Error('bad hex');
    const b = new Uint8Array(s.length / 2);
    for (let i = 0; i < b.length; i++) b[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
    return b;
};
export const bytesToHex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
export const concat = (...parts) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
};
const ascii = s => Uint8Array.from(s, c => c.charCodeAt(0));
export const u32le = n => { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n >>> 0, true); return b; };
export const u64le = v => { const b = new Uint8Array(8); new DataView(b.buffer).setBigUint64(0, BigInt.asUintN(64, BigInt(v)), true); return b; };
export function compactSize(n) {
    if (n < 0xfd) return Uint8Array.of(n);
    if (n <= 0xffff) return Uint8Array.of(0xfd, n & 0xff, n >> 8);
    return concat(Uint8Array.of(0xfe), u32le(n));
}
const withLength = bytes => concat(compactSize(bytes.length), bytes);
const reverse = b => Uint8Array.from(b).reverse();

// ------------------------------------------------------------ SHA-256 (FIPS 180-4)

const K256 = Uint32Array.from([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
export function sha256(data) {
    const len = data.length, padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(data); padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor(len / 0x20000000), false);
    dv.setUint32(padded.length - 4, (len << 3) >>> 0, false);
    const H = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    const w = new Uint32Array(64);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let off = 0; off < padded.length; off += 64) {
        for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K256[i] + w[i]) >>> 0;
            const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
            h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
        }
        H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i], false);
    return out;
}

// ------------------------------------------------------------ RIPEMD-160

const RL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
    1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13];
const RR = [5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
    8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11];
const SL = [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
    11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6];
const SR = [8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
    15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11];
const KL = [0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e], KR = [0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000];
const rf = (j, x, y, z) => (j < 16 ? x ^ y ^ z : j < 32 ? (x & y) | (~x & z) : j < 48 ? (x | ~y) ^ z : j < 64 ? (x & z) | (y & ~z) : x ^ (y | ~z));
export function ripemd160(data) {
    const len = data.length, padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    padded.set(data); padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, (len << 3) >>> 0, true);
    dv.setUint32(padded.length - 4, Math.floor(len / 0x20000000), true);
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    const rotl = (x, n) => (x << n) | (x >>> (32 - n));
    const X = new Uint32Array(16);
    for (let off = 0; off < padded.length; off += 64) {
        for (let i = 0; i < 16; i++) X[i] = dv.getUint32(off + i * 4, true);
        let al = h0, bl = h1, cl = h2, dl = h3, el = h4, ar = h0, br = h1, cr = h2, dr = h3, er = h4;
        for (let j = 0; j < 80; j++) {
            const r = j >> 4;
            let t = (rotl((al + rf(j, bl, cl, dl) + X[RL[j]] + KL[r]) | 0, SL[j]) + el) | 0;
            al = el; el = dl; dl = rotl(cl, 10); cl = bl; bl = t;
            t = (rotl((ar + rf(79 - j, br, cr, dr) + X[RR[j]] + KR[r]) | 0, SR[j]) + er) | 0;
            ar = er; er = dr; dr = rotl(cr, 10); cr = br; br = t;
        }
        const t = (h1 + cl + dr) | 0;
        h1 = (h2 + dl + er) | 0; h2 = (h3 + el + ar) | 0; h3 = (h4 + al + br) | 0; h4 = (h0 + bl + cr) | 0; h0 = t;
    }
    const out = new Uint8Array(20), ov = new DataView(out.buffer);
    [h0, h1, h2, h3, h4].forEach((h, i) => ov.setUint32(i * 4, h >>> 0, true));
    return out;
}
export const hash160 = data => ripemd160(sha256(data));

// ------------------------------------------------------------ BLAKE2b (RFC 7693) with personalization

const M64 = (1n << 64n) - 1n;
const B2_IV = [0x6a09e667f3bcc908n, 0xbb67ae8584caa73bn, 0x3c6ef372fe94f82bn, 0xa54ff53a5f1d36f1n, 0x510e527fade682d1n, 0x9b05688c2b3e6c1fn, 0x1f83d9abfb41bd6bn, 0x5be0cd19137e2179n];
const SIGMA = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4], [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
    [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13], [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
    [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11], [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
    [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5], [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0]];
const rotr64 = (x, n) => ((x >> n) | (x << (64n - n))) & M64;
function b2compress(h, block, t, last) {
    const dv = new DataView(block.buffer, block.byteOffset, 128);
    const m = Array.from({ length: 16 }, (_, i) => dv.getBigUint64(i * 8, true));
    const v = [...h, ...B2_IV];
    v[12] ^= t & M64; v[13] ^= t >> 64n;
    if (last) v[14] ^= M64;
    const G = (a, b, c, d, x, y) => {
        v[a] = (v[a] + v[b] + x) & M64; v[d] = rotr64(v[d] ^ v[a], 32n);
        v[c] = (v[c] + v[d]) & M64; v[b] = rotr64(v[b] ^ v[c], 24n);
        v[a] = (v[a] + v[b] + y) & M64; v[d] = rotr64(v[d] ^ v[a], 16n);
        v[c] = (v[c] + v[d]) & M64; v[b] = rotr64(v[b] ^ v[c], 63n);
    };
    for (let r = 0; r < 12; r++) {
        const s = SIGMA[r % 10];
        G(0, 4, 8, 12, m[s[0]], m[s[1]]); G(1, 5, 9, 13, m[s[2]], m[s[3]]); G(2, 6, 10, 14, m[s[4]], m[s[5]]); G(3, 7, 11, 15, m[s[6]], m[s[7]]);
        G(0, 5, 10, 15, m[s[8]], m[s[9]]); G(1, 6, 11, 12, m[s[10]], m[s[11]]); G(2, 7, 8, 13, m[s[12]], m[s[13]]); G(3, 4, 9, 14, m[s[14]], m[s[15]]);
    }
    for (let i = 0; i < 8; i++) h[i] ^= v[i] ^ v[i + 8];
}
// BLAKE2b with an optional 16-byte personalization (no key, no salt), outLen ≤ 64 bytes.
export function blake2b(data, { outLen = 32, personal = null } = {}) {
    const h = B2_IV.slice();
    h[0] ^= 0x01010000n ^ BigInt(outLen);
    if (personal) {
        const p = typeof personal === 'string' ? ascii(personal) : personal;
        if (p.length !== 16) throw new Error('personalization must be 16 bytes');
        const pv = new DataView(p.buffer, p.byteOffset, 16);
        h[6] ^= pv.getBigUint64(0, true); h[7] ^= pv.getBigUint64(8, true);
    }
    const block = new Uint8Array(128);
    let t = 0n, off = 0;
    while (data.length - off > 128) { block.set(data.subarray(off, off + 128)); t += 128n; b2compress(h, block, t, false); off += 128; }
    block.fill(0); block.set(data.subarray(off)); t += BigInt(data.length - off);
    b2compress(h, block, t, true);
    const out = new Uint8Array(64), ov = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) ov.setBigUint64(i * 8, h[i], true);
    return out.slice(0, outLen);
}
const B2 = (personal, ...parts) => blake2b(concat(...parts), { personal });

// ------------------------------------------------------------ base58check and testnet addresses

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function base58encode(bytes) {
    let n = 0n;
    for (const b of bytes) n = n * 256n + BigInt(b);
    let s = '';
    while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
    for (const b of bytes) { if (b !== 0) break; s = '1' + s; }
    return s;
}
export function base58decode(text) {
    let n = 0n;
    for (const c of String(text)) { const i = B58.indexOf(c); if (i < 0) throw new Error('bad base58'); n = n * 58n + BigInt(i); }
    const out = [];
    while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
    for (const c of String(text)) { if (c !== '1') break; out.unshift(0); }
    return Uint8Array.from(out);
}
const checksum = payload => sha256(sha256(payload)).slice(0, 4);
export const base58check = payload => base58encode(concat(payload, checksum(payload)));
export function base58checkDecode(text) {
    const b = base58decode(text);
    if (b.length < 5) throw new Error('too short');
    const payload = b.slice(0, -4);
    if (bytesToHex(checksum(payload)) !== bytesToHex(b.slice(-4))) throw new Error('bad checksum');
    return payload;
}

// Testnet prefixes (librustzcash zcash_protocol::constants::testnet).
export const TESTNET_P2PKH = Uint8Array.of(0x1d, 0x25);   // tm…
export const TESTNET_P2SH = Uint8Array.of(0x1c, 0xba);    // t2…
export const taddrFromPubkey = pubkey33 => base58check(concat(TESTNET_P2PKH, hash160(pubkey33)));
// A testnet transparent address → { kind: 'p2pkh' | 'p2sh', hash: 20 bytes }, or null.
export function decodeTaddr(addr) {
    try {
        const p = base58checkDecode(addr);
        if (p.length !== 22) return null;
        if (p[0] === TESTNET_P2PKH[0] && p[1] === TESTNET_P2PKH[1]) return { kind: 'p2pkh', hash: p.slice(2) };
        if (p[0] === TESTNET_P2SH[0] && p[1] === TESTNET_P2SH[1]) return { kind: 'p2sh', hash: p.slice(2) };
    } catch { /* not base58check */ }
    return null;
}
export const isTestnetTaddr = a => !!decodeTaddr(a);

// ------------------------------------------------------------ scripts

export const p2pkhScript = hash20 => concat(Uint8Array.of(0x76, 0xa9, 0x14), hash20, Uint8Array.of(0x88, 0xac));
export function scriptForTaddr(addr) {
    const d = decodeTaddr(addr);
    if (!d) throw new Error('not a testnet transparent address: ' + addr);
    return d.kind === 'p2pkh' ? p2pkhScript(d.hash) : concat(Uint8Array.of(0xa9, 0x14), d.hash, Uint8Array.of(0x87));
}
export const MAX_OP_RETURN = 80;          // Zebra's and zcashd's standard data carrier: 83-byte script
export function opReturnScript(data) {
    if (data.length > MAX_OP_RETURN) throw new Error('OP_RETURN data over 80 bytes');
    return data.length <= 75 ? concat(Uint8Array.of(0x6a, data.length), data) : concat(Uint8Array.of(0x6a, 0x4c, data.length), data);
}
const push = data => concat(Uint8Array.of(data.length), data);   // data ≤ 75 bytes
export const p2pkhScriptSig = (derSig, pubkey33, hashType = SIGHASH_ALL) => concat(push(concat(derSig, Uint8Array.of(hashType))), push(pubkey33));

// ------------------------------------------------------------ v5 transparent transactions (ZIP 225, ZIP 244)

export const TX_VERSION = 5;
export const V5_HEADER = 0x80000005;           // fOverwintered | version 5
export const V5_VERSION_GROUP_ID = 0x26a7270a;
export const SIGHASH_ALL = 0x01;
// Consensus branches under which a v5 transaction is valid (librustzcash BranchId).
export const V5_BRANCHES = Object.freeze({ nu5: 0xc2d6d0b4, nu6: 0xc8e71055, nu6_1: 0x4dec4df0, nu6_2: 0x5437f330, nu6_3: 0x37a5165b, nu7: 0x77190ad9 });
export const isV5Branch = id => Object.values(V5_BRANCHES).includes(id >>> 0);

// txid as the RPC prints it ↔ the 32 bytes in an outpoint.
export const txidToBytes = hex => reverse(hexToBytes(hex));
export const txidToHex = bytes => bytesToHex(reverse(bytes));

// tx = { branchId, lockTime, expiryHeight,
//        vin:  [{ txid (hex, as printed), vout, value (zatoshis, BigInt), scriptPubKey (bytes), sequence, scriptSig? }],
//        vout: [{ value (BigInt), script (bytes) }] }
const outpoint = i => concat(txidToBytes(i.txid), u32le(i.vout));
const seqOf = i => (i.sequence ?? 0xffffffff) >>> 0;
const outBytes = o => concat(u64le(o.value), withLength(o.script));

export function serializeTx(tx) {
    return concat(
        u32le(V5_HEADER), u32le(V5_VERSION_GROUP_ID), u32le(tx.branchId), u32le(tx.lockTime || 0), u32le(tx.expiryHeight || 0),
        compactSize(tx.vin.length), ...tx.vin.map(i => concat(outpoint(i), withLength(i.scriptSig || new Uint8Array(0)), u32le(seqOf(i)))),
        compactSize(tx.vout.length), ...tx.vout.map(outBytes),
        Uint8Array.of(0, 0, 0)                     // no Sapling spends, no Sapling outputs, no Orchard actions
    );
}

export const headerDigest = tx => B2('ZTxIdHeadersHash', u32le(V5_HEADER), u32le(V5_VERSION_GROUP_ID), u32le(tx.branchId), u32le(tx.lockTime || 0), u32le(tx.expiryHeight || 0));
const prevoutsDigest = tx => B2('ZTxIdPrevoutHash', ...tx.vin.map(outpoint));
const sequenceDigest = tx => B2('ZTxIdSequencHash', ...tx.vin.map(i => u32le(seqOf(i))));
const outputsDigest = tx => B2('ZTxIdOutputsHash', ...tx.vout.map(outBytes));
export function transparentDigest(tx) {
    if (!tx.vin.length && !tx.vout.length) return B2('ZTxIdTranspaHash');
    return B2('ZTxIdTranspaHash', prevoutsDigest(tx), sequenceDigest(tx), outputsDigest(tx));
}
export const EMPTY_SAPLING_DIGEST = B2('ZTxIdSaplingHash');
export const EMPTY_ORCHARD_DIGEST = B2('ZTxIdOrchardHash');
const topDigest = (branchId, ...parts) => blake2b(concat(...parts), { personal: concat(ascii('ZcashTxHash_'), u32le(branchId)) });

// The ZIP 244 txid digest (32 bytes, as it sits in an outpoint). The shielded digests default to
// "no bundle"; the test passes the digests of a vector's Orchard bundle.
export const txidDigest = (tx, { sapling = EMPTY_SAPLING_DIGEST, orchard = EMPTY_ORCHARD_DIGEST } = {}) =>
    topDigest(tx.branchId, headerDigest(tx), transparentDigest(tx), sapling, orchard);
export const txid = tx => txidToHex(txidDigest(tx));

// The digest a transparent input signs (ZIP 244 S.2), SIGHASH_ALL only.
export function sighashAll(tx, index, { sapling = EMPTY_SAPLING_DIGEST, orchard = EMPTY_ORCHARD_DIGEST } = {}) {
    const i = tx.vin[index];
    if (!i) throw new Error('no input ' + index);
    const amounts = B2('ZTxTrAmountsHash', ...tx.vin.map(x => u64le(x.value)));
    const scripts = B2('ZTxTrScriptsHash', ...tx.vin.map(x => withLength(x.scriptPubKey)));
    const txin = B2('Zcash___TxInHash', outpoint(i), u64le(i.value), withLength(i.scriptPubKey), u32le(seqOf(i)));
    const tsig = B2('ZTxIdTranspaHash', Uint8Array.of(SIGHASH_ALL), prevoutsDigest(tx), amounts, scripts, sequenceDigest(tx), outputsDigest(tx), txin);
    return topDigest(tx.branchId, headerDigest(tx), tsig, sapling, orchard);
}

// ------------------------------------------------------------ fees (ZIP 317)

export const MARGINAL_FEE = 5000n;        // zatoshis per logical action (Zebra may report less: getstandardfee)
export const GRACE_ACTIONS = 2n;
const P2PKH_SIG_SCRIPT_MAX = 1 + 73 + 1 + 33;   // push(DER ≤ 72 + hash type), push(compressed key)
// The conventional fee of a transparent-only transaction whose inputs are P2PKH (counted at the
// largest signature size, so the fee never falls short once signed).
export function conventionalFee(tx, marginal = MARGINAL_FEE) {
    const inSize = tx.vin.reduce((n, i) => n + 36 + compactSize(P2PKH_SIG_SCRIPT_MAX).length + P2PKH_SIG_SCRIPT_MAX + 4, 0);
    const outSize = tx.vout.reduce((n, o) => n + outBytes(o).length, 0);
    const ceil = (a, b) => BigInt(Math.ceil(a / b));
    const logical = ceil(inSize, 150) > ceil(outSize, 34) ? ceil(inSize, 150) : ceil(outSize, 34);
    return BigInt(marginal) * (logical > GRACE_ACTIONS ? logical : GRACE_ACTIONS);
}

// ------------------------------------------------------------ ZIP 321 payment requests

export function zatsToZec(zats) {
    const v = BigInt(zats), s = v.toString().padStart(9, '0');
    const whole = s.slice(0, -8), frac = s.slice(-8).replace(/0+$/, '');
    return whole + (frac ? '.' + frac : '');
}
export function zip321Uri(address, zats, { label, message } = {}) {
    if (!isTestnetTaddr(address)) throw new Error('not a testnet transparent address');
    const q = [`amount=${zatsToZec(zats)}`];
    if (label) q.push('label=' + encodeURIComponent(label));
    if (message) q.push('message=' + encodeURIComponent(message));
    return `zcash:${address}?${q.join('&')}`;
}
