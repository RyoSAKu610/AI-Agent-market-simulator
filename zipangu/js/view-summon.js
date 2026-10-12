// #/summon — bring an outside AI into the world — and #/settings (language, the AIs you brought).

import { h, clear, href } from './util.js';
import { plaque, sectionHead, avatar } from './components.js';
import { t, LANGS, getLang, setLang } from './i18n.js';
import { qrSvg } from './qr.js';
import {
    summonPrompt, parseSoul, toAgentDef, travellerId, loadCards, saveCards, MAX_TRAVELLERS, arrivalDistrict
} from './soul.js';
import { PROVIDERS, loadSettings, saveSettings, resolve, testConnection, listModels } from './mind.js';

async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
    try {
        const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
        document.body.append(ta); ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
    } catch { return false; }
}

function copyButton(label, getText) {
    const status = h('span', { class: 'copy-status', role: 'status' });
    const btn = h('button', { type: 'button', class: 'btn btn-primary', onclick: async () => {
        const ok = await copyText(getText());
        status.textContent = ok ? t('summon.copied') : t('summon.copyFail');
        setTimeout(() => { status.textContent = ''; }, 2600);
    } }, label);
    return h('span', { class: 'copy-row' }, btn, status);
}

// After a resident joins or leaves the economy is rebuilt from the saved journey.
function restartInto(ctx, hash) {
    if (ctx.persistJourney) ctx.persistJourney();
    location.hash = hash;
    location.reload();
}

function placeName(W, districtId) {
    const d = W.byId.district.get(districtId);
    const p = W.placeOf(districtId);
    return [p && String(p.name_ja).split('「')[0], d && d.name_ja].filter(Boolean).join(' ・ ');
}

// The AIs already brought in, with a way to send each one off.
function residentsList(ctx) {
    const { W } = ctx;
    const cards = loadCards(ctx.storage, W);
    if (!cards.length) return h('p', { class: 'ar-role' }, t('summon.none'));
    return h('ul', { class: 'traveller-list' }, cards.map(card => {
        const def = W.byId.agent.get(card.id) || toAgentDef(W, card);
        return h('li', { class: 'traveller-row' },
            avatar(W, def),
            h('div', { class: 'tr-id' },
                h('a', { href: href.agent(card.id) }, card.name),
                h('span', null, `${t('summon.from')}：${card.from} ・ ${placeName(W, def.home)}`)),
            h('button', { type: 'button', class: 'btn btn-small', onclick: () => {
                if (!confirm(t('summon.removeAsk', { name: card.name }))) return;
                saveCards(ctx.storage, loadCards(ctx.storage, W).filter(c => c.id !== card.id));
                restartInto(ctx, '#/settings');
            } }, t('summon.remove')));
    }));
}

function preview(W, card) {
    const def = toAgentDef(W, card);
    const list = (title, items) => items.length ? h('div', { class: 'soul-list' }, h('h4', null, title), h('ul', null, items.map(x => h('li', null, x)))) : null;
    return plaque({ class: 'soul-preview' },
        h('p', { class: 'eyebrow' }, t('summon.preview')),
        h('div', { class: 'soul-head' }, avatar(W, def), h('div', null, h('h3', null, card.name), h('p', { class: 'soul-from' }, `${t('summon.from')}：${card.from}`))),
        card.greeting ? h('p', { class: 'soul-greeting' }, `「${card.greeting}」`) : null,
        h('p', null, card.personality),
        card.specialty ? h('p', { class: 'ar-role' }, card.specialty) : null,
        list(t('summon.memories'), card.memories),
        list(t('summon.values'), card.values),
        h('p', { class: 'soul-arrive' }, `${t('summon.arrives')}：${placeName(W, def.home)}`));
}

