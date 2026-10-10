import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { createHistory } from '../js/history.js';
import { createStories } from '../js/character-stories.js';
import { CHARACTER_PROFILES } from '../js/character-profiles.js';
import { validateJourney, loadJourney, saveJourney, journeyKey } from '../js/journey-save.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const raw = {};
for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = JSON.parse(readFileSync(join(root, stem + '.json')));
const W = buildWorld(raw), eco = createEconomy(W, { seed: 1 });
assert.deepEqual(new Set(Object.keys(CHARACTER_PROFILES)), new Set(W.agents.map(a => a.id)));
eco.step(150);
const stories = createStories(W, eco);
assert.equal(stories.arc('dogu').stage, 0);
for (const a of W.agents) {
    assert.ok(stories.talk(a.id, 'あなたの望みは？').includes(CHARACTER_PROFILES[a.id].wish));
    assert.equal(stories.person(a.id).trust, 0, 'chat does not award growth');
}
assert.match(stories.talk('dogu', 'こんにちは'), /縄目/);
assert.match(stories.talk('kamifuda', 'こんにちは'), /紙の端/);
assert.match(stories.talk('zero', '何でも作って'), /何を確かめ/);
assert.equal(stories.request('zashiki', 'guide').ok, false);
assert.equal(stories.request('chahakobi', 'message', { recipient: 'zero', body: 'よろしく' }).ok, false);
assert.match(stories.talk('kitsune', '生き物を捕まえて'), /受けません/);
const id = W.agents.find(a => a.id !== 'zashiki' && eco.agents.get(a.id).at !== a.home)?.id;
assert.ok(id, 'an actual traveller exists after warmup');
const result = stories.request(id, 'observe');
assert.ok(result.ok);
assert.equal(stories.person(id).trust, 0, 'acceptance is not success');
assert.equal(stories.request(id, 'guide').ok, false, 'only one pending slot');
let travelSnapshot;
for (let i = 0; i < 240 * 4; i++) {
    eco.step(1);
    if (eco.agents.get(id).plan?.request && eco.agents.get(id).stage === 'travel') {
        assert.equal(eco.queueRequest(id, result.request).ok, false, 'active ID duplicate refused');
        assert.ok(stories.request(id, 'guide').ok, 'one queued request can wait behind an active request');
        assert.equal(stories.request(id, 'guide').ok, false, 'second pending request refused');
        travelSnapshot = { v: 1, seed: 1, economy: eco.snapshot(), stories: stories.snapshot() }; break;
    }
}
assert.ok(travelSnapshot, 'request uses actual travel');
validateJourney(travelSnapshot, W, 1);
const restored = createEconomy(W, { state: travelSnapshot.economy, seed: 1 });
const restoredStories = createStories(W, restored, travelSnapshot.stories);
assert.equal(restored.time, eco.time, 'restore does not warm up or advance the clock');
assert.deepEqual(restored.agents.get(id).trip, eco.agents.get(id).trip);
for (let i = 0; i < 1200; i++) { eco.step(1); restored.step(1); if (stories.person(id).requests[0].status === 'done') break; }
assert.equal(stories.person(id).requests[0].status, 'done');
assert.equal(eco.agents.get(id).at, W.byId.agent.get(id).home, 'real arrival precedes success');
assert.deepEqual(eco.snapshot(), restored.snapshot(), 'snapshot restores deterministic live state');
assert.deepEqual(stories.snapshot(), restoredStories.snapshot(), 'restored story has one identical result');
assert.equal(stories.person(id).trust, 1);
assert.equal(stories.person(id).practice, travelSnapshot.stories.people[id].practice + 1);
assert.equal(stories.arc(id).stage, 1);
assert.match(stories.talk(id, '最近の気持ちは？'), /初めて結んだ約束/);
const done = stories.person(id).chronicle.find(x => x.type === 'request' && x.text.includes('完了'));
stories.handleEvent({ seq: done.seq, type: 'request', agent: id, request: result.request.id, status: 'done' });
assert.equal(stories.person(id).trust, 1, 'duplicate event does not reward twice');
assert.equal(eco.queueRequest(id, result.request).ok, false, 'completed request ID cannot be reused');
const messageAgent = 'kamifuda', recipient = W.byId.agent.get(messageAgent).relationships[0].agent;
assert.ok(stories.request(messageAgent, 'message', { recipient, body: '次の星図を一緒に。' }).ok);
let deposited = false, received = false;
eco.on('request', e => { if (e.agent === messageAgent && e.kind === 'message' && e.status === 'done') deposited = true; });
eco.on('message-received', e => { if (e.agent === recipient) { received = true; assert.equal(eco.agents.get(recipient).at, eco.agents.get(recipient).home); } });
for (let i = 0; i < 2000; i++) { eco.step(1); if (received) break; }
assert.ok(deposited && received, 'deposit and recipient homecoming are separate real events');
assert.equal(stories.person(recipient).bonds[messageAgent], 1);
const recipientLive = eco.agents.get(recipient), oldInbox = recipientLive.inbox;
recipientLive.inbox = Array.from({ length: 64 }, (_, i) => ({ id: `old-${i}`, from: messageAgent, body: '待つ伝言', deposited: eco.time }));
assert.equal(stories.request(messageAgent, 'message', { recipient, body: '次の便' }).ok, false, 'full mailbox refuses instead of discarding accepted letters');
recipientLive.inbox = oldInbox || [];
const memory = new Map(), storage = { getItem: k => memory.get(k) || null, setItem: (k, v) => memory.set(k, v) };
const history = createHistory(eco);
for (let i = 0; i < 72; i++) { eco.step(5); history.sample(); }
assert.ok(saveJourney(storage, 1, eco, stories, history).ok);
assert.ok(loadJourney(storage, W, 1).data);
const historyRestored = createHistory(eco, loadJourney(storage, W, 1).data.history);
assert.deepEqual(historyRestored.snapshot(), history.snapshot());
console.log('72-point full-world save UTF-16 storage size:', memory.get(journeyKey(1)).length * 2, 'bytes');
const parsed = JSON.parse(memory.get(journeyKey(1)));
parsed.economy.agents[0].trip = null; parsed.economy.agents[0].stage = 'travel';
assert.throws(() => validateJourney(parsed, W, 1));
memory.set(journeyKey(1), '{broken');
assert.equal(loadJourney(storage, W, 1).blocked, true);
assert.equal(memory.get(journeyKey(1)), '{broken', 'bad save is not overwritten');
const fail = { getItem() { throw Error(); }, setItem() { throw Error(); } };
assert.equal(loadJourney(fail, W, 1).blocked, true);
assert.equal(saveJourney(fail, 1, eco, stories).ok, false);
console.log('32 profiles; real requests, travel/continuation, refusal, deposit/receipt, duplicate and save checks passed.');
