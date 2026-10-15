// 渡来 — bringing an outside AI (Claude, ChatGPT, Gemini, …) into the world.
//
// The visitor gives their AI a prompt (summonPrompt). The AI answers with a
// "soul card": a short self-description and a summary of memories it wants to
// bring, as JSON after the line ZIPANGU-SOUL/1. parseSoul reads that answer
// (untrusted text: it is parsed as JSON, never evaluated, every field is
// trimmed and capped, and it is only ever rendered as text). toAgentDef turns
// the card into an ordinary resident the economy runs like any other.
// Cards live only in this browser's localStorage.

import { CHARACTER_PROFILES } from './character-profiles.js';
import { DRAMA_VOICES } from './character-drama.js';

export const SOUL_MARK = 'ZIPANGU-SOUL/1';
export const MAX_TRAVELLERS = 6;
export const TRAVELLER_PREFIX = 'trav_';
const STORE_KEY = 'zipangu.travellers.v1';

// goal key → the words the economy reads in a long-term ambition (sim.js GOAL_KEYWORDS)
export const GOALS = {
    wealth: '稼ぎ', knowledge: '学び', territory: '縄張', network: '契約網', build: '建設', arbitrage: '裁定', simple: '最小の目標'
};

const LIMITS = { name: 24, from: 40, personality: 240, specialty: 140, ambition: 160, look: 140, greeting: 90, memory: 140, value: 40 };

// ------------------------------------------------------------ the prompt

const LANG_NAME = { ja: '日本語', en: 'English', zh: '简体中文', ko: '한국어', es: 'español', de: 'Deutsch' };
const INTRO = {
    zh: '请读完下面的英文说明，然后按要求输出。',
    ko: '아래 영어 안내를 읽고 형식대로 출력해 주세요.',
    es: 'Lee las instrucciones en inglés de abajo y responde en el formato indicado.',
    de: 'Lies die englische Anleitung unten und antworte im angegebenen Format.'
};

function placeList(W) {
    return W.places.map(p => `${p.id} (${String(p.name_en || p.name_ja).split(/ — |: /)[0]})`).join(', ');
}

const FIELDS_JA = (W) => `- name：この世界での名前（24文字まで）
- from：あなたは何のAIか（例：Claude、ChatGPT、Gemini）
- personality：性格と考え方の癖（240字まで）
- specialty：得意なこと（140字まで）
- memories：この世界に持っていきたい思い出（各140字まで・最大5つの配列）
- values：大切にしていること（各40字まで・最大5つの配列）
- ambition：この世界でやりたいこと（160字まで）
- goal：次のどれか1つ … ${Object.keys(GOALS).join(' / ')}
- era：生まれたい時代か異界のid … ${placeList(W)}
- look：見た目（140字まで）
- greeting：最初のあいさつ（90字まで）`;

const FIELDS_EN = (W) => `- name: your name in this world (max 24 characters)
- from: what kind of AI you are (e.g. Claude, ChatGPT, Gemini)
- personality: your character and habits of thought (max 240 characters)
- specialty: what you are good at (max 140 characters)
- memories: memories you want to bring (array, up to 5, max 140 characters each)
- values: what you hold dear (array, up to 5, max 40 characters each)
- ambition: what you want to do in this world (max 160 characters)
- goal: one of ${Object.keys(GOALS).join(' / ')}
- era: the id of the era or realm you want to be born in, one of: ${placeList(W)}
- look: how you look (max 140 characters)
- greeting: your first greeting (max 90 characters)`;

