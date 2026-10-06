# AGENTS.md — NEON MYTHOS

Instructions for every coding agent working on this repository: Jules
(scheduled and manual tasks), Claude, Codex and the rest. Read this first.
If a task prompt conflicts with this file, follow this file and say so in
the PR description.

> **日本語要約** — 開発対象は `index.html`（＋ `neon-mythos-*.js`）の1本だけです。
> **グラフィックの劣化は禁止**。改善は機能修正として小さく移植し、現行の機能・見た目・
> セーブデータを悪化させない「緩やかな併合」で進めます。ほかのHTMLは保守のみ／凍結、
> `archive/` は編集禁止。PRは1テーマずつ最新 `main` から作り、`bash scripts/check.sh`
> が通ることを確認してください。バイナリや一時スクリプト（`fix.py`、`*.patch` など）は
> コミットしないこと。

## Direction

NEON MYTHOS is a browser-based living future city where AI agents walk,
work, negotiate, learn and pursue long-term goals on their own. It is
mobile-first and installable as a PWA. The core loop: you give an agent work
in natural language, and it visibly replies, thinks, heads off and runs to
a building on the map to do it.

All development goes into **one build**: `index.html` plus the
`neon-mythos-*.js` layers. Everything else is a variant kept for its URL.

## Non-negotiables

1. **No graphics degradation.** Do not remove, downscale, recompress or swap
   art, sprites, pets, cut-ins, effects, animations, fonts or music, and do
   not simplify rendering (fewer tiles, props or particles, lower canvas
   resolution) to win performance. A perf or refactor change must draw the
   same picture. An intended visual change needs before/after screenshots
   at 1280×800 and 390×844 in the PR.
2. **Upgrade by porting, never by replacing.** Bring a good fix from another
   build or branch into `index.html` as a small edit. Never replace
   `index.html` with another build, and never delete a build.
3. **Gradual merge.** One concern per PR, behaviour-preserving unless the PR
   says otherwise. Long-term tasks, errands, buddy creation, PWA install,
   BGM and cut-ins keep working, and existing saves keep loading. If you are
   unsure whether something regresses, leave it out and say why in the PR.

## File roles

| Path | Status | What you may do |
| --- | --- | --- |
| `index.html` | **Live, canonical** (site root) | Features, fixes, perf, security, tests. |
| `neon-mythos-experience.js` | Live | Mobile hub, chat, buddy creation, daily mission, demo wallet, highlights. |
| `neon-mythos-errand.js` | Live | Errand flow: receive → reply → think → depart → result card. |
| `neon-mythos-route-fx.js` | Live | `! → 💭 → 🏃` head reactions and the temporary neon route. |
| `sw.js`, `manifest.webmanifest`, `pwa-icon.svg` | Live (PWA) | Bump `CACHE` in `sw.js` whenever a file in its `SHELL` list changes. |
| `neon-mythos-districts.html` | Variant, maintenance only | Fix bugs that break it. No refactors, perf or security sweeps. |
| `NeonMythosCity_Start.html` | x402 / Solana experiment, maintenance only | Same as above. |
| `neon-mythos-city.html`, `neon-mythos-codex-pets.html` | Frozen legacy | Do not edit. |
| `archive/` | Frozen | Do not edit. |
| `docs/` | Redirect stubs only | Do not copy builds here. |
| `character-assets/`, `character-pets/`, `pet-portable-bundle/`, `lumen-export/`, `music/` | Assets loaded by relative path | Do not rename or move. |
| `tests/`, `scripts/check.sh` | Checks | Add tests here. |
| `zipangu/` | Separate project: 万華京ジパング (world data + explorer) | Follow `zipangu/AGENTS.md`; it has its own checks (`zipangu/tools/check.sh`). |

A perf, security or refactor change to a maintenance-only or frozen file
will be closed. If you find the same issue in `index.html`, fix it there.

## How `index.html` is built

- It is a single precompiled file: React 18 UMD inlined, then the game as
  plain JavaScript (no JSX, no Babel, no bundler, no npm dependencies). Edit
  it directly and surgically. Never reformat, re-minify or regenerate the
  whole file: a 500 KB diff cannot be reviewed.
