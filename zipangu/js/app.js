// 万華京ジパング explorer: boots the world and the economy, owns the router
// and the clock that drives everything.

import { loadWorld } from './data.js';
import { createEconomy } from './sim.js';
import { createHistory } from './history.js';
import { createHud, SPEEDS } from './hud.js';
import { creatureCanvas } from './creature-art.js';
import { h, clear } from './util.js';
import { jewelButterfly } from './components.js';
import { homeView } from './view-home.js';
import { placeView, districtView, notFound } from './view-place.js';
import { bestiaryView, creatureView } from './view-bestiary.js';
import { libraryView, workView } from './view-library.js';
import { marketView } from './view-market.js';
import { agentsView, agentView } from './view-agents.js';
import { aboutView, correctionsView } from './view-about.js';

const SECONDS_PER_DAY = 240;          // one in-world day (one 節気) is about four minutes
const WARM_UP_SECONDS = 150;          // the city is already busy when you arrive
const STEP_EVERY = 0.1;               // real seconds between economy steps
const SAMPLE_EVERY = 1 / 48;          // history point every half game-hour

// route name → which nav tab it belongs to
const TAB_OF = {
    home: 'home', place: 'home', district: 'home', bestiary: 'bestiary', creature: 'bestiary',
    library: 'library', work: 'library', market: 'market', agents: 'agents', agent: 'agents',
    about: 'about', corrections: 'about'
};

// ------------------------------------------------------------------ storage that may not exist

const store = {
    get(key) { try { return window.localStorage.getItem(key); } catch { return null; } },
    set(key, val) { try { window.localStorage.setItem(key, val); } catch { /* private mode: fine */ } }
};

// ------------------------------------------------------------------ routing

function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs = ''] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const query = {};
    new URLSearchParams(qs).forEach((v, k) => { query[k] = v; });
    return { name: parts[0] || 'home', id: parts[1] ? decodeURIComponent(parts[1]) : null, query };
}

// ------------------------------------------------------------------ chapters

const docCache = new Map();

async function loadDoc(kind, id) {
    const key = kind ? `${kind}/${id}` : id;
    const inlined = window.__ZIPANGU_DOCS__;
    if (inlined) return inlined[key] || null;
    if (docCache.has(key)) return docCache.get(key);
    let text = null;
    try {
        const res = await fetch(`docs/${key}.md`);
        text = res.ok ? await res.text() : null;
    } catch { text = null; }
    docCache.set(key, text);
    return text;
}

// ------------------------------------------------------------------ boot

async function boot() {
    const main = document.getElementById('main');
    let W;
    try {
        W = await loadWorld('world/');
    } catch (err) {
        console.error(err);
        clear(main).append(h('div', { class: 'page' }, h('div', { class: 'notice' },
            h('h1', null, '世界を読み込めませんでした'),
            h('p', null, 'world/*.json が見つかりません。サーバーのルートで開いているか、確かめてください。'))));
        return;
    }

    const seed = Number(new URLSearchParams(location.search).get('seed')) || 1;
    const eco = createEconomy(W, { seed, secondsPerDay: SECONDS_PER_DAY });
    const history = createHistory(eco);
    history.sample();
    let nextSample = Math.floor(eco.time / SAMPLE_EVERY) + 1;
    const sampleIfDue = () => {
        const slot = Math.floor(eco.time / SAMPLE_EVERY);
        if (slot >= nextSample) { history.sample(); nextSample = slot + 1; }
    };
    for (let s = 0; s < WARM_UP_SECONDS; s += 5) { eco.step(5); sampleIfDue(); }

    let speed = Number(store.get('zipangu.speed')) || 1;
    if (!SPEEDS.includes(speed)) speed = 1;

    const hud = createHud(W, eco, { speed, onSpeed: s => { speed = s; store.set('zipangu.speed', String(s)); } });
    const ctx = { W, eco, history, hud, loadDoc, mapView: null, pendingFocus: null, seed };
    window.__zipangu = ctx;      // handy in the console

    // ---------------------------------------------------- shell
    const emblem = document.getElementById('brand-emblem');
    const fly = jewelButterfly(W);
    if (emblem && fly) emblem.append(creatureCanvas(fly, 44));
    const tools = document.getElementById('top-tools');
    tools.append(hud.mini, hud.speedEl);
    hud.setSpeed(speed);
    const announcer = document.getElementById('route-announcer');

    const ROUTES = {
        home: () => homeView(ctx),
        place: r => placeView(ctx, r.id),
        district: r => districtView(ctx, r.id),
        bestiary: r => bestiaryView(ctx, r.query),
        creature: r => creatureView(ctx, r.id),
        library: () => libraryView(ctx),
        work: r => workView(ctx, r.id),
        market: r => marketView(ctx, r.query),
        agents: r => agentsView(ctx, r.query),
        agent: r => agentView(ctx, r.id),
        about: () => aboutView(ctx),
        corrections: () => correctionsView(ctx)
    };

    let current = null, firstRender = true;

    function render() {
        const r = parseHash();
        if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
        clear(main);
        let view;
        try {
            view = (ROUTES[r.name] || (() => notFound('そのページ')))(r);
        } catch (err) {
            console.error(err);
            view = { el: h('div', { class: 'page' }, h('div', { class: 'notice' }, h('h1', null, '表示でつまずきました'), h('p', null, String(err && err.message || err)))) };
        }
        current = view;
        ctx.view = view;
        const name = ROUTES[r.name] ? r.name : 'notfound';
        document.body.className = 'route-' + name;
        main.append(view.el);
        const head = view.el.querySelector && view.el.querySelector('.page-head');
        if (head && fly) head.append(h('div', { class: 'head-fly', 'aria-hidden': 'true' }, creatureCanvas(fly, 84)));
        document.title = (view.title ? view.title + ' ・ ' : '') + '万華京ジパング';
        document.querySelectorAll('#primary-nav a').forEach(a => {
            const on = a.dataset.tab === TAB_OF[name];
            a.classList.toggle('is-active', on);
            if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
        });
        if (!firstRender) {
            if (name !== 'home') window.scrollTo(0, 0);
            main.focus({ preventScroll: true });
            if (announcer) announcer.textContent = document.title;
        }
        firstRender = false;
        if (view.update) view.update();
    }

    window.addEventListener('hashchange', render);
    // A hash like #/place/x from the map should keep the map's view for the way back.
    render();

    // ---------------------------------------------------- clock
    let last = performance.now(), acc = 0;
    function frame(now) {
        const dt = Math.min(0.5, (now - last) / 1000);
        last = now;
        acc += dt;
        if (acc >= STEP_EVERY && !document.hidden) {
            eco.step(acc * speed);
            acc = 0;
            sampleIfDue();
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    setInterval(() => {
        if (document.hidden) return;
        hud.update();
        if (current && current.update) current.update();
    }, 1000);
    setInterval(() => { if (!document.hidden) hud.flushFeed(); }, 450);
    setInterval(() => { if (!document.hidden) hud.slow(); }, 5000);
    // hud was built before the first frame; paint it once more with the live clock
    hud.update();
    document.documentElement.classList.add('is-ready');
}

boot();
