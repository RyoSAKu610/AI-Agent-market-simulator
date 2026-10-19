// Hiding private details in free text (soul cards, inner voices, donated records).
// Shared by the browser and the donation endpoint (netlify/functions/zipangu-donate.mjs),
// so it imports nothing.

// ------------------------------------------------------------ keeping secrets out
// A pasted card is written by an AI that may have seen the visitor's real life. Anything
// that looks like a way to reach or impersonate someone is masked before it is shown,
// saved, hashed or sent to a model: e-mail, phone and card numbers, postal codes, URLs,
// API keys and tokens, private keys, and whatever follows "password:" and the like.
export const HIDDEN = '［伏せ字］';
const SECRET_PATTERNS = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g,
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,                      // JWT
    /\b(?:sk|pk|rk)-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{12,}/g,                      // OpenAI/Anthropic/Stripe-style keys
    /\b(?:ghp|gho|ghu|ghs|ghr|github_pat|glpat|hf|xox[abprs]|AKIA|ASIA|AIza)[A-Za-z0-9_-]{12,}/g,
    /\bBearer\s+[A-Za-z0-9._~+/-]{12,}=*/gi,
    /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"'）)]+/gi,                                             // URLs
    /\bwww\.[^\s<>"'）)]+/gi,
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,                                    // e-mail
    /(?:password|passcode|passphrase|pin|secret|token|api[ _-]?key|seed phrase|mnemonic|private key|パスワード|暗証番号|秘密鍵|シードフレーズ|合言葉)\s*(?:[:：=]|は|is)\s*[^\s、。,]+/gi,
    /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{1,4}\)?[\s-]){1,4}\d{3,4}(?![\d-])/g,                 // phone numbers
    /(?<![\d-])〒?\s?\d{3}-\d{4}(?![\d-])/g,                                               // postal code
    /(?:\d[ -]?){10,19}/g,                                                                // card / account numbers
    /\b(?=[A-Za-z0-9_+/=-]*\d)(?=[A-Za-z0-9_+/=-]*[A-Za-z])[A-Za-z0-9_+/=-]{32,}\b/g      // long random strings (keys, hashes)
];
// → { text, n } with each match replaced by HIDDEN
export function redactSecrets(v) {
    let text = String(v == null ? '' : v), n = 0;
    for (const re of SECRET_PATTERNS) {
        text = text.replace(re, m => {
            // a short run of digits (a year, a count) is not a phone number
            if (/^[\d\s()+-]+$/.test(m) && m.replace(/\D/g, '').length < 10 && !/^〒?\s?\d{3}-\d{4}$/.test(m.trim())) return m;
            n++;
            return HIDDEN;
        });
    }
    return { text, n };
}
