// 江戸前 Edomae — the physics of water, without the DOM. Pure: no imports, so the
// Node tests load it as is.
//
// A surface is a 1D height field: a row of cells along the water seen from the side,
// each with a height h and a velocity v, coupled to its neighbours by a wave equation
// with a restoring force and damping. Disturbances spread at the wave speed, reflect
// off the banks and die away. It is stepped at a fixed 1/120 s, so it behaves the same
// at 60 fps, at 30 fps and when stepped in ?debug.
//
// Ripple rings (seen in perspective as flattened ellipses) expand at the wave speed and
// fade; droplets fly on ballistic arcs under gravity; a splash crown is a keyed shape
// sequence (rise → open → pinch off → fall). Pools have hard caps.

export const FIXED_DT = 1 / 120;

// n cells, dx units apart; c: wave speed (units/s); k: restoring stiffness; damp: damping.
export function createHeightField(n, { dx = 2, c = 34, k = 2.2, damp = 1.6 } = {}) {
    n = Math.max(3, n | 0);
    const h = new Float64Array(n), v = new Float64Array(n);
    let acc = 0;
    const c2 = (c * c) / (dx * dx);
    // a stable explicit step needs c·dt/dx < 1; substep further if a caller asks for a fast wave
    const sub = Math.max(1, Math.ceil((c * FIXED_DT) / (dx * 0.7)));
    const sdt = FIXED_DT / sub;
    function stepFixed() {
        for (let s = 0; s < sub; s++) {
            for (let i = 0; i < n; i++) {
                const l = i > 0 ? h[i - 1] : h[i + 1];           // reflecting (mirrored) banks
                const r = i < n - 1 ? h[i + 1] : h[i - 1];
                v[i] += (c2 * (l + r - 2 * h[i]) - k * h[i] - damp * v[i]) * sdt;
            }
            for (let i = 0; i < n; i++) h[i] += v[i] * sdt;
        }
    }
    return {
        n, dx, c, h, v,
        // advance by dt seconds (clamped so a long pause does not explode the field)
        step(dt) {
            acc += Math.min(Math.max(0, dt), 0.1);
            let steps = 0;
            while (acc >= FIXED_DT && steps < 12) { stepFixed(); acc -= FIXED_DT; steps++; }
            if (steps >= 12) acc = 0;
            return steps;
        },
        // push the surface at x (units from the left bank) with velocity impulse `imp`, spread over `w` units
        poke(x, imp, w = 3) {
            const i0 = x / dx, r = Math.max(1, w / dx);
            for (let i = Math.max(0, Math.floor(i0 - 2 * r)); i <= Math.min(n - 1, Math.ceil(i0 + 2 * r)); i++) {
                const d = (i - i0) / r;
                v[i] += imp * Math.exp(-d * d);
            }
        },
        sample(x) {
            const f = Math.max(0, Math.min(n - 1, x / dx)), i = Math.min(n - 2, Math.floor(f)), u = f - i;
            return h[i] * (1 - u) + h[i + 1] * u;
        },
        slope(x) { return (this.sample(x + dx) - this.sample(x - dx)) / (2 * dx); },
        // kinetic + potential energy of the field (for tests): it never grows without input
        energy() {
            let e = 0;
            for (let i = 0; i < n; i++) {
                e += 0.5 * v[i] * v[i] + 0.5 * k * h[i] * h[i];
                if (i < n - 1) { const g = h[i + 1] - h[i]; e += 0.5 * c2 * g * g; }
            }
            return e;
        }
    };
}

// A ripple ring t seconds after it starts: radius grows at the wave speed, amplitude decays.
export function ringAt(t, { speed = 14, a0 = 1, tau = 0.9 } = {}) {
    if (t < 0) return { r: 0, a: 0 };
    return { r: speed * t, a: a0 * Math.exp(-t / tau) / Math.sqrt(1 + 2 * t) };
}

// Ballistic flight: position after t seconds (y down positive, g > 0 pulls down).
export function ballistic(x0, y0, vx, vy, g, t) {
    return [x0 + vx * t, y0 + vy * t + 0.5 * g * t * t];
}
// When does a droplet thrown from y0 (above the surface yS, y down) fall back to yS?
export function landTime(y0, vy, g, yS) {
    // y0 + vy t + g t²/2 = yS  →  t = (-vy + sqrt(vy² + 2 g (yS - y0))) / g
    const disc = vy * vy + 2 * g * (yS - y0);
    if (disc < 0) return Infinity;
    return (-vy + Math.sqrt(disc)) / g;
}

