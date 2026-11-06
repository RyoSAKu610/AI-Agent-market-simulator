// NEON MYTHOS desk mode: your buddy steps out of the city and onto your desk.
// Two ways to show her:
//  - placed: the phone stands on the desk and its screen becomes a small lit room she lives in;
//  - hologram: Pepper's ghost. The phone lies flat under a clear plate tilted at 45°, the screen is
//    pure black except for her, and her reflection seems to stand on the desk.
// She talks with the browser's own voice, listens with its speech recognition where there is one,
// keeps the real time of day, knocks on the glass, stumbles when the phone tilts, and is really gone
// while she runs an errand. No camera, no account, no key. Talks to the game only through nm:* events.
(()=>{'use strict';
const KEY='neonMythos.desk.v1',BUDDY='neonMythos.buddy.v1';
const SHEETS={neon:'character-pets/neon/spritesheet.webp',kitsune:'character-pets/kitsune-x/spritesheet.webp',pixel:'character-pets/pixel/spritesheet.webp',yami:'character-pets/yami-neko/spritesheet.webp'};
const NAMES={neon:'NEON',kitsune:'KITSUNE-X',pixel:'PIXEL',yami:'YAMI-NEKO'};
const CELL_W=192,CELL_H=208;
const ANIM={idle:{row:0,frames:6,fps:6},right:{row:1,frames:8,fps:10},left:{row:2,frames:8,fps:10},wave:{row:3,frames:4,fps:6},jump:{row:4,frames:5,fps:8},failed:{row:5,frames:8,fps:8},waiting:{row:6,frames:6,fps:6},run:{row:7,frames:6,fps:8},review:{row:8,frames:6,fps:6}};
const GOALS=[[/建設|建物|開発|build|construct/i,'construction'],[/契約|同盟|network|contract|交渉/i,'contract_network'],[/データ|情報|分析|調べ|data|research/i,'data_hegemony'],[/裁定|アービ|trade|売買/i,'arbitrage_cycle'],[/収益|稼|資産|profit|earn|wealth/i,'wealth_x3']];

// ------------------------------------------------------------------ pure logic (tests/desk.test.js)

const pickOf=(list,rand)=>list[Math.min(list.length-1,Math.floor(rand()*list.length))];
const L={
  partOfDay:h=>h<5?'night':h<10?'morning':h<16?'day':h<19?'evening':'night',
  isNight:h=>h>=22||h<5,
  greeting(h,name){
    const p=L.partOfDay(h);
    if(p==='morning')return'おはよう！ '+name+'、今日もここにいるね。';
    if(p==='day')return'こんにちは。'+name+'、机の上から見てるよ。';
    if(p==='evening')return'おつかれさま。夕方の光、きれいだね。';
    return L.isNight(h)?'こんな時間まで起きてるの？ 少しだけ付き合うよ。':'こんばんは。今日はどうだった？';
  },
  goalOf(t){for(const[re,k]of GOALS)if(re.test(t))return k;return'district_control'},
  // What she says back, and what she does: wave | jump | sleep | come | leave | knock | nod | errand
  reply(text,{date=new Date(),name='NEON',rand=Math.random}={}){
    const t=String(text||'').trim(),h=date.getHours();
    if(!t)return{say:'ん？ もう一回言って。',act:'nod'};
    if(/おはよ|こんにち|こんばん|やあ|hello|\bhi\b/i.test(t))return{say:L.greeting(h,name),act:'wave'};
    if(/何時|なんじ|時間/.test(t))return{say:'いまは'+h+'時'+date.getMinutes()+'分だよ。',act:'nod'};
    if(/おやすみ|寝る|ねる/.test(t))return{say:'おやすみ。何かあったら、とんとんして起こしてね。',act:'sleep'};
    if(/して|やって|お願い|おねがい|頼む|たのむ|任せ|まかせ|行って|いって|調べ/.test(t))return{say:'まかせて！ ちょっと考えるね。',act:'errand',goalKey:L.goalOf(t)};
    if(/おいで|こっち|来て|きて/.test(t))return{say:'はーい、いま行く！',act:'come'};
    if(/バイバイ|ばいばい|またね|さよなら/.test(t))return{say:'またね。呼んだらすぐ来るよ。',act:'leave'};
    if(/ノック|とんとん|コンコン/.test(t))return{say:'こんこん。聞こえる？',act:'knock'};
    if(/かわいい|可愛|好き|すき|ありがと|えらい|すごい/.test(t))return{say:pickOf(['えへへ、うれしい。','ほんと？ ありがとう！','照れるなあ…'],rand),act:'jump'};
    return{say:pickOf(['うんうん。','なるほどね。','それ、もっと聞かせて。','ふふ、そうなんだ。'],rand),act:'nod'};
  },
  // What she does on her own when nobody talks to her for a while.
  pickIdle(rand,{night=false}={}){
    const w=night?[['idle',5],['waiting',3],['wander',1],['sleep',4]]:[['idle',3],['wander',4],['review',2],['waiting',2],['wave',1],['jump',1],['knock',1],['peek',1]];
    let r=rand()*w.reduce((a,x)=>a+x[1],0);
    for(const[k,n]of w){if((r-=n)<0)return k}
    return'idle';
  },
  // Sideways tilt (deviceorientation gamma, degrees) against the pose the phone had when she arrived.
  tilt(gamma,base){const d=(gamma||0)-(base||0);return d>24?'right':d<-24?'left':null},
  shaken:a=>Math.hypot(a&&a.x||0,a&&a.y||0,a&&a.z||0)>22,
  // Pepper's ghost shows the screen through a mirror: by default the picture is flipped top to bottom.
  flipCss:(mode,fx,fy)=>mode!=='hologram'?'none':'scale('+(fx?-1:1)+','+(fy?-1:1)+')'
};
if(typeof module==='object'&&module.exports)module.exports=L;
if(typeof document==='undefined')return;

// ------------------------------------------------------------------ settings and the buddy

const $=(q,r=document)=>r.querySelector(q),fire=(n,d={})=>dispatchEvent(new CustomEvent(n,{detail:d}));
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const opts=Object.assign({mode:'placed',flipX:false,flipY:true,muted:false,notify:false},load(KEY,{}));
function who(){const b=load(BUDDY,null),sprite=b&&SHEETS[b.spriteId]?b.spriteId:'neon';return{id:b&&b.id||sprite,name:b?(b.name||'MY BUDDY'):NAMES[sprite],sprite,isBuddy:!!b}}

const css=`#nmdDesk{position:fixed;inset:0;z-index:13500;background:#000;touch-action:none;user-select:none;-webkit-user-select:none;font-family:monospace;color:#e8f7ff}
#nmdDesk canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.nmdBar{position:absolute;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;gap:6px;width:min(560px,calc(100vw - 16px));transition:opacity .35s}
.nmdBar.off{opacity:0;pointer-events:none}
.nmdBar button,.nmdSay button{min-height:40px;padding:0 11px;border:1px solid #00e5ff77;border-radius:12px;background:#050a18d9;color:#dff8ff;font:800 12px monospace}
.nmdBar button[aria-pressed=true]{border-color:#ffd76b;color:#ffd76b}
.nmdSay{position:absolute;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);display:none;gap:6px;width:min(480px,calc(100vw - 20px))}
.nmdSay.on{display:flex}.nmdSay input{flex:1;min-width:0;min-height:42px;border:1px solid #00e5ff77;border-radius:12px;background:#050a18ee;color:#fff;padding:0 11px;font:14px monospace}
.nmdHelp{position:absolute;inset:0;display:none;place-items:center;background:#000d;padding:16px}.nmdHelp.on{display:grid}
.nmdHelp>div{width:min(460px,100%);max-height:88dvh;overflow:auto;border:1px solid #00e5ff77;border-radius:16px;background:#060b19;padding:16px;font:12px/1.7 monospace}
.nmdHelp b{color:#00e5ff}.nmdHelp svg{display:block;width:100%;max-width:300px;margin:8px auto}.nmdHelp button{width:100%;min-height:42px;margin-top:8px;border:1px solid #00e5ff;border-radius:12px;background:#00e5ff18;color:#fff;font:800 13px monospace}
.nmdStart{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#10204a,#000 70%);text-align:center;padding:20px}
.nmdStart b{display:block;font:900 22px monospace;color:#00e5ff;margin-bottom:8px}.nmdStart p{color:#9db3d6;font-size:12px;line-height:1.7}
.nmdStart button{margin-top:14px;min-height:52px;padding:0 22px;border:1px solid #00e5ff;border-radius:14px;background:#00e5ff22;color:#fff;font:900 15px monospace}`;

// ------------------------------------------------------------------ sound: small synthesized noises, no files

let audio=null;
function ac(){if(!audio){const A=window.AudioContext||window.webkitAudioContext;if(A)audio=new A()}if(audio&&audio.state==='suspended')audio.resume();return audio}
function tone(freq,dur,{type='sine',vol=.05,slide=0}={}){
  if(opts.muted)return;const a=ac();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(a.destination);o.start(t);o.stop(t+dur+.02);
}
const sfx={
  step:()=>tone(150+Math.random()*40,.05,{type:'triangle',vol:.035}),
  knock:()=>{tone(190,.09,{type:'square',vol:.07,slide:-80});setTimeout(()=>tone(180,.09,{type:'square',vol:.07,slide:-80}),170)},
  chime:()=>[880,1320,1760].forEach((f,i)=>setTimeout(()=>tone(f,.35,{vol:.035}),i*90)),
  land:()=>tone(110,.12,{type:'sine',vol:.08,slide:-50}),
  pop:()=>tone(660,.08,{type:'triangle',vol:.05,slide:300})
};
const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch{}};

// ------------------------------------------------------------------ voice

let voice=null;
function pickVoice(){const vs=window.speechSynthesis?speechSynthesis.getVoices():[];voice=vs.find(v=>/ja[-_]JP/i.test(v.lang)&&/female|kyoko|nanami|haruka|google/i.test(v.name))||vs.find(v=>/^ja/i.test(v.lang))||null}
if(window.speechSynthesis){pickVoice();speechSynthesis.addEventListener?.('voiceschanged',pickVoice)}

// ------------------------------------------------------------------ desk state

let root=null,bar=null,canvas=null,ctx=null,img=null,foot=.95,raf=0,last=0,W=0,H=0,dpr=1;
let me=who(),hideBarAt=0,wake=null,tiltBase=null,lastMotionAt=0,lastTalkAt=0,nextIdleAt=0;
const her={x:.5,tx:.5,dir:1,anim:'idle',t:0,scale:1,ts:1,alpha:0,state:'gone',hold:0,frozen:false,y:0};
const fx={particles:[],ripples:[],shake:0,bubble:null,talking:false,talkPulse:0,zz:0,dizzy:0};
const queue=[];

function setAnim(a,hold=0){if(her.anim!==a){her.anim=a;her.t=0}her.hold=hold}
function say(text){
  fx.bubble={text,start:performance.now(),shown:0,until:Infinity};lastTalkAt=performance.now();
  const done=()=>{fx.talking=false;if(fx.bubble&&fx.bubble.text===text){fx.bubble.shown=text.length;fx.bubble.until=performance.now()+2600}};
  if(opts.muted||!window.speechSynthesis){fx.talking=true;setTimeout(done,600+text.length*110);return}
  try{
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';if(voice)u.voice=voice;u.pitch=1.3;u.rate=1.05;
    u.onstart=()=>{fx.talking=true};u.onboundary=e=>{if(fx.bubble)fx.bubble.shown=Math.max(fx.bubble.shown,e.charIndex+(e.charLength||1));fx.talkPulse=1};
    u.onend=done;u.onerror=done;fx.talking=true;speechSynthesis.speak(u);
  }catch{done()}
}
function sparkle(n,x,y,spread){for(let i=0;i<n;i++)fx.particles.push({x:x+(Math.random()-.5)*spread,y:y+(Math.random()-.5)*spread,vx:(Math.random()-.5)*60,vy:-20-Math.random()*70,life:1,hue:Math.random()<.5?185:320})}

// Scripted moves. Each step runs until it reports it is done.
function act(name,arg){
  queue.length=0;
  const go=(tx,speed=.33)=>({run(dt){const d=tx-her.x;her.dir=d>=0?1:-1;setAnim(d>=0?'right':'left');const s=speed*dt;if(Math.abs(d)<=s){her.x=tx;return true}her.x+=Math.sign(d)*s;if(Math.random()<dt*7)sfx.step();return false}});
  const pose=(a,ms,then)=>{let t=0;return{run(dt){if(!t)setAnim(a);t+=dt*1000;if(t>=ms){then&&then();return true}return false}}};
  const once=fn=>({run(){fn();return true}});
  if(name==='appear'){her.state='here';her.x=.5;her.alpha=0;queue.push(once(()=>{sparkle(40,W*.5,feetY()-charH()*.5,charH()*.8);sfx.chime()}),{run(dt){her.alpha=Math.min(1,her.alpha+dt*1.4);setAnim('jump');return her.alpha>=1}},once(sfx.land),pose('wave',1400),pose('idle',10))}
  else if(name==='leave'){const side=arg||(her.x<.5?-.35:1.35);queue.push(pose('wave',900),go(side,.45),once(()=>{her.state='away';her.alpha=0}))}
  else if(name==='errand-out'){queue.push(pose('jump',600),go(1.35,.55),once(()=>{her.state='away'}))}
  else if(name==='return'){her.state='here';her.alpha=1;her.x=-.35;queue.push(go(.45,.5),once(sfx.land),pose('jump',700),pose('idle',10))}
  else if(name==='come'){queue.push(go(.5),pose('wave',900))}
  else if(name==='wander'){queue.push(go(.18+Math.random()*.64,.22),pose('idle',1500))}
  else if(name==='peek'){const side=Math.random()<.5;queue.push(go(side?-.32:1.32,.4),pose('idle',700),go(side?-.03:1.03,.25),pose('review',1600),go(.3+Math.random()*.4,.3))}
  else if(name==='knock'){queue.push(go(.5,.3),{run(dt){her.ts=1.45;setAnim('wave');return Math.abs(her.scale-her.ts)<.02}},once(()=>{sfx.knock();buzz([25,140,25]);fx.shake=.25;const p=headPoint();fx.ripples.push({x:p.x,y:p.y,r:0,life:1},{x:p.x,y:p.y,r:-25,life:1.2})}),pose('wave',1100),once(()=>{her.ts=1}),pose('idle',600))}
  else if(name==='stumble'){const d=arg==='left'?-1:1;queue.push(pose('failed',300),{run(dt){her.x=Math.max(.08,Math.min(.92,her.x+d*.5*dt));setAnim('failed');return(d>0&&her.x>=.9)||(d<0&&her.x<=.1)||Math.random()<dt*2.2}},pose('failed',500),once(sfx.land),pose('idle',10))}
  else if(name==='dizzy'){queue.push(once(()=>{fx.zz=0;fx.dizzy=2.4}),pose('failed',2400),pose('idle',10))}
  else if(name==='sleep'){queue.push(go(.5,.25),once(()=>{her.frozen=true;setAnim('idle')}))}
  else if(name==='wake'){her.frozen=false;queue.push(pose('jump',600),pose('idle',10))}
  else if(ANIM[name])queue.push(pose(name,name==='jump'?650:name==='wave'?1300:1800),pose('idle',10));
  else if(name==='nod')queue.push(pose('waiting',900),pose('idle',10));
}

// ------------------------------------------------------------------ talking to her

function hear(text){
  const r=L.reply(text,{name:me.name});
  if(her.frozen){act('wake')}
  if(her.state!=='here'&&r.act!=='errand'){bringBack();setTimeout(()=>say(r.say),1600);return}
  say(r.say);
  if(r.act==='errand')errand(text,r.goalKey);
  else if(r.act==='leave')setTimeout(()=>act('leave'),900);
  else act(r.act==='come'?'come':r.act==='sleep'?'sleep':r.act);
}
let errandOut=null;
// iOS only lets a page speak after it has spoken once inside a tap.
function unlockVoice(){try{if(window.speechSynthesis&&!opts.muted){const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u)}}catch{}}
function errand(text,goalKey){
  const requestId='desk-'+Date.now().toString(36),detail={target:me.id,goalKey,text,requestId,handled:false};
  errandOut={requestId,goalKey,text,at:Date.now()};
  act('nod');
  fire('nm:errand-request',detail);
  setTimeout(()=>{if(!detail.handled){fire('nm:ltt-command',{target:me.id,goalKey,text,requestId});setTimeout(departNow,1500)}},4200);
}
function departNow(){if(!errandOut||her.state!=='here')return;say('行ってくるね。終わったら戻ってくる！');setTimeout(()=>act('errand-out'),1500)}
function bringBack(line){if(her.state==='here')return;act('return');setTimeout(()=>say(line||(errandOut?'まだ途中だけど、ちょっと顔を見に戻ってきたよ。':'ただいま！')),1400)}
function report(d){
  const line=(d.kind==='done'?'おつかい、終わったよ！ ':'途中報告だよ。')+(d.goalLabel?d.goalLabel+'、':'')+(d.kind==='done'?'ちゃんとやってきた。':'順調に進んでる。');
  if(her.state!=='here')bringBack(line);else say(line);
  if(d.kind==='done')errandOut=null;
  if(document.hidden&&opts.notify&&'Notification'in window&&Notification.permission==='granted'){
    const show=r=>r?r.showNotification(me.name+' が戻ってきた',{body:line,icon:'./pwa-icon.svg',tag:'nm-desk'}):new Notification(me.name+' が戻ってきた',{body:line});
    (navigator.serviceWorker?navigator.serviceWorker.getRegistration().then(show):Promise.resolve(show(null))).catch(()=>{});
  }
}
addEventListener('nm:route-agent',e=>{const d=e.detail||{};if(root&&errandOut&&(!d.requestId||d.requestId===errandOut.requestId))departNow()});
addEventListener('nm:agent-routed',e=>{const d=e.detail||{};if(errandOut&&d.requestId===errandOut.requestId)errandOut.agentId=d.agentId||null});
addEventListener('nm:ltt-event',e=>{const d=e.detail||{};if(!root||!errandOut)return;if(errandOut.agentId&&d.agentId&&d.agentId!==errandOut.agentId)return;if(d.kind==='milestone'||d.kind==='done')report(d)});

