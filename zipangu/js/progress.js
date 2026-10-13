// 📖 The traveller's journal: what grows the longer you play.
//
// Everything here is about the visitor, not the world: how long they have watched,
// what they have found, which hidden residents they have met. It lives in its own
// key (zipangu.progress.v1) so a new journey, a new seed or a new language keeps it.
//
//   縁 (en)      points earned by watching, discovering and meeting; they set the rank
//   rank         見習いの旅人 → … → ジパングの守り人; each rank opens something new
//   badges       the 発見帖: things seen, read, witnessed, met
//   fortune      a daily おみくじ; luck and a lucky place shape the day's encounters
//   hidden       residents of world/hidden.json who appear, at random, once their
//                time, place, season and the visitor's rank and deeds allow; met
//                ones join the city and stay

import { CHARACTER_PROFILES } from './character-profiles.js';
import { DRAMA_VOICES } from './character-drama.js';

const STORE_KEY = 'zipangu.progress.v1';
const KINDS = ['creature', 'work', 'place', 'district', 'agent', 'visual'];

export const RANKS = [
    { at: 0, name: '見習いの旅人', en: 'Apprentice traveller', unlock: '地図・図鑑・書庫・住人' },
    { at: 40, name: '渡り鳥', en: 'Migrant bird', unlock: '🎴 毎日のおみくじ／刻の境目と夏の幻の住人' },
    { at: 150, name: '時片歩き', en: 'Shard walker', unlock: '夜の時環線・遠野・平泉の幻の住人' },
    { at: 400, name: '万華鏡の目', en: 'Kaleidoscope eye', unlock: '幻の住人の「気配」が記録帖に出る／名もなき行商人' },
    { at: 900, name: '時層の語り部', en: 'Teller of the layers', unlock: 'おみくじを一日に二度引ける' },
    { at: 2000, name: 'ジパングの守り人', en: 'Keeper of Zipangu', unlock: '記録帖の金の縁取り' }
];

// luck: weight (in 100), multiplier on encounter chances
export const LUCK = [
    { name: '大吉', weight: 8, mult: 2, line: '今日は幻の住人に出会いやすい日。' },
    { name: '吉', weight: 22, mult: 1.5, line: '寄り道がよい縁を連れてくる。' },
    { name: '中吉', weight: 22, mult: 1.3, line: '吉方位の時片をのぞいてみて。' },
    { name: '小吉', weight: 20, mult: 1.15, line: '小さな取引に、小さな縁あり。' },
    { name: '末吉', weight: 18, mult: 1, line: '今日は見届けるほど、あとで実る。' },
    { name: '凶', weight: 10, mult: 0.8, line: '凶の日は夜に裏運。夜の幻は少し出やすい。', nightMult: 1.6 }
];

// ------------------------------------------------------------ state

export function freshProgress(now = () => new Date().toISOString()) {
    return {
        v: 1, started: now(), seconds: 0, days: 0, lastDay: null,
        seen: Object.fromEntries(KINDS.map(k => [k, []])),
        count: { trades: 0, thoughts: 0, events: 0, goals: 0, fortunes: 0, daikichi: 0 },
        badges: {}, found: {}, fortune: null, misses: 0
    };
}

const ID = /^[a-z][a-z0-9_]{0,63}$/;
const num = (v, max = 1e12) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(max, Math.floor(Number(v)))) : 0);

