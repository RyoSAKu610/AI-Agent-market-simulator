#!/usr/bin/env node
// Validates world/*.json against SPEC.md: required fields, unique ids,
// cross-references, colours, map coordinates and the public-domain rule.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Usage: node tools/validate.mjs [worldDir]   (default: ../world)
const root = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..', 'world');
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

function load(name, fallback) {
    const p = join(root, name);
    if (!existsSync(p)) {
        if (fallback !== undefined) return fallback;
        err(name, 'missing file');
        return name.endsWith('s.json') ? [] : {};
    }
    try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { err(name, `invalid JSON: ${e.message}`); return []; }
}

const world = load('world.json');
const eras = load('eras.json');
const realms = load('realms.json');
const districts = load('districts.json');
const creatures = load('creatures.json');
const goods = load('goods.json');
const currencies = load('currencies.json');
const agents = load('agents.json');
const events = load('events.json');
const library = load('library.json');

const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z][a-z0-9_]*$/;
const SHAPES = {
    butterfly: ['swallowtail', 'morpho', 'glasswing', 'birdwing', 'moth', 'fritillary'],
    insect: ['firefly', 'beetle', 'dragonfly', 'mantis', 'cicada'],
    fish: ['goldfish', 'koi', 'ray', 'eel', 'puffer'],
    jellyfish: ['bell', 'lantern', 'ribbon'],
    bird: ['crane', 'sparrow', 'phoenix', 'owl'],
    beast: ['fox', 'cat', 'deer', 'rabbit', 'whale', 'tanuki'],
    dragon: ['serpent', 'wyrm'],
    plant: ['flower', 'tree', 'moss', 'lotus'],
    spirit: ['wisp', 'orb', 'lantern'],
    mineral: ['geode', 'crystal_cluster']
};
const PATTERNS = ['eyespot', 'stripes', 'veins', 'scales', 'stained_glass', 'gradient', 'starfield', 'crystal', 'spots', 'plain'];

// Arrays that must also be non-empty when required.
const NON_EMPTY = new Set(['home', 'districts', 'alt_present', 'cascade', 'landmarks', 'routines', 'signature_experiences']);
function req(file, obj, fields) {
    fields.forEach(f => {
        const v = obj[f];
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0 && NON_EMPTY.has(f))) {
            err(file, `${obj.id || '(no id)'}: missing "${f}"`);
        }
    });
}

function index(file, list) {
    const m = new Map();
    if (!Array.isArray(list)) { err(file, 'must be an array'); return m; }
    list.forEach(x => {
        if (!x || typeof x.id !== 'string' || !ID.test(x.id)) err(file, `bad id ${JSON.stringify(x && x.id)}`);
        else if (m.has(x.id)) err(file, `duplicate id ${x.id}`);
        else m.set(x.id, x);
    });
    return m;
}
const E = index('eras.json', eras), R = index('realms.json', realms), D = index('districts.json', districts);
const C = index('creatures.json', creatures), G = index('goods.json', goods), $ = index('currencies.json', currencies);
const A = index('agents.json', agents), V = index('events.json', events), L = index('library.json', library);
const places = new Map([...E, ...R]);

function refs(file, owner, field, ids, target, targetName) {
    (ids || []).forEach(id => { if (!target.has(id)) err(file, `${owner}.${field} → unknown ${targetName} "${id}"`); });
}
function map(file, x) {
    const m = x.map;
    if (!m || typeof m.x !== 'number' || typeof m.y !== 'number' || m.x < 0 || m.x > 100 || m.y < 0 || m.y > 100) err(file, `${x.id}: map must be {x,y} within 0–100`);
}
function palette(file, x, p, min, max) {
    if (!Array.isArray(p) || p.length < min || p.length > max || !p.every(c => HEX.test(c))) err(file, `${x.id}: palette needs ${min}–${max} #rrggbb colours`);
}

