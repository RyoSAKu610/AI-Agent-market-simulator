const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Desk mode (neon-mythos-desk.js): what the buddy says and does, which runs without a DOM.
const root = path.join(__dirname, '..');
const L = require(path.join(root, 'neon-mythos-desk.js'));
const at = (h, m = 0) => new Date(2026, 10, 6, h, m);
const zero = () => 0;

// replies: words map to actions, and errands keep the city's goal keys
assert.deepStrictEqual(L.reply('データを調べてきて', { rand: zero }), { say: 'まかせて！ ちょっと考えるね。', act: 'errand', goalKey: 'data_hegemony' }, 'an errand, not "come here", even though it ends in きて');
assert.strictEqual(L.reply('建物を建設して').goalKey, 'construction');
assert.strictEqual(L.reply('この地区をお願い').goalKey, 'district_control', 'unknown errands fall back like the hub does');
assert.strictEqual(L.reply('こっち来て').act, 'come');
assert.strictEqual(L.reply('おやすみ').act, 'sleep');
assert.strictEqual(L.reply('またね').act, 'leave');
assert.strictEqual(L.reply('とんとん').act, 'knock');
assert.strictEqual(L.reply('かわいいね', { rand: zero }).act, 'jump');
assert.strictEqual(L.reply('今何時？', { date: at(8, 5) }).say, 'いまは8時5分だよ。');
assert.strictEqual(L.reply('').act, 'nod');
assert.strictEqual(L.reply('ふーん', { rand: zero }).say, 'うんうん。');

// the real time of day
assert.strictEqual(L.partOfDay(7), 'morning');
assert.strictEqual(L.partOfDay(13), 'day');
assert.strictEqual(L.partOfDay(17), 'evening');
assert.strictEqual(L.partOfDay(23), 'night');
assert.ok(L.isNight(2) && L.isNight(22) && !L.isNight(12));
assert.ok(L.reply('おはよう', { date: at(7), name: 'LIRA' }).say.includes('LIRA'));
assert.ok(L.greeting(1, 'X').includes('こんな時間'));

// idle behaviour: every pick is a move the desk knows, and only nights bring sleep
const seen = new Set();
for (let i = 0; i < 200; i++) seen.add(L.pickIdle(() => i / 200));
['wander', 'knock', 'peek'].forEach(k => assert.ok(seen.has(k), 'day idles include ' + k));
assert.ok(!seen.has('sleep'), 'no sleeping in the daytime');
let nightSleep = false;
for (let i = 0; i < 200; i++) if (L.pickIdle(() => i / 200, { night: true }) === 'sleep') nightSleep = true;
assert.ok(nightSleep, 'she dozes off at night');

// the phone itself
assert.strictEqual(L.tilt(30, 0), 'right');
assert.strictEqual(L.tilt(-30, 0), 'left');
assert.strictEqual(L.tilt(40, 30), null, 'tilt is measured from the pose the phone had when she arrived');
assert.ok(L.shaken({ x: 20, y: 15, z: 0 }) && !L.shaken({ x: 2, y: 1, z: 0 }) && !L.shaken(null));

// Pepper's ghost flips the picture; the placed mode never does
assert.strictEqual(L.flipCss('placed', true, true), 'none');
assert.strictEqual(L.flipCss('hologram', false, true), 'scale(1,-1)');
assert.strictEqual(L.flipCss('hologram', true, false), 'scale(-1,1)');

// wired into the build and the offline shell
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(sw.includes("'./neon-mythos-desk.js'"), 'the PWA shell caches desk mode');
assert.ok(html.includes('<script defer src="./neon-mythos-desk.js"></script>'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
assert.ok(manifest.shortcuts.some(s => s.url === './?desk=1'), 'a home-screen shortcut opens desk mode');

console.log('Desk mode checks passed.');
