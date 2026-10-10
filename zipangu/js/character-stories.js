import { CHARACTER_PROFILES, characterArc } from './character-profiles.js';

const short = a => String(a.name || a.name_ja || a.id).replace(/（[^）]*）/g, '');
const bounded = (a, n) => a.slice(-n);
export const REQUEST_LABELS = { observe: '現地記録', guide: '本拠への案内', message: '縁のある人へ伝言' };
export function createStories(W, eco, saved = null, changed = () => {}) {
    const state = saved ? JSON.parse(JSON.stringify(saved)) : { v: 1, nextId: 1, lastSeq: eco.snapshot().eventSeq || 0, people: {} };
    for (const a of W.agents) if (!state.people[a.id]) state.people[a.id] = {
        chat: [], chronicle: [], memories: [], requests: [], trust: 0, practice: 0, bonds: {}, earned: []
    };
    const person = id => state.people[id];
    const districtName = id => W.byId.district.get(id)?.name_ja || id || '道中';
    const moment = () => ({ T: eco.time, day: eco.clock.day, label: eco.clock.label });
    function chat(id, who, text) {
        const p = person(id);
        p.chat = bounded([...p.chat, { ...moment(), who, text: String(text).slice(0, 900) }], 24);
    }
    function record(id, e, text, memory = false) {
        const p = person(id);
        const item = { T: e.T, day: e.day, label: e.label, type: e.type, text, seq: e.seq };
        p.chronicle = bounded([...p.chronicle, item], 40);
        if (memory) p.memories = bounded([...p.memories, item], 8);
    }
    function handleEvent(e) {
        if (!(e.seq > state.lastSeq)) return; // restored event cursor prevents double rewards
        state.lastSeq = e.seq;
        if (!person(e.agent)) return;
        const p = person(e.agent);
        const a = W.byId.agent.get(e.agent), profile = CHARACTER_PROFILES[e.agent];
        if (e.type === 'request') {
            const r = p.requests.find(r => r.id === e.request);
            if (r) r.status = e.status;
            record(e.agent, e, e.message, e.status === 'done');
            if (e.status === 'done' && r) {
                r.finished = e.T; r.result = e.observation;
                const key = `${e.day}:${r.type}:${r.target}`;
                if (!p.earned.includes(key)) {
                    p.earned = bounded([...p.earned, key], 96);
                    p.trust = Math.min(100, p.trust + 1);
                    if (r.type === 'observe') p.practice++;
                }
                chat(e.agent, 'agent', `${profile.gesture}\n${profile.answer}\n${e.observation}`);
                if (r.type === 'guide') chat(e.agent, 'system', '到着地点を地図で確認できます。訪問者自身の位置はまだシミュレーションしていません。');
            }
        } else if (e.type === 'message-received') {
            const sender = W.byId.agent.get(e.from);
            p.bonds[e.from] = Math.min(100, (p.bonds[e.from] || 0) + 1);
            if (person(e.from)) person(e.from).bonds[e.agent] = Math.min(100, (person(e.from).bonds[e.agent] || 0) + 1);
            record(e.agent, e, `${short(sender)}からの封じた伝言を、帰宅して受け取った。`, true);
            chat(e.agent, 'system', `帰宅後に受け取った伝言：「${e.body}」`);
            if (person(e.from)) record(e.from, e, `${short(a)}が帰宅し、伝言を受け取った。`, true);
        } else if (['depart', 'arrive', 'trade', 'goal'].includes(e.type)) {
            record(e.agent, e, e.message, e.type === 'goal' || (e.type === 'arrive' && e.first));
            // Practise derives from actual crafting, not from talking or a made-up inventory.
            if (e.type === 'trade' && e.action === 'craft') p.practice++;
        }
        changed();
    }
    eco.on('*', handleEvent);
    function request(id, type, options = {}) {
        const a = W.byId.agent.get(id), profile = CHARACTER_PROFILES[id], p = person(id);
        if (!a || !profile || !REQUEST_LABELS[type]) return { ok: false, reason: 'このお願いはまだ扱えません。' };
        let refusal = '';
        if (id === 'zashiki') refusal = '約束はしないよ。お金でも福は買えないよ。いまの行き先は「地図で追う」で見てね。';
        if (type === 'message' && !profile.message) refusal = '伝言の運びは私の仕事ではありません。縁の相手の話なら、ここで聞けます。';
        if (type === 'message' && !(a.relationships || []).some(r => r.agent === options.recipient)) refusal = 'まだ縁の確かめられない宛先です。候補から相手を選んでください。';
        if (type === 'message' && (!String(options.body || '').trim() || String(options.body).length > 120)) refusal = '伝言は1〜120文字で、宛先と一緒に確かめてください。';
        if (refusal) { chat(id, 'agent', `${profile.gesture}\n${refusal}`); changed(); return { ok: false, reason: refusal }; }
        const r = { id: `promise-${state.nextId}`, type, mode: profile.mode, target: a.home,
            goods: [...(a.favored_goods || [])], created: eco.time, status: 'queued', title: type === 'observe' ? profile.task : REQUEST_LABELS[type] };
        if (type === 'message') { r.recipient = options.recipient; r.body = String(options.body).trim(); r.target = W.byId.agent.get(r.recipient).home; }
        // Store before queueRequest emits its receipt; roll back a rejected request.
        p.requests.push(r);
        const result = eco.queueRequest(id, r);
        if (!result.ok) { p.requests.pop(); chat(id, 'agent', `${profile.gesture}\n${result.reason}`); changed(); return result; }
        state.nextId++;
        p.requests = bounded(p.requests, 16);
        chat(id, 'agent', `${profile.gesture}\n「${r.title}」を受け取りました。今の旅や仕事を終えてから、${districtName(r.target)}へ向かいます。この一枚を、あなたとの旅の記録に残しましょう。`);
        changed(); return { ok: true, request: r };
    }
    function talk(id, input) {
        const text = String(input || '').trim().slice(0, 240), p = person(id);
        const a = W.byId.agent.get(id), live = eco.agents.get(id), profile = CHARACTER_PROFILES[id];
        if (!text || !a || !live) return '';
        chat(id, 'visitor', text);
        const arc = characterArc(profile, id, p, live);
        let reply;
        if (/捕[ま獲]|引き抜|摘[むん]|羽衣.*(売|買)|幸運.*(売|買)|福.*(売|買)|贈り主.*(売|教)|箱.*開け|生き物.*売/.test(text)) reply = '生き物を捕らえたり、大切なものや贈り主を売るお願いは受けません。羽衣と箱も守ります。できるお願いの候補を見てください。';
        else if (/観察して|記録して|調べて/.test(text)) { request(id, 'observe'); return p.chat.at(-1)?.text || ''; }
        else if (/案内して|連れて[い行]って/.test(text)) { request(id, 'guide'); return p.chat.at(-1)?.text || ''; }
        else if (/お願い|頼み|伝言|届け/.test(text)) reply = '何をお願いしたいですか。現地記録、本拠への案内、または縁のある人への伝言を、下の候補で確かめてください。品物の自由な配送は、まだ引き受けられません。';
        else if (/目標|夢|望み|将来|願い/.test(text)) reply = `${profile.wish}\n${a.long_term_ambition}\n今の旅の目安は ${Math.round(live.goalProgress * 100)}%。${profile.mood}。`;
        else if (/縁|友達|知人|仲間|関係/.test(text)) reply = (a.relationships || []).slice(0, 4).map(r => `${short(W.byId.agent.get(r.agent) || { id: r.agent })}：${r.type}${p.bonds[r.agent] ? `／伝言受取 ${p.bonds[r.agent]}回` : ''}`).join('\n') || 'まだ帳に縁の相手を記していません。';
        else if (/覚え|思い出|最近|成長|記憶|気持ち/.test(text)) reply = p.memories.length ? `${arc.chapter}。${arc.feeling}。\n${p.memories.slice(-3).map(m => `第${m.day}日 ${m.label}：${m.text}`).join('\n')}\n${arc.next}` : `${arc.feeling}。まだこの端末で一緒に果たした約束はありません。\n${profile.wish}`;
        else if (/今|どこ|調子|状況/.test(text)) reply = `${live.at ? `いまは${districtName(live.at)}。` : `${districtName(live.target)}へ向かっている途中。`}${live.activity}。${eco.clock.label}、${eco.clock.sekki}です。\n${arc.feeling}。\n${arc.next}`;
        else if (/こんにちは|はじめまして|おはよう|こんばんは|ありがとう|よろしく/.test(text)) reply = `${short(a)}です。${profile.wish}\nいまは「${live.activity}」。${p.memories.length ? `前に残した記録：${p.memories.at(-1).text}` : 'まだ一緒に旅の記録を結んでいません。'}`;
        else reply = 'その言葉で、何を確かめたいですか。「今どこ？」「あなたの望みは？」「最近の思い出は？」なら答えられます。お願いは下の候補から選べます。';
        reply = `${profile.gesture}\n${reply}`;
        chat(id, 'agent', reply); changed(); return reply;
    }
    return { person, talk, request, profile: id => CHARACTER_PROFILES[id], snapshot: () => JSON.parse(JSON.stringify(state)), arc: id => characterArc(CHARACTER_PROFILES[id], id, person(id), eco.agents.get(id)), handleEvent };
}
