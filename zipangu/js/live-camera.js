// 📡 万華京ライブ中継 — the map page's live camera. Every few seconds it cuts to another
// resident where they really are: the painted era or realm behind them, the pose of what
// they are doing right now, the city's hour, and a caption taken from what actually
// happened (js/live-director.js picks who and how). Tapping the picture follows them on the map.
//
// The pose sheets are the ones the map already draws, so they come from the cache; an era's
// painting is fetched the first time someone is filmed there, a little before the cut.

import { h, agentShort, nameOf, placeShort } from './util.js';
import { t } from './i18n.js';
import { avatar } from './components.js';
import { visualOf, visualSource, visualPoseSource } from './visual-manifest.js';
import { CUT_SECONDS, createDirector, shotFor, captionFor, partnerFor, speakerAt } from './live-director.js';

const STORE_KEY = 'zipangu.live.v1';
const loadPrefs = () => { try { return JSON.parse(window.localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } };
const savePrefs = prefs => { try { window.localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch { /* private mode: fine */ } };

const LEAD = 1.5;      // seconds before a cut that the next shot is chosen and its pictures fetched
const PATIENCE = 3;    // seconds a cut may wait for a slow picture before it goes ahead anyway
const FADE_MS = 650;

const loading = new Map();
function preload(src) {
    if (!src) return Promise.resolve(true);
    let p = loading.get(src);
    if (!p) {
        p = new Promise(resolve => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
        loading.set(src, p);
    }
    return p;
}

export function createLiveCamera(ctx, { onPick, big = false } = {}) {
    const { W, eco } = ctx;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // A visitor who asked to save data gets the place's colours instead of its painting.
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    const prefs = loadPrefs();
    let paused = prefs.paused ?? reduced, folded = !big && !!prefs.folded;      // the arena's big screen never folds
    const director = createDirector();
    const off = eco.on('*', msg => director.note(msg));
    let current = null, partner = null, meeting = '', elapsed = 0, last = performance.now(), pending = null, waited = 0;

    const shots = h('div', { class: 'live-shots' });
    const camNo = h('span', { class: 'live-cam-no' });
    const clock = h('span', { class: 'live-clock' });
    const name = h('strong', { class: 'live-name' });
    const where = h('span', { class: 'live-where' });
    const caption = h('p', { class: 'live-caption' });
    const screen = h('button', { type: 'button', class: 'live-screen', onclick: () => { if (current && onPick) onPick(current); } },
        shots,
        h('div', { class: 'live-hud', 'aria-hidden': 'true' }, h('span', { class: 'live-rec' }, '● LIVE'), camNo, clock),
        h('div', { class: 'live-lower', 'aria-hidden': 'true' }, h('p', { class: 'live-who' }, name, where), caption));
    const pauseBtn = h('button', { type: 'button', class: 'live-btn', onclick: () => { paused = !paused; remember(); paint(); } });
    const nextBtn = h('button', { type: 'button', class: 'live-btn live-next', 'aria-label': t('live.next'), title: t('live.next'), onclick: () => { pending = null; prepare(); cutWhenReady(true); } }, '⏭');
    const foldBtn = h('button', { type: 'button', class: 'live-btn', 'aria-label': t('live.hide'), title: t('live.hide'), onclick: () => { folded = true; remember(); paint(); } }, '▁');
    const unfold = h('button', { type: 'button', class: 'live-unfold', onclick: () => { folded = false; remember(); paint(); if (!current) cutNow(); } }, t('live.show'));
    // on the map: a way to the arena, where the same camera fills the screen
    const bigLink = h('a', { class: 'live-btn live-expand', href: '#/live', 'aria-label': t('arena.open'), title: t('arena.open') }, '⛶');
    const el = h('section', { class: 'live-cam' + (big ? ' live-cam-big' : ''), 'aria-label': t('live.title') },
        screen, h('div', { class: 'live-controls' }, pauseBtn, nextBtn, big ? null : bigLink, big ? null : foldBtn), unfold);

    function remember() { savePrefs({ paused, folded: big ? !!prefs.folded : folded }); }
    function paint() {
        el.classList.toggle('is-paused', paused);
        el.classList.toggle('is-folded', folded);
        screen.hidden = folded;
        unfold.hidden = !folded;
        el.querySelector('.live-controls').hidden = folded;
        pauseBtn.textContent = paused ? '▶' : '⏸';
        pauseBtn.setAttribute('aria-label', paused ? t('live.play') : t('live.pause'));
        pauseBtn.title = pauseBtn.getAttribute('aria-label');
        pauseBtn.setAttribute('aria-pressed', String(paused));
    }

    // Choose who is next and start fetching their pictures, so the cut lands on a full frame.
    function prepare() {
        const roster = [...eco.agents.keys()];
        const id = director.next(roster, current);
        if (id == null) return;
        const live = eco.agents.get(id);
        const s = shotFor(W, live, director.cut);
        const pose = visualOf('agent', id);
        const scene = s.place && visualOf(s.placeKind, s.place);
        // two residents who have just met are filmed together
        const other = partnerFor(id, director.news.get(id), eco.agents, eco.time);
        if (other) director.mark(other);
        const pose2 = other && visualOf('agent', other);
        const p = { id, partner: other, meeting: other ? director.news.get(id).msg.message : '', ready: false };
        Promise.all([pose && preload(visualPoseSource(pose)), pose2 && preload(visualPoseSource(pose2)), scene && !saveData && preload(visualSource(scene))]).then(() => { p.ready = true; });
        pending = p;
        waited = 0;
    }

    function buildActor(id, frame, bubble, role) {
        const char = W.byId.agent.get(id);
        const pose = visualOf('agent', id);
        // An AI brought in from outside has no painted pose sheet yet: its drawn face stands in.
        const figure = pose
            ? h('div', { class: 'live-figure visual-pose', dataset: { frame: String(frame) } }, h('img', { src: visualPoseSource(pose), alt: '', decoding: 'async' }))
            : h('div', { class: 'live-figure live-figure-drawn' }, char ? avatar(W, char) : null);
        return h('div', { class: 'live-actor', dataset: { actor: id, role }, style: { '--pose-aspect': String((pose && pose.poseAspect) || 1) } },
            figure, h('span', { class: 'live-bubble' }, bubble));
    }

    function buildShot(s, other) {
        const place = s.place && W.byId.place.get(s.place);
        const scene = place && visualOf(s.placeKind, place.id);
        const pal = (place && place.aesthetic && place.aesthetic.palette) || ['#1b2150', '#0b1030'];
        const bg = scene && !saveData
            ? h('img', { class: 'live-bg', src: visualSource(scene), alt: '', decoding: 'async' })
            : h('div', { class: 'live-bg live-bg-plain', style: { background: `radial-gradient(120% 90% at 50% 30%, ${pal[1] || pal[0]}66, ${pal[0]}33 45%, #070a1c 100%)` } });
        // A meeting: the two walk in from either side, stand facing the middle and talk in turn.
        if (other) return h('div', { class: 'live-shot', dataset: { duo: 'true', move: 'meet', side: 'duo', close: 'false', stage: 'meet', speaker: 'a' } },
            bg, buildActor(s.id, 0, '💬', 'a'), buildActor(other, 0, '💬', 'b'));
        return h('div', { class: 'live-shot', dataset: { move: s.move, side: s.side, close: String(s.close), stage: s.stage } }, bg, buildActor(s.id, s.frame, s.bubble, 'solo'));
    }

    function cut(id, other = null, met = '') {
        const live = eco.agents.get(id);
        if (!live) return;
        current = id;
        partner = other && eco.agents.has(other) ? other : null;
        meeting = met;
        elapsed = 0;
        const s = shotFor(W, live, director.cut);
        const shot = buildShot(s, partner);
        shots.append(shot);
        // two frames so the browser has painted the new shot at opacity 0 before it fades in
        requestAnimationFrame(() => requestAnimationFrame(() => shot.classList.add('is-on')));
        for (const old of [...shots.children].slice(0, -1)) {
            old.classList.remove('is-on');
            setTimeout(() => old.remove(), reduced ? 0 : FADE_MS);
        }
        const roster = [...eco.agents.keys()];
        camNo.textContent = 'CAM ' + String(roster.indexOf(id) + 1).padStart(2, '0');
        refresh(true);
    }

    function cutNow() { prepare(); if (pending) { const p = pending; pending = null; cut(p.id, p.partner, p.meeting); } }
    function cutWhenReady(force = false) {
        if (!pending) return;
        if (pending.ready || force || waited >= PATIENCE) { const p = pending; pending = null; cut(p.id, p.partner, p.meeting); }
    }

    // What changes while a shot is on screen: the pose, the mark, the caption, the hour.
    function refresh(fresh = false) {
        clock.textContent = eco.clock.label;
        el.dataset.night = String(!!eco.clock.isNight);
        const live = current && eco.agents.get(current);
        const shot = shots.lastElementChild;
        if (!live || !shot) return;
        const s = shotFor(W, live, director.cut);
        if (partner) {
            const turn = speakerAt(elapsed);
            if (shot.dataset.speaker !== turn) shot.dataset.speaker = turn;
        } else {
            const figure = shot.querySelector('.live-figure');
            if (figure && figure.dataset.frame !== undefined && figure.dataset.frame !== String(s.frame)) figure.dataset.frame = String(s.frame);
            const bubble = shot.querySelector('.live-bubble');
            if (bubble.textContent !== s.bubble) bubble.textContent = s.bubble;
            if (shot.dataset.stage !== s.stage) shot.dataset.stage = s.stage;
        }
        const char = W.byId.agent.get(current);
        const district = s.district && W.byId.district.get(s.district);
        const place = s.place && W.byId.place.get(s.place);
        // a two-shot keeps the meeting itself as its caption for the whole cut
        const c = partner ? { kind: 'news', text: meeting } : captionFor(live, director.news.get(current), eco.time);
        const text = c.kind === 'voice' ? `${t('live.voice')}「${c.text}」` : c.text;
        const who = [char, partner && W.byId.agent.get(partner)].filter(Boolean).map(agentShort).join(' × ') || current;
        if (fresh || caption.textContent !== text) {
            name.textContent = who;
            where.textContent = [place && placeShort(place), district && nameOf(district)].filter(Boolean).join(' ・ ');
            caption.textContent = text;
            caption.dataset.kind = c.kind;
            screen.setAttribute('aria-label', `${t('live.title')}：${name.textContent}（${where.textContent}）${text}。${t('live.follow', { name: name.textContent })}`);
        }
    }

    function tick() {
        const now = performance.now(), dt = Math.min(1, (now - last) / 1000);
        last = now;
        if (!el.isConnected || document.hidden || folded) return;
        refresh();
        if (paused) return;
        elapsed += dt;
        if (!pending && elapsed >= CUT_SECONDS - LEAD) prepare();
        if (elapsed >= CUT_SECONDS) { waited += dt; cutWhenReady(); }
    }

    paint();
    if (!folded) cutNow();
    const timer = setInterval(tick, 250);

    return {
        el,
        destroy() { clearInterval(timer); off(); }
    };
}
