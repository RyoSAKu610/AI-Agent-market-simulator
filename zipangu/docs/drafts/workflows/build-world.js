export const meta = {
  name: 'zipangu-build-world',
  description: 'Write every era/realm of Kaleidoscope Zipangu in parallel, fact-check each, then integrate the cross-era economy',
  phases: [
    { title: 'Write', detail: '14 authors: eras and realm pairs' },
    { title: 'Verify', detail: 'historian + librarian + spec check per unit, returns corrected unit' },
    { title: 'Integrate', detail: 'cross-era economy: currencies, prices, demands, trade routes' },
  ],
}

// Absolute path of the repository checkout (edit if yours differs).
const REPO = '/home/user/AI-Agent-market-simulator'

const S = REPO + '/zipangu/docs/drafts/briefs'
const SPEC = REPO + '/zipangu/SPEC.md'
const UNITS = ['jomon', 'heian', 'hiraizumi', 'sengoku', 'sangaku', 'raiden', 'meiji', 'taisho', 'showa', 'reiwa', 'kenji', 'tono', 'ryugu', 'tenshu']

const HEX = { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }
const MAP = { type: 'object', required: ['x', 'y'], properties: { x: { type: 'number', minimum: 0, maximum: 100 }, y: { type: 'number', minimum: 0, maximum: 100 } } }
const STR = { type: 'string' }
const IDS = { type: 'array', items: STR }
const AESTHETIC = { type: 'object', required: ['palette', 'motifs', 'soundscape', 'light'], properties: { palette: { type: 'array', minItems: 5, maxItems: 5, items: HEX }, motifs: IDS, soundscape: STR, light: STR } }
const PLACE = {
  type: 'object',
  required: ['id', 'name_ja', 'name_en', 'summary', 'lore', 'aesthetic', 'districts', 'creatures', 'literature', 'agents', 'map', 'connections'],
  properties: {
    id: STR, name_ja: STR, name_en: STR, order: { type: 'integer' }, real_period: STR,
    divergence: { type: 'object', required: ['year', 'real_anchor', 'figures', 'what_if', 'fiction_note'], properties: { year: { type: 'integer' }, real_anchor: STR, figures: { type: 'array', items: { type: 'object', required: ['name', 'life', 'role'], properties: { name: STR, life: STR, role: STR } } }, what_if: STR, fiction_note: STR } },
    cascade: { type: 'array', items: { type: 'object', required: ['year', 'event'], properties: { year: STR, event: STR } } },
    alt_present: IDS,
    source: { type: 'object', required: ['work', 'author'], properties: { work: STR, author: STR } },
    summary: STR, lore: STR, aesthetic: AESTHETIC,
    signature_tech: { type: 'array', items: { type: 'object', required: ['name', 'description'], properties: { name: STR, description: STR } } },
    districts: IDS, creatures: IDS, literature: IDS, agents: IDS, map: MAP, connections: IDS,
  },
}
const SHAPES = ['swallowtail', 'morpho', 'glasswing', 'birdwing', 'moth', 'fritillary', 'firefly', 'beetle', 'dragonfly', 'mantis', 'cicada', 'goldfish', 'koi', 'ray', 'eel', 'puffer', 'bell', 'lantern', 'ribbon', 'crane', 'sparrow', 'phoenix', 'owl', 'fox', 'cat', 'deer', 'rabbit', 'whale', 'tanuki', 'serpent', 'wyrm', 'flower', 'tree', 'moss', 'lotus', 'wisp', 'orb', 'geode', 'crystal_cluster']
const UNIT = {
  type: 'object',
  required: ['places', 'districts', 'goods', 'creatures', 'agents', 'events', 'library', 'chapters'],
  properties: {
    places: { type: 'array', minItems: 1, items: { type: 'object', required: ['type', 'data'], properties: { type: { type: 'string', enum: ['era', 'realm'] }, data: PLACE } } },
    districts: { type: 'array', items: { type: 'object', required: ['id', 'home', 'name_ja', 'name_en', 'summary', 'landmarks', 'produces', 'demands', 'residents', 'agent_roles', 'ambience', 'map'], properties: {
      id: STR, home: STR, name_ja: STR, name_en: STR, summary: STR,
      landmarks: { type: 'array', minItems: 1, items: { type: 'object', required: ['name_ja', 'description'], properties: { name_ja: STR, description: STR } } },
      produces: IDS, demands: IDS, residents: IDS, agent_roles: IDS, ambience: STR, map: MAP } } },
    goods: { type: 'array', items: { type: 'object', required: ['id', 'name_ja', 'name_en', 'category', 'origin', 'base_price', 'unit', 'description', 'perishable'], properties: {
      id: STR, name_ja: STR, name_en: STR, category: { type: 'string', enum: ['material', 'energy', 'food', 'craft', 'knowledge', 'art', 'transport', 'luxury', 'service'] },
      origin: STR, base_price: { type: 'number', exclusiveMinimum: 0 }, unit: STR, description: STR, source_creature: STR, perishable: { type: 'boolean' } } } },
    creatures: { type: 'array', items: { type: 'object', required: ['id', 'name_ja', 'name_en', 'kana', 'kind', 'home', 'rarity', 'size_cm', 'description', 'ecology', 'lore', 'behavior', 'produces', 'visual'], properties: {
      id: STR, name_ja: STR, name_en: STR, kana: STR,
      kind: { type: 'string', enum: ['butterfly', 'insect', 'fish', 'jellyfish', 'bird', 'beast', 'dragon', 'plant', 'spirit', 'mineral'] },
      home: { type: 'array', minItems: 1, items: STR }, rarity: { type: 'string', enum: ['common', 'uncommon', 'rare', 'legendary'] }, size_cm: { type: 'number' },
      description: STR, ecology: STR, lore: STR,
      behavior: { type: 'object', required: ['activity', 'movement', 'social'], properties: {
        activity: { type: 'string', enum: ['diurnal', 'nocturnal', 'crepuscular', 'always'] },
        movement: { type: 'string', enum: ['flutter', 'glide', 'swim', 'drift', 'walk', 'hover', 'still'] },
        social: { type: 'string', enum: ['solitary', 'pair', 'swarm', 'school', 'herd'] } } },
      produces: { type: 'array', items: { type: 'object', required: ['good', 'how'], properties: { good: STR, how: STR } } },
      visual: { type: 'object', required: ['palette', 'iridescence', 'glow', 'pattern', 'shape', 'scale'], properties: {
        palette: { type: 'array', minItems: 3, maxItems: 5, items: HEX }, iridescence: { type: 'number', minimum: 0, maximum: 1 }, glow: { type: 'number', minimum: 0, maximum: 1 },
        pattern: { type: 'string', enum: ['eyespot', 'stripes', 'veins', 'scales', 'stained_glass', 'gradient', 'starfield', 'crystal', 'spots', 'plain'] },
        shape: { type: 'string', enum: SHAPES }, scale: { type: 'number', minimum: 0.5, maximum: 3 } } } } } },
    agents: { type: 'array', items: { type: 'object', required: ['id', 'name', 'name_ja', 'origin', 'home', 'role', 'personality', 'specialty', 'long_term_ambition', 'routines', 'favored_goods', 'relationships', 'sprite_hint'], properties: {
      id: STR, name: STR, name_ja: STR, origin: { type: 'string', enum: ['neon_mythos', 'native'] }, home: STR, role: STR, personality: STR, specialty: STR,
      long_term_ambition: STR, routines: { type: 'array', minItems: 1, items: STR }, favored_goods: IDS,
      relationships: { type: 'array', items: { type: 'object', required: ['agent', 'type'], properties: { agent: STR, type: STR } } }, sprite_hint: STR } } },
    events: { type: 'array', items: { type: 'object', required: ['id', 'name_ja', 'name_en', 'where', 'cadence', 'description', 'effects', 'creatures'], properties: {
      id: STR, name_ja: STR, name_en: STR, where: STR, cadence: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'seasonal', 'yearly', 'rare'] }, season: STR, description: STR,
      effects: { type: 'array', items: { type: 'object', required: ['good', 'demand_multiplier'], properties: { good: STR, demand_multiplier: { type: 'number' } } } }, creatures: IDS } } },
    library: { type: 'array', items: { type: 'object', required: ['id', 'title', 'author', 'author_death_year', 'placed_in', 'in_world_role', 'why', 'extraction'], properties: {
      id: STR, title: STR, author: STR, author_death_year: { type: 'integer', maximum: 1967 }, translator: STR, translator_death_year: { type: 'integer', maximum: 1967 },
      placed_in: STR, district: STR, in_world_role: STR, why: STR,
      extraction: { type: 'object', required: ['mode', 'max_chars'], properties: { mode: { type: 'string', enum: ['opening', 'anchor'] }, anchor: STR, max_chars: { type: 'integer', minimum: 120, maximum: 600 } } } } } },
    chapters: { type: 'array', items: { type: 'object', required: ['place_id', 'markdown'], properties: { place_id: STR, markdown: STR } } },
  },
}
const VERIFIED = { ...UNIT, required: [...UNIT.required, 'corrections'], properties: { ...UNIT.properties, corrections: { type: 'array', items: { type: 'object', required: ['where', 'was', 'now', 'why'], properties: { where: STR, was: STR, now: STR, why: STR } } } } }

