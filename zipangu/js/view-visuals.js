import { h, nameOf, placeShort, tagged } from './util.js';
import { sectionHead, creatureArt, avatar } from './components.js';
import { VISUALS, visualOf, visualKey } from './visual-manifest.js';
import { visualArt, visualEntity, visualTitle } from './visual-art.js';
import { notFound } from './view-place.js';

export function visualsView(ctx) {
    const { W } = ctx;
    const groups = [
        ['01', '時間と街の骨格', [{ id: 'bansei_clock', title: '万世時計・十の時片' }, ...W.eras], 'era'],
        ['02', '蝶と渡りの道', W.creatures.filter(c => c.kind === 'butterfly'), 'creature'],
        ['03', '動物と幻想の隣人', W.creatures.filter(c => c.kind !== 'butterfly'), 'creature'],
        ['04', 'お金と光の循環', W.currencies, 'currency'],
        ['05', '商いする住人', W.agents, 'agent'],
        ['06', '異界の窓', W.realms, 'realm']
    ];
    const ready = VISUALS.filter(v => v.status === 'ready');
    const total = 1 + W.eras.length + W.realms.length + W.creatures.length + W.agents.length + W.currencies.length;
    const painters = [];
    const gallery = h('section', { class: 'sec' }, sectionHead('いま、会える設定画', '個別にひらくと、大きな絵と固有の動きを鑑賞できる'), h('div', { class: 'visual-catalog visual-gallery' }, ready.map(v => {
        const art = visualArt(W, v, { size: 250, eco: ctx.eco });
        painters.push(art.update);
        return h('a', { class: 'visual-tile is-ready', href: '#/visual/' + visualKey(v) }, art, h('strong', null, visualTitle(W, v)), h('span', { class: 'visual-status' }, ['era', 'realm'].includes(v.type) ? '時片・異界の景観' : ['trust', 'credential', 'certificate'].includes(v.motion) ? '素材が息づく信頼・資格・証券の概念図' : '動く設定画'));
    })));
    const sections = groups.map(([no, title, entities, type]) => h('section', { class: 'sec visual-batch' },
        sectionHead(no + ' ' + title, '設定画を一つずつ、正本の形・素材・生態に照らして制作'),
        h('div', { class: 'visual-catalog' }, entities.map(entity => {
            const actualType = entity.id === 'bansei_clock' ? 'concept' : type;
            const v = visualOf(actualType, entity.id);
            const label = entity.title || (actualType === 'era' || actualType === 'realm' ? placeShort(entity) : nameOf(entity));
            const fallback = type === 'creature' ? creatureArt(entity, 100, { animate: false }) : type === 'agent' ? avatar(W, entity) : h('span', { class: 'visual-pending-glyph', 'aria-hidden': 'true' }, type === 'currency' ? '◈' : '◇');
            const art = v ? visualArt(W, v, { size: 160, eco: ctx.eco }) : fallback;
            if (v) painters.push(art.update);
            const target = v ? '#/visual/' + visualKey(v) : type === 'creature' ? '#/creature/' + entity.id : type === 'agent' ? '#/agent/' + entity.id : type === 'era' || type === 'realm' ? '#/place/' + entity.id : '#/market';
            return h('a', { class: 'visual-tile ' + (v ? 'is-ready' : 'is-planned'), href: target }, art, h('strong', null, label), h('span', { class: 'visual-status' }, v ? '設定画 制作済' : '設定画 未制作'));
        }))));
    return { el: h('div', { class: 'page visual-page' },
        h('header', { class: 'page-head' }, h('p', { class: 'kicker' }, '万華京 ・ VISUAL ATELIER'), h('h1', null, '動く絵の制作帖'), h('p', { class: 'lead' }, '時間の骨格から蝶、幻想生物、お金、住人へ。形も動きも、その子の暮らしから。'),
            h('p', { class: 'visual-progress' }, `${ready.length} / ${total} 主題の設定画を制作済`)),
        gallery, h('details', { class: 'visual-backlog' }, h('summary', null, 'これからの制作順と全対象を見る'), h('p', { class: 'notice' }, '未制作の生き物と住人は、従来の動く描画で引き続き会えます。設定画は追加作品。正本にない券面・建築の細部は創作意匠です。'), sections)), title: '動く絵の制作帖', update() { painters.forEach(paint => paint()); } };
}

export function visualView(ctx, key) {
    const v = VISUALS.find(v => visualKey(v) === key && v.status === 'ready');
    if (!v) return notFound('その設定画');
    const entity = visualEntity(ctx.W, v);
    const art = visualArt(ctx.W, v, { size: 720, eco: ctx.eco, controls: true });
    const fields = entity ? [entity.description, entity.sprite_hint, entity.ecology, entity.backing, entity.role, entity.summary, entity.lore, ...(entity.signature_tech || []).map(t => t.name + '：' + t.description)].filter(Boolean) : [ctx.W.world.how_eras_coexist];
    return { el: h('article', { class: 'page visual-detail' }, h('p', { class: 'crumb' }, h('a', { href: '#/visuals' }, '← 動く絵の制作帖')),
        h('header', { class: 'page-head' }, h('p', { class: 'kicker' }, '第一制作帖 ・ 創作コンセプト画'), h('h1', null, visualTitle(ctx.W, v))),
        art, h('p', { class: 'visual-intent' }, v.note || '正本の外見・生態に沿った追加の設定画。'),
        h('section', { class: 'sec prose' }, sectionHead('絵のもとになった設定'), fields.map(text => h('p', null, tagged(text)))),
        ['era', 'realm'].includes(v.type) ? h('p', null, h('a', { class: 'btn', href: '#/place/' + v.id }, '時片・異界の案内へ →')) : null,
        v.type === 'creature' || v.type === 'agent' ? h('p', null, h('a', { class: 'btn', href: '#/' + v.type + '/' + v.id }, '図鑑・暮らしへ →')) : null), title: visualTitle(ctx.W, v), update: art.update };
}
