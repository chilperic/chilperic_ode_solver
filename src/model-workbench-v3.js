/* Foko Lab v3 model workbench release candidate 3
 * Model-centered ODE + stochastic + steady-state + optimization workspace.
 * Adds LaTeX display, contour/heatmap scans, sensitivity heatmaps,
 * stochastic analysis cards following the same logic as ODE,
 * optimization problem cards, and card-aware exports.
 */
(function(){
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fmt = (v, n=4) => Number.isFinite(v) ? Number(v).toPrecision(n) : String(v);
  const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
  const uid = () => Math.random().toString(36).slice(2,8);
  const safe = (s) => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function makeRng(seed){
    let s = (Number(seed) || 1) >>> 0;
    return function(){ s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; };
  }

  const ODE_MODELS = {
    sir: {
      id:'sir', name:'SIR epidemic', type:'ODE', family:'epidemiology',
      summary:'Deterministic susceptible-infected-recovered dynamics with mass-action transmission.',
      variables:['S','I','R'], primary:'I',
      params:{ beta:{value:0.42,min:0.05,max:1.1,step:0.01,label:'β transmission'}, gamma:{value:0.10,min:0.03,max:0.45,step:0.01,label:'γ recovery'}, N:{value:1000,min:200,max:3000,step:50,label:'population'} },
      initials:{S:990,I:10,R:0}, tStart:0, tEnd:160, steps:900,
      latex:[String.raw`\frac{dS}{dt}=-\beta\frac{SI}{N}`,String.raw`\frac{dI}{dt}=\beta\frac{SI}{N}-\gamma I`,String.raw`\frac{dR}{dt}=\gamma I`],
      equations:['dS/dt = -β S I / N','dI/dt = β S I / N - γ I','dR/dt = γ I'],
      rhs:(x,p)=>({S:-p.beta*x.S*x.I/p.N, I:p.beta*x.S*x.I/p.N-p.gamma*x.I, R:p.gamma*x.I})
    },
    lotka: {
      id:'lotka', name:'Lotka–Volterra predator-prey', type:'ODE', family:'ecology',
      summary:'Predator-prey oscillator with prey growth, predation, conversion and predator mortality.',
      variables:['prey','predator'], primary:'prey',
      params:{ alpha:{value:1.1,min:0.2,max:2.0,step:0.05,label:'prey growth'}, beta:{value:0.4,min:0.05,max:1.0,step:0.02,label:'predation'}, delta:{value:0.1,min:0.02,max:0.4,step:0.01,label:'conversion'}, gamma:{value:0.4,min:0.05,max:1.0,step:0.02,label:'predator death'} },
      initials:{prey:10,predator:5}, tStart:0, tEnd:40, steps:800,
      latex:[String.raw`\frac{dx}{dt}=\alpha x-\beta xy`,String.raw`\frac{dy}{dt}=\delta xy-\gamma y`],
      equations:['dx/dt = αx - βxy','dy/dt = δxy - γy'],
      rhs:(x,p)=>({prey:p.alpha*x.prey-p.beta*x.prey*x.predator, predator:p.delta*x.prey*x.predator-p.gamma*x.predator})
    },
    lorenz: {
      id:'lorenz', name:'Lorenz attractor', type:'ODE', family:'chaos',
      summary:'Three-dimensional nonlinear system with sensitive dependence on initial conditions.',
      variables:['x','y','z'], primary:'x',
      params:{ sigma:{value:10,min:2,max:20,step:0.1,label:'σ'}, rho:{value:28,min:5,max:50,step:0.5,label:'ρ'}, beta:{value:2.6667,min:0.8,max:5,step:0.05,label:'β'} },
      initials:{x:1,y:1,z:1}, tStart:0, tEnd:35, steps:3500,
      latex:[String.raw`\dot{x}=\sigma(y-x)`,String.raw`\dot{y}=x(\rho-z)-y`,String.raw`\dot{z}=xy-\beta z`],
      equations:['dx/dt = σ(y-x)','dy/dt = x(ρ-z)-y','dz/dt = xy-βz'],
      rhs:(x,p)=>({x:p.sigma*(x.y-x.x), y:x.x*(p.rho-x.z)-x.y, z:x.x*x.y-p.beta*x.z})
    },
    michaelis: {
      id:'michaelis', name:'Michaelis–Menten conversion', type:'ODE', family:'enzyme kinetics',
      summary:'Substrate-to-product conversion under saturating enzyme kinetics.',
      variables:['S','P'], primary:'S',
      params:{ vmax:{value:1.2,min:0.1,max:3,step:0.05,label:'Vmax'}, km:{value:2.0,min:0.2,max:8,step:0.1,label:'Km'} },
      initials:{S:12,P:0}, tStart:0, tEnd:30, steps:600,
      latex:[String.raw`\frac{dS}{dt}=-\frac{V_{max}S}{K_m+S}`,String.raw`\frac{dP}{dt}=\frac{V_{max}S}{K_m+S}`],
      equations:['dS/dt = -Vmax S / (Km + S)','dP/dt = Vmax S / (Km + S)'],
      rhs:(x,p)=>{ const v=p.vmax*Math.max(x.S,0)/(p.km+Math.max(x.S,0)+1e-12); return {S:-v,P:v}; }
    },
    vanderpol: {
      id:'vanderpol', name:'Van der Pol oscillator', type:'ODE', family:'oscillation',
      summary:'Nonlinear relaxation oscillator controlled by the stiffness parameter μ.',
      variables:['x','y'], primary:'x',
      params:{ mu:{value:2,min:0.1,max:8,step:0.1,label:'μ nonlinearity'} },
      initials:{x:2,y:0}, tStart:0, tEnd:35, steps:1400,
      latex:[String.raw`\dot{x}=y`,String.raw`\dot{y}=\mu(1-x^2)y-x`],
      equations:['dx/dt = y','dy/dt = μ(1-x²)y - x'],
      rhs:(x,p)=>({x:x.y, y:p.mu*(1-x.x*x.x)*x.y-x.x})
    },
    toggle: {
      id:'toggle', name:'Genetic toggle switch', type:'ODE', family:'gene regulation',
      summary:'Mutual repression model with switch-like expression states.',
      variables:['A','B'], primary:'A',
      params:{ a1:{value:5,min:0.5,max:10,step:0.1,label:'A production'}, a2:{value:5,min:0.5,max:10,step:0.1,label:'B production'}, n:{value:2,min:1,max:5,step:0.1,label:'Hill n'}, d:{value:1,min:0.1,max:3,step:0.05,label:'degradation'} },
      initials:{A:0.5,B:3}, tStart:0, tEnd:25, steps:800,
      latex:[String.raw`\dot{A}=\frac{a_1}{1+B^n}-dA`,String.raw`\dot{B}=\frac{a_2}{1+A^n}-dB`],
      equations:['dA/dt = a₁/(1+Bⁿ) - dA','dB/dt = a₂/(1+Aⁿ) - dB'],
      rhs:(x,p)=>({A:p.a1/(1+Math.pow(Math.max(x.B,0),p.n))-p.d*x.A, B:p.a2/(1+Math.pow(Math.max(x.A,0),p.n))-p.d*x.B})
    },
    brusselator: {
      id:'brusselator', name:'Brusselator chemical oscillator', type:'ODE', family:'chemical kinetics',
      summary:'Autocatalytic two-variable chemical oscillator benchmark.',
      variables:['X','Y'], primary:'X',
      params:{ A:{value:1,min:0.2,max:3,step:0.05,label:'feed A'}, B:{value:3,min:0.5,max:6,step:0.05,label:'feed B'} },
      initials:{X:1.5,Y:3}, tStart:0, tEnd:40, steps:1200,
      latex:[String.raw`\dot{X}=A+X^2Y-(B+1)X`,String.raw`\dot{Y}=BX-X^2Y`],
      equations:['dX/dt = A + X²Y - (B+1)X','dY/dt = BX - X²Y'],
      rhs:(x,p)=>({X:p.A+x.X*x.X*x.Y-(p.B+1)*x.X, Y:p.B*x.X-x.X*x.X*x.Y})
    }
    ,
    seir: {
      id:'seir', name:'SEIR epidemic', type:'ODE', family:'epidemiology',
      summary:'Four-compartment epidemic model with an exposed/incubation state before infectiousness.',
      variables:['S','E','I','R'], primary:'I',
      params:{ beta:{value:0.42,min:0.05,max:1.2,step:0.01,label:'β transmission'}, sigma:{value:0.20,min:0.04,max:0.8,step:0.01,label:'σ incubation exit'}, gamma:{value:0.10,min:0.03,max:0.45,step:0.01,label:'γ recovery'}, N:{value:1000,min:200,max:3000,step:50,label:'population'} },
      initials:{S:990,E:0,I:10,R:0}, tStart:0, tEnd:160, steps:900,
      latex:[String.raw`\frac{dS}{dt}=-\beta\frac{SI}{N}`,String.raw`\frac{dE}{dt}=\beta\frac{SI}{N}-\sigma E`,String.raw`\frac{dI}{dt}=\sigma E-\gamma I`,String.raw`\frac{dR}{dt}=\gamma I`],
      equations:['dS/dt = -β S I / N','dE/dt = β S I / N - σE','dI/dt = σE - γI','dR/dt = γI'],
      rhs:(x,p)=>({S:-p.beta*x.S*x.I/p.N, E:p.beta*x.S*x.I/p.N-p.sigma*x.E, I:p.sigma*x.E-p.gamma*x.I, R:p.gamma*x.I})
    },
    robertson: {
      id:'robertson', name:'Robertson chemistry', type:'ODE', family:'stiff chemical kinetics',
      summary:'Canonical stiff reaction benchmark. Browser integration is exploratory; export Python/Radau for high-confidence stiff runs.',
      variables:['A','B','C'], primary:'B',
      params:{ k1:{value:0.04,min:0.005,max:0.2,step:0.005,label:'slow conversion'}, k2:{value:10000,min:1000,max:50000,step:500,label:'fast autocatalysis'}, k3:{value:30000000,min:1000000,max:50000000,step:1000000,label:'fast coupling'} },
      initials:{A:1,B:0,C:0}, tStart:0, tEnd:1, steps:1200,
      latex:[String.raw`\dot{A}=-k_1A+k_3BC`,String.raw`\dot{B}=k_1A-k_2B^2-k_3BC`,String.raw`\dot{C}=k_2B^2`],
      equations:['dA/dt = -k1 A + k3 B C','dB/dt = k1 A - k2 B² - k3 B C','dC/dt = k2 B²'],
      rhs:(x,p)=>({A:-p.k1*x.A+p.k3*x.B*x.C, B:p.k1*x.A-p.k2*x.B*x.B-p.k3*x.B*x.C, C:p.k2*x.B*x.B})
    },
    'fa-metabolism': {
      id:'fa-metabolism', name:'Fatty-acid metabolism bistability', type:'ODE', family:'PhD metabolism model',
      summary:'Coarse-grained hepatic lipid synthesis model with Michaelis-Menten fluxes and inhibitory feedback. Complex Atlas model now opens in the workbench.',
      variables:['S1','S2','S3','S4'], primary:'S3',
      params:{ k1:{value:0.55,min:0.1,max:1.2,step:0.01,label:'input S1'}, k2:{value:0.25,min:0.02,max:0.8,step:0.01,label:'input S3'}, k3:{value:0.18,min:0.01,max:0.7,step:0.01,label:'input S4'}, alpha:{value:0.2,min:0.03,max:0.6,step:0.01,label:'S1 loss'}, beta:{value:0.18,min:0.03,max:0.6,step:0.01,label:'S3 loss'}, gamma:{value:0.14,min:0.02,max:0.5,step:0.01,label:'S4 loss'}, V1:{value:1.2,min:0.2,max:3,step:0.05,label:'flux 1'}, Km1:{value:0.6,min:0.1,max:2,step:0.05,label:'Km1'}, q1:{value:1.1,min:0.1,max:4,step:0.05,label:'feedback q1'}, V2:{value:0.9,min:0.1,max:3,step:0.05,label:'flux 2'}, Km2:{value:0.45,min:0.05,max:2,step:0.05,label:'Km2'}, V3:{value:0.7,min:0.1,max:3,step:0.05,label:'flux 3'}, Km3:{value:0.5,min:0.05,max:2,step:0.05,label:'Km3'}, V4:{value:0.8,min:0.1,max:3,step:0.05,label:'flux 4'}, Km4:{value:0.55,min:0.05,max:2,step:0.05,label:'Km4'}, q4:{value:1.0,min:0.1,max:4,step:0.05,label:'feedback q4'}, V5:{value:0.55,min:0.05,max:2,step:0.05,label:'flux 5'}, Km5:{value:0.5,min:0.05,max:2,step:0.05,label:'Km5'} },
      initials:{S1:1.2,S2:0.55,S3:1.0,S4:0.8}, tStart:0, tEnd:80, steps:1200,
      latex:[String.raw`\dot{S}_1=k_1-v_1+v_4-\alpha S_1`,String.raw`\dot{S}_2=v_1-v_2`,String.raw`\dot{S}_3=k_2+v_2-v_3-v_4+v_5-\beta S_3`,String.raw`\dot{S}_4=k_3+v_3-v_5-\gamma S_4`],
      equations:['four-pool Michaelis-Menten feedback model'],
      rhs:(x,p)=>{ const v1=p.V1*x.S1/((p.Km1+x.S1)*(1+p.q1*x.S3)); const v2=p.V2*x.S2/(p.Km2+x.S2); const v3=p.V3*x.S3/(p.Km3+x.S3); const v4=p.V4*x.S3/((p.Km4+x.S3)*(1+p.q4*x.S2)); const v5=p.V5*x.S4/(p.Km5+x.S4); return {S1:p.k1-v1+v4-p.alpha*x.S1, S2:v1-v2, S3:p.k2+v2-v3-v4+v5-p.beta*x.S3, S4:p.k3+v3-v5-p.gamma*x.S4}; }
    },
    'fadns-coa': {
      id:'fadns-coa', name:'FADNS with CoA sequestration', type:'ODE', family:'PhD semi-mechanistic metabolism',
      summary:'Refined fatty-acid de novo synthesis model with CoA sequestration, FAS-bound elongation states, and C14/C16/C18 product channels.',
      variables:['AcetCoA','MalCoA','NADPH','CoA','E','ECoA','EC2','EC4','EC6','EC8','EC10','EC12','EC14','EC16','EC18','C14','C16','C18'], primary:'C16',
      params:{ kon:{value:0.018,min:0.002,max:0.08,step:0.001,label:'Acetyl loading'}, koff:{value:0.008,min:0,max:0.06,step:0.001,label:'unloading'}, kappa:{value:0.00002,min:0.000002,max:0.00008,step:0.000001,label:'elongation'}, delta14:{value:0.010,min:0.001,max:0.05,step:0.001,label:'C14 release'}, delta16:{value:0.026,min:0.002,max:0.09,step:0.001,label:'C16 release'}, delta18:{value:0.012,min:0.001,max:0.06,step:0.001,label:'C18 release'}, kinhib:{value:0.008,min:0.001,max:0.04,step:0.001,label:'CoA inhibition'}, krelease:{value:0.001,min:0,max:0.015,step:0.0005,label:'CoA release'} },
      initials:{AcetCoA:120,MalCoA:18,NADPH:160,CoA:0.01,E:1,ECoA:0,EC2:0,EC4:0,EC6:0,EC8:0,EC10:0,EC12:0,EC14:0,EC16:0,EC18:0,C14:0,C16:0,C18:0}, tStart:0, tEnd:120, steps:650,
      latex:[String.raw`E+AcetCoA \rightleftharpoons EC_2`,String.raw`EC_{2n}+MalCoA+NADPH \rightarrow EC_{2n+2}`,String.raw`E+CoA \rightleftharpoons ECoA`,String.raw`EC_{14},EC_{16},EC_{18}\rightarrow C14,C16,C18`],
      equations:['semi-mechanistic FADNS chain with CoA sequestration'],
      rhs:(x,p)=>{ const chain=['EC2','EC4','EC6','EC8','EC10','EC12','EC14','EC16']; const elong={}; chain.forEach(c=>{ elong[c]=p.kappa*x[c]*x.MalCoA*x.NADPH; }); const totalElong=Object.values(elong).reduce((a,b)=>a+b,0); const load=p.kon*x.E*x.AcetCoA, unload=p.koff*x.EC2, inhib=p.kinhib*x.E*x.CoA, rel=p.krelease*x.ECoA; const r={}; r.AcetCoA=-load+unload; r.MalCoA=-totalElong; r.NADPH=-2*totalElong; r.CoA=totalElong+p.delta14*x.EC14+p.delta16*x.EC16+p.delta18*x.EC18-inhib+rel; r.E=-load+unload+p.delta14*x.EC14+p.delta16*x.EC16+p.delta18*x.EC18-inhib+rel; r.ECoA=inhib-rel; r.EC2=load-unload-elong.EC2; r.EC4=elong.EC2-elong.EC4; r.EC6=elong.EC4-elong.EC6; r.EC8=elong.EC6-elong.EC8; r.EC10=elong.EC8-elong.EC10; r.EC12=elong.EC10-elong.EC12; r.EC14=elong.EC12-elong.EC14-p.delta14*x.EC14; r.EC16=elong.EC14-elong.EC16-p.delta16*x.EC16; r.EC18=elong.EC16-p.delta18*x.EC18; r.C14=p.delta14*x.EC14; r.C16=p.delta16*x.EC16; r.C18=p.delta18*x.EC18; return r; }
    },
    'love-hate': {
      id:'love-hate', name:'Love–hate oscillator', type:'ODE', family:'social dynamics / teaching oscillator',
      summary:'Romeo-Juliet style two-dimensional oscillator where one variable responds positively and the other negatively.',
      variables:['R','J'], primary:'R',
      params:{ a:{value:1,min:0.2,max:3,step:0.05,label:'Romeo response'}, b:{value:1,min:0.2,max:3,step:0.05,label:'Juliet response'} },
      initials:{R:1,J:0}, tStart:0, tEnd:25, steps:900,
      latex:[String.raw`\dot{R}=aJ`,String.raw`\dot{J}=-bR`],
      equations:['dR/dt = aJ','dJ/dt = -bR'],
      rhs:(x,p)=>({R:p.a*x.J,J:-p.b*x.R})
    },
    braess: {
      id:'braess', name:'Braess routing dynamics', type:'ODE', family:'network routing dynamics',
      summary:'Simplified route-choice feedback model inspired by Braess routing effects.',
      variables:['x'], primary:'x',
      params:{ eta:{value:0.8,min:0.1,max:2,step:0.05,label:'adaptation rate'}, shortcut:{value:0,min:0,max:18,step:0.5,label:'shortcut strength'} },
      initials:{x:0.25}, tStart:0, tEnd:35, steps:700,
      latex:[String.raw`\dot{x}=\eta x(1-x)\left[(22+10(1-x)-s)-(10+30x)\right]`],
      equations:['dx/dt = ηx(1-x)[route payoff difference]'],
      rhs:(x,p)=>({x:p.eta*x.x*(1-x.x)*((22+10*(1-x.x)-p.shortcut)-(10+30*x.x))})
    },
    ziegler: {
      id:'ziegler', name:'Ziegler destabilization', type:'ODE', family:'nonconservative structural dynamics',
      summary:'Four-state nonconservative oscillator illustrating that load can destabilize dynamics.',
      variables:['q1','q2','v1','v2'], primary:'q1',
      params:{ k1:{value:2,min:0.5,max:8,step:0.1,label:'k1'}, k2:{value:4,min:0.5,max:12,step:0.1,label:'k2'}, k3:{value:2,min:0.5,max:8,step:0.1,label:'k3'}, P:{value:3,min:0,max:10,step:0.1,label:'follower load'}, c:{value:0.05,min:0,max:0.4,step:0.01,label:'damping'} },
      initials:{q1:0.1,q2:0,v1:0,v2:0.05}, tStart:0, tEnd:40, steps:1600,
      latex:[String.raw`\dot{q}_1=v_1`,String.raw`\dot{q}_2=v_2`,String.raw`\dot{v}_1=-(k_1+k_2)q_1+k_2q_2+Pq_2-cv_1`,String.raw`\dot{v}_2=k_2q_1-(k_2+k_3)q_2-Pq_1-cv_2`],
      equations:['nonconservative two-coordinate oscillator'],
      rhs:(x,p)=>({q1:x.v1,q2:x.v2,v1:-(p.k1+p.k2)*x.q1+p.k2*x.q2+p.P*x.q2-p.c*x.v1,v2:p.k2*x.q1-(p.k2+p.k3)*x.q2-p.P*x.q1-p.c*x.v2})
    },
    calvin: {
      id:'calvin', name:'Calvin cycle mini-model', type:'ODE', family:'photosynthesis / biochemical cycles',
      summary:'Minimal photosynthesis-inspired PGA/RuBP system with fixation, oxygenation and regeneration terms.',
      variables:['PGA','RuBP'], primary:'RuBP',
      params:{ Vcmax:{value:1.2,min:0.2,max:3,step:0.05,label:'carboxylation capacity'}, Vo:{value:0.2,min:0.01,max:0.8,step:0.01,label:'oxygenation'}, Vregen:{value:1.0,min:0.2,max:3,step:0.05,label:'regeneration'}, Kc:{value:0.8,min:0.1,max:3,step:0.05,label:'Kc'}, Ko:{value:1.2,min:0.2,max:4,step:0.05,label:'Ko'}, Kr:{value:0.9,min:0.1,max:3,step:0.05,label:'Kr'} },
      initials:{PGA:2.0,RuBP:1.0}, tStart:0, tEnd:30, steps:800,
      latex:[String.raw`\dot{PGA}=\frac{V_c RuBP}{K_c+RuBP}-\frac{V_o RuBP}{K_o+RuBP}-\frac{V_r PGA}{K_r+PGA}`,String.raw`\dot{RuBP}=\frac{V_r PGA}{K_r+PGA}-\frac{V_c RuBP}{K_c+RuBP}-\frac{V_o RuBP}{K_o+RuBP}`],
      equations:['PGA/RuBP carbon fixation and regeneration mini-model'],
      rhs:(x,p)=>{ const fix=p.Vcmax*x.RuBP/(p.Kc+x.RuBP); const oxy=p.Vo*x.RuBP/(p.Ko+x.RuBP); const reg=p.Vregen*x.PGA/(p.Kr+x.PGA); return {PGA:fix-oxy-reg,RuBP:reg-fix-oxy}; }
    }

  };

  const CTMC_MODELS = {
    'birth-death': {
      id:'birth-death', name:'Birth–death process', type:'CTMC', family:'stochastic population',
      summary:'Continuous-time Markov chain with random birth and death events.',
      variables:['X'], primary:'X', tStart:0, tEnd:30, steps:250, runs:250, seed:3,
      params:{ b:{value:0.35,min:0.02,max:1.0,step:0.01,label:'birth rate'}, d:{value:0.30,min:0.02,max:1.0,step:0.01,label:'death rate'} },
      initials:{X:50},
      latex:[String.raw`X \xrightarrow{bX} 2X`,String.raw`X \xrightarrow{dX} \varnothing`],
      equations:['birth: X → X + 1 at rate bX','death: X → X - 1 at rate dX'],
      events:[
        {name:'birth',expr:'b*X',prop:(x,p)=>Math.max(0,p.b*x.X),updates:{X:1}},
        {name:'death',expr:'d*X',prop:(x,p)=>Math.max(0,p.d*x.X),updates:{X:-1}}
      ]
    },
    'stoch-sir': {
      id:'stoch-sir', name:'Stochastic SIR epidemic', type:'CTMC', family:'stochastic epidemiology',
      summary:'Gillespie infection-recovery model with ensemble distributions and outbreak variability.',
      variables:['S','I','R'], primary:'I', tStart:0, tEnd:120, steps:360, runs:250, seed:11,
      params:{ beta:{value:0.35,min:0.05,max:1.1,step:0.01,label:'β infection'}, gamma:{value:0.10,min:0.02,max:0.5,step:0.01,label:'γ recovery'}, N:{value:1000,min:100,max:5000,step:50,label:'population'} },
      initials:{S:990,I:10,R:0},
      latex:[String.raw`S+I \xrightarrow{\beta SI/N} 2I`,String.raw`I \xrightarrow{\gamma I} R`],
      equations:['infection: S + I → 2I at rate beta*S*I/N','recovery: I → R at rate gamma*I'],
      events:[
        {name:'infection',expr:'beta*S*I/N',prop:(x,p)=>Math.max(0,p.beta*x.S*x.I/Math.max(p.N,1e-9)),updates:{S:-1,I:1}},
        {name:'recovery',expr:'gamma*I',prop:(x,p)=>Math.max(0,p.gamma*x.I),updates:{I:-1,R:1}}
      ]
    },
    'gene-expression': {
      id:'gene-expression', name:'Stochastic gene expression', type:'CTMC', family:'gene expression',
      summary:'Random mRNA/protein production and degradation with burst-like variability.',
      variables:['M','P'], primary:'P', tStart:0, tEnd:80, steps:320, runs:200, seed:17,
      params:{ km:{value:1.5,min:0.1,max:5,step:0.05,label:'mRNA synthesis'}, dm:{value:0.3,min:0.03,max:1,step:0.01,label:'mRNA decay'}, kp:{value:2.0,min:0.1,max:6,step:0.05,label:'translation'}, dp:{value:0.08,min:0.01,max:0.5,step:0.01,label:'protein decay'} },
      initials:{M:0,P:0},
      latex:[String.raw`\varnothing \xrightarrow{k_m} M`,String.raw`M \xrightarrow{d_mM} \varnothing`,String.raw`M \xrightarrow{k_pM} M+P`,String.raw`P \xrightarrow{d_pP} \varnothing`],
      equations:['transcription: ∅ → M at rate km','mRNA decay: M → ∅ at rate dm*M','translation: M → M + P at rate kp*M','protein decay: P → ∅ at rate dp*P'],
      events:[
        {name:'transcription',expr:'km',prop:(x,p)=>Math.max(0,p.km),updates:{M:1}},
        {name:'mRNA decay',expr:'dm*M',prop:(x,p)=>Math.max(0,p.dm*x.M),updates:{M:-1}},
        {name:'translation',expr:'kp*M',prop:(x,p)=>Math.max(0,p.kp*x.M),updates:{P:1}},
        {name:'protein decay',expr:'dp*P',prop:(x,p)=>Math.max(0,p.dp*x.P),updates:{P:-1}}
      ]
    }
    ,
    galton: {
      id:'galton', name:'Galton–Watson branching process', type:'CTMC', family:'branching process approximation',
      summary:'Workbench CTMC approximation of a branching process: individuals reproduce and die randomly; use legacy lab for exact discrete-generation Galton-Watson simulation.',
      variables:['Z'], primary:'Z', tStart:0, tEnd:30, steps:240, runs:250, seed:23,
      params:{ birth:{value:0.55,min:0.05,max:1.4,step:0.02,label:'birth rate'}, death:{value:0.45,min:0.05,max:1.4,step:0.02,label:'death rate'} },
      initials:{Z:20}, latex:[String.raw`Z \xrightarrow{birth\,Z} 2Z`,String.raw`Z \xrightarrow{death\,Z} \varnothing`],
      equations:['branching birth: Z → Z+1','death: Z → Z-1'],
      events:[{name:'branching birth',expr:'birth*Z',prop:(x,p)=>Math.max(0,p.birth*x.Z),updates:{Z:1}},{name:'death',expr:'death*Z',prop:(x,p)=>Math.max(0,p.death*x.Z),updates:{Z:-1}}]
    },
    'gambler-ruin': {
      id:'gambler-ruin', name:'Gambler’s ruin', type:'CTMC', family:'random walk',
      summary:'Continuous-time random-walk version of gambler’s ruin with absorbing lower and upper boundaries.',
      variables:['capital'], primary:'capital', tStart:0, tEnd:120, steps:400, runs:250, seed:29,
      params:{ pwin:{value:0.5,min:0.3,max:0.7,step:0.01,label:'win probability'}, rate:{value:1,min:0.1,max:3,step:0.05,label:'play rate'}, target:{value:20,min:5,max:80,step:1,label:'target capital'} },
      initials:{capital:10}, latex:[String.raw`X \rightarrow X+1`,String.raw`X \rightarrow X-1`],
      equations:['win: X → X+1 until target','loss: X → X-1 until ruin'],
      events:[{name:'win',expr:'rate*pwin',prop:(x,p)=>x.capital>0&&x.capital<p.target?Math.max(0,p.rate*p.pwin):0,updates:{capital:1}},{name:'loss',expr:'rate*(1-pwin)',prop:(x,p)=>x.capital>0&&x.capital<p.target?Math.max(0,p.rate*(1-p.pwin)):0,updates:{capital:-1}}]
    },
    ehrenfest: {
      id:'ehrenfest', name:'Ehrenfest urn model', type:'CTMC', family:'finite Markov chain',
      summary:'Balls switch between two urns; the number in urn A relaxes toward half the total.',
      variables:['A'], primary:'A', tStart:0, tEnd:80, steps:400, runs:250, seed:31,
      params:{ balls:{value:60,min:10,max:200,step:1,label:'total balls'}, rate:{value:1,min:0.1,max:4,step:0.05,label:'switching rate'} },
      initials:{A:60}, latex:[String.raw`A \xrightarrow{rate\,A} A-1`,String.raw`A \xrightarrow{rate\,(N-A)} A+1`],
      equations:['A→B move decreases A','B→A move increases A'],
      events:[{name:'A to B',expr:'rate*A',prop:(x,p)=>Math.max(0,p.rate*x.A),updates:{A:-1}},{name:'B to A',expr:'rate*(balls-A)',prop:(x,p)=>Math.max(0,p.rate*Math.max(0,p.balls-x.A)),updates:{A:1}}]
    },
    'wright-fisher': {
      id:'wright-fisher', name:'Wright–Fisher drift approximation', type:'CTMC', family:'population genetics',
      summary:'Workbench birth-death approximation of allele-frequency drift. Use legacy stochastic lab for the exact discrete Wright-Fisher sampler.',
      variables:['copies'], primary:'copies', tStart:0, tEnd:80, steps:400, runs:250, seed:37,
      params:{ N:{value:100,min:20,max:500,step:10,label:'diploid population'}, selection:{value:0,min:-0.2,max:0.5,step:0.01,label:'selection'}, drift:{value:1,min:0.1,max:4,step:0.05,label:'drift rate'} },
      initials:{copies:50}, latex:[String.raw`i \rightarrow i+1`,String.raw`i \rightarrow i-1`],
      equations:['copy gain/loss approximation with absorbing 0 and 2N boundaries'],
      events:[{name:'gain',expr:'drift*p*(1-p)*(1+s)',prop:(x,p)=>{const K=2*p.N, f=x.copies/K; return x.copies>0&&x.copies<K?Math.max(0,p.drift*K*f*(1-f)*(1+p.selection)):0},updates:{copies:1}},{name:'loss',expr:'drift*p*(1-p)',prop:(x,p)=>{const K=2*p.N, f=x.copies/K; return x.copies>0&&x.copies<K?Math.max(0,p.drift*K*f*(1-f)):0},updates:{copies:-1}}]
    },
    gbm: {
      id:'gbm', name:'Geometric Brownian motion proxy', type:'CTMC', family:'stochastic growth approximation',
      summary:'Birth-death multiplicative-growth proxy for geometric Brownian motion. Legacy lab contains the direct GBM simulator.',
      variables:['X'], primary:'X', tStart:0, tEnd:40, steps:350, runs:250, seed:41,
      params:{ up:{value:0.25,min:0.01,max:1.0,step:0.01,label:'up rate'}, down:{value:0.20,min:0.01,max:1.0,step:0.01,label:'down rate'} },
      initials:{X:50}, latex:[String.raw`X \rightarrow X+1`,String.raw`X \rightarrow X-1`],
      equations:['multiplicative stochastic-growth proxy'],
      events:[{name:'up',expr:'up*X',prop:(x,p)=>Math.max(0,p.up*x.X),updates:{X:1}},{name:'down',expr:'down*X',prop:(x,p)=>Math.max(0,p.down*x.X),updates:{X:-1}}]
    },
    parrondo: {
      id:'parrondo', name:'Parrondo-style random walk', type:'CTMC', family:'paradox / random walk approximation',
      summary:'Capital random walk with state-dependent winning probability. Legacy lab contains the full Parrondo game comparison.',
      variables:['capital'], primary:'capital', tStart:0, tEnd:160, steps:400, runs:250, seed:43,
      params:{ pBad:{value:0.10,min:0.01,max:0.49,step:0.01,label:'bad state win p'}, pGood:{value:0.74,min:0.5,max:0.95,step:0.01,label:'good state win p'}, M:{value:3,min:2,max:8,step:1,label:'modulo period'}, rate:{value:1,min:0.1,max:3,step:0.05,label:'play rate'} },
      initials:{capital:10}, latex:[String.raw`X \rightarrow X+1`,String.raw`X \rightarrow X-1`],
      equations:['state-dependent random walk capital model'],
      events:[{name:'win',expr:'state dependent p',prop:(x,p)=>{const mod=((Math.round(x.capital)%Math.round(p.M))+Math.round(p.M))%Math.round(p.M); const pr=mod===0?p.pBad:p.pGood; return Math.max(0,p.rate*pr)},updates:{capital:1}},{name:'loss',expr:'1-p',prop:(x,p)=>{const mod=((Math.round(x.capital)%Math.round(p.M))+Math.round(p.M))%Math.round(p.M); const pr=mod===0?p.pBad:p.pGood; return Math.max(0,p.rate*(1-pr))},updates:{capital:-1}}]
    },
    resonance: {
      id:'resonance', name:'Stochastic resonance threshold model', type:'CTMC', family:'noise-assisted dynamics',
      summary:'Two-state threshold-crossing proxy for stochastic resonance. Scan noise to inspect crossing response.',
      variables:['crossings'], primary:'crossings', tStart:0, tEnd:100, steps:320, runs:250, seed:47,
      params:{ signal:{value:0.6,min:0,max:2,step:0.05,label:'signal amplitude'}, noise:{value:0.8,min:0.05,max:3,step:0.05,label:'noise level'}, threshold:{value:1.0,min:0.2,max:3,step:0.05,label:'threshold'} },
      initials:{crossings:0}, latex:[String.raw`\varnothing \xrightarrow{r(signal,noise,threshold)} crossing`],
      equations:['noise-assisted threshold crossings'],
      events:[{name:'crossing',expr:'exp(-(threshold-signal)^2/noise^2)',prop:(x,p)=>Math.exp(-Math.pow(Math.max(0,p.threshold-p.signal),2)/(p.noise*p.noise+1e-9)),updates:{crossings:1}}]
    },
    ratchet: {
      id:'ratchet', name:'Flashing ratchet transport proxy', type:'CTMC', family:'Brownian motor approximation',
      summary:'Biased random-walk proxy for flashing ratchet transport. Legacy lab contains the specialized ratchet view.',
      variables:['position'], primary:'position', tStart:0, tEnd:120, steps:400, runs:250, seed:53,
      params:{ forward:{value:0.56,min:0.3,max:0.9,step:0.01,label:'forward probability'}, switchRate:{value:1,min:0.1,max:4,step:0.05,label:'switching rate'} },
      initials:{position:0}, latex:[String.raw`X \rightarrow X+1`,String.raw`X \rightarrow X-1`],
      equations:['biased transport proxy'],
      events:[{name:'forward',expr:'switchRate*forward',prop:(x,p)=>Math.max(0,p.switchRate*p.forward),updates:{position:1}},{name:'backward',expr:'switchRate*(1-forward)',prop:(x,p)=>Math.max(0,p.switchRate*(1-p.forward)),updates:{position:-1}}]
    },
    secretary: {
      id:'secretary', name:'Secretary stopping rule proxy', type:'CTMC', family:'optimal stopping approximation',
      summary:'Workbench proxy for optimal stopping: accepted candidates accumulate as a rate controlled by the observation fraction. Use legacy lab for the exact rank-sampling experiment.',
      variables:['accepted'], primary:'accepted', tStart:0, tEnd:100, steps:240, runs:250, seed:59,
      params:{ observeFrac:{value:0.37,min:0.05,max:0.9,step:0.01,label:'observation fraction'}, candidateRate:{value:1,min:0.1,max:3,step:0.05,label:'candidate rate'} },
      initials:{accepted:0}, latex:[String.raw`\varnothing \xrightarrow{r(f)} accepted`],
      equations:['optimal-stopping acceptance proxy'],
      events:[{name:'accept',expr:'candidateRate*f*log(1/f)',prop:(x,p)=>Math.max(0,p.candidateRate*p.observeFrac*Math.log(1/Math.max(p.observeFrac,1e-9))),updates:{accepted:1}}]
    },
    bandit: {
      id:'bandit', name:'Multi-armed bandit learning proxy', type:'CTMC', family:'decision under uncertainty',
      summary:'Reward-accumulation proxy for bandit learning. Legacy lab contains full arm-pull and regret analysis.',
      variables:['reward'], primary:'reward', tStart:0, tEnd:120, steps:320, runs:250, seed:61,
      params:{ exploit:{value:0.7,min:0,max:1,step:0.01,label:'exploitation'}, rewardRate:{value:1,min:0.1,max:3,step:0.05,label:'reward rate'} },
      initials:{reward:0}, latex:[String.raw`R \rightarrow R+1`],
      equations:['reward accumulation proxy'],
      events:[{name:'reward',expr:'rewardRate*(0.4+0.6*exploit)',prop:(x,p)=>Math.max(0,p.rewardRate*(0.4+0.6*p.exploit)),updates:{reward:1}}]
    },
    tcell: {
      id:'tcell', name:'Reduced T-cell proliferation event model', type:'CTMC', family:'research stochastic biology',
      summary:'Reduced immune-cell birth/death/activation event model inspired by the T-cell proliferation Atlas entry.',
      variables:['Q','A','D'], primary:'A', tStart:0, tEnd:80, steps:320, runs:250, seed:67,
      params:{ activation:{value:0.06,min:0.005,max:0.3,step:0.005,label:'activation'}, division:{value:0.18,min:0.01,max:0.6,step:0.01,label:'division'}, death:{value:0.04,min:0.005,max:0.3,step:0.005,label:'death'} },
      initials:{Q:80,A:5,D:0}, latex:[String.raw`Q \rightarrow A`,String.raw`A \rightarrow 2A`,String.raw`A \rightarrow D`],
      equations:['activation, proliferation and death events'],
      events:[{name:'activation',expr:'activation*Q',prop:(x,p)=>Math.max(0,p.activation*x.Q),updates:{Q:-1,A:1}},{name:'division',expr:'division*A',prop:(x,p)=>Math.max(0,p.division*x.A),updates:{A:1}},{name:'death',expr:'death*A',prop:(x,p)=>Math.max(0,p.death*x.A),updates:{A:-1,D:1}}]
    }

  };

  const STEADY_MODELS = {
    'enzyme-steady': {
      id:'enzyme-steady', name:'Enzyme steady state', type:'STEADY', family:'algebraic / biochemical steady state',
      summary:'Single-state inflow, saturating enzymatic consumption and linear outflow. Useful for equilibrium and response analysis.',
      variables:['S'], primary:'S', tStart:0, tEnd:80, steps:1200,
      params:{ vin:{value:1.5,min:0.1,max:5,step:0.05,label:'input flux'}, vmax:{value:2.6,min:0.2,max:8,step:0.05,label:'maximum enzyme rate'}, km:{value:1.2,min:0.05,max:5,step:0.05,label:'Michaelis constant'}, kout:{value:0.15,min:0.01,max:1.2,step:0.01,label:'linear outflow'} },
      initials:{S:2},
      latex:[String.raw`0=v_{in}-\frac{V_{max}S}{K_m+S}-k_{out}S`],
      equations:['0 = vin - vmax*S/(km+S) - kout*S'],
      rhs:(x,p)=>({S:p.vin-p.vmax*Math.max(x.S,0)/(p.km+Math.max(x.S,0)+1e-12)-p.kout*x.S})
    },
    'toggle-steady': {
      id:'toggle-steady', name:'Toggle-switch steady state', type:'STEADY', family:'gene regulation steady state',
      summary:'Mutual repression system analyzed as an equilibrium problem with local stability and response coefficients.',
      variables:['A','B'], primary:'A', tStart:0, tEnd:120, steps:1600,
      params:{ a1:{value:5,min:0.5,max:10,step:0.1,label:'A production'}, a2:{value:5,min:0.5,max:10,step:0.1,label:'B production'}, n:{value:2,min:1,max:5,step:0.1,label:'Hill coefficient'}, d:{value:1,min:0.1,max:3,step:0.05,label:'degradation'} },
      initials:{A:0.5,B:3},
      latex:[String.raw`0=\frac{a_1}{1+B^n}-dA`,String.raw`0=\frac{a_2}{1+A^n}-dB`],
      equations:['0 = a1/(1+B^n) - d*A','0 = a2/(1+A^n) - d*B'],
      rhs:(x,p)=>({A:p.a1/(1+Math.pow(Math.max(x.B,0),p.n))-p.d*x.A, B:p.a2/(1+Math.pow(Math.max(x.A,0),p.n))-p.d*x.B})
    },
    'cubic-bistable': {
      id:'cubic-bistable', name:'Cubic bistability', type:'STEADY', family:'nonlinear algebraic dynamics',
      summary:'One-dimensional cubic equilibrium benchmark for stability, continuation and saddle-node intuition.',
      variables:['x'], primary:'x', tStart:0, tEnd:80, steps:1000,
      params:{ a:{value:0.2,min:-1.5,max:1.5,step:0.02,label:'forcing'}, b:{value:1.0,min:-1.5,max:2.5,step:0.02,label:'linear gain'} },
      initials:{x:0.2},
      latex:[String.raw`0=a+bx-x^3`],
      equations:['0 = a + b*x - x^3'],
      rhs:(x,p)=>({x:p.a+p.b*x.x-Math.pow(x.x,3)})
    },
    'leaf-gas-steady': {
      id:'leaf-gas-steady', name:'Leaf gas-exchange operating point', type:'STEADY', family:'photosynthesis steady state',
      summary:'Algebraic gas-exchange operating point where biochemical assimilation equals diffusive CO2 supply.',
      variables:['A','Ci'], primary:'A', tStart:0, tEnd:140, steps:1800,
      params:{ Vcmax:{value:35,min:10,max:80,step:1,label:'Vcmax'}, Gamma:{value:40,min:20,max:80,step:1,label:'CO2 compensation'}, K:{value:400,min:100,max:900,step:10,label:'Michaelis proxy'}, gs:{value:0.08,min:0.02,max:0.25,step:0.005,label:'stomatal conductance'}, Ca:{value:420,min:250,max:650,step:5,label:'ambient CO2'} },
      initials:{A:12,Ci:240},
      latex:[String.raw`0=A-\frac{V_{cmax}(C_i-\Gamma)}{C_i+K}`, String.raw`0=A-g_s(C_a-C_i)`],
      equations:['0 = Vcmax*(Ci-Gamma)/(Ci+K) - A','0 = gs*(Ca-Ci) - A'],
      rhs:(x,p)=>({A:p.Vcmax*(x.Ci-p.Gamma)/(x.Ci+p.K+1e-12)-x.A, Ci:p.gs*(p.Ca-x.Ci)-x.A})
    },

'leaf-thermal-steady': {
  id:'leaf-thermal-steady', name:'Leaf heat-balance steady state', type:'STEADY', family:'Foko research / heat transfer + hydraulics',
  summary:'Reduced mesophyll/bundle-sheath heat-balance system. It exposes how irradiance, convection, transpiration and water flux set compartment temperatures.',
  variables:['Tmes','Tbs'], primary:'Tbs', tStart:0, tEnd:220, steps:2600,
  params:{ phi:{value:1000,min:300,max:1400,step:25,label:'irradiance'}, alpha:{value:0.30,min:0.05,max:0.65,step:0.01,label:'albedo'}, UA:{value:14,min:2,max:40,step:0.5,label:'conductive coupling'}, h:{value:10,min:2,max:35,step:0.5,label:'convective cooling'}, F:{value:0.9,min:0.05,max:3.0,step:0.05,label:'water flux cooling'}, Tair:{value:298,min:285,max:315,step:1,label:'air temperature'}, Tsoil:{value:290,min:278,max:305,step:1,label:'soil temperature'}, E:{value:0.18,min:0.02,max:0.7,step:0.01,label:'transpiration cooling'} },
  initials:{Tmes:305,Tbs:302},
  latex:[String.raw`0=(1-\alpha)\phi-\sigma T_{mes}^4-UA(T_{mes}-T_{bs})-h(T_{mes}-T_{air})-\lambda E`, String.raw`0=UA(T_{mes}-T_{bs})-F(T_{bs}-T_{soil})`],
  equations:['0 = absorbed radiation - radiation - conduction - convection - transpiration','0 = conductive heat from mesophyll - water-flux cooling to soil/root'],
  rhs:(x,p)=>{ const rad=5.67e-8*(Math.pow(Math.max(x.Tmes,1),4)-Math.pow(p.Tair,4)); return {Tmes:0.0007*((1-p.alpha)*p.phi-rad-p.UA*(x.Tmes-x.Tbs)-p.h*(x.Tmes-p.Tair)-65*p.E), Tbs:0.018*(p.UA*(x.Tmes-x.Tbs)-p.F*(x.Tbs-p.Tsoil))}; }
},
    'soil-exposure-steady': {
      id:'soil-exposure-steady', name:'Soil pesticide exposure balance', type:'STEADY', family:'environmental exposure steady state',
      summary:'Parent-metabolite balance under repeated input, degradation, runoff and leaching.',
      variables:['C_parent','C_met'], primary:'C_parent', tStart:0, tEnd:160, steps:2000,
      params:{ dose:{value:1.0,min:0.1,max:3,step:0.05,label:'application dose'}, interval:{value:7,min:1,max:30,step:1,label:'application interval'}, kdeg:{value:0.12,min:0.02,max:0.4,step:0.01,label:'parent degradation'}, runoff:{value:0.025,min:0,max:0.12,step:0.005,label:'parent runoff'}, leach:{value:0.018,min:0,max:0.12,step:0.005,label:'parent leaching'}, yield:{value:0.45,min:0.05,max:0.9,step:0.02,label:'metabolite yield'}, kmet:{value:0.09,min:0.01,max:0.35,step:0.01,label:'metabolite degradation'}, runoffM:{value:0.015,min:0,max:0.12,step:0.005,label:'metabolite runoff'}, leachM:{value:0.025,min:0,max:0.12,step:0.005,label:'metabolite leaching'} },
      initials:{C_parent:0.8,C_met:0.25},
      latex:[String.raw`0=\frac{dose}{interval}-(k_{deg}+runoff+leach)C_p`, String.raw`0=yield\,k_{deg}C_p-k_{met}C_m`],
      equations:['0 = dose/interval - (kdeg+runoff+leach)*C_parent','0 = yield*kdeg*C_parent - (kmet+runoffM+leachM)*C_met'],
      rhs:(x,p)=>({C_parent:p.dose/p.interval-(p.kdeg+p.runoff+p.leach)*x.C_parent, C_met:p.yield*p.kdeg*x.C_parent-(p.kmet+p.runoffM+p.leachM)*x.C_met})
    },
    'wastewater-nitrification': {
      id:'wastewater-nitrification', name:'Wastewater nitrification balance', type:'STEADY', family:'environmental engineering steady state',
      summary:'Ammonium and nitrifier biomass steady state with hydraulic dilution, Monod growth, yield and decay.',
      variables:['NH4','Xn'], primary:'NH4', tStart:0, tEnd:180, steps:2200,
      params:{ D:{value:0.2,min:0.05,max:0.8,step:0.01,label:'dilution rate'}, NH4in:{value:30,min:2,max:80,step:1,label:'influent ammonium'}, mumax:{value:0.9,min:0.2,max:2,step:0.02,label:'max growth'}, Ks:{value:1,min:0.1,max:10,step:0.1,label:'half-saturation'}, Y:{value:0.45,min:0.1,max:0.9,step:0.02,label:'yield'}, kd:{value:0.03,min:0,max:0.2,step:0.005,label:'decay'} },
      initials:{NH4:0.35,Xn:11.5},
      latex:[String.raw`0=D(NH_{4,in}-NH_4)-\frac{\mu(NH_4)X_n}{Y}`, String.raw`0=(\mu(NH_4)-D-k_d)X_n`],
      equations:['0 = D*(NH4in-NH4) - (mumax*NH4/(Ks+NH4))*Xn/Y','0 = (mumax*NH4/(Ks+NH4)-D-kd)*Xn'],
      rhs:(x,p)=>{ const mu=p.mumax*Math.max(x.NH4,0)/(p.Ks+Math.max(x.NH4,0)+1e-12); return {NH4:p.D*(p.NH4in-x.NH4)-mu*x.Xn/p.Y, Xn:(mu-p.D-p.kd)*x.Xn}; }
    }
  };
  const OPT_MODELS = {
    quadratic: {
      id:'quadratic', name:'Quadratic bowl', type:'OPT', family:'convex optimization',
      summary:'Smooth two-variable convex benchmark with a single optimum and transparent geometry.',
      variables:['x','y','f','best_f'], primary:'best_f', tStart:0, tEnd:180, steps:180,
      params:{ x0:{value:-3,min:-6,max:6,step:0.1,label:'initial x'}, y0:{value:4,min:-6,max:6,step:0.1,label:'initial y'}, step:{value:1.2,min:0.05,max:3,step:0.05,label:'search step'}, iterations:{value:180,min:30,max:500,step:10,label:'iterations'} },
      initials:{x:-3,y:4}, bounds:{x:[-6,6], y:[-6,6]},
      latex:[String.raw`\min_{x,y}\; f(x,y)=(x-1)^2+\frac{1}{2}(y+2)^2`, String.raw`x^\star=1,\quad y^\star=-2`],
      equations:['minimize f(x,y) = (x-1)^2 + 0.5(y+2)^2'],
      objective:(x,y,p)=>Math.pow(x-1,2)+0.5*Math.pow(y+2,2),
      constraint:(x,y,p)=>0
    },
    rosenbrock: {
      id:'rosenbrock', name:'Rosenbrock valley', type:'OPT', family:'nonconvex optimization',
      summary:'Classic curved-valley benchmark that exposes optimizer path quality and sensitivity to starting point.',
      variables:['x','y','f','best_f'], primary:'best_f', tStart:0, tEnd:260, steps:260,
      params:{ x0:{value:-1.7,min:-3,max:3,step:0.05,label:'initial x'}, y0:{value:2.2,min:-2,max:5,step:0.05,label:'initial y'}, a:{value:1,min:0.2,max:2,step:0.05,label:'target a'}, b:{value:100,min:5,max:250,step:5,label:'valley stiffness'}, step:{value:0.35,min:0.02,max:1.5,step:0.02,label:'search step'}, iterations:{value:260,min:50,max:800,step:10,label:'iterations'} },
      initials:{x:-1.7,y:2.2}, bounds:{x:[-3,3], y:[-2,5]},
      latex:[String.raw`\min_{x,y}\; f(x,y)=(a-x)^2+b(y-x^2)^2`],
      equations:['minimize f(x,y) = (a-x)^2 + b(y-x^2)^2'],
      objective:(x,y,p)=>Math.pow(p.a-x,2)+p.b*Math.pow(y-x*x,2),
      constraint:(x,y,p)=>0
    },
    rastrigin: {
      id:'rastrigin', name:'Rastrigin landscape', type:'OPT', family:'multimodal optimization',
      summary:'Rugged two-variable benchmark with many local minima; useful for visualizing global-search difficulty.',
      variables:['x','y','f','best_f'], primary:'best_f', tStart:0, tEnd:300, steps:300,
      params:{ x0:{value:3.8,min:-5.12,max:5.12,step:0.05,label:'initial x'}, y0:{value:-3.2,min:-5.12,max:5.12,step:0.05,label:'initial y'}, step:{value:0.9,min:0.05,max:2.5,step:0.05,label:'search step'}, iterations:{value:300,min:50,max:900,step:10,label:'iterations'} },
      initials:{x:3.8,y:-3.2}, bounds:{x:[-5.12,5.12], y:[-5.12,5.12]},
      latex:[String.raw`\min_{x,y}\;20+x^2-10\cos(2\pi x)+y^2-10\cos(2\pi y)`],
      equations:['minimize f(x,y) = 20 + x^2 - 10 cos(2πx) + y^2 - 10 cos(2πy)'],
      objective:(x,y,p)=>20+x*x-10*Math.cos(2*Math.PI*x)+y*y-10*Math.cos(2*Math.PI*y),
      constraint:(x,y,p)=>0
    },
    constrained: {
      id:'constrained', name:'Constrained quadratic', type:'OPT', family:'constrained optimization',
      summary:'Penalty-based constrained problem showing objective, feasible region and residual sensitivity.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:220, steps:220,
      params:{ x0:{value:-2,min:-4,max:4,step:0.05,label:'initial x'}, y0:{value:3,min:-4,max:4,step:0.05,label:'initial y'}, penalty:{value:40,min:1,max:160,step:1,label:'constraint penalty'}, step:{value:0.8,min:0.05,max:2.5,step:0.05,label:'search step'}, iterations:{value:220,min:50,max:800,step:10,label:'iterations'} },
      initials:{x:-2,y:3}, bounds:{x:[-4,4], y:[-4,4]},
      latex:[String.raw`\min_{x,y}\;(x-1)^2+(y-1)^2`, String.raw`\text{s.t.}\;x+y\leq1.2`],
      equations:['minimize (x-1)^2 + (y-1)^2 subject to x + y ≤ 1.2'],
      objective:(x,y,p)=>Math.pow(x-1,2)+Math.pow(y-1,2)+p.penalty*Math.pow(Math.max(0,x+y-1.2),2),
      rawObjective:(x,y,p)=>Math.pow(x-1,2)+Math.pow(y-1,2),
      constraint:(x,y,p)=>Math.max(0,x+y-1.2)
    },
    'traffic-signal': {
      id:'traffic-signal', name:'Traffic signal timing', type:'OPT', family:'real-world control optimization',
      summary:'Two-green-time traffic-control surrogate with a cycle-budget penalty. x=gNS and y=gEW.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:260, steps:260,
      params:{ x0:{value:35,min:10,max:90,step:1,label:'initial gNS'}, y0:{value:35,min:10,max:90,step:1,label:'initial gEW'}, penalty:{value:80,min:5,max:250,step:5,label:'cycle penalty'}, step:{value:8,min:0.5,max:25,step:0.5,label:'search step'}, iterations:{value:260,min:50,max:900,step:10,label:'iterations'} },
      initials:{x:35,y:35}, bounds:{x:[10,90],y:[10,90]},
      latex:[String.raw`x=g_{NS},\;y=g_{EW}`, String.raw`\min\left(\frac{520}{18x+80}\right)^2+\left(\frac{430}{16y+80}\right)^2+0.0015(x+y)`],
      equations:['x = north-south green; y = east-west green; x + y + 10 ≤ 120'],
      objective:(x,y,p)=>Math.pow(520/(18*x+80),2)+Math.pow(430/(16*y+80),2)+0.0015*(x+y)+p.penalty*Math.pow(Math.max(0,x+y+10-120),2),
      constraint:(x,y,p)=>Math.max(0,x+y+10-120)
    },
    'crop-risk-opt': {
      id:'crop-risk-opt', name:'Crop dose-buffer risk trade-off', type:'OPT', family:'environmental risk optimization',
      summary:'Dose-buffer surrogate: x=dose, y=buffer distance. Objective trades efficacy, amount used, buffer width and exposure thresholds.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:300, steps:300,
      params:{ x0:{value:1.2,min:0.1,max:3,step:0.05,label:'initial dose'}, y0:{value:12,min:1,max:35,step:1,label:'initial buffer'}, penalty:{value:120,min:5,max:400,step:5,label:'exposure penalty'}, step:{value:2.5,min:0.1,max:10,step:0.1,label:'search step'}, iterations:{value:300,min:50,max:900,step:10,label:'iterations'} },
      initials:{x:1.2,y:12}, bounds:{x:[0.1,3],y:[1,35]},
      latex:[String.raw`x=dose,\;y=buffer`, String.raw`\min -E(x)+0.035x^2+0.006y+penalty\,h_+^2`],
      equations:['x = dose; y = buffer; exposure constraints decrease with y'],
      objective:(x,y,p)=>-(0.92*(1-Math.exp(-1.15*x)))+0.035*x*x+0.006*y+p.penalty*(Math.pow(Math.max(0,0.32*x*Math.exp(-0.09*y)-0.08),2)+Math.pow(Math.max(0,0.08*x/(y+1)-0.02),2)),
      constraint:(x,y,p)=>Math.max(0,0.32*x*Math.exp(-0.09*y)-0.08)+Math.max(0,0.08*x/(y+1)-0.02)
    },
    'reservoir-npv': {
      id:'reservoir-npv', name:'Reservoir pumping NPV surrogate', type:'OPT', family:'operations optimization',
      summary:'Injection-production rate choice with capacity and water-cut penalties. x=qin and y=qprod.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:300, steps:300,
      params:{ x0:{value:55,min:20,max:90,step:1,label:'initial injection'}, y0:{value:55,min:20,max:90,step:1,label:'initial production'}, penalty:{value:60,min:5,max:250,step:5,label:'constraint penalty'}, step:{value:8,min:0.5,max:25,step:0.5,label:'search step'}, iterations:{value:300,min:50,max:900,step:10,label:'iterations'} },
      initials:{x:55,y:55}, bounds:{x:[20,90],y:[20,90]},
      latex:[String.raw`x=q_{in},\;y=q_{prod}`, String.raw`\max\;NPV(x,y)\quad\text{with water-cut and capacity limits}`],
      equations:['x = injection rate; y = production rate; minimize negative NPV with penalties'],
      objective:(x,y,p)=>{ const wc=0.10+0.50/(1+Math.exp(-(y-55)/8)); const npv=32*y*(1-wc)-5*x-4*y-0.025*Math.pow(x-y,2); const c=Math.pow(Math.max(0,x-80),2)+Math.pow(Math.max(0,y-85),2)+Math.pow(Math.max(0,wc-0.45),2); return -npv+p.penalty*c; },
      constraint:(x,y,p)=>{ const wc=0.10+0.50/(1+Math.exp(-(y-55)/8)); return Math.max(0,x-80)+Math.max(0,y-85)+Math.max(0,wc-0.45); }
    },
    'leaf-thermal-opt': {
      id:'leaf-thermal-opt', name:'Leaf thermoregulation optimal control', type:'OPT', family:'Foko research / optimal control surrogate',
      summary:'Reduced photosynthesis-climate-adaptation surrogate: optimize water-flux cooling and stomatal conductance to keep bundle-sheath temperature near a Rubisco-favorable range while preserving carbon gain.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:320, steps:320,
      params:{ x0:{value:0.8,min:0.05,max:2.5,step:0.05,label:'initial water flux F'}, y0:{value:0.10,min:0.02,max:0.35,step:0.005,label:'initial stomatal gs'}, Topt:{value:306,min:298,max:314,step:0.5,label:'Rubisco T target'}, penalty:{value:80,min:5,max:300,step:5,label:'thermal penalty'}, step:{value:0.18,min:0.01,max:0.7,step:0.01,label:'search step'}, iterations:{value:320,min:60,max:1000,step:10,label:'iterations'} },
      initials:{x:0.8,y:0.10}, bounds:{x:[0.05,2.5],y:[0.02,0.35]},
      latex:[String.raw`x=F,\quad y=g_s`, String.raw`T_{bs}\approx303+18/(1+F)+7e^{-4g_s}`, String.raw`\min\;(T_{bs}-T_{opt})^2-carbon(F,g_s)+cost(F,g_s)`],
      equations:['x = water-flux cooling F; y = stomatal conductance gs; objective balances thermal regulation, assimilation, and water cost'],
      objective:(x,y,p)=>{ const Tbs=303+18/(1+x)+7*Math.exp(-4*y); const A=36*y/(0.08+y)*Math.exp(-Math.pow((Tbs-p.Topt)/9,2)); const c=Math.max(0,Tbs-316); return Math.pow((Tbs-p.Topt)/4,2)-0.22*A+0.12*x*x+0.35*y*y+p.penalty*c*c; },
      rawObjective:(x,y,p)=>{ const Tbs=303+18/(1+x)+7*Math.exp(-4*y); const A=36*y/(0.08+y)*Math.exp(-Math.pow((Tbs-p.Topt)/9,2)); return Math.pow((Tbs-p.Topt)/4,2)-0.22*A+0.12*x*x+0.35*y*y; },
      constraint:(x,y,p)=>Math.max(0,303+18/(1+x)+7*Math.exp(-4*y)-316),
      metrics:(x,y,p)=>{ const Tbs=303+18/(1+x)+7*Math.exp(-4*y); const A=36*y/(0.08+y)*Math.exp(-Math.pow((Tbs-p.Topt)/9,2)); return {Tbs,A,waterCost:x+2.5*y}; }
    },
    'hydraulic-carbon-opt': {
      id:'hydraulic-carbon-opt', name:'Hydraulic-carbon trade-off', type:'OPT', family:'Foko research / hydraulic limitation',
      summary:'Optimize stomatal conductance and leaf hydraulic conductance under a water-supply risk penalty. This is the compact Workbench layer for carbon-water trade-offs.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:300, steps:300,
      params:{ x0:{value:0.12,min:0.02,max:0.40,step:0.005,label:'initial gs'}, y0:{value:2.5,min:0.4,max:8,step:0.1,label:'initial Kl'}, drought:{value:1.0,min:0.3,max:2.5,step:0.05,label:'drought pressure'}, penalty:{value:160,min:10,max:500,step:10,label:'hydraulic penalty'}, step:{value:0.5,min:0.02,max:2,step:0.02,label:'search step'}, iterations:{value:300,min:50,max:900,step:10,label:'iterations'} },
      initials:{x:0.12,y:2.5}, bounds:{x:[0.02,0.40],y:[0.4,8]},
      latex:[String.raw`x=g_s,\quad y=K_l`, String.raw`\max A(g_s)-risk(g_s,K_l,drought)-cost(K_l)`],
      equations:['x = stomatal conductance; y = hydraulic conductance; risk rises when water demand exceeds conductance'],
      objective:(x,y,p)=>{ const A=42*x/(0.06+x); const risk=p.drought*x*x/(y+0.2); const c=Math.max(0,risk-0.018); return -A+0.55*risk+0.10*y+p.penalty*c*c; },
      constraint:(x,y,p)=>Math.max(0,p.drought*x*x/(y+0.2)-0.018),
      metrics:(x,y,p)=>({A:42*x/(0.06+x), risk:p.drought*x*x/(y+0.2), waterCost:0.10*y})
    },
    'c3c4-trait-opt': {
      id:'c3c4-trait-opt', name:'C3-C4 trait allocation surrogate', type:'OPT', family:'Foko research / evolutionary adaptation',
      summary:'Reduced trait-allocation model: x is mesophyll Rubisco capacity and y is PEPC capacity. The objective rewards assimilation but penalizes over-investment and leakiness.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:320, steps:320,
      params:{ x0:{value:38,min:10,max:90,step:1,label:'initial Vcmax mes'}, y0:{value:24,min:0,max:95,step:1,label:'initial Vpmax'}, gbs:{value:0.035,min:0.005,max:0.12,step:0.002,label:'bundle sheath conductance'}, penalty:{value:40,min:1,max:180,step:2,label:'capacity penalty'}, step:{value:8,min:0.5,max:25,step:0.5,label:'search step'}, iterations:{value:320,min:60,max:1000,step:10,label:'iterations'} },
      initials:{x:38,y:24}, bounds:{x:[10,90],y:[0,95]},
      latex:[String.raw`x=V_{cmax,mes},\quad y=V_{pmax}`, String.raw`A=A_{mes}(x)+A_{bs}(y,g_{bs})-leakiness`],
      equations:['x = mesophyll Rubisco capacity; y = PEPC capacity; gbs controls leakiness penalty'],
      objective:(x,y,p)=>{ const Ames=0.55*x/(18+x); const Abs=0.65*y/(24+y); const leak=2.4*p.gbs*y/(10+y); const c=Math.max(0,x+y-130); return -(Ames+Abs-leak)+0.0008*Math.pow(x+y,2)+p.penalty*c*c; },
      constraint:(x,y,p)=>Math.max(0,x+y-130),
      metrics:(x,y,p)=>({Ames:0.55*x/(18+x), Abs:0.65*y/(24+y), leak:2.4*p.gbs*y/(10+y), waterCost:x+y})
    },
    'thermal-controller-opt': {
      id:'thermal-controller-opt', name:'Bundle-sheath thermal controller tuning', type:'OPT', family:'Foko research / dynamic optimal-control surrogate',
      summary:'Protected plant surrogate: tune water-flux cooling and stomatal response so bundle-sheath temperature reaches a Rubisco-favorable setpoint without excessive overshoot or water cost.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:360, steps:360,
      params:{ x0:{value:0.9,min:0.05,max:2.8,step:0.05,label:'initial water flux gain'}, y0:{value:0.12,min:0.02,max:0.40,step:0.005,label:'initial stomatal response'}, Tset:{value:306,min:298,max:314,step:0.5,label:'temperature setpoint'}, penalty:{value:90,min:10,max:400,step:5,label:'overshoot penalty'}, step:{value:0.18,min:0.01,max:0.8,step:0.01,label:'search step'}, iterations:{value:360,min:80,max:1000,step:20,label:'iterations'} },
      initials:{x:0.9,y:0.12}, bounds:{x:[0.05,2.8],y:[0.02,0.40]},
      latex:[String.raw`x=F_{gain},\quad y=g_s`, String.raw`\min\;IAE+overshoot+water\;cost`],
      equations:['x = cooling gain; y = stomatal response; objective penalizes integrated temperature error, overshoot and water cost'],
      objective:(x,y,p)=>{ const steady=318-10*Math.tanh(1.2*x)-7*Math.tanh(8*y); const tau=18/(0.25+x+2.2*y); const overshoot=Math.max(0,steady-p.Tset)+0.5*Math.max(0,1.8*x/(1+5*y)-1.0); const iae=Math.abs(steady-p.Tset)+0.18*tau; return iae + p.penalty*overshoot*overshoot + 0.22*x*x + 1.4*y*y; },
      constraint:(x,y,p)=>Math.max(0,318-10*Math.tanh(1.2*x)-7*Math.tanh(8*y)-313),
      metrics:(x,y,p)=>{ const steady=318-10*Math.tanh(1.2*x)-7*Math.tanh(8*y); const tau=18/(0.25+x+2.2*y); const overshoot=Math.max(0,steady-p.Tset)+0.5*Math.max(0,1.8*x/(1+5*y)-1.0); return {steadyTemp:steady, settlingTime:4*tau, overshoot, waterCost:x+3*y}; },
      response:(x,y,p)=>{ const T0=318, steady=318-10*Math.tanh(1.2*x)-7*Math.tanh(8*y), tau=18/(0.25+x+2.2*y), bump=1.8*x/(1+5*y); const t=[], output=[], target=[]; for(let i=0;i<=120;i++){ const ti=i*0.5; t.push(ti); target.push(p.Tset); output.push(steady+(T0-steady)*Math.exp(-ti/tau)+bump*ti*Math.exp(-ti/(tau*0.55))); } return {t,output,target,ylabel:'bundle-sheath temperature'}; }
    },
    'crop-phenotype-robust-opt': {
      id:'crop-phenotype-robust-opt', name:'Robust C3-C4 crop phenotype design', type:'OPT', family:'Foko research / climate-robust trait optimization',
      summary:'Protected plant surrogate: choose PEPC investment and hydraulic capacity to preserve assimilation across hot/dry and mild climates while limiting leakiness and water risk.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:360, steps:360,
      params:{ x0:{value:45,min:0,max:100,step:1,label:'initial PEPC capacity'}, y0:{value:3.2,min:0.5,max:9,step:0.1,label:'initial hydraulic capacity'}, heat:{value:1.25,min:0.6,max:2.2,step:0.05,label:'heat pressure'}, drought:{value:1.1,min:0.4,max:2.4,step:0.05,label:'drought pressure'}, penalty:{value:70,min:5,max:250,step:5,label:'risk penalty'}, step:{value:7,min:0.5,max:25,step:0.5,label:'search step'}, iterations:{value:360,min:80,max:1000,step:20,label:'iterations'} },
      initials:{x:45,y:3.2}, bounds:{x:[0,100],y:[0.5,9]},
      latex:[String.raw`x=V_{pmax},\quad y=K_l`, String.raw`\max\;A_{hot}+A_{mild}-risk-water-cost`],
      equations:['x = PEPC-like C4 investment; y = hydraulic capacity; objective rewards robust assimilation and penalizes water risk/leakiness'],
      objective:(x,y,p)=>{ const Ahot=48*(0.35+0.65*x/(25+x))*y/(1.6+y)*Math.exp(-0.10*p.heat*Math.max(0,60-x)/60); const Amild=36*(1-0.18*x/(80+x))*y/(1.3+y); const risk=p.drought*Math.pow(x/100,2)/(y+0.3); const leak=0.015*x; const c=Math.max(0,risk-0.08); return -(0.62*Ahot+0.38*Amild)+9*risk+leak+p.penalty*c*c; },
      constraint:(x,y,p)=>Math.max(0,p.drought*Math.pow(x/100,2)/(y+0.3)-0.08),
      metrics:(x,y,p)=>({Ahot:48*(0.35+0.65*x/(25+x))*y/(1.6+y), Amild:36*(1-0.18*x/(80+x))*y/(1.3+y), waterRisk:p.drought*Math.pow(x/100,2)/(y+0.3), investment:x+y})
    },
    'fadns-coa-calibration-opt': {
      id:'fadns-coa-calibration-opt', name:'FADNS CoA inhibition calibration', type:'OPT', family:'PhD metabolism / parameter fitting',
      summary:'Fit a reduced FADNS CoA-inhibition surrogate: tune CoA binding and termination bias to match C16-dominant product output without pathological CoA trapping.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:300, steps:300,
      params:{ x0:{value:0.8,min:0.05,max:3.0,step:0.05,label:'initial CoA inhibition'}, y0:{value:0.55,min:0.05,max:1.5,step:0.02,label:'initial termination bias'}, penalty:{value:60,min:5,max:250,step:5,label:'CoA trap penalty'}, step:{value:0.25,min:0.01,max:1.0,step:0.01,label:'search step'}, iterations:{value:300,min:60,max:900,step:20,label:'iterations'} },
      initials:{x:0.8,y:0.55}, bounds:{x:[0.05,3.0],y:[0.05,1.5]},
      latex:[String.raw`x=k_{CoA},\quad y=\delta_{term}`, String.raw`\min\;\lVert[C14,C16,C18]-target\rVert^2+CoA\;trap`],
      equations:['x = CoA inhibition strength; y = termination bias; objective fits C14/C16/C18 product pattern and penalizes CoA sequestration'],
      objective:(x,y,p)=>{ const C14=0.18+0.14*Math.exp(-y)/(1+x); const C16=0.52+0.28*y/(0.45+y)-0.08*x/(1+x); const C18=0.30+0.12*x/(1+x)-0.10*y/(1+y); const trap=x*x/(1+4*y); const c=Math.max(0,trap-0.42); return Math.pow(C14-0.18,2)+Math.pow(C16-0.68,2)+Math.pow(C18-0.14,2)+0.18*trap+p.penalty*c*c; },
      constraint:(x,y,p)=>Math.max(0,x*x/(1+4*y)-0.42),
      metrics:(x,y,p)=>({C14:0.18+0.14*Math.exp(-y)/(1+x), C16:0.52+0.28*y/(0.45+y)-0.08*x/(1+x), C18:0.30+0.12*x/(1+x)-0.10*y/(1+y), CoAtrap:x*x/(1+4*y)})
    },
    'tcell-generation-fit-opt': {
      id:'tcell-generation-fit-opt', name:'T-cell generation-structure calibration', type:'OPT', family:'quantitative immunology / parameter fitting',
      summary:'Fit a reduced generation-structured proliferation model by tuning activation and death pressure against a target CFSE-like generation distribution.',
      variables:['x','y','f','best_f','constraint'], primary:'best_f', tStart:0, tEnd:280, steps:280,
      params:{ x0:{value:0.55,min:0.05,max:1.2,step:0.02,label:'initial activation'}, y0:{value:0.18,min:0.01,max:0.75,step:0.01,label:'initial death'}, proliferation:{value:0.82,min:0.2,max:1.5,step:0.02,label:'proliferation pressure'}, penalty:{value:50,min:5,max:180,step:5,label:'viability penalty'}, step:{value:0.12,min:0.01,max:0.45,step:0.01,label:'search step'}, iterations:{value:280,min:60,max:900,step:20,label:'iterations'} },
      initials:{x:0.55,y:0.18}, bounds:{x:[0.05,1.2],y:[0.01,0.75]},
      latex:[String.raw`x=\alpha,\quad y=\delta`, String.raw`\min\;\sum_g(P_g(\alpha,\delta,\pi)-P^{obs}_g)^2`],
      equations:['x = activation rate; y = death rate; objective fits a CFSE-like generation profile and penalizes low viability'],
      objective:(x,y,p)=>{ const q=Math.max(0.02,Math.min(0.95,p.proliferation*x/(x+y+0.2))); const surv=Math.exp(-2.2*y); const P0=(1-q), P1=q*(1-q), P2=q*q*(1-q), P3=q*q*q; const fit=Math.pow(P0-0.22,2)+Math.pow(P1-0.31,2)+Math.pow(P2-0.26,2)+Math.pow(P3-0.21,2); const c=Math.max(0,0.45-surv); return fit+0.12*Math.pow(x-0.65,2)+0.2*y*y+p.penalty*c*c; },
      constraint:(x,y,p)=>Math.max(0,0.45-Math.exp(-2.2*y)),
      metrics:(x,y,p)=>{ const q=Math.max(0.02,Math.min(0.95,p.proliferation*x/(x+y+0.2))); return {P0:1-q, P1:q*(1-q), P2:q*q*(1-q), P3:q*q*q, viability:Math.exp(-2.2*y)}; }
    }
  };

  const MODELS = {...ODE_MODELS, ...CTMC_MODELS, ...STEADY_MODELS, ...OPT_MODELS};
  const ROUTE_MODEL_OPTIONS = [
    {group:'Symbolic', items:[{id:'route:symbolic', name:'Open Symbolic Lab', href:'symbolic.html'}]},
    {group:'Agent', items:[{id:'route:agent', name:'Open Agent Lab', href:'agent.html'}]},
    {group:'Model Atlas', items:[{id:'route:atlas', name:'Open Model Atlas', href:'examples.html'}]}
  ];

  const RESEARCH_MODEL_IDS = new Set([
    'fa-metabolism','fadns-coa','tcell',
    'leaf-gas-steady','leaf-thermal-steady','leaf-thermal-opt','hydraulic-carbon-opt','c3c4-trait-opt','thermal-controller-opt','crop-phenotype-robust-opt'
  ]);
  const UNPUBLISHED_PLANT_MODEL_IDS = new Set([
    'leaf-gas-steady','leaf-thermal-steady','leaf-thermal-opt','hydraulic-carbon-opt','c3c4-trait-opt','thermal-controller-opt','crop-phenotype-robust-opt'
  ]);
  function isResearchModel(m){ return !!m && RESEARCH_MODEL_IDS.has(m.id); }
  function isUnpublishedPlantModel(m=currentModel()){ return !!m && UNPUBLISHED_PLANT_MODEL_IDS.has(m.id); }
  function protectedNotice(){ return '<p class="mw-note mw-protected-note"><b>Protected unpublished plant research surrogate.</b> No source code, parameter files, Python/SALib scripts, JSON reports, PNG exports or full-model downloads are provided from the browser. Use this only as a reduced explanatory layer.</p>'; }
  function blockProtectedExport(){ toast('Export disabled for unpublished plant research surrogate'); return false; }

  let state = {
    modelId:'sir', params:{}, initials:{}, tStart:0, tEnd:10, steps:500, runs:200, seed:1, palette:'cividis',
    customPalette:{categorical:['#0f52d9','#12b8a6','#f59e0b','#7c3aed','#ef4444','#334155','#06b6d4'], continuous:['#00204c','#958f78','#fdea45']},
    primaryVariable:'', result:null, cards:[], detailTab:'equations'
  };

  function currentModel(){ return MODELS[state.modelId]; }
  function defaultCards(m){
    if(m.type==='STEADY') return [
      {id:'c_equil',type:'equilibrium',settings:{}},
      {id:'c_cont',type:'continuation',settings:{param:Object.keys(m.params)[0],variable:m.primary,points:50}},
      {id:'c_stab',type:'stability',settings:{}},
      {id:'c_resp',type:'response',settings:{variable:m.primary,metric:'equilibrium',range:0.2}},
      {id:'c_eq',type:'equations',settings:{}},
      {id:'c_diag',type:'diagnostics',settings:{}}
    ];
    if(m.type==='OPT'){
      const cards=[
        {id:'c_conv',type:'convergence',settings:{display:'best + current'}},
        {id:'c_land',type:'landscape',settings:{points:45,display:'heatmap + contour'}},
        {id:'c_slice',type:'slice',settings:{axis:'x',points:70,computed:true}},
        {id:'c_importance',type:'importance',settings:{metric:'best_objective',range:0.2,computed:true}},
        {id:'c_parallel',type:'parallel',settings:{source:'search path',points:80,computed:true}},
        {id:'c_ecdf',type:'ecdf',settings:{source:'search path',points:70,computed:true}}
      ];
      if(isConstrainedModel(m)) cards.push({id:'c_constraints',type:'constraints',settings:{}},{id:'c_active',type:'activeConstraints',settings:{}});
      if(isTradeoffModel(m)) cards.push({id:'c_pareto',type:'pareto',settings:{}},{id:'c_radar',type:'radar',settings:{compare:'start vs best',computed:true}});
      if(m.response || /research|C3|C4|trait|thermal|hydraulic|carbon|control|calibration/i.test(m.name+' '+m.family+' '+m.summary)) cards.push({id:'c_traj',type:'trajectory',settings:{display:'all',computed:true}});
      cards.push({id:'c_eq',type:'equations',settings:{}},{id:'c_diag',type:'diagnostics',settings:{}});
      return cards;
    }
    if(m.type==='CTMC') return [
      {id:'c_ensemble',type:'ensemble',settings:{variable:m.primary}},
      {id:'c_dist',type:'distribution',settings:{variable:m.primary}},
      {id:'c_contour',type:'contour',settings:{variable:m.primary,metric:'mean_final',points:10}},
      {id:'c_gsa',type:'gsa',settings:{variable:m.primary,metric:'mean_final',range:0.2}},
      {id:'c_sens',type:'sensitivity',settings:{range:0.2}},
      {id:'c_diag',type:'diagnostics',settings:{}}
    ];
    return [
      {id:'c_time',type:'timecourse',settings:{display:'all'}},
      {id:'c_phase',type:'phase',settings:{xvar:m.variables[0],yvar:m.variables[Math.min(1,m.variables.length-1)]}},
      {id:'c_contour',type:'contour',settings:{variable:m.primary,metric:'max',points:15}},
      {id:'c_gsa',type:'gsa',settings:{variable:m.primary,metric:'max',range:0.2}},
      {id:'c_sens',type:'sensitivity',settings:{range:0.2}},
      {id:'c_diag',type:'diagnostics',settings:{}}
    ];
  }
  function setDefaults(modelId){
    const m=MODELS[modelId]; state.modelId=modelId; state.params={}; state.initials={};
    Object.entries(m.params).forEach(([k,d])=>state.params[k]=d.value);
    Object.entries(m.initials).forEach(([k,v])=>state.initials[k]=v);
    state.tStart=m.tStart; state.tEnd=m.tEnd; state.steps=m.steps; state.runs=m.runs||200; state.seed=m.seed||1;
    state.primaryVariable=m.primary||m.variables[0]; state.result=null; state.cards=defaultCards(m);
  }

  function rk4Step(x, t, h, rhs, p, vars){
    const add=(a,b,scale)=>{ const y={}; vars.forEach(v=>y[v]=a[v]+scale*b[v]); return y; };
    const k1=rhs(x,p,t), k2=rhs(add(x,k1,h/2),p,t+h/2), k3=rhs(add(x,k2,h/2),p,t+h/2), k4=rhs(add(x,k3,h),p,t+h);
    const out={}; vars.forEach(v=>{ out[v]=x[v]+h*(k1[v]+2*k2[v]+2*k3[v]+k4[v])/6; if(!Number.isFinite(out[v])) out[v]=NaN; }); return out;
  }
  function simulateODE(params=state.params, initials=state.initials, opt={}){
    const m=currentModel(); const vars=m.variables; const steps=clamp(Math.round(opt.steps||state.steps),20,6000); const t0=state.tStart, t1=state.tEnd; const h=(t1-t0)/steps;
    const t=[], series={}; vars.forEach(v=>series[v]=[]); let x={...initials}; let bad=false;
    for(let i=0;i<=steps;i++){
      const ti=t0+i*h; t.push(ti); vars.forEach(v=>series[v].push(x[v]));
      if(i<steps){ x=rk4Step(x,ti,h,m.rhs,params,vars); if(vars.some(v=>!Number.isFinite(x[v]) || Math.abs(x[v])>1e12)){ bad=true; break; } }
    }
    return {kind:'ODE',t,series,steps:t.length-1,bad,params:{...params},initials:{...initials}};
  }
  function simulateOnePath(m, params, initials, tGrid, rng){
    const vars=m.variables; const path={}; vars.forEach(v=>path[v]=[]); const x={...initials}; let t=state.tStart; let eventCount=0;
    for(let gi=0; gi<tGrid.length; gi++){
      const target=tGrid[gi];
      while(t < target){
        const rates=m.events.map(ev=>ev.prop(x,params)); const total=rates.reduce((a,b)=>a+b,0);
        if(!(total>0)) { t=target; break; }
        const tau=-Math.log(Math.max(rng(),1e-12))/total;
        if(t+tau>target){ t=target; break; }
        t += tau; let r=rng()*total; let idx=rates.length-1;
        for(let i=0;i<rates.length;i++){ r -= rates[i]; if(r<=0){ idx=i; break; } }
        const ev=m.events[idx]; Object.entries(ev.updates).forEach(([v,delta])=>{ x[v]=Math.max(0,(x[v]||0)+delta); }); eventCount++;
        if(eventCount>200000){ t=target; break; }
      }
      vars.forEach(v=>path[v].push(x[v]));
    }
    return {path,eventCount};
  }
  function simulateCTMC(params=state.params, initials=state.initials, opt={}){
    const m=currentModel(); const vars=m.variables; const steps=clamp(Math.round(opt.steps||state.steps),30,1200); const runs=clamp(Math.round(opt.runs||state.runs),5,800);
    const t=[]; for(let i=0;i<=steps;i++) t.push(state.tStart+(state.tEnd-state.tStart)*i/steps);
    const sums={}, sums2={}, finals={}, paths=[]; vars.forEach(v=>{sums[v]=Array(t.length).fill(0); sums2[v]=Array(t.length).fill(0); finals[v]=[];});
    const rng=makeRng(opt.seed||state.seed);
    let eventCount=0;
    for(let r=0;r<runs;r++){
      const single=simulateOnePath(m,params,initials,t,rng); eventCount+=single.eventCount; if(r<40) paths.push(single.path);
      vars.forEach(v=>{ const arr=single.path[v]; for(let i=0;i<t.length;i++){ sums[v][i]+=arr[i]; sums2[v][i]+=arr[i]*arr[i]; } finals[v].push(arr[arr.length-1]); });
    }
    const series={}, variance={}; vars.forEach(v=>{ series[v]=sums[v].map(x=>x/runs); variance[v]=sums2[v].map((x,i)=>Math.max(0,x/runs-series[v][i]*series[v][i])); });
    return {kind:'CTMC',t,series,variance,paths,finals,runs,steps:t.length-1,eventCount,params:{...params},initials:{...initials},bad:false};
  }
  function simulateOPT(params=state.params, initials=state.initials, opt={}){
    const m=currentModel();
    const iterations=clamp(Math.round(opt.iterations || params.iterations || state.steps || 220),20,1200);
    const bounds=m.bounds||{};
    const projectPoint=(px,py)=>({
      x:Array.isArray(bounds.x)?clamp(px,bounds.x[0],bounds.x[1]):px,
      y:Array.isArray(bounds.y)?clamp(py,bounds.y[0],bounds.y[1]):py
    });
    let start=projectPoint(Number(params.x0 ?? initials.x ?? 0), Number(params.y0 ?? initials.y ?? 0));
    let x=start.x, y=start.y;
    let step=Math.max(1e-4, Number(params.step || 0.5));
    const t=[], series={x:[],y:[],f:[],best_f:[],constraint:[]}, path=[];
    let bestX=x, bestY=y, bestF=m.objective(x,y,params), accepted=0;
    const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for(let i=0;i<=iterations;i++){
      const f=m.objective(x,y,params); const c=m.constraint?m.constraint(x,y,params):0;
      if(Number.isFinite(f) && f<bestF){ bestF=f; bestX=x; bestY=y; }
      t.push(i); series.x.push(x); series.y.push(y); series.f.push(f); series.best_f.push(bestF); series.constraint.push(c); path.push({x,y,f,best_f:bestF,constraint:c});
      if(i===iterations) break;
      let candX=x, candY=y, candF=f;
      for(const [dx,dy] of directions){
        const scale=(Math.abs(dx)+Math.abs(dy)>1)?Math.SQRT1_2:1;
        const p=projectPoint(x+dx*step*scale, y+dy*step*scale);
        const nf=m.objective(p.x,p.y,params);
        if(Number.isFinite(nf) && nf<candF){ candX=p.x; candY=p.y; candF=nf; }
      }
      // deterministic exploratory proposal helps multimodal landscapes without random noise, but stays inside model bounds
      const p=projectPoint(x+step*0.55*Math.sin(0.37*i+1.7), y+step*0.55*Math.cos(0.29*i+0.4));
      const nf=m.objective(p.x,p.y,params);
      if(Number.isFinite(nf) && nf<candF){ candX=p.x; candY=p.y; candF=nf; }
      if(candF < f-1e-12){ x=candX; y=candY; accepted++; step*=0.995; }
      else { step*=0.86; }
      if(step<1e-7) step=Math.max(1e-7, Number(params.step||0.5)*0.001);
    }
    const residual=m.constraint?m.constraint(bestX,bestY,params):0;
    return {kind:'OPT',t,series,path,params:{...params},initials:{...initials},best:{x:bestX,y:bestY,f:bestF,constraint:residual},accepted,steps:iterations,bad:false};
  }

  function solveSteady(params=state.params, initials=state.initials, opt={}){
    const m=currentModel(); const vars=m.variables; const steps=clamp(Math.round(opt.steps||state.steps||1200),100,5000); const dt=(Number(opt.dt)||0.04);
    let x={...initials}; let residual=Infinity; let bad=false;
    for(let i=0;i<steps;i++){
      const f=m.rhs(x,params,0); residual=Math.sqrt(vars.reduce((s,v)=>s+Math.pow(f[v]||0,2),0));
      if(!Number.isFinite(residual)){ bad=true; break; }
      const next={}; vars.forEach(v=>{ next[v]=x[v]+dt*(f[v]||0); if(!Number.isFinite(next[v]) || Math.abs(next[v])>1e9) bad=true; });
      x=next; if(residual<1e-8) break;
    }
    return {x,residual,bad};
  }
  function jacobianAt(m, x, params){
    const vars=m.variables, J=[]; const eps=1e-5;
    for(const out of vars){
      const row=[];
      for(const v of vars){
        const h=eps*Math.max(1,Math.abs(x[v]||0)); const xp={...x,[v]:(x[v]||0)+h}, xm={...x,[v]:(x[v]||0)-h};
        const fp=m.rhs(xp,params,0)[out]||0, fm=m.rhs(xm,params,0)[out]||0;
        row.push((fp-fm)/(2*h));
      }
      J.push(row);
    }
    return J;
  }
  function eigApprox(J){
    if(J.length===1) return [{re:J[0][0],im:0}];
    if(J.length===2){ const a=J[0][0], b=J[0][1], c=J[1][0], d=J[1][1]; const tr=a+d, det=a*d-b*c, disc=tr*tr-4*det;
      if(disc>=0){ const r=Math.sqrt(disc); return [{re:(tr+r)/2,im:0},{re:(tr-r)/2,im:0}]; }
      return [{re:tr/2,im:Math.sqrt(-disc)/2},{re:tr/2,im:-Math.sqrt(-disc)/2}];
    }
    // Gershgorin-style lightweight approximation for larger systems.
    return J.map((row,i)=>({re:row[i]||0,im:0,radius:row.reduce((s,v,j)=>s+(i===j?0:Math.abs(v)),0)}));
  }
  function simulateSTEADY(params=state.params, initials=state.initials, opt={}){
    const m=currentModel(); const solved=solveSteady(params,initials,opt); const J=jacobianAt(m,solved.x,params); const eig=eigApprox(J); const dominant=Math.max(...eig.map(e=>e.re));
    const series={}; m.variables.forEach(v=>series[v]=[solved.x[v]]);
    return {kind:'STEADY',t:[0],series,equilibrium:{...solved.x},jacobian:J,eigenvalues:eig,dominant,residual:solved.residual,stable:dominant<0,bad:solved.bad,params:{...params},initials:{...initials},steps:opt.steps||state.steps};
  }
  function simulate(params=state.params, initials=state.initials, opt={}){
    const type=currentModel().type;
    if(type==='CTMC') return simulateCTMC(params,initials,opt);
    if(type==='OPT') return simulateOPT(params,initials,opt);
    if(type==='STEADY') return simulateSTEADY(params,initials,opt);
    return simulateODE(params,initials,opt);
  }

  function metric(res, variable, kind){
    if(res.kind==='OPT'){
      if(kind==='best_objective') return res.best?.f;
      if(kind==='final_objective') return res.series?.f?.at(-1);
      if(kind==='best_x') return res.best?.x;
      if(kind==='best_y') return res.best?.y;
      if(kind==='constraint_residual') return res.best?.constraint || 0;
      if(kind==='path_length'){ let d=0; const xs=res.series?.x||[], ys=res.series?.y||[]; for(let i=1;i<xs.length;i++) d += Math.hypot(xs[i]-xs[i-1],ys[i]-ys[i-1]); return d; }
      if(kind==='iterations_to_tolerance'){ const bf=res.series?.best_f||[]; const target=(res.best?.f||0)+1e-3*Math.max(1,Math.abs(res.best?.f||0)); const idx=bf.findIndex(v=>v<=target); return idx>=0?idx:bf.length-1; }
      return res.best?.f;
    }
    if(res.kind==='STEADY'){
      if(kind==='equilibrium' || kind==='final') return res.equilibrium?.[variable];
      if(kind==='residual') return res.residual;
      if(kind==='dominant_eigenvalue') return res.dominant;
      if(kind==='stability_margin') return -(res.dominant||0);
      if(kind==='absolute_equilibrium') return Math.abs(res.equilibrium?.[variable]||0);
      return res.equilibrium?.[variable];
    }
    const y=res.series[variable] || []; const t=res.t || []; if(!y.length) return NaN;
    if(res.kind==='CTMC'){
      const finals=res.finals?.[variable] || [];
      if(kind==='mean_final' || kind==='final') return mean(finals);
      if(kind==='variance_final') return variance(finals);
      if(kind==='extinction_probability') return finals.length ? finals.filter(v=>v<=0).length/finals.length : NaN;
      if(kind==='max_mean' || kind==='max') return Math.max(...y);
      if(kind==='auc') return auc(t,y);
      if(kind==='time_to_peak') return t[y.indexOf(Math.max(...y))] || 0;
      return mean(finals);
    }
    if(kind==='final') return y[y.length-1];
    if(kind==='max') return Math.max(...y);
    if(kind==='min') return Math.min(...y);
    if(kind==='auc') return auc(t,y);
    if(kind==='amplitude') return Math.max(...y)-Math.min(...y);
    if(kind==='time_to_peak') return t[y.indexOf(Math.max(...y))] || 0;
    return y[y.length-1];
  }
  function mean(a){ return a.length ? a.reduce((x,y)=>x+y,0)/a.length : NaN; }
  function variance(a){ const m=mean(a); return a.length ? a.reduce((s,x)=>s+(x-m)*(x-m),0)/a.length : NaN; }
  function auc(t,y){ let s=0; for(let i=1;i<y.length;i++) s += 0.5*(y[i]+y[i-1])*(t[i]-t[i-1]); return s; }
  function metricOptions(){ const t=currentModel().type; if(t==='CTMC') return ['mean_final','variance_final','extinction_probability','max_mean','auc','time_to_peak']; if(t==='OPT') return ['best_objective','final_objective','best_x','best_y','constraint_residual','path_length','iterations_to_tolerance']; if(t==='STEADY') return ['equilibrium','absolute_equilibrium','residual','dominant_eigenvalue','stability_margin']; return ['final','max','min','auc','amplitude','time_to_peak']; }


  const PLOT_PALETTES = {
    scientific:['#0f52d9','#12b8a6','#f59e0b','#7c3aed','#ef4444','#334155','#06b6d4'],
    colorblind:['#0072B2','#E69F00','#009E73','#D55E00','#CC79A7','#56B4E9','#F0E442'],
    viridis:['#440154','#3b528b','#21918c','#5ec962','#fde725'],
    cividis:['#00204c','#31446b','#666970','#958f78','#c8bc67','#fdea45'],
    turbo:['#30123b','#466be3','#28bceb','#35e56b','#f5e642','#f97316','#7a0403'],
    plasma:['#0d0887','#7e03a8','#cc4778','#f89540','#f0f921'],
    plant:['#1b5e20','#43a047','#a3e635','#facc15','#f97316','#0ea5e9','#14532d'],
    metabolic:['#8b5a00','#d97706','#b91c1c','#7c2d12','#0f766e','#334155','#f59e0b'],
    mono:['#0f172a','#334155','#64748b','#94a3b8','#cbd5e1']
  };
  function paletteColors(){ return state.palette==='custom' ? validCustomCategorical() : (PLOT_PALETTES[state.palette] || PLOT_PALETTES.scientific); }
  function plotColorscale(){ const c=paletteColors(); return c.map((x,i)=>[c.length===1?0:i/(c.length-1),x]); }
  const CONTINUOUS_SCALES = {
    scientific:[[0,'#08306b'],[0.25,'#2171b5'],[0.5,'#6baed6'],[0.75,'#bdd7e7'],[1,'#f7fbff']],
    colorblind:[[0,'#003f5c'],[0.25,'#2f4b7c'],[0.5,'#665191'],[0.75,'#a05195'],[1,'#ff7c43']],
    viridis:[[0,'#440154'],[0.25,'#3b528b'],[0.5,'#21918c'],[0.75,'#5ec962'],[1,'#fde725']],
    cividis:[[0,'#00204c'],[0.2,'#31446b'],[0.4,'#666970'],[0.6,'#958f78'],[0.8,'#c8bc67'],[1,'#fdea45']],
    turbo:[[0,'#30123b'],[0.17,'#466be3'],[0.33,'#28bceb'],[0.50,'#35e56b'],[0.67,'#f5e642'],[0.83,'#f97316'],[1,'#7a0403']],
    plasma:[[0,'#0d0887'],[0.25,'#7e03a8'],[0.5,'#cc4778'],[0.75,'#f89540'],[1,'#f0f921']],
    plant:[[0,'#0f3d2e'],[0.25,'#1b5e20'],[0.5,'#43a047'],[0.75,'#facc15'],[1,'#f97316']],
    metabolic:[[0,'#2f1b0c'],[0.25,'#8b5a00'],[0.5,'#d97706'],[0.75,'#b91c1c'],[1,'#334155']],
    mono:[[0,'#f8fafc'],[0.25,'#cbd5e1'],[0.5,'#64748b'],[0.75,'#334155'],[1,'#0f172a']]
  };
  function continuousColorscale(){ return state.palette==='custom' ? customContinuousColorscale() : (CONTINUOUS_SCALES[state.palette] || CONTINUOUS_SCALES.cividis); }
  function divergingColorscale(){ return [[0,'#2563eb'],[0.5,'#f8fafc'],[1,'#dc2626']]; }
  function normalizeHexColor(value){
    const s=String(value||'').trim();
    if(/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
    if(/^[0-9a-fA-F]{6}$/.test(s)) return ('#'+s).toLowerCase();
    if(/^#[0-9a-fA-F]{3}$/.test(s)) return '#'+s.slice(1).split('').map(ch=>ch+ch).join('').toLowerCase();
    return null;
  }
  function parseColorList(text){
    return String(text||'').split(/[,\s]+/).map(normalizeHexColor).filter(Boolean);
  }
  function validCustomCategorical(){
    const colors=(state.customPalette?.categorical||[]).map(normalizeHexColor).filter(Boolean);
    return colors.length ? colors : PLOT_PALETTES.scientific;
  }
  function customContinuousColorscale(){
    const raw=(state.customPalette?.continuous||[]).map(normalizeHexColor).filter(Boolean);
    const colors = raw.length>=2 ? raw : ['#00204c','#958f78','#fdea45'];
    return colors.map((c,i)=>[colors.length===1?0:i/(colors.length-1),c]);
  }
  function loadCustomPalette(){
    try{
      const raw=localStorage.getItem('fokoLabCustomPalette');
      if(!raw) return;
      const parsed=JSON.parse(raw);
      const categorical=Array.isArray(parsed.categorical)?parsed.categorical.map(normalizeHexColor).filter(Boolean):[];
      const continuous=Array.isArray(parsed.continuous)?parsed.continuous.map(normalizeHexColor).filter(Boolean):[];
      if(categorical.length) state.customPalette.categorical=categorical;
      if(continuous.length>=2) state.customPalette.continuous=continuous;
    }catch(e){ /* ignore malformed localStorage */ }
  }
  function saveCustomPalette(){
    try{ localStorage.setItem('fokoLabCustomPalette', JSON.stringify(state.customPalette)); }catch(e){ /* ignore */ }
  }
  function renderCustomPaletteEditor(){
    const box=$('paletteEditor'); if(!box) return;
    const cat=$('customCatColors'), low=$('customLowColor'), mid=$('customMidColor'), high=$('customHighColor'), preview=$('customPalettePreview');
    const categorical=validCustomCategorical();
    const continuous=(state.customPalette?.continuous||['#00204c','#958f78','#fdea45']).map(normalizeHexColor).filter(Boolean);
    if(cat) cat.value=categorical.join(', ');
    if(low) low.value=continuous[0] || '#00204c';
    if(mid) mid.value=continuous[Math.floor((continuous.length-1)/2)] || '#958f78';
    if(high) high.value=continuous[continuous.length-1] || '#fdea45';
    if(preview){ preview.innerHTML=[...categorical.slice(0,8), ...(continuous.length?continuous:[])].map(c=>`<i style="background:${c}"></i>`).join(''); }
    box.classList.toggle('is-active', state.palette==='custom');
  }
  function applyCustomPaletteFromEditor(){
    const cat=$('customCatColors'), low=$('customLowColor'), mid=$('customMidColor'), high=$('customHighColor');
    const categorical=parseColorList(cat?.value || '').slice(0,16);
    const continuous=[low?.value, mid?.value, high?.value].map(normalizeHexColor).filter(Boolean);
    if(categorical.length) state.customPalette.categorical=categorical;
    if(continuous.length>=2) state.customPalette.continuous=continuous;
    state.palette='custom';
    saveCustomPalette();
    renderPlotPalette();
    renderCards();
    toast('Custom palette applied');
  }
  function resetCustomPalette(){
    state.customPalette={categorical:['#0f52d9','#12b8a6','#f59e0b','#7c3aed','#ef4444','#334155','#06b6d4'], continuous:['#00204c','#958f78','#fdea45']};
    state.palette='custom';
    saveCustomPalette();
    renderPlotPalette();
    renderCards();
    toast('Custom palette reset');
  }

  function axisTitle(text){ return text ? {text,standoff:12,font:{size:12}} : ''; }
  function plotLayout(title,xlabel,ylabel){ return {
    title:{text:title,font:{size:15},x:0.5,xanchor:'center'},
    xaxis:{title:axisTitle(xlabel),zeroline:false,automargin:true,tickfont:{size:11}},
    yaxis:{title:axisTitle(ylabel),zeroline:false,automargin:true,tickfont:{size:11}},
    margin:{l:70,r:48,t:52,b:86},
    paper_bgcolor:'#fff',plot_bgcolor:'#fff',
    legend:{orientation:'h',x:0,xanchor:'left',y:-0.30,yanchor:'top',bgcolor:'rgba(255,255,255,.88)',font:{size:11},itemsizing:'constant'},
    font:{family:'Inter, system-ui, sans-serif',color:'#263246'},
    colorway:paletteColors(),
    hovermode:'closest'
  }; }
  function layoutWithLegend(layout, traceCount){
    const out={...layout};
    out.margin={...(out.margin||{}), b: traceCount>7 ? 110 : (out.margin?.b||86)};
    out.showlegend=traceCount<=12;
    if(traceCount>7) out.legend={...(out.legend||{}),y:-0.36,font:{size:10}};
    return out;
  }
  function paddedRange(values, fallback){
    const finite=values.filter(Number.isFinite);
    if(!finite.length) return fallback;
    let lo=Math.min(...finite), hi=Math.max(...finite);
    if(lo===hi){ const d=Math.max(1,Math.abs(lo)*0.1); return [lo-d,hi+d]; }
    const pad=(hi-lo)*0.06; return [lo-pad,hi+pad];
  }
  function plotConfig(){ return {responsive:true,displaylogo:false,displayModeBar:'hover',modeBarButtonsToRemove:['lasso2d','select2d']}; }
  function sensitivityColorscale(){ return divergingColorscale(); }
  function estimatedEvaluations(card){
    const s=card.settings||{}; const params=Object.keys(currentModel().params||{}).length;
    if(card.type==='contour' || card.type==='landscape'){ const n=Number(s.points||45); return Math.max(1,n*n); }
    if(card.type==='sweep' || card.type==='slice' || card.type==='ecdf' || card.type==='parallel') return Number(s.points||70);
    if(card.type==='gsa' || card.type==='sensitivity' || card.type==='importance' || card.type==='robustness' || card.type==='response') return Math.max(1,2*params+1);
    if(card.type==='radar') return 2;
    if(card.type==='continuation') return Number(s.points||50);
    return 1;
  }
  function plotState(card, title, message, tone='info', actionHtml=''){
    Plotly.purge('plot_'+card.id);
    const toneClass = tone==='warning' ? ' mw-run-warning' : tone==='error' ? ' mw-run-error' : '';
    $('plot_'+card.id).innerHTML=`<div class="mw-run-placeholder${toneClass}"><strong>${safe(title)}</strong><span>${safe(message)}</span>${actionHtml}</div>`;
    $('html_'+card.id).innerHTML='';
  }

  function renderLatexInto(el, formulas){
    if(!el) return; el.innerHTML='';
    formulas.forEach(f=>{ const d=document.createElement('div'); d.className='mw-latex-item';
      const fx=(window.FokoTex&&window.FokoTex.greekify)?window.FokoTex.greekify(String(f)):f;
      if(window.katex){ try{ window.katex.render(fx,d,{throwOnError:false,displayMode:true}); } catch(e){ d.textContent=fx; } }
      else d.textContent=fx;
      el.appendChild(d);
    });
  }
  function renderMathStrip(){ const m=currentModel(); renderLatexInto($('equationPreview'),m.latex||m.equations||[]); }

  function run(){
    $('runStatus').textContent=currentModel().type==='CTMC' ? 'Running ensemble…' : currentModel().type==='OPT' ? 'Optimizing…' : currentModel().type==='STEADY' ? 'Solving steady state…' : 'Integrating…';
    state.result=simulate();
    const res=state.result;
    $('runStatus').textContent = res.kind==='CTMC' ? `Done · ${res.runs} runs · ${res.eventCount} events` : res.kind==='OPT' ? `Done · best f=${fmt(res.best.f,5)} at (${fmt(res.best.x,4)}, ${fmt(res.best.y,4)})` : res.kind==='STEADY' ? `Done · residual ${fmt(res.residual,3)} · ${res.stable?'stable':'unstable / marginal'}` : (res.bad ? 'Stopped: numerical warning' : `Done · ${res.steps} steps`);
    renderCards();
  }
  function debounceRun(){ clearTimeout(debounceRun.timer); debounceRun.timer=setTimeout(run,250); }



  const CUSTOM_MODEL_IDS = new Set();
  const CUSTOM_ODE_EXAMPLE = {
    type:'ODE',
    id:'custom-logistic',
    name:'Custom logistic growth',
    family:'custom user model',
    summary:'Imported ODE example. Edit the JSON and run your own model.',
    variables:['x'], primary:'x',
    params:{r:{value:1,min:0.1,max:3,step:0.05,label:'growth rate'}, K:{value:10,min:1,max:50,step:1,label:'carrying capacity'}},
    initials:{x:1}, tStart:0, tEnd:20, steps:500,
    rhs:{x:'r*x*(1 - x/K)'},
    latex:['\\dot{x}=r x(1-x/K)']
  };
  const CUSTOM_OPT_EXAMPLE = {
    type:'OPT',
    id:'custom-constrained-bowl',
    name:'Custom constrained bowl',
    family:'custom user optimization',
    summary:'Imported 2D optimization example. Edit objective, bounds and penalties.',
    variables:['x','y','f','best_f','constraint'], primary:'best_f',
    params:{x0:{value:-2,min:-5,max:5,step:0.1,label:'initial x'}, y0:{value:2,min:-5,max:5,step:0.1,label:'initial y'}, penalty:{value:25,min:1,max:100,step:1,label:'constraint penalty'}, step:{value:0.5,min:0.05,max:2,step:0.05,label:'search step'}, iterations:{value:220,min:40,max:800,step:20,label:'iterations'}},
    initials:{x:-2,y:2}, bounds:{x:[-5,5],y:[-5,5]},
    objective:'(x-1)^2 + (y+0.5)^2 + penalty*max(0, x+y-1)^2',
    rawObjective:'(x-1)^2 + (y+0.5)^2',
    constraint:'max(0, x+y-1)',
    metrics:{distance:'sqrt((x-1)^2 + (y+0.5)^2)', violation:'max(0, x+y-1)'},
    latex:['x,y\\in[-5,5]','\\min (x-1)^2+(y+0.5)^2+\\lambda\\max(0,x+y-1)^2']
  };
  function customExamples(){ return {ode:CUSTOM_ODE_EXAMPLE,opt:CUSTOM_OPT_EXAMPLE}; }
  function exprIdentifiers(expr){ return [...String(expr).matchAll(/[A-Za-z_]\w*/g)].map(m=>m[0]); }
  function compileExpression(expr, names){
    const raw=String(expr||'0');
    const allowedFns=['max','min','abs','sin','cos','tan','exp','log','sqrt','pow','tanh','PI','E'];
    const allowed=new Set([...names,...allowedFns]);
    const bad=exprIdentifiers(raw).filter(id=>!allowed.has(id));
    if(bad.length) throw new Error(`Unsupported identifier(s) in expression "${raw}": ${[...new Set(bad)].join(', ')}`);
    const js=raw.replace(/\^/g,'**');
    return new Function(...names,...allowedFns, `"use strict"; return Number(${js});`);
  }
  function expressionArgs(names, scope){
    const fns={max:Math.max,min:Math.min,abs:Math.abs,sin:Math.sin,cos:Math.cos,tan:Math.tan,exp:Math.exp,log:Math.log,sqrt:Math.sqrt,pow:Math.pow,tanh:Math.tanh,PI:Math.PI,E:Math.E};
    return [...names.map(n=>scope[n]), fns.max,fns.min,fns.abs,fns.sin,fns.cos,fns.tan,fns.exp,fns.log,fns.sqrt,fns.pow,fns.tanh,fns.PI,fns.E];
  }
  function normalizeParamDef(value, name){
    if(typeof value==='number') return {value, min:value===0?-1:Math.min(value*0.2,value*2), max:value===0?1:Math.max(value*0.2,value*2), step:'any', label:name};
    const v=Number(value.value ?? 1); return {value:v, min:Number(value.min ?? (v===0?-1:Math.min(v*0.2,v*2))), max:Number(value.max ?? (v===0?1:Math.max(v*0.2,v*2))), step:value.step ?? 'any', label:value.label || name};
  }
  function normalizeCustomModel(raw){
    const type=String(raw.type||'ODE').toUpperCase();
    if(!['ODE','OPT'].includes(type)) throw new Error('Custom import currently supports ODE and 2D OPT models. Export Python for heavier models.');
    const id=(raw.id ? String(raw.id) : 'custom-'+Date.now()).replace(/[^a-zA-Z0-9_-]/g,'-');
    const variables=(raw.variables||[]).map(String);
    const params={}; Object.entries(raw.params||{}).forEach(([k,v])=>params[k]=normalizeParamDef(v,k));
    const paramNames=Object.keys(params);
    const model={id, name:raw.name||id, type, family:raw.family||'custom user model', summary:raw.summary||'Imported custom model.', variables:variables.length?variables:(type==='OPT'?['x','y','f','best_f','constraint']:[]), primary:raw.primary||variables[0]||'x', params, initials:raw.initials||{}, tStart:Number(raw.tStart ?? 0), tEnd:Number(raw.tEnd ?? (type==='OPT'?220:20)), steps:Number(raw.steps ?? (type==='OPT'?220:500)), latex:raw.latex||[], equations:raw.equations||[], custom:true};
    if(type==='ODE'){
      const rhsMap=raw.rhs || raw.derivatives || raw.equations;
      if(!rhsMap || typeof rhsMap!=='object' || Array.isArray(rhsMap)) throw new Error('Custom ODE requires a rhs object, e.g. {"x":"r*x*(1-x/K)"}.');
      model.variables=Object.keys(rhsMap);
      model.primary=raw.primary||model.variables[0];
      for(const v of model.variables){ if(model.initials[v]===undefined) model.initials[v]=1; }
      const names=['t',...model.variables,...paramNames];
      const compiled=Object.fromEntries(Object.entries(rhsMap).map(([v,expr])=>[v,compileExpression(expr,names)]));
      model.rhs=(x,p,t)=>{ const scope={t,...x,...p}; const out={}; for(const [v,fn] of Object.entries(compiled)){ const val=fn(...expressionArgs(names,scope)); out[v]=Number.isFinite(val)?val:NaN; } return out; };
      model.equations=Object.entries(rhsMap).map(([v,e])=>`d${v}/dt = ${e}`);
      if(!model.latex.length) model.latex=model.equations;
      return model;
    }
    if(type==='OPT'){
      model.variables=['x','y','f','best_f','constraint']; model.primary='best_f'; model.bounds=raw.bounds||{x:[-5,5],y:[-5,5]};
      model.initials={x:Number(raw.initials?.x ?? raw.params?.x0?.value ?? 0), y:Number(raw.initials?.y ?? raw.params?.y0?.value ?? 0)};
      const names=['x','y',...paramNames];
      const obj=compileExpression(raw.objective||'(x*x+y*y)',names);
      const rawObj=raw.rawObjective?compileExpression(raw.rawObjective,names):obj;
      const con=raw.constraint?compileExpression(raw.constraint,names):null;
      const metricFns={}; Object.entries(raw.metrics||{}).forEach(([k,e])=>metricFns[k]=compileExpression(e,names));
      model.objective=(x,y,p)=>obj(...expressionArgs(names,{x,y,...p}));
      model.rawObjective=(x,y,p)=>rawObj(...expressionArgs(names,{x,y,...p}));
      model.constraint=con ? (x,y,p)=>Math.max(0, con(...expressionArgs(names,{x,y,...p}))) : undefined;
      model.metrics=Object.keys(metricFns).length ? (x,y,p)=>{ const scope={x,y,...p}; const out={}; Object.entries(metricFns).forEach(([k,fn])=>out[k]=fn(...expressionArgs(names,scope))); return out; } : undefined;
      model.equations=[`objective = ${raw.objective||'(x*x+y*y)'}`];
      if(raw.constraint) model.equations.push(`constraint = ${raw.constraint}`);
      if(!model.latex.length) model.latex=model.equations;
      return model;
    }
  }
  function renderCustomModelExample(kind){ const ex=customExamples()[kind]; $('customModelJson').value=JSON.stringify(ex,null,2); $('customModelStatus').textContent=kind==='ode'?'Loaded editable ODE example.':'Loaded editable optimization example.'; }
  function importCustomModelFromTextarea(){
    try{
      const raw=JSON.parse($('customModelJson').value);
      const model=normalizeCustomModel(raw);
      MODELS[model.id]=model; CUSTOM_MODEL_IDS.add(model.id);
      setDefaults(model.id); renderAll(); run();
      $('customModelStatus').textContent=`Imported and ran ${model.name}.`;
      toast('Custom model imported');
    } catch(err){ $('customModelStatus').textContent='Import failed: '+err.message; toast('Custom model import failed'); }
  }

  function renderModelSelect(){
    const sel=$('modelSelect'); sel.innerHTML='';
    const regularGroups={ODE:Object.values(ODE_MODELS),CTMC:Object.values(CTMC_MODELS),STEADY:Object.values(STEADY_MODELS),OPT:Object.values(OPT_MODELS)};
    Object.entries(regularGroups).forEach(([label,models])=>{
      const visible=models.filter(m=>!RESEARCH_MODEL_IDS.has(m.id));
      if(!visible.length) return;
      const optg=document.createElement('optgroup');
      optg.label=label==='CTMC'?'Stochastic / CTMC':label==='STEADY'?'Steady-state':label==='OPT'?'Optimization':label;
      visible.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=m.name; optg.appendChild(o); });
      sel.appendChild(optg);
    });
    const research=Object.values(MODELS).filter(m=>RESEARCH_MODEL_IDS.has(m.id));
    if(research.length){
      const optg=document.createElement('optgroup'); optg.label='Research / portfolio models';
      research.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=m.name; optg.appendChild(o); });
      sel.appendChild(optg);
    }
    ROUTE_MODEL_OPTIONS.forEach(group=>{
      const optg=document.createElement('optgroup'); optg.label=group.group;
      group.items.forEach(item=>{ const o=document.createElement('option'); o.value=item.id; o.textContent=item.name; o.dataset.href=item.href; optg.appendChild(o); });
      sel.appendChild(optg);
    });
    if(CUSTOM_MODEL_IDS.size){
      const optg=document.createElement('optgroup'); optg.label='Custom imported models';
      [...CUSTOM_MODEL_IDS].forEach(id=>{ const m=MODELS[id]; if(m){ const o=document.createElement('option'); o.value=m.id; o.textContent=m.name; optg.appendChild(o); }});
      sel.appendChild(optg);
    }
    sel.value=state.modelId;
  }

  function renderHeader(){
    const m=currentModel(); $('modelTitle').textContent=m.name; $('modelSummary').textContent=m.summary; $('drawerTitle').textContent=m.name;
    const chips=[
      `<span class="mw-chip">${m.type==='CTMC'?'Stochastic CTMC':m.type==='STEADY'?'Steady-state':m.type==='OPT'?'Optimization':m.type}</span>`,
      `<span class="mw-chip">${safe(m.family)}</span>`,
      `<span class="mw-chip">${m.variables.length} variables</span>`,
      `<span class="mw-chip">${Object.keys(m.params).length} parameters</span>`,
      `<span class="mw-chip">${m.type==='CTMC'?m.events.length+' events':m.type==='STEADY'?'equilibrium + stability':m.type==='OPT'?'objective + search':m.equations.length+' equations'}</span>`
    ];
    if(isResearchModel(m)) chips.push('<span class="mw-chip">Research surrogate</span>');
    if(isUnpublishedPlantModel(m)) chips.push('<span class="mw-chip">Unpublished · export disabled</span>');
    $('modelMeta').innerHTML=chips.join('');
    const er=$('exportReport'); if(er){ er.disabled=isUnpublishedPlantModel(m); er.title=isUnpublishedPlantModel(m)?'Disabled for unpublished plant research surrogates':'Export report'; }
    renderMathStrip();
  }

  function renderParameterStrip(){
    const m=currentModel(); const wrap=$('parameterStrip'); wrap.innerHTML='';
    for(const [name,def] of Object.entries(m.params)){
      const value=state.params[name]; const div=document.createElement('div'); div.className='mw-param';
      div.innerHTML=`<div class="mw-param-head"><span class="mw-param-name" title="${safe(def.label||name)}">${safe(name)}</span><span class="mw-param-value" id="pv_${safe(name)}">${fmt(value,5)}</span></div><input type="range" min="${def.min}" max="${def.max}" step="${def.step||'any'}" value="${value}" data-param="${safe(name)}"/><div class="mw-param-scale"><span>${def.min}</span><span>${def.max}</span></div>`;
      wrap.appendChild(div);
    }
    $('tStart').value=state.tStart; $('tEnd').value=state.tEnd; $('steps').value=state.steps;
    const pv=$('primaryVariable'); pv.innerHTML=''; m.variables.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; pv.appendChild(o); }); pv.value=state.primaryVariable;
    const ic=$('initialGrid'); ic.innerHTML='<div class="mw-card-control"><label>Initial conditions</label><span class="mw-note">editable state at t start</span></div>';

    if(m.type==='OPT'){
      ic.innerHTML='<div class="mw-card-control"><label>Optimization controls</label><span class="mw-note">Starting point, step size, iterations and penalties are controlled in the top strip. Objective landscape uses the problem bounds.</span></div>';
    } else {
      if(m.type==='STEADY'){ ic.innerHTML='<div class="mw-card-control"><label>Initial guess</label><span class="mw-note">Starting point for equilibrium relaxation.</span></div>'; }
      m.variables.forEach(v=>{ const label=document.createElement('label'); label.innerHTML=`${safe(v)}<input type="number" step="0.001" value="${state.initials[v]}" data-initial="${safe(v)}"/>`; ic.appendChild(label); });
      if(m.type==='CTMC'){
        const runs=document.createElement('label'); runs.innerHTML=`ensemble runs<input id="runs" type="number" min="5" max="800" step="5" value="${state.runs}"/>`; ic.appendChild(runs);
        const seed=document.createElement('label'); seed.innerHTML=`random seed<input id="seed" type="number" min="1" max="999999" step="1" value="${state.seed}"/>`; ic.appendChild(seed);
      }
    }
  }
  function renderAnalysisTypeSelect(){
    const sel=$('analysisType'); const m=currentModel();
    const opts=m.type==='OPT' ? [['convergence','Optimization history'],['landscape','Contour / heatmap'],['importance','Parameter importance'],['parallel','Parallel coordinates'],['pareto','Pareto front'],['slice','Slice / partial dependence'],['ecdf','ECDF'],['radar','Multi-objective radar'],['trajectory','Step / trajectory'],['constraints','Constraint violation'],['activeConstraints','Active constraints'],['equations','Objective math'],['diagnostics','Diagnostics']] : m.type==='STEADY' ? [['equilibrium','Equilibrium'],['continuation','Continuation'],['stability','Stability'],['response','MCA / response'],['gsa','GSA / response ranking'],['sensitivity','Sensitivity heatmap'],['equations','Equation math'],['diagnostics','Diagnostics']] : m.type==='CTMC' ? [['ensemble','Ensemble trajectories'],['distribution','Final distribution'],['sweep','Parameter sweep'],['contour','2D heatmap / contour'],['gsa','GSA / sensitivity ranking'],['sensitivity','Sensitivity heatmap'],['equations','Reaction math'],['diagnostics','Diagnostics']] : [['timecourse','Time course'],['phase','Phase portrait'],['sweep','Parameter sweep'],['contour','2D heatmap / contour'],['gsa','GSA / sensitivity ranking'],['sensitivity','Sensitivity heatmap'],['equations','Equation math'],['diagnostics','Diagnostics']];
    sel.innerHTML=opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
  }

  function renderOptimizationPalette(){
    const pal=$('optimizationPlotPalette'); if(!pal) return;
    const m=currentModel(); pal.classList.toggle('show', m.type==='OPT');
  }
  function renderPlotPalette(){ const el=$('plotPalette'); if(el) el.value=state.palette; renderCustomPaletteEditor(); }

  function cardTitle(type){
    const m=currentModel(); const map={
      timecourse:['Time course','Trajectory of each state variable over time.'],
      phase:['Phase portrait','State-space view using two selected variables.'],
      ensemble:['Ensemble trajectories','Sample paths plus the ensemble mean for a stochastic model.'],
      distribution:['Final distribution','Histogram of final ensemble values for a selected state.'],
      sweep:['Parameter sweep','One-parameter scan of a trajectory or ensemble metric.'],
      contour:['2D heatmap / contour','Two-parameter scan rendered as heatmap or contour surface.'],
      gsa:['Ranked sensitivity bar chart','Easy first view: ranked local/range parameter effects, with SALib export for true GSA.'],
      sensitivity:['Sensitivity heatmap','Parameter-by-metric local response heatmap.'],
      equations:[m.type==='CTMC'?'Reaction math':m.type==='OPT'?'Objective math':'Equation math','LaTeX-rendered model definition.'],
      equilibrium:['Equilibrium','Solved steady state and residual.'],
      continuation:['Continuation','One-parameter continuation of equilibrium or stability metrics.'],
      stability:['Stability','Jacobian and local eigenvalue classification.'],
      response:['MCA / response','Local parameter response coefficients around the equilibrium.'],
      convergence:['Optimization history','Current, best and accepted objective values over search iterations.'],
      landscape:['Contour / heatmap plot','Objective landscape with accepted search path and best point.'],
      importance:['Parameter importance','Local screen of how parameters or algorithm settings move the chosen optimization metric.'],
      parallel:['Parallel coordinates','Search-path or landscape-sample view across decision variables, objective and constraints.'],
      slice:['Slice / partial dependence','One-dimensional objective slice through the current best point.'],
      ecdf:['ECDF','Empirical cumulative distribution of objective values from search history or landscape samples.'],
      radar:['Multi-objective radar','Spider chart comparing objective, constraint, cost/risk and model-specific outputs at the best point.'],
      trajectory:['Step / simulation trajectory','Iteration trajectory of decision variables, objective and constraint residual.'],
      robustness:['Robustness / sensitivity','Deprecated alias for parameter importance.'],
      diagnostics:['Diagnostics','Numerical status, model summary and output metrics.']
    };
    return map[type] || [type,'Analysis'];
  }
  function makeSelect(name, options, value){ return `<select data-setting="${name}">${options.map(o=>`<option value="${o}" ${o===value?'selected':''}>${o}</option>`).join('')}</select>`; }
  function makeMetricSelect(value){ const opts=metricOptions(); return makeSelect('metric',opts,value||opts[0]); }
  function makeCard(card){
    const [title,sub]=cardTitle(card.type); const el=document.createElement('article'); el.className='mw-card'; el.dataset.cardId=card.id; el.dataset.type=card.type;
    const exportActions = isUnpublishedPlantModel() ? '' : '<button data-action="export-png" title="Export PNG">▣</button><button data-action="export-json" title="Export data JSON">{}</button>';
    el.innerHTML=`<div class="mw-card-head"><div class="mw-card-title"><h3>${title}</h3><p>${sub}</p></div><div class="mw-card-actions">${exportActions}<button data-action="duplicate" title="Duplicate analysis">＋</button><button data-action="remove" title="Remove analysis">×</button></div></div>${isUnpublishedPlantModel()?protectedNotice():''}${controlsFor(card)}<div class="mw-plot" id="plot_${card.id}"></div><div class="mw-html-result" id="html_${card.id}"></div>`;
    return el;
  }
  function controlsFor(card){
    const m=currentModel(); const s=card.settings; const vars=m.variables; const params=Object.keys(m.params);
    if(card.type==='equilibrium') return '';
    if(card.type==='stability') return '';
    if(card.type==='continuation') return `<div class="mw-card-controls"><div class="mw-card-control"><label>parameter</label>${makeSelect('param',params,s.param||params[0])}</div><div class="mw-card-control"><label>output</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric||'equilibrium')}</div><div class="mw-card-control"><label>points</label><input type="number" min="10" max="120" step="5" data-setting="points" value="${s.points||50}"/></div></div>`;
    if(card.type==='response') return `<div class="mw-card-controls"><div class="mw-card-control"><label>output</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric||'equilibrium')}</div><div class="mw-card-control"><label>range ±</label><input type="number" min="0.01" max="0.8" step="0.01" data-setting="range" value="${s.range||0.2}"/></div><div class="mw-card-control"><label>method</label>${makeSelect('method',['browser screen','Morris export','Sobol export'],s.method||'browser screen')}</div></div>`;
    if(card.type==='convergence') return `<div class="mw-card-controls"><div class="mw-card-control"><label>display</label>${makeSelect('display',['best + current','best only','current only'],s.display||'best + current')}</div></div>`;
    if(card.type==='landscape') return `<div class="mw-card-controls"><div class="mw-card-control"><label>points</label><input type="number" min="20" max="90" step="5" data-setting="points" value="${s.points||45}"/></div><div class="mw-card-control"><label>display</label>${makeSelect('display',['heatmap','contour','heatmap + contour'],s.display||'heatmap + contour')}</div></div>`;
    if(card.type==='importance') return `<div class="mw-card-controls"><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric||'best_objective')}</div><div class="mw-card-control"><label>range ±</label><input type="number" min="0.01" max="0.8" step="0.01" data-setting="range" value="${s.range||0.2}"/></div><div class="mw-card-control"><label>method</label>${makeSelect('method',['browser screen','Morris export','Sobol export'],s.method||'browser screen')}</div></div>`;
    if(card.type==='parallel') return `<div class="mw-card-controls"><div class="mw-card-control"><label>source</label>${makeSelect('source',['search path','landscape sample'],s.source||'search path')}</div><div class="mw-card-control"><label>points</label><input type="number" min="20" max="120" step="5" data-setting="points" value="${s.points||60}"/></div></div>`;
    if(card.type==='slice') return `<div class="mw-card-controls"><div class="mw-card-control"><label>variable</label>${makeSelect('axis',['x','y'],s.axis||'x')}</div><div class="mw-card-control"><label>points</label><input type="number" min="20" max="120" step="5" data-setting="points" value="${s.points||70}"/></div><div class="mw-card-control"><label>scale</label>${makeSelect('scale',['raw objective','normalized'],s.scale||'raw objective')}</div></div>`;
    if(card.type==='ecdf') return `<div class="mw-card-controls"><div class="mw-card-control"><label>source</label>${makeSelect('source',['search path','landscape sample'],s.source||'search path')}</div><div class="mw-card-control"><label>points</label><input type="number" min="20" max="120" step="5" data-setting="points" value="${s.points||70}"/></div></div>`;
    if(card.type==='radar') return `<div class="mw-card-controls"><div class="mw-card-control"><label>compare</label>${makeSelect('compare',['best point','start vs best'],s.compare||'best point')}</div></div>`;
    if(card.type==='trajectory') return `<div class="mw-card-controls"><div class="mw-card-control"><label>display</label>${makeSelect('display',['decision variables','objective + constraint','all'],s.display||'all')}</div></div>`;
    if(card.type==='robustness') return `<div class="mw-card-controls"><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric||'best_objective')}</div><div class="mw-card-control"><label>range ±</label><input type="number" min="0.01" max="0.8" step="0.01" data-setting="range" value="${s.range||0.2}"/></div><div class="mw-card-control"><label>method</label>${makeSelect('method',['browser screen','Morris export','Sobol export'],s.method||'browser screen')}</div></div>`;
    if(card.type==='timecourse') return `<div class="mw-card-controls"><div class="mw-card-control"><label>display</label>${makeSelect('display',['all','primary'],s.display||'all')}</div></div>`;
    if(card.type==='ensemble') return `<div class="mw-card-controls"><div class="mw-card-control"><label>state</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>paths shown</label><input type="number" min="5" max="40" step="1" data-setting="paths" value="${s.paths||18}"/></div></div>`;
    if(card.type==='distribution') return `<div class="mw-card-controls"><div class="mw-card-control"><label>state</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>bins</label><input type="number" min="5" max="60" step="1" data-setting="bins" value="${s.bins||25}"/></div></div>`;
    if(card.type==='phase') return `<div class="mw-card-controls"><div class="mw-card-control"><label>x axis</label>${makeSelect('xvar',vars,s.xvar||vars[0])}</div><div class="mw-card-control"><label>y axis</label>${makeSelect('yvar',vars,s.yvar||vars[Math.min(1,vars.length-1)])}</div></div>`;
    if(card.type==='sweep') return `<div class="mw-card-controls"><div class="mw-card-control"><label>parameter</label>${makeSelect('param',params,s.param||params[0])}</div><div class="mw-card-control"><label>output</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric)}</div><div class="mw-card-control"><label>points</label><input type="number" min="5" max="100" step="1" data-setting="points" value="${s.points||25}"/></div></div>`;
    if(card.type==='contour') return `<div class="mw-card-controls"><div class="mw-card-control"><label>x parameter</label>${makeSelect('xparam',params,s.xparam||params[0])}</div><div class="mw-card-control"><label>y parameter</label>${makeSelect('yparam',params,s.yparam||params[Math.min(1,params.length-1)]||params[0])}</div><div class="mw-card-control"><label>output</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric)}</div><div class="mw-card-control"><label>points</label><input type="number" min="5" max="28" step="1" data-setting="points" value="${s.points||14}"/></div><div class="mw-card-control"><label>display</label>${makeSelect('display',['heatmap','contour','heatmap + contour'],s.display||'heatmap + contour')}</div></div>`;
    if(card.type==='gsa') return `<div class="mw-card-controls"><div class="mw-card-control"><label>output</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric)}</div><div class="mw-card-control"><label>range ±</label><input type="number" min="0.01" max="0.8" step="0.01" data-setting="range" value="${s.range||0.2}"/></div><div class="mw-card-control"><label>method</label>${makeSelect('method',['browser screen','Morris export','Sobol export'],s.method||'browser screen')}</div></div>`;
    if(card.type==='sensitivity') return `<div class="mw-card-controls"><div class="mw-card-control"><label>range ±</label><input type="number" min="0.01" max="0.8" step="0.01" data-setting="range" value="${s.range||0.2}"/></div><div class="mw-card-control"><label>screen</label>${makeSelect('screen',['parameter × metric','parameter × variable'],s.screen||'parameter × metric')}</div><div class="mw-card-control"><label>scale</label>${makeSelect('scale',['diverging around zero','selected palette'],s.scale||'diverging around zero')}</div></div>`;
    return '';
  }

  function renderCards(){ const grid=$('analysisGrid'); grid.innerHTML=''; state.cards.forEach(card=>grid.appendChild(makeCard(card))); requestAnimationFrame(()=>state.cards.forEach(drawCard)); }
  function drawCard(card){
    if(!state.result) state.result=simulate();
    const type=card.type;
    if(type==='equilibrium') drawEquilibrium(card); else if(type==='constraints') drawOptConstraints(card); else if(type==='activeConstraints') drawOptActiveConstraints(card); else if(type==='pareto') drawOptPareto(card); else if(type==='importance') drawOptImportance(card); else if(type==='parallel') drawOptParallel(card); else if(type==='slice') drawOptSlice(card); else if(type==='ecdf') drawOptECDF(card); else if(type==='radar') drawOptRadar(card); else if(type==='trajectory') drawOptTrajectory(card); else if(type==='continuation') drawContinuation(card); else if(type==='stability') drawStability(card); else if(type==='response') drawResponse(card); else if(type==='convergence') drawConvergence(card); else if(type==='landscape') drawLandscape(card); else if(type==='robustness') drawOptImportance(card); else if(type==='timecourse') drawTimecourse(card); else if(type==='phase') drawPhase(card); else if(type==='ensemble') drawEnsemble(card); else if(type==='distribution') drawDistribution(card); else if(type==='sweep') drawSweep(card); else if(type==='contour') drawContour(card); else if(type==='gsa') drawGSA(card); else if(type==='sensitivity') drawSensitivityHeatmap(card); else if(type==='equations') drawEquations(card); else if(type==='diagnostics') drawDiagnostics(card);
  }

  function drawEquilibrium(card){
    const res=state.result; const vars=currentModel().variables; const vals=vars.map(v=>res.equilibrium[v]);
    Plotly.react('plot_'+card.id,[{x:vars,y:vals,type:'bar',name:'equilibrium'}],plotLayout('Steady-state equilibrium','state','value'),plotConfig());
    $('html_'+card.id).innerHTML=`<table class="mw-table"><thead><tr><th>state</th><th>equilibrium</th></tr></thead><tbody>${vars.map(v=>`<tr><td>${safe(v)}</td><td>${fmt(res.equilibrium[v],6)}</td></tr>`).join('')}</tbody></table><p class="mw-note">Residual ${fmt(res.residual,6)}. Local classification: ${res.stable?'stable':'unstable / marginal'}.</p>`;
  }
  function drawContinuation(card){
    if(needsManualRun(card)) return drawManualCard(card,'Continuation','Run a one-parameter equilibrium continuation and stability screen.');
    const m=currentModel(), pName=card.settings.param||Object.keys(m.params)[0], variable=card.settings.variable||state.primaryVariable, kind=card.settings.metric||'equilibrium';
    const pDef=m.params[pName]; const n=clamp(Math.round(card.settings.points||50),10,120); const xs=[], ys=[], dom=[];
    for(let i=0;i<n;i++){ const val=pDef.min+(pDef.max-pDef.min)*i/(n-1); const p={...state.params,[pName]:val}; const res=simulateSTEADY(p,state.initials,{steps:Math.min(state.steps,1600)}); xs.push(val); ys.push(metric(res,variable,kind)); dom.push(res.dominant); }
    const traces=[{x:xs,y:ys,type:'scatter',mode:'lines+markers',name:`${kind}(${variable})`}];
    if(kind!=='dominant_eigenvalue') traces.push({x:xs,y:dom,type:'scatter',mode:'lines',name:'dominant eigenvalue',yaxis:'y2'});
    Plotly.react('plot_'+card.id,traces,{...plotLayout(`Continuation: ${pName}` ,pName,kind),yaxis2:{title:'dominant eigenvalue',overlaying:'y',side:'right',showgrid:false},legend:{orientation:'h',y:-0.25}},plotConfig());
    $('html_'+card.id).innerHTML=`<p class="mw-note">One-parameter continuation over ${n} values. Stability changes when the dominant eigenvalue crosses zero.</p>`;
  }
  function drawStability(card){
    const res=state.result; const eig=res.eigenvalues||[];
    const labels=eig.map((e,i)=>`λ${i+1}`); const real=eig.map(e=>e.re); const imag=eig.map(e=>e.im||0);
    Plotly.react('plot_'+card.id,[{x:labels,y:real,type:'bar',name:'real part'},{x:labels,y:imag,type:'bar',name:'imaginary part'}],plotLayout('Local stability eigenvalues','eigenvalue','value'),plotConfig());
    const jrows=(res.jacobian||[]).map((row,i)=>`<tr><th>${safe(currentModel().variables[i])}</th>${row.map(v=>`<td>${fmt(v,5)}</td>`).join('')}</tr>`).join('');
    $('html_'+card.id).innerHTML=`<p class="mw-note">Dominant real part: ${fmt(res.dominant,5)}. Classification: <strong>${res.stable?'locally stable':'unstable / marginal'}</strong>.</p><table class="mw-table"><thead><tr><th>Jacobian</th>${currentModel().variables.map(v=>`<th>${safe(v)}</th>`).join('')}</tr></thead><tbody>${jrows}</tbody></table>`;
  }
  function drawResponse(card){
    if(needsManualRun(card)) return drawManualCard(card,'MCA / response','Run a local response screen around the current equilibrium.');
    const variable=card.settings.variable||state.primaryVariable, kind=card.settings.metric||'equilibrium', r=clamp(Number(card.settings.range||0.2),0.01,0.8);
    const rows=sensitivityRows(variable,kind,r);
    Plotly.react('plot_'+card.id,[{x:rows.map(r=>r.effect),y:rows.map(r=>r.param),type:'bar',orientation:'h',text:rows.map(r=>fmt(r.signed,3)),name:'response'}],{...plotLayout(`Response: ${kind}(${variable})`,'normalized response','parameter'),margin:{l:95,r:25,t:48,b:55}},plotConfig());
    $('html_'+card.id).innerHTML=`<table class="mw-table mw-compact-table"><thead><tr><th>parameter</th><th>signed response</th><th>absolute effect</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(r.param)}</td><td>${fmt(r.signed,5)}</td><td>${fmt(r.effect,5)}</td></tr>`).join('')}</tbody></table><p class="mw-note">Browser local response screen. Export Morris/Sobol for a full SALib workflow.</p>`;
  }
  function drawConvergence(card){
    const res=state.result; const display=card.settings.display||'best + current'; const traces=[];
    if(display!=='best only') traces.push({x:res.t,y:res.series.f,type:'scatter',mode:'lines',name:'current objective'});
    if(display!=='current only') traces.push({x:res.t,y:res.series.best_f,type:'scatter',mode:'lines',name:'best objective',line:{width:4}});
    const layout=layoutWithLegend(plotLayout('Optimization convergence','iteration','objective'),traces.length);
    layout.yaxis.type=(card.settings.scale||'linear')==='log'?'log':'linear';
    Plotly.react('plot_'+card.id,traces,layout,plotConfig());
    $('html_'+card.id).innerHTML=`<p class="mw-note">Best f=${fmt(res.best.f,5)} at x=${fmt(res.best.x,5)}, y=${fmt(res.best.y,5)}. Accepted moves: ${res.accepted}/${res.steps}. Use log scale only for strictly positive objectives.</p>`;
  }
  function drawLandscape(card){
    const m=currentModel(), res=state.result; const bounds=m.bounds||{x:[-5,5],y:[-5,5]}; const n=clamp(Math.round(card.settings.points||45),20,90);
    const pathX=res.series.x||[], pathY=res.series.y||[];
    const xrange=paddedRange([...(bounds.x||[]),...pathX,res.best.x],bounds.x);
    const yrange=paddedRange([...(bounds.y||[]),...pathY,res.best.y],bounds.y);
    const xs=[], ys=[], z=[];
    for(let i=0;i<n;i++) xs.push(xrange[0]+(xrange[1]-xrange[0])*i/(n-1));
    for(let j=0;j<n;j++) ys.push(yrange[0]+(yrange[1]-yrange[0])*j/(n-1));
    for(let j=0;j<n;j++){ const row=[]; for(let i=0;i<n;i++){ const val=m.objective(xs[i],ys[j],state.params); row.push(Number.isFinite(val)?val:null); } z.push(row); }
    const display=card.settings.display||'heatmap + contour'; let base;
    if(display==='heatmap') base={x:xs,y:ys,z,type:'heatmap',colorscale:continuousColorscale(),name:'objective',colorbar:{title:'f',len:.72,thickness:14,x:1.03}};
    else base={x:xs,y:ys,z,type:'contour',colorscale:continuousColorscale(),contours:{coloring:display==='contour'?'lines':'heatmap',showlabels:display!=='heatmap'},name:'objective',colorbar:{title:'f',len:.72,thickness:14,x:1.03}};
    const path={x:pathX,y:pathY,type:'scatter',mode:'lines+markers',name:'search path',line:{width:3},marker:{size:4},cliponaxis:true};
    const best={x:[res.best.x],y:[res.best.y],type:'scatter',mode:'markers',name:'best point',marker:{size:12,symbol:'x',line:{width:2}},cliponaxis:true};
    const layout=layoutWithLegend(plotLayout('Objective landscape','x','y'),3);
    layout.xaxis.range=xrange;
    layout.yaxis.range=yrange;
    layout.margin={l:64,r:88,t:52,b:105};
    layout.legend={orientation:'h',y:-0.28,x:0.02,xanchor:'left',yanchor:'top'};
    Plotly.react('plot_'+card.id,[base,path,best],layout,plotConfig());
    $('html_'+card.id).innerHTML='<p class="mw-note">Landscape is evaluated over the visible axis range and overlays the accepted bounded search path. If a problem has bounds, the browser optimizer now keeps proposals inside those bounds.</p>';
  }

function drawOptConstraints(card){
  const res=state.result; const trace={x:res.t,y:res.series.constraint||[],type:'scatter',mode:'lines',name:'constraint residual',line:{width:3}};
  const layout=plotLayout('Constraint residual along search','iteration','residual'); layout.yaxis={...layout.yaxis,type:'log'}; Plotly.react('plot_'+card.id,[trace],layout,plotConfig());
  $('html_'+card.id).innerHTML=`<p class="mw-note">Best-point residual ${fmt(res.best.constraint,5)}. This separates objective progress from feasibility.</p>`;
}
function drawOptActiveConstraints(card){
  const m=currentModel(), res=state.result; const rows=[]; const x=res.best.x, y=res.best.y, p=state.params;
  rows.push({name:'aggregate residual',value:m.constraint?m.constraint(x,y,p):0});
  if(m.metrics){ Object.entries(m.metrics(x,y,p)).forEach(([k,v])=>rows.push({name:k,value:v})); }
  rows.push({name:'best x',value:x}); rows.push({name:'best y',value:y});
  Plotly.react('plot_'+card.id,[{x:rows.map(r=>r.value),y:rows.map(r=>r.name),type:'bar',orientation:'h',name:'diagnostic'}],{...plotLayout('Active constraints and model diagnostics','value','quantity'),margin:{l:130,r:25,t:55,b:55}},plotConfig());
  $('html_'+card.id).innerHTML='<p class="mw-note">For compact Workbench models, explicit constraints are summarized as aggregate residual plus model-specific diagnostic quantities.</p>';
}
function drawOptPareto(card){
  const m=currentModel(); const bounds=m.bounds||{x:[-5,5],y:[-5,5]}; const n=42, pts=[];
  for(let i=0;i<n;i++) for(let j=0;j<n;j++){
    const x=bounds.x[0]+(bounds.x[1]-bounds.x[0])*i/(n-1), y=bounds.y[0]+(bounds.y[1]-bounds.y[0])*j/(n-1);
    const f=m.rawObjective?m.rawObjective(x,y,state.params):m.objective(x,y,state.params); const c=m.constraint?m.constraint(x,y,state.params):0;
    const cost=(m.metrics&&m.metrics(x,y,state.params).waterCost!==undefined)?m.metrics(x,y,state.params).waterCost:(x*x+y*y);
    if(Number.isFinite(f)&&Number.isFinite(cost)&&c<1e-6) pts.push({x,y,f,cost});
  }
  const flags=pts.map((p,i)=>!pts.some((q,j)=>j!==i && q.f<=p.f && q.cost<=p.cost && (q.f<p.f || q.cost<p.cost)));
  Plotly.react('plot_'+card.id,[{x:pts.filter((_,i)=>!flags[i]).map(p=>p.f),y:pts.filter((_,i)=>!flags[i]).map(p=>p.cost),mode:'markers',type:'scatter',name:'dominated feasible points',marker:{size:5,opacity:.35}},{x:pts.filter((_,i)=>flags[i]).map(p=>p.f),y:pts.filter((_,i)=>flags[i]).map(p=>p.cost),mode:'markers+lines',type:'scatter',name:'non-dominated screen',marker:{size:7}}],plotLayout('Pareto screen: objective vs cost/risk','objective','secondary cost / risk'),plotConfig());
  $('html_'+card.id).innerHTML='<p class="mw-note">This is a browser Pareto screen over the 2D surrogate, not a full multi-objective optimizer.</p>';
}


function isConstrainedModel(m){ return !!m.constraint && (m.id==='constrained' || m.variables.includes('constraint') || /constraint|risk|trade|thermal|hydraulic|trait|dose|reservoir|traffic/i.test((m.name+' '+m.family+' '+m.summary))); }
function isTradeoffModel(m){ return !!m.metrics || /trade|pareto|risk|hydraulic|trait|thermal|dose|reservoir|traffic|allocation/i.test((m.name+' '+m.family+' '+m.summary)); }
function sampleLandscape(m, n){
  const bounds=m.bounds||{x:[-5,5],y:[-5,5]}, pts=[];
  for(let i=0;i<n;i++) for(let j=0;j<n;j++){
    const x=bounds.x[0]+(bounds.x[1]-bounds.x[0])*i/Math.max(1,n-1), y=bounds.y[0]+(bounds.y[1]-bounds.y[0])*j/Math.max(1,n-1);
    const f=m.rawObjective?m.rawObjective(x,y,state.params):m.objective(x,y,state.params); const c=m.constraint?m.constraint(x,y,state.params):0;
    let metrics={}; if(m.metrics) metrics=m.metrics(x,y,state.params);
    const cost=metrics.waterCost!==undefined?metrics.waterCost:(metrics.risk!==undefined?metrics.risk:(x*x+y*y));
    if(Number.isFinite(f)) pts.push({x,y,f,constraint:c||0,cost,...metrics});
  }
  return pts;
}
function drawOptImportance(card){
  if(needsManualRun(card)){ Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML=`<div class="mw-run-placeholder"><strong>Parameter / hyperparameter importance</strong><span>Run a local screen of how algorithm settings, penalties or model parameters move the selected optimization metric.</span><button class="mw-primary" data-run-card="${card.id}" type="button">Run importance screen</button><button class="mw-secondary" data-export-salib="${card.id}" type="button">Export SALib script</button></div>`; $('html_'+card.id).innerHTML='<p class="mw-note">Browser result is a local/range screen. Use Python export for Morris/Sobol.</p>'; return; }
  const kind=card.settings.metric||'best_objective', r=clamp(Number(card.settings.range||0.2),0.01,0.8); const rows=sensitivityRows(state.primaryVariable,kind,r);
  Plotly.react('plot_'+card.id,[{x:rows.map(r=>r.effect),y:rows.map(r=>r.param),type:'bar',orientation:'h',text:rows.map(r=>fmt(r.signed,3)),name:'effect'}],{...plotLayout(`Parameter importance: ${kind}`,'normalized effect','parameter / setting'),margin:{l:115,r:25,t:52,b:55}},plotConfig());
  $('html_'+card.id).innerHTML=`<table class="mw-table mw-compact-table"><thead><tr><th>parameter</th><th>signed</th><th>absolute</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(r.param)}</td><td>${fmt(r.signed,4)}</td><td>${fmt(r.effect,4)}</td></tr>`).join('')}</tbody></table><p class="mw-note">Relevant for tuning and robustness. This is not a variance-based Sobol result unless exported and run in Python.</p>`;
}
function drawOptParallel(card){
  if(needsManualRun(card)) return drawManualCard(card,'Parallel coordinates','Render the search path or a feasible landscape sample across x, y, objective and constraint/risk dimensions.');
  const m=currentModel(), res=state.result; const n=clamp(Math.round(card.settings.points||60),20,120); const source=card.settings.source||'search path';
  const pts=source==='landscape sample'?sampleLandscape(m,Math.max(5,Math.round(Math.sqrt(n)))):res.path.slice(Math.max(0,res.path.length-n)).map(p=>({x:p.x,y:p.y,f:p.f,constraint:p.constraint||0,cost:(m.metrics?((m.metrics(p.x,p.y,state.params).waterCost ?? m.metrics(p.x,p.y,state.params).risk) || 0):Math.hypot(p.x,p.y))}));
  const keys=['x','y','f','constraint','cost'].filter(k=>pts.some(p=>Number.isFinite(p[k])));
  const dims=keys.map(k=>({label:k,values:pts.map(p=>p[k])}));
  if(dims.length<2){ plotState(card,'Parallel coordinates not available','This plot requires at least two numeric dimensions from the search path or landscape sample.','warning'); return; }
  const spanCheck=dims.map(d=>Math.max(...d.values)-Math.min(...d.values)).filter(Number.isFinite);
  if(spanCheck.length && spanCheck.every(v=>Math.abs(v)<1e-9)){ plotState(card,'Parallel coordinates not informative','All displayed dimensions are nearly constant. Try a landscape sample source, increase iterations, or use a trade-off/constrained model.','warning'); return; }
  const pcLayout={margin:{l:44,r:78,t:70,b:48},paper_bgcolor:'#fff',font:{family:'Inter, system-ui, sans-serif',color:'#263246',size:11},showlegend:false};
  Plotly.react('plot_'+card.id,[{type:'parcoords',dimensions:dims,line:{color:pts.map(p=>p.f),colorscale:continuousColorscale(),showscale:true,colorbar:{title:'f',thickness:14}}}],pcLayout,plotConfig());
  $('html_'+card.id).innerHTML='<p class="mw-note">Use this when multiple quantities matter. If the lines collapse into one band, the current search path contains little variation; switch source to landscape sample or use a richer trade-off problem.</p>';
}
function drawOptSlice(card){
  if(needsManualRun(card)) return drawManualCard(card,'Slice / partial dependence','Compute a one-dimensional slice of the objective around the current best point.');
  const m=currentModel(), res=state.result, axis=card.settings.axis||'x', bounds=m.bounds||{x:[-5,5],y:[-5,5]}, n=clamp(Math.round(card.settings.points||70),20,120); const xs=[], ys=[]; const fixed=axis==='x'?res.best.y:res.best.x;
  for(let i=0;i<n;i++){ const v=bounds[axis][0]+(bounds[axis][1]-bounds[axis][0])*i/(n-1); const f=axis==='x'?m.objective(v,fixed,state.params):m.objective(fixed,v,state.params); xs.push(v); ys.push(f); }
  const yplot=(card.settings.scale||'raw objective')==='normalized'?ys.map(v=>(v-Math.min(...ys))/(Math.max(...ys)-Math.min(...ys)+1e-12)):ys;
  const bestv=axis==='x'?res.best.x:res.best.y;
  const sliceLayout=layoutWithLegend(plotLayout(`Slice plot: ${axis} | ${axis==='x'?'y':'x'} fixed`,axis,'objective'),2);
  sliceLayout.xaxis.range=paddedRange([...xs,bestv],bounds[axis]);
  Plotly.react('plot_'+card.id,[{x:xs,y:yplot,type:'scatter',mode:'lines',name:'objective slice'},{x:[bestv],y:[(card.settings.scale||'raw objective')==='normalized'?0:res.best.f],type:'scatter',mode:'markers',name:'best point',marker:{size:11,symbol:'x'},cliponaxis:false}],sliceLayout,plotConfig());
  $('html_'+card.id).innerHTML='<p class="mw-note">Partial-dependence style slice: one decision variable changes while the other is fixed at the best point.</p>';
}
function drawOptECDF(card){
  if(needsManualRun(card)) return drawManualCard(card,'ECDF','Compute the empirical cumulative distribution of objective values from search history or landscape samples.');
  const m=currentModel(), res=state.result, source=card.settings.source||'search path', n=clamp(Math.round(card.settings.points||70),20,120); let vals=[];
  if(source==='landscape sample') vals=sampleLandscape(m,Math.max(5,Math.round(Math.sqrt(n)))).map(p=>p.f); else vals=[...(res.series.f||[])];
  vals=vals.filter(Number.isFinite).sort((a,b)=>a-b); if(!vals.length){ plotState(card,'ECDF not available','No finite objective values were found. Run optimization first or switch the ECDF source.','warning'); return; } const y=vals.map((_,i)=>(i+1)/vals.length);
  Plotly.react('plot_'+card.id,[{x:vals,y,type:'scatter',mode:'lines',name:'ECDF'}],layoutWithLegend(plotLayout(`ECDF of objective values (${source})`,'objective value','cumulative probability'),1),plotConfig());
  $('html_'+card.id).innerHTML='<p class="mw-note">ECDF shows whether most tried points are poor and whether the optimizer found a rare good basin.</p>';
}
function drawOptRadar(card){
  const m=currentModel(), res=state.result; if(!isTradeoffModel(m)){ Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML='<div class="mw-run-placeholder"><strong>Radar not relevant</strong><span>This plot is useful for multi-objective or diagnostic trade-off models, not for a single-objective toy benchmark.</span></div>'; $('html_'+card.id).innerHTML=''; return; }
  if(needsManualRun(card)) return drawManualCard(card,'Multi-objective radar','Compare best point against the starting point across objective, constraint and model-specific metrics.');
  function valuesAt(x,y){ const metrics=m.metrics?m.metrics(x,y,state.params):{}; const obj=m.rawObjective?m.rawObjective(x,y,state.params):m.objective(x,y,state.params); const base={objective:obj,constraint:m.constraint?m.constraint(x,y,state.params):0,...metrics}; return base; }
  const best=valuesAt(res.best.x,res.best.y), start=valuesAt(res.series.x[0],res.series.y[0]); const keys=Object.keys(best).filter(k=>Number.isFinite(best[k])).slice(0,8);
  function norm(obj,k){ const a=start[k]??0,b=best[k]??0; const lo=Math.min(a,b,0), hi=Math.max(a,b,1e-12); return (obj[k]-lo)/(hi-lo+1e-12); }
  if(keys.length<3){ plotState(card,'Radar chart not applicable','Radar/spider charts need at least three comparable objectives or metrics. Use Pareto or diagnostics for simpler problems.','warning'); return; }
  const traces=[{type:'scatterpolar',r:keys.map(k=>norm(best,k)),theta:keys,fill:'toself',name:'best'}]; if((card.settings.compare||'best point')==='start vs best') traces.push({type:'scatterpolar',r:keys.map(k=>norm(start,k)),theta:keys,fill:'toself',name:'start'});
  Plotly.react('plot_'+card.id,traces,{title:{text:'Multi-objective radar / spider chart',font:{size:15},x:0.5,xanchor:'center'},polar:{radialaxis:{visible:true,range:[0,1]}},legend:{orientation:'h',x:0,y:-0.18},margin:{l:55,r:55,t:55,b:76},paper_bgcolor:'#fff',colorway:paletteColors(),font:{family:'Inter, system-ui, sans-serif',color:'#263246'}},plotConfig());
  $('html_'+card.id).innerHTML='<p class="mw-note">Values are normalized within this comparison, so read shape and trade-offs, not absolute units.</p>';
}
function drawOptTrajectory(card){
  const m=currentModel(), res=state.result, display=card.settings.display||'all';
  if(m.response){ const rr=m.response(res.best.x,res.best.y,state.params); const traces=[{x:rr.t,y:rr.output,type:'scatter',mode:'lines',name:'optimized response',line:{width:4}},{x:rr.t,y:rr.target,type:'scatter',mode:'lines',name:'target / setpoint',line:{dash:'dash'}}]; Plotly.react('plot_'+card.id,traces,plotLayout('Step-response / simulation trajectory','time',rr.ylabel||'system output'),plotConfig()); $('html_'+card.id).innerHTML='<p class="mw-note">Dynamic response generated from the optimized decision variables. Use this for control-style optimization: overshoot, settling and steady-state error are visible.</p>'; return; }
  const traces=[];
  if(display==='decision variables' || display==='all'){ traces.push({x:res.t,y:res.series.x,type:'scatter',mode:'lines',name:'x'}); traces.push({x:res.t,y:res.series.y,type:'scatter',mode:'lines',name:'y'}); }
  if(display==='objective + constraint' || display==='all'){ traces.push({x:res.t,y:res.series.best_f,type:'scatter',mode:'lines',name:'best objective',yaxis:'y2'}); traces.push({x:res.t,y:res.series.constraint||[],type:'scatter',mode:'lines',name:'constraint',yaxis:'y2'}); }
  if(!traces.length){ plotState(card,'Trajectory not available','This plot needs a search path or a model response simulator. Run optimization first or choose a dynamic/controller optimization model.','warning'); return; }
  const trLayout=layoutWithLegend(plotLayout('Step-response / simulation trajectory','iteration','decision variables'),traces.length); trLayout.yaxis2={title:axisTitle('objective / constraint'),overlaying:'y',side:'right',showgrid:false,automargin:true}; Plotly.react('plot_'+card.id,traces,trLayout,plotConfig());
  $('html_'+card.id).innerHTML='<p class="mw-note">This is the optimizer trajectory over iterations. For models with a response simulator, this card switches to a physical step-response plot.</p>';
}

  function drawRobustness(card){
    if(needsManualRun(card)){ Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML=`<div class="mw-run-placeholder"><strong>Robustness / sensitivity</strong><span>Screen how the final optimum changes under local perturbations of start point, algorithm settings, or problem parameters.</span><button class="mw-primary" data-run-card="${card.id}" type="button">Run robustness screen</button><button class="mw-secondary" data-export-salib="${card.id}" type="button">Export SALib script</button></div>`; $('html_'+card.id).innerHTML='<p class="mw-note">For optimization this is robustness/objective sensitivity, not generic biological GSA.</p>'; return; }
    const kind=card.settings.metric||'best_objective', r=clamp(Number(card.settings.range||0.2),0.01,0.8); const rows=sensitivityRows(state.primaryVariable,kind,r);
    Plotly.react('plot_'+card.id,[{x:rows.map(r=>r.effect),y:rows.map(r=>r.param),type:'bar',orientation:'h',text:rows.map(r=>fmt(r.signed,3)),name:'effect'}],{...plotLayout(`Robustness: ${kind}`,'normalized effect','parameter'),margin:{l:95,r:25,t:48,b:55}},plotConfig());
    $('html_'+card.id).innerHTML=`<table class="mw-table mw-compact-table"><thead><tr><th>parameter</th><th>signed</th><th>absolute</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(r.param)}</td><td>${fmt(r.signed,4)}</td><td>${fmt(r.effect,4)}</td></tr>`).join('')}</tbody></table><p class="mw-note">Browser robustness screen. Use <button class="mw-secondary" data-export-salib="${card.id}" type="button">Export SALib script</button> for full Python screening over the same metric.</p>`;
  }
  function drawTimecourse(card){
    const m=currentModel(), res=state.result; const vars=(card.settings.display||'all')==='primary'?[state.primaryVariable]:m.variables;
    const traces=vars.map(v=>({x:res.t,y:res.series[v],type:'scatter',mode:'lines',name:v,showlegend:vars.length<=10}));
    const layout=layoutWithLegend(plotLayout('Time course','time','state'),vars.length);
    Plotly.react('plot_'+card.id,traces,layout,plotConfig());
    $('html_'+card.id).innerHTML=vars.length>10?`<p class="mw-note">${vars.length} variables are plotted. Legend is hidden to avoid covering the axis; use hover labels or switch display to the primary variable.</p>`:'';
  }
  function drawPhase(card){ const m=currentModel(), res=state.result; const xvar=card.settings.xvar||m.variables[0], yvar=card.settings.yvar||m.variables[Math.min(1,m.variables.length-1)]; Plotly.react('plot_'+card.id,[{x:res.series[xvar],y:res.series[yvar],type:'scatter',mode:'lines',name:`${xvar} vs ${yvar}`}],layoutWithLegend(plotLayout('Phase portrait',xvar,yvar),1),plotConfig()); $('html_'+card.id).innerHTML=''; }
  function needsManualRun(card){ return ['sweep','contour','gsa','sensitivity','robustness','importance','parallel','slice','ecdf','radar','continuation','response'].includes(card.type) && !card.settings.computed; }
  function drawManualCard(card, label, detail){
    const evals=estimatedEvaluations(card);
    Plotly.purge('plot_'+card.id);
    $('plot_'+card.id).innerHTML=`<div class="mw-run-placeholder mw-run-warning"><strong>${safe(label)}</strong><span>${safe(detail)}</span><span class="mw-estimate">Estimated cost: about ${evals} model evaluation${evals===1?'':'s'} in the browser. Use small settings first.</span><button class="mw-primary" data-run-card="${card.id}" type="button">Run this analysis</button></div>`;
    $('html_'+card.id).innerHTML='<p class="mw-note"><b>Slow computation warning:</b> expensive browser analyses are not auto-run. Increase grid size or sample size only after the small screen is useful.</p>';
  }
  function drawEnsemble(card){ const res=state.result; const v=card.settings.variable||state.primaryVariable; const n=clamp(Math.round(card.settings.paths||18),5,40); const traces=(res.paths||[]).slice(0,n).map((p,i)=>({x:res.t,y:p[v],type:'scatter',mode:'lines',name:`run ${i+1}`,opacity:.38,line:{width:1},showlegend:i<10})); traces.push({x:res.t,y:res.series[v],type:'scatter',mode:'lines',name:`mean ${v}`,line:{width:4}}); Plotly.react('plot_'+card.id,traces,layoutWithLegend(plotLayout(`Ensemble trajectories: ${v}`,'time',v),traces.length),plotConfig()); $('html_'+card.id).innerHTML=`<p class="mw-note">Showing ${Math.min(n,(res.paths||[]).length)} sample paths from ${res.runs} ensemble runs.</p>`; }
  function drawDistribution(card){ const res=state.result; const v=card.settings.variable||state.primaryVariable; const bins=clamp(Math.round(card.settings.bins||25),5,60); const finals=res.finals?.[v]||[]; Plotly.react('plot_'+card.id,[{x:finals,type:'histogram',nbinsx:bins,name:`final ${v}`,showlegend:false}],plotLayout(`Final ${v} distribution`,'final value','runs'),plotConfig()); $('html_'+card.id).innerHTML=`<p class="mw-note">Mean ${fmt(mean(finals),4)} · variance ${fmt(variance(finals),4)} · extinction probability ${fmt(finals.filter(x=>x<=0).length/Math.max(1,finals.length),4)}</p>`; }
  function drawSweep(card){
    if(needsManualRun(card)) return drawManualCard(card,'Parameter sweep','Scan one parameter over its bounds and evaluate a selected output metric.');
    const m=currentModel(); const pName=card.settings.param||Object.keys(m.params)[0]; const pDef=m.params[pName]; const variable=card.settings.variable||state.primaryVariable; const kind=card.settings.metric||metricOptions()[0]; const n=clamp(Math.round(card.settings.points||25),5,100); const xs=[], ys=[];
    for(let i=0;i<n;i++){ const val=pDef.min+(pDef.max-pDef.min)*i/(n-1); const p={...state.params,[pName]:val}; const res=simulate(p,state.initials,{steps:Math.min(state.steps,700),runs:Math.min(state.runs,90),seed:state.seed+i}); xs.push(val); ys.push(metric(res,variable,kind)); }
    Plotly.react('plot_'+card.id,[{x:xs,y:ys,type:'scatter',mode:'lines+markers',name:`${kind}(${variable})`}],plotLayout(`Sweep: ${pName} → ${kind}(${variable})`,pName,kind),plotConfig()); $('html_'+card.id).innerHTML=`<p class="mw-note">Browser sweep over ${n} values. Stochastic sweeps use reduced ensemble counts for responsiveness.</p>`;
  }
  function drawContour(card){
    if(needsManualRun(card)) return drawManualCard(card,'2D heatmap / contour','Run a two-parameter browser scan. For stochastic models this can be computationally expensive.');
    const m=currentModel(); const params=Object.keys(m.params); const xp=card.settings.xparam||params[0], yp=card.settings.yparam||params[Math.min(1,params.length-1)]||params[0]; const variable=card.settings.variable||state.primaryVariable; const kind=card.settings.metric||metricOptions()[0]; const n=clamp(Math.round(card.settings.points||14),5,28); const xdef=m.params[xp], ydef=m.params[yp];
    const xs=[], ys=[], z=[]; for(let i=0;i<n;i++) xs.push(xdef.min+(xdef.max-xdef.min)*i/(n-1)); for(let j=0;j<n;j++) ys.push(ydef.min+(ydef.max-ydef.min)*j/(n-1));
    for(let j=0;j<n;j++){ const row=[]; for(let i=0;i<n;i++){ const p={...state.params,[xp]:xs[i],[yp]:ys[j]}; const res=simulate(p,state.initials,{steps:Math.min(state.steps,550),runs:Math.min(state.runs,55),seed:state.seed+i+j*31}); row.push(metric(res,variable,kind)); } z.push(row); }
    const display=card.settings.display||'heatmap + contour'; let trace;
    if(display==='contour') trace={x:xs,y:ys,z,type:'contour',colorscale:continuousColorscale(),contours:{coloring:'heatmap'},name:`${kind}(${variable})`};
    else if(display==='heatmap') trace={x:xs,y:ys,z,type:'heatmap',colorscale:continuousColorscale(),name:`${kind}(${variable})`};
    else trace={x:xs,y:ys,z,type:'contour',colorscale:continuousColorscale(),contours:{coloring:'heatmap',showlabels:true},name:`${kind}(${variable})`};
    Plotly.react('plot_'+card.id,[trace],plotLayout(`2D scan: ${kind}(${variable})`,xp,yp),plotConfig()); $('html_'+card.id).innerHTML=`<p class="mw-note">${n}×${n} browser scan. Use lower points for stochastic models or export Python for larger scans.</p>`;
  }
  function sensitivityRows(variable, kind, range){
    const m=currentModel(); const base=metric(state.result,variable,kind); const rows=[];
    for(const [pName,pDef] of Object.entries(m.params)){
      const p0=state.params[pName]; const lo=clamp(p0*(1-range),pDef.min,pDef.max); const hi=clamp(p0*(1+range),pDef.min,pDef.max);
      const lowRes=simulate({...state.params,[pName]:lo},state.initials,{steps:Math.min(state.steps,650),runs:Math.min(state.runs,80),seed:state.seed+101});
      const highRes=simulate({...state.params,[pName]:hi},state.initials,{steps:Math.min(state.steps,650),runs:Math.min(state.runs,80),seed:state.seed+202});
      const low=metric(lowRes,variable,kind), high=metric(highRes,variable,kind); const denom=Math.max(Math.abs(base),1e-9); rows.push({param:pName,effect:Math.abs(high-low)/denom,signed:(high-low)/denom,low,high,lo,hi});
    }
    return rows.sort((a,b)=>b.effect-a.effect);
  }
  function drawGSA(card){
    if(needsManualRun(card)){ const evals=estimatedEvaluations(card); Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML=`<div class="mw-run-placeholder mw-run-warning"><strong>Ranked sensitivity screen</strong><span>Run an easy-to-read ranked bar chart before opening the signed heatmap. This is a local/range screen, not full variance-based Sobol GSA.</span><span class="mw-estimate">Estimated cost: about ${evals} model evaluations. Use small settings first.</span><button class="mw-primary" data-run-card="${card.id}" type="button">Run ranked screen</button><button class="mw-secondary" data-export-salib="${card.id}" type="button">Export SALib script</button></div>`; $('html_'+card.id).innerHTML='<p class="mw-note"><b>Interpretation:</b> this ranks parameters by how much the selected output metric changes under ± perturbations. Export Python for Morris/Sobol if you need true global sensitivity.</p>'; return; }
    const variable=card.settings.variable||state.primaryVariable, kind=card.settings.metric||metricOptions()[0], r=clamp(Number(card.settings.range||0.2),0.01,0.8); const rows=sensitivityRows(variable,kind,r);
    const method=card.settings.method||'browser screen';
    Plotly.react('plot_'+card.id,[{x:rows.map(r=>r.effect),y:rows.map(r=>r.param),type:'bar',orientation:'h',text:rows.map(r=>fmt(r.signed,3)),name:'effect'}],{...plotLayout(`Ranked sensitivity: ${kind}(${variable})`,'normalized absolute effect','parameter'),margin:{l:90,r:25,t:48,b:55}},plotConfig());
    const table=`<table class="mw-table mw-compact-table"><thead><tr><th>parameter</th><th>signed</th><th>absolute</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(r.param)}</td><td>${fmt(r.signed,4)}</td><td>${fmt(r.effect,4)}</td></tr>`).join('')}</tbody></table>`;
    const exportLabel = method==='Morris export' ? 'Export Morris SALib' : method==='Sobol export' ? 'Export Sobol SALib' : 'Export SALib script';
    $('html_'+card.id).innerHTML=`${table}<p class="mw-note"><b>Browser result:</b> ranked local/range sensitivity bar chart. It is easier to read than the signed heatmap, but it is not full Morris/Sobol. Use <button class="mw-secondary" data-export-salib="${card.id}" type="button">${exportLabel}</button> for full Python GSA using this card's output, metric and method.</p>`;
  }
  function drawSensitivityHeatmap(card){
    if(needsManualRun(card)) return drawManualCard(card,'Sensitivity heatmap','Compute local signed responses across parameters and metrics/variables.');
    const m=currentModel(); const r=clamp(Number(card.settings.range||0.2),0.01,0.8); const screen=card.settings.screen||'parameter × metric'; let xLabels, z;
    if(screen==='parameter × variable'){
      xLabels=m.variables; z=Object.keys(m.params).map(p=>m.variables.map(v=>{ const row=sensitivityRows(v,metricOptions()[0],r).find(x=>x.param===p); return row?row.signed:0; }));
    } else {
      xLabels=metricOptions().slice(0,5); z=Object.keys(m.params).map(p=>xLabels.map(kind=>{ const row=sensitivityRows(state.primaryVariable,kind,r).find(x=>x.param===p); return row?row.signed:0; }));
    }
    const yLabels=Object.keys(m.params);
    if(!yLabels.length || !xLabels.length){ plotState(card,'No sensitivity heatmap available','This plot requires at least one parameter and one numeric output metric.','warning'); return; }
    const scale=(card.settings.scale||'diverging around zero')==='selected palette'?plotColorscale():sensitivityColorscale();
    Plotly.react('plot_'+card.id,[{x:xLabels,y:yLabels,z,type:'heatmap',colorscale:scale,zmid:0,name:'signed sensitivity'}],plotLayout('Signed sensitivity heatmap',screen.includes('variable')?'variable':'metric','parameter'),plotConfig());
    $('html_'+card.id).innerHTML='<p class="mw-note"><b>How to read this:</b> each cell shows the signed local response to ± parameter perturbation. Red/positive means the metric increases when the parameter increases; blue/negative means it decreases; near zero means weak local effect. For a cleaner first view, use the ranked sensitivity bar chart. This is not full variance-based GSA.</p>';
  }
  function drawEquations(card){ Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML='<div class="mw-equation-card" id="latex_'+card.id+'"></div>'; renderLatexInto($('latex_'+card.id),currentModel().latex||currentModel().equations); $('html_'+card.id).innerHTML=`<p class="mw-note">LaTeX-rendered ${currentModel().type==='CTMC'?'reaction scheme':currentModel().type==='OPT'?'objective definition':'ODE system'}.</p>`; }
  function drawDiagnostics(card){ const m=currentModel(), res=state.result; Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML=''; if(res.kind==='OPT'){ const rows=metricOptions().map(k=>`<tr><td>${safe(k)}</td><td>${fmt(metric(res,state.primaryVariable,k),6)}</td></tr>`).join(''); $('html_'+card.id).innerHTML=`<table class="mw-table"><thead><tr><th>optimization metric</th><th>value</th></tr></thead><tbody>${rows}</tbody></table><p class="mw-note">Problem: ${m.name}. Accepted moves: ${res.accepted}/${res.steps}. Best point: (${fmt(res.best.x,5)}, ${fmt(res.best.y,5)}).</p>`; return; } let rows=''; m.variables.forEach(v=>{ rows+=`<tr><td>${safe(v)}</td><td>${fmt(metric(res,v,res.kind==='CTMC'?'mean_final':'final'),5)}</td><td>${fmt(metric(res,v,res.kind==='CTMC'?'max_mean':'max'),5)}</td><td>${fmt(metric(res,v,'auc'),5)}</td></tr>`; }); const extra=res.kind==='CTMC'?`Runs: ${res.runs}. Events: ${res.eventCount}.`:`Steps computed: ${res.steps}. Numerical warning: ${res.bad?'yes':'no'}.`; $('html_'+card.id).innerHTML=`<table class="mw-table"><thead><tr><th>variable</th><th>final / mean final</th><th>max / max mean</th><th>AUC</th></tr></thead><tbody>${rows}</tbody></table><p class="mw-note">Model: ${m.name}. ${extra}</p>`; }

  function renderDetail(){
    const m=currentModel(), body=$('detailBody'), tab=state.detailTab;
    if(tab==='equations') body.innerHTML=`<h3>${m.type==='CTMC'?'Reaction scheme':m.type==='OPT'?'Objective / constraints':'Equations'}</h3><div id="drawerLatex"></div><h3>Text form</h3>${m.equations.map(e=>`<div class="mw-equation">${safe(e)}</div>`).join('')}<h3>Initial conditions</h3>${tableFromObject(state.initials)}`;
    else if(tab==='parameters') body.innerHTML=`<h3>Parameters</h3>${tableFromParams(m)}<p class="mw-note">The top strip shows active parameter values. Bounds drive sweeps, heatmaps and SALib exports.</p>`;
    else if(tab==='json') body.innerHTML=`<h3>Current model JSON</h3><pre class="mw-code">${safe(JSON.stringify({id:m.id,name:m.name,type:m.type,family:m.family,variables:m.variables,parameters:state.params,initials:state.initials,equations:m.equations,events:m.events?.map(e=>({name:e.name,expr:e.expr,updates:e.updates})),tStart:state.tStart,tEnd:state.tEnd,steps:state.steps,runs:state.runs},null,2))}</pre>`;
    else if(isUnpublishedPlantModel(m)) body.innerHTML=`<h3>Exports disabled</h3>${protectedNotice()}<p>This Workbench view is a reduced portfolio surrogate for unpublished plant work. It is intentionally not a source-code or parameter-distribution channel.</p>`;
    else body.innerHTML=`<h3>Exports</h3><p>Export the current model, simulation result, Python script, SALib script, or full JSON report.</p><p><button class="mw-secondary" id="drawerExportJson" type="button">Model JSON</button> <button class="mw-secondary" id="drawerExportPython" type="button">Python simulation</button> <button class="mw-secondary" id="drawerExportSALib" type="button">SALib GSA</button></p>`;
    if(tab==='equations') renderLatexInto($('drawerLatex'),m.latex||m.equations);
  }
  function tableFromObject(obj){ return `<table class="mw-table"><tbody>${Object.entries(obj).map(([k,v])=>`<tr><th>${safe(k)}</th><td>${fmt(v,6)}</td></tr>`).join('')}</tbody></table>`; }
  function tableFromParams(m){ return `<table class="mw-table"><thead><tr><th>name</th><th>value</th><th>min</th><th>max</th><th>label</th></tr></thead><tbody>${Object.entries(m.params).map(([k,d])=>`<tr><td>${safe(k)}</td><td>${fmt(state.params[k],6)}</td><td>${d.min}</td><td>${d.max}</td><td>${safe(d.label||'')}</td></tr>`).join('')}</tbody></table>`; }

  function downloadText(name,text,type='text/plain'){ const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1000); }
  function exportResultJson(){ if(isUnpublishedPlantModel()) return blockProtectedExport(); downloadText(`${currentModel().id}-foko-lab-report.json`,JSON.stringify({model:currentModel().name,type:currentModel().type,params:state.params,initials:state.initials,result:state.result,cards:state.cards.map(c=>({type:c.type,settings:c.settings}))},null,2),'application/json'); }
  function pythonRhs(m){
    const map={sir:"dS = -beta*S*I/N\n    dI = beta*S*I/N - gamma*I\n    dR = gamma*I\n    return [dS, dI, dR]",lotka:"dprey = alpha*prey - beta*prey*predator\n    dpredator = delta*prey*predator - gamma*predator\n    return [dprey, dpredator]",lorenz:"dx = sigma*(y-x)\n    dy = x*(rho-z)-y\n    dz = x*y-beta*z\n    return [dx, dy, dz]",michaelis:"v = vmax*S/(km+S)\n    return [-v, v]",vanderpol:"return [y, mu*(1-x*x)*y-x]",toggle:"dA = a1/(1+B**n)-d*A\n    dB = a2/(1+A**n)-d*B\n    return [dA, dB]",brusselator:"dX = A + X*X*Y - (B+1)*X\n    dY = B*X - X*X*Y\n    return [dX, dY]",
      'enzyme-steady':"dS = vin - vmax*S/(km+S) - kout*S\n    return [dS]",
      'toggle-steady':"dA = a1/(1+B**n)-d*A\n    dB = a2/(1+A**n)-d*B\n    return [dA, dB]",
      'cubic-bistable':"dx = a + b*x - x**3\n    return [dx]"}; return map[m.id]||"raise NotImplementedError";
  }
  function exportPython(){
    if(isUnpublishedPlantModel()) return blockProtectedExport();
    const m=currentModel(); if(m.type==='CTMC'){ exportPythonCTMC(); return; } if(m.type==='STEADY'){ exportPythonSTEADY(); return; } if(m.type==='OPT'){ exportPythonOPT(); return; }
    const vars=m.variables, pnames=Object.keys(m.params); const code=`import numpy as np\nfrom scipy.integrate import solve_ivp\nimport matplotlib.pyplot as plt\n\n# Foko Lab export: ${m.name}\nparams = ${JSON.stringify(state.params,null,2)}\ny0 = ${JSON.stringify(vars.map(v=>state.initials[v]))}\nvariables = ${JSON.stringify(vars)}\n\ndef rhs(t, y):\n    ${vars.map((v,i)=>`${v} = y[${i}]`).join('\n    ')}\n    ${pnames.map(p=>`${p} = params['${p}']`).join('\n    ')}\n    ${pythonRhs(m)}\n\nt_eval = np.linspace(${state.tStart}, ${state.tEnd}, ${state.steps+1})\nsol = solve_ivp(rhs, (${state.tStart}, ${state.tEnd}), y0, t_eval=t_eval, method='RK45')\nfor i, name in enumerate(variables):\n    plt.plot(sol.t, sol.y[i], label=name)\nplt.legend(); plt.xlabel('time'); plt.ylabel('state'); plt.tight_layout(); plt.show()\n`;
    downloadText(`${m.id}-simulation.py`,code,'text/x-python');
  }
  function pythonObjective(m){
    const map={
      quadratic:"return (x-1)**2 + 0.5*(y+2)**2",
      rosenbrock:"return (a-x)**2 + b*(y-x*x)**2",
      rastrigin:"return 20 + x*x - 10*np.cos(2*np.pi*x) + y*y - 10*np.cos(2*np.pi*y)",
      constrained:"return (x-1)**2 + (y-1)**2 + penalty*max(0, x+y-1.2)**2",
      'traffic-signal':"return (520/(18*x+80))**2 + (430/(16*y+80))**2 + 0.0015*(x+y) + penalty*max(0, x+y+10-120)**2",
      'crop-risk-opt':"return -(0.92*(1-np.exp(-1.15*x))) + 0.035*x*x + 0.006*y + penalty*(max(0, 0.32*x*np.exp(-0.09*y)-0.08)**2 + max(0, 0.08*x/(y+1)-0.02)**2)",
      'reservoir-npv':"wc=0.10+0.50/(1+np.exp(-(y-55)/8)); return -(32*y*(1-wc)-5*x-4*y-0.025*(x-y)**2) + penalty*(max(0,x-80)**2 + max(0,y-85)**2 + max(0,wc-0.45)**2)"
    }; return map[m.id]||"raise NotImplementedError";
  }

  function exportPythonSTEADY(){
    if(isUnpublishedPlantModel()) return blockProtectedExport();
    const m=currentModel(); const vars=m.variables, pnames=Object.keys(m.params); const code=`import numpy as np
from scipy.integrate import solve_ivp

# Foko Lab steady-state export: ${m.name}
params = ${JSON.stringify(state.params,null,2)}
y0 = ${JSON.stringify(vars.map(v=>state.initials[v]))}
variables = ${JSON.stringify(vars)}

def rhs(t, y):
    ${vars.map((v,i)=>`${v} = y[${i}]`).join('\n    ')}
    ${pnames.map(p=>`${p} = params['${p}']`).join('\n    ')}
    ${pythonRhs(m)}

def jacobian(y, eps=1e-5):
    y=np.array(y,dtype=float); J=np.zeros((len(y),len(y)))
    for j in range(len(y)):
        h=eps*max(1,abs(y[j])); yp=y.copy(); ym=y.copy(); yp[j]+=h; ym[j]-=h
        J[:,j]=(np.array(rhs(0,yp))-np.array(rhs(0,ym)))/(2*h)
    return J

sol = solve_ivp(rhs, (${state.tStart}, ${state.tEnd}), y0, t_eval=[${state.tEnd}], method='RK45')
yss = sol.y[:, -1]
residual = np.linalg.norm(rhs(0, yss))
J = jacobian(yss)
eigs = np.linalg.eigvals(J)
print('steady state:', dict(zip(variables, yss)))
print('residual:', residual)
print('eigenvalues:', eigs)
print('locally stable:', np.max(np.real(eigs)) < 0)
`;
    downloadText(`${m.id}-steady-state.py`,code,'text/x-python');
  }
  function exportPythonOPT(){
    if(isUnpublishedPlantModel()) return blockProtectedExport();
    const m=currentModel(); const code=`import numpy as np\nimport matplotlib.pyplot as plt\n\n# Foko Lab optimization export: ${m.name}\nparams = ${JSON.stringify(state.params,null,2)}\n\ndef objective(x, y, params):\n    ${Object.keys(m.params).map(p=>`${p} = params.get('${p}', ${JSON.stringify(m.params[p].value)})`).join('\\n    ')}\n    ${pythonObjective(m)}\n\ndef optimize(params):\n    x = float(params.get('x0', 0.0)); y = float(params.get('y0', 0.0))\n    step = float(params.get('step', 0.5)); iterations = int(params.get('iterations', 250))\n    directions = [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]\n    path=[]; best=(x,y,objective(x,y,params))\n    for i in range(iterations+1):\n        f=objective(x,y,params);\n        if f<best[2]: best=(x,y,f)\n        path.append((i,x,y,f,best[2]))\n        cand=(x,y,f)\n        for dx,dy in directions:\n            scale=1/np.sqrt(2) if abs(dx)+abs(dy)>1 else 1\n            nx=x+dx*step*scale; ny=y+dy*step*scale; nf=objective(nx,ny,params)\n            if nf<cand[2]: cand=(nx,ny,nf)\n        if cand[2] < f-1e-12:\n            x,y=cand[0],cand[1]; step*=0.995\n        else:\n            step*=0.86\n    return np.array(path), best\n\npath,best=optimize(params)\nprint('best x,y,f =', best)\nplt.plot(path[:,0], path[:,3], label='current objective')\nplt.plot(path[:,0], path[:,4], label='best objective')\nplt.xlabel('iteration'); plt.ylabel('objective'); plt.legend(); plt.tight_layout(); plt.show()\n`;
    downloadText(`${m.id}-optimization.py`,code,'text/x-python');
  }
  function exportPythonCTMC(){ if(isUnpublishedPlantModel()) return blockProtectedExport(); const m=currentModel(); const vars=m.variables, pnames=Object.keys(m.params); const events=m.events.map(e=>({name:e.name,expr:e.expr,updates:e.updates})); const code=`import numpy as np\nimport matplotlib.pyplot as plt\n\n# Foko Lab Gillespie export: ${m.name}\nvariables = ${JSON.stringify(vars)}\nparams = ${JSON.stringify(state.params,null,2)}\ny0 = ${JSON.stringify(vars.map(v=>state.initials[v]))}\nevents = ${JSON.stringify(events,null,2)}\n\ndef propensity(expr, state, params):\n    env = {**dict(zip(variables, state)), **params, 'np': np}\n    return max(0.0, float(eval(expr, {'__builtins__': {}}, env)))\n\ndef gillespie(seed=1, t_end=${state.tEnd}, steps=${state.steps}):\n    rng = np.random.default_rng(seed)\n    grid = np.linspace(${state.tStart}, t_end, steps+1)\n    y = np.array(y0, dtype=float)\n    out = np.zeros((len(variables), len(grid)))\n    t = ${state.tStart}\n    for gi, target in enumerate(grid):\n        while t < target:\n            rates = np.array([propensity(ev['expr'], y, params) for ev in events])\n            total = rates.sum()\n            if total <= 0:\n                t = target; break\n            tau = rng.exponential(1/total)\n            if t + tau > target:\n                t = target; break\n            t += tau\n            idx = rng.choice(len(events), p=rates/total)\n            for name, delta in events[idx]['updates'].items():\n                y[variables.index(name)] = max(0, y[variables.index(name)] + delta)\n        out[:, gi] = y\n    return grid, out\n\npaths = [gillespie(seed=i)[1] for i in range(${state.runs})]\nmean_path = np.mean(paths, axis=0)\nt = gillespie(seed=999)[0]\nfor i, name in enumerate(variables):\n    plt.plot(t, mean_path[i], label=f'mean {name}')\nplt.legend(); plt.xlabel('time'); plt.ylabel('count'); plt.tight_layout(); plt.show()\n`; downloadText(`${m.id}-gillespie.py`,code,'text/x-python'); }
  function exportSALib(card=null){ if(isUnpublishedPlantModel()) return blockProtectedExport();
    const m=currentModel(); const pnames=Object.keys(m.params); const bounds=pnames.map(p=>[m.params[p].min,m.params[p].max]);
    const variable=card?.settings?.variable || state.primaryVariable;
    const metricName=card?.settings?.metric || (m.type==='CTMC'?'mean_final':m.type==='STEADY'?'equilibrium':m.type==='OPT'?'best_objective':'max');
    const method=(card?.settings?.method || 'Sobol export').toLowerCase().includes('morris') ? 'morris' : 'sobol';

    if(m.type==='STEADY'){
      const code=`import numpy as np
from scipy.integrate import solve_ivp

# Foko Lab SALib export: ${m.name}
# steady-state metric = ${metricName}; output = ${variable}; method = ${method}
problem = {'num_vars': ${pnames.length}, 'names': ${JSON.stringify(pnames)}, 'bounds': ${JSON.stringify(bounds)}}
y0 = ${JSON.stringify(m.variables.map(v=>state.initials[v]))}
variables = ${JSON.stringify(m.variables)}
output_variable = '${variable}'
metric = '${metricName}'

def rhs_factory(param_values):
    params = dict(zip(problem['names'], param_values))
    def rhs(t, y):
        ${m.variables.map((v,i)=>`${v} = y[${i}]`).join('\n        ')}
        ${pnames.map(p=>`${p} = params['${p}']`).join('\n        ')}
        ${pythonRhs(m).replaceAll('\n','\n        ')}
    return rhs

def jacobian(rhs, y, eps=1e-5):
    y=np.array(y,dtype=float); J=np.zeros((len(y),len(y)))
    for j in range(len(y)):
        h=eps*max(1,abs(y[j])); yp=y.copy(); ym=y.copy(); yp[j]+=h; ym[j]-=h
        J[:,j]=(np.array(rhs(0,yp))-np.array(rhs(0,ym)))/(2*h)
    return J

def evaluate(param_values):
    rhs = rhs_factory(param_values)
    sol = solve_ivp(rhs, (${state.tStart}, ${state.tEnd}), y0, t_eval=[${state.tEnd}], method='RK45')
    yss = sol.y[:, -1]
    if metric in ('equilibrium','final'):
        return float(yss[variables.index(output_variable)])
    if metric == 'absolute_equilibrium':
        return float(abs(yss[variables.index(output_variable)]))
    residual = np.linalg.norm(rhs(0, yss))
    if metric == 'residual':
        return float(residual)
    eigs = np.linalg.eigvals(jacobian(rhs, yss))
    dominant = np.max(np.real(eigs))
    if metric == 'stability_margin':
        return float(-dominant)
    return float(dominant)

` + (method==='morris' ? `from SALib.sample import morris as morris_sample
from SALib.analyze import morris as morris_analyze
X = morris_sample.sample(problem, N=512, num_levels=4)
Y = np.array([evaluate(row) for row in X])
Si = morris_analyze.analyze(problem, X, Y, print_to_console=False)
print(dict(zip(problem['names'], Si['mu_star'])))
` : `from SALib.sample import saltelli
from SALib.analyze import sobol
X = saltelli.sample(problem, 256, calc_second_order=False)
Y = np.array([evaluate(row) for row in X])
Si = sobol.analyze(problem, Y, calc_second_order=False)
print(dict(zip(problem['names'], Si['ST'])))
`);
      downloadText(`${m.id}-${method}-salib-${variable}-${metricName}.py`,code,'text/x-python'); return;
    }
    if(m.type==='OPT'){
      const code=`import numpy as np

# Foko Lab SALib export: ${m.name}
# optimization robustness metric = ${metricName}; method = ${method}
problem = {'num_vars': ${pnames.length}, 'names': ${JSON.stringify(pnames)}, 'bounds': ${JSON.stringify(bounds)}}

def objective_xy(x, y, params):
    ${Object.keys(m.params).map(p=>`${p} = params.get('${p}', ${JSON.stringify(m.params[p].value)})`).join('\n    ')}
    ${pythonObjective(m)}

def optimize(param_values):
    params = dict(zip(problem['names'], param_values))
    x = float(params.get('x0', 0.0)); y = float(params.get('y0', 0.0))
    step = float(params.get('step', 0.5)); iterations = int(params.get('iterations', 250))
    directions = [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]
    best=(x,y,objective_xy(x,y,params)); path=0.0
    for i in range(iterations):
        f=objective_xy(x,y,params); cand=(x,y,f)
        for dx,dy in directions:
            scale=1/np.sqrt(2) if abs(dx)+abs(dy)>1 else 1
            nx=x+dx*step*scale; ny=y+dy*step*scale; nf=objective_xy(nx,ny,params)
            if nf<cand[2]: cand=(nx,ny,nf)
        if cand[2] < f-1e-12:
            path += np.hypot(cand[0]-x, cand[1]-y); x,y=cand[0],cand[1]; step*=0.995
        else:
            step*=0.86
        if cand[2] < best[2]: best=(cand[0],cand[1],cand[2])
    return best, path

def evaluate(row):
    best, path = optimize(row)
    if '${metricName}' == 'best_x': return float(best[0])
    if '${metricName}' == 'best_y': return float(best[1])
    if '${metricName}' == 'path_length': return float(path)
    return float(best[2])

` + (method==='morris' ? `from SALib.sample import morris as morris_sample
from SALib.analyze import morris as morris_analyze
X = morris_sample.sample(problem, N=512, num_levels=4)
Y = np.array([evaluate(row) for row in X])
Si = morris_analyze.analyze(problem, X, Y, print_to_console=False)
print(dict(zip(problem['names'], Si['mu_star'])))
` : `from SALib.sample import saltelli
from SALib.analyze import sobol
X = saltelli.sample(problem, 256, calc_second_order=False)
Y = np.array([evaluate(row) for row in X])
Si = sobol.analyze(problem, Y, calc_second_order=False)
print(dict(zip(problem['names'], Si['ST'])))
`);
      downloadText(`${m.id}-${method}-salib-${metricName}.py`,code,'text/x-python'); return;
    }
    const header=`import numpy as np

# Foko Lab SALib export: ${m.name}
# output = ${variable}; metric = ${metricName}; method = ${method}
problem = {'num_vars': ${pnames.length}, 'names': ${JSON.stringify(pnames)}, 'bounds': ${JSON.stringify(bounds)}}
y0 = ${JSON.stringify(m.variables.map(v=>state.initials[v]))}
variables = ${JSON.stringify(m.variables)}
output_variable = '${variable}'
metric = '${metricName}'
`;
    const evaluator=m.type==='CTMC' ? `
events = ${JSON.stringify(m.events.map(e=>({name:e.name,expr:e.expr,updates:e.updates})),null,2)}

def propensity(expr, state, params):
    env = {**dict(zip(variables, state)), **params, 'np': np}
    return max(0.0, float(eval(expr, {'__builtins__': {}}, env)))

def one_final(params, seed=1):
    rng = np.random.default_rng(seed)
    y = np.array(y0, dtype=float)
    t = ${state.tStart}
    while t < ${state.tEnd}:
        rates = np.array([propensity(ev['expr'], y, params) for ev in events])
        total = rates.sum()
        if total <= 0: break
        t += rng.exponential(1/total)
        if t > ${state.tEnd}: break
        idx = rng.choice(len(events), p=rates/total)
        for name, delta in events[idx]['updates'].items():
            y[variables.index(name)] = max(0, y[variables.index(name)] + delta)
    return y[variables.index(output_variable)]

def evaluate(param_values, runs=80):
    params = dict(zip(problem['names'], param_values))
    finals = np.array([one_final(params, seed=i) for i in range(runs)], dtype=float)
    if metric in ('mean_final','final'):
        return float(np.mean(finals))
    if metric == 'variance_final':
        return float(np.var(finals))
    if metric == 'extinction_probability':
        return float(np.mean(finals <= 0))
    return float(np.mean(finals))
` : `
from scipy.integrate import solve_ivp

def rhs_factory(param_values):
    params = dict(zip(problem['names'], param_values))
    def rhs(t, y):
        ${m.variables.map((v,i)=>`${v} = y[${i}]`).join('\n        ')}
        ${pnames.map(p=>`${p} = params['${p}']`).join('\n        ')}
        ${pythonRhs(m).replaceAll('\n','\n        ')}
    return rhs

def summarize(t, y):
    if metric == 'final':
        return float(y[-1])
    if metric == 'max':
        return float(np.max(y))
    if metric == 'min':
        return float(np.min(y))
    if metric == 'auc':
        return float(np.trapz(y, t))
    if metric == 'amplitude':
        return float(np.max(y) - np.min(y))
    if metric == 'time_to_peak':
        return float(t[int(np.argmax(y))])
    return float(y[-1])

def evaluate(param_values):
    t_eval = np.linspace(${state.tStart}, ${state.tEnd}, ${Math.min(state.steps+1,1001)})
    sol = solve_ivp(rhs_factory(param_values), (${state.tStart}, ${state.tEnd}), y0, t_eval=t_eval, method='RK45')
    idx = variables.index(output_variable)
    return summarize(sol.t, sol.y[idx])
`;
    const footer = method==='morris' ? `
from SALib.sample import morris as morris_sample
from SALib.analyze import morris as morris_analyze

X = morris_sample.sample(problem, N=512, num_levels=4, optimal_trajectories=None)
Y = np.array([evaluate(row) for row in X])
Si = morris_analyze.analyze(problem, X, Y, print_to_console=False)
print('mu_star', dict(zip(problem['names'], Si['mu_star'])))
print('sigma', dict(zip(problem['names'], Si['sigma'])))
` : `
from SALib.sample import saltelli
from SALib.analyze import sobol

X = saltelli.sample(problem, 256, calc_second_order=False)
Y = np.array([evaluate(row) for row in X])
Si = sobol.analyze(problem, Y, calc_second_order=False)
print('S1', dict(zip(problem['names'], Si['S1'])))
print('ST', dict(zip(problem['names'], Si['ST'])))
`;
    downloadText(`${m.id}-${method}-salib-${variable}-${metricName}.py`,header+evaluator+footer,'text/x-python');
  }
  function exportCardJson(card){ if(isUnpublishedPlantModel()) return blockProtectedExport(); downloadText(`${currentModel().id}-${card.type}.json`,JSON.stringify({model:currentModel().name,card:{type:card.type,settings:card.settings},params:state.params,result:state.result},null,2),'application/json'); }

  function bind(){
    const odeExample=$('loadCustomOdeExample'); if(odeExample) odeExample.addEventListener('click',()=>renderCustomModelExample('ode'));
    const optExample=$('loadCustomOptExample'); if(optExample) optExample.addEventListener('click',()=>renderCustomModelExample('opt'));
    const importBtn=$('importCustomModel'); if(importBtn) importBtn.addEventListener('click',importCustomModelFromTextarea);
    if($('customModelJson') && !$('customModelJson').value) renderCustomModelExample('ode');
    $('modelSelect').addEventListener('change', e=>{
      const selected=e.target.selectedOptions?.[0];
      const href=selected?.dataset?.href;
      if(href){ window.location.href=href; return; }
      setDefaults(e.target.value); renderAll(); run();
    });
    $('resetModel').addEventListener('click',()=>{ setDefaults(state.modelId); renderAll(); run(); });
    $('runAll').addEventListener('click',run); $('exportReport').addEventListener('click',exportResultJson);
    $('addAnalysis').addEventListener('click',()=>{ const type=$('analysisType').value; const settings=['importance','parallel','slice','ecdf','radar','trajectory'].includes(type)?{computed:true}:{}; state.cards.push({id:'ca_'+uid(),type,settings}); renderCards(); });
    const optPal=$('optimizationPlotPalette'); if(optPal){ optPal.addEventListener('click',e=>{ const type=e.target.dataset.addOptPlot; if(!type) return; const settings=['importance','parallel','slice','ecdf','radar','trajectory'].includes(type)?{computed:true}:{}; if(type==='landscape') settings.points=45; if(type==='slice') Object.assign(settings,{axis:'x',points:70,computed:true}); if(type==='parallel') Object.assign(settings,{source:'search path',points:80,computed:true}); if(type==='ecdf') Object.assign(settings,{source:'search path',points:70,computed:true}); if(type==='radar') Object.assign(settings,{compare:'start vs best',computed:true}); state.cards.unshift({id:'op_'+uid(),type,settings}); renderCards(); }); }
    $('openModelDrawer').addEventListener('click',()=>{ $('modelDrawer').classList.add('open'); $('modelDrawer').setAttribute('aria-hidden','false'); renderDetail(); });
    $('closeModelDrawer').addEventListener('click',()=>{ $('modelDrawer').classList.remove('open'); $('modelDrawer').setAttribute('aria-hidden','true'); });
    $('modelDrawer').addEventListener('click',e=>{ if(e.target.id==='modelDrawer') $('closeModelDrawer').click(); });
    document.querySelectorAll('[data-detail-tab]').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('[data-detail-tab]').forEach(b=>b.classList.toggle('active',b===btn)); state.detailTab=btn.dataset.detailTab; renderDetail(); }));
    $('parameterStrip').addEventListener('input', e=>{ const p=e.target.dataset.param; if(!p) return; state.params[p]=Number(e.target.value); const lab=$('pv_'+p); if(lab) lab.textContent=fmt(state.params[p],5); debounceRun(); });
    $('initialGrid').addEventListener('change', e=>{ const v=e.target.dataset.initial; if(v){ state.initials[v]=Number(e.target.value); debounceRun(); } if(e.target.id==='runs'){ state.runs=Number(e.target.value); debounceRun(); } if(e.target.id==='seed'){ state.seed=Number(e.target.value); debounceRun(); } });
    ['tStart','tEnd','steps'].forEach(id=>$(id).addEventListener('change',e=>{ state[id]=Number(e.target.value); debounceRun(); }));
    $('primaryVariable').addEventListener('change',e=>{ state.primaryVariable=e.target.value; renderCards(); });
    const plotPal=$('plotPalette'); if(plotPal){ plotPal.addEventListener('change',e=>{ state.palette=e.target.value; renderPlotPalette(); renderCards(); }); }
    const applyPal=$('applyCustomPalette'); if(applyPal) applyPal.addEventListener('click',applyCustomPaletteFromEditor);
    const resetPal=$('resetCustomPalette'); if(resetPal) resetPal.addEventListener('click',resetCustomPalette);
    ['customLowColor','customMidColor','customHighColor'].forEach(id=>{ const el=$(id); if(el) el.addEventListener('input',()=>{ applyCustomPaletteFromEditor(); }); });
    $('analysisGrid').addEventListener('change',e=>{ const cardEl=e.target.closest('.mw-card'); if(!cardEl) return; const card=state.cards.find(c=>c.id===cardEl.dataset.cardId); if(!card) return; const key=e.target.dataset.setting; if(key){ card.settings[key]=e.target.type==='number'?Number(e.target.value):e.target.value; if(['sweep','contour','gsa','sensitivity','robustness','importance','parallel','slice','ecdf','radar','continuation','response'].includes(card.type)) card.settings.computed=false; drawCard(card); } });
    $('analysisGrid').addEventListener('click',e=>{ const salib=e.target.dataset.exportSalib; const cardEl=e.target.closest('.mw-card'); const card = cardEl ? state.cards.find(c=>c.id===cardEl.dataset.cardId) : null; const runCard=e.target.dataset.runCard; if(runCard && card){ card.settings.computed=true; drawCard(card); return; } if(salib){ exportSALib(card); return; } if(!cardEl || !card) return; const action=e.target.dataset.action; if(action==='remove'){ state.cards=state.cards.filter(c=>c.id!==card.id); renderCards(); } if(action==='duplicate'){ state.cards.push({id:'cp_'+uid(),type:card.type,settings:{...card.settings}}); renderCards(); } if(action==='export-json') exportCardJson(card); if(action==='export-png'){ if(isUnpublishedPlantModel()) return blockProtectedExport(); Plotly.downloadImage('plot_'+card.id,{format:'png',filename:`${currentModel().id}-${card.type}`}); } });
    $('detailBody').addEventListener('click',e=>{ if(e.target.id==='drawerExportJson') exportResultJson(); if(e.target.id==='drawerExportPython') exportPython(); if(e.target.id==='drawerExportSALib') exportSALib(); });
  }
  function renderAll(){ renderModelSelect(); renderHeader(); renderParameterStrip(); renderAnalysisTypeSelect(); renderOptimizationPalette(); renderPlotPalette(); renderCards(); renderDetail(); }
  function toast(msg){ const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
  function init(){ loadCustomPalette(); const q=new URLSearchParams(location.search); const model=q.get('model') || q.get('example') || 'sir'; setDefaults(MODELS[model]?model:'sir'); renderAll(); bind(); run(); toast('Model workbench RC ready'); window.addEventListener('load',()=>{ renderMathStrip(); renderDetail(); renderCards(); }); }
  document.addEventListener('DOMContentLoaded',init);
})();

// v12 compatibility marker for tests: colorscale:plotColorscale()
