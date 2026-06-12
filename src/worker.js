/* ODE Lab worker: safe parsing via Math.js, no new Function. */
importScripts('https://cdn.jsdelivr.net/npm/mathjs@13.2.0/lib/browser/math.js');

const ALLOWED_FUNCS = new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','exp','log','log10','sqrt','abs','min','max','pow','floor','ceil','round']);
const ALLOWED_CONSTS = new Set(['pi','e','PI','E']);
let cancelled = false;
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
  const gs = (cfg.ineq||[]).filter(Boolean).map(s=>compileSafe(s, allowed));
  const hs = (cfg.eq||[]).filter(Boolean).map(s=>compileSafe(s, allowed));
  const lo=cfg.variables.map(v=>Number(v.lower)), hi=cfg.variables.map(v=>Number(v.upper));
  const x0=cfg.variables.map(v=>Number(v.initial));
  const penalty=Number(cfg.penalty)||1e6, samples=Math.max(100, Math.min(100000, Number(cfg.samples)||3500));
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
  let best=x0.slice(), bestScore=penalized(best), pts=[];
  const start=performance.now();
  for(let k=0;k<samples;k++){
    if(cancelled) return {ok:false,cancelled:true,error:'Cancelled'};
    const x=lo.map((a,i)=>a + Math.random()*(hi[i]-a));
    const score=penalized(x), objv=rawObj(x), obj2v=rawObj2(x), viol=violation(x);
    if(k<3000) pts.push({x,obj:objv,obj2:obj2v,violation:viol,feasible:viol<1e-8});
    if(score<bestScore){ best=x; bestScore=score; }
    if(k%200===0) progress(k/samples,'Searching');
  }
  const refined = coordinateDescent(penalized,best,lo,hi,Number(cfg.refineSteps)||250);
  best=refined.x; bestScore=refined.fx;
  const runtime=performance.now()-start;
  return {ok:true, kind:'opt', variables:names, best, objective:rawObj(best), objective2:rawObj2(best), violation:violation(best), feasible:violation(best)<1e-7, samples:pts, diagnostics:{method:'Random + coordinate descent', samples, runtime, penalty}};
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
