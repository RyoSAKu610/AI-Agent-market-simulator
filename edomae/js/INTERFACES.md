# Edomae module contracts

Vanilla ES modules, no build step. Upstream (read-only): `../../zipangu/js/data.js` (`loadWorld('../zipangu/world/')`)
and `../../zipangu/js/sim.js` (`createEconomy(W, { seed: 1 })`, stepped in the frame loop; events `trade`,
`depart`, `arrive`, `event`, `settle`, … via `on(type | '*', fn)`).

```js
// pure: no DOM, no imports (tools/edomae.test.mjs loads them in Node)
layout.js   ringLayout(W) → { R, total, places: [{ id, place, family, hero, s0, s1, mid, torii, districts: [{ id, s, w, x0, x1, seed }] }], byPlace, byDistrict }
            // s = arc length along the street; the ring closes (R = total / 2π). ringOrder, signName, standSpot, arcDelta, hash01
clock.js    tauOf(clock) → τ (dawn 0.25, dusk 0.75, midnight 0); tOfTau; kokuOfTau; warm(palette) → warmer paper and sky
looks.js    lookOf(agentDef, place, family) → { garment, gaitKind, main, sub, legs, accent, hat, hair, prop, … }; lookKey;
            companionOf(agentDef) → null | { kind: 'dog' | 'fox' | 'bird' | 'butterfly', colour }
news.js     pickHeadline(feed, placeDistrictIds) → newest newsworthy sim message (local first); headline(msg, max) → its text, trimmed;
            moneyOf(family, total) → 'zeni' | 'koban' | 'coin' | 'note' | 'cord' | 'leaf' | 'token' | 'ticket' | 'scale' | 'pearl' | 'slip' | 'none';
            goodsOf(category); currencyFor(currencies, placeDistrictIds, base); amountText(total, currency) → 「二十四蛍銭」;
            kanjiNumber(n); sheetOf(family) → 'kawaraban' | 'shinbun'; ambientDelay(seed, n, lo, hi)
lib/*.js    ink, gait, motion, daynight — ports of line-art-animation (MIT), same API

// DOM
figure.js    createFigure(parent, glow, look) → { g, body, glowRoot, gait, hand, handFar, update({ phase, go, t, dt, P, wind, act }), setHeadline(text) }
             act: bow, reach, chin, start, read, show, call, talk (0–1). look.sheet adds a 瓦版/新聞 held in both hands.
residents.js createResidents({ layer, glowLayer, layout, W, eco, onTap, toriiOf, onTrade }) — depart → walk to the torii and fade;
             arrive → step out and walk in; events queue, off-screen walks snap; trade → onTrade(r, msg) plan → walk to the keeper, exchange
town.js      createTown({ layer, glowLayer, fxLayer, layout, W, onReaderTap }) → { places, all, dogs, update(...), exchange(payer, payee, opts),
             residentTrade(r, msg, good), makeDog(owner, colour, fox) } — keepers, townsfolk, 読売 and readers, children, chats, stalls,
             animals per family, and the pooled money/goods exchange
animals.js   quad() four-legged planted-foot solver; createDog, createBeast (horse/ox), createCat (keyed poses; poke()), createFlock, createRabbit
buildings.js buildDistrict(entry, ctx); kit.js drawing kit (roofs, lattices, panes with silhouettes and light spill, noren, lanterns, …)
sitter.js    createSitter(parent, { kind: 'kneel' | 'stand' | 'bench', task: 'abacus' | 'write' | 'hammer' | 'pour' | 'sew' | 'read' | 'tea' | 'feed' | 'flag' })
sky.js, life.js, main.js — sky and night train; creatures by kind, fireflies, petals; the page (flags ?debug ?tau ?speed ?at, window.__edomae)
```
