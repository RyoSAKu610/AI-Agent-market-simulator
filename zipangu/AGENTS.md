# AGENTS.md — 万華京ジパング (zipangu/)

Rules for every coding agent (Jules, Claude, Codex…) working inside `zipangu/`.
This folder is its own project: the world of **NEON MYTHOS 万華京ジパング**, an
alternate-history Japan where AI agents run the economy on their own. The
NEON MYTHOS city at the repository root is a separate build with its own rules.

> **日本語要約** — ここは「もしもの日本」の世界観プロジェクトです。世界のデータは
> `world/*.json` が正本で、`SPEC.md` の仕様に従い、`bash tools/check.sh` が通ること。
> 史実には【史実】、作り話には【創作】を付け、確かでない史実は書かない。文学は作者
> （と訳者）が1967年以前に没した作品だけ。`world/library.texts.json` は手で書かず、
> 青空文庫から `tools/aozora-extract.mjs` で生成する。グラフィックは劣化させない。

## What is where

| Path | What it is |
| --- | --- |
| `world/*.json` | The world: eras, realms, districts, creatures, goods, currencies, agents, events, library. Source of truth. |
| `world/library.texts.json` | Excerpts from 青空文庫. Generated only (see below). |
| `SPEC.md` | The data contract. |
| `docs/` | The world bible, one chapter per era/realm, the fact-check log, and the design spine. |
| `index.html`, `style.css`, `js/` | The explorer: map, places, bestiary, library, market, agents. |
| `tools/` | Validator, 青空文庫 extractor, economy-sim tests, single-file builder, `check.sh`. |

## Non-negotiables

1. **Spec first.** Every change to `world/` keeps `node tools/validate.mjs` green. Never
   rename or reuse an id; other files, saves and the sim refer to it.
2. **History is labelled.** Real history is marked 【史実】 and must be verifiable; invention
   is marked 【創作】. Real people get no invented speech or deeds; a character named after a
   real person is stated to be a distinct fictional character. The confirmed corrections in
   `world.json` → `style_guide` §4 stay corrected.
3. **Public domain only.** A work enters `library.json` only if its author and any translator
   died in 1967 or earlier, and its title/author match 青空文庫 exactly. Excerpts come only
   from `tools/aozora-extract.mjs`, which checks the 青空文庫 copyright flags; never paste text.
4. **The charter.** Creature goods come from shed scales and gifts, never from harming or
   capturing. Things the world says have no price (クラムボン, 桜の森) get none.
5. **No graphics degradation.** Do not simplify the creature renderer, the map, or the palettes
   to win performance; a perf change must draw the same picture. Visual changes need
   before/after screenshots at 390×844 and 1280×800.
6. **Tone.** Romance, wonder, optimism. Conflict is economic, scientific, artistic or
   adventurous; no grimdark, no glorified war.

## Workflow

```bash
cd zipangu
bash tools/check.sh                    # validator, extractor tests, sim tests, syntax
python3 -m http.server 8000            # open http://localhost:8000/
node tools/build-single.mjs            # dist/zipangu-single.html (everything inlined)
```

青空文庫 excerpts: run the **Zipangu — 青空文庫 excerpts** workflow from the Actions tab on
your branch. It downloads the official index, keeps only works whose people are all marked
copyright-free, extracts the passages listed in `library.json`, and commits
`world/library.texts.json`.

## Pull requests

One concern per PR, branched from the latest `main`. Title prefixes: `world:` (content),
`explorer:` (UI), `sim:`, `tools:`, `docs:`. Do not commit binaries, scratch scripts,
screenshots or `node_modules/`.
