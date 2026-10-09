#!/usr/bin/env node
// Fills world/library.texts.json with English excerpts for the works in
// world/library.json whose `source` is "gutenberg". A work is used only when
// every person the Project Gutenberg catalogue lists on it (author, translator,
// editor, illustrator…) has a recorded death year of 1967 or earlier, which is
// the Japanese public-domain line. Nothing is ever typed in by hand.
//
//   node tools/gutenberg-extract.mjs            # all Gutenberg works
//   node tools/gutenberg-extract.mjs --only en_alice_wonderland
//
// Offline/testing: GUTENBERG_CATALOG=<path to pg_catalog.csv> and
// GUTENBERG_FILES=<dir> (texts looked up as pg<id>.txt) skip the network.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './aozora-extract.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_URL = 'https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv';
const textUrl = id => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`;
const PD_LAST_DEATH_YEAR = 1967;
const UA = { 'User-Agent': 'zipangu-wonderland/1.0 (public-domain excerpt builder)' };

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();

async function getText(url, localName, envDir) {
    const local = process.env[envDir] && join(process.env[envDir], localName);
    if (local && existsSync(local)) return readFileSync(local, 'utf8');
    if (local) throw new Error(`${localName} is not in ${envDir}`);  // offline runs never reach the network
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
}

// "Carroll, Lewis, 1832-1898; Tenniel, John, 1820-1914 [Illustrator]"
// → [{ name, role, died }]. died is null when the catalogue gives no year.
export function parsePeople(authors) {
    return String(authors || '').split(';').map(s => s.trim()).filter(Boolean).map(p => {
        const role = (p.match(/\[([^\]]+)\]\s*$/) || [, 'Author'])[1];
        const bare = p.replace(/\s*\[[^\]]+\]\s*$/, '');
        const years = bare.match(/(\d{0,4})\??\s*(?:BCE?)?\s*-\s*(\d{3,4})\??\s*(BCE?)?\s*$/);
        const died = years ? (years[3] ? -Number(years[2]) : Number(years[2])) : null;
        const name = bare.replace(/,?\s*[\d?]*\s*(?:BCE?)?\s*-\s*[\d?]*\s*(?:BCE?)?\s*$/, '').trim();
        return { name, role, died };
    });
}

// A person the catalogue names without dates can only be accepted when the
// name itself says nobody is known.
const NAMELESS = /^(anonymous|unknown)$/i;
export function publicDomainInJapan(people) {
    return people.length > 0 && people.every(p => NAMELESS.test(p.name) || (p.died !== null && p.died <= PD_LAST_DEATH_YEAR));
}

// Strips the Gutenberg header and footer, illustration notes and _italics_
// marks, and unwraps hard-wrapped lines so each paragraph is one line.
export function cleanGutenbergText(raw) {
    let t = raw.replace(/\r\n?/g, '\n').replace(/^﻿/, '');
    const start = t.search(/^\*{3}\s*START OF (THE|THIS) PROJECT GUTENBERG.*$/mi);
    if (start >= 0) t = t.slice(t.indexOf('\n', start) + 1);
    const end = t.search(/^\*{3}\s*END OF (THE|THIS) PROJECT GUTENBERG/mi);
    if (end >= 0) t = t.slice(0, end);
    t = t.replace(/\[Illustration[^\]]*\]/gi, '').replace(/_([^_\n]+)_/g, '$1')
        .replace(/\{\d+\}|\[\d+\]/g, '');   // footnote markers such as {1} or [12]
    return t.split(/\n\s*\n/)
        .map(p => p.split('\n').map(l => l.trim()).join(' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n\n');
}

// Whether the header before the text marks the book as still under copyright.
export function headerSaysCopyrighted(raw) {
    const head = raw.slice(0, Math.max(0, raw.search(/\*{3}\s*START OF/i)) || 4000);
    return /copyrighted project gutenberg|this ebook is copyrighted|copyright \(c\)|©/i.test(head);
}

export function findStartEn(text, extraction) {
    if (extraction.mode !== 'anchor') return 0;
    const fold = s => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
    const i = fold(text).indexOf(fold(extraction.anchor));
    if (i < 0) return -1;
    const para = text.lastIndexOf('\n\n', i);
    return para < 0 ? 0 : para + 2;
}

// Whole sentences from `start` up to `maxChars`. Never ends on an abbreviation
// such as "Mr." that only looks like the end of a sentence.
const ABBREV = /\b(Mr|Mrs|Dr|St|Mt|Jr|Sr|vol|ch|No|i\.e|e\.g|cf|viz)\.$/i;
export function excerptEn(text, start, maxChars) {
    const body = text.slice(start);
    const parts = body.match(/[^.!?\n]+(?:[.!?]+["'’”)\]]*\s*|\n+|$)/g) || [];
    let out = '', safe = '';
    for (const s of parts) {
        if ((out + s).trimEnd().length > maxChars) break;
        out += s;
        if (!ABBREV.test(out.trimEnd()) && /[.!?]["'’”)\]]*\s*$|\n$/.test(out)) safe = out;
    }
    const result = safe.trim();
    if (result) return result;
    const head = body.slice(0, maxChars);
    const comma = head.lastIndexOf(',');
    return (comma > maxChars / 2 ? head.slice(0, comma + 1) : head).trim() + ' …';
}

const lc = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const surname = author => lc(author).split(' ').pop();

async function main() {
    const library = JSON.parse(readFileSync(join(ROOT, 'world', 'library.json'), 'utf8')).filter(w => w.source === 'gutenberg');
    const outPath = join(ROOT, 'world', 'library.texts.json');
    const previous = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : { works: {} };

    const catalogText = process.env.GUTENBERG_CATALOG ? readFileSync(process.env.GUTENBERG_CATALOG, 'utf8') : await getText(CATALOG_URL);
    const rows = parseCsv(catalogText);
    ['Text#', 'Type', 'Title', 'Language', 'Authors'].forEach(c => { if (!(c in rows[0])) throw new Error(`catalogue has no column "${c}"`); });
    const byId = new Map(rows.map(r => [Number(r['Text#']), r]));

    const works = { ...previous.works };
    for (const w of library) {
        if (only && w.id !== only) continue;
        const fits = r => r && r.Type === 'Text' && /\ben\b/.test(r.Language) &&
            lc(r.Title).startsWith(lc(w.title)) && lc(r.Authors).includes(surname(w.author));
        // The pinned id comes first; other editions with the same title and author are fallbacks.
        const candidates = [byId.get(w.gutenberg_id), ...rows.filter(r => Number(r['Text#']) !== w.gutenberg_id)].filter(fits);
        if (!candidates.length) {
            const near = rows.filter(r => r.Type === 'Text' && lc(r.Authors).includes(surname(w.author))).slice(0, 12).map(r => `#${r['Text#']} ${r.Title}`);
            works[w.id] = { status: 'not_found', note: `${w.title} / ${w.author} is not in the Gutenberg catalogue`, candidates: near };
            continue;
        }
        let result = null;
        for (const r of candidates.slice(0, 4)) {
            const id = Number(r['Text#']);
            // library.json may give a death year the catalogue lacks (undated_people), as a reviewed fact.
            const people = parsePeople(r.Authors).map(p => p.died === null && w.undated_people && Number.isInteger(w.undated_people[p.name]) ? { ...p, died: w.undated_people[p.name] } : p);
            if (!publicDomainInJapan(people)) { result = result || { status: 'copyrighted', note: `catalogue lists: ${r.Authors}` }; continue; }
            try {
                const raw = await getText(textUrl(id), `pg${id}.txt`, 'GUTENBERG_FILES');
                if (headerSaysCopyrighted(raw)) { result = result || { status: 'copyrighted', note: `#${id} header marks it as copyrighted` }; continue; }
                const text = cleanGutenbergText(raw);
                const start = findStartEn(text, w.extraction);
                if (start < 0) { result = result || { status: 'anchor_not_found', card_url: `https://www.gutenberg.org/ebooks/${id}`, note: `anchor "${w.extraction.anchor}" not in #${id}` }; continue; }
                const ex = excerptEn(text, start, w.extraction.max_chars || 600);
                result = {
                    status: ex ? 'ok' : 'empty',
                    source: 'gutenberg',
                    language: 'en',
                    excerpt: ex,
                    chars: ex.length,
                    gutenberg_id: id,
                    card_url: `https://www.gutenberg.org/ebooks/${id}`,
                    catalogue_title: r.Title,
                    people: people.map(p => `${p.name}${p.role !== 'Author' ? ` (${p.role})` : ''}${p.died !== null ? `, d. ${p.died}` : ''}`)
                };
                break;
            } catch (e) {
                result = result || { status: 'error', note: e.message };
            } finally {
                await new Promise(res => setTimeout(res, 1000)); // be gentle with Gutenberg
            }
        }
        // A download that failed this time must not replace an excerpt an earlier run got.
        const before = previous.works && previous.works[w.id];
        works[w.id] = result && result.status === 'error' && before && before.status === 'ok' ? before : result;
    }

    const out = { ...previous, generated_at: new Date().toISOString(), works };
    out.source = '青空文庫 https://www.aozora.gr.jp/ and Project Gutenberg https://www.gutenberg.org/ — public-domain texts; credits per work';
    writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
    const tally = library.reduce((m, w) => { const s = works[w.id] ? works[w.id].status : 'skipped'; return { ...m, [s]: (m[s] || 0) + 1 }; }, {});
    console.log('gutenberg excerpts:', JSON.stringify(tally));
    library.filter(w => works[w.id] && works[w.id].status !== 'ok').forEach(w => console.log(`  ${w.id}: ${works[w.id].status} ${works[w.id].note || ''} ${(works[w.id].candidates || []).join(' | ')}`));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main().catch(e => { console.error(e); process.exit(1); });
}
