/* Animated availability symbols, not molecular transport or a spatial soil solver. */
(function(root){'use strict';
const clamp=x=>Math.max(0,Math.min(1,x)),fract=x=>x-Math.floor(x);
function state(r,c,time=r.hour||0){
 const water=Number.isFinite(r.water)?Math.max(0,r.water):null,nitrogen=Number.isFinite(r.soilN)?Math.max(0,r.soilN):null;
 const waterReference=Math.max(1,c.soilCapacity||100),nitrogenReference=Math.max(1,c.initialNitrogen||1000);
 const pools=[{kind:'water',value:water,reference:waterReference,color:'#167ca8',unit:'mm',title:'Soil water'},{kind:'nitrogen',value:nitrogen,reference:nitrogenReference,color:'#956114',unit:'mg',title:'Available N'}];
 for(const [j,p] of pools.entries()){
  p.ratio=p.value===null?0:clamp(p.value/p.reference);p.particles=[];
  const amount=p.ratio*32;
  for(let i=0;i<Math.ceil(amount);i++){const a=fract(Math.sin((i+1)*17.71+j*43.6)*41357.31),b=fract(Math.sin((i+1)*71.13+j*23.4)*21733.17);p.particles.push({x:.04+.92*clamp(a+.015*Math.sin(time*.45+i)),y:.08+.84*clamp(b+.025*Math.cos(time*.33+i*2)),z:fract(i*.618+j*.37),alpha:Math.min(1,amount-i)});}
 }
 return {pools,time,meaning:'Symbol density shows availability; motion is schematic, not transport.'};
}
function gauges(ctx,w,h,s){const gap=18,bw=(w-42-gap)/2,y=h-36;ctx.save();ctx.font='12px system-ui';for(const [i,p]of s.pools.entries()){const x=14+i*(bw+gap);ctx.fillStyle=p.color;ctx.fillText(p.title+' · '+(p.value===null?'unavailable':p.value.toFixed(1)+' '+p.unit),x,y);ctx.fillStyle='#53616b30';ctx.fillRect(x,y+7,bw,5);ctx.fillStyle=p.color;ctx.fillRect(x,y+7,bw*p.ratio,5);}ctx.font='10px system-ui';ctx.fillStyle='#53616b';ctx.fillText('Availability symbols · motion schematic',14,h-7);ctx.restore();}
function draw2D(ctx,w,h,ground,r,c,time){const s=state(r,c,time),depth=Math.max(1,h-ground-52);ctx.save();ctx.beginPath();ctx.rect(0,ground,w,depth);ctx.clip();for(const p of s.pools){ctx.fillStyle=p.color;for(const q of p.particles){ctx.globalAlpha=(.35+.4*p.ratio)*q.alpha;const x=12+q.x*(w-24),y=ground+q.y*depth;ctx.beginPath();if(p.kind==='water'){ctx.moveTo(x,y-3.4);ctx.quadraticCurveTo(x+4,y+.4,x,y+3);ctx.quadraticCurveTo(x-4,y+.4,x,y-3.4);}else ctx.arc(x,y,2.1,0,Math.PI*2);ctx.fill();}}ctx.restore();gauges(ctx,w,h,s);return s;}
const api={state,gauges,draw2D};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SoilResources=api;
})(globalThis);
