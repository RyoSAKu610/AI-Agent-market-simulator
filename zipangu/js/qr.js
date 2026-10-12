// A small QR Code encoder (ISO/IEC 18004): byte mode, error-correction level M,
// versions 1–20 (up to 666 bytes of UTF-8). No network, no library: the summon
// page draws its "open on your phone" code with it, and the single-file build
// keeps working offline. tools/qr.test.mjs checks it against a reference
// encoder and a decoder.

// Reed–Solomon blocks for level M, per version: [count, total, data, (count, total, data)].
const BLOCKS_M = [null,
    [1, 26, 16], [1, 44, 28], [1, 70, 44], [2, 50, 32], [2, 67, 43],
    [4, 43, 27], [4, 49, 31], [2, 60, 38, 2, 61, 39], [3, 58, 36, 2, 59, 37], [4, 69, 43, 1, 70, 44],
    [1, 80, 50, 4, 81, 51], [6, 58, 36, 2, 59, 37], [8, 59, 37, 1, 60, 38], [4, 64, 40, 5, 65, 41], [5, 65, 41, 5, 66, 42],
    [7, 73, 45, 3, 74, 46], [10, 74, 46, 1, 75, 47], [9, 69, 43, 4, 70, 44], [3, 70, 44, 11, 71, 45], [3, 67, 41, 13, 68, 42]
];
const MAX_VERSION = 20;
const ECL_M_BITS = 0;   // format bits for level M

// ------------------------------------------------------------ GF(256) arithmetic, polynomial 0x11D
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function generator(degree) {
    let g = [1];
    for (let i = 0; i < degree; i++) {
        const next = new Array(g.length + 1).fill(0);
        for (let j = 0; j < g.length; j++) { next[j] ^= g[j]; next[j + 1] ^= mul(g[j], EXP[i]); }
        g = next;
    }
    return g;
}

function remainder(data, degree) {
    const g = generator(degree);
    const r = new Array(degree).fill(0);
    for (const b of data) {
        const factor = b ^ r.shift();
        r.push(0);
        for (let i = 0; i < degree; i++) r[i] ^= mul(g[i + 1], factor);
    }
    return r;
}

// ------------------------------------------------------------ data codewords
function blocksOf(version) {
    const row = BLOCKS_M[version], out = [];
    for (let i = 0; i < row.length; i += 3) for (let n = 0; n < row[i]; n++) out.push({ total: row[i + 1], data: row[i + 2] });
    return out;
}
const dataCapacity = version => blocksOf(version).reduce((s, b) => s + b.data, 0);

export function utf8(text) { return Array.from(new TextEncoder().encode(String(text))); }

export function chooseVersion(bytes) {
    for (let v = 1; v <= MAX_VERSION; v++) {
        const countBits = v < 10 ? 8 : 16;
        if (4 + countBits + bytes.length * 8 <= dataCapacity(v) * 8) return v;
    }
    return 0;
}