function listen(){
  const R=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!R){const f=$('.nmdSay',root);f.classList.add('on');$('input',f).focus();return}
  try{const r=new R();r.lang='ja-JP';r.interimResults=false;r.onresult=e=>hear(e.results[0][0].transcript);r.onerror=()=>{const f=$('.nmdSay',root);f.classList.add('on')};r.start();setAnim('review',1);say('うん、聞いてるよ。')}catch{$('.nmdSay',root).classList.add('on')}
}

// ------------------------------------------------------------------ the phone itself: tilt and shake

function onOrient(e){
  if(!root||her.state!=='here')return;
  if(tiltBase==null){tiltBase=e.gamma||0;return}
  const now=performance.now();if(now-lastMotionAt<2500)return;
  const s=L.tilt(e.gamma,tiltBase);if(s){lastMotionAt=now;act('stumble',s);say(s==='left'?'わっ、傾いてる！':'おっとっと！')}
}
function onMotion(e){
  if(!root||her.state!=='here')return;const now=performance.now();if(now-lastMotionAt<3000)return;
  if(L.shaken(e.acceleration)){lastMotionAt=now;act('dizzy');say('め、目が回る〜');buzz(60)}
}
async function askMotion(){
  try{if(window.DeviceMotionEvent&&typeof DeviceMotionEvent.requestPermission==='function')await DeviceMotionEvent.requestPermission()}catch{}
  try{if(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function')await DeviceOrientationEvent.requestPermission()}catch{}
  addEventListener('deviceorientation',onOrient);addEventListener('devicemotion',onMotion);
}

// ------------------------------------------------------------------ drawing

const floorY=()=>opts.mode==='hologram'?H*.9:H*.84;
const charH=()=>Math.min(H*(opts.mode==='hologram'?.5:.42),W*.62)*her.scale;
const feetY=()=>floorY()+(her.scale-1)*H*.08;
function headPoint(){return{x:her.x*W,y:feetY()-charH()*.62}}
const SKY={morning:['#3b2d55','#e7a36a'],day:['#2c5d9a','#9fd2ff'],evening:['#3a1f4a','#ff8a5c'],night:['#03050d','#1a2550']};

function drawRoom(now){
  const p=L.partOfDay(new Date().getHours()),[s1,s2]=SKY[p],fy=floorY(),back=H*.58;
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#070b17');g.addColorStop(1,'#0d1426');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // back wall with a window onto the real sky outside
  const bx=W*.14,bw=W*.72;ctx.fillStyle='#0b1120';ctx.fillRect(bx,H*.06,bw,back-H*.06);
  const wx=bx+bw*.58,wy=H*.13,ww=bw*.3,wh=(back-H*.06)*.42,sky=ctx.createLinearGradient(0,wy,0,wy+wh);sky.addColorStop(0,s1);sky.addColorStop(1,s2);
  ctx.fillStyle=sky;ctx.fillRect(wx,wy,ww,wh);
  if(p==='night'){ctx.fillStyle='#f4f1d0';ctx.beginPath();ctx.arc(wx+ww*.7,wy+wh*.3,Math.min(ww,wh)*.12,0,7);ctx.fill();for(let i=0;i<9;i++){ctx.fillStyle='rgba(255,255,255,'+(.3+.3*Math.sin(now/700+i))+')';ctx.fillRect(wx+((i*37)%97)/97*ww,wy+((i*53)%89)/89*wh*.8,2,2)}}
  else{ctx.fillStyle=p==='evening'?'#ffcf7a':'#fff4c2';ctx.beginPath();ctx.arc(wx+ww*.3,wy+wh*(p==='morning'?.75:p==='evening'?.8:.3),Math.min(ww,wh)*.13,0,7);ctx.fill()}
  ctx.strokeStyle='#00e5ff44';ctx.lineWidth=2;ctx.strokeRect(wx,wy,ww,wh);ctx.beginPath();ctx.moveTo(wx+ww/2,wy);ctx.lineTo(wx+ww/2,wy+wh);ctx.stroke();
  // side walls and the desk-top floor, in perspective
  ctx.strokeStyle='#00e5ff2a';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(bx,H*.06);ctx.moveTo(W,0);ctx.lineTo(bx+bw,H*.06);ctx.moveTo(0,H);ctx.lineTo(bx,back);ctx.moveTo(W,H);ctx.lineTo(bx+bw,back);ctx.stroke();
  const fl=ctx.createLinearGradient(0,back,0,H);fl.addColorStop(0,'#1b1a2a');fl.addColorStop(1,'#2a2233');ctx.fillStyle=fl;ctx.beginPath();ctx.moveTo(bx,back);ctx.lineTo(bx+bw,back);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ffffff0d';for(let i=1;i<6;i++){const t=i/6,y=back+(H-back)*t*t;ctx.beginPath();ctx.moveTo(bx*(1-t*t),y);ctx.lineTo(W-(W-bx-bw)*(1-t*t)-0,y);ctx.stroke()}
  // the light falls where she stands; a desk lamp at night
  const lx=her.state==='here'?her.x*W:W*.5,light=ctx.createRadialGradient(lx,fy-H*.15,10,lx,fy-H*.1,H*.55);
  light.addColorStop(0,p==='night'?'rgba(255,214,150,.20)':'rgba(170,220,255,.13)');light.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=light;ctx.fillRect(0,0,W,H);
  const v=ctx.createRadialGradient(W/2,H*.55,Math.min(W,H)*.3,W/2,H*.55,Math.max(W,H)*.75);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.6)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
}

function frameOf(now){const a=ANIM[her.anim]||ANIM.idle;return her.frozen?0:Math.floor(her.t*a.fps)%a.frames}
function drawHer(now){
  if(!img||!img.complete||her.state==='gone'||her.state==='away'&&her.alpha<=0)return;
  const a=ANIM[her.anim]||ANIM.idle,f=frameOf(now),h=charH(),w=h*CELL_W/CELL_H,cx=her.x*W,fy=feetY();
  const talkBob=fx.talking?Math.abs(Math.sin(now/90))*h*.018+fx.talkPulse*h*.01:0,breathe=her.frozen?Math.sin(now/900)*h*.006:Math.sin(now/700)*h*.008;
  const top=fy-h*foot-talkBob+breathe*.3,sy=1+(her.frozen?0:Math.sin(now/700)*.012);
  if(opts.mode!=='hologram'){
    // contact shadow, then a faint reflection on the desk
    ctx.save();ctx.globalAlpha=.55*her.alpha;const sh=ctx.createRadialGradient(cx,fy,2,cx,fy,w*.42);sh.addColorStop(0,'rgba(0,0,0,.75)');sh.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sh;ctx.beginPath();ctx.ellipse(cx,fy,w*.42,w*.1,0,0,7);ctx.fill();ctx.restore();
    ctx.save();ctx.globalAlpha=.12*her.alpha;ctx.translate(cx,fy);ctx.scale(1,-.45);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,f*CELL_W,a.row*CELL_H,CELL_W,CELL_H,-w/2,-h*foot,w,h);ctx.restore();
  }else{
    ctx.save();ctx.globalAlpha=.7*her.alpha;ctx.strokeStyle='#5ff6ff';ctx.lineWidth=2;ctx.shadowColor='#00e5ff';ctx.shadowBlur=18;ctx.beginPath();ctx.ellipse(cx,fy,w*.36,w*.07,0,0,7);ctx.stroke();ctx.restore();
  }
  ctx.save();ctx.globalAlpha=her.alpha*(opts.mode==='hologram'?.92+.08*Math.sin(now/53):1);ctx.imageSmoothingEnabled=false;
  if(opts.mode==='hologram'){ctx.shadowColor='#00e5ff';ctx.shadowBlur=22}
  if(her.frozen)ctx.filter='brightness(.75)';
  ctx.translate(cx,top+h*foot);ctx.scale(1,sy);ctx.drawImage(img,f*CELL_W,a.row*CELL_H,CELL_W,CELL_H,-w/2,-h*foot,w,h);ctx.restore();
  if(opts.mode==='hologram'){ctx.save();ctx.globalAlpha=.18;ctx.fillStyle='#000';for(let y=top;y<fy;y+=4)ctx.fillRect(cx-w/2,y,w,1.5);ctx.restore()}
  if(her.frozen){fx.zz+=.016;ctx.save();ctx.fillStyle='#bfe9ff';ctx.font='bold '+Math.round(h*.09)+'px monospace';for(let i=0;i<3;i++){const t=(fx.zz+i/3)%1;ctx.globalAlpha=1-t;ctx.fillText('z',cx+w*.25+t*w*.2,top+h*.25-t*h*.3)}ctx.restore()}
  if(fx.dizzy>0){ctx.save();ctx.fillStyle='#ffd76b';ctx.font=Math.round(h*.08)+'px sans-serif';for(let i=0;i<3;i++){const ang=now/250+i*2.1;ctx.fillText('★',cx+Math.cos(ang)*w*.28-8,top+h*.12+Math.sin(ang)*h*.04)}ctx.restore()}
}
function wrap(text,max){const out=[];let line='';for(const ch of text){if(ctx.measureText(line+ch).width>max&&line){out.push(line);line=ch}else line+=ch}if(line)out.push(line);return out.slice(0,4)}
function drawBubble(now){
  const b=fx.bubble;if(!b||her.state!=='here')return;if(now>b.until){fx.bubble=null;return}
  const shown=Math.min(b.text.length,Math.max(b.shown,Math.floor((now-b.start)/75)));const text=b.text.slice(0,shown);if(!text)return;
  const fs=Math.round(Math.max(13,Math.min(20,W*.038)));ctx.font='bold '+fs+'px sans-serif';
  const maxW=Math.min(W*.8,fs*16),lines=wrap(text,maxW-fs),bw=Math.min(maxW,Math.max(...lines.map(l=>ctx.measureText(l).width))+fs*1.4),bh=lines.length*fs*1.35+fs*.9;
  const hp=headPoint(),x=Math.max(8,Math.min(W-bw-8,hp.x-bw/2)),y=Math.max(8+(opts.mode==='hologram'?0:52),hp.y-charH()*.55-bh);
  ctx.save();ctx.globalAlpha=Math.min(1,(b.until-now)/400);
  ctx.fillStyle=opts.mode==='hologram'?'rgba(0,30,40,.85)':'rgba(8,14,30,.92)';ctx.strokeStyle='#00e5ff';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,bw,bh,12):ctx.rect(x,y,bw,bh);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(hp.x-8,y+bh);ctx.lineTo(hp.x,y+bh+10);ctx.lineTo(hp.x+8,y+bh);ctx.fill();
  ctx.fillStyle='#fff';lines.forEach((l,i)=>ctx.fillText(l,x+fs*.7,y+fs*1.15+i*fs*1.35));ctx.restore();
}
function drawFx(dt){
  for(const p of fx.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=30*dt;p.life-=dt*.8}fx.particles=fx.particles.filter(p=>p.life>0);
  ctx.save();ctx.globalCompositeOperation='lighter';for(const p of fx.particles){ctx.globalAlpha=p.life;ctx.fillStyle='hsl('+p.hue+',100%,70%)';ctx.fillRect(p.x,p.y,3,3)}ctx.restore();
  for(const r of fx.ripples){r.r+=dt*160;r.life-=dt*1.3}fx.ripples=fx.ripples.filter(r=>r.life>0);
  ctx.save();ctx.strokeStyle='#bff7ff';for(const r of fx.ripples){if(r.r<0)continue;ctx.globalAlpha=Math.max(0,r.life);ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,7);ctx.stroke()}ctx.restore();
}
function drawAway(now){
  if(her.state!=='away'||opts.mode==='hologram')return;
  const x=W*.5,y=floorY()-6,fs=Math.round(Math.max(12,W*.03));ctx.save();ctx.translate(x,y);ctx.rotate(-.05);
  ctx.fillStyle='#ffe98a';ctx.fillRect(-fs*5,-fs*2.6,fs*10,fs*2.6);ctx.fillStyle='#3a2a10';ctx.font='bold '+fs+'px sans-serif';ctx.textAlign='center';
  ctx.fillText('おつかい中 📦',0,-fs*1.45);ctx.font=Math.round(fs*.75)+'px sans-serif';ctx.fillText('タップで呼び戻す',0,-fs*.5);ctx.restore();
}

