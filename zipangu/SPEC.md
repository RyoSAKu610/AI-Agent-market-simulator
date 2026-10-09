# World data specification

Every file in `world/` follows this contract. `node tools/validate.mjs`
enforces it: required fields, unique ids, cross-references, colours, map
coordinates and the public-domain rule for the library.

Conventions:
- `id`: lowercase `snake_case` ASCII, unique within its file. Never rename an
  id once published; other files and saves refer to it.
- Text fields are Japanese, with `name_en` alongside. Prose uses 常体 or
  です・ます consistently within a field.
- Colours are `#rrggbb`.
- `map` coordinates are 0–100 on the wonderland map (x right, y down).
- Prices are in the base currency (`currencies.json` entry with `base: true`).

## world.json (object)
`title_ja, title_en, tagline, premise, how_eras_coexist, hub {id, name_ja, name_en, description},
style_guide, visual_identity, signature_experiences[], economy_overview, trade_routes[]`

`hub.id` is a district id. `trade_routes[]`: `{id, from (district id), to (district id), goods[good ids],
via (ginga_tetsudo torii chodo kumoito oshie hojo_capsule tamamushi_car karasu_bikyaku), arbitrage_type, narrative}`

## eras.json (array) — the alternate timelines
| field | type | notes |
| --- | --- | --- |
| id, name_ja, name_en | string | |
| order | int | chronological, 1 = oldest |
| real_period | string | e.g. `1868–1912` |
| divergence | object | `{year, real_anchor, figures[{name, life, role}], what_if, fiction_note}`. `real_anchor` states only verifiable history; `fiction_note` says exactly what is invented. |
| cascade | `[{year, event}]` | consequences down to the present |
| alt_present | string[] | things impossible today that are normal here |
| summary | string | 2–3 sentences |
| lore | string | 600–1200 characters |
| aesthetic | object | `{palette[5 hex], motifs[], soundscape, light}` |
| signature_tech | `[{name, description}]` | |
| districts, creatures, literature, agents | id[] | → districts / creatures / library / agents |
| map | `{x, y}` | |
| connections | id[] | other era or realm ids reachable directly |

## realms.json (array) — myth and literary worlds made physical
`id, name_ja, name_en, source {work, author}, summary, lore, aesthetic, districts[], creatures[], literature[], agents[], map, connections[]`

## districts.json (array)
`id, home (era or realm id), name_ja, name_en, summary, landmarks[{name_ja, description}],
produces[good ids], demands[good ids], residents[creature ids], agent_roles[], ambience, map {x, y}`

## creatures.json (array)
| field | type | notes |
| --- | --- | --- |
| id, name_ja, name_en, kana | string | |
| kind | enum | `butterfly insect fish jellyfish bird beast dragon plant spirit mineral` |
| home | district id[] | at least one |
| rarity | enum | `common uncommon rare legendary` |
| size_cm | number | |
| description | string | appearance, vivid and concrete |
| ecology | string | what it eats, when it appears, how it lives |
| lore | string | a legend, saying or folk custom about it |
| behavior | object | `{activity: diurnal/nocturnal/crepuscular/always, movement: flutter/glide/swim/drift/walk/hover/still, social: solitary/pair/swarm/school/herd}` |
| produces | `[{good, how}]` | how it feeds the economy without harming it |
| visual | object | renderer input, below |

`visual`: `{palette[3–5 hex], iridescence 0–1, glow 0–1, pattern, shape, scale 0.5–3}`
- `pattern`: `eyespot stripes veins scales stained_glass gradient starfield crystal spots plain`
- `shape` by kind: butterfly `swallowtail morpho glasswing birdwing moth fritillary`; insect
  `firefly beetle dragonfly mantis cicada`; fish `goldfish koi ray eel puffer`; jellyfish
  `bell lantern ribbon`; bird `crane sparrow phoenix owl`; beast `fox cat deer rabbit whale tanuki`;
  dragon `serpent wyrm`; plant `flower tree moss lotus`; spirit `wisp orb lantern`; mineral `geode crystal_cluster`

## goods.json (array)
`id, name_ja, name_en, category (material energy food craft knowledge art transport luxury service),
origin (district id), base_price (number > 0), unit, description, source_creature (creature id, optional), perishable (bool)`

## currencies.json (array)
`id, name_ja, name_en, issuer (era/realm/district id), backing, to_base (number), base (bool, exactly one true), description`

## agents.json (array)
`id, name, name_ja, origin (neon_mythos | native), home (district id), role, personality, specialty,
long_term_ambition, routines[], favored_goods[good ids], relationships[{agent, type}], sprite_hint`

## events.json (array)
`id, name_ja, name_en, where (era/realm/district id), cadence (daily weekly monthly seasonal yearly rare),
season (optional), description, effects[{good, demand_multiplier}], creatures[ids]`

## library.json (array) — public-domain works placed in the world
| field | notes |
| --- | --- |
| id, title, author | `author` as written on 青空文庫 (e.g. `宮沢 賢治`); for English works, `title` as Gutenberg lists it and `author` in Western order |
| author_death_year | must be ≤ 1967 (Japanese public domain) |
| translator, translator_death_year | only for translations; also ≤ 1967 |
| placed_in | era or realm id; `district` optional |
| in_world_role | what the book *is* inside the world |
| why | why it belongs there |
| extraction | `{mode: opening | anchor, anchor?, max_chars}` — consumed by the extractors |
| source, language, gutenberg_id, title_ja | English works only: `source: "gutenberg"`, `language: "en"`, the Gutenberg eBook number, and the Japanese title shown on the shelf. Their extraction must use `anchor` (Gutenberg texts open with title pages). |

`library.texts.json` is generated by `tools/aozora-extract.mjs` (青空文庫) and
`tools/gutenberg-extract.mjs` (Project Gutenberg) and is never written by hand.
The Gutenberg extractor uses a book only if every person its catalogue lists
(author, translator, editor, illustrator) has a death year of 1967 or earlier.
