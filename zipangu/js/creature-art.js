// creature-art.js — the procedural renderer for every creature of 万華京ジパング.
//
// drawCreature(ctx, creature, t, size) paints one creature centred at (0,0) in a size×size box.
// Everything is drawn in "unit space" ([-1, 1] on both axes); static layers (wing patterns,
// bodies, shells) are painted once into offscreen sprites keyed by creature + resolution, and each
// frame only composes those sprites with motion, structural-colour sheen and 燐光 sparkles.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ───────────────────────── seeded randomness ─────────────────────────

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stateless randomness for per-frame particles: same (a, b) → same number, no allocation.
function h01(a, b) {
  let h = Math.imul((a ^ 0x9e3779b9) >>> 0, 0x85ebca6b) ^ Math.imul((b + 0x632be5ab) >>> 0, 0xc2b2ae35);
  h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ───────────────────────── colour ─────────────────────────

function hexTone(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x7f8cff;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

const hsla = (h, s, l, a = 1) =>
  `hsla(${(((h % 360) + 360) % 360).toFixed(1)},${(clamp(s, 0, 1) * 100).toFixed(1)}%,${(clamp(l, 0, 1) * 100).toFixed(1)}%,${clamp(a, 0, 1).toFixed(3)})`;

// Colour from a tone with lightness/alpha/hue/saturation offsets.
const C = (t, dl = 0, a = 1, dh = 0, ds = 0) => hsla(t.h + dh, t.s + ds, t.l + dl, a);
const tone = (h, s, l) => ({ h, s, l });
const hueDist = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
const mixHue = (a, b, t) => { let d = ((b - a) % 360 + 540) % 360 - 180; return a + d * t; };

// ───────────────────────── creature preparation (memoised per object) ─────────────────────────

export const SHAPES = {
  butterfly: ['swallowtail', 'morpho', 'glasswing', 'birdwing', 'moth', 'fritillary'],
  insect: ['firefly', 'beetle', 'dragonfly', 'mantis', 'cicada'],
  fish: ['goldfish', 'koi', 'ray', 'eel', 'puffer'],
  jellyfish: ['bell', 'lantern', 'ribbon'],
  bird: ['crane', 'sparrow', 'phoenix', 'owl'],
  beast: ['fox', 'cat', 'deer', 'rabbit', 'whale', 'tanuki'],
  dragon: ['serpent', 'wyrm'],
  plant: ['flower', 'tree', 'moss', 'lotus'],
  spirit: ['wisp', 'orb', 'lantern'],
  mineral: ['geode', 'crystal_cluster'],
};
const PATTERN_NAMES = ['eyespot', 'stripes', 'veins', 'scales', 'stained_glass', 'gradient', 'starfield', 'crystal', 'spots', 'plain'];
const MOVES = ['flutter', 'glide', 'swim', 'drift', 'walk', 'hover', 'still'];

const PREP = new WeakMap();

function prep(c) {
  let P = PREP.get(c);
  if (P) return P;
  const v = c.visual || {}, b = c.behavior || {};
  const kind = SHAPES[c.kind] ? c.kind : 'spirit';
  const shape = SHAPES[kind].includes(v.shape) ? v.shape : SHAPES[kind][kind === 'spirit' ? 1 : 0];
  const pattern = PATTERN_NAMES.includes(v.pattern) ? v.pattern : 'plain';
  const hexes = Array.isArray(v.palette) && v.palette.length ? v.palette.slice(0, 5) : ['#7f8cff', '#ff9ad5', '#ffe29a'];
  const id = String(c.id || 'creature');
  const seed = hashStr(id);
  const r = rng(seed);

  // Jewel tones: keep each hue, lift saturation and keep lightness in a readable band on indigo.
  const tones = hexes.map(hexTone).map((t) => tone(t.h, t.s < 0.08 ? t.s : Math.max(t.s, 0.58), clamp(t.l, 0.3, 0.74)));
  while (tones.length < 4) { const t = tones[tones.length - 1]; tones.push(tone(t.h + 47, t.s, clamp(t.l + 0.08, 0.3, 0.76))); }

  const byLight = tones.slice().sort((a, b2) => b2.l - a.l);
  const vivid = tones.slice().sort((a, b2) => (b2.s * (1 - Math.abs(b2.l - 0.58))) - (a.s * (1 - Math.abs(a.l - 0.58))))[0];
  const warmest = tones.slice().sort((a, b2) => hueDist(a.h, 8) - hueDist(b2.h, 8))[0];
  const goldest = tones.slice().sort((a, b2) => hueDist(a.h, 44) - hueDist(b2.h, 44))[0];

  const scale = clamp(Number(v.scale) || 1, 0.5, 3);
  P = {
    id, kind, shape, pattern, seed, r,
    rarity: c.rarity || 'common',
    move: MOVES.includes(b.movement) ? b.movement : 'drift',
    iri: clamp(Number(v.iridescence) || 0, 0, 1),
    glow: clamp(Number(v.glow) || 0, 0, 1),
    tones,
    ink: tone(mixHue(248, tones[0].h, 0.12), 0.52, 0.12), // deep indigo, never flat black
    light: tone(byLight[0].h, Math.min(0.85, byLight[0].s), 0.88),
    vivid: tone(vivid.h, Math.max(vivid.s, 0.75), clamp(vivid.l, 0.5, 0.66)),
    warm: hueDist(warmest.h, 8) < 40 ? tone(warmest.h, Math.max(0.7, warmest.s), 0.52) : tone(356, 0.78, 0.52),
    gold: hueDist(goldest.h, 44) < 30 ? tone(goldest.h, 0.75, 0.62) : tone(42, 0.72, 0.64), // lamplight, never garish
    fit: 0.6 + 0.38 * Math.sqrt(clamp((scale - 0.5) / 2.5, 0, 1)),
    tempo: 0.86 + r() * 0.28,
    phase: r() * 100,
    key: [id, kind, shape, pattern, hexes.join(''), v.iridescence, v.glow].join('|'),
    parts: {},
  };
  PREP.set(c, P);
  return P;
}

// ───────────────────────── geometry ─────────────────────────

// Closed or open Catmull-Rom spline through control points → dense polyline.
function spline(pts, closed = true, seg = 8) {
  const out = [], n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let j = 0; j < seg; j++) {
      const t = j / seg, t2 = t * t, t3 = t2 * t;
      const f = (k) => 0.5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  if (!closed) out.push(pts[n - 1].slice());
  return out;
}

function polyPath(pts, closed = true) {
  const p = new Path2D();
  for (let i = 0; i < pts.length; i++) (i ? p.lineTo(pts[i][0], pts[i][1]) : p.moveTo(pts[i][0], pts[i][1]));
  if (closed) p.closePath();
  return p;
}

function ellipsePts(cx, cy, rx, ry, n = 40, rot = 0) {
  const out = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

function inPoly(pts, x, y) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

// A paintable region: dense outline + bbox + origin (where veins/rays start) + outer margin.
function region(name, poly, ox, oy, margin) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return {
    name, poly, path: polyPath(poly), x0, y0, x1, y1,
    cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, d: Math.max(x1 - x0, y1 - y0),
    ox: ox ?? (x0 + x1) / 2, oy: oy ?? (y0 + y1) / 2,
    margin: margin || poly,
  };
}

function pickInside(R, rnd, tries = 24) {
  for (let i = 0; i < tries; i++) {
    const x = lerp(R.x0, R.x1, rnd()), y = lerp(R.y0, R.y1, rnd());
    if (inPoly(R.poly, x, y)) return [x, y];
  }
  return [R.cx, R.cy];
}

// ───────────────────────── sprite cache ─────────────────────────

const makeCanvas = (w, h) => {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
};

const CACHE = new Map();
const CACHE_BUDGET = 14e6; // pixels (~56 MB) before least-recently-used sprites are dropped
let cachePixels = 0;

const lodOf = (ppu) => (ppu < 30 ? 0 : ppu < 72 ? 1 : 2);
// Resolution buckets ~19% apart so pinch-zoom does not repaint every frame.
const quant = (ppu) => Math.pow(2, Math.ceil(Math.log2(Math.max(ppu, 6)) * 4) / 4);

let useClock = 0;

function cached(key, w, h, paint) {
  let s = CACHE.get(key);
  if (s) { s.used = ++useClock; return s; }
  const cv = makeCanvas(Math.max(1, w), Math.max(1, h));
  s = { cv, used: ++useClock };
  paint(cv.getContext('2d'), s);
  CACHE.set(key, s);
  cachePixels += cv.width * cv.height;
  if (cachePixels > CACHE_BUDGET) evict();
  return s;
}

// Drop the least recently used quarter of the cache (rare, so a sort is fine).
function evict() {
  const all = [...CACHE.entries()].sort((a, b) => a[1].used - b[1].used);
  for (const [k, old] of all.slice(0, Math.max(1, all.length >> 2))) {
    CACHE.delete(k);
    cachePixels -= old.cv.width * old.cv.height;
    if (old.cv.width) old.cv.width = old.cv.height = 0; // release backing store promptly
  }
}

// A sprite covering unit-space box [x0,x1]×[y0,y1], painted once per resolution bucket.
function sprite(P, name, ppu, x0, y0, x1, y1, paint) {
  const q = quant(ppu), pad = 2;
  const w = Math.ceil((x1 - x0) * q) + pad * 2, h = Math.ceil((y1 - y0) * q) + pad * 2;
  return cached(`${P.key}|${name}|${q}`, w, h, (g, s) => {
    g.setTransform(q, 0, 0, q, -x0 * q + pad, -y0 * q + pad);
    g.lineJoin = 'round'; g.lineCap = 'round';
    paint(g, { ppu: q, lod: lodOf(q), px: 1 / q });
    s.x = x0 - pad / q; s.y = y0 - pad / q; s.w = w / q; s.h = h / q;
  });
}

const blit = (ctx, s) => ctx.drawImage(s.cv, s.x, s.y, s.w, s.h);

// Soft radial light, resolution-independent (it is blurry by nature).
function glowSprite(t, core = 0.9) {
  const key = `glow|${t.h | 0}|${(t.s * 20) | 0}|${(t.l * 20) | 0}|${core}`;
  return cached(key, 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, hsla(t.h, t.s, Math.min(0.95, t.l + 0.3), core));
    gr.addColorStop(0.25, hsla(t.h, t.s, t.l + 0.1, core * 0.5));
    gr.addColorStop(0.6, hsla(t.h, t.s, t.l, core * 0.14));
    gr.addColorStop(1, hsla(t.h, t.s, t.l, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  });
}

function glow(ctx, t, x, y, r, a, core) {
  if (a <= 0.003) return;
  const s = glowSprite(t, core);
  ctx.globalAlpha = a;
  ctx.drawImage(s.cv, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

// Four-point 燐光 sparkle: a bright core with thin cross rays.
function sparkSprite(hue) {
  const hq = Math.round(hue / 15) * 15;
  return cached(`spark|${hq}`, 48, 48, (g) => {
    const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    gr.addColorStop(0, 'hsla(0,0%,100%,1)');
    gr.addColorStop(0.12, hsla(hq, 1, 0.82, 0.9));
    gr.addColorStop(0.4, hsla(hq, 1, 0.6, 0.18));
    gr.addColorStop(1, hsla(hq, 1, 0.5, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
    g.fillStyle = hsla(hq, 1, 0.9, 0.85);
    g.beginPath();
    g.moveTo(24, 1); g.quadraticCurveTo(25.5, 22.5, 47, 24); g.quadraticCurveTo(25.5, 25.5, 24, 47);
    g.quadraticCurveTo(22.5, 25.5, 1, 24); g.quadraticCurveTo(22.5, 22.5, 24, 1);
    g.fill();
  });
}

// ───────────────────────── frame helpers ─────────────────────────

function devScale(ctx) {
  if (typeof ctx.getTransform !== 'function') return 1;
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

// Whole-body motion inside the box, by movement style.
function motion(P, t) {
  const s = Math.sin;
  switch (P.move) {
    case 'flutter': return [0.05 * s(t * 0.63) + 0.018 * s(t * 1.9), 0.045 * s(t * 0.91 + 1), 0.07 * s(t * 0.53)];
    case 'glide': return [0.05 * s(t * 0.37), 0.035 * s(t * 0.55 + 2), 0.12 * s(t * 0.41)];
    case 'swim': return [0.04 * s(t * 0.45), 0.03 * s(t * 0.77), 0.05 * s(t * 0.45 + 1)];
    case 'drift': return [0.03 * s(t * 0.31), 0.06 * s(t * 0.7), 0.04 * s(t * 0.43)];
    case 'hover': return [0.025 * s(t * 1.13), 0.025 * s(t * 2.9), 0.03 * s(t * 1.7)];
    case 'walk': return [0, -0.012 * Math.abs(s(t * 2.4)), 0];
    default: return [0, 0.008 * s(t * 0.6), 0];
  }
}

// Small creatures (map icons) skip the secondary lustre passes; set per draw call.
let LITE = false;

// Gradients are built once along a unit axis and placed with a transform, so per frame we only
// look them up by quantised hue instead of rebuilding colour strings.
function sheenGradient(ctx, P, shift) {
  const hb = Math.round(shift / 8) * 8, key = 's' + hb;
  const G = P.grads || (P.grads = new Map());
  let g = G.get(key);
  if (!g) {
    const t0 = P.tones[0], t1 = P.tones[1];
    g = ctx.createLinearGradient(0, 0, 1, 0);
    g.addColorStop(0, hsla(t0.h + hb, 1, 0.5, 0.35));
    g.addColorStop(0.4, hsla(t0.h + hb + 55, 1, 0.55, 0.85));
    g.addColorStop(0.75, hsla(t1.h + hb + 110, 1, 0.58, 0.95));
    g.addColorStop(1, hsla(t1.h + hb + 170, 1, 0.52, 0.6));
    if (G.size > 160) G.clear();
    G.set(key, g);
  }
  return g;
}

function glintGradient(ctx, P, shift) {
  const hb = Math.round(shift / 12) * 12, key = 'g' + hb;
  const G = P.grads || (P.grads = new Map());
  let g = G.get(key);
  if (!g) {
    g = ctx.createLinearGradient(-0.22, 0, 0.22, 0);
    g.addColorStop(0, 'hsla(0,0%,100%,0)');
    g.addColorStop(0.5, hsla(P.tones[1].h + hb + 60, 0.9, 0.85, 1));
    g.addColorStop(1, 'hsla(0,0%,100%,0)');
    if (G.size > 160) G.clear();
    G.set(key, g);
  }
  return g;
}

// Clip to `path` and wash it with angle-dependent structural colour plus a travelling glint.
// `shift` (degrees) moves the interference hue, `pos` 0–1 places the glint along x0→x1.
function iridesce(ctx, P, path, x0, y0, x1, y1, shift, amount, pos = -1, glint = 0.6) {
  const doSheen = amount > 0.02, doGlint = pos > -0.5 && glint > 0 && !LITE;
  if (!doSheen && !doGlint) return;
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
  ctx.save();
  ctx.clip(path);
  ctx.translate(x0, y0); ctx.rotate(ang); ctx.scale(len, len);
  if (doSheen) {
    // 'overlay' re-tints while keeping the pattern's darks; a lighter 'screen' pass adds the lustre
    ctx.fillStyle = sheenGradient(ctx, P, shift);
    ctx.globalAlpha = Math.min(1, amount);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(-0.6, -1.6, 2.2, 3.2);
    if (!LITE) {
      ctx.globalAlpha = Math.min(1, amount) * 0.35;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillRect(-0.6, -1.6, 2.2, 3.2);
    }
  }
  if (doGlint) {
    ctx.translate(pos, 0);
    ctx.fillStyle = glintGradient(ctx, P, shift);
    ctx.globalAlpha = Math.min(1, glint * (0.25 + amount * 0.45));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillRect(-0.3 - pos, -1.6, 2.6, 3.2);
  }
  ctx.restore();
}

// 燐光: drifting sparkle scales. `emit(u, v)` returns a local spawn point; particles are placed in
// the frame where the creature was when they were shed, so they trail behind it.
function sparkles(ctx, P, F, n, emit, { rise = false, spread = 0.07, life = 2.6, size = 1 } = {}) {
  if (LITE) n = Math.min(n, 2);
  if (n <= 0) return;
  ctx.globalCompositeOperation = 'lighter';
  const base = P.tones[1].h;
  for (let i = 0; i < n; i++) {
    const L = life * (0.75 + 0.6 * h01(P.seed, i * 3));
    const clock = F.rt + h01(P.seed, i * 3 + 1) * L;
    const cyc = Math.floor(clock / L), age = (clock - cyc * L) / L;
    const u = h01(P.seed + cyc * 7919, i), v = h01(P.seed ^ (cyc * 104729), i + 77);
    const p = emit(u, v);
    const born = F.t - age * L * P.tempo;
    const m = motion(P, born);
    const c = Math.cos(m[2]), s = Math.sin(m[2]);
    let x = m[0] + p[0] * c - p[1] * s, y = m[1] + p[0] * s + p[1] * c;
    x += Math.sin(age * 4 + u * 9) * spread;
    y += (rise ? -1 : 1) * age * (0.22 + 0.2 * v);
    const tw = 0.55 + 0.45 * Math.sin(F.rt * (7 + v * 6) + i * 2.1);
    const a = Math.sin(Math.PI * age) * tw;
    const r = Math.max((0.035 + 0.05 * v) * size * (1 - age * 0.35), 2.2 / F.ppu);
    const hue = base + P.iri * 140 * (u - 0.5) + age * 60 * P.iri;
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.drawImage(sparkSprite(hue).cv, x - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

const sparkCount = (P, F, base = 2, k = 1) => Math.round((base + P.glow * [5, 9, 18][F.lod] * k + P.iri * [0, 2, 4][F.lod]) * (F.lod ? 1 : 0.7));

const lw = (S, units, minPx = 0.9) => Math.max(units, minPx / S.ppu);

// ───────────────────────── patterns ─────────────────────────
// Each painter fills the (already clipped) region R in unit space. `o.k` scales feature size.

function eye(g, x, y, r, P, S, ring = P.tones[2]) {
  const rr = (k, fill) => { g.beginPath(); g.arc(x, y, r * k, 0, TAU); g.fillStyle = fill; g.fill(); };
  rr(1, C(P.ink, 0, 0.95));
  if (S.lod) {
    const gr = g.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r * 0.86);
    gr.addColorStop(0, C(ring, 0.2)); gr.addColorStop(1, C(ring, -0.08));
    rr(0.86, gr);
  } else rr(0.86, C(ring, 0.05));
  rr(0.55, C(P.light, 0, 0.95));
  rr(0.42, C(P.ink, 0.02));
  rr(0.3, C(P.vivid, 0.05, 0.95, 40));
  rr(0.16, C(P.ink, 0));
  g.beginPath(); g.arc(x - r * 0.12, y - r * 0.14, r * 0.09, 0, TAU); g.fillStyle = 'hsla(0,0%,100%,.95)'; g.fill();
}

const PATTERNS = {
  plain(g, R, P) {
    const gr = g.createRadialGradient(R.cx, R.cy, 0, R.cx, R.cy, R.d * 0.6);
    gr.addColorStop(0, C(P.light, 0, 0.16)); gr.addColorStop(1, C(P.light, 0, 0));
    g.fillStyle = gr; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
  },

  gradient(g, R, P) {
    const T = P.tones, lg = g.createLinearGradient(R.ox, R.oy, R.x1 + (R.x1 - R.ox) * 0.2, R.y1);
    T.forEach((t, i) => lg.addColorStop(i / (T.length - 1), C(t, 0.04, 0.8)));
    g.fillStyle = lg; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    const gr = g.createRadialGradient(R.cx, R.cy - R.d * 0.15, 0, R.cx, R.cy, R.d * 0.55);
    gr.addColorStop(0, C(P.light, 0, 0.35)); gr.addColorStop(1, C(P.light, 0, 0));
    g.fillStyle = gr; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
  },

  stripes(g, R, P, S, o, rnd) {
    const n = 5 + ((rnd() * 4) | 0), ang = o.stripeAngle ?? (0.35 + rnd() * 0.5), d = R.d * 1.5;
    g.save();
    g.translate(R.cx, R.cy); g.rotate(ang);
    for (let i = 0; i < n; i++) {
      const x = -d / 2 + (i + 0.5) * (d / n), w = (d / n) * (0.26 + rnd() * 0.22), wob = R.d * 0.03;
      g.beginPath();
      for (let k = 0; k <= 12; k++) { const y = -d / 2 + (k / 12) * d; g.lineTo(x - w / 2 + Math.sin(k * 0.9 + i) * wob, y); }
      for (let k = 12; k >= 0; k--) { const y = -d / 2 + (k / 12) * d; g.lineTo(x + w / 2 + Math.sin(k * 0.9 + i + 0.6) * wob, y); }
      g.closePath();
      g.fillStyle = i % 2 ? C(P.ink, 0.02, 0.88) : C(P.tones[1 + (i % 3)], 0.12, 0.9);
      g.fill();
    }
    g.restore();
  },

  veins(g, R, P, S, o, rnd) {
    g.fillStyle = C(P.ink, 0.04, 0.45); g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    const tips = R.margin, step = Math.max(2, Math.floor(tips.length / (S.lod ? 9 : 5)));
    const glowT = P.tones[1], core = P.tones[2];
    const paths = [];
    for (let i = 0; i < tips.length; i += step) {
      const [ex, ey] = tips[i];
      const mx = lerp(R.ox, ex, 0.5) + (ey - R.oy) * 0.12, my = lerp(R.oy, ey, 0.5) - (ex - R.ox) * 0.12;
      const p = new Path2D(); p.moveTo(R.ox, R.oy); p.quadraticCurveTo(mx, my, ex, ey);
      if (S.lod > 1) { // fine side branches
        for (let b = 0.35; b < 0.9; b += 0.22 + rnd() * 0.1) {
          const bx = lerp(lerp(R.ox, mx, b), lerp(mx, ex, b), b), by = lerp(lerp(R.oy, my, b), lerp(my, ey, b), b);
          const sd = rnd() < 0.5 ? -1 : 1;
          p.moveTo(bx, by); p.lineTo(bx + (ey - R.oy) * 0.18 * sd + (ex - bx) * 0.3, by - (ex - R.ox) * 0.18 * sd + (ey - by) * 0.3);
        }
      }
      paths.push(p);
    }
    g.globalCompositeOperation = 'lighter';
    for (const p of paths) {
      g.strokeStyle = C(glowT, 0.05, 0.28 + P.glow * 0.25); g.lineWidth = lw(S, R.d * 0.07); g.stroke(p);
      g.strokeStyle = C(core, 0.25, 0.95); g.lineWidth = lw(S, R.d * 0.014); g.stroke(p);
    }
    g.globalCompositeOperation = 'source-over';
  },

  scales(g, R, P, S, o, rnd) {
    const s = R.d * (S.lod > 1 ? 0.055 : S.lod ? 0.09 : 0.14) * (o.k || 1);
    let row = 0;
    for (let y = R.y0 - s; y < R.y1 + s; y += s * 0.55, row++) {
      for (let x = R.x0 - s + (row % 2) * s * 0.5; x < R.x1 + s; x += s) {
        const t = P.tones[(row + ((x * 7) | 0)) % 3 === 0 ? 1 : 0];
        g.beginPath(); g.arc(x, y, s * 0.55, 0, Math.PI);
        g.fillStyle = C(t, (rnd() - 0.4) * 0.16, 0.85);
        g.fill();
        if (S.lod) { g.strokeStyle = C(P.light, 0, 0.22); g.lineWidth = lw(S, s * 0.06, 0.5); g.stroke(); }
      }
    }
  },

  stained_glass(g, R, P, S, o, rnd) {
    // Wing-like cells: sectors between rays from the origin, cut by rings — then leaded like 欄間 glass.
    let a0 = Infinity, a1 = -Infinity, rmax = 0;
    for (const [x, y] of R.poly) {
      const a = Math.atan2(y - R.oy, x - R.ox); a0 = Math.min(a0, a); a1 = Math.max(a1, a);
      rmax = Math.max(rmax, Math.hypot(x - R.ox, y - R.oy));
    }
    if (a1 - a0 > Math.PI * 1.5) { a0 = -Math.PI; a1 = Math.PI; }
    const ns = S.lod ? 6 + ((rnd() * 3) | 0) : 4, nr = S.lod ? 3 : 2;
    const rays = [a0 - 0.05]; for (let i = 1; i < ns; i++) rays.push(lerp(a0, a1, (i + (rnd() - 0.5) * 0.5) / ns)); rays.push(a1 + 0.05);
    const rings = [0]; for (let j = 1; j < nr; j++) rings.push(rmax * (j / nr) * (0.85 + rnd() * 0.3)); rings.push(rmax * 1.1);
    const lead = new Path2D();
    for (let i = 0; i < rays.length - 1; i++) {
      for (let j = 0; j < rings.length - 1; j++) {
        const cell = new Path2D();
        const A = rays[i], B = rays[i + 1], ra = rings[j], rb = rings[j + 1];
        cell.moveTo(R.ox + Math.cos(A) * ra, R.oy + Math.sin(A) * ra);
        cell.lineTo(R.ox + Math.cos(A) * rb, R.oy + Math.sin(A) * rb);
        cell.arc(R.ox, R.oy, rb, A, B);
        cell.lineTo(R.ox + Math.cos(B) * ra, R.oy + Math.sin(B) * ra);
        if (ra > 0) cell.arc(R.ox, R.oy, ra, B, A, true);
        cell.closePath();
        const t = P.tones[(i * 2 + j + ((rnd() * 2) | 0)) % P.tones.length];
        const am = (A + B) / 2, rm = (ra + rb) / 2;
        const cx = R.ox + Math.cos(am) * rm, cy = R.oy + Math.sin(am) * rm;
        if (S.lod) {
          const gr = g.createRadialGradient(cx, cy, 0, cx, cy, (rb - ra) * 0.9 + 0.05);
          gr.addColorStop(0, C(t, 0.24, 0.95)); gr.addColorStop(1, C(t, -0.06, 0.92));
          g.fillStyle = gr;
        } else g.fillStyle = C(t, 0.08, 0.95);
        g.fill(cell);
        lead.addPath(cell);
      }
    }
    g.strokeStyle = C(P.ink, -0.02, 0.95); g.lineWidth = lw(S, R.d * 0.035, 1); g.stroke(lead);
    if (S.lod) { g.strokeStyle = C(P.gold, 0.05, 0.5); g.lineWidth = lw(S, R.d * 0.008, 0.5); g.stroke(lead); }
  },

  starfield(g, R, P, S, o, rnd) {
    const gr = g.createRadialGradient(R.cx, R.cy, 0, R.cx, R.cy, R.d * 0.75);
    gr.addColorStop(0, C(P.tones[0], -0.18, 0.9)); gr.addColorStop(1, C(P.ink, -0.03, 0.96));
    g.fillStyle = gr; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    for (let i = 0; i < 3; i++) { // nebulae
      const [x, y] = pickInside(R, rnd), r = R.d * (0.2 + rnd() * 0.25);
      const ng = g.createRadialGradient(x, y, 0, x, y, r);
      ng.addColorStop(0, C(P.tones[1 + i], 0.05, 0.42)); ng.addColorStop(1, C(P.tones[1 + i], 0, 0));
      g.fillStyle = ng; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const n = [10, 24, 60][S.lod];
    const stars = [];
    for (let i = 0; i < n; i++) {
      const x = lerp(R.x0, R.x1, rnd()), y = lerp(R.y0, R.y1, rnd()), m = rnd() ** 3;
      const r = Math.max(R.d * (0.006 + m * 0.02), 0.6 / S.ppu);
      g.fillStyle = m > 0.5 ? C(P.gold, 0.25) : `hsla(220,60%,${85 + m * 15}%,${0.55 + m * 0.45})`;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      if (m > 0.35) stars.push([x, y]);
    }
    if (S.lod && stars.length > 2) { // a constellation, 星図 in 銀泥
      g.strokeStyle = C(P.gold, 0.1, 0.45); g.lineWidth = lw(S, R.d * 0.006, 0.5);
      g.beginPath(); stars.slice(0, 5).forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    }
  },

  crystal(g, R, P, S, o, rnd) {
    const n = S.lod > 1 ? 7 : S.lod ? 5 : 3, sx = (R.x1 - R.x0) / n, sy = (R.y1 - R.y0) / n;
    const grid = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const edge = i === 0 || j === 0 || i === n || j === n;
      grid.push([R.x0 + i * sx + (edge ? 0 : (rnd() - 0.5) * sx * 0.8), R.y0 + j * sy + (edge ? 0 : (rnd() - 0.5) * sy * 0.8)]);
    }
    const at = (i, j) => grid[j * (n + 1) + i];
    const lit = (a, b, c) => { // facet brightness from its fake normal
      const nx = (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]);
      return 0.5 + 0.5 * Math.sin(nx * 400 + a[0] * 3);
    };
    g.lineWidth = lw(S, R.d * 0.006, 0.5);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      for (const tri of (i + j) % 2 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]]) {
        const L = lit(...tri), t = P.tones[(i + j * 2) % P.tones.length];
        g.beginPath(); g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath();
        g.fillStyle = C(t, -0.14 + L * 0.34, 0.82, L * 30 - 15); g.fill();
        g.strokeStyle = C(P.light, 0, 0.18 + L * 0.3); g.stroke();
      }
    }
  },

  spots(g, R, P, S, o, rnd) {
    const n = S.lod ? 9 + ((rnd() * 6) | 0) : 5;
    for (let i = 0; i < n; i++) {
      const [x, y] = pickInside(R, rnd), r = R.d * (0.04 + rnd() * 0.07) * (o.k || 1);
      g.beginPath(); g.arc(x, y, r * 1.25, 0, TAU); g.fillStyle = C(P.ink, 0.02, 0.75); g.fill();
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = C(P.tones[1 + (i % 3)], 0.16, 0.95); g.fill();
      if (S.lod) { g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU); g.fillStyle = C(P.light, 0, 0.6); g.fill(); }
    }
  },

  eyespot(g, R, P, S, o, rnd) {
    const e = o.eye || [R.cx, R.cy, R.d * 0.2];
    eye(g, e[0], e[1], e[2], P, S);
    if (o.eye2) eye(g, o.eye2[0], o.eye2[1], o.eye2[2], P, S, P.tones[3]);
    else if (!o.eye && S.lod) { const [x, y] = pickInside(R, rnd); eye(g, x, y, R.d * 0.08, P, S, P.tones[3]); }
  },
};

function paintPattern(g, R, P, S, o = {}) {
  const rnd = rng(P.seed ^ hashStr(R.name + P.pattern));
  g.save();
  g.globalAlpha = o.alpha ?? 1;
  PATTERNS[P.pattern](g, R, P, S, o, rnd);
  g.restore();
}

// ───────────────────────── butterflies ─────────────────────────
// Right wing in unit space (x outward from the body, y toward the tail). The left wing is mirrored.

const WINGS = {
  swallowtail: {
    fore: [[0.04, -0.16], [0.22, -0.42], [0.5, -0.64], [0.84, -0.8], [0.97, -0.74], [0.9, -0.5], [0.78, -0.22], [0.62, -0.02], [0.36, 0.02], [0.12, 0]], fm: [3, 7],
    hind: [[0.05, -0.02], [0.3, -0.04], [0.58, 0.04], [0.72, 0.2], [0.7, 0.36], [0.58, 0.5], [0.48, 0.6], [0.44, 0.78], [0.43, 0.97], [0.36, 0.99], [0.34, 0.8], [0.3, 0.64], [0.18, 0.6], [0.08, 0.42], [0.03, 0.2]], hm: [2, 7],
    eyeH: [0.25, 0.52, 0.07], eyeF: [0.66, -0.5, 0.07], scallop: 'hind', beat: 1.5,
  },
  morpho: {
    fore: [[0.04, -0.16], [0.25, -0.5], [0.55, -0.76], [0.86, -0.86], [1, -0.72], [0.98, -0.42], [0.86, -0.14], [0.6, 0], [0.3, 0.02], [0.1, 0]], fm: [3, 7],
    hind: [[0.05, -0.02], [0.4, -0.04], [0.74, 0.06], [0.88, 0.26], [0.84, 0.5], [0.66, 0.7], [0.42, 0.8], [0.22, 0.72], [0.08, 0.5], [0.03, 0.2]], hm: [2, 7],
    eyeH: [0.55, 0.42, 0.09], eyeF: [0.72, -0.48, 0.075], scallop: 'hind', beat: 1.05,
  },
  glasswing: {
    fore: [[0.04, -0.16], [0.3, -0.48], [0.62, -0.72], [0.94, -0.86], [1, -0.76], [0.86, -0.46], [0.62, -0.14], [0.34, 0], [0.1, 0]], fm: [3, 6],
    hind: [[0.05, -0.02], [0.36, -0.04], [0.64, 0.1], [0.72, 0.32], [0.6, 0.54], [0.38, 0.66], [0.18, 0.6], [0.07, 0.4], [0.03, 0.18]], hm: [2, 6],
    eyeH: [0.42, 0.34, 0.07], eyeF: [0.62, -0.5, 0.06], beat: 1.7,
  },
  birdwing: {
    fore: [[0.04, -0.16], [0.3, -0.42], [0.66, -0.64], [1.02, -0.8], [1.04, -0.68], [0.8, -0.4], [0.5, -0.1], [0.26, 0], [0.1, 0]], fm: [3, 6],
    hind: [[0.05, -0.02], [0.32, -0.02], [0.54, 0.08], [0.62, 0.26], [0.56, 0.44], [0.4, 0.56], [0.2, 0.56], [0.07, 0.4], [0.03, 0.18]], hm: [2, 6],
    eyeH: [0.34, 0.28, 0.07], eyeF: [0.7, -0.56, 0.06], scallop: 'hind', beat: 0.95,
  },
  moth: {
    fore: [[0.04, -0.2], [0.36, -0.46], [0.74, -0.6], [0.98, -0.58], [1, -0.46], [0.84, -0.18], [0.6, 0.08], [0.32, 0.16], [0.1, 0.06]], fm: [3, 6],
    hind: [[0.05, 0], [0.36, 0.02], [0.62, 0.14], [0.72, 0.36], [0.56, 0.54], [0.32, 0.56], [0.12, 0.44], [0.03, 0.2]], hm: [2, 5],
    eyeH: [0.4, 0.3, 0.11], eyeF: [0.56, -0.32, 0.07], beat: 2.3,
  },
  fritillary: {
    fore: [[0.04, -0.16], [0.26, -0.5], [0.56, -0.72], [0.84, -0.74], [0.94, -0.56], [0.88, -0.3], [0.72, -0.06], [0.4, 0.02], [0.1, 0]], fm: [3, 6],
    hind: [[0.05, -0.02], [0.38, -0.04], [0.66, 0.08], [0.8, 0.28], [0.76, 0.48], [0.6, 0.64], [0.36, 0.7], [0.16, 0.6], [0.05, 0.4], [0.03, 0.18]], hm: [2, 7],
    eyeH: [0.5, 0.36, 0.08], eyeF: [0.64, -0.46, 0.06], scallop: 'both', beat: 1.55,
  },
};

function scallopPoly(poly, a, b, depth) {
  const n = b - a;
  for (let i = a; i <= b; i++) {
    const p = poly[i], q = poly[Math.min(poly.length - 1, i + 1)], o = poly[Math.max(0, i - 1)];
    const tx = q[0] - o[0], ty = q[1] - o[1], tl = Math.hypot(tx, ty) || 1;
    const bump = 1 - Math.abs(Math.sin(((i - a) / n) * Math.PI * Math.max(3, Math.round(n / 5))));
    p[0] -= (ty / tl) * depth * bump; p[1] += (tx / tl) * depth * bump; // inward for clockwise outlines
  }
}

function wingRegions(P) {
  if (P.parts.wings) return P.parts.wings;
  const W = WINGS[P.shape];
  const make = (name, pts, [ma, mb], scal) => {
    const poly = spline(pts);
    if (scal) scallopPoly(poly, ma * 8, mb * 8, 0.022);
    return region(name, poly, 0.05, name === 'fore' ? -0.1 : 0.02, poly.slice(ma * 8, mb * 8 + 1));
  };
  P.parts.wings = {
    fore: make('fore', W.fore, W.fm, W.scallop === 'both'),
    hind: make('hind', W.hind, W.hm, W.scallop === 'hind' || W.scallop === 'both'),
  };
  return P.parts.wings;
}

function wingGround(g, R, P, S, which) {
  const sh = P.shape, T = P.tones;
  const gr = g.createRadialGradient(R.ox, R.oy, 0, R.ox, R.oy, R.d * 1.05);
  if (sh === 'glasswing') {
    gr.addColorStop(0, C(T[0], 0.1, 0.22)); gr.addColorStop(1, C(P.light, 0, 0.06));
  } else if (sh === 'morpho') {
    gr.addColorStop(0, C(P.ink, 0.05)); gr.addColorStop(0.3, C(P.vivid, -0.06)); gr.addColorStop(0.8, C(P.vivid, 0.12, 1, 20)); gr.addColorStop(1, C(P.ink, 0.08));
  } else if (sh === 'birdwing' && which === 'fore') {
    gr.addColorStop(0, C(P.ink, 0.02)); gr.addColorStop(1, C(P.ink, 0.1, 1, 0, -0.1));
  } else if (sh === 'birdwing') {
    gr.addColorStop(0, C(P.ink, 0.05)); gr.addColorStop(0.35, C(P.gold, -0.02)); gr.addColorStop(1, C(P.gold, 0.12, 1, 10));
  } else if (sh === 'moth') {
    gr.addColorStop(0, C(T[0], -0.1, 1, 0, -0.2)); gr.addColorStop(1, C(T[1], 0.04, 1, 0, -0.18));
  } else {
    gr.addColorStop(0, C(T[0], -0.18)); gr.addColorStop(0.45, C(T[0], 0)); gr.addColorStop(1, C(which === 'fore' ? T[1] : T[2], 0.04));
  }
  g.fillStyle = gr;
  g.fillRect(R.x0 - 0.1, R.y0 - 0.1, R.x1 - R.x0 + 0.2, R.y1 - R.y0 + 0.2);
}

function wingVeins(g, R, P, S, color, width) {
  const tips = R.margin, step = Math.max(2, Math.floor(tips.length / (S.lod > 1 ? 9 : 6)));
  g.beginPath();
  for (let i = 0; i < tips.length; i += step) {
    const [ex, ey] = tips[i];
    g.moveTo(R.ox, R.oy);
    g.quadraticCurveTo(lerp(R.ox, ex, 0.55) + (ey - R.oy) * 0.08, lerp(R.oy, ey, 0.55) - (ex - R.ox) * 0.08, ex, ey);
  }
  if (S.lod) { // discal cell
    const [ex, ey] = tips[(tips.length / 2) | 0];
    g.moveTo(lerp(R.ox, ex, 0.32), lerp(R.oy, ey, 0.32) - 0.06);
    g.quadraticCurveTo(lerp(R.ox, ex, 0.5), lerp(R.oy, ey, 0.5), lerp(R.ox, ex, 0.4), lerp(R.oy, ey, 0.4) + 0.08);
  }
  g.strokeStyle = color; g.lineWidth = lw(S, width, 0.6); g.stroke();
}

function marginDots(g, R, P, S, color, inset, every, r) {
  const m = R.margin, cx = R.ox, cy = R.oy;
  for (let i = Math.floor(every / 2); i < m.length; i += every) {
    const [x, y] = m[i], d = Math.hypot(x - cx, y - cy) || 1;
    g.beginPath(); g.arc(x - ((x - cx) / d) * inset, y - ((y - cy) / d) * inset, r, 0, TAU);
    g.fillStyle = color; g.fill();
  }
}

function paintWing(g, R, P, S, which) {
  const W = WINGS[P.shape], sh = P.shape;
  g.save();
  g.clip(R.path);
  wingGround(g, R, P, S, which);
  const eyeSpec = which === 'hind' ? W.eyeH : W.eyeF;
  const glass = sh === 'glasswing';
  const showPattern = !(sh === 'morpho' && P.pattern === 'plain');
  if (showPattern) paintPattern(g, R, P, S, { alpha: glass ? 0.5 : sh === 'morpho' ? 0.62 : 0.92, eye: eyeSpec, eye2: which === 'hind' && sh === 'moth' ? null : undefined });
  if (sh === 'birdwing' && which === 'fore') { // luminous bands along the veins
    g.globalCompositeOperation = 'lighter';
    wingVeins(g, R, P, S, C(P.tones[1], 0.05, 0.5), R.d * 0.06);
    g.globalCompositeOperation = 'source-over';
  }
  if (sh === 'moth' && S.lod) { // cryptic wavy cross-lines
    g.strokeStyle = C(P.ink, 0.1, 0.5); g.lineWidth = lw(S, 0.012, 0.6);
    for (let k = 1; k <= 3; k++) {
      g.beginPath();
      for (let s = 0; s <= 1.0001; s += 0.1) {
        const x = R.ox + (R.x1 - R.ox) * k * 0.28, y = lerp(R.y0, R.y1, s);
        g.lineTo(x + Math.sin(s * 14 + k) * 0.025, y);
      }
      g.stroke();
    }
    if (which === 'hind' && P.pattern !== 'eyespot') eye(g, W.eyeH[0], W.eyeH[1], W.eyeH[2], P, S);
  }
  if (sh === 'swallowtail' && which === 'hind' && P.pattern !== 'eyespot') eye(g, W.eyeH[0], W.eyeH[1], W.eyeH[2] * 0.8, P, S, P.warm);
  // veins
  const veinCol = glass ? C(P.ink, 0.06, 0.9) : C(P.ink, 0.0, P.pattern === 'veins' ? 0.2 : 0.42);
  wingVeins(g, R, P, S, veinCol, glass ? 0.018 : 0.011);
  // margin: dark border band, then lunules
  g.strokeStyle = glass ? C(P.tones[0], -0.05, 0.95) : C(P.ink, 0.02, sh === 'fritillary' ? 0.75 : 0.9);
  g.lineWidth = glass ? 0.13 : sh === 'birdwing' && which === 'fore' ? 0.06 : 0.1;
  g.stroke(R.path);
  if (glass && which === 'fore') { // the white apical bar of a glasswing
    g.fillStyle = C(P.light, 0.05, 0.85);
    g.beginPath(); g.ellipse(0.8, -0.66, 0.1, 0.035, -0.5, 0, TAU); g.fill();
  }
  if (sh === 'birdwing' && which === 'hind') marginDots(g, R, P, S, C(P.ink, 0.02, 0.9), 0.13, 8, 0.045);
  if (S.lod && sh !== 'birdwing' && sh !== 'moth') marginDots(g, R, P, S, C(P.light, 0, 0.85), 0.03, sh === 'fritillary' ? 5 : 7, sh === 'morpho' ? 0.012 : 0.016);
  g.restore();
  // fine outline
  g.strokeStyle = C(P.ink, -0.02, 0.9); g.lineWidth = lw(S, 0.008, 0.7); g.stroke(R.path);
}

function paintButterflyBody(g, P, S) {
  const moth = P.shape === 'moth', ink = P.ink;
  // antennae
  g.strokeStyle = C(ink, 0.1); g.lineWidth = lw(S, 0.012, 0.8);
  for (const sd of [-1, 1]) {
    g.beginPath(); g.moveTo(sd * 0.02, -0.3); g.quadraticCurveTo(sd * 0.08, -0.55, sd * (moth ? 0.2 : 0.18), -0.7); g.stroke();
    if (moth && S.lod) { // feathered antennae
      g.lineWidth = lw(S, 0.006, 0.5);
      for (let k = 0.15; k < 1; k += 0.12) {
        const x = sd * lerp(0.03, 0.19, k), y = lerp(-0.32, -0.69, k);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + sd * 0.05, y + 0.02); g.moveTo(x, y); g.lineTo(x - sd * 0.02, y - 0.04); g.stroke();
      }
      g.lineWidth = lw(S, 0.012, 0.8);
    } else if (!moth) {
      g.beginPath(); g.ellipse(sd * 0.18, -0.7, 0.022, 0.03, sd * 0.4, 0, TAU); g.fillStyle = C(P.light, -0.1); g.fill();
    }
  }
  const fur = (x, y, rx, ry) => {
    const gr = g.createLinearGradient(x - rx, y, x + rx, y);
    gr.addColorStop(0, C(ink, 0.02)); gr.addColorStop(0.45, C(P.tones[0], moth ? 0.05 : -0.12)); gr.addColorStop(1, C(ink, 0.0));
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fillStyle = gr; g.fill();
  };
  fur(0, 0.24, moth ? 0.07 : 0.05, 0.27); // abdomen
  if (S.lod) {
    g.strokeStyle = C(P.light, 0, 0.25); g.lineWidth = lw(S, 0.008, 0.5);
    for (let y = 0.06; y < 0.46; y += 0.07) { g.beginPath(); g.moveTo(-0.04, y); g.quadraticCurveTo(0, y + 0.015, 0.04, y); g.stroke(); }
  }
  fur(0, -0.1, moth ? 0.1 : 0.075, 0.15); // thorax
  fur(0, -0.27, 0.06, 0.055); // head
  for (const sd of [-1, 1]) { // compound eyes
    g.beginPath(); g.arc(sd * 0.04, -0.29, 0.026, 0, TAU); g.fillStyle = C(P.vivid, 0.1); g.fill();
    if (S.lod) { g.beginPath(); g.arc(sd * 0.044, -0.298, 0.008, 0, TAU); g.fillStyle = 'hsla(0,0%,100%,.9)'; g.fill(); }
  }
  if (S.lod) { // furry thorax sheen
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(0, -0.14, 0, 0, -0.12, 0.12);
    gr.addColorStop(0, C(P.tones[1], 0.1, 0.5)); gr.addColorStop(1, C(P.tones[1], 0, 0));
    g.fillStyle = gr; g.fillRect(-0.15, -0.3, 0.3, 0.35);
    g.globalCompositeOperation = 'source-over';
  }
}

// Wing elevation θ (0 = flat open, ~1.3 = raised) for a wing that lags by `lag` radians.
function flapAngle(P, t, lag) {
  const W = WINGS[P.shape];
  const ph = t * W.beat * TAU - lag;
  const u = 0.5 - 0.5 * Math.cos(ph);
  switch (P.move) {
    case 'flutter': return lerp(0.08, 1.28, Math.pow(u, 1.7));
    case 'hover': return lerp(0.3, 1.1, 0.5 - 0.5 * Math.cos(ph * 1.6));
    case 'glide': { const gate = smooth(0.15, 0.65, Math.sin(t * 0.55) * 0.5 + 0.5); return lerp(0.12, lerp(0.22, 1.25, u), gate); }
    case 'drift': return lerp(0.15, 1.0, 0.5 - 0.5 * Math.cos(ph * 0.55));
    default: return lerp(0.2, 1.15, 0.5 - 0.5 * Math.cos(t * 0.9 - lag)); // basking: slow open/close
  }
}

function drawWing(ctx, P, F, R, spr, theta, side) {
  const c = Math.cos(theta), s = Math.sin(theta);
  ctx.save();
  ctx.scale(side, 1);
  // Foreshorten with elevation and lift the tip toward the viewer for a sense of depth.
  ctx.transform(c, -0.24 * s, 0, 1 - 0.05 * s, 0, 0);
  blit(ctx, spr);
  const iri = wingIri(P);
  const shift = (theta - 0.6) * 150 * iri + Math.sin(F.t * 0.35) * 18 + side * 12;
  const pos = clamp(1.25 - theta * 0.95, 0, 1);
  if (F.lod || iri > 0.25) iridesce(ctx, P, R.path, R.ox, R.y0, R.x1, R.y1, shift, iri * (0.55 + 0.45 * s), pos, F.lod ? 0.65 : 0.4);
  if (s > 0.35 && !LITE) { // the wing turns away from the light as it rises
    ctx.save(); ctx.clip(R.path);
    ctx.fillStyle = C(P.ink, 0, (s - 0.35) * 0.45);
    ctx.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    ctx.restore();
  }
  ctx.restore();
}

const wingIri = (P) => (P.shape === 'morpho' ? Math.max(P.iri, 0.55) : P.shape === 'glasswing' ? P.iri * 0.6 : P.iri);

// Map-size butterflies: each side (hind + fore) is pre-baked with its sheen at a few hue shifts,
// and frames cross-fade between the two nearest — no per-frame clipping.
function drawWingsLite(ctx, P, F, R, theta) {
  const iri = wingIri(P), step = 30;
  const shift = (theta - 0.6) * 150 * iri + Math.sin(F.t * 0.35) * 18;
  const u = shift / step, k0 = Math.floor(u), fr = u - k0;
  const x1 = Math.max(R.fore.x1, R.hind.x1), y0 = Math.min(R.fore.y0, R.hind.y0), y1 = Math.max(R.fore.y1, R.hind.y1);
  const side = (k) => sprite(P, 'side' + k, F.ppu, 0, y0, x1, y1, (g, S) => {
    for (const W of [R.hind, R.fore]) {
      paintWing(g, W, P, S, W.name);
      iridesce(g, P, W.path, W.ox, W.y0, W.x1, W.y1, k * step, iri * 0.75);
    }
  });
  const a = side(k0), b = fr > 0.08 ? side(k0 + 1) : null;
  const c = Math.cos(theta), sn = Math.sin(theta);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.scale(sd, 1);
    ctx.transform(c, -0.24 * sn, 0, 1 - 0.05 * sn, 0, 0);
    blit(ctx, a);
    if (b) { ctx.globalAlpha = fr; blit(ctx, b); ctx.globalAlpha = 1; }
    ctx.restore();
  }
}

function drawButterfly(ctx, P, F) {
  const R = wingRegions(P);
  const fore = LITE ? null : sprite(P, 'fore', F.ppu, R.fore.x0, R.fore.y0, R.fore.x1, R.fore.y1, (g, S) => paintWing(g, R.fore, P, S, 'fore'));
  const hind = LITE ? null : sprite(P, 'hind', F.ppu, R.hind.x0, R.hind.y0, R.hind.x1, R.hind.y1, (g, S) => paintWing(g, R.hind, P, S, 'hind'));
  const body = sprite(P, 'body', F.ppu, -0.24, -0.76, 0.24, 0.54, (g, S) => paintButterflyBody(g, P, S));
  const tf = flapAngle(P, F.t, 0), th = flapAngle(P, F.t, 0.35);
  ctx.save();
  ctx.translate(0, -0.06 + Math.sin(F.t * WINGS[P.shape].beat * TAU) * 0.025);
  if (LITE) drawWingsLite(ctx, P, F, R, tf);
  else {
    for (const sd of [-1, 1]) drawWing(ctx, P, F, R.hind, hind, th, sd);
    for (const sd of [-1, 1]) drawWing(ctx, P, F, R.fore, fore, tf, sd);
  }
  blit(ctx, body);
  ctx.restore();
  const wingPt = (u, v) => {
    const r = u < 0.5 ? R.fore : R.hind, sd = v < 0.5 ? -1 : 1;
    return [sd * lerp(0.15, r.x1 * 0.85, (v * 2) % 1) * Math.cos(tf), lerp(r.y0 * 0.7, r.y1 * 0.8, u)];
  };
  return { n: sparkCount(P, F, 2), emit: wingPt, life: 2.8 };
}

// ───────────────────────── shared body helpers ─────────────────────────

const ellPath = (cx, cy, rx, ry, rot = 0) => { const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot, 0, TAU); return p; };
const shapeR = (name, pts, ox, oy) => region(name, spline(pts), ox, oy);
const ellR = (name, cx, cy, rx, ry, rot = 0) => region(name, ellipsePts(cx, cy, rx, ry, 40, rot), cx, cy);
const part = (P, name, make) => P.parts[name] || (P.parts[name] = make());
const mirrorPts = (pts) => pts.map(([x, y]) => [-x, y]).reverse();

// Shaded volume lit from the upper left.
function volume(g, path, t, cx, cy, r, lift = 0.2, shade = -0.2, a = 1) {
  const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.04, cx, cy, r * 1.15);
  gr.addColorStop(0, C(t, lift, a)); gr.addColorStop(0.55, C(t, 0, a)); gr.addColorStop(1, C(t, shade, a));
  g.fillStyle = gr; g.fill(path);
}

