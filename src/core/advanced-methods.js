/* Foko Lab advanced-methods reference core.
 * Deterministic, bounded teaching computations; no external services or fabricated results.
 */
(function (root) {
  'use strict';

  function assert(condition, message) { if (!condition) throw new Error(message); }
  function number(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function integer(value, fallback, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(number(value, fallback)))); }
  function linspace(a, b, count) { return Array.from({ length: count }, function (_, i) { return a + (b - a) * i / Math.max(1, count - 1); }); }
  function seededRandom(seed) {
    let state = (Math.round(number(seed, 1)) >>> 0) || 1;
    return function () { state = (1664525 * state + 1013904223) >>> 0; return state / 4294967296; };
  }
  function normal(random) {
    const u = Math.max(1e-12, random());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random());
  }
  function logGamma(z) {
    const coefficients = [676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
    let x = 0.99999999999980993; z -= 1;
    coefficients.forEach(function (c, i) { x += c / (z + i + 1); });
    const t = z + coefficients.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function betaDensity(x, a, b) {
    if (!(x > 0 && x < 1)) return 0;
    return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - (logGamma(a) + logGamma(b) - logGamma(a + b)));
  }
  function quantile(values, probability) {
    const sorted = values.slice().sort(function (a, b) { return a - b; });
    const index = (sorted.length - 1) * probability;
    const lo = Math.floor(index), hi = Math.ceil(index);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (index - lo);
  }
  function plot(title, xTitle, yTitle, traces, evidence, extra) {
    return { traces, layout: Object.assign({ title: { text: title, font: { size: 14 } }, margin: { l: 62, r: 24, t: 52, b: 58 }, paper_bgcolor: '#fff', plot_bgcolor: '#fbfdff', xaxis: { title: xTitle, gridcolor: '#dce8ef' }, yaxis: { title: yTitle, gridcolor: '#dce8ef' }, legend: { orientation: 'h', y: 1.12 }, autosize: true }, extra || {}), evidence };
  }

  function bayesian(params) {
    const alpha = Math.max(0.05, number(params.alpha, 2));
    const beta = Math.max(0.05, number(params.beta, 2));
    const trials = integer(params.trials, 40, 1, 100000);
    const successes = integer(params.successes, 22, 0, trials);
    const postA = alpha + successes, postB = beta + trials - successes;
    const x = linspace(0.001, 0.999, 401);
    const prior = x.map(function (v) { return betaDensity(v, alpha, beta); });
    const posterior = x.map(function (v) { return betaDensity(v, postA, postB); });
    const likelihoodRaw = x.map(function (v) { return Math.exp(successes*Math.log(v)+(trials-successes)*Math.log(1-v)); });
    const likelihoodMax = Math.max.apply(null, likelihoodRaw) || 1;
    const likelihood = likelihoodRaw.map(function (value) { return value/likelihoodMax; });
    let cumulative = 0; const dx = x[1] - x[0];
    let lower = x[0], upper = x[x.length - 1];
    const posteriorCdf = [];
    posterior.forEach(function (density, i) { cumulative += density * dx; posteriorCdf.push(Math.min(1, cumulative)); if (cumulative <= 0.025) lower = x[i]; if (cumulative <= 0.975) upper = x[i]; });
    const mean = postA / (postA + postB);
    const futureTrials = 20;
    const predictive = Array.from({length:futureTrials+1},function(_,k){return Math.exp(logGamma(futureTrials+1)-logGamma(k+1)-logGamma(futureTrials-k+1)+logGamma(postA+k)+logGamma(postB+futureTrials-k)-logGamma(postA+postB+futureTrials)-logGamma(postA)-logGamma(postB)+logGamma(postA+postB));});
    return { module: 'bayesian', title: 'Beta–Binomial posterior', metrics: { posterior_mean: mean, posterior_sd: Math.sqrt(postA * postB / ((postA + postB) ** 2 * (postA + postB + 1))), credible_lower_grid: lower, credible_upper_grid: upper, predictive_success_probability: mean }, plots: [
      plot('Prior and posterior probability','success probability','density',[{x,y:prior,mode:'lines',name:'prior Beta(' + alpha + ',' + beta + ')'},{x,y:posterior,mode:'lines',name:'posterior Beta(' + postA + ',' + postB + ')'}],'Exact conjugate Beta–Binomial updating. The interval endpoints are read from a finite density grid and are not MCMC diagnostics.'),
      plot('Posterior cumulative probability','success probability','cumulative probability',[{x,y:posteriorCdf,mode:'lines',name:'posterior CDF'},{x:[lower,lower,upper,upper],y:[0,.025,.975,1],mode:'markers',name:'grid interval markers'}],'The cumulative curve is obtained by numerical integration of the same finite posterior-density grid. The marked interval is equal-tail on that grid.'),
      plot('Prior, normalized likelihood, and posterior','success probability','relative evidence / density',[{x,y:prior.map(function(v){return v/Math.max.apply(null,prior);}),mode:'lines',name:'scaled prior'},{x,y:likelihood,mode:'lines',name:'normalized likelihood'},{x,y:posterior.map(function(v){return v/Math.max.apply(null,posterior);}),mode:'lines',name:'scaled posterior'}],'All three curves are scaled to peak at one so their locations and widths can be compared. Relative heights are not comparable normalizing constants.'),
      plot('Posterior predictive count for 20 future trials','future successes','probability',[{x:Array.from({length:futureTrials+1},function(_,k){return k;}),y:predictive,type:'bar',name:'Beta–Binomial predictive'}],'Exact conjugate posterior predictive distribution conditional on exchangeable Bernoulli trials and the declared Beta prior.'),
      plot('Posterior log-density geometry','success probability','log density relative to peak',[{x,y:posterior.map(function(v){return Math.log(Math.max(v,1e-300)/Math.max.apply(null,posterior));}),mode:'lines',name:'relative log posterior'},{x:[lower,upper],y:[Math.log(Math.max(betaDensity(lower,postA,postB),1e-300)/Math.max.apply(null,posterior)),Math.log(Math.max(betaDensity(upper,postA,postB),1e-300)/Math.max.apply(null,posterior))],mode:'markers',name:'95% interval endpoints'}],'Relative log density makes tails and concentration visible without claiming a Gaussian approximation or MCMC convergence.')
    ], table: [{quantity:'successes / trials',value:successes + ' / ' + trials},{quantity:'posterior shape',value:'Beta(' + postA + ', ' + postB + ')'}], limitations: 'One binomial rate with a conjugate prior; no hierarchy, covariates, model comparison, or general-purpose sampler.' };
  }

  function design(params) {
    const amplitude = Math.max(1e-6, number(params.amplitude, 2));
    const rate = Math.max(1e-6, number(params.rate, 0.6));
    const duration = Math.max(0.1, number(params.duration, 8));
    const points = integer(params.points, 25, 5, 120);
    const times = linspace(0, duration, points);
    const candidates = [];
    for (let i = 0; i < times.length; i += 1) for (let j = i + 1; j < times.length; j += 1) {
      const s = [times[i], times[j]].map(function (t) { const e = Math.exp(-rate*t); return [e, -amplitude*t*e]; });
      const a = s[0][0]**2+s[1][0]**2, b=s[0][0]*s[0][1]+s[1][0]*s[1][1], d=s[0][1]**2+s[1][1]**2;
      candidates.push({t1:times[i],t2:times[j],det:Math.max(0,a*d-b*b),correlation:b/Math.sqrt(Math.max(1e-30,a*d))});
    }
    candidates.sort(function(a,b){return b.det-a.det;}); const best=candidates[0];
    const t0Designs=candidates.filter(function(row){return row.t1===0;});
    return { module:'design', title:'Two-time D-optimal design', metrics:{best_t1:best.t1,best_t2:best.t2,fisher_determinant:best.det,sensitivity_correlation:best.correlation,candidates_examined:candidates.length}, plots:[
      plot('Two-sample design search','later sample time','log10 det(FIM)',[{x:t0Designs.map(function(row){return row.t2;}),y:t0Designs.map(function(row){return Math.log10(Math.max(1e-30,row.det));}),mode:'lines+markers',name:'designs with t₁ = 0'}],'Local Fisher information for y(t)=a exp(-kt) under equal independent error variance. D-optimality is local to the declared nominal parameters.'),
      plot('All candidate observation pairs','first sample time','second sample time',[{x:candidates.map(function(row){return row.t1;}),y:candidates.map(function(row){return row.t2;}),mode:'markers',type:'scatter',marker:{size:7,color:candidates.map(function(row){return Math.log10(Math.max(1e-30,row.det));}),colorscale:'Viridis',colorbar:{title:'log10 det'}},name:'candidate pair'},{x:[best.t1],y:[best.t2],mode:'markers',marker:{size:15,symbol:'x',color:'#d97706'},name:'best finite pair'}],'Every admissible pair on the finite time grid is shown. The highlighted pair maximizes the local determinant only within this grid.'),
      plot('Information versus sensitivity alignment','|sensitivity correlation|','log10 det(FIM)',[{x:candidates.map(function(row){return Math.abs(row.correlation);}),y:candidates.map(function(row){return Math.log10(Math.max(1e-30,row.det));}),mode:'markers',marker:{color:candidates.map(function(row){return row.t2-row.t1;}),colorscale:'Turbo',colorbar:{title:'time separation'}},name:'candidate designs'}],'High local sensitivity alignment generally weakens joint parameter information. The relationship remains specific to this finite two-time design problem.')
    ], table:candidates.slice(0,8).map(function(row,index){return{rank:index+1,t1:row.t1,t2:row.t2,determinant:row.det};}), limitations:'Two parameters, two observation times, equal error variance, and a local linearization only.' };
  }

  function standards(params) {
    const fields = { model_id:String(params.model_id||''), seed:String(params.seed||''), units:String(params.units||''), algorithm:String(params.algorithm||''), provenance:String(params.provenance||'') };
    const checks = [
      {name:'stable model identifier',pass:/^[A-Za-z][A-Za-z0-9_.-]{2,}$/.test(fields.model_id)},
      {name:'explicit integer seed',pass:/^\d+$/.test(fields.seed)},
      {name:'declared units',pass:fields.units.trim().length>0},
      {name:'named algorithm',pass:fields.algorithm.trim().length>2},
      {name:'provenance note',pass:fields.provenance.trim().length>8}
    ];
    const score=checks.filter(function(row){return row.pass;}).length/checks.length;
    return {module:'standards',title:'Reproducibility manifest check',metrics:{checks_passed:checks.filter(function(row){return row.pass;}).length,total_checks:checks.length,completeness:score},plots:[
      plot('Manifest completeness','required field','status', [{x:checks.map(function(row){return row.name;}),y:checks.map(function(row){return row.pass?1:0;}),type:'bar',name:'pass'}],'Local schema-oriented checks for a small study manifest. This does not validate SBML semantics, SED-ML execution, or produce a COMBINE archive.',{yaxis:{title:'pass (1) / fail (0)',range:[0,1.15]}}),
      plot('Declared metadata depth','manifest field','character count',[{x:Object.keys(fields),y:Object.keys(fields).map(function(key){return fields[key].trim().length;}),type:'bar',name:'declared characters'}],'Character count makes absent or extremely terse metadata visible. It is a completeness cue, not a semantic quality score.'),
      plot('Manifest status profile','requirement','pass fraction',[{type:'scatterpolar',r:checks.map(function(row){return row.pass?1:0;}).concat([checks[0].pass?1:0]),theta:checks.map(function(row){return row.name;}).concat([checks[0].name]),fill:'toself',name:'manifest'}],'The radial profile exposes which declared requirements are absent. It is a binary completeness visualization, not a standards certification.',{polar:{radialaxis:{range:[0,1],tickvals:[0,1]}}})
    ],table:checks,normalized:{schema:'fokolab.study-manifest/1',model_id:fields.model_id,seed:Number(fields.seed),units:fields.units,algorithm:fields.algorithm,provenance:fields.provenance},limitations:'A small reproducibility checklist, not a standards-compliance validator for SBML, SED-ML, OMEX, FMI, or regulatory submissions.'};
  }

  function continuation(params) {
    const kind = String(params.normal_form || 'pitchfork'); const start=number(params.mu_start,-2), end=number(params.mu_end,2), points=integer(params.points,161,41,601); const mus=linspace(Math.min(start,end),Math.max(start,end),points); const rows=[];
    mus.forEach(function(mu){
      if(kind==='saddle-node' && mu>=0){const r=Math.sqrt(mu);rows.push({mu,x:r,stable:true},{mu,x:-r,stable:false});}
      else if(kind==='transcritical'){rows.push({mu,x:0,stable:mu<0},{mu,x:mu,stable:mu>0});}
      else if(kind==='pitchfork'){rows.push({mu,x:0,stable:mu<0});if(mu>=0){const r=Math.sqrt(mu);rows.push({mu,x:r,stable:true},{mu,x:-r,stable:true});}}
    });
    function trace(stable){const subset=rows.filter(function(row){return row.stable===stable;});return{x:subset.map(function(row){return row.mu;}),y:subset.map(function(row){return row.x;}),mode:'markers',name:stable?'locally stable':'locally unstable',marker:{size:5,symbol:stable?'circle':'x'}};}
    const inspectMu=number(params.inspect_mu,(Math.min(start,end)+Math.max(start,end))/2), xs=linspace(-2.5,2.5,301);
    function field(x){if(kind==='saddle-node')return inspectMu-x*x;if(kind==='transcritical')return inspectMu*x-x*x;return inspectMu*x-x*x*x;}
    return {module:'continuation',title:'Analytic normal-form branches',metrics:{normal_form:kind,branch_points:rows.length,parameter_min:Math.min(start,end),parameter_max:Math.max(start,end),inspection_parameter:inspectMu},plots:[
      plot('Finite branch scan: '+kind,'control parameter μ','equilibrium x',[trace(true),trace(false)],'Analytic equilibrium branches and derivative-based local stability for a canonical one-dimensional normal form. This is not pseudo-arclength continuation and cannot follow arbitrary user models.'),
      plot('Vector field at μ = '+inspectMu.toPrecision(4),'state x','dx/dt',[{x:xs,y:xs.map(field),mode:'lines',name:'f(x, μ)'},{x:xs.filter(function(x){return Math.abs(field(x))<.025;}),y:xs.filter(function(x){return Math.abs(field(x))<.025;}).map(field),mode:'markers',name:'near-zero grid points'}],'The one-dimensional vector field shows flow direction at one declared parameter value. Near-zero grid markers are visual aids, not certified roots.'),
      plot('Flow potential at inspection parameter','state x','relative potential',[{x:xs,y:xs.map(function(x){if(kind==='saddle-node')return -inspectMu*x+x*x*x/3;if(kind==='transcritical')return -inspectMu*x*x/2+x*x*x/3;return -inspectMu*x*x/2+x*x*x*x/4;}),mode:'lines',fill:'tozeroy',name:'V with dx/dt = −dV/dx'}],'The analytic potential is available only for these one-dimensional gradient normal forms. Wells help interpret local attraction but are not transition probabilities.')
    ],table:rows.filter(function(_,i){return i%Math.max(1,Math.floor(rows.length/12))===0;}),limitations:'Canonical analytic normal forms only; no automatic event detection, branch switching, periodic-orbit continuation, or user-defined residuals.'};
  }

  function spatialPde(params) {
    const diffusivity=Math.max(1e-6,number(params.diffusivity,0.08)), nx=integer(params.grid_points,61,21,121), steps=integer(params.steps,240,20,1200); const dx=1/(nx-1); let dt=0.42*dx*dx/diffusivity; const requested=number(params.dt,dt); dt=Math.min(requested,0.49*dx*dx/diffusivity); const ratio=diffusivity*dt/(dx*dx); const x=linspace(0,1,nx); let u=x.map(function(v){return Math.exp(-(((v-0.35)/0.08)**2));}); const z=[],times=[]; const stride=Math.max(1,Math.floor(steps/60));
    for(let step=0;step<=steps;step+=1){if(step%stride===0||step===steps){z.push(u.slice());times.push(step*dt);}const next=u.slice();for(let i=1;i<nx-1;i+=1)next[i]=u[i]+ratio*(u[i-1]-2*u[i]+u[i+1]);next[0]=next[1];next[nx-1]=next[nx-2];u=next;}
    const initialMass=z[0].reduce(function(sum,v){return sum+v;},0)*dx, finalMass=u.reduce(function(sum,v){return sum+v;},0)*dx;
    return {module:'spatial-pde',title:'One-dimensional diffusion',metrics:{dx,dt,cfl_ratio:ratio,initial_mass:initialMass,final_mass:finalMass,mass_relative_change:(finalMass-initialMass)/initialMass},plots:[plot('1D heat equation','position x','time',[{x,y:times,z,type:'heatmap',colorscale:'Viridis',colorbar:{title:'u'}}],'Explicit finite-difference solution of ∂u/∂t=D∂²u/∂x² with zero-flux edge copying. The time step is clamped below the explicit stability limit.',{yaxis:{title:'time'}}),plot('Initial and final profiles','position x','u',[{x,y:z[0],mode:'lines',name:'initial'},{x,y:u,mode:'lines',name:'final'}],'Finite-grid profiles; accuracy depends on dx, dt, boundary treatment, and smoothness.'),plot('Live field surface','position x','time',[{x,y:times,z,type:'surface',colorscale:'Viridis',colorbar:{title:'u'},contours:{z:{show:true,usecolormap:true,project:{z:true}}}}],'The 3D surface displays the same finite-difference states as the heatmap. It adds geometric inspection, not numerical resolution.',{scene:{xaxis:{title:'position x'},yaxis:{title:'time'},zaxis:{title:'u'}},margin:{l:16,r:16,t:36,b:18}})],table:times.map(function(t,i){return{time:t,peak:Math.max.apply(null,z[i]),mass:z[i].reduce(function(sum,v){return sum+v;},0)*dx};}).filter(function(_,i){return i%10===0;}),limitations:'One-dimensional linear diffusion on a uniform grid; no reactions, irregular meshes, adaptive stepping, or PDE verification against a reference solver.'};
  }

  function sde(params) {
    const theta=Math.max(1e-6,number(params.theta,1.2)), mu=number(params.mu,0.5), sigma=Math.max(0,number(params.sigma,0.35)), x0=number(params.x0,-0.5), horizon=Math.max(0.01,number(params.horizon,5)), steps=integer(params.steps,240,20,1000), paths=integer(params.paths,180,20,1000), random=seededRandom(params.seed); const dt=horizon/steps, times=linspace(0,horizon,steps+1); const matrix=Array.from({length:paths},function(){const values=[x0];let x=x0;for(let i=0;i<steps;i+=1){x+=theta*(mu-x)*dt+sigma*Math.sqrt(dt)*normal(random);values.push(x);}return values;}); const mean=times.map(function(_,i){return matrix.reduce(function(sum,row){return sum+row[i];},0)/paths;}), lower=times.map(function(_,i){return quantile(matrix.map(function(row){return row[i];}),.05);}), upper=times.map(function(_,i){return quantile(matrix.map(function(row){return row[i];}),.95);}), analytic=times.map(function(t){return mu+(x0-mu)*Math.exp(-theta*t);});
    const finalValues=matrix.map(function(path){return path[path.length-1];});
    return {module:'sde',title:'Ornstein–Uhlenbeck ensemble',metrics:{paths,steps,dt,final_empirical_mean:mean[mean.length-1],final_analytic_mean:analytic[analytic.length-1],final_q05:lower[lower.length-1],final_q95:upper[upper.length-1]},plots:[
      plot('Seeded OU ensemble','time','state x',[{x:times,y:upper,mode:'lines',name:'90% band upper',line:{width:0}},{x:times,y:lower,mode:'lines',name:'90% band',fill:'tonexty',line:{width:0}},{x:times,y:mean,mode:'lines',name:'empirical mean'},{x:times,y:analytic,mode:'lines',name:'analytic mean',line:{dash:'dash'}}],'Euler–Maruyama paths with a seeded pseudo-random generator. The band is an empirical path quantile, not a confidence interval for fitted parameters.'),
      plot('Final-state ensemble distribution','final state x','path count',[{x:finalValues,type:'histogram',nbinsx:24,name:'Euler–Maruyama endpoints'}],'Finite-path endpoint histogram from the same seeded ensemble. It is a discretized empirical distribution, not an exact transition density.'),
      plot('Representative stochastic paths','time','state x',matrix.slice(0,Math.min(18,matrix.length)).map(function(path,index){return{x:times,y:path,mode:'lines',line:{width:1},opacity:.45,name:'path '+(index+1),showlegend:false};}).concat([{x:times,y:analytic,mode:'lines',line:{width:3,color:'#172b4d'},name:'analytic mean'}]),'A bounded subset of actual seeded Euler–Maruyama paths shows pathwise variability without overwhelming the browser. The ensemble computation still uses every requested path.')
    ],table:times.map(function(t,i){return{time:t,mean:mean[i],q05:lower[i],q95:upper[i],analytic_mean:analytic[i]};}).filter(function(_,i){return i%Math.max(1,Math.floor(steps/12))===0;}),limitations:'Scalar additive-noise OU process; no calibration, strong/weak convergence study, Milstein scheme, multidimensional noise, or stiff SDE solver.'};
  }

  function genotypeDraw(p,random){return (random()<p?1:0)+(random()<p?1:0);}
  function genomic(params) {
    const individuals=integer(params.individuals,100,20,500), loci=integer(params.loci,24,4,100), divergence=Math.max(0,Math.min(.45,number(params.divergence,.12))), random=seededRandom(params.seed); const rows=[]; const matrixA=[],matrixB=[];
    for(let locus=0;locus<loci;locus+=1){const base=.08+.84*random(), pA=Math.max(.01,Math.min(.99,base-divergence/2)), pB=Math.max(.01,Math.min(.99,base+divergence/2));const a=Array.from({length:individuals},function(){return genotypeDraw(pA,random);}),b=Array.from({length:individuals},function(){return genotypeDraw(pB,random);});matrixA.push(a);matrixB.push(b);const qa=a.reduce(function(s,v){return s+v;},0)/(2*individuals),qb=b.reduce(function(s,v){return s+v;},0)/(2*individuals),p=(qa+qb)/2,ht=2*p*(1-p),hs=(2*qa*(1-qa)+2*qb*(1-qb))/2;rows.push({locus:locus+1,population_A:qa,population_B:qb,heterozygosity_within:hs,fst:ht>0?(ht-hs)/ht:0});}
    const meanFst=rows.reduce(function(s,r){return s+r.fst;},0/loci)/loci; const meanHs=rows.reduce(function(s,r){return s+r.heterozygosity_within;},0)/loci;
    return {module:'genomic',title:'Two-population genotype summary',metrics:{individuals_per_population:individuals,loci,mean_within_heterozygosity:meanHs,mean_fst:meanFst,declared_frequency_shift:divergence},plots:[plot('Per-locus allele frequencies','locus','alternate-allele frequency',[{x:rows.map(function(r){return r.locus;}),y:rows.map(function(r){return r.population_A;}),mode:'lines+markers',name:'population A'},{x:rows.map(function(r){return r.locus;}),y:rows.map(function(r){return r.population_B;}),mode:'lines+markers',name:'population B'}],'Seeded diploid genotype counts generated independently at each locus. Frequencies are finite-sample estimates, not observed genomic data.'),plot('Per-locus differentiation','locus','elementary FST ratio',[{x:rows.map(function(r){return r.locus;}),y:rows.map(function(r){return r.fst;}),type:'bar',name:'FST'}],'Elementary Ht−Hs over Ht calculation for two equal-size synthetic populations. Negative finite-sample values are retained rather than clipped.'),plot('Allele-frequency divergence map','population A frequency','population B frequency',[{x:rows.map(function(r){return r.population_A;}),y:rows.map(function(r){return r.population_B;}),mode:'markers',marker:{size:rows.map(function(r){return 7+24*Math.abs(r.fst);}),color:rows.map(function(r){return r.fst;}),colorscale:'RdBu',colorbar:{title:'FST'}},text:rows.map(function(r){return 'locus '+r.locus;}),name:'loci'},{x:[0,1],y:[0,1],mode:'lines',line:{dash:'dash'},name:'equal frequency'}],'Distance from the identity line shows sampled allele-frequency divergence; marker size and color encode the same elementary per-locus FST summary.')],table:rows,limitations:'Synthetic unlinked biallelic loci only; no VCF/PLINK import, phasing, kinship, PCA correction, demography inference, recombination map, missingness, or selection scan.'};
  }

  function study(params) {
    const rMin=Math.max(0.001,number(params.r_min,.2)),rMax=Math.max(rMin,number(params.r_max,1.2)),kMin=Math.max(1,number(params.k_min,50)),kMax=Math.max(kMin,number(params.k_max,250)),grid=integer(params.grid,12,4,30),horizon=Math.max(.1,number(params.horizon,8)),x0=Math.max(.01,number(params.x0,5)); const rs=linspace(rMin,rMax,grid),ks=linspace(kMin,kMax,grid); const z=ks.map(function(k){return rs.map(function(r){return k/(1+(k/x0-1)*Math.exp(-r*horizon));});});const scenarios=[];ks.forEach(function(k,ki){rs.forEach(function(r,ri){scenarios.push({growth_rate:r,capacity:k,final_population:z[ki][ri],fraction_of_capacity:z[ki][ri]/k});});});scenarios.sort(function(a,b){return b.final_population-a.final_population;});
    const time=linspace(0,horizon,121), selected=[[rs[0],ks[0]],[rs[rs.length-1],ks[0]],[rs[0],ks[ks.length-1]],[rs[rs.length-1],ks[ks.length-1]]];
    return {module:'study',title:'Reproducible logistic scenario sweep',metrics:{scenarios:grid*grid,best_final_population:scenarios[0].final_population,best_growth_rate:scenarios[0].growth_rate,best_capacity:scenarios[0].capacity,horizon},plots:[
      plot('Logistic scenario sweep','growth rate r','carrying capacity K',[{x:rs,y:ks,z,type:'heatmap',colorscale:'Viridis',colorbar:{title:'x(T)'}}],'Closed-form logistic endpoint over a finite Cartesian parameter grid. Ranking is descriptive and does not represent optimization under uncertainty.',{yaxis:{title:'carrying capacity K'}}),
      plot('Selected scenario trajectories','time','population',selected.map(function(pair){const r=pair[0],k=pair[1];return{x:time,y:time.map(function(t){return k/(1+(k/x0-1)*Math.exp(-r*t));}),mode:'lines',name:'r='+r.toPrecision(3)+', K='+k.toPrecision(4)};}),'Four boundary scenarios are recomputed across time to show why endpoint rankings differ. They are not uncertainty bands or fitted trajectories.'),
      plot('Logistic response surface','growth rate r','carrying capacity K',[{x:rs,y:ks,z,type:'surface',colorscale:'Viridis',colorbar:{title:'x(T)'},contours:{z:{show:true,usecolormap:true,project:{z:true}}}}],'The 3D surface is another view of the same finite scenario matrix. Interpolation between grid points is visual only.',{scene:{xaxis:{title:'growth rate r'},yaxis:{title:'capacity K'},zaxis:{title:'final population'}},margin:{l:16,r:16,t:36,b:18}})
    ],table:scenarios.slice(0,12),limitations:'Closed-form one-state logistic model and finite grid only; no workflow scheduler, remote execution, data registry, or multi-model provenance graph.'};
  }

  const runners = { bayesian, design, standards, continuation, 'spatial-pde': spatialPde, sde, genomic, study };
  const presets = [
    {id:'beta-binomial-balanced',module:'bayesian',title:'Beta–Binomial balanced prior',family:'Bayesian inference & UQ',summary:'Conjugate updating, posterior density, grid credible interval, and posterior predictive success probability.',params:{alpha:2,beta:2,successes:22,trials:40}},
    {id:'beta-binomial-sparse',module:'bayesian',title:'Sparse-event Bayesian rate',family:'Bayesian inference & UQ',summary:'A low-count event-rate example with an explicit weak prior.',params:{alpha:1,beta:9,successes:3,trials:60}},
    {id:'beta-binomial-prior-conflict',module:'bayesian',title:'Prior–data conflict',family:'Bayesian inference & UQ',summary:'A concentrated low-rate prior confronted with a high observed success fraction.',params:{alpha:2,beta:18,successes:16,trials:24}},
    {id:'beta-binomial-rare-event',module:'bayesian',title:'Rare-event uncertainty',family:'Bayesian inference & UQ',summary:'Zero observed events with a weak regularizing prior and explicit posterior prediction.',params:{alpha:.5,beta:.5,successes:0,trials:25}},
    {id:'decay-design',module:'design',title:'Exponential-decay observation design',family:'Experiment design & identifiability',summary:'Local two-parameter Fisher information and D-optimal sampling times.',params:{amplitude:2,rate:.6,duration:8,points:25}},
    {id:'slow-decay-design',module:'design',title:'Slow-decay identifiability design',family:'Experiment design & identifiability',summary:'Shows how nominal kinetics alter locally informative observation times.',params:{amplitude:2,rate:.15,duration:20,points:31}},
    {id:'manifest-complete',module:'standards',title:'Reproducible study manifest',family:'Standards & reproducibility',summary:'A bounded schema checklist with a normalized manifest export.',params:{model_id:'fadns.study.001',seed:'20260719',units:'SI with declared exceptions',algorithm:'seeded bounded CMA-ES',provenance:'Synthetic teaching configuration derived from the Foko Lab example catalog.'}},
    {id:'pitchfork-branches',module:'continuation',title:'Supercritical pitchfork branches',family:'Continuation & bifurcation',summary:'Analytic branches and local stability over a finite parameter interval.',params:{normal_form:'pitchfork',mu_start:-2,mu_end:2,points:161}},
    {id:'saddle-node-branches',module:'continuation',title:'Saddle-node fold branches',family:'Continuation & bifurcation',summary:'Canonical fold branches with stable/unstable classification.',params:{normal_form:'saddle-node',mu_start:-1,mu_end:3,points:161}},
    {id:'heat-diffusion',module:'spatial-pde',title:'1D diffusion pulse',family:'Spatial PDE',summary:'CFL-guarded explicit finite differences with mass and profile diagnostics.',params:{diffusivity:.08,grid_points:61,steps:240,dt:.00008}},
    {id:'ou-ensemble',module:'sde',title:'Ornstein–Uhlenbeck ensemble',family:'Stochastic differential equations',summary:'Seeded Euler–Maruyama ensemble against the analytic mean.',params:{theta:1.2,mu:.5,sigma:.35,x0:-.5,horizon:5,steps:240,paths:180,seed:7249}},
    {id:'genomic-differentiation',module:'genomic',title:'Two-population differentiation',family:'Genomic population genetics',summary:'Synthetic diploid genotypes, allele frequencies, heterozygosity, and per-locus FST.',params:{individuals:120,loci:24,divergence:.16,seed:7250}},
    {id:'genomic-panmixia',module:'genomic',title:'Near-panmictic genomic control',family:'Genomic population genetics',summary:'A low-divergence control showing finite-sample per-locus variation.',params:{individuals:160,loci:30,divergence:0,seed:7251}},
    {id:'logistic-study-sweep',module:'study',title:'Logistic study matrix',family:'Study workflows',summary:'A reproducible two-parameter scenario matrix with ranked endpoints.',params:{r_min:.2,r_max:1.2,k_min:50,k_max:250,grid:12,horizon:8,x0:5}}
  ];

  function run(module, params) { assert(runners[module], 'Unknown advanced-methods module: ' + module); return runners[module](params || {}); }
  const api = { run, runners, presets, seededRandom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoAdvancedMethodsCore = api;
  root.FokoAdvancedMethodPresets = presets;
}(typeof window !== 'undefined' ? window : globalThis));
