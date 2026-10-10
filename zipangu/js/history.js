// Price memory for sparklines. The economy only knows "now"; this samples its
// price table on a timer and keeps the last N points per (district, good).

const KEEP = 72;

export function createHistory(eco) {
    const rows = new Map();        // 'district|good' → number[]
    const goodMean = new Map();    // good → number[]

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
        sample,
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
