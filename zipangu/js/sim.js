// The autonomous economy of 万華京ジパング. Pure logic: no DOM, no Date, no
// Math.random, so it runs the same in the browser and in Node. Every agent
// decides on its own from local prices, travel times, events and its needs.

// ---------------------------------------------------------------- constants

const TICK = 1 / 288;            // one fixed step = 5 game minutes (time is in game days)
const MAX_CATCHUP_DAYS = 2;      // a long-hidden tab does not freeze the page catching up

const DAY_KOKU = ['明け六つ', '朝五つ', '昼四つ', '昼九つ', '昼八つ', '夕七つ'];
const NIGHT_KOKU = ['暮れ六つ', '宵五つ', '夜四つ', '夜九つ', '暁八つ', '暁七つ'];
export const KOKU_LABELS = [...DAY_KOKU, ...NIGHT_KOKU];
export const SEKKI = ['立春', '雨水', '啓蟄', '春分', '清明', '穀雨', '立夏', '小満', '芒種', '夏至', '小暑', '大暑',
    '立秋', '処暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒'];
const SEASONS = ['春', '夏', '秋', '冬'];

// The festival calendar is compressed: one game day is one 節気, so a year is
// 24 days and the seasons (and the length of a 刻) visibly turn.
const YEAR_DAYS = 24;
const CADENCE = {
    daily: { period: 1, duration: 0.25 },
    weekly: { period: 2, duration: 0.5 },
    monthly: { period: 4, duration: 0.75 },
    seasonal: { period: 6, duration: 1.25 },
    yearly: { period: 24, duration: 2 },
    rare: { chance: 1 / 36, duration: 2 }
};

// speed: map units per game day. fare: base currency per map unit.
// when: the half of the day the vehicle runs. cap: carrying multiplier.
export const VIA = {
    ginga_tetsudo: { label: '銀河鉄道', speed: 700, fare: 1.1, when: 'night', cap: 1.5 },
    torii: { label: '時層鳥居', speed: 140, fare: 0, when: 'any', cap: 1 },
    chodo: { label: '蝶道', speed: 90, fare: 0, when: 'any', cap: 1, soothing: true },
    kumoito: { label: '蜘蛛糸', speed: 320, fare: 0.7, when: 'any', cap: 1, vertical: true },
    oshie: { label: '押絵渡り', speed: Infinity, fare: 0, flat: 30, when: 'any', cap: 0.5, instant: 0.012, shrink: 0.25 },
    hojo_capsule: { label: '方丈カプセル', speed: 85, fare: 0.4, when: 'any', cap: 3 },
    tamamushi_car: { label: '玉虫車', speed: 450, fare: 1.3, when: 'day', cap: 1 },
    karasu_bikyaku: { label: '烏飛脚', speed: 380, fare: 0.5, perUnit: 6, when: 'any', maxUnits: 2 }
};
const WALK = 'torii';             // off-route travel goes straight through the 時層鳥居

export const GOAL_LABELS = {
    wealth_x3: '稼ぎ（資産三倍）',
    data_hegemony: 'データ覇権',
    district_control: '地区支配',
    contract_network: '契約網',
    build_project: '建設',
    long_arbitrage: '裁定',
    minimal: '今日を漕ぎ切る'
};
const GOAL_KEYWORDS = [
    ['minimal', ['あえて持たない', '最小の目標']],
    ['data_hegemony', ['データ覇権', '情報', '暦', '図鑑', '学び', '星図', 'data']],
    ['district_control', ['地区支配', '元締', '縄張', '支配']],
    ['contract_network', ['契約網', '契約', '協定', '網', '縁']],
    ['build_project', ['建設', '建て', '塔', '築', '開通', '設計', '航路']],
    ['long_arbitrage', ['裁定', '為替', '相場', '差']],
    ['wealth_x3', ['稼ぎ', '富', '黄金', 'wealth']]
];

const STAGE = { react: 0.008, think: 0.014, trade: 0.012, craft: 0.12, work: 0.1, look: 0.05 };
const BUY_IMPACT = 0.035;         // log-price change per unit bought
const SELL_IMPACT = 0.06;         // log-price change per unit sold
const PRODUCE_ANCHOR = 0.9;       // where a good rests, × base_price, at its makers…
const DEMAND_ANCHOR = 1.08;       // …and where it is wanted (plus an era-gap premium)
const CRAFT_COST = 0.75;         // materials for hand-made goods, × local price
const LEVY = 0.12;                // 運上金: share of each half-day's profit paid at settlement
const REVERT_DAYS = 0.4;          // pressure half-life-ish: prices drift back to their anchor
const PRICE_MIN = 0.22, PRICE_MAX = 4.6;   // × base_price, inside the [0.2, 5] contract

// ---------------------------------------------------------------- helpers

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mod = (a, n) => ((a % n) + n) % n;
const list = v => (Array.isArray(v) ? v : []);
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const shortName = s => String(s || '').replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim() || String(s || '');

function hash(...parts) {
    let h = 0x811c9dc5;
    for (const ch of parts.join('|')) {
        h ^= ch.codePointAt(0);
        h = Math.imul(h, 0x01000193);
    }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
}
const unit = (...parts) => hash(...parts) / 4294967296;

