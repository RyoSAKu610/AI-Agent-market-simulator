// 📜 The birth certificate panel on a visiting AI's page (js/birth.js).

import { h, clear } from './util.js';
import { plaque, sectionHead } from './components.js';
import { t } from './i18n.js';
import { makeBirth, saveBirth, loadBirths, verifyBirth, birthMemo, checkBirthTx, certificateFile } from './birth.js';

const explorer = sig => `https://explorer.solana.com/tx/${encodeURIComponent(sig)}?cluster=devnet`;

export function birthPanel(ctx, card) {
    const storage = ctx.storage;
    let birth = loadBirths(storage)[card.id] || null;
    let intact = true, busy = false;

    const facts = h('dl', { class: 'facts facts-compact birth-facts' });
    const state = h('p', { class: 'birth-state' });
    const message = h('p', { class: 'soul-message', role: 'status' });
    const inscribeBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => inscribe() }, t('birth.inscribe'));
    const verifyBtn = h('button', { type: 'button', class: 'btn', onclick: () => verify() }, t('birth.verify'));
    const saveBtn = h('button', { type: 'button', class: 'btn', onclick: () => save() }, t('birth.save'));
    const say = (text, bad) => { message.textContent = text; message.className = 'soul-message' + (bad ? ' is-error' : ''); };

    function paint() {
        clear(facts);
        if (!birth) return;
        facts.append(
            h('dt', null, t('birth.sealed')), h('dd', null, String(birth.at).slice(0, 10)),
            h('dt', null, t('birth.digest')), h('dd', null, h('code', { class: 'birth-digest', title: birth.digest }, birth.digest)));
        clear(state);
        if (birth.chain) {
            state.append(t('birth.onchain', { slot: birth.chain.slot ?? '—' }), ' ',
                h('a', { href: explorer(birth.chain.sig), target: '_blank', rel: 'noopener noreferrer' }, t('birth.explorer')));
            if (birth.chain.verified) state.append(h('br'), t('birth.verified'));
        } else state.append(t('birth.local'));
        if (!intact) state.append(h('br'), h('span', { class: 'mind-error' }, t('birth.changed')));
        inscribeBtn.hidden = !!birth.chain;
        verifyBtn.hidden = !birth.chain;
        for (const b of [inscribeBtn, verifyBtn, saveBtn]) b.disabled = busy;
    }

    async function chainReady() {
        if (!ctx.loadChain) throw new Error('chain unavailable');
        const chain = await ctx.loadChain();
        if (chain.state === 'off' || chain.state === 'error') await chain.enable();
        if (chain.state === 'error') throw new Error(chain.error || 'devnet');
        return chain;
    }

    async function inscribe() {
        if (busy || !birth || birth.chain) return;
        busy = true; paint(); say(t('birth.connecting'));
        try {
            const chain = await chainReady();
            const memo = birthMemo(birth);
            say(t('birth.sending'));
            let r = await chain.inscribe('birth', memo);
            if (!r.ok && r.reason === 'funds') {
                say(t('birth.airdrop'));
                const a = await chain.requestAirdrop();
                if (!a.ok) { say(t('birth.airdropFail'), true); return; }
                say(t('birth.sending'));
                r = await chain.inscribe('birth', memo);
            }
            if (!r.ok) { say(t('birth.fail', { reason: String(r.reason).slice(0, 120) }), true); return; }
            birth = { ...birth, chain: { sig: r.sig, slot: r.slot, cluster: 'devnet', verified: false, at: new Date().toISOString() } };
            saveBirth(storage, birth);
            busy = false;
            await verify();
        } catch (e) {
            say(t('birth.fail', { reason: String(e && e.message || e).slice(0, 120) }), true);
        } finally { busy = false; paint(); }
    }

    // Read the transaction back from the RPC and compare its memo with this certificate.
    async function verify() {
        if (busy || !birth || !birth.chain) return;
        busy = true; paint(); say(t('birth.checking'));
        try {
            const chain = await chainReady();
            let verdict = { ok: false, reason: 'notfound' };
            for (let i = 0; i < 6; i++) {
                verdict = checkBirthTx(await chain.parsedTx(birth.chain.sig), birth);
                if (verdict.ok || verdict.reason !== 'notfound') break;
                await new Promise(r => setTimeout(r, 800));
            }
            birth = { ...birth, chain: { ...birth.chain, verified: verdict.ok } };
            saveBirth(storage, birth);
            say(verdict.ok ? t('birth.ok') : t('birth.ng', { reason: verdict.reason }), !verdict.ok);
        } catch (e) {
            say(t('birth.ng', { reason: String(e && e.message || e).slice(0, 120) }), true);
        } finally { busy = false; paint(); }
    }

    function save() {
        if (!birth) return;
        const blob = new Blob([certificateFile(card, birth)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = h('a', { href: url, download: `zipangu-birth-${card.id}.json` });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    // Seal now if this AI arrived before certificates existed; check the card still matches.
    (async () => {
        try {
            if (!birth) { birth = await makeBirth(card); saveBirth(storage, birth); }
            else intact = await verifyBirth(card, birth);
        } catch { /* no WebCrypto (very old browser or file://): the panel stays empty */ }
        paint();
    })();

    const el = h('section', { class: 'sec birth-sec', 'aria-labelledby': 'ag-birth' },
        sectionHead(t('birth.title'), null, 'ag-birth'),
        plaque({ class: 'birth-card' },
            h('p', null, t('birth.lead')), facts, state,
            h('p', { class: 'mind-actions' }, inscribeBtn, verifyBtn, saveBtn), message,
            h('p', { class: 'ar-role' }, t('birth.privacy'))));
    paint();
    return { el };
}
