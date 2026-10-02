/* Foko Kuate (2019), chapter 4, reactions preceding equation 4.1.8.
 * Time unit selected as hours; presets are illustrative, not fitted parameters.
 */
(function(root){
'use strict';
const core=typeof module!=='undefined'&&module.exports?require('../shared/linear-network.js'):root.LinearNetwork;
const specification={id:'tcell-activation-2019',version:1,title:'Generation-structured T-cell activation',source:'Mathematical models of T cell proliferation, with potential applications to data (2019), pp. 28–34, eq. 4.1.8',timeUnit:'h',parameterStatus:'Illustrative; not fitted to experimental data',solver:'Gillespie direct method; RK4 integration of exact closed moment equations'};
function validate(c){for(const [k,lo,hi]of [['initial',1,50],['generations',0,8],['repetitions',2,500],['hours',1,240],['seed',0,4294967295]])if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi||!Number.isInteger(c[k]))throw Error(`${k} must be an integer between ${lo} and ${hi}.`);for(const k of ['activation','division','death'])if(!Array.isArray(c[k])||c[k].length!==c.generations+1||c[k].some(v=>!Number.isFinite(v)||v<0||v>2))throw Error(`${k}: enter one rate per generation, each between 0 and 2 per hour.`);if(c.division[c.generations]!==0)throw Error('Division at the terminal generation must be zero.');}
function network(c){validate(c);const g=c.generations+1,n=2*g,initial=Array(n).fill(0),reactions=[];initial[c.model==='birthdeath'?g:0]=c.initial;
 for(let i=0;i<g;i++){if(c.model!=='birthdeath')reactions.push({source:i,rate:c.activation[i],changes:[[i,-1],[g+i,1]],kind:'activation',generation:i});if(i<g-1)reactions.push({source:g+i,rate:c.division[i],changes:[[g+i,-1],[(c.model==='birthdeath'?g:0)+i+1,2]],kind:'division',generation:i});reactions.push({source:g+i,rate:c.death[i],changes:[[g+i,-1]],kind:'death',generation:i});}return{initial,reactions};}
function aggregateMoment(m,g){const totalMean=m.mean.reduce((a,b)=>a+b,0),totalVar=Math.max(0,m.cov.reduce((a,b)=>a+b,0));return{totalMean,totalVar,generationMean:Array.from({length:g},(_,i)=>m.mean[i]+m.mean[g+i]),generationVar:Array.from({length:g},(_,i)=>Math.max(0,m.cov[i*2*g+i]+m.cov[(g+i)*2*g+g+i]+2*m.cov[i*2*g+g+i]))};}
function experiment(c,progress=()=>{}){
 validate(c);const model=network(c),g=c.generations+1,times=Array.from({length:121},(_,i)=>c.hours*i/120),theory=core.moments(model,times).map(m=>aggregateMoment(m,g)),summary=times.map(()=>({mean:0,M2:0,generationMean:Array(g).fill(0),generationM2:Array(g).fill(0)})),budget={remaining:2000000};
 let cells=[],events=[],first=[],secondCells=[],secondEvents=[],second=[];let savedCells,savedEvents;const finals=[];
 for(let rep=0;rep<c.repetitions;rep++){
  const random=core.rng((c.seed+Math.imul(rep,2654435761))>>>0),pick=core.rng((c.seed^0x9E3779B9)>>>0);let pools,dead=0,divisions=0;
  if(rep<2){if(rep===1){savedCells=cells;savedEvents=events;cells=[];events=[];}pools=Array.from({length:2*g},()=>[]);for(let i=0;i<c.initial;i++){pools[c.model==='birthdeath'?g:0].push(i);cells.push({id:i,parent:null,founder:i,generation:0,born:0,activated:c.model==='birthdeath'?0:null,end:null,fate:null,children:[]});}events=[{time:0,total:c.initial,q:c.model==='birthdeath'?0:c.initial,a:c.model==='birthdeath'?c.initial:0,dead:0,divisions:0}];}
  const rows=core.simulate(model,times,random,{budget,onEvent:rep<2?(time,ri,x)=>{const r=model.reactions[ri],pool=pools[r.source],index=Math.floor(pick()*pool.length),id=pool[index],cell=cells[id];pool[index]=pool[pool.length-1];pool.pop();
   if(r.kind==='activation'){cell.activated=time;pools[g+r.generation].push(id);}else{cell.end=time;cell.fate=r.kind;if(r.kind==='death')dead++;else{divisions++;for(let k=0;k<2;k++){const child=cells.length;cells.push({id:child,parent:id,founder:cell.founder,generation:cell.generation+1,born:time,activated:c.model==='birthdeath'?time:null,end:null,fate:null,children:[]});cell.children.push(child);pools[(c.model==='birthdeath'?g:0)+r.generation+1].push(child);}}}
   const q=x.slice(0,g).reduce((a,b)=>a+b,0),a=x.slice(g).reduce((a,b)=>a+b,0);events.push({time,total:q+a,q,a,dead,divisions});
  }:undefined});
  if(rep===0)first=rows;if(rep===1){second=rows;secondCells=cells;secondEvents=events;cells=savedCells;events=savedEvents;}finals.push(rows.at(-1).reduce((a,b)=>a+b,0));
  rows.forEach((row,j)=>{const s=summary[j],total=row.reduce((a,b)=>a+b,0),delta=total-s.mean;s.mean+=delta/(rep+1);s.M2+=delta*(total-s.mean);for(let i=0;i<g;i++){const v=row[i]+row[g+i],d=v-s.generationMean[i];s.generationMean[i]+=d/(rep+1);s.generationM2[i]+=d*(v-s.generationMean[i]);}});
  if(rep%5===0||rep===c.repetitions-1)progress({done:rep+1,total:c.repetitions});
 }
 return{specification:c.model==='birthdeath'?{...specification,id:'tcell-birth-death',title:'Generation-structured birth–death ODE',source:'Linear birth–death model family reviewed in the AIMS thesis (2016), section 2.2. Mean ODE plus exact stochastic realizations.',solver:'Linear mean/covariance ODEs; Gillespie direct method'}:specification,config:c,times,theory,summary:summary.map(s=>({mean:s.mean,variance:s.M2/(c.repetitions-1),generationMean:s.generationMean,generationVariance:s.generationM2.map(x=>x/(c.repetitions-1))})),first,cells,events,second,secondCells,secondEvents,finals,eventsSimulated:2000000-budget.remaining};
}
const api={specification,validate,network,experiment,aggregateMoment};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TCellModel=api;
})(globalThis);
