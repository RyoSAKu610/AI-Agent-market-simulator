import { h, clear, nameOf, agentShort } from './util.js';
import { REQUEST_LABELS } from './character-stories.js';

export function characterPanel(ctx, a, feature) {
    const { W, eco, stories } = ctx, profile = stories.profile(a.id);
    const chapter = h('h3', { class: 'character-chapter' });
    const narrative = h('p', { class: 'character-arc' });
    const nextWish = h('p', { class: 'character-wish' });
    const mood = h('p', { class: 'character-mood' });
    const growth = h('p', { class: 'character-growth' });
    const changes = h('p', { class: 'character-change' });
    const requests = h('div', { class: 'promise-list', 'aria-live': 'polite' });
    const log = h('div', { class: 'character-chat', role: 'log', 'aria-label': `${agentShort(a)}との会話`, 'aria-live': 'polite', tabindex: '0' });
    const input = h('textarea', { id: 'character-input', rows: '2', maxlength: '240', placeholder: '今どこ？／あなたの望みは？／最近の思い出は？', required: true });
    let composing = false, chatKey = '', requestKey = '', recordKey = '', initialScroll = true;
    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => { composing = false; });
    const feedback = h('p', { class: 'character-feedback', role: 'status' });
    const saveStatus = h('p', { class: 'journey-save-status', role: 'status' });
    const send = text => { stories.talk(a.id, text); ctx.persistJourney(); update(); };
    const form = h('form', { class: 'character-talk-form', onsubmit: e => {
        e.preventDefault(); if (composing || !input.value.trim()) return;
        send(input.value); input.value = ''; feedback.textContent = '返事を会話欄に追加しました。'; input.focus();
    } }, h('label', { for: 'character-input' }, '言葉をかける'), input, h('button', { type: 'submit', class: 'btn btn-primary' }, '話しかける'));
    const choose = (type, options) => {
        const result = stories.request(a.id, type, options);
        feedback.textContent = result.ok ? 'お願いを受け取りました。時計が進むと、本人の仕事の合間に動きます。' : result.reason;
        ctx.persistJourney(); update();
    };
    const askButtons = h('div', { class: 'character-ask-buttons' },
        h('button', { type: 'button', class: 'btn', onclick: () => choose('observe') }, `${profile.task}をお願い`),
        h('button', { type: 'button', class: 'btn', onclick: () => choose('guide') }, '本拠へ案内をお願い'));
    let letter = null;
    if (profile.message && (a.relationships || []).length) {
        const recipient = h('select', { id: 'letter-recipient', 'aria-label': '伝言の宛先' }, (a.relationships || [])
            .filter(r => W.byId.agent.has(r.agent)).map(r => h('option', { value: r.agent }, `${agentShort(W.byId.agent.get(r.agent))} — ${r.type}`)));
        const body = h('textarea', { id: 'letter-body', rows: '2', maxlength: '120', required: true, placeholder: 'この世界の縁の相手に、120文字まで。' });
        let letterComposing = false;
        body.addEventListener('compositionstart', () => { letterComposing = true; });
        body.addEventListener('compositionend', () => { letterComposing = false; });
        letter = h('details', { class: 'character-letter' }, h('summary', null, '縁のある人へ封じた伝言をお願い'),
            h('form', { onsubmit: e => { e.preventDefault(); if (letterComposing) return; choose('message', { recipient: recipient.value, body: body.value }); } },
                h('label', { for: 'letter-recipient' }, '宛先'), recipient, h('label', { for: 'letter-body' }, '伝言'), body,
                h('p', { class: 'muted' }, '本人の本拠へ運び、帰宅した時に受け取ります。外部の人への送信はしません。'),
                h('button', { type: 'submit', class: 'btn' }, '封じて届けてもらう')));
    }
    const chronicle = h('ol', { class: 'character-chronicle' });
    const memories = h('ul', { class: 'character-memories' });
    const el = h('section', { class: 'character-panel', 'aria-labelledby': 'character-talk-heading', id: 'talk' },
        h('div', { class: 'character-scene' }, feature,
            h('div', { class: 'character-portrait-caption' }, h('p', { class: 'kicker' }, 'この端末で続く、住人との旅'), chapter, narrative, mood, nextWish, growth, changes,
                h('a', { href: '#/', class: 'btn', onclick: () => { ctx.pendingFocus = a.id; } }, 'この住人を地図で追う →'))),
        h('div', { class: 'character-dialogue' },
            h('h2', { id: 'character-talk-heading' }, `${agentShort(a)}に話しかける`),
            h('p', { class: 'character-method' }, '創作キャラクターの設定と現在のシミュレーションに基づく規則応答です。外部AIは使いません。'),
            log, h('div', { class: 'character-topics', 'aria-label': '会話の候補' }, ['こんにちは', '今どこ？', 'あなたの望みは？', '縁のある人は？', '最近の思い出は？'].map(text =>
                h('button', { type: 'button', class: 'chip', onclick: () => send(text) }, text))), form,
            h('h3', null, 'お願いする'), h('p', { class: 'muted' }, '本人が一件ずつ実行し、次の一件まで順番を待てます。現地記録は場所・刻と掲示された価格を確かめる仕事です。移動には本人の財布から運賃を使い、物資・お金の追加報酬はありません。'),
            askButtons, letter, feedback, requests, saveStatus,
            h('button', { type: 'button', class: 'btn btn-small', onclick: () => { ctx.persistJourney(); update(); } }, 'いまの旅を保存する')),
        h('div', { class: 'character-records' }, h('section', null, h('h3', null, '覚えていること'), memories),
            h('details', null, h('summary', null, '旅の記録を見る — 実際の移動・仕事・約束'), h('p', { class: 'muted' }, '直近40件の旅、8件の思い出、24件の会話を残します。古い記録は順に整理します。'), chronicle)));
    function update() {
        const p = stories.person(a.id), live = eco.agents.get(a.id);
        if (feature) feature.update();
        const arc = stories.arc(a.id);
        chapter.textContent = arc.chapter;
        narrative.textContent = arc.narrative;
        nextWish.textContent = `次の望み：${arc.next}`;
        mood.textContent = `${profile.gesture} ／ ${arc.feeling}`;
        growth.textContent = `果たした約束の信頼 ${p.trust} ・ 現地記録／細工の経験 ${p.practice}`;
        const last = p.chronicle.at(-1);
        changes.textContent = last ? `最近の変化：第${last.day}日 ${last.label} — ${last.text}` : '旅の始まり。これから起きたことを、この帳に残します。';
        saveStatus.textContent = ctx.journeyStatus;
        const ck = JSON.stringify(p.chat);
        if (ck !== chatKey) {
            const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 70;
            chatKey = ck; clear(log);
            if (!p.chat.length) log.append(h('p', { class: 'character-chat-empty' }, `${profile.gesture}\n最初の言葉をかけてみてください。会話だけでは信頼や経験は増えません。`));
            for (const m of p.chat) log.append(h('div', { class: `character-message message-${m.who}` },
                h('span', { class: 'character-message-label' }, `${m.who === 'visitor' ? 'あなた' : m.who === 'agent' ? agentShort(a) + (a.id === 'dogu' ? '（縄目語の意訳）' : a.id === 'chahakobi' ? '（盆の動きの意訳）' : '') : '記録'} · 第${m.day}日 ${m.label}`), h('p', null, m.text)));
            if (nearBottom) log.scrollTop = log.scrollHeight;
        }
        if (initialScroll && log.isConnected) { log.scrollTop = log.scrollHeight; initialScroll = false; }
        const rk = JSON.stringify(p.requests);
        if (rk !== requestKey) {
            requestKey = rk; clear(requests);
            for (const r of p.requests.slice(-3).reverse()) requests.append(h('div', { class: `promise promise-${r.status}`, dataset: { request: r.id, status: r.status } },
                h('strong', null, `${r.status === 'done' ? '結んだ思い出' : r.status === 'active' ? '実行中' : '順番待ち'} — ${r.title || REQUEST_LABELS[r.type]}`),
                h('p', null, r.result || `${nameOf(W.byId.district.get(r.target))}へ。いまは「${live.activity}」。途中の旅も時計も保存されます。`)));
        } else {
            for (const node of requests.querySelectorAll('.promise:not(.promise-done) p')) {
                const r = p.requests.find(r => r.id === node.parentElement.dataset.request);
                node.textContent = `${nameOf(W.byId.district.get(r.target))}へ。いまは「${live.activity}」。途中の旅も時計も保存されます。`;
            }
        }
        const recKey = JSON.stringify([p.chronicle, p.memories]);
        if (recKey !== recordKey) {
            recordKey = recKey; clear(chronicle); clear(memories);
            for (const m of p.chronicle.slice().reverse()) chronicle.append(h('li', null, h('small', null, `第${m.day}日 ${m.label}`), h('p', null, m.text)));
            for (const m of p.memories.slice().reverse()) memories.append(h('li', null, `第${m.day}日 ${m.label} — ${m.text}`));
            if (!p.memories.length) memories.append(h('li', null, '初めて辿り着いた場所、果たした約束、大きな目標の変化をここに残します。'));
        }
    }
    update(); return { el, update };
}
