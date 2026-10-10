/* Render only evaluated surfaces and recorded residents; never synthesize a peak. */
(function(root){'use strict';
const T=root.TraitSpace,E=root.EvolutionEnsemble,V=root.EvolutionMap,R=root.EvolutionRegions;
const fmt=v=>Number(v.toPrecision(3)).toString();
function normalized(p,axes){const xy=axes.map(a=>{const v=T.value(p,a.key);return v===null?null:(v-a.lo)/(a.hi-a.lo);});return xy.every(Number.isFinite)?xy:null;}
function average(r,time,axes){const rows=E.residents(r,time).map(q=>({q,xy:normalized(q.p,axes)})).filter(q=>q.xy);if(!rows.length)return null;return{x:rows.reduce((s,q)=>s+q.xy[0],0)/rows.length,y:rows.reduce((s,q)=>s+q.xy[1],0)/rows.length,z:rows.reduce((s,q)=>s+q.q.p.logFitness,0)/rows.length,n:rows.length};}
function draw(ctx,w,h,r,opt={}){
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#f6f9f8';ctx.fillRect(0,0,w,h);ctx.font='13px system-ui';ctx.fillStyle='#173b42';
 const s=r?.traitLandscape;if(!s){ctx.fillText('Analyze traits & run evolution to build this view.',20,45);return{hits:[],message:'Choose the linked sensitivity workflow above.'};}
 const values=[...s.points,...r.nodes].filter(p=>p.feasible&&Number.isFinite(p.logFitness)).map(p=>p.logFitness),lo=Math.min(...values),hi=Math.max(...values),pad=(hi-lo)*.04||.01,zrange=opt.zRange||[lo-pad,hi+pad],at=V.project(w,h,opt,zrange),n=s.resolution,time=opt.time??0;
 const path=(points,fill,stroke)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}};
 const floor=[at(0,0),at(1,0),at(1,1),at(0,1)];ctx.lineWidth=1;path(floor,'#e7eeee','#b8c8c9');
 const grid=new Map(s.points.map(p=>[p.i+','+p.j,p])),cells=[];
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){
  const ps=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([x,y])=>grid.get(x+','+y)),valid=ps.every(p=>p.feasible&&Number.isFinite(p.logFitness));
  const pts=ps.map(p=>at(p.i/n,p.j/n,valid?p.logFitness:zrange[0]));cells.push({ps,pts,valid,depth:pts.reduce((sum,p)=>sum+p.depth,0)/4});
 }
 cells.sort((a,b)=>a.depth-b.depth);ctx.lineWidth=.5;
 for(const c of cells){const color=R.type(c.ps[0]).color;ctx.globalAlpha=c.valid?.78:1;path(c.pts,c.valid?color:'#e5e8e8',c.valid?'#ffffff40':'#c4cdcd');if(!c.valid){ctx.strokeStyle='#b5c0c0';ctx.beginPath();ctx.moveTo(c.pts[0].x,c.pts[0].y);ctx.lineTo(c.pts[2].x,c.pts[2].y);ctx.stroke();}}
 ctx.globalAlpha=1;
 if(opt.arrows){for(let j=2;j<n-1;j+=5)for(let i=2;i<n-1;i+=5){const p=grid.get(i+','+j),px=grid.get((i+1)+','+j),py=grid.get(i+','+(j+1));if(![p,px,py].every(q=>q?.feasible&&Number.isFinite(q.logFitness)))continue;const dx=px.logFitness-p.logFitness,dy=py.logFitness-p.logFitness,norm=Math.hypot(dx,dy);if(norm<1e-7)continue;const x=i/n,y=j/n,ex=x+dx/norm*.045,ey=y+dy/norm*.045,a=at(x,y,p.logFitness),b=at(ex,ey,p.logFitness+.045*n*norm),angle=Math.atan2(b.y-a.y,b.x-a.x);ctx.strokeStyle='#183e4999';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.moveTo(b.x-4*Math.cos(angle-.5),b.y-4*Math.sin(angle-.5));ctx.lineTo(b.x,b.y);ctx.lineTo(b.x-4*Math.cos(angle+.5),b.y-4*Math.sin(angle+.5));ctx.stroke();}}
 const observed=E.residents(r,time),hits=[];
 for(const row of observed){const xy=normalized(row.p,s.axes);if(!xy)continue;const q=at(...xy,row.p.logFitness),selected=row.ri===opt.rep;
  if(opt.all||selected){let previous=null;ctx.strokeStyle=selected?'#15354a':R.type(row.p).color+'3d';ctx.lineWidth=selected?2:1;ctx.beginPath();for(const e of row.rep.events.slice(0,row.index+1)){const p=r.nodes[e.node],v=normalized(p,s.axes);if(!v){previous=null;continue;}const point=at(...v,p.logFitness);if(previous)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);previous=point;}ctx.stroke();}
  hits.push({x:q.x,y:q.y,p:row.p,rep:row.ri,index:row.index,depth:q.depth});
 }
 hits.sort((a,b)=>a.depth-b.depth);for(const q of hits){ctx.beginPath();ctx.arc(q.x,q.y,q.rep===opt.rep?4.3:2.7,0,Math.PI*2);ctx.fillStyle=R.type(q.p).color;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=.7;ctx.stroke();}
 const history=(r.ensemble?.points||[]).filter(q=>q.time<time).map(q=>average(r,q.time,s.axes));history.push(average(r,time,s.axes));const mean=history.at(-1);
 for(const [color,width,dash]of [['#ffffff',5,[]],['#162e49',2.4,[6,4]]]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();let previous=null;for(const q of history){if(!q){previous=null;continue;}const p=at(q.x,q.y,q.z);if(previous)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);previous=p;}ctx.stroke();}ctx.setLineDash([]);
 if(mean){const p=at(mean.x,mean.y,mean.z);ctx.lineWidth=2;path([{x:p.x,y:p.y-6},{x:p.x+6,y:p.y},{x:p.x,y:p.y+6},{x:p.x-6,y:p.y}],'#fff','#162e49');}
 // Axis ticks use physical units; the numeric scale never depends on the animation clock.
 ctx.font='11px system-ui';ctx.lineWidth=1;ctx.strokeStyle='#47606b';ctx.fillStyle='#294b54';
 for(let k=0;k<2;k++){const a=k===0?at(0,0):at(0,0),b=k===0?at(1,0):at(0,1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();for(let i=0;i<=4;i++){const t=i/4,p=k===0?at(t,0):at(0,t),factor=s.axes[k];ctx.textAlign=k===0?'center':'right';ctx.fillText(fmt(factor.lo+t*(factor.hi-factor.lo)),p.x+(k===0?0:-8),p.y+(k===0?16:4));}}
 const regionLabels=[];
 if(opt.labels){const groups=new Map();for(const p of s.points.filter(p=>p.feasible&&Number.isFinite(p.logFitness))){const key=R.type(p).key;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}ctx.font='600 11px system-ui';
  for(const [key,points]of [...groups].sort((a,b)=>b[1].length-a[1].length)){const type=R.types[key],cx=points.reduce((v,p)=>v+p.i/n,0)/points.length,cy=points.reduce((v,p)=>v+p.j/n,0)/points.length,p=points.reduce((a,b)=>Math.hypot(a.i/n-cx,a.j/n-cy)<Math.hypot(b.i/n-cx,b.j/n-cy)?a:b),anchor=at(p.i/n,p.j/n,p.logFitness),width=ctx.measureText(type.short).width+14,height=21;
   for(const dy of [0,-25,25,-50,50]){const x=Math.max(18+width/2,Math.min(w-18-width/2,anchor.x)),y=Math.max(78,Math.min(h-84,anchor.y+dy));if(regionLabels.some(a=>Math.abs(a.x-x)<(a.width+width)/2+6&&Math.abs(a.y-y)<height+5))continue;regionLabels.push({key,x,y,width,height});ctx.fillStyle='#ffffffec';ctx.fillRect(x-width/2,y-height/2,width,height);ctx.strokeStyle=type.color;ctx.lineWidth=1;ctx.strokeRect(x-width/2,y-height/2,width,height);ctx.fillStyle=type.color;ctx.textAlign='center';ctx.fillText(type.short,x,y+4);break;}
  }
 }
 if(opt.dimension==='3d'){const bottom=at(0,0,zrange[0]),top=at(0,0,zrange[1]);ctx.strokeStyle='#506973';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(bottom.x,bottom.y);ctx.lineTo(top.x,top.y);ctx.stroke();ctx.fillStyle='#294b54';ctx.textAlign='right';ctx.font='11px system-ui';for(let i=0;i<=4;i++){const z=zrange[0]+(zrange[1]-zrange[0])*i/4,p=at(0,0,z);ctx.fillText(fmt(z),p.x-8,p.y+4);}}
 ctx.textAlign='left';ctx.font='600 14px system-ui';ctx.fillText('Selected traits · actual simulation',18,25);ctx.font='12px system-ui';ctx.fillStyle='#46616a';ctx.fillText(opt.dimension==='3d'?'Height: objective score (dimensionless)':'Colour: photosynthetic strategy',18,46);
 ctx.textAlign='right';ctx.fillText(observed.length+' runs · mean ◇',w-18,w<560?66:25);ctx.textAlign='center';ctx.font='12px system-ui';
 ctx.fillText('X · '+s.axes[0].name+' ('+(s.axes[0].unit||T.units[s.axes[0].key])+')',w/2,h-34);
 ctx.fillText('Y · '+s.axes[1].name+' ('+(s.axes[1].unit||T.units[s.axes[1].key])+')',w/2,h-15);ctx.textAlign='left';
 const fixed=Object.entries(s.reference).filter(([key])=>!s.axes.some(a=>a.key===key)).map(([key,v])=>(T.factors(s.config).find(f=>f.key===key)?.name||T.names[key])+' '+fmt(v)).join(' · ');
 return{hits,mean,regionLabels,slice:null,message:'Individual runs and their mean share the playback clock. Background held at '+fixed+'.',methods:s.scope+' Colours are model categories; grey hatching marks infeasible or unresolved cells. Arrow directions describe local objective increase, not mutation probabilities. A missing Rubisco pool has no sheath fraction and is omitted from that projection.'};
}
function ranking(ctx,w,h,a,axes=[]){
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.fillStyle='#183c46';ctx.font='600 15px system-ui';ctx.fillText('Which traits shape the objective?',20,27);
 const rows=T.ranked(a);if(!rows.length){ctx.font='13px system-ui';ctx.fillText('Run the linked sensitivity analysis first.',20,60);return{rows:[],note:'Sensitivity is calculated for the submitted conditions and trait domain.'};}
 const min=Math.min(0,...rows.map(r=>r.S1??0),...rows.flatMap(r=>r.STCI||[r.influence])),max=Math.max(1,...rows.flatMap(r=>r.STCI||[r.influence])),L=24,R=w-24,barWidth=R-L,T0=85,B=h-55,rowH=Math.min(78,(B-T0)/rows.length),X=v=>L+(v-min)/(max-min)*barWidth;
 ctx.font='12px system-ui';ctx.fillStyle='#536771';ctx.fillText('Outline: direct effect · filled: total effect',20,50);ctx.fillText('Whiskers: total-effect 95% estimation intervals',20,67);
 rows.forEach((r,i)=>{const y=T0+i*rowH;ctx.fillStyle='#234651';ctx.font='600 12px system-ui';ctx.fillText((axes.includes(r.key)?'● ':'')+r.name,L,y);ctx.textAlign='right';ctx.font='12px system-ui';ctx.fillText(fmt(r.influence),R,y);ctx.textAlign='left';ctx.fillStyle=axes.includes(r.key)?'#147f83':'#91a7b0';ctx.fillRect(Math.min(X(0),X(r.influence)),y+10,Math.abs(X(r.influence)-X(0)),14);ctx.strokeStyle='#173b4f';ctx.lineWidth=1.5;ctx.strokeRect(Math.min(X(0),X(r.S1??0)),y+9,Math.abs(X(r.S1??0)-X(0)),16);const ci=r.STCI||r.muStarCI;ctx.beginPath();ctx.moveTo(X(ci[0]),y+17);ctx.lineTo(X(ci[1]),y+17);for(const v of ci){ctx.moveTo(X(v),y+12);ctx.lineTo(X(v),y+22);}ctx.stroke();});
 ctx.font='11px system-ui';ctx.fillStyle='#536771';for(let i=0;i<=4;i++){ctx.textAlign='center';const v=min+i*(max-min)/4;ctx.fillText(fmt(v),X(v),B+20);}ctx.fillText('Sensitivity index · selected axes marked ●',w/2,h-12);ctx.textAlign='left';
 return{rows:rows.map(r=>({trait:r.name,S1:r.S1,ST:r.ST,interactionContribution:r.ST-r.S1,STlow:r.STCI?.[0],SThigh:r.STCI?.[1],selected:axes.includes(r.key)})),note:'All modeled traits still evolve. Total effects include interactions; differences from direct effects are estimates. Overlapping intervals do not establish a strict rank. This is sensitivity of the objective mapping, not evolutionary endpoints.'};
}
root.TraitLandscape={draw,ranking,normalized,average};
})(globalThis);