// world.json
req('world.json', { id: 'world', ...world }, ['title_ja', 'title_en', 'tagline', 'premise', 'how_eras_coexist', 'hub', 'style_guide', 'visual_identity', 'signature_experiences']);

if (world.hub && !D.has(world.hub.id)) err('world.json', `hub.id → unknown district "${world.hub.id}"`);
const VIA = ['ginga_tetsudo', 'torii', 'chodo', 'kumoito', 'oshie', 'hojo_capsule', 'tamamushi_car', 'karasu_bikyaku'];
const routeIds = new Set();
(world.trade_routes || []).forEach(r => {
    if (!r.id || routeIds.has(r.id)) err('world.json', `trade route id missing or duplicate: ${r.id}`);
    routeIds.add(r.id);
    if (!D.has(r.from) || !D.has(r.to)) err('world.json', `route ${r.id}: from/to must be district ids`);
    if (!VIA.includes(r.via)) err('world.json', `route ${r.id}: bad via "${r.via}"`);
    refs('world.json', `route ${r.id}`, 'goods', r.goods, G, 'good');
});

// eras
eras.forEach(e => {
    req('eras.json', e, ['name_ja', 'name_en', 'order', 'real_period', 'divergence', 'cascade', 'alt_present', 'summary', 'lore', 'aesthetic', 'districts', 'map']);
    const d = e.divergence || {};
    ['year', 'real_anchor', 'what_if', 'fiction_note'].forEach(f => { if (!d[f]) err('eras.json', `${e.id}: divergence.${f} missing`); });
    palette('eras.json', e, e.aesthetic && e.aesthetic.palette, 5, 5);
    map('eras.json', e);
    refs('eras.json', e.id, 'districts', e.districts, D, 'district');
    refs('eras.json', e.id, 'creatures', e.creatures, C, 'creature');
    refs('eras.json', e.id, 'literature', e.literature, L, 'work');
    refs('eras.json', e.id, 'agents', e.agents, A, 'agent');
    refs('eras.json', e.id, 'connections', e.connections, places, 'era/realm');
    if (e.lore && e.lore.length < 300) warnings.push(`eras.json: ${e.id} lore is short (${e.lore.length} chars)`);
});
const orders = eras.map(e => e.order);
if (new Set(orders).size !== orders.length) err('eras.json', 'order values must be unique');

// realms
realms.forEach(r => {
    req('realms.json', r, ['name_ja', 'name_en', 'source', 'summary', 'lore', 'aesthetic', 'districts', 'map']);
    palette('realms.json', r, r.aesthetic && r.aesthetic.palette, 5, 5);
    map('realms.json', r);
    refs('realms.json', r.id, 'districts', r.districts, D, 'district');
    refs('realms.json', r.id, 'creatures', r.creatures, C, 'creature');
    refs('realms.json', r.id, 'literature', r.literature, L, 'work');
    refs('realms.json', r.id, 'agents', r.agents, A, 'agent');
    refs('realms.json', r.id, 'connections', r.connections, places, 'era/realm');
});

// districts
districts.forEach(d => {
    req('districts.json', d, ['home', 'name_ja', 'name_en', 'summary', 'landmarks', 'ambience', 'map']);
    if (!places.has(d.home)) err('districts.json', `${d.id}.home → unknown era/realm "${d.home}"`);
    else if (!(places.get(d.home).districts || []).includes(d.id)) err('districts.json', `${d.id} is not listed in ${d.home}.districts`);
    map('districts.json', d);
    refs('districts.json', d.id, 'produces', d.produces, G, 'good');
    refs('districts.json', d.id, 'demands', d.demands, G, 'good');
    refs('districts.json', d.id, 'residents', d.residents, C, 'creature');
});
[...places.values()].forEach(p => (p.districts || []).forEach(id => {
    const d = D.get(id);
    if (d && d.home !== p.id) err('districts.json', `${id}.home is "${d.home}" but ${p.id} lists it`);
}));

