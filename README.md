# AI-Agent-market-simulator

Play the interactive NEON MYTHOS demo directly from this repository.

[![Deploy to GitHub Pages](https://github.com/RyoSAKu610/AI-Agent-market-simulator/actions/workflows/pages.yml/badge.svg)](https://github.com/RyoSAKu610/AI-Agent-market-simulator/actions/workflows/pages.yml)

Play Now
--------

Every build is live on GitHub Pages — click a button to play, no install required.

[![Play Neon Mythos](https://img.shields.io/badge/PLAY-NEON%20MYTHOS-00E5FF?style=for-the-badge&logo=html5&logoColor=white)](https://ryosaku610.github.io/AI-Agent-market-simulator/)

[![Play Districts build](https://img.shields.io/badge/PLAY-DISTRICTS%20%2B%20BGM-FF1493?style=for-the-badge&logo=musicbrainz&logoColor=white)](https://ryosaku610.github.io/AI-Agent-market-simulator/neon-mythos-districts.html)

[![Play x402 build](https://img.shields.io/badge/PLAY-x402%20%2F%20SOLANA-9945FF?style=for-the-badge&logo=solana&logoColor=white)](https://ryosaku610.github.io/AI-Agent-market-simulator/NeonMythosCity_Start.html)

### Main builds

| Button | Path | What it is |
| --- | --- | --- |
| NEON MYTHOS | [`/`](https://ryosaku610.github.io/AI-Agent-market-simulator/) | Full-colour tile city — building skins, parks, canals, crosswalks, elevation, street props, deal cut-ins. 14 agents in drawn art, 6 languages, BGM. |
| DISTRICTS + BGM | [`/neon-mythos-districts.html`](https://ryosaku610.github.io/AI-Agent-market-simulator/neon-mythos-districts.html) | Dark neon variant — city districts, enterable building interiors, character spotlight cut-ins, and a 4-track BGM player with select / random / volume. |
| x402 / SOLANA | [`/NeonMythosCity_Start.html`](https://ryosaku610.github.io/AI-Agent-market-simulator/NeonMythosCity_Start.html) | City simulation plus the Solana / x402 payment layer. |

### Earlier builds (kept for reference)

| Path | What it is |
| --- | --- |
| [`/neon-mythos-codex-pets.html`](https://ryosaku610.github.io/AI-Agent-market-simulator/neon-mythos-codex-pets.html) | First Codex Pets build — drawn character art, no tile city or BGM |
| [`/neon-mythos-city.html`](https://ryosaku610.github.io/AI-Agent-market-simulator/neon-mythos-city.html) | Original city sim, CSS pixel sprites only (was the site root) |

Deployment (GitHub Pages)
-------------------------
Publishing is automated by [`.github/workflows/pages.yml`](.github/workflows/pages.yml):

- Pages source is **GitHub Actions** (Settings → Pages → Source: GitHub Actions), not a branch folder.
- Every push to `main` stages the repository root into `_site/` and deploys it.
- A `.nojekyll` marker is included so files are served verbatim — this repo contains
  paths with spaces and non-ASCII characters that the default Jekyll build mishandles.
- You can also redeploy on demand from the Actions tab → "Deploy to GitHub Pages" → Run workflow.

Quick preview (no Pages required)
---------------------------------
If Pages is ever down, these services render the HTML straight from the repository.
Note that they serve the file alone, so the character art will be missing on the
Codex Pets build — use the Pages buttons above for the full experience.

[![Preview on githack](https://img.shields.io/badge/preview-githack-lightgrey?style=flat-square)](https://raw.githack.com/RyoSAKu610/AI-Agent-market-simulator/main/NeonMythosCity_Start.html)
[![Preview on htmlpreview](https://img.shields.io/badge/preview-htmlpreview-lightgrey?style=flat-square)](https://htmlpreview.github.io/?https://raw.githubusercontent.com/RyoSAKu610/AI-Agent-market-simulator/main/NeonMythosCity_Start.html)

x402 / Solana build
-------------------
`NeonMythosCity_Start.html` carries the Solana integration: a `SolanaWalletPanel`
component (Phantom connect, devnet USDC, x402 payment calls against `API_BASE`).

The component is defined but never mounted, so the page currently plays as the
plain city simulation. Wiring it into the UI — and pointing `API_BASE` at a live
backend — is still open work.

Character assets
----------------
The builds load all character art and audio through relative paths. These folders
must stay at the repository root, and must not be renamed or moved unless the
paths inside the HTML are updated too:

| Folder | Contents |
| --- | --- |
| `character-assets/` | Cut-in portraits (9 PNG) |
| `character-pets/` | Codex pets: SAGE-BOY, DRONE-TAN, YAMI-NEKO, EYE-VOID, PIXEL, LIRA, KITSUNE-X, NEON, GOLD-JACK (`pet.json` + `spritesheet.webp`) |
| `pet-portable-bundle/` | Main pets: KANE-KAMI, ZERO, NEGO-CHAN, 404-HUMAN |
| `lumen-export/` | ORACLE-01 |
| `music/` | BGM — `neon-myths-english.mp3` (used by `/`), plus `bgm-dropbox`, `city-loop`, `pynchon` for the Districts player |

Pet spritesheets use the Codex atlas layout: 1536×1872, 192×208 cells, 8 columns,
9 animation rows (idle, running-right, running-left, waving, jumping, failed,
waiting, running, review).

Cleanup
-------
I created an `archive/` folder (archive/README.md) to collect legacy files and large assets. I did not remove any root files. If you want, I can safely move unused files into `archive/` (or delete them) in a follow-up commit — tell me which paths you want moved or removed.