const authorPrompt = u => `You are a lead worldbuilder for "NEON MYTHOS 万華京ジパング" (Kaleidoscope Zipangu): Japan's eras, each given a revolutionary technology at a real historical near-miss, plus public-domain literary/mythic realms and wished-for creatures, stitched into one wonderland where AI agents run the economy autonomously.

Read these files first, completely:
1. ${S}/_global.json — premise, how eras coexist, hub, visual identity, STYLE GUIDE (binding, including its list of confirmed fact corrections), economy, currencies, and indexes of every era/realm/agent/creature id in the world.
2. ${S}/${u}.json — YOUR unit: the place(s) you own (with the spine entry, map_center and era order), the creatures and agents homed there, and the literature placed there.
3. ${SPEC} — the data contract every field must follow.

Write your unit completely and beautifully, in Japanese (English names alongside), following the style guide:
- places: one entry per place you own. Keep the given place id, map = the given map_center, era order as given. Eras need divergence {year, real_anchor (ONLY verifiable history), figures [{name, life "1866–1936", role}], what_if, fiction_note (exactly what is invented)}, cascade [{year, event}] with 【史実】/【創作】 labels, alt_present, signature_tech. Realms need source {work, author}. Every place: summary (2–3 sentences), lore (600–1200 chars, sensory and specific), aesthetic {palette of exactly 5 #rrggbb, motifs, soundscape, light}, connections (ids of eras/realms reachable directly, from the indexes).
- districts: 3–5 per place. Use the spine's district names. New ids must start with "${u}_" except the hub, whose id must be exactly "kokurin_hiroba" if it is yours. home = place id; map within ±6 of the place's map_center, all distinct; 2–4 landmarks each; produces/demands = goods ids of YOUR unit (cross-era demand is added later); residents = creature ids.
- goods: 4–8 per place, ids starting with "${u}_", origin = one of your districts, base_price in 刻 (KOKU, the base currency): staples 1–10, everyday crafts 10–80, fine crafts 80–400, luxuries 400–2000, rare creature-derived goods up to 5000. Creature-derived goods must respect the charter (落鱗のみ — never harm or capture creatures).
- creatures: a full object for EVERY roster creature homed here (keep its id), plus 1–2 NEW wished-for creatures of your own (ids starting "${u}_"; at least one jewel-like butterfly or a creature a child would wish existed). Make descriptions vivid and concrete (colours, light, sound, how it moves). visual params drive a procedural renderer: choose palette (3–5 hex), iridescence/glow 0–1, pattern, a shape valid for the kind (see SPEC), scale 0.5–3. produces → your goods ids.
- agents: a full object for EVERY roster agent homed here (keep its id). NEON MYTHOS agents keep their existing display name in "name" (e.g. "KANE-KAMI") and get an era persona in name_ja; origin "neon_mythos". Natives: origin "native". home = one of your district ids. Any character bearing a real person's name must be stated to be a fictional character distinct from the historical person. relationships may point to any agent id in the agent index. favored_goods = your goods ids.
- events: 2–3 per place, ids "${u}_…", where = your place or district id, effects on your goods, creatures involved.
- library: one entry for every work placed here, plus optionally 1–2 more PD works you are CERTAIN exist on 青空文庫 (author and translator died ≤1967). title must be the exact 青空文庫 title; author as 青空文庫 writes it ("姓 名", e.g. "芥川 竜之介", "森 鴎外", "柳田 国男"). extraction.mode "opening" unless you know an exact phrase; max_chars 250–500. ids "${u}_…" or a clear slug.
- chapters: one markdown chapter per place (2500–4500 chars): # title, ## 分岐点（史実と創作）, ## 歩いてみる (a second-person sensory walk through the districts at 明け六つ and 逢う刻), ## 住むものたち (creatures), ## 働くエージェント (a day in the autonomous economy: what the agents buy, make, carry, negotiate, and which long-term goal type each pursues), ## 祭りと事件, ## この時片の書物. Label facts 【史実】 and inventions 【創作】.
Only reference ids that exist: your own new ids, or ids from the indexes in _global.json.`