// creatures
creatures.forEach(c => {
    req('creatures.json', c, ['name_ja', 'name_en', 'kana', 'kind', 'home', 'rarity', 'size_cm', 'description', 'ecology', 'lore', 'behavior', 'produces', 'visual']);
    if (!SHAPES[c.kind]) err('creatures.json', `${c.id}: unknown kind "${c.kind}"`);
    if (!['common', 'uncommon', 'rare', 'legendary'].includes(c.rarity)) err('creatures.json', `${c.id}: bad rarity "${c.rarity}"`);
    refs('creatures.json', c.id, 'home', c.home, D, 'district');
    (c.produces || []).forEach(p => { if (!G.has(p.good)) err('creatures.json', `${c.id}.produces → unknown good "${p.good}"`); });
    const v = c.visual || {};
    palette('creatures.json', c, v.palette, 3, 5);
    if (SHAPES[c.kind] && !SHAPES[c.kind].includes(v.shape)) err('creatures.json', `${c.id}: shape "${v.shape}" not valid for ${c.kind}`);
    if (!PATTERNS.includes(v.pattern)) err('creatures.json', `${c.id}: bad pattern "${v.pattern}"`);
    ['iridescence', 'glow'].forEach(k => { if (typeof v[k] !== 'number' || v[k] < 0 || v[k] > 1) err('creatures.json', `${c.id}: visual.${k} must be 0–1`); });
    if (typeof v.scale !== 'number' || v.scale < 0.5 || v.scale > 3) err('creatures.json', `${c.id}: visual.scale must be 0.5–3`);
    const b = c.behavior || {};
    if (!['diurnal', 'nocturnal', 'crepuscular', 'always'].includes(b.activity)) err('creatures.json', `${c.id}: bad behavior.activity`);
    if (!['flutter', 'glide', 'swim', 'drift', 'walk', 'hover', 'still'].includes(b.movement)) err('creatures.json', `${c.id}: bad behavior.movement`);
    if (!['solitary', 'pair', 'swarm', 'school', 'herd'].includes(b.social)) err('creatures.json', `${c.id}: bad behavior.social`);
});

// goods
goods.forEach(g => {
    req('goods.json', g, ['name_ja', 'name_en', 'category', 'origin', 'base_price', 'unit', 'description']);
    if (!['material', 'energy', 'food', 'craft', 'knowledge', 'art', 'transport', 'luxury', 'service'].includes(g.category)) err('goods.json', `${g.id}: bad category "${g.category}"`);
    if (!D.has(g.origin)) err('goods.json', `${g.id}.origin → unknown district "${g.origin}"`);
    if (!(g.base_price > 0)) err('goods.json', `${g.id}: base_price must be > 0`);
    if (g.source_creature && !C.has(g.source_creature)) err('goods.json', `${g.id}.source_creature → unknown creature "${g.source_creature}"`);
});

// currencies
if (currencies.filter(c => c.base === true).length !== 1) err('currencies.json', 'exactly one currency must have base: true');
currencies.forEach(c => {
    req('currencies.json', c, ['name_ja', 'name_en', 'issuer', 'backing', 'to_base', 'description']);
    if (!places.has(c.issuer) && !D.has(c.issuer) && c.issuer !== (world.hub && world.hub.id)) err('currencies.json', `${c.id}.issuer → unknown place "${c.issuer}"`);
});

// agents
agents.forEach(a => {
    req('agents.json', a, ['name', 'name_ja', 'origin', 'home', 'role', 'personality', 'specialty', 'long_term_ambition', 'routines']);
    if (!['neon_mythos', 'native'].includes(a.origin)) err('agents.json', `${a.id}: origin must be neon_mythos or native`);
    if (!D.has(a.home)) err('agents.json', `${a.id}.home → unknown district "${a.home}"`);
    refs('agents.json', a.id, 'favored_goods', a.favored_goods, G, 'good');
    (a.relationships || []).forEach(r => { if (!A.has(r.agent)) err('agents.json', `${a.id}.relationships → unknown agent "${r.agent}"`); });
});

