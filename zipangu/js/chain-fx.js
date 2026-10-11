// ⛓ On-chain overlay for the map: gold KOGANE coins that leave an agent and land
// in a block. Pure drawing — it never touches the sim, and it draws nothing
// unless chain.state === 'live' (docs/ONCHAIN.md).
//
//   attachChainFx(chain)               subscribe to the chain's 'tx' events
//   drawChainFx(ctx, api, t)           called by map.js once per frame, after the agents
//     api = { sx, sy, S, agentPos(id), placePos(id), night }   (world → screen via sx/sy)
//
// pending   hollow coin on its way (hovers at the place until the RPC answers)
// confirmed solid gold coin + glint; at the place: sparkle, expanding ring, "⛓" tag
// failed    red coin that drops and fades
// settle    gold bell ring at the hub
// Everything shown here comes from a ChainTx the engine reported; nothing is invented.

const MAX_COINS = 80;
const FLY = 1.5;            // seconds from agent to place
const LAND = 2.6;           // seconds the landing flourish lasts
const FAIL = 1.4;
const BELL = 2.6;
const HOVER_MAX = 40;       // a pending coin that never resolves is dropped quietly after this

const TAU = Math.PI * 2;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = u => u * u * (3 - 2 * u);

let chain = null;
let off = null;
const seen = new Map();     // tx id → { status: 'pending'|'confirmed'|'failed' }
let coins = [];
const reduce = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

const norm = s => (s === 'confirmed' ? 'confirmed' : s === 'failed' ? 'failed' : 'pending');

function hash(str) {
    let x = 2166136261;
    for (let i = 0; i < String(str).length; i++) { x ^= String(str).charCodeAt(i); x = Math.imul(x, 16777619); }
    return (x >>> 0) / 4294967296;
}

export function attachChainFx(c) {
    if (off) { try { off(); } catch { /* ignore */ } off = null; }
    chain = c || null;
    seen.clear(); coins = [];
    if (!chain) return () => {};
    for (const tx of chain.txs || []) seen.set(tx.id, { status: norm(tx.status) });   // history is not replayed
    const un = typeof chain.on === 'function' ? chain.on('tx', sync) : null;
    off = typeof un === 'function' ? un : null;
    return () => { if (off) off(); off = null; chain = null; coins = []; seen.clear(); };
}

function sync() {
    if (!chain) return;
    const list = chain.txs || [];
    const ids = new Set();
    for (const tx of list) {
        ids.add(tx.id);
        const status = norm(tx.status), rec = seen.get(tx.id);
        if (!rec) {
            seen.set(tx.id, { status });
            // a tx that is already old when we first see it (a reload, a resumed setup) is not worth a flight
            if (status === 'pending' || Date.now() - (tx.at || 0) < 8000) spawn(tx);
        } else if (rec.status !== status) rec.status = status;
    }
    if (seen.size > 600) for (const id of seen.keys()) if (!ids.has(id)) seen.delete(id);
}

function spawn(tx) {
    if (tx.kind === 'settle') {
        push({ tx: tx.id, bell: true, delay: 0 });
    } else if (tx.kind === 'trade') {
        (tx.ops || []).forEach((op, i) => {
            if (!op || !op.agent || !op.place) return;
            const sell = op.action === 'sell';
            push({
                tx: tx.id, delay: i * 0.14, seed: hash(tx.id + ':' + i), amount: op.amount, sell,
                from: sell ? { place: op.place } : { agent: op.agent },
                to: sell ? { agent: op.agent } : { place: op.place }
            });
        });
    }
}

function push(c) {
    coins.push({ born: null, landAt: null, failAt: null, fx: 0, fy: 0, ...c });
    if (coins.length > MAX_COINS) coins.splice(0, coins.length - MAX_COINS);
}

// ------------------------------------------------------------------ drawing

function endpoint(api, e) {
    const p = e.agent ? api.agentPos(e.agent) : api.placePos(e.place);
    return p ? { x: api.sx(p.x), y: api.sy(p.y) } : null;
}

function star(ctx, x, y, r, rot, alpha) {
    if (r <= 0.3 || alpha <= 0) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot);
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
    ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
    ctx.fill();
    ctx.restore();
}

