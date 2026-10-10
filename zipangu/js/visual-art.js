// Additive concept art: the existing map sprites and procedural art remain available.
import { LOCAL_EFFECTS, paintCreatureEffect } from './creature-effects.js';
import { createDial } from './clock-dial.js';
import { h, nameOf, placeShort } from './util.js';
import { visualOf, visualSource, visualPoseSource, visualCompanionSource, visualKey } from './visual-manifest.js';

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
        ? [h('div', { class: 'wing wing-left' }, img()), h('div', { class: 'wing wing-right' }, img()), img('wing-body')]
        : img());
    if (butterfly) rig.setAttribute('aria-label', title + '・設定画');
    if (butterfly) rig.setAttribute('role', 'img');
    const poseRatio = v.poseAspect || 1;
    const poseWidth = Math.min(92, 92 * poseRatio), poseHeight = Math.min(92, 92 / poseRatio);
    const pose = v.poses ? h('div', { class: 'visual-pose', style: { width: poseWidth + '%', height: poseHeight + '%', inset: 'auto', left: (100 - poseWidth) / 2 + '%', top: (100 - poseHeight) / 2 + '%' }, role: 'img', 'aria-label': title + '・行動設定画' }, h('img', { src: visualPoseSource(v), alt: '', loading: 'lazy', decoding: 'async' })) : null;
    const portrait = pose ? rig.querySelector('img') : null;
    if (pose) { rig.append(pose); portrait.hidden = true; }
    let effectTime = performance.now() / 1000, effectRegion = 'east';
    const effectLayers = [];
    if (LOCAL_EFFECTS.has(v.id)) {
        for (const target of butterfly ? [...rig.querySelectorAll('.wing')] : [rig]) {
            const layer = h('canvas', { class: 'visual-local-effect', width: 512, height: 512, 'aria-hidden': 'true' }); target.append(layer); effectLayers.push(layer);
        }
    }
    let showPortrait = false;
    const reaction = h('span', { class: 'visual-reaction', 'aria-live': 'off', hidden: v.type !== 'agent' });
    const surface = h('div', { class: 'visual-surface', style: { '--visual-size': size + 'px' }, dataset: { motion: v.motion, stage: 'idle' } }, rig, reaction);
    if (v.companion && butterfly) {
        surface.classList.add('visual-pair'); rig.classList.add('visual-pair-gold');
        const blueImg = cls => h('img', { src: visualCompanionSource(v), alt: '', loading: 'lazy', decoding: 'async', class: cls });
        surface.append(h('div', { class: 'visual-rig visual-pair-blue', role: 'img', 'aria-label': title + '・青眼の個体' }, blueImg('wing wing-left'), blueImg('wing wing-right'), blueImg('wing-body')));
        rig.setAttribute('aria-label', title + '・金眼の個体');
    }
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
    let effectFrame = 0, effectStamp = 0;
    let days = 0, demoPlaying = false, demoLast = 0, demoElapsed = 0;
    let daySlider = null;
    const ageNote = h('output', { class: 'visual-age-note' });
    if (controls && !['era', 'still'].includes(v.motion)) out.append(h('div', { class: 'visual-controls' }, stop), h('p', { class: 'visual-stop-note' }, '絵の動きだけを止めます。街の時間と商いは続きます。'));
    if (controls && v.id === 'rai_botaru') {
        out.append(h('label', { class: 'visual-region' }, '群れの拍（同じ地域は共通拍）', h('select', { 'aria-label': '雷蛍の地域', onchange: e => { effectRegion = e.target.value; update(); } }, h('option', { value: 'east' }, '東・両国：4秒'), h('option', { value: 'west' }, '西・国友：2秒'))));
    }
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
        if (effectLayers.length && !effectFrame) effectFrame = requestAnimationFrame(function tick(now) {
            effectFrame = 0;
            if (!out.isConnected) return;
            const rect = out.getBoundingClientRect();
            if (now-effectStamp > 100 && rect.bottom > 0 && rect.top < innerHeight) { effectStamp = now; update(); }
            if (!effectFrame) effectFrame=requestAnimationFrame(tick);
        });
        const frozen = paused || !!out.closest('.is-still');
        if (!frozen) effectTime = performance.now() / 1000;
        const source = rig.querySelector('img');
        if (source && source.complete && source.naturalWidth) for (const layer of effectLayers) {
            const gc = layer.getContext('2d'); gc.clearRect(0, 0, 512, 512);
            const ratio = source.naturalWidth / source.naturalHeight, w = Math.min(512, 512 * ratio), h = Math.min(512, 512 / ratio);
            if (!frozen || !layer._effectClock) layer._effectClock = eco && { ...eco.clock };
            paintCreatureEffect(gc, v.id, source, { x: (512-w)/2, y: (512-h)/2, w, h, clock: layer._effectClock, t: effectTime, region: effectRegion });
            layer.dataset.seed = String(Math.floor(effectTime/1.9)); layer.dataset.koku = String(layer._effectClock?.koku ?? 9); layer.dataset.region=effectRegion; if (v.id === 'rai_botaru') layer.dataset.period=effectRegion==='west'?'2':'4';
        }
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
    surface.querySelectorAll('img').forEach(image => image.addEventListener('error', () => { out.classList.add('visual-unavailable'); reaction.hidden = true; surface.replaceChildren(h('p', { class: 'empty' }, '設定画を読み込めませんでした')); }, { once: true }));
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
