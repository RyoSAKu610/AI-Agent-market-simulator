#!/usr/bin/env bash
# Every check a zipangu/ change must pass. CI runs exactly this.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "› world data"
node tools/validate.mjs

echo "› 青空文庫 and Gutenberg extractors"
node tools/aozora-extract.test.mjs
node tools/gutenberg-extract.test.mjs

if [ -f tools/sim.test.mjs ]; then
  echo "› economy simulation"
  node tools/sim.test.mjs
fi

echo "› explorer syntax"
for f in js/*.js tools/*.mjs; do
  # js/ is ES modules (import/export), so check it as a module; node --check alone treats .js as CommonJS
  case "$f" in js/*) [ -e "$f" ] && node --input-type=module --check < "$f" ;; *) [ -e "$f" ] && node --check "$f" ;; esac
done

echo "All zipangu checks passed."
