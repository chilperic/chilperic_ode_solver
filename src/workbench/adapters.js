/* Foko Lab v72.11 Workbench adapter registry.
 * Stable contract: preset -> validated config -> one browser-computed result ->
 * distinct compatible plots, metrics, warnings and provenance.
 * The adapters call the same pure numerical cores as the focused reference labs.
 */
(function (root, factory) {
  'use strict';
  const node = typeof module !== 'undefined' && module.exports;
  const deps = node ? {
    ODE: require('../core/ode.js'),
    Steady: require('../core/steady.js'),
    Stochastic: require('../core/stochastic.js'),
    Optimization: require('../core/optimization.js'),
    Agent: require('../core/agent-reference.js'),
    Statistics: require('../core/statistics.js'),
    Data: require('../core/data.js'),
    Fitting: require('../core/fitting.js'),
    Linalg: require('../core/linalg-reference.js'),
    Networks: require('../core/networks-reference.js'),
    ML: require('../core/ml-reference.js'),
    SINDy: require('../core/sindy.js'),
    AgentPresets: require('../models/agent-presets.js')
  } : {
    ODE: root.FokoODECore,
    Steady: root.FokoSteadyCore,
    Stochastic: root.FokoStochasticCore,
    Optimization: root.FokoOptimizationCore,
    Agent: root.FokoAgentReference,
    Statistics: root.FokoStatistics,
    Data: root.FokoDataCore,
    Fitting: root.FokoFitting,
    Linalg: root.FokoLinalgReference,
    Networks: root.FokoNetworksReference,
    ML: root.FokoMLReference,
    SINDy: root.FokoSINDy,
    AgentPresets: root.FokoAgentPresets
  };
  const api = factory(deps);
  if (node) module.exports = api;
  root.FokoWorkbenchAdapters = api;
}(typeof window !== 'undefined' ? window : globalThis, function (D) {
  'use strict';

  const VERSION = '72.46.0';
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function finite(value, label) { const out = Number(value); if (!Number.isFinite(out)) throw new Error(label + ' must be finite.'); return out; }
  function positive(value, label) { const out = finite(value, label); if (!(out > 0)) throw new Error(label + ' must be positive.'); return out; }
  function integer(value, label, minimum, maximum) { const out = Number(value); if (!Number.isInteger(out) || out < minimum || out > maximum) throw new Error(label + ' must be an integer in [' + minimum + ', ' + maximum + '].'); return out; }
  function metric(label, value, detail) { return { label: label, value: value, detail: detail || '' }; }
  function linePlot(id, title, meaning, traces, xTitle, yTitle) {
    return { id: id, title: title, meaning: meaning, data: traces, layout: { xaxis: { title: xTitle || '' }, yaxis: { title: yTitle || '' }, legend: { orientation: 'h', y: -0.2 }, margin: { t: 18, r: 22, b: 64, l: 62 } } };
  }
  function barPlot(id, title, meaning, x, y, xTitle, yTitle) {
    return linePlot(id, title, meaning, [{ type: 'bar', x: x, y: y, name: title }], xTitle, yTitle);
  }
  function heatPlot(id, title, meaning, z, x, y, xTitle, yTitle) {
    return { id: id, title: title, meaning: meaning, data: [{ type: 'heatmap', z: z, x: x, y: y, colorscale: 'Viridis', colorbar: { title: '' } }], layout: { xaxis: { title: xTitle || '' }, yaxis: { title: yTitle || '' }, margin: { t: 18, r: 28, b: 58, l: 62 } } };
  }
  function qQuantile(sorted, p) { const pos = (sorted.length - 1) * p; const lo = Math.floor(pos); const hi = Math.ceil(pos); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo); }
  function normalQuantile(p) {
    if (D.Statistics && typeof D.Statistics.normalInv === 'function') return D.Statistics.normalInv(p);
    const a = 0.147; const s = p < 0.5 ? -1 : 1; const x = 2 * Math.min(p, 1 - p); const ln = Math.log(x); const term = 2 / (Math.PI * a) + ln / 2; return s * Math.sqrt(Math.sqrt(term * term - ln / a) - term) * Math.SQRT2;
  }
  function resolve(path, object) { return String(path).split('.').reduce(function (value, key) { return value == null ? undefined : value[key]; }, object); }
  function assertDeps(names) { names.forEach(function (name) { if (!D[name]) throw new Error('Workbench adapter dependency ' + name + ' is unavailable.'); }); }
  function swapDistinctSelection(selection, card, next, plotCount) {
    const current = Array.isArray(selection) ? selection.slice(0, 2) : [0, 1];
    const side = Number(card); const target = Number(next); const count = Number(plotCount);
    if (![0, 1].includes(side) || !Number.isInteger(target) || !Number.isInteger(count) || count < 2 || target < 0 || target >= count) return current;
    const other = side === 0 ? 1 : 0; const previous = current[side];
    if (current[other] === target) current[other] = previous;
    current[side] = target;
    return current;
  }

  const ODE_PRESETS = {
    sir: { title: 'SIR epidemic', note: 'Closed-population deterministic SIR reference. Parameters are illustrative, not calibrated.', config: { beta: 0.42, gamma: 0.10, N: 1000, S0: 990, I0: 10, R0: 0, tEnd: 120, points: 600 } },
    lotka: { title: 'Lotka–Volterra predator–prey', note: 'Qualitative nonlinear oscillator without resource limitation or demographic noise.', config: { alpha: 1.1, beta: 0.4, delta: 0.1, gamma: 0.4, prey0: 10, predator0: 5, tEnd: 40, points: 700 } },
    lorenz: { title: 'Lorenz chaotic convection', note: 'A deterministic chaos benchmark. Nearby initial conditions separate, but one trajectory is not a Lyapunov certificate.', config: { sigma: 10, rho: 28, beta: 2.6666666667, x0: 1, y0: 1, z0: 1, tEnd: 35, points: 1500 } },
    fitzhugh: { title: 'FitzHugh–Nagumo excitability', note: 'A reduced neuronal excitability model; it is not a replacement for conductance-based membrane physiology.', config: { a: 0.7, b: 0.8, tau: 12.5, current: 0.5, v0: -1, w0: 1, tEnd: 100, points: 1400 } },
    brusselator: { title: 'Brusselator chemical oscillator', note: 'A canonical nonlinear oscillator used to inspect limit-cycle geometry and parameter-dependent dynamics.', config: { A: 1, B: 3, x0: 1.2, y0: 3.1, tEnd: 30, points: 1100 } },
    stiff_relaxation: { title: 'Stiff relaxation stress test', note: 'Two separated time scales challenge explicit integration. Inspect rejected steps and derivative magnitude before trusting a smooth-looking curve.', config: { fast: 250, slow: 1, y10: 0, y20: 1, tEnd: 8, points: 800 } }
  };
  function runOde(raw) {
    assertDeps(['ODE']); const c = clone(raw); const tEnd = positive(c.tEnd, 'tEnd'); const points = integer(Number(c.points), 'points', 40, 5000); let vars, y0, rhs, conservation;
    if (c.preset === 'lotka') {
      ['alpha','beta','delta','gamma','prey0','predator0'].forEach(function (key) { c[key] = finite(c[key], key); });
      vars = ['prey','predator']; y0 = [c.prey0,c.predator0];
      rhs = function (_t, y) { return [c.alpha*y[0]-c.beta*y[0]*y[1], c.delta*y[0]*y[1]-c.gamma*y[1]]; };
    } else if (c.preset === 'lorenz') {
      ['sigma','rho','beta','x0','y0','z0'].forEach(function (key) { c[key] = finite(c[key], key); });
      vars=['x','y','z']; y0=[c.x0,c.y0,c.z0];
      rhs=function(_t,y){return[c.sigma*(y[1]-y[0]),y[0]*(c.rho-y[2])-y[1],y[0]*y[1]-c.beta*y[2]];};
    } else if (c.preset === 'fitzhugh') {
      ['a','b','tau','current','v0','w0'].forEach(function (key) { c[key] = finite(c[key], key); }); positive(c.tau,'tau');
      vars=['voltage','recovery']; y0=[c.v0,c.w0];
      rhs=function(_t,y){return[y[0]-Math.pow(y[0],3)/3-y[1]+c.current,(y[0]+c.a-c.b*y[1])/c.tau];};
    } else if (c.preset === 'brusselator') {
      ['A','B','x0','y0'].forEach(function (key) { c[key] = finite(c[key], key); });
      vars=['X','Y']; y0=[c.x0,c.y0];
      rhs=function(_t,y){return[c.A-(c.B+1)*y[0]+y[0]*y[0]*y[1],c.B*y[0]-y[0]*y[0]*y[1]];};
    } else if (c.preset === 'stiff_relaxation') {
      ['fast','slow','y10','y20'].forEach(function (key) { c[key] = finite(c[key], key); }); positive(c.fast,'fast rate'); positive(c.slow,'slow rate');
      vars=['fast state','slow state']; y0=[c.y10,c.y20];
      rhs=function(t,y){return[-c.fast*(y[0]-Math.cos(t))-Math.sin(t),-c.slow*y[1]];};
    } else {
      ['beta','gamma','N','S0','I0','R0'].forEach(function (key) { c[key] = finite(c[key], key); }); if (!(c.N > 0)) throw new Error('N must be positive.');
      vars = ['S','I','R']; y0 = [c.S0,c.I0,c.R0]; conservation = [1,1,1];
      rhs = function (_t, y) { const infection = c.beta*y[0]*y[1]/c.N; return [-infection, infection-c.gamma*y[1], c.gamma*y[1]]; };
    }
    const result = D.ODE.solveWithRhs({ t0: 0, t1: tEnd, y0: y0, vars: vars, method: 'rk45', points: points, rtol: 1e-7, atol: 1e-9 }, rhs);
    const plots = [linePlot('trajectory','Time-course evidence','State trajectories from one adaptive RK45 solve.', vars.map(function (name, index) { return { type:'scatter', mode:'lines', x:result.T, y:result.Y[index], name:name }; }), 'time','state')];
    if (vars.length >= 3) {
      plots.push({id:'phase-3d',title:'Three-dimensional phase trajectory',meaning:'A 3D projection of the same computed trajectory. Geometry is descriptive; it is not a chaos certificate.',data:[{type:'scatter3d',mode:'lines',x:result.Y[0],y:result.Y[1],z:result.Y[2],name:vars.join(' / '),line:{width:4,color:result.T,colorscale:'Viridis'}}],layout:{scene:{xaxis:{title:vars[0]},yaxis:{title:vars[1]},zaxis:{title:vars[2]}},margin:{t:8,r:8,b:8,l:8}}});
    } else {
      plots.push(linePlot('phase','State-space projection','A two-state projection of the same computed trajectory; it is not an independently fitted curve.', [{ type:'scatter', mode:'lines', x:result.Y[0], y:result.Y[1], name:vars[0]+' vs '+vars[1] }], vars[0], vars[1]));
    }
    const derivativeNorm=result.T.map(function(t,i){const state=result.Y.map(function(row){return row[i];});const dy=rhs(t,state);return Math.sqrt(dy.reduce(function(sum,v){return sum+v*v;},0));});
    plots.push(linePlot('derivative-norm','Derivative magnitude','Euclidean norm of the model right-hand side along the computed trajectory. Peaks expose fast transients but do not directly estimate local error.',[{type:'scatter',mode:'lines',x:result.T,y:derivativeNorm,name:'||f(t,y)||₂'}],'time','derivative norm'));
    const finalValues = vars.map(function (_name,index) { return result.Y[index][result.Y[index].length-1]; });
    plots.push(barPlot('final','Final state composition','Final values at the requested horizon, not asymptotic equilibria.', vars, finalValues, 'state','final value'));
    const ranges=vars.map(function(_name,index){const row=result.Y[index];return Math.max.apply(null,row)-Math.min.apply(null,row);});
    plots.push(barPlot('range','Observed state ranges','Maximum minus minimum over the requested horizon. This finite-window amplitude is not a bifurcation measure.',vars,ranges,'state','range'));
    const warnings = result.diagnostics.warning ? [result.diagnostics.warning] : [];
    let drift = null; if (conservation) { drift = D.ODE.conservationDrift(result, conservation); if (drift.relative > 1e-6) warnings.push('Closed-population conservation drift exceeded 1e-6.'); }
    if(c.preset==='stiff_relaxation')warnings.push('This is an explicit-solver stiffness stress test. A smooth trace alone is not sufficient evidence of accuracy.');
    return { status: result.status, summary: ODE_PRESETS[c.preset || 'sir'].title, metrics: [metric('Accepted steps',result.diagnostics.accepted),metric('Rejected steps',result.diagnostics.rejected),metric('Function evaluations',result.diagnostics.functionEvaluations),metric('Runtime',result.diagnostics.runtime.toFixed(2)+' ms'),metric('Conservation drift',drift ? drift.relative.toExponential(2) : 'not applicable'),metric('Views',plots.length)], warnings: warnings, provenance: ['FokoODECore','RK45 adaptive','rtol 1e-7','atol 1e-9','all views share one result'], plots: plots, raw: result };
  }

  const STEADY_PRESETS = {
    logistic: { title:'Logistic equilibria', note:'Newton converges to one equilibrium from one start. The model has two roots, so start sensitivity matters.', config:{ r:1, K:10, x0:8, tolerance:1e-10, scanMin:-1, scanMax:12 } },
    toggle: { title:'Mutual-repression equilibrium', note:'A local two-variable equilibrium calculation. It is not an exhaustive bifurcation analysis.', config:{ a:4, n:2, d:1, x0:0.8, y0:3.2, tolerance:1e-9, scanMin:0, scanMax:5 } }
  };
  function runSteady(raw) {
    assertDeps(['Steady']); const c=clone(raw); const tol=positive(c.tolerance,'tolerance'); let residual, x0, names;
    if (c.preset === 'toggle') { ['a','n','d','x0','y0'].forEach(function(k){c[k]=finite(c[k],k);}); names=['A','B']; x0=[c.x0,c.y0]; residual=function(x){return [c.a/(1+Math.pow(Math.max(x[1],0),c.n))-c.d*x[0],c.a/(1+Math.pow(Math.max(x[0],0),c.n))-c.d*x[1]];}; }
    else { ['r','K','x0'].forEach(function(k){c[k]=finite(c[k],k);}); if(!(c.K>0))throw new Error('K must be positive.'); names=['x']; x0=[c.x0]; residual=function(x){return [c.r*x[0]*(1-x[0]/c.K)];}; }
    const result=D.Steady.solveNewton({ residual:residual, x0:x0, tolerance:tol, maxIterations:100 }); const stability=D.Steady.classifyDynamicStability(result.jacobian);
    const history=result.history.length?result.history:[{iteration:0,residualNorm:result.residualNorm,stepNorm:0,damping:0}];
    const plots=[linePlot('residual-history','Newton residual history','Residual norms from the actual damped Newton iterations.',[{type:'scatter',mode:'lines+markers',x:history.map(function(r){return r.iteration;}),y:history.map(function(r){return Math.max(r.residualNorm,1e-18);}),name:'residual norm'}],'iteration','residual norm')]; plots[0].layout.yaxis.type='log';
    const lo=finite(c.scanMin,'scanMin'),hi=finite(c.scanMax,'scanMax'),grid=Array.from({length:180},function(_,i){return lo+(hi-lo)*i/179;});
    if(names.length===1){plots.push(linePlot('residual-curve','Residual curve','A one-dimensional residual scan; zero crossings are candidates, not solver certificates.',[{type:'scatter',mode:'lines',x:grid,y:grid.map(function(x){return residual([x])[0];}),name:'f(x)'},{type:'scatter',mode:'markers',x:[result.x[0]],y:[result.residual[0]],name:'Newton candidate'}],'x','f(x)'));}
    else { const z=grid.map(function(y){return grid.map(function(x){const r=residual([x,y]);return Math.log10(Math.hypot(r[0],r[1])+1e-12);});}); plots.push(heatPlot('residual-surface','Residual-norm surface','Log10 residual norm over a finite grid. Grid minima are not proof of all roots.',z,grid,grid,'A','B')); }
    const eig=(stability.eigenvalues||[]).map(function(e){return e.real;}); plots.push(barPlot('jacobian','Local Jacobian evidence','Real parts of locally computed Jacobian eigenvalues. Classification is local.',eig.map(function(_,i){return 'λ'+(i+1);}),eig,'eigenvalue','real part'));
    return { status:result.converged?'success':'warning', summary:STEADY_PRESETS[c.preset||'logistic'].title, metrics:[metric('Converged',String(result.converged)),metric('Residual norm',result.residualNorm.toExponential(3)),metric('Iterations',result.iterations),metric('Stability',stability.label),metric('Candidate',names.map(function(n,i){return n+'='+result.x[i].toPrecision(6);}).join(', '))], warnings:result.converged?[]:[result.message], provenance:['FokoSteadyCore','damped Newton','finite-difference Jacobian','local stability only'], plots:plots, raw:{solution:result,stability:stability} };
  }

  const STOCH_PRESETS={
    birth:{title:'Birth–death CTMC',note:'Independent seeded SSA trajectories; percentile bands quantify Monte Carlo variation only.',config:{lambda:0.18,mu:0.14,X0:40,tEnd:30,points:160,runs:80,seed:1729}},
    sir:{title:'Stochastic SIR',note:'Finite-population infection and recovery events. Early fade-out remains possible.',config:{beta:0.34,gamma:0.12,N:500,S0:490,I0:10,R0:0,tEnd:100,points:220,runs:70,seed:2718}},
    gene_expression:{title:'Two-stage gene expression',note:'Transcription, mRNA decay, translation and protein decay generate intrinsic copy-number variation. Parameters are illustrative.',config:{transcription:2.4,mrnaDecay:.45,translation:5.5,proteinDecay:.12,M0:0,P0:0,tEnd:45,points:220,runs:90,seed:31415}}
  };
  function runStochastic(raw){
    assertDeps(['Stochastic']);const c=clone(raw);const settings={t0:0,t1:positive(c.tEnd,'tEnd'),points:integer(Number(c.points),'points',20,1000),runs:integer(Number(c.runs),'runs',2,500),seed:integer(Number(c.seed),'seed',0,4294967295),maxEvents:100000};let model,variableIndex;
    if(c.preset==='sir'){['beta','gamma','N','S0','I0','R0'].forEach(function(k){c[k]=finite(c[k],k);});model={stateNames:['S','I','R'],initial:[c.S0,c.I0,c.R0],params:{beta:c.beta,gamma:c.gamma,N:c.N},reactions:[{name:'infection',propensity:function(x,_t,p){return p.beta*x[0]*x[1]/p.N;},change:[-1,1,0]},{name:'recovery',propensity:function(x,_t,p){return p.gamma*x[1];},change:[0,-1,1]}]};variableIndex=1;
    }else if(c.preset==='gene_expression'){['transcription','mrnaDecay','translation','proteinDecay','M0','P0'].forEach(function(k){c[k]=finite(c[k],k);});model={stateNames:['mRNA','protein'],initial:[c.M0,c.P0],params:{kt:c.transcription,dm:c.mrnaDecay,kp:c.translation,dp:c.proteinDecay},reactions:[{name:'transcription',propensity:function(_x,_t,p){return p.kt;},change:[1,0]},{name:'mRNA decay',propensity:function(x,_t,p){return p.dm*x[0];},change:[-1,0]},{name:'translation',propensity:function(x,_t,p){return p.kp*x[0];},change:[0,1]},{name:'protein decay',propensity:function(x,_t,p){return p.dp*x[1];},change:[0,-1]}]};variableIndex=1;
    }else{['lambda','mu','X0'].forEach(function(k){c[k]=finite(c[k],k);});model={stateNames:['X'],initial:[c.X0],params:{lambda:c.lambda,mu:c.mu},reactions:[{name:'birth',propensity:function(x,_t,p){return p.lambda*x[0];},change:[1]},{name:'death',propensity:function(x,_t,p){return p.mu*x[0];},change:[-1]}]};variableIndex=0;}
    const result=D.Stochastic.simulateEnsemble(Object.assign(settings,{model:model}));const summary=result.summaries[variableIndex];const paths=result.trajectories.slice(0,Math.min(20,result.runs)).map(function(run,index){return{type:'scatter',mode:'lines',x:result.times,y:run[variableIndex],name:'run '+(index+1),opacity:.32,line:{width:1}};});
    const plots=[linePlot('paths','Representative SSA paths','A subset of independent seeded Gillespie trajectories.',paths,'time',model.stateNames[variableIndex])];
    plots.push(linePlot('ensemble','Ensemble mean and empirical band','Mean and 5th–95th percentiles across the finite ensemble.',[{type:'scatter',mode:'lines',x:result.times,y:summary.high,name:'95th percentile',line:{width:0}},{type:'scatter',mode:'lines',x:result.times,y:summary.low,name:'5th–95th band',fill:'tonexty',line:{width:0}},{type:'scatter',mode:'lines',x:result.times,y:summary.mean,name:'mean'}],'time',model.stateNames[variableIndex]));
    plots.push({id:'final',title:'Final-state distribution',meaning:'Empirical final values across the requested independent runs.',data:[{type:'histogram',x:result.finalStates.map(function(row){return row[variableIndex];}),name:'final '+model.stateNames[variableIndex]}],layout:{xaxis:{title:'final '+model.stateNames[variableIndex]},yaxis:{title:'runs'},margin:{t:18,r:22,b:58,l:58}}});
    const fano=summary.mean.map(function(mean,i){return mean>0?summary.variance[i]/mean:null;});
    plots.push(linePlot('fano','Variance-to-mean profile','Empirical Fano factor across the finite ensemble. Values above one indicate over-dispersion relative to a Poisson reference, not a mechanistic explanation.',[{type:'scatter',mode:'lines',x:result.times,y:fano,name:'variance / mean'},{type:'scatter',mode:'lines',x:[result.times[0],result.times[result.times.length-1]],y:[1,1],name:'Poisson reference',line:{dash:'dash'}}],'time','Fano factor'));
    if(model.stateNames.length>1){const a=result.finalStates.map(function(row){return row[0];}),b=result.finalStates.map(function(row){return row[1];});plots.push({id:'joint-final',title:'Joint final-state cloud',meaning:'Paired final copy numbers across independent runs. Apparent structure is finite-sample simulation evidence.',data:[{type:'scatter',mode:'markers',x:a,y:b,marker:{size:7,opacity:.58},name:'runs'}],layout:{xaxis:{title:'final '+model.stateNames[0]},yaxis:{title:'final '+model.stateNames[1]},margin:{t:18,r:22,b:58,l:58}}});}
    return{status:result.status,summary:STOCH_PRESETS[c.preset||'birth'].title,metrics:[metric('Runs',result.runs),metric('Events',result.eventCounts.reduce(function(a,b){return a+b;},0)),metric('Truncated runs',result.truncatedRuns),metric('Seed',result.seed),metric('Final mean',summary.final.mean.toPrecision(6)),metric('MC standard error',summary.final.standardError.toPrecision(4)),metric('Views',plots.length)],warnings:result.warnings.slice(),provenance:['FokoStochasticCore','Gillespie direct SSA','independent derived seeds','empirical uncertainty','all views share one ensemble'],plots:plots,raw:result};
  }

  const OPT_PRESETS={
    constrained:{title:'Constrained quadratic',note:'The search reports a feasible candidate, not a global or KKT certificate.',config:{algorithm:'projected_gradient',x0:1,y0:1,maxIterations:160,seed:17}},
    rosenbrock:{title:'Rosenbrock on disk',note:'Non-convex constrained benchmark. One finite search cannot establish global optimality.',config:{algorithm:'differential_evolution',x0:-1,y0:1,maxIterations:90,seed:31}},
    rastrigin:{title:'Rastrigin multimodal landscape',note:'A rugged finite-domain benchmark with many local minima. The known benchmark minimum is context, not a certificate produced by the search.',config:{algorithm:'differential_evolution',x0:3.4,y0:-2.7,maxIterations:120,seed:73}}
  };
  function runOptimization(raw){
    assertDeps(['Optimization']);const c=clone(raw);const maxIterations=integer(Number(c.maxIterations),'maxIterations',10,1000),seed=integer(Number(c.seed),'seed',0,4294967295);let problem,bounds,title;
    if(c.preset==='rosenbrock'){bounds=[-2,2];problem={variables:[{name:'x',start:finite(c.x0,'x0'),lower:-2,upper:2},{name:'y',start:finite(c.y0,'y0'),lower:-2,upper:2}],sense:'minimize',objective:function(x){return Math.pow(1-x[0],2)+100*Math.pow(x[1]-x[0]*x[0],2);},inequalities:[function(x){return x[0]*x[0]+x[1]*x[1]-2;}],equalities:[]};
    }else if(c.preset==='rastrigin'){bounds=[-5.12,5.12];problem={variables:[{name:'x',start:finite(c.x0,'x0'),lower:bounds[0],upper:bounds[1]},{name:'y',start:finite(c.y0,'y0'),lower:bounds[0],upper:bounds[1]}],sense:'minimize',objective:function(x){return 20+x[0]*x[0]-10*Math.cos(2*Math.PI*x[0])+x[1]*x[1]-10*Math.cos(2*Math.PI*x[1]);},inequalities:[],equalities:[]};
    }else{bounds=[0,10];problem={variables:[{name:'x',start:finite(c.x0,'x0'),lower:0,upper:10},{name:'y',start:finite(c.y0,'y0'),lower:0,upper:10}],sense:'minimize',objective:function(x){return Math.pow(x[0]-3,2)+Math.pow(x[1]-2,2);},inequalities:[function(x){return x[0]+x[1]-4;}],equalities:[]};}
    const result=D.Optimization.optimise(problem,{algorithm:c.algorithm,maxIterations:maxIterations,populationSize:32,seed:seed,penalty:1e6,feasibilityTolerance:1e-5,recordLimit:5000});const history=result.history||[];const records=result.records||[];
    const plots=[linePlot('history','Objective history','Best raw objective recorded by the selected finite search.',[{type:'scatter',mode:'lines+markers',x:history.map(function(_,i){return i;}),y:history.map(function(h){return h.bestObjective!=null?h.bestObjective:(h.objective!=null?h.objective:h.bestScore);}),name:'best objective'}],'iteration','objective')];
    const grid=Array.from({length:51},function(_,i){return bounds[0]+(bounds[1]-bounds[0])*i/50;}),z=grid.map(function(y){return grid.map(function(x){return problem.objective([x,y]);});});
    plots.push({id:'landscape',title:'Objective landscape and evaluations',meaning:'Finite 2D objective contours with recorded evaluations. Dense contours do not establish that the algorithm explored every basin.',data:[{type:'contour',x:grid,y:grid,z:z,colorscale:'Viridis',contours:{coloring:'heatmap'},colorbar:{title:'objective'}},{type:'scatter',mode:'markers',x:records.map(function(r){return r.x[0];}),y:records.map(function(r){return r.x[1];}),marker:{size:4,color:'rgba(255,255,255,.56)'},name:'evaluations'},{type:'scatter',mode:'markers',x:[result.candidate.x[0]],y:[result.candidate.x[1]],marker:{size:14,symbol:'x',color:'#111827'},name:'reported candidate'}],layout:{xaxis:{title:'x'},yaxis:{title:'y'},margin:{t:18,r:24,b:58,l:58}}});
    plots.push(linePlot('violation','Constraint violation history','Maximum independent constraint violation for evaluated records.',[{type:'scatter',mode:'lines',x:records.map(function(_,i){return i;}),y:records.map(function(r){return Math.max(r.maxViolation||0,1e-12);}),name:'max violation'}],'evaluation','max violation'));plots[2].layout.yaxis.type='log';
    const objectiveValues=records.map(function(r){return r.objective;}).filter(Number.isFinite).sort(function(a,b){return a-b;});
    plots.push({id:'objective-distribution',title:'Evaluated objective distribution',meaning:'Distribution of raw objective values among recorded evaluations. It describes the search history, not the whole domain.',data:[{type:'histogram',x:objectiveValues,name:'evaluations'}],layout:{xaxis:{title:'objective'},yaxis:{title:'count'},margin:{t:18,r:22,b:58,l:58}}});
    return{status:result.status,summary:OPT_PRESETS[c.preset||'constrained'].title,metrics:[metric('Feasible',String(result.candidate.feasible)),metric('Objective',result.candidate.objective.toPrecision(7)),metric('Max violation',result.candidate.maxViolation.toExponential(3)),metric('Evaluations',result.evaluations),metric('Termination',result.terminationReason),metric('Candidate',result.candidate.x.map(function(v){return v.toPrecision(6);}).join(', ')),metric('Views',plots.length)],warnings:result.status==='success'?[]:[result.message],provenance:['FokoOptimizationCore',c.algorithm,'seed '+seed,'global optimality not established','all views share one search record'],plots:plots,raw:result};
  }

  function runAgent(raw){
    assertDeps(['Agent','AgentPresets']);const c=clone(raw),preset=D.AgentPresets[c.preset]||D.AgentPresets.tcell_baseline;const config=Object.assign({},preset,{size:integer(Number(c.size),'size',8,80),steps:integer(Number(c.steps),'steps',5,1000),runs:integer(Number(c.runs),'runs',2,200),seed:integer(Number(c.seed),'seed',0,4294967295),recordEvery:Math.max(1,Math.floor(Number(c.recordEvery)||2))});const result=D.Agent.simulateEnsemble(config);const states=result.states;
    const plots=[linePlot('population','Population time series','Ensemble mean state counts with finite-run percentile bounds omitted here for legibility.',states.map(function(name,index){return{type:'scatter',mode:'lines',x:result.times,y:result.ensemble.mean.map(function(row){return row[index];}),name:name};}),'sweep','count')];
    const size=config.size,final=result.representative.finalGrid,z=[];for(let y=0;y<size;y+=1)z.push(final.slice(y*size,(y+1)*size));plots.push(heatPlot('lattice','Representative final lattice','One seeded representative lattice. It is not an ensemble average or spatial probability field.',z,Array.from({length:size},function(_,i){return i;}),Array.from({length:size},function(_,i){return i;}),'x','y'));plots[1].data[0].colorscale=result.colors.map(function(color,index){return[index/Math.max(1,result.colors.length-1),color];});plots[1].data[0].showscale=false;
    plots.push(barPlot('final-distribution','Final ensemble composition','Mean final state counts across independent seeded runs.',states,result.ensemble.mean[result.ensemble.mean.length-1],'state','mean count'));
    return{status:'success',summary:preset.title,metrics:[metric('Runs',config.runs),metric('Grid',config.size+' × '+config.size),metric('Steps',config.steps),metric('Seed',config.seed),metric('Entropy',result.ensemble.metrics.entropy.mean.toFixed(4)),metric('Spatial agreement',result.ensemble.metrics.spatialAgreement.mean.toFixed(4))],warnings:[preset.note],provenance:['FokoAgentReference','random-sequential lattice sweeps','derived seeds','qualitative mechanism'],plots:plots,raw:result};
  }

  const STATS_DATA='dose,response\n0,2.1\n0.5,3.0\n1,4.2\n1.5,4.8\n2,6.3\n2.5,7.0\n3,8.3\n3.5,9.0\n4,10.4\n4.5,11.1';
  function runStatistics(raw){
    assertDeps(['Data','Statistics']);const c=clone(raw),dataset=D.Data.parseDataset(c.data||STATS_DATA,{delimiter:'auto',header:'auto'}),paired=D.Data.pairedNumeric(dataset,0,1,'complete-case');if(paired.x.length<3)throw new Error('At least three complete numeric pairs are required.');const fit=D.Statistics.ols(paired.x,paired.y),influence=D.Statistics.olsInfluence(paired.x,paired.y);const sortedResidual=fit.resid.slice().sort(function(a,b){return a-b;});const theory=sortedResidual.map(function(_,i){return normalQuantile((i+.5)/sortedResidual.length);});
    const plots=[linePlot('regression','Regression with observed data','Simple OLS association; the line does not establish causality.',[{type:'scatter',mode:'markers',x:paired.x,y:paired.y,name:'data'},{type:'scatter',mode:'lines',x:paired.x,y:fit.pred,name:'OLS fit'}],dataset.names[0],dataset.names[1]),linePlot('residuals','Residual diagnostics','Residuals against fitted values for linearity and variance inspection.',[{type:'scatter',mode:'markers',x:fit.pred,y:fit.resid,name:'residuals'},{type:'scatter',mode:'lines',x:[Math.min.apply(null,fit.pred),Math.max.apply(null,fit.pred)],y:[0,0],name:'zero',line:{dash:'dash'}}],'fitted','residual'),linePlot('qq','Normal Q–Q diagnostic','A descriptive residual normality diagnostic; small samples have low power.',[{type:'scatter',mode:'markers',x:theory,y:sortedResidual,name:'residual quantiles'}],'theoretical normal quantile','ordered residual')];
    return{status:'success',summary:'Simple OLS regression',metrics:[metric('Rows used',paired.x.length),metric('Slope',fit.slope.toPrecision(6)),metric('R²',fit.r2.toFixed(4)),metric('RMSE',fit.rmse.toPrecision(5)),metric('Slope p-value',fit.pSlope.toPrecision(4)),metric('Max Cook distance',Math.max.apply(null,influence.cooksDistance).toPrecision(4))],warnings:['Association is not causation. OLS assumptions require separate domain and residual assessment.'],provenance:['FokoDataCore','FokoStatistics','complete-case rows','simple OLS'],plots:plots,raw:{dataset:dataset,fit:fit,influence:influence}};
  }

  const FIT_DATA=[[.1,.118],[.2,.210],[.35,.325],[.55,.430],[.85,.535],[1.2,.626],[1.8,.708],[2.7,.794],[4,.851],[6,.897],[9,.938]];
  function runFitting(raw){
    assertDeps(['Fitting']);const c=clone(raw),model=c.model||'michaelis',pairs=(c.pairs||FIT_DATA).map(function(row){return[finite(row[0],'x'),finite(row[1],'y')];});const options={bootstrapReplicates:integer(Number(c.bootstrapReplicates||40),'bootstrapReplicates',0,500),bootstrapSeed:integer(Number(c.seed||44),'seed',0,4294967295),maxIterations:500,computeProfile:true};if(model==='michaelis')options.initialParams=[1,1];if(model==='logistic')options.initialParams=[1,1,1];const fit=D.Fitting.fit(pairs,model,options),x=pairs.map(function(r){return r[0];}),y=pairs.map(function(r){return r[1];});
    const plots=[linePlot('fit','Observed data and fitted curve','The fitted curve is conditional on the selected model and weighting assumptions.',[{type:'scatter',mode:'markers',x:x,y:y,name:'data'},{type:'scatter',mode:'lines',x:fit.predictionBands.map(function(r){return r.x;}),y:fit.predictionBands.map(function(r){return r.fit;}),name:'fit'}],'x','y'),linePlot('fit-residuals','Fit residuals','Residuals against fitted values; structure indicates model or variance misspecification.',[{type:'scatter',mode:'markers',x:fit.pred,y:fit.resid,name:'residuals'}],'fitted','residual')];
    const params=fit.parameterSummary||[];plots.push(barPlot('parameters','Parameter estimates','Point estimates with local uncertainty described in the evidence panel.',params.map(function(p){return p.name;}),params.map(function(p){return p.value;}),'parameter','estimate'));
    return{status:fit.converged?'success':'warning',summary:(fit.model||model)+' fit',metrics:[metric('Converged',String(fit.converged)),metric('RMSE',fit.rmse.toPrecision(5)),metric('R²',fit.r2.toFixed(4)),metric('Evaluations',fit.evaluations||0),metric('Termination',fit.terminationReason),metric('Bootstrap successes',fit.bootstrap?fit.bootstrap.replicates:0)],warnings:fit.converged?['Goodness of fit does not establish mechanistic validity or identifiability.']:[fit.terminationReason],provenance:['FokoFitting',model,'local least squares','seeded pairs bootstrap'],plots:plots,raw:fit};
  }

  function runLinalg(raw){
    assertDeps(['Linalg']);const c=clone(raw),A=D.Linalg.parseMatrix(c.matrix||'4,1,0\n1,3,1\n0,1,2'),summary=D.Linalg.matrixSummary(A),svd=D.Linalg.singularValueDiagnostics(A);let eig=null;if(D.Linalg.isSymmetric(A))eig=D.Linalg.symmetricEigenDecomposition(A);const rowLabels=A.map(function(_,i){return 'r'+(i+1);}),colLabels=A[0].map(function(_,i){return 'c'+(i+1);});const plots=[heatPlot('matrix','Matrix heatmap','The supplied numerical entries; colour is a visual encoding only.',A,colLabels,rowLabels,'column','row'),barPlot('singular','Singular-value spectrum','Singular values quantify directional amplification and numerical rank at the declared tolerance.',svd.singularValues.map(function(_,i){return 'σ'+(i+1);}),svd.singularValues,'index','singular value')];if(eig)plots.push(barPlot('eigen','Symmetric eigenvalues','Real eigenvalues from the symmetric Jacobi eigensolver with residual checks.',eig.values.map(function(_,i){return 'λ'+(i+1);}),eig.values,'index','eigenvalue'));else plots.push(barPlot('row-norms','Row norms','Euclidean row norms; this is not a spectral diagnostic.',rowLabels,A.map(function(row){return Math.hypot.apply(Math,row); }),'row','norm'));
    return{status:'success',summary:'Dense matrix diagnostics',metrics:[metric('Shape',summary.rows+' × '+summary.columns),metric('Rank',summary.rank),metric('Condition estimate',Number.isFinite(svd.conditionEstimate)?svd.conditionEstimate.toPrecision(5):'∞'),metric('Frobenius norm',summary.frobeniusNorm.toPrecision(5)),metric('Symmetric',String(D.Linalg.isSymmetric(A)))],warnings:['Browser-scale dense linear algebra is not a replacement for LAPACK or sparse solvers.'],provenance:['FokoLinalgReference','pivoted LU / Jacobi / SVD diagnostics','finite precision'],plots:plots,raw:{summary:summary,svd:svd,eig:eig}};
  }

  const NETWORK_EDGES='source,target,weight\nA,B,1\nA,C,1\nB,C,1\nB,D,1\nC,E,1\nD,E,1\nD,F,1\nE,F,1\nF,G,1';
  function runNetworks(raw){
    assertDeps(['Networks']);const c=clone(raw),edges=D.Networks.parseEdges(c.edges||NETWORK_EDGES),directed=!!c.directed,nodes=D.Networks.nodes(edges),summary=D.Networks.summary(edges,directed,{weightMeaning:'cost'}),pr=D.Networks.weightedPageRank(edges,directed);const degree={};nodes.forEach(function(n){degree[n]=0;});edges.forEach(function(e){degree[e.source]+=1;degree[e.target]+=1;});const angle=function(i){return 2*Math.PI*i/nodes.length;},coords={};nodes.forEach(function(n,i){coords[n]=[Math.cos(angle(i)),Math.sin(angle(i))];});const edgeX=[],edgeY=[];edges.forEach(function(e){edgeX.push(coords[e.source][0],coords[e.target][0],null);edgeY.push(coords[e.source][1],coords[e.target][1],null);});const plots=[{id:'graph',title:'Network structure',meaning:'A deterministic circular layout of the declared graph; spatial position has no scientific meaning.',data:[{type:'scatter',mode:'lines',x:edgeX,y:edgeY,line:{width:1},hoverinfo:'skip',name:'edges'},{type:'scatter',mode:'markers+text',x:nodes.map(function(n){return coords[n][0];}),y:nodes.map(function(n){return coords[n][1];}),text:nodes,textposition:'top center',marker:{size:nodes.map(function(n){return 10+5*degree[n];})},name:'nodes'}],layout:{xaxis:{visible:false},yaxis:{visible:false,scaleanchor:'x'},margin:{t:18,r:20,b:30,l:20}}},barPlot('degree','Degree counts','Unweighted incidence counts. Weighted strength is a different quantity.',nodes,nodes.map(function(n){return degree[n];}),'node','degree'),barPlot('pagerank','Weighted PageRank','Damped weighted PageRank scores; these are structural rankings, not causal importance.',nodes,nodes.map(function(n){return pr.scores[n];}),'node','score')];
    return{status:'success',summary:'Network structural diagnostics',metrics:[metric('Nodes',summary.nodeCount),metric('Edges',summary.edgeCount),metric('Weak components',summary.weakComponents.length),metric('Directed',String(directed)),metric('PageRank converged',String(pr.converged)),metric('Density',summary.density.toFixed(4))],warnings:['Centrality and community diagnostics are descriptive functions of the declared graph.'],provenance:['FokoNetworksReference','non-negative edge weights','deterministic circular display'],plots:plots,raw:{summary:summary,pagerank:pr}};
  }

  function classificationData(){const X=[],y=[];for(let i=0;i<24;i+=1){X.push([.2+i*.04,.8+(i%4)*.05]);y.push(0);}for(let i=0;i<24;i+=1){X.push([2.2+i*.04,2.7+(i%4)*.05]);y.push(1);}return{X:X,y:y};}
  function runML(raw){
    assertDeps(['ML']);const c=clone(raw),data=classificationData(),folds=integer(Number(c.folds||5),'folds',2,10),seed=integer(Number(c.seed||21),'seed',0,4294967295),model=c.model||'logistic',cv=D.ML.crossValidate(data.X,data.y,{task:'classification',model:model,folds:folds,seed:seed,standardize:true,lambda:.01,neighbors:3});const roc=cv.aggregate.roc,cal=cv.aggregate.calibration;const plots=[{id:'classification','title':'Out-of-fold classifications',meaning:'Points are coloured by out-of-fold predicted class, not in-sample fit.',data:[{type:'scatter',mode:'markers',x:data.X.map(function(r){return r[0];}),y:data.X.map(function(r){return r[1];}),marker:{color:cv.predictions,colorscale:[[0,'#4f8bd6'],[1,'#e76f51']],size:9},text:data.y.map(function(v){return 'observed '+v;}),name:'OOF prediction'}],layout:{xaxis:{title:'feature 1'},yaxis:{title:'feature 2'},margin:{t:18,r:22,b:58,l:58}}},linePlot('roc','ROC curve','Out-of-fold discrimination curve. AUC does not establish calibration or utility.',[{type:'scatter',mode:'lines',x:roc.fpr,y:roc.tpr,name:'ROC AUC '+roc.auc.toFixed(3)},{type:'scatter',mode:'lines',x:[0,1],y:[0,1],name:'chance',line:{dash:'dash'}}],'false-positive rate','true-positive rate'),linePlot('calibration','Calibration bins','Observed event frequency against mean predicted probability in finite bins.',[{type:'scatter',mode:'lines+markers',x:cal.map(function(b){return b.meanPrediction;}),y:cal.map(function(b){return b.observedRate;}),name:'bins'},{type:'scatter',mode:'lines',x:[0,1],y:[0,1],name:'ideal',line:{dash:'dash'}}],'mean predicted probability','observed frequency')];
    return{status:'success',summary:'Seeded out-of-fold classification',metrics:[metric('Model',model),metric('Folds',folds),metric('Balanced accuracy',cv.aggregate.balancedAccuracy.toFixed(4)),metric('ROC AUC',roc.auc.toFixed(4)),metric('Rows',data.X.length),metric('Seed',seed)],warnings:['Synthetic separation is a software test, not evidence of external generalization.'],provenance:['FokoMLReference','preprocessing fitted within folds','out-of-fold predictions','seeded folds'],plots:plots,raw:cv};
  }

  function runSciML(raw){
    assertDeps(['ODE','SINDy']);const c=clone(raw),r=finite(c.r,'r'),K=positive(c.K,'K'),x0=finite(c.x0,'x0'),tEnd=positive(c.tEnd,'tEnd'),points=integer(Number(c.points),'points',80,2000),lambda=positive(c.lambda,'lambda');const ode=D.ODE.solveWithRhs({t0:0,t1:tEnd,y0:[x0],vars:['x'],method:'rk45',points:points,rtol:1e-8,atol:1e-10},function(_t,y){return[r*y[0]*(1-y[0]/K)];});const X=ode.T.map(function(_,i){return[ode.Y[0][i]];});const cfg={X:X,t:ode.T,varNames:['x'],lambda:lambda,ridge:1e-6,iterations:8,library:{constant:true,linear:true,quadratic:true,interactions:false,cubic:false,trig:false}};const model=D.SINDy.discover(cfg),pareto=D.SINDy.paretoSweep(Object.assign({},cfg,{lambdas:[.0005,.001,.003,.01,.03,.1,.3,1]}));const pred=model.Theta.map(function(row){return row.reduce(function(sum,value,index){return sum+value*model.Xi[index][0];},0);});const residual=model.Xdot.map(function(row,i){return row[0]-pred[i];});const best=pareto.points[pareto.bestIndex];const plots=[linePlot('sindy-trajectory','Trajectory used for discovery','Browser-generated RK45 trajectory supplied to SINDy.',[{type:'scatter',mode:'lines',x:ode.T,y:ode.Y[0],name:'x(t)'}],'time','x'),linePlot('sindy-pareto','SINDy sparsity–error sweep','Real STLSQ refits across a finite threshold grid; the selected knee is heuristic.',[{type:'scatter',mode:'lines+markers',x:pareto.points.map(function(p){return p.activeTerms;}),y:pareto.points.map(function(p){return p.rmse;}),name:'threshold sweep'},{type:'scatter',mode:'markers',x:[best.activeTerms],y:[best.rmse],marker:{size:13},name:'heuristic knee'}],'active terms','RMSE'),linePlot('sindy-derivative','Derivative fit','Finite-difference derivative estimates and sparse-model predictions on the same data.',[{type:'scatter',mode:'lines',x:ode.T,y:model.Xdot.map(function(r){return r[0];}),name:'estimated derivative'},{type:'scatter',mode:'lines',x:ode.T,y:pred,name:'SINDy prediction'},{type:'scatter',mode:'lines',x:ode.T,y:residual,name:'residual'}],'time','dx/dt')];
    return{status:'success',summary:'Sparse equation discovery',metrics:[metric('Equation',model.equations[0]),metric('Active terms',model.sparsity),metric('Fit RMSE',model.rmse.toExponential(3)),metric('Samples',model.nSamples),metric('Threshold',lambda),metric('Derivative source',model.usedFiniteDifferences?'finite differences':'provided')],warnings:['SINDy identifies a sparse representation conditional on the candidate library, derivative estimates and threshold.'],provenance:['FokoODECore trajectory','FokoSINDy STLSQ','finite-difference derivatives','finite threshold sweep'],plots:plots,raw:{ode:ode,model:model,pareto:pareto}};
  }

  const adapters = {
    ode:{id:'ode',label:'ODE',family:'Deterministic dynamics',description:'Adaptive deterministic integration with trajectories, state-space geometry, derivative magnitude and finite-window diagnostics from the same FokoODECore result.',focusedHref:'ode.html',defaultPreset:'sir',presets:ODE_PRESETS,fields:[{path:'beta',label:'β / Lorenz β',type:'number',step:.01},{path:'gamma',label:'γ recovery',type:'number',step:.01},{path:'sigma',label:'Lorenz σ',type:'number',step:.1},{path:'rho',label:'Lorenz ρ',type:'number',step:.1},{path:'a',label:'FHN a',type:'number',step:.05},{path:'b',label:'FHN b',type:'number',step:.05},{path:'tau',label:'FHN time scale',type:'number',step:.5},{path:'current',label:'FHN input current',type:'number',step:.05},{path:'A',label:'Brusselator A',type:'number',step:.1},{path:'B',label:'Brusselator B',type:'number',step:.1},{path:'fast',label:'fast rate',type:'number',step:10},{path:'slow',label:'slow rate',type:'number',step:.1},{path:'tEnd',label:'time horizon',type:'number',step:1},{path:'points',label:'plot points',type:'number',step:20}],run:runOde},
    steady:{id:'steady',label:'Steady-State',family:'Algebraic systems',description:'Damped Newton root solving and local Jacobian evidence from FokoSteadyCore.',focusedHref:'steady.html',defaultPreset:'logistic',presets:STEADY_PRESETS,fields:[{path:'x0',label:'initial guess x',type:'number',step:.1},{path:'tolerance',label:'residual tolerance',type:'number',step:'any'},{path:'scanMin',label:'scan minimum',type:'number',step:.1},{path:'scanMax',label:'scan maximum',type:'number',step:.1}],run:runSteady},
    stochastic:{id:'stochastic',label:'Stochastic CTMC',family:'Discrete stochastic processes',description:'Independent Gillespie direct SSA ensembles with paths, empirical bands, final distributions and dispersion diagnostics from one seeded ensemble.',focusedHref:'stochastic.html',defaultPreset:'birth',presets:STOCH_PRESETS,fields:[{path:'transcription',label:'transcription rate',type:'number',step:.1},{path:'mrnaDecay',label:'mRNA decay',type:'number',step:.05},{path:'translation',label:'translation rate',type:'number',step:.1},{path:'proteinDecay',label:'protein decay',type:'number',step:.02},{path:'runs',label:'ensemble runs',type:'number',step:10},{path:'seed',label:'master seed',type:'number',step:1},{path:'tEnd',label:'time horizon',type:'number',step:1},{path:'points',label:'observation points',type:'number',step:10}],run:runStochastic},
    optimization:{id:'optimization',label:'Optimization',family:'Bounded numerical search',description:'Finite local or population search using FokoOptimizationCore with explicit feasibility evidence.',focusedHref:'optimization.html',defaultPreset:'constrained',presets:OPT_PRESETS,fields:[{path:'algorithm',label:'algorithm',type:'select',options:['coordinate','projected_gradient','differential_evolution','multi_start','random_search']},{path:'maxIterations',label:'iteration budget',type:'number',step:10},{path:'seed',label:'seed',type:'number',step:1},{path:'x0',label:'start x',type:'number',step:.1},{path:'y0',label:'start y',type:'number',step:.1}],run:runOptimization},
    agent:{id:'agent',label:'Agent',family:'Lattice agent systems',description:'Seeded random-sequential agent ensembles using FokoAgentReference.',focusedHref:'agent.html',defaultPreset:'tcell_baseline',presets:Object.keys(D.AgentPresets||{}).reduce(function(out,key){const p=D.AgentPresets[key];out[key]={title:p.title,note:p.note,config:{size:Math.min(26,p.size),steps:Math.min(80,p.steps),runs:Math.min(12,p.runs),seed:p.seed,recordEvery:p.recordEvery}};return out;},{}),fields:[{path:'size',label:'grid size',type:'number',step:2},{path:'steps',label:'sweeps',type:'number',step:10},{path:'runs',label:'ensemble runs',type:'number',step:2},{path:'seed',label:'master seed',type:'number',step:1}],run:runAgent},
    statistics:{id:'statistics',label:'Statistics',family:'Data analysis',description:'Shared parsing plus simple OLS and residual evidence from FokoDataCore and FokoStatistics.',focusedHref:'statistics.html',defaultPreset:'regression',presets:{regression:{title:'Dose–response OLS',note:'A compact workbench adapter. Use the focused Statistics Lab for broader tests and data editing.',config:{data:STATS_DATA}}},fields:[],run:runStatistics},
    fitting:{id:'fitting',label:'Curve Fitting',family:'Parameter estimation',description:'Nonlinear least squares and diagnostic evidence from FokoFitting.',focusedHref:'fitting.html',defaultPreset:'michaelis',presets:{michaelis:{title:'Michaelis–Menten fit',note:'Mechanistic interpretation requires the quasi-steady-state assumptions.',config:{model:'michaelis',pairs:FIT_DATA,bootstrapReplicates:40,seed:44}},linear:{title:'Linear calibration',note:'A numerical line fit does not prove linearity outside the observed range.',config:{model:'linear',pairs:[[0,.1],[1,2.0],[2,4.2],[3,6.0],[4,8.1],[5,10.2]],bootstrapReplicates:50,seed:45}}},fields:[{path:'bootstrapReplicates',label:'bootstrap replicates',type:'number',step:10},{path:'seed',label:'bootstrap seed',type:'number',step:1}],run:runFitting},
    linalg:{id:'linalg',label:'Linear Algebra',family:'Matrix diagnostics',description:'Dense matrix structure, singular values and symmetric spectra from FokoLinalgReference.',focusedHref:'linear-algebra.html',defaultPreset:'spd',presets:{spd:{title:'Symmetric positive-definite matrix',note:'Small dense reference matrix.',config:{matrix:'4,1,0\n1,3,1\n0,1,2'}},hilbert:{title:'Hilbert conditioning stress test',note:'Ill-conditioning makes finite-precision results sensitive.',config:{matrix:'1,.5,.333333,.25\n.5,.333333,.25,.2\n.333333,.25,.2,.166667\n.25,.2,.166667,.142857'}}},fields:[],run:runLinalg},
    networks:{id:'networks',label:'Networks',family:'Graph structure',description:'Weighted graph summaries and centrality from FokoNetworksReference.',focusedHref:'networks.html',defaultPreset:'social',presets:{social:{title:'Undirected social graph',note:'Centrality is structural, not causal.',config:{edges:NETWORK_EDGES,directed:false}},directed:{title:'Directed information flow',note:'Weights are declared strengths for ranking, not conserved flow.',config:{edges:'source,target,weight\nA,B,2\nA,C,1\nB,D,2\nC,D,1\nD,E,2\nE,B,.5',directed:true}}},fields:[{path:'directed',label:'directed graph',type:'checkbox'}],run:runNetworks},
    ml:{id:'ml',label:'Machine Learning',family:'Predictive diagnostics',description:'Seeded out-of-fold browser baselines from FokoMLReference.',focusedHref:'ml.html',defaultPreset:'logistic',presets:{logistic:{title:'Logistic classification',note:'Synthetic separability is a software diagnostic, not external validation.',config:{model:'logistic',folds:5,seed:21}},knn:{title:'k-nearest-neighbour classification',note:'Distance-based predictions depend on scaling and neighbourhood size.',config:{model:'knn',folds:5,seed:22}}},fields:[{path:'model',label:'model',type:'select',options:['logistic','gaussian_nb','knn']},{path:'folds',label:'cross-validation folds',type:'number',step:1},{path:'seed',label:'seed',type:'number',step:1}],run:runML},
    sciml:{id:'sciml',label:'SciML / SINDy',family:'Equation discovery',description:'Browser-computed sparse equation discovery using FokoSINDy on a real ODE trajectory.',focusedHref:'sciml.html',defaultPreset:'logistic',presets:{logistic:{title:'Logistic SINDy discovery',note:'Recovered equations depend on the candidate library and derivative estimates.',config:{r:1,K:10,x0:.7,tEnd:9,points:220,lambda:.03}}},fields:[{path:'r',label:'growth rate r',type:'number',step:.05},{path:'K',label:'carrying level K',type:'number',step:.5},{path:'lambda',label:'SINDy threshold',type:'number',step:.005},{path:'points',label:'samples',type:'number',step:20}],run:runSciML}
  };

  Object.keys(adapters).forEach(function (id) {
    const adapter=adapters[id]; if(!adapter.presets[adapter.defaultPreset]) throw new Error('Adapter '+id+' has no default preset.');
    adapter.createConfig=function(presetId){const key=adapter.presets[presetId]?presetId:adapter.defaultPreset;return Object.assign({preset:key},clone(adapter.presets[key].config));};
    adapter.runPreset=function(presetId,override){return adapter.run(Object.assign(adapter.createConfig(presetId),clone(override||{})));};
  });

  const legacyModelMap={sir:['ode','sir'],lotka:['ode','lotka'],'stoch-sir':['stochastic','sir'],quadratic:['optimization','constrained'],'enzyme-steady':['steady','logistic']};
  return Object.freeze({ VERSION:VERSION, adapters:adapters, ids:Object.keys(adapters), get:function(id){return adapters[id]||null;}, legacyModelMap:legacyModelMap, clone:clone, resolve:resolve, swapDistinctSelection:swapDistinctSelection });
}));