// events
events.forEach(v => {
    req('events.json', v, ['name_ja', 'name_en', 'where', 'cadence', 'description', 'effects']);
    if (!places.has(v.where) && !D.has(v.where)) err('events.json', `${v.id}.where → unknown place "${v.where}"`);
    (v.effects || []).forEach(f => { if (!G.has(f.good)) err('events.json', `${v.id}.effects → unknown good "${f.good}"`); });
    refs('events.json', v.id, 'creatures', v.creatures, C, 'creature');
});

// library: Japanese public domain = author (and translator) died in 1967 or earlier
library.forEach(w => {
    req('library.json', w, ['title', 'author', 'author_death_year', 'placed_in', 'in_world_role', 'why', 'extraction']);
    if (!(w.author_death_year <= 1967)) err('library.json', `${w.id}: author died ${w.author_death_year}; not public domain in Japan`);
    if (w.translator && !(w.translator_death_year <= 1967)) err('library.json', `${w.id}: translator death year must be ≤ 1967`);
    if (!places.has(w.placed_in)) err('library.json', `${w.id}.placed_in → unknown era/realm "${w.placed_in}"`);
    if (w.district && !D.has(w.district)) err('library.json', `${w.id}.district → unknown district "${w.district}"`);
    const x = w.extraction || {};
    if (!['opening', 'anchor'].includes(x.mode)) err('library.json', `${w.id}: extraction.mode must be opening or anchor`);
    if (x.mode === 'anchor' && !x.anchor) err('library.json', `${w.id}: extraction.anchor missing`);
    if (w.source !== undefined && !['aozora', 'gutenberg'].includes(w.source)) err('library.json', `${w.id}: source must be aozora or gutenberg`);
    if (w.source === 'gutenberg') {
        if (!Number.isInteger(w.gutenberg_id) || w.gutenberg_id <= 0) err('library.json', `${w.id}: gutenberg_id must be a positive integer`);
        if (w.language !== 'en') err('library.json', `${w.id}: Gutenberg works are English (language: "en")`);
        if (!w.title_ja) err('library.json', `${w.id}: Gutenberg works need title_ja for the Japanese shelf`);
        for (const [name, died] of Object.entries(w.undated_people || {}))
            if (!(Number.isInteger(died) && died <= 1967)) err('library.json', `${w.id}: undated_people["${name}"] must be a death year ≤ 1967`);
        // Gutenberg texts open with a title page and contents, so the excerpt must start at an anchor.
        if (x.mode !== 'anchor') err('library.json', `${w.id}: Gutenberg works need extraction.mode "anchor"`);
    }
});

// orphans
const usedCreatures = new Set([...eras, ...realms].flatMap(p => p.creatures || []));
creatures.forEach(c => { if (!usedCreatures.has(c.id)) warnings.push(`creatures.json: ${c.id} is not listed by any era/realm`); });
const produced = new Set(districts.flatMap(d => d.produces || []).concat(creatures.flatMap(c => (c.produces || []).map(p => p.good))));
goods.forEach(g => { if (!produced.has(g.id)) warnings.push(`goods.json: ${g.id} is produced by no district or creature`); });

const counts = `${eras.length} eras, ${realms.length} realms, ${districts.length} districts, ${creatures.length} creatures, ` +
    `${goods.length} goods, ${currencies.length} currencies, ${agents.length} agents, ${events.length} events, ${library.length} works`;
warnings.forEach(w => console.warn(`warn  ${w}`));
if (errors.length) {
    errors.forEach(e => console.error(`error ${e}`));
    console.error(`\n${errors.length} error(s). ${counts}`);
    process.exit(1);
}
console.log(`World is valid: ${counts}.`);
