const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Every local file a build references must exist, so character art, pets,
// music and PWA files can't silently go missing (9fcc550 fixed 23 blank pets
// caused by exactly that).
const root = path.join(__dirname, '..');

const SOURCES = [
    'index.html',
    'neon-mythos-districts.html',
    'NeonMythosCity_Start.html',
    'neon-mythos-city.html',
    'neon-mythos-codex-pets.html',
    'neon-mythos-experience.js',
    'neon-mythos-errand.js',
    'neon-mythos-route-fx.js',
    'sw.js',
    'docs/index.html',
    'docs/neon-mythos-codex-pets.html'
];

// Listed in neon-mythos-districts.html's MUSIC_TRACKS but never committed
// (f48e387 added only the four MP3s). Selecting them plays nothing. Add the
// files to music/ and delete this list; do not add new entries.
const KNOWN_MISSING = new Set([
    'music/synthwavehouse.ogg',
    'music/flowerbed_fields.ogg',
    'music/chiptune-loop.wav'
]);

const ASSET_DIRS = 'character-assets|character-pets|pet-portable-bundle|lumen-export|music|assets';
const PATTERNS = [
    // Asset folders, with or without a leading ./
    new RegExp(`["'\`(]((?:\\./)?(?:${ASSET_DIRS})/[^"'\`)\\s]+)`, 'g'),
    // ./file and ../file references (scripts, manifest, icons, pages)
    /["'`](\.{1,2}\/[A-Za-z0-9_.\/-]+\.(?:js|webmanifest|svg|png|html|json))["'`]/g
];

function referencedAssets(file) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const refs = new Set();
    PATTERNS.forEach(re => {
        for (const m of text.matchAll(re)) {
            if (!m[1].includes('${')) refs.add(m[1]);
        }
    });
    return [...refs];
}

try {
    console.log('Running asset reference checks...');
    let checked = 0;
    const missing = [];
    SOURCES.forEach(file => {
        referencedAssets(file).forEach(ref => {
            const resolved = path.normalize(path.join(path.dirname(file), ref));
            checked++;
            if (!fs.existsSync(path.join(root, resolved)) && !KNOWN_MISSING.has(resolved)) {
                missing.push(`${file} -> ${ref}`);
            }
        });
    });
    assert.deepStrictEqual(missing, [], `missing assets:\n  ${missing.join('\n  ')}`);
    KNOWN_MISSING.forEach(f => {
        assert.ok(!fs.existsSync(path.join(root, f)), `${f} exists now: remove it from KNOWN_MISSING`);
    });
    console.log(`  ✓ ${checked} asset references resolve (${KNOWN_MISSING.size} known missing)`);
    console.log('All asset reference checks passed!');
} catch (error) {
    console.error('Asset reference check failed:');
    console.error(error.message);
    process.exit(1);
}
