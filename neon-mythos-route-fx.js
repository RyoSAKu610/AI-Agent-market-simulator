(()=>{'use strict';
const $all=(q)=>[...document.querySelectorAll(q)];
let bubble=null,routeSvg=null,followRaf=0,activeId=null;
const css=`
#nmrBubble{position:fixed;z-index:12460;pointer-events:none;min-width:34px;height:34px;display:grid;place-items:center;border-radius:50%;border:1px solid #00e5ffaa;background:#06101df2;color:#fff;font:900 20px/1 monospace;box-shadow:0 0 18px #00e5ff66,0 8px 20px #0009;opacity:0;transform:translate(-50%,-100%) scale(.7);transition:.16s ease}
#nmrBubble.on{opacity:1;transform:translate(-50%,-100%) scale(1)}
#nmrRoute{position:fixed;inset:0;z-index:12430;pointer-events:none;width:100vw;height:100vh;overflow:visible}
.nmrGlow{fill:none;stroke:#00e5ff33;stroke-width:7;stroke-linecap:round;filter:blur(3px)}
.nmrLine{fill:none;stroke:#79f6ff;stroke-width:2;stroke-linecap:round;stroke-dasharray:7 8;filter:drop-shadow(0 0 5px #00e5ff);animation:nmrDash .55s linear infinite}
.nmrDot{fill:#fff;filter:drop-shadow(0 0 6px #00e5ff)}
@keyframes nmrDash{to{stroke-dashoffset:-30}}
`;
function ensure(){if(!document.getElementById('nmrStyle')){const s=document.createElement('style');s.id='nmrStyle';s.textContent=css;document.head.append(s)}if(!bubble){bubble=document.createElement('div');bubble.id='nmrBubble';document.body.append(bubble)}if(!routeSvg){routeSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');routeSvg.id='nmrRoute';document.body.append(routeSvg)}}
function agentEl(id){return $all('[data-agent-id]').find(el=>el.dataset.agentId===String(id))||null}
function placeBubble(id){const el=agentEl(id);if(!el||!bubble)return false;const r=el.getBoundingClientRect();bubble.style.left=(r.left+r.width/2)+'px';bubble.style.top=(r.top-4)+'px';return true}
function follow(id){cancelAnimationFrame(followRaf);activeId=id;const loop=()=>{if(activeId!==id)return;if(placeBubble(id))followRaf=requestAnimationFrame(loop)};loop()}
function icon(id,glyph,ms=800){ensure();activeId=id;bubble.textContent=glyph;bubble.classList.add('on');follow(id);setTimeout(()=>{if(activeId===id)bubble.classList.remove('on')},ms)}
function clearRoute(){if(routeSvg)routeSvg.innerHTML=''}
function route(d){ensure();const el=agentEl(d.agentId);if(!el)return;const r=el.getBoundingClientRect(),sx=r.left+r.width/2,sy=r.top+r.height/2;const tile=Number(d.tile)||32;const ex=sx+(Number(d.toX)-Number(d.fromX))*tile,ey=sy+(Number(d.toY)-Number(d.fromY))*tile;const bend=Math.max(28,Math.min(90,Math.abs(ex-sx)*.22+Math.abs(ey-sy)*.08));const cx=(sx+ex)/2,cy=Math.min(sy,ey)-bend;const path=`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;routeSvg.innerHTML=`<path class="nmrGlow" d="${path}"/><path class="nmrLine" d="${path}"/><circle class="nmrDot" cx="${ex}" cy="${ey}" r="3.5"/>`;setTimeout(clearRoute,2200)}
window.addEventListener('nm:errand-request',e=>{const d=e.detail||{};const id=d.target;if(!id)return;icon(id,'!',700);setTimeout(()=>icon(id,'💭',1000),760)});
window.addEventListener('nm:agent-routed',e=>{const d=e.detail||{};if(!d.agentId)return;icon(d.agentId,'🏃',1350);route(d)});
})();