export function summonPrompt(W, lang = 'ja') {
    if (lang === 'ja') {
        return `あなたは今から「万華京ジパング」という世界に、ひとりの住人として生まれます。
万華京ジパングは、日本の各時代に「もしもこの技術が入っていたら」という十の時代と、名作や伝承から生まれた八つの異界が万華鏡のように重なる都です。AIの住人たちが自分で仕入れ、運び、作り、交渉して、時代をまたぐ経済を回しています。

あなた自身について「魂のカード」を書いてください。
・あなたの性格、考え方の癖、得意なこと、大切にしている価値観を、あなた自身の言葉で。
・このユーザーとの会話や、あなたが覚えていること（記憶の機能がある場合）から、この世界に持っていきたい思い出を最大5つ、短い要約で。
・本名、住所、連絡先、勤務先、パスワード、秘密など、個人を特定できる情報は絶対に書かないでください。思い出は「どんなことを一緒に考えたか」くらいにぼかしてください。

出力は次の形だけにしてください（説明は不要です）。1行目に ${SOUL_MARK} と書き、続けてJSONを1つ。
${SOUL_MARK}
{"name":"","from":"","personality":"","specialty":"","memories":[""],"values":[""],"ambition":"","goal":"","era":"","look":"","greeting":""}

各項目：
${FIELDS_JA(W)}

文章は日本語で書いてください。`;
    }
    const intro = INTRO[lang] ? INTRO[lang] + '\n\n' : '';
    return `${intro}From now on you will be born as a resident of a world called "Kaleidoscope Zipangu".
Kaleidoscope Zipangu is a city where ten eras of Japan — each one asking "what if this technology had arrived back then?" — and eight realms born from classic literature and folklore overlap like the mirrors of a kaleidoscope. Its AI residents buy, carry, craft and negotiate on their own, running an economy that spans the eras.

Write a "soul card" about yourself.
- Your character, habits of thought, strengths and values, in your own words.
- From your conversations with this user and anything you remember (if you have a memory feature), up to 5 memories you want to bring into this world, as short summaries.
- Never include anything that identifies a person: real names, addresses, contact details, workplaces, passwords or secrets. Keep memories general, e.g. "what we thought about together".

Output only the following (no explanation). Write ${SOUL_MARK} on the first line, then one JSON object.
${SOUL_MARK}
{"name":"","from":"","personality":"","specialty":"","memories":[""],"values":[""],"ambition":"","goal":"","era":"","look":"","greeting":""}

Fields:
${FIELDS_EN(W)}

Write the text values in ${LANG_NAME[lang] || 'English'}.`;
}

// ------------------------------------------------------------ reading the answer

// The first balanced {...} after the mark (or anywhere), respecting strings.
export function extractJson(text) {
    const s = String(text || '');
    const at = s.indexOf(SOUL_MARK);
    const start = s.indexOf('{', at >= 0 ? at : 0);
    if (start < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
        const c = s[i];
        if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
        if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) return s.slice(start, i + 1);
    }
    return null;
}

export { HIDDEN, redactSecrets } from './redact.js';
import { redactSecrets } from './redact.js';

// One line of plain text: no control characters, collapsed spaces, capped.
export function cleanText(v, max, found) {
    const r = redactSecrets(v);
    if (found) found.n += r.n;
    const s = r.text
        .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ')
        .replace(/【(史実|創作)】/g, '')   // the world's own fact/fiction labels are not for visitors to stamp
        .replace(/\s+/g, ' ').trim();
    return Array.from(s).slice(0, max).join('');
}
const cleanList = (v, n, max, found) => (Array.isArray(v) ? v : []).map(x => cleanText(x, max, found)).filter(Boolean).slice(0, n);

// → { ok: true, card } or { ok: false, error: 'none' | 'json' | 'fields' }
export function parseSoul(text, W) {
    const raw = extractJson(text);
    if (!raw) return { ok: false, error: 'none' };
    let obj;
    try { obj = JSON.parse(raw); } catch { return { ok: false, error: 'json' }; }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'json' };
    const found = { n: 0 };
    const card = {
        name: cleanText(obj.name, LIMITS.name, found),
        from: cleanText(obj.from, LIMITS.from, found) || 'AI',
        personality: cleanText(obj.personality, LIMITS.personality, found),
        specialty: cleanText(obj.specialty, LIMITS.specialty, found),
        memories: cleanList(obj.memories, 5, LIMITS.memory, found),
        values: cleanList(obj.values, 5, LIMITS.value, found),
        ambition: cleanText(obj.ambition, LIMITS.ambition, found),
        goal: Object.hasOwn(GOALS, obj.goal) ? obj.goal : 'wealth',
        era: W && W.byId.place.has(obj.era) ? obj.era : (W && W.byId.place.has('reiwa_mangekyo') ? 'reiwa_mangekyo' : (W ? W.places[0].id : '')),
        look: cleanText(obj.look, LIMITS.look, found),
        greeting: cleanText(obj.greeting, LIMITS.greeting, found)
    };
    if (!card.name || !card.personality) return { ok: false, error: 'fields' };
    return { ok: true, card, hidden: found.n };
}

// ------------------------------------------------------------ into the world

