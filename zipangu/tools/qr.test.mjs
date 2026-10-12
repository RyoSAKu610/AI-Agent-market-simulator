// Known-answer tests for js/qr.js. The SHA-256 values are of the module matrix
// (rows of 0/1 joined by \n, no quiet zone) that the reference Python encoder
// `qrcode` 8.2 produces for the same text, level M, byte mode and mask. During
// development every auto-masked symbol was also read back with OpenCV.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { encodeQR, qrSvg, chooseVersion, utf8 } from '../js/qr.js';

const sha = q => createHash('sha256').update(q.modules.map(r => r.map(v => (v ? '1' : '0')).join('')).join('\n')).digest('hex');

const CASES = [
    ['A', 1, 0, '2bae48594b7325872d655a95d8814f09f3825eba52faa8c8b4e3c6dd453105e5'],
    ['https://ryosaku610.github.io/AI-Agent-market-simulator/zipangu/#/summon', 5, 3, '2adbd74860cc212dd6562a6b7f641c43528ed14108f4bb9851bee3f34a5c6884'],
    ['q'.repeat(108), 7, 0, '8cb59800e9d996d19500248415a5662719b39b02026b7e2e15f038a0932cc16b'],
    ['万華京ジパング'.repeat(9), 10, 5, 'b5dab66963b55177e257d2b8a5478cb50c3371c794e2f39d827446bf32104cd1'],
    ['y'.repeat(400), 15, 2, 'a235f937787d0d9ad7abc9b1ee808dd6f26553aa815131cf74156bf200f182e4'],
    ['z'.repeat(660), 20, 7, 'db56f0a53ce31fd9e55dab67c3f69ffb59fb205d8f71fcaaf8548f96c67796dc']
];
for (const [text, version, mask, want] of CASES) {
    const q = encodeQR(text, { mask });
    assert.equal(q.version, version, `version for ${text.slice(0, 20)}`);
    assert.equal(q.size, version * 4 + 17);
    assert.equal(sha(q), want, `matrix for v${version} mask ${mask}`);
}

// automatic mask choice still yields a well-formed symbol
const auto = encodeQR('https://example.org/zipangu/#/summon?lang=en');
assert.ok(auto.mask >= 0 && auto.mask < 8);
assert.equal(chooseVersion(utf8('x'.repeat(667))), 0, 'too long for version 20');
assert.equal(encodeQR('x'.repeat(667)), null);

const svg = qrSvg('hello', { label: 'a <b> & "c"' });
assert.ok(svg.startsWith('<svg') && svg.includes('<title>a &lt;b&gt; &amp; &quot;c&quot;</title>'));

console.log('qr tests passed');
