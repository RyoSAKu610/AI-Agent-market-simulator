// Local effects are tied to canonical time/region; the original PNGs stay intact.
export const LOCAL_EFFECTS = new Set(['tokimadara', 'heian_sanju_medaka', 'rai_botaru', 'reiwa_mange_cho']);
const SPOTS = [[.86,.66],[.82,.758],[.777,.827],[.207,.827],[.176,.758],[.14,.66],[.09,.37],[.085,.265],[.076,.175],[.925,.178],[.92,.262],[.895,.37]];
const TRIANGLES = [[[.15,.21],[.31,.16],[.31,.32]],[[.18,.35],[.32,.32],[.32,.45]],[[.68,.32],[.69,.16],[.85,.21]],[[.68,.45],[.68,.32],[.82,.35]],[[.22,.65],[.39,.57],[.33,.77]],[[.61,.57],[.78,.65],[.67,.77]]];
export function paintCreatureEffect(ctx, id, image, {x=0,y=0,w=1,h=1,clock=null,t=0,region='east'}={}) {
    ctx.save(); ctx.translate(x,y); ctx.scale(w,h);
    if (id === 'tokimadara') {
        // The baked orange spot is restored to gold unless it is the current 子 spot.
        if (clock && clock.koku !== 9) { ctx.fillStyle='#b98b36';ctx.beginPath();ctx.arc(.925,.178,.028,0,Math.PI*2);ctx.fill(); }
        const k = clock ? clock.koku : 9, p=SPOTS[k];
        ctx.shadowColor='#ffbc58';ctx.shadowBlur=w*.018;ctx.fillStyle='#ffd578bb';ctx.beginPath();ctx.arc(p[0],p[1],.023,0,Math.PI*2);ctx.fill();
    } else if (id === 'heian_sanju_medaka' && clock && clock.phase < .075) {
        ctx.fillStyle='#ffe6a177';ctx.shadowColor='#ffe4a0';ctx.shadowBlur=w*.009;
        for(let i=0;i<10;i++){ctx.beginPath();ctx.arc(.245+i*.056,.386+i*.009,.015,0,Math.PI*2);ctx.fill();}
    } else if (id === 'rai_botaru') {
        const period=region==='west'?2:4, phase=((t%period)+period)%period/period;
        ctx.beginPath();ctx.ellipse(.74,.70,.17,.13,.5,0,Math.PI*2);ctx.clip();
        ctx.filter=phase<.4?'brightness('+(.6+Math.sin(phase/.4*Math.PI)*.65)+')':'hue-rotate(-125deg) brightness(.68)';
        ctx.drawImage(image,0,0,1,1);
    } else if (id === 'reiwa_mange_cho') {
        const seed=Math.floor(t/1.9); ctx.globalAlpha=.4;
        for (let n=0;n<TRIANGLES.length;n++) {
            const a=TRIANGLES[n],cx=a.reduce((s,p)=>s+p[0],0)/3,cy=a.reduce((s,p)=>s+p[1],0)/3;
            ctx.save();ctx.beginPath();a.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.clip();
            ctx.translate(cx,cy);
            for(let i=0;i<6;i++) {ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(.13,0);ctx.lineTo(.065,.113);ctx.closePath();ctx.clip();if(i%2)ctx.scale(1,-1);const noise=Math.sin((seed+1)*127.1+n*311.7)*43758.5453;const sx=(.14+(noise-Math.floor(noise))*.19)*image.naturalWidth;ctx.drawImage(image,sx,.2*image.naturalHeight,.2*image.naturalWidth,.2*image.naturalHeight,0,-.04,.17,.17);ctx.restore();}
            ctx.restore();
        }
    }
    ctx.restore();
}