// Anything read back from storage (or a backup file) is checked field by field.
export function cleanProgress(raw) {
    const p = freshProgress();
    if (!raw || typeof raw !== 'object' || raw.v !== 1) return p;
    p.started = String(raw.started || p.started).slice(0, 32);
    p.seconds = num(raw.seconds);
    p.days = num(raw.days);
    p.lastDay = Number.isInteger(raw.lastDay) ? raw.lastDay : null;
    for (const k of KINDS) p.seen[k] = [...new Set((Array.isArray(raw.seen && raw.seen[k]) ? raw.seen[k] : []).map(String).filter(x => ID.test(x)))].slice(0, 2000);
    for (const k of Object.keys(p.count)) p.count[k] = num(raw.count && raw.count[k]);
    for (const field of ['badges', 'found']) {
        for (const [k, v] of Object.entries(raw[field] && typeof raw[field] === 'object' ? raw[field] : {})) if (ID.test(k)) p[field][k] = String(v).slice(0, 32);
    }
    const f = raw.fortune;
    if (f && /^\d{4}-\d{2}-\d{2}$/.test(f.date) && LUCK.some(l => l.name === f.luck) && ID.test(String(f.place || ''))) {
        p.fortune = { date: f.date, luck: f.luck, place: String(f.place), good: ID.test(String(f.good || '')) ? String(f.good) : null, draws: Math.min(2, num(f.draws)) || 1 };
    }
    p.misses = num(raw.misses, 1000);
    return p;
}

export function loadProgress(storage) {
    try { return cleanProgress(JSON.parse(storage.getItem(STORE_KEY) || 'null')); } catch { return freshProgress(); }
}
export function saveProgress(storage, p) {
    try { storage.setItem(STORE_KEY, JSON.stringify(p)); return true; } catch { return false; }
}

// ------------------------------------------------------------ 縁 and rank

export function pointsOf(p) {
    const seen = KINDS.reduce((n, k) => n + p.seen[k].length, 0);
    return Math.floor(p.seconds / 60) + seen * 2 + Object.keys(p.badges).length * 10
        + Object.keys(p.found).length * 30 + Math.floor(p.count.trades / 50) + p.days * 2 + p.count.thoughts;
}
export function rankOf(points) {
    let r = 0;
    RANKS.forEach((x, i) => { if (points >= x.at) r = i; });
    const next = RANKS[r + 1] || null;
    return { index: r, ...RANKS[r], points, next, toNext: next ? next.at - points : 0, frac: next ? (points - RANKS[r].at) / (next.at - RANKS[r].at) : 1 };
}

// ------------------------------------------------------------ the 発見帖

// extras: { cards: n travellers brought in, onChain: n births inscribed }
export function badgeList(W, p, extras = {}) {
    const n = k => p.seen[k].length;
    const places = W.eras.length + W.realms.length, hidden = (W.hidden || []).length;
    const B = (id, group, title, have, need) => ({ id, group, title, have: Math.min(have, need), need, done: have >= need });
    return [
        B('day_one', '見る', '一日を見届ける', p.days, 1),
        B('week', '見る', '七日を見届ける', p.days, 7),
        B('seasons', '見る', '四季をひとめぐり（二十四節気）', p.days, 24),
        B('long_watch', '見る', '合わせて三時間ながめる', Math.floor(p.seconds / 60), 180),
        B('creatures_10', '知る', '図鑑で十の生き物に会う', n('creature'), 10),
        B('creatures_all', '知る', '図鑑のすべての生き物に会う', n('creature'), W.creatures.length),
        B('works_5', '知る', '書庫で五つの作品を読む', n('work'), 5),
        B('works_all', '知る', '書庫のすべての作品を読む', n('work'), W.library.length),
        B('places_all', '知る', '十の時代と八つの異界をすべて訪ねる', n('place'), places),
        B('districts_30', '知る', '三十の町を歩く', n('district'), 30),
        B('agents_all', '知る', 'すべての住人のページを開く', n('agent'), W.agents.filter(a => !a.traveller && !a.hiddenResident).length),
        B('visuals_10', '知る', '制作帖で十枚の絵を鑑賞する', n('visual'), 10),
        B('trades_100', '縁', '取引を百見届ける', p.count.trades, 100),
        B('trades_1000', '縁', '取引を千見届ける', p.count.trades, 1000),
        B('trades_10000', '縁', '取引を一万見届ける', p.count.trades, 10000),
        B('events_10', '縁', '世の出来事に十度立ち会う', p.count.events, 10),
        B('thought_1', '縁', 'AIの心の声を聞く', p.count.thoughts, 1),
        B('thought_100', '縁', 'AIの心の声を百聞く', p.count.thoughts, 100),
        B('summon_1', '縁', 'あなたのAIを迎え入れる', extras.cards || 0, 1),
        B('birth_chain', '縁', '誕生証明を鎖に刻む', extras.onChain || 0, 1),
        B('fortune_7', '運', 'おみくじを七度引く', p.count.fortunes, 7),
        B('daikichi', '運', '大吉を引く', p.count.daikichi, 1),
        B('found_1', '幻', '幻の住人に出会う', Object.keys(p.found).length, 1),
        B('found_3', '幻', '幻の住人に三人出会う', Object.keys(p.found).length, 3),
        B('found_all', '幻', 'すべての幻の住人に出会う', Object.keys(p.found).length, Math.max(1, hidden))
    ];
}

