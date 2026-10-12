(()=>{'use strict';
const THINK_ENDPOINT=''; // Set only after the dedicated Vercel Function is deployed.
const GOALS=new Set(['district_control','wealth_x3','data_hegemony','contract_network','construction','arbitrage_cycle']);
const $=(q,r=document)=>r.querySelector(q);
const fire=(name,detail={})=>window.dispatchEvent(new CustomEvent(name,{detail}));
const css=`#nmatPanel{position:fixed;left:12px;top:calc(48px + env(safe-area-inset-top));z-index:12450;width:min(380px,calc(100vw - 24px));max-height:34vh;overflow:auto;pointer-events:none;opacity:0;transform:translateY(-6px);transition:opacity .18s,transform .18s;font:11px/1.5 monospace;color:#e8faff}#nmatPanel.on{opacity:1;transform:none}#nmatPanel>div{border:1px solid #00e5ff77;border-radius:12px;background:#050817ee;padding:10px;box-shadow:0 8px 35px #0008}#nmatPanel b{color:#00e5ff}#nmatPanel .meta{color:#8599be;font-size:9px;margin-top:4px}#nmatPanel ul{margin:6px 0 0 17px;padding:0;color:#dceaff}`;
function ensure(){if(!$('#nmatStyle')){let s=document.createElement('style');s.id='nmatStyle';s.textContent=css;document.head.append(s)}if(!$('#nmatPanel')){let p=document.createElement('section');p.id='nmatPanel';p.setAttribute('aria-live','polite');p.innerHTML='<div><b>🧠 AGENT THINKING</b><p class="thought"></p><ul></ul><p class="meta"></p></div>';document.body.append(p)}return $('#nmatPanel')}
let lastAt=new Map(),active=0;
async function decide(e){
 const d=e.detail||{},task=String(d.text||d.task||'').trim();
 if(!task||!GOALS.has(d.goalKey))return;
 if(!THINK_ENDPOINT){const p=ensure();p.classList.add('on');$('.thought',p).textContent='クラウドAIは未接続です。ゲーム内の既存AIはそのまま動作します。';$('ul',p).replaceChildren();$('.meta',p).textContent='Vercelの専用APIを設定するとGroq推論を利用できます。';setTimeout(()=>p.classList.remove('on'),5000);return;}
 const now=Date.now(),key=String(d.target||'default');
 // One request per task key in a short window; do not make the simulation call a model every frame.
 if(now-(lastAt.get(key)||0)<8000)return;
 lastAt.set(key,now);
 const panel=ensure(),run=++active;
 panel.classList.add('on');
 $('.thought',panel).textContent='状況を読み込み、次の一手を考えています…';
 $('ul',panel).replaceChildren();
 $('.meta',panel).textContent='LLMが利用できない場合は既存のシミュレーション判断を継続します。';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
 try{
   const res=await fetch(THINK_ENDPOINT,{
     method:'POST',
     headers:{'Content-Type':'application/json'},
     credentials:'omit',
     cache:'no-store',
     signal:controller.signal,
     body:JSON.stringify({
       task:task.slice(0,1200),
       goal:d.goalKey,
       state:{
         target:String(d.target||'').slice(0,80),
         requestId:String(d.requestId||'').slice(0,80),
         language:document.documentElement.lang||'ja'
       }
     })
   });
   if(!res.ok)throw new Error('endpoint_'+res.status);
   const result=await res.json();
   if(run!==active)return;
   $('.thought',panel).textContent=String(result.thought||'次の行動を決めました。').slice(0,500);
   const list=$('ul',panel);(Array.isArray(result.plan)?result.plan:[]).slice(0,3).forEach((item)=>{let li=document.createElement('li');li.textContent=String(item).slice(0,160);list.append(li)});
   $('.meta',panel).textContent='SOURCE: '+String(result.source||'unknown')+' · MODEL: '+String(result.model||'rules').slice(0,80);
   // Publish a read-only thought event for future UI/log integrations.
   fire('nm:agent-thought',{target:d.target||null,goalKey:d.goalKey,requestId:d.requestId||null,thought:String(result.thought||'').slice(0,500),plan:Array.isArray(result.plan)?result.plan.slice(0,3).map(x=>String(x).slice(0,160)):[],action:String(result.action||'').slice(0,160),source:String(result.source||'rules-fallback'),model:result.model||null});
   clearTimeout(timer);
   setTimeout(()=>{if(run===active)panel.classList.remove('on')},9000);
 }catch(error){
   if(run===active){
     $('.thought',panel).textContent='外部AIは利用できません。街の既存AIが判断を続けます。';
     $('ul',panel).replaceChildren();
     $('.meta',panel).textContent='SOURCE: simulation fallback';
     setTimeout(()=>{if(run===active)panel.classList.remove('on')},4500);
   }
 }finally{clearTimeout(timer)}
}
window.addEventListener('nm:errand-request',decide);
})();