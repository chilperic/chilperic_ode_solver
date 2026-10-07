/* Display categories only. These allocation thresholds are not empirical species boundaries. */
(function(root){'use strict';
const types={
 c3:{key:'c3',label:'C3-like',short:'C3-like',color:'#19816e',fill:'#83cdb0'},
 intermediate:{key:'intermediate',label:'Mixed C3–C4',short:'C3–C4 intermediate',color:'#986000',fill:'#f4cd83'},
 c4:{key:'c4',label:'C4-like',short:'C4-like',color:'#3168c7',fill:'#9ebfec'},
 incipient:{key:'incipient',label:'Incipient C2',short:'Incipient C2',color:'#8160b0',fill:'#cbbce5'},
 c2:{key:'c2',label:'C2 / Type I-like',short:'C2 / Type I-like',color:'#007b92',fill:'#9bdee5'},
 c2c4:{key:'c2c4',label:'C2 + C4 / Type II-like',short:'C2 + C4',color:'#bd5426',fill:'#efb38c'},
 mean:{key:'mean',label:'Replicate mean',short:'Replicate mean',color:'#303f97',fill:'#b8c4f2'},
 other:{key:'other',label:'Other allocation',short:'Other allocation',color:'#687385',fill:'#e4e8ee'}
};
function type(p){if(p.strategy&&types[p.strategy])return types[p.strategy];return types[root.StrategyClassifier?root.StrategyClassifier.classify(Array.isArray(p)?{fractions:p}:p):'other'];}
function counts(surface){const out={};for(const p of surface?.points||[])if(p.feasible){const k=type(p).key;out[k]=(out[k]||0)+1;}return out;}
// Clip the continuous allocation simplex, independently of numerical grid resolution.
function clip(poly,index,threshold,above=true){const out=[],inside=f=>above?f[index]>=threshold-1e-12:f[index]<=threshold+1e-12;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ai=inside(a),bi=inside(b);if(ai)out.push(a);if(ai!==bi){const t=(threshold-a[index])/(b[index]-a[index]);out.push(a.map((v,j)=>v+t*(b[j]-v)));}}return out;}
const triangle=[[1,0,0],[0,1,0],[0,0,1]],polygons={
 other:triangle,
 intermediate:[0,1,2].reduce((p,i)=>clip(p,i,.05),triangle),
 c4:clip(clip(clip(triangle,1,.1,false),0,.1),2,.1),
 c3:clip(triangle,1,.9)
};
function path(ctx,poly,at){ctx.beginPath();poly.forEach((f,i)=>{const p=at(f);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();}
function paint(ctx,at,surface){if(!surface){for(const key of ['other','intermediate','c4','c3']){path(ctx,polygons[key],at);ctx.fillStyle=types[key].fill;ctx.fill();}return;}const n=surface.resolution,map=new Map(surface.points.map(p=>[p.i+','+p.j,p]));for(let i=0;i<n;i++)for(let j=0;j<n-i;j++){const triangles=[[[i,j],[i+1,j],[i,j+1]]];if(i+j<n-1)triangles.push([[i+1,j],[i+1,j+1],[i,j+1]]);for(const tri of triangles){const p=tri.map(([a,b])=>map.get(a+','+b));if(p.some(q=>!q))continue;const center=[0,1,2].map(k=>p.reduce((v,q)=>v+q.fractions[k],0)/3);p.forEach((q,k)=>{const mid=j=>q.fractions.map((v,l)=>(v+p[j].fractions[l])/2);path(ctx,[q.fractions,mid((k+1)%3),center,mid((k+2)%3)],at);ctx.fillStyle=q.feasible?type(q).fill:'#edf0f4';ctx.fill();});}}}
function hatch(ctx,poly){if(!poly.length)return;ctx.save();ctx.beginPath();poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();const xs=poly.map(p=>p.x),ys=poly.map(p=>p.y),l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys);ctx.fillStyle='#ffffff45';ctx.fillRect(l,t,r-l,b-t);ctx.strokeStyle='#52607855';ctx.lineWidth=.8;for(let x=l-(b-t);x<r;x+=9){ctx.beginPath();ctx.moveTo(x,b);ctx.lineTo(x+b-t,t);ctx.stroke();}ctx.restore();}
function mask(ctx,surface,at){const map=new Map(surface.points.map(p=>[p.i+','+p.j,p]));for(let i=0;i<surface.resolution;i++)for(let j=0;j<surface.resolution-i;j++){const keys=[[[i,j],[i+1,j],[i,j+1]]];if(i+j<surface.resolution-1)keys.push([[i+1,j],[i+1,j+1],[i,j+1]]);for(const tri of keys){const points=tri.map(([a,b])=>map.get(a+','+b));if(points.every(p=>p?.feasible&&Number.isFinite(p.logFitness)))continue;hatch(ctx,tri.map(([a,b])=>at([a/surface.resolution,b/surface.resolution,1-(a+b)/surface.resolution])));}}}
function legend(ctx,w,h,surface){const present=counts(surface),items=Object.keys(present),cols=w<650?2:3,rows=Math.ceil(items.length/cols),top=h-rows*19-16;ctx.font='12px system-ui';ctx.textAlign='left';items.forEach((key,i)=>{const x=12+(i%cols)*(w-24)/cols,y=top+Math.floor(i/cols)*19;ctx.fillStyle=types[key].fill;ctx.fillRect(x,y-9,9,9);ctx.fillStyle='#334358';ctx.fillText(types[key].short+' · '+present[key],x+13,y);});ctx.font='11px system-ui';ctx.fillText('Feasible grid samples · hatching = infeasible / unresolved',12,h-6);}
const api={types,type,polygons,paint,mask,legend,counts};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EvolutionRegions=api;
})(globalThis);