function bodyPattern(g, R, P, S, alpha = 0.5, o = {}) {
  g.save(); g.clip(R.path); paintPattern(g, R, P, S, { alpha, ...o }); g.restore();
}

function edge(g, path, P, S, w = 0.012, a = 0.85) {
  g.strokeStyle = C(P.ink, 0, a); g.lineWidth = lw(S, w, 0.8); g.stroke(path);
}

// A glint position that sweeps across a body every few seconds.
const sweep = (F, speed = 0.11, off = 0) => ((F.t * speed + off) % 1.8) - 0.4;

function sheenOn(ctx, P, F, R, k = 0.75, glint = 0.6) {
  if (LITE && P.iri < 0.5) return;
  iridesce(ctx, P, R.path, R.x0, R.y0, R.x1, R.y1, Math.sin(F.t * 0.4) * 60 * P.iri, P.iri * k, sweep(F), glint * (0.25 + P.iri));
}

function eyeBall(g, x, y, r, P, S, iris = P.vivid, look = 0.25) {
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = C(P.ink, -0.02); g.fill();
  g.beginPath(); g.arc(x + r * look * 0.3, y, r * 0.78, 0, TAU); g.fillStyle = C(iris, 0.08); g.fill();
  g.beginPath(); g.arc(x + r * look * 0.5, y, r * 0.4, 0, TAU); g.fillStyle = C(P.ink, -0.04); g.fill();
  if (S.lod) { g.beginPath(); g.arc(x - r * 0.2, y - r * 0.3, r * 0.22, 0, TAU); g.fillStyle = 'hsla(0,0%,100%,.95)'; g.fill(); }
}

