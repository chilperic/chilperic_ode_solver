(function(){
'use strict';
const $=s=>document.querySelector(s),fmt=(x,n=2)=>Number.isFinite(x)?Number(x).toFixed(n):'—';
let data=[],i=0,playing=true,timer=null,speed=1,maxShoot=1,maxRoot=1,maxSeed=1,maxWater=1;
const scene=$('#growthScene'),chart=$('#growthChart'),slider=$('#growthTime'),play=$('#growthPlay'),speedSel=$('#growthSpeed');
function fit(canvas){const r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);return{ctx,w:r.width,h:r.height};}
function drawLeaf(ctx,x,y,rx,ry,a,flip){ctx.save();ctx.translate(x,y);ctx.rotate(flip*.45);ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fillStyle='rgba(43,126,79,'+a+')';ctx.fill();ctx.strokeStyle='rgba(27,82,54,'+Math.min(1,a+.18)+')';ctx.lineWidth=1;ctx.stroke();ctx.restore();}
function draw(){
 if(!data.length)return;const r=data[i],{ctx,w,h}=fit(scene);ctx.clearRect(0,0,w,h);
 const sky=ctx.createLinearGradient(0,0,0,h*.7);sky.addColorStop(0,'#eaf4f6');sky.addColorStop(1,'#f8faf7');ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 const ground=h*.70;ctx.fillStyle='#d8c7a3';ctx.fillRect(0,ground,w,h-ground);ctx.fillStyle='#bda77c';ctx.fillRect(0,ground,w,3);
 const shoot=Math.max(0,r.shoot_C),root=Math.max(0,r.root_C),seed=Math.max(0,r.seed_C),water=Math.max(0,r.soil_water_mm);
 const sn=Math.min(1,Math.sqrt(shoot/maxShoot)),rn=Math.min(1,Math.sqrt(root/maxRoot)),wn=Math.min(1,water/maxWater);
 const cx=w*.50,stemH=42+sn*(ground-100),stemW=5+sn*8;
 // soil water
 ctx.fillStyle='rgba(49,128,167,'+(0.08+0.24*wn)+')';ctx.fillRect(0,ground+(h-ground)*(1-wn),w,(h-ground)*wn);
 // roots
 ctx.strokeStyle='rgba(116,77,42,.72)';ctx.lineWidth=2+rn*2;ctx.lineCap='round';
 const roots=9;for(let k=0;k<roots;k++){const a=(k/(roots-1)-.5)*1.5;const len=35+rn*(h-ground-32)*(0.55+0.45*Math.abs(Math.sin(k*2.1)));ctx.beginPath();ctx.moveTo(cx,ground+3);ctx.bezierCurveTo(cx+a*35,ground+len*.25,cx+a*70,ground+len*.65,cx+a*95,ground+len);ctx.stroke();}
 // stem
 ctx.strokeStyle='#4f7f54';ctx.lineWidth=stemW;ctx.beginPath();ctx.moveTo(cx,ground);ctx.lineTo(cx,ground-stemH);ctx.stroke();
 // canopy, fixed glyph density: size/opacity follow shoot state; leaf count is not a state claim
 const leaves=12;for(let k=0;k<leaves;k++){const f=(k+1)/(leaves+1),y=ground-stemH*f*.93;const side=k%2?-1:1;const reach=(26+sn*72)*(0.45+0.55*Math.sin(Math.PI*f));drawLeaf(ctx,cx+side*reach*.55,y,14+sn*28,6+sn*10,.25+.7*sn,side);}
 // terminal head / seed pool
 ctx.beginPath();ctx.arc(cx,ground-stemH,8+sn*10,0,Math.PI*2);ctx.fillStyle='#6f9f58';ctx.fill();
 if(seed>1e-5){const q=Math.min(1,Math.sqrt(seed/maxSeed));ctx.beginPath();ctx.arc(cx,ground-stemH,13+q*14,0,Math.PI*2);ctx.fillStyle='rgba(190,133,48,'+(0.35+.6*q)+')';ctx.fill();}
 // litter signal
 const litter=Math.max(0,r.litter_C);if(litter>0){ctx.fillStyle='rgba(142,96,48,.35)';const n=Math.min(18,Math.ceil(litter/Math.max(0.2,maxShoot/20)));for(let k=0;k<n;k++){const x=cx+(k%2?-1:1)*(24+(k*37)%Math.max(30,w*.35));const y=ground+6+(k*13)%20;ctx.fillRect(x,y,10,3);}}
 // overlay
 ctx.fillStyle='rgba(255,255,255,.86)';ctx.fillRect(18,18,205,70);ctx.fillStyle='#17343b';ctx.font='700 20px system-ui';ctx.fillText('Day '+fmt(r.time_day,0),32,46);ctx.font='13px system-ui';ctx.fillStyle='#66797e';ctx.fillText('Archived simulation replay',32,69);
 drawChart();
 $('#mDay').textContent=fmt(r.time_day,0);$('#mShoot').textContent=fmt(r.shoot_C,2);$('#mRoot').textContent=fmt(r.root_C,2);$('#mWater').textContent=fmt(r.soil_water_mm,1);$('#mSeed').textContent=fmt(r.seed_C,2);$('#mTemp').textContent=fmt(r.temperature_C,1);$('#mET').textContent=fmt(r.cumulative_ET_mm,1);$('#mGain').textContent=fmt(r.net_gain_gC_m2_day,3);
 slider.value=i;
}
function drawChart(){const {ctx,w,h}=fit(chart);ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);const pad={l:48,r:18,t:20,b:35},W=w-pad.l-pad.r,H=h-pad.t-pad.b,x=k=>pad.l+(k/(data.length-1))*W;
 const ymax=Math.max(maxShoot,maxRoot);const y=v=>pad.t+H-(v/ymax)*H;
 ctx.strokeStyle='#d7e0dd';ctx.lineWidth=1;for(let g=0;g<=4;g++){const yy=pad.t+H*g/4;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(w-pad.r,yy);ctx.stroke();}
 function line(key,color){ctx.beginPath();data.forEach((r,k)=>{const p=[x(k),y(Math.max(0,r[key]))];k?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();}
 line('shoot_C','#176678');line('root_C','#9a6d42');
 ctx.strokeStyle='#a65f2a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x(i),pad.t);ctx.lineTo(x(i),pad.t+H);ctx.stroke();
 ctx.fillStyle='#66797e';ctx.font='12px system-ui';ctx.fillText('Shoot C',pad.l,14);ctx.fillStyle='#9a6d42';ctx.fillText('Root C',pad.l+60,14);ctx.fillStyle='#66797e';ctx.fillText('time →',w-60,h-10);
}
function tick(){if(!playing||!data.length)return;i=(i+1)%data.length;draw();}
function start(){clearInterval(timer);play.textContent=playing?'Pause':'Play';if(playing)timer=setInterval(tick,Math.max(45,220/Number(speedSel.value||1)));}
fetch('public-growth-replay.json').then(r=>r.json()).then(j=>{data=j.rows||[];maxShoot=Math.max(...data.map(r=>r.shoot_C||0),1);maxRoot=Math.max(...data.map(r=>r.root_C||0),1);maxSeed=Math.max(...data.map(r=>r.seed_C||0),1);maxWater=Math.max(...data.map(r=>r.soil_water_mm||0),1);slider.max=Math.max(0,data.length-1);draw();start();}).catch(err=>{$('#growthStatus').textContent='Replay unavailable: '+err.message;});
play.addEventListener('click',()=>{playing=!playing;start()});speedSel.addEventListener('change',start);slider.addEventListener('input',()=>{i=Number(slider.value);playing=false;start();draw()});addEventListener('resize',draw);
})();