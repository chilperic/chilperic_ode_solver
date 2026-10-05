/** Finite recorded-candidate analysis. Never turns a projection into a complete Pareto front. */
export const VERSION='80.3.0';
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function validate(input){
 assert(input?.schema==='foko.decision/1','Expected foko.decision/1 JSON. Import a completed optimization or evolutionary result.');
 assert(Array.isArray(input.objectives)&&input.objectives.length>=2&&input.objectives.length<=6,'Declare 2–6 objectives with units and min/max directions.');
 const keys=new Set();for(const o of input.objectives){assert(o.key&&!keys.has(o.key)&&['min','max'].includes(o.direction),'Objectives require unique keys and min/max directions.');keys.add(o.key);assert(typeof o.unit==='string','Declare objective units, including dimensionless when appropriate.');}
 assert(Array.isArray(input.candidates)&&input.candidates.length>0&&input.candidates.length<=4000,'Provide 1–4000 recorded candidates. No candidate is silently sampled away.');
 const ids=new Set();for(const p of input.candidates){assert(p.id!==undefined&&!ids.has(String(p.id)),'Candidate IDs must be unique.');ids.add(String(p.id));assert(typeof p.feasible==='boolean','Each candidate must explicitly declare feasibility.');}
 if(input.events)for(const e of input.events)assert(ids.has(String(e.candidate))&&finite(e.time),'Every event needs a recorded candidate and a finite clock coordinate.');
 return input;
}
export function dominates(a,b,objectives){let better=false;for(const o of objectives){const s=o.direction==='max'?-1:1;if(s*a[o.key]>s*b[o.key])return false;if(s*a[o.key]<s*b[o.key])better=true;}return better;}
export function front(points,objectives){return points.filter((a,i)=>!points.some((b,j)=>i!==j&&dominates(b.values,a.values,objectives)));}
/** Exact 2D union of dominated rectangles, with fixed user-specified reference in raw units. */
export function hypervolume(points,objectives,reference){
 assert(objectives.length===2,'Hypervolume here is exact for two objectives only. No projected 3D volume is substituted.');
 assert(reference?.length===2&&reference.every(finite),'Supply two finite reference coordinates in the declared objective units.');
 const ref=reference.map((x,i)=>x*(objectives[i].direction==='max'?-1:1));
 const pts=points.map(p=>objectives.map(o=>p.values[o.key]*(o.direction==='max'?-1:1)));
 assert(pts.every(p=>p.every((v,i)=>v<=ref[i])),'Reference must be no better than every included feasible candidate, in both objective directions.');
 pts.sort((a,b)=>a[0]-b[0]);let area=0,top=ref[1];for(const [x,y]of pts)if(y<top){area+=(ref[0]-x)*(top-y);top=y;}return area;
}
export function analyse(raw,reference=null){const input=validate(raw),objectives=input.objectives;
 const usable=input.candidates.filter(p=>p.feasible&&p.valid!==false&&objectives.every(o=>finite(p.values?.[o.key])));
 const excluded=input.candidates.filter(p=>!usable.includes(p));assert(usable.length,'No feasible candidate has all declared objective values. Failed candidates are retained, not replaced by zeros.');
 const ranks=Object.create(null),layers=[],counts=usable.map(()=>0),beats=usable.map(()=>[]);for(let i=0;i<usable.length;i++)for(let j=i+1;j<usable.length;j++){if(dominates(usable[i].values,usable[j].values,objectives)){beats[i].push(j);counts[j]++;}else if(dominates(usable[j].values,usable[i].values,objectives)){beats[j].push(i);counts[i]++;}}let active=counts.flatMap((n,i)=>n===0?[i]:[]);while(active.length){const rank=layers.length;layers.push(active.map(i=>usable[i]));const next=[];for(const i of active){ranks[usable[i].id]=rank;for(const j of beats[i])if(--counts[j]===0)next.push(j);}active=next;}
 const ranges=objectives.map(o=>{const v=usable.map(p=>p.values[o.key]);return{min:Math.min(...v),max:Math.max(...v)};});
 const crowding=Object.create(null);for(const layer of layers){for(const p of layer)crowding[p.id]=0;for(let k=0;k<objectives.length;k++){const key=objectives[k].key,s=layer.slice().sort((a,b)=>a.values[key]-b.values[key]),span=s.at(-1).values[key]-s[0].values[key];if(!span)continue;crowding[s[0].id]=crowding[s.at(-1).id]=Infinity;for(let i=1;i<s.length-1;i++)crowding[s[i].id]+=(s[i+1].values[key]-s[i-1].values[key])/span;}}
 const correlation=objectives.map(a=>objectives.map(b=>{const x=usable.map(p=>p.values[a.key]),y=usable.map(p=>p.values[b.key]),mx=x.reduce((a,b)=>a+b)/x.length,my=y.reduce((a,b)=>a+b)/y.length;let xx=0,yy=0,xy=0;for(let i=0;i<x.length;i++){xx+=(x[i]-mx)**2;yy+=(y[i]-my)**2;xy+=(x[i]-mx)*(y[i]-my);}return xx&&yy?xy/Math.sqrt(xx*yy):null;}));
 let hv=null,hvHistory=[];if(reference){hv=hypervolume(usable,objectives,reference);if(input.clock==='function evaluations'&&usable.every(p=>finite(p.evaluation))){const sorted=usable.slice().sort((a,b)=>a.evaluation-b.evaluation);const checkpoints=[...new Set(sorted.map(p=>p.evaluation))];assert(checkpoints.length<=4000,'History budget exceeded.');for(let i=0;i<checkpoints.length;i+=Math.max(1,Math.ceil(checkpoints.length/100))){const t=checkpoints[i];hvHistory.push({evaluation:t,value:hypervolume(sorted.filter(p=>p.evaluation<=t),objectives,reference)});}const last=sorted.at(-1).evaluation;if(hvHistory.at(-1)?.evaluation!==last)hvHistory.push({evaluation:last,value:hv});}}
 return{input,usable,excluded,ranks,layers:layers.map(f=>f.map(p=>p.id)),front:layers[0],ranges,crowding,correlation,hypervolume:hv,hypervolumeHistory:hvHistory,reference,scope:'Nondomination uses ALL declared objectives. A finite nondominated set is not a certified global front. Candidate correlation is descriptive, not independent-sample inference.'};
}
export function nativeInput(source){
 if(source?.schema==='foko.decision-analysis/1')return validate(source.input);
 if(source?.schema==='foko.decision/1')return validate(source);
 const r=source?.result||source;assert(r,'No completed source result.');
 const meta={sourceLab:source.lab||'optimization',configuration:r.config||source.config,limitations:r.limitations||[],original:source};
 const physiology=[{key:'carbon',label:'Carbon gain',direction:'max',unit:'mol C m⁻² per evaluation period'},{key:'water',label:'Water use',direction:'min',unit:'mol H₂O m⁻² per evaluation period'},{key:'heat',label:'Heat exposure',direction:'min',unit:'K h per evaluation period'}];
 const toCandidate=(p,i)=>({id:String(p.nodeId??p.id??i),values:{carbon:p.carbon??null,water:p.water??null,heat:p.heat??null},feasible:p.feasible===true,valid:p.valid!==false,reason:p.reason||'',traits:{PEPC:p.fractions?.[0]??null,mesophyll:p.fractions?.[1]??null,sheath:p.fractions?.[2]??null,gs:p.gs??null},source:p});
 if(r.schema==='dynamics.kimura/1'){
  const events=(r.replicates||[]).flatMap((rep,i)=>rep.events.map(e=>({...e,replicate:i+1,seed:rep.seed,candidate:String(e.node),termination:rep.termination,observedUntil:rep.observedUntil})));
  return validate({schema:'foko.decision/1',title:'Recorded evolutionary landscape',clock:'biological generations',objectives:physiology,candidates:r.nodes.map(toCandidate),events,provenance:meta});
 }
 if(r.schema==='fokolab.plant-approaches/1'){
  const candidates=r.samples.map((p,i)=>({...toCandidate(p,i),id:String(i),evaluation:r.config?.method==='evolution'?undefined:i+1}));
  return validate({schema:'foko.decision/1',title:'Physiological trade-offs · '+r.config.method,clock:r.config.method==='evolution'?'biological generations':'function evaluations',objectives:physiology,candidates,history:r.history,replicates:r.replicates,provenance:meta});
 }
 if(source?.kind==='optimization'){
  assert(source.pareto?.points?.length,'This optimization has only one objective. Define a secondary objective and rerun for Pareto analysis. Native convergence views remain available.');
  const objectives=[{key:'primary',label:source.model?.objective||'Primary objective',direction:source.pareto.primarySense==='maximize'?'max':'min',unit:'model-declared units'},{key:'secondary',label:source.model?.secondaryObjective||'Secondary objective',direction:source.pareto.secondarySense==='maximize'?'max':'min',unit:'model-declared units'}];
  return validate({schema:'foko.decision/1',title:'Recorded finite Pareto sample',clock:'function evaluations',objectives,candidates:source.pareto.points.map((p,i)=>({id:String(i),evaluation:i+1,values:{primary:p.objective,secondary:p.secondaryObjective},feasible:p.feasible,valid:Number.isFinite(p.objective),violation:p.maxViolation,traits:Object.fromEntries((source.model?.variables||[]).map((v,k)=>[v.name,p.x[k]])),source:p})),history:source.result?.history,provenance:{...meta,original:source}});
 }
 throw Error('Unsupported result type. Use a completed multi-objective optimization, evolutionary landscape, or foko.decision/1 JSON. No generic X–Y conversion is substituted.');
}
export function demo(){const candidates=[];for(let i=0;i<=40;i++){const x=i/40;candidates.push({id:'A'+i,evaluation:i+1,values:{loss:x*x,cost:(1-x)**2},feasible:true,valid:true,traits:{x}});if(i%4===0)candidates.push({id:'D'+i,evaluation:42+i,values:{loss:x*x+.25,cost:(1-x)**2+.25},feasible:true,valid:true,traits:{x}});}candidates.push({id:'failed',values:{loss:null,cost:null},feasible:false,valid:false,reason:'Synthetic infeasibility example'});return{schema:'foko.decision/1',title:'Analytic two-objective teaching example',clock:'function evaluations',objectives:[{key:'loss',label:'Squared distance to 0',direction:'min',unit:'dimensionless'},{key:'cost',label:'Squared distance to 1',direction:'min',unit:'dimensionless'}],candidates,provenance:{origin:'synthetic teaching example',model:'f1=x², f2=(1−x)², 0≤x≤1; extra dominated and failed candidates are explicit.'}};}
