import {plantBalance,leafExperiment,adaptation,dice,diffusion} from './physiology.mjs';
import {stochastic,branching,fractals,line,plot} from './biology.mjs';
export const clone=x=>JSON.parse(JSON.stringify(x));
export function validateRequest(raw){
 const q=clone(raw),lab=globalThis.FokoUpgrade.labs.find(x=>x.id===q.lab);
 if(!lab)throw Error('Unknown laboratory. Select a registered experiment.');
 if(!lab.methods.some(m=>m[0]===q.method))throw Error('The selected method does not belong to this laboratory.');
 for(const k of ['t0','tEnd','step','samples','seed','rtol','atol'])if(typeof q[k]!=='number'||!Number.isFinite(q[k]))throw Error(k+' must be a finite number.');
 if(q.tEnd<=q.t0)throw Error('End time must be greater than start time.');
 if(q.tEnd-q.t0>10000)throw Error('The requested horizon exceeds the 10,000-unit browser budget.');
 if(q.step<=0||q.rtol<=0||q.atol<=0)throw Error('Step and numerical tolerances must be positive.');
 if(!Number.isInteger(q.samples)||q.samples<20||q.samples>1500)throw Error('Choose 20–1,500 stored samples. Output sampling is not the internal integration step.');
 if(!Number.isInteger(q.seed)||q.seed<0||q.seed>4294967295)throw Error('Seed must be an integer in [0, 4294967295].');
 for(const f of lab.fields){const v=q.params[f.key];if(f.type==='select'){if(!f.options.includes(v))throw Error('Unsupported '+f.label+'.');}else{if(typeof v!=='number'||!Number.isFinite(v)||v<f.min||v>f.max)throw Error(`${f.label} must be a finite number between ${f.min} and ${f.max}.`);}}
 for(const key of ['paths','faces','rolls','initial','nodes','resolution','points','N']){
  if(['initial'].includes(key)&&q.lab!=='branching'&&!(q.lab==='randomness'&&q.method==='ssa'))continue;
  if(q.params[key]!=null&&['paths','faces','rolls','initial','nodes','resolution','points','N'].includes(key)&&!Number.isInteger(q.params[key]))throw Error(key+' must be an integer for this process.');
 }
 if(['branching','adaptation'].includes(q.lab)&&(!Number.isInteger(q.tEnd-q.t0)||q.t0!==0))throw Error('These generation processes start at zero and require an integer final generation.');
 if(q.lab==='adaptation'&&q.params.season>q.params.year)throw Error('The fitness window cannot exceed the declared environmental cycle.');
 if(['lipids','tcell'].includes(q.lab)){
  if(!q.modelSpec)throw Error('A model specification is required.');
  if(q.modelSpec.vars?.length>64)throw Error('This additive runner supports up to 64 states. The original workspaces retain their own documented limits.');
  const priority=q.modelSpec.plotPriority; q.modelSpec=globalThis.FokoProjectCore.normalizeModel({...q.modelSpec,t0:q.t0,t1:q.tEnd,points:q.samples,method:q.method,rtol:q.rtol,atol:q.atol,initialStep:q.step,maxStep:'auto'}); if(priority)q.modelSpec.plotPriority=priority;
  for(const [key,v] of Object.entries(q.params)){if(!q.modelSpec.params[key])throw Error('Unknown model parameter '+key);const r=q.modelSpec.params[key];if(!Number.isFinite(v)||v<r[1]||v>r[2])throw Error(`${key} must lie within its declared [${r[1]}, ${r[2]}] range.`);r[0]=v;}
 }
 return q;
}
export async function originalODE(q){
 const model=q.modelSpec,core=globalThis.FokoStudioCompute;
 const r=await core.execute({kind:'simulation',model},{ODE:globalThis.FokoODECore,math:globalThis.math},{stepBudget:500000});
 const rows=r.T.map((t,i)=>[t,...r.Y.map(y=>y[i])]),priority=model.plotPriority||model.vars,ids=priority.map(n=>model.vars.indexOf(n)).filter(i=>i>=0),show=ids.length?ids: model.vars.map((_,i)=>i),index=q.output||0;
 const norm=r.Y.map(y=>{const lo=Math.min(...y),hi=Math.max(...y);return y.map(v=>hi===lo?0:(v-lo)/(hi-lo));});
 const plots=[plot('trajectory','Original model trajectories',show.slice(0,8).map(i=>line(r.T,r.Y[i],model.vars[i])),'Time ('+(model.timeUnit||'source units')+')','State value (see model units)'),plot('normalized','All states · range normalized',r.Y.map((_,i)=>line(r.T,norm[i],model.vars[i])),'Time','Within-run range [0,1]'),plot('heatmap','All states × time',[{type:'heatmap',x:r.T,y:model.vars,z:norm,colorscale:'Viridis',colorbar:{title:'Normalized'}}],'Time','State'),plot('phase','Two-state phase portrait',[line(r.Y[0],r.Y[1]||r.Y[0],model.vars.slice(0,2).join(' / '))],model.vars[0],model.vars[1]||model.vars[0])];
 if(model.vars.length>=3)plots.push(plot('phase3d','Three-state trajectory',[{type:'scatter3d',mode:'lines',x:r.Y[0],y:r.Y[1],z:r.Y[2],line:{width:4,color:r.T,colorscale:'Viridis'},name:'First three states'}],'','',{scene:{xaxis:{title:model.vars[0]},yaxis:{title:model.vars[1]},zaxis:{title:model.vars[2]}}}));
 const metrics={'States':model.vars.length,'Function evaluations':r.diagnostics.functionEvaluations,'Accepted steps':r.diagnostics.accepted,'Rejected steps':r.diagnostics.rejected};
 if(model.vars.includes('ECoA')){const es=model.vars.map((v,i)=>v.startsWith('E')?i:-1).filter(i=>i>=0),values=r.T.map((_,j)=>es.reduce((s,i)=>s+r.Y[i][j],0));plots.push(plot('enzyme','Total FAS occupancy',[line(r.T,values,'Free + bound enzyme')],'Time','Total enzyme (source units)'));metrics['Max enzyme-pool deviation']=Math.max(...values.map(v=>Math.abs(v-values[0])));}
 if(q.lab==='tcell')plots.push(plot('generations','Total and generation-resolved counts',[line(r.T,r.T.map((_,i)=>r.Y.reduce((s,v)=>s+v[i],0)),'Total cells'),...r.Y.map((v,i)=>line(r.T,v,model.vars[i],{line:{dash:'dot'}}))],'Time (days)','Cell count'));
 return{columns:['time',...model.vars],rows,plots,metrics,warnings:[model.description||model.narrative||'Inspect the model equations and source.',...(r.diagnostics.warning?[r.diagnostics.warning]:[])],diagnostics:r.diagnostics,timeSeries:true,modelSpec:model};
}
export async function compute(raw){
 const q=validateRequest(raw),started=performance.now();let r;
 switch(q.lab){case'plant':r=plantBalance(q);break;case'leaf':r=leafExperiment(q);break;case'adaptation':r=adaptation(q);break;case'lipids':case'tcell':r=await originalODE(q);break;case'randomness':r=q.method==='dice'?dice(q):stochastic(q);break;case'branching':r=branching(q);break;case'diffusion':r=diffusion(q);break;case'fractals':r=fractals(q);break;default:throw Error('Unknown computation.');}
 if(!Array.isArray(r.rows)||!r.rows.length||r.rows.some(row=>row.some(x=>typeof x!=='number'||!Number.isFinite(x))))throw Error('The computation produced an invalid result table. No result was published.');
 r.request=q;r.version='79.2.0';r.runtimeMs=performance.now()-started;r.createdAt=new Date().toISOString();return r;
}
