// The map's live camera (js/live-director.js): everyone gets on screen, news jumps the
// queue but never starves anyone, and each shot shows a resident where they really are,
// in the pose of what they are doing, with a caption that really happened.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { visualOf } from '../js/visual-manifest.js';
import { pickNext, createDirector, shotFor, captionFor, whereabouts, CUT_SECONDS, FRESH_DAYS } from '../js/live-director.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world'), raw = {};
for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = JSON.parse(readFileSync(join(root, stem + '.json')));
const W = buildWorld(raw), eco = createEconomy(W, { seed: 77 });
const roster = [...eco.agents.keys()];
assert.equal(CUT_SECONDS, 5, 'a cut every five seconds');

// ------------------------------------------------ who is on screen
// With no news, one full round shows every resident exactly once, in roster order.
{
    const d = createDirector();
    let cur = null;
    const seen = [];
    for (let i = 0; i < roster.length; i++) { cur = d.next(roster, cur); seen.push(cur); }
    assert.deepEqual(seen, roster, 'a quiet city is a round-robin');
    assert.notEqual(d.next(roster, cur), cur, 'never the same resident twice in a row');
}
// News jumps the queue…
{
    const d = createDirector();
    let cur = d.next(roster, null);
    const busy = roster[roster.length - 1];
    d.note({ type: 'trade', agent: busy, T: 0, message: 'x' });
    cur = d.next(roster, cur);
    assert.equal(cur, busy, 'a resident with news is shown next');
    d.note({ type: 'price', agent: roster[5], T: 0 });
    assert.notEqual(d.next(roster, cur), roster[5], 'events that are not news do not jump the queue');
}
// …both sides of an encounter count, and news already shown live is not news again.
{
    const d = createDirector();
    const [a, b] = [roster[10], roster[20]];
    let cur = d.next(roster, null);
    d.note({ type: 'encounter', agent: a, other: b });
    const two = [d.next(roster, cur), d.next(roster, a)];
    assert.deepEqual(new Set(two), new Set([a, b]));
    cur = two[1];
    d.note({ type: 'trade', agent: cur });              // happens while on screen
    const after = d.next(roster, cur);
    assert.ok(after !== a && after !== b, 'shown news is not news again');
}
// A city full of news still shows everybody within two rounds.
{
    const d = createDirector();
    let cur = null;
    const lastSeen = new Map();
    for (let cut = 1; cut <= roster.length * 8; cut++) {
        d.note({ type: 'trade', agent: roster[cut % 3] });   // three loud residents, every cut
        cur = d.next(roster, cur);
        lastSeen.set(cur, cut);
        if (cut > roster.length * 3) for (const id of roster) assert.ok(cut - lastSeen.get(id) <= roster.length * 2 + 1, `${id} is not starved`);
    }
}
assert.equal(pickNext([], {}), null);
assert.equal(pickNext(['solo'], { current: 'solo' }), 'solo', 'one resident keeps the screen');

// ------------------------------------------------ framing a shot
eco.step(3);
let travelling = 0, trading = 0;
for (let i = 0; i < 400 && !(travelling && trading); i++) {
    eco.step(0.05);
    for (const live of eco.agents.values()) {
        const s = shotFor(W, live, i);
        const district = whereabouts(live);
        assert.ok(W.byId.district.has(district), `${live.id} stands somewhere real`);
        assert.equal(s.place, W.placeOf(district).id, 'the background is the place they are in (or heading to)');
        assert.ok(visualOf(s.placeKind, s.place), `${s.place} has a painting to stand in front of`);
        assert.ok(visualOf('agent', live.id).poses, `${live.id} has a pose sheet`);
        assert.equal(s.frame, { think: 1, travel: 2, trade: 3 }[live.stage] || 0, 'the pose matches the map and the atelier');
        assert.ok(['left', 'center', 'right'].includes(s.side));
        if (live.stage === 'travel') { travelling++; assert.equal(s.place, W.placeOf(live.trip.to).id, 'on the road: the destination'); assert.equal(s.move, 'track'); }
        if (live.stage === 'trade') { trading++; assert.equal(s.close, true, 'a hand-over is a close shot'); }
    }
}
assert.ok(travelling && trading, 'the run saw residents on the road and at the counter');
assert.equal(new Set([0, 1, 2].map(cut => shotFor(W, { id: 'x', stage: 'idle', home: roster.length && eco.agents.get(roster[0]).home }, cut).side)).size, 3, 'quiet shots change angle cut to cut');

// ------------------------------------------------ the caption is always something that happened
{
    const live = { id: 'a', activity: '茶を運んでいる', stage: 'idle' };
    assert.deepEqual(captionFor(live, null, 10), { kind: 'activity', text: '茶を運んでいる' });
    const news = { cut: 3, msg: { type: 'trade', T: 10, message: 'A が B を売った' } };
    assert.deepEqual(captionFor(live, news, 10 + FRESH_DAYS / 2), { kind: 'news', text: 'A が B を売った' });
    assert.equal(captionFor(live, news, 10 + FRESH_DAYS * 2).kind, 'activity', 'old news gives way to what they do now');
    const thinking = { ...live, thought: { text: '月の道を確かめたい', T: 10 } };
    assert.deepEqual(captionFor(thinking, news, 10.01), { kind: 'voice', text: '月の道を確かめたい' }, 'a fresh inner voice comes first');
    assert.equal(captionFor({ ...live, thought: { text: '', T: 10 } }, null, 10).kind, 'activity', 'an empty thought is not a voice');
}

console.log(`live camera: ${roster.length} residents rotate, news first without starving anyone, shots framed where they are — passed`);
