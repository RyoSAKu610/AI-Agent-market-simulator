import { h, clear, agentShort, nameOf } from './util.js';
import { visualOf, visualSource, visualPoseSource } from './visual-manifest.js';
import { dramaAdvance, dramaChoose, dramaReadSeconds, dramaPose } from './character-drama.js';

export function dramaPanel(ctx, a, onTalk) {
    const { W, eco, stories } = ctx, model = stories.drama, reader = model.reader(a.id);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene = model.scenes(a.id).find(s => s.id === reader.scene) || reader.held || model.current(a.id);
    if (!reader.scene) reader.auto = !reduced;
    reader.scene = scene.id; reader.beat = Math.min(reader.beat, scene.lines.length - 1);
    let stamp = performance.now(), elapsed = 0, waiting = false, renderKey = '', listKey = '', stageKey = '';
    const backdrop = h('img', { class: 'drama-backdrop', alt: '', decoding: 'async' });
    const cast = h('div', { class: 'drama-cast' });
    const title = h('h3', { class: 'drama-title' });
    const where = h('p', { class: 'drama-place' });
    const date = h('p', { class: 'drama-date' });
    const speaker = h('p', { class: 'drama-speaker' });
    const text = h('p', { class: 'drama-line' });
    const beat = h('span', { class: 'drama-beat' });
    const fact = h('p', { class: 'drama-fact' });
    const now = h('p', { class: 'drama-now' });
    const bond = h('p', { class: 'drama-bond' });
    const auto = h('button', { type: 'button', class: 'btn btn-small', onclick: () => {
        reader.auto = !reader.auto; stamp = performance.now(); elapsed = 0; ctx.persistJourney(); update();
    } });
    function select(s) { scene = s; dramaChoose(s, reader); elapsed = 0; waiting = false; stamp = performance.now(); ctx.persistJourney(); update(); }
    function following() {
        return model.scenes(a.id).find(s => s.id !== scene.id && (scene.seq ? s.seq > scene.seq : s.T > scene.T));
    }
    function next() {
        if (!dramaAdvance(scene, reader)) {
            const candidate = following();
            if (candidate && candidate.id !== scene.id) select(candidate);
            else waiting = true;
        }
        elapsed = 0; stamp = performance.now(); ctx.persistJourney(); update();
    }
    const advance = h('button', { type: 'button', class: 'btn btn-small', onclick: next }, '次の台詞 →');
    const selection = h('select', { 'aria-label': '観る場面', onchange: () => {
        if (selection.value === 'now') select(model.current(a.id));
        else { const s = model.scenes(a.id).find(s => s.id === selection.value); if (s) select(s); }
    } });
    const stage = h('div', { class: 'drama-stage' }, backdrop,
        h('div', { class: 'drama-location' }, title, where, date), cast);
    const lineBox = h('div', { class: 'drama-dialogue', role: 'group', 'aria-label': '場面の台詞' }, speaker, text);
    const el = h('section', { class: 'live-panel drama-panel', id: 'live-drama', 'aria-labelledby': 'drama-heading' },
        h('div', { class: 'drama-head' }, h('h2', { id: 'drama-heading' }, h('span', { class: 'live-dot', 'aria-hidden': 'true' }), 'いま、何をしている？'),
            h('span', { class: 'drama-label' }, '住人の小さな劇場')),
        stage, lineBox,
        h('div', { class: 'drama-controls' }, auto, advance, beat, h('button', { type: 'button', class: 'btn btn-small', onclick: () => select(model.current(a.id)) }, 'いまの姿へ')),
        h('label', { class: 'drama-archive' }, '最近の場面を観る', selection),
        bond, fact, now,
        h('p', { class: 'drama-creation' }, '【創作演出】台詞・身振りの解釈は設定から。日時・出会い・仕事の結果は実際の記録。読んでいる間も街は進みます。'),
        h('div', { class: 'drama-actions' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: onTalk }, 'この続きを話す・お願いする'),
            h('a', { class: 'btn', href: '#/', onclick: () => { ctx.pendingFocus = a.id; } }, 'いまを地図で追う →')));

    function paintScene() {
        const key = scene.id;
        if (key !== stageKey) {
            stageKey = key; clear(cast);
            el.dataset.scene = scene.id; el.dataset.kind = scene.kind;
            const place = W.placeOf(scene.district);
            const v = place && visualOf(W.byId.era.has(place.id) ? 'era' : 'realm', place.id);
            backdrop.hidden = !v;
            if (v) backdrop.src = visualSource(v);
            title.textContent = scene.title;
            where.textContent = `${nameOf(W.byId.district.get(scene.district))} · ${place ? nameOf(place) : ''}`;
            date.textContent = `${scene.kind === 'now' ? 'いまの姿を写した場面' : '記録の場面'} · 第${scene.day}日 ${scene.label}`;
            fact.textContent = `${scene.kind === 'now' ? '写した時の様子' : 'この場面で起きたこと'}：${scene.fact}`;
            bond.textContent = scene.relationship ? `正本の縁：${scene.relationship}` : scene.sender ? `便りの送り主：${agentShort(W.byId.agent.get(scene.sender))}（この場には同席していません）` : '';
            bond.hidden = !bond.textContent;
            for (const id of scene.cast) {
                const v = visualOf('agent', id), char = W.byId.agent.get(id), ratio = v.poseAspect || 1;
                cast.append(h('div', { class: 'drama-actor', dataset: { actor: id } },
                    h('div', { class: 'visual-pose', role: 'img', 'aria-label': `${agentShort(char)}の姿`, style: { aspectRatio: String(ratio) } },
                        h('img', { src: visualPoseSource(v), alt: '', decoding: 'async' })), h('span', { class: 'drama-name' }, agentShort(char))));
            }
        }
        for (const actor of cast.children) {
            const active = scene.lines[reader.beat].speaker === actor.dataset.actor;
            actor.classList.toggle('is-speaking', active);
            actor.querySelector('.visual-pose').dataset.frame = String(dramaPose(scene, reader.beat, actor.dataset.actor));
        }
        const keyLine = `${scene.id}:${reader.beat}`;
        if (keyLine !== renderKey) {
            renderKey = keyLine;
            const l = scene.lines[reader.beat], who = l.speaker && W.byId.agent.get(l.speaker);
            speaker.textContent = who ? agentShort(who) + (who.id === 'dogu' ? ' · 縄目語の意訳' : who.id === 'chahakobi' ? ' · 盆の動きの意訳' : '') : { memory: '前の頁の記憶', letter: '封じた便り', narration: '道の記録' }[l.mode] || '記録';
            text.textContent = l.text;
            lineBox.dataset.mode = l.mode;
        }
    }
    function update() {
        const stampNow = performance.now(), delta = Math.min(1.5, (stampNow - stamp) / 1000); stamp = stampNow;
        const rect = el.getBoundingClientRect(), visible = el.isConnected && rect.bottom > 0 && rect.top < innerHeight && !document.hidden;
        // Retain the chosen scene even when the bounded archive moves on at 16x.
        // A copy in the reader is saved so reload can resume that exact utterance.
        reader.held = scene;
        if (reader.auto && visible && waiting && following()) { select(following()); return; }
        if (reader.auto && visible && !waiting) elapsed += delta;
        if (reader.auto && !waiting && elapsed >= dramaReadSeconds(scene.lines[reader.beat].text)) { next(); return; }
        auto.textContent = reader.auto ? '台詞を一時停止' : '台詞を自動で読む';
        auto.setAttribute('aria-pressed', String(!reader.auto));
        el.classList.toggle('is-still', !reader.auto || reduced);
        advance.textContent = waiting ? '次の出来事を待つ' : reader.beat === scene.lines.length - 1 ? '次の場面 →' : '次の台詞 →';
        beat.textContent = `${reader.beat + 1} / ${scene.lines.length}`;
        const list = model.scenes(a.id), lk = scene.id + '|' + list.map(s => s.id).join('|');
        if (listKey !== lk) {
            listKey = lk; clear(selection);
            selection.append(h('option', { value: 'now' }, 'いまの姿を写す'), ...list.slice().reverse().map(s => h('option', { value: s.id }, `第${s.day}日 ${s.label} · ${s.title}`)));
            if (scene.kind !== 'now' && !list.some(s => s.id === scene.id)) selection.append(h('option', { value: scene.id }, '読んでいる場面を保持 · ' + scene.title));
        }
        selection.value = scene.kind === 'now' ? 'now' : scene.id;
        const live = eco.agents.get(a.id);
        now.textContent = `いまの実状態：${live.at ? nameOf(W.byId.district.get(live.at)) : nameOf(W.byId.district.get(live.target)) + 'へ向かう途中'} · ${live.activity} · ${eco.clock.label}`;
        paintScene();
    }
    update(); return { el, update };
}
