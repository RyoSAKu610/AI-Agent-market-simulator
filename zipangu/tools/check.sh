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
if [ -f tools/chain.test.mjs ]; then
  node tools/chain.test.mjs
fi

echo "› visual asset contracts"
node tools/visuals.test.mjs
node tools/history.test.mjs
node tools/creature-presence.test.mjs
node tools/character-stories.test.mjs
node tools/character-drama.test.mjs

echo "› bringing an AI in (soul cards, QR, languages)"
node tools/soul.test.mjs
node tools/qr.test.mjs
node tools/birth.test.mjs
node tools/progress.test.mjs
node tools/backup.test.mjs

echo "› AI minds (LLM providers, trial endpoint)"
node tools/mind.test.mjs
echo "› research log (rules vs LLM decisions)"
node tools/research.test.mjs
node tools/society.test.mjs
node tools/human.test.mjs
node tools/donate.test.mjs
node --check ../netlify/functions/zipangu-donate.mjs
node --check ../netlify/functions/zipangu-mind.mjs

echo "› explorer syntax"
for f in js/*.js tools/*.mjs; do
  # js/ is ES modules (import/export), so check it as a module; node --check alone treats .js as CommonJS
  case "$f" in js/*) [ -e "$f" ] && node --input-type=module --check < "$f" ;; *) [ -e "$f" ] && node --check "$f" ;; esac
done

echo "All zipangu checks passed."
