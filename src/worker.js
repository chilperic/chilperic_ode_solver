/* ODE Lab worker: safe parsing via Math.js, no new Function. */
importScripts('https://cdn.jsdelivr.net/npm/mathjs@13.2.0/lib/browser/math.js');

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
function norm(v){ return Math.sqrt(v.reduce((a,b)=>a+b*b,0)); }
function add(y,k,h){ return y.map((v,i)=>v+h*k[i]); }
function lincomb(y, ks, coefs, h){
  return y.map((v,i)=> v + h * coefs.reduce((s,c,j)=>s + c * ks[j][i], 0));
}
function fixedStep(rhs, method, t, y, h, params){
  const f = rhs;
  if (method === 'euler') return add(y, f(t,y,params), h);
  if (method === 'heun' || method === 'heun_fixed') {
    const k1=f(t,y,params), k2=f(t+h,add(y,k1,h),params);
    return y.map((v,i)=>v+h*(k1[i]+k2[i])/2);
  }
  if (method === 'rk5' || method === 'rk5_fixed') {
    return rk45Step(rhs,t,y,h,params,1,1).y; // Fehlberg fifth-order estimate used with a fixed step.
  }
  // Default fixed method: classical RK4.
  const k1=f(t,y,params);
  const k2=f(t+h/2,add(y,k1,h/2),params);
  const k3=f(t+h/2,add(y,k2,h/2),params);
  const k4=f(t+h,add(y,k3,h),params);
  return y.map((v,i)=>v+h*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
}
function heunAdaptiveStep(rhs,t,y,h,params,rtol,atol){
  const yBig = fixedStep(rhs,'heun',t,y,h,params);
  const yHalf = fixedStep(rhs,'heun',t,y,h/2,params);
  const ySmall = fixedStep(rhs,'heun',t+h/2,yHalf,h/2,params);
  let err=0;
  for(let i=0;i<y.length;i++){
    const scale = atol + rtol*Math.max(Math.abs(y[i]),Math.abs(ySmall[i]));
    err = Math.max(err, Math.abs(ySmall[i]-yBig[i])/scale);
  }
  return {y:ySmall, err};
}
function rk45Step(rhs,t,y,h,params,rtol,atol){
  const k1 = rhs(t,y,params);
  const k2 = rhs(t+h/4, lincomb(y,[k1],[1/4],h), params);
  const k3 = rhs(t+3*h/8, lincomb(y,[k1,k2],[3/32,9/32],h), params);
  const k4 = rhs(t+12*h/13, lincomb(y,[k1,k2,k3],[1932/2197,-7200/2197,7296/2197],h), params);
  const k5 = rhs(t+h, lincomb(y,[k1,k2,k3,k4],[439/216,-8,3680/513,-845/4104],h), params);
  const k6 = rhs(t+h/2, lincomb(y,[k1,k2,k3,k4,k5],[-8/27,2,-3544/2565,1859/4104,-11/40],h), params);
  const y4 = y.map((v,i)=> v + h*(25/216*k1[i] + 1408/2565*k3[i] + 2197/4104*k4[i] - 1/5*k5[i]));
  const y5 = y.map((v,i)=> v + h*(16/135*k1[i] + 6656/12825*k3[i] + 28561/56430*k4[i] - 9/50*k5[i] + 2/55*k6[i]));
  let err = 0;
  for (let i=0;i<y.length;i++) {
    const scale = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(y5[i]));
    err = Math.max(err, Math.abs(y5[i]-y4[i]) / scale);
  }
  return { y:y5, err };
}
function solveJob(cfg){
  const rhs = makeRhs(cfg);
  const t0=Number(cfg.t0), t1=Number(cfg.t1);
  let points=Math.max(2, Math.min(20000, Number(cfg.points)||800));
  const params = cfg.params || {};
  const method = cfg.method || 'rk45';
  if (['radau','bdf','lsoda','dop853'].includes(method)) throw new Error(`${method.toUpperCase()} is a Python/export solver, not a browser solver. Use Export Python for this method or choose RK45/RK5/RK4/Heun/Euler in the browser.`);
  const rtol = Number(cfg.rtol)||1e-6, atol=Number(cfg.atol)||1e-9;
  const rawMax = String(cfg.maxStep ?? 'auto').trim();
  const maxStep = rawMax === 'auto' || rawMax === '' ? Math.abs(t1-t0)/60 : Math.abs(Number(rawMax));
  const rawInit = String(cfg.initialStep ?? 'auto').trim();
  const initialStep = rawInit === 'auto' || rawInit === '' ? null : Math.abs(Number(rawInit));
  const rawFixed = String(cfg.stepSize ?? 'auto').trim();
  const fixedStepSize = rawFixed === 'auto' || rawFixed === '' ? null : Math.abs(Number(rawFixed));
  const safety = Math.min(.98, Math.max(.2, Number(cfg.safety)||.9));
  if (fixedStepSize && !['rk45','rk45_adaptive','heun_adaptive'].includes(method)) points = Math.max(2, Math.min(20000, Math.ceil(Math.abs(t1-t0)/fixedStepSize)+1));
  const targetTs = Array.from({length:points},(_,i)=> t0 + (t1-t0)*i/(points-1));
  let y = cfg.y0.map(Number), t=t0;
  const Y = Array.from({length:cfg.vars.length},()=>[]), T=[];
  let accepted=0,rejected=0,minStep=Infinity,maxUsed=0, stiffScore=0, functionEvaluations=0;
  const start=performance.now();
  function pushSample(tt, yy){ T.push(tt); for(let j=0;j<yy.length;j++) Y[j].push(yy[j]); }
  pushSample(t,y);
  if (method === 'rk45' || method === 'rk45_adaptive' || method === 'heun_adaptive') {
    let h = Math.min(maxStep || Math.abs(t1-t0)/60, initialStep || Math.abs(t1-t0)/100 || 1e-3) * Math.sign(t1-t0 || 1);
    for (let idx=1; idx<targetTs.length; idx++) {
      const target = targetTs[idx];
      let guard=0;
      while ((t1>=t0 && t < target) || (t1<t0 && t > target)) {
        if (cancelled) return {ok:false,cancelled:true,error:'Cancelled'};
        if (++guard > 200000) throw new Error('Step limit reached. Problem may be stiff or unstable. Export Python and use Radau/BDF/LSODA.');
        if (Math.abs(h) > Math.abs(target-t)) h = target-t;
        const st = method === 'heun_adaptive' ? heunAdaptiveStep(rhs,t,y,h,params,rtol,atol) : rk45Step(rhs,t,y,h,params,rtol,atol);
        functionEvaluations += method === 'heun_adaptive' ? 6 : 6;
        const err = st.err;
        if (err <= 1 || Math.abs(h) < 1e-14) {
          t += h; y = st.y; accepted++; minStep=Math.min(minStep,Math.abs(h)); maxUsed=Math.max(maxUsed,Math.abs(h));
          if (!y.every(Number.isFinite) || norm(y)>1e12) throw new Error('Solution diverged. Try shorter time horizon, looser model, or export Python for stiff solvers.');
          const fac = Math.min(4, Math.max(0.15, safety*Math.pow(1/Math.max(err,1e-12),0.2)));
          h *= fac;
          if (maxStep) h = Math.sign(h)*Math.min(Math.abs(h), maxStep);
        } else {
          rejected++; stiffScore++; h *= Math.max(0.1, 0.85*Math.pow(1/err,0.25));
        }
      }
      pushSample(target,y);
      if (idx % 50 === 0) progress(idx/(targetTs.length-1), 'Solving');
    }
  } else {
    for (let i=1;i<targetTs.length;i++) {
      if (cancelled) return {ok:false,cancelled:true,error:'Cancelled'};
      const h = targetTs[i]-targetTs[i-1];
      y = fixedStep(rhs, method, targetTs[i-1], y, h, params);
      functionEvaluations += method === 'euler' ? 1 : (method === 'heun' || method === 'heun_fixed') ? 2 : (method === 'rk5' || method === 'rk5_fixed') ? 6 : 4;
      if (!y.every(Number.isFinite) || norm(y)>1e12) throw new Error('Solution diverged. Increase points, reduce t end, or export Python for stiff solvers.');
      accepted++; minStep=Math.min(minStep,Math.abs(h)); maxUsed=Math.max(maxUsed,Math.abs(h));
      pushSample(targetTs[i],y);
      if (i % 100 === 0) progress(i/(targetTs.length-1), 'Solving');
    }
  }
  const runtime = performance.now()-start;
  const warning = stiffScore>20 || rejected>accepted*.2 || minStep < Math.abs(t1-t0)*1e-8 ? 'Possible stiffness or instability detected. For reliable stiff integration, export Python with Radau, BDF, or LSODA.' : '';
  return {ok:true, kind:'ode', T, Y, vars:cfg.vars, diagnostics:{method,accepted,rejected,functionEvaluations,runtime,minStep,maxStep:maxUsed,warning}};
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
