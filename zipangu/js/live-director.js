// 📡 The live camera's director (js/live-camera.js): who is on screen next and how the
// shot is framed. Pure functions over the economy's live state, so the choices can be
// tested in node (tools/live-camera.test.mjs). Nothing here invents a line: captions come
// from what the resident is actually doing, said or did.

export const CUT_SECONDS = 5;

// Economy events worth cutting to (js/sim.js emit). Price ticks and settlements are not.
export const NEWS_TYPES = new Set(['trade', 'arrive', 'depart', 'encounter', 'thought', 'goal', 'request', 'message-received', 'arrive-new']);

// The quarters of a resident's pose sheet: stand, think, walk, hand over (as visual-art.js).
const FRAME = { think: 1, travel: 2, trade: 3 };
// How the camera moves for each stage of the day.
const MOVE = { idle: 'breathe', react: 'jolt', think: 'drift', travel: 'track', trade: 'push' };
// The marks over a resident's head, the same as the map and the atelier.
const BUBBLE = { react: '！', think: '💭', travel: '🏃', trade: '◆' };
// Where the figure stands in the picture, cut after cut: thirds, so no two shots look alike.
const SIDES = ['left', 'right', 'center'];

// A thought or a piece of news stays the caption for this long (in days of city time).
export const FRESH_DAYS = 0.25;

// → the id to show next. `shown` maps id → the cut it was last on screen, `news` maps
// id → { cut, msg } for its latest event. Residents with news since they were last shown
// come first; otherwise whoever has waited longest. Nobody waits more than two rounds.
export function pickNext(roster, { current = null, cut = 0, shown = new Map(), news = new Map() } = {}) {
    const pool = roster.filter(id => id !== current);
    if (!pool.length) return roster.includes(current) ? current : null;
    const last = id => (shown.has(id) ? shown.get(id) : -1);
    const oldest = list => list.reduce((best, id) => (last(id) < last(best) ? id : best));
    const overdue = pool.filter(id => cut - last(id) > roster.length * 2);
    if (overdue.length) return oldest(overdue);
    const fresh = pool.filter(id => news.has(id) && news.get(id).cut > last(id));
    return oldest(fresh.length ? fresh : pool);
}

// Keeps the bookkeeping pickNext needs: which cut it is, who was shown when, who has news.
export function createDirector() {
    let cut = 0;
    const shown = new Map(), news = new Map();
    return {
        get cut() { return cut; },
        news,
        note(msg) {
            if (!msg || !NEWS_TYPES.has(msg.type)) return;
            for (const id of [msg.agent, msg.other]) if (id) news.set(id, { cut, msg });
        },
        // someone who shared the last shot has been on screen too
        mark(id) { shown.set(id, cut); },
        next(roster, current) {
            const id = pickNext(roster, { current, cut, shown, news });
            if (id != null) { cut++; shown.set(id, cut); }
            return id;
        }
    };
}

// The district a resident is in, or heading for while on the road.
export function whereabouts(live) {
    return (live && (live.at || (live.trip && live.trip.to) || live.home)) || null;
}

// → how to frame this resident now: the place behind them, the pose, the camera move.
export function shotFor(W, live, cut = 0) {
    const stage = (live && live.stage) || 'idle';
    const district = whereabouts(live);
    const place = district ? W.placeOf(district) : null;
    return {
        id: live.id,
        stage,
        district,
        place: place ? place.id : null,
        placeKind: place ? (W.byId.era.has(place.id) ? 'era' : 'realm') : null,
        frame: FRAME[stage] || 0,
        move: MOVE[stage] || 'breathe',
        bubble: BUBBLE[stage] || '',
        // the road reads best with the walker in the middle; a hand-over as a close shot
        side: stage === 'travel' || stage === 'trade' ? 'center' : SIDES[cut % SIDES.length],
        close: stage === 'trade' || stage === 'think' || cut % 4 === 3
    };
}

// → the id of the resident to film together with `id`, or null. Only for a meeting that
// really happened a moment ago and only while the two are still standing in the same district.
export function partnerFor(id, news, agents, now) {
    const msg = news && news.msg;
    if (!msg || msg.type !== 'encounter' || now - msg.T > FRESH_DAYS) return null;
    const other = msg.agent === id ? msg.other : msg.agent;
    const a = agents.get(id), b = agents.get(other);
    if (!a || !b || other === id || !a.at || a.at !== b.at || a.trip || b.trip) return null;
    return other;
}

// Who is speaking in a two-shot: the two take turns, a little under two seconds each.
export const TURN_SECONDS = 1.7;
export const speakerAt = seconds => (Math.floor(Math.max(0, seconds) / TURN_SECONDS) % 2 ? 'b' : 'a');

// → { kind, text } for the lower third: a fresh inner voice (from an AI mind), else the
// resident's latest news, else what they are doing. Always something that really happened.
export function captionFor(live, news, now) {
    const thought = live && live.thought;
    if (thought && thought.text && now - thought.T <= FRESH_DAYS) return { kind: 'voice', text: thought.text };
    const msg = news && news.msg;
    if (msg && msg.message && now - msg.T <= FRESH_DAYS && msg.type !== 'thought') return { kind: 'news', text: msg.message };
    return { kind: 'activity', text: String((live && live.activity) || '') };
}
