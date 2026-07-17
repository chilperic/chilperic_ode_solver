/* ODE Lab worker: safe parsing via Math.js, no new Function. */
importScripts('../assets/vendor/mathjs/math-15.2.0.js?v=72.46.0');
importScripts('core/ode.js?v=72.46.0');

const ALLOWED_FUNCS = new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','exp','log','log10','sqrt','abs','min','max','pow','floor','ceil','round']);
const ALLOWED_CONSTS = new Set(['pi','e','PI','E']);
let cancelled = false;
function mulberry32(seed){ let a=(Number(seed)||12345)>>>0; return function(){ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; }; }
self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (msg.type === 'cancel') { cancelled = true; return; }
  cancelled = false;
  try {
    if (msg.type === 'solve') respond(solveJob(msg.payload));
    if (msg.type === 'sweep') respond(sweepJob(msg.payload));
    if (msg.type === 'opt') respond(optJob(msg.payload));
    if (msg.type === 'fitOde') respond(fitOdeJob(msg.payload));
  } catch (err) {
    respond({ ok:false, error: cleanErr(err) });
  }
};
function respond(payload){ postMessage(payload); }
function progress(p, text){ postMessage({progress:p, text}); }
function cleanErr(err){ return String((err && err.message) || err).slice(0, 500); }
function preprocess(s){ return String(s||'0').trim(); } // Math.js accepts ^ for powers; do not convert to JS ** here.
function collectSymbols(node){ const out = new Set(); node.traverse(n => { if (n.isSymbolNode) out.add(n.name); }); return out; }
function compileSafe(expr, allowedSymbols){
  const source = preprocess(expr);
  let node;
  try { node = math.parse(source); } catch(e){ throw new Error(`Cannot parse expression: ${expr}`); }
  const symbols = collectSymbols(node);
  for (const s of symbols) {
    if (allowedSymbols.has(s) || ALLOWED_CONSTS.has(s) || ALLOWED_FUNCS.has(s)) continue;
    throw new Error(`Unknown symbol "${s}" in expression "${expr}"`);
  }
  return { expr, node, compiled: node.compile() };
}
function evalCompiled(comp, scope){
  const v = comp.compiled.evaluate(scope);
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Expression produced non-finite value: ${comp.expr}`);
  return v;
}
function makeRhs(cfg){
  const allowed = new Set(['t', ...cfg.vars, ...Object.keys(cfg.params||{})]);
  const comps = cfg.eqs.map(e => compileSafe(e, allowed));
  return function(t, y, params){
    const scope = { t, ...params };
    for (let i=0;i<cfg.vars.length;i++) scope[cfg.vars[i]] = y[i];
    return comps.map(c => evalCompiled(c, scope));
  };
}
function solveJob(cfg){
  const rhs = makeRhs(cfg);
  return self.FokoODECore.solveWithRhs(cfg, rhs, {
    cancelled: () => cancelled,
    progress: (fraction, label) => progress(fraction, label),
    now: () => performance.now()
  });
}

function metric(vals,m){ if(!vals.length)return NaN; if(m==='max')return Math.max(...vals); if(m==='min')return Math.min(...vals); if(m==='final')return vals[vals.length-1]; return vals.reduce((a,b)=>a+b,0)/vals.length; }
function sweepJob(cfg){
  if (cfg.sweepA === cfg.sweepB) throw new Error('Sweep parameters A and B must be different.');
  const n = Math.max(4, Math.min(25, Number(cfg.sweepN)||18));
  const pA=cfg.paramDefs[cfg.sweepA], pB=cfg.paramDefs[cfg.sweepB];
  if (!pA || !pB) throw new Error('Missing sweep parameter range.');
  const xs=Array.from({length:n},(_,i)=>pA.min+(pA.max-pA.min)*i/(n-1));
  const ys=Array.from({length:n},(_,i)=>pB.min+(pB.max-pB.min)*i/(n-1));
  const z=[]; const base={...cfg.params}; const total=n*n; let done=0;
  for(let j=0;j<n;j++){
    const row=[];
    for(let i=0;i<n;i++){
      if(cancelled) return {ok:false,cancelled:true,error:'Cancelled'};
      const params={...base,[cfg.sweepA]:xs[i],[cfg.sweepB]:ys[j]};
      const sol=solveJob({...cfg, params, points:Math.min(Number(cfg.points)||500, 900), method:['radau','bdf','lsoda','dop853'].includes(cfg.method)?'rk45':cfg.method});
      const vi=cfg.vars.indexOf(cfg.sweepVar);
      row.push(metric(sol.Y[vi], cfg.sweepMetric));
      done++; if(done%5===0) progress(done/total,'Sweeping');
    }
    z.push(row);
  }
  return {ok:true, kind:'sweep', x:xs, y:ys, z, sweepA:cfg.sweepA, sweepB:cfg.sweepB, sweepVar:cfg.sweepVar, sweepMetric:cfg.sweepMetric};
}

function interpAt(T, Yrow, t){
  if(t<=T[0]) return Yrow[0];
  if(t>=T[T.length-1]) return Yrow[Yrow.length-1];
  let lo=0, hi=T.length-1;
  while(hi-lo>1){ const mid=(lo+hi)>>1; if(T[mid]<=t) lo=mid; else hi=mid; }
  const a=(t-T[lo])/Math.max(1e-12,T[hi]-T[lo]);
  return Yrow[lo]*(1-a)+Yrow[hi]*a;
}

function solve(A,b){
  A=A.map(r=>r.slice().map(Number)); b=b.slice().map(Number);
  const n=A.length;
  for(let k=0;k<n;k++){
    let p=k; for(let i=k+1;i<n;i++) if(Math.abs(A[i][k])>Math.abs(A[p][k])) p=i;
    if(Math.abs(A[p][k])<1e-14) throw new Error('Singular normal matrix during ODE fit. Narrow the fitted parameters or improve data coverage.');
    [A[k],A[p]]=[A[p],A[k]]; [b[k],b[p]]=[b[p],b[k]];
    const piv=A[k][k]; for(let j=k;j<n;j++) A[k][j]/=piv; b[k]/=piv;
    for(let i=0;i<n;i++) if(i!==k){ const f=A[i][k]; for(let j=k;j<n;j++) A[i][j]-=f*A[k][j]; b[i]-=f*b[k]; }
  }
  return b;
}

function fitResidualVector(cfg, params){
  const sol=solveJob({...cfg, params, points:Math.min(Math.max(Number(cfg.points)||800, 200), 1800), method:['radau','bdf','lsoda','dop853'].includes(cfg.method)?'rk45':cfg.method});
  const obs=cfg.observations, rows=obs.rows||[], cols=obs.columns||[];
  const r=[];
  for(const row of rows){
    const t=Number(row[obs.timeCol]); if(!Number.isFinite(t)) continue;
    for(const col of cols){
      const vi=cfg.vars.indexOf(col);
      if(vi<0 || !Number.isFinite(Number(row[col]))) continue;
      r.push(interpAt(sol.T, sol.Y[vi], t)-Number(row[col]));
    }
  }
  if(!r.length) throw new Error('Observed data columns must match at least one ODE variable for fitting.');
  return {r, sol};
}
function sseOf(v){ return v.reduce((a,b)=>a+b*b,0); }
function fitOdeJob(cfg){
  const vary=(cfg.vary||[]).filter(k=>cfg.paramDefs && cfg.paramDefs[k]);
  if(!vary.length) throw new Error('No variable parameters supplied for ODE fitting.');
  const maxIter=Math.max(4, Math.min(80, Number(cfg.maxIter)||36));
  let params={...(cfg.params||{})};
  let theta=vary.map(k=>Number(params[k]));
  const lower=vary.map(k=>Number(cfg.paramDefs[k].min));
  const upper=vary.map(k=>Number(cfg.paramDefs[k].max));
  function clampTheta(th){ return th.map((v,i)=>Math.max(Math.min(v, upper[i]), lower[i])); }
  function toParams(th){ const p={...params}; vary.forEach((k,i)=>p[k]=th[i]); return p; }
  let best=fitResidualVector(cfg, toParams(theta));
  let bestSse=sseOf(best.r), lambda=1e-2;
  for(let it=0; it<maxIter; it++){
    if(cancelled) return {ok:false,cancelled:true,error:'Cancelled'};
    const baseR=best.r, n=baseR.length, m=theta.length;
    const J=Array.from({length:n},()=>Array(m).fill(0));
    for(let j=0;j<m;j++){
      const h=Math.max(1e-5, Math.abs(theta[j])*1e-4, Math.abs(upper[j]-lower[j])*1e-5);
      const thp=clampTheta(theta.map((v,i)=>i===j?v+h:v));
      const thm=clampTheta(theta.map((v,i)=>i===j?v-h:v));
      const rp=fitResidualVector(cfg, toParams(thp)).r;
      const rm=fitResidualVector(cfg, toParams(thm)).r;
      const den=Math.max(1e-12, thp[j]-thm[j]);
      for(let i=0;i<n;i++) J[i][j]=(rp[i]-rm[i])/den;
    }
    const A=Array.from({length:m},()=>Array(m).fill(0)), g=Array(m).fill(0);
    for(let i=0;i<n;i++) for(let a=0;a<m;a++){ g[a]+=J[i][a]*baseR[i]; for(let b=0;b<m;b++) A[a][b]+=J[i][a]*J[i][b]; }
    for(let a=0;a<m;a++) A[a][a]+=lambda;
    let step;
    try{ step=solve(A,g); }catch(e){ break; }
    const cand=clampTheta(theta.map((v,i)=>v-step[i]));
    const candFit=fitResidualVector(cfg, toParams(cand));
    const candSse=sseOf(candFit.r);
    if(candSse<bestSse){ theta=cand; best=candFit; bestSse=candSse; lambda*=0.6; }
    else lambda*=2.5;
    progress((it+1)/maxIter,'Fitting ODE');
    if(Math.sqrt(step.reduce((a,b)=>a+b*b,0))<1e-7) break;
  }
  params=toParams(theta);
  const final=fitResidualVector(cfg, params);
  const n=final.r.length, m=theta.length, sigma2=sseOf(final.r)/Math.max(1,n-m);
  const J=Array.from({length:n},()=>Array(m).fill(0));
  for(let j=0;j<m;j++){
    const h=Math.max(1e-5, Math.abs(theta[j])*1e-4, Math.abs(upper[j]-lower[j])*1e-5);
    const thp=clampTheta(theta.map((v,i)=>i===j?v+h:v));
    const thm=clampTheta(theta.map((v,i)=>i===j?v-h:v));
    const rp=fitResidualVector(cfg, toParams(thp)).r;
    const rm=fitResidualVector(cfg, toParams(thm)).r;
    const den=Math.max(1e-12, thp[j]-thm[j]);
    for(let i=0;i<n;i++) J[i][j]=(rp[i]-rm[i])/den;
  }
  const JTJ=Array.from({length:m},()=>Array(m).fill(0));
  for(let row of J) for(let a=0;a<m;a++) for(let b=0;b<m;b++) JTJ[a][b]+=row[a]*row[b];
  const ci=[]; const samples=[theta.slice()];
  for(let j=0;j<m;j++){
    let se=NaN;
    try{ const e=Array(m).fill(0); e[j]=1; const col=solve(JTJ,e); se=Math.sqrt(Math.max(0,col[j]*sigma2)); }catch(_e){ se=(upper[j]-lower[j])/10; }
    const low=Math.max(lower[j], theta[j]-1.96*se), high=Math.min(upper[j], theta[j]+1.96*se);
    ci.push({name:vary[j],estimate:theta[j],se,low,high});
    const lo=theta.slice(); lo[j]=low; samples.push(lo);
    const hi=theta.slice(); hi[j]=high; samples.push(hi);
  }
  const baseSol=final.sol;
  const bands={};
  cfg.vars.forEach((v,vi)=>{ bands[v]={low:baseSol.Y[vi].slice(), high:baseSol.Y[vi].slice()}; });
  for(const th of samples.slice(1,13)){
    try{
      const sol=solveJob({...cfg, params:toParams(th), points:baseSol.T.length, method:['radau','bdf','lsoda','dop853'].includes(cfg.method)?'rk45':cfg.method});
      cfg.vars.forEach((v,vi)=>{ for(let i=0;i<baseSol.T.length;i++){ bands[v].low[i]=Math.min(bands[v].low[i], sol.Y[vi][i]); bands[v].high[i]=Math.max(bands[v].high[i], sol.Y[vi][i]); } });
    }catch(_e){}
  }
  const k=m, rmse=Math.sqrt(sseOf(final.r)/Math.max(1,n));
  return {ok:true, kind:'ode_fit', params, ci, rmse, sse:sseOf(final.r), aic:n*Math.log(Math.max(1e-12,sseOf(final.r)/n))+2*k, bic:n*Math.log(Math.max(1e-12,sseOf(final.r)/n))+k*Math.log(Math.max(1,n)), bands, solution:baseSol};
}

function optJob(cfg){
  const names = cfg.variables.map(v=>v.name);
  const allowed = new Set(names);
  const obj = compileSafe(cfg.objective, allowed);
  const obj2 = cfg.objective2 ? compileSafe(cfg.objective2, allowed) : null;
  const gs = (cfg.ineq||[]).filter(Boolean).map(str=>compileSafe(str, allowed));
  const hs = (cfg.eq||[]).filter(Boolean).map(str=>compileSafe(str, allowed));
  const lo=cfg.variables.map(v=>Number(v.lower)), hi=cfg.variables.map(v=>Number(v.upper));
  const x0=cfg.variables.map(v=>Number(v.initial));
  const penalty=Number(cfg.penalty)||1e6;
  const budget=Math.max(100, Math.min(100000, Number(cfg.samples)||3500));
  const popSize=Math.max(8, Math.min(400, Number(cfg.population)||36));
  const temperature=Math.max(1e-9, Number(cfg.temperature)||1);
  const tol=Math.max(1e-14, Number(cfg.tolerance)||1e-8);
  const algorithm=cfg.algorithm || 'random_coord';
  const rand = mulberry32(cfg.seed || 12345);
  const sign = cfg.sense === 'maximize' ? -1 : 1;
  function scope(x){ const s={}; names.forEach((n,i)=>s[n]=x[i]); return s; }
  function rawObj(x){ return evalCompiled(obj, scope(x)); }
  function rawObj2(x){ return obj2 ? evalCompiled(obj2, scope(x)) : NaN; }
  function violation(x){
    const sc=scope(x); let v=0;
    for(const g of gs){ const gv=evalCompiled(g, sc); if(gv>0) v+=gv*gv; }
    for(const h of hs){ const hv=evalCompiled(h, sc); v+=hv*hv; }
    return v;
  }
  function penalized(x){ return sign*rawObj(x) + penalty*violation(x); }
  function clamp(x){ return x.map((v,i)=>Math.max(lo[i],Math.min(hi[i],v))); }
  function randomPoint(){ return lo.map((a,i)=>a + rand()*(hi[i]-a)); }
  function jitter(x,scale=.08){ return clamp(x.map((v,i)=>v+(rand()*2-1)*(hi[i]-lo[i])*scale)); }
  function record(x, arr){
    const objv=rawObj(x), obj2v=rawObj2(x), viol=violation(x);
    if(arr.length<6000) arr.push({x:x.slice(),obj:objv,obj2:obj2v,violation:viol,feasible:viol<1e-8});
    return {score:sign*objv + penalty*viol, objv, obj2v, viol};
  }
  let best=x0.slice(), bestScore=penalized(best), pts=[];
  const start=performance.now();
  record(best, pts);
  function consider(x){
    const r=record(x, pts);
    if(r.score < bestScore){ best=x.slice(); bestScore=r.score; }
    return r.score;
  }
  function randomSearch(n){
    for(let k=0;k<n;k++){
      if(cancelled) return false;
      consider(randomPoint());
      if(k%200===0) progress(k/Math.max(1,n), 'Searching');
    }
    return true;
  }
  function projectedGradient(x, n){
    let step = 0.08, fx=penalized(x);
    const epsBase=1e-5;
    for(let k=0;k<n;k++){
      if(cancelled) return x;
      const grad=x.map((_,i)=>{
        const h=Math.max(epsBase, Math.abs(hi[i]-lo[i])*epsBase);
        const xp=x.slice(), xm=x.slice(); xp[i]=Math.min(hi[i],xp[i]+h); xm[i]=Math.max(lo[i],xm[i]-h);
        return (penalized(xp)-penalized(xm))/Math.max(1e-12,xp[i]-xm[i]);
      });
      let xn=clamp(x.map((v,i)=>v-step*grad[i]));
      let fn=penalized(xn);
      if(fn<fx){ x=xn; fx=fn; consider(x); step=Math.min(step*1.08,1); }
      else step*=0.5;
      if(step<tol) break;
      if(k%50===0) progress(k/Math.max(1,n), 'Projected gradient');
    }
    return x;
  }
  function simulatedAnnealing(x, n){
    let fx=penalized(x), temp=temperature;
    for(let k=0;k<n;k++){
      if(cancelled) return x;
      const xn=jitter(x, Math.max(.002, .15*(1-k/Math.max(1,n))));
      const fn=penalized(xn);
      if(fn<fx || rand()<Math.exp(-(fn-fx)/Math.max(temp,1e-12))){ x=xn; fx=fn; consider(x); }
      temp*=0.995;
      if(k%100===0) progress(k/Math.max(1,n), 'Annealing');
    }
    return x;
  }
  function differentialEvolution(n){
    let pop=Array.from({length:popSize},()=>randomPoint());
    let score=pop.map(p=>consider(p));
    const F=.75, CR=.85;
    for(let k=0;k<n;k++){
      if(cancelled) break;
      for(let i=0;i<pop.length;i++){
        let a,b,c;
        do{a=Math.floor(rand()*pop.length)}while(a===i);
        do{b=Math.floor(rand()*pop.length)}while(b===i||b===a);
        do{c=Math.floor(rand()*pop.length)}while(c===i||c===a||c===b);
        const jrand=Math.floor(rand()*names.length);
        const trial=clamp(pop[i].map((v,j)=> (rand()<CR||j===jrand) ? pop[a][j] + F*(pop[b][j]-pop[c][j]) : v));
        const fs=penalized(trial);
        if(fs<score[i]){ pop[i]=trial; score[i]=fs; consider(trial); }
      }
      if(k%5===0) progress(k/Math.max(1,n), 'Differential evolution');
    }
  }
  function particleSwarm(n){
    const w=.68,c1=1.35,c2=1.35;
    let pos=Array.from({length:popSize},()=>randomPoint());
    let vel=pos.map(x=>x.map((_,i)=>(rand()*2-1)*(hi[i]-lo[i])*.05));
    let pbest=pos.map(x=>x.slice()), pscore=pos.map(x=>consider(x));
    let gi=pscore.indexOf(Math.min(...pscore));
    let gbest=pbest[gi].slice(), gscore=pscore[gi];
    for(let k=0;k<n;k++){
      if(cancelled) break;
      for(let i=0;i<pos.length;i++){
        vel[i]=vel[i].map((v,j)=>w*v+c1*rand()*(pbest[i][j]-pos[i][j])+c2*rand()*(gbest[j]-pos[i][j]));
        pos[i]=clamp(pos[i].map((v,j)=>v+vel[i][j]));
        const fs=penalized(pos[i]); consider(pos[i]);
        if(fs<pscore[i]){ pbest[i]=pos[i].slice(); pscore[i]=fs; if(fs<gscore){ gbest=pos[i].slice(); gscore=fs; } }
      }
      if(k%5===0) progress(k/Math.max(1,n), 'Particle swarm');
    }
  }
  function genetic(n){
    let pop=Array.from({length:popSize},()=>randomPoint());
    for(let k=0;k<n;k++){
      if(cancelled) break;
      pop.sort((a,b)=>penalized(a)-penalized(b));
      pop.slice(0,Math.min(pop.length,12)).forEach(consider);
      const elites=pop.slice(0,Math.max(2,Math.floor(pop.length*.25)));
      const next=elites.map(x=>x.slice());
      while(next.length<popSize){
        const a=elites[Math.floor(rand()*elites.length)], b=elites[Math.floor(rand()*elites.length)];
        const child=clamp(a.map((v,i)=> (rand()<.5?v:b[i]) + (rand()*2-1)*(hi[i]-lo[i])*.04));
        next.push(child);
      }
      pop=next;
      if(k%5===0) progress(k/Math.max(1,n), 'Genetic search');
    }
  }
  if(algorithm==='coordinate'){
    best=coordinateDescent(penalized,best,lo,hi,Number(cfg.refineSteps)||budget).x;
    consider(best);
  } else if(algorithm==='projected_gradient'){
    best=projectedGradient(best,budget);
    best=coordinateDescent(penalized,best,lo,hi,Number(cfg.refineSteps)||150).x;
    consider(best);
  } else if(algorithm==='simulated_annealing'){
    best=simulatedAnnealing(best,budget);
    best=coordinateDescent(penalized,best,lo,hi,Number(cfg.refineSteps)||150).x;
    consider(best);
  } else if(algorithm==='differential_evolution'){
    differentialEvolution(Math.max(5, Math.floor(budget/popSize)));
    best=coordinateDescent(penalized,best,lo,hi,Number(cfg.refineSteps)||150).x;
    consider(best);
  } else if(algorithm==='particle_swarm'){
    particleSwarm(Math.max(5, Math.floor(budget/popSize)));
    best=coordinateDescent(penalized,best,lo,hi,Number(cfg.refineSteps)||150).x;
    consider(best);
  } else if(algorithm==='genetic'){
    genetic(Math.max(5, Math.floor(budget/popSize)));
    best=coordinateDescent(penalized,best,lo,hi,Number(cfg.refineSteps)||150).x;
    consider(best);
  } else if(algorithm==='multi_start'){
    const starts=Math.max(5, Math.floor(Math.sqrt(budget)));
    for(let k=0;k<starts;k++){
      if(cancelled) return {ok:false,cancelled:true,error:'Cancelled'};
      const candidate=coordinateDescent(penalized,randomPoint(),lo,hi,Math.max(20,Math.floor(budget/starts))).x;
      consider(candidate);
      progress(k/starts, 'Multi-start local search');
    }
  } else {
    if(!randomSearch(budget)) return {ok:false,cancelled:true,error:'Cancelled'};
    best=coordinateDescent(penalized,best,lo,hi,Number(cfg.refineSteps)||250).x;
    consider(best);
  }
  const runtime=performance.now()-start;
  const methodLabel={random_coord:'Random + coordinate descent',coordinate:'Coordinate descent',projected_gradient:'Projected gradient penalty',simulated_annealing:'Simulated annealing',differential_evolution:'Differential evolution',particle_swarm:'Particle swarm',genetic:'Genetic algorithm',multi_start:'Multi-start local search'}[algorithm] || algorithm;
  return {ok:true, kind:'opt', variables:names, best, objective:rawObj(best), objective2:rawObj2(best), violation:violation(best), feasible:violation(best)<1e-7, samples:pts, diagnostics:{method:methodLabel, optClass:cfg.optClass||'unspecified', samples:budget, runtime, penalty, population:popSize, seed:cfg.seed||12345}};
}
function coordinateDescent(f,x0,lo,hi,maxIter){
  let x=x0.slice(), fx=f(x);
  const n=x.length;
  let steps=lo.map((a,i)=>Math.max((hi[i]-a)*0.08,1e-6));
  for(let iter=0;iter<maxIter;iter++){
    let improved=false;
    for(let i=0;i<n;i++){
      for(const sign of [-1,1]){
        const xn=x.slice(); xn[i]=Math.max(lo[i],Math.min(hi[i],x[i]+sign*steps[i]));
        const fn=f(xn);
        if(fn<fx){x=xn;fx=fn;improved=true;}
      }
    }
    if(!improved){ steps=steps.map(s=>s*.5); if(Math.max(...steps)<1e-8) break; }
  }
  return {x,fx};
}