// A fixed-size pool: acquire() returns a free slot or null when all are in use.
export function createPool(cap, make) {
    const items = Array.from({ length: cap }, (_, i) => Object.assign(make(i), { alive: false }));
    let live = 0;
    return {
        cap, items,
        get live() { return live; },
        acquire() { for (const it of items) if (!it.alive) { it.alive = true; live++; return it; } return null; },
        release(it) { if (it.alive) { it.alive = false; live--; } }
    };
}

// ---------------------------------------------------------------- the splash crown

// Keyed shape of a crown at u ∈ [0,1] (0.85 s in real time): for each tongue, its lean
// angle (radians from straight up), length, base half-width, tip bulb radius, and
// whether its tip has pinched off. Rise → open → pinch off → fall, eased and overlapping.
const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export function crownKeys(u, n = 5, size = 1, seed = 1) {
    const out = [];
    const rise = ease(u / 0.26), open = ease((u - 0.1) / 0.4), pinch = ease((u - 0.4) / 0.2), fall = ease((u - 0.58) / 0.42);
    for (let i = 0; i < n; i++) {
        const s = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;                     // -1 … 1 across the crown
        const jit = Math.sin(seed * 12.9898 + i * 78.233) * 0.5 + 0.5;       // 0..1, fixed per tongue
        const lean = s * (0.3 + 0.75 * open) + (jit - 0.5) * 0.22;
        const len = size * (6 + 6 * jit) * (0.7 + 0.3 * (1 - Math.abs(s))) * rise * (1 - 0.7 * fall) * (1 - 0.2 * pinch);
        const base = size * (1.5 + 0.9 * (1 - Math.abs(s))) * (1 - 0.45 * fall);
        const bulb = size * (0.85 + 0.55 * jit) * (0.7 + 0.3 * open) * (1 - pinch * 0.6) * (1 - 0.4 * fall);
        out.push({ lean, len, base, bulb, pinched: pinch > 0.5 && jit > 0.25, jit });
    }
    // the central jet: up first, then sinks back
    const jet = size * 8 * ease(u / 0.32) * (1 - ease((u - 0.32) / 0.45));
    return { tongues: out, jet, sheet: rise * (1 - fall), done: u >= 1 };
}

// ---------------------------------------------------------------- rain from the world

// Deterministic showers: whether a game day has a shower depends on its 節気 (the rainy
// season of 芒種・夏至・小暑 rains most) and a hash of the day and seed. Returns the
// intensity 0..1 at game time T (days).
const RAINY = [0.18, 0.3, 0.26, 0.3, 0.34, 0.42, 0.3, 0.36, 0.7, 0.72, 0.62, 0.3, 0.26, 0.32, 0.36, 0.42, 0.3, 0.28, 0.2, 0.16, 0.12, 0.12, 0.14, 0.16];
function h01(a, b) {
    let x = (Math.imul(a | 0, 2654435761) ^ Math.imul((b | 0) + 0x9e37, 40503)) >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
}
export function showerOf(dayIndex, sekkiIndex, seed = 1) {
    const p = RAINY[((sekkiIndex % 24) + 24) % 24];
    if (h01(dayIndex * 7 + 3, seed) >= p) return null;
    const start = 0.05 + 0.75 * h01(dayIndex * 7 + 5, seed);
    const len = 0.06 + 0.14 * h01(dayIndex * 7 + 11, seed);
    return { start, end: Math.min(0.99, start + len), peak: 0.45 + 0.55 * h01(dayIndex * 7 + 13, seed) };
}
export function rainAt(T, sekkiOf, seed = 1) {
    const d = Math.floor(T), t = T - d;
    const sh = showerOf(d, sekkiOf(d), seed);
    if (!sh || t < sh.start || t > sh.end) return 0;
    const ramp = Math.min(1, (t - sh.start) / 0.02, (sh.end - t) / 0.03);
    return Math.max(0, sh.peak * ramp);
}
// How wet the street is (puddles): rises during rain, dries over about half a day after.
export function wetness(T, sekkiOf, seed = 1) {
    let w = 0;
    for (let d = Math.floor(T) - 1; d <= Math.floor(T); d++) {
        const sh = showerOf(d, sekkiOf(d), seed);
        if (!sh) continue;
        const s = d + sh.start, e = d + sh.end;
        if (T < s) continue;
        const fill = Math.min(1, (Math.min(T, e) - s) / 0.04) * sh.peak;
        const dry = T > e ? Math.exp(-(T - e) / 0.18) : 1;
        w = Math.max(w, fill * dry);
    }
    return w;
}
