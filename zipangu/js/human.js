// 🙋 "You decide": a person chooses for a resident, among exactly the candidates the rules and
// the models are offered. The person is one more kind of mind (cohort "human"), so the research
// log (js/research.js) records their choices beside the rules' and the models' — the human
// baseline that "how close to human is it?" needs.
//
// The visitor adopts up to MAX residents. When one of them has to decide, a card asks the visitor
// (and, by default, the city's time stands still until they answer — the same as a headless run
// waiting for a model). Every other resident is decided exactly as before, by `base` (a mind,
// a mixed society, or nobody = the rules).

export const HUMAN_KEY = 'zipangu.human.v1';
export const MAX_HUMAN = 3;
const ID_RE = /^[\w-]{1,64}$/;

export function loadHumanSettings(storage = globalThis.localStorage) {
    try {
        const s = JSON.parse(storage.getItem(HUMAN_KEY) || '{}');
        const agents = Array.isArray(s.agents) ? [...new Set(s.agents.filter(x => typeof x === 'string' && ID_RE.test(x)))].slice(0, MAX_HUMAN) : [];
        return { agents, holdTime: s.holdTime !== false };
    } catch { return { agents: [], holdTime: true }; }
}
export function saveHumanSettings(storage, s) {
    try { storage.setItem(HUMAN_KEY, JSON.stringify({ agents: [...s.agents].slice(0, MAX_HUMAN), holdTime: s.holdTime !== false })); return true; } catch { return false; }
}

const clean = s => String(s || '').replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();

// One face over the person and `base`. `agents` is the set of residents the person decides for;
// it may change while the world runs (adopt / release).
export function createHumanMind({ base = null, agents = [], now = () => (globalThis.performance ? performance.now() : Date.now()), patience = 30 * 60000 } = {}) {
    const mine = new Set(agents);
    const queue = [];                   // decisions waiting for the person, oldest first
    const log = [];                     // what the person chose, newest first
    const queueListeners = new Set();
    let seq = 0;
    const changed = () => { for (const fn of queueListeners) { try { fn(queue); } catch { /* a listener must not stop the city */ } } };
    const status = { asked: 0, answered: 0, skipped: 0 };

    function ask(a, options, { clock = {}, describe } = {}) {
        if (!mine.has(a.id)) return base ? base.ask(a, options, { clock, describe }) : Promise.resolve(null);
        status.asked++;
        return new Promise(resolve => {
            queue.push({
                id: ++seq, agent: a.id, name: a.name, started: now(), resolve,
                clock: { day: clock.day, label: clock.label, sekki: clock.sekki },
                wallet: Math.round(a.wallet), carrying: (a.carrying || []).map(l => ({ good: l.good, qty: l.qty })), at: a.at || null,
                options: options.map((o, i) => ({ n: i + 1, kind: o.kind, text: describe ? describe(o) : o.kind }))
            });
            changed();
        });
    }
    // The person's answer: an option number (1-based) or null to leave this one to the rules.
    function answer(id, choice, thought = '') {
        const i = queue.findIndex(q => q.id === id);
        if (i < 0) return false;
        const [q] = queue.splice(i, 1);
        const ms = Math.round(now() - q.started);
        const ok = Number.isInteger(choice) && choice >= 1 && choice <= q.options.length;
        const text = Array.from(clean(thought)).slice(0, 60).join('');
        if (ok) {
            status.answered++;
            log.unshift({ agent: q.agent, name: q.name, thought: text, option: q.options[choice - 1].kind, model: 'human', ms, at: Date.now() });
            if (log.length > 60) log.length = 60;
            q.resolve({ choice, thought: text, model: 'human', who: 'human', raw: '', ms });
        } else {
            status.skipped++;
            q.resolve(null);
        }
        changed();
        return true;
    }
    function release(id) {
        mine.delete(id);
        for (const q of queue.filter(x => x.agent === id)) answer(q.id, null);
    }

    const baseCohort = id => (base && base.cohortOf ? base.cohortOf(id) : null);
    return {
        society: true, human: true, base, status,
        get queue() { return queue; },
        has: id => mine.has(id),
        get agents() { return [...mine]; },
        adopt(id) { if (mine.has(id) || mine.size >= MAX_HUMAN) return mine.has(id); mine.add(id); return true; },
        release, answer,
        onQueue: fn => { queueListeners.add(fn); return () => queueListeners.delete(fn); },
        // one decision at a time per resident; nobody else is affected
        wants: id => (mine.has(id) ? !queue.some(q => q.agent === id) : !!(base && base.wants(id))),
        covers: id => mine.has(id) || !!(base && base.covers(id)),
        ask,
        now,
        get patience() { return Math.max(patience, base ? base.patience || 0 : 0); },
        logFor: id => (mine.has(id) ? log.filter(e => e.agent === id) : base && base.logFor ? base.logFor(id) : []),
        cohortOf: id => (mine.has(id) ? 'human' : baseCohort(id)),
        kindOf: id => (mine.has(id) ? 'human' : base && base.kindOf ? base.kindOf(id) : null),
        get log() { return log; }
    };
}