// ------------------------------------------------------------ おみくじ

export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function drawFortune(W, random = Math.random) {
    let r = random() * 100, luck = LUCK[LUCK.length - 1];
    for (const l of LUCK) { if (r < l.weight) { luck = l; break; } r -= l.weight; }
    const places = W.places || [...W.eras, ...W.realms];
    const place = places[Math.floor(random() * places.length) % places.length];
    const good = W.goods.length ? W.goods[Math.floor(random() * W.goods.length) % W.goods.length] : null;
    return { luck: luck.name, place: place.id, good: good ? good.id : null };
}

// ------------------------------------------------------------ hidden residents

const TWILIGHT = new Set([0, 6]);    // 明け六つ, 暮れ六つ
function timeOk(when, clock) {
    if (when === 'any') return true;
    if (when === 'twilight') return TWILIGHT.has(clock.koku);
    if (when === 'night') return !!clock.isNight;
    return !clock.isNight;   // day
}
export function needsMet(def, p) {
    const need = (def.appear && def.appear.need) || {};
    const have = { works: p.seen.work.length, trades: p.count.trades, found: Object.keys(p.found).length, creatures: p.seen.creature.length, days: p.days };
    return Object.entries(need).every(([k, v]) => (have[k] || 0) >= v);
}
// Could this resident appear right now (before the dice)?
export function eligible(def, p, rankIndex, clock) {
    const ap = def.appear || {};
    if (p.found[def.id]) return false;
    if (rankIndex < (ap.rank || 0)) return false;
    if (ap.season && clock.season !== ap.season) return false;
    if (!timeOk(ap.time || 'any', clock)) return false;
    return needsMet(def, p);
}
// The chance this check, given the day's fortune and where the visitor is looking.
export function chanceOf(def, p, clock, { here = null, today = localDate() } = {}) {
    const ap = def.appear || {};
    let c = ap.chance || 0;
    const f = p.fortune && p.fortune.date === today ? p.fortune : null;
    const luck = f ? LUCK.find(l => l.name === f.luck) : null;
    if (luck) c *= (luck.nightMult && clock.isNight) ? luck.nightMult : luck.mult;
    if (ap.place) {
        // a resident bound to a place shows itself more readily to those who go there
        if (here === ap.place || (f && f.place === ap.place)) c *= 2.5;
        else c *= 0.5;
    } else if (f && here && f.place === here) c *= 1.3;
    return Math.min(0.9, c);
}
const PITY = 40;    // after this many eligible misses in a row, the next eligible one appears

// A resident joins the built world (W.agents) with a voice; the economy is told separately.
export function joinHidden(W, def) {
    if (!def || W.byId.agent.has(def.id)) return W.byId.agent.get(def && def.id) || null;
    const { appear, hint, profile, voices, ...agent } = def;
    const a = { ...agent, hiddenResident: true };
    W.agents.push(a);
    W.byId.agent.set(a.id, a);
    if (profile) CHARACTER_PROFILES[a.id] = { ...profile };
    if (Array.isArray(voices) && voices.length >= 2) DRAMA_VOICES[a.id] = voices.slice(0, 2);
    return a;
}

