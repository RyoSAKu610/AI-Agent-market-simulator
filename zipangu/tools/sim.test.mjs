// Offline tests for js/sim.js against the world in world/. Run: node tools/sim.test.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy, clockAt, KOKU_LABELS, indexRoutes, routeBetween } from '../js/sim.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const read = (file, fallback) => (existsSync(join(root, file)) ? JSON.parse(readFileSync(join(root, file), 'utf8')) : fallback);
const raw = {};
for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) {
    raw[stem] = read(stem + '.json');
}
raw.texts = read('library.texts.json', { works: {} });
const W = buildWorld(raw);

// ---- data.js
assert.ok(W.byId.place.size === W.eras.length + W.realms.length);
assert.ok(W.baseCurrency && W.baseCurrency.base, 'base currency');
for (const d of W.districts) assert.ok(W.placeOf(d.id), `placeOf(${d.id})`);
assert.equal(W.placeOf(W.eras[0].id), W.eras[0]);

// ---- 不定時法 clock: 12 刻, day 刻 longer in summer than in winter
const summer = clockAt(0.5, 9), winter = clockAt(0.5, 21);
assert.ok(summer.dayKokuHours > 2.2 && winter.dayKokuHours < 1.8, 'seasonal 刻 lengths');
assert.ok(Math.abs(summer.dayKokuHours * 6 + summer.nightKokuHours * 6 - 24) < 1e-9);
assert.equal(clockAt(summer.dawn + 1e-6, 9).label, '明け六つ');
assert.equal(clockAt(summer.dusk + 1e-6, 9).label, '暮れ六つ');
assert.equal(clockAt(0.5, 9).label, '昼九つ');
assert.equal(clockAt(0.0001, 9).label, '夜九つ');
assert.equal(new Set(Array.from({ length: 288 }, (_, i) => clockAt(i / 288, 4).label)).size, KOKU_LABELS.length);

// ---- a full run
const DAYS = 3;
const SEC_PER_DAY = 240;
function run(seed) {
    const eco = createEconomy(W, { seed, secondsPerDay: SEC_PER_DAY });
    const log = { trade: [], arrive: [], depart: [], event: [], settle: [], goal: [] };
    for (const type of Object.keys(log)) eco.on(type, m => log[type].push(m));
    const goal0 = [...eco.agents.values()].map(a => a.goalProgress);
    let worstPrice = { lo: Infinity, hi: 0 };
    for (let i = 0; i < DAYS * SEC_PER_DAY * 4; i++) {
        eco.step(0.25);
        if (i % 20) continue;
        for (const a of eco.agents.values()) {
            assert.ok(a.wallet >= 0, `${a.id} wallet ${a.wallet}`);
            assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), `${a.id} position`);
        }
        for (const [d, row] of eco.prices) for (const [g, p] of row) {
            const r = p / W.byId.good.get(g).base_price;
            assert.ok(Number.isFinite(r), `price ${d}/${g}`);
            worstPrice = { lo: Math.min(worstPrice.lo, r), hi: Math.max(worstPrice.hi, r) };
        }
    }
    return { eco, log, goal0, worstPrice, snap: eco.snapshot() };
}

function assertNoNaN(v, path = '') {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `non-finite number at ${path}`);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) assertNoNaN(x, `${path}.${k}`);
}

const SEEDS = [1, 7, 2026];
const runs = SEEDS.map(run);

// determinism: same seed → same world; different seed → different world
assert.equal(JSON.stringify(run(SEEDS[0]).snap), JSON.stringify(runs[0].snap), 'same seed is deterministic');
assert.notEqual(JSON.stringify(runs[1].snap), JSON.stringify(runs[0].snap), 'seeds differ');
// frame-rate independent: the same game time in different step sizes ends identical
{
    const a = createEconomy(W, { seed: 3, secondsPerDay: SEC_PER_DAY });
    const b = createEconomy(W, { seed: 3, secondsPerDay: SEC_PER_DAY });
    for (let i = 0; i < 480; i++) a.step(0.25);
    for (let i = 0; i < 60; i++) b.step(2);
    assert.equal(JSON.stringify(a.snapshot()), JSON.stringify(b.snapshot()), 'step size does not change the outcome');
}
// restore from a snapshot continues identically
{
    const a = createEconomy(W, { seed: 5, secondsPerDay: SEC_PER_DAY });
    for (let i = 0; i < 300; i++) a.step(0.5);
    const b = createEconomy(W, { seed: 5, secondsPerDay: SEC_PER_DAY, state: a.snapshot() });
    for (let i = 0; i < 300; i++) { a.step(0.5); b.step(0.5); }
    assert.equal(JSON.stringify(a.snapshot()), JSON.stringify(b.snapshot()), 'snapshot restores');
}

