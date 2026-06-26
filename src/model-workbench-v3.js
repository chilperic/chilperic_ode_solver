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
    }
  };

  const MODELS = {...ODE_MODELS, ...CTMC_MODELS, ...STEADY_MODELS, ...OPT_MODELS};

  let state = {
    modelId:'sir', params:{}, initials:{}, tStart:0, tEnd:10, steps:500, runs:200, seed:1,
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
    if(m.type==='OPT') return [
      {id:'c_conv',type:'convergence',settings:{display:'best + current'}},
      {id:'c_land',type:'landscape',settings:{points:45,display:'heatmap + contour'}},
      {id:'c_robust',type:'robustness',settings:{metric:'best_objective',range:0.2}},
      {id:'c_eq',type:'equations',settings:{}},
      {id:'c_diag',type:'diagnostics',settings:{}}
    ];
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
    let x=Number(params.x0 ?? initials.x ?? 0), y=Number(params.y0 ?? initials.y ?? 0);
    let step=Math.max(1e-4, Number(params.step || 0.5));
    const t=[], series={x:[],y:[],f:[],best_f:[],constraint:[]}, path=[];
    let bestX=x, bestY=y, bestF=m.objective(x,y,params), accepted=0;
    const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for(let i=0;i<=iterations;i++){
      const f=m.objective(x,y,params); const c=m.constraint?m.constraint(x,y,params):0;
      if(f<bestF){ bestF=f; bestX=x; bestY=y; }
      t.push(i); series.x.push(x); series.y.push(y); series.f.push(f); series.best_f.push(bestF); series.constraint.push(c); path.push({x,y,f,best_f:bestF,constraint:c});
      if(i===iterations) break;
      let candX=x, candY=y, candF=f;
      for(const [dx,dy] of directions){
        const scale=(Math.abs(dx)+Math.abs(dy)>1)?Math.SQRT1_2:1;
        const nx=x+dx*step*scale, ny=y+dy*step*scale;
        const nf=m.objective(nx,ny,params);
        if(Number.isFinite(nf) && nf<candF){ candX=nx; candY=ny; candF=nf; }
      }
      // deterministic exploratory proposal helps multimodal landscapes without random noise
      const nx=x+step*0.55*Math.sin(0.37*i+1.7), ny=y+step*0.55*Math.cos(0.29*i+0.4);
      const nf=m.objective(nx,ny,params);
      if(Number.isFinite(nf) && nf<candF){ candX=nx; candY=ny; candF=nf; }
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

  function plotLayout(title,xlabel,ylabel){ return {title:{text:title,font:{size:16}},xaxis:{title:xlabel,zeroline:false},yaxis:{title:ylabel,zeroline:false},margin:{l:58,r:28,t:56,b:56},paper_bgcolor:'#fff',plot_bgcolor:'#fff',legend:{orientation:'h',y:-0.22},font:{family:'Inter, system-ui, sans-serif',color:'#263246'}}; }
  function plotConfig(){ return {responsive:true,displaylogo:false,modeBarButtonsToRemove:['lasso2d','select2d']}; }

  function renderLatexInto(el, formulas){
    if(!el) return; el.innerHTML='';
    formulas.forEach(f=>{ const d=document.createElement('div'); d.className='mw-latex-item';
      if(window.katex){ try{ window.katex.render(f,d,{throwOnError:false,displayMode:true}); } catch(e){ d.textContent=f; } }
      else d.textContent=f;
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

  function renderModelSelect(){
    const sel=$('modelSelect'); sel.innerHTML='';
    const groups={ODE:Object.values(ODE_MODELS),CTMC:Object.values(CTMC_MODELS),STEADY:Object.values(STEADY_MODELS),OPT:Object.values(OPT_MODELS)};
    Object.entries(groups).forEach(([label,models])=>{ const optg=document.createElement('optgroup'); optg.label=label==='CTMC'?'Stochastic / CTMC':label==='STEADY'?'Steady-state':label==='OPT'?'Optimization':label; models.forEach(m=>{ const o=document.createElement('option'); o.value=m.id; o.textContent=m.name; optg.appendChild(o); }); sel.appendChild(optg); });
    sel.value=state.modelId;
  }
  function renderHeader(){
    const m=currentModel(); $('modelTitle').textContent=m.name; $('modelSummary').textContent=m.summary; $('drawerTitle').textContent=m.name;
    $('modelMeta').innerHTML=`<span class="mw-chip">${m.type==='CTMC'?'Stochastic CTMC':m.type==='STEADY'?'Steady-state':m.type==='OPT'?'Optimization':m.type}</span><span class="mw-chip">${m.family}</span><span class="mw-chip">${m.variables.length} variables</span><span class="mw-chip">${Object.keys(m.params).length} parameters</span><span class="mw-chip">${m.type==='CTMC'?m.events.length+' events':m.type==='STEADY'?'equilibrium + stability':m.type==='OPT'?'objective + search':m.equations.length+' equations'}</span>`;
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
    const opts=m.type==='OPT' ? [['convergence','Convergence'],['landscape','Objective landscape'],['robustness','Robustness / sensitivity'],['equations','Objective math'],['diagnostics','Diagnostics']] : m.type==='STEADY' ? [['equilibrium','Equilibrium'],['continuation','Continuation'],['stability','Stability'],['response','MCA / response'],['gsa','GSA / response ranking'],['sensitivity','Sensitivity heatmap'],['equations','Equation math'],['diagnostics','Diagnostics']] : m.type==='CTMC' ? [['ensemble','Ensemble trajectories'],['distribution','Final distribution'],['sweep','Parameter sweep'],['contour','2D heatmap / contour'],['gsa','GSA / sensitivity ranking'],['sensitivity','Sensitivity heatmap'],['equations','Reaction math'],['diagnostics','Diagnostics']] : [['timecourse','Time course'],['phase','Phase portrait'],['sweep','Parameter sweep'],['contour','2D heatmap / contour'],['gsa','GSA / sensitivity ranking'],['sensitivity','Sensitivity heatmap'],['equations','Equation math'],['diagnostics','Diagnostics']];
    sel.innerHTML=opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
  }

  function cardTitle(type){
    const m=currentModel(); const map={
      timecourse:['Time course','Trajectory of each state variable over time.'],
      phase:['Phase portrait','State-space view using two selected variables.'],
      ensemble:['Ensemble trajectories','Sample paths plus the ensemble mean for a stochastic model.'],
      distribution:['Final distribution','Histogram of final ensemble values for a selected state.'],
      sweep:['Parameter sweep','One-parameter scan of a trajectory or ensemble metric.'],
      contour:['2D heatmap / contour','Two-parameter scan rendered as heatmap or contour surface.'],
      gsa:['GSA / sensitivity ranking','Browser quick range screen plus SALib export.'],
      sensitivity:['Sensitivity heatmap','Parameter-by-metric local response heatmap.'],
      equations:[m.type==='CTMC'?'Reaction math':m.type==='OPT'?'Objective math':'Equation math','LaTeX-rendered model definition.'],
      equilibrium:['Equilibrium','Solved steady state and residual.'],
      continuation:['Continuation','One-parameter continuation of equilibrium or stability metrics.'],
      stability:['Stability','Jacobian and local eigenvalue classification.'],
      response:['MCA / response','Local parameter response coefficients around the equilibrium.'],
      convergence:['Convergence','Current and best objective values over search iterations.'],
      landscape:['Objective landscape','Contour/heatmap of the objective with the accepted search path.'],
      robustness:['Robustness / sensitivity','Local response of the optimum to algorithm and problem parameters.'],
      diagnostics:['Diagnostics','Numerical status, model summary and output metrics.']
    };
    return map[type] || [type,'Analysis'];
  }
  function makeSelect(name, options, value){ return `<select data-setting="${name}">${options.map(o=>`<option value="${o}" ${o===value?'selected':''}>${o}</option>`).join('')}</select>`; }
  function makeMetricSelect(value){ const opts=metricOptions(); return makeSelect('metric',opts,value||opts[0]); }
  function makeCard(card){
    const [title,sub]=cardTitle(card.type); const el=document.createElement('article'); el.className='mw-card'; el.dataset.cardId=card.id; el.dataset.type=card.type;
    el.innerHTML=`<div class="mw-card-head"><div class="mw-card-title"><h3>${title}</h3><p>${sub}</p></div><div class="mw-card-actions"><button data-action="export-png" title="Export PNG">▣</button><button data-action="export-json" title="Export data JSON">{}</button><button data-action="duplicate" title="Duplicate analysis">＋</button><button data-action="remove" title="Remove analysis">×</button></div></div>${controlsFor(card)}<div class="mw-plot" id="plot_${card.id}"></div><div class="mw-html-result" id="html_${card.id}"></div>`;
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
    if(card.type==='robustness') return `<div class="mw-card-controls"><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric||'best_objective')}</div><div class="mw-card-control"><label>range ±</label><input type="number" min="0.01" max="0.8" step="0.01" data-setting="range" value="${s.range||0.2}"/></div><div class="mw-card-control"><label>method</label>${makeSelect('method',['browser screen','Morris export','Sobol export'],s.method||'browser screen')}</div></div>`;
    if(card.type==='timecourse') return `<div class="mw-card-controls"><div class="mw-card-control"><label>display</label>${makeSelect('display',['all','primary'],s.display||'all')}</div></div>`;
    if(card.type==='ensemble') return `<div class="mw-card-controls"><div class="mw-card-control"><label>state</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>paths shown</label><input type="number" min="5" max="40" step="1" data-setting="paths" value="${s.paths||18}"/></div></div>`;
    if(card.type==='distribution') return `<div class="mw-card-controls"><div class="mw-card-control"><label>state</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>bins</label><input type="number" min="5" max="60" step="1" data-setting="bins" value="${s.bins||25}"/></div></div>`;
    if(card.type==='phase') return `<div class="mw-card-controls"><div class="mw-card-control"><label>x axis</label>${makeSelect('xvar',vars,s.xvar||vars[0])}</div><div class="mw-card-control"><label>y axis</label>${makeSelect('yvar',vars,s.yvar||vars[Math.min(1,vars.length-1)])}</div></div>`;
    if(card.type==='sweep') return `<div class="mw-card-controls"><div class="mw-card-control"><label>parameter</label>${makeSelect('param',params,s.param||params[0])}</div><div class="mw-card-control"><label>output</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric)}</div><div class="mw-card-control"><label>points</label><input type="number" min="5" max="100" step="1" data-setting="points" value="${s.points||25}"/></div></div>`;
    if(card.type==='contour') return `<div class="mw-card-controls"><div class="mw-card-control"><label>x parameter</label>${makeSelect('xparam',params,s.xparam||params[0])}</div><div class="mw-card-control"><label>y parameter</label>${makeSelect('yparam',params,s.yparam||params[Math.min(1,params.length-1)]||params[0])}</div><div class="mw-card-control"><label>output</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric)}</div><div class="mw-card-control"><label>points</label><input type="number" min="5" max="28" step="1" data-setting="points" value="${s.points||14}"/></div><div class="mw-card-control"><label>display</label>${makeSelect('display',['heatmap','contour','heatmap + contour'],s.display||'heatmap + contour')}</div></div>`;
    if(card.type==='gsa') return `<div class="mw-card-controls"><div class="mw-card-control"><label>output</label>${makeSelect('variable',vars,s.variable||state.primaryVariable)}</div><div class="mw-card-control"><label>metric</label>${makeMetricSelect(s.metric)}</div><div class="mw-card-control"><label>range ±</label><input type="number" min="0.01" max="0.8" step="0.01" data-setting="range" value="${s.range||0.2}"/></div><div class="mw-card-control"><label>method</label>${makeSelect('method',['browser screen','Morris export','Sobol export'],s.method||'browser screen')}</div></div>`;
    if(card.type==='sensitivity') return `<div class="mw-card-controls"><div class="mw-card-control"><label>range ±</label><input type="number" min="0.01" max="0.8" step="0.01" data-setting="range" value="${s.range||0.2}"/></div><div class="mw-card-control"><label>screen</label>${makeSelect('screen',['parameter × metric','parameter × variable'],s.screen||'parameter × metric')}</div></div>`;
    return '';
  }

  function renderCards(){ const grid=$('analysisGrid'); grid.innerHTML=''; state.cards.forEach(card=>grid.appendChild(makeCard(card))); requestAnimationFrame(()=>state.cards.forEach(drawCard)); }
  function drawCard(card){
    if(!state.result) state.result=simulate();
    const type=card.type;
    if(type==='equilibrium') drawEquilibrium(card); else if(type==='continuation') drawContinuation(card); else if(type==='stability') drawStability(card); else if(type==='response') drawResponse(card); else if(type==='convergence') drawConvergence(card); else if(type==='landscape') drawLandscape(card); else if(type==='robustness') drawRobustness(card); else if(type==='timecourse') drawTimecourse(card); else if(type==='phase') drawPhase(card); else if(type==='ensemble') drawEnsemble(card); else if(type==='distribution') drawDistribution(card); else if(type==='sweep') drawSweep(card); else if(type==='contour') drawContour(card); else if(type==='gsa') drawGSA(card); else if(type==='sensitivity') drawSensitivityHeatmap(card); else if(type==='equations') drawEquations(card); else if(type==='diagnostics') drawDiagnostics(card);
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
    Plotly.react('plot_'+card.id,traces,plotLayout('Optimization convergence','iteration','objective'),plotConfig());
    $('html_'+card.id).innerHTML=`<p class="mw-note">Best f=${fmt(res.best.f,5)} at x=${fmt(res.best.x,5)}, y=${fmt(res.best.y,5)}. Accepted moves: ${res.accepted}/${res.steps}.</p>`;
  }
  function drawLandscape(card){
    const m=currentModel(), res=state.result; const bounds=m.bounds||{x:[-5,5],y:[-5,5]}; const n=clamp(Math.round(card.settings.points||45),20,90);
    const xs=[], ys=[], z=[]; for(let i=0;i<n;i++) xs.push(bounds.x[0]+(bounds.x[1]-bounds.x[0])*i/(n-1)); for(let j=0;j<n;j++) ys.push(bounds.y[0]+(bounds.y[1]-bounds.y[0])*j/(n-1));
    for(let j=0;j<n;j++){ const row=[]; for(let i=0;i<n;i++) row.push(m.objective(xs[i],ys[j],state.params)); z.push(row); }
    const display=card.settings.display||'heatmap + contour'; let base;
    if(display==='heatmap') base={x:xs,y:ys,z,type:'heatmap',name:'objective'};
    else base={x:xs,y:ys,z,type:'contour',contours:{coloring:display==='contour'?'lines':'heatmap',showlabels:display!=='heatmap'},name:'objective'};
    const path={x:res.series.x,y:res.series.y,type:'scatter',mode:'lines+markers',name:'search path',line:{width:3},marker:{size:4}};
    const best={x:[res.best.x],y:[res.best.y],type:'scatter',mode:'markers',name:'best',marker:{size:12,symbol:'x'}};
    Plotly.react('plot_'+card.id,[base,path,best],plotLayout('Objective landscape','x','y'),plotConfig());
    $('html_'+card.id).innerHTML='<p class="mw-note">Landscape uses the current objective and overlays the accepted browser search path.</p>';
  }
  function drawRobustness(card){
    if(needsManualRun(card)){ Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML=`<div class="mw-run-placeholder"><strong>Robustness / sensitivity</strong><span>Screen how the final optimum changes under local perturbations of start point, algorithm settings, or problem parameters.</span><button class="mw-primary" data-run-card="${card.id}" type="button">Run robustness screen</button><button class="mw-secondary" data-export-salib="${card.id}" type="button">Export SALib script</button></div>`; $('html_'+card.id).innerHTML='<p class="mw-note">For optimization this is robustness/objective sensitivity, not generic biological GSA.</p>'; return; }
    const kind=card.settings.metric||'best_objective', r=clamp(Number(card.settings.range||0.2),0.01,0.8); const rows=sensitivityRows(state.primaryVariable,kind,r);
    Plotly.react('plot_'+card.id,[{x:rows.map(r=>r.effect),y:rows.map(r=>r.param),type:'bar',orientation:'h',text:rows.map(r=>fmt(r.signed,3)),name:'effect'}],{...plotLayout(`Robustness: ${kind}`,'normalized effect','parameter'),margin:{l:95,r:25,t:48,b:55}},plotConfig());
    $('html_'+card.id).innerHTML=`<table class="mw-table mw-compact-table"><thead><tr><th>parameter</th><th>signed</th><th>absolute</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(r.param)}</td><td>${fmt(r.signed,4)}</td><td>${fmt(r.effect,4)}</td></tr>`).join('')}</tbody></table><p class="mw-note">Browser robustness screen. Use <button class="mw-secondary" data-export-salib="${card.id}" type="button">Export SALib script</button> for full Python screening over the same metric.</p>`;
  }
  function drawTimecourse(card){ const m=currentModel(), res=state.result; const vars=(card.settings.display||'all')==='primary'?[state.primaryVariable]:m.variables; const traces=vars.map(v=>({x:res.t,y:res.series[v],type:'scatter',mode:'lines',name:v})); Plotly.react('plot_'+card.id,traces,plotLayout('Time course','time','state'),plotConfig()); $('html_'+card.id).innerHTML=''; }
  function drawPhase(card){ const m=currentModel(), res=state.result; const xvar=card.settings.xvar||m.variables[0], yvar=card.settings.yvar||m.variables[Math.min(1,m.variables.length-1)]; Plotly.react('plot_'+card.id,[{x:res.series[xvar],y:res.series[yvar],type:'scatter',mode:'lines',name:`${xvar} vs ${yvar}`}],plotLayout('Phase portrait',xvar,yvar),plotConfig()); $('html_'+card.id).innerHTML=''; }
  function needsManualRun(card){ return ['sweep','contour','gsa','sensitivity','robustness','continuation','response'].includes(card.type) && !card.settings.computed; }
  function drawManualCard(card, label, detail){
    Plotly.purge('plot_'+card.id);
    $('plot_'+card.id).innerHTML=`<div class="mw-run-placeholder"><strong>${label}</strong><span>${detail}</span><button class="mw-primary" data-run-card="${card.id}" type="button">Run this analysis</button></div>`;
    $('html_'+card.id).innerHTML='<p class="mw-note">Heavy browser analyses are not auto-run on page load. This keeps stochastic and large scans responsive.</p>';
  }
  function drawEnsemble(card){ const res=state.result; const v=card.settings.variable||state.primaryVariable; const n=clamp(Math.round(card.settings.paths||18),5,40); const traces=(res.paths||[]).slice(0,n).map((p,i)=>({x:res.t,y:p[v],type:'scatter',mode:'lines',name:`run ${i+1}`,opacity:.38,line:{width:1},showlegend:i<10})); traces.push({x:res.t,y:res.series[v],type:'scatter',mode:'lines',name:`mean ${v}`,line:{width:4}}); Plotly.react('plot_'+card.id,traces,plotLayout(`Ensemble trajectories: ${v}`,'time',v),plotConfig()); $('html_'+card.id).innerHTML=`<p class="mw-note">Showing ${Math.min(n,(res.paths||[]).length)} sample paths from ${res.runs} ensemble runs.</p>`; }
  function drawDistribution(card){ const res=state.result; const v=card.settings.variable||state.primaryVariable; const bins=clamp(Math.round(card.settings.bins||25),5,60); const finals=res.finals?.[v]||[]; Plotly.react('plot_'+card.id,[{x:finals,type:'histogram',nbinsx:bins,name:`final ${v}`}],plotLayout(`Final ${v} distribution`,'final value','runs'),plotConfig()); $('html_'+card.id).innerHTML=`<p class="mw-note">Mean ${fmt(mean(finals),4)} · variance ${fmt(variance(finals),4)} · extinction probability ${fmt(finals.filter(x=>x<=0).length/Math.max(1,finals.length),4)}</p>`; }
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
    if(display==='contour') trace={x:xs,y:ys,z,type:'contour',contours:{coloring:'heatmap'},name:`${kind}(${variable})`};
    else if(display==='heatmap') trace={x:xs,y:ys,z,type:'heatmap',name:`${kind}(${variable})`};
    else trace={x:xs,y:ys,z,type:'contour',contours:{coloring:'heatmap',showlabels:true},name:`${kind}(${variable})`};
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
    if(needsManualRun(card)){ Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML=`<div class="mw-run-placeholder"><strong>GSA / sensitivity ranking</strong><span>Run a local/range browser screen, or export a full SALib Morris/Sobol script without running the browser screen.</span><button class="mw-primary" data-run-card="${card.id}" type="button">Run browser screen</button><button class="mw-secondary" data-export-salib="${card.id}" type="button">Export SALib script</button></div>`; $('html_'+card.id).innerHTML='<p class="mw-note">Browser screen is local/range based; exported Python handles Morris/Sobol.</p>'; return; }
    const variable=card.settings.variable||state.primaryVariable, kind=card.settings.metric||metricOptions()[0], r=clamp(Number(card.settings.range||0.2),0.01,0.8); const rows=sensitivityRows(variable,kind,r);
    const method=card.settings.method||'browser screen';
    Plotly.react('plot_'+card.id,[{x:rows.map(r=>r.effect),y:rows.map(r=>r.param),type:'bar',orientation:'h',text:rows.map(r=>fmt(r.signed,3)),name:'effect'}],{...plotLayout(`GSA screen: ${kind}(${variable})`,'normalized effect','parameter'),margin:{l:90,r:25,t:48,b:55}},plotConfig());
    const table=`<table class="mw-table mw-compact-table"><thead><tr><th>parameter</th><th>signed</th><th>absolute</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${safe(r.param)}</td><td>${fmt(r.signed,4)}</td><td>${fmt(r.effect,4)}</td></tr>`).join('')}</tbody></table>`;
    const exportLabel = method==='Morris export' ? 'Export Morris SALib' : method==='Sobol export' ? 'Export Sobol SALib' : 'Export SALib script';
    $('html_'+card.id).innerHTML=`${table}<p class="mw-note"><b>Browser result:</b> quick local/range screen, not full Morris/Sobol. Use <button class="mw-secondary" data-export-salib="${card.id}" type="button">${exportLabel}</button> for full Python GSA using this card's output, metric and method.</p>`;
  }
  function drawSensitivityHeatmap(card){
    if(needsManualRun(card)) return drawManualCard(card,'Sensitivity heatmap','Compute local signed responses across parameters and metrics/variables.');
    const m=currentModel(); const r=clamp(Number(card.settings.range||0.2),0.01,0.8); const screen=card.settings.screen||'parameter × metric'; let xLabels, z;
    if(screen==='parameter × variable'){
      xLabels=m.variables; z=Object.keys(m.params).map(p=>m.variables.map(v=>{ const row=sensitivityRows(v,metricOptions()[0],r).find(x=>x.param===p); return row?row.signed:0; }));
    } else {
      xLabels=metricOptions().slice(0,5); z=Object.keys(m.params).map(p=>xLabels.map(kind=>{ const row=sensitivityRows(state.primaryVariable,kind,r).find(x=>x.param===p); return row?row.signed:0; }));
    }
    const yLabels=Object.keys(m.params); Plotly.react('plot_'+card.id,[{x:xLabels,y:yLabels,z,type:'heatmap',name:'signed sensitivity'}],plotLayout('Sensitivity heatmap',screen.includes('variable')?'variable':'metric','parameter'),plotConfig()); $('html_'+card.id).innerHTML='<p class="mw-note">Signed local response heatmap from ± parameter perturbations. This is a browser screen, not full variance-based GSA.</p>';
  }
  function drawEquations(card){ Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML='<div class="mw-equation-card" id="latex_'+card.id+'"></div>'; renderLatexInto($('latex_'+card.id),currentModel().latex||currentModel().equations); $('html_'+card.id).innerHTML=`<p class="mw-note">LaTeX-rendered ${currentModel().type==='CTMC'?'reaction scheme':currentModel().type==='OPT'?'objective definition':'ODE system'}.</p>`; }
  function drawDiagnostics(card){ const m=currentModel(), res=state.result; Plotly.purge('plot_'+card.id); $('plot_'+card.id).innerHTML=''; if(res.kind==='OPT'){ const rows=metricOptions().map(k=>`<tr><td>${safe(k)}</td><td>${fmt(metric(res,state.primaryVariable,k),6)}</td></tr>`).join(''); $('html_'+card.id).innerHTML=`<table class="mw-table"><thead><tr><th>optimization metric</th><th>value</th></tr></thead><tbody>${rows}</tbody></table><p class="mw-note">Problem: ${m.name}. Accepted moves: ${res.accepted}/${res.steps}. Best point: (${fmt(res.best.x,5)}, ${fmt(res.best.y,5)}).</p>`; return; } let rows=''; m.variables.forEach(v=>{ rows+=`<tr><td>${safe(v)}</td><td>${fmt(metric(res,v,res.kind==='CTMC'?'mean_final':'final'),5)}</td><td>${fmt(metric(res,v,res.kind==='CTMC'?'max_mean':'max'),5)}</td><td>${fmt(metric(res,v,'auc'),5)}</td></tr>`; }); const extra=res.kind==='CTMC'?`Runs: ${res.runs}. Events: ${res.eventCount}.`:`Steps computed: ${res.steps}. Numerical warning: ${res.bad?'yes':'no'}.`; $('html_'+card.id).innerHTML=`<table class="mw-table"><thead><tr><th>variable</th><th>final / mean final</th><th>max / max mean</th><th>AUC</th></tr></thead><tbody>${rows}</tbody></table><p class="mw-note">Model: ${m.name}. ${extra}</p>`; }

  function renderDetail(){
    const m=currentModel(), body=$('detailBody'), tab=state.detailTab;
    if(tab==='equations') body.innerHTML=`<h3>${m.type==='CTMC'?'Reaction scheme':m.type==='OPT'?'Objective / constraints':'Equations'}</h3><div id="drawerLatex"></div><h3>Text form</h3>${m.equations.map(e=>`<div class="mw-equation">${safe(e)}</div>`).join('')}<h3>Initial conditions</h3>${tableFromObject(state.initials)}`;
    else if(tab==='parameters') body.innerHTML=`<h3>Parameters</h3>${tableFromParams(m)}<p class="mw-note">The top strip shows active parameter values. Bounds drive sweeps, heatmaps and SALib exports.</p>`;
    else if(tab==='json') body.innerHTML=`<h3>Current model JSON</h3><pre class="mw-code">${safe(JSON.stringify({id:m.id,name:m.name,type:m.type,family:m.family,variables:m.variables,parameters:state.params,initials:state.initials,equations:m.equations,events:m.events?.map(e=>({name:e.name,expr:e.expr,updates:e.updates})),tStart:state.tStart,tEnd:state.tEnd,steps:state.steps,runs:state.runs},null,2))}</pre>`;
    else body.innerHTML=`<h3>Exports</h3><p>Export the current model, simulation result, Python script, SALib script, or full JSON report.</p><p><button class="mw-secondary" id="drawerExportJson" type="button">Model JSON</button> <button class="mw-secondary" id="drawerExportPython" type="button">Python simulation</button> <button class="mw-secondary" id="drawerExportSALib" type="button">SALib GSA</button></p>`;
    if(tab==='equations') renderLatexInto($('drawerLatex'),m.latex||m.equations);
  }
  function tableFromObject(obj){ return `<table class="mw-table"><tbody>${Object.entries(obj).map(([k,v])=>`<tr><th>${safe(k)}</th><td>${fmt(v,6)}</td></tr>`).join('')}</tbody></table>`; }
  function tableFromParams(m){ return `<table class="mw-table"><thead><tr><th>name</th><th>value</th><th>min</th><th>max</th><th>label</th></tr></thead><tbody>${Object.entries(m.params).map(([k,d])=>`<tr><td>${safe(k)}</td><td>${fmt(state.params[k],6)}</td><td>${d.min}</td><td>${d.max}</td><td>${safe(d.label||'')}</td></tr>`).join('')}</tbody></table>`; }

  function downloadText(name,text,type='text/plain'){ const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},1000); }
  function exportResultJson(){ downloadText(`${currentModel().id}-foko-lab-report.json`,JSON.stringify({model:currentModel().name,type:currentModel().type,params:state.params,initials:state.initials,result:state.result,cards:state.cards.map(c=>({type:c.type,settings:c.settings}))},null,2),'application/json'); }
  function pythonRhs(m){
    const map={sir:"dS = -beta*S*I/N\n    dI = beta*S*I/N - gamma*I\n    dR = gamma*I\n    return [dS, dI, dR]",lotka:"dprey = alpha*prey - beta*prey*predator\n    dpredator = delta*prey*predator - gamma*predator\n    return [dprey, dpredator]",lorenz:"dx = sigma*(y-x)\n    dy = x*(rho-z)-y\n    dz = x*y-beta*z\n    return [dx, dy, dz]",michaelis:"v = vmax*S/(km+S)\n    return [-v, v]",vanderpol:"return [y, mu*(1-x*x)*y-x]",toggle:"dA = a1/(1+B**n)-d*A\n    dB = a2/(1+A**n)-d*B\n    return [dA, dB]",brusselator:"dX = A + X*X*Y - (B+1)*X\n    dY = B*X - X*X*Y\n    return [dX, dY]",
      'enzyme-steady':"dS = vin - vmax*S/(km+S) - kout*S\n    return [dS]",
      'toggle-steady':"dA = a1/(1+B**n)-d*A\n    dB = a2/(1+A**n)-d*B\n    return [dA, dB]",
      'cubic-bistable':"dx = a + b*x - x**3\n    return [dx]"}; return map[m.id]||"raise NotImplementedError";
  }
  function exportPython(){
    const m=currentModel(); if(m.type==='CTMC'){ exportPythonCTMC(); return; } if(m.type==='STEADY'){ exportPythonSTEADY(); return; } if(m.type==='OPT'){ exportPythonOPT(); return; }
    const vars=m.variables, pnames=Object.keys(m.params); const code=`import numpy as np\nfrom scipy.integrate import solve_ivp\nimport matplotlib.pyplot as plt\n\n# Foko Lab export: ${m.name}\nparams = ${JSON.stringify(state.params,null,2)}\ny0 = ${JSON.stringify(vars.map(v=>state.initials[v]))}\nvariables = ${JSON.stringify(vars)}\n\ndef rhs(t, y):\n    ${vars.map((v,i)=>`${v} = y[${i}]`).join('\n    ')}\n    ${pnames.map(p=>`${p} = params['${p}']`).join('\n    ')}\n    ${pythonRhs(m)}\n\nt_eval = np.linspace(${state.tStart}, ${state.tEnd}, ${state.steps+1})\nsol = solve_ivp(rhs, (${state.tStart}, ${state.tEnd}), y0, t_eval=t_eval, method='RK45')\nfor i, name in enumerate(variables):\n    plt.plot(sol.t, sol.y[i], label=name)\nplt.legend(); plt.xlabel('time'); plt.ylabel('state'); plt.tight_layout(); plt.show()\n`;
    downloadText(`${m.id}-simulation.py`,code,'text/x-python');
  }
  function pythonObjective(m){
    const map={
      quadratic:"return (x-1)**2 + 0.5*(y+2)**2",
      rosenbrock:"return (a-x)**2 + b*(y-x*x)**2",
      rastrigin:"return 20 + x*x - 10*np.cos(2*np.pi*x) + y*y - 10*np.cos(2*np.pi*y)",
      constrained:"return (x-1)**2 + (y-1)**2 + penalty*max(0, x+y-1.2)**2"
    }; return map[m.id]||"raise NotImplementedError";
  }

  function exportPythonSTEADY(){
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
    const m=currentModel(); const code=`import numpy as np\nimport matplotlib.pyplot as plt\n\n# Foko Lab optimization export: ${m.name}\nparams = ${JSON.stringify(state.params,null,2)}\n\ndef objective(x, y, params):\n    ${Object.keys(m.params).map(p=>`${p} = params.get('${p}', ${JSON.stringify(m.params[p].value)})`).join('\\n    ')}\n    ${pythonObjective(m)}\n\ndef optimize(params):\n    x = float(params.get('x0', 0.0)); y = float(params.get('y0', 0.0))\n    step = float(params.get('step', 0.5)); iterations = int(params.get('iterations', 250))\n    directions = [(1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)]\n    path=[]; best=(x,y,objective(x,y,params))\n    for i in range(iterations+1):\n        f=objective(x,y,params);\n        if f<best[2]: best=(x,y,f)\n        path.append((i,x,y,f,best[2]))\n        cand=(x,y,f)\n        for dx,dy in directions:\n            scale=1/np.sqrt(2) if abs(dx)+abs(dy)>1 else 1\n            nx=x+dx*step*scale; ny=y+dy*step*scale; nf=objective(nx,ny,params)\n            if nf<cand[2]: cand=(nx,ny,nf)\n        if cand[2] < f-1e-12:\n            x,y=cand[0],cand[1]; step*=0.995\n        else:\n            step*=0.86\n    return np.array(path), best\n\npath,best=optimize(params)\nprint('best x,y,f =', best)\nplt.plot(path[:,0], path[:,3], label='current objective')\nplt.plot(path[:,0], path[:,4], label='best objective')\nplt.xlabel('iteration'); plt.ylabel('objective'); plt.legend(); plt.tight_layout(); plt.show()\n`;
    downloadText(`${m.id}-optimization.py`,code,'text/x-python');
  }
  function exportPythonCTMC(){ const m=currentModel(); const vars=m.variables, pnames=Object.keys(m.params); const events=m.events.map(e=>({name:e.name,expr:e.expr,updates:e.updates})); const code=`import numpy as np\nimport matplotlib.pyplot as plt\n\n# Foko Lab Gillespie export: ${m.name}\nvariables = ${JSON.stringify(vars)}\nparams = ${JSON.stringify(state.params,null,2)}\ny0 = ${JSON.stringify(vars.map(v=>state.initials[v]))}\nevents = ${JSON.stringify(events,null,2)}\n\ndef propensity(expr, state, params):\n    env = {**dict(zip(variables, state)), **params, 'np': np}\n    return max(0.0, float(eval(expr, {'__builtins__': {}}, env)))\n\ndef gillespie(seed=1, t_end=${state.tEnd}, steps=${state.steps}):\n    rng = np.random.default_rng(seed)\n    grid = np.linspace(${state.tStart}, t_end, steps+1)\n    y = np.array(y0, dtype=float)\n    out = np.zeros((len(variables), len(grid)))\n    t = ${state.tStart}\n    for gi, target in enumerate(grid):\n        while t < target:\n            rates = np.array([propensity(ev['expr'], y, params) for ev in events])\n            total = rates.sum()\n            if total <= 0:\n                t = target; break\n            tau = rng.exponential(1/total)\n            if t + tau > target:\n                t = target; break\n            t += tau\n            idx = rng.choice(len(events), p=rates/total)\n            for name, delta in events[idx]['updates'].items():\n                y[variables.index(name)] = max(0, y[variables.index(name)] + delta)\n        out[:, gi] = y\n    return grid, out\n\npaths = [gillespie(seed=i)[1] for i in range(${state.runs})]\nmean_path = np.mean(paths, axis=0)\nt = gillespie(seed=999)[0]\nfor i, name in enumerate(variables):\n    plt.plot(t, mean_path[i], label=f'mean {name}')\nplt.legend(); plt.xlabel('time'); plt.ylabel('count'); plt.tight_layout(); plt.show()\n`; downloadText(`${m.id}-gillespie.py`,code,'text/x-python'); }
  function exportSALib(card=null){
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
  function exportCardJson(card){ downloadText(`${currentModel().id}-${card.type}.json`,JSON.stringify({model:currentModel().name,card:{type:card.type,settings:card.settings},params:state.params,result:state.result},null,2),'application/json'); }

  function bind(){
    $('modelSelect').addEventListener('change', e=>{ setDefaults(e.target.value); renderAll(); run(); });
    $('resetModel').addEventListener('click',()=>{ setDefaults(state.modelId); renderAll(); run(); });
    $('runAll').addEventListener('click',run); $('exportReport').addEventListener('click',exportResultJson);
    $('addAnalysis').addEventListener('click',()=>{ state.cards.push({id:'ca_'+uid(),type:$('analysisType').value,settings:{}}); renderCards(); });
    $('openModelDrawer').addEventListener('click',()=>{ $('modelDrawer').classList.add('open'); $('modelDrawer').setAttribute('aria-hidden','false'); renderDetail(); });
    $('closeModelDrawer').addEventListener('click',()=>{ $('modelDrawer').classList.remove('open'); $('modelDrawer').setAttribute('aria-hidden','true'); });
    $('modelDrawer').addEventListener('click',e=>{ if(e.target.id==='modelDrawer') $('closeModelDrawer').click(); });
    document.querySelectorAll('[data-detail-tab]').forEach(btn=>btn.addEventListener('click',()=>{ document.querySelectorAll('[data-detail-tab]').forEach(b=>b.classList.toggle('active',b===btn)); state.detailTab=btn.dataset.detailTab; renderDetail(); }));
    $('parameterStrip').addEventListener('input', e=>{ const p=e.target.dataset.param; if(!p) return; state.params[p]=Number(e.target.value); const lab=$('pv_'+p); if(lab) lab.textContent=fmt(state.params[p],5); debounceRun(); });
    $('initialGrid').addEventListener('change', e=>{ const v=e.target.dataset.initial; if(v){ state.initials[v]=Number(e.target.value); debounceRun(); } if(e.target.id==='runs'){ state.runs=Number(e.target.value); debounceRun(); } if(e.target.id==='seed'){ state.seed=Number(e.target.value); debounceRun(); } });
    ['tStart','tEnd','steps'].forEach(id=>$(id).addEventListener('change',e=>{ state[id]=Number(e.target.value); debounceRun(); }));
    $('primaryVariable').addEventListener('change',e=>{ state.primaryVariable=e.target.value; renderCards(); });
    $('analysisGrid').addEventListener('change',e=>{ const cardEl=e.target.closest('.mw-card'); if(!cardEl) return; const card=state.cards.find(c=>c.id===cardEl.dataset.cardId); if(!card) return; const key=e.target.dataset.setting; if(key){ card.settings[key]=e.target.type==='number'?Number(e.target.value):e.target.value; if(['sweep','contour','gsa','sensitivity','robustness','continuation','response'].includes(card.type)) card.settings.computed=false; drawCard(card); } });
    $('analysisGrid').addEventListener('click',e=>{ const salib=e.target.dataset.exportSalib; const cardEl=e.target.closest('.mw-card'); const card = cardEl ? state.cards.find(c=>c.id===cardEl.dataset.cardId) : null; const runCard=e.target.dataset.runCard; if(runCard && card){ card.settings.computed=true; drawCard(card); return; } if(salib){ exportSALib(card); return; } if(!cardEl || !card) return; const action=e.target.dataset.action; if(action==='remove'){ state.cards=state.cards.filter(c=>c.id!==card.id); renderCards(); } if(action==='duplicate'){ state.cards.push({id:'cp_'+uid(),type:card.type,settings:{...card.settings}}); renderCards(); } if(action==='export-json') exportCardJson(card); if(action==='export-png') Plotly.downloadImage('plot_'+card.id,{format:'png',filename:`${currentModel().id}-${card.type}`}); });
    $('detailBody').addEventListener('click',e=>{ if(e.target.id==='drawerExportJson') exportResultJson(); if(e.target.id==='drawerExportPython') exportPython(); if(e.target.id==='drawerExportSALib') exportSALib(); });
  }
  function renderAll(){ renderModelSelect(); renderHeader(); renderParameterStrip(); renderAnalysisTypeSelect(); renderCards(); renderDetail(); }
  function toast(msg){ const t=$('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2200); }
  function init(){ const q=new URLSearchParams(location.search); const model=q.get('model') || q.get('example') || 'sir'; setDefaults(MODELS[model]?model:'sir'); renderAll(); bind(); run(); toast('Model workbench RC ready'); window.addEventListener('load',()=>{ renderMathStrip(); renderDetail(); renderCards(); }); }
  document.addEventListener('DOMContentLoaded',init);
})();
