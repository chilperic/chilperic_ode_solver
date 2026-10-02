/* Shared numerical core for constant-rate, unimolecular Markov reaction networks.
 * Model modules supply states, linear hazards and integer changes; no drawing here.
 */
(function(root){
'use strict';
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function validate(model){const n=model.initial.length;if(!n||model.initial.some(x=>!Number.isInteger(x)||x<0))throw Error('Initial counts must be nonnegative integers.');for(const r of model.reactions){if(!Number.isInteger(r.source)||r.source<0||r.source>=n||!Number.isFinite(r.rate)||r.rate<0)throw Error('Invalid reaction hazard.');if(!r.changes.length||r.changes.some(([i,v])=>!Number.isInteger(i)||i<0||i>=n||!Number.isInteger(v)))throw Error('Invalid reaction change.');}}
function simulate(model,times,random,{onEvent=()=>{},budget={remaining:2000000}}={}){
 validate(model);const x=model.initial.slice(),samples=[];let t=0,si=0;
 while(si<times.length){let total=0;const hazards=model.reactions.map(r=>{const a=r.rate*x[r.source];total+=a;return a;});
  const next=total>0?t-Math.log(1-random())/total:Infinity;
  while(si<times.length&&times[si]<next){samples.push(x.slice());si++;}
  if(si===times.length)break;
  if(--budget.remaining<0)throw Error('Experiment exceeds 2,000,000 events. Reduce founders, generations, duration or repetitions. No partial ensemble is reported.');
  let target=random()*total,ri=hazards.length-1;for(let j=0;j<hazards.length;j++){target-=hazards[j];if(target<0){ri=j;break;}}
  const r=model.reactions[ri];for(const [i,v]of r.changes)x[i]+=v;
  if(x.some(v=>v<0))throw Error('Reaction produced a negative count.');t=next;onEvent(t,ri,x);
 }
 return samples;
}
// For linear hazards: m' = Bm; C' = BC + CBᵀ + sum(v vᵀ a(m)).
// This closes exactly; only integration introduces approximation.
function moments(model,times,stepScale=1){
 validate(model);const n=model.initial.length,nn=n*n,size=n+nn;let y=new Float64Array(size);y.set(model.initial);let t=0;
 const exits=new Float64Array(n);for(const r of model.reactions)exits[r.source]+=r.rate;
 const dtMax=Math.min(.1,.04/Math.max(1e-12,...exits))*stepScale;
 function derivative(z){const d=new Float64Array(size);for(const r of model.reactions){const a=r.rate,src=r.source,mean=a*z[src];for(const [i,v]of r.changes){d[i]+=v*mean;for(let j=0;j<n;j++){d[n+i*n+j]+=v*a*z[n+src*n+j];d[n+j*n+i]+=v*a*z[n+j*n+src];}for(const [j,w]of r.changes)d[n+i*n+j]+=v*w*mean;}}return d;}
 function add(z,k,h){return z.map((v,i)=>v+h*k[i]);}
 return times.map(target=>{while(t<target-1e-10){const h=Math.min(dtMax,target-t),k1=derivative(y),k2=derivative(add(y,k1,h/2)),k3=derivative(add(y,k2,h/2)),k4=derivative(add(y,k3,h));for(let i=0;i<size;i++)y[i]+=h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6;t+=h;}return{mean:Array.from(y.slice(0,n)),cov:Array.from(y.slice(n))};});
}
const api={rng,validate,simulate,moments};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LinearNetwork=api;
})(globalThis);
