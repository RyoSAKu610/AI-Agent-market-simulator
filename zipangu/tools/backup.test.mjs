// 🧳 Carry-over files (js/backup.js): everything the site keeps, never an API key,
// and only known keys are ever written back.
import assert from 'node:assert/strict';
import { makeBackup, readBackup, restoreBackup, backupAllowed, BACKUP_MARK } from '../js/backup.js';
import { langUrl } from '../js/i18n.js';

const store = (init = {}) => {
    const m = new Map(Object.entries(init));
    return { get length() { return m.size; }, key: i => [...m.keys()][i] ?? null, getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
};
const src = store({
    'zipangu.journey.v1:1': '{"v":1}', 'zipangu.travellers.v1': '[]', 'zipangu.births.v1': '{}', 'zipangu.progress.v1': '{"v":1}',
    'zipangu.chain.v1': '{"v":1,"treasury":[1,2,3]}', 'zipangu.chain.on': '1', 'zipangu.lang': 'en', 'zipangu.mind.v1': '{}',
    'zipangu.mind.key': 'sk-secret-key-must-stay', 'neonMythos.ltt.v1': '{}', 'other': 'x'
});
const text = makeBackup(src, { now: () => '2026-10-13T00:00:00Z' });
assert.ok(!text.includes('sk-secret-key-must-stay'), 'the API key never leaves');
assert.ok(!text.includes('neonMythos') && !text.includes('"other"'), 'only this world’s keys');
const r = readBackup(text);
assert.equal(r.ok, true);
assert.equal(r.at, '2026-10-13T00:00:00Z');
assert.deepEqual(Object.keys(r.items).sort(), ['zipangu.births.v1', 'zipangu.chain.on', 'zipangu.chain.v1', 'zipangu.journey.v1:1', 'zipangu.lang', 'zipangu.mind.v1', 'zipangu.progress.v1', 'zipangu.travellers.v1']);
assert.equal(r.items['zipangu.chain.v1'], '{"v":1,"treasury":[1,2,3]}', 'the devnet wallet and balance-bearing ledger come along');

// a hostile or broken file
assert.deepEqual(readBackup('nope'), { ok: false, error: 'json' });
assert.deepEqual(readBackup('{"format":"other","items":{}}'), { ok: false, error: 'format' });
assert.deepEqual(readBackup(JSON.stringify({ format: BACKUP_MARK, items: { 'zipangu.mind.key': 'x', '__proto__': 'y', 'evil': 'z' } })), { ok: false, error: 'empty' });
const mixed = readBackup(JSON.stringify({ format: BACKUP_MARK, items: { 'zipangu.lang': 'de', 'zipangu.mind.key': 'steal', 'zipangu.journey.v1:abc': '{}', 'zipangu.progress.v1': 42 } }));
assert.deepEqual(Object.keys(mixed.items), ['zipangu.lang'], 'unknown keys, API keys and non-strings are dropped');

// restoring writes only allowed keys and leaves the rest alone
const dst = store({ 'zipangu.mind.key': 'mine', 'zipangu.speed': '4' });
assert.equal(restoreBackup(dst, { ...r.items, 'zipangu.mind.key': 'theirs' }), 8);
assert.equal(dst.getItem('zipangu.mind.key'), 'mine');
assert.equal(dst.getItem('zipangu.speed'), '4');
assert.equal(dst.getItem('zipangu.chain.v1'), src.getItem('zipangu.chain.v1'));
for (const k of ['zipangu.journey.v1:12', 'zipangu.chain.on', 'zipangu.welcome']) assert.ok(backupAllowed(k), k);
for (const k of ['zipangu.mind.key', 'zipangu.journey.v1:', 'zipangu.x', 'neonMythos.ltt.v1']) assert.ok(!backupAllowed(k), k);

// a language change keeps ?lang= in step with the choice
assert.equal(langUrl('https://x.test/zipangu/?lang=en#/summon', 'ja'), 'https://x.test/zipangu/?lang=ja#/summon');
assert.equal(langUrl('https://x.test/zipangu/#/settings', 'de'), 'https://x.test/zipangu/#/settings', 'an address without ?lang= is left alone');
assert.equal(langUrl('not a url', 'de'), 'not a url');

console.log('backup tests passed');
