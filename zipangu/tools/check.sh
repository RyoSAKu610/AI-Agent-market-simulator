#!/usr/bin/env bash
# Every check a zipangu/ change must pass. CI runs exactly this.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "› world data"
node tools/validate.mjs

echo "› 青空文庫 extractor"
node tools/aozora-extract.test.mjs

if [ -f tools/sim.test.mjs ]; then
  echo "› economy simulation"
  node tools/sim.test.mjs
fi

echo "› explorer syntax"
for f in js/*.js tools/*.mjs; do
  [ -e "$f" ] && node --check "$f"
done

echo "All zipangu checks passed."
