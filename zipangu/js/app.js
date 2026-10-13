// 万華京ジパング explorer: boots the world and the economy, owns the router
// and the clock that drives everything.

import { loadWorld } from './data.js';
import { createEconomy } from './sim.js';
import { createStories } from './character-stories.js';
import { loadJourney, saveJourney, journeyKey } from './journey-save.js';
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
import { visualsView, visualView } from './view-visuals.js';
import { chainView } from './view-chain.js';
import { attachChainFx } from './chain-fx.js';
import { summonView, settingsView } from './view-summon.js';
import { loadCards, addTravellers } from './soul.js';
import { t, getLang } from './i18n.js';
import { loadSettings, createMind, PROVIDERS } from './mind.js';
import { loadResearchSettings, saveResearchSettings, createRecorder, openStore, newRunId } from './research.js';
import { createLocalEngine, CONSENT_KEY } from './mind-local.js';
import { createProgress, loadProgress, joinHidden } from './progress.js';
import { loadBirths } from './birth.js';
import { journalView } from './view-journal.js';
import { toast } from './toast.js';

const SECONDS_PER_DAY = 240;          // one in-world day (one 節気) is about four minutes
const WARM_UP_SECONDS = 150;          // the city is already busy when you arrive
const STEP_EVERY = 0.1;               // real seconds between economy steps
const SAMPLE_EVERY = 1 / 48;          // history point every half game-hour