const verifyPrompt = (u, draft) => `You are the strict final reviewer for one unit of "NEON MYTHOS 万華京ジパング". Read ${S}/_global.json (especially the STYLE GUIDE and its confirmed fact corrections), ${S}/${u}.json and ${SPEC}.

Review the draft below on four axes and FIX everything you find, returning the complete corrected unit plus a list of corrections:
1. History: every 【史実】 claim, date, name, place and real-species fact must be accurate. If you cannot vouch for a claim, soften it ("〜とされる", "説がある") or remove it. Real people must not be given invented speech or deeds; characters named after real people must be marked fictional and distinct.
2. Literature / copyright: every work's author (and translator) died in 1967 or earlier; title is the exact 青空文庫 title; author written as 青空文庫 does ("芥川 竜之介", "森 鴎外"). Remove works you believe are not on 青空文庫 unless they are anonymous classics that are. Plot facts about the works must be right.
3. Spec: ids (new ones prefixed "${u}_", hub "kokurin_hiroba"), enums, exactly 5 palette colours for places, 3–5 for creatures, shapes valid for the kind, map within ±6 of the place centre and distinct, every reference resolves to this unit's ids or ids in the _global indexes, every roster creature and agent of this unit is present, every place lists its districts/creatures/agents/literature.
4. Quality and tone: Japanese prose is vivid, specific, romantic and optimistic, consistent with the style guide (no grimdark, no war glorification, charter respected: 落鱗のみ etc.). Fix thin or generic passages.

Draft (JSON):
${JSON.stringify(draft)}`