// Two-segment limb from (x, y): thigh at angle a, shin bent by b.
function limb(ctx, x, y, l1, l2, a, b, w, col, foot = 0, col2 = col) {
  const kx = x + Math.cos(a) * l1, ky = y + Math.sin(a) * l1;
  const fx = kx + Math.cos(a + b) * l2, fy = ky + Math.sin(a + b) * l2;
  ctx.strokeStyle = col; ctx.lineWidth = w * 1.35;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.stroke();
  ctx.strokeStyle = col2; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  if (foot) { ctx.beginPath(); ctx.ellipse(fx + foot * 0.4, fy, foot, foot * 0.55, 0, 0, TAU); ctx.fillStyle = col2; ctx.fill(); }
}

// Same frame with a higher sprite resolution, for parts drawn under an extra ctx.scale(k).
const zoomF = (F, k) => ({ t: F.t, rt: F.rt, ppu: F.ppu * k, lod: F.lod });

// Draw a sprite in vertical slices, each shifted by dy(x): a cheap body wave for fish and whales.
function warpBlit(ctx, s, n, dy, ppu) {
  const sw = s.cv.width / n, uw = s.w / n, seam = 1 / ppu;
  for (let i = 0; i < n; i++) {
    const x = s.x + i * uw;
    ctx.drawImage(s.cv, i * sw, 0, Math.min(sw + 1, s.cv.width - i * sw), s.cv.height, x, s.y + dy(x + uw / 2), uw + seam, s.h);
  }
}

// Blit a sprite at (x, y) rotated by a and scaled by (sx, sy) — used for tails, wings and segments.
function placed(ctx, s, x, y, a = 0, sx = 1, sy = sx) {
  ctx.save(); ctx.translate(x, y); if (a) ctx.rotate(a); if (sx !== 1 || sy !== 1) ctx.scale(sx, sy); blit(ctx, s); ctx.restore();
}

const blinkAt = (F, period = 4.2, off = 0) => { const u = ((F.rt + off) % period) / period; return u > 0.955 ? 1 - Math.abs(u - 0.977) / 0.022 : 0; };

// ───────────────────────── insects ─────────────────────────

function insectLegs(ctx, P, F, hips, len, gait, w) {
  const col = C(P.ink, 0.12);
  hips.forEach(([x, y, a], i) => {
    for (const sd of [-1, 1]) {
      const sw = gait * Math.sin(F.t * 7 + i * 2.1 + (sd > 0 ? Math.PI : 0));
      const base = sd > 0 ? a : Math.PI - a;
      limb(ctx, x * sd, y, len * 0.5, len * 0.6, base + sw * sd, sd * (a > 0 ? 0.9 : -0.9) * 0.6, w, col);
    }
  });
}

function antennae(ctx, P, x, y, tx, ty, w, curl = 0.2) {
  ctx.strokeStyle = C(P.ink, 0.15); ctx.lineWidth = w;
  ctx.beginPath();
  for (const sd of [-1, 1]) { ctx.moveTo(x * sd, y); ctx.quadraticCurveTo(lerp(x, tx, 0.3) * sd, lerp(y, ty, 0.7) - curl, tx * sd, ty); }
  ctx.stroke();
}

function drawFirefly(ctx, P, F) {
  const ely = part(P, 'ely', () => shapeR('ely', [[0.02, -0.33], [0.22, -0.34], [0.3, -0.15], [0.3, 0.3], [0.2, 0.62], [0.05, 0.7], [0.02, 0.4]], 0.12, -0.2));
  const elyS = sprite(P, 'ely', F.ppu, ely.x0, ely.y0, ely.x1, ely.y1, (g, S) => {
    g.save(); g.clip(ely.path);
    volume(g, ely.path, tone(P.tones[0].h, 0.4, 0.2), 0.14, 0.1, 0.5, 0.18, -0.08);
    paintPattern(g, ely, P, S, { alpha: 0.5 });
    g.fillStyle = C(P.gold, 0, 0.75); g.fillRect(0.24, -0.4, 0.1, 1.2); // pale outer margin
    g.restore();
    edge(g, ely.path, P, S, 0.012);
  });
  const head = sprite(P, 'head', F.ppu, -0.36, -1, 0.36, -0.28, (g, S) => {
    const pr = ellPath(0, -0.45, 0.27, 0.16);
    volume(g, pr, P.warm, 0, -0.45, 0.27, 0.22, -0.1);
    g.fillStyle = C(P.ink, 0.04, 0.9); // the black cross of a 源氏蛍
    g.beginPath(); g.ellipse(0, -0.45, 0.03, 0.13, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(0, -0.47, 0.11, 0.03, 0, 0, TAU); g.fill();
    edge(g, pr, P, S, 0.012);
    g.beginPath(); g.arc(0, -0.63, 0.09, 0, TAU); g.fillStyle = C(P.ink, 0.06); g.fill();
    for (const sd of [-1, 1]) eyeBall(g, sd * 0.07, -0.66, 0.04, P, S, P.light);
  });
  const fly = P.move === 'flutter' || P.move === 'hover' || P.move === 'glide';
  const open = fly ? 0.55 + 0.08 * Math.sin(F.t * 9) : 0.02;
  insectLegs(ctx, P, F, [[0.12, -0.38, -0.6], [0.14, -0.22, 0], [0.14, -0.05, 0.5]], 0.34, fly ? 0.05 : 0.3, lw(F, 0.026));
  antennae(ctx, P, 0.04, -0.7, 0.3, -0.98, lw(F, 0.02), 0.1);
  if (fly) { // membranous hind wings, motion-blurred
    ctx.fillStyle = C(P.light, 0, 0.18);
    for (const sd of [-1, 1]) {
      const k = 0.6 + 0.4 * Math.abs(Math.sin(F.t * 31));
      ctx.beginPath(); ctx.ellipse(sd * 0.38 * k, -0.05, 0.42 * k, 0.16, sd * 0.25, 0, TAU); ctx.fill();
    }
  }
  // abdomen + lantern
  ctx.beginPath(); ctx.ellipse(0, 0.42, 0.17, 0.36, 0, 0, TAU); ctx.fillStyle = C(P.ink, 0.1); ctx.fill();
  const flash = Math.pow(0.5 + 0.5 * Math.sin(F.rt * 2.3 + P.phase), 3);
  const lamp = tone(mixHue(P.tones[1].h, 78, 0.5), 1, 0.62);
  ctx.beginPath(); ctx.ellipse(0, 0.66, 0.15, 0.15, 0, 0, TAU); ctx.fillStyle = C(lamp, -0.15 + flash * 0.3); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, lamp, 0, 0.66, 0.35 + 0.55 * flash, (0.35 + 0.6 * flash) * (0.7 + P.glow * 0.3), 0.9);
  ctx.globalCompositeOperation = 'source-over';
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(0.02 * sd, -0.33); ctx.rotate(-open * sd); ctx.translate(-0.02 * sd, 0.33);
    if (sd < 0) ctx.scale(-1, 1);
    blit(ctx, elyS);
    ctx.restore();
  }
  blit(ctx, head);
  return { n: sparkCount(P, F, 3, 0.6), emit: (u, v) => [(u - 0.5) * 0.3, 0.66 + v * 0.1], rise: true, life: 2.2, size: 0.8 };
}

function drawBeetle(ctx, P, F) {
  const ely = part(P, 'ely', () => shapeR('ely', [[0.01, -0.38], [0.27, -0.37], [0.31, -0.1], [0.27, 0.35], [0.16, 0.75], [0.04, 0.92], [0.01, 0.6]], 0.05, -0.38));
  const elyS = sprite(P, 'ely', F.ppu, ely.x0, ely.y0, ely.x1, ely.y1, (g, S) => {
    g.save(); g.clip(ely.path);
    volume(g, ely.path, P.vivid, 0.14, 0.15, 0.55, 0.16, -0.22);
    // the two flame stripes of the 玉虫
    for (const [x, w] of [[0.1, 0.045], [0.21, 0.04]]) {
      g.beginPath(); g.ellipse(x, 0.2, w, 0.62, -0.06, 0, TAU); g.fillStyle = C(P.tones[2], 0.02, 0.85, 0, 0.1); g.fill();
    }
    paintPattern(g, ely, P, S, { alpha: 0.42, k: 0.7 });
    if (S.lod) { // punctured striae
      g.strokeStyle = C(P.ink, 0, 0.25); g.lineWidth = lw(S, 0.006, 0.5);
      for (let x = 0.06; x < 0.3; x += 0.05) { g.beginPath(); g.moveTo(x, -0.35); g.quadraticCurveTo(x + 0.02, 0.3, x * 0.4, 0.9); g.stroke(); }
    }
    g.restore();
    edge(g, ely.path, P, S, 0.012);
  });
  const pron = part(P, 'pron', () => shapeR('pron', [[-0.18, -0.6], [0.18, -0.6], [0.27, -0.4], [0.24, -0.36], [-0.24, -0.36], [-0.27, -0.4]]));
  const head = sprite(P, 'head', F.ppu, -0.3, -0.8, 0.3, -0.34, (g, S) => {
    g.beginPath(); g.ellipse(0, -0.64, 0.12, 0.08, 0, 0, TAU); g.fillStyle = C(P.vivid, -0.12); g.fill();
    for (const sd of [-1, 1]) eyeBall(g, sd * 0.09, -0.66, 0.035, P, S, P.gold);
    volume(g, pron.path, P.vivid, 0, -0.5, 0.3, 0.12, -0.25);
    bodyPattern(g, pron, P, S, 0.35);
    edge(g, pron.path, P, S, 0.012);
  });
  const fly = P.move === 'flutter' || P.move === 'hover' || P.move === 'glide';
  const open = fly ? 0.32 + 0.05 * Math.sin(F.t * 11) : 0;
  insectLegs(ctx, P, F, [[0.18, -0.4, -0.7], [0.22, -0.2, 0.1], [0.22, 0.02, 0.6]], 0.4, fly ? 0.06 : 0.28, lw(F, 0.028));
  antennae(ctx, P, 0.05, -0.7, 0.24, -0.94, lw(F, 0.022), 0.05);
  if (fly) {
    ctx.fillStyle = C(P.light, 0, 0.2);
    for (const sd of [-1, 1]) {
      const k = 0.55 + 0.45 * Math.abs(Math.sin(F.t * 29 + sd));
      ctx.beginPath(); ctx.ellipse(sd * 0.48 * k, 0.05, 0.5 * k, 0.2, sd * 0.3, 0, TAU); ctx.fill();
    }
  }
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(0.01 * sd, -0.38); ctx.rotate(-open * sd); ctx.translate(-0.01 * sd, 0.38);
    if (sd < 0) ctx.scale(-1, 1);
    blit(ctx, elyS);
    iridesce(ctx, P, ely.path, ely.x0, ely.y0, ely.x1, ely.y1, Math.sin(F.t * 0.5 + sd) * 70 * Math.max(P.iri, 0.6), Math.max(P.iri, 0.6) * 0.8, sweep(F, 0.14), 0.7);
    ctx.restore();
  }
  blit(ctx, head);
  return { n: sparkCount(P, F, 1, 0.6), emit: (u, v) => [(u - 0.5) * 0.5, (v - 0.4) * 1.2] };
}

function drawDragonfly(ctx, P, F) {
  const W = part(P, 'dfw', () => ({
    fore: shapeR('fore', [[0.04, -0.47], [0.3, -0.56], [0.7, -0.6], [0.96, -0.55], [0.94, -0.47], [0.6, -0.43], [0.3, -0.42], [0.06, -0.4]], 0.04, -0.44),
    hind: shapeR('hind', [[0.04, -0.34], [0.3, -0.4], [0.68, -0.41], [0.93, -0.35], [0.9, -0.26], [0.55, -0.22], [0.25, -0.2], [0.06, -0.27]], 0.04, -0.3),
  }));
  const wingS = (R) => sprite(P, 'dw' + R.name, F.ppu, R.x0, R.y0, R.x1, R.y1, (g, S) => {
    g.save(); g.clip(R.path);
    const gr = g.createLinearGradient(R.x0, 0, R.x1, 0);
    gr.addColorStop(0, C(P.tones[2], 0, 0.55)); gr.addColorStop(0.3, C(P.light, 0, 0.12)); gr.addColorStop(1, C(P.light, 0, 0.08));
    g.fillStyle = gr; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    paintPattern(g, R, P, S, { alpha: 0.3 });
    g.strokeStyle = C(P.ink, 0.2, 0.5); g.lineWidth = lw(S, 0.004, 0.45);
    const step = S.lod > 1 ? 0.035 : S.lod ? 0.07 : 0.14;
    g.beginPath();
    for (let x = R.x0; x < R.x1; x += step) { g.moveTo(x, R.y0); g.lineTo(x + 0.02, R.y1); }
    for (let k = 1; k < 4; k++) { const y = lerp(R.y0, R.y1, k / 4); g.moveTo(R.x0, y); g.lineTo(R.x1, y + 0.01); }
    g.stroke();
    g.fillStyle = C(P.warm, 0, 0.9); // pterostigma
    g.beginPath(); g.ellipse(R.x1 - 0.12, lerp(R.y0, R.y1, 0.3), 0.04, 0.012, 0, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = C(P.ink, 0.15, 0.8); g.lineWidth = lw(S, 0.008, 0.6); g.stroke(R.path);
  });
  const abd = part(P, 'abd', () => shapeR('abd', [[0, -0.3], [0.05, -0.26], [0.04, 0.2], [0.035, 0.85], [0.015, 0.98], [-0.015, 0.98], [-0.035, 0.85], [-0.04, 0.2], [-0.05, -0.26]], 0, 0.3));
  const body = sprite(P, 'body', F.ppu, -0.2, -0.75, 0.2, 1, (g, S) => {
    volume(g, abd.path, P.tones[0], 0, 0.3, 0.5, 0.18, -0.2);
    bodyPattern(g, abd, P, S, 0.5, { k: 0.6 });
    g.strokeStyle = C(P.ink, 0, 0.55); g.lineWidth = lw(S, 0.008, 0.5);
    for (let y = -0.15; y < 0.95; y += 0.11) { g.beginPath(); g.moveTo(-0.045, y); g.lineTo(0.045, y); g.stroke(); }
    const th = ellPath(0, -0.41, 0.09, 0.14);
    volume(g, th, P.tones[1], 0, -0.41, 0.15, 0.2, -0.15); edge(g, th, P, S, 0.01);
    for (const sd of [-1, 1]) {
      const e = ellPath(sd * 0.07, -0.6, 0.085, 0.08);
      volume(g, e, P.vivid, sd * 0.07, -0.6, 0.09, 0.3, -0.12); edge(g, e, P, S, 0.008, 0.6);
    }
  });
  const fore = wingS(W.fore), hind = wingS(W.hind);
  const fly = P.move !== 'still' && P.move !== 'walk';
  const ph = F.t * TAU * (fly ? 3.2 : 0.4);
  for (const [R, s, a] of [[W.hind, hind, -Math.sin(ph)], [W.fore, fore, Math.sin(ph)]]) {
    for (const sd of [-1, 1]) {
      ctx.save(); ctx.scale(sd, 1);
      ctx.translate(0.04, R.oy); ctx.rotate(a * 0.12); ctx.scale(1 - 0.28 * (0.5 + 0.5 * a), 1); ctx.translate(-0.04, -R.oy);
      blit(ctx, s);
      iridesce(ctx, P, R.path, R.x0, R.y0, R.x1, R.y1, a * 80 * P.iri + 30, P.iri * 0.45, 0.5 + a * 0.4, 0.45);
      ctx.restore();
    }
  }
  blit(ctx, body);
  return { n: sparkCount(P, F, 1, 0.7), emit: (u, v) => [(u - 0.5) * 1.6, -0.45 + v * 0.2] };
}

function drawMantis(ctx, P, F) {
  const wing = part(P, 'mw', () => shapeR('mw', [[0.05, -0.05], [-0.3, -0.14], [-0.7, -0.08], [-0.9, 0.05], [-0.7, 0.15], [-0.3, 0.13], [0.02, 0.05]], 0.02, 0));
  const body = sprite(P, 'body', F.ppu, -0.95, -1, 0.8, 0.3, (g, S) => {
    g.beginPath(); g.ellipse(-0.42, 0.11, 0.46, 0.1, 0.05, 0, TAU); g.fillStyle = C(P.tones[1], -0.12); g.fill();
    volume(g, wing.path, P.tones[0], -0.4, -0.02, 0.5, 0.18, -0.12, 0.95);
    bodyPattern(g, wing, P, S, 0.45);
    g.strokeStyle = C(P.ink, 0.1, 0.45); g.lineWidth = lw(S, 0.008, 0.5);
    g.beginPath(); g.moveTo(0.02, 0); g.quadraticCurveTo(-0.4, -0.04, -0.86, 0.05); g.stroke(); // leaf midrib
    edge(g, wing.path, P, S, 0.01);
    // prothorax
    g.strokeStyle = C(P.tones[0], -0.05); g.lineWidth = 0.07;
    g.beginPath(); g.moveTo(0.02, 0.02); g.quadraticCurveTo(0.12, -0.2, 0.28, -0.42); g.stroke();
    const hd = shapeR('hd', [[0.22, -0.55], [0.46, -0.62], [0.4, -0.42], [0.31, -0.37]]);
    volume(g, hd.path, P.tones[0], 0.33, -0.5, 0.15, 0.22, -0.1); edge(g, hd.path, P, S, 0.008);
    eyeBall(g, 0.41, -0.56, 0.048, P, S, P.vivid, 0.6);
    g.strokeStyle = C(P.ink, 0.15); g.lineWidth = lw(S, 0.01, 0.6);
    g.beginPath(); g.moveTo(0.36, -0.6); g.quadraticCurveTo(0.5, -0.9, 0.78, -0.96); g.moveTo(0.34, -0.6); g.quadraticCurveTo(0.42, -0.9, 0.6, -0.99); g.stroke();
  });
  const sway = Math.sin(F.t * 0.9) * 0.05;
  const legCol = C(P.tones[0], -0.1), w = lw(F, 0.03);
  ctx.save(); ctx.translate(0, 0.55); ctx.rotate(sway); ctx.translate(0, -0.55);
  limb(ctx, 0.0, 0.06, 0.28, 0.32, 1.1, 0.8, w, C(P.tones[0], -0.22));
  limb(ctx, -0.1, 0.08, 0.3, 0.32, 2.0, -0.7, w, C(P.tones[0], -0.22));
  blit(ctx, body);
  limb(ctx, 0.04, 0.06, 0.28, 0.32, 1.25, 0.6, w, legCol);
  limb(ctx, -0.06, 0.08, 0.3, 0.34, 1.9, -0.6, w, legCol);
  // raptorial forelegs, folded in prayer, twitching now and then
  const tw = Math.max(0, Math.sin(F.t * 0.7)) ** 8 * 0.5;
  ctx.strokeStyle = C(P.tones[0], 0.02); ctx.lineWidth = lw(F, 0.045);
  const kx = 0.4 + tw * 0.1, ky = -0.12 - tw * 0.1;
  ctx.beginPath(); ctx.moveTo(0.24, -0.34); ctx.lineTo(kx, ky); ctx.lineTo(kx + 0.1, -0.38 - tw * 0.1); ctx.stroke();
  ctx.lineWidth = lw(F, 0.022);
  ctx.beginPath(); ctx.moveTo(kx + 0.1, -0.38 - tw * 0.1); ctx.lineTo(kx + 0.02, -0.2 - tw * 0.2); ctx.stroke();
  if (F.lod) {
    ctx.strokeStyle = C(P.light, 0, 0.7); ctx.lineWidth = lw(F, 0.008, 0.5);
    ctx.beginPath(); for (let k = 0.2; k < 0.9; k += 0.2) { const x = lerp(kx, kx + 0.1, k), y = lerp(ky, -0.38 - tw * 0.1, k); ctx.moveTo(x, y); ctx.lineTo(x - 0.03, y + 0.01); } ctx.stroke();
  }
  ctx.restore();
  sheenOn(ctx, P, F, wing, 0.6);
  return { n: sparkCount(P, F, 1, 0.6), emit: (u, v) => [-0.8 + u * 0.9, -0.1 + v * 0.2] };
}

function drawCicada(ctx, P, F) {
  const wing = part(P, 'cw', () => shapeR('cw', [[0.04, -0.4], [0.26, -0.3], [0.39, 0.05], [0.37, 0.45], [0.23, 0.82], [0.08, 0.93], [-0.03, 0.7], [-0.01, 0]], 0.04, -0.38));
  const wS = sprite(P, 'cw', F.ppu, wing.x0, wing.y0, wing.x1, wing.y1, (g, S) => {
    g.save(); g.clip(wing.path);
    const gr = g.createLinearGradient(0, -0.4, 0, 0.9);
    gr.addColorStop(0, C(P.tones[0], 0, 0.6)); gr.addColorStop(0.35, C(P.light, 0, 0.14)); gr.addColorStop(1, C(P.light, 0, 0.1));
    g.fillStyle = gr; g.fillRect(wing.x0, wing.y0, 1, 1.5);
    paintPattern(g, wing, P, S, { alpha: 0.32 });
    g.strokeStyle = C(P.tones[0], -0.15, 0.9); g.lineWidth = lw(S, 0.012, 0.7);
    g.beginPath();
    for (let k = 0; k < 7; k++) { const x = lerp(0.02, 0.36, k / 6); g.moveTo(0.04, -0.36); g.quadraticCurveTo(x * 1.1, 0.2, lerp(0.02, 0.3, k / 6), 0.85 - Math.abs(k - 3) * 0.04); }
    for (let k = 1; k < 4; k++) { const y = 0.45 + k * 0.1; g.moveTo(0, y); g.lineTo(0.37, y - 0.05); }
    g.stroke();
    for (const [x, y] of [[0.2, 0.62], [0.28, 0.5], [0.12, 0.74]]) { g.beginPath(); g.arc(x, y, 0.025, 0, TAU); g.fillStyle = C(P.ink, 0.05, 0.75); g.fill(); }
    g.restore();
    g.strokeStyle = C(P.tones[0], -0.18, 0.95); g.lineWidth = lw(S, 0.014, 0.8); g.stroke(wing.path);
  });
  const body = sprite(P, 'body', F.ppu, -0.36, -0.72, 0.36, 0.55, (g, S) => {
    g.beginPath(); g.ellipse(0, 0.15, 0.17, 0.36, 0, 0, TAU); g.fillStyle = C(P.ink, 0.1); g.fill();
    const meso = ellPath(0, -0.3, 0.21, 0.13), pro = ellPath(0, -0.47, 0.24, 0.09), hd = ellPath(0, -0.6, 0.2, 0.08);
    volume(g, meso, P.tones[1], 0, -0.3, 0.22, 0.15, -0.25);
    if (S.lod) { g.strokeStyle = C(P.gold, 0.1, 0.7); g.lineWidth = lw(S, 0.012, 0.6); g.beginPath(); g.moveTo(-0.1, -0.36); g.lineTo(-0.05, -0.24); g.lineTo(0, -0.33); g.lineTo(0.05, -0.24); g.lineTo(0.1, -0.36); g.stroke(); }
    volume(g, pro, P.tones[0], 0, -0.47, 0.24, 0.2, -0.2); bodyPattern(g, ellR('pro', 0, -0.47, 0.24, 0.09), P, S, 0.4);
    volume(g, hd, P.tones[0], 0, -0.6, 0.2, 0.18, -0.2);
    for (const sd of [-1, 1]) eyeBall(g, sd * 0.2, -0.6, 0.06, P, S, P.warm, 0);
    for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(i * 0.035, -0.63 + Math.abs(i) * 0.02, 0.012, 0, TAU); g.fillStyle = C(P.vivid, 0.25); g.fill(); }
  });
  blit(ctx, body);
  const sing = P.move !== 'still';
  const buzz = sing ? Math.sin(F.t * 60) * 0.004 : 0;
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd, 1); ctx.translate(buzz, 0); blit(ctx, wS);
    iridesce(ctx, P, wing.path, wing.x0, wing.y0, wing.x1, wing.y1, sd * 30 + Math.sin(F.t * 0.4) * 50, P.iri * 0.4, sweep(F, 0.1), 0.5);
    ctx.restore();
  }
  if (sing && F.lod) { // song rings — the cicada is the sound of summer
    ctx.strokeStyle = C(P.gold, 0.15, 1); ctx.lineWidth = lw(F, 0.012);
    for (let k = 0; k < 3; k++) {
      const u = ((F.rt * 0.9 + k / 3) % 1);
      ctx.globalAlpha = (1 - u) * 0.6;
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sd * 0.15, -0.1, 0.3 + u * 0.55, sd > 0 ? -0.7 : Math.PI - 0.7, sd > 0 ? 0.7 : Math.PI + 0.7); ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
  }
  return { n: sparkCount(P, F, 1, 0.6), emit: (u, v) => [(u - 0.5) * 0.7, v * 0.8 - 0.2] };
}

