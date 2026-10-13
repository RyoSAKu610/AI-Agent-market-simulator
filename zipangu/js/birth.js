// 📜 Birth certificates for the AIs brought into the world (js/soul.js).
//
// When an AI arrives, its soul card is sealed with a salted SHA-256 commitment:
//
//     digest = SHA-256("ZIPANGU-BIRTH/1\n" + salt + "\n" + canonical card)
//
// Only the digest (and the resident's random id) is ever written on chain, as a
// Solana devnet memo, so the chain proves *that* this AI was born here and when,
// without revealing a word of its card. The 128-bit salt stays on this device
// (and in the certificate file the visitor can save), so nobody can confirm a
// guessed card against the chain; with the card and the salt, anyone can check it.

export const BIRTH_MARK = 'ZIPANGU-BIRTH/1';
const STORE_KEY = 'zipangu.births.v1';
// Everything about the card that makes it this AI. Order is fixed; keys are sorted inside.
const FIELDS = ['id', 'name', 'from', 'personality', 'specialty', 'memories', 'values', 'ambition', 'goal', 'era', 'look', 'greeting', 'arrived'];

export function canonicalCard(card) {
    const out = {};
    for (const k of FIELDS) {
        const v = card ? card[k] : undefined;
        out[k] = Array.isArray(v) ? v.map(x => String(x)) : v == null ? '' : String(v);
    }
    return JSON.stringify(out);
}

const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const cryptoOf = c => c || globalThis.crypto;

export async function sha256Hex(text, cryptoImpl) {
    const c = cryptoOf(cryptoImpl);
    const buf = await c.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return hex(new Uint8Array(buf));
}

export function newSalt(cryptoImpl) {
    const b = new Uint8Array(16);
    cryptoOf(cryptoImpl).getRandomValues(b);
    return hex(b);
}

export const commitment = (card, salt, cryptoImpl) => sha256Hex(`${BIRTH_MARK}\n${salt}\n${canonicalCard(card)}`, cryptoImpl);

// A new certificate, sealed on this device. Not on chain yet.
export async function makeBirth(card, { salt, cryptoImpl, now = () => new Date().toISOString() } = {}) {
    const s = salt || newSalt(cryptoImpl);
    return { v: 1, id: card.id, digest: await commitment(card, s, cryptoImpl), salt: s, at: now(), chain: null };
}

// The memo written on devnet: no names, no text from the card.
export const birthMemo = birth => `zipangu:birth|v=1|id=${birth.id}|h=${birth.digest}`;

// Does this card (with this salt) match the certificate?
export async function verifyBirth(card, birth, cryptoImpl) {
    if (!birth || !/^[0-9a-f]{64}$/.test(birth.digest || '') || !/^[0-9a-f]{32}$/.test(birth.salt || '')) return false;
    if (card.id !== birth.id) return false;
    return (await commitment(card, birth.salt, cryptoImpl)) === birth.digest;
}

// The memo text of a parsed devnet transaction (getParsedTransaction), or null.
export function memoOf(parsed) {
    const ixs = (parsed && parsed.transaction && parsed.transaction.message && parsed.transaction.message.instructions) || [];
    const ix = ixs.find(i => i && (i.program === 'spl-memo' || String(i.programId || '') === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'));
    return ix && typeof ix.parsed === 'string' ? ix.parsed : null;
}

// Is this transaction the birth of exactly this certificate, and did it succeed?
export function checkBirthTx(parsed, birth) {
    if (!parsed) return { ok: false, reason: 'notfound' };
    if (parsed.meta && parsed.meta.err) return { ok: false, reason: 'failed' };
    return memoOf(parsed) === birthMemo(birth) ? { ok: true } : { ok: false, reason: 'mismatch' };
}

// ------------------------------------------------------------ storage (this device only)

const SIG = /^[1-9A-HJ-NP-Za-km-z]{43,90}$/;     // base58 transaction signature
function cleanBirth(b) {
    if (!b || b.v !== 1 || !/^trav_[a-z0-9]{1,13}$/.test(String(b.id))
        || !/^[0-9a-f]{64}$/.test(String(b.digest)) || !/^[0-9a-f]{32}$/.test(String(b.salt))) return null;
    const c = b.chain && SIG.test(String(b.chain.sig)) ? {
        sig: String(b.chain.sig), slot: Number.isFinite(b.chain.slot) ? b.chain.slot : null,
        cluster: 'devnet', verified: b.chain.verified === true, at: String(b.chain.at || '').slice(0, 32)
    } : null;
    return { v: 1, id: String(b.id), digest: String(b.digest), salt: String(b.salt), at: String(b.at || '').slice(0, 32), chain: c };
}

export function loadBirths(storage) {
    let obj;
    try { obj = JSON.parse(storage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
    const out = {};
    if (obj && typeof obj === 'object') for (const b of Object.values(obj)) { const c = cleanBirth(b); if (c) out[c.id] = c; }
    return out;
}

export function saveBirth(storage, birth) {
    const all = loadBirths(storage);
    const c = cleanBirth(birth);
    if (!c) return false;
    all[c.id] = c;
    try { storage.setItem(STORE_KEY, JSON.stringify(all)); return true; } catch { return false; }
}

export function forgetBirth(storage, id) {
    const all = loadBirths(storage);
    delete all[id];
    try { storage.setItem(STORE_KEY, JSON.stringify(all)); } catch { /* fine */ }
}

// The file a visitor keeps: everything needed to prove the birth later, on any device.
export function certificateFile(card, birth) {
    return JSON.stringify({
        format: BIRTH_MARK,
        about: 'Kaleidoscope Zipangu birth certificate. digest = SHA-256("ZIPANGU-BIRTH/1\\n" + salt + "\\n" + card). Keep this file private: the salt and card prove the birth; the chain holds only the digest.',
        card: JSON.parse(canonicalCard(card)),
        salt: birth.salt, digest: birth.digest, sealed: birth.at,
        chain: birth.chain ? { cluster: 'devnet', memo: birthMemo(birth), signature: birth.chain.sig, slot: birth.chain.slot } : null
    }, null, 2);
}
