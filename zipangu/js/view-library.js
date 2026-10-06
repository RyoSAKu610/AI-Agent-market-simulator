// #/library and #/work/<id>

import { h, href, link, tagged, placeShort, nameOf, clip } from './util.js';
import { plaque, placeLink, swatches } from './components.js';
import { notFound } from './view-place.js';


// Why an excerpt is not on the page yet, in the reader's words.
const WHY_PENDING = {
    none: '抜粋はこれから、青空文庫の公式データから取り寄せます。',
    not_found: '青空文庫の索引で見つけられなかったため、確認しています。',
    copyrighted: '索引が保護期間中と示しているため、掲載しません。',
    anchor_not_found: '抜粋の始まりの位置を確かめているところです。',
    empty: '抜粋を取り出せなかったため、もう一度試します。',
    error: '取得でつまずいたため、もう一度試します。'
};

function excerptBox(W, w) {
    const t = W.textOf(w.id);
    if (t && t.status === 'ok' && t.excerpt) {
        const cr = t.credits || {};
        return h('figure', { class: 'excerpt' },
            h('blockquote', null, t.excerpt),
            h('figcaption', null,
                h('span', { class: 'src' }, '出典：青空文庫'),
                cr.base_book ? h('span', null, `底本：${cr.base_book}`) : null,
                cr.input ? h('span', null, `入力：${cr.input}`) : null,
                cr.proofreading ? h('span', null, `校正：${cr.proofreading}`) : null,
                t.card_url ? h('a', { href: t.card_url, target: '_blank', rel: 'noopener noreferrer' }, '図書カード ↗') : null));
    }
    const key = t && WHY_PENDING[t.status] ? t.status : 'none';
    return h('div', { class: 'excerpt pending' },
        h('span', { class: 'tag tag-pending' }, '青空文庫から抜粋予定'),
        h('p', null, WHY_PENDING[key]),
        t && t.card_url ? h('a', { href: t.card_url, target: '_blank', rel: 'noopener noreferrer' }, '図書カード ↗') : null);
}

function workCard(W, w, { detail = false } = {}) {
    const district = w.district && W.byId.district.get(w.district);
    const life = [`${w.author}（${w.author_death_year}没）`];
    if (w.translator) life.push(`訳：${w.translator}（${w.translator_death_year}没）`);
    return plaque({ class: 'work-card' },
        h('h3', null, detail ? `『${w.title}』` : link(href.work(w.id), `『${w.title}』`)),
        h('p', { class: 'wm-author' }, life.join(' ・ ')),
        h('p', { class: 'wk-role' }, h('span', { class: 'lbl' }, 'この世界での姿'), tagged(detail ? w.in_world_role : clip(w.in_world_role, 150))),
        district ? h('p', { class: 'wk-where' }, h('span', { class: 'lbl' }, 'ある場所'), link(href.district(district.id), nameOf(district))) : null,
        detail ? h('p', { class: 'wk-why' }, h('span', { class: 'lbl' }, 'ここにある理由'), tagged(w.why)) : null,
        excerptBox(W, w));
}

export function libraryView(ctx) {
    const { W } = ctx;
    const groups = W.places.map(p => ({ p, works: W.library.filter(w => w.placed_in === p.id) })).filter(g => g.works.length);
    const ok = W.library.filter(w => { const t = W.textOf(w.id); return t && t.status === 'ok'; }).length;

    const el = h('div', { class: 'page' },
        h('header', { class: 'page-head' },
            h('h1', null, '青空書庫'),
            h('p', { class: 'lead' }, '作者（と訳者）が世を去って、みんなのものになった本だけが、この世界の棚に並ぶ。これを世界では「没後の約束」と呼ぶ。保護期間の中にある作品は、影絵として名前さえ出さない。'),
            h('p', { class: 'ar-role' }, `${W.library.length} 冊のうち、本文の抜粋を載せられたのは ${ok} 冊。本文は青空文庫の公式データから自動で取り寄せる。`)),
        groups.map(({ p, works }) => h('section', { class: 'sec', 'aria-labelledby': 'lib-' + p.id },
            h('header', { class: 'section-head' },
                h('h2', { id: 'lib-' + p.id }, h('span', { class: 'gem', 'aria-hidden': 'true' }), placeShort(p)),
                h('p', { class: 'section-sub' }, swatches(p.aesthetic && p.aesthetic.palette), ' ', placeLink(p))),
            h('div', { class: 'cards' }, works.map(w => workCard(W, w))))));
    return { el, title: '青空書庫' };
}

export function workView(ctx, id) {
    const { W } = ctx;
    const w = W.byId.work.get(id);
    if (!w) return notFound('その本');
    const place = W.byId.place.get(w.placed_in);
    const el = h('div', { class: 'page page-narrow' },
        h('p', { class: 'crumb' }, link('#/library', '← 青空書庫'), place ? ' ・ ' : '', place ? placeLink(place) : null),
        workCard(W, w, { detail: true }),
        h('p', { class: 'ar-role' }, '青空文庫は、著作権の消えた作品を公開している電子図書館。本文・底本・入力者・校正者のことは、図書カードで確かめられる。'));
    return { el, title: `『${w.title}』` };
}
