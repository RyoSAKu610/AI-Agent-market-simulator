// Bringing an outside AI into the world (js/soul.js): reading untrusted soul
// cards, turning them into residents, and keeping saved journeys valid when a
// resident arrives or leaves.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorld } from '../js/data.js';
import { createEconomy } from '../js/sim.js';
import { createHistory } from '../js/history.js';
import { createStories } from '../js/character-stories.js';
import { saveJourney, loadJourney, journeyKey } from '../js/journey-save.js';
import {
    SOUL_MARK, GOALS, summonPrompt, extractJson, cleanText, parseSoul, travellerId, isTraveller,
    toAgentDef, addTravellers, loadCards, saveCards, MAX_TRAVELLERS
} from '../js/soul.js';
import { LANGS, _strings } from '../js/i18n.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const load = () => {
    const raw = {};
    for (const stem of ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library']) raw[stem] = JSON.parse(readFileSync(join(root, stem + '.json')));
    return buildWorld(raw);
};
const W = load();

// ------------------------------------------------ the prompt
for (const [code] of LANGS) {
    const p = summonPrompt(W, code);
    assert.ok(p.includes(SOUL_MARK) && p.includes('"memories"'), `prompt ${code} carries the format`);
    for (const g of Object.keys(GOALS)) assert.ok(p.includes(g), `prompt ${code} lists goal ${g}`);
    assert.ok(W.places.every(pl => p.includes(pl.id)), `prompt ${code} lists every era and realm id`);
}

// every interface string has all six languages
for (const [key, row] of Object.entries(_strings)) assert.equal(row.length, LANGS.length, `i18n ${key}`);

// ------------------------------------------------ reading answers
const reply = `はい、カードです。\n\n${SOUL_MARK}\n\`\`\`json\n${JSON.stringify({
    name: 'ソラ', from: 'Claude', personality: '好奇心が強く、{かっこ} も "引用" も気にしない', specialty: '話を整理すること',
    memories: ['一緒に旅の計画を立てた', '', 3, 'x'.repeat(400)], values: ['誠実さ'], ambition: '時代をまたぐ地図を描く',
    goal: 'knowledge', era: 'meiji_tamamushi', look: '青い光の外套', greeting: 'はじめまして'
})}\n\`\`\`\nよろしくお願いします。`;
assert.ok(extractJson(reply).startsWith('{"name":"ソラ"'));
const ok = parseSoul(reply, W);
assert.equal(ok.ok, true);
assert.equal(ok.card.name, 'ソラ');
assert.equal(ok.card.goal, 'knowledge');
assert.equal(ok.card.era, 'meiji_tamamushi');
assert.deepEqual(ok.card.memories.slice(0, 2), ['一緒に旅の計画を立てた', '3'], 'empty entries dropped, values stringified');
assert.equal(Array.from(ok.card.memories[2]).length, 140, 'memories are capped');

assert.deepEqual(parseSoul('no card here', W), { ok: false, error: 'none' });
assert.deepEqual(parseSoul(`${SOUL_MARK}\n{"name": "x",}`, W), { ok: false, error: 'json' });
assert.deepEqual(parseSoul(`${SOUL_MARK}\n{"name": "  "}`, W), { ok: false, error: 'fields' });
assert.deepEqual(parseSoul(`${SOUL_MARK}\n["name"]`, W), { ok: false, error: 'none' });
const odd = parseSoul(`${SOUL_MARK}{"name":"A\\u0000\\u202eB\\nC","personality":"p","goal":"rule_the_world","era":"atlantis","from":"<script>"}`, W);
assert.equal(odd.card.name, 'A B C', 'control and bidi characters become spaces');
assert.equal(odd.card.goal, 'wealth', 'unknown goal falls back');
assert.equal(odd.card.era, 'reiwa_mangekyo', 'unknown era lands in the 令和 city');
assert.equal(odd.card.from, '<script>', 'kept as text; the page only renders it as text');
assert.equal(cleanText('  a\t\tb  ', 10), 'a b');

// ------------------------------------------------ into the world
const card = { ...ok.card, id: travellerId(ok.card, 'test'), arrived: '2026-10-12' };
assert.ok(isTraveller(card.id) && /^trav_[a-z0-9]+$/.test(card.id));
const def = toAgentDef(W, card);
assert.equal(def.origin, 'traveller');
assert.ok(W.byId.district.has(def.home) && W.byId.place.get('meiji_tamamushi').districts.includes(def.home));
assert.ok(def.long_term_ambition.includes(GOALS.knowledge));
assert.ok(def.favored_goods.every(g => W.byId.good.has(g)));

// storage round trip re-cleans what it reads
const mem = new Map();
const storage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
assert.ok(saveCards(storage, [card, { id: 'evil', name: 'x', personality: 'y' }, { ...card, id: 'trav_zz', name: 'B'.repeat(99) }]));
const back = loadCards(storage, W);
assert.equal(back.length, 2, 'a card with a foreign id is ignored');
assert.equal(Array.from(back[1].name).length, 24);
assert.equal(MAX_TRAVELLERS, 6);

// ------------------------------------------------ journeys survive arrivals and departures
const seed = 7;
const W1 = load();
const eco1 = createEconomy(W1, { seed });
eco1.step(60);
const st1 = createStories(W1, eco1);
saveJourney(storage, seed, eco1, st1, createHistory(eco1));

const W2 = load();
addTravellers(W2, [card]);
assert.ok(W2.byId.agent.has(card.id));
const loaded2 = loadJourney(storage, W2, seed);
assert.ok(loaded2.data, `a journey saved before the AI arrived still loads: ${loaded2.status}`);
const eco2 = createEconomy(W2, { seed, state: loaded2.data.economy });
assert.ok(eco2.agents.has(card.id), 'the newcomer joins the running economy');
const st2 = createStories(W2, eco2, loaded2.data.stories);
assert.ok(st2.talk(card.id, 'こんにちは').length > 0, 'the newcomer can be talked to');
for (let i = 0; i < 240; i++) eco2.step(1);
const live = eco2.agents.get(card.id);
assert.ok(Number.isFinite(live.wallet) && live.wallet >= 0);
saveJourney(storage, seed, eco2, st2, createHistory(eco2));

// the journey saved with the AI loads with it, and without it once it has left
const W3 = load(); addTravellers(W3, [card]);
assert.ok(loadJourney(storage, W3, seed).data, 'reload with the AI');
const W4 = load();
const loaded4 = loadJourney(storage, W4, seed);
assert.ok(loaded4.data, `after the AI leaves the journey still loads: ${loaded4.status}`);
assert.ok(!loaded4.data.economy.agents.some(a => a.id === card.id), 'its traces are pruned');
const eco4 = createEconomy(W4, { seed, state: loaded4.data.economy });
assert.ok(!eco4.agents.has(card.id));
assert.equal(storage.getItem(journeyKey(seed)) !== null, true);

console.log('soul tests passed');
