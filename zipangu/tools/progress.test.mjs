// 📖 The traveller's journal (js/progress.js) and hidden residents (world/hidden.json):
// ranks grow with play, badges fill in, the おみくじ is random but fair, hidden
// residents appear only when their time, place, season and deeds allow, and a met
// one joins the running economy and every later journey.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { saveJourney, loadJourney } from '../js/journey-save.js';
import { createStories } from '../js/character-stories.js';
import { createHistory } from '../js/history.js';
import {
    RANKS, LUCK, freshProgress, cleanProgress, loadProgress, saveProgress, pointsOf, rankOf, badgeList,
    drawFortune, eligible, chanceOf, needsMet, joinHidden, createProgress, localDate
} from '../js/progress.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const load = () => {
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library', 'hidden']) raw[stem] = JSON.parse(readFileSync(join(root, stem + '.json')));
    return buildWorld(raw);
};
const W = load();
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const seq = values => { let i = 0; return () => values[i++ % values.length]; };

// ------------------------------------------------ the world's hidden residents
assert.ok(W.hidden.length >= 6, 'hidden residents are loaded');
for (const d of W.hidden) {
    assert.ok(!W.byId.agent.has(d.id), `${d.id} is not in the city before it is met`);
    assert.ok(W.byId.district.has(d.home));
}
assert.equal(buildWorld({}).hidden.length, 0, 'a world without hidden.json simply has none');

// ------------------------------------------------ ranks and points
assert.equal(rankOf(0).name, RANKS[0].name);
assert.equal(rankOf(RANKS[1].at).index, 1);
assert.equal(rankOf(RANKS.at(-1).at + 99999).next, null);
const fresh = freshProgress();
assert.equal(pointsOf(fresh), 0);
assert.ok(pointsOf({ ...fresh, seconds: 600 }) === 10, 'a minute of watching is one 縁');

// ------------------------------------------------ cleaning what is read back
const odd = cleanProgress({ v: 1, seconds: -5, days: 'x', seen: { creature: ['ok_id', '<img>', 'ok_id'], bogus: ['a'] }, count: { trades: 1e20 }, badges: { '<x>': 1, good: '2026' }, fortune: { date: 'today', luck: '大吉', place: 'x' } });
assert.equal(odd.seconds, 0);
assert.deepEqual(odd.seen.creature, ['ok_id'], 'ids only, deduplicated');
assert.equal(odd.count.trades, 1e12, 'capped');
assert.deepEqual(Object.keys(odd.badges), ['good']);
assert.equal(odd.fortune, null, 'a malformed fortune is dropped');
{ const c = cleanProgress('nonsense'); assert.equal(c.v, 1); assert.equal(c.seconds, 0); assert.deepEqual(c.found, {}); }
{
    const st = memStore();
    assert.ok(saveProgress(st, { ...fresh, seconds: 120 }));
    assert.equal(loadProgress(st).seconds, 120);
    st.setItem('zipangu.progress.v1', '{broken');
    assert.equal(loadProgress(st).seconds, 0);
}

// ------------------------------------------------ the 発見帖
{
    const b = badgeList(W, fresh, {});
    assert.ok(b.length >= 20 && new Set(b.map(x => x.id)).size === b.length);
    assert.ok(b.every(x => !x.done), 'nothing is done on day one');
    const later = { ...freshProgress(), days: 30, seconds: 4 * 3600, count: { trades: 1200, thoughts: 1, events: 0, goals: 0, fortunes: 0, daikichi: 0 } };
    const done = new Set(badgeList(W, later, { cards: 1, onChain: 0 }).filter(x => x.done).map(x => x.id));
    for (const id of ['day_one', 'week', 'seasons', 'long_watch', 'trades_100', 'trades_1000', 'thought_1', 'summon_1']) assert.ok(done.has(id), id);
    assert.ok(!done.has('trades_10000') && !done.has('birth_chain'));
}

