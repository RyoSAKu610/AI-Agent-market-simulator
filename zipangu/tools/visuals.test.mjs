// Contract checks for additional concept art and canonical world IDs.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'js/visual-manifest.js'), 'utf8');
const { VISUALS, visualKey } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const worldIds = Object.fromEntries(['creature', 'agent', 'currency', 'era', 'realm'].map(type => {
    const stem = { creature: 'creatures', agent: 'agents', currency: 'currencies', era: 'eras', realm: 'realms' }[type];
    return [type, new Set(JSON.parse(readFileSync(join(root, `world/${stem}.json`), 'utf8')).map(x => x.id))];
}));
const manifestKeys = new Set(VISUALS.map(visualKey));
assert.equal(manifestKeys.size, VISUALS.length, 'duplicate visual identities');
const expectedKeys = new Set(['concept:bansei_clock', ...Object.entries(worldIds).flatMap(([type, ids]) => [...ids].map(id => type + ':' + id))]);
assert.deepEqual(manifestKeys, expectedKeys, 'every canonical subject must remain in the production catalog');
let ready = 0;
for (const v of VISUALS) {
    assert.ok(['ready', 'planned'].includes(v.status));
    assert.ok(v.type === 'concept' && v.id === 'bansei_clock' || worldIds[v.type]?.has(v.id), `${visualKey(v)} must use a canonical ID`);
    assert.match(v.file, /^[a-z0-9_-]+\.png$/);
    if (v.status !== 'ready') continue;
    const file = join(root, 'assets/visuals', v.file);
    assert.ok(existsSync(file), `reviewed asset missing: ${file}`);
    const bytes = readFileSync(file);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG expected');
    assert.ok(bytes.readUInt32BE(16) >= 1024 && bytes.readUInt32BE(20) >= 1024, 'original full-resolution artwork expected');
    if (v.poses) {
        assert.match(v.poses, /^[a-z0-9_-]+\.png$/);
        const sheet = readFileSync(join(root, 'assets/visuals', v.poses));
        assert.equal(sheet.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        const width = sheet.readUInt32BE(16), height = sheet.readUInt32BE(20);
        assert.ok(width >= 1024 && height >= 1024, 'full-resolution 2×2 pose sheet expected');
        assert.ok(!v.poseAspect || Math.abs(v.poseAspect - width / height) < 0.001, 'pose cell aspect ratio must preserve the original artwork');
    }
    ready++;
}
console.log(`visuals.test: ${ready} reviewed PNGs, ${VISUALS.length} canonical manifest entries — passed`);
