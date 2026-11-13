// 江戸前 Edomae — the 万世時計 (不定時法) mapped onto the line-art day.
// Pure: no DOM, no imports.
//
// The economy's clock gives t (time of day, 0 = midnight) and the season's dawn
// (明け六つ) and dusk (暮れ六つ). The line-art palette puts dawn at τ = 0.25 and dusk
// at τ = 0.75. tauOf maps the lit half [dawn, dusk] onto [0.25, 0.75] and the night
// onto the rest, so every 刻 keeps its colour whatever the season. Midnight is τ = 0
// in every season (the night is symmetric about it), so the mapping is continuous
// across days too.

const wrap = x => ((x % 1) + 1) % 1;

export function tauOf(clock) {
    const t = wrap(Number(clock && clock.t) || 0);
    let dawn = Number(clock && clock.dawn), dusk = Number(clock && clock.dusk);
    if (!(dawn > 0 && dusk > dawn && dusk < 1)) { dawn = 0.25; dusk = 0.75; }
    if (t >= dawn && t <= dusk) return 0.25 + 0.5 * (t - dawn) / (dusk - dawn);
    const night = 1 - (dusk - dawn);
    const u = wrap(t - dusk) / night;              // 0 at 暮れ六つ … 1 at 明け六つ
    return wrap(0.75 + 0.5 * u);
}

// Inverse for one day's dawn/dusk: the time of day t that gives τ (for tests and ?tau).
export function tOfTau(tau, dawn = 0.25, dusk = 0.75) {
    tau = wrap(tau);
    if (tau >= 0.25 && tau <= 0.75) return dawn + (tau - 0.25) / 0.5 * (dusk - dawn);
    const u = wrap(tau - 0.75) / 0.5;
    return wrap(dusk + u * (1 - (dusk - dawn)));
}

// The koku shown in the card for a pinned palette (?tau) — named like the clock's labels.
const KOKU = ['明け六つ', '朝五つ', '昼四つ', '昼九つ', '昼八つ', '夕七つ', '暮れ六つ', '宵五つ', '夜四つ', '夜九つ', '暁八つ', '暁七つ'];
export function kokuOfTau(tau) {
    tau = wrap(tau);
    if (tau >= 0.25 && tau < 0.75) return KOKU[Math.min(5, Math.floor((tau - 0.25) / 0.5 * 6))];
    return KOKU[6 + Math.min(5, Math.floor(wrap(tau - 0.75) / 0.5 * 6))];
}

// A warmer sheet of paper: the reference palette, nudged toward a warm 和紙 by day and
// a warmer indigo at night (pure, so the contrast test covers it).
const W_DAY = [246, 236, 218], W_NIGHT = [40, 36, 64];
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export function warm(P) {
    const d = 1 - P.inkT;
    return {
        ...P,
        paper: mix3(P.paper, d > 0.5 ? W_DAY : W_NIGHT, d > 0.5 ? 0.42 * d : 0.3 * (1 - d)),
        bottom: mix3(P.bottom, [250, 226, 196], 0.22 * d),
        top: mix3(P.top, [236, 226, 210], 0.12 * d)
    };
}

// ---------------------------------------------------------------- legible through the ink flip
// WCAG relative luminance and contrast ratio of two sRGB colours (0–255 triples).
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export const relLum = c => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
export const contrast = (a, b) => { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const DARK = [28, 28, 28], LIGHT = [239, 230, 207];

// At dawn and dusk the paper passes through mid-tones while the ink changes sides, and for a
// moment the two meet. legible() leaves the palette alone whenever ink on paper already clears
// `floor`; otherwise it moves the ink toward whichever end (dark ink or pale ink) reads better
// on this paper, just far enough to clear the floor. Day and night are untouched.
export function legible(P, floor = 4.5) {
    if (contrast(P.ink, P.paper) >= floor) return P;
    const toDark = contrast(DARK, P.paper) >= contrast(LIGHT, P.paper);
    const end = toDark ? DARK : LIGHT;
    let lo = 0, hi = 1;
    for (let i = 0; i < 18; i++) {
        const m = (lo + hi) / 2;
        if (contrast(mix3(P.ink, end, m), P.paper) >= floor) hi = m; else lo = m;
    }
    let ink = mix3(P.ink, end, hi);
    let paper = P.paper;
    // if even the far end cannot clear the floor, nudge the paper away from the ink
    for (let k = 0; k < 20 && contrast(ink, paper) < floor; k++) paper = mix3(paper, toDark ? [255, 250, 240] : [12, 14, 28], 0.08);
    return { ...P, ink, paper };
}
