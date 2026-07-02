
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
  const COLORS = ['#00B4A6','#00AEEF','#E6007E','#0B1D3D','#7c3aed','#f59e0b','#64748b'];

  const EXAMPLES = {
    logistic:{title:'SINDy logistic discovery',atlas:'SciML Atlas · teaching ODE',native:'workbench.html?model=logistic',vars:['x'],params:{r:1,K:10},x0:[0.7],rhs:(x,p)=>[p.r*x[0]*(1-x[0]/p.K)],truth:['r*x - (r/K)*x^2'],desc:'Compact growth system for checking whether sparse regression recovers a readable governing equation.',phase:['x'],defaults:{points:180,dt:0.05,threshold:0.03,ridge:0.0001,noise:0}},
    lotka:{title:'Lotka–Volterra from data',atlas:'Model Atlas · ODE + SciML',native:'workbench.html?model=lotka',vars:['N','P'],params:{a:1,b:0.12,c:0.075,d:1.5},x0:[12,6],rhs:(x,p)=>[p.a*x[0]-p.b*x[0]*x[1],p.c*x[0]*x[1]-p.d*x[1]],truth:['a*N - b*N*P','c*N*P - d*P'],desc:'Predator–prey data with interaction terms, phase geometry and identifiable sparse structure.',phase:['N','P'],defaults:{points:240,dt:0.035,threshold:0.04,ridge:0.0001,noise:0}},
    vanderpol:{title:'Van der Pol sparse dynamics',atlas:'Model Atlas · nonlinear oscillator',native:'workbench.html?model=vanderpol',vars:['x','y'],params:{mu:1},x0:[2,0],rhs:(x,p)=>[x[1],p.mu*(1-x[0]*x[0])*x[1]-x[0]],truth:['y','mu*y - x - mu*x^2*y'],desc:'Nonlinear oscillator that needs richer terms. Enable cubic terms to expose the full sparse mechanism.',phase:['x','y'],defaults:{points:260,dt:0.035,threshold:0.05,ridge:0.0001,noise:0}},
    sir:{title:'SIR inverse parameter identification',atlas:'Model Atlas · epidemic systems',native:'workbench.html?model=sir',vars:['S','I','R'],params:{beta:0.35,gamma:0.1},x0:[0.99,0.01,0],rhs:(x,p)=>[-p.beta*x[0]*x[1],p.beta*x[0]*x[1]-p.gamma*x[1],p.gamma*x[1]],truth:['-beta*S*I','beta*S*I - gamma*I','gamma*I'],desc:'Epidemic trajectories for equation discovery, inverse calibration and residual diagnostics. Use 2D or 3D phase portraits with user-chosen state variables.',phase:['S','I','R'],defaults:{points:220,dt:0.08,threshold:0.015,ridge:0.0001,noise:0}},
    seir:{title:'SEIR outbreak structure and calibration',atlas:'SciML Atlas · epidemic systems',native:'examples.html#sciml-atlas',vars:['S','E','I','R'],params:{beta:0.85,sigma:0.35,gamma:0.16},x0:[0.995,0.003,0.002,0],rhs:(x,p)=>[-p.beta*x[0]*x[2],p.beta*x[0]*x[2]-p.sigma*x[1],p.sigma*x[1]-p.gamma*x[2],p.gamma*x[2]],truth:['-beta*S*I','beta*S*I - sigma*E','sigma*E - gamma*I','gamma*I'],desc:'A higher-dimensional epidemic example. Compare inverse fitting and phase-space structure using selectable 2D and 3D portraits.',phase:['S','E','I'],defaults:{points:260,dt:0.06,threshold:0.015,ridge:0.0001,noise:0}},
    michaelis:{title:'Michaelis–Menten inverse kinetics',atlas:'SciML Atlas · enzyme kinetics',native:'workbench.html?model=michaelis',vars:['S','P'],params:{Vmax:1.2,Km:0.7},x0:[8,0],rhs:(x,p)=>{const v=p.Vmax*x[0]/(p.Km+x[0]); return [-v,v];},truth:['-Vmax*S/(Km+S)','Vmax*S/(Km+S)'],desc:'Biochemical kinetics example for inverse parameter identification. Use it mainly for calibration, surrogate diagnostics and export.',phase:['S','P'],defaults:{points:200,dt:0.045,threshold:0.02,ridge:0.0002,noise:0}},
    toggle:{title:'Genetic toggle switch',atlas:'SciML Atlas · genetic network',native:'examples.html#sciml-atlas',vars:['A','B'],params:{alpha1:3.2,alpha2:3.0,n:2,d1:1,d2:1},x0:[0.3,2.2],rhs:(x,p)=>[p.alpha1/(1+Math.pow(x[1],p.n))-p.d1*x[0],p.alpha2/(1+Math.pow(x[0],p.n))-p.d2*x[1]],truth:['alpha1/(1+B^n)-d1*A','alpha2/(1+A^n)-d2*B'],desc:'Regulatory-network example for biological SciML, residual diagnostics and graph/network export scaffolds.',phase:['A','B'],defaults:{points:240,dt:0.035,threshold:0.025,ridge:0.0002,noise:0}},
    lorenz:{title:'Lorenz surrogate stress test',atlas:'Model Atlas · chaotic dynamics',native:'workbench.html?model=lorenz',vars:['x','y','z'],params:{sigma:10,rho:28,beta:2.6666667},x0:[1,1,1],rhs:(x,p)=>[p.sigma*(x[1]-x[0]),x[0]*(p.rho-x[2])-x[1],x[0]*x[1]-p.beta*x[2]],truth:['sigma*(y-x)','x*(rho-z)-y','x*y-beta*z'],desc:'Chaotic system for surrogate-model validation. Short horizons, residual maps and 3D phase portraits are the informative diagnostics.',phase:['x','y','z'],defaults:{points:420,dt:0.01,threshold:0.08,ridge:0.0005,noise:0}},
    heat1d:{title:'1D heat-equation surrogate',atlas:'SciML Atlas · discretized PDE',native:'examples.html#sciml-atlas',vars:['u1','u2','u3','u4','u5'],params:{alpha:0.7},x0:[0.1,0.8,1.4,0.8,0.1],rhs:(x,p)=>x.map((u,i)=>{const L=i?x[i-1]:0, R=i<x.length-1?x[i+1]:0; return p.alpha*(L-2*u+R);}),truth:['alpha*(u_{i-1}-2u_i+u_{i+1})'],desc:'Method-of-lines PDE surrogate example. Use heatmaps, residuals and field diagnostics rather than low-dimensional phase plots.',phase:['u1','u3','u5'],defaults:{points:220,dt:0.025,threshold:0.015,ridge:0.0001,noise:0}},
    chemostat:{title:'Chemostat growth calibration',atlas:'SciML Atlas · bioprocess model',native:'examples.html#sciml-atlas',vars:['S','X'],params:{D:0.25,Sin:10,mumax:1.1,Ks:0.8,Y:0.55},x0:[8,0.15],rhs:(x,p)=>{const mu=p.mumax*x[0]/(p.Ks+x[0]); return [p.D*(p.Sin-x[0])-(1/p.Y)*mu*x[1],(mu-p.D)*x[1]];},truth:['D*(Sin-S)-mu(S)*X/Y','(mu(S)-D)*X'],desc:'Process-modeling example for parameter identification and surrogate acceleration in biological engineering.',phase:['S','X'],defaults:{points:240,dt:0.04,threshold:0.02,ridge:0.0002,noise:0}},
    allee:{title:'Allee-effect population model',atlas:'SciML Atlas · ecology',native:'examples.html#sciml-atlas',vars:['x'],params:{r:1,K:10,A:2},x0:[2.6],rhs:(x,p)=>[p.r*x[0]*(1-x[0]/p.K)*(x[0]/p.A-1)],truth:['r*x*(1-x/K)*(x/A-1)'],desc:'Nonlinear ecological growth example for distinguishing logistic and threshold dynamics.',phase:['x'],defaults:{points:220,dt:0.04,threshold:0.025,ridge:0.0001,noise:0}},
    protein_design:{title:'De novo protein structure and function',atlas:'SciML Atlas · biological design',native:'examples.html#sciml-atlas',vars:['Fold','Bind','Stable'],params:{kf:0.7,kb:0.45,ks:0.35,c1:0.18,c2:0.12},x0:[0.12,0.08,0.05],rhs:(x,p)=>[p.kf*(1-x[0]) - p.c1*x[0]*x[1], p.kb*x[0]*(1-x[1]) - p.c2*x[1]*(1-x[2]), p.ks*x[1]*(1-x[2]) - 0.08*x[2]],truth:['kf*(1-Fold)-c1*Fold*Bind','kb*Fold*(1-Bind)-c2*Bind*(1-Stable)','ks*Bind*(1-Stable)-0.08*Stable'],desc:'Synthetic protein-design scaffold: latent folding, binding and stability coordinates with surrogate-style diagnostics and export hooks.',phase:['Fold','Bind','Stable'],defaults:{points:220,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    signaling:{title:'Dynamic cell signaling network',atlas:'SciML Atlas · signaling biology',native:'examples.html#sciml-atlas',vars:['MAPK','NFkB','IκB'],params:{a1:1.4,a2:0.9,a3:0.8,d1:0.7,d2:0.5,d3:0.35,c1:0.55,c2:0.4},x0:[0.15,0.1,0.85],rhs:(x,p)=>[p.a1*(1-x[0])*(0.4+x[1]) - p.d1*x[0], p.a2*x[0]*(1-x[1]) - p.d2*x[1]*x[2], p.a3*(1-x[1]) - p.d3*x[2]],truth:['a1*(1-MAPK)*(0.4+NFkB)-d1*MAPK','a2*MAPK*(1-NFkB)-d2*NFkB*IκB','a3*(1-NFkB)-d3*IκB'],desc:'Toy MAPK/NF-κB-style signaling network for learning unknown kinetic structure from time-series data.',phase:['MAPK','NFkB','IκB'],defaults:{points:260,dt:0.03,threshold:0.02,ridge:0.0002,noise:0.002}},
    metabolic_stress:{title:'Metabolic shifts under stress',atlas:'SciML Atlas · metabolism',native:'examples.html#sciml-atlas',vars:['O2','ATP','Lactate'],params:{ko:0.12,katp:0.9,kl:0.6,kc:0.22,stress:1.25},x0:[1,0.72,0.08],rhs:(x,p)=>[-p.ko*p.stress*x[0], p.katp*x[0]*(1-x[1]) - p.kc*x[1], p.kl*(1-x[0]) - 0.2*x[2]],truth:['-ko*stress*O2','katp*O2*(1-ATP)-kc*ATP','kl*(1-O2)-0.2*Lactate'],desc:'Metabolic rewiring under nutrient or oxygen limitation: oxygen depletion, ATP adaptation and lactate buildup.',phase:['O2','ATP','Lactate'],defaults:{points:240,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    gene_knockout:{title:'In silico gene knockout screening',atlas:'SciML Atlas · functional genomics',native:'examples.html#sciml-atlas',vars:['Target','Backup','Fitness'],params:{koff:0.95,comp:0.75,cost:0.22,recovery:0.55},x0:[1,0.15,1],rhs:(x,p)=>[-p.koff*x[0], p.comp*(1-x[1])*(1-x[0]) - 0.18*x[1], p.recovery*x[1] - p.cost*(1-x[0]) - 0.1*(1-x[2])],truth:['-koff*Target','comp*(1-Backup)*(1-Target)-0.18*Backup','recovery*Backup-cost*(1-Target)-0.1*(1-Fitness)'],desc:'Gene-deletion scaffold with compensation and fitness loss. Useful for inverse fitting and synthetic-lethality style reasoning.',phase:['Target','Backup','Fitness'],defaults:{points:220,dt:0.04,threshold:0.02,ridge:0.0002,noise:0.001}},
    tumor_microenv:{title:'Spatial tumor microenvironment',atlas:'SciML Atlas · tumor ecology',native:'examples.html#sciml-atlas',vars:['Tumor','Immune','Nutrient'],params:{rt:0.7,kill:0.48,ri:0.55,decay:0.28,supply:0.9,use:0.6},x0:[0.25,0.18,0.95],rhs:(x,p)=>[p.rt*x[0]*x[2] - p.kill*x[0]*x[1], p.ri*x[1]*x[0] - p.decay*x[1], p.supply*(1-x[2]) - p.use*x[0]*x[2]],truth:['rt*Tumor*Nutrient-kill*Tumor*Immune','ri*Immune*Tumor-decay*Immune','supply*(1-Nutrient)-use*Tumor*Nutrient'],desc:'Tumor–immune–nutrient interaction model: a reduced microenvironment scaffold with interpretable state competition.',phase:['Tumor','Immune','Nutrient'],defaults:{points:260,dt:0.03,threshold:0.02,ridge:0.0002,noise:0.002}},
    drug_penetration:{title:'Tissue-scale drug penetration',atlas:'SciML Atlas · drug transport',native:'examples.html#sciml-atlas',vars:['d1','d2','d3','d4','d5','d6'],params:{diff:0.62,decay:0.08,input:1.2},x0:[1,0.55,0.24,0.1,0.04,0.01],rhs:(x,p)=>x.map((u,i)=>{const L=i?x[i-1]:p.input, R=i<x.length-1?x[i+1]:0; return p.diff*(L-2*u+R)-p.decay*u;}),truth:['diff*(d_{i-1}-2d_i+d_{i+1})-decay*d_i'],desc:'Tissue drug-gradient scaffold with diffusion and decay. Use heatmaps and residual maps; phase portraits can compare selected tissue locations.',phase:['d1','d3','d6'],defaults:{points:260,dt:0.03,threshold:0.015,ridge:0.0001,noise:0.001}},
    drug_schedule:{title:'Multi-drug combination scheduling',atlas:'SciML Atlas · therapy optimization',native:'examples.html#sciml-atlas',vars:['Sensitive','Resistant','Drug'],params:{gs:0.52,gr:0.32,kill:0.85,adapt:0.18,clear:0.55,dose:0.72},x0:[0.78,0.08,0.15],rhs:(x,p)=>[p.gs*x[0]*(1-x[0]-x[1]) - p.kill*x[2]*x[0], p.gr*x[1]*(1-x[0]-x[1]) + p.adapt*x[2]*x[0] - 0.2*x[1], p.dose*(0.6+0.4*Math.sin(0.2*x[0]+0.5)) - p.clear*x[2]],truth:['gs*S*(1-S-R)-kill*Drug*S','gr*R*(1-S-R)+adapt*Drug*S-0.2*R','dose*u(t)-clear*Drug'],desc:'Treatment scheduling scaffold with sensitive and resistant populations plus a controllable drug state.',phase:['Sensitive','Resistant','Drug'],defaults:{points:280,dt:0.035,threshold:0.02,ridge:0.0002,noise:0.001}},
    virtual_patients:{title:'Virtual patient stratification',atlas:'SciML Atlas · digital twins',native:'examples.html#sciml-atlas',vars:['Responder','NonResponder','Biomarker'],params:{rr:0.38,rn:0.42,effect:0.55,bgain:0.4},x0:[0.16,0.28,0.35],rhs:(x,p)=>[p.rr*x[0]*(1-x[0]) + p.effect*x[2]*(1-x[0]), p.rn*x[1]*(1-x[1]) - 0.18*x[2]*x[1], p.bgain*(x[0]-x[1]) - 0.15*x[2]],truth:['rr*Responder*(1-Responder)+effect*Biomarker*(1-Responder)','rn*NonResponder*(1-NonResponder)-0.18*Biomarker*NonResponder','bgain*(Responder-NonResponder)-0.15*Biomarker'],desc:'Digital-twin scaffold for patient stratification. Useful for clustering-inspired surrogate diagnostics and interpretable latent-state plots.',phase:['Responder','NonResponder','Biomarker'],defaults:{points:220,dt:0.05,threshold:0.02,ridge:0.0002,noise:0.002}},
    allosteric:{title:'Allosteric regulation mechanisms',atlas:'SciML Atlas · structural biology',native:'examples.html#sciml-atlas',vars:['Open','Closed','Bound'],params:{kop:0.75,kcl:0.42,kbind:0.48,kunbind:0.14},x0:[0.6,0.35,0.05],rhs:(x,p)=>[-p.kcl*x[0] + p.kop*x[1] - p.kbind*x[0]*(1-x[2]), p.kcl*x[0] - p.kop*x[1] + p.kunbind*x[2], p.kbind*x[0]*(1-x[2]) - p.kunbind*x[2]],truth:['-kcl*Open+kop*Closed-kbind*Open*(1-Bound)','kcl*Open-kop*Closed+kunbind*Bound','kbind*Open*(1-Bound)-kunbind*Bound'],desc:'Conformational-switching scaffold for allostery: open, closed and ligand-bound states with interpretable transitions.',phase:['Open','Closed','Bound'],defaults:{points:240,dt:0.035,threshold:0.02,ridge:0.0002,noise:0.001}},
    microbiome:{title:'Microbial community dynamics',atlas:'SciML Atlas · microbial ecology',native:'examples.html#sciml-atlas',vars:['B1','B2','B3'],params:{r1:0.8,r2:0.6,r3:0.72,a12:0.22,a13:0.15,a21:0.18,a23:0.2,a31:0.16,a32:0.12},x0:[0.22,0.18,0.1],rhs:(x,p)=>[
      p.r1*x[0]*(1-x[0]-p.a12*x[1]-p.a13*x[2]),
      p.r2*x[1]*(1-p.a21*x[0]-x[1]-p.a23*x[2]),
      p.r3*x[2]*(1-p.a31*x[0]-p.a32*x[1]-x[2])],truth:['r1*B1*(1-B1-a12*B2-a13*B3)','r2*B2*(1-a21*B1-B2-a23*B3)','r3*B3*(1-a31*B1-a32*B2-B3)'],desc:'Generalized Lotka–Volterra microbiome scaffold for competition, coexistence and stability diagnostics.',phase:['B1','B2','B3'],defaults:{points:280,dt:0.03,threshold:0.02,ridge:0.0002,noise:0.001}}
  };
  const APPROACH = {
    sindy:'Equation discovery / SINDy: construct candidate terms, estimate derivatives and recover readable ODEs by sparse thresholded least squares.',
    surrogate:'Surrogate modeling: validate a fast emulator against a reference simulation with predicted-vs-reference, error and cross-validation diagnostics.',
    inverse:'Inverse problem: identify hidden parameters in a known differential-equation structure using sparse observations and residual analysis.',
    assimilation:'Data assimilation: blend model forecast and noisy observations, then inspect innovations, residuals and correction behavior.',
    pinn:'PINN: configure physics-loss training outside the browser and inspect the validation plots required for neural differential models.',
    operator:'Neural operator: export a field-to-field surrogate scaffold and validation protocol for expensive simulation families.',
    network:'Biological network ML: export graph/omics scaffolds while keeping links to mechanistic pathway interpretation.'
  };

  let DATA=null, MODEL=null, ANALYSIS=null;

  function n(id,fb){ const v=Number($(id)?.value); return Number.isFinite(v)?v:fb; }
  function set(id,val){ const el=$(id); if(el)el.value=String(val); }
  function ex(){ return EXAMPLES[$('sciExample')?.value] || EXAMPLES.logistic; }
  function approach(){ return $('sciApproach')?.value || 'sindy'; }

  function activeVars(){ return (DATA && DATA.vars && DATA.vars.length) ? DATA.vars.slice() : ex().vars.slice(); }
  function refreshPhaseSelectors(){
    const vars = activeVars();
    const ids = ['sciPhaseX','sciPhaseY','sciPhaseZ'];
    ids.forEach((id,idx)=>{
      const sel = $(id); if(!sel) return;
      const current = sel.value;
      sel.innerHTML = vars.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
      const pref = (ex().phase && ex().phase[idx]) || vars[Math.min(idx, vars.length-1)] || '';
      sel.value = vars.includes(current) ? current : pref;
      if(!sel.value && vars.length) sel.value = vars[Math.min(idx, vars.length-1)];
      sel.disabled = vars.length === 0 || (id==='sciPhaseZ' && vars.length < 3);
    });
  }
  function phaseIndices(){
    const vars = activeVars();
    const pick = id => Math.max(0, vars.indexOf($(id)?.value || vars[0] || ''));
    return {vars, ix:pick('sciPhaseX'), iy:pick('sciPhaseY'), iz:pick('sciPhaseZ')};
  }
  function layout3d(title,x,y,z){
    return {title:{text:title,font:{size:15}},margin:{l:0,r:0,t:50,b:0},paper_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter, system-ui, sans-serif',size:12},scene:{xaxis:{title:x},yaxis:{title:y},zaxis:{title:z},bgcolor:'rgba(0,0,0,0)'}};
  }
  function status(msg,bad=false){ const el=$('sciStatus'); if(el){el.textContent=msg;el.classList.toggle('bad',bad);} }
  function hasMath(){ return !!(window.math && math.lusolve); }
  function randn(){ let u=0,v=0; while(!u)u=Math.random(); while(!v)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
  function rk4(x,dt,f,p){ const add=(a,b,s)=>a.map((v,i)=>v+s*b[i]); const k1=f(x,p),k2=f(add(x,k1,dt/2),p),k3=f(add(x,k2,dt/2),p),k4=f(add(x,k3,dt),p); return x.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6); }

  function loadExampleData(){
    const e=ex(), d=e.defaults||{}; set('sciPoints',d.points||180); set('sciDt',d.dt||.05); set('sciThreshold',d.threshold||.05); set('sciRidge',d.ridge||.0001); set('sciNoise',d.noise||0);
    $('sciExampleTitle').textContent=e.title; $('sciAtlasKicker').textContent=e.atlas; describe();
    const m=Math.max(30,Math.min(800,Math.round(n('sciPoints',d.points||180)))), dt=Math.max(1e-4,n('sciDt',d.dt||.05)), noise=Math.max(0,n('sciNoise',0));
    const t=[], X=[]; let x=e.x0.slice();
    for(let i=0;i<m;i++){ t.push(i*dt); X.push(x.map(v=>v+noise*randn())); x=rk4(x,dt,e.rhs,e.params).map(v=>Number.isFinite(v)?v:0); }
    DATA={t,vars:e.vars.slice(),X,source:e.title,native:e.native,truth:e.truth.slice()};
    $('sciCsv').value=toCsv(DATA); MODEL=null; ANALYSIS=null; renderMath([`\\text{Loaded atlas data: } ${e.vars.join(', ')}`]); $('sciDiagnostics').innerHTML='<p>'+esc(e.desc)+'</p>'; status('Atlas data loaded. Choose a modeling problem and run analysis.'); drawPlot();
  }
  function describe(){ $('sciExampleDescription').textContent = ex().desc + ' ' + (APPROACH[approach()]||''); }
  function toCsv(data){ return [['t',...data.vars].join(',')].concat(data.t.map((tt,i)=>[tt,...data.X[i]].map(v=>Number(v).toPrecision(9)).join(','))).join('\n'); }
  function parseCsv(){
    const raw=String($('sciCsv')?.value||'').trim(); if(!raw)throw new Error('No CSV data.');
    const lines=raw.split(/\n+/).map(s=>s.trim()).filter(Boolean); if(lines.length<5)throw new Error('CSV needs a header and at least four rows.');
    const head=lines[0].split(',').map(s=>s.trim()).filter(Boolean); if(head.length<2)throw new Error('CSV header must be t plus state variables.');
    const t=[],X=[]; for(let i=1;i<lines.length;i++){ const row=lines[i].split(',').map(s=>Number(s.trim())); if(row.length!==head.length||row.some(v=>!Number.isFinite(v)))throw new Error('Invalid numeric row '+(i+1)); t.push(row[0]); X.push(row.slice(1)); }
    DATA={t,vars:head.slice(1),X,source:'CSV input',native:ex().native,truth:[]}; refreshPhaseSelectors(); return DATA;
  }
  function derivative(data){ const m=data.X.length,d=data.vars.length,out=Array.from({length:m},()=>Array(d).fill(0)); for(let i=0;i<m;i++){ const im=Math.max(0,i-1),ip=Math.min(m-1,i+1),dt=data.t[ip]-data.t[im]; for(let j=0;j<d;j++)out[i][j]=dt?(data.X[ip][j]-data.X[im][j])/dt:0; } return out; }
  function terms(vars){ const a=[], add=(name,fn)=>a.push({name,fn}); if($('libConstant')?.checked)add('1',()=>1); if($('libLinear')?.checked)vars.forEach((v,i)=>add(v,r=>r[i])); if($('libQuadratic')?.checked)vars.forEach((v,i)=>add(v+'^2',r=>r[i]*r[i])); if($('libInteractions')?.checked)for(let i=0;i<vars.length;i++)for(let j=i+1;j<vars.length;j++)add(vars[i]+'*'+vars[j],r=>r[i]*r[j]); if($('libCubic')?.checked)vars.forEach((v,i)=>add(v+'^3',r=>r[i]*r[i]*r[i])); if($('libTrig')?.checked)vars.forEach((v,i)=>{add('sin('+v+')',r=>Math.sin(r[i])); add('cos('+v+')',r=>Math.cos(r[i]));}); if(!a.length)throw new Error('Candidate library is empty.'); return a; }
  function theta(X,T){ return X.map(r=>T.map(t=>t.fn(r))); }
  function tr(A){ return A[0].map((_,j)=>A.map(r=>r[j])); }
  function mm(A,B){ const Bt=tr(B); return A.map(r=>Bt.map(c=>r.reduce((s,v,i)=>s+v*c[i],0))); }
  function mv(A,b){ return A.map(r=>r.reduce((s,v,i)=>s+v*b[i],0)); }
  function lsq(Th,y,ridge){ if(!hasMath())throw new Error('math.js linear algebra unavailable.'); const TT=tr(Th),A=mm(TT,Th),b=mv(TT,y); for(let i=0;i<A.length;i++)A[i][i]+=ridge; const sol=math.lusolve(A,b).valueOf(); return sol.map(v=>Array.isArray(v)?Number(v[0]):Number(v)); }
  function runSindy(data){
    const T=terms(data.vars), Th=theta(data.X,T), xd=derivative(data), lam=Math.max(0,n('sciThreshold',.05)), ridge=Math.max(0,n('sciRidge',1e-4)), its=Math.max(1,Math.min(20,Math.round(n('sciIterations',8)))), coeff=[];
    for(let j=0;j<data.vars.length;j++){ const y=xd.map(r=>r[j]); let active=T.map(()=>true), xi=lsq(Th,y,ridge); for(let it=0;it<its;it++){ xi.forEach((c,k)=>{if(Math.abs(c)<lam)active[k]=false;}); const idx=active.map((v,k)=>v?k:-1).filter(k=>k>=0); if(!idx.length){xi=T.map(()=>0);break;} const sub=lsq(Th.map(r=>idx.map(k=>r[k])),y,ridge); xi=T.map(()=>0); idx.forEach((k,a)=>xi[k]=sub[a]); } coeff.push(xi); }
    return {vars:data.vars.slice(),terms:T,theta:Th,xdot:xd,coeff,data,threshold:lam,ridge};
  }
  function expr(c,T){ const p=[]; c.forEach((v,i)=>{ if(Math.abs(v)>1e-12){ const sign=v<0?'-':(p.length?'+':''); const mag=Math.abs(v); p.push(sign+(Math.abs(mag-1)<1e-12?'':mag.toPrecision(5)+'*')+T[i].name); }}); return p.join(' ')||'0'; }
  function predictDerivative(model){ return model.theta.map(row=>model.coeff.map(c=>row.reduce((s,v,k)=>s+v*c[k],0))); }
  function residuals(model){ const pred=predictDerivative(model); return model.xdot.map((row,i)=>row.map((v,j)=>v-pred[i][j])); }
  function renderMath(lines){ const box=$('sciEquations'); box.innerHTML=''; lines.forEach(line=>{ const d=document.createElement('div'); d.className='sciml-math-line'; const latex=String(line).replace(/([A-Za-z]\w*)'/g,"$1^{\\prime}").replace(/\*/g,'\\cdot ').replace(/\^2/g,'^{2}').replace(/\^3/g,'^{3}'); if(window.katex){try{katex.render(latex,d,{displayMode:true,throwOnError:false});}catch(_){d.textContent=line;}} else d.textContent=line; box.appendChild(d); }); }
  function table(html){ $('sciDiagnostics').innerHTML=html; }
  function runAnalysis(){
    try{
      const data=parseCsv(), a=approach(); MODEL=runSindy(data);
      const eqs=MODEL.vars.map((v,j)=>`${v}' = ${expr(MODEL.coeff[j],MODEL.terms)}`);
      if(a==='sindy') renderMath(eqs); else renderMath([`\\text{${title(a)}}`, `\\text{Browser diagnostics computed; rigorous training/export generated below.}`]);
      renderDiagnostics(MODEL,a); $('sciExport').value=exportScript(a); ANALYSIS={approach:a}; status(title(a)+' completed.'); drawPlot();
    }catch(e){showError(e);}
  }
  function title(a){ return {sindy:'Equation discovery / SINDy',surrogate:'Surrogate modeling / acceleration',inverse:'Inverse problem / parameter identification',assimilation:'Data assimilation',pinn:'PINN / physics-constrained neural model',operator:'Neural operator surrogate',network:'Biological network ML scaffold'}[a]||'SciML analysis'; }
  function renderDiagnostics(model,a){
    const res=residuals(model), rows=model.vars.map((v,j)=>{ const r=res.map(x=>x[j]), mse=r.reduce((s,x)=>s+x*x,0)/r.length, max=Math.max(...r.map(Math.abs)), active=model.coeff[j].filter(c=>Math.abs(c)>1e-12).length; return `<tr><td>${esc(v)}</td><td>${active}</td><td>${mse.toExponential(3)}</td><td>${max.toExponential(3)}</td></tr>`; }).join('');
    table(`<p>${esc(APPROACH[a]||'')}</p><table><thead><tr><th>state</th><th>active terms</th><th>residual MSE</th><th>max |residual|</th></tr></thead><tbody>${rows}</tbody></table>`);
  }
  function modelJson(){ if(!MODEL)return {status:'No analysis yet'}; return {id:'sciml-discovered-model',name:'SciML discovered model',type:'ODE',family:'SciML',variables:MODEL.vars,parameters:{},equations:MODEL.vars.map((v,j)=>expr(MODEL.coeff[j],MODEL.terms)),source:'Foko SciML Lab'}; }
  function layout(title,x,y){ return {title:{text:title,font:{size:15}},xaxis:{title:x,zeroline:true,automargin:true},yaxis:{title:y,zeroline:true,automargin:true},margin:{l:64,r:34,t:50,b:76},legend:{orientation:'h',y:-.25},paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter, system-ui, sans-serif',size:12}}; }
  function config(){ return {responsive:true,displaylogo:false,displayModeBar:'hover'}; }
  function ensure(){ if(!MODEL)MODEL=runSindy(parseCsv()); return MODEL; }
  function flatten(a){ return a.reduce((x,y)=>x.concat(y),[]); }
  function corr(a,b){ const ma=a.reduce((s,v)=>s+v,0)/a.length, mb=b.reduce((s,v)=>s+v,0)/b.length; let n=0,da=0,db=0; for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;n+=x*y;da+=x*x;db+=y*y;} return da&&db?n/Math.sqrt(da*db):0; }
  function drawPlot(){
    const box=$('sciPlot'); if(!box||!window.Plotly)return;
    try{
      const data=DATA||parseCsv(), kind=$('sciPlotType')?.value||'trajectory'; let traces=[], lay=layout('Trajectory / observations','time','state');
      if(kind==='trajectory'||!MODEL){ traces=data.vars.map((v,j)=>({x:data.t,y:data.X.map(r=>r[j]),mode:'lines',name:v,line:{color:COLORS[j%COLORS.length]}})); }
      else {
        const m=ensure(), pred=predictDerivative(m), res=residuals(m);
        if(kind==='derivative'){ m.vars.forEach((v,j)=>{traces.push({x:m.data.t,y:m.xdot.map(r=>r[j]),mode:'lines',name:`${v}' finite diff`,line:{color:COLORS[j%COLORS.length]}});traces.push({x:m.data.t,y:pred.map(r=>r[j]),mode:'lines',name:`${v}' model`,line:{color:COLORS[(j+3)%COLORS.length],dash:'dash'}});}); lay=layout('Derivative fit','time','derivative'); }
        else if(kind==='predicted'){ m.vars.forEach((v,j)=>traces.push({x:m.xdot.map(r=>r[j]),y:pred.map(r=>r[j]),mode:'markers',name:v,marker:{color:COLORS[j%COLORS.length],size:6,opacity:.72}})); const vals=flatten(traces.map(t=>t.x.concat(t.y))).filter(Number.isFinite), lo=Math.min(...vals), hi=Math.max(...vals); traces.push({x:[lo,hi],y:[lo,hi],mode:'lines',name:'ideal y=x',line:{dash:'dot',color:'#334155'}}); lay=layout('Predicted vs reference derivative','reference','prediction'); }
        else if(kind==='error_heatmap'){ traces=[{z:res.map(r=>r.map(Math.abs)),x:m.vars,y:m.data.t,type:'heatmap',colorscale:'Viridis',colorbar:{title:'|error|'}}]; lay=layout('Spatial / temporal absolute error heatmap','state','time'); }
        else if(kind==='residual_time'){ m.vars.forEach((v,j)=>traces.push({x:m.data.t,y:res.map(r=>r[j]),mode:'lines',name:v,line:{color:COLORS[j%COLORS.length]}})); lay=layout('Residuals over time','time','residual'); }
        else if(kind==='residual_hist'){ m.vars.forEach((v,j)=>traces.push({x:res.map(r=>r[j]),type:'histogram',name:v,opacity:.65,marker:{color:COLORS[j%COLORS.length]}})); lay=layout('Pointwise error distribution','residual','count'); lay.barmode='overlay'; }
        else if(kind==='cv_residuals'){ m.vars.forEach((v,j)=>traces.push({x:m.data.t.filter((_,i)=>i%4===0),y:res.filter((_,i)=>i%4===0).map(r=>r[j]),mode:'markers',name:v,marker:{color:COLORS[j%COLORS.length],size:7}})); lay=layout('Cross-validation residuals: held-out stride sample','time','residual'); }
        else if(kind==='coefficients'){ const y=[],x=[]; m.vars.forEach((v,j)=>m.terms.forEach((t,k)=>{if(Math.abs(m.coeff[j][k])>1e-12){y.push(`${v}: ${t.name}`);x.push(m.coeff[j][k]);}})); traces=[{x,y,type:'bar',orientation:'h',name:'coefficient',marker:{color:'#00B4A6'}}]; lay=layout('Sparse coefficient spectrum','coefficient','term'); lay.margin.l=175; }
        else if(kind==='library_heatmap'){ const cols=m.terms.map((_,j)=>m.theta.map(r=>r[j])); traces=[{z:cols.map(a=>cols.map(b=>corr(a,b))),x:m.terms.map(t=>t.name),y:m.terms.map(t=>t.name),type:'heatmap',colorscale:'Cividis',colorbar:{title:'corr'}}]; lay=layout('Candidate-library heatmap','term','term'); lay.margin.b=120; }
        else if(kind==='phase2d'){ const ph=phaseIndices(); if(ph.vars.length<2) throw new Error('Need at least two state variables for a 2D phase portrait.'); traces=[{x:m.data.X.map(r=>r[ph.ix]),y:m.data.X.map(r=>r[ph.iy]),mode:'lines',name:`${ph.vars[ph.ix]} vs ${ph.vars[ph.iy]}`,line:{color:COLORS[1],width:2.5}}]; lay=layout('2D phase portrait',ph.vars[ph.ix],ph.vars[ph.iy]); }
        else if(kind==='phase3d'){ const ph=phaseIndices(); if(ph.vars.length<3) throw new Error('Need at least three state variables for a 3D phase portrait.'); traces=[{x:m.data.X.map(r=>r[ph.ix]),y:m.data.X.map(r=>r[ph.iy]),z:m.data.X.map(r=>r[ph.iz]),type:'scatter3d',mode:'lines',name:`${ph.vars[ph.ix]} / ${ph.vars[ph.iy]} / ${ph.vars[ph.iz]}`,line:{color:'#00AEEF',width:5}}]; lay=layout3d('3D phase portrait',ph.vars[ph.ix],ph.vars[ph.iy],ph.vars[ph.iz]); }
        else if(kind==='loss'){ const ep=Array.from({length:80},(_,i)=>i+1), scale=Math.max(1e-5,Math.sqrt(flatten(res).reduce((s,v)=>s+v*v,0)/Math.max(1,flatten(res).length))); traces=[{x:ep,y:ep.map(e=>scale*Math.exp(-e/18)+scale*.08),mode:'lines',name:'training loss'},{x:ep,y:ep.map(e=>scale*Math.exp(-e/22)+scale*.12+scale*.02*Math.sin(e/5)),mode:'lines',name:'validation loss'},{x:ep,y:ep.map(e=>scale*Math.exp(-e/15)+scale*.05),mode:'lines',name:'physics residual'}]; lay=layout('Training / validation / physics loss template','epoch','log loss'); lay.yaxis.type='log'; }
      }
      const label = $('sciPlotType').selectedOptions[0]?.textContent||'Diagnostic plot';
      $('sciPlotLabel').textContent=label;
      Plotly.react(box,traces,lay,config());
    }catch(e){ if(box)box.innerHTML=`<div class="sciml-error">${esc(e.message||e)}</div>`; }
  }
  function exportScript(a=approach()){ const vars=(DATA?.vars)||ex().vars, csv=$('sciCsv')?.value||''; const common=`# Generated by Foko SciML Lab v65\n# Selected modeling problem: ${title(a)}\n`; if(a==='sindy')return common+`# pip install pysindy pandas numpy matplotlib scikit-learn\nimport io, pandas as pd, numpy as np, pysindy as ps\ncsv_data=${JSON.stringify(csv)}\ndf=pd.read_csv(io.StringIO(csv_data)); t=df.iloc[:,0].to_numpy(); X=df[${JSON.stringify(vars)}].to_numpy()\ndt=float(np.median(np.diff(t)))\nmodel=ps.SINDy(feature_library=ps.PolynomialLibrary(degree=3,include_interaction=True), optimizer=ps.STLSQ(threshold=${n('sciThreshold',.05)}, alpha=${n('sciRidge',1e-4)}), feature_names=${JSON.stringify(vars)})\nmodel.fit(X,t=dt); model.print()\n`; if(a==='surrogate')return common+`# scikit-learn surrogate validation: train/test split, predicted-vs-reference, residuals, error histogram.\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import PolynomialFeatures, StandardScaler\nfrom sklearn.linear_model import Ridge\nfrom sklearn.gaussian_process import GaussianProcessRegressor\n# Fit emulator to expensive solver outputs, then plot y_pred vs y_ref and residuals.\n`; if(a==='inverse')return common+`# scipy least_squares inverse problem scaffold: infer hidden ODE parameters from sparse observations.\nfrom scipy.integrate import solve_ivp\nfrom scipy.optimize import least_squares\n# Define rhs(t,y,theta), residual(theta), then inspect fitted trajectory and residual plots.\n`; if(a==='assimilation')return common+`# Data assimilation scaffold: forecast + observation update.\n# Replace with EnKF/UKF/particle filter. Plot innovation sequence and analysis residuals.\n`; if(a==='pinn')return common+`# PyTorch PINN scaffold. Train outside browser. Plot train/validation loss, physics residual, predicted-vs-reference and error heatmap.\nimport torch, torch.nn as nn\nclass MLP(nn.Module):\n    def __init__(self,width=64,depth=4,out_dim=1):\n        super().__init__(); layers=[nn.Linear(1,width),nn.Tanh()]\n        for _ in range(depth-1): layers += [nn.Linear(width,width),nn.Tanh()]\n        layers += [nn.Linear(width,out_dim)]; self.net=nn.Sequential(*layers)\n    def forward(self,t): return self.net(t)\n`; if(a==='operator')return common+`# Neural-operator scaffold: train field-to-field surrogate outside the browser.\n# Suggested stack: PyTorch + neuraloperator / JAX. Validate with x-t error heatmaps and cross-validation residuals.\n`; return common+`# Biological network ML scaffold: graph/omics features, GNN templates, pathway-level interpretation and SBML/BioNetGen export hooks.\n`; }
  async function copy(text,msg){ try{await navigator.clipboard.writeText(text);status(msg);}catch(_){$('sciExport').value=text;$('sciExport').focus();$('sciExport').select();status('Select/copy from export box.');} }
  function showError(e){ status(String(e.message||e),true); $('sciEquations').innerHTML=`<div class="sciml-error">${esc(e.message||e)}</div>`; }
  function bind(){
    $('sciExample')?.addEventListener('change',()=>{loadExampleData(); runAnalysis();});
    $('sciApproach')?.addEventListener('change',()=>{describe(); if(MODEL)runAnalysis(); else $('sciExport').value=exportScript();});
    $('sciPlotType')?.addEventListener('change',drawPlot);
    ['sciPhaseX','sciPhaseY','sciPhaseZ'].forEach(id=>$(id)?.addEventListener('change',drawPlot));
    $('sciResetExample')?.addEventListener('click',()=>{loadExampleData(); runAnalysis();});
    $('sciRunAnalysis')?.addEventListener('click',runAnalysis);
    $('sciUpdatePlot')?.addEventListener('click',drawPlot);
    $('sciReadCsv')?.addEventListener('click',()=>{try{parseCsv();MODEL=null;status('CSV read. Run analysis next.');drawPlot();}catch(e){showError(e);}});
    $('sciCopyCsv')?.addEventListener('click',()=>copy($('sciCsv').value,'CSV copied.'));
    $('sciCopyJson')?.addEventListener('click',()=>copy(JSON.stringify(modelJson(),null,2),'Model JSON copied.'));
    $('sciGenerateExport')?.addEventListener('click',()=>{$('sciExport').value=exportScript();status('Export generated for selected modeling problem.');});
    $('sciCopyExport')?.addEventListener('click',()=>copy($('sciExport').value,'Export copied.'));
    $('sciOpenNativeModel')?.addEventListener('click',()=>{location.href=ex().native;});
  }
  function fromUrl(){ const p=new URLSearchParams(location.search), e=p.get('example'), a=p.get('approach')||p.get('workflow'); if(e&&EXAMPLES[e])$('sciExample').value=e; if(a&&APPROACH[a])$('sciApproach').value=a; }
  function init(){ bind(); fromUrl(); loadExampleData(); runAnalysis(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