// ------------------------------------------------ おみくじ
{
    const counts = Object.fromEntries(LUCK.map(l => [l.name, 0]));
    for (let i = 0; i < 4000; i++) counts[drawFortune(W).luck]++;
    for (const l of LUCK) assert.ok(Math.abs(counts[l.name] / 4000 - l.weight / 100) < 0.04, `${l.name} ≈ ${l.weight}%`);
    assert.equal(LUCK.reduce((s, l) => s + l.weight, 0), 100);
    const f = drawFortune(W, seq([0.01, 0.5, 0.5]));
    assert.equal(f.luck, '大吉');
    assert.ok(W.byId.place.has(f.place) && W.byId.good.has(f.good));
}

// ------------------------------------------------ when a hidden resident may appear
const ginko = W.byId.hidden.get('hidden_ginko');
const hoshina = W.byId.hidden.get('hidden_hoshina');
const aozora = W.byId.hidden.get('hidden_aozora');
const beni = W.byId.hidden.get('hidden_beni');
const dusk = { koku: 6, isNight: true, season: '春' }, noon = { koku: 3, isNight: false, season: '春' }, midnight = { koku: 9, isNight: true, season: '春' };
assert.equal(eligible(ginko, fresh, 0, dusk), false, 'not before its rank');
assert.equal(eligible(ginko, fresh, 1, dusk), true, 'at twilight');
assert.equal(eligible(ginko, fresh, 1, noon), false, 'not at noon');
assert.equal(eligible(hoshina, fresh, 2, noon), false, 'the night conductor sleeps by day');
assert.equal(eligible(hoshina, fresh, 2, midnight), true);
assert.equal(eligible(beni, fresh, 1, noon), false, 'summer only');
assert.equal(eligible(beni, fresh, 1, { ...noon, season: '夏' }), true);
assert.equal(needsMet(aozora, fresh), false, 'the librarian waits for five works read');
assert.equal(needsMet(aozora, { ...fresh, seen: { ...fresh.seen, work: ['a', 'b', 'c', 'd', 'e'] } }), true);
assert.equal(eligible(ginko, { ...fresh, found: { hidden_ginko: 'x' } }, 1, dusk), false, 'met once, never again');
// place-bound residents show themselves to those who go there; a lucky day helps
assert.ok(chanceOf(hoshina, fresh, midnight, { here: 'ginga_tetsudo' }) > chanceOf(hoshina, fresh, midnight, { here: 'tono' }));
const lucky = { ...fresh, fortune: { date: '2026-10-13', luck: '大吉', place: 'tono', good: null, draws: 1 } };
assert.ok(chanceOf(ginko, lucky, dusk, { today: '2026-10-13' }) > chanceOf(ginko, fresh, dusk, { today: '2026-10-13' }));
assert.equal(chanceOf(ginko, lucky, dusk, { today: '2026-10-14' }), chanceOf(ginko, fresh, dusk, { today: '2026-10-14' }), 'yesterday’s luck has run out');
const kyou = { ...fresh, fortune: { date: '2026-10-13', luck: '凶', place: 'tono', good: null, draws: 1 } };
assert.ok(chanceOf(ginko, kyou, dusk, { today: '2026-10-13' }) > chanceOf(ginko, fresh, dusk, { today: '2026-10-13' }), '凶 has a night-side luck');

