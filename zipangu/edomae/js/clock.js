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
