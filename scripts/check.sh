#!/usr/bin/env bash
# Every check a change must pass. CI runs exactly this on each pull request and
# before every Pages deploy; run it locally (or in an agent VM) before a PR.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "› JS layers and service worker parse"
for f in neon-mythos-experience.js neon-mythos-errand.js neon-mythos-route-fx.js sw.js; do
  node --check "$f"
done

echo "› PWA manifest is valid JSON"
python3 -m json.tool manifest.webmanifest >/dev/null

echo "› Unit and build-integrity tests"
for t in tests/*.test.js; do
  echo "  $t"
  node "$t" >/dev/null
done

echo "All checks passed."
