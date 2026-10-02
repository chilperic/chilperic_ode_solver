(function(root){'use strict';
const Leaf=typeof module!=='undefined'&&module.exports?require('../leaf/leaf-engine.js'):root.ResearchLeaf;
function run(c,progress=()=>{}){
 for(const [k,lo,hi]of [['population',4,80],['generations',1,100],['mutation',0,.2],['selection',0,10],['seed',0,4294967295]])if(!Number.isFinite(c[k])||c[k]<lo||c[k]>hi)throw Error('Invalid '+k);
 for(const k of ['population','generations','seed'])if(!Number.isInteger(c[k]))throw Error(k+' must be an integer');
 if(!['c3','mixed','c4'].includes(c.start))throw Error('Choose an initial allocation.');
 let seed=c.seed>>>0;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return(seed+.5)/4294967296;},normal=()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random()),simplex=a=>{a=a.map(v=>Math.max(0,v));const total=a.reduce((s,v)=>s+v,0);return total?a.map(v=>v/total):[0,1,0];};
 const init={c3:[0,1,0],mixed:[.2,.5,.3],c4:[.4,0,.6]}[c.start],temperatures=c.seasonal?[15,25,35,25]:[c.p.airC],cache=new Map();
 function score(f){const key=f.join(',');if(cache.has(key))return cache.get(key);let A=0,E=0,T=0;for(const airC of temperatures){const r=Leaf.evaluate({formulation:'updated',p:{...c.p,airC,loopC4Only:1},gs:c.gs,fractions:f});if(!r.valid){const q={valid:false,reason:r.reason};cache.set(key,q);return q;}A+=r.carbon.assimilation;E+=r.physics.E;T+=r.physics.tm-273.15;}const q={valid:true,A:A/temperatures.length,E:E/temperatures.length,T:T/temperatures.length};cache.set(key,q);return q;}
 let pop=Array.from({length:c.population},()=>init.slice()),history=[];
 for(let g=0;g<=c.generations;g++){
  const scored=pop.map(f=>({f,...score(f)})),valid=scored.filter(x=>x.valid);if(!valid.length)throw Error('All individuals are infeasible at generation '+g+'. Adjust hydraulic or climatic conditions.');
  const mean=k=>valid.reduce((s,x)=>s+x[k],0)/valid.length,avg=[0,1,2].map(i=>pop.reduce((s,f)=>s+f[i],0)/pop.length),max=Math.max(...valid.map(x=>x.A)),weights=scored.map(x=>x.valid?Math.exp(c.selection*(x.A-max)/10):0),sum=weights.reduce((a,b)=>a+b,0);
  history.push({generation:g,fractions:avg,variance:[0,1,2].map(i=>pop.reduce((s,f)=>s+(f[i]-avg[i])**2,0)/pop.length),assimilation:mean('A'),transpiration:mean('E'),leafTemperature:mean('T'),feasible:valid.length,bestAssimilation:max});
  progress(g/c.generations);if(g===c.generations)return{schema:'fokolab.plant-continuum/1',model:'resource-constrained-leaf + haploid Wright–Fisher trait model',config:c,history,finalPopulation:scored,limitations:['Enzyme allocation is a reduced heritable trait, not a genotype or species identity.','Assimilation-weighted reproduction is an assumed fitness proxy; no reproductive yield or survival model.','No C2 glycine shuttle, evolving anatomy, genetic linkage or calibrated species parameters.','Seasonal option averages four fixed temperatures at identical irradiance; not a time-resolved climate series.','Not a native FokoLab research/1 import; adapter required.']};
  pop=Array.from({length:c.population},()=>{let u=random()*sum,i=0;while(i<weights.length-1&&u>weights[i])u-=weights[i++];return simplex(pop[i].map(v=>v+c.mutation*normal()));});
 }
}
const api={run};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Continuum=api;
})(globalThis);
