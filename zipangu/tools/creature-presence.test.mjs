// Direct canonical-condition and real simulation-event boundary tests.
// Run: node tools/creature-presence.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// As in visuals.test.mjs, load browser modules without changing a parent
// package's CommonJS setting or writing temporary copies to the repository.
const moduleUrl = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const js = name => readFileSync(new URL('../js/' + name + '.js', import.meta.url), 'utf8');
const simUrl = moduleUrl(js('sim'));
const { buildWorld } = await import(moduleUrl(js('data')));
const { clockAt, createEconomy } = await import(simUrl);
const { creaturePresence } = await import(moduleUrl(js('creature-presence').replace("'./sim.js'", JSON.stringify(simUrl))));

const read = stem => JSON.parse(readFileSync(new URL('../world/' + stem + '.json', import.meta.url), 'utf8'));
const raw = Object.fromEntries(['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library'].map(k => [k, read(k)]));
const W = buildWorld(raw);
const firstCrow = W.byId.event.get('hiraizumi_kinkei_hatsunaki');
assert.ok(firstCrow.creatures.includes('hiraizumi_kinkei'));

const at = (id, T, offset = 4, activeEvents = []) => creaturePresence(id, { clock: clockAt(T, offset), time: T, activeEvents });
const midKoku = (day, slot, offset) => {
    const c = clockAt(day + 0.5, offset);
    return day + (slot < 6 ? c.dawn + (slot + 0.5) * c.daylight / 6 : c.dusk + (slot - 6 + 0.5) * (1 - c.daylight) / 6);
};

// Every seasonal boundary is driven by the real SEKKI order, not Date.
for (let sk = 0; sk < 24; sk++) {
    assert.equal(at('icho_dori', 0.5, sk).present, sk >= 16 && sk <= 18, 'ginkgo seasonal day ' + sk);
    assert.equal(at('tono_shijima_usagi', 0.5, sk).present, sk === 4, 'quiet rabbit bloom day ' + sk);
}
assert.equal(at('icho_dori', 1 - 1e-7, 18).present, true);
assert.equal(at('icho_dori', 1, 18).present, false, '小雪 boundary after canonical 立冬 migration');
assert.equal(at('tono_shijima_usagi', 1 - 1e-7, 4).present, true);
assert.equal(at('tono_shijima_usagi', 1, 4).present, false, '穀雨 boundary');

// Floating shachi only during dawn/dusk in both unequal-season clocks.
for (const sk of [9, 21]) {
    for (let slot = 0; slot < 12; slot++) assert.equal(at('tenshu_shachi', midKoku(0, slot, sk), sk).present, slot === 0 || slot === 6);
    const c = clockAt(0.5, sk);
    assert.equal(at('tenshu_shachi', c.dawn - 1e-7, sk).present, false);
    assert.equal(at('tenshu_shachi', c.dawn + 1e-7, sk).present, true);
    assert.equal(at('tenshu_shachi', c.dusk - 1e-7, sk).present, false);
    assert.equal(at('tenshu_shachi', c.dusk + 1e-7, sk).present, true);
}

// The real event wrapper lasts two days. It must not create two dawn crows.
for (const sk of [4, 21, 23]) {
    const dawn = clockAt(0.5, sk).dawn;
    for (const startedAt of [dawn - 0.01, dawn + 0.01]) {
        const ev = { event: firstCrow, startedAt, endsAt: startedAt + 2 };
        const day = startedAt < dawn ? 0 : 1;
        assert.equal(at('hiraizumi_kinkei', midKoku(day, 0, sk), sk, [ev]).present, true);
        assert.equal(at('hiraizumi_kinkei', midKoku(day + 1, 0, sk), sk, [ev]).present, false, 'second dawn hidden');
        assert.equal(at('hiraizumi_kinkei', midKoku(day, 1, sk), sk, [ev]).present, false, 'after dawn hidden');
        assert.equal(at('hiraizumi_kinkei', midKoku(day, 0, sk), sk).present, false, 'no festival hidden');
        assert.equal(at('hiraizumi_kinkei', midKoku(day, 0, sk), sk, [{ ...ev, endsAt: midKoku(day, 0, sk) }]).present, false, 'ended festival hidden');
    }
}

// Verify that an actual scheduler-produced event reaches exactly one dawn,
// rather than depending on a hypothetical added festival flag.
const eco = createEconomy(W, { seed: 1, secondsPerDay: 240 });
const seen = new Set();
let sawEvent = false;
for (let i = 0; i < 26 * 288; i++) {
    eco.step(240 / 288);
    const festival = eco.activeEvents.find(a => a.event.id === firstCrow.id);
    if (festival) sawEvent = true;
    const result = creaturePresence('hiraizumi_kinkei', { clock: eco.clock, activeEvents: eco.activeEvents, time: eco.time });
    if (result.present) {
        assert.ok(festival);
        assert.equal(eco.clock.koku, 0);
        seen.add(eco.clock.day);
    }
}
assert.ok(sawEvent, 'existing calendar produced first-crow festival');
assert.equal(seen.size, 1, 'one visible dawn per actual yearly festival');
assert.equal(creaturePresence('fumi_uo').present, true, 'general activity belongs to map');
for (const id of ['hiraizumi_kinkei', 'icho_dori', 'tono_shijima_usagi', 'tenshu_shachi']) {
    const result = creaturePresence(id);
    assert.equal(result.present, false, 'unknown clock does not invent a special event');
    assert.ok(result.reason && result.viewingNote);
}
console.log('creature-presence: seasonal/dawn/event boundaries and real yearly calendar passed');