function tick(now){
  raf=requestAnimationFrame(tick);if(!ctx)return;
  const dt=Math.min(.05,(now-(last||now))/1000);last=now;
  her.t+=dt;her.scale+=(her.ts-her.scale)*Math.min(1,dt*6);fx.talkPulse=Math.max(0,fx.talkPulse-dt*4);if(fx.dizzy>0)fx.dizzy-=dt;
  if(her.hold>0)her.hold-=dt;
  if(queue.length){if(queue[0].run(dt))queue.shift()}
  else if(her.state==='here'&&!her.frozen&&now>nextIdleAt&&!fx.talking){
    const night=L.isNight(new Date().getHours()),pick=L.pickIdle(Math.random,{night});
    if(pick==='sleep'&&now-lastTalkAt<60000)act('idle');else act(pick);
    nextIdleAt=now+5000+Math.random()*7000;
  }
  if(her.state==='here'&&!queue.length&&her.hold<=0&&!['idle','waiting','review'].includes(her.anim)&&!her.frozen)setAnim('idle');
  if(now>hideBarAt)bar.classList.add('off');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(opts.mode==='hologram'){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H)}else drawRoom(now);
  if(fx.shake>0){fx.shake-=dt;ctx.translate((Math.random()-.5)*6,(Math.random()-.5)*6)}
  drawAway(now);drawHer(now);drawFx(dt);drawBubble(now);
}