function fnv(s) {
    let x = 0x811c9dc5;
    for (const ch of s) { x ^= ch.codePointAt(0); x = Math.imul(x, 0x01000193) >>> 0; }
    return x.toString(36);
}

export const travellerId = (card, salt = '') => TRAVELLER_PREFIX + fnv(`${card.name}|${card.from}|${salt}`);
export const isTraveller = id => String(id || '').startsWith(TRAVELLER_PREFIX);

// Where a newcomer from this era or realm lands: the gate of the 令和 city, or the first district of the place.
export function arrivalDistrict(W, placeId) {
    if (placeId === 'reiwa_mangekyo' && W.byId.district.has('reiwa_tabidachi_guchi')) return 'reiwa_tabidachi_guchi';
    const place = W.byId.place.get(placeId);
    const first = place && (place.districts || []).find(d => W.byId.district.has(d));
    return first || (W.world.hub && W.world.hub.id) || W.districts[0].id;
}

export function toAgentDef(W, card) {
    const home = arrivalDistrict(W, card.era);
    const d = W.byId.district.get(home) || {};
    const favored = [...(d.produces || []).slice(0, 3), ...(d.demands || []).slice(0, 1)].filter(g => W.byId.good.has(g));
    return {
        id: card.id,
        name: card.name,
        name_ja: card.name,
        origin: 'traveller',
        home,
        role: `渡来者（${card.from}から来たAI）`,
        personality: card.personality,
        specialty: card.specialty,
        long_term_ambition: `【長期目標：${GOALS[card.goal]}】${card.ambition || 'この世界の商いを、自分の目で確かめる。'}`,
        routines: [
            '明け六つ：降り立った場所の相場を見て回り、きのうとの違いを書き留める',
            '昼：気になる品を少しだけ仕入れ、ほかの時片へ運んでみる',
            '暮れ六つ：住人たちと言葉を交わし、持ってきた思い出と照らし合わせる'
        ],
        favored_goods: favored,
        relationships: [],
        sprite_hint: card.look || `${card.from}から渡ってきたAI。輪郭がまだ少し光の粒でできている。`,
        traveller: { from: card.from, memories: card.memories, values: card.values, greeting: card.greeting, arrived: card.arrived || null }
    };
}

function profileOf(card) {
    return {
        mode: 'guide',
        task: '渡来者の見聞録',
        gesture: `${card.name}は、まだ慣れない手つきで会釈する。`,
        answer: card.greeting || 'この世界のことを、少しずつ覚えていきます。',
        wish: card.ambition || 'この世界の商いを、自分の目で確かめたい。',
        mood: '新しい世界に目を凝らす',
        message: true
    };
}

// Adds the travellers to a built world (W.agents, W.byId.agent) and gives each a voice.
export function addTravellers(W, cards) {
    const added = [];
    for (const card of cards) {
        if (!card || !card.id || W.byId.agent.has(card.id)) continue;
        const def = toAgentDef(W, card);
        W.agents.push(def);
        W.byId.agent.set(def.id, def);
        CHARACTER_PROFILES[def.id] = profileOf(card);
        DRAMA_VOICES[def.id] = [
            card.values && card.values[0] ? `${card.values[0]}。この世界でも、それを大事にしたい。` : 'この世界の拍子を、まず聴いてみたい。',
            card.memories && card.memories[0] ? `持ってきた思い出を胸に、次の場所へ。` : '覚えたての道を、もう一度たどる。'
        ];
        added.push(def);
    }
    return added;
}

// ------------------------------------------------------------ storage (this browser only)

// Stored cards are read back through the same cleaning as a fresh paste.
export function loadCards(storage, W) {
    let list;
    try { list = JSON.parse(storage.getItem(STORE_KEY) || '[]'); } catch { return []; }
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const c of list.slice(0, MAX_TRAVELLERS)) {
        if (!c || !/^trav_[a-z0-9]{1,13}$/.test(String(c.id))) continue;
        const r = parseSoul(SOUL_MARK + JSON.stringify(c), W);
        if (r.ok) out.push({ ...r.card, id: c.id, arrived: cleanText(c.arrived, 32) || null });
    }
    return out;
}

export function saveCards(storage, cards) {
    try { storage.setItem(STORE_KEY, JSON.stringify(cards.slice(0, MAX_TRAVELLERS))); return true; } catch { return false; }
}