const INSECTS = { firefly: drawFirefly, beetle: drawBeetle, dragonfly: drawDragonfly, mantis: drawMantis, cicada: drawCicada };

// ───────────────────────── fish ─────────────────────────

// Translucent fin that flutters: a fan from the root, rays drawn at higher detail.
function fin(ctx, P, F, pts, t, a = 0.5, rays = true) {
  const [x0, y0] = pts[0];
  let fx = x0, fy = y0, fd = 0;
  for (const [x, y] of pts) { const d = Math.hypot(x - x0, y - y0); if (d > fd) { fd = d; fx = x; fy = y; } }
  const outline = spline(pts, true, 4);
  ctx.beginPath(); outline.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  const gr = ctx.createLinearGradient(x0, y0, fx, fy);
  gr.addColorStop(0, C(t, 0.05, a)); gr.addColorStop(1, C(t, 0.28, a * 0.35));
  ctx.fillStyle = gr; ctx.fill();
  if (rays && F.lod) {
    ctx.strokeStyle = C(P.light, 0, a * 0.55); ctx.lineWidth = lw(F, 0.006, 0.5);
    ctx.beginPath();
    for (let i = 1; i < pts.length - 1; i++) { ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[i][0], pts[i][1]); }
    ctx.stroke();
  }
}

// A flowing veil: ribbon from root (x0,y0) trailing to the left, waving along its length.
function veil(ctx, P, F, x0, y0, len, width, dir, t, a, phase = 0) {
  const n = F.lod ? 12 : 6, top = [], bot = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, w = width * Math.sin(Math.PI * Math.min(1, s * 1.25 + 0.05)) * (0.6 + 0.4 * s);
    const x = x0 - s * len, y = y0 + dir * s * len * 0.55 + Math.sin(F.t * 2.4 - s * 4 + phase) * 0.09 * s;
    top.push([x, y - w * 0.5]); bot.push([x + 0.02 * s, y + w * 0.5]);
  }
  const pts = top.concat(bot.reverse());
  const gr = ctx.createLinearGradient(x0, y0, x0 - len, y0);
  gr.addColorStop(0, C(t, 0.05, a)); gr.addColorStop(0.7, C(t, 0.2, a * 0.6)); gr.addColorStop(1, C(P.light, 0, a * 0.15));
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  ctx.fillStyle = gr; ctx.fill();
  if (F.lod) {
    ctx.strokeStyle = C(P.light, 0, a * 0.45); ctx.lineWidth = lw(F, 0.005, 0.5);
    ctx.beginPath();
    for (let k = 1; k < 4; k++) { ctx.moveTo(x0, y0); for (let i = 1; i <= n; i++) ctx.lineTo(lerp(top[i][0], bot[n - i][0], k / 4), lerp(top[i][1], bot[n - i][1], k / 4)); }
    ctx.stroke();
  }
}

function drawKoi(ctx, P, F0) {
  const F = zoomF(F0, 1.25);
  ctx.scale(1.25, 1.25);
  const R = part(P, 'koi', () => shapeR('koi', [[0.68, 0], [0.62, -0.11], [0.45, -0.18], [0.2, -0.2], [-0.1, -0.16], [-0.35, -0.09], [-0.52, -0.04], [-0.52, 0.04], [-0.35, 0.09], [-0.1, 0.16], [0.2, 0.2], [0.45, 0.18], [0.62, 0.11]], 0.3, 0));
  const spr = sprite(P, 'koi', F.ppu, R.x0, R.y0, R.x1, R.y1, (g, S) => {
    g.save(); g.clip(R.path);
    volume(g, R.path, tone(P.light.h, 0.25, 0.86), 0.2, -0.05, 0.7, 0.08, -0.22);
    const rnd = rng(P.seed ^ 77);
    for (let i = 0; i < 4; i++) { // 緋 patches
      const x = lerp(-0.35, 0.5, rnd()), y = (rnd() - 0.5) * 0.25, rx = 0.1 + rnd() * 0.14;
      g.beginPath(); g.ellipse(x, y, rx, rx * (0.6 + rnd() * 0.4), rnd() * 3, 0, TAU);
      g.fillStyle = C(i === 3 ? P.ink : P.tones[0], i === 3 ? 0.08 : 0, 0.92); g.fill();
    }
    paintPattern(g, R, P, S, { alpha: 0.38, k: 0.6 });
    if (S.lod) { // dorsal ridge + scale shimmer
      g.strokeStyle = C(P.light, 0, 0.3); g.lineWidth = lw(S, 0.015, 0.5);
      g.beginPath(); g.moveTo(0.4, 0); g.lineTo(-0.45, 0); g.stroke();
    }
    g.restore();
    edge(g, R.path, P, S, 0.01, 0.5);
    for (const sd of [-1, 1]) eyeBall(g, 0.55, sd * 0.085, 0.028, P, S, P.gold, 1);
  });
  const w = F.t * 2.6;
  const dy = (x) => 0.13 * Math.pow(clamp((0.68 - x) / 1.2, 0, 1), 2) * Math.sin(x * 3 + w);
  const tailY = dy(-0.5), slope = (dy(-0.48) - dy(-0.56)) / 0.08;
  // tail fin: twin lobes trailing the body wave
  ctx.save(); ctx.translate(-0.5, tailY); ctx.rotate(-Math.atan(slope) * 0.8);
  veil(ctx, P, F, 0, 0, 0.45, 0.3, -0.5, P.tones[1], 0.75, 0);
  veil(ctx, P, F, 0, 0, 0.45, 0.3, 0.5, P.tones[1], 0.75, 1);
  ctx.restore();
  for (const sd of [-1, 1]) { // pectoral fins sweep
    const a = 0.6 + 0.35 * Math.sin(w * 0.8 + sd);
    ctx.save(); ctx.translate(0.36, sd * 0.15 + dy(0.36)); ctx.rotate(sd * a + Math.PI);
    fin(ctx, P, F, [[0, 0], [0.22, -0.06], [0.24, 0.06]], P.tones[1], 0.6);
    ctx.restore();
  }
  warpBlit(ctx, spr, F.lod > 1 ? 20 : F.lod ? 10 : 6, dy, F.ppu);
  if (F.lod) { // barbels
    ctx.strokeStyle = C(P.light, -0.1, 0.8); ctx.lineWidth = lw(F, 0.008);
    ctx.beginPath(); for (const sd of [-1, 1]) { ctx.moveTo(0.66, sd * 0.03); ctx.quadraticCurveTo(0.74, sd * 0.06, 0.76, sd * 0.11); } ctx.stroke();
  }
  sheenOn(ctx, P, F, R, 0.5);
  return { n: sparkCount(P, F0, 1, 0.6), emit: (u, v) => [lerp(-0.5, 0.75, u), (v - 0.5) * 0.35], rise: true };
}

function drawGoldfish(ctx, P, F) {
  const R = part(P, 'gf', () => shapeR('gf', [[0.52, 0.02], [0.44, -0.18], [0.2, -0.34], [-0.1, -0.32], [-0.28, -0.14], [-0.32, 0.05], [-0.22, 0.22], [0.05, 0.32], [0.35, 0.26]], 0.15, 0));
  const spr = sprite(P, 'gf', F.ppu, R.x0, R.y0, R.x1, R.y1, (g, S) => {
    g.save(); g.clip(R.path);
    volume(g, R.path, P.tones[0], 0.1, -0.05, 0.45, 0.24, -0.18);
    const belly = g.createLinearGradient(0, 0, 0, 0.32);
    belly.addColorStop(0, C(P.light, 0, 0)); belly.addColorStop(1, C(P.light, 0, 0.55));
    g.fillStyle = belly; g.fillRect(-0.4, 0, 1, 0.4);
    paintPattern(g, R, P, S, { alpha: 0.5, k: 0.6 });
    g.restore();
    edge(g, R.path, P, S, 0.012, 0.6);
    eyeBall(g, 0.36, -0.06, 0.07, P, S, P.gold, 0.8);
    g.strokeStyle = C(P.ink, 0.1, 0.5); g.lineWidth = lw(S, 0.01, 0.6);
    g.beginPath(); g.arc(0.3, 0.02, 0.17, -1.1, 1.0); g.stroke(); // gill
    g.beginPath(); g.arc(0.52, 0.05, 0.025, 0, TAU); g.fillStyle = C(P.warm, -0.1); g.fill();
  });
  const w = F.t * 2.2;
  // veil tail: four ribbons, the gift of the 琉金
  veil(ctx, P, F, -0.24, 0.0, 0.72, 0.42, -0.85, P.tones[1], 0.55, 0);
  veil(ctx, P, F, -0.24, 0.04, 0.7, 0.42, 0.75, P.tones[2], 0.55, 1.2);
  veil(ctx, P, F, -0.24, -0.08, 0.68, 0.3, -0.25, P.tones[1], 0.45, 2.1);
  veil(ctx, P, F, -0.24, 0.06, 0.66, 0.3, 0.25, P.tones[2], 0.45, 3.0);
  // dorsal + pelvic fins
  const fl = Math.sin(w) * 0.04;
  fin(ctx, P, F, [[0.14, -0.3], [0.04, -0.52 + fl], [-0.1, -0.64 + fl], [-0.24, -0.5 + fl], [-0.2, -0.24]], P.tones[1], 0.6);
  fin(ctx, P, F, [[0.06, 0.27], [-0.02, 0.48 - fl], [-0.14, 0.52 - fl], [-0.14, 0.26]], P.tones[2], 0.55);
  const dy = (x) => 0.02 * Math.sin(x * 4 + w);
  warpBlit(ctx, spr, F.lod > 1 ? 14 : 6, dy, F.ppu);
  const pa = 0.6 + 0.4 * Math.sin(w * 1.6);
  fin(ctx, P, F, [[0.22, 0.12], [0.1 - pa * 0.05, 0.32], [0.0, 0.22 + pa * 0.05]], P.tones[1], 0.6);
  sheenOn(ctx, P, F, R, 0.55);
  return { n: sparkCount(P, F, 2, 0.6), emit: (u, v) => [0.55 + u * 0.05, -0.02 + v * 0.05], rise: true, spread: 0.03, size: 0.7 };
}

function drawRay(ctx, P, F) {
  const R = part(P, 'ray', () => shapeR('ray', [[0, -0.6], [0.2, -0.5], [0.55, -0.25], [0.95, -0.02], [0.92, 0.08], [0.5, 0.22], [0.15, 0.36], [0, 0.4]], 0, -0.1));
  const half = sprite(P, 'ray', F.ppu, 0, R.y0, R.x1, R.y1, (g, S) => {
    g.save(); g.clip(R.path);
    volume(g, R.path, P.tones[0], 0.15, -0.15, 0.8, 0.2, -0.2);
    paintPattern(g, R, P, S, { alpha: 0.6 });
    const rim = g.createLinearGradient(0, 0, 0.95, 0);
    rim.addColorStop(0.6, C(P.light, 0, 0)); rim.addColorStop(1, C(P.light, 0, 0.35));
    g.fillStyle = rim; g.fillRect(0, -0.6, 1, 1);
    g.restore();
    edge(g, R.path, P, S, 0.01, 0.6);
    eyeBall(g, 0.13, -0.42, 0.035, P, S, P.gold, 0);
  });
  // tail whip
  ctx.strokeStyle = C(P.tones[0], -0.1); ctx.lineWidth = lw(F, 0.025);
  ctx.beginPath(); ctx.moveTo(0, 0.35);
  for (let i = 1; i <= 10; i++) { const s = i / 10; ctx.lineTo(Math.sin(F.t * 2 - s * 4) * 0.08 * s, 0.35 + s * 0.62); }
  ctx.stroke();
  const th = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(F.t * 1.5));
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(sd, 1); ctx.transform(Math.cos(th), -0.3 * Math.sin(th), 0, 1, 0, 0);
    blit(ctx, half);
    iridesce(ctx, P, R.path, 0, R.y0, R.x1, R.y1, th * 90 * P.iri, P.iri * 0.6, clamp(1.2 - th, 0, 1), 0.5);
    ctx.restore();
  }
  // cephalic horns
  ctx.fillStyle = C(P.tones[0], -0.08);
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 0.1, -0.64, 0.04, 0.1, sd * 0.2, 0, TAU); ctx.fill(); }
  return { n: sparkCount(P, F, 1, 0.7), emit: (u, v) => [(u - 0.5) * 1.6 * Math.cos(th), (v - 0.5) * 0.5], rise: true };
}

// Spine-and-segment body (eel, serpent dragon): segments drawn tail→head along a moving spine.
function tube(ctx, seg, pts, width) {
  for (let i = pts.length - 1; i >= 1; i--) {
    const [x, y] = pts[i], [px, py] = pts[i - 1];
    placed(ctx, seg, x, y, Math.atan2(py - y, px - x), width(i / (pts.length - 1)));
  }
}

function segmentSprite(P, F, name, base, belly, back, scales) {
  return sprite(P, name, F.ppu * 0.12, -1.2, -1.25, 1.2, 1.15, (g, S) => {
    const body = ellPath(0, 0, 1, 1);
    g.save(); g.clip(body);
    const gr = g.createLinearGradient(0, -1, 0, 1);
    gr.addColorStop(0, C(base, -0.12)); gr.addColorStop(0.35, C(base, 0.1)); gr.addColorStop(0.7, C(base, -0.05)); gr.addColorStop(0.72, C(belly, 0.05)); gr.addColorStop(1, C(belly, -0.1));
    g.fillStyle = gr; g.fillRect(-1, -1, 2, 2);
    if (scales && S.lod) {
      g.strokeStyle = C(P.light, 0, 0.35); g.lineWidth = lw(S, 0.08, 0.5);
      for (const y of [-0.55, -0.05]) for (const x of [-0.5, 0.3]) { g.beginPath(); g.arc(x + (y > -0.3 ? 0.4 : 0), y, 0.42, 0.2, Math.PI - 0.2); g.stroke(); }
    }
    g.restore();
    if (back) { g.beginPath(); g.moveTo(-0.6, -0.8); g.quadraticCurveTo(-0.1, -1.25, 0.5, -1.2); g.quadraticCurveTo(0.2, -0.95, 0.4, -0.75); g.closePath(); g.fillStyle = C(back, 0.05, 0.95); g.fill(); }
  });
}

function drawEel(ctx, P, F) {
  const n = F.lod ? 30 : 16, pts = [];
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), x = lerp(0.82, -0.92, s);
    pts.push([x, Math.sin(x * 4.2 + F.t * 3) * lerp(0.04, 0.22, s)]);
  }
  const seg = segmentSprite(P, F, 'eelseg', P.tones[0], P.light, null, P.pattern === 'scales' || P.pattern === 'crystal');
  const width = (s) => 0.075 * (1 - Math.pow(s, 1.6) * 0.82);
  // continuous fin ribbon
  ctx.beginPath();
  pts.forEach(([x, y], i) => { const w = width(i / (n - 1)) + 0.05; i ? ctx.lineTo(x, y - w) : ctx.moveTo(x, y - w); });
  for (let i = n - 1; i >= 0; i--) { const [x, y] = pts[i], w = width(i / (n - 1)) + 0.05; ctx.lineTo(x, y + w); }
  ctx.closePath(); ctx.fillStyle = C(P.tones[1], 0.1, 0.4); ctx.fill();
  tube(ctx, seg, pts, width);
  // glowing lateral line: the 文 of a 文魚
  ctx.globalCompositeOperation = 'lighter';
  const lamp = P.tones[2];
  for (let i = 2; i < n - 3; i += F.lod ? 2 : 3) {
    const [x, y] = pts[i], pulse = 0.5 + 0.5 * Math.sin(F.rt * 3 - i * 0.5);
    glow(ctx, lamp, x, y, 0.05 + P.glow * 0.04, (0.3 + P.glow * 0.5) * pulse, 0.9);
  }
  ctx.globalCompositeOperation = 'source-over';
  const [hx, hy] = pts[0], [nx, ny] = pts[1];
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.atan2(hy - ny, hx - nx));
  ctx.beginPath(); ctx.ellipse(0.02, 0, 0.11, 0.07, 0, 0, TAU); ctx.fillStyle = C(P.tones[0], 0.05); ctx.fill();
  ctx.beginPath(); ctx.arc(0.05, -0.025, 0.022, 0, TAU); ctx.fillStyle = C(P.gold, 0.1); ctx.fill();
  ctx.beginPath(); ctx.arc(0.055, -0.03, 0.009, 0, TAU); ctx.fillStyle = C(P.ink, 0); ctx.fill();
  ctx.restore();
  return { n: sparkCount(P, F, 1, 0.7), emit: (u) => pts[Math.floor(u * (n - 1))], rise: true };
}

function drawPuffer(ctx, P, F) {
  const R = part(P, 'pf', () => ellR('pf', 0, 0, 0.5, 0.46));
  const spr = sprite(P, 'pf', F.ppu, -0.62, -0.6, 0.62, 0.6, (g, S) => {
    const rnd = rng(P.seed ^ 5);
    g.strokeStyle = C(P.tones[1], 0.1); g.lineWidth = lw(S, 0.018, 0.7);
    g.beginPath();
    for (let i = 0; i < (S.lod ? 34 : 16); i++) { const a = (i / (S.lod ? 34 : 16)) * TAU + rnd() * 0.1, r = 0.5; g.moveTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.9); g.lineTo(Math.cos(a) * (r + 0.09), Math.sin(a) * (r * 0.92 + 0.09)); }
    g.stroke();
    g.save(); g.clip(R.path);
    volume(g, R.path, P.tones[0], 0, 0, 0.55, 0.22, -0.2);
    const belly = g.createLinearGradient(0, 0, 0, 0.5);
    belly.addColorStop(0, C(P.light, 0, 0)); belly.addColorStop(1, C(P.light, 0, 0.75));
    g.fillStyle = belly; g.fillRect(-0.6, 0, 1.2, 0.6);
    paintPattern(g, R, P, S, { alpha: 0.55, k: 0.7 });
    g.restore();
    edge(g, R.path, P, S, 0.012, 0.6);
    eyeBall(g, 0.26, -0.14, 0.09, P, S, P.gold, 0.6);
    g.beginPath(); g.ellipse(0.5, 0.06, 0.05, 0.035, 0, 0, TAU); g.fillStyle = C(P.warm, -0.05); g.fill();
  });
  const breath = 0.92 + 0.08 * (0.5 + 0.5 * Math.sin(F.t * 0.9));
  const flick = Math.sin(F.t * 18);
  ctx.save(); ctx.translate(-0.48 * breath, 0); ctx.scale(1, 0.85 + 0.15 * Math.abs(Math.sin(F.t * 5)));
  fin(ctx, P, F, [[0, 0], [-0.24, -0.2], [-0.2, 0], [-0.24, 0.2]], P.tones[1], 0.7);
  ctx.restore();
  placed(ctx, spr, 0, 0, 0, breath);
  ctx.save(); ctx.translate(0.05, 0.08); ctx.scale(0.5 + 0.5 * Math.abs(flick), 1);
  fin(ctx, P, F, [[0, 0], [-0.18, -0.08], [-0.16, 0.1]], P.tones[1], 0.6);
  ctx.restore();
  sheenOn(ctx, P, F, R, 0.5);
  return { n: sparkCount(P, F, 2, 0.6), emit: (u, v) => [0.52, 0.04 + v * 0.03], rise: true, spread: 0.04, size: 0.6 };
}

const FISH = { goldfish: drawGoldfish, koi: drawKoi, ray: drawRay, eel: drawEel, puffer: drawPuffer };

// ───────────────────────── jellyfish ─────────────────────────

function bellSprite(P, F, kind) {
  const pts = kind === 'lantern'
    ? [[-0.36, -0.86], [0, -0.92], [0.36, -0.86], [0.5, -0.6], [0.5, -0.25], [0.36, -0.06], [0, -0.03], [-0.36, -0.06], [-0.5, -0.25], [-0.5, -0.6]]
    : kind === 'ribbon'
      ? [[-0.34, -0.48], [-0.3, -0.72], [0, -0.86], [0.3, -0.72], [0.34, -0.48], [0.2, -0.43], [0, -0.42], [-0.2, -0.43]]
      : [[-0.55, -0.3], [-0.5, -0.6], [-0.28, -0.83], [0, -0.88], [0.28, -0.83], [0.5, -0.6], [0.55, -0.3], [0.32, -0.25], [0, -0.24], [-0.32, -0.25]];
  const R = part(P, 'bell', () => region('bell', spline(pts), 0, kind === 'ribbon' ? -0.45 : -0.28));
  const s = sprite(P, 'bell', F.ppu, R.x0, R.y0, R.x1, R.y1 + 0.02, (g, S) => {
    g.save(); g.clip(R.path);
    const gr = g.createRadialGradient(0, R.y0 + 0.15, 0.02, 0, (R.y0 + R.y1) / 2, R.d * 0.75);
    gr.addColorStop(0, C(P.light, 0, 0.75)); gr.addColorStop(0.45, C(P.tones[0], 0.1, 0.5)); gr.addColorStop(1, C(P.tones[1], 0.05, 0.85));
    g.fillStyle = gr; g.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0);
    paintPattern(g, R, P, S, { alpha: 0.4 });
    // radial canals
    g.strokeStyle = C(P.light, 0, 0.35); g.lineWidth = lw(S, 0.008, 0.5);
    g.beginPath();
    for (let k = -4; k <= 4; k++) { g.moveTo(0, R.y0 + 0.1); g.quadraticCurveTo(k * 0.08, R.y0 + 0.3, k * (R.x1 / 4.6), R.y1); }
    g.stroke();
    if (kind === 'lantern') { // paper-lantern ribs
      g.strokeStyle = C(P.gold, 0.1, 0.55); g.lineWidth = lw(S, 0.012, 0.6);
      for (let y = -0.78; y < -0.05; y += 0.1) { g.beginPath(); g.ellipse(0, y, 0.5, 0.04, 0, 0, Math.PI); g.stroke(); }
    }
    g.restore();
    // gonads: four glowing horseshoes
    g.globalCompositeOperation = 'lighter';
    const cy = lerp(R.y0, R.y1, 0.55);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.4;
      g.beginPath(); g.ellipse(Math.cos(a) * R.d * 0.15, cy + Math.sin(a) * 0.05, R.d * 0.07, R.d * 0.03, a, 0, TAU);
      g.fillStyle = C(P.tones[2], 0.15, 0.7); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = C(P.light, 0, 0.75); g.lineWidth = lw(S, 0.014, 0.8); g.stroke(R.path);
  });
  return [R, s];
}

function tentacles(ctx, P, F, n, x0, x1, y0, len, pulse, w, a, beads) {
  ctx.lineWidth = w;
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0.5 : i / (n - 1), bx = lerp(x0, x1, u) * (1 - pulse * 0.15);
    const L = len * (0.75 + 0.35 * h01(P.seed, i));
    ctx.strokeStyle = C(P.tones[(i % 3) + 1], 0.18, a);
    ctx.beginPath(); ctx.moveTo(bx, y0);
    let x = bx, y = y0;
    for (let j = 1; j <= 8; j++) {
      const s = j / 8;
      x = bx * (1 - s * 0.25) + Math.sin(F.t * 1.6 - s * 3.2 + i * 1.7) * 0.08 * s;
      y = y0 + s * L * (1 - pulse * 0.12);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (beads) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.gold, x, y, 0.07, 0.8, 0.9); ctx.globalCompositeOperation = 'source-over'; }
  }
}

function frillyArm(ctx, P, F, x, y0, len, width, t, i) {
  const n = F.lod ? 14 : 7, L = [], Rt = [];
  for (let j = 0; j <= n; j++) {
    const s = j / n, cx = x + Math.sin(F.t * 1.3 - s * 4 + i * 2) * 0.12 * s;
    const ww = width * (1 - s * 0.7) * (0.7 + 0.3 * Math.sin(s * 22 + F.t * 2 + i));
    L.push([cx - ww, y0 + s * len]); Rt.push([cx + ww, y0 + s * len]);
  }
  ctx.beginPath(); L.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  for (let j = n; j >= 0; j--) ctx.lineTo(Rt[j][0], Rt[j][1]);
  ctx.closePath();
  const gr = ctx.createLinearGradient(0, y0, 0, y0 + len);
  gr.addColorStop(0, C(t, 0.15, 0.7)); gr.addColorStop(1, C(t, 0.25, 0.08));
  ctx.fillStyle = gr; ctx.fill();
}

