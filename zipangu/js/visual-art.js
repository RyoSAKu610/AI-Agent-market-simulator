// Additive concept art: the existing map sprites and procedural art remain available.
import { createDial } from './clock-dial.js';
import { h, nameOf, placeShort } from './util.js';
import { visualOf, visualSource, visualPoseSource, visualKey } from './visual-manifest.js';

export function visualEntity(W, v) {
    return v.type === 'creature' ? W.byId.creature.get(v.id) : v.type === 'agent' ? W.byId.agent.get(v.id) : v.type === 'currency' ? W.byId.currency.get(v.id) : v.type === 'era' ? W.byId.era.get(v.id) : v.type === 'realm' ? W.byId.realm.get(v.id) : null;
}
export function visualTitle(W, v) { return v.title || nameOf(visualEntity(W, v)); }

export function visualArt(W, v, { size = 300, eco = null, controls = false } = {}) {
    if (!v) return null;
    const title = W ? visualTitle(W, v) : v.title || v.id;
    const img = cls => h('img', { src: visualSource(v), alt: cls ? '' : title + '・設定画', loading: 'lazy', decoding: 'async', class: cls || '' });
    const butterfly = v.motion === 'flutter' || v.motion === 'glide';
    const rig = h('div', { class: 'visual-rig' }, butterfly
        ? [img('wing wing-left'), img('wing wing-right'), img('wing-body')]
        : img());
    if (butterfly) rig.setAttribute('aria-label', title + '・設定画');
    if (butterfly) rig.setAttribute('role', 'img');
    const pose = v.poses ? h('div', { class: 'visual-pose', role: 'img', 'aria-label': title + '・行動設定画' }, h('img', { src: visualPoseSource(v), alt: '', loading: 'lazy', decoding: 'async' })) : null;
    const portrait = pose ? rig.querySelector('img') : null;
    if (pose) { rig.append(pose); portrait.hidden = true; }
    let showPortrait = false;
    const reaction = h('span', { class: 'visual-reaction', 'aria-live': 'off', hidden: v.type !== 'agent' });
    const surface = h('div', { class: 'visual-surface', style: { '--visual-size': size + 'px' }, dataset: { motion: v.motion, stage: 'idle' } }, rig, reaction);
    const out = h('div', { class: 'visual-art', dataset: { visual: visualKey(v) } }, surface);
    const dial = v.motion === 'clock' && W ? createDial(W) : null;
    if (dial) surface.append(h('div', { class: 'visual-clock-dial' }, dial.el));
    if (dial && eco) dial.update(eco.clock);
    let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stop = h('button', { type: 'button', class: 'btn visual-stop', 'aria-pressed': String(paused), onclick: () => {
        paused = !paused; surface.classList.toggle('is-still', paused); out.classList.toggle('is-still', paused); stop.textContent = paused ? '動きを再開' : '動きを止める'; stop.setAttribute('aria-pressed', String(paused));
    } }, paused ? '動きを再開' : '動きを止める');
    surface.classList.toggle('is-still', paused);
    out.classList.toggle('is-still', paused);
    let days = 0, demoPlaying = false, demoLast = 0, demoElapsed = 0;
    let daySlider = null;
    const ageNote = h('output', { class: 'visual-age-note' });
    if (controls && !['era', 'still'].includes(v.motion)) out.append(h('div', { class: 'visual-controls' }, stop), h('p', { class: 'visual-stop-note' }, '絵の動きだけを止めます。街の時間と商いは続きます。'));
    if (controls && pose) {
        const toggle = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', onclick: () => {
            showPortrait = !showPortrait; pose.hidden = showPortrait; portrait.hidden = !showPortrait;
            toggle.textContent = showPortrait ? 'いまの行動を見る' : '単体の設定画を見る'; toggle.setAttribute('aria-pressed', String(showPortrait));
        } }, '単体の設定画を見る');
        out.append(toggle);
    }
    if (controls && ['kohaku', 'hotarusen'].includes(v.id)) {
        const slider = h('input', { type: 'range', min: 0, max: 30, value: 0, 'aria-label': '動かさずに置いた日数', oninput: e => { days = Number(e.target.value); demoElapsed = days; demoLast = performance.now(); update(); } });
        daySlider = slider;
        const play = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false', onclick: () => {
            demoPlaying = !demoPlaying; demoLast = performance.now(); if (demoPlaying && days >= 30) { days = 0; demoElapsed = 0; }
            play.textContent = demoPlaying ? '日数デモを止める' : '日数デモを進める'; play.setAttribute('aria-pressed', String(demoPlaying));
        } }, '日数デモを進める');
        out.append(play, h('label', { class: 'visual-days' }, '動かさずに置いた日数（説明用デモ）', slider, ageNote), h('p', { class: 'ar-role' }, '1秒を1日に縮めた説明用デモ。減光の割合は演出で、実際の財布や価格は変えません。'));
    }
    const timeNote = h('p', { class: 'visual-time' });
    if (v.motion === 'clock') {
        out.append(h('div', { class: 'visual-layers', 'aria-label': '十の時片の入り口' }, W.eras.map((era, i) => h('a', { href: '#/place/' + era.id, style: { '--layer': i, '--layer-color': era.aesthetic.palette[1] } }, placeShort(era)))), timeNote);
    }
    function update() {
        if (demoPlaying) {
            const now = performance.now();
            if (!paused) { demoElapsed += Math.min(2, (now - demoLast) / 1000); days = Math.min(30, Math.floor(demoElapsed)); if (daySlider) daySlider.value = days; }
            demoLast = now;
        }
        if (v.type === 'agent' && eco && !paused) {
            const live = eco.agents.get(v.id);
            const stage = live && live.stage || 'idle';
            surface.dataset.stage = stage;
            if (pose) pose.dataset.frame = String({ think: 1, travel: 2, trade: 3 }[stage] || 0);
            reaction.textContent = { react: '！', think: '💭', travel: '🏃', trade: '◆' }[stage] || '';
            reaction.setAttribute('aria-label', live && live.activity || '待機');
        }
        if (v.id === 'hotarusen' || v.id === 'kohaku') {
            const level = v.id === 'hotarusen' ? Math.max(0.12, 1 - days * .085) : Math.max(.18, 1 - Math.max(0, days - 14) * .055);
            surface.style.setProperty('--charge', level);
            ageNote.textContent = `${days}日 ・ ${v.id === 'kohaku' && days < 15 ? '光を保つ' : days ? '光が抜けていく' : '受け渡し直後'}`;
        }
        if (v.motion === 'clock' && eco) {
            if (!paused) { out.style.setProperty('--world-turn', eco.clock.t * 360 + 'deg'); if (dial) dial.update(eco.clock); out.classList.toggle('is-night', eco.clock.isNight); }
            timeNote.textContent = `万世時計と同期：${eco.clock.label} ・ ${eco.clock.sekki}。各時片は固有の時間を保ち、開門と逢う刻だけそろう。`;
        }
    }
    out.update = update;
    update();
    // A failed file stays visibly unmade, instead of masquerading as a completed picture.
    rig.querySelectorAll('img').forEach(image => image.addEventListener('error', () => { out.classList.add('visual-unavailable'); reaction.hidden = true; rig.replaceChildren(h('p', { class: 'empty' }, '設定画を読み込めませんでした')); }, { once: true }));
    return out;
}

export function visualFeature(ctx, type, id, { size = 440 } = {}) {
    const v = visualOf(type, id);
    if (!v) return null;
    const art = visualArt(ctx.W, v, { size, eco: ctx.eco, controls: true });
    const el = h('section', { class: 'visual-feature' }, h('p', { class: 'kicker' }, ['era', 'realm'].includes(type) ? '制作帖 ・ 時片と異界の景観' : '第一制作帖 ・ 設定画'), art,
        h('p', { class: 'ar-role' }, v.note || '正本の外見・生態をもとにした追加の創作コンセプト画。'),
        h('a', { class: 'chip', href: '#/visual/' + visualKey(v) }, '大きく鑑賞・設定を見る →'));
    el.update = art.update;
    return el;
}
