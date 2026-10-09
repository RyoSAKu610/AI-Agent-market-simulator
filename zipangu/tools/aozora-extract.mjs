#!/usr/bin/env node
// Fills world/library.texts.json with excerpts from 青空文庫 for every work in
// world/library.json. A work is used only when the 青空文庫 index marks the work
// AND every person on it (author, translator, …) as copyright-free
// (作品著作権フラグ / 人物著作権フラグ = なし). Nothing is ever typed in by hand.
//
//   node tools/aozora-extract.mjs            # all works
//   node tools/aozora-extract.mjs --only ginga_tetsudo_no_yoru
//
// Offline/testing: AOZORA_INDEX_ZIP=<path to list_person_all_extended_utf8.zip>
// and AOZORA_FILES=<dir> (text zips looked up by their file name) skip the network.
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_URL = 'https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip';
const PD_LAST_DEATH_YEAR = 1967;

const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();
const work = mkdtempSync(join(tmpdir(), 'aozora-'));

async function fetchFile(url, name) {
    const local = process.env.AOZORA_FILES && join(process.env.AOZORA_FILES, basename(new URL(url).pathname));
    if (local && existsSync(local)) return local;
    const res = await fetch(url, { headers: { 'User-Agent': 'zipangu-wonderland/1.0 (public-domain excerpt builder)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const out = join(work, name || basename(new URL(url).pathname));
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    return out;
}

function unzip(zipPath) {
    const dir = mkdtempSync(join(work, 'x-'));
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', dir]);
    return readdirSync(dir).map(f => join(dir, f));
}

// RFC 4180 CSV (quoted fields, doubled quotes, newlines inside quotes).
export function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') quoted = false;
            else field += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field); rows.push(row); row = []; field = '';
        } else field += ch;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    const header = rows.shift().map(h => h.replace(/^﻿/, ''));
    return rows.filter(r => r.length > 1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// 青空文庫 spells some names with the simplified form (芥川 竜之介, 森 鴎外).
const VARIANTS = { '龍': '竜', '鷗': '鴎', '國': '国', '澤': '沢', '邊': '辺', '邉': '辺', '齋': '斎', '齊': '斉', '髙': '高', '﨑': '崎', '濱': '浜', '櫻': '桜', '會': '会', '與': '与' };
export const norm = s => String(s || '').replace(/[\s\u3000]+/g, '').replace(/./g, ch => VARIANTS[ch] || ch);

const COL = {
    workId: '作品ID', title: '作品名', kana: '文字遣い種別', workRight: '作品著作権フラグ', card: '図書カードURL',
    last: '姓', first: '名', role: '役割フラグ', died: '没年月日', personRight: '人物著作権フラグ',
    base: '底本名1', input: '入力者', proof: '校正者', text: 'テキストファイルURL'
};

// Strips 青空文庫 markup: header, notes block, footer, ruby, annotations.
export function cleanAozoraText(raw) {
    let t = raw.replace(/\r\n?/g, '\n');
    const sep = /^-{20,}\s*$/m;
    const first = t.search(sep);
    if (first >= 0) {
        const rest = t.slice(first).replace(sep, '');
        const second = rest.search(sep);
        t = second >= 0 ? rest.slice(second).replace(sep, '') : rest;
    } else {
        t = t.split('\n').slice(2).join('\n'); // title + author lines
    }
    const footer = t.search(/^底本：/m);
    if (footer >= 0) t = t.slice(0, footer);
    t = t.replace(/※［＃[^］]*］/g, '〓')   // gaiji: marked, excerpts avoid them
        .replace(/［＃[^］]*］/g, '')        // layout annotations
        .replace(/《[^》]*》/g, '')          // ruby readings
        .replace(/｜/g, '')                  // ruby base markers
        .replace(/〔|〕/g, '');
    return t.split('\n').map(l => l.replace(/^[\u3000 ]+/, '').replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Takes whole sentences from `start` until `maxChars`, never cutting mid-sentence.
// A paragraph containing a gaiji placeholder is dropped whole, so the excerpt
// never ends on a fragment that led into it.
export function excerpt(text, start, maxChars) {
    const body = text.slice(start);
    const sentences = body.match(/[^。！？\n]*(?:[。！？][」』）]*|\n+)/g) || [];
    let out = '', paraStart = 0;
    for (const s of sentences) {
        if (s.includes('〓')) { if (paraStart > 0) out = out.slice(0, paraStart); break; }
        if ((out + s).replace(/\n+$/, '').length > maxChars) break;
        out += s;
        if (s.endsWith('\n')) paraStart = out.length;
    }
    return out.replace(/\n+$/, '').trim();
}

export function findStart(text, extraction) {
    if (extraction.mode === 'anchor') {
        const i = text.indexOf(extraction.anchor);
        if (i < 0) return -1;
        const para = text.lastIndexOf('\n', i);
        return para < 0 ? 0 : para + 1;
    }
    return 0;
}

async function main() {
    const library = JSON.parse(readFileSync(join(ROOT, 'world', 'library.json'), 'utf8'));
    const outPath = join(ROOT, 'world', 'library.texts.json');
    const previous = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : { works: {} };

    const indexZip = process.env.AOZORA_INDEX_ZIP || await fetchFile(INDEX_URL);
    const csvFile = unzip(indexZip).find(f => f.endsWith('.csv'));
    const rows = parseCsv(readFileSync(csvFile, 'utf8'));
    Object.values(COL).forEach(c => { if (!(c in rows[0])) throw new Error(`index CSV has no column "${c}"`); });

    const byWork = new Map();
    rows.forEach(r => { if (!byWork.has(r[COL.workId])) byWork.set(r[COL.workId], []); byWork.get(r[COL.workId]).push(r); });

    const works = { ...previous.works };
    for (const w of library) {
        if (only && w.id !== only) continue;
        const wantAuthor = norm(w.author), wantTitle = norm(w.title);
        const candidates = rows.filter(r => norm(r[COL.title]) === wantTitle && r[COL.role] === '著者' && norm(r[COL.last] + r[COL.first]) === wantAuthor);
        if (!candidates.length) { works[w.id] = { status: 'not_found', note: `${w.title} / ${w.author} is not in the 青空文庫 index` }; continue; }
        // Prefer modern orthography, then any edition whose people are all copyright-free.
        candidates.sort((a, b) => (b[COL.kana] === '新字新仮名') - (a[COL.kana] === '新字新仮名'));
        const pick = candidates.find(r => r[COL.workRight] === 'なし' && byWork.get(r[COL.workId]).every(p => p[COL.personRight] === 'なし'));
        if (!pick) { works[w.id] = { status: 'copyrighted', note: 'the index marks this work or one of its people as under copyright' }; continue; }
        const died = Number((pick[COL.died] || '').slice(0, 4));
        if (!(died <= PD_LAST_DEATH_YEAR)) { works[w.id] = { status: 'copyrighted', note: `author death year ${pick[COL.died]} in index` }; continue; }
        try {
            const zip = await fetchFile(pick[COL.text], `${pick[COL.workId]}.zip`);
            const txt = unzip(zip).find(f => f.toLowerCase().endsWith('.txt'));
            const text = cleanAozoraText(new TextDecoder('shift_jis').decode(readFileSync(txt)));
            const start = findStart(text, w.extraction);
            if (start < 0) { works[w.id] = { status: 'anchor_not_found', card_url: pick[COL.card], note: `anchor "${w.extraction.anchor}" not in text` }; continue; }
            const ex = excerpt(text, start, w.extraction.max_chars || 400);
            works[w.id] = {
                status: ex ? 'ok' : 'empty',
                excerpt: ex,
                chars: ex.length,
                aozora_work_id: pick[COL.workId],
                card_url: pick[COL.card],
                orthography: pick[COL.kana],
                author_died: pick[COL.died],
                credits: { base_book: pick[COL.base], input: pick[COL.input], proofreading: pick[COL.proof] }
            };
        } catch (e) {
            works[w.id] = { status: 'error', card_url: pick[COL.card], note: e.message };
        }
        await new Promise(r => setTimeout(r, 1000)); // be gentle with 青空文庫
    }

    const out = {
        source: '青空文庫 https://www.aozora.gr.jp/ — public-domain texts; credits per work',
        generated_at: new Date().toISOString(),
        works
    };
    writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
    const tally = Object.values(works).reduce((m, x) => ({ ...m, [x.status]: (m[x.status] || 0) + 1 }), {});
    console.log('library.texts.json:', JSON.stringify(tally));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main().catch(e => { console.error(e); process.exit(1); });
}
