// Offline tests for tools/aozora-extract.mjs. The fixtures in tools/fixtures/ are
// a synthetic text written in 青空文庫 markup (not a real 青空文庫 file, Shift_JIS
// like the real ones) and a small index: one copyright-free work and one marked
// as under copyright. They are zipped here at test time, the way 青空文庫 ships them.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, cleanAozoraText, excerpt, findStart, norm, skipHeadings, dropNoteNumbers } from './aozora-extract.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// parseCsv: quotes, doubled quotes, embedded newlines, BOM
const rows = parseCsv('﻿"a","b"\n"1","x, ""y""\nz"\n"2",""\n');
assert.deepEqual(rows, [{ a: '1', b: 'x, "y"\nz' }, { a: '2', b: '' }]);

// norm: whitespace and old/new kanji variants
assert.equal(norm('芥川 龍之介'), norm('芥川竜之介'));
assert.equal(norm('森　鷗外'), '森鴎外');

// cleanAozoraText: header/notes/footer, ruby, annotations, gaiji
const raw = '題\n著者\n\n-----------------------\n【記号】\n《》：ルビ\n-----------------------\n\n［＃３字下げ］一［＃「一」は中見出し］\n\n　夜の汽車《きしゃ》は｜青い野原《のはら》を走りました。\n　※［＃「木＋吶のつくり」、第3水準1-85-54］の駅。\n\n底本：「題」\n入力：x\n';
const clean = cleanAozoraText(raw);
assert.ok(clean.startsWith('一'), clean);
assert.ok(clean.includes('夜の汽車は青い野原を走りました。'));
assert.ok(!/[《》｜［］]/.test(clean));
assert.ok(!clean.includes('底本'));
assert.ok(clean.includes('〓の駅'));
assert.ok(!/^\u3000/m.test(clean), 'paragraph indents are stripped');

// excerpt: whole sentences only, stops before gaiji, respects max length
const t = '一つ目の文です。二つ目の文です。」\n三つ目の文です。四つ目〓の文です。';
assert.equal(excerpt(t, 0, 100), '一つ目の文です。二つ目の文です。」');
assert.equal(excerpt(t, 0, 10), '一つ目の文です。');
assert.equal(excerpt('前置き。〓の文。', 0, 100), '前置き。'); // single paragraph: keep the whole sentences before it
assert.equal(findStart('前の段落\n　目印のある段落です。', { mode: 'anchor', anchor: '目印' }), 5);
assert.equal(findStart('abc', { mode: 'anchor', anchor: 'zzz' }), -1);
assert.equal(findStart('序\n三代の榮耀一睡の中にして', { mode: 'anchor', anchor: '三代の栄耀' }), 2); // old kanji in the text

// inline note numbers that count up are dropped; ordinary numerals stay
assert.equal(dropNoteNumbers('一〇三代の榮耀一睡の中にして、一一大門の跡は一里こなたに有。一二秀衡が跡は田野に成て、一三金鷄山のみ形を殘す。'),
    '三代の榮耀一睡の中にして、大門の跡は一里こなたに有。秀衡が跡は田野に成て、金鷄山のみ形を殘す。');
assert.equal(dropNoteNumbers('三人と一人が二度来た。'), '三人と一人が二度来た。');

// headings are skipped; a long first sentence is cut at a comma
assert.equal(skipHeadings('一\n\n本文です。'), '本文です。');
assert.equal(skipHeadings('第１図版\n\n第２図版\n\n雪は天から送られた手紙である。'), '雪は天から送られた手紙である。');
assert.equal(skipHeadings('この書を外国に在る人々に呈す\n\n本文。'), 'この書を外国に在る人々に呈す\n\n本文。');
assert.equal(excerpt('其一\n\nあいうえお、かきくけこ、さしすせそ、たちつてと。', 0, 14), 'あいうえお、かきくけこ、……');

// End to end against the fixtures, in a scratch copy of the project layout.
const dir = mkdtempSync(join(tmpdir(), 'zipangu-aozora-'));
mkdirSync(join(dir, 'tools')); mkdirSync(join(dir, 'world'));
copyFileSync(join(here, 'aozora-extract.mjs'), join(dir, 'tools', 'aozora-extract.mjs'));
writeFileSync(join(dir, 'world', 'library.json'), JSON.stringify([
    { id: 'free_work', title: '試験の星図', author: '架空太郎', author_death_year: 1933, extraction: { mode: 'opening', max_chars: 80 } },
    { id: 'anchored', title: '試験の星図', author: '架空 太郎', author_death_year: 1933, extraction: { mode: 'anchor', anchor: '銀の鉄橋', max_chars: 200 } },
    { id: 'protected', title: '保護中の本', author: '現役 次郎', author_death_year: 1900, extraction: { mode: 'opening', max_chars: 80 } },
    { id: 'missing', title: '存在しない本', author: '架空 太郎', author_death_year: 1933, extraction: { mode: 'opening', max_chars: 80 } }
]));
const zips = join(dir, 'zips');
mkdirSync(zips);
const zipUp = (name, file) => execFileSync('zip', ['-q', '-j', join(zips, name), join(here, 'fixtures', file)]);
zipUp('list_person_all_extended_utf8.zip', 'list_person_all_extended_utf8.csv');
zipUp('99999_ruby_1.zip', 'test_star.txt');
execFileSync('node', [join(dir, 'tools', 'aozora-extract.mjs')], {
    env: { ...process.env, AOZORA_INDEX_ZIP: join(zips, 'list_person_all_extended_utf8.zip'), AOZORA_FILES: zips },
    stdio: 'pipe'
});
const out = JSON.parse(readFileSync(join(dir, 'world', 'library.texts.json'), 'utf8')).works;
assert.equal(out.free_work.status, 'ok');
assert.equal(out.free_work.excerpt, '夜の汽車は青い野原を走りました。窓の外では蝶が光っていました。');
assert.equal(out.free_work.credits.input, 'テスト');
assert.equal(out.anchored.status, 'ok');
assert.ok(out.anchored.excerpt.startsWith('銀の鉄橋を渡るとき'), out.anchored.excerpt);
assert.equal(out.protected.status, 'copyrighted');
assert.equal(out.missing.status, 'not_found');
assert.ok(out.missing.candidates.some(c => c.startsWith('試験の星図')), 'not_found lists what the author does have');

console.log('aozora-extract tests passed');
