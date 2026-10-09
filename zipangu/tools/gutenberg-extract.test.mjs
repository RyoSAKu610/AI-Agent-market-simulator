// Offline tests for tools/gutenberg-extract.mjs. The catalogue and the texts
// below are synthetic (written for this test, not real Gutenberg files).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePeople, publicDomainInJapan, cleanGutenbergText, headerSaysCopyrighted, findStartEn, excerptEn } from './gutenberg-extract.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// parsePeople: years, roles, open start years, BCE, no dates
assert.deepEqual(parsePeople('Carroll, Lewis, 1832-1898; Tenniel, John, 1820-1914 [Illustrator]'), [
    { name: 'Carroll, Lewis', role: 'Author', died: 1898 },
    { name: 'Tenniel, John', role: 'Illustrator', died: 1914 }
]);
assert.equal(parsePeople('Ozaki, Yei Theodora, -1932')[0].died, 1932);
assert.equal(parsePeople('Polo, Marco, 1254?-1324?')[0].died, 1324);
assert.equal(parsePeople('Homer, 751? BCE-651? BCE')[0].died, -651);
assert.equal(parsePeople('Someone, Living')[0].died, null);

// publicDomainInJapan: everyone must have died in 1967 or earlier
assert.equal(publicDomainInJapan(parsePeople('Wells, H. G. (Herbert George), 1866-1946')), true);
assert.equal(publicDomainInJapan(parsePeople('Old, Author, 1850-1900; New, Translator, 1920-1980 [Translator]')), false);
assert.equal(publicDomainInJapan(parsePeople('Someone, Living')), false);
assert.equal(publicDomainInJapan(parsePeople('Anonymous')), true);
assert.equal(publicDomainInJapan([]), false);

// cleanGutenbergText: header/footer, unwrapping, italics, illustrations
const raw = 'The Project Gutenberg eBook of A Test\r\n\r\n*** START OF THE PROJECT GUTENBERG EBOOK A TEST ***\r\n\r\nCONTENTS\r\n\r\n[Illustration: a lantern]\r\n\r\nThe lantern _glowed_ over the\r\nharbour. Mr. Kite\r\nwaved.\r\n\r\nSecond paragraph here.\r\n\r\n*** END OF THE PROJECT GUTENBERG EBOOK A TEST ***\r\nlicence text\r\n';
const clean = cleanGutenbergText(raw);
assert.equal(clean, 'CONTENTS\n\nThe lantern glowed over the harbour. Mr. Kite waved.\n\nSecond paragraph here.');
assert.equal(headerSaysCopyrighted(raw), false);
assert.equal(headerSaysCopyrighted('This eBook is copyrighted.\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\ntext'), true);

// findStartEn: paragraph start; curly quotes fold
assert.equal(findStartEn(clean, { mode: 'anchor', anchor: 'glowed over' }), 'CONTENTS\n\n'.length);
assert.equal(findStartEn('A\n\nIt’s here.', { mode: 'anchor', anchor: "It's here" }), 3);
assert.equal(findStartEn(clean, { mode: 'anchor', anchor: 'nowhere' }), -1);

// excerptEn: whole sentences, never ends on "Mr."
const start = findStartEn(clean, { mode: 'anchor', anchor: 'glowed over' });
assert.equal(excerptEn(clean, start, 200), 'The lantern glowed over the harbour. Mr. Kite waved.\n\nSecond paragraph here.');
assert.equal(excerptEn(clean, start, 45), 'The lantern glowed over the harbour.');
assert.equal(excerptEn('One very long sentence, with a comma, that keeps going on.', 0, 30), 'One very long sentence, …');

// End to end in a scratch copy of the project layout.
const dir = mkdtempSync(join(tmpdir(), 'zipangu-gutenberg-'));
const files = join(dir, 'files');
mkdirSync(join(dir, 'tools')); mkdirSync(join(dir, 'world')); mkdirSync(files);
for (const f of ['gutenberg-extract.mjs', 'aozora-extract.mjs']) copyFileSync(join(here, f), join(dir, 'tools', f));
const book = body => `Header\n*** START OF THE PROJECT GUTENBERG EBOOK T ***\n\nTITLE PAGE\n\n${body}\n\n*** END OF THE PROJECT GUTENBERG EBOOK T ***\n`;
writeFileSync(join(files, 'pg101.txt'), book('Chapter one.\n\nNo lighthouse in this volume.'));
writeFileSync(join(files, 'pg102.txt'), book('The lighthouse stood on the\nrock. It was bright.'));
writeFileSync(join(files, 'pg201.txt'), book('Modern words.'));
writeFileSync(join(dir, 'catalog.csv'), [
    'Text#,Type,Issued,Title,Language,Authors,Subjects,LoCC,Bookshelves',
    '101,Text,2000-01-01,"The Lighthouse — Volume 1",en,"Keeper, Old, 1800-1880",,,',
    '102,Text,2000-01-01,"The Lighthouse — Volume 2",en,"Keeper, Old, 1800-1880; Teller, Young, 1890-1950 [Translator]",,,',
    '201,Text,2000-01-01,"Modern Book",en,"Writer, New, 1940-1990",,,',
    '301,Text,2000-01-01,"Other Book",en,"Keeper, Old, 1800-1880",,,'
].join('\n') + '\n');
writeFileSync(join(dir, 'world', 'library.json'), JSON.stringify([
    { id: 'lighthouse', source: 'gutenberg', language: 'en', gutenberg_id: 101, title: 'The Lighthouse', author: 'Old Keeper', extraction: { mode: 'anchor', anchor: 'The lighthouse stood', max_chars: 300 } },
    { id: 'modern', source: 'gutenberg', language: 'en', gutenberg_id: 201, title: 'Modern Book', author: 'New Writer', extraction: { mode: 'anchor', anchor: 'Modern', max_chars: 300 } },
    { id: 'missing', source: 'gutenberg', language: 'en', gutenberg_id: 999, title: 'No Such Book', author: 'Old Keeper', extraction: { mode: 'anchor', anchor: 'x', max_chars: 300 } },
    { id: 'japanese', title: '日本の本', author: '架空 太郎', extraction: { mode: 'opening', max_chars: 80 } }
]));
writeFileSync(join(dir, 'world', 'library.texts.json'), JSON.stringify({ source: 'old', works: { japanese: { status: 'ok', excerpt: '既存の抜粋。' } } }));
execFileSync('node', [join(dir, 'tools', 'gutenberg-extract.mjs')], {
    env: { ...process.env, GUTENBERG_CATALOG: join(dir, 'catalog.csv'), GUTENBERG_FILES: files },
    stdio: 'pipe'
});
const out = JSON.parse(readFileSync(join(dir, 'world', 'library.texts.json'), 'utf8')).works;
assert.equal(out.lighthouse.status, 'ok', JSON.stringify(out.lighthouse));
assert.equal(out.lighthouse.gutenberg_id, 102, 'falls back to the volume that has the anchor');
assert.equal(out.lighthouse.excerpt, 'The lighthouse stood on the rock. It was bright.');
assert.equal(out.lighthouse.card_url, 'https://www.gutenberg.org/ebooks/102');
assert.equal(out.modern.status, 'copyrighted');
assert.equal(out.missing.status, 'not_found');
assert.ok(out.missing.candidates.some(c => c.includes('Other Book')));
assert.equal(out.japanese.excerpt, '既存の抜粋。', 'Japanese works are left to the 青空文庫 extractor');

console.log('gutenberg-extract tests passed');