function glow(ctx, x, y, r, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(246,220,152,${a})`);
    g.addColorStop(0.45, `rgba(232,195,106,${a * 0.4})`);
    g.addColorStop(1, 'rgba(232,195,106,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// A Japanese-style coin: round, with a square hole. `solid` false = a hollow pending ring.
function coin(ctx, x, y, r, solid, now, seed, red) {
    if (!solid) {
        ctx.save();
        ctx.fillStyle = 'rgba(232,195,106,0.13)';
        ctx.strokeStyle = '#f6dc98'; ctx.lineWidth = 1.5;
        ctx.setLineDash([r * 0.55, r * 0.45]); ctx.lineDashOffset = -now * 8 * r * 0.2;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
        return;
    }
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (red) { g.addColorStop(0, '#ff9a9a'); g.addColorStop(0.55, '#e2453d'); g.addColorStop(1, '#8c1d22'); }
    else { g.addColorStop(0, '#fff7cf'); g.addColorStop(0.45, '#e8c36a'); g.addColorStop(1, '#a87a2c'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.strokeStyle = red ? '#5c1216' : '#8a6420';
    ctx.stroke();
    const h = r * 0.34;
    ctx.fillStyle = red ? 'rgba(40,6,10,0.85)' : 'rgba(42,29,8,0.82)';
    ctx.fillRect(x - h, y - h, h * 2, h * 2);
    if (!red) star(ctx, x - r * 0.45, y - r * 0.5, r * (0.9 + 0.7 * Math.max(0, Math.sin(now * 9 + seed * 20))), now * 1.2, 0.95);
}

function tag(ctx, x, y, alpha, text, color) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.font = '700 12px "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,11,40,0.8)'; ctx.strokeText(text, x, y);
    ctx.fillStyle = color || '#f6dc98'; ctx.fillText(text, x, y);
    ctx.restore();
}

function ring(ctx, x, y, r0, r1, f, alpha, w, color) {
    if (f < 0 || f > 1) return;
    ctx.save();
    ctx.globalAlpha *= alpha * (1 - f);
    ctx.strokeStyle = color || '#f6dc98'; ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(x, y, r0 + (r1 - r0) * ease(f), 0, TAU); ctx.stroke();
    ctx.restore();
}

function bell(ctx, x, y, s, swing) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(swing);
    ctx.fillStyle = '#f6dc98'; ctx.strokeStyle = '#8a6420'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.9, s * 0.1, -s * 0.5, -s * 0.5);
    ctx.quadraticCurveTo(0, -s * 1.2, s * 0.5, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.9, s * 0.1, s, s * 0.6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#b98f3d';
    ctx.beginPath(); ctx.arc(0, s * 0.75, s * 0.2, 0, TAU); ctx.fill();
    ctx.restore();
}

export function drawChainFx(ctx, api, t) {
    if (!chain || chain.state !== 'live' || !coins.length) return;
    const now = performance.now() / 1000;
    const still = reduce.matches;
    const dpr = ctx.getTransform().a || 1;
    const cw = ctx.canvas.width / dpr, chh = ctx.canvas.height / dpr;
    const r = Math.max(6, Math.min(11, api.S * 0.7));      // big enough to follow on the overview map
    const night = api.night || 0;
    const keep = [];

    ctx.save();
    for (const c of coins) {
        if (c.born == null) c.born = now + c.delay;
        const age = now - c.born;
        if (age < 0) { keep.push(c); continue; }
        const st = (seen.get(c.tx) || { status: 'pending' }).status;

        if (c.bell) {
            const hub = api.placePos('hub');
            if (!hub) continue;
            const x = api.sx(hub.x), y = api.sy(hub.y);
            if (st === 'pending') {
                if (age > HOVER_MAX) continue;
                ring(ctx, x, y, r * 2, r * 3.4, (age * 0.7) % 1, 0.7, 1.2);
                keep.push(c); continue;
            }
            if (!c.landAt) c.landAt = now;
            const a = now - c.landAt;
            if (a > BELL) continue;
            const fade = 1 - clamp01((a - BELL * 0.7) / (BELL * 0.3));
            ctx.globalAlpha = fade;
            glow(ctx, x, y, r * 6, 0.35 + 0.3 * night);
            if (st === 'failed') { ring(ctx, x, y, r * 1.5, r * 4, a / BELL, 0.9, 1.4, '#ff6a6a'); }
            else if (still) { bell(ctx, x, y - r * 2.4, r * 1.2, 0); }
            else {
                ring(ctx, x, y, r * 1.5, r * 7, a / 1.6, 0.9, 2);
                ring(ctx, x, y, r * 1.5, r * 7, (a - 0.45) / 1.6, 0.7, 1.5);
                bell(ctx, x, y - r * 2.4, r * 1.2, Math.sin(a * 14) * 0.35 * Math.max(0, 1 - a / 1.4));
                tag(ctx, x, y - r * 4.6, clamp01(1 - a / 2.2), '⛓ 決算', '#f6dc98');
            }
            ctx.globalAlpha = 1;
            keep.push(c); continue;
        }

        const A = endpoint(api, c.from), B = endpoint(api, c.to);
        if (!A || !B) { if (age < HOVER_MAX) keep.push(c); continue; }
        const dest = c.to.place ? B : A;                       // where the ring/tag belongs: the place, or the agent for a sale
        const u = clamp01(age / FLY);
        const e = ease(u);
        const dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy);
        const cxp = (A.x + B.x) / 2, cyp = (A.y + B.y) / 2 - dist * 0.26 - r * 2.5;
        const at = k => {
            const m = 1 - k;
            return [m * m * A.x + 2 * m * k * cxp + k * k * B.x, m * m * A.y + 2 * m * k * cyp + k * k * B.y];
        };
        const onscreen = (x, y) => x > -30 && y > -30 && x < cw + 30 && y < chh + 30;

        if (st === 'failed') {
            if (!c.failAt) {
                c.failAt = now;
                const p = at(still ? 1 : e); c.fx = p[0]; c.fy = p[1];
            }
            const f = (now - c.failAt) / FAIL;
            if (f >= 1) continue;
            if (onscreen(c.fx, c.fy)) {
                const drop = still ? 0 : 30 * f * f;
                ctx.globalAlpha = 1 - f;
                coin(ctx, c.fx, c.fy + drop, r, true, now, c.seed, true);
                tag(ctx, c.fx, c.fy + drop - r * 2, 1 - f, '✕', '#ff8a8a');
                ctx.globalAlpha = 1;
            }
            keep.push(c); continue;
        }

        if (st === 'confirmed' && (u >= 1 || still)) {
            if (!c.landAt) c.landAt = now;
            const a = now - c.landAt;
            if (a > (still ? 4 : LAND)) continue;
            const x = dest.x, y = dest.y;
            if (onscreen(x, y)) {
                const f = a / LAND;
                if (still) {
                    coin(ctx, x, y - r * 1.4, r * 0.8, true, 0, c.seed);
                    tag(ctx, x + r * 1.8, y - r * 2.2, 1, '⛓');
                } else {
                    glow(ctx, x, y, r * 4.5, (0.5 + 0.3 * night) * (1 - f));
                    ring(ctx, x, y, r * 0.8, r * 5, f, 0.95, 2);
                    ring(ctx, x, y, r * 0.8, r * 5, f - 0.22, 0.6, 1.4);
                    for (let i = 0; i < 6; i++) {
                        const ang = c.seed * TAU + i * (TAU / 6), d = r * (0.8 + 3.4 * ease(clamp01(a / 0.9)));
                        star(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, r * 0.55 * (1 - clamp01(a / 0.9)), now * 3 + i, 1);
                    }
                    const label = Number.isFinite(c.amount) ? `⛓ ${c.sell ? '+' : ''}${Math.round(c.amount).toLocaleString('ja-JP')} KOGANE` : '⛓';
                    tag(ctx, x, y - r * 2.2 - a * 7, clamp01(1 - (a - 0.5) / (LAND - 0.5)), label, c.sell ? '#9cf5c4' : '#f6dc98');
                }
            }
            keep.push(c); continue;
        }

        // in flight (pending: hollow; confirmed mid-air: solid) or waiting at the destination
        if (st === 'pending' && age > HOVER_MAX) continue;
        if (still) {
            if (onscreen(dest.x, dest.y)) coin(ctx, dest.x, dest.y - r * 1.4, r * 0.8, false, now, c.seed);
            keep.push(c); continue;
        }
        const solid = st === 'confirmed';
        const waiting = u >= 1;
        const [x, y] = at(waiting ? 1 : e);
        if (onscreen(x, y)) {
            if (!waiting) {
                for (let i = 4; i >= 1; i--) {                      // a short comet tail
                    const [tx, ty] = at(Math.max(0, ease(Math.max(0, u - i * 0.035))));
                    ctx.globalAlpha = 0.14 * (5 - i);
                    glow(ctx, tx, ty, r * (1.8 - i * 0.2), 0.5 + 0.3 * night);
                }
                ctx.globalAlpha = 1;
            }
            glow(ctx, x, y, r * 2.8, (solid ? 0.55 : 0.3) + 0.3 * night);
            const bob = waiting ? Math.sin(now * 3 + c.seed * 9) * r * 0.25 : 0;
            coin(ctx, x, y + bob, waiting ? r * 0.9 : r, solid, now, c.seed);
            if (waiting) ring(ctx, x, y + bob, r, r * 2.6, (now * 0.8 + c.seed) % 1, 0.55, 1.1);
        }
        keep.push(c);
    }
    ctx.restore();
    coins = keep;
}

// For tests and the console: how many coins are alive right now.
export const chainFxCount = () => coins.length;
