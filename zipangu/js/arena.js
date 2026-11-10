// 🏟 The arena (#/live): who is ahead and who is racing whom, read straight from the
// economy's live state. Pure functions, tested in tools/arena.test.mjs. Nothing is
// invented: every number is a wallet, a cargo, a goal or a count the simulation holds.

// What a resident is worth now: the wallet plus the cargo at what it cost.
export const worthOf = a => a.wallet + (a.carrying || []).reduce((n, l) => n + l.qty * l.cost, 0);

// The three tables. `value` is what the row is sorted by.
export const METRICS = {
    gain: a => worthOf(a) - a.startWorth,                         // earned since arriving
    goal: a => Math.max(0, Math.min(1, a.goalProgress || 0)),     // how far along the long-term goal
    trades: a => (a.stats ? a.stats.sales + a.stats.buys : 0)     // deals closed
};

// → [{ id, value, rank }] best first; ties keep the roster's order
export function standings(agents, metric = 'gain') {
    const f = METRICS[metric] || METRICS.gain;
    return [...agents.values()].map((a, i) => ({ id: a.id, value: f(a), i }))
        .sort((x, y) => y.value - x.value || x.i - y.i)
        .map(({ id, value }, k) => ({ id, value, rank: k + 1 }));
}

// Remembers each table's last order so a row can show how many places it moved (+ up, − down).
export function createBoard() {
    const before = new Map();
    return {
        update(agents, metric = 'gain') {
            const prev = before.get(metric) || new Map();
            const rows = standings(agents, metric).map(r => ({ ...r, moved: prev.has(r.id) ? prev.get(r.id) - r.rank : 0 }));
            before.set(metric, new Map(rows.map(r => [r.id, r.rank])));
            return rows;
        }
    };
}

const pairs = list => list.flatMap((a, i) => list.slice(i + 1).map(b => [a, b]));

// → the head-to-head worth watching now, or null with fewer than two residents:
//   race  two on the road to the same district — who is further along
//   goods two carrying the same good — who holds more
//   lead  otherwise the top two by earnings
// `a` is always the one ahead; `gap` is by how much (in the unit of the kind).
export function rivalry(agents) {
    const all = [...agents.values()];
    if (all.length < 2) return null;
    const racing = pairs(all.filter(a => a.trip)).filter(([a, b]) => a.trip.to === b.trip.to)
        .sort((p, q) => Math.abs(p[0].trip.prog - p[1].trip.prog) - Math.abs(q[0].trip.prog - q[1].trip.prog))[0];
    if (racing) {
        const [a, b] = racing[0].trip.prog >= racing[1].trip.prog ? racing : [racing[1], racing[0]];
        return { kind: 'race', a: a.id, b: b.id, what: a.trip.to, av: a.trip.prog, bv: b.trip.prog, gap: a.trip.prog - b.trip.prog };
    }
    const held = (a, good) => (a.carrying || []).filter(l => l.good === good).reduce((n, l) => n + l.qty, 0);
    const sameGood = pairs(all.filter(a => (a.carrying || []).length))
        .map(([a, b]) => { const good = a.carrying.map(l => l.good).find(g => held(b, g) > 0); return good ? [a, b, good] : null; })
        .filter(Boolean)[0];
    if (sameGood) {
        const [x, y, good] = sameGood;
        const [a, b] = held(x, good) >= held(y, good) ? [x, y] : [y, x];
        return { kind: 'goods', a: a.id, b: b.id, what: good, av: held(a, good), bv: held(b, good), gap: held(a, good) - held(b, good) };
    }
    const [first, second] = standings(agents, 'gain');
    return { kind: 'lead', a: first.id, b: second.id, what: null, av: first.value, bv: second.value, gap: first.value - second.value };
}
