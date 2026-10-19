// 🙋 The card that asks the visitor to decide for a resident they adopted (js/human.js).
// It lists the same candidates the rules and the models see, in the same words, and nothing
// that would nudge the choice (no "the rules would pick this").
import { h, clear, stripParens, fmt } from './util.js';
import { t } from './i18n.js';

export function createDecideCard(ctx) {
    const { W, human } = ctx;
    const card = h('section', { class: 'decide-card', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'decide-title', hidden: true });
    let shown = null;
    const placeName = id => { const d = id && W.byId.district.get(id); return d ? stripParens(d.name_ja) : t('decide.onTheRoad'); };
    const goodName = id => stripParens((W.byId.good.get(id) || {}).name_ja || id);

    function hold(on) { ctx.holdTime = !!on && ctx.humanSettings.holdTime; }

    function paint() {
        const q = human.queue[0] || null;
        if (!q) { card.hidden = true; shown = null; hold(false); return; }
        hold(true);
        if (shown === q.id) return;
        shown = q.id;
        clear(card);
        const thought = h('input', { type: 'text', class: 'mind-input decide-thought', maxlength: '60', placeholder: t('decide.thoughtHint'), 'aria-label': t('decide.thought') });
        const pick = n => { human.answer(q.id, n, thought.value); };
        const carrying = q.carrying.length ? q.carrying.map(l => `${goodName(l.good)}×${l.qty}`).join('、') : t('decide.nothing');
        card.append(
            h('p', { class: 'decide-kicker' }, '🙋 ' + t('decide.kicker')),
            h('h2', { id: 'decide-title' }, t('decide.title', { name: q.name })),
            h('p', { class: 'decide-situation' },
                `${t('decide.when', { day: q.clock.day ?? '?', label: q.clock.label || '' })} ・ ${placeName(q.at)} ・ ${t('decide.wallet')} ${fmt(q.wallet)} ・ ${t('decide.carrying')} ${carrying}`),
            h('ol', { class: 'decide-options' }, q.options.map(o =>
                h('li', null, h('button', { type: 'button', class: 'btn decide-option', 'data-n': String(o.n), onclick: () => pick(o.n) },
                    h('span', { class: 'decide-n' }, String(o.n)), h('span', null, o.text))))),
            h('label', { class: 'mind-field' }, h('span', { class: 'mind-label' }, t('decide.thought')), thought),
            h('p', { class: 'mind-actions' },
                h('button', { type: 'button', class: 'btn btn-small', onclick: () => pick(null) }, t('decide.skip')),
                h('a', { class: 'btn btn-small', href: `#/agent/${encodeURIComponent(q.agent)}` }, t('decide.open'))),
            h('p', { class: 'ar-role' }, (ctx.humanSettings.holdTime ? t('decide.held') : t('decide.running')) + (human.queue.length > 1 ? ' ' + t('decide.more', { n: human.queue.length - 1 }) : '')));
        card.hidden = false;
        const first = card.querySelector('.decide-option');
        if (first && !card.contains(document.activeElement)) first.focus({ preventScroll: true });
    }
    // number keys choose, unless the visitor is typing a thought
    document.addEventListener('keydown', e => {
        if (card.hidden || e.target.closest && e.target.closest('input, textarea')) return;
        const btn = card.querySelector(`.decide-option[data-n="${e.key}"]`);
        if (btn) { e.preventDefault(); btn.click(); }
    });
    human.onQueue(paint);
    paint();
    return card;
}