// ------------------------------------------------ the running journal
{
    const st = memStore();
    let t = 0;
    const events = [];
    const pr = createProgress(W, { storage: st, random: () => 0.99, now: () => `T${++t}`, today: () => '2026-10-13' });
    pr.on((type, data) => events.push([type, data && (data.id || data.name || data.luck)]));
    assert.equal(pr.canDraw(), false, 'the おみくじ opens at the second rank');
    assert.equal(pr.see('creature', 'x_1'), true);
    assert.equal(pr.see('creature', 'x_1'), false, 'seen once');
    assert.equal(pr.see('nonsense', 'x'), false);
    for (let i = 0; i < 30; i++) pr.see('creature', 'c_' + i);
    assert.ok(pr.rank.index >= 1, `rank grows with discoveries (${pr.rank.points} 縁)`);
    assert.ok(events.some(e => e[0] === 'badge' && e[1] === 'creatures_10'));
    assert.ok(events.some(e => e[0] === 'rank'));
    // watching: seconds and in-world days
    pr.tick(1, { day: 5 }); pr.tick(1, { day: 6 }); pr.tick(1, { day: 9 });
    assert.equal(pr.state.days, 4);
    pr.tick(1, { day: 2 });   // a new journey starts again at day 2: no days are lost or invented
    assert.equal(pr.state.days, 4);
    // the おみくじ
    assert.equal(pr.canDraw(), true);
    const f = pr.draw();
    assert.ok(f && f.date === '2026-10-13');
    assert.equal(pr.canDraw(), false, 'once a day below the fourth rank');
    assert.equal(pr.draw(), null);
    // the dice never fall: the pity rule still brings someone after enough tries
    let met = null, tries = 0;
    while (!met && tries < 100) { met = pr.encounter(dusk); tries++; }
    assert.ok(met, 'someone appears in the end');
    assert.ok(tries <= 40, `pity after ${tries} tries`);
    assert.ok(pr.state.found[met.id]);
    assert.ok(events.some(e => e[0] === 'hidden'));
    pr.save();
    assert.ok(loadProgress(st).found[met.id], 'saved');
    // lucky dice: the first eligible one appears at once
    const pr2 = createProgress(W, { storage: memStore(), random: () => 0, today: () => '2026-10-13' });
    for (let i = 0; i < 40; i++) pr2.see('creature', 'k_' + i);
    assert.ok(pr2.encounter(dusk));
    assert.equal(pr2.encounter(noon), null, 'nobody is eligible at noon in spring for this rank');
}

// ------------------------------------------------ a met resident joins the city and later journeys
{
    const W1 = load();
    const eco = createEconomy(W1, { seed: 3 });
    eco.step(30);
    const storiesBefore = createStories(W1, eco);     // the page's stories exist before anyone hidden arrives
    const def = W1.byId.hidden.get('hidden_kogane');
    const arrived = [];
    eco.on('arrive-new', m => arrived.push(m.agent));
    const a = joinHidden(W1, def);
    assert.ok(a.hiddenResident && W1.byId.agent.has(def.id));
    assert.ok(!('appear' in a) && !('hint' in a), 'only the resident joins, not its secret');
    assert.ok(eco.addResident(a));
    assert.equal(eco.addResident(a), null, 'once');
    assert.deepEqual(arrived, ['hidden_kogane']);
    assert.ok(storiesBefore.talk('hidden_kogane', 'こんにちは').length > 0, 'a newcomer met mid-session can be talked to at once');
    for (let i = 0; i < 300; i++) eco.step(1);
    const live = eco.agents.get('hidden_kogane');
    assert.ok(Number.isFinite(live.wallet) && live.wallet >= 0 && live.stats.trips + live.stats.sales + live.stats.buys >= 0);
    const st = memStore();
    saveJourney(st, 3, eco, createStories(W1, eco), createHistory(eco));
    // next visit: the met resident is added before the journey loads
    const W2 = load();
    joinHidden(W2, W2.byId.hidden.get('hidden_kogane'));
    const loaded = loadJourney(st, W2, 3);
    assert.ok(loaded.data, loaded.status);
    const eco2 = createEconomy(W2, { seed: 3, state: loaded.data.economy });
    assert.ok(eco2.agents.has('hidden_kogane'), 'still in the city');
    // and a journey with them still loads where they were never met (another device, a cleared journal)
    const W3 = load();
    assert.ok(loadJourney(st, W3, 3).data);
}

assert.match(localDate(new Date(2026, 0, 5)), /^2026-01-05$/);
console.log('progress tests passed');
