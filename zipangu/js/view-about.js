import { visualFeature, visualArt } from './visual-art.js';
import { visualOf } from './visual-manifest.js';
// #/about and #/corrections

import { VIA } from './sim.js';
import { renderMarkdown } from './markdown.js';
import { h, link, tagged, stripParens, nameOf, href } from './util.js';
import { plaque, sectionHead, jewelButterfly } from './components.js';
import { creatureCanvas } from './creature-art.js';


const WHEN = { night: '夜だけ走る', day: '昼だけ飛ぶ', any: '一日じゅう' };

// The world text lists things inline ("①… ②… ・…"). Break those into real lists.
const ITEM_SPLIT = /(?:\s{2,}|(?<=。))(?=[①-⑩]|（\d+）|・)/;

function copyParagraphs(text) {
    const chunks = []; let chunk = '';
    for (const sentence of String(text).split(/(?<=。)/u)) {
        if (chunk.length >= 150) { chunks.push(chunk); chunk = ''; }
        chunk += sentence;
    }
    if (chunk) chunks.push(chunk);
    return chunks.map(t => h('p', null, tagged(t)));
}

function body(text) {
    const parts = String(text).split(/\n+/).flatMap(line => line.split(ITEM_SPLIT)).map(t => t.trim()).filter(Boolean);
    const marked = t => /^([①-⑩]|（\d+）|・)/.test(t);
    if (parts.filter(marked).length < 2) return parts.flatMap(copyParagraphs);
    const out = [];
    let list = null;
    for (const t of parts) {
        if (marked(t)) {
            if (!list) { list = h('ul', { class: 'about-list' }); out.push(list); }
            list.append(h('li', null, tagged(t.replace(/^・/, ''))));
        } else {
            list = null;
            out.push(...copyParagraphs(t));
        }
    }
    return out;
}

// "【地理：十の時片】…" → a small heading and its paragraph.
function lead(text) {
    const m = String(text).match(/^【([^】]+)】([\s\S]*)$/);
    if (!m) return h('div', { class: 'about-block' }, body(text));
    return h('div', { class: 'about-block' }, h('h3', null, m[1]), body(m[2].trim()));
}

const paragraphs = text => String(text || '').split(/\n{2,}/).map(s => s.trim()).filter(Boolean);

function charterOf(economy) {
    const m = String(economy || '').match(/エージェント憲章（([^）]+)）/);
    return m ? m[1].split('、').map(s => s.trim()).filter(Boolean) : [];
}