function drawJelly(ctx, P, F) {
  const kind = P.shape;
  const [R, bell] = bellSprite(P, F, kind);
  const ph = (F.t * 0.75) % 1;
  const pulse = ph < 0.3 ? Math.sin((ph / 0.3) * Math.PI * 0.5) : 1 - smooth(0.3, 1, ph); // fast contraction, slow relax
  const sx = 1 - 0.13 * pulse, sy = 1 + 0.09 * pulse;
  const rimY = R.y1 * sy + (R.y0 * sy - R.y0) * 0;
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, P.tones[0], 0, (R.y0 + R.y1) / 2, R.d * 0.9, 0.18 + P.glow * 0.35, 0.6);
  ctx.globalCompositeOperation = 'source-over';
  if (kind === 'ribbon') {
    for (let i = 0; i < 5; i++) frillyArm(ctx, P, F, (i - 2) * 0.1 * sx, rimY - 0.02, 1.35 - Math.abs(i - 2) * 0.12, 0.07, P.tones[1 + (i % 3)], i);
    tentacles(ctx, P, F, 10, R.x0 * sx, R.x1 * sx, rimY, 1.1, pulse, lw(F, 0.008), 0.55, false);
  } else if (kind === 'lantern') {
    tentacles(ctx, P, F, 7, R.x0 * sx * 0.8, R.x1 * sx * 0.8, rimY, 0.72, pulse, lw(F, 0.014), 0.75, true);
  } else {
    tentacles(ctx, P, F, F.lod ? 14 : 8, R.x0 * sx, R.x1 * sx, rimY, 1.0, pulse, lw(F, 0.009), 0.6, false);
    for (let i = 0; i < 4; i++) frillyArm(ctx, P, F, (i - 1.5) * 0.07 * sx, rimY - 0.04, 0.55, 0.06, P.tones[1 + (i % 3)], i);
  }
  ctx.save(); ctx.translate(0, R.y0); ctx.scale(sx, sy); ctx.translate(0, -R.y0);
  blit(ctx, bell);
  sheenOn(ctx, P, F, R, 0.7, 0.8);
  ctx.restore();
  if (kind === 'lantern') { // the lamp inside
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, P.gold, 0, -0.45, 0.42, 0.55 + 0.25 * Math.sin(F.rt * 5) * Math.sin(F.rt * 3.3), 0.9);
    ctx.globalCompositeOperation = 'source-over';
  }
  return { n: sparkCount(P, F, 2, 0.8), emit: (u, v) => [(u - 0.5) * R.d * 0.8, lerp(R.y0, 0.6, v)], rise: true, spread: 0.05 };
}

// ───────────────────────── birds ─────────────────────────

// One feather as a closed path: a slim leaf from (x, y) along angle a.
function featherPath(path, x, y, a, len, w) {
  const c = Math.cos(a), s = Math.sin(a), nx = -s * w, ny = c * w;
  path.moveTo(x, y);
  path.bezierCurveTo(x + c * len * 0.3 + nx, y + s * len * 0.3 + ny, x + c * len * 0.85 + nx * 0.8, y + s * len * 0.85 + ny * 0.8, x + c * len, y + s * len);
  path.bezierCurveTo(x + c * len * 0.85 - nx * 0.8, y + s * len * 0.85 - ny * 0.8, x + c * len * 0.3 - nx, y + s * len * 0.3 - ny, x, y);
  path.closePath();
}

// Right wing seen from above (鶴丸 pose): shoulder near the body, wrist at (0.48,-0.2).
function wingGeometry(P, ornate) {
  return part(P, ornate ? 'phgeo' : 'crgeo', () => {
    const prim = [], sec = [], union = new Path2D();
    for (let k = 0; k < 8; k++) prim.push([0.46, -0.2, -0.28 + k * 0.12, 0.54 - k * 0.035, 0.055]);
    for (let k = 0; k < 8; k++) { const u = k / 7; sec.push([lerp(0.08, 0.46, u), lerp(-0.12, -0.2, u), Math.PI / 2 + 0.12 - u * 0.6, 0.34 - u * 0.05, 0.06]); }
    for (const f of [...sec, ...prim]) featherPath(union, ...f);
    const coverts = shapeR('cov', [[0.06, -0.2], [0.3, -0.28], [0.52, -0.27], [0.6, -0.18], [0.5, -0.05], [0.3, 0.03], [0.08, 0.02]], 0.06, -0.12);
    union.addPath(coverts.path);
    return { prim, sec, coverts, union, R: { path: union, x0: 0, y0: -0.5, x1: 1.05, y1: 0.3 } };
  });
}

function birdWingSprite(P, F, name, ornate) {
  const G = wingGeometry(P, ornate);
  const s = sprite(P, name, F.ppu, -0.02, -0.5, 1.05, 0.3, (g, S) => {
    const paintFeathers = (list, colAt, edgeCol) => list.forEach((f, i) => {
      const p = new Path2D(); featherPath(p, ...f);
      const [x, y, a, len] = f, gr = g.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
      const [c0, c1] = colAt(i / (list.length - 1));
      gr.addColorStop(0, c0); gr.addColorStop(1, c1);
      g.fillStyle = gr; g.fill(p);
      g.strokeStyle = edgeCol; g.lineWidth = lw(S, 0.006, 0.5); g.stroke(p);
      if (S.lod) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len * 0.92, y + Math.sin(a) * len * 0.92); g.stroke(); }
    });
    if (ornate) { // 鳳凰: jewel feathers, gold-tipped
      paintFeathers(G.sec, (u) => [C(P.tones[1], 0.05), C(P.tones[2], 0.15)], C(P.gold, 0, 0.6));
      paintFeathers(G.prim, (u) => [C(P.tones[2], 0.0), C(P.gold, 0.12)], C(P.gold, 0.1, 0.7));
      if (S.lod) G.sec.forEach(([x, y, a, len], i) => { if (i % 2) eye(g, x + Math.cos(a) * len * 0.72, y + Math.sin(a) * len * 0.72, 0.035, P, S); });
    } else { // 丹頂: white primaries, ink secondaries
      paintFeathers(G.sec, () => [C(P.ink, 0.12), C(P.ink, 0.04)], C(P.light, 0, 0.25));
      paintFeathers(G.prim, (u) => [C(P.light, 0.04), C(P.light, -0.06 - u * 0.08)], C(P.ink, 0.25, 0.4));
    }
    const cov = G.coverts;
    g.save(); g.clip(cov.path);
    volume(g, cov.path, ornate ? P.tones[0] : tone(P.light.h, 0.2, 0.92), 0.3, -0.15, 0.4, 0.1, -0.12);
    paintPattern(g, cov, P, S, { alpha: ornate ? 0.45 : 0.22, k: 0.6 });
    g.strokeStyle = C(ornate ? P.gold : P.ink, ornate ? 0.1 : 0.4, ornate ? 0.55 : 0.25); g.lineWidth = lw(S, 0.007, 0.5);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(0.1 + k * 0.08 + row * 0.03, -0.2 + row * 0.07, 0.045, 0.15, Math.PI - 0.15); g.stroke(); }
    g.restore();
    edge(g, cov.path, P, S, 0.008, 0.45);
  });
  return [G.R, s];
}

// Wing elevation for birds: positive raises the tips, negative drops them below the body.
function wingBeat(P, F, speed) {
  const ph = F.t * speed * TAU;
  if (P.move === 'glide' || P.move === 'drift') { const g = smooth(0.25, 0.75, 0.5 + 0.5 * Math.sin(F.t * 0.45)); return lerp(0.12, 0.55 * Math.sin(ph), g); }
  if (P.move === 'still' || P.move === 'walk') return 0.9 + 0.1 * Math.sin(F.t * 0.8);
  return 0.6 * Math.sin(ph);
}

function birdWing(ctx, P, F, R, s, theta, side) {
  const c = Math.cos(theta), sn = Math.sin(theta);
  ctx.save(); ctx.scale(side, 1);
  ctx.transform(c, -0.26 * sn, 0, 1, 0, 0);
  blit(ctx, s);
  iridesce(ctx, P, R.path, R.x0, R.y0, R.x1, R.y1, theta * 90 * P.iri + side * 10, P.iri * (0.45 + 0.3 * Math.abs(sn)), clamp(0.6 - theta * 0.6, 0, 1), 0.5);
  if (Math.abs(sn) > 0.3) { ctx.save(); ctx.clip(R.path); ctx.fillStyle = C(P.ink, 0, (Math.abs(sn) - 0.3) * 0.5); ctx.fillRect(R.x0, R.y0, R.x1 - R.x0, R.y1 - R.y0); ctx.restore(); }
  ctx.restore();
}

function drawFlyingBird(ctx, P, F, ornate) {
  const [R, wing] = birdWingSprite(P, F, ornate ? 'phw' : 'crw', ornate);
  const white = tone(P.light.h, 0.18, 0.93);
  const body = sprite(P, ornate ? 'phb' : 'crb', F.ppu, -0.2, -0.95, 0.2, 0.92, (g, S) => {
    if (!ornate) { // long legs trailing behind
      g.strokeStyle = C(P.ink, 0.2); g.lineWidth = lw(S, 0.016, 0.8);
      g.beginPath(); g.moveTo(-0.02, 0.3); g.lineTo(-0.035, 0.9); g.moveTo(0.02, 0.3); g.lineTo(0.035, 0.9); g.stroke();
    }
    g.strokeStyle = ornate ? C(P.tones[0], 0.02) : C(P.ink, 0.08); g.lineWidth = 0.06; // neck
    g.beginPath(); g.moveTo(0, -0.12); g.lineTo(0, -0.6); g.stroke();
    const bodyP = ellPath(0, 0.04, 0.12, 0.27);
    volume(g, bodyP, ornate ? P.tones[0] : white, -0.02, 0, 0.27, 0.06, -0.16);
    if (ornate) { g.save(); g.clip(bodyP); paintPattern(g, ellR('pb', 0, 0.04, 0.12, 0.27), P, S, { alpha: 0.45, k: 0.6 }); g.restore(); }
    else { g.beginPath(); g.ellipse(0, 0.27, 0.08, 0.1, 0, 0, TAU); g.fillStyle = C(P.ink, 0.06); g.fill(); } // black tertial bustle
    edge(g, bodyP, P, S, 0.008, 0.35);
    const hd = ellPath(0, -0.64, 0.055, 0.075);
    volume(g, hd, ornate ? P.tones[1] : white, 0, -0.65, 0.07, 0.12, -0.1);
    g.beginPath(); g.ellipse(0, -0.67, 0.035, 0.04, 0, 0, TAU); g.fillStyle = C(P.warm, 0.06); g.fill(); // 丹頂 / comb
    g.fillStyle = C(ornate ? P.gold : tone(48, 0.45, 0.66), 0);
    g.beginPath(); g.moveTo(-0.022, -0.7); g.lineTo(0, ornate ? -0.84 : -0.93); g.lineTo(0.022, -0.7); g.closePath(); g.fill();
    for (const sd of [-1, 1]) eyeBall(g, sd * 0.04, -0.66, 0.013, P, S, P.gold, 0);
    if (ornate) { // crest of three jewel-tipped plumes
      g.strokeStyle = C(P.gold, 0.1); g.lineWidth = lw(S, 0.008, 0.6);
      for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(0, -0.68); g.quadraticCurveTo(k * 0.05, -0.8, k * 0.11, -0.86); g.stroke(); g.beginPath(); g.arc(k * 0.11, -0.86, 0.02, 0, TAU); g.fillStyle = C(P.tones[2], 0.15); g.fill(); }
    }
  });
  const a = wingBeat(P, F, ornate ? 0.7 : 0.55);
  ctx.save(); ctx.translate(0, -0.02 - a * 0.04);
  if (ornate) drawPlumes(ctx, P, F);
  for (const sd of [-1, 1]) birdWing(ctx, P, F, R, wing, a * 1.4, sd);
  blit(ctx, body);
  ctx.restore();
  return ornate
    ? { n: sparkCount(P, F, 4, 1.2), emit: (u, v) => [(u - 0.5) * 0.5, 0.35 + v * 0.5], life: 2 }
    : { n: sparkCount(P, F, 1, 0.6), emit: (u, v) => [(u - 0.5) * 1.6, -0.2 + v * 0.2] };
}

// 鳳凰 tail: ribbons trailing below, each ending in an eye feather.
function drawPlumes(ctx, P, F) {
  const n = P.rarity === 'legendary' ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const spread = (i - (n - 1) / 2) * 0.2, L = [], Rr = [];
    for (let j = 0; j <= 14; j++) {
      const s = j / 14, y = 0.25 + s * 0.68, x = s * spread + Math.sin(F.t * 1.6 - s * 4 + i) * 0.07 * s;
      const w = 0.03 * (1 - s * 0.55) + 0.012 * Math.sin(s * Math.PI);
      L.push([x - w, y]); Rr.push([x + w, y]);
    }
    const t = P.tones[(i % 3) + 1], ex = (L[14][0] + Rr[14][0]) / 2, ey = L[14][1];
    const gr = ctx.createLinearGradient(0, 0.25, ex, ey);
    gr.addColorStop(0, C(t, 0, 0.95)); gr.addColorStop(0.7, C(t, 0.15, 0.85)); gr.addColorStop(1, C(P.gold, 0.1, 0.9));
    ctx.beginPath(); L.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); for (let j = 14; j >= 0; j--) ctx.lineTo(Rr[j][0], Rr[j][1]); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex, ey, 0.05, 0.075, 0, 0, TAU); ctx.fillStyle = C(t, 0.12); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, 0.03, 0, TAU); ctx.fillStyle = C(P.ink, 0.05); ctx.fill();
    ctx.beginPath(); ctx.arc(ex, ey, 0.015, 0, TAU); ctx.fillStyle = C(P.gold, 0.18); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, P.gold, 0, 0.6, 0.55, 0.2 + P.glow * 0.4, 0.5);
  ctx.globalCompositeOperation = 'source-over';
}

function drawSparrow(ctx, P, F) {
  const R = part(P, 'sp', () => shapeR('sp', [[0.42, -0.2], [0.3, -0.42], [0.06, -0.38], [-0.2, -0.2], [-0.42, 0.0], [-0.3, 0.26], [0.0, 0.34], [0.3, 0.22], [0.46, 0.0]], 0.1, 0));
  const body = sprite(P, 'sp', F.ppu, -0.9, -0.5, 0.65, 0.65, (g, S) => {
    g.fillStyle = C(P.tones[1], -0.15); // tail
    g.beginPath(); g.moveTo(-0.3, 0.05); g.lineTo(-0.82, -0.22); g.lineTo(-0.86, -0.1); g.lineTo(-0.35, 0.18); g.closePath(); g.fill();
    g.save(); g.clip(R.path);
    volume(g, R.path, P.tones[0], 0.0, -0.05, 0.5, 0.16, -0.2);
    g.fillStyle = C(P.light, -0.02, 0.9); g.beginPath(); g.ellipse(0.1, 0.24, 0.32, 0.16, 0, 0, TAU); g.fill(); // breast
    paintPattern(g, R, P, S, { alpha: 0.35, k: 0.6 });
    g.fillStyle = C(P.tones[2], -0.1); g.beginPath(); g.ellipse(0.24, -0.34, 0.2, 0.11, 0.2, 0, TAU); g.fill(); // cap
    g.fillStyle = C(P.light, 0.02); g.beginPath(); g.ellipse(0.3, -0.12, 0.11, 0.08, 0, 0, TAU); g.fill(); // cheek
    g.fillStyle = C(P.ink, 0.04); g.beginPath(); g.arc(0.3, -0.1, 0.035, 0, TAU); g.fill();
    g.restore();
    edge(g, R.path, P, S, 0.012, 0.5);
    eyeBall(g, 0.34, -0.22, 0.035, P, S, P.ink, 1);
    g.fillStyle = C(P.gold, -0.2); g.beginPath(); g.moveTo(0.43, -0.2); g.lineTo(0.56, -0.14); g.lineTo(0.43, -0.1); g.closePath(); g.fill();
    g.strokeStyle = C(P.warm, -0.1); g.lineWidth = lw(S, 0.018, 0.8);
    g.beginPath(); g.moveTo(-0.02, 0.3); g.lineTo(-0.04, 0.55); g.moveTo(0.1, 0.3); g.lineTo(0.12, 0.55); g.stroke();
  });
  const wingR = part(P, 'spw', () => shapeR('spw', [[0.15, -0.18], [-0.1, -0.22], [-0.45, -0.05], [-0.5, 0.06], [-0.1, 0.12], [0.18, 0.02]], 0.1, -0.1));
  const wing = sprite(P, 'spw', F.ppu, wingR.x0, wingR.y0, wingR.x1, wingR.y1, (g, S) => {
    g.save(); g.clip(wingR.path);
    volume(g, wingR.path, P.tones[1], -0.1, -0.05, 0.4, 0.15, -0.2);
    g.strokeStyle = C(P.ink, 0.1, 0.6); g.lineWidth = lw(S, 0.01, 0.5);
    for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0.1 - k * 0.12, -0.18); g.lineTo(-0.1 - k * 0.12, 0.1); g.stroke(); }
    g.fillStyle = C(P.light, 0, 0.8); g.fillRect(-0.3, -0.06, 0.3, 0.025); // wing bar
    g.restore();
    edge(g, wingR.path, P, S, 0.01, 0.6);
  });
  const hop = P.move === 'walk' ? Math.max(0, Math.sin(F.t * 3.2)) ** 2 * 0.12 : 0;
  const fly = P.move === 'flutter' || P.move === 'glide' || P.move === 'hover';
  ctx.save(); ctx.translate(0, -hop);
  blit(ctx, body);
  if (fly) {
    const a = Math.sin(F.t * TAU * 2.2);
    ctx.save(); ctx.translate(0.0, -0.08); ctx.rotate(-0.5 - a * 0.9); ctx.scale(1, 0.6 + 0.4 * Math.abs(a)); blit(ctx, wing); ctx.restore();
  } else placed(ctx, wing, 0, 0.05, Math.sin(F.t * 0.8) * 0.04);
  ctx.restore();
  sheenOn(ctx, P, F, R, 0.4);
  return { n: sparkCount(P, F, 1, 0.5), emit: (u, v) => [(u - 0.5) * 0.6, (v - 0.5) * 0.5] };
}

function drawOwl(ctx, P, F) {
  const R = part(P, 'owl', () => shapeR('owl', [[0, -0.72], [0.3, -0.66], [0.44, -0.3], [0.44, 0.2], [0.3, 0.58], [0, 0.68], [-0.3, 0.58], [-0.44, 0.2], [-0.44, -0.3], [-0.3, -0.66]], 0, 0));
  const body = sprite(P, 'owl', F.ppu, -0.62, -0.95, 0.62, 0.86, (g, S) => {
    g.strokeStyle = C(P.ink, 0.15); g.lineWidth = 0.05; // branch
    g.beginPath(); g.moveTo(-0.62, 0.72); g.quadraticCurveTo(0, 0.66, 0.62, 0.76); g.stroke();
    for (const sd of [-1, 1]) { // ear tufts
      g.beginPath(); g.moveTo(sd * 0.14, -0.62); g.lineTo(sd * 0.34, -0.92); g.lineTo(sd * 0.32, -0.56); g.closePath(); g.fillStyle = C(P.tones[0], -0.12); g.fill();
    }
    g.save(); g.clip(R.path);
    volume(g, R.path, P.tones[0], 0, -0.1, 0.8, 0.15, -0.22);
    g.fillStyle = C(P.light, -0.04, 0.85); g.beginPath(); g.ellipse(0, 0.22, 0.26, 0.36, 0, 0, TAU); g.fill(); // breast
    paintPattern(g, region('breast', ellipsePts(0, 0.22, 0.26, 0.36), 0, 0.22), P, S, { alpha: 0.6, k: 0.6 });
    if (S.lod) { // chevrons
      g.strokeStyle = C(P.tones[0], -0.18, 0.7); g.lineWidth = lw(S, 0.012, 0.5);
      for (let y = 0.0; y < 0.55; y += 0.1) for (let x = -0.15; x <= 0.15; x += 0.1) { g.beginPath(); g.moveTo(x - 0.03, y); g.lineTo(x, y + 0.03); g.lineTo(x + 0.03, y); g.stroke(); }
    }
    for (const sd of [-1, 1]) { // wings folded at the sides
      g.beginPath(); g.ellipse(sd * 0.42, 0.12, 0.18, 0.48, sd * 0.12, 0, TAU); g.fillStyle = C(P.tones[1], -0.15); g.fill();
      g.strokeStyle = C(P.light, 0, 0.3); g.lineWidth = lw(S, 0.01, 0.5);
      for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(sd * 0.36, -0.1 + k * 0.14, 0.1, 0.3, Math.PI - 0.3); g.stroke(); }
    }
    // facial discs
    for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 0.16, -0.32, 0.2, 0, TAU); g.fillStyle = C(P.light, -0.06, 0.95); g.fill(); g.strokeStyle = C(P.tones[0], -0.2, 0.8); g.lineWidth = lw(S, 0.016); g.stroke(); }
    g.restore();
    edge(g, R.path, P, S, 0.012, 0.6);
    g.fillStyle = C(P.gold, -0.1); g.beginPath(); g.moveTo(-0.04, -0.24); g.lineTo(0.04, -0.24); g.lineTo(0, -0.12); g.closePath(); g.fill();
    g.strokeStyle = C(P.gold, -0.15); g.lineWidth = lw(S, 0.02);
    for (const sd of [-1, 1]) for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(sd * 0.12 + k * 0.03, 0.6); g.lineTo(sd * 0.12 + k * 0.045, 0.7); g.stroke(); }
  });
  blit(ctx, body);
  const tilt = Math.sin(F.t * 0.35) ** 9 * 0.25;
  const blink = blinkAt(F, 5.1);
  for (const sd of [-1, 1]) {
    const x = sd * 0.16 + tilt * 0.05, y = -0.33 + sd * tilt * 0.04;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, P.vivid, x, y, 0.16, 0.25 + P.glow * 0.5, 0.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.arc(x, y, 0.105, 0, TAU); ctx.fillStyle = C(P.vivid, 0.12); ctx.fill();
    ctx.beginPath(); ctx.arc(x + tilt * 0.08, y, 0.055, 0, TAU); ctx.fillStyle = C(P.ink, -0.04); ctx.fill();
    ctx.beginPath(); ctx.arc(x - 0.03, y - 0.035, 0.02, 0, TAU); ctx.fillStyle = 'hsla(0,0%,100%,.95)'; ctx.fill();
    if (blink > 0) { ctx.beginPath(); ctx.ellipse(x, y - 0.11 + blink * 0.11, 0.115, 0.115 * blink, 0, 0, TAU); ctx.fillStyle = C(P.tones[0], -0.05); ctx.fill(); }
  }
  sheenOn(ctx, P, F, R, 0.35, 0.4);
  return { n: sparkCount(P, F, 1, 0.6), emit: (u, v) => [(u - 0.5) * 0.8, (v - 0.5) * 1.2], rise: true };
}

const BIRDS = { crane: (c, P, F) => drawFlyingBird(c, P, F, false), phoenix: (c, P, F) => drawFlyingBird(c, P, F, true), sparrow: drawSparrow, owl: drawOwl };

// ───────────────────────── beasts ─────────────────────────

function furTone(P) { return tone(P.tones[0].h, Math.min(P.tones[0].s, 0.7), clamp(P.tones[0].l, 0.45, 0.62)); }

function gait(ctx, P, F, hips, len, w, col, far, speed = 2.4, swing = 0.42, sock = col) {
  hips.forEach(([x, y, ph], i) => {
    const a = Math.sin(F.t * speed * (P.move === 'walk' ? 1 : 0.15) + ph + (far ? Math.PI : 0)) * swing;
    limb(ctx, x, y, len * 0.52, len * 0.5, Math.PI / 2 + a, (i % 2 ? -1 : 1) * (0.25 + Math.max(0, -a) * 0.6), w, col, w * 0.6, sock);
  });
}

function drawFox(ctx, P, F) {
  const fur = furTone(P);
  const R = part(P, 'fox', () => shapeR('fox', [[0.52, -0.42], [0.36, -0.38], [0.26, -0.17], [0.0, -0.14], [-0.3, -0.16], [-0.52, -0.05], [-0.5, 0.14], [-0.28, 0.25], [0.1, 0.23], [0.3, 0.13], [0.42, -0.08], [0.6, -0.2], [0.82, -0.2], [0.8, -0.28]], -0.05, 0.06));
  const body = sprite(P, 'fox', F.ppu, -0.56, -0.7, 0.86, 0.3, (g, S) => {
    for (const [x, d] of [[0.4, 0], [0.52, 0.02]]) { // ears
      g.beginPath(); g.moveTo(x - 0.06, -0.4); g.lineTo(x - 0.02 + d, -0.66); g.lineTo(x + 0.08, -0.42); g.closePath(); g.fillStyle = C(fur, -0.1 + d * 4); g.fill();
      g.beginPath(); g.moveTo(x - 0.03, -0.42); g.lineTo(x - 0.01 + d, -0.6); g.lineTo(x + 0.05, -0.43); g.closePath(); g.fillStyle = C(P.ink, 0.1); g.fill();
    }
    g.save(); g.clip(R.path);
    volume(g, R.path, fur, 0, -0.05, 0.7, 0.16, -0.2);
    const belly = g.createLinearGradient(0, 0.05, 0, 0.25);
    belly.addColorStop(0, C(P.light, 0, 0)); belly.addColorStop(1, C(P.light, 0, 0.85));
    g.fillStyle = belly; g.fillRect(-0.6, 0, 1.5, 0.3);
    g.fillStyle = C(P.light, 0, 0.9); g.beginPath(); g.ellipse(0.62, -0.2, 0.16, 0.06, 0.1, 0, TAU); g.fill(); // muzzle
    paintPattern(g, R, P, S, { alpha: 0.32, k: 0.6 });
    g.restore();
    edge(g, R.path, P, S, 0.011, 0.55);
    // 隈取 face markings and a glinting eye
    g.strokeStyle = C(P.warm, 0.05, 0.95); g.lineWidth = lw(S, 0.016);
    g.beginPath(); g.moveTo(0.48, -0.33); g.quadraticCurveTo(0.56, -0.36, 0.64, -0.3); g.stroke();
    g.beginPath(); g.ellipse(0.55, -0.3, 0.035, 0.018, -0.25, 0, TAU); g.fillStyle = C(P.vivid, 0.15); g.fill();
    g.beginPath(); g.arc(0.81, -0.24, 0.025, 0, TAU); g.fillStyle = C(P.ink, 0); g.fill();
  });
  const tailR = part(P, 'tail', () => shapeR('tail', [[0, 0], [-0.2, -0.14], [-0.42, -0.32], [-0.5, -0.56], [-0.42, -0.62], [-0.3, -0.42], [-0.1, -0.2], [0.02, 0.06]], 0, 0));
  const tail = sprite(P, 'tail', F.ppu, tailR.x0, tailR.y0, tailR.x1, tailR.y1, (g, S) => {
    g.save(); g.clip(tailR.path);
    volume(g, tailR.path, fur, -0.25, -0.3, 0.5, 0.18, -0.2);
    g.fillStyle = C(P.light, 0.04); g.beginPath(); g.ellipse(-0.46, -0.56, 0.12, 0.1, 0.5, 0, TAU); g.fill(); // white tip
    paintPattern(g, tailR, P, S, { alpha: 0.3, k: 0.6 });
    g.restore();
    edge(g, tailR.path, P, S, 0.01, 0.5);
  });
  const tails = P.rarity === 'legendary' ? 9 : P.rarity === 'rare' ? 3 : 1;
  const col = C(fur, -0.08), w = lw(F, 0.036), sock = C(P.ink, 0.1);
  gait(ctx, P, F, [[-0.32, 0.12, 0], [0.24, 0.12, 1.2]], 0.42, w, C(fur, -0.22), true, 2.4, 0.42, C(P.ink, 0.04));
  for (let i = tails - 1; i >= 0; i--) { // 九尾 fan out behind
    const spread = tails === 1 ? 0 : (i / (tails - 1) - 0.5) * 1.1;
    placed(ctx, tail, -0.44, 0.02, spread + Math.sin(F.t * 1.3 + i * 0.7) * 0.12);
  }
  blit(ctx, body);
  gait(ctx, P, F, [[-0.28, 0.14, Math.PI], [0.28, 0.12, Math.PI + 1.2]], 0.42, w, col, false, 2.4, 0.42, sock);
  sheenOn(ctx, P, F, R, 0.4);
  if (tails > 1 || P.glow > 0.2) { ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.vivid, -0.7, -0.3, 0.3, 0.2 + P.glow * 0.4, 0.6); ctx.globalCompositeOperation = 'source-over'; }
  return { n: sparkCount(P, F, 2, 0.8), emit: (u, v) => [-0.5 - u * 0.4, -0.6 + v * 0.4], rise: true }; // 狐火
}