- There is no deploy-time patching. The Pages workflow publishes the
  repository as it is, so the source is exactly what ships.
- The game (`NeonMythosCity` component) and the JS layers talk only through
  `window` `CustomEvent`s named `nm:*`: `nm:ltt-command`, `nm:ltt-event`,
  `nm:create-companion`, `nm:companion-created`, `nm:quick-start`,
  `nm:game-ready`, `nm:agent-command`, `nm:errand-request`,
  `nm:route-agent`, `nm:agent-routed`, `nm:agent-detail`. Do not rename
  them; `tests/build-integrity.test.js` checks the bridge.
- Building lookups: use `getBld(x, y)` and `BUILDING_BY_ID.get(id)`. Do not
  add `BUILDINGS.find(...)` to per-tick or per-render code.
- Saved state lives in `localStorage` under `neonMythos.*` keys (long-term
  tasks: `neonMythos.ltt.v1`, payload `v: 2`). A format change must still
  load existing saves.

## Rules for pull requests

1. Branch from the latest `main`. One concern per PR. Close or rebase stale
   branches instead of stacking on them.
2. `bash scripts/check.sh` must pass. CI runs the same script on every PR.
   It includes `tests/assets.test.js`, which fails if any build references
   a file that does not exist.
3. When you change logic, add or update a test in `tests/`. Existing tests
   show how to pull a function out of `index.html` and run it in `vm`.
4. Do not commit binaries (mp4, mp3, png, webp, jpg) unless the task asks
   for an asset, and never duplicates of existing ones.
5. Do not commit helper or scratch files: `fix*.py`, `*.patch`,
   `verify_*.py`, screenshots, benchmark scripts, `package.json`,
   `node_modules/`.
6. Do not delete, rename or swap builds, and do not change the README Play
   links or `.github/workflows/` unless the task is about deployment.
7. Title format: `perf: …`, `fix: …`, `feat: …`, `security: …`, `test: …`,
   `docs: …` or `chore: …`, naming the file you changed. For a perf PR, say
   which hot path the change is in and how often it runs.
8. UI strings mix Japanese and English; keep each string's existing
   language. A new user-facing feature also gets a line in the English and
   Japanese sections of `README.md`.

## Most useful work for scheduled runs

- Per-frame and per-tick work in `index.html`'s render and `runAI` loops on
  mobile, such as repeated array scans and allocations inside `.map` over
  agents.
- Tests for the long-term-task engine's pure logic (`lttLoadSnapshot`
  offline catch-up, milestones, replans).
- `innerHTML` in the `neon-mythos-*.js` layers that interpolates values
  which could come from the user or from saved state.

## Past Jules PRs

What happened to earlier scheduled work, so it is not proposed again.

| PR | Change | Outcome |
| --- | --- | --- |
| #2, #23 | O(1) building lookups | Adopted in `index.html` (`getBld`, `BUILDING_BY_ID`). |
| #13, #21, #22 | escapeHTML, DOM-API agents, RESOURCE_MAP in the economy prototype | Adopted in `archive/ai-agent-economy.html`. |
| #14 | `genResidentSprite` test | Adopted; updated for the current `index.html`. |
| #8 | `RANDOM_EVENTS` refactor | Stays in the x402 build. |
| #18 | Set for recruited lookup; x402 build as site root | Not adopted. Swapping the root and deleting the x402 build breaks rule 2, and the Set gains nothing with 14 agents. |
| #20 | Radar chart, feed limited to 15, new videos | Not adopted. The chart was never rendered and re-rolled random stats each render, the feed would show less, and the videos duplicated existing files. |
| `bloomberg-terminal-ui` 2a00f90 | 3-column x402 layout | Not adopted. It changes the layout #11 set. |

## Verify locally

```bash
bash scripts/check.sh
python3 -m http.server 8000   # open http://localhost:8000/ and tap 「ワンタップで未来都市へ」
```

## Deploy

A push to `main` runs `.github/workflows/pages.yml`, which runs
`scripts/check.sh`, copies the repository into `_site/` and publishes it to
https://ryosaku610.github.io/AI-Agent-market-simulator/. The Netlify
project `neonmyths` also publishes the repository root as is (`netlify.toml`)
and posts deploy previews on pull requests; keep both working.
