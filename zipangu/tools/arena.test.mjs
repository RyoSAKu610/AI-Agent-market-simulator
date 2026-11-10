// 🏟 The arena's tables and head-to-head (js/arena.js), on made-up residents and on the real city.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { worthOf, standings, createBoard, rivalry, METRICS } from '../js/arena.js';

const mk = (id, o = {}) => ({ id, wallet: 100, startWorth: 100, carrying: [], goalProgress: 0, stats: { sales: 0, buys: 0 }, trip: null, ...o });
const city = list => new Map(list.map(a => [a.id, a]));

assert.equal(worthOf(mk('a', { wallet: 50, carrying: [{ good: 'tea', qty: 3, cost: 10 }] })), 80, 'wallet plus cargo at cost');

// the three tables
{
    const c = city([mk('a', { wallet: 150 }), mk('b', { wallet: 90, goalProgress: 0.9, stats: { sales: 4, buys: 5 } }), mk('c', { wallet: 150, goalProgress: 2 })]);
    assert.deepEqual(standings(c, 'gain').map(r => [r.id, r.value, r.rank]), [['a', 50, 1], ['c', 50, 2], ['b', -10, 3]], 'ties keep the roster order');
    assert.deepEqual(standings(c, 'goal').map(r => r.id), ['c', 'b', 'a']);
    assert.equal(standings(c, 'goal')[0].value, 1, 'goal progress is capped at 100%');
    assert.deepEqual(standings(c, 'trades').map(r => [r.id, r.value]), [['b', 9], ['a', 0], ['c', 0]]);
    assert.deepEqual(standings(c, 'nonsense'), standings(c, 'gain'));
}
// rank changes: first look shows none, then how many places each row moved; tables are kept apart
{
    const a = mk('a', { wallet: 300 }), b = mk('b', { wallet: 200 }), c3 = mk('c', { wallet: 100 });
    const c = city([a, b, c3]), board = createBoard();
    assert.ok(board.update(c, 'gain').every(r => r.moved === 0));
    c3.wallet = 400;
    assert.deepEqual(board.update(c, 'gain').map(r => [r.id, r.moved]), [['c', 2], ['a', -1], ['b', -1]]);
    assert.ok(board.update(c, 'gain').every(r => r.moved === 0), 'no change, no arrows');
    assert.ok(board.update(c, 'trades').every(r => r.moved === 0), 'another table starts fresh');
}
// the head-to-head
{
    assert.equal(rivalry(city([mk('a')])), null);
    const lead = rivalry(city([mk('a', { wallet: 120 }), mk('b', { wallet: 180 }), mk('c')]));
    assert.deepEqual(lead, { kind: 'lead', a: 'b', b: 'a', what: null, av: 80, bv: 20, gap: 60 });
    const goods = rivalry(city([mk('a', { carrying: [{ good: 'silk', qty: 2, cost: 5 }] }), mk('b', { carrying: [{ good: 'tea', qty: 1, cost: 1 }, { good: 'silk', qty: 5, cost: 5 }] }), mk('c', { wallet: 999 })]));
    assert.deepEqual([goods.kind, goods.a, goods.b, goods.what, goods.av, goods.bv, goods.gap], ['goods', 'b', 'a', 'silk', 5, 2, 3]);
    const race = rivalry(city([
        mk('a', { trip: { to: 'edo', prog: 0.2 } }), mk('b', { trip: { to: 'kyo', prog: 0.5 } }), mk('c', { trip: { to: 'edo', prog: 0.7 } }),
        mk('d', { trip: { to: 'kyo', prog: 0.55 } }), mk('e', { carrying: [{ good: 'silk', qty: 1, cost: 1 }] }), mk('f', { carrying: [{ good: 'silk', qty: 1, cost: 1 }] })]));
    assert.equal(race.kind, 'race', 'a race on the road comes before shared cargo');
    assert.deepEqual([race.a, race.b, race.what], ['d', 'b', 'kyo'], 'the closest race, leader first');
    assert.ok(Math.abs(race.gap - 0.05) < 1e-9);
}
// on the real city: every resident is ranked once in each table and the rivalry names two of them
{
    const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world'), raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = JSON.parse(readFileSync(join(root, stem + '.json')));
    const W = buildWorld(raw), eco = createEconomy(W, { seed: 5 }), board = createBoard();
    const kinds = new Set();
    for (let i = 0; i < 600; i++) {
        eco.step(0.5);
        for (const m of Object.keys(METRICS)) {
            const rows = board.update(eco.agents, m);
            assert.equal(new Set(rows.map(r => r.id)).size, eco.agents.size);
            assert.deepEqual(rows.map(r => r.rank), rows.map((_, k) => k + 1));
            assert.ok(rows.every((r, k) => Number.isFinite(r.value) && (k === 0 || rows[k - 1].value >= r.value)));
        }
        const r = rivalry(eco.agents);
        kinds.add(r.kind);
        assert.ok(eco.agents.has(r.a) && eco.agents.has(r.b) && r.a !== r.b && r.gap >= 0 && r.av >= r.bv);
        if (r.kind === 'race') assert.ok(W.byId.district.has(r.what));
        if (r.kind === 'goods') assert.ok(W.byId.good.has(r.what));
    }
    assert.ok(kinds.has('race'), 'residents do race each other to the same district');
    console.log(`arena tests passed (rivalries seen: ${[...kinds].join(', ')})`);
}