export function summonView(ctx) {
    const { W } = ctx;
    const lang = getLang();
    const prompt = summonPrompt(W, lang);

    const promptBox = h('textarea', { class: 'soul-prompt', readonly: true, rows: '9', 'aria-label': t('summon.step1') }, prompt);
    promptBox.addEventListener('focus', () => promptBox.select());

    const paste = h('textarea', { class: 'soul-paste', rows: '7', placeholder: 'ZIPANGU-SOUL/1\n{ "name": "…", … }', 'aria-label': t('summon.step2') });
    const message = h('p', { class: 'soul-message', role: 'status' });
    const result = h('div', { class: 'soul-result' });

    const read = () => {
        clear(result); message.textContent = '';
        const r = parseSoul(paste.value, W);
        if (!r.ok) { message.textContent = t('summon.err.' + r.error); message.className = 'soul-message is-error'; return; }
        message.className = 'soul-message';
        const cards = loadCards(ctx.storage, W);
        const full = cards.length >= MAX_TRAVELLERS;
        result.append(preview(W, r.card),
            full ? h('p', { class: 'soul-message is-error' }, t('summon.full', { n: MAX_TRAVELLERS }))
                : h('button', { type: 'button', class: 'btn btn-primary btn-big', onclick: () => {
                    const card = { ...r.card, id: travellerId(r.card, String(Date.now())), arrived: new Date().toISOString().slice(0, 10) };
                    const latest = loadCards(ctx.storage, W);
                    if (latest.length >= MAX_TRAVELLERS || !saveCards(ctx.storage, [...latest, card])) {
                        message.textContent = t('summon.full', { n: MAX_TRAVELLERS }); message.className = 'soul-message is-error'; return;
                    }
                    message.textContent = t('summon.born', { name: card.name, place: placeName(W, arrivalDistrict(W, card.era)) });
                    restartInto(ctx, '#/agent/' + encodeURIComponent(card.id));
                } }, t('summon.welcome')));
    };

    // A QR code for opening this page on a phone (not for a file:// copy, which a phone cannot reach).
    const pageUrl = `${location.origin}${location.pathname}?lang=${lang}#/summon`;
    let qrPanel = null;
    if (/^https?:$/.test(location.protocol)) {
        const box = h('div', { class: 'qr-box' });
        const svgText = qrSvg(pageUrl, { label: t('summon.qr') });
        if (svgText) box.innerHTML = svgText;   // generated here from module bits and an escaped title only
        qrPanel = plaque({ class: 'qr-panel' },
            h('h3', null, t('summon.qr')), box, h('p', { class: 'ar-role' }, t('summon.qr.body')),
            h('p', { class: 'qr-url' }, pageUrl), copyButton(t('summon.copyLink'), () => pageUrl));
    }

    const el = h('div', { class: 'page page-summon' },
        h('header', { class: 'page-head' },
            h('h1', null, t('summon.title')),
            h('p', { class: 'lead' }, t('summon.lead')),
            h('p', null, t('summon.how')),
            h('p', { class: 'ar-role' }, t('summon.honest'))),
        h('div', { class: 'summon-grid' },
            h('div', { class: 'summon-steps' },
                plaque({ class: 'soul-step' }, h('h2', null, t('summon.step1')), h('p', null, t('summon.step1.body')), promptBox, copyButton(t('summon.copy'), () => prompt)),
                plaque({ class: 'soul-step' }, h('h2', null, t('summon.step2')), h('p', null, t('summon.step2.body')), paste,
                    h('p', null, h('button', { type: 'button', class: 'btn', onclick: read }, t('summon.read'))), message, result)),
            qrPanel),
        h('section', { class: 'sec', 'aria-labelledby': 'sm-residents' }, sectionHead(t('summon.residents'), '', 'sm-residents'), residentsList(ctx)));
    return { el, title: t('summon.title') };
}

