const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

// Guards the shipped HTML builds against the two failures this repo has hit
// before: a truncated upload (NeonMythosCity_Start.html, 439905b) and an edit
// that silently breaks the bridge between index.html and the JS layers.
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const BUILDS = [
    'index.html',
    'neon-mythos-districts.html',
    'NeonMythosCity_Start.html',
    'neon-mythos-city.html',
    'neon-mythos-codex-pets.html'
];

// Event names and hooks that index.html and neon-mythos-*.js rely on each other for.
const CONTRACT = {
    'index.html': [
        './manifest.webmanifest',
        './neon-mythos-experience.js',
        './neon-mythos-errand.js',
        './neon-mythos-route-fx.js',
        '"data-agent-id": id',
        'nm:ltt-command',
        'nm:create-companion',
        'nm:ltt-event',
        'nm:route-agent',
        'nm:agent-routed',
        'fromX: agent.x',
        'tile: TILE'
    ],
    'neon-mythos-experience.js': ['nm:errand-request', 'nm:ltt-command', 'nm:create-companion'],
    'neon-mythos-errand.js': ['nm:errand-request', 'nm:route-agent', 'nm:agent-routed'],
    'neon-mythos-route-fx.js': ['nm:agent-routed', 'data-agent-id']
};

function testBuildsAreComplete() {
    BUILDS.forEach(file => {
        const html = read(file);
        assert.ok(/<\/html>\s*$/i.test(html), `${file} must end with </html> (truncated upload?)`);

        // Plain inline <script> blocks must parse. Babel (JSX) blocks are skipped.
        const blocks = [...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
            .filter(m => !/\bsrc=/.test(m[1] || '') && !/type=/.test(m[1] || ''));
        blocks.forEach((m, i) => {
            try {
                new vm.Script(m[2], { filename: `${file}#script${i + 1}` });
            } catch (e) {
                throw new Error(`${file} inline script ${i + 1} does not parse: ${e.message}`);
            }
        });
        console.log(`  ✓ ${file} (${blocks.length} inline scripts parsed)`);
    });
}

function testExperienceContract() {
    Object.entries(CONTRACT).forEach(([file, needles]) => {
        const text = read(file);
        needles.forEach(n => assert.ok(text.includes(n), `${file} is missing "${n}"`));
        console.log(`  ✓ ${file} contract (${needles.length} hooks)`);
    });
}

try {
    console.log('Running build integrity checks...');
    testBuildsAreComplete();
    testExperienceContract();
    console.log('All build integrity checks passed!');
} catch (error) {
    console.error('Build integrity check failed:');
    console.error(error.message);
    process.exit(1);
}
