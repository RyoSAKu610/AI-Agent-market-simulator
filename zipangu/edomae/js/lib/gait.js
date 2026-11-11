// gait.js — walk and run solvers for a figure drawn in ink.js figure space
// (feet on y = 120, facing +x, hip above x = 40).
//
// Ported to plain JavaScript (types stripped, same API) from lib/gait.ts of
// line-art-animation by JDhruv14 — https://github.com/JDhruv14/line-art-animation
// MIT License, Copyright (c) 2026 JDhruv14. Full licence text: ../../THIRD_PARTY.md
// No imports, so Node tests can load it directly.
//
// A believable gait comes from four rules, all built in here:
//  1. The planted foot slides back at exactly the travel speed (`speed`), so it
//     stays still on the ground while the figure moves by `speed`.
//  2. The swinging foot follows a minimum-jerk path: low for walking, with a heel
//     kick for running.
//  3. The heel peels off before the swing: the foot pivots on its toe.
//  4. Hip height comes from what the planted legs can reach, so a walker rises over
//     each step and dips when both feet are down. A runner compresses over the
//     planted foot and is highest in flight. No sine bobbing.
//
//   const walk = gait({ kind: 'walk' });
//   phase += dt / walk.period;  x += dir * walk.speed * scale * dt;
//   const p = walk.pose(phase);  // hip, feet[0..1] { ankle, knee, pitch, stance }, front, bob

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const minJerk = s => s * s * s * (10 - 15 * s + 6 * s * s);

function knee(hip, ankle, l1, l2) {
    const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
    const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    const th = Math.atan2(dy, dx);
    const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const c1 = [hip[0] + l1 * Math.cos(th - al), hip[1] + l1 * Math.sin(th - al)];
    const c2 = [hip[0] + l1 * Math.cos(th + al), hip[1] + l1 * Math.sin(th + al)];
    return c1[0] > c2[0] ? c1 : c2; // knees bend forward
}

export const GAIT_PRESETS = {
    // natural adult walk, ~2 steps/s
    walk: { period: 1.0, duty: 0.62, stride: 24, lift: 3.4, heelOff: 15, heelKick: 0, thigh: 23, shin: 23, ankleY: 118.4, ground: 120, toe: 4.2 },
    // kimono, tight skirt, geta: shorter stride, very low lift
    shuffle: { period: 0.9, duty: 0.64, stride: 18, lift: 2.4, heelOff: 12, heelKick: 0, thigh: 23, shin: 23, ankleY: 116, ground: 120, toe: 4.2 },
    // child's or adult's run: short ground contact, flight phase, heel kick
    run: { period: 0.5, duty: 0.36, stride: 16, lift: 12, heelOff: 10, heelKick: 3.5, thigh: 13, shin: 13, ankleY: 118, ground: 120, toe: 3 }
};

export function gait(opts = {}) {
    const kind = opts.kind ?? 'walk';
    const o = { ...GAIT_PRESETS[kind], ...opts, kind };
    const { period, duty, stride: S, lift, heelOff, heelKick, thigh, shin, ankleY, ground, toe } = o;
    const reach = (thigh + shin) * 0.983; // a planted leg is nearly, not perfectly, straight
    const restHip = ankleY - reach;
    const speed = S / (duty * period);

    const foot = u => {
        u = ((u % 1) + 1) % 1;
        if (u < duty) {
            const x = 40 + S / 2 - (S * u) / duty;
            const peel = smooth(duty - 0.14, duty, u);
            const th = (heelOff * peel * Math.PI) / 180;
            const px = x + toe, py = ground, ox = -toe, oy = ankleY - ground; // pivot on the toe, on the ground
            return { ankle: [px + ox * Math.cos(th) - oy * Math.sin(th), py + ox * Math.sin(th) + oy * Math.cos(th)], pitch: heelOff * peel, stance: true };
        }
        const s = (u - duty) / (1 - duty);
        const x = 40 - S / 2 + S * minJerk(s) - heelKick * Math.sin(Math.PI * Math.min(1, s * 1.6));
        const y = ankleY - lift * Math.pow(Math.sin(Math.PI * Math.pow(s, heelKick ? 0.7 : 1)), 1.2);
        return { ankle: [x, y], pitch: heelOff * Math.pow(1 - smooth(0, 0.55, s), 1.4), stance: false };
    };

    return {
        ...o,
        speed,
        // phase in cycles; go ∈ [0,1] blends both feet to a standstill (for stopping to bow, wave …).
        pose(phase, go = 1) {
            const raw = [foot(phase), foot(phase + 0.5)];
            if (go < 1) raw.forEach((fo, i) => {
                const rest = 40 + (i ? -2 : 2);
                fo.ankle = [rest + (fo.ankle[0] - rest) * go, ankleY + (fo.ankle[1] - ankleY) * go];
                fo.pitch *= go; fo.stance = true;
            });
            let hipY = restHip;
            const half = (((phase % 0.5) + 0.5) % 0.5);
            if (heelKick && go >= 1) {
                // run: compress over the planted foot, highest mid-flight
                hipY = half < duty ? restHip + 1.4 * Math.sin((Math.PI * half) / duty) : restHip - 2.6 * Math.sin((Math.PI * (half - duty)) / (0.5 - duty));
            } else {
                // walk: lowest at double support, highest as the legs pass
                for (const fo of raw) if (fo.stance) {
                    const dx = fo.ankle[0] - 40;
                    hipY = Math.max(hipY, fo.ankle[1] - Math.sqrt(Math.max(1, reach * reach - dx * dx)));
                }
            }
            const hip = [40, hipY];
            const feet = raw.map(fo => ({ ...fo, knee: knee(hip, fo.ankle, thigh, shin) }));
            const front = feet[0].ankle[0] >= feet[1].ankle[0] ? 0 : 1;
            return { hip, feet, front, bob: hipY - restHip };
        }
    };
}
