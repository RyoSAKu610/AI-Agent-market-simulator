# AGENTS.md — 江戸前 Edomae (edomae/)

Rules for every coding agent working inside `edomae/`. This folder is its own
project: the world of 万華京ジパング drawn as a line-art globe seen from the side,
with an Edo street at its heart. It reads Zipangu's world and economy; it never
changes them.

> **日本語要約** — 江戸前は、万華京ジパングの世界を横から見た線画の地球として描く別プロジェクトです。
> 世界データと経済（`zipangu/world/`、`zipangu/js/data.js`、`zipangu/js/sim.js`）は上流として
> 読むだけで、書き換えません。線画の掟（手足は2本の開いた線、定規のような直線を引かない、
> 足は地面に着く、インクは currentColor、紙は .pp、自由なサイン波で人を動かさない、ノードは一度だけ作る）
> を守り、史実と憲章の掟は zipangu を引き継ぎます。`bash edomae/tools/check.sh` が通ること。

## What is where

| Path | What it is |
| --- | --- |
| `index.html`, `edomae.css` | The page: one card on a fixed page background. Meta CSP only (no inline script). |
| `js/main.js` | Wiring: world + economy, layers, rotation, captions, URL flags, `window.__edomae`. |
| `js/layout.js`, `js/clock.js`, `js/looks.js`, `js/news.js` | Pure logic (no DOM, no imports): ring layout, 万世時計 → τ and warm paper, residents' looks and companions, headlines and money. |
| `js/figure.js`, `js/residents.js`, `js/town.js` | People: one figure, the economy's agents, and the townsfolk with their exchanges, readers, chats. |
| `js/animals.js`, `js/life.js` | Cats, dogs, horses, sparrows, hens, rabbits; the world's creatures, fireflies, petals. |
| `js/buildings.js`, `js/kit.js`, `js/sitter.js`, `js/sky.js` | Architecture by era family, the drawing kit, people working inside, the sky and the night train. |
| `js/lib/` | Ports of line-art-animation (MIT, `THIRD_PARTY.md`). Same API as the original; keep the headers. |
| `tools/` | `edomae.test.mjs` and `check.sh`. |

## Non-negotiables

1. **Upstream is read-only.** Import `../../zipangu/js/data.js` and `../../zipangu/js/sim.js`, load
   `../zipangu/world/`. Never copy or edit them from here; write nothing to `localStorage`.
2. **The line-art rules** (from the reference skill): limbs are two open strokes (`limb()`); nothing
   ruler-straight; figures drawn in figure space (~95 tall, feet on y = 120) and placed with `place()`;
   clothes drawn around the solved skeleton; feet planted — move a walker by exactly `gait.speed × scale`
   (animals by their solver's speed); ink is `currentColor`, paper is `.pp`; no free-running sines on
   figures (keyed poses, springs, pendulums); create nodes once and only update attributes; the scene is a
   card on a fixed page background; interactions are the world reacting, no buttons inside the scene.
3. **History and the charter** come from `zipangu/AGENTS.md`: no invented speech or deeds for real people;
   signboards and headlines use only names and lines that exist in the world data or that the economy
   produced. Creatures are never caught, caged, leashed or harmed; 桜の森 asks no price (no money there).
4. **No graphics degradation, no binaries.** Do not simplify the drawing to win frames. No images, audio
   or video files; everything is drawn in SVG.
5. **Performance:** only visible places are updated; no `Array.find` over districts in per-frame code
   (Maps are built once); path strings rounded with `f()`.

## Verify

```bash
bash edomae/tools/check.sh            # pure-logic tests + module syntax
python3 -m http.server 8000           # open http://localhost:8000/edomae/
```

URL flags: `?debug` (no rAF; `window.__step(seconds)` advances in 1/60 s steps), `?tau=0.5` (pin the
palette), `?speed=N` (economy speed), `?at=<placeId>` (start facing a place). Check at 390×844 and
1280×800 in a real browser, in `?debug`, with zoomed frame strips of anything that moves (feet planted,
hem opening, the exchange, the cat). No console or CSP errors.

## Pull requests

One concern per PR, from the latest `main`. Title prefix `edomae:`. Before/after screenshots at 390×844
and 1280×800 for visual changes (not committed).