export function aboutView(ctx) {
    const { W } = ctx;
    const feature = visualFeature(ctx, 'concept', 'bansei_clock', { size: 720 });
    const illustrations = [];
    function picture(type, id, caption) {
        const v = visualOf(type, id); if (!v) return null;
        const art = visualArt(W, v, { size: 340, eco: ctx.eco, controls: !['era', 'realm'].includes(type) }); illustrations.push(art);
        return h('figure', { class: 'about-figure' }, art, h('figcaption', null, caption), h('a', { class: 'chip', href: '#/visual/' + type + ':' + id }, '設定と大きな絵を見る →'));
    }
    const w = W.world;
    const hub = w.hub && W.byId.district.get(w.hub.id);
    const fly = jewelButterfly(W);
    const routesByVia = {};
    for (const r of (w.trade_routes || [])) routesByVia[r.via] = (routesByVia[r.via] || 0) + 1;
    const charter = charterOf(w.economy_overview);
    const econ = paragraphs(w.economy_overview);

    const vehicles = Object.entries(VIA).map(([id, v]) => h('li', null,
        h('b', null, v.label), h('span', { class: 'veh-when' }, WHEN[v.when] || ''),
        h('span', { class: 'veh-n' }, routesByVia[id] ? `${routesByVia[id]} 路線` : '')));

    const el = h('article', { class: 'page page-about' },
        h('header', { class: 'hero about-hero', style: { '--g0': '#141a58', '--g1': '#3a2a7a', '--g2': '#e8c36a', '--light': '#fff4cf' } },
            fly ? h('div', { class: 'hero-fly', 'aria-hidden': 'true' }, creatureCanvas(fly, 168)) : null,
            h('div', { class: 'hero-body' },
                h('p', { class: 'kicker' }, 'NEON MYTHOS ・ ' + ((w.title_en || '').replace(/^NEON MYTHOS:?\s*/, ''))),
                h('h1', null, stripParens(w.title_ja || '万華京ジパング').replace(/^[A-Za-z][A-Za-z ]*/, '').trim() || '万華京ジパング'),
                h('p', { class: 'hero-summary' }, (w.tagline || '').split('／')[0]),
                (w.tagline || '').includes('／') ? h('p', { class: 'hero-en' }, w.tagline.split('／')[1]) : null)),
        h('div', { class: 'page-body' }, feature, h('p', { class: 'chips' }, link('#/visuals', '動く絵の制作帖を見る →')),
            h('section', { class: 'sec', 'aria-labelledby': 'ab-premise' }, sectionHead('はじまり', 'この世界の前提', 'ab-premise'),
                h('div', { class: 'about-illustrated' }, picture('creature', 'hisui_ageha', '翡翠揚羽。生きた蝶を捕えず、自然に落ちた鱗だけが商いにつながる。'), h('div', { class: 'prose' }, paragraphs(w.premise).map(lead)))),
            h('section', { class: 'sec', 'aria-labelledby': 'ab-coexist' }, sectionHead('十の時代の同居のしかた', '時片は鏡片のように重なって回る', 'ab-coexist'),
                h('div', { class: 'prose' }, paragraphs(w.how_eras_coexist).map(lead)),
                h('div', { class: 'about-gallery' }, picture('era', 'jomon_yuinawa', '結縄と漆の時片。素材と道具を起点にした縄文の景観設定画。'), picture('era', 'reiwa_mangekyo', '十の時片が交差する万華鏡の街。景観は静止画、時の動きは上の万世時計で読む。')),
                hub ? h('p', { class: 'chips' }, h('span', { class: 'lbl' }, '中心'), link(href.district(hub.id), nameOf(hub))) : null),
            h('section', { class: 'sec', 'aria-labelledby': 'ab-trade' }, sectionHead('取引のきまり', '経済のしくみ', 'ab-trade'),
                h('div', { class: 'prose' }, econ.map(lead)),
                h('div', { class: 'about-gallery' }, picture('currency', 'shirin', '翅鱗は自然に落ちた鱗の検定にもとづく。採用画は鑑定容器の創作意匠。'), picture('currency', 'kohaku', '光箔は透金札の蓄光。動かさずに置くと約15日で光が抜け始める。日数デモはこの絵の下で読む。')),
                h('h3', { class: 'subhead' }, 'ひとが（ものが）渡る道'),
                h('ul', { class: 'vehicles' }, vehicles),
                h('p', { class: 'chips' }, link('#/market', '相場を見る →'))),
            charter.length ? h('section', { class: 'sec', 'aria-labelledby': 'ab-charter' }, sectionHead('エージェント憲章', 'これは飾りではなく、経済のルールそのもの', 'ab-charter'),
                h('div', { class: 'about-illustrated' }, picture('agent', 'chahakobi', 'チャハコビ。思案・移動・取引の実際の行動と姿勢が連動し、茶盆は水平を保つ。'), h('p', { class: 'lead' }, '住人は相場を見て、思案し、道を選び、目的を持って商いをする。反応・思案・移動のしるしは地図でも見える。')),
                h('ul', { class: 'charter' }, charter.map((c, i) => h('li', null, plaque({ class: 'charter-card' }, h('b', { class: 'charter-no', 'aria-hidden': 'true' }, String(i + 1)), h('p', null, c)))))) : null,
            (w.signature_experiences || []).length ? h('section', { class: 'sec', 'aria-labelledby': 'ab-exp' }, sectionHead('歩いてみたい場面', '万華京でしか見られない光景', 'ab-exp'),
                h('ul', { class: 'experiences' }, w.signature_experiences.map(t => h('li', null, h('span', { class: 'spark-gem', 'aria-hidden': 'true' }), tagged(t))))) : null,
            h('section', { class: 'sec', 'aria-labelledby': 'ab-realms' }, sectionHead('物語へ渡る', '異界にも、それぞれの時と約束がある', 'ab-realms'),
                h('div', { class: 'about-gallery' }, picture('realm', 'ginga_tetsudo', '銀河鉄道は夜だけ走る。燐光の三角標と星の線路の景観。'), picture('realm', 'sakura_mori', '桜の森。店や売り声を持ち込まず、静兎と沈黙の合図を見守る景観。'))),
            h('section', { class: 'sec', 'aria-labelledby': 'ab-fact' }, sectionHead('史実と創作のあいだ', '二つの声を、いつも分けて書く', 'ab-fact'),
                plaque({ class: 'lore-card' },
                    h('p', null, h('span', { class: 'tag tag-fact' }, '史実'), 'は確かめられる歴史、', h('span', { class: 'tag tag-fiction' }, '創作'), 'はこの世界の作り話。実在の人物には、新しい言葉も行いも与えない。')),
                h('p', { class: 'chips' }, link('#/corrections', h('b', null, '考証記録'), '（直した箇所の一覧）→'),
                    h('a', { class: 'chip', href: 'docs/CORRECTIONS.md' }, '原文 docs/CORRECTIONS.md'))),
            h('section', { class: 'sec', 'aria-labelledby': 'ab-credit' }, sectionHead('出典とお礼', null, 'ab-credit'),
                h('p', null, '本の抜粋は、著作権の消えた作品を公開する電子図書館「青空文庫」から取り寄せている。底本・入力・校正のみなさんに感謝する。'),
                h('p', { class: 'ar-role' }, W.eras.length + ' の時片 ・ ' + W.realms.length + ' の異界 ・ ' + W.districts.length + ' の地区 ・ ' + W.creatures.length + ' の生き物 ・ ' + W.agents.length + ' の住人'))));
    return { el, title: 'この世界について', update() { if (feature) feature.update(); illustrations.forEach(art => art.update()); } };
}

export function correctionsView(ctx) {
    const box = h('div', { class: 'chapter-body' }, h('p', { class: 'empty' }, '読み込んでいます…'));
    ctx.loadDoc('', 'CORRECTIONS').then(md => {
        if (!md) { box.replaceChildren(h('p', { class: 'empty' }, '考証記録を読み込めませんでした。'), h('a', { href: 'docs/CORRECTIONS.md' }, 'docs/CORRECTIONS.md を開く')); return; }
        box.replaceChildren(renderMarkdown(md));
    }).catch(() => box.replaceChildren(h('p', { class: 'empty' }, '考証記録を読み込めませんでした。')));
    const el = h('div', { class: 'page page-narrow' },
        h('p', { class: 'crumb' }, link('#/about', '← この世界について')),
        h('header', { class: 'page-head' }, h('h1', null, '考証記録')),
        box,
        h('p', { class: 'ar-role' }, h('a', { href: 'docs/CORRECTIONS.md' }, '原文（Markdown）を開く')));
    return { el, title: '考証記録' };
}
