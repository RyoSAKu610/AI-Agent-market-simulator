// Price memory for sparklines. The economy only knows "now"; this samples its
// price table on a timer and keeps the last N points per (district, good).

const KEEP = 72;

export function createHistory(eco, saved = null) {
    const rows = new Map();        // 'district|good' → number[]
    const goodMean = new Map();    // good → number[]

    if (saved) {
        saved = decodeHistory(saved);
        for (const [key, values] of saved.rows) rows.set(key, values.map((price, i) => ({ ...saved.times[i], price })));
        for (const [key, values] of saved.means) goodMean.set(key, values.map((price, i) => ({ ...saved.times[i], price })));
    }
    function snapshot() {
        const points = rows.values().next().value || [];
        const entries = [...rows, ...goodMean];
        const bytes = new Uint8Array(entries.length * points.length * 8), view = new DataView(bytes.buffer);
        let at = 0;
        for (const [, values] of entries) for (const p of values) { view.setFloat64(at, p.price, true); at += 8; }
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return { v: 1, times: points.map(({ time, day, label }) => ({ time, day, label })),
            rowKeys: [...rows.keys()], meanKeys: [...goodMean.keys()], prices: btoa(binary) };
    }
    function push(map, key, v) {
        let a = map.get(key);
        if (!a) { a = []; map.set(key, a); }
        a.push(v);
        if (a.length > KEEP) a.shift();
    }

    function sample() {
        const sums = new Map();
        for (const [d, row] of eco.prices) {
            for (const [g, p] of row) {
                if (!Number.isFinite(p)) continue;
                push(rows, d + '|' + g, { time: eco.time, day: eco.clock.day, label: eco.clock.label, price: p });
                const s = sums.get(g) || [0, 0];
                s[0] += p; s[1]++;
                sums.set(g, s);
            }
        }
        for (const [g, [sum, n]] of sums) push(goodMean, g, { time: eco.time, day: eco.clock.day, label: eco.clock.label, price: sum / n });
    }

    return {
        sample, snapshot,
        series: (d, g) => (rows.get(d + '|' + g) || []).map(p => p.price),
        meanSeries: g => (goodMean.get(g) || []).map(p => p.price),
        points: (d, g) => rows.get(d + '|' + g) || [],
        meanPoints(g, districts = null) {
            if (!districts) return goodMean.get(g) || [];
            const samples = new Map();
            for (const d of districts) for (const point of rows.get(d + '|' + g) || []) {
                const s = samples.get(point.time) || { ...point, price: 0, count: 0 };
                s.price += point.price; s.count++; samples.set(point.time, s);
            }
            return [...samples.values()].sort((a, b) => a.time - b.time).map(p => ({ time: p.time, day: p.day, label: p.label, price: p.price / p.count }));
        }
    };
}

// What the market looks like right now, from the economy's price table.
export function goodQuotes(eco, goodId) {
    const out = [];
    for (const [d, row] of eco.prices) {
        const p = row.get(goodId);
        if (Number.isFinite(p)) out.push({ district: d, price: p });
    }
    return out;
}


// Float64 preserves every observed price exactly while using less localStorage
// than thousands of repeated decimal strings. Timestamps are shared once.
export function decodeHistory(saved) {
    if (!saved.v) return saved; // early local records used plain arrays
    if (saved.v !== 1 || !Array.isArray(saved.times) || saved.times.length > KEEP
        || !Array.isArray(saved.rowKeys) || !Array.isArray(saved.meanKeys)
        || typeof saved.prices !== 'string' || saved.prices.length > 3000000) throw new Error('bad price memory');
    const binary = atob(saved.prices), size = saved.times.length;
    if (binary.length !== (saved.rowKeys.length + saved.meanKeys.length) * size * 8) throw new Error('bad price memory size');
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)), view = new DataView(bytes.buffer);
    let at = 0;
    const values = key => { const prices = []; for (let i = 0; i < size; i++) { prices.push(view.getFloat64(at, true)); at += 8; } return [key, prices]; };
    return { times: saved.times, rows: saved.rowKeys.map(values), means: saved.meanKeys.map(values) };
}
