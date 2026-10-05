# HANDOFF — 万華京ジパング（作業の引き継ぎ）

> 別セッションで続ける場合は、このファイルを最初に読んでください。ブランチ
> `claude/zipangu-wonderland`、PR #26（draft）。完成したら `docs/drafts/` と
> このファイルは削除します。

## Where things stand

| Piece | State |
| --- | --- |
| Design spine (`docs/spine.json`) | Done. 10 eras, 8 realms, 35 creatures, 10 currencies, 29 agents, 30 PD works, style guide with confirmed fact corrections. |
| Data contract + validator (`SPEC.md`, `tools/validate.mjs`) | Done. |
| 青空文庫 pipeline (`tools/aozora-extract.mjs`, `.github/workflows/zipangu-aozora.yml`) | Done; tested offline. aozora.gr.jp is blocked in cloud sessions, so run it from the Actions tab. |
| Engines (`js/creature-art.js`, `js/data.js`, `js/sim.js`, `tools/sim.test.mjs`) | Done; `bash tools/check.sh` passes. |
| World content | **8 of 14 units drafted, none fact-checked yet.** Drafts: `docs/drafts/units/{jomon,heian,hiraizumi,sengoku,sangaku,raiden,meiji,taisho}.json`. Missing: `showa`, `reiwa`, `kenji` (銀河鉄道+イーハトーヴ), `tono` (遠野+桜の森), `ryugu` (竜宮・蓬莱+月の都), `tenshu` (天守+夢十夜). |
| `world/*.json` | Still the **stand-in** generated from the spine. Replace with the assembled real content. |
| Explorer shell (`js/map.js`, `js/app.js`, `index.html`, `style.css`, `tools/build-single.mjs`) | Not started. Script ready: `docs/drafts/workflows/explorer-shell.js`. |

## Next steps

1. **Write the 6 missing units.** `docs/drafts/workflows/build-world.js` is the workflow
   that produced the drafts (author → reviewer per unit, then an economy integrator).
   Set `REPO` at its top to your checkout. Either run it with `UNITS` reduced to the
   missing six, or run it on all 14 and skip authoring for units whose draft already
   exists in `docs/drafts/units/` (feed that draft straight into the reviewer stage).
   Briefs for every unit are in `docs/drafts/briefs/` (`_global.json` + one per unit).
2. **Review every unit** (the reviewer prompt in the script): history, literature and
   copyright, spec conformance, tone. Keep the `corrections` list.
3. **Integrate the economy** (the `integrate-economy` stage of the same script).
4. **Assemble**: save the workflow result as JSON and run
   `python3 docs/drafts/assemble.py <result.json>`. It writes `world/*.json`,
   `docs/eras/*.md`, `docs/realms/*.md` and `docs/CORRECTIONS.md`. Then
   `node tools/validate.mjs` until it is clean.
5. **Build the explorer** with `docs/drafts/workflows/explorer-shell.js` (set `REPO`),
   then check every route at 390×844 and 1280×800.
6. Write `README.md` and `docs/WORLD_BIBLE.md`, run `bash tools/check.sh`, delete
   `docs/drafts/` and this file, push, and fill in the PR #26 description.

## Things to know

- Rules: `AGENTS.md` (this folder) and the style guide in `docs/spine.json`.
- Long workflows have been stopped twice by the account's usage limit. Run one
  workflow at a time; a stopped run can be resumed and finished agents are reused.
- Keep NEON MYTHOS (repository root) untouched from this branch.