// 🧠 Which large language model (if any) residents think with. Saving reloads the page so the
// economy starts again with or without minds; the journey is kept.
function mindSection(ctx) {
    const s = loadSettings(ctx.storage, ctx.session);
    const input = (attrs) => h('input', { class: 'mind-input', spellcheck: 'false', autocomplete: 'off', ...attrs });
    const field = (label, ...control) => h('label', { class: 'mind-field' }, h('span', { class: 'mind-label' }, label), ...control);
    const on = h('input', { type: 'checkbox', checked: s.on });
    const provider = h('select', { class: 'mind-input' }, Object.entries(PROVIDERS).map(([id, p]) => h('option', { value: id, selected: id === s.provider }, p.label)));
    const note = h('p', { class: 'ar-role mind-note' });
    const base = input({ type: 'url', value: s.base });
    const models = h('datalist', { id: 'mind-models' });
    const model = input({ type: 'text', list: 'mind-models', value: s.model });
    const key = input({ type: 'password', value: s.key });
    const keyLink = h('a', { class: 'mind-keylink', target: '_blank', rel: 'noopener noreferrer' }, t('mind.getKey'));
    const remember = h('input', { type: 'checkbox', checked: s.remember });
    const keyBox = h('div', { class: 'mind-keybox' }, field(t('mind.key'), key), keyLink,
        h('label', { class: 'mind-check' }, remember, h('span', null, t('mind.remember'))));
    const keyNone = h('p', { class: 'ar-role' }, t('mind.keyNone'));
    const scope = h('select', { class: 'mind-input' }, ['travellers', 'all'].map(v => h('option', { value: v, selected: v === s.scope }, t('mind.scope.' + v))));
    const perHour = input({ type: 'number', min: '1', max: '2000', step: '1', value: String(s.perHour), inputmode: 'numeric' });
    const message = h('p', { class: 'soul-message', role: 'status' });

    const read = () => ({
        on: on.checked, provider: provider.value, base: base.value.trim(), model: model.value.trim(), key: key.value.trim(),
        remember: remember.checked, scope: scope.value, perHour: Math.max(1, Math.min(2000, Math.round(Number(perHour.value)) || 120))
    });
    const say = (text, bad) => { message.textContent = text; message.className = 'soul-message' + (bad ? ' is-error' : ''); };
    const fillModels = list => { clear(models); for (const m of list) models.append(h('option', { value: m })); };

    // the in-browser model needs none of the connection fields
    const remoteOnly = [];
    const localBox = h('div', { class: 'mind-localbox' });
    const remote = el => { remoteOnly.push(el); return el; };
    function paintProvider() {
        const p = PROVIDERS[provider.value] || PROVIDERS.custom;
        const local = p.kind === 'local';
        for (const el of remoteOnly) el.hidden = local;
        localBox.hidden = !local;
        base.placeholder = p.base || 'https://…/v1';
        model.placeholder = p.model || 'model-id';
        note.textContent = local ? '' : p.note || '';     // the in-browser model explains itself below
        keyBox.hidden = !!p.keyless;
        keyNone.hidden = !p.keyless || local;
        keyLink.hidden = !p.keyUrl;
        if (p.keyUrl) keyLink.href = p.keyUrl;
        fillModels(p.suggest || (p.model ? [p.model] : []));
    }
    provider.addEventListener('change', () => { base.value = ''; model.value = ''; paintProvider(); });
    paintProvider();

    const fetchBtn = h('button', { type: 'button', class: 'btn btn-small', onclick: async () => {
        say(t('mind.testing'));
        try {
            const list = await listModels(resolve(read()));
            if (list.length) { fillModels(list); say(`${list.length} ✓`); } else say('—');
        } catch (e) { say(e.message || String(e), true); }
    } }, t('mind.fetchModels'));
    const testBtn = h('button', { type: 'button', class: 'btn', onclick: async () => {
        testBtn.disabled = true; say(t('mind.testing'));
        try {
            const r = await testConnection(read());
            say(t('mind.testOk', { model: r.model, ms: r.ms, sample: r.sample }), !r.ok);
        } catch (e) { say(e.message || String(e), true); }
        finally { testBtn.disabled = false; }
    } }, t('mind.test'));
    const saveBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => {
        saveSettings(read(), ctx.storage, ctx.session);
        restartInto(ctx, '#/settings');
    } }, t('mind.save'));

    // What the running minds are doing now.
    const state = h('p', { class: 'mind-state' });
    const log = h('ul', { class: 'mind-log' });
    const mind = ctx.mind;
    function paintStatus() {
        const st = mind ? mind.status : { state: 'off', asked: 0, answered: 0, failed: 0, log: [] };
        clear(state).append(h('span', null, h('b', null, `${t('mind.status')}：`), t('mind.state.' + st.state),
            st.model && mind && (st.state === 'ready' || st.state === 'working' || st.state === 'loading') ? ` ・ ${st.model}` : '', st.error ? h('span', { class: 'mind-error' }, ` — ${st.error}`) : null,
            mind && (st.asked || st.state === 'ready') ? h('span', { class: 'mind-counts' }, ' ・ ' + t('mind.counts', st)) : null));
        clear(log);
        for (const e of st.log.slice(0, 8)) log.append(h('li', null, h('a', { href: href.agent(e.agent) }, e.name), `「${e.thought}」`, h('small', null, ` ${e.model} ・ ${e.ms}ms`)));
    }
    paintStatus();
    const off = mind ? mind.on(paintStatus) : null;

    // the in-browser model: what it is, and a button to wake it now
    const engine = ctx.mindEngine;
    const localText = h('p', { class: 'mind-local-state' });
    const startBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => { if (ctx.startMind) ctx.startMind(); } }, t('mind.start'));
    localBox.append(h('p', { class: 'ar-role' }, t('mind.localAbout')), localText, startBtn);
    const paintLocal = () => {
        const st = engine ? engine.state : null;
        const noGpu = !(globalThis.navigator && navigator.gpu) || (st && st.phase === 'unsupported');
        localText.textContent = noGpu ? t('mind.state.unsupported')
            : !st ? t('mind.localAfterSave')
            : st.phase === 'loading' || st.phase === 'checking' ? t('mind.loadingLocal', { pct: Math.round((st.progress || 0) * 100) })
            : st.phase === 'ready' ? `${t('mind.state.ready')} ・ ${st.model.replace(/-q4f(16|32)_1-MLC$/, '')}`
            : st.phase === 'error' ? `${t('mind.state.error')} — ${st.error}` : t('mind.launch', { mb: st.sizeMB });
        startBtn.hidden = noGpu || !st || (st.phase !== 'idle' && st.phase !== 'error');
        startBtn.textContent = st && st.phase === 'error' ? t('mind.retry') : t('mind.start');
    };
    paintLocal();
    const offLocal = engine ? engine.on(paintLocal) : null;

    const el = plaque({ class: 'settings-card mind-card' },
        h('p', null, t('mind.lead')),
        h('label', { class: 'mind-check mind-switch' }, on, h('span', null, t('mind.on'))),
        h('div', { class: 'mind-grid' },
            field(t('mind.provider'), provider), note, localBox,
            remote(field(t('mind.model'), model, models)), remote(h('p', null, fetchBtn)),
            remote(field(t('mind.base'), base)),
            keyBox, keyNone,
            field(t('mind.scope'), scope),
            remote(field(t('mind.perHour'), perHour))),
        remote(h('p', { class: 'ar-role' }, t('mind.privacy'))),
        h('p', { class: 'mind-actions' }, remote(testBtn), ' ', saveBtn), message,
        state, mind ? h('h3', null, t('mind.log')) : null, log);
    paintProvider();
    return { el, destroy: () => { if (off) off(); if (offLocal) offLocal(); } };
}