function drawCat(ctx, P, F) {
  const fur = furTone(P);
  const R = part(P, 'cat', () => shapeR('cat', [[0.14, -0.66], [0.32, -0.56], [0.36, -0.36], [0.24, -0.18], [0.3, 0.2], [0.26, 0.62], [-0.1, 0.66], [-0.38, 0.6], [-0.44, 0.3], [-0.3, -0.02], [-0.06, -0.26], [-0.08, -0.48]], 0, 0.1));
  const body = sprite(P, 'cat', F.ppu, -0.5, -0.86, 0.5, 0.7, (g, S) => {
    for (const x of [-0.04, 0.24]) { // ears
      g.beginPath(); g.moveTo(x - 0.08, -0.56); g.lineTo(x - 0.02, -0.82); g.lineTo(x + 0.1, -0.58); g.closePath(); g.fillStyle = C(fur, -0.06); g.fill();
      g.beginPath(); g.moveTo(x - 0.04, -0.58); g.lineTo(x - 0.01, -0.74); g.lineTo(x + 0.06, -0.59); g.closePath(); g.fillStyle = C(P.warm, 0.2, 0.7); g.fill();
    }
    g.save(); g.clip(R.path);
    volume(g, R.path, fur, -0.05, -0.1, 0.8, 0.16, -0.2);
    g.fillStyle = C(P.light, 0, 0.85); g.beginPath(); g.ellipse(0.16, 0.08, 0.14, 0.32, -0.1, 0, TAU); g.fill(); // chest
    paintPattern(g, R, P, S, { alpha: 0.4, k: 0.6 });
    g.restore();
    edge(g, R.path, P, S, 0.012, 0.6);
    g.strokeStyle = C(fur, -0.22); g.lineWidth = lw(S, 0.012, 0.6); // forelegs
    g.beginPath(); g.moveTo(0.1, 0.25); g.lineTo(0.1, 0.62); g.moveTo(0.22, 0.25); g.lineTo(0.22, 0.62); g.stroke();
    g.fillStyle = C(P.warm, 0.18); g.beginPath(); g.moveTo(0.33, -0.4); g.lineTo(0.37, -0.4); g.lineTo(0.35, -0.37); g.closePath(); g.fill(); // nose
    if (S.lod) { g.strokeStyle = C(P.light, 0, 0.7); g.lineWidth = lw(S, 0.005, 0.4); g.beginPath(); for (const d of [-0.03, 0, 0.03]) { g.moveTo(0.3, -0.36); g.lineTo(0.52, -0.38 + d * 2); } g.stroke(); }
  });
  // tail: a thick curl that swishes
  const sw = Math.sin(F.t * 1.4);
  ctx.strokeStyle = C(fur, -0.1); ctx.lineWidth = 0.075;
  ctx.beginPath(); ctx.moveTo(-0.32, 0.55); ctx.bezierCurveTo(-0.7, 0.6, -0.75, 0.1 + sw * 0.1, -0.55 + sw * 0.15, -0.15 + sw * 0.05); ctx.stroke();
  ctx.strokeStyle = C(P.light, -0.05); ctx.lineWidth = 0.075;
  ctx.beginPath(); ctx.moveTo(-0.6 + sw * 0.15, -0.05 + sw * 0.05); ctx.lineTo(-0.55 + sw * 0.15, -0.15 + sw * 0.05); ctx.stroke();
  blit(ctx, body);
  const blink = blinkAt(F, 3.7);
  const ex = [0.06, 0.26];
  for (const x of ex) {
    ctx.beginPath(); ctx.ellipse(x, -0.46, 0.055, 0.06 * (1 - blink * 0.95), 0, 0, TAU); ctx.fillStyle = C(P.vivid, 0.12); ctx.fill();
    if (blink < 0.5) { ctx.beginPath(); ctx.ellipse(x + 0.01, -0.46, 0.015, 0.045, 0, 0, TAU); ctx.fillStyle = C(P.ink, -0.04); ctx.fill(); }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const x of ex) glow(ctx, P.vivid, x, -0.46, 0.12, (0.2 + P.glow * 0.5) * (1 - blink), 0.7);
  ctx.globalCompositeOperation = 'source-over';
  sheenOn(ctx, P, F, R, 0.4);
  return { n: sparkCount(P, F, 1, 0.6), emit: (u, v) => [(u - 0.5) * 0.7, (v - 0.4) * 1.1], rise: true };
}

function antlerPaths(P) {
  return part(P, 'antlers', () => {
    const rnd = rng(P.seed ^ 31), p = new Path2D(), tips = [];
    const grow = (x, y, a, len, depth) => {
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      p.moveTo(x, y); p.lineTo(ex, ey);
      if (depth === 0) { tips.push([ex, ey]); return; }
      grow(ex, ey, a - 0.35 - rnd() * 0.2, len * 0.72, depth - 1);
      grow(ex, ey, a + 0.4 + rnd() * 0.2, len * 0.62, depth - 1);
    };
    grow(0.42, -0.58, -1.9, 0.16, 3);
    grow(0.48, -0.58, -1.3, 0.15, 3);
    return { p, tips };
  });
}

function drawDeer(ctx, P, F) {
  const fur = furTone(P);
  const R = part(P, 'deer', () => shapeR('deer', [[0.56, -0.62], [0.42, -0.56], [0.32, -0.28], [0.0, -0.18], [-0.34, -0.2], [-0.5, -0.12], [-0.48, 0.1], [-0.2, 0.16], [0.18, 0.14], [0.36, -0.02], [0.5, -0.38], [0.66, -0.44], [0.7, -0.5]], -0.05, -0.05));
  const A = antlerPaths(P);
  const body = sprite(P, 'deer', F.ppu, -0.56, -1, 0.76, 0.22, (g, S) => {
    g.strokeStyle = C(P.gold, 0.08); g.lineWidth = lw(S, 0.026); g.stroke(A.p); // antlers
    g.beginPath(); g.ellipse(0.38, -0.56, 0.08, 0.03, -0.5, 0, TAU); g.fillStyle = C(fur, -0.05); g.fill(); // ear
    g.save(); g.clip(R.path);
    volume(g, R.path, fur, -0.05, -0.15, 0.7, 0.16, -0.2);
    const belly = g.createLinearGradient(0, 0, 0, 0.16); belly.addColorStop(0, C(P.light, 0, 0)); belly.addColorStop(1, C(P.light, 0, 0.8));
    g.fillStyle = belly; g.fillRect(-0.6, 0, 1.4, 0.2);
    const rnd = rng(P.seed ^ 9);
    for (let i = 0; i < (S.lod ? 16 : 7); i++) { // 鹿の子 spots
      g.beginPath(); g.arc(lerp(-0.42, 0.18, rnd()), lerp(-0.16, -0.02, rnd()), 0.022, 0, TAU); g.fillStyle = C(P.light, 0.04, 0.9); g.fill();
    }
    paintPattern(g, R, P, S, { alpha: 0.3, k: 0.6 });
    g.restore();
    edge(g, R.path, P, S, 0.011, 0.55);
    eyeBall(g, 0.55, -0.52, 0.025, P, S, P.ink, 1);
    g.beginPath(); g.arc(0.7, -0.48, 0.02, 0, TAU); g.fillStyle = C(P.ink, 0); g.fill();
  });
  const w = lw(F, 0.026), leg = C(fur, -0.12, 1, 0, -0.25);
  gait(ctx, P, F, [[-0.36, 0.06, 0], [0.22, 0.06, 1.3]], 0.62, w, C(fur, -0.24, 1, 0, -0.25), true, 1.8, 0.32, C(P.ink, 0.06));
  blit(ctx, body);
  gait(ctx, P, F, [[-0.32, 0.08, Math.PI], [0.26, 0.06, Math.PI + 1.3]], 0.62, w, leg, false, 1.8, 0.32, C(fur, -0.2, 1, 0, -0.3));
  ctx.globalCompositeOperation = 'lighter';
  A.tips.forEach(([x, y], i) => glow(ctx, P.vivid, x, y, 0.07, (0.25 + P.glow * 0.7) * (0.6 + 0.4 * Math.sin(F.rt * 2 + i)), 0.9));
  ctx.globalCompositeOperation = 'source-over';
  sheenOn(ctx, P, F, R, 0.4);
  return { n: sparkCount(P, F, 2, 0.8), emit: (u) => A.tips[Math.floor(u * A.tips.length)], rise: true, size: 0.8 };
}

function drawRabbit(ctx, P, F) {
  const fur = tone(P.tones[0].h, Math.min(0.5, P.tones[0].s), clamp(P.tones[0].l + 0.15, 0.6, 0.82));
  const R = part(P, 'rab', () => shapeR('rab', [[0.36, -0.36], [0.46, -0.2], [0.4, 0.0], [0.24, 0.12], [0.3, 0.46], [0.1, 0.6], [-0.3, 0.6], [-0.48, 0.38], [-0.4, 0.06], [-0.1, -0.08], [0.12, -0.36]], 0, 0.2));
  const body = sprite(P, 'rab', F.ppu, -0.6, -0.5, 0.56, 0.66, (g, S) => {
    g.beginPath(); g.arc(-0.48, 0.36, 0.09, 0, TAU); g.fillStyle = C(P.light, 0.05); g.fill(); // tail puff
    g.save(); g.clip(R.path);
    volume(g, R.path, fur, -0.05, 0.1, 0.65, 0.12, -0.2);
    paintPattern(g, R, P, S, { alpha: 0.35, k: 0.6 });
    g.restore();
    edge(g, R.path, P, S, 0.011, 0.5);
    eyeBall(g, 0.3, -0.2, 0.04, P, S, P.warm, 1);
    g.beginPath(); g.arc(0.45, -0.12, 0.018, 0, TAU); g.fillStyle = C(P.warm, 0.2); g.fill();
    g.beginPath(); g.ellipse(0.18, 0.58, 0.12, 0.04, 0, 0, TAU); g.fillStyle = C(fur, -0.08); g.fill(); // foot
  });
  const ear = sprite(P, 'ear', F.ppu, -0.08, -0.62, 0.08, 0.02, (g, S) => {
    const e = ellPath(0, -0.3, 0.07, 0.31);
    volume(g, e, fur, 0, -0.3, 0.3, 0.12, -0.15);
    g.beginPath(); g.ellipse(0, -0.3, 0.035, 0.24, 0, 0, TAU); g.fillStyle = C(P.warm, 0.22, 0.7); g.fill();
    edge(g, e, P, S, 0.01, 0.5);
  });
  const hopping = P.move === 'walk' || P.move === 'hover';
  const ph = (F.t * 0.55) % 1, hop = hopping && ph < 0.35 ? Math.sin((ph / 0.35) * Math.PI) : 0;
  const squash = hopping && ph > 0.35 && ph < 0.45 ? Math.sin(((ph - 0.35) / 0.1) * Math.PI) * 0.08 : 0;
  ctx.save(); ctx.translate(0, -hop * 0.22 + squash * 0.3); ctx.scale(1 + squash, 1 - squash);
  placed(ctx, ear, 0.18, -0.3, -0.25 + Math.sin(F.t * 1.1) * 0.08 - hop * 0.3);
  blit(ctx, body);
  placed(ctx, ear, 0.28, -0.3, 0.05 + Math.sin(F.t * 1.3 + 1) * 0.08 - hop * 0.3);
  ctx.restore();
  sheenOn(ctx, P, F, R, 0.4);
  return { n: sparkCount(P, F, 1, 0.6), emit: (u, v) => [(u - 0.5) * 0.7, 0.55 + v * 0.05], rise: true };
}

function drawWhale(ctx, P, F) {
  const skin = tone(P.tones[0].h, Math.min(P.tones[0].s, 0.55), clamp(P.tones[0].l, 0.5, 0.68));
  const R = part(P, 'whale', () => shapeR('whale', [[0.92, -0.02], [0.82, -0.26], [0.5, -0.38], [0.1, -0.36], [-0.3, -0.24], [-0.62, -0.1], [-0.76, -0.03], [-0.76, 0.04], [-0.6, 0.1], [-0.3, 0.22], [0.1, 0.32], [0.5, 0.32], [0.8, 0.2]], 0.1, 0));
  const body = sprite(P, 'whale', F.ppu, -0.82, -0.62, 1, 0.52, (g, S) => {
    g.save(); g.clip(R.path);
    volume(g, R.path, skin, 0.25, -0.1, 0.95, 0.2, -0.16);
    const belly = g.createLinearGradient(0, 0.05, 0, 0.33); belly.addColorStop(0, C(P.light, 0, 0)); belly.addColorStop(1, C(P.light, 0, 0.75));
    g.fillStyle = belly; g.fillRect(-0.8, 0, 1.8, 0.4);
    paintPattern(g, R, P, S, { alpha: 0.3, k: 0.8 });
    g.strokeStyle = C(P.light, 0, 0.35); g.lineWidth = lw(S, 0.008, 0.5); // throat grooves
    for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0.82 - k * 0.02, 0.12 + k * 0.03); g.quadraticCurveTo(0.4, 0.2 + k * 0.025, 0.05, 0.2 + k * 0.02); g.stroke(); }
    g.restore();
    g.beginPath(); g.ellipse(0.62, 0.04, 0.035, 0.026, 0, 0, TAU); g.fillStyle = C(P.ink, 0.04); g.fill(); // small, gentle eye
    g.beginPath(); g.arc(0.61, 0.03, 0.01, 0, TAU); g.fillStyle = 'hsla(0,0%,100%,.9)'; g.fill();
    g.beginPath(); g.moveTo(0.92, 0.02); g.quadraticCurveTo(0.7, 0.12, 0.4, 0.1); g.strokeStyle = C(P.ink, 0.1, 0.5); g.lineWidth = lw(S, 0.01, 0.6); g.stroke();
  });
  // clouds ride on and under the whale; kept off the warped body so soft edges never double up
  const clouds = (name, under) => sprite(P, name, F.ppu, -0.75, under ? 0.1 : -0.56, 0.9, under ? 0.5 : -0.12, (g) => {
    const rnd = rng(P.seed ^ (under ? 3 : 5));
    for (let i = 0; i < (under ? 9 : 11); i++) {
      const x = under ? lerp(-0.55, 0.75, i / 8) : lerp(-0.5, 0.7, i / 10);
      const y = under ? 0.3 + rnd() * 0.06 : -0.3 - Math.sin((i / 10) * Math.PI) * 0.06 + rnd() * 0.04;
      const r = under ? 0.1 + rnd() * 0.08 : 0.08 + rnd() * 0.09, a = under ? 0.5 : 0.75;
      const gr = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
      gr.addColorStop(0, C(P.light, 0.05, a)); gr.addColorStop(0.7, C(P.light, -0.04, a * 0.7)); gr.addColorStop(1, C(P.light, 0, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  });
  const fluke = sprite(P, 'fluke', F.ppu, -0.3, -0.28, 0.04, 0.28, (g, S) => {
    const p = new Path2D(); p.moveTo(0.03, 0); p.quadraticCurveTo(-0.08, -0.06, -0.24, -0.26); p.quadraticCurveTo(-0.2, -0.08, -0.28, 0.0); p.quadraticCurveTo(-0.2, 0.08, -0.24, 0.26); p.quadraticCurveTo(-0.08, 0.06, 0.03, 0); p.closePath();
    volume(g, p, skin, -0.12, 0, 0.3, 0.18, -0.12); edge(g, p, P, S, 0.008, 0.4);
  });
  const fin = sprite(P, 'pfin', F.ppu, -0.3, -0.04, 0.04, 0.3, (g, S) => {
    const p = new Path2D(); p.moveTo(0, 0); p.quadraticCurveTo(-0.1, 0.22, -0.28, 0.28); p.quadraticCurveTo(-0.12, 0.1, -0.02, 0.0); p.closePath();
    volume(g, p, skin, -0.1, 0.1, 0.25, 0.12, -0.18);
  });
  const w = F.t * 0.9;
  const dy = (x) => 0.07 * Math.pow(clamp((0.3 - x) / 1.1, 0, 1), 2) * Math.sin(w - x * 1.6);
  // mist halo — it should feel huge and soft
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, P.light, 0.05, 0, 1.05, 0.12 + P.glow * 0.15, 0.4);
  ctx.globalCompositeOperation = 'source-over';
  const tailA = Math.sin(w - 0.2) * 0.35;
  placed(ctx, clouds('cloudsU', true), 0, Math.sin(w * 0.7) * 0.015);
  placed(ctx, fluke, -0.74, dy(-0.74), tailA, 1, 1);
  warpBlit(ctx, body, F.lod > 1 ? 24 : F.lod ? 12 : 6, dy, F.ppu);
  placed(ctx, clouds('cloudsB', false), 0, dy(0.1));
  placed(ctx, fin, 0.38, 0.18 + dy(0.38), Math.sin(w * 1.1) * 0.25);
  sheenOn(ctx, P, F, R, 0.35, 0.35);
  if (F.lod) { // tiny birds for scale
    ctx.strokeStyle = C(P.ink, 0.3, 0.75); ctx.lineWidth = lw(F, 0.008);
    for (let i = 0; i < 3; i++) {
      const x = 0.55 + i * 0.09 + Math.sin(F.rt * 0.5 + i) * 0.03, y = -0.62 + i * 0.05 + Math.sin(F.rt * 0.7 + i * 2) * 0.02, f = Math.sin(F.rt * 9 + i) * 0.012;
      ctx.beginPath(); ctx.moveTo(x - 0.022, y - f); ctx.quadraticCurveTo(x - 0.008, y - 0.012, x, y); ctx.quadraticCurveTo(x + 0.008, y - 0.012, x + 0.022, y - f); ctx.stroke();
    }
  }
  return { n: sparkCount(P, F, 3, 0.8), emit: (u, v) => [lerp(-0.6, 0.8, u), -0.35 + v * 0.1], rise: true, spread: 0.12, life: 3.5 };
}

function drawTanuki(ctx, P, F) {
  const fur = furTone(P);
  const R = part(P, 'tan', () => shapeR('tan', [[0, -0.18], [0.3, -0.12], [0.44, 0.2], [0.38, 0.52], [0.16, 0.66], [-0.16, 0.66], [-0.38, 0.52], [-0.44, 0.2], [-0.3, -0.12]], 0, 0.25));
  const head = part(P, 'tanh', () => ellR('tanh', 0, -0.36, 0.3, 0.24));
  const body = sprite(P, 'tan', F.ppu, -0.62, -0.78, 0.62, 0.72, (g, S) => {
    g.save(); g.clip(R.path);
    volume(g, R.path, fur, 0, 0.2, 0.6, 0.14, -0.2);
    paintPattern(g, R, P, S, { alpha: 0.35, k: 0.6 });
    g.restore();
    edge(g, R.path, P, S, 0.012, 0.55);
    const belly = ellPath(0, 0.32, 0.26, 0.27);
    volume(g, belly, tone(P.light.h, 0.3, 0.84), -0.05, 0.25, 0.3, 0.06, -0.12);
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 0.2, 0.66, 0.11, 0.06, 0, 0, TAU); g.fillStyle = C(P.ink, 0.1); g.fill(); } // feet
    for (const sd of [-1, 1]) { g.beginPath(); g.arc(sd * 0.22, -0.56, 0.08, 0, TAU); g.fillStyle = C(fur, -0.12); g.fill(); g.beginPath(); g.arc(sd * 0.22, -0.56, 0.04, 0, TAU); g.fillStyle = C(P.ink, 0.1); g.fill(); }
    g.save(); g.clip(head.path);
    volume(g, head.path, fur, 0, -0.4, 0.32, 0.18, -0.15);
    g.fillStyle = C(P.light, 0, 0.9); g.beginPath(); g.ellipse(0, -0.26, 0.17, 0.12, 0, 0, TAU); g.fill();
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 0.12, -0.38, 0.11, 0.075, sd * -0.35, 0, TAU); g.fillStyle = C(P.ink, 0.08); g.fill(); } // mask
    g.restore();
    edge(g, head.path, P, S, 0.012, 0.55);
    g.beginPath(); g.ellipse(0, -0.28, 0.04, 0.028, 0, 0, TAU); g.fillStyle = C(P.ink, 0.02); g.fill();
  });
  const tail = sprite(P, 'tant', F.ppu, -0.24, -0.28, 0.06, 0.06, (g, S) => {
    const p = ellPath(-0.1, -0.12, 0.11, 0.16, -0.5);
    g.save(); g.clip(p); volume(g, p, fur, -0.1, -0.12, 0.2, 0.12, -0.2);
    g.strokeStyle = C(P.ink, 0.1, 0.8); g.lineWidth = 0.035;
    for (const y of [-0.2, -0.1, 0.0]) { g.beginPath(); g.moveTo(-0.25, y - 0.1); g.lineTo(0.05, y + 0.06); g.stroke(); }
    g.restore();
  });
  placed(ctx, tail, -0.38, 0.5, Math.sin(F.t * 1.2) * 0.25, 1.6);
  const breath = 1 + Math.sin(F.t * 1.3) * 0.015;
  ctx.save(); ctx.translate(0, 0.66); ctx.scale(1, breath); ctx.translate(0, -0.66); blit(ctx, body); ctx.restore();
  // belly drum: paws tap now and then (腹鼓)
  const drum = Math.max(0, Math.sin(F.t * 5)) * (Math.sin(F.t * 0.6) > 0.3 ? 1 : 0);
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * (0.3 - drum * 0.06), 0.24, 0.075, 0.1, sd * 0.5, 0, TAU); ctx.fillStyle = C(fur, -0.18); ctx.fill(); }
  const blink = blinkAt(F, 4.4);
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(sd * 0.11, -0.38, 0.038, 0.04 * (1 - blink * 0.9), 0, 0, TAU); ctx.fillStyle = C(P.gold, 0.18); ctx.fill();
    if (blink < 0.5) { ctx.beginPath(); ctx.arc(sd * 0.11, -0.38, 0.018, 0, TAU); ctx.fillStyle = C(P.ink, -0.04); ctx.fill(); }
  }
  // the leaf of transformation
  ctx.save(); ctx.translate(0.02, -0.62); ctx.rotate(-0.3 + Math.sin(F.t * 1.7) * 0.15);
  ctx.beginPath(); ctx.moveTo(0, 0.04); ctx.quadraticCurveTo(-0.12, -0.08, 0, -0.22); ctx.quadraticCurveTo(0.12, -0.08, 0, 0.04); ctx.fillStyle = C(tone(120, 0.55, 0.45), 0.05); ctx.fill();
  ctx.strokeStyle = C(tone(120, 0.5, 0.3), 0); ctx.lineWidth = lw(F, 0.008); ctx.beginPath(); ctx.moveTo(0, 0.06); ctx.lineTo(0, -0.2); ctx.stroke();
  ctx.restore();
  sheenOn(ctx, P, F, R, 0.35);
  return { n: sparkCount(P, F, 1, 0.6), emit: (u, v) => [0.02 + (u - 0.5) * 0.2, -0.78 + v * 0.1], rise: true };
}

const BEASTS = { fox: drawFox, cat: drawCat, deer: drawDeer, rabbit: drawRabbit, whale: drawWhale, tanuki: drawTanuki };

// ───────────────────────── dragons ─────────────────────────

