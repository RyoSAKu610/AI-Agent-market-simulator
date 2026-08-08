# AI-Agent-market-simulator

Play the interactive NEON MYTHOS demo directly from this repository.

Play Now
--------

The demo is hosted on GitHub Pages:

[![Play NEON MYTHOS](https://img.shields.io/badge/Play%20Now-NEON%20MYTHOS-%2300E5FF?style=for-the-badge&logo=html5)](https://ryosaku610.github.io/AI-Agent-market-simulator/)

```
https://ryosaku610.github.io/AI-Agent-market-simulator/
```

Pages
-----

| Path | Contents |
| --- | --- |
| `/` | `index.html` — Neon Mythos City (React + Babel standalone) |
| `/neon-mythos-codex-pets.html` | Codex Pets build |
| `/NeonMythosCity_Start.html` | Standalone start screen |

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
Use either preview service to open the file directly from the repository:

```
https://htmlpreview.github.io/?https://raw.githubusercontent.com/RyoSAKu610/AI-Agent-market-simulator/main/NeonMythosCity_Start.html
```

or

```
https://raw.githack.com/RyoSAKu610/AI-Agent-market-simulator/main/NeonMythosCity_Start.html
```

Known gaps
----------
`neon-mythos-codex-pets.html` references `character-assets/*.png` and
`pet-portable-bundle/*/assets/spritesheet.webp`, which are not committed to this
repository. The page still loads and runs; those portraits/sprites simply render blank.

Cleanup
-------
I created an `archive/` folder (archive/README.md) to collect legacy files and large assets. I did not remove any root files. If you want, I can safely move unused files into `archive/` (or delete them) in a follow-up commit — tell me which paths you want moved or removed.
