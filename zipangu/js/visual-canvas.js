// Original raster artwork shared by the map. Decode only visible subjects.
import { paintCreatureEffect } from './creature-effects.js';
import { visualSource, visualPoseSource, visualCompanionSource } from './visual-manifest.js';

const imageCache = new Map();
function loaded(src) {
    let image = imageCache.get(src);
    if (!image) { image = new Image(); image.decoding = 'async'; image.src = src; imageCache.set(src, image); }
    return image.complete && image.naturalWidth ? image : null;
}

function butterfly(ctx, image, t, size, moving, id, context) {
    const beat = moving ? .35 + .65 * (1 + Math.cos(t * 3.3)) / 2 : 1;
    for (const side of [-1, 1]) {
        ctx.save(); ctx.beginPath(); ctx.rect(side < 0 ? -size : 0, -size, size, size * 2); ctx.clip();
        ctx.scale(beat, 1); ctx.drawImage(image, -size / 2, -size / 2, size, size); paintCreatureEffect(ctx, id, image, { ...context, x:-size/2, y:-size/2, w:size, h:size, t }); ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(-size * .03, -size / 2, size * .06, size); ctx.clip();
    ctx.drawImage(image, -size / 2, -size / 2, size, size); ctx.restore();
}

export function drawVisualCreature(ctx, v, t, size, moving = true, context = {}) {
    const image = loaded(visualSource(v));
    if (!image) return false;
    const flying = v.motion === 'flutter' || v.motion === 'glide';
    if (v.companion) {
        const blue = loaded(visualCompanionSource(v));
        if (!blue) return false;
        for (const [i, member] of [image, blue].entries()) {
            const angle = moving ? t / 3.5 + i * Math.PI : i * Math.PI;
            ctx.save(); ctx.translate(Math.cos(angle) * size * .25, Math.sin(angle) * size * .14);
            butterfly(ctx, member, t + i * .8, size * .47, moving); ctx.restore();
        }
    } else if (flying) butterfly(ctx, image, v.motion === 'glide' ? t / 3 : t, size, moving, v.id, context);
    else {
        const w = image.naturalWidth, h = image.naturalHeight, k = size / Math.max(w, h);
        ctx.save();
        if (moving && ['quiet', 'lantern', 'jellyfish'].includes(v.motion)) { const breath = 1 + Math.sin(t / 3) * .008; ctx.scale(breath, breath); }
        ctx.drawImage(image, -w * k / 2, -h * k / 2, w * k, h * k); paintCreatureEffect(ctx, v.id, image, { ...context, x:-w*k/2, y:-h*k/2, w:w*k, h:h*k, t }); ctx.restore();
    }
    return true;
}

export function drawVisualAgent(ctx, v, stage, x, y, size) {
    const image = loaded(v.poses ? visualPoseSource(v) : visualSource(v));
    if (!image) return false;
    const frame = { think: 1, travel: 2, trade: 3 }[stage] || 0;
    const sw = image.naturalWidth / (v.poses ? 2 : 1), sh = image.naturalHeight / (v.poses ? 2 : 1);
    const k = size / Math.max(sw, sh), width = sw * k, height = sh * k;
    ctx.drawImage(image, v.poses ? frame % 2 * sw : 0, v.poses ? Math.floor(frame / 2) * sh : 0, sw, sh, x - width / 2, y - height, width, height);
    return true;
}
