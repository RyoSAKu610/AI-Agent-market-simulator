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
                push(rows, d + '|' + g, p);
                const s = sums.get(g) || [0, 0];
                s[0] += p; s[1]++;
                sums.set(g, s);
            }
        }
        for (const [g, [sum, n]] of sums) push(goodMean, g, sum / n);
    }

    return {
        sample,
        series: (d, g) => rows.get(d + '|' + g) || [],
        meanSeries: g => goodMean.get(g) || []
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
