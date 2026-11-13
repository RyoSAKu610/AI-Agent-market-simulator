#!/usr/bin/env bash
# Every check an edomae/ change must pass. The repository's scripts/check.sh (CI) runs this.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "› 江戸前 Edomae: pure logic (ring layout, 万世時計 day, planted feet, looks, headlines, money, companions)"
node tools/edomae.test.mjs

echo "› Edomae module syntax"
for f in js/*.js js/lib/*.js; do
  # ES modules (import/export, top-level await), so check them as modules
  node --input-type=module --check < "$f"
done
node --check tools/edomae.test.mjs

echo "› upstream it reads (zipangu/, read-only) is where Edomae expects it"
for f in ../zipangu/js/data.js ../zipangu/js/sim.js ../zipangu/world/districts.json; do [ -e "$f" ] || { echo "missing $f"; exit 1; }; done

echo "All edomae checks passed."