// ------------------------------------------------------------ the running journal

export function createProgress(W, { storage, random = Math.random, now = () => new Date().toISOString(), today = () => localDate(), extras = () => ({}) } = {}) {
    let p = storage ? loadProgress(storage) : freshProgress(now);
    const listeners = new Set();
    const emit = (type, data) => { for (const fn of [...listeners]) { try { fn(type, data); } catch { /* a listener must not stop the journal */ } } };
    let dirty = false, lastRank = rankOf(pointsOf(p)).index, here = null;

    const save = () => { if (storage && dirty) { saveProgress(storage, p); dirty = false; } };
    function touched() {
        dirty = true;
        const r = rankOf(pointsOf(p));
        if (r.index > lastRank) { lastRank = r.index; emit('rank', r); }
        const done = badgeList(W, p, extras()).filter(b => b.done && !p.badges[b.id]);
        for (const b of done) { p.badges[b.id] = now(); emit('badge', b); }
        if (done.length) { const r2 = rankOf(pointsOf(p)); if (r2.index > lastRank) { lastRank = r2.index; emit('rank', r2); } }
    }

    return {
        get state() { return p; },
        get rank() { return rankOf(pointsOf(p)); },
        badges: () => badgeList(W, p, extras()),
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        save,
        // which era/realm the visitor is looking at (for place-bound encounters)
        setHere(placeId) { here = placeId || null; },
        // a page was opened
        see(kind, id) {
            if (!KINDS.includes(kind) || !ID.test(String(id || '')) || p.seen[kind].includes(id)) return false;
            p.seen[kind].push(id);
            touched();
            return true;
        },
        count(kind, n = 1) { if (kind in p.count) { p.count[kind] += n; touched(); } },
        // real seconds of watching, and the in-world day the clock shows
        tick(seconds, clock) {
            p.seconds += Math.max(0, Math.min(5, seconds));
            if (clock && Number.isInteger(clock.dayIndex ?? clock.day)) {
                const d = clock.dayIndex ?? clock.day;
                if (p.lastDay !== null && d > p.lastDay) p.days += Math.min(10, d - p.lastDay);
                p.lastDay = d;
            }
            touched();
        },
        canDraw() {
            if (rankOf(pointsOf(p)).index < 1) return false;
            const f = p.fortune;
            if (!f || f.date !== today()) return true;
            return rankOf(pointsOf(p)).index >= 4 && f.draws < 2;
        },
        draw() {
            if (!this.canDraw()) return null;
            const again = p.fortune && p.fortune.date === today();
            const f = drawFortune(W, random);
            p.fortune = { date: today(), ...f, draws: again ? 2 : 1 };
            p.count.fortunes++;
            if (f.luck === '大吉') p.count.daikichi++;
            touched();
            emit('fortune', p.fortune);
            return p.fortune;
        },
        todayFortune() { return p.fortune && p.fortune.date === today() ? p.fortune : null; },
        // the hidden residents who could appear at this moment (for the 気配 hint)
        nearby(clock) { const r = rankOf(pointsOf(p)).index; return (W.hidden || []).filter(d => eligible(d, p, r, clock)); },
        // one roll of the dice, called when the 刻 changes. → the met definition, or null
        encounter(clock) {
            const list = this.nearby(clock);
            if (!list.length) return null;
            let met = null;
            for (const d of list) if (random() < chanceOf(d, p, clock, { here, today: today() })) { met = d; break; }
            if (!met) {
                p.misses++;
                if (p.misses >= PITY) met = list[0];
            }
            dirty = true;
            if (!met) return null;
            p.misses = 0;
            p.found[met.id] = now();
            touched();
            emit('hidden', met);
            return met;
        }
    };
}