// ------------------------------------------------------------------ open, close, controls

function size(){if(!canvas)return;dpr=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr)}
function applyMode(){
  canvas.style.transform=L.flipCss(opts.mode,opts.flipX,opts.flipY);save(KEY,opts);
  const b=root.querySelectorAll('.nmdBar button');b.forEach(x=>{const k=x.dataset.k;if(k==='mode')x.textContent=opts.mode==='hologram'?'🪞 ホログラム':'🖼 置き型';if(k==='flipY'||k==='flipX'){x.hidden=opts.mode!=='hologram';x.setAttribute('aria-pressed',String(!!opts[k]))}if(k==='mute'){x.textContent=opts.muted?'🔇':'🔊';x.setAttribute('aria-pressed',String(opts.muted))}if(k==='notify')x.setAttribute('aria-pressed',String(!!opts.notify))});
}
function showBar(){hideBarAt=performance.now()+5000;bar.classList.remove('off')}
function hit(px,py){
  // the canvas may be flipped for the hologram; map the tap back into drawing space
  let x=px,y=py;if(opts.mode==='hologram'){if(opts.flipX)x=W-x;if(opts.flipY)y=H-y}
  const h=charH(),w=h*CELL_W/CELL_H,cx=her.x*W,fy=feetY();return her.state==='here'&&Math.abs(x-cx)<w*.4&&y>fy-h*.95&&y<fy+h*.05;
}
function onTap(e){
  if(e.target!==canvas)return;ac();
  if(her.state==='away'){bringBack();return}
  if(hit(e.clientX,e.clientY)){
    if(her.frozen){act('wake');say('ふぁ…おはよ。');return}
    const r=Math.random();if(r<.4){act('jump');sfx.pop();say(L.reply('かわいい',{name:me.name}).say)}else if(r<.7){act('wave');say('なあに？ 呼んだ？')}else{act('knock');say('ここ、ガラスの向こうだよ。')}
    lastTalkAt=performance.now();return;
  }
  showBar();
}
function help(){
  const box=$('.nmdHelp',root);box.classList.add('on');
  box.innerHTML='<div><b>🪞 ホログラム（ペッパーズゴースト）の作り方</b><p>1. スマホを<b>画面を上にして、上の辺を奥に向けて</b>机に置く。画面の明るさを最大に、部屋は少し暗く。<br>2. 透明な板（アクリル板、CDケースのふた、クリアファイルを厚紙で支えたもの）を、スマホの上に<b>45°</b>で立てる。板の下の辺をスマホの奥側に置き、上の辺が手前（自分の側）に倒れかかる向き。<br>3. 板を正面から見ると、キャラが板の奥に立って見えます。<br>4. 逆さまや鏡文字に見えたら、上のバーの「⇅」「⇆」で直してください。</p>'+
  '<svg viewBox="0 0 300 150" role="img" aria-label="横から見た図：机の上にスマホ、その上に45度の板、左に目"><rect x="0" y="128" width="300" height="22" fill="#2a2233"/><rect x="110" y="120" width="130" height="8" rx="2" fill="#00e5ff"/><text x="175" y="146" fill="#9db3d6" font-size="10" text-anchor="middle">スマホ（画面が上）</text><line x1="235" y1="120" x2="140" y2="25" stroke="#bff7ff" stroke-width="4"/><text x="120" y="18" fill="#bff7ff" font-size="10">透明な板 45°</text><circle cx="30" cy="70" r="9" fill="#ffd76b"/><text x="30" y="98" fill="#ffd76b" font-size="10" text-anchor="middle">あなた</text><line x1="40" y1="70" x2="240" y2="74" stroke="#ffd76b" stroke-dasharray="4 4"/><rect x="241" y="44" width="22" height="74" rx="9" fill="none" stroke="#00e5ff" stroke-dasharray="3 3"/><text x="252" y="36" fill="#00e5ff" font-size="10" text-anchor="middle">ここに見える</text></svg>'+
  '<p><b>置き型</b>：スマホをスタンドで立てて机に置くと、画面の中の小部屋にいるように見えます。</p><p>カメラは使いません。声の読み上げと聞き取りはブラウザの機能で、無料です。傾けたり振ったりすると反応します（iPhone は最初に許可が必要です）。</p><button type="button">閉じる</button></div>';
  $('button',box).onclick=()=>box.classList.remove('on');
}
async function open(fromGesture=true){
  if(root)return;me=who();
  if(!$('#nmdStyle')){const s=document.createElement('style');s.id='nmdStyle';s.textContent=css;document.head.append(s)}
  root=document.createElement('section');root.id='nmdDesk';root.setAttribute('aria-label','机モード');
  root.innerHTML='<canvas></canvas><div class="nmdBar"><button type="button" data-k="close" aria-label="閉じる">✕</button><button type="button" data-k="mode"></button><button type="button" data-k="flipY" title="上下反転">⇅</button><button type="button" data-k="flipX" title="左右反転">⇆</button><button type="button" data-k="talk">🎙 話す</button><button type="button" data-k="mute"></button><button type="button" data-k="notify" title="帰ってきたら通知">🔔</button><button type="button" data-k="help">？</button></div><form class="nmdSay"><input maxlength="120" placeholder="話しかける（例：おはよう／データを調べてきて）" aria-label="話しかける"><button>送る</button></form><div class="nmdHelp"></div>';
  document.body.append(root);bar=$('.nmdBar',root);canvas=$('canvas',root);ctx=canvas.getContext('2d');size();addEventListener('resize',size);
  img=new Image();img.onload=()=>{foot=footRatio(img)};img.src=SHEETS[me.sprite];
  root.addEventListener('pointerup',onTap);
  bar.addEventListener('click',async e=>{const k=e.target.closest('button')?.dataset.k;if(!k)return;showBar();ac();
    if(k==='close')close();else if(k==='mode'){opts.mode=opts.mode==='hologram'?'placed':'hologram';applyMode();if(opts.mode==='hologram'&&!load(KEY+'.seen',false)){save(KEY+'.seen',true);help()}}
    else if(k==='flipY'||k==='flipX'){opts[k]=!opts[k];applyMode()}else if(k==='mute'){opts.muted=!opts.muted;if(opts.muted&&window.speechSynthesis)speechSynthesis.cancel();applyMode()}
    else if(k==='notify'){if(!opts.notify&&'Notification'in window){try{await Notification.requestPermission()}catch{}opts.notify=Notification.permission==='granted'}else opts.notify=false;applyMode()}
    else if(k==='talk')listen();else if(k==='help')help()});
  $('.nmdSay',root).addEventListener('submit',e=>{e.preventDefault();const i=$('input',e.target),v=i.value.trim();if(v){hear(v);i.value=''}});
  applyMode();last=0;raf=requestAnimationFrame(tick);showBar();
  const begin=()=>{ac();unlockVoice();askMotion();keepAwake();act('appear');setTimeout(()=>say(L.greeting(new Date().getHours(),me.name)+(me.isBuddy?'':' 相棒を作ると、その子が来るよ。')),900);nextIdleAt=performance.now()+9000};
  if(fromGesture)begin();
  else{const st=document.createElement('div');st.className='nmdStart';st.innerHTML='<div><b>🪞 机モード</b><p>スマホを机に置くか、ホログラムの板の下に寝かせてから、<br>タップして呼んでください。</p><button type="button">タップして呼ぶ</button></div>';root.append(st);$('button',st).onclick=()=>{st.remove();begin()}}
}
function close(){
  if(!root)return;cancelAnimationFrame(raf);if(window.speechSynthesis)speechSynthesis.cancel();
  removeEventListener('resize',size);removeEventListener('deviceorientation',onOrient);removeEventListener('devicemotion',onMotion);
  try{wake&&wake.release()}catch{}wake=null;try{document.fullscreenElement&&document.exitFullscreen()}catch{}
  root.remove();root=bar=canvas=ctx=null;queue.length=0;Object.assign(her,{state:'gone',alpha:0,scale:1,ts:1,frozen:false});tiltBase=null;
}
async function keepAwake(){try{if(navigator.wakeLock)wake=await navigator.wakeLock.request('screen')}catch{}try{if(root&&root.requestFullscreen&&!document.fullscreenElement)await root.requestFullscreen({navigationUI:'hide'})}catch{}}
document.addEventListener('visibilitychange',()=>{if(root&&!document.hidden&&!wake)keepAwake()});
// Where her feet are in the cell: the lowest opaque row of the first idle frame.
function footRatio(im){try{const c=document.createElement('canvas');c.width=CELL_W;c.height=CELL_H;const x=c.getContext('2d');x.drawImage(im,0,0,CELL_W,CELL_H,0,0,CELL_W,CELL_H);const d=x.getImageData(0,0,CELL_W,CELL_H).data;for(let y=CELL_H-1;y>0;y--)for(let i=0;i<CELL_W;i++)if(d[(y*CELL_W+i)*4+3]>40)return(y+1)/CELL_H}catch{}return .95}

// ------------------------------------------------------------------ the ways in

function button(){const b=document.createElement('button');b.type='button';b.className='nmxP';b.dataset.nmDesk='1';b.textContent='🪞 机に呼ぶ（ホログラムも）';b.style.marginTop='7px';b.onclick=()=>{const hub=$('#nmxHub');if(hub)hub.classList.remove('on');open(true)};return b}
function mount(){
  const pane=document.querySelector('#nmxHub [data-pane=buddy]');if(!pane)return false;
  const add=()=>{if(!pane.querySelector('[data-nm-desk]'))pane.append(button())};add();
  new MutationObserver(add).observe(pane,{childList:true});return true;
}
function init(){
  if(!mount()){const mo=new MutationObserver(()=>{if(mount())mo.disconnect()});mo.observe(document.body,{childList:true,subtree:true})}
  const q=new URLSearchParams(location.search);if(q.has('desk')||location.hash==='#desk'){sessionStorage.setItem('neonMythos.quickLaunched','1');setTimeout(()=>open(false),300)}
}
addEventListener('nm:open-desk',()=>open(true));
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
