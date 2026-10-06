// A deliberately small markdown renderer: headings, paragraphs, lists, quotes,
// rules, **bold**, *italic*, `code`. It builds DOM nodes (never innerHTML), so
// chapter text can be shown without any escaping worries.

import { h, tagged } from './util.js';

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/;

function inline(text) {
    const frag = document.createDocumentFragment();
    for (const part of String(text).split(INLINE)) {
        if (!part) continue;
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) frag.append(h('strong', null, tagged(part.slice(2, -2))));
        else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) frag.append(h('code', null, part.slice(1, -1)));
        else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) frag.append(h('em', null, tagged(part.slice(1, -1))));
        else frag.append(tagged(part));
    }
    return frag;
}

export function renderMarkdown(src, { skipFirstH1 = true } = {}) {
    const root = h('div', { class: 'prose' });
    const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    let para = [], list = null, quote = [], seenH1 = false;

    const flushPara = () => {
        if (para.length) root.append(h('p', null, inline(para.join(' '))));
        para = [];
    };
    const flushList = () => { if (list) root.append(list.el); list = null; };
    const flushQuote = () => {
        if (quote.length) root.append(h('blockquote', null, h('p', null, inline(quote.join(' ')))));
        quote = [];
    };
    const flushAll = () => { flushPara(); flushList(); flushQuote(); };

    for (const raw of lines) {
        const line = raw.trimEnd();
        let m;
        if (!line.trim()) { flushAll(); continue; }
        if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
            flushAll();
            const level = m[1].length;
            if (level === 1 && skipFirstH1 && !seenH1) { seenH1 = true; continue; }
            root.append(h('h' + Math.min(5, level + 1), null, inline(m[2])));
        } else if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
            flushAll(); root.append(h('hr'));
        } else if ((m = line.match(/^\s*[-*・]\s+(.*)$/))) {
            flushPara(); flushQuote();
            if (!list || list.ordered) { flushList(); list = { ordered: false, el: h('ul') }; }
            list.el.append(h('li', null, inline(m[1])));
        } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
            flushPara(); flushQuote();
            if (!list || !list.ordered) { flushList(); list = { ordered: true, el: h('ol') }; }
            list.el.append(h('li', null, inline(m[1])));
        } else if ((m = line.match(/^>\s?(.*)$/))) {
            flushPara(); flushList();
            quote.push(m[1]);
        } else {
            flushList(); flushQuote();
            para.push(line.trim());
        }
    }
    flushAll();
    return root;
}