phase('Write')
const units = await pipeline(
  UNITS,
  u => agent(authorPrompt(u), { label: `write:${u}`, phase: 'Write', schema: UNIT }),
  (draft, u) => draft && agent(verifyPrompt(u, draft), { label: `verify:${u}`, phase: 'Verify', schema: VERIFIED, effort: 'high' }).then(v => v && ({ unit: u, ...v }))
)
const done = units.filter(Boolean)
log(`${done.length}/${UNITS.length} units written and verified` + (done.length < UNITS.length ? `; missing: ${UNITS.filter(u => !done.find(d => d.unit === u)).join(', ')}` : ''))

const ECON = {
  type: 'object',
  required: ['currencies', 'price_overrides', 'district_demands_add', 'agent_updates', 'event_effects_add', 'trade_routes', 'economy_overview'],
  properties: {
    currencies: { type: 'array', items: { type: 'object', required: ['id', 'name_ja', 'name_en', 'issuer', 'backing', 'to_base', 'base', 'description'], properties: {
      id: STR, name_ja: STR, name_en: STR, issuer: STR, backing: STR, to_base: { type: 'number' }, base: { type: 'boolean' }, description: STR } } },
    price_overrides: { type: 'array', items: { type: 'object', required: ['good', 'base_price', 'why'], properties: { good: STR, base_price: { type: 'number', exclusiveMinimum: 0 }, why: STR } } },
    district_demands_add: { type: 'array', items: { type: 'object', required: ['district', 'goods', 'why'], properties: { district: STR, goods: IDS, why: STR } } },
    agent_updates: { type: 'array', items: { type: 'object', required: ['agent', 'favored_goods_add', 'routines_add'], properties: { agent: STR, favored_goods_add: IDS, routines_add: IDS } } },
    event_effects_add: { type: 'array', items: { type: 'object', required: ['event', 'effects'], properties: { event: STR, effects: { type: 'array', items: { type: 'object', required: ['good', 'demand_multiplier'], properties: { good: STR, demand_multiplier: { type: 'number' } } } } } } },
    trade_routes: { type: 'array', items: { type: 'object', required: ['id', 'from', 'to', 'goods', 'via', 'arbitrage_type', 'narrative'], properties: {
      id: STR, from: STR, to: STR, goods: IDS, via: { type: 'string', enum: ['ginga_tetsudo', 'torii', 'chodo', 'kumoito', 'oshie', 'hojo_capsule', 'tamamushi_car', 'karasu_bikyaku'] },
      arbitrage_type: STR, narrative: STR } } },
    economy_overview: { type: 'string', description: 'Japanese, 1500-3000 chars: how the whole cross-era economy flows, for docs' },
  },
}
const digest = done.map(u => ({
  unit: u.unit,
  places: u.places.map(p => ({ id: p.data.id, type: p.type, name_ja: p.data.name_ja })),
  districts: u.districts.map(d => ({ id: d.id, home: d.home, name_ja: d.name_ja, produces: d.produces, demands: d.demands })),
  goods: u.goods.map(g => ({ id: g.id, name_ja: g.name_ja, category: g.category, origin: g.origin, base_price: g.base_price, unit: g.unit, source_creature: g.source_creature || null })),
  agents: u.agents.map(a => ({ id: a.id, name: a.name, home: a.home, specialty: a.specialty, favored_goods: a.favored_goods })),
  events: u.events.map(e => ({ id: e.id, where: e.where, cadence: e.cadence, effects: e.effects })),
}))
phase('Integrate')
const econ = await agent(`You are the chief economist of "NEON MYTHOS 万華京ジパング". Read ${S}/_global.json (economy, currencies, style guide) and ${SPEC}.
Below is a digest of every district, good, agent and event that the unit authors produced. Integrate them into ONE coherent cross-era economy:
- currencies: full objects for the spine's currencies. Exactly one base: 刻 (id "koku", to_base 1). issuer must be an era/realm/district id from the digest (the hub district is "kokurin_hiroba").
- price_overrides: rebalance base_price so comparable goods across eras are on one scale (staples 1–10 … rare creature goods ≤5000) and cross-era arbitrage is meaningful but not absurd. Only list goods you change.
- district_demands_add: give every district 1–4 demands for goods from OTHER eras/realms, following the arbitrage types in the spine (素材の時代差, 豊富と希少の逆転, 時間差, 意匠の往復, 昼夜の物流差, 祭りの先回り). Respect the 時差関税 rule (later tech into earlier eras only via 翻案).
- agent_updates: give every agent 1–3 favored goods from other places and 1–2 cross-era routines so they travel autonomously.
- event_effects_add: cross-era demand effects of festivals (e.g. a festival in one era raising demand for another era's good).
- trade_routes: 16–24 named routes between districts using the transport modes (ginga_tetsudo, torii, chodo, kumoito, oshie, hojo_capsule, tamamushi_car, karasu_bikyaku).
- economy_overview: Japanese prose for the docs.
Use ONLY ids that appear in the digest.

Digest:
${JSON.stringify(digest)}`, { label: 'integrate-economy', phase: 'Integrate', schema: ECON, effort: 'high' })

return { units: done, econ }