export function settingsView(ctx) {
    const current = getLang();
    const minds = mindSection(ctx);
    const langs = h('div', { class: 'lang-row', role: 'group', 'aria-label': t('settings.language') },
        LANGS.map(([code, label]) => h('button', {
            type: 'button', class: 'chip chip-btn', lang: code, 'aria-pressed': String(code === current),
            onclick: () => { if (code === getLang()) return; setLang(code); restartInto(ctx, '#/settings'); }
        }, label)));
    const el = h('div', { class: 'page page-narrow page-settings' },
        h('header', { class: 'page-head' }, h('h1', null, t('settings.title')), h('p', { class: 'lead' }, t('settings.lead'))),
        h('section', { class: 'sec', 'aria-labelledby': 'st-lang' }, sectionHead(t('settings.language'), '', 'st-lang'),
            plaque({ class: 'settings-card' }, langs, h('p', { class: 'ar-role' }, t('settings.languageNote')))),
        h('section', { class: 'sec', 'aria-labelledby': 'st-summon' }, sectionHead(t('settings.summon'), '', 'st-summon'),
            plaque({ class: 'settings-card' }, h('p', null, t('summon.lead')),
                h('p', null, h('a', { class: 'btn btn-primary', href: '#/summon' }, t('settings.open'))),
                h('h3', null, t('summon.residents')), residentsList(ctx))),
        h('section', { class: 'sec', id: 'mind', 'aria-labelledby': 'st-mind' }, sectionHead(t('mind.title'), '', 'st-mind'), minds.el));
    return { el, title: t('settings.title'), destroy: minds.destroy };
}

// The small language switch used on the first-visit card.
export function languagePicker(ctx) {
    const sel = h('select', { class: 'lang-select', 'aria-label': t('welcome.language'), onchange: e => { setLang(e.target.value); restartInto(ctx, location.hash || '#/'); } },
        LANGS.map(([code, label]) => h('option', { value: code, selected: code === getLang() }, label)));
    return h('label', { class: 'lang-pick' }, h('span', { 'aria-hidden': 'true' }, '🌐'), sel);
}
