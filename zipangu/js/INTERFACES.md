# Explorer module contracts

The explorer (`zipangu/index.html`) is vanilla ES modules, no build step, no
npm dependencies. It must work when served statically from `zipangu/` (GitHub
Pages, Netlify) and when every `world/*.json` is inlined into one HTML file
(`tools/build-single.mjs` sets `window.__ZIPANGU_WORLD__` before `js/app.js` loads).

## js/data.js
```js
export async function loadWorld(base = 'world/')
// → World: {
//   world, eras, realms, districts, creatures, goods, currencies, agents, events, library, texts,
//   byId: { era, realm, place, district, creature, good, currency, agent, event, work }  // Map<string, obj>
//   placeOf(districtId) → era/realm object
//   baseCurrency → currencies entry with base: true
// }
// Uses window.__ZIPANGU_WORLD__ when present (same shape as the JSON files, keyed by file stem;
// library.texts.json → key "texts").
```

## js/creature-art.js — procedural creature renderer (Canvas 2D)
```js
export function drawCreature(ctx, creature, t, size)
// Draws `creature` centred at (0,0), fitting a size×size box, at time t (seconds).
// Uses creature.kind, creature.visual {palette, iridescence, glow, pattern, shape, scale},
// creature.behavior.movement (flutter → wing beat, swim → body wave, drift → pulse, …).
// Pure: no DOM access, no global state; deterministic for a given (creature.id, t).

export function creatureCanvas(creature, size, { animate = true } = {})
// → HTMLCanvasElement (devicePixelRatio aware, capped at 2) that animates via ONE shared
// requestAnimationFrame loop, only while on screen (IntersectionObserver), and stops when removed.
```

## js/sim.js — the autonomous economy (pure logic, runs in Node too)
```js
export function createEconomy(W, { seed = 1 } = {})
// → Economy {
//   clock: { day, koku, phase, label, isNight }   // 不定時法: day split at 明け六つ/暮れ六つ; label e.g. "明け六つ", "昼九つ"
//   agents: Map<id, { id, name, x, y, home, at (district id|null), target (district id|null),
//                     via, carrying: [{good, qty, cost}], wallet (in base currency), activity,
//                     stage ('idle'|'react'|'think'|'travel'|'trade'), goalType, goalProgress (0–1) }>
//   prices: Map<districtId, Map<goodId, number>>   // local prices; every district prices every good it produces or demands
//   activeEvents: [{ event, endsAt }]
//   step(dtSeconds)                                 // advance the world; agents choose, move, buy, sell on their own
//   on(type, fn)                                    // types: 'trade', 'arrive', 'depart', 'event', 'settle', 'goal'
//   snapshot()                                      // plain-object state for saving/debug
// }
// Agents follow world.trade_routes when one connects their stops (speed by `via`), otherwise travel straight.
// Prices react to supply (arrivals/sales) and demand (district demands, active events) and mean-revert.
// Settlement happens at 明け六つ and 暮れ六つ. Deterministic for a given seed.
```

## js/map.js — the kaleidoscope map (Canvas 2D)
```js
export function createMap(canvas, W, economy, { onSelect })
// Renders places (eras on concentric kaleidoscope shards, realms at the rim), districts, trade routes,
// agents (with ！→💭→🏃 reactions while stage is react/think/travel), drifting creatures (via creature-art),
// day/night from economy.clock. Pan + pinch/wheel zoom. Tap → onSelect({type: 'place'|'district'|'agent'|'creature', id}).
// → { resize(), destroy(), focus(id) }
```

## js/app.js — shell, router and views
Hash routes: `#/` (map + HUD), `#/place/<id>`, `#/district/<id>`, `#/bestiary`, `#/creature/<id>`,
`#/library`, `#/work/<id>`, `#/market`, `#/agents`, `#/agent/<id>`, `#/about`.
HUD: 万世時計 dial (不定時法), live feed of trades/events, base-currency ticker.
Japanese first, English names alongside. Mobile first (390×844), also 1280×800.
