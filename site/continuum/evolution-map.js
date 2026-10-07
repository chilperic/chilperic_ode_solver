/* Presentation only: both dimensions use the same recorded Kimura residents.
 * No physiology, fitness evaluation or classification thresholds are changed here. */
(function(root){'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const names={assimilation:'Mean net assimilation · µmol CO₂ m⁻² s⁻¹',dayAssimilation:'Daylight net assimilation · µmol CO₂ m⁻² s⁻¹',logFitness:'Objective score · dimensionless',carbon:'Net carbon · mol m⁻² cycle⁻¹',water:'Water use · mol m⁻² cycle⁻¹',heat:'Heat exposure · K h cycle⁻¹'};
const palette=['#173f5f','#157f86','#63ba9a','#b7d58b','#ead49a','#faf0d4'];
const cache=new WeakMap();
const views={
 terrain:{label:'Sculpted terrain',dimension:'3d',description:'Plant types in colour; assimilation sets the height.'},
 journey:{label:'Mechanism heatmap',dimension:'2d',description:'A continuous map of evaluated performance, with every observed replicate and its mean.'},
 contours:{label:'Topographic contours',dimension:'2d',description:'Equal-value lines reveal ridges, valleys and gradients. Contours stop at infeasible cells.'},
 regions:{label:'Intermediate mechanisms',dimension:'2d',description:'Compare C3, C3–C4 intermediates and C4 regions.'},
 feasibility:{label:'Feasible domain',dimension:'2d',description:'Inspect evaluated feasible samples and the excluded or unresolved domain before interpreting an optimum.'},
 routes:{label:'Evolutionary routes',dimension:'3d',description:'Recorded replicate paths take priority over a subdued landscape. Paths end at the current generation; the diamond is their mean.'},
 wireframe:{label:'Surface structure',dimension:'3d',description:'A transparent mesh exposes the shape, resolution and gaps of the calculated surface.'},
 fuji:{label:'Mount Fuji reference',dimension:'3d',description:'Watch independent adaptive walks climb a single fitness peak.'}
};
function fujiValue(x,y){return Math.max(0,1-Math.hypot(x-.55,y-.55)/Math.hypot(.55,.55));}
function contourSegments(cells,key,levels){
 const segments=[];
 for(const c of cells){if(!c.valid)continue;for(const tri of [[c.q[0],c.q[1],c.q[2]],[c.q[0],c.q[2],c.q[3]]])for(const level of levels){
  const points=[];for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3],va=a.p[key],vb=b.p[key];if((va<=level&&vb>level)||(vb<=level&&va>level)){const f=(level-va)/(vb-va);points.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,value:level});}}
  if(points.length===2)segments.push({level,points});
 }}return segments;
}
function shade(fill,c,key,range){
 const a=c.q[0],b=c.q[1],d=c.q[3],span=range[1]-range[0];
 const dx=(b.p[key]-a.p[key])/span/Math.max(1e-9,b.x-a.x),dy=(d.p[key]-a.p[key])/span/Math.max(1e-9,d.y-a.y),n=Math.hypot(dx,dy,1),light=clamp((dx*.5+dy*.65+1)/n/1.293);
 return {fill,alpha:.36*(1-light)};
}
let referenceScene;
function fujiScene(){
 if(referenceScene)return referenceScene;
 const size=56,point=(x,y)=>({x,y,p:{assimilation:fujiValue(x,y),logFitness:fujiValue(x,y),feasible:true}}),cells=[];
 for(let j=0;j<size;j++)for(let i=0;i<size;i++)cells.push({valid:true,q:[point(i/size,j/size),point((i+1)/size,j/size),point((i+1)/size,(j+1)/size),point(i/size,(j+1)/size)],center:point((i+.5)/size,(j+.5)/size)});
 return referenceScene={surface:{gs:null,points:[]},cells,arrows:[],sample:fractions=>({assimilation:fujiValue(fractions[2]/Math.max(1e-9,1-fractions[0]),fractions[0]),feasible:true}),heightKey:'assimilation',heightRange:[0,1],colorRange:[0,1],benchmark:true};
}
const fmt=x=>Number.isFinite(x)?Number(x.toPrecision(3)).toString():'—';
function color(t){const v=clamp(t)*(palette.length-1),i=Math.min(palette.length-2,Math.floor(v)),f=v-i,a=palette[i],b=palette[i+1];return 'rgb('+[1,3,5].map(k=>Math.round(parseInt(a.slice(k,k+2),16)*(1-f)+parseInt(b.slice(k,k+2),16)*f)).join(',')+')';}
function xy(p,layout='journey',axes='mes-pepc'){
 const [fp,fm,fb]=p.fractions;
 if(layout==='ternary')return[fb+fp/2,fp];
 if(layout==='landscape')return axes==='pepc-sheath'?[fp,fb]:axes==='mes-sheath'?[fm,fb]:[fm,fp];
 return[fm+fb>1e-10?fb/(fm+fb):.5,fp];
}
function inverse(x,y,layout='journey',axes='mes-pepc'){
 if(layout==='ternary')return[y,1-x-y/2,x-y/2];
 if(layout==='landscape')return axes==='pepc-sheath'?[x,1-x-y,y]:axes==='mes-sheath'?[1-x-y,x,y]:[y,x,1-x-y];
 return[y,(1-y)*(1-x),(1-y)*x];
}
function sampler(surface){
 const n=surface.resolution,map=new Map(surface.points.map(p=>[p.i+','+p.j,p]));
 return fractions=>{
  if(fractions.some(v=>v< -1e-8||v>1+1e-8))return null;
  const u=clamp(fractions[0])*n,v=clamp(fractions[1])*n,i=Math.min(n-1,Math.floor(u)),j=Math.min(n-1,Math.floor(v)),a=u-i,b=v-j;
  const weights=a+b<=1+1e-9?[[i,j,1-a-b],[i+1,j,a],[i,j+1,b]]:[[i+1,j,1-b],[i,j+1,1-a],[i+1,j+1,a+b-1]];
  const used=weights.filter(q=>q[2]>1e-8).map(([i,j,w])=>({p:map.get(i+','+j),w}));
  if(!used.length||used.some(q=>!q.p?.feasible))return null;
  const nearest=used.reduce((a,b)=>a.w>=b.w?a:b).p;
  const out={fractions,strategy:nearest.strategy,strategyLabel:nearest.strategyLabel,feasible:true};
  for(const key of Object.keys(names).concat('score'))out[key]=used.every(q=>Number.isFinite(q.p[key]))?used.reduce((s,q)=>s+q.w*q.p[key],0):null;
  return out;
 };
}
function range(r,key){const values=r.landscapes.flatMap(s=>s.points).concat(r.nodes).filter(p=>p.feasible&&Number.isFinite(p[key])).map(p=>p[key]);let lo=Infinity,hi=-Infinity;for(const v of values){lo=Math.min(lo,v);hi=Math.max(hi,v);}if(!values.length)return[0,1];if(hi-lo<1e-9){const pad=Math.max(.01,Math.abs(lo)*.01);lo-=pad;hi+=pad;}return[lo,hi];}
function scene(r,opt){
 const surface=r.landscapes[opt.slice]||r.landscapes[0],heightKey=opt.heightMetric||'assimilation',key=[opt.view,opt.axes,opt.metric,heightKey].join('|');
 let entries=cache.get(surface);if(!entries){entries=new Map();cache.set(surface,entries);}if(entries.has(key))return entries.get(key);
 const sample=sampler(surface),cells=[],arrows=[],nx=48,ny=40,ymax=opt.view==='journey'?1-1e-7:1;
 const point=(x,y)=>({x,y,p:sample(inverse(x,y,opt.view,opt.axes))});
 const grid=Array.from({length:ny+1},(_,j)=>Array.from({length:nx+1},(_,i)=>point(i/nx,j/ny*ymax)));
 for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
  const q=[grid[j][i],grid[j][i+1],grid[j+1][i+1],grid[j+1][i]],center=point((i+.5)/nx,(j+.5)/ny*ymax);
  cells.push({q,center,valid:q.every(v=>v.p&&Number.isFinite(v.p[heightKey]))&&!!center.p});
 }
 // Local objective improvement on this fixed slice, not a mutation forecast.
 for(let j=1;j<8;j++)for(let i=1;i<10;i++){
  const p=point(i/10,j/8);if(!p.p||!Number.isFinite(p.p.logFitness))continue;
  const d=.025,neighbors=[[d,0],[-d,0],[0,d],[0,-d]].map(([dx,dy])=>point(p.x+dx,p.y+dy)).filter(q=>q.p&&Number.isFinite(q.p.logFitness));
  const best=neighbors.sort((a,b)=>b.p.logFitness-a.p.logFitness)[0];if(best&&best.p.logFitness>p.p.logFitness+1e-9)arrows.push([p,best]);
 }
 const out={surface,cells,arrows,sample,heightKey,colorRange:range(r,opt.metric==='regions'?heightKey:opt.metric),heightRange:range(r,heightKey)};entries.set(key,out);return out;
}
function project(w,h,opt,zrange){
 const is3d=opt.dimension==='3d',az=opt.camera?.az??-.72,tilt=opt.camera?.tilt??.62,height=opt.camera?.height??1.15,L=64,R=w-26,T=85,B=h-70;
 const raw=(x,y,z)=>{const u=x-.5,v=y-.5,c=Math.cos(az),s=Math.sin(az),d=u*s+v*c;return{x:(u*c-v*s),y:d*Math.sin(tilt)-z*height*Math.cos(tilt),depth:d*Math.cos(tilt)+z*height*Math.sin(tilt)};};
 const corners=[0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>raw(x,y,z)))),xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys),scaleX=(R-L)/(hiX-loX)*.88,scaleY=(B-T)/(hiY-loY);
 return (x,y,value=zrange[0])=>{const z=(value-zrange[0])/(zrange[1]-zrange[0]);if(!is3d)return{x:L+x*(R-L),y:B-y*(B-T),depth:0};const p=raw(x,y,z);return{x:(L+R)/2+(p.x-(loX+hiX)/2)*scaleX,y:(T+B)/2+(p.y-(loY+hiY)/2)*scaleY,depth:p.depth};};
}
function polygon(ctx,points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function line(ctx,points,col,width=1,dash=[]){if(points.length<2)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=col;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);}
function arrow(ctx,a,b,col,width=1){const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<3)return;line(ctx,[a,b],col,width);const nx=dx/length,ny=dy/length,s=4;polygon(ctx,[b,{x:b.x-s*nx+s*.5*ny,y:b.y-s*ny-s*.5*nx},{x:b.x-s*nx-s*.5*ny,y:b.y-s*ny+s*.5*nx}],col);}
function text(ctx,s,x,y,size=12,col='#4b6078',align='left'){ctx.font=size+'px system-ui, sans-serif';ctx.fillStyle=col;ctx.textAlign=align;ctx.fillText(s,x,y);}
function dot(ctx,p,col,size=4,diamond=false){ctx.fillStyle=col;ctx.strokeStyle='#fff';ctx.lineWidth=1.6;if(diamond)polygon(ctx,[{x:p.x,y:p.y-size-1},{x:p.x+size+1,y:p.y},{x:p.x,y:p.y+size+1},{x:p.x-size-1,y:p.y}],col,'#fff');else{ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();ctx.stroke();}}
function trajectory(r,rep,time){return rep.events.filter(e=>e.time<=time).map(e=>({p:r.nodes[e.node],time:e.time,index:e.index}));}
function draw(ctx,w,h,r,options){
 const style=options.view,benchmark=style==='fuji',preset=views[style],opt={...options,view:preset?'journey':style,metric:style==='regions'?'regions':benchmark?'assimilation':options.metric,heightMetric:benchmark?'assimilation':options.heightMetric};
 const s=benchmark?fujiScene():scene(r,opt),three=opt.dimension==='3d',at=project(w,h,opt,s.heightRange),height=p=>Number.isFinite(p?.[s.heightKey])?p[s.heightKey]:s.heightRange[0],pos=p=>{const [x,y]=xy(p,opt.view,opt.axes);return at(x,y,height(p));},hits=[];
 ctx.clearRect(0,0,w,h);const backdrop=ctx.createLinearGradient(0,0,0,h);backdrop.addColorStop(0,'#eff5f8');backdrop.addColorStop(.65,'#fbfcfb');backdrop.addColorStop(1,'#e6eef1');ctx.fillStyle=backdrop;ctx.fillRect(0,0,w,h);
 const title=preset?preset.label:opt.view==='ternary'?'Allocation triangle':opt.view==='landscape'?'Allocation plane':'Photosynthetic mechanism map';
 text(ctx,title,22,29,w<420?16:18,'#203650');
 text(ctx,benchmark?'Adaptive walks · relative fitness 0–1':style==='feasibility'?'Green: feasible samples · crosses: excluded or unresolved':style==='routes'?'Recorded individuals and their mean · current generation only':three?'Height: '+names[s.heightKey]:'2D · '+(opt.metric==='regions'?'Mechanism regions':names[opt.metric]),22,51,w<500?10:12);

 const floor=[at(0,0),at(1,0),at(1,1),at(0,1)];
 polygon(ctx,floor,'#e8edf3','#c4cfdb');
 // Hatch unavailable regions before drawing the valid surface; never bridge holes.
 if(!benchmark){ctx.save();polygon(ctx,floor);ctx.clip();for(let x=-h;x<w+h;x+=9)line(ctx,[{x,y:h},{x:x+h,y:0}],'#cbd4df',.6);ctx.restore();}
 const cells=s.cells.map(c=>({...c,depth:at(c.center.x,c.center.y,height(c.center.p)).depth})).sort((a,b)=>a.depth-b.depth);
 if(three){const base=floor.map(p=>({...p,y:p.y+16}));polygon(ctx,[floor[0],floor[1],base[1],base[0]],'#bdcbd3');polygon(ctx,[floor[1],floor[2],base[2],base[1]],'#a9bec9');polygon(ctx,[floor[2],floor[3],base[3],base[2]],'#c1ced6');}
 if(three&&style!=='wireframe')for(const c of cells){if(!c.valid)continue;for(let j=0;j<4;j++){const a=c.q[j],b=c.q[(j+1)%4];if((a.x===b.x&&(a.x===0||a.x===1))||(a.y===b.y&&(a.y===0||a.y>.999))){const topA=at(a.x,a.y,height(a.p)),topB=at(b.x,b.y,height(b.p));polygon(ctx,[topA,topB,at(b.x,b.y),at(a.x,a.y)],j%2?'#326e788c':'#4d92958c');}}}
 for(const c of cells){
  if(!c.valid)continue;const p=c.center.p,value=p[opt.metric];if(opt.metric!=='regions'&&!Number.isFinite(value))continue;
  const fill=style==='feasibility'?'#d3e9e3':style==='routes'?'#d5e2df':opt.metric==='regions'?root.EvolutionRegions.type(p).fill:color((value-s.colorRange[0])/(s.colorRange[1]-s.colorRange[0]));
  const q=c.q.map(v=>at(v.x,v.y,height(v.p)));
  if(style==='wireframe'){polygon(ctx,q,three?'#f0f7f455':fill,three?'#25747950':'#ffffff55');continue;}
  polygon(ctx,q,fill,fill);
  if(three&&style!=='regions'&&style!=='feasibility'){const lighting=shade(fill,c,s.heightKey,s.heightRange);ctx.save();ctx.globalAlpha=lighting.alpha;polygon(ctx,q,'#15333b');ctx.restore();}
 }
 // Equal-value isolines preserve gaps; no smoothing invents a feasible bridge.
 if(['terrain','contours','fuji'].includes(style)){
  const levels=Array.from({length:9},(_,i)=>s.heightRange[0]+(i+1)/10*(s.heightRange[1]-s.heightRange[0])),segments=contourSegments(s.cells,s.heightKey,levels),labels=new Set();
  for(const segment of segments){const points=segment.points.map(p=>at(p.x,p.y,p.value));line(ctx,points,three?'#ffffff77':'#173d5680',three?.65:1.1);if(!three&&w>500&&!labels.has(segment.level)&&segment.points[0].x>.18&&segment.points[0].x<.82){const p=points[0];ctx.fillStyle='#ffffffeb';ctx.fillRect(p.x-18,p.y-8,36,13);text(ctx,fmt(segment.level),p.x,p.y+2,9,'#164857','center');labels.add(segment.level);}}
 }
 if(style==='feasibility')for(const p of s.surface.points){if(p.feasible){const q=pos(p);dot(ctx,q,'#207d68',2.4);}else if(p.fractions){const [x,y]=xy(p,opt.view,opt.axes),q=at(x,y);line(ctx,[{x:q.x-2,y:q.y-2},{x:q.x+2,y:q.y+2}],'#a57258',1.2);line(ctx,[{x:q.x-2,y:q.y+2},{x:q.x+2,y:q.y-2}],'#a57258',1.2);}}
 if(opt.view==='journey'&&!three&&!benchmark){const p=at(0,1),q=at(1,1);line(ctx,[p,q],'#75869b',3,[5,5]);}
 // A sparse surface mesh makes height and curvature legible without concealing regions.
 if(three){for(let j=0;j<=8;j++){let points=[];for(let i=0;i<=48;i++){const x=i/48,y=j/8*(opt.view==='journey'?1-1e-7:1),p=s.sample(inverse(x,y,opt.view,opt.axes));if(p&&Number.isFinite(p[s.heightKey]))points.push(at(x,y,height(p)));else{line(ctx,points,'#253d5725',.6);points=[];}}line(ctx,points,'#253d5725',.6);}}
 if(opt.arrows!==false)for(const [a,b]of s.arrows)arrow(ctx,at(a.x,a.y,height(a.p)),at(b.x,b.y,height(b.p)),'#18395080',.8);
 const xname=benchmark?'Abstract trait 1 (%)':opt.view==='journey'?'Rubisco located in bundle sheath (%)':opt.view==='ternary'?'Mesophyll Rubisco ← allocation → Sheath Rubisco':opt.axes==='pepc-sheath'?'PEPC allocation (%)':'Mesophyll Rubisco allocation (%)';
 const yname=benchmark?'Abstract trait 2 (%)':opt.view==='landscape'&&opt.axes!=='mes-pepc'?'Sheath Rubisco (%)':'PEPC capacity (%)';
 if(!three){for(let i=0;i<=4;i++){const v=i/4,p=at(v,0),q=at(0,v);text(ctx,String(i*25),p.x,p.y+19,11,'#506079','center');text(ctx,String(i*25),q.x-9,q.y+4,11,'#506079','right');line(ctx,[at(v,0),at(v,1)],'#ffffff60',.7);line(ctx,[at(0,v),at(1,v)],'#ffffff60',.7);}text(ctx,xname,(64+w-26)/2,h-23,w<500?10:12,'#324b66','center');ctx.save();ctx.translate(16,(85+h-70)/2);ctx.rotate(-Math.PI/2);text(ctx,yname,0,0,12,'#324b66','center');ctx.restore();}
 else{for(const [a,b]of [[[0,0],[1,0]],[[0,0],[0,1]]])line(ctx,[at(...a),at(...b)],'#5c6d85',1.1);line(ctx,[at(0,0,s.heightRange[0]),at(0,0,s.heightRange[1])],'#5c6d85',1.1);for(let i=0;i<=4;i++){const f=i/4,p=at(f,0),q=at(0,f),z=at(0,0,s.heightRange[0]+f*(s.heightRange[1]-s.heightRange[0]));text(ctx,String(i*25),p.x+3,p.y+18,10,'#506079','center');if(i)text(ctx,String(i*25),q.x-9,q.y+7,10,'#506079','right');text(ctx,fmt(s.heightRange[0]+f*(s.heightRange[1]-s.heightRange[0])),z.x-8,z.y,10,'#506079','right');}const p=at(1,0),q=at(0,1);text(ctx,'X',p.x+12,p.y+6,12,'#203650');text(ctx,'Y',q.x+12,q.y+6,12,'#203650');text(ctx,'X: '+xname,w/2,h-46,w<500?9:11,'#324b66','center');text(ctx,'Y: '+yname,w/2,h-30,w<500?9:11,'#324b66','center');}
 // Anchor labels to evaluated samples in both dimensions; separate boxes to avoid overlap.
 const regionLabels=[];
 if(!benchmark&&opt.labels!==false&&w>420){
  const groups=new Map();for(const p of s.surface.points){if(!p.feasible)continue;const key=root.EvolutionRegions.type(p).key;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
  for(const key of ['c3','incipient','c2','intermediate','c2c4','c4','other']){
   const points=groups.get(key);if(!points?.length)continue;
   const coords=points.map(p=>xy(p,opt.view,opt.axes)),cx=coords.reduce((n,p)=>n+p[0],0)/points.length,cy=coords.reduce((n,p)=>n+p[1],0)/points.length;
   const point=points.reduce((a,b)=>{const dist=p=>{const [x,y]=xy(p,opt.view,opt.axes);return Math.hypot(x-cx,y-cy);};return dist(a)<dist(b)?a:b;}),anchor=pos(point),type=root.EvolutionRegions.type(point);
   ctx.font='600 11px system-ui';const width=ctx.measureText(type.short).width+22,height=24,candidates=[];
   for(const dy of [0,-30,30,-60,60,-90,90,-120,120])for(const dx of [0,-80,80])candidates.push({x:clamp(anchor.x+dx,74+width/2,w-22-width/2),y:clamp(anchor.y+dy,117,h-100)});
   const box=candidates.find(q=>regionLabels.every(b=>Math.abs(b.x-q.x)>(b.width+width)/2+5||Math.abs(b.y-q.y)>height+5));
   if(!box)continue;regionLabels.push({...box,width,height,key,anchor,type});
  }
 }
 if(benchmark||(['terrain','contours'].includes(style)&&opt.metric!=='regions')){
  const peak=benchmark?{point:at(.55,.55,1),value:1}:s.surface.points.filter(p=>p.feasible&&Number.isFinite(p[s.heightKey])).reduce((best,p)=>!best||p[s.heightKey]>best.value?{point:pos(p),value:p[s.heightKey]}:best,null);
  if(peak){const p=peak.point,label=benchmark?'Single optimum':'Highest sample · '+fmt(peak.value),x=clamp(p.x,150,w-150),y=Math.max(112,p.y-29);line(ctx,[p,{x,y:y+9}],'#394e62',1);dot(ctx,p,'#bf8240',3.5);ctx.font='11px system-ui';const width=ctx.measureText(label).width+18;ctx.fillStyle='#fffffff2';ctx.fillRect(x-width/2,y-11,width,21);text(ctx,label,x,y+3,11,'#23434d','center');}
 }
 const residents=benchmark?[]:root.EvolutionEnsemble.residents(r,opt.time||0),rep=r.replicates[opt.rep],show=residents;
 for(const q of show){if(!opt.all&&q.ri!==opt.rep)continue;ctx.save();ctx.globalAlpha=q.ri===opt.rep?1:Math.min(1,(style==='routes'?3:1.2)/Math.sqrt(show.length));const path=trajectory(r,q.rep,opt.time||0).map(e=>pos(e.p)),selected=q.ri===opt.rep;line(ctx,path,selected?'#bb4936':style==='routes'?'#365a7499':'#2c546753',selected?3.3:style==='routes'?1.6:1);if(selected&&path.length>1)arrow(ctx,path.at(-2),path.at(-1),'#b54431',2.7);ctx.restore();}
 // Mean output is the mean of evaluated replicate outputs, not performance at mean traits.
 const mean=benchmark?null:root.EvolutionEnsemble.meanAt(r,opt.time||0),meanPath=(benchmark?[]:r.ensemble?.points||[]).filter(q=>q.time<=(opt.time||0)).map(q=>pos({fractions:q.fractions.map(v=>v.mean),[s.heightKey]:q.metrics[s.heightKey]?.mean}));if(mean)meanPath.push(pos(mean));line(ctx,meanPath,'#ffffff',4.8);line(ctx,meanPath,'#343c83',2.4,[6,3]);
 // Separate coincident glyphs with short leader lines. True trait locations are retained.
 const occupied=new Map();for(const q of show){const truePos=pos(q.p),key=Math.round(truePos.x/6)+','+Math.round(truePos.y/6),n=occupied.get(key)||0;occupied.set(key,n+1);const radius=n?Math.min(18,4+3*Math.sqrt(n)):0,angle=n*2.39996,p={x:truePos.x+Math.cos(angle)*radius,y:truePos.y+Math.sin(angle)*radius};if(n)line(ctx,[truePos,p],'#42577366',.7);dot(ctx,p,root.EvolutionRegions.type(q.p).color,q.ri===opt.rep?6:3.8);hits.push({x:p.x,y:p.y,rep:q.ri,index:q.index,p:q.p});}
 if(mean)dot(ctx,pos(mean),'#343c83',6,true);
 let benchmarkFrame=null;
 if(benchmark&&options.fujiRun){
  const run=options.fujiRun,frame=root.FujiEvolution.frame(run,options.fujiStep),position=p=>at(p.x,p.y,p.value);benchmarkFrame=frame;
  for(let i=0;i<run.paths.length;i++){
   const points=run.paths[i].slice(0,frame.index+1).map(position);
   line(ctx,points,'#245e8f38',.85);
   if(i<12&&points.length>1){let j=points.length-2;while(j>0&&points[j].x===points.at(-1).x&&points[j].y===points.at(-1).y)j--;arrow(ctx,points[j],points.at(-1),'#245e8faa',1.1);}
   dot(ctx,position(frame.individuals[i]),'#246891',2.9);
  }
  const path=run.means.slice(0,frame.index+1).map(position);line(ctx,path,'#fff',5);line(ctx,path,'#5b277c',2.6,[6,3]);dot(ctx,position(frame.mean),'#5b277c',6,true);
 }
 // Paint callouts last so replicate trails cannot obscure their names.
 for(const box of regionLabels){const {anchor,type,width,height}=box;line(ctx,[anchor,box],type.color+'bb',1);dot(ctx,anchor,type.color,2.2);ctx.fillStyle='#fffffff5';ctx.fillRect(box.x-width/2,box.y-height/2,width,height);ctx.fillStyle=type.color;ctx.fillRect(box.x-width/2,box.y-height/2,4,height);text(ctx,type.short,box.x+3,box.y+4,11,type.color,'center');}
 if(opt.metric!=='regions'&&!['routes','feasibility'].includes(style)){const barW=Math.min(150,w*.3),left=22;for(let i=0;i<barW;i++){ctx.fillStyle=color(i/barW);ctx.fillRect(left+i,64,1.5,7);}text(ctx,fmt(s.colorRange[0]),left,82,10);text(ctx,fmt(s.colorRange[1]),left+barW,82,10,'#4b6078','right');}
 ctx.textAlign='left';
 return{hits,regionLabels,benchmarkFrame,slice:s.surface.gs,benchmark,
 message:benchmark?'Blue dots and trails show individual adaptive walks; the purple diamond and dashed trail show their mean.':opt.metric==='regions'?'Colours identify modelled plant types. Dots show individual runs; the dashed trail and diamond show their mean.':'Surface colour shows '+names[opt.metric]+'. Dot colours identify plant types; the dashed trail and diamond show their mean.',
 methods:benchmark?'An idealized single-peak landscape, independent of plant physiology. Each mutation step proposes a random change in two abstract traits; only higher-fitness proposals are accepted. Steps are mutation opportunities, not biological generations. Mean height is the mean of individual fitness values. C3/C4 classifications do not apply to these abstract traits.':
 'Plant-type labels are operational model categories, not species diagnoses. Background holds stomatal opening and photorespiratory recycling fixed at the displayed slice; trajectories retain each run’s own values. Arrows show local improvement in the chosen objective, not predicted mutations. Surface values are interpolated within feasible cells. Hatching marks unavailable or infeasible regions. Region area is not a probability. Allocation denotes catalytic capacity, not nitrogen share. Runs that stop early are excluded after their last observation.'};
}
function attach(canvas,readOptions,redraw){const camera={az:-.72,tilt:.62,height:1.15};let drag=null,suppress=false;
 canvas.addEventListener('pointerdown',e=>{if(readOptions().dimension!=='3d'||e.button!==0)return;drag={x:e.clientX,y:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>1)drag.moved=true;camera.az+=dx*.008;camera.tilt=clamp(camera.tilt+dy*.006,.2,1.25);drag.x=e.clientX;drag.y=e.clientY;redraw();});
 const end=()=>{if(drag){suppress=drag.moved;drag=null;}};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('click',e=>{if(suppress){e.stopImmediatePropagation();suppress=false;}},true);
 function reset(){camera.az=-.72;camera.tilt=.62;camera.height=1.15;redraw();}
 canvas.addEventListener('keydown',e=>{if(readOptions().dimension!=='3d')return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home'){reset();return;}camera.az+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;camera.tilt=clamp(camera.tilt+(e.key==='ArrowUp'?.08:e.key==='ArrowDown'?-.08:0),.2,1.25);redraw();});return{camera,reset};
}
const api={draw,attach,xy,inverse,sampler,range,trajectory,project,names,views,fujiValue,contourSegments};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.EvolutionMap=api;
})(globalThis);