// Eastern dragon head facing +x: long snout, branching horns, flowing mane. Origin at the neck.
function dragonHead(P, F) {
  return sprite(P, 'dhead', F.ppu, -0.42, -0.36, 0.42, 0.26, (g, S) => {
    for (let k = 0; k < 6; k++) { // mane locks streaming back
      const y0 = -0.1 + k * 0.045, t = P.tones[1 + (k % 3)];
      g.beginPath(); g.moveTo(0.02, y0 - 0.03);
      g.bezierCurveTo(-0.12, y0 - 0.1, -0.24, y0 + 0.02 + k * 0.01, -0.4, y0 - 0.08 + k * 0.04);
      g.bezierCurveTo(-0.24, y0 + 0.06, -0.1, y0 + 0.02, 0.02, y0 + 0.03);
      g.closePath(); g.fillStyle = C(t, 0.08, 0.92); g.fill();
    }
    const skull = new Path2D();
    skull.moveTo(-0.06, -0.08);
    skull.quadraticCurveTo(0.04, -0.17, 0.14, -0.12); // brow
    skull.quadraticCurveTo(0.22, -0.08, 0.36, -0.07); // snout ridge
    skull.quadraticCurveTo(0.41, -0.05, 0.39, -0.01); // nose
    skull.lineTo(0.2, 0.0); // mouth line
    skull.quadraticCurveTo(0.3, 0.04, 0.34, 0.08); // lower jaw
    skull.quadraticCurveTo(0.2, 0.12, 0.04, 0.1);
    skull.quadraticCurveTo(-0.08, 0.07, -0.06, -0.08);
    skull.closePath();
    volume(g, skull, P.tones[0], 0.12, -0.05, 0.28, 0.24, -0.18);
    if (S.lod) { // scales on the cheek + snout ridges
      g.save(); g.clip(skull);
      g.strokeStyle = C(P.light, 0, 0.3); g.lineWidth = lw(S, 0.006, 0.5);
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-0.02 + k * 0.05, 0.03, 0.03, 0.2, Math.PI - 0.2); g.stroke(); }
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0.2 + k * 0.05, -0.1); g.lineTo(0.22 + k * 0.05, -0.065); g.stroke(); }
      g.restore();
    }
    edge(g, skull, P, S, 0.008, 0.75);
    g.beginPath(); g.moveTo(0.2, 0.0); g.lineTo(0.37, -0.005); g.strokeStyle = C(P.ink, 0.05, 0.9); g.lineWidth = lw(S, 0.008); g.stroke();
    g.fillStyle = C(P.light, 0.08); // fangs
    for (const x of [0.25, 0.32]) { g.beginPath(); g.moveTo(x, -0.002); g.lineTo(x + 0.012, 0.03); g.lineTo(x + 0.024, -0.002); g.fill(); }
    g.fillStyle = C(P.tones[1], 0.12, 0.95); // beard
    g.beginPath(); g.moveTo(0.06, 0.08); g.quadraticCurveTo(0.0, 0.2, -0.08, 0.24); g.quadraticCurveTo(0.04, 0.18, 0.16, 0.1); g.closePath(); g.fill();
    g.strokeStyle = C(P.gold, 0.1); g.lineWidth = lw(S, 0.02); // branching horns
    g.beginPath();
    g.moveTo(0.05, -0.13); g.quadraticCurveTo(-0.04, -0.26, -0.18, -0.33);
    g.moveTo(-0.04, -0.24); g.lineTo(0.0, -0.33);
    g.moveTo(-0.11, -0.29); g.lineTo(-0.12, -0.35);
    g.stroke();
    g.beginPath(); g.ellipse(0.13, -0.08, 0.035, 0.02, -0.2, 0, TAU); g.fillStyle = C(P.light, 0.05); g.fill();
    g.beginPath(); g.arc(0.135, -0.08, 0.015, 0, TAU); g.fillStyle = C(P.ink, -0.04); g.fill();
    g.beginPath(); g.arc(0.13, -0.085, 0.005, 0, TAU); g.fillStyle = 'hsla(0,0%,100%,.95)'; g.fill();
    g.beginPath(); g.arc(0.37, -0.05, 0.008, 0, TAU); g.fillStyle = C(P.ink, 0.05); g.fill();
  });
}

function whiskers(ctx, P, F, len) {
  ctx.strokeStyle = C(P.gold, 0.15, 0.9); ctx.lineWidth = lw(F, 0.008);
  ctx.beginPath();
  for (const sd of [-1, 1]) {
    ctx.moveTo(0.36, -0.03);
    ctx.bezierCurveTo(0.48, -0.06 + sd * 0.04, 0.4 + Math.sin(F.t * 1.5 + sd) * 0.06, sd * 0.18, 0.34 + len, -0.05 + sd * 0.12 + Math.sin(F.t * 1.2 + sd) * 0.08);
  }
  ctx.stroke();
}

function drawSerpent(ctx, P, F) {
  const n = F.lod ? 34 : 18, pts = [];
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), x = lerp(0.36, -0.95, s);
    pts.push([x, Math.sin(x * 3.6 - F.t * 1.6) * lerp(0.1, 0.3, s) + 0.08]);
  }
  const seg = segmentSprite(P, F, 'dseg', P.tones[0], P.gold, P.tones[1], true);
  const width = (s) => 0.11 * (1 - Math.pow(s, 2) * 0.75);
  // claws at two points of the body
  for (const k of [0.22, 0.6]) {
    const i = Math.floor(k * (n - 1)), [x, y] = pts[i];
    ctx.strokeStyle = C(P.tones[0], -0.1); ctx.lineWidth = lw(F, 0.03);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.06, y + 0.14); ctx.lineTo(x + 0.12, y + 0.15); ctx.stroke();
    ctx.strokeStyle = C(P.gold, 0.1); ctx.lineWidth = lw(F, 0.012);
    ctx.beginPath(); for (const d of [-0.03, 0, 0.03]) { ctx.moveTo(x + 0.12, y + 0.15); ctx.lineTo(x + 0.16, y + 0.15 + d); } ctx.stroke();
  }
  tube(ctx, seg, pts, width);
  // tail flame
  const [tx, ty] = pts[n - 1];
  ctx.fillStyle = C(P.tones[1], 0.1, 0.9); ctx.beginPath(); ctx.moveTo(tx + 0.03, ty); ctx.quadraticCurveTo(tx - 0.1, ty - 0.12 + Math.sin(F.t * 2) * 0.03, tx - 0.06, ty - 0.2); ctx.quadraticCurveTo(tx - 0.02, ty - 0.06, tx + 0.04, ty + 0.03); ctx.fill();
  const [hx, hy] = pts[0], [nx, ny] = pts[2];
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(Math.atan2(hy - ny, hx - nx) * 0.5); ctx.scale(1.3, 1.3);
  blit(ctx, dragonHead(P, zoomF(F, 1.3)));
  whiskers(ctx, P, F, 0.22);
  ctx.restore();
  if (P.rarity === 'legendary' || P.rarity === 'rare') { // 宝珠 ahead of the dragon
    const px = 0.88, py = -0.4 + Math.sin(F.t * 0.8) * 0.05;
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.light, px, py, 0.2, 0.7, 0.9); ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.arc(px, py, 0.05, 0, TAU); ctx.fillStyle = C(P.light, 0.05); ctx.fill();
  }
  return { n: sparkCount(P, F, 2, 1), emit: (u) => pts[Math.floor(u * (n - 1))], spread: 0.05 };
}

function drawWyrm(ctx, P, F) {
  const n = F.lod ? 40 : 20, pts = [], a0 = F.t * 0.22;
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), a = a0 - s * 1.75 * Math.PI;
    const r = 0.6 - s * 0.16 + Math.sin(s * 14 - F.t * 1.5) * 0.02;
    pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.82]);
  }
  // the pearl at the heart of the coil
  const pearl = part(P, 'pearl', () => ellR('pearl', 0, 0, 0.22, 0.22));
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.light, 0, 0, 0.55, 0.35 + P.glow * 0.4, 0.8); ctx.globalCompositeOperation = 'source-over';
  const ps = sprite(P, 'pearl', F.ppu, -0.24, -0.24, 0.24, 0.24, (g, S) => {
    volume(g, pearl.path, tone(P.light.h, 0.4, 0.78), 0, 0, 0.22, 0.18, -0.25);
    bodyPattern(g, pearl, P, S, 0.3);
  });
  blit(ctx, ps);
  iridesce(ctx, P, pearl.path, -0.22, -0.22, 0.22, 0.22, F.t * 40, Math.max(0.5, P.iri), sweep(F, 0.2), 0.8);
  // membranous wings at the shoulders
  const [sx, sy] = pts[5], flap = Math.sin(F.t * 1.4);
  const wing = sprite(P, 'wwing', F.ppu, -0.02, -0.46, 0.5, 0.02, (g, S) => {
    const tips = [[0.46, -0.42], [0.36, -0.2], [0.22, -0.06]];
    const m = new Path2D(); m.moveTo(0, 0); m.quadraticCurveTo(0.14, -0.36, tips[0][0], tips[0][1]);
    m.quadraticCurveTo(0.34, -0.3, tips[1][0], tips[1][1]); m.quadraticCurveTo(0.24, -0.16, tips[2][0], tips[2][1]); m.quadraticCurveTo(0.1, -0.06, 0, 0); m.closePath();
    const gr = g.createLinearGradient(0, 0, 0.46, -0.42);
    gr.addColorStop(0, C(P.tones[2], -0.05, 0.85)); gr.addColorStop(1, C(P.tones[1], 0.15, 0.6));
    g.fillStyle = gr; g.fill(m);
    g.strokeStyle = C(P.gold, 0.05); g.lineWidth = lw(S, 0.014);
    g.beginPath(); for (const [x, y] of tips) { g.moveTo(0, 0); g.quadraticCurveTo(x * 0.4, y * 0.75, x, y); } g.stroke();
  });
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(sy, sx) + Math.PI / 2 + sd * 0.55); ctx.scale(sd, 0.65 + 0.35 * flap);
    blit(ctx, wing);
    ctx.restore();
  }
  const seg = segmentSprite(P, F, 'wseg', P.tones[0], P.gold, P.tones[1], true);
  tube(ctx, seg, pts, (s) => 0.12 * (1 - s * 0.8));
  const [hx, hy] = pts[0], [nx, ny] = pts[2];
  const ang = Math.atan2(hy - ny, hx - nx);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  if (Math.cos(ang) < 0) ctx.scale(1, -1); // keep the head upright as it circles
  ctx.scale(0.95, 0.95);
  blit(ctx, dragonHead(P, zoomF(F, 0.95)));
  whiskers(ctx, P, F, 0.16);
  ctx.restore();
  return { n: sparkCount(P, F, 2, 1), emit: (u) => pts[Math.floor(u * (n - 1))], spread: 0.05 };
}

const DRAGONS = { serpent: drawSerpent, wyrm: drawWyrm };

// ───────────────────────── plants ─────────────────────────

function petalPath(len, wid, tip = 0.5) {
  const p = new Path2D();
  p.moveTo(0, 0); p.bezierCurveTo(wid, -len * 0.25, wid * 0.9, -len * 0.8, 0, -len);
  p.bezierCurveTo(-wid * 0.9, -len * 0.8, -wid, -len * 0.25, 0, 0); p.closePath();
  return p;
}

function bloomSprite(P, F, name, r, petals, cup) {
  return sprite(P, name, F.ppu, -r * 1.1, -r * 1.1, r * 1.1, r * 1.1, (g, S) => {
    const rnd = rng(P.seed ^ 17);
    for (let layer = 0; layer < 2; layer++) {
      const n = petals, len = r * (layer ? 0.72 : 1), wid = len * (cup ? 0.32 : 0.42);
      const pp = petalPath(len, wid);
      const R = region('petal' + layer, spline([[0, 0], [wid, -len * 0.4], [0, -len], [-wid, -len * 0.4]]), 0, 0);
      for (let i = 0; i < n; i++) {
        g.save(); g.rotate(((i + layer * 0.5) / n) * TAU + rnd() * 0.08);
        const gr = g.createLinearGradient(0, 0, 0, -len);
        const t = P.tones[layer ? 1 : 0];
        gr.addColorStop(0, C(P.tones[2], 0.1)); gr.addColorStop(0.45, C(t, 0.05)); gr.addColorStop(1, C(t, 0.2));
        g.fillStyle = gr; g.fill(pp);
        g.save(); g.clip(pp); paintPattern(g, R, P, S, { alpha: 0.35, k: 0.5 }); g.restore();
        if (S.lod) { g.strokeStyle = C(P.light, 0, 0.3); g.lineWidth = lw(S, 0.006, 0.4); g.beginPath(); g.moveTo(0, -len * 0.1); g.lineTo(0, -len * 0.85); g.stroke(); }
        g.strokeStyle = C(t, -0.2, 0.6); g.lineWidth = lw(S, 0.006, 0.5); g.stroke(pp);
        g.restore();
      }
    }
    const c = ellPath(0, 0, r * 0.2, r * 0.2);
    volume(g, c, P.gold, 0, 0, r * 0.2, 0.2, -0.2);
    g.strokeStyle = C(P.gold, 0.15); g.lineWidth = lw(S, 0.008, 0.5);
    for (let i = 0; i < (S.lod ? 14 : 6); i++) { const a = (i / 14) * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32); g.stroke(); g.beginPath(); g.arc(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32, r * 0.03, 0, TAU); g.fillStyle = C(P.light, 0.05); g.fill(); }
  });
}

function bloomPetals(P, r, n) {
  return part(P, 'petals', () => {
    const union = new Path2D();
    for (let layer = 0; layer < 2; layer++) {
      const len = r * (layer ? 0.72 : 1), pp = petalPath(len, len * 0.42);
      for (let i = 0; i < n; i++) {
        const a = ((i + layer * 0.5) / n) * TAU, c = Math.cos(a), sn = Math.sin(a);
        union.addPath(pp, { a: c, b: sn, c: -sn, d: c, e: 0, f: 0 });
      }
    }
    return union;
  });
}

function leaf(ctx, P, F, x, y, a, len, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const p = petalPath(len, len * 0.32);
  ctx.fillStyle = C(t, -0.05); ctx.fill(p);
  ctx.strokeStyle = C(t, 0.15, 0.6); ctx.lineWidth = lw(F, 0.006); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -len * 0.9); ctx.stroke();
  ctx.restore();
}

function drawFlower(ctx, P, F) {
  const green = tone(mixHue(130, P.tones[3].h, 0.25), 0.5, 0.36);
  const sway = Math.sin(F.t * 0.7) * 0.08;
  const top = [sway, -0.32];
  ctx.strokeStyle = C(green, -0.02); ctx.lineWidth = lw(F, 0.035);
  ctx.beginPath(); ctx.moveTo(0, 0.98); ctx.quadraticCurveTo(-0.05, 0.4, top[0], top[1]); ctx.stroke();
  leaf(ctx, P, F, -0.02, 0.62, -1.0 + sway, 0.36, green);
  leaf(ctx, P, F, -0.02, 0.4, 0.9 + sway, 0.3, green);
  const bloom = bloomSprite(P, F, 'bloom', 0.52, 6 + (P.seed % 3), false);
  const breathe = 1 + Math.sin(F.t * 0.9) * 0.025;
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.tones[0], top[0], top[1], 0.7, 0.12 + P.glow * 0.35, 0.5); ctx.globalCompositeOperation = 'source-over';
  placed(ctx, bloom, top[0], top[1], sway * 0.8 + F.t * 0.03, breathe);
  const petals = bloomPetals(P, 0.52, 6 + (P.seed % 3));
  ctx.save(); ctx.translate(top[0], top[1]); ctx.rotate(sway * 0.8 + F.t * 0.03); ctx.scale(breathe, breathe);
  iridesce(ctx, P, petals, -0.52, -0.52, 0.52, 0.52, Math.sin(F.t * 0.5) * 70 * P.iri, P.iri * 0.4, sweep(F, 0.12), 0.4);
  ctx.restore();
  return { n: sparkCount(P, F, 3, 0.8), emit: (u, v) => [top[0] + (u - 0.5) * 0.2, top[1] + (v - 0.5) * 0.2], rise: true, spread: 0.12 }; // pollen
}

function treeShape(P) {
  return part(P, 'treeShape', () => {
    const rnd = rng(P.seed ^ 101), limbs = [], masses = [];
    const lean = (rnd() - 0.5) * 0.12;
    const branch = (x, y, a, len, w, d) => {
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      limbs.push([x, y, lerp(x, ex, 0.5) + (rnd() - 0.5) * len * 0.25, lerp(y, ey, 0.5), ex, ey, w]);
      if (d >= 2) { masses.push([ex, ey, 0.2 + rnd() * 0.1]); return; }
      branch(ex, ey, a - 0.4 - rnd() * 0.25, len * 0.72, w * 0.6, d + 1);
      branch(ex, ey, a + 0.35 + rnd() * 0.25, len * 0.7, w * 0.6, d + 1);
    };
    const top = [lean, 0.12];
    for (let k = 0; k < 3; k++) branch(top[0], top[1] + k * 0.05, -Math.PI / 2 + (k - 1) * 0.75 + (rnd() - 0.5) * 0.2, 0.3 + rnd() * 0.08, 0.07, 0);
    masses.push([lean, -0.55, 0.3]);
    masses.sort((a, b) => b[1] - a[1]); // lower masses first so the crown overlaps them
    const blooms = [];
    masses.forEach(([x, y, r], m) => { for (let k = 0; k < 26; k++) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * r; blooms.push([x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85 - r * 0.1, 0.022 + rnd() * 0.03, m % 3, k]); } });
    return { limbs, masses, blooms, top, lean };
  });
}

function drawTree(ctx, P, F) {
  const T = treeShape(P);
  const s = sprite(P, 'tree', F.ppu, -1, -1, 1, 1, (g, S) => {
    const bark = tone(P.tones[3].h, 0.3, 0.3);
    g.fillStyle = C(tone(P.tones[3].h, 0.35, 0.28), 0, 0.55); g.beginPath(); g.ellipse(0, 0.92, 0.5, 0.06, 0, 0, TAU); g.fill();
    const trunk = new Path2D(); // flared roots, tapering trunk
    trunk.moveTo(-0.2, 0.93); trunk.quadraticCurveTo(-0.06, 0.82, -0.07, 0.55); trunk.quadraticCurveTo(-0.06 + T.lean, 0.3, T.top[0] - 0.035, T.top[1]);
    trunk.lineTo(T.top[0] + 0.035, T.top[1]); trunk.quadraticCurveTo(0.06 + T.lean, 0.3, 0.07, 0.55); trunk.quadraticCurveTo(0.06, 0.82, 0.2, 0.93); trunk.closePath();
    const tg = g.createLinearGradient(-0.1, 0, 0.1, 0);
    tg.addColorStop(0, C(bark, -0.1)); tg.addColorStop(0.4, C(bark, 0.12)); tg.addColorStop(1, C(bark, -0.12));
    g.fillStyle = tg; g.fill(trunk);
    for (const [x, y, cx, cy, ex, ey, w] of T.limbs) {
      g.strokeStyle = C(bark, 0.02); g.lineWidth = Math.max(w, 1 / S.ppu);
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
    }
    const crown = new Path2D();
    for (const [x, y, r] of T.masses) crown.ellipse(x, y, r, r * 0.85, 0, 0, TAU);
    for (const [x, y, r] of T.masses) { // shaded cloud masses: dark undersides, lit crowns
      const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.45, r * 0.1, x, y, r * 1.05);
      gr.addColorStop(0, C(P.tones[0], 0.18)); gr.addColorStop(0.6, C(P.tones[0], -0.02)); gr.addColorStop(1, C(P.tones[1], -0.18));
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * 0.85, 0, 0, TAU); g.fill();
    }
    const cr = region('crown', ellipsePts(0, -0.4, 0.85, 0.55), 0, 0.2);
    g.save(); g.clip(crown); paintPattern(g, cr, P, S, { alpha: 0.32 }); g.restore();
    for (const [bx, by, r, ti, k] of T.blooms) {
      if (k >= (S.lod > 1 ? 26 : S.lod ? 12 : 5)) continue;
      const t = P.tones[ti + 1];
      g.beginPath(); g.arc(bx, by, r, 0, TAU); g.fillStyle = C(t, 0.22, 0.85); g.fill();
      if (S.lod > 1) { g.beginPath(); g.arc(bx - r * 0.3, by - r * 0.3, r * 0.35, 0, TAU); g.fillStyle = C(P.light, 0, 0.6); g.fill(); }
    }
  });
  const sway = Math.sin(F.t * 0.6) * 0.035;
  ctx.save(); ctx.translate(0, 0.92); ctx.transform(1, 0, sway, 1, 0, 0); ctx.translate(0, -0.92);
  blit(ctx, s);
  ctx.globalCompositeOperation = 'lighter';
  T.masses.forEach(([x, y, r], i) => glow(ctx, P.tones[(i % 3) + 1], x, y - r * 0.3, r * 1.1, (0.08 + P.glow * 0.3) * (0.6 + 0.4 * Math.sin(F.rt * 1.3 + i)), 0.5));
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  const np = F.lod ? 9 : 4; // falling petals
  for (let i = 0; i < np; i++) {
    const L = 4 + h01(P.seed, i) * 3, age = ((F.rt + h01(P.seed, i + 50) * L) % L) / L;
    const x = lerp(-0.7, 0.7, h01(P.seed, i + 9)) + Math.sin(age * 9 + i) * 0.1, y = lerp(-0.3, 0.95, age);
    ctx.save(); ctx.translate(x, y); ctx.rotate(age * 12 + i);
    ctx.beginPath(); ctx.ellipse(0, 0, 0.03, 0.016, 0, 0, TAU); ctx.fillStyle = C(P.tones[(i % 3) + 1], 0.2, Math.sin(age * Math.PI) * 0.9); ctx.fill();
    ctx.restore();
  }
  return { n: sparkCount(P, F, 2, 0.8), emit: (u, v) => { const m = T.masses[Math.floor(u * T.masses.length)]; return [m[0] + (v - 0.5) * m[2], m[1]]; }, spread: 0.1 };
}

function drawMoss(ctx, P, F) {
  const green = tone(mixHue(120, P.tones[1].h, 0.35), 0.55, 0.38);
  const mound = part(P, 'mound', () => {
    const rnd = rng(P.seed ^ 12), pts = [];
    for (let i = 0; i <= 16; i++) { const a = Math.PI + (i / 16) * Math.PI; pts.push([Math.cos(a) * 0.82, 0.45 + Math.sin(a) * (0.42 + rnd() * 0.08)]); }
    pts.push([0.82, 0.62], [-0.82, 0.62]);
    return region('mound', pts, 0, 0.6);
  });
  const stalks = part(P, 'stalks', () => { const rnd = rng(P.seed ^ 44); return Array.from({ length: 13 }, () => [lerp(-0.6, 0.6, rnd()), 0.2 + rnd() * 0.15, 0.25 + rnd() * 0.3, rnd() * 6]); });
  const s = sprite(P, 'moss', F.ppu, -0.9, -0.05, 0.9, 0.75, (g, S) => {
    const rock = ellPath(0, 0.6, 0.86, 0.13);
    volume(g, rock, tone(P.ink.h, 0.25, 0.32), -0.2, 0.55, 0.8, 0.15, -0.12);
    g.save(); g.clip(mound.path);
    volume(g, mound.path, green, -0.1, 0.2, 0.8, 0.16, -0.18);
    const rnd = rng(P.seed ^ 90);
    for (let i = 0; i < (S.lod > 1 ? 90 : S.lod ? 40 : 14); i++) { // star-moss tufts
      const x = lerp(-0.8, 0.8, rnd()), y = lerp(0.05, 0.6, rnd()), r = 0.02 + rnd() * 0.03;
      g.fillStyle = C(green, (rnd() - 0.3) * 0.25, 0.9, (rnd() - 0.5) * 30); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    paintPattern(g, mound, P, S, { alpha: 0.42, k: 0.5 });
    g.restore();
  });
  // sporophytes behind and in front of the cushion
  const drawStalks = (front) => stalks.forEach(([x, y, h, ph], i) => {
    if ((i % 2 === 0) !== front) return;
    const sw = Math.sin(F.t * 1.1 + ph) * 0.05, tx = x + sw, ty = y - h;
    ctx.strokeStyle = C(P.gold, -0.15, 0.9); ctx.lineWidth = lw(F, 0.01);
    ctx.beginPath(); ctx.moveTo(x, y + 0.05); ctx.quadraticCurveTo(x, y - h * 0.5, tx, ty); ctx.stroke();
    const pulse = 0.5 + 0.5 * Math.sin(F.rt * 1.7 + ph * 3);
    ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.tones[(i % 3) + 1], tx, ty, 0.09, (0.3 + P.glow * 0.6) * pulse, 0.9); ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.ellipse(tx, ty, 0.022, 0.032, sw, 0, TAU); ctx.fillStyle = C(P.tones[(i % 3) + 1], 0.15); ctx.fill();
  });
  drawStalks(false);
  blit(ctx, s);
  drawStalks(true);
  sheenOn(ctx, P, F, mound, 0.3, 0.3);
  return { n: sparkCount(P, F, 2, 0.8), emit: (u) => { const st = stalks[Math.floor(u * stalks.length)]; return [st[0], st[1] - st[2]]; }, rise: true, spread: 0.04 };
}

