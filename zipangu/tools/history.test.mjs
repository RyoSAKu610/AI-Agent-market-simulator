import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../js/history.js', import.meta.url), 'utf8');
const { createHistory } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const eco = { time: 0, clock: { day: 1, label: '明け六つ' }, prices: new Map([['a', new Map([['rice', 8]])], ['b', new Map([['rice', 12]])]]) };
const history = createHistory(eco); history.sample();
eco.time = .5; eco.clock.label = '暮れ六つ'; eco.prices.get('a').set('rice', 10); eco.prices.get('b').set('rice', 16); history.sample();
assert.deepEqual(history.meanSeries('rice'), [10, 13]);
assert.deepEqual(history.series('a', 'rice'), [8, 10]);
assert.deepEqual(history.meanPoints('rice', ['a']), [{ time: 0, day: 1, label: '明け六つ', price: 8 }, { time: .5, day: 1, label: '暮れ六つ', price: 10 }]);
assert.deepEqual(history.meanPoints('rice', ['a', 'b']).map(p => p.price), history.meanSeries('rice'));
for (let i = 1; i <= 80; i++) { eco.time = i; history.sample(); }
assert.equal(history.points('a', 'rice').length, 72);
assert.equal(history.points('a', 'rice')[0].time, 9);
assert.equal(history.meanPoints('rice').at(-1).time, 80);
assert.deepEqual(history.meanPoints('missing'), []);
assert.deepEqual(history.meanPoints('rice', []), []);
console.log('history.test: observed timestamps, scoped averages, legacy series and 72-point retention — passed');
