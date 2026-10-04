// Offline tests for tools/aozora-extract.mjs. The fixtures in tools/fixtures/ are
// a synthetic text written in 青空文庫 markup (not a real 青空文庫 file) and a
// two-row index: one copyright-free work and one marked as under copyright.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, cleanAozoraText, excerpt, findStart, norm } from './aozora-extract.mjs';

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
execFileSync('node', [join(dir, 'tools', 'aozora-extract.mjs')], {
    env: { ...process.env, AOZORA_INDEX_ZIP: join(here, 'fixtures', 'list_person_all_extended_utf8.zip'), AOZORA_FILES: join(here, 'fixtures') },
    stdio: 'pipe'
});
const out = JSON.parse(readFileSync(join(dir, 'world', 'library.texts.json'), 'utf8')).works;
assert.equal(out.free_work.status, 'ok');
assert.equal(out.free_work.excerpt, '一\n\n夜の汽車は青い野原を走りました。窓の外では蝶が光っていました。');
assert.equal(out.free_work.credits.input, 'テスト');
assert.equal(out.anchored.status, 'ok');
assert.ok(out.anchored.excerpt.startsWith('銀の鉄橋を渡るとき'), out.anchored.excerpt);
assert.equal(out.protected.status, 'copyrighted');
assert.equal(out.missing.status, 'not_found');

console.log('aozora-extract tests passed');