function drawLotus(ctx, P, F) {
  const pad = tone(mixHue(140, P.tones[3].h, 0.3), 0.5, 0.36);
  const water = sprite(P, 'water', F.ppu, -1, 0.2, 1, 0.95, (g, S) => {
    const pond = ellPath(0, 0.6, 0.98, 0.3);
    const gr = g.createRadialGradient(0, 0.55, 0, 0, 0.6, 0.98);
    gr.addColorStop(0, C(P.ink, 0.22, 0.85)); gr.addColorStop(1, C(P.ink, 0.06, 0));
    g.fillStyle = gr; g.fill(pond);
    for (const [x, y, r, a] of [[-0.55, 0.62, 0.26, 0.4], [0.58, 0.68, 0.22, 2.4], [0.2, 0.82, 0.16, 4]]) {
      g.save(); g.translate(x, y); g.scale(1, 0.38);
      const p = new Path2D(); p.moveTo(0, 0); p.arc(0, 0, r, a + 0.25, a + TAU - 0.05); p.closePath();
      volume(g, p, pad, 0, 0, r, 0.15, -0.15);
      g.strokeStyle = C(pad, 0.18, 0.5); g.lineWidth = lw(S, 0.01, 0.5);
      for (let k = 0; k < 8; k++) { const b = a + 0.4 + (k / 8) * (TAU - 0.6); g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(b) * r * 0.9, Math.sin(b) * r * 0.9); g.stroke(); }
      g.restore();
    }
  });
  const flower = sprite(P, 'lotus', F.ppu, -0.62, -0.92, 0.62, 0.46, (g, S) => {
    const R = region('lp', spline([[0, 0], [0.13, -0.2], [0, -0.48], [-0.13, -0.2]]), 0, 0);
    const petal = (x, y, a, len, t, dl) => {
      g.save(); g.translate(x, y); g.rotate(a);
      const p = petalPath(len, len * 0.36);
      const gr = g.createLinearGradient(0, 0, 0, -len);
      gr.addColorStop(0, C(P.light, 0 + dl)); gr.addColorStop(0.55, C(t, 0.12 + dl)); gr.addColorStop(1, C(t, -0.02 + dl));
      g.fillStyle = gr; g.fill(p);
      g.save(); g.clip(p); g.scale(len / 0.48, len / 0.48); paintPattern(g, R, P, S, { alpha: 0.3, k: 0.5 }); g.restore();
      g.strokeStyle = C(t, -0.15, 0.5); g.lineWidth = lw(S, 0.006, 0.5); g.stroke(p);
      g.restore();
    };
    for (const a of [-1.3, 1.3, -0.95, 0.95]) petal(0, 0.28, a, 0.5, P.tones[0], -0.06);
    g.beginPath(); g.ellipse(0, 0.0, 0.14, 0.06, 0, 0, TAU); g.fillStyle = C(P.gold, 0.05); g.fill(); // seed pod
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * 0.045, -0.005, 0.014, 0, TAU); g.fillStyle = C(tone(P.gold.h, 0.6, 0.35), 0); g.fill(); }
    for (const a of [-0.55, 0.55, -0.2, 0.2, 0]) petal(0, 0.28, a, a === 0 ? 0.62 : 0.56, a === 0 ? P.tones[1] : P.tones[0], 0.02);
  });
  blit(ctx, water);
  ctx.strokeStyle = C(P.light, 0, 1); ctx.lineWidth = lw(F, 0.008);
  for (let k = 0; k < 3; k++) {
    const u = (F.rt * 0.25 + k / 3) % 1;
    ctx.globalAlpha = (1 - u) * 0.5;
    ctx.beginPath(); ctx.ellipse(0, 0.62, 0.2 + u * 0.7, (0.2 + u * 0.7) * 0.28, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const bob = Math.sin(F.t * 0.8) * 0.015;
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.tones[0], 0, -0.1, 0.7, 0.14 + P.glow * 0.35, 0.5); ctx.globalCompositeOperation = 'source-over';
  placed(ctx, flower, 0, 0.36 + bob, Math.sin(F.t * 0.5) * 0.03);
  return { n: sparkCount(P, F, 2, 0.8), emit: (u, v) => [(u - 0.5) * 0.2, 0.3 + v * 0.05], rise: true, spread: 0.08 };
}

const PLANTS = { flower: drawFlower, tree: drawTree, moss: drawMoss, lotus: drawLotus };

// ───────────────────────── spirits ─────────────────────────

function flamePath(F, x, y, r, h, ph) {
  const p = new Path2D(), tip = Math.sin(F.t * 3.1 + ph) * r * 0.5 + Math.sin(F.t * 5.3 + ph) * r * 0.2;
  p.moveTo(x - r, y);
  p.bezierCurveTo(x - r, y - h * 0.45, x + tip * 0.3 - r * 0.2, y - h * 0.7, x + tip, y - h);
  p.bezierCurveTo(x + tip * 0.3 + r * 0.25, y - h * 0.65, x + r, y - h * 0.4, x + r, y);
  p.arc(x, y, r, 0, Math.PI);
  return p;
}

function drawWisp(ctx, P, F) {
  const flick = 1 + Math.sin(F.rt * 7) * 0.04 + Math.sin(F.rt * 11.3) * 0.03;
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, P.vivid, 0, 0.1, 0.95 * flick, 0.45 + P.glow * 0.3, 0.7);
  const layers = [[0.36, 1.05, P.tones[0], 0.55], [0.26, 0.8, P.tones[1], 0.7], [0.15, 0.5, P.light, 0.9]];
  layers.forEach(([r, h, t, a], i) => {
    const p = flamePath(F, 0, 0.32, r * flick, h * flick, i * 0.7);
    const gr = ctx.createRadialGradient(0, 0.25, 0, 0, 0.1, h);
    gr.addColorStop(0, C(t, 0.25, a)); gr.addColorStop(0.6, C(t, 0.05, a * 0.8)); gr.addColorStop(1, C(t, 0, 0));
    ctx.fillStyle = gr; ctx.fill(p);
  });
  if (F.lod) { // eyes in the flame, a 鬼火 with a soul
    ctx.globalCompositeOperation = 'source-over';
    const blink = blinkAt(F, 3.3);
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sd * 0.08, 0.22, 0.028, 0.04 * (1 - blink), 0, 0, TAU); ctx.fillStyle = C(P.ink, 0, 0.85); ctx.fill(); }
    ctx.globalCompositeOperation = 'lighter';
  }
  for (let i = 0; i < 3; i++) { // satellites
    const a = F.t * 1.1 + (i / 3) * TAU, x = Math.cos(a) * 0.62, y = 0.2 + Math.sin(a) * 0.2;
    glow(ctx, P.tones[1 + i], x, y, 0.13, 0.7, 0.9);
    for (let k = 1; k < 4; k++) { const b = a - k * 0.18; glow(ctx, P.tones[1 + i], Math.cos(b) * 0.62, 0.2 + Math.sin(b) * 0.2, 0.08 - k * 0.015, 0.35 / k, 0.9); }
  }
  ctx.globalCompositeOperation = 'source-over';
  return { n: sparkCount(P, F, 4, 1), emit: (u, v) => [(u - 0.5) * 0.4, 0.1 - v * 0.6], rise: true, spread: 0.1, life: 1.8 };
}

function drawOrb(ctx, P, F) {
  const R = part(P, 'orb', () => ellR('orb', 0, 0, 0.5, 0.5));
  const core = sprite(P, 'orb', F.ppu, -0.52, -0.52, 0.52, 0.52, (g, S) => {
    g.save(); g.clip(R.path);
    volume(g, R.path, P.tones[0], 0, 0, 0.5, 0.25, -0.22);
    paintPattern(g, R, P, S, { alpha: 0.55 });
    const rim = g.createRadialGradient(0, 0, 0.32, 0, 0, 0.52);
    rim.addColorStop(0, C(P.light, 0, 0)); rim.addColorStop(1, C(P.light, 0, 0.55));
    g.fillStyle = rim; g.fillRect(-0.5, -0.5, 1, 1);
    g.restore();
    g.beginPath(); g.ellipse(-0.17, -0.22, 0.13, 0.07, -0.6, 0, TAU); g.fillStyle = 'hsla(0,0%,100%,.55)'; g.fill();
  });
  const pulse = 1 + Math.sin(F.t * 1.4) * 0.03;
  const tilt = 0.35, ra = F.t * 0.6;
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.vivid, 0, 0, 0.95 * pulse, 0.35 + P.glow * 0.4, 0.6); ctx.globalCompositeOperation = 'source-over';
  const ring = (front) => {
    ctx.save(); ctx.rotate(-0.4); ctx.scale(1, tilt);
    ctx.strokeStyle = C(P.gold, 0.08, 0.85); ctx.lineWidth = lw(F, 0.03);
    ctx.beginPath(); ctx.arc(0, 0, 0.78, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
    ctx.strokeStyle = C(P.light, 0, 0.4); ctx.lineWidth = lw(F, 0.01);
    ctx.beginPath(); ctx.arc(0, 0, 0.86, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
    for (let i = 0; i < 3; i++) { // moonlets riding the ring
      const a = ra + (i / 3) * TAU, onFront = Math.sin(a) > 0;
      if (onFront !== front) continue;
      ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.tones[1 + i], Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0.22, 0.9, 0.9); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  };
  ring(false);
  placed(ctx, core, 0, 0, Math.sin(F.t * 0.3) * 0.2, pulse);
  ctx.save(); ctx.scale(pulse, pulse);
  iridesce(ctx, P, R.path, -0.5, -0.5, 0.5, 0.5, F.t * 30 * P.iri, P.iri * 0.6, sweep(F, 0.15), 0.6);
  ctx.restore();
  ring(true);
  return { n: sparkCount(P, F, 3, 1), emit: (u, v) => [Math.cos(u * TAU) * 0.55, Math.sin(u * TAU) * 0.5 * v], rise: true };
}

function drawLantern(ctx, P, F) {
  const paper = tone(mixHue(38, P.tones[0].h, 0.35), 0.75, 0.62);
  const R = part(P, 'lan', () => shapeR('lan', [[0, -0.5], [0.3, -0.46], [0.42, -0.2], [0.42, 0.25], [0.3, 0.5], [0, 0.54], [-0.3, 0.5], [-0.42, 0.25], [-0.42, -0.2], [-0.3, -0.46]], 0, 0));
  const body = sprite(P, 'lan', F.ppu, -0.46, -0.66, 0.46, 0.7, (g, S) => {
    g.save(); g.clip(R.path);
    const gr = g.createRadialGradient(0, 0.05, 0.05, 0, 0.02, 0.6);
    gr.addColorStop(0, C(paper, 0.3)); gr.addColorStop(0.6, C(paper, 0.05)); gr.addColorStop(1, C(paper, -0.2));
    g.fillStyle = gr; g.fillRect(-0.5, -0.6, 1, 1.2);
    paintPattern(g, R, P, S, { alpha: 0.4 });
    g.strokeStyle = C(paper, -0.3, 0.55); g.lineWidth = lw(S, 0.01, 0.5); // bamboo ribs
    for (let y = -0.42; y < 0.5; y += 0.09) { g.beginPath(); g.ellipse(0, y, 0.44, 0.035, 0, 0, Math.PI); g.stroke(); }
    g.restore();
    for (const y of [-0.54, 0.5]) { // lacquer caps with gold rims
      g.beginPath(); g.roundRect ? g.roundRect(-0.25, y, 0.5, 0.1, 0.03) : g.rect(-0.25, y, 0.5, 0.1);
      g.fillStyle = C(P.ink, 0.05); g.fill(); g.strokeStyle = C(P.gold, 0.05); g.lineWidth = lw(S, 0.012); g.stroke();
    }
  });
  const swing = Math.sin(F.t * 1.1) * 0.12;
  ctx.save(); ctx.translate(0, -0.92); ctx.rotate(swing); ctx.translate(0, 0.92);
  ctx.strokeStyle = C(P.gold, -0.1, 0.8); ctx.lineWidth = lw(F, 0.012);
  ctx.beginPath(); ctx.moveTo(0, -0.95); ctx.lineTo(0, -0.55); ctx.stroke();
  const flick = 0.75 + 0.15 * Math.sin(F.rt * 9) + 0.1 * Math.sin(F.rt * 13.7);
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.gold, 0, 0.05, 0.95, (0.35 + P.glow * 0.35) * flick, 0.6); ctx.globalCompositeOperation = 'source-over';
  blit(ctx, body);
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.gold, 0, 0.08, 0.45, 0.4 * flick, 0.9); ctx.globalCompositeOperation = 'source-over';
  // 提灯お化け: one sleepy eye and a lolling tongue
  const blink = blinkAt(F, 4.8);
  ctx.beginPath(); ctx.ellipse(0.02, -0.1, 0.1, 0.11 * (1 - blink * 0.9), 0, 0, TAU); ctx.fillStyle = C(P.light, 0.05); ctx.fill();
  ctx.strokeStyle = C(P.ink, 0.04); ctx.lineWidth = lw(F, 0.014); ctx.stroke();
  if (blink < 0.6) { ctx.beginPath(); ctx.arc(0.04, -0.08, 0.045, 0, TAU); ctx.fillStyle = C(P.ink, 0); ctx.fill(); }
  ctx.strokeStyle = C(P.ink, 0.04, 0.9); ctx.lineWidth = lw(F, 0.016);
  ctx.beginPath(); ctx.moveTo(-0.2, 0.18); ctx.quadraticCurveTo(0, 0.24, 0.22, 0.16); ctx.stroke();
  const wag = Math.sin(F.t * 2.2) * 0.04;
  ctx.beginPath(); ctx.moveTo(-0.06, 0.21); ctx.quadraticCurveTo(-0.04 + wag, 0.42, 0.04 + wag, 0.4); ctx.quadraticCurveTo(0.08, 0.3, 0.06, 0.21); ctx.fillStyle = C(P.warm, 0.12); ctx.fill();
  sheenOn(ctx, P, F, R, 0.35, 0.3);
  ctx.restore();
  return { n: sparkCount(P, F, 3, 1), emit: (u, v) => [(u - 0.5) * 0.6, -0.5 - v * 0.1], rise: true };
}

const SPIRITS = { wisp: drawWisp, orb: drawOrb, lantern: drawLantern };

// ───────────────────────── minerals ─────────────────────────

function drawGeode(ctx, P, F) {
  const outer = part(P, 'geo', () => { const rnd = rng(P.seed ^ 2); return region('geo', spline(Array.from({ length: 11 }, (_, i) => { const a = (i / 11) * TAU, r = 0.78 + rnd() * 0.1; return [Math.cos(a) * r, Math.sin(a) * r * 0.82 + 0.05]; })), 0, 0.05); });
  const cav = part(P, 'cav', () => { const rnd = rng(P.seed ^ 4); return region('cav', spline(Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * TAU, r = 0.42 + rnd() * 0.08; return [Math.cos(a) * r, Math.sin(a) * r * 0.82 + 0.05]; })), 0, 0.05); });
  const s = sprite(P, 'geode', F.ppu, -0.92, -0.8, 0.92, 0.85, (g, S) => {
    const rind = tone(P.tones[3].h, 0.2, 0.36);
    volume(g, outer.path, rind, 0, 0, 0.9, 0.12, -0.15);
    g.save(); g.clip(outer.path);
    paintPattern(g, outer, P, S, { alpha: 0.25 });
    for (let k = 0; k < 5; k++) { // agate bands
      const sc = 1 - (k + 1) * 0.08;
      g.save(); g.translate(0, 0.05); g.scale(sc, sc); g.translate(0, -0.05);
      g.strokeStyle = C(P.tones[k % 3], 0.05 + k * 0.04, 0.9); g.lineWidth = 0.07; g.stroke(outer.path);
      g.restore();
    }
    g.restore();
    g.save(); g.clip(cav.path);
    g.fillStyle = C(P.ink, 0.04); g.fillRect(-0.6, -0.5, 1.2, 1.1);
    const rnd = rng(P.seed ^ 6); // crystal teeth pointing inward
    for (let i = 0; i < cav.poly.length; i += S.lod > 1 ? 2 : 4) {
      const [x, y] = cav.poly[i], dx = -x, dy = 0.05 - y, d = Math.hypot(dx, dy) || 1, len = 0.12 + rnd() * 0.14;
      const nx = dx / d, ny = dy / d, w = 0.04 + rnd() * 0.03, t = P.tones[(i >> 2) % 3];
      const tx = x + nx * len, ty = y + ny * len;
      g.beginPath(); g.moveTo(x - ny * w, y + nx * w); g.lineTo(tx, ty); g.lineTo(x + ny * w, y - nx * w); g.closePath();
      g.fillStyle = C(t, 0.12 + rnd() * 0.15, 0.95); g.fill();
      g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.lineTo(x + ny * w, y - nx * w); g.closePath();
      g.fillStyle = C(t, -0.08, 0.6); g.fill();
    }
    const gr = g.createRadialGradient(0, 0.05, 0, 0, 0.05, 0.3);
    gr.addColorStop(0, C(P.vivid, 0.15, 0.7)); gr.addColorStop(1, C(P.vivid, 0, 0));
    g.fillStyle = gr; g.fillRect(-0.4, -0.3, 0.8, 0.7);
    g.restore();
    edge(g, outer.path, P, S, 0.012, 0.7);
  });
  blit(ctx, s);
  ctx.globalCompositeOperation = 'lighter'; glow(ctx, P.vivid, 0, 0.05, 0.5, (0.25 + P.glow * 0.5) * (0.8 + 0.2 * Math.sin(F.rt * 1.2)), 0.8); ctx.globalCompositeOperation = 'source-over';
  iridesce(ctx, P, cav.path, cav.x0, cav.y0, cav.x1, cav.y1, F.t * 25, Math.max(0.35, P.iri) * 0.7, sweep(F, 0.13), 0.9);
  return { n: sparkCount(P, F, 3, 1), emit: (u) => cav.poly[Math.floor(u * cav.poly.length)].map((c, i) => c * 0.75 + (i ? 0.012 : 0)), spread: 0.01, life: 1.6, size: 0.8 };
}

function drawCrystals(ctx, P, F) {
  const prisms = part(P, 'prisms', () => {
    const rnd = rng(P.seed ^ 8), n = 6 + ((rnd() * 3) | 0), out = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5, a = -Math.PI / 2 + u * 1.5 + (rnd() - 0.5) * 0.25;
      const len = (0.95 - Math.abs(u) * 0.75) * (0.85 + rnd() * 0.25), w = 0.09 + rnd() * 0.06;
      out.push({ x: u * 0.55, y: 0.62, a, len, w, t: i % 3 });
    }
    out.sort((p, q) => q.len - p.len); // tall ones at the back
    const union = new Path2D();
    for (const p of out) union.addPath(prismPath(p));
    return { list: out, union };
  });
  const s = sprite(P, 'cryst', F.ppu, -1, -1, 1, 0.92, (g, S) => {
    const rock = ellPath(0, 0.7, 0.62, 0.17);
    volume(g, rock, tone(P.ink.h, 0.25, 0.3), -0.1, 0.65, 0.6, 0.12, -0.1);
    for (const p of prisms.list) paintPrism(g, P, S, p);
  });
  blit(ctx, s);
  iridesce(ctx, P, prisms.union, -0.8, -0.9, 0.8, 0.7, Math.sin(F.t * 0.3) * 80, Math.max(0.3, P.iri) * 0.55, sweep(F, 0.12), 0.9);
  ctx.globalCompositeOperation = 'lighter';
  prisms.list.forEach((p, i) => {
    const mx = p.x + Math.cos(p.a) * p.len * 0.5, my = p.y + Math.sin(p.a) * p.len * 0.5;
    glow(ctx, P.tones[p.t], mx, my, p.w * 2.4, (0.18 + P.glow * 0.45) * (0.6 + 0.4 * Math.sin(F.rt * 1.1 + i * 1.7)), 0.8);
  });
  ctx.globalCompositeOperation = 'source-over';
  return { n: sparkCount(P, F, 3, 1), emit: (u) => { const p = prisms.list[Math.floor(u * prisms.list.length)]; return [p.x + Math.cos(p.a) * p.len, p.y + Math.sin(p.a) * p.len]; }, spread: 0.015, life: 1.5, size: 0.9 };
}

function prismPath(p) {
  const c = Math.cos(p.a), s = Math.sin(p.a), nx = -s, ny = c, L = p.len, tipL = p.w * 1.6;
  const path = new Path2D();
  path.moveTo(p.x + nx * p.w, p.y + ny * p.w);
  path.lineTo(p.x + nx * p.w + c * (L - tipL), p.y + ny * p.w + s * (L - tipL));
  path.lineTo(p.x + c * L, p.y + s * L);
  path.lineTo(p.x - nx * p.w + c * (L - tipL), p.y - ny * p.w + s * (L - tipL));
  path.lineTo(p.x - nx * p.w, p.y - ny * p.w);
  path.closePath();
  return path;
}

function paintPrism(g, P, S, p) {
  const t = P.tones[p.t], c = Math.cos(p.a), s = Math.sin(p.a), nx = -s, ny = c, L = p.len, tipL = p.w * 1.6;
  const pt = (k, l) => [p.x + nx * p.w * k + c * l, p.y + ny * p.w * k + s * l];
  const face = (pts, dl, a) => { g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q))); g.closePath(); g.fillStyle = C(t, dl, a); g.fill(); };
  face([pt(1, 0), pt(1, L - tipL), pt(0.25, L - tipL * 0.9), pt(0.25, 0)], -0.12, 0.92); // shaded face
  face([pt(0.25, 0), pt(0.25, L - tipL * 0.9), pt(-0.35, L - tipL * 0.95), pt(-0.35, 0)], 0.12, 0.85); // lit face
  face([pt(-0.35, 0), pt(-0.35, L - tipL * 0.95), pt(-1, L - tipL), pt(-1, 0)], 0.0, 0.9);
  face([pt(1, L - tipL), pt(0, L), pt(0.25, L - tipL * 0.9)], 0.05, 0.95);
  face([pt(0.25, L - tipL * 0.9), pt(0, L), pt(-0.35, L - tipL * 0.95)], 0.3, 0.95);
  face([pt(-0.35, L - tipL * 0.95), pt(0, L), pt(-1, L - tipL)], 0.15, 0.95);
  const path = prismPath(p);
  const R = region('pr', [pt(1, 0), pt(1, L), pt(-1, L), pt(-1, 0)], p.x, p.y);
  g.save(); g.clip(path); paintPattern(g, R, P, S, { alpha: 0.3, k: 0.6 });
  const gl = g.createLinearGradient(...pt(0, 0), ...pt(0, L));
  gl.addColorStop(0, C(P.light, 0, 0)); gl.addColorStop(0.7, C(P.light, 0, 0.15)); gl.addColorStop(1, C(P.light, 0, 0.5));
  g.fillStyle = gl; g.fill(path);
  g.restore();
  g.strokeStyle = C(P.light, 0, 0.7); g.lineWidth = lw(S, 0.008, 0.6); g.stroke(path);
}

const MINERALS = { geode: drawGeode, crystal_cluster: drawCrystals };

const byShape = (table) => (ctx, P, F) => table[P.shape](ctx, P, F);

// ───────────────────────── dispatcher ─────────────────────────

const RENDER = {
  butterfly: drawButterfly,
  insect: byShape(INSECTS),
  fish: byShape(FISH),
  jellyfish: drawJelly,
  bird: byShape(BIRDS),
  beast: byShape(BEASTS),
  dragon: byShape(DRAGONS),
  plant: byShape(PLANTS),
  spirit: byShape(SPIRITS),
  mineral: byShape(MINERALS),
};

// A few long creatures (whales, catfish, the boar) swing wider than their box. In a
// canvas card that would end in a hard vertical cut, so the card draws them at
// the factor that keeps the whole silhouette, over several seconds of motion,
// inside the box. The map has no box and keeps the full size. Measured by
// drawing every creature at 30 timestamps and taking the farthest pixel with
// alpha > 30; re-measure when a creature is added.
const CONTAIN = {
  jomon_morioi_jika: 0.76, jinari_namazu: 0.79, kumo_kujira: 0.80, ryugu_shimaoi_ogame: 0.80,
  tenshu_shachi: 0.86, hiraizumi_kinkei: 0.91, ryugu_otoshigo: 0.91, muou_koi: 0.93, ama_tamamushi: 0.96
};

export function drawCreature(ctx, creature, t, size, opts) {
  if (!ctx || !creature || !(size > 0)) return;
  const P = prep(creature);
  const k = (size / 2) * P.fit * (P.kind === 'beast' && P.shape === 'whale' ? 1.12 : 1)
    * (opts && opts.contain ? CONTAIN[creature.id] || 1 : 1);
  const ppu = k * devScale(ctx);
  const F = { t: (t || 0) * P.tempo + P.phase, rt: (t || 0) + P.phase, ppu, lod: lodOf(ppu) };
  LITE = ppu < 48;
  ctx.save();
  ctx.scale(k, k);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // ambient aura: every creature carries a little lamplight so it reads on deep indigo
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, P.vivid, 0, 0, 1.15, 0.07 + P.glow * 0.3 * (0.85 + 0.15 * Math.sin(F.rt * 1.7)), 0.5);
  ctx.globalCompositeOperation = 'source-over';
  const m = motion(P, F.t);
  ctx.save();
  ctx.translate(m[0], m[1]);
  ctx.rotate(m[2]);
  const fx = RENDER[P.kind](ctx, P, F);
  ctx.restore();
  if (fx) sparkles(ctx, P, F, fx.n, fx.emit, fx);
  ctx.restore();
}

// ───────────────────────── live canvases (one shared animation loop) ─────────────────────────

const live = new Set();
const liveByCanvas = new WeakMap();
let io = null, rafId = 0;

function paintLive(e, t) {
  const { ctx, px } = e;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, px, px);
  ctx.setTransform(e.dpr, 0, 0, e.dpr, px / 2, px / 2);
  drawCreature(ctx, e.creature, t, e.size, { contain: true });
}

function tick(now) {
  rafId = 0;
  const t = now / 1000;
  let any = false;
  for (const e of live) {
    if (!e.canvas.isConnected) {
      if (e.attached || t - e.born > 60) { live.delete(e); io && io.unobserve(e.canvas); }
      continue;
    }
    e.attached = true;
    if (!e.visible) continue;
    any = true;
    paintLive(e, t);
  }
  if (any) rafId = requestAnimationFrame(tick);
}

function wake() {
  if (!rafId && typeof requestAnimationFrame === 'function') rafId = requestAnimationFrame(tick);
}

function observer() {
  if (io || typeof IntersectionObserver === 'undefined') return io;
  io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      const e = liveByCanvas.get(en.target);
      if (e) e.visible = en.isIntersecting;
    }
    wake();
  }, { rootMargin: '64px' });
  return io;
}

export function creatureCanvas(creature, size, { animate = true } = {}) {
  const dpr = Math.min(2, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  const px = Math.max(1, Math.round(size * dpr));
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  canvas.style.width = canvas.style.height = `${size}px`;
  canvas.className = 'creature-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', [creature && creature.name_ja, creature && creature.name_en].filter(Boolean).join(' / ') || 'creature');
  const e = { canvas, ctx: canvas.getContext('2d'), creature, size, dpr: px / size, px, visible: false, attached: false, born: performance.now() / 1000 };
  paintLive(e, e.born);
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (animate && !still) {
    live.add(e);
    liveByCanvas.set(canvas, e);
    const o = observer();
    if (o) o.observe(canvas); else e.visible = true;
    wake();
  }
  return canvas;
}