for (const [i, { eco, log, goal0, worstPrice, snap }] of runs.entries()) {
    const seed = SEEDS[i];
    const agents = [...eco.agents.values()];
    const sales = log.trade.filter(m => m.action === 'sell');
    assertNoNaN(snap, `seed${seed}`);

    assert.ok(agents.every(a => a.stats.trips > 0), `seed ${seed}: every agent moved (${agents.filter(a => !a.stats.trips).map(a => a.id)})`);
    const traders = agents.filter(a => a.stats.sales > 0).length;
    assert.ok(traders >= Math.ceil(agents.length * 0.7), `seed ${seed}: most agents traded (${traders}/${agents.length})`);
    assert.ok(sales.some(m => m.crossEra), `seed ${seed}: cross-era trades`);
    assert.ok(worstPrice.lo >= 0.2 && worstPrice.hi <= 5, `seed ${seed}: prices within [0.2, 5]× base (${worstPrice.lo.toFixed(2)}–${worstPrice.hi.toFixed(2)})`);
    assert.ok(log.event.length > 0, `seed ${seed}: events fire`);

    // settlements: exactly 明け六つ and 暮れ六つ on each day
    // The run starts just before 明け六つ of day 1 and lasts DAYS days; spring
    // dawns come earlier each day, so day DAYS+1 may already have its dawn.
    assert.equal(log.settle.filter(m => m.day <= DAYS).length, DAYS * 2, `seed ${seed}: settlements`);
    assert.ok(log.settle.filter(m => m.day > DAYS).every(m => m.kind === 'dawn'));
    for (let d = 1; d <= DAYS; d++) {
        const kinds = log.settle.filter(m => m.day === d).map(m => m.kind);
        assert.deepEqual(kinds, ['dawn', 'dusk'], `seed ${seed}: day ${d} settles`);
    }
    assert.ok(log.settle.every(m => /^(明け|暮れ)六つの決算/.test(m.message)));

    const mean = xs => xs.reduce((s, x) => s + x, 0) / xs.length;
    const goal1 = agents.map(a => a.goalProgress);
    assert.ok(mean(goal1) > mean(goal0), `seed ${seed}: goals progress`);
    assert.ok(goal1.filter(p => p > 0).length >= agents.length / 2, `seed ${seed}: most goals moved`);
    assert.ok(goal1.every(p => p >= 0 && p <= 1));

    // agents are never parked forever: every one is in a valid stage and recently acted
    const stages = new Set(['idle', 'react', 'think', 'travel', 'trade']);
    assert.ok(agents.every(a => stages.has(a.stage)));
    assert.ok(log.depart.length > 0 && log.arrive.length > 0);
    for (const m of [...log.trade, ...log.event, ...log.depart, ...log.arrive, ...log.goal]) {
        assert.ok(typeof m.message === 'string' && m.message.length > 0 && !/undefined|NaN/.test(m.message), m.message);
    }
}

// ---- summary
const { eco, log } = runs[0];
const sales = log.trade.filter(m => m.action === 'sell');
const vias = {};
for (const m of log.depart) vias[m.via] = (vias[m.via] || 0) + 1;
const rich = [...eco.agents.values()].sort((a, b) => b.stats.profit - a.stats.profit).slice(0, 3);
console.log(`sim.test: ${SEEDS.length} seeds × ${DAYS} days, ${eco.agents.size} agents, ${W.districts.length} districts, ${W.goods.length} goods — all assertions passed`);
for (const [i, r] of runs.entries()) {
    const s = r.log.trade.filter(m => m.action === 'sell');
    console.log(`  seed ${SEEDS[i]}: ${s.length} sales (${s.filter(m => m.crossEra).length} cross-era), ` +
        `${r.log.trade.filter(m => m.action === 'buy').length} buys, ${r.log.trade.filter(m => m.action === 'craft').length} crafts, ` +
        `${r.log.event.length} events, ${r.log.goal.length} goal milestones, prices ${r.worstPrice.lo.toFixed(2)}–${r.worstPrice.hi.toFixed(2)}× base`);
}
// Routes keep their direction: opposite routes between the same districts keep their own vehicles.
{
    const ix = indexRoutes([{ id: 'out', from: 'a', to: 'b', via: 'oshie' }, { id: 'back', from: 'b', to: 'a', via: 'ginga_tetsudo' }, { id: 'one', from: 'c', to: 'd', via: 'torii' }]);
    assert.equal(routeBetween(ix, 'a', 'b').id, 'out');
    assert.equal(routeBetween(ix, 'b', 'a').id, 'back');
    assert.equal(routeBetween(ix, 'd', 'c').id, 'one', 'a one-way route can be ridden back');
    assert.equal(routeBetween(ix, 'a', 'c'), null);
}

console.log(`  seed 1 travel: ${Object.entries(vias).map(([v, n]) => `${v} ${n}`).join(', ')}`);
console.log(`  seed 1 top earners: ${rich.map(a => `${a.name} +${Math.round(a.stats.profit)}`).join(', ')}`);
console.log(`  feed sample:`);
for (const m of [sales[0], sales[Math.floor(sales.length / 2)], log.event[0], log.settle[1], log.goal[0]].filter(Boolean)) {
    console.log(`    [${m.day}日 ${m.label}] ${m.message}`);
}