// route name → which nav tab it belongs to
const TAB_OF = {
    home: 'home', place: 'home', district: 'home', bestiary: 'bestiary', creature: 'bestiary',
    library: 'library', work: 'library', market: 'market', agents: 'agents', agent: 'agents',
    about: 'about', corrections: 'about', visuals: 'visuals', visual: 'visuals', chain: 'chain',
    summon: 'settings', settings: 'settings', journal: 'settings'
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
    // A malformed escape such as %E0%A4%A must not throw: keep the raw segment and let the view say 見つかりません.
    let id = null;
    if (parts[1]) { try { id = decodeURIComponent(parts[1]); } catch { id = parts[1]; } }
    return { name: parts[0] || 'home', id, query };
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

// ------------------------------------------------------------------ interface language

// The static frame in index.html (navigation, skip link) follows the chosen language.
function applyChrome() {
    document.documentElement.lang = getLang();
    const skip = document.querySelector('.skip-link');
    if (skip) skip.textContent = t('skip');
    document.querySelectorAll('#primary-nav a[data-tab]').forEach(a => {
        const span = a.querySelector('span');
        if (span) span.textContent = t('nav.' + (a.dataset.tab === 'home' ? 'map' : a.dataset.tab));
    });
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
    let storage;
    try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error('unavailable'); }, setItem() { throw new Error('unavailable'); } }; }
    // AIs the visitor brought in (#/summon) join the world before the journey is restored.
    addTravellers(W, loadCards(storage, W));
    // 📖 hidden residents met on earlier visits live in the city again, before the journey is restored
    for (const id of Object.keys(loadProgress(storage).found)) if (W.byId.hidden.has(id)) joinHidden(W, W.byId.hidden.get(id));
    let session;
    try { session = window.sessionStorage; } catch { session = storage; }
    const loaded = loadJourney(storage, W, seed);
    // 🧠 Residents think with a large language model. By default it is Qwen running inside this
    // browser (js/mind-local.js); until it has loaded, and on devices without WebGPU, the rules decide.
    const mindSettings = loadSettings(storage, session);
    const localEngine = mindSettings.on && (PROVIDERS[mindSettings.provider] || {}).kind === 'local' ? createLocalEngine() : null;
    const mind = mindSettings.on ? createMind(W, mindSettings, { lang: getLang(), local: localEngine }) : null;
    const eco = createEconomy(W, { seed, secondsPerDay: SECONDS_PER_DAY, state: loaded.data?.economy || null, mind });
    const history = createHistory(eco, loaded.data?.history || null);
    if (!loaded.data?.history) history.sample();
    let nextSample = Math.floor(eco.time / SAMPLE_EVERY) + 1;
    const sampleIfDue = () => {
        const slot = Math.floor(eco.time / SAMPLE_EVERY);
        if (slot >= nextSample) { history.sample(); nextSample = slot + 1; }
    };
    if (!loaded.data) for (let s = 0; s < WARM_UP_SECONDS; s += 5) { eco.step(5); sampleIfDue(); }
    const stories = createStories(W, eco, loaded.data?.stories || null);

    // 📖 the traveller's journal: grows with play, keeps across journeys and languages (js/progress.js)
    let extrasCache = null, extrasAt = 0;
    const progress = createProgress(W, {
        storage,
        extras: () => {
            if (!extrasCache || Date.now() - extrasAt > 30000) {
                extrasCache = { cards: loadCards(storage, W).length, onChain: Object.values(loadBirths(storage)).filter(b => b.chain).length };
                extrasAt = Date.now();
            }
            return extrasCache;
        }
    });
    eco.on('trade', () => progress.count('trades'));
    eco.on('thought', () => progress.count('thoughts'));
    eco.on('event', () => progress.count('events'));
    eco.on('goal', () => progress.count('goals'));

    let speed = Number(store.get('zipangu.speed')) || 1;
    if (!SPEEDS.includes(speed)) speed = 1;

    const hud = createHud(W, eco, { speed, onSpeed: s => { speed = s; store.set('zipangu.speed', String(s)); } });
    const ctx = { W, eco, history, hud, stories, progress, loadDoc, storage, session, mind, mindEngine: localEngine, mapView: null, pendingFocus: null, seed, journeyStatus: loaded.status, chain: null, chainMod: null };
    let saveBlocked = loaded.blocked;
    const saveNotice = h('div', { class: 'journey-notice' });
    const saveText = h('span', { role: 'status' }, loaded.status);
    saveNotice.append(saveText);
    progress.on((type, data) => {
        if (type === 'badge') toast(t('toast.badge', { title: data.title }), { href: '#/journal', kind: 'badge' });
        else if (type === 'rank') toast(t('toast.rank', { name: data.name, unlock: data.unlock }), { href: '#/journal', kind: 'rank', ms: 8000 });
        else if (type === 'hidden') {
            // a hidden resident steps into the running city and stays (saved with the journal and the journey)
            const a = joinHidden(W, data);
            if (a) eco.addResident(a);
            toast(t('toast.hidden', { name: a ? a.name : data.name }), { href: '#/agent/' + encodeURIComponent(data.id), kind: 'hidden', ms: 12000 });
            progress.save();
            ctx.persistJourney();
        }
    });
    ctx.persistJourney = () => {
        if (ctx.frozen) return;      // a backup was just restored: this page must not write over it on the way out
        progress.save();
        // the devnet wallet and ledger (zipangu.chain.v1) ride along, so a reload (a language change) keeps them
        if (ctx.chain && ctx.chain.save) { try { ctx.chain.save(); } catch { /* fine */ } }
        if (saveBlocked) return;
        const result = saveJourney(storage, seed, eco, stories, history);
        ctx.journeyStatus = result.status;
        saveText.textContent = result.status;
        saveNotice.classList.toggle('save-failed', !result.ok);
    };
    if (saveBlocked) saveNotice.append(h('button', { type: 'button', class: 'btn btn-small', onclick: () => {
        try { storage.removeItem(journeyKey(seed)); saveBlocked = false; ctx.persistJourney(); saveNotice.querySelector('button')?.remove(); }
        catch { ctx.journeyStatus = saveText.textContent = '保存を使えません。この旅は一時的な記録のままです。'; }
    } }, '元の記録を消して新しい旅を保存'));
    main.before(saveNotice);
    setInterval(ctx.persistJourney, 5000);
    window.addEventListener('pagehide', ctx.persistJourney);
    document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.persistJourney(); });
    window.__zipangu = ctx;      // handy in the console

    // ---------------------------------------------------- 🔬 decision log (js/research.js, docs/RESEARCH.md)
    // Off unless turned on in settings. Records who chose (the rules or the model), among what,
    // and what came of it; they stay in this browser (IndexedDB) until exported.
    ctx.research = { settings: loadResearchSettings(storage), store: null, rec: null };
    ctx.startResearch = () => {
        const r = ctx.research;
        if (r.rec) return;
        if (!r.settings.run) r.settings.run = newRunId();
        r.settings.on = true; saveResearchSettings(storage, r.settings);
        r.store = r.store || openStore();
        r.rec = createRecorder(eco, { run: r.settings.run, sink: rec => r.store.add(rec) });
    };
    ctx.stopResearch = () => {
        const r = ctx.research;
        if (r.rec) { r.rec.flush(); r.rec.stop(); r.rec = null; }
        r.settings.on = false; saveResearchSettings(storage, r.settings);
    };
    if (ctx.research.settings.on) ctx.startResearch();
    else if (ctx.research.settings.run) ctx.research.store = openStore();   // records from an earlier visit, to show and export
    window.addEventListener('pagehide', () => { if (ctx.research.rec) ctx.research.rec.flush(); });

    // ---------------------------------------------------- ⛓ chain mode (lazy; docs/ONCHAIN.md)
    // js/chain.js is only fetched once the user turns chain mode on. Until then there is
    // no chain object, no network request, and the explorer is exactly the simulation.
    const CHAIN_FLAG = 'zipangu.chain.on';
    let chainLoading = null;
    ctx.useChainModule = mod => {              // also the seam for tests: hand it any module with createChain()
        ctx.chainMod = mod;
        ctx.chain = mod.createChain(W, eco, {});
        attachChainFx(ctx.chain);
        hud.setChain(ctx.chain, mod);
        return ctx.chain;
    };
    ctx.loadChain = () => {
        if (ctx.chain) return Promise.resolve(ctx.chain);
        if (!chainLoading) chainLoading = import('./chain.js').then(ctx.useChainModule).catch(err => { chainLoading = null; throw err; });
        return chainLoading;
    };
    ctx.enableChain = async () => {
        const chain = await ctx.loadChain();
        store.set(CHAIN_FLAG, '1');
        await chain.enable();
        return chain;
    };
    ctx.disableChain = () => { store.set(CHAIN_FLAG, '0'); if (ctx.chain) ctx.chain.disable(); };
    ctx.resetChain = () => { store.set(CHAIN_FLAG, '0'); if (ctx.chain) { ctx.chain.disable(); ctx.chain.reset(); } };

    // ---------------------------------------------------- shell
    const emblem = document.getElementById('brand-emblem');
    const fly = jewelButterfly(W);
    if (emblem && fly) emblem.append(creatureCanvas(fly, 44));
    const tools = document.getElementById('top-tools');
    const settingsLink = h('a', { class: 'settings-link', href: '#/settings', title: t('nav.settings'), 'aria-label': t('nav.settings') }, '⚙');
    tools.append(hud.chainChip, hud.mini, hud.speedEl, settingsLink);
    // The in-browser model starts by itself on computers; phones ask first (a large download on
    // mobile data), and remember the answer.
    ctx.startMind = () => { store.set(CONSENT_KEY, '1'); return localEngine ? localEngine.start() : Promise.resolve(false); };
    ctx.mindAuto = !!localEngine && (!localEngine.state.phone || store.get(CONSENT_KEY) === '1');
    // without WebGPU start() only finds that out (nothing is fetched), so the status says so at once
    if (ctx.mindAuto || (localEngine && !navigator.gpu)) setTimeout(() => localEngine.start(), ctx.mindAuto ? 2500 : 0);
    if (mind) {
        const mindText = h('span', { class: 'chain-chip-text' });
        const mindChip = h('a', { class: 'chain-chip mind-chip', href: '#/settings', title: t('mind.chip') },
            h('span', { class: 'chain-chip-gem', 'aria-hidden': 'true' }, '🧠'), mindText);
        const paintMind = st => {
            const shown = st.state !== 'unsupported' && st.state !== 'idle';
            mindChip.hidden = !shown;
            settingsLink.classList.toggle('has-mind', shown);
            mindText.textContent = st.state === 'loading' ? `${Math.round((st.progress || 0) * 100)}%`
                : st.state === 'working' ? '…' : st.state === 'error' ? '⚠' : st.state === 'budget' ? 'MAX' : (String(st.model).split('/').pop() || 'LLM');
            mindChip.classList.toggle('is-live', st.state === 'ready' || st.state === 'working');
            mindChip.classList.toggle('is-error', st.state === 'error');
            settingsLink.classList.toggle('mind-error', st.state === 'error');
        };
        mind.on(paintMind);
        paintMind(mind.status);
        tools.insertBefore(mindChip, hud.chainChip);
    }
    applyChrome();
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
        corrections: () => correctionsView(ctx),
        visuals: () => visualsView(ctx),
        visual: r => visualView(ctx, r.id),
        chain: () => chainView(ctx),
        summon: () => summonView(ctx),
        settings: () => settingsView(ctx),
        journal: () => journalView(ctx)
    };

    let current = null, firstRender = true;

    // 📖 what the visitor has opened, and which era/realm they are looking at
    function noteVisit(name, id) {
        const placeOfDistrict = d => { const p = d && W.placeOf(d); return p ? p.id : null; };
        if (name === 'creature' && W.byId.creature.has(id)) progress.see('creature', id);
        else if (name === 'work' && W.byId.work.has(id)) progress.see('work', id);
        else if (name === 'visual' && id) progress.see('visual', id);
        if (name === 'place' && W.byId.place.has(id)) { progress.see('place', id); progress.setHere(id); }
        else if (name === 'district' && W.byId.district.has(id)) { progress.see('district', id); progress.setHere(placeOfDistrict(id)); }
        else if (name === 'agent' && W.byId.agent.has(id)) { if (!W.byId.agent.get(id).traveller && !W.byId.agent.get(id).hiddenResident) progress.see('agent', id); progress.setHere(placeOfDistrict(W.byId.agent.get(id).home)); }
        else if (name === 'home') progress.setHere(null);
    }

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
        noteVisit(name, r.id);
        document.body.className = 'route-' + name;
        main.append(view.el);
        const head = view.el.querySelector && view.el.querySelector('.page-head');
        if (head && fly) head.append(h('div', { class: 'head-fly', 'aria-hidden': 'true' }, creatureCanvas(fly, 84)));
        document.title = (view.title ? view.title + ' ・ ' : '') + '万華京ジパング';
        settingsLink.classList.toggle('is-active', TAB_OF[name] === 'settings');
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

    let lastKoku = eco.clock.koku;
    setInterval(() => {
        if (document.hidden) return;
        hud.update();
        // 📖 a second of watching; each new 刻, one roll of the dice for a hidden resident
        progress.tick(1, eco.clock);
        if (eco.clock.koku !== lastKoku) { lastKoku = eco.clock.koku; progress.encounter(eco.clock); }
        if (current && current.update) current.update();
    }, 1000);
    setInterval(() => { if (!document.hidden) hud.flushFeed(); }, 450);
    setInterval(() => { if (!document.hidden) hud.slow(); }, 5000);
    // hud was built before the first frame; paint it once more with the live clock
    hud.update();
    document.documentElement.classList.add('is-ready');
    // chain mode was left on last time: pick it up again (this is the only path that touches the network at boot)
    if (store.get(CHAIN_FLAG) === '1') ctx.enableChain().catch(err => console.warn('chain mode could not start', err));
}

boot();