function codewords(bytes, version) {
    const bits = [];
    const put = (value, n) => { for (let i = n - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
    put(0b0100, 4);
    put(bytes.length, version < 10 ? 8 : 16);
    for (const b of bytes) put(b, 8);
    const capBits = dataCapacity(version) * 8;
    put(0, Math.min(4, capBits - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    for (let pad = 0xec; data.length < capBits / 8; pad ^= 0xec ^ 0x11) data.push(pad);

    // Split into blocks, add error correction, interleave.
    const blocks = [];
    let k = 0;
    for (const b of blocksOf(version)) {
        const d = data.slice(k, k + b.data); k += b.data;
        blocks.push({ d, e: remainder(d, b.total - b.data) });
    }
    const out = [];
    const maxD = Math.max(...blocks.map(b => b.d.length));
    for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
    const ecLen = blocks[0].e.length;
    for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.e[i]);
    return out;
}

// ------------------------------------------------------------ the symbol
function alignmentCenters(version) {
    if (version === 1) return [];
    const n = Math.floor(version / 7) + 2;
    const size = version * 4 + 17;
    const step = version === 32 ? 26 : Math.ceil((size - 13) / (n * 2 - 2)) * 2;
    const out = [6];
    for (let pos = size - 7; out.length < n; pos -= step) out.splice(1, 0, pos);
    return out;
}

function bch(value, poly, polyBits) {
    let r = value << (polyBits - 1);
    for (let i = 31; i >= polyBits - 1; i--) if ((r >>> i) & 1) r ^= poly << (i - polyBits + 1);
    return r;
}

const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
    (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
];

function baseMatrix(version) {
    const size = version * 4 + 17;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { if (x >= 0 && y >= 0 && x < size && y < size) { m[y][x] = dark; fixed[y][x] = true; } };

    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
            const d = Math.max(Math.abs(dx), Math.abs(dy));
            set(cx + dx, cy + dy, d !== 2 && d !== 4);
        }
    }
    for (let i = 8; i < size - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
    const centers = alignmentCenters(version), last = centers.length - 1;
    centers.forEach((cy, i) => centers.forEach((cx, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;   // the three finder corners
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    // Reserve the format areas (written per mask) and the dark module.
    for (let i = 0; i < 9; i++) { fixed[8][i] = fixed[i][8] = true; }
    for (let i = 0; i < 8; i++) { fixed[8][size - 1 - i] = fixed[size - 1 - i][8] = true; }
    set(8, size - 8, true);
    if (version >= 7) {
        const bits = (version << 12) | bch(version, 0x1f25, 13);
        for (let i = 0; i < 18; i++) {
            const dark = ((bits >>> i) & 1) === 1;
            const a = size - 11 + (i % 3), b = Math.floor(i / 3);
            set(a, b, dark); set(b, a, dark);
        }
    }
    return { m, fixed, size };
}

function placeData(m, fixed, size, cw) {
    let bit = 0;
    const total = cw.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) {
            for (let j = 0; j < 2; j++) {
                const x = right - j;
                const upward = ((right + 1) & 2) === 0;
                const y = upward ? size - 1 - vert : vert;
                if (fixed[y][x]) continue;
                m[y][x] = bit < total ? ((cw[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1 : false;
                bit++;
            }
        }
    }
}

function drawFormat(m, size, mask) {
    const data = (ECL_M_BITS << 3) | mask;
    const bits = ((data << 10) | bch(data, 0x537, 11)) ^ 0x5412;
    const bitAt = i => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) m[i][8] = bitAt(i);
    m[7][8] = bitAt(6); m[8][8] = bitAt(7); m[8][7] = bitAt(8);
    for (let i = 9; i < 15; i++) m[8][14 - i] = bitAt(i);
    for (let i = 0; i < 8; i++) m[8][size - 1 - i] = bitAt(i);
    for (let i = 8; i < 15; i++) m[size - 15 + i][8] = bitAt(i);
    m[size - 8][8] = true;
}

function penalty(m, size) {
    let score = 0;
    const line = get => {
        let s = 0, run = 1;
        const seq = [];
        for (let i = 0; i < size; i++) seq.push(get(i));
        for (let i = 1; i <= size; i++) {
            if (i < size && seq[i] === seq[i - 1]) run++;
            else { if (run >= 5) s += 3 + (run - 5); run = 1; }
        }
        // finder-like 1:1:3:1:1 with four light modules on either side
        const padded = [...new Array(4).fill(false), ...seq, ...new Array(4).fill(false)];
        for (let i = 0; i + 11 <= padded.length; i++) {
            const w = padded.slice(i, i + 11).map(v => (v ? 1 : 0)).join('');
            if (w === '10111010000' || w === '00001011101') s += 40;
        }
        return s;
    };
    for (let y = 0; y < size; y++) score += line(x => m[y][x]);
    for (let x = 0; x < size; x++) score += line(y => m[y][x]);
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
    let dark = 0;
    for (const row of m) for (const v of row) if (v) dark++;
    const k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1;
    return score + Math.max(0, k) * 10;
}

// → { size, modules: boolean[][], version, mask } or null when the text is too long.
export function encodeQR(text, { mask: forcedMask = null } = {}) {
    const bytes = utf8(text);
    const version = chooseVersion(bytes);
    if (!version) return null;
    const cw = codewords(bytes, version);
    let best = null;
    for (let mask = 0; mask < 8; mask++) {
        if (forcedMask !== null && mask !== forcedMask) continue;
        const { m, fixed, size } = baseMatrix(version);
        placeData(m, fixed, size, cw);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && MASKS[mask](x, y)) m[y][x] = !m[y][x];
        drawFormat(m, size, mask);
        const p = forcedMask !== null ? 0 : penalty(m, size);
        if (!best || p < best.p) best = { p, m, size, mask };
    }
    return { size: best.size, modules: best.m, version, mask: best.mask };
}

// An SVG string: dark modules as one path, with a four-module quiet zone.
export function qrSvg(text, { dark = '#0b1030', light = '#ffffff', label = '' } = {}) {
    const q = encodeQR(text);
    if (!q) return null;
    const n = q.size + 8;
    let d = '';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.modules[y][x]) d += `M${x + 4} ${y + 4}h1v1h-1z`;
    const title = label ? `<title>${label.replace(/[<&>"]/g, c => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;', '"': '&quot;' }[c]))}</title>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img">${title}<rect width="${n}" height="${n}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
