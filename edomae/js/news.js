// 江戸前 Edomae — what the street reads and how it pays. Pure: no DOM, no imports.
//
// Headlines on the 瓦版 and newspapers are real lines from this economy's own feed
// (the sim's event messages, as zipangu's HUD shows them) — never invented news.
// Money is drawn in the form that fits the place; amounts are the sim's own totals,
// written in the place's currency when one is issued there (currencies.json).

// What changes hands, by architectural family. 桜の森 asks no price (the charter),
// so nothing but a bow passes there.
export const MONEY = {
    jomon: 'cord', heian: 'coin', hiraizumi: 'leaf', sengoku: 'zeni', edo: 'zeni', meiji: 'coin', taisho: 'note',
    showa: 'note', reiwa: 'token', ginga: 'ticket', ihatov: 'coin', tono: 'coin', sakura: 'none', ryugu: 'scale',
    tsuki: 'pearl', tenshu: 'pearl', yume: 'slip'
};
// A large payment in Edo looks like gold: 小判 instead of a string of 銭.
export const BIG = 600;

export function moneyOf(family, total = 0) {
    const kind = MONEY[family] || 'coin';
    if (kind === 'zeni' && total >= BIG) return 'koban';
    return kind;
}

// What comes back for the money, by the good's category.
export function goodsOf(category) {
    switch (category) {
        case 'food': return 'bundle';
        case 'material': case 'transport': return 'bundle';
        case 'energy': return 'jar';
        case 'knowledge': return 'scroll';
        case 'luxury': case 'craft': case 'art': return 'box';
        default: return 'none';                 // a service: only the bow
    }
}

const stripParens = s => String(s == null ? '' : s).replace(/（[^）]*）|\([^)]*\)/g, '').trim();
export const shortCurrency = c => stripParens(c && c.name_ja).split('／')[0] || '刻';

// The currency issued inside a place (by a district there), else the base currency.
export function currencyFor(currencies, districtIds, base) {
    for (const c of currencies || []) if (c && c.issuer && districtIds.has(c.issuer) && !c.base) return c;
    return base || (currencies || []).find(c => c && c.base) || { id: 'koku', name_ja: '刻', to_base: 1 };
}

// 1234 → 千二百三十四
const DIG = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
export function kanjiNumber(n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    if (n === 0) return '零';
    const part = x => {
        let s = '';
        for (const [v, u] of [[1000, '千'], [100, '百'], [10, '十']]) { const d = Math.floor(x / v) % 10; if (d) s += (d === 1 ? '' : DIG[d]) + u; }
        return s + DIG[x % 10];
    };
    let out = '';
    const oku = Math.floor(n / 1e8), man = Math.floor(n / 1e4) % 1e4, rest = n % 1e4;
    if (oku) out += part(oku) + '億';
    if (man) out += part(man) + '万';
    return out + part(rest);
}

// The sim's total (in base currency) written in a currency: 「三百二十 蛍銭」
export function amountText(total, currency) {
    const per = Number(currency && currency.to_base) || 1;
    const n = Math.max(1, Math.round((Number(total) || 0) / per));
    return kanjiNumber(n) + shortCurrency(currency);
}

// One line of the economy's feed, trimmed for a sheet: spaces closed up, readings dropped.
export function headline(msg, max = 34) {
    if (!msg || !msg.message) return '';
    const s = stripParens(String(msg.message)).replace(/\s+/g, '').replace(/^✦/, '');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

const NEWSY = { event: 4, settle: 3, trade: 2, arrive: 2, depart: 1, encounter: 1, goal: 3 };

// Pick the line a reader in a place is reading: the newest newsworthy line about that
// place, else the newest newsworthy line anywhere. feed: oldest → newest.
export function pickHeadline(feed, placeDistricts) {
    let best = null, bestScore = -1;
    for (let i = feed.length - 1; i >= 0 && i >= feed.length - 60; i--) {
        const m = feed[i];
        if (!m || !m.message || !(m.type in NEWSY)) continue;
        const local = [m.district, m.from, m.to].some(d => d && placeDistricts && placeDistricts.has(d));
        const score = NEWSY[m.type] + (local ? 5 : 0) + (i - feed.length) * 0.01;
        if (score > bestScore) { bestScore = score; best = m; }
    }
    return best;
}

// Who carries what to read, by family: a 瓦版 in Edo and before, a newspaper later.
export function sheetOf(family) {
    return ['edo', 'sengoku', 'heian', 'jomon', 'hiraizumi', 'tono', 'sakura', 'tenshu', 'yume', 'tsuki'].includes(family) ? 'kawaraban' : 'shinbun';
}
export const SHEET_TITLE = { kawaraban: '瓦版', shinbun: '新聞' };

// Deterministic pacing for ambient scenes: the n-th wait (seconds) of a vignette.
export function ambientDelay(seed, n, lo = 7, hi = 16) {
    let x = (Math.imul(seed | 0, 2654435761) ^ Math.imul((n + 1) | 0, 40503)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13;
    return lo + (hi - lo) * ((x >>> 0) / 4294967296);
}