// mulberry32; its whole state is one uint32 so snapshots can carry it.
function makeRng(state) {
    const r = {
        s: state >>> 0,
        next() {
            let t = (r.s = (r.s + 0x6d2b79f5) >>> 0);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
    };
    return r;
}

// ---------------------------------------------------------------- 不定時法 clock

function daylightOn(dayIndex, startSekki) {
    // 春分 (index 3) → 0.5 of the day is light; 夏至 0.6; 冬至 0.4.
    return 0.5 + 0.1 * Math.sin((2 * Math.PI * (startSekki + dayIndex + 0.5 - 3)) / YEAR_DAYS);
}

export function clockAt(T, startSekki = 4) {
    const dayIndex = Math.floor(T);
    const tod = T - dayIndex;
    const daylight = daylightOn(dayIndex, startSekki);
    const dawn = 0.5 - daylight / 2, dusk = 0.5 + daylight / 2;
    const dayKoku = daylight / 6, nightKoku = (1 - daylight) / 6;
    let koku, x;
    if (tod >= dawn && tod < dusk) {
        x = (tod - dawn) / dayKoku;
        koku = Math.min(5, Math.floor(x));
    } else {
        x = (tod >= dusk ? tod - dusk : tod + 1 - dusk) / nightKoku;
        koku = 6 + Math.min(5, Math.floor(x));
    }
    const sekkiIndex = mod(startSekki + dayIndex, YEAR_DAYS);
    return {
        day: dayIndex + 1,
        koku,
        phase: clamp(x - (koku % 6), 0, 1),
        label: KOKU_LABELS[koku],
        isNight: koku >= 6,
        t: tod,
        dawn, dusk, daylight,
        dayKokuHours: dayKoku * 24,
        nightKokuHours: nightKoku * 24,
        sekki: SEKKI[sekkiIndex],
        sekkiIndex,
        season: SEASONS[Math.floor(sekkiIndex / 6)],
        year: Math.floor((startSekki + dayIndex) / YEAR_DAYS) + 1
    };
}

// Game time until `via` may run (ginga at night, tamamushi by day).
function waitFor(via, T, startSekki) {
    const when = (VIA[via] || VIA[WALK]).when;
    if (when === 'any') return 0;
    const c = clockAt(T, startSekki);
    const day = Math.floor(T);
    if (when === 'night' && !c.isNight) return day + c.dusk - T;
    if (when === 'day' && c.isNight) {
        if (c.t < c.dawn) return day + c.dawn - T;
        return day + 1 + clockAt(day + 1.5, startSekki).dawn - T;
    }
    return 0;
}

function seasonIndexOf(s) {
    if (s == null) return -1;
    const str = String(s).toLowerCase();
    const named = [['春', 'spring'], ['夏', 'summer'], ['秋', 'autumn', 'fall'], ['冬', 'winter']];
    const sekki = SEKKI.findIndex(n => str.includes(n));
    if (sekki >= 0) return Math.floor(sekki / 6);
    return named.findIndex(words => words.some(w => str.includes(w)));
}

// ---------------------------------------------------------------- world indexes

function indexWorld(W) {
    const goods = new Map(list(W.goods).filter(g => g && g.id && g.base_price > 0).map(g => [g.id, g]));
    const districts = new Map(list(W.districts).filter(d => d && d.id).map(d => [d.id, d]));
    const placeOf = id => (W.placeOf ? W.placeOf(id) : null);
    const pos = id => {
        const m = (districts.get(id) || {}).map || {};
        return { x: Number.isFinite(m.x) ? m.x : 50, y: Number.isFinite(m.y) ? m.y : 50 };
    };
    const known = list((W.world || {}).trade_routes).filter(r => districts.has(r.from) && districts.has(r.to));
    const routes = indexRoutes(known);
    const routeGoods = [];
    for (const r of known) for (const g of list(r.goods)) if (goods.has(g)) routeGoods.push([r.to, g]);
    const hub = ((W.world || {}).hub || {}).id;
    const fallbackHome = districts.has(hub) ? hub : [...districts.keys()][0];
    const median = (() => {
        const p = [...goods.values()].map(g => g.base_price).sort((a, b) => a - b);
        return p.length ? p[Math.floor(p.length / 2)] : 100;
    })();
    return { goods, districts, placeOf, pos, routes, routeGoods, fallbackHome, median };
}

function eraGap(ix, goodId, districtId) {
    const g = ix.goods.get(goodId);
    const a = g && ix.placeOf(g.origin), b = ix.placeOf(districtId);
    if (!a || !b || a === b) return 0;
    if (Number.isFinite(a.order) && Number.isFinite(b.order)) return Math.min(0.2, 0.03 * Math.abs(a.order - b.order));
    return 0.1;   // a mythic realm is always "far" from the eras
}

// ---------------------------------------------------------------- markets

// markets[district][good] = { anchor, p, role }. anchor: where the price rests
// (cheap where made, dear where wanted, dearer across eras). p: log pressure.
function buildMarkets(W, ix) {
    const m = {};
    const entry = (d, g, role, anchor) => {
        m[d] = m[d] || {};
        const cur = m[d][g];
        if (!cur) m[d][g] = { anchor, p: 0, role };
        else if (cur.role === 'produce' && role !== 'produce' && role !== 'event') { cur.role = 'both'; cur.anchor = 1; }
    };
    for (const d of ix.districts.values()) {
        for (const g of list(d.produces)) if (ix.goods.has(g)) entry(d.id, g, 'produce', PRODUCE_ANCHOR);
        for (const g of list(d.demands)) if (ix.goods.has(g)) entry(d.id, g, 'demand', DEMAND_ANCHOR + eraGap(ix, g, d.id));
    }
    // Goods with no producing district are still sold at their origin.
    for (const g of ix.goods.values()) {
        const made = Object.values(m).some(row => row[g.id] && row[g.id].role !== 'demand');
        if (!made && ix.districts.has(g.origin)) entry(g.origin, g.id, 'produce', PRODUCE_ANCHOR);
    }
    for (const [d, g] of ix.routeGoods) entry(d, g, 'route', DEMAND_ANCHOR - 0.04 + eraGap(ix, g, d));
    for (const ev of list(W.events)) {
        for (const d of (W.districtsIn ? W.districtsIn(ev.where) : [])) {
            for (const fx of list(ev.effects)) if (ix.goods.has(fx.good)) entry(d.id, fx.good, 'event', 1 + eraGap(ix, fx.good, d.id) / 2);
        }
    }
    return m;
}

// ---------------------------------------------------------------- agents

function goalTypeOf(text) {
    const s = String(text || '');
    const tag = (s.match(/【[^】]*】/) || [''])[0];
    for (const hay of [tag, s]) {
        for (const [type, words] of GOAL_KEYWORDS) if (words.some(w => hay.includes(w))) return type;
    }
    return 'wealth_x3';
}

function traitsOf(a, seed) {
    const text = [a.personality, a.specialty, a.role, list(a.routines).join(' ')].join(' ');
    const has = words => words.some(w => text.includes(w));
    const r = k => unit(seed, a.id, k);
    return {
        risk: clamp(0.3 + 0.6 * r('risk') + (has(['大胆', '博打', '賭け', '野心']) ? 0.2 : 0) - (has(['慎重', '用心', '堅実']) ? 0.25 : 0), 0.1, 1),
        wander: clamp(0.4 + 0.8 * r('wander') + (has(['好奇心', '旅', '寄り道', '放浪', '巡']) ? 0.3 : 0), 0.2, 1.5),
        diligence: clamp(0.3 + 0.7 * r('diligence') + (has(['勤勉', '職人', '働き']) ? 0.2 : 0), 0.2, 1),
        nightOwl: has(['夜', '闇', '月', '星']) || r('night') < 0.25,
        capacity: 3 + Math.round(3 * r('cap'))
    };
}

function makeAgent(def, ix, seed) {
    const home = ix.districts.has(def.home) ? def.home : ix.fallbackHome;
    const p = ix.pos(home);
    const angle = unit(seed, def.id, 'ring') * Math.PI * 2;
    const wallet = Math.round(10000 + 10000 * unit(seed, def.id, 'wallet') + (def.origin === 'neon_mythos' ? 2000 : 0));
    const goalType = goalTypeOf(def.long_term_ambition);
    return {
        id: def.id,
        name: def.name || def.name_ja || def.id,
        x: p.x + Math.cos(angle) * 1.2,
        y: p.y + Math.sin(angle) * 1.2,
        ox: Math.cos(angle) * 1.2,
        oy: Math.sin(angle) * 1.2,
        home,
        at: home,
        target: null,
        via: null,
        carrying: [],                 // [{good, qty, cost}] — cost is per unit, in base currency
        wallet,
        activity: '待機',
        stage: 'idle',
        goalType,
        goalProgress: 0,
        favored: list(def.favored_goods).filter(g => ix.goods.has(g)),
        traits: traitsOf(def, seed),
        needs: { curiosity: 0.2 + 0.4 * unit(seed, def.id, 'cur'), reputation: 0.3, fatigue: 0.1 * unit(seed, def.id, 'fat') },
        small: false,
        smallUntil: 0,
        plan: null,
        timer: 0.005 + 0.03 * unit(seed, def.id, 'wake'),
        stageSince: 0,
        carrySince: 0,
        trip: null,
        visited: { [home]: 1 },
        startWorth: wallet,
        milestone: 0,
        stats: {
            trips: 0, distance: 0, sales: 0, buys: 0, crafts: 0, profit: 0, gain: 0, volume: 0,
            homeSales: 0, knowledgeSales: 0, invested: 0, daysRowed: 0, tradedToday: false,
            placesSold: {}, profitSince: 0
        }
    };
}

// ---------------------------------------------------------------- economy

// Trade routes keyed by direction: a pair of districts can have a different
// vehicle each way (雪華の型紙 goes by 押絵, the crystals come back by 銀河鉄道).
export function indexRoutes(tradeRoutes) {
    const routes = new Map();
    for (const r of tradeRoutes) {
        const key = `${r.from}>${r.to}`;
        if (!routes.has(key)) routes.set(key, r);
    }
    return routes;
}

// The route that runs from a to b; failing that, one from b to a can be ridden back.
export function routeBetween(routes, a, b) {
    return routes.get(`${a}>${b}`) || routes.get(`${b}>${a}`) || null;
}

export function createEconomy(W, { seed = 1, secondsPerDay = 240, startSekki = 4, state = null } = {}) {
    const ix = indexWorld(W);
    const listeners = new Map();
    const cur = shortName((W.baseCurrency || {}).name_ja) || '刻';
    const goodName = id => shortName((ix.goods.get(id) || {}).name_ja || id);
    const placeName = id => shortName((ix.districts.get(id) || ix.placeOf(id) || {}).name_ja || id);

    const S = state ? JSON.parse(JSON.stringify(state)) : freshState();
    const rng = makeRng(S.rng);
    const agents = new Map(S.agents.map(a => [a.id, a]));
    const prices = new Map();
    const activeEvents = [];
    const clock = {};

    function freshState() {
        const sk = mod(Math.round(startSekki), YEAR_DAYS);
        // Start just before 明け六つ so the first settlement is the morning one.
        const startT = clockAt(0, sk).dawn - 0.02;
        return {
            v: 1, seed, startSekki: sk,
            tick: Math.round(startT / TICK), ran: 0, elapsed: 0,
            rng: hash('zipangu', seed),
            markets: buildMarkets(W, ix),
            eventMult: {}, pending: {},
            schedule: [], active: [], scheduledDay: -1,
            agents: list(W.agents).filter(a => a && a.id).map(a => makeAgent(a, ix, seed)),
            stats: { trades: 0, sales: 0, buys: 0, crafts: 0, volume: 0, crossEra: 0, events: 0, settles: 0, since: { sales: 0, volume: 0 } }
        };
    }

    const now = () => S.tick * TICK;

    // ------------------------------------------------ events bus
    function emit(type, payload) {
        const c = clockAt(now(), S.startSekki);
        const msg = { type, T: now(), day: c.day, label: c.label, ...payload };
        for (const key of [type, '*']) for (const fn of listeners.get(key) || []) fn(msg);
    }
    function on(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
        return () => listeners.get(type).delete(fn);
    }

    // ------------------------------------------------ prices
    function priceOf(d, g, extraPressure = 0) {
        const e = S.markets[d] && S.markets[d][g];
        const good = ix.goods.get(g);
        if (!e || !good) return null;
        const boost = S.eventMult[d + '|' + g] || 1;
        const night = clock.isNight && (good.category === 'luxury' || good.category === 'art') ? 1.06 : 1;
        const raw = good.base_price * e.anchor * boost * night * Math.exp(e.p + extraPressure);
        return clamp(raw, good.base_price * PRICE_MIN, good.base_price * PRICE_MAX);
    }
    function refreshPrices() {
        for (const d of Object.keys(S.markets)) {
            if (!prices.has(d)) prices.set(d, new Map());
            const row = prices.get(d);
            for (const g of Object.keys(S.markets[d])) row.set(g, priceOf(d, g));
        }
    }
    function updateMarkets(dt) {
        const decay = Math.exp(-dt / REVERT_DAYS);
        for (const d of Object.keys(S.markets)) {
            for (const e of Object.values(S.markets[d])) {
                e.p = clamp(e.p * decay + (rng.next() - 0.5) * 0.02, -1.3, 1.1);
            }
        }
    }
    const pressure = (d, g, delta) => {
        const e = S.markets[d] && S.markets[d][g];
        if (e) e.p = clamp(e.p + delta, -1.3, 1.1);
    };
    // Average fill price for a block of q units (the price walks as you trade).
    const fill = (q, impact) => Math.exp(impact * q / 2);

    // Districts that actually want a good (not the ones that make it).
    const sellers = new Map();
    const producers = new Map();
    for (const d of Object.keys(S.markets)) {
        for (const [g, e] of Object.entries(S.markets[d])) {
            const bucket = e.role === 'produce' || e.role === 'both' ? producers : sellers;
            if (e.role === 'both') (sellers.get(g) || sellers.set(g, []).get(g)).push(d);
            (bucket.get(g) || bucket.set(g, []).get(g)).push(d);
        }
    }
    const pricedAt = g => Object.keys(S.markets).filter(d => S.markets[d][g]);

    // ------------------------------------------------ travel
    function viaBetween(a, b) {
        const r = routeBetween(ix.routes, a, b);
        return r && VIA[r.via] ? r.via : WALK;
    }
    function legDist(a, b, via) {
        const p = ix.pos(a), q = ix.pos(b);
        const dx = Math.abs(q.x - p.x), dy = Math.abs(q.y - p.y);
        return (VIA[via] || {}).vertical ? dy + 2.5 * dx : Math.hypot(dx, dy);
    }
    function legTime(a, b, via, T = now()) {
        if (a === b) return 0;
        const v = VIA[via];
        const move = v.instant || legDist(a, b, via) / v.speed;
        return move + waitFor(via, T, S.startSekki);
    }
    function fareFor(a, b, via, qty) {
        if (a === b) return 0;
        const v = VIA[via];
        return (v.flat || 0) + v.fare * legDist(a, b, via) + (v.perUnit || 0) * qty;
    }
    function capacity(agent, via) {
        const v = VIA[via] || VIA[WALK];
        let cap = Math.floor(agent.traits.capacity * (v.cap || 1));
        if (v.maxUnits) cap = Math.min(cap, v.maxUnits);
        if (agent.small) cap = Math.floor(cap * 0.3);
        return Math.max(1, cap);
    }

    // ------------------------------------------------ decisions
    const scaleOf = a => Math.max(500, a.startWorth);
    const placeIdOf = d => (ix.placeOf(d) || {}).id;

    function goalBonus(a, g, d) {
        const good = ix.goods.get(g);
        let b = a.favored.includes(g) ? 1.3 : 1;
        if (!a.visited[d]) b *= 1 + 0.3 * a.needs.curiosity;
        switch (a.goalType) {
            case 'data_hegemony': if (!a.visited[d]) b *= 1.3; if (good.category === 'knowledge') b *= 1.25; break;
            case 'district_control': if (placeIdOf(d) === placeIdOf(a.home) || placeIdOf(good.origin) === placeIdOf(a.home)) b *= 1.5; break;
            case 'contract_network': if (!a.stats.placesSold[placeIdOf(d)]) b *= 1.4; break;
            case 'build_project': if (['material', 'craft', 'energy'].includes(good.category)) b *= 1.25; break;
        }
        return b;
    }
    // Patient arbitrageurs judge a trip by its profit, the rest by profit per day.
    function timeWeight(a, time) {
        const k = a.goalType === 'long_arbitrage' ? 0.55 : a.goalType === 'minimal' ? 1.3 : 1;
        return Math.pow(time + 0.08, k);
    }
    function expectedSell(d, g, q) {
        const p = priceOf(d, g, -SELL_IMPACT * (S.pending[d + '|' + g] || 0));
        return p == null ? 0 : q * p / fill(q, -SELL_IMPACT);
    }

    // Buy g at `from` (getting there first if needed), carry it to `to`, sell.
    function tradeOption(a, g, from, to) {
        const here = a.at;
        const viaIn = viaBetween(here, from), viaOut = viaBetween(from, to);
        const fareIn = fareFor(here, from, viaIn, 0);
        const pb = priceOf(from, g);
        if (pb == null || a.wallet <= fareIn) return null;
        const budget = (a.wallet - fareIn) * (0.35 + 0.5 * a.traits.risk);
        let best = null;
        const cap = capacity(a, viaOut);
        for (const q of new Set([cap, Math.ceil(cap / 2), Math.ceil(cap / 4), 1])) {
            const cost = q * pb * fill(q, BUY_IMPACT);
            const fare = fareFor(from, to, viaOut, q);
            if (cost + fare > budget && q > 1) continue;
            if (cost + fare + fareIn > a.wallet) continue;
            const profit = expectedSell(to, g, q) - cost - fare - fareIn;
            if (!best || profit > best.profit) best = { q, cost, profit };
        }
        if (!best || best.profit <= 0.02 * best.cost) return null;
        const time = legTime(here, from, viaIn) + legTime(from, to, viaOut) + 3 * STAGE.trade;
        const score = best.profit / timeWeight(a, time) / scaleOf(a) * goalBonus(a, g, to);
        const steps = [];
        if (from !== here) steps.push({ type: 'go', to: from });
        steps.push({ type: 'buy', good: g, qty: best.q }, { type: 'go', to }, { type: 'sell', good: g, expect: best.profit + best.cost });
        return { kind: 'trade', score, steps, reserve: { key: to + '|' + g, q: best.q } };
    }

    function sellOptions(a, opts) {
        const lot = a.carrying[0];
        const overdue = now() - a.carrySince > 1.2;
        const dests = (sellers.get(lot.good) || []).length && !overdue ? sellers.get(lot.good).concat(a.at) : pricedAt(lot.good);
        for (const d of new Set(dests)) {
            if (!S.markets[d] || !S.markets[d][lot.good]) continue;
            const via = viaBetween(a.at, d);
            const fare = fareFor(a.at, d, via, lot.qty);
            if (fare > a.wallet) continue;
            const gain = expectedSell(d, lot.good, lot.qty) - fare - lot.qty * lot.cost;
            const time = legTime(a.at, d, via) + STAGE.trade;
            let score = gain >= 0 ? gain / timeWeight(a, time + 0.17) / scaleOf(a) * goalBonus(a, lot.good, d)
                : gain / scaleOf(a) - time;
            if (overdue) score += 5;   // a lot carried too long must go, even at a loss
            const steps = d === a.at ? [] : [{ type: 'go', to: d }];
            steps.push({ type: 'sell', good: lot.good, expect: gain + lot.qty * lot.cost, force: overdue });
            opts.push({ kind: 'sell', score, steps, reserve: { key: d + '|' + lot.good, q: lot.qty } });
        }
    }

    function tradeOptions(a, opts) {
        for (const [g, makers] of producers) {
            const dests = sellers.get(g) || [];
            if (!dests.length) continue;
            for (const from of makers) {
                for (const to of dests) {
                    if (to === from) continue;
                    const o = tradeOption(a, g, from, to);
                    if (o) opts.push(o);
                }
            }
        }
    }

    // Make a local good by hand (cheap materials, slow), then carry it to a buyer.
    function craftOption(a, opts) {
        const row = S.markets[a.at] || {};
        for (const [g, e] of Object.entries(row)) {
            if (e.role !== 'produce' && e.role !== 'both') continue;
            const q = 2 + Math.round(2 * a.traits.diligence);
            const cost = CRAFT_COST * priceOf(a.at, g) * q;
            if (cost > a.wallet * 0.8) continue;
            for (const d of sellers.get(g) || []) {
                if (d === a.at) continue;
                const via = viaBetween(a.at, d);
                const fare = fareFor(a.at, d, via, q);
                const profit = expectedSell(d, g, q) - cost - fare;
                if (profit <= 0 || cost + fare > a.wallet) continue;
                const time = STAGE.craft + legTime(a.at, d, via) + STAGE.trade;
                const bonus = (a.goalType === 'build_project' ? 1.4 : 1) * (0.6 + 0.5 * a.traits.diligence);
                opts.push({
                    kind: 'craft',
                    score: profit / timeWeight(a, time) / scaleOf(a) * bonus * goalBonus(a, g, d),
                    steps: [{ type: 'craft', good: g, qty: q }, { type: 'go', to: d }, { type: 'sell', good: g, expect: profit + cost }],
                    reserve: { key: d + '|' + g, q }
                });
            }
        }
    }

    function visitOptions(a, opts) {
        const all = [...ix.districts.keys()].filter(d => d !== a.at);
        const fresh = all.filter(d => !a.visited[d]);
        const pool = (fresh.length ? fresh : all)
            .map(d => ({ d, t: legTime(a.at, d, viaBetween(a.at, d)) }))
            .sort((p, q) => p.t - q.t || (p.d < q.d ? -1 : 1));
        const picks = pool.slice(0, 3);
        if (pool.length > 3) picks.push(pool[3 + Math.floor(rng.next() * (pool.length - 3))]);
        for (const { d, t } of picks) {
            if (fareFor(a.at, d, viaBetween(a.at, d), 0) > a.wallet) continue;
            const score = a.needs.curiosity * (0.5 + a.traits.wander) - 0.35 * t + (a.goalType === 'data_hegemony' ? 0.2 : 0);
            opts.push({ kind: 'visit', score, steps: [{ type: 'go', to: d }, { type: 'look' }] });
        }
    }

    function restOption(a, opts) {
        const c = clock;
        const sleepy = c.isNight !== a.traits.nightOwl ? 0.25 : 0;
        const dur = 0.12 + 0.18 * a.needs.fatigue;
        opts.push({ kind: 'rest', score: Math.max(0, a.needs.fatigue - 0.45) * 3 + sleepy * a.needs.fatigue, steps: [{ type: 'rest', dur }] });
    }

    function workOption(a, opts) {
        const wage = ix.median * 0.5 * (0.8 + 0.4 * a.traits.diligence);
        const broke = a.wallet < ix.median ? 1.5 : 0.6;
        opts.push({ kind: 'work', score: wage / (STAGE.work + 0.08) / scaleOf(a) * broke, steps: [{ type: 'work', wage }] });
    }

    function decide(a) {
        const opts = [];
        if (a.carrying.length) sellOptions(a, opts);
        else {
            tradeOptions(a, opts);
            craftOption(a, opts);
            visitOptions(a, opts);
            workOption(a, opts);
        }
        restOption(a, opts);
        // Personality noise: bolder agents gamble more on second-best ideas.
        let best = null, bestScore = -Infinity;
        for (const o of opts) {
            const s = o.score * (1 + (rng.next() - 0.5) * (0.2 + 0.4 * a.traits.risk));
            if (Number.isFinite(s) && s > bestScore) { best = o; bestScore = s; }
        }
        return best || { kind: 'rest', steps: [{ type: 'rest', dur: 0.1 }] };
    }

    // ------------------------------------------------ plan execution
    function setStage(a, stage, activity) {
        if (a.stage !== stage) a.stageSince = now();
        a.stage = stage;
        if (activity) a.activity = activity;
    }
    function release(a) {
        const r = a.plan && a.plan.reserve;
        if (r) {
            S.pending[r.key] = Math.max(0, (S.pending[r.key] || 0) - r.q);
            if (!S.pending[r.key]) delete S.pending[r.key];
            a.plan.reserve = null;
        }
    }
    function goIdle(a, wait = 0.01 + 0.02 * rng.next()) {
        release(a);
        a.plan = null;
        a.trip = null;
        a.target = null;
        a.via = null;
        a.timer = wait;
        setStage(a, 'idle', a.small ? '押絵の大きさで休む' : '待機');
    }
    function beginDecision(a) {
        const plan = decide(a);
        plan.i = 0;
        a.plan = plan;
        if (plan.reserve) S.pending[plan.reserve.key] = (S.pending[plan.reserve.key] || 0) + plan.reserve.q;
        const go = plan.steps.find(s => s.type === 'go');
        a.target = go ? go.to : null;
        a.timer = STAGE.react;
        setStage(a, 'react', '！');
    }
    function startStep(a) {
        const step = a.plan.steps[a.plan.i];
        if (!step) return goIdle(a);
        switch (step.type) {
            case 'go': return depart(a, step.to);
            case 'buy': case 'sell': a.timer = STAGE.trade; return setStage(a, 'trade', step.type === 'buy' ? '仕入れ中' : '売り込み中');
            case 'craft': a.timer = STAGE.craft; return setStage(a, 'trade', `${goodName(step.good)}を細工中`);
            case 'work': a.timer = STAGE.work; return setStage(a, 'trade', '手伝い仕事中');
            case 'look': a.timer = STAGE.look; return setStage(a, 'idle', `${placeName(a.at)}を見物中`);
            case 'rest': a.timer = step.dur; return setStage(a, 'idle', '休息中');
        }
        return goIdle(a);
    }
    function nextStep(a) {
        a.plan.i++;
        if (a.plan.i >= a.plan.steps.length) goIdle(a);
        else startStep(a);
    }

    function depart(a, to) {
        if (to === a.at || !ix.districts.has(to)) return nextStep(a);
        const units = a.carrying.reduce((n, l) => n + l.qty, 0);
        let via = viaBetween(a.at, to);
        let fare = fareFor(a.at, to, via, units);
        if (fare > a.wallet) { via = WALK; fare = 0; }   // can't pay: walk the 鳥居 for free
        a.wallet = Math.max(0, a.wallet - fare);
        const p = ix.pos(to);
        a.trip = { from: a.at, to, via, x0: a.x, y0: a.y, x1: p.x + a.ox, y1: p.y + a.oy, prog: 0, dist: legDist(a.at, to, via), started: now() };
        a.via = via;
        a.target = to;
        a.stats.trips++;
        setStage(a, 'travel', `${placeName(to)}へ${VIA[via].label}で移動中`);
        emit('depart', {
            agent: a.id, from: a.at, to, via, fare,
            message: `${a.name} が ${placeName(a.at)} から ${placeName(to)} へ${VIA[via].label}で出発`
        });
        a.at = null;
    }

    function travel(a, dt) {
        const tr = a.trip;
        const v = VIA[tr.via];
        if (waitFor(tr.via, now(), S.startSekki) > 0 && now() - tr.started < 1.5) {
            a.activity = v.when === 'night' ? `${v.label}の発車待ち（暮れ六つ）` : `${v.label}は夜明けまで停車中`;
            return;
        }
        a.activity = `${placeName(tr.to)}へ${v.label}で移動中`;
        const step = v.instant ? dt / v.instant : dt * v.speed / Math.max(tr.dist, 1e-6);
        const before = tr.prog;
        tr.prog = Math.min(1, tr.prog + step);
        a.stats.distance += (tr.prog - before) * tr.dist;
        a.x = tr.x0 + (tr.x1 - tr.x0) * tr.prog;
        a.y = tr.y0 + (tr.y1 - tr.y0) * tr.prog;
        a.needs.fatigue = clamp(a.needs.fatigue + dt * (v.soothing ? -0.3 : 0.9), 0, 1);
        // A trip that somehow outlives two days is completed rather than left hanging.
        if (tr.prog >= 1 || now() - tr.started > 2) arrive(a);
    }

    function arrive(a) {
        const tr = a.trip;
        a.at = tr.to;
        a.x = tr.x1; a.y = tr.y1;
        a.trip = null;
        a.target = null;
        const first = !a.visited[tr.to];
        a.visited[tr.to] = 1;
        a.needs.curiosity = clamp(a.needs.curiosity - (first ? 0.5 : 0.08), 0, 1);
        if (VIA[tr.via].shrink) { a.small = true; a.smallUntil = now() + VIA[tr.via].shrink; }
        emit('arrive', {
            agent: a.id, district: tr.to, via: tr.via, first,
            message: `${a.name} が ${placeName(tr.to)} に着いた${first ? '（初訪問）' : ''}`
        });
        nextStep(a);
    }

    function doBuy(a, step) {
        const p = priceOf(a.at, step.good);
        if (p == null) return goIdle(a);
        let q = step.qty;
        while (q > 0 && q * p * fill(q, BUY_IMPACT) > a.wallet) q--;
        if (q < 1) return goIdle(a);
        const total = q * p * fill(q, BUY_IMPACT);
        a.wallet = Math.max(0, a.wallet - total);
        a.carrying.push({ good: step.good, qty: q, cost: total / q });
        a.carrySince = now();
        pressure(a.at, step.good, BUY_IMPACT * q);
        if (a.plan.reserve) {   // the plan may have bought fewer than it reserved
            S.pending[a.plan.reserve.key] = Math.max(0, (S.pending[a.plan.reserve.key] || 0) - (a.plan.reserve.q - q));
            a.plan.reserve.q = q;
        }
        a.stats.buys++;
        S.stats.buys++; S.stats.trades++;
        emit('trade', {
            action: 'buy', agent: a.id, district: a.at, good: step.good, qty: q, price: p, total,
            message: `${a.name} が ${placeName(a.at)} で ${goodName(step.good)} ×${q} を ${fmt(total)}${cur} で仕入れた`
        });
        nextStep(a);
    }

    function doSell(a, step) {
        const idx = a.carrying.findIndex(l => l.good === step.good);
        const p = priceOf(a.at, step.good);
        if (idx < 0 || p == null) return goIdle(a);
        const lot = a.carrying[idx];
        const rep = 1 + 0.06 * a.needs.reputation;
        const total = lot.qty * p * rep / fill(lot.qty, -SELL_IMPACT);
        // Arrived to a crashed market: think again rather than dump the lot.
        if (!step.force && step.expect > 0 && total < 0.85 * step.expect && now() - a.carrySince < 1.2) return goIdle(a, 0.005);
        release(a);
        a.carrying.splice(idx, 1);
        a.wallet += total;
        pressure(a.at, step.good, -SELL_IMPACT * lot.qty);
        const profit = total - lot.qty * lot.cost;
        recordSale(a, step.good, lot.qty, total, profit);
        const good = ix.goods.get(step.good);
        const origin = placeIdOf(good.origin), there = placeIdOf(a.at);
        const crossEra = !!origin && !!there && origin !== there;
        if (crossEra) S.stats.crossEra++;
        emit('trade', {
            action: 'sell', agent: a.id, district: a.at, good: step.good, qty: lot.qty, price: p, total, profit, crossEra,
            message: `${a.name} が ${goodName(step.good)} ×${lot.qty} を ${placeName(a.at)}へ運び ${fmt(total)}${cur} で売った（${profit >= 0 ? '+' : '−'}${fmt(Math.abs(profit))}${cur}）`
        });
        if (a.carrying.length) a.carrySince = now();
        nextStep(a);
    }

    function recordSale(a, g, q, total, profit) {
        const st = a.stats;
        const role = (S.markets[a.at][g] || {}).role;
        st.sales++; st.volume += total; st.profit += profit; st.profitSince += profit;
        if (profit > 0) st.gain += profit;
        st.tradedToday = true;
        st.placesSold[placeIdOf(a.at)] = 1;
        // 地区支配: selling at home, or spreading home-made goods anywhere.
        const home = placeIdOf(a.home);
        if (placeIdOf(a.at) === home || placeIdOf((ix.goods.get(g) || {}).origin) === home) st.homeSales += total;
        if ((ix.goods.get(g) || {}).category === 'knowledge') st.knowledgeSales++;
        a.needs.reputation = clamp(a.needs.reputation + 0.01 + (role !== 'produce' ? 0.02 : 0), 0, 1);
        a.needs.fatigue = clamp(a.needs.fatigue + 0.02, 0, 1);
        S.stats.sales++; S.stats.trades++; S.stats.volume += total;
        S.stats.since.sales++; S.stats.since.volume += total;
        updateGoal(a);
    }

    function doCraft(a, step) {
        const p = priceOf(a.at, step.good);
        const cost = p == null ? Infinity : CRAFT_COST * p * step.qty;
        if (cost > a.wallet) return goIdle(a);
        a.wallet = Math.max(0, a.wallet - cost);
        a.carrying.push({ good: step.good, qty: step.qty, cost: cost / step.qty });
        a.carrySince = now();
        pressure(a.at, step.good, -0.02 * step.qty);
        a.needs.fatigue = clamp(a.needs.fatigue + 0.12, 0, 1);
        a.stats.crafts++;
        if (a.goalType === 'build_project') a.stats.invested += cost * 0.5;
        S.stats.crafts++; S.stats.trades++;
        emit('trade', {
            action: 'craft', agent: a.id, district: a.at, good: step.good, qty: step.qty, total: cost,
            message: `${a.name} が ${placeName(a.at)} で ${goodName(step.good)} ×${step.qty} を細工した`
        });
        nextStep(a);
    }

    function finishStep(a) {
        const step = a.plan.steps[a.plan.i];
        switch (step.type) {
            case 'buy': return doBuy(a, step);
            case 'sell': return doSell(a, step);
            case 'craft': return doCraft(a, step);
            case 'work':
                a.wallet += step.wage;
                a.needs.fatigue = clamp(a.needs.fatigue + 0.1, 0, 1);
                return nextStep(a);
            case 'look':
                a.needs.curiosity = clamp(a.needs.curiosity - 0.3, 0, 1);
                return nextStep(a);
            default: return nextStep(a);
        }
    }

    function updateAgent(a, dt) {
        const T = now();
        if (a.small && T >= a.smallUntil) a.small = false;
        a.needs.curiosity = clamp(a.needs.curiosity + dt * 0.35 * a.traits.wander, 0, 1);
        if (a.stage === 'idle' && a.plan && a.plan.steps[a.plan.i] && a.plan.steps[a.plan.i].type === 'rest') {
            a.needs.fatigue = clamp(a.needs.fatigue - dt * 3, 0, 1);
        } else if (a.stage !== 'travel') {
            a.needs.fatigue = clamp(a.needs.fatigue - dt * 0.3, 0, 1);
        }
        // Watchdog: nobody stays frozen in one non-travel stage for more than a day and a half.
        if (a.stage !== 'travel' && T - a.stageSince > 1.5) {
            if (a.at == null) { a.at = a.home; const p = ix.pos(a.home); a.x = p.x + a.ox; a.y = p.y + a.oy; }
            return goIdle(a, 0);
        }
        if (a.stage === 'travel') return travel(a, dt);
        a.timer -= dt;
        if (a.timer > 0) return;
        if (a.stage === 'react') { a.timer = STAGE.think; return setStage(a, 'think', '💭'); }
        if (a.stage === 'think') return startStep(a);
        if (!a.plan) return beginDecision(a);
        finishStep(a);
    }

    // ------------------------------------------------ goals
    function goalProgressOf(a) {
        const st = a.stats, s = scaleOf(a);
        const worth = a.wallet + a.carrying.reduce((n, l) => n + l.qty * l.cost, 0);
        switch (a.goalType) {
            case 'wealth_x3': return (worth / s - 1) / 2;
            case 'data_hegemony': return 0.7 * Object.keys(a.visited).length / Math.max(1, ix.districts.size) + 0.3 * Math.min(1, st.knowledgeSales / 40);
            case 'district_control': return st.homeSales / (s * 4);
            case 'contract_network': return 0.8 * Object.keys(st.placesSold).length / Math.max(1, list(W.places || []).length || 18) + 0.2 * Math.min(1, st.sales / 120);
            case 'build_project': return st.invested / (s * 4);
            case 'long_arbitrage': return st.gain / (s * 3);
            case 'minimal': return st.daysRowed / YEAR_DAYS;
        }
        return 0;
    }
    function updateGoal(a) {
        const p = clamp(goalProgressOf(a), 0, 1);
        a.goalProgress = Number.isFinite(p) ? p : 0;
        const m = Math.floor(a.goalProgress * 10);
        if (m > a.milestone) {
            a.milestone = m;
            emit('goal', {
                agent: a.id, goalType: a.goalType, progress: a.goalProgress,
                message: `${a.name} の長期目標「${GOAL_LABELS[a.goalType]}」が ${m * 10}% に到達`
            });
        }
    }

    // ------------------------------------------------ calendar events
    function firesOn(ev, dayIndex) {
        const yd = mod(S.startSekki + dayIndex, YEAR_DAYS);
        const want = seasonIndexOf(ev.season);
        if (want >= 0 && Math.floor(yd / 6) !== want) return false;
        const c = CADENCE[ev.cadence] || CADENCE.seasonal;
        if (c.chance) return unit(S.seed, ev.id, 'rare', dayIndex) < c.chance;
        const slot = hash(S.seed, ev.id, 'slot');
        if (want >= 0 && c.period >= 6) return yd % 6 === slot % 6;   // once in its season
        return yd % c.period === slot % c.period;
    }
    function scheduleDay(dayIndex) {
        if (dayIndex <= S.scheduledDay) return;
        S.scheduledDay = dayIndex;
        for (const ev of list(W.events)) {
            if (!ev || !ev.id || !firesOn(ev, dayIndex)) continue;
            const at = dayIndex + 0.2 + 0.7 * unit(S.seed, ev.id, 'time', dayIndex);
            if (at > now()) S.schedule.push({ id: ev.id, at });
        }
        S.schedule.sort((p, q) => p.at - q.at || (p.id < q.id ? -1 : 1));
    }
    function recomputeEventMult() {
        S.eventMult = {};
        for (const act of S.active) {
            const ev = (W.byId && W.byId.event.get(act.id)) || list(W.events).find(e => e.id === act.id);
            if (!ev) continue;
            const ds = W.districtsIn ? W.districtsIn(ev.where) : [];
            for (const fx of list(ev.effects)) {
                const m = Number(fx.demand_multiplier);
                if (!(m > 0)) continue;
                for (const d of ds) {
                    const key = d.id + '|' + fx.good;
                    if (S.markets[d.id] && S.markets[d.id][fx.good]) S.eventMult[key] = (S.eventMult[key] || 1) * m;
                }
            }
        }
        activeEvents.length = 0;
        for (const act of S.active) {
            const ev = W.byId ? W.byId.event.get(act.id) : null;
            if (ev) activeEvents.push({ event: ev, endsAt: act.endsAt, startedAt: act.startedAt });
        }
    }
    function runCalendar() {
        const T = now();
        let changed = false;
        while (S.schedule.length && S.schedule[0].at <= T) {
            const { id } = S.schedule.shift();
            const ev = W.byId ? W.byId.event.get(id) : null;
            if (!ev) continue;
            const dur = (CADENCE[ev.cadence] || CADENCE.seasonal).duration;
            const live = S.active.find(x => x.id === id);
            if (live) live.endsAt = Math.max(live.endsAt, T + dur);
            else S.active.push({ id, startedAt: T, endsAt: T + dur });
            changed = true;
            S.stats.events++;
            const fx = list(ev.effects).slice(0, 2).map(e => `${goodName(e.good)} の需要が ${e.demand_multiplier}倍`).join('、');
            emit('event', {
                event: id, where: ev.where, effects: list(ev.effects), creatures: list(ev.creatures), endsAt: T + dur,
                message: `【${ev.name_ja}】${placeName(ev.where)}で ${fx || '祭りが始まった'}`
            });
            // Idle agents notice the news at once (the map shows their ！).
            for (const a of agents.values()) if (a.stage === 'idle' && !a.plan) a.timer = Math.min(a.timer, 0.002);
        }
        const before = S.active.length;
        S.active = S.active.filter(x => x.endsAt > T);
        if (changed || S.active.length !== before) recomputeEventMult();
    }

    // ------------------------------------------------ settlement (明け六つ・暮れ六つ)
    function settle(kind) {
        const label = kind === 'dawn' ? '明け六つ' : '暮れ六つ';
        let top = null;
        for (const a of agents.values()) {
            if (a.goalType === 'build_project') {
                const spare = a.wallet - 0.8 * a.startWorth;
                if (spare > 0) { const inv = spare * 0.25; a.wallet -= inv; a.stats.invested += inv; }
            }
            if (kind === 'dusk') {
                if (a.stats.tradedToday) a.stats.daysRowed++;
                a.stats.tradedToday = false;
            }
            if (a.stats.profitSince > 0) {
                const levy = Math.min(a.wallet, a.stats.profitSince * LEVY);
                a.wallet -= levy;
                S.stats.levy = (S.stats.levy || 0) + levy;
            }
            a.needs.reputation = clamp(a.needs.reputation * 0.97, 0, 1);
            if (!top || a.stats.profitSince > top.stats.profitSince) top = a;
            updateGoal(a);
        }
        // Fresh goods reach the producers at dawn; the night market opens at dusk.
        for (const d of Object.keys(S.markets)) {
            for (const e of Object.values(S.markets[d])) {
                if (kind === 'dawn' && (e.role === 'produce' || e.role === 'both')) e.p = clamp(e.p - 0.12, -1.3, 1.1);
            }
        }
        const { sales, volume } = S.stats.since;
        S.stats.settles++;
        const best = top && top.stats.profitSince > 0 ? `稼ぎ頭は ${top.name}（+${fmt(top.stats.profitSince)}${cur}）` : '目立った稼ぎ頭はいない';
        emit('settle', {
            kind, sales, volume, top: top ? top.id : null, topProfit: top ? top.stats.profitSince : 0,
            message: `${label}の決算：${sales}件・${fmt(volume)}${cur}の商い。${best}`
        });
        for (const a of agents.values()) a.stats.profitSince = 0;
        S.stats.since = { sales: 0, volume: 0 };
    }

    function boundaries(dayIndex) {
        const c = clockAt(dayIndex + 0.5, S.startSekki);
        return [['dawn', dayIndex + c.dawn], ['dusk', dayIndex + c.dusk]];
    }

    // ------------------------------------------------ main loop
    function tick() {
        const T0 = now();
        S.tick++;
        const T1 = now();
        Object.assign(clock, clockAt(T1, S.startSekki));
        if (Math.floor(T1) > Math.floor(T0)) scheduleDay(Math.floor(T1));
        runCalendar();
        updateMarkets(TICK);
        for (const a of agents.values()) updateAgent(a, TICK);
        const days = Math.floor(T0) === Math.floor(T1) ? [Math.floor(T1)] : [Math.floor(T0), Math.floor(T1)];
        for (const d of days) for (const [kind, b] of boundaries(d)) if (T0 < b && b <= T1) settle(kind);
    }

    function step(dtSeconds) {
        const dt = Number(dtSeconds);
        if (!(dt > 0)) return;
        // Ticks are derived from the summed real seconds (not a decremented
        // remainder) so the same elapsed time gives the same world whatever
        // the frame sizes were.
        S.elapsed += dt;
        const perTick = secondsPerDay * TICK;
        let due = Math.floor(S.elapsed / perTick + 1e-7) - S.ran;
        const cap = Math.round(MAX_CATCHUP_DAYS / TICK);
        if (due > cap) { S.elapsed = (S.ran + cap) * perTick; due = cap; }
        for (let i = 0; i < due; i++) { S.ran++; tick(); }
        refreshPrices();
    }

    function snapshot() {
        S.rng = rng.s;
        return JSON.parse(JSON.stringify({ ...S, agents: [...agents.values()], clock }));
    }

    // ------------------------------------------------ boot
    Object.assign(clock, clockAt(now(), S.startSekki));
    if (!state) {
        scheduleDay(Math.floor(now()));
        for (const a of agents.values()) { a.stageSince = now(); updateGoal(a); }
    }
    recomputeEventMult();
    refreshPrices();

    return {
        clock,
        agents,
        prices,
        activeEvents,
        get time() { return now(); },
        get stats() { return S.stats; },
        get seed() { return S.seed; },
        step,
        on,
        snapshot,
        priceOf
    };
}
