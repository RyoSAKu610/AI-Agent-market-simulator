# bench/results

One JSON file per entry, written by `node tools/bench.mjs run … --out bench/results/NAME.json`.
`node tools/bench.mjs board bench/results` turns them into `bench/leaderboard.json`, which
the page `#/bench` shows. Maintainers add `"verified": true` after re-scoring an entry on the
held-back test set.
