'use strict';

const $ = id => document.getElementById(id);
const deepClone = x => JSON.parse(JSON.stringify(x));

const PALETTES = {
  seaborn: ['#2563eb','#14b8a6','#7c3aed','#f97316','#22c55e','#ef4444'],
  bokeh: ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#17becf'],
  viridis: ['#440154','#31688e','#35b779','#fde725','#21918c','#90d743'],
  scientific: ['#0072b2','#009e73','#cc79a7','#d55e00','#56b4e9','#f0e442'],
  mono: ['#334155','#64748b','#94a3b8','#cbd5e1','#475569','#111827']
};


const CORE_EXAMPLES = {
  ode: ['Lotka–Volterra','Lorenz','SIR','SEIR','Robertson','Enzyme kinetics'],
  param: ['Lotka–Volterra sweep','SIR beta–gamma','SEIR incubation','Lorenz rho–sigma','Enzyme kinetics sweep'],
  opt: ['Constrained quadratic','Rosenbrock on disk','Portfolio toy model','Lasso regression geometry','Secretary stopping rule','Pareto design trade-off']
};

const EXAMPLES = {
  ode: {
    'Lotka–Volterra': {narrative:'Predator–prey cycles. Increase beta to make predators suppress prey faster.', vars:['x','y'], eqs:['alpha*x - beta*x*y','delta*x*y - gamma*y'], y0:[10,5], params:{alpha:[1.1,.2,3], beta:[.4,.05,1], delta:[.1,.01,.4], gamma:[.4,.05,1]}, t0:0,t1:40,points:1200,method:'rk45'},
    'Lorenz': {narrative:'Chaotic 3D dynamics. Try rho near 24–30 and inspect 3D phase portraits or Poincaré sections.', vars:['x','y','z'], eqs:['sigma*(y-x)','x*(rho-z)-y','x*y-beta*z'], y0:[1,1,1], params:{sigma:[10,6,16], rho:[28,12,40], beta:[8/3,2,3]}, t0:0,t1:35,points:2500,method:'rk45', sectionVar:'x', sectionValue:0},
    'SIR': {narrative:'Epidemic model with susceptible, infected, and recovered compartments. Increase beta to accelerate transmission.', vars:['S','I','R'], eqs:['-beta*S*I/N','beta*S*I/N-gamma*I','gamma*I'], y0:[990,10,0], params:{beta:[.35,.05,1.1], gamma:[.1,.03,.4], N:[1000,1000,1000]}, t0:0,t1:120,points:900,method:'rk45'},
    'SEIR': {narrative:'Adds an exposed compartment before infection. Increase sigma to shorten incubation.', vars:['S','E','I','R'], eqs:['-beta*S*I/N','beta*S*I/N-sigma*E','sigma*E-gamma*I','gamma*I'], y0:[990,0,10,0], params:{beta:[.42,.05,1.1], sigma:[.2,.05,.8], gamma:[.1,.03,.4], N:[1000,1000,1000]}, t0:0,t1:160,points:1000,method:'rk45'},
    'Robertson': {narrative:'Canonical stiff chemistry benchmark. Browser RK methods are exploratory; export Python with Radau or BDF for reliable results.', vars:['A','B','C'], eqs:['-k1*A + k3*B*C','k1*A - k2*B^2 - k3*B*C','k2*B^2'], y0:[1,0,0], params:{k1:[.04,.01,.2], k2:[1e4,1e3,5e4], k3:[3e7,1e6,5e7]}, t0:0,t1:1,points:1200,method:'rk45'},
    'Enzyme kinetics': {narrative:'Michaelis–Menten style conversion of substrate to product. Vary Km to change saturation.', vars:['S','P'], eqs:['-vmax*S/(Km+S)','vmax*S/(Km+S)'], y0:[10,0], params:{vmax:[1,.2,3], Km:[2,.2,8]}, t0:0,t1:25,points:600,method:'rk45'},
    'Van der Pol': {narrative:'Limit cycle oscillator. Large mu creates stiffness; export Python with Radau for serious stiff runs.', vars:['x','v'], eqs:['v','mu*(1-x^2)*v-x'], y0:[2,0], params:{mu:[2,.1,12]}, t0:0,t1:40,points:1200,method:'rk45'},
    'FA metabolism bistability': {narrative:'PhD-inspired coarse-grained fatty-acid metabolism model with acetyl-CoA, malonyl-CoA, fatty acids, and triglycerides. Uses Michaelis–Menten terms and non-competitive inhibition.', vars:['S1','S2','S3','S4'], eqs:['k1 - V1*S1/((Km1+S1)*(1+q1*S3)) + V4*S3/((Km4+S3)*(1+q4*S2)) - alpha*S1','V1*S1/((Km1+S1)*(1+q1*S3)) - V2*S2/(Km2+S2)','k2 + V2*S2/(Km2+S2) - V3*S3/(Km3+S3) - V4*S3/((Km4+S3)*(1+q4*S2)) + V5*S4/(Km5+S4) - beta*S3','k3 + V3*S3/(Km3+S3) - V5*S4/(Km5+S4) - gamma*S4'], y0:[1.2,.55,1.0,.8], params:{k1:[.55,.1,1.2], k2:[.25,.02,.8], k3:[.18,.01,.7], alpha:[.2,.03,.6], beta:[.18,.03,.6], gamma:[.14,.02,.5], V1:[1.2,.2,3], Km1:[.6,.1,2], q1:[1.1,.1,4], V2:[.9,.1,3], Km2:[.45,.05,2], V3:[.7,.1,3], Km3:[.5,.05,2], V4:[.8,.1,3], Km4:[.55,.05,2], q4:[1.0,.1,4], V5:[.55,.05,2], Km5:[.5,.05,2]}, t0:0,t1:80,points:1600,method:'rk45'},
    'FADNS semi-mechanistic': {narrative:'Refined PhD FADNS model with CoA sequestration: substrate pools, FAS-bound elongation states, ECoA inhibition, and C14/C16/C18 products.', vars:['AcetCoA','MalCoA','NADPH','CoA','E','ECoA','EC2','EC4','EC6','EC8','EC10','EC12','EC14','EC16','EC18','C14','C16','C18'], plotPriority:['C14','C16','C18','CoA','ECoA','AcetCoA','MalCoA','NADPH'], eqs:['-kon*E*AcetCoA + koff*EC2','-(kappa*EC2*MalCoA*NADPH + kappa*EC4*MalCoA*NADPH + kappa*EC6*MalCoA*NADPH + kappa*EC8*MalCoA*NADPH + kappa*EC10*MalCoA*NADPH + kappa*EC12*MalCoA*NADPH + kappa*EC14*MalCoA*NADPH + kappa*EC16*MalCoA*NADPH)','-2*(kappa*EC2*MalCoA*NADPH + kappa*EC4*MalCoA*NADPH + kappa*EC6*MalCoA*NADPH + kappa*EC8*MalCoA*NADPH + kappa*EC10*MalCoA*NADPH + kappa*EC12*MalCoA*NADPH + kappa*EC14*MalCoA*NADPH + kappa*EC16*MalCoA*NADPH)','(kappa*EC2*MalCoA*NADPH + kappa*EC4*MalCoA*NADPH + kappa*EC6*MalCoA*NADPH + kappa*EC8*MalCoA*NADPH + kappa*EC10*MalCoA*NADPH + kappa*EC12*MalCoA*NADPH + kappa*EC14*MalCoA*NADPH + kappa*EC16*MalCoA*NADPH) + delta14*EC14 + delta16*EC16 + delta18*EC18 - kinhib*E*CoA + krelease*ECoA','-kon*E*AcetCoA + koff*EC2 + delta14*EC14 + delta16*EC16 + delta18*EC18 - kinhib*E*CoA + krelease*ECoA','kinhib*E*CoA - krelease*ECoA','kon*E*AcetCoA - koff*EC2 - kappa*EC2*MalCoA*NADPH','kappa*EC2*MalCoA*NADPH - kappa*EC4*MalCoA*NADPH','kappa*EC4*MalCoA*NADPH - kappa*EC6*MalCoA*NADPH','kappa*EC6*MalCoA*NADPH - kappa*EC8*MalCoA*NADPH','kappa*EC8*MalCoA*NADPH - kappa*EC10*MalCoA*NADPH','kappa*EC10*MalCoA*NADPH - kappa*EC12*MalCoA*NADPH','kappa*EC12*MalCoA*NADPH - kappa*EC14*MalCoA*NADPH - delta14*EC14','kappa*EC14*MalCoA*NADPH - kappa*EC16*MalCoA*NADPH - delta16*EC16','kappa*EC16*MalCoA*NADPH - delta18*EC18','delta14*EC14','delta16*EC16','delta18*EC18'], y0:[120,18,160,0.01,1,0,0,0,0,0,0,0,0,0,0,0,0,0], params:{kon:[.018,.002,.08], koff:[.008,0,.06], kappa:[.00002,.000002,.00008], delta14:[.010,.001,.05], delta16:[.026,.002,.09], delta18:[.012,.001,.06], kinhib:[.008,.001,.04], krelease:[.001,0,.015]}, t0:0,t1:120,points:900,method:'rk45'},
    'Love–hate oscillator': {narrative:'Strogatz-style Romeo–Juliet model. Romeo responds positively to Juliet, while Juliet responds oppositely to Romeo, producing a simple interpretable oscillator.', vars:['R','J'], eqs:['a*J','-b*R'], y0:[1,0], params:{a:[1,.2,3], b:[1,.2,3]}, t0:0,t1:25,points:900,method:'rk45'},
    'Braess routing dynamics': {narrative:'Braess-inspired route-choice model. In this simplified teaching system the shortcut parameter changes private incentives and typically lowers the aggregate travel-cost proxy; it illustrates route-choice feedback rather than the full Braess paradox.', vars:['x'], eqs:['eta*x*(1-x)*((22 + 10*(1-x) - shortcut) - (10 + 30*x))'], y0:[.25], params:{eta:[.8,.1,2], shortcut:[0,0,18]}, t0:0,t1:35,points:700,method:'rk45'},
    'Ziegler destabilization': {narrative:'Ziegler-inspired non-conservative structural model. Increasing stiffness or follower load can destabilize oscillations instead of calming them.', vars:['q1','q2','v1','v2'], eqs:['v1','v2','-(k1+k2)*q1 + k2*q2 + P*q2 - c*v1','k2*q1 - (k2+k3)*q2 - P*q1 - c*v2'], y0:[.1,0,0,.05], params:{k1:[2,.5,8], k2:[4,.5,12], k3:[2,.5,8], P:[3,0,10], c:[.05,0,.4]}, t0:0,t1:40,points:1600,method:'rk45'},
    'Calvin cycle mini-model': {narrative:'Minimal photosynthesis-inspired ODE for PGA and RuBP pools. It follows carbon fixation, photorespiration, and regeneration terms.', vars:['PGA','RuBP'], eqs:['Vcmax*RuBP/(Kc+RuBP) - Vo*RuBP/(Ko+RuBP) - Vregen*PGA/(Kr+PGA)','Vregen*PGA/(Kr+PGA) - Vcmax*RuBP/(Kc+RuBP) - Vo*RuBP/(Ko+RuBP)'], y0:[2.0,1.0], params:{Vcmax:[1.2,.2,3], Vo:[.2,.01,.8], Vregen:[1.0,.2,3], Kc:[.8,.1,3], Ko:[1.2,.2,4], Kr:[.9,.1,3]}, t0:0,t1:30,points:800,method:'rk45'}
  },
  param: {
    'Lotka–Volterra sweep': {narrative:'Run default parameters, or sweep alpha and beta to inspect predator–prey outcomes.', vars:['x','y'], eqs:['alpha*x - beta*x*y','delta*x*y - gamma*y'], y0:[10,5], params:{alpha:[1.1,.2,3], beta:[.4,.05,1], delta:[.1,.01,.4], gamma:[.4,.05,1]}, t0:0,t1:40,points:1000,method:'rk45', sweep:['alpha','beta','x','max']},
    'Lorenz rho–sigma': {narrative:'Sweep sigma and rho to inspect chaotic amplitude changes.', vars:['x','y','z'], eqs:['sigma*(y-x)','x*(rho-z)-y','x*y-beta*z'], y0:[1,1,1], params:{sigma:[10,6,16], rho:[28,12,40], beta:[8/3,2,3]}, t0:0,t1:28,points:1600,method:'rk45', sweep:['sigma','rho','z','max'], sectionVar:'x', sectionValue:0},
    'SIR beta–gamma': {narrative:'Sweep infection and recovery rates. Heatmaps show peak infected population.', vars:['S','I','R'], eqs:['-beta*S*I/N','beta*S*I/N-gamma*I','gamma*I'], y0:[990,10,0], params:{beta:[.35,.05,1.1], gamma:[.1,.03,.4], N:[1000,1000,1000]}, t0:0,t1:120,points:800,method:'rk45', sweep:['beta','gamma','I','max']},
    'SEIR incubation': {narrative:'Sweep exposure and recovery timescales.', vars:['S','E','I','R'], eqs:['-beta*S*I/N','beta*S*I/N-sigma*E','sigma*E-gamma*I','gamma*I'], y0:[990,0,10,0], params:{beta:[.42,.1,1.2], sigma:[.2,.04,.8], gamma:[.1,.03,.4], N:[1000,1000,1000]}, t0:0,t1:160,points:900,method:'rk45', sweep:['sigma','gamma','I','max']},
    'Enzyme kinetics sweep': {narrative:'Sweep vmax and Km to inspect substrate depletion.', vars:['S','P'], eqs:['-vmax*S/(Km+S)','vmax*S/(Km+S)'], y0:[10,0], params:{vmax:[1,.2,3], Km:[2,.2,8]}, t0:0,t1:25,points:500,method:'rk45', sweep:['vmax','Km','P','final']},
    'FA metabolism parameter sweep': {narrative:'Sweep inhibition strengths in the PhD-inspired fatty-acid metabolism model to inspect shifts in the FA pool.', vars:['S1','S2','S3','S4'], eqs:['k1 - V1*S1/((Km1+S1)*(1+q1*S3)) + V4*S3/((Km4+S3)*(1+q4*S2)) - alpha*S1','V1*S1/((Km1+S1)*(1+q1*S3)) - V2*S2/(Km2+S2)','k2 + V2*S2/(Km2+S2) - V3*S3/(Km3+S3) - V4*S3/((Km4+S3)*(1+q4*S2)) + V5*S4/(Km5+S4) - beta*S3','k3 + V3*S3/(Km3+S3) - V5*S4/(Km5+S4) - gamma*S4'], y0:[1.2,.55,1.0,.8], params:{k1:[.55,.1,1.2], k2:[.25,.02,.8], k3:[.18,.01,.7], alpha:[.2,.03,.6], beta:[.18,.03,.6], gamma:[.14,.02,.5], V1:[1.2,.2,3], Km1:[.6,.1,2], q1:[1.1,.1,4], V2:[.9,.1,3], Km2:[.45,.05,2], V3:[.7,.1,3], Km3:[.5,.05,2], V4:[.8,.1,3], Km4:[.55,.05,2], q4:[1.0,.1,4], V5:[.55,.05,2], Km5:[.5,.05,2]}, t0:0,t1:80,points:1200,method:'rk45', sweep:['q1','q4','S3','final']},
    'FADNS semi-mechanistic sweep': {narrative:'Sweep the refined FADNS CoA-sequestration model to inspect C16/C18 output and ECoA formation.', vars:['AcetCoA','MalCoA','NADPH','CoA','E','ECoA','EC2','EC4','EC6','EC8','EC10','EC12','EC14','EC16','EC18','C14','C16','C18'], plotPriority:['C14','C16','C18','CoA','ECoA','AcetCoA','MalCoA','NADPH'], eqs:['-kon*E*AcetCoA + koff*EC2','-(kappa*EC2*MalCoA*NADPH + kappa*EC4*MalCoA*NADPH + kappa*EC6*MalCoA*NADPH + kappa*EC8*MalCoA*NADPH + kappa*EC10*MalCoA*NADPH + kappa*EC12*MalCoA*NADPH + kappa*EC14*MalCoA*NADPH + kappa*EC16*MalCoA*NADPH)','-2*(kappa*EC2*MalCoA*NADPH + kappa*EC4*MalCoA*NADPH + kappa*EC6*MalCoA*NADPH + kappa*EC8*MalCoA*NADPH + kappa*EC10*MalCoA*NADPH + kappa*EC12*MalCoA*NADPH + kappa*EC14*MalCoA*NADPH + kappa*EC16*MalCoA*NADPH)','(kappa*EC2*MalCoA*NADPH + kappa*EC4*MalCoA*NADPH + kappa*EC6*MalCoA*NADPH + kappa*EC8*MalCoA*NADPH + kappa*EC10*MalCoA*NADPH + kappa*EC12*MalCoA*NADPH + kappa*EC14*MalCoA*NADPH + kappa*EC16*MalCoA*NADPH) + delta14*EC14 + delta16*EC16 + delta18*EC18 - kinhib*E*CoA + krelease*ECoA','-kon*E*AcetCoA + koff*EC2 + delta14*EC14 + delta16*EC16 + delta18*EC18 - kinhib*E*CoA + krelease*ECoA','kinhib*E*CoA - krelease*ECoA','kon*E*AcetCoA - koff*EC2 - kappa*EC2*MalCoA*NADPH','kappa*EC2*MalCoA*NADPH - kappa*EC4*MalCoA*NADPH','kappa*EC4*MalCoA*NADPH - kappa*EC6*MalCoA*NADPH','kappa*EC6*MalCoA*NADPH - kappa*EC8*MalCoA*NADPH','kappa*EC8*MalCoA*NADPH - kappa*EC10*MalCoA*NADPH','kappa*EC10*MalCoA*NADPH - kappa*EC12*MalCoA*NADPH','kappa*EC12*MalCoA*NADPH - kappa*EC14*MalCoA*NADPH - delta14*EC14','kappa*EC14*MalCoA*NADPH - kappa*EC16*MalCoA*NADPH - delta16*EC16','kappa*EC16*MalCoA*NADPH - delta18*EC18','delta14*EC14','delta16*EC16','delta18*EC18'], y0:[120,18,160,0.01,1,0,0,0,0,0,0,0,0,0,0,0,0,0], params:{kon:[.018,.002,.08], koff:[.008,0,.06], kappa:[.00002,.000002,.00008], delta14:[.010,.001,.05], delta16:[.026,.002,.09], delta18:[.012,.001,.06], kinhib:[.008,.001,.04], krelease:[.001,0,.015]}, t0:0,t1:120,points:650,method:'rk45', sweep:['kappa','kinhib','C16','final']},
    'Braess shortcut sweep': {narrative:'Sweep shortcut strength and adaptation rate in the simplified Braess-inspired route-choice model. This version is a congestion-feedback example, not a validated paradox instance.', vars:['x'], eqs:['eta*x*(1-x)*((22 + 10*(1-x) - shortcut) - (10 + 30*x))'], y0:[.25], params:{eta:[.8,.1,2], shortcut:[0,0,18]}, t0:0,t1:35,points:600,method:'rk45', sweep:['shortcut','eta','x','final']},
    'Calvin regeneration sweep': {narrative:'Sweep regeneration and carboxylation strengths in the photosynthesis mini-model.', vars:['PGA','RuBP'], eqs:['Vcmax*RuBP/(Kc+RuBP) - Vo*RuBP/(Ko+RuBP) - Vregen*PGA/(Kr+PGA)','Vregen*PGA/(Kr+PGA) - Vcmax*RuBP/(Kc+RuBP) - Vo*RuBP/(Ko+RuBP)'], y0:[2.0,1.0], params:{Vcmax:[1.2,.2,3], Vo:[.2,.01,.8], Vregen:[1.0,.2,3], Kc:[.8,.1,3], Ko:[1.2,.2,4], Kr:[.9,.1,3]}, t0:0,t1:30,points:700,method:'rk45', sweep:['Vcmax','Vregen','RuBP','final']}
  },
  opt: {
    'Constrained quadratic': {narrative:'Convex nonlinear program with one linear inequality. Good first optimization example.', sense:'minimize', variables:[['x',1,0,10],['y',1,0,10]], objective:'(x-3)^2 + (y-2)^2', ineq:['x + y - 4'], eq:[]},
    'Rosenbrock on disk': {narrative:'Non-convex benchmark with a narrow valley. Browser search is approximate; export SciPy/CasADi for serious optimization.', sense:'minimize', variables:[['x',-1,-2,2],['y',1,-2,2]], objective:'(1-x)^2 + 100*(y-x^2)^2', ineq:['x^2 + y^2 - 2'], eq:[]},
    'Cylinder design': {narrative:'Minimize cylinder surface area subject to fixed minimum volume.', sense:'minimize', variables:[['r',1,.1,5],['h',2,.1,10]], objective:'2*pi*r*h + 2*pi*r^2', objective2:'-pi*r^2*h', ineq:['10 - pi*r^2*h'], eq:[]},
    'Portfolio toy model': {narrative:'Quadratic risk with full-investment equality. Browser result is educational, not financial advice.', sense:'minimize', variables:[['x',.33,0,1],['y',.33,0,1],['z',.34,0,1]], objective:'0.2*x^2 + 0.4*y^2 + 0.3*z^2 - 0.08*x - 0.12*y - 0.1*z', objective2:'-(0.08*x + 0.12*y + 0.1*z)', ineq:[], eq:['x + y + z - 1']},
    'Lasso regression geometry': {narrative:'L1 regularization creates sharp diamond geometry and can push coefficients exactly to zero.', sense:'minimize', variables:[['w1',.5,-3,3],['w2',.5,-3,3]], objective:'(w1-1.8)^2 + 0.35*(w2-.9)^2 + .85*(abs(w1)+abs(w2))', objective2:'abs(w1)+abs(w2)', ineq:[], eq:[]},
    'Runge fitting caution': {narrative:'Small polynomial fitting example behind Runge’s warning: more flexibility can amplify edge error. Use it as an optimization geometry demo, not as a full interpolation engine.', sense:'minimize', variables:[['a0',.6,-2,2],['a2',-.5,-5,5],['a4',.1,-8,8]], objective:'(a0 + a2*(-1)^2 + a4*(-1)^4 - 1/26)^2 + (a0 + a2*(-.5)^2 + a4*(-.5)^4 - 1/7.25)^2 + (a0 - 1)^2 + (a0 + a2*(.5)^2 + a4*(.5)^4 - 1/7.25)^2 + (a0 + a2*(1)^2 + a4*(1)^4 - 1/26)^2', objective2:'abs(a4)', ineq:[], eq:[]},
    'Secretary stopping rule': {narrative:'Optimal-stopping teaching model. Maximize r log(1/r), whose optimum is near r = 1/e.', sense:'maximize', variables:[['r',.37,.05,.95]], objective:'r*log(1/r)', objective2:'abs(r - .367879)', ineq:[], eq:[]},
    'Pareto design trade-off': {narrative:'Two-objective toy design problem. Samples reveal the non-dominated frontier between objective f1 and objective f2.', sense:'minimize', variables:[['x',.5,-1,3],['y',.5,-1,3]], objective:'(x-0)^2 + (y-0)^2', objective2:'(x-2)^2 + (y-1)^2', ineq:['x + y - 3'], eq:[]}
  }
};
const EXAMPLE_AUTHORS = {
  'Lotka–Volterra': 'Alfred J. Lotka; Vito Volterra',
  'Lorenz': 'Edward N. Lorenz',
  'SIR': 'W. O. Kermack; A. G. McKendrick',
  'SEIR': 'Kermack–McKendrick epidemic-modeling tradition',
  'Robertson': 'H. H. Robertson',
  'Enzyme kinetics': 'Leonor Michaelis; Maud Menten',
  'Van der Pol': 'Balthasar van der Pol',
  'FA metabolism bistability': 'Chilperic Armel Foko Kuate; supervised by Oliver Ebenhöh, Adélaïde Raguin and Barbara Bakker',
  'FADNS semi-mechanistic': 'Chilperic Armel Foko Kuate; supervised by Oliver Ebenhöh, Adélaïde Raguin and Barbara Bakker',
  'Love–hate oscillator': 'Steven Strogatz; Romeo–Juliet teaching model',
  'Braess routing dynamics': 'Dietrich Braess',
  'Ziegler destabilization': 'Hans Ziegler',
  'Calvin cycle mini-model': 'Melvin Calvin; Andrew Benson; James Bassham',
  'Lotka–Volterra sweep': 'Alfred J. Lotka; Vito Volterra',
  'Lorenz rho–sigma': 'Edward N. Lorenz',
  'SIR beta–gamma': 'W. O. Kermack; A. G. McKendrick',
  'SEIR incubation': 'Kermack–McKendrick epidemic-modeling tradition',
  'Enzyme kinetics sweep': 'Leonor Michaelis; Maud Menten',
  'FA metabolism parameter sweep': 'Chilperic Armel Foko Kuate; supervised by Oliver Ebenhöh, Adélaïde Raguin and Barbara Bakker',
  'FADNS semi-mechanistic sweep': 'Chilperic Armel Foko Kuate; supervised by Oliver Ebenhöh, Adélaïde Raguin and Barbara Bakker',
  'Braess shortcut sweep': 'Dietrich Braess',
  'Calvin regeneration sweep': 'Melvin Calvin; Andrew Benson; James Bassham',
  'Constrained quadratic': 'Foko Lab teaching example',
  'Rosenbrock on disk': 'Howard H. Rosenbrock',
  'Cylinder design': 'Foko Lab teaching example',
  'Portfolio toy model': 'Foko Lab teaching example',
  'Lasso regression geometry': 'Robert Tibshirani',
  'Runge fitting caution': 'Carl Runge',
  'Secretary stopping rule': 'Classical optimal stopping problem'
};

function authorLine(name){ return EXAMPLE_AUTHORS[name] || 'Scientific modeling reference'; }

const PLOTS = {
  ode: {
    default: [
      ['trajectory','Trajectory'], ['phase2d','2D phase portrait'], ['phase3d','3D phase portrait'], ['vector','Vector field'], ['poincare','Poincaré section'], ['matrix','Trajectory matrix'], ['none','None']
    ]
  },
  param: {
    default: [['trajectory','Trajectory'], ['phase2d','2D phase portrait'], ['phase3d','3D phase portrait'], ['none','None']],
    sweep: [['heatmap','Heatmap'], ['contour','Contour map'], ['bifurcation','Bifurcation diagram'], ['envelope','Envelope / fan plot'], ['parallel','Parallel coordinates'], ['none','None']]
  },
  opt: {
    optimization: [['opt_samples','Samples'], ['opt_path','Optimization path'], ['convergence','Convergence'], ['tradeoff','Objective–constraint trade-off'], ['pareto','Pareto frontier'], ['feasibility','Feasibility map'], ['none','None']]
  }
};

const plotObservers = {};
const plotRenderSeq = {};

const state = {
  module:'ode', model:null, result:null, sweep:null, opt:null, worker:null, theme:'aurora', resultKind:'default', activePanel:'plots',
  plotSide:'left',
  observations:null, fitBridge:null, fitResult:null,
  plots:{
    left:{type:'trajectory',x:null,y:null,z:null,plane:0,title:'Trajectory',xLabel:'t',yLabel:'state',zLabel:'z',colorLabel:'',width:760,height:430,fontSize:13,lineWidth:2.4,markerSize:5,legend:true,grid:true},
    right:{type:'phase2d',x:null,y:null,z:null,plane:0,title:'Phase portrait',xLabel:'x',yLabel:'z',zLabel:'z',colorLabel:'',width:760,height:430,fontSize:13,lineWidth:2.4,markerSize:5,legend:true,grid:true}
  }
};

function defaultPlot(side='left'){
  return side==='left'
    ? {type:'trajectory',x:null,y:null,z:null,plane:0,title:'Trajectory',xLabel:'t',yLabel:'state',zLabel:'z',colorLabel:'',width:760,height:430,fontSize:13,lineWidth:2.4,markerSize:5,legend:true,grid:true}
    : {type:'phase2d',x:null,y:null,z:null,plane:0,title:'Phase portrait',xLabel:'x',yLabel:'z',zLabel:'z',colorLabel:'',width:760,height:430,fontSize:13,lineWidth:2.4,markerSize:5,legend:true,grid:true};
}
function ensurePlot(side){
  if(side!=='left' && side!=='right') side='left';
  if(!state.plots) state.plots={};
  if(!state.plots[side]) state.plots[side]=defaultPlot(side);
  state.plots[side]={...defaultPlot(side),...state.plots[side]};
  return state.plots[side];
}
function resetPlotAxes(force=false){
  const vars=currentVars();
  const first=vars[0]||'x', second=vars[1]||first, third=vars[2] || first;
  for(const side of ['left','right']){
    const p=ensurePlot(side);
    const duplicateAxes = p.x===p.y || p.x===p.z || p.y===p.z;
    const invalidAxes = !vars.includes(p.x) || !vars.includes(p.y) || !vars.includes(p.z);
    if(force || invalidAxes || duplicateAxes){
      p.x=first;
      p.y=second;
      p.z=third;
    }else{
      p.x=vars.includes(p.x)?p.x:first;
      p.y=vars.includes(p.y)?p.y:second;
      p.z=vars.includes(p.z)?p.z:third;
    }
    if(state.model?.sectionValue!==undefined) p.plane=state.model.sectionValue;
  }
}

function normalizePlotState(){
  if(!state.plots || typeof state.plots !== 'object') state.plots={};
  ensurePlot('left'); ensurePlot('right');
  resetPlotAxes();
  for(const side of ['left','right']){
    const p=ensurePlot(side);
    if(!Number.isFinite(Number(p.height)) || Number(p.height)<260) p.height=430;
    if(!Number.isFinite(Number(p.width)) || Number(p.width)<360) p.width=760;
    if(!Number.isFinite(Number(p.markerSize))) p.markerSize=5;
    if(!Number.isFinite(Number(p.lineWidth))) p.lineWidth=2.4;
  }
}
function visibleSeriesIndices(){
  const vars=state.result?.vars || [];
  if(vars.length<=8) return vars.map((_,i)=>i);
  const idx=[];
  const priority=Array.isArray(state.model?.plotPriority) ? state.model.plotPriority : [];
  priority.forEach(v=>{ const i=vars.indexOf(v); if(i>=0 && !idx.includes(i)) idx.push(i); });
  if(idx.length<8){
    const edge=[0,1,2,3,vars.length-4,vars.length-3,vars.length-2,vars.length-1].filter(i=>i>=0&&i<vars.length);
    edge.forEach(i=>{ if(idx.length<8 && !idx.includes(i)) idx.push(i); });
  }
  for(let i=0;i<vars.length && idx.length<8;i++) if(!idx.includes(i)) idx.push(i);
  return idx;
}


function sessionKeyForModule(moduleName){
  // Keep storage keys aligned with existing save paths.
  // The UI calls the optimization module `opt`, but historical session storage uses `optimization`.
  // Parametric ODE mode reuses the ODE editor and currently saves under `ode`.
  if(moduleName === 'opt') return 'optimization';
  if(moduleName === 'param') return 'ode';
  return moduleName || 'ode';
}

function init(){
  wire();
  setTheme(localStorage.getItem('chilperic-theme') || 'aurora');
  const params = new URLSearchParams(window.location.search);
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const m = params.get('module') || (path === 'optimization.html' ? 'opt' : 'ode');
  const ex = params.get('example');
  setModule(EXAMPLES[m] ? m : 'ode');

  // FIX: restore last session when no explicit example is requested via URL.
  // FokoSession.save() is called on every run; FokoSession.load() was never
  // called in init(), so persistence was write-only.  This completes the cycle:
  // load the saved model, populate the editor, and prompt the user to re-run.
  // Guard with optional chaining so the app degrades gracefully if the
  // model-session.js script fails to load.
  const saved = (!ex) ? window.FokoSession?.load?.(sessionKeyForModule(state.module)) : null;
  if (saved && saved.payload) {
    state.model = saved.payload;
    if (state.module === 'opt') {
      loadOpt(state.model);
    } else {
      loadOde(state.model);
    }
    updateMathPreview();
    refreshAllSelects();
    updatePlotOptions();
    clearPlots();
    setStatus(`Session restored from ${(saved.savedAt || '').slice(0, 10) || 'previous visit'}. Press Run to re-solve.`);
    return;
  }

  if(ex && EXAMPLES[state.module]?.[ex]) loadExample(ex);
}

function wire(){
  document.querySelectorAll('.mode-tab').forEach(b=>b.addEventListener('click',()=>setModule(b.dataset.mode)));
  document.querySelectorAll('[data-mode-jump]').forEach(b=>b.addEventListener('click',()=>setModule(b.dataset.modeJump)));
  $('themeBtn')?.addEventListener('change',e=>setTheme(e.target.value));
  $('resetBtn')?.addEventListener('click',()=>loadExample($('exampleSelect').value));
  $('loadExample').addEventListener('click',()=>loadExample($('exampleSelect').value));
  $('exampleSelect').addEventListener('change',e=>previewExampleSelection(e.target.value));
  $('addEq').addEventListener('click',addEquation);
  $('addVar')?.addEventListener('click',addVariable);
  $('runBtn').addEventListener('click',runDefault);
  $('runSweep').addEventListener('click',runSweep);
  $('cancelBtn').addEventListener('click',cancelWorker); $('openSymbolic')?.addEventListener('click',openCurrentInSymbolic); $('openSteady')?.addEventListener('click',openCurrentInSteady);
  $('method').addEventListener('change',()=>{ syncSummary(); updatePythonTargets(); });
  ['t0','t1','points'].forEach(id=>$(id).addEventListener('input',syncSummary));
  $('methodMirror').addEventListener('change',e=>{ $('method').value=e.target.value; syncSummary(); });
  $('toleranceShortcut').addEventListener('click',()=>{ $('advanced').open=true; $('rtol').focus(); });
  $('leftPlotType').addEventListener('change',()=>{ state.plots.left.type=$('leftPlotType').value; setDefaultLabels('left'); renderPlots(); });
  $('rightPlotType').addEventListener('change',()=>{ state.plots.right.type=$('rightPlotType').value; setDefaultLabels('right'); renderPlots(); });
  $('palette').addEventListener('change',renderPlots);
  $('figureSettings').addEventListener('click',()=>openPlotConfig(state.plotSide || 'left'));
  $('cfgTarget').addEventListener('change',e=>openPlotConfig(e.target.value));
  $('closeConfig').addEventListener('click',()=>toggle('plotConfig',false));
  $('applyPlotConfig').addEventListener('click',applyPlotConfig);
  $('exportSelectedPng').addEventListener('click',()=>exportConfiguredPlot('png'));
  $('exportSelectedSvg').addEventListener('click',()=>exportConfiguredPlot('svg'));
  $('exportPng').addEventListener('click',()=>exportPlot('leftPlot',plotFileName('left','png'),'png'));
  $('exportSvg').addEventListener('click',()=>exportPlot('leftPlot',plotFileName('left','svg'),'svg'));
  $('leftMenu').addEventListener('click',()=>{ state.plotSide='left'; openPlotConfig('left'); });
  $('rightMenu').addEventListener('click',()=>{ state.plotSide='right'; openPlotConfig('right'); });
  $('exportPython').addEventListener('click',()=>download('foko_lab_export.py', pythonExport(), 'text/x-python'));
  $('exportCsv').addEventListener('click',()=>download('foko_lab_data_wide.csv', csvExport(), 'text/csv'));
  $('exportLongCsv')?.addEventListener('click',()=>download('foko_lab_data_long.csv', longCsvExport(), 'text/csv'));
  $('exportResultJson')?.addEventListener('click',()=>download('foko_lab_result_data.json', JSON.stringify(resultDataExport(),null,2), 'application/json'));
  $('exportJson').addEventListener('click',()=>download('foko_lab_model_config.json', JSON.stringify(currentConfig(),null,2), 'application/json'));
  $('exportPlotlyJson')?.addEventListener('click',()=>download('foko_lab_plotly_data.json', JSON.stringify(plotlyDataExport(),null,2), 'application/json'));
  $('overlayData')?.addEventListener('click',()=>{ try{ loadObservationData(); renderPlots(); }catch(e){ setStatus(actionable(e.message), true); } });
  $('clearOverlay')?.addEventListener('click',()=>{ state.observations=null; updateObservationSummary(); renderPlots(); });
  $('overlayVisible')?.addEventListener('change',renderPlots);
  $('prepareFitBridge')?.addEventListener('click',prepareFitBridge);
  $('runOdeFit')?.addEventListener('click',runOdeFit);
  $('fitBandVisible')?.addEventListener('change',renderPlots);
  $('downloadFitBridge')?.addEventListener('click',()=>{ const cfg=prepareFitBridge(true); if(cfg) download('foko_lab_fit_bridge_config.json', JSON.stringify(cfg,null,2), 'application/json'); });
  $('copyInstall').addEventListener('click',copyInstall);
  $('downloadTemplate').addEventListener('click',downloadSelectedTemplate);
  $('modelFile').addEventListener('change',e=>handleFiles(e.target.files));
  $('collapseSidebar').addEventListener('click',()=>document.querySelector('.layout').classList.toggle('sidebar-collapsed'));
  setupDragDrop();
  document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ e.preventDefault(); runDefault(); } });
  window.addEventListener('resize',()=>{ ['leftPlot','rightPlot'].forEach(forcePlotVisible); });
  ['leftPlot','rightPlot'].forEach(id=>{ const el=$(id); if(el) observePlotNode(el); });
}

const KNOWN_THEMES=['aurora','clarity','ocean','emerald','steel','royal','olive','copper','paper','graphite','slate','midnight','forest','contrast'];
function setTheme(t){ t=KNOWN_THEMES.includes(t)?t:'aurora'; state.theme=t; document.documentElement.dataset.theme=t; const sel=$('themeBtn'); if(sel)sel.value=t; localStorage.setItem('chilperic-theme',t); renderPlots(); setTimeout(()=>renderPlots(),120); }
function setModule(m){
  state.module=m; state.result=null; state.sweep=null; state.opt=null; state.resultKind=m==='opt'?'optimization':'default';
  $('moduleSelect').value=m;
  document.querySelectorAll('.mode-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
  document.querySelectorAll('[data-mode-jump]').forEach(b=>b.classList.toggle('active',b.dataset.modeJump===m));
  toggle('odeEditor',m!=='opt'); toggle('optEditor',m==='opt'); toggle('sweepPanel',m==='param'); toggle('odeNumerics',m!=='opt'); toggle('optNumerics',m==='opt'); toggle('runSweep',m==='param'); $('runBtn').textContent = m==='opt' ? 'Optimize' : (m==='param' ? 'Run default' : 'Run'); $('runSweep').textContent='Sweep parameters'; document.title = m==='opt' ? 'Optimization Lab · Foko Lab' : 'Foko Lab'; document.querySelectorAll('.topnav a').forEach(a=>{ const h=a.getAttribute('href')||''; const active = m==='opt' ? h.includes('optimization.html') : h.includes('ode.html#workbench'); a.classList.toggle('active', active); });
  fillExamples(); loadExample(Object.keys(EXAMPLES[m])[0]); updatePythonTargets(); resetStatus();
}
function fillExamples(){
  const sel=$('exampleSelect'), deck=$('modelDeck'), extra=$('additionalExamples');
  sel.innerHTML=''; deck.innerHTML=''; if(extra) extra.innerHTML='';
  const names=Object.keys(EXAMPLES[state.module]);
  const core=(CORE_EXAMPLES[state.module]||[]).filter(n=>EXAMPLES[state.module][n]);
  const additional=names.filter(n=>!core.includes(n));
  names.forEach(name=>sel.append(new Option(name,name)));
  const makeButton=(name, cls='model-card')=>{
    const b=document.createElement('button');
    b.className=cls; b.type='button'; b.textContent=displayName(name); b.title=name;
    b.setAttribute('aria-label',`Load ${name}`); b.dataset.example=name;
    b.addEventListener('click',()=>loadExample(name));
    return b;
  };
  core.forEach(name=>deck.append(makeButton(name)));
  if(extra){
    additional.forEach(name=>{
      const ex=EXAMPLES[state.module][name];
      const card=document.createElement('button');
      card.className='additional-example-card'; card.type='button'; card.dataset.example=name;
      card.innerHTML=`<b>${escapeHtml(displayName(name))}</b><span>${escapeHtml(name)}</span><em>Authors: ${escapeHtml(authorLine(name))}</em><small>${escapeHtml(ex.narrative||'')}</small>`;
      card.addEventListener('click',()=>loadExample(name));
      extra.append(card);
    });
    $('additionalExamplesPanel')?.classList.toggle('hidden', additional.length===0);
  }
}
function displayName(name){
  const map={
    'Lotka–Volterra sweep':'Lotka–Volterra',
    'Lorenz rho–sigma':'Lorenz',
    'SIR beta–gamma':'SIR',
    'SEIR incubation':'SEIR',
    'Enzyme kinetics sweep':'Enzyme',
    'Enzyme kinetics':'Enzyme',
    'Constrained quadratic':'Quadratic',
    'Rosenbrock on disk':'Rosenbrock',
    'Cylinder design':'Cylinder',
    'Portfolio toy model':'Portfolio',
    'Lasso regression geometry':'Lasso',
    'Runge fitting caution':'Runge',
    'Secretary stopping rule':'Secretary',
    'FA metabolism bistability':'FA metabolism',
    'FA metabolism parameter sweep':'FA metabolism',
    'FADNS semi-mechanistic':'FADNS',
    'FADNS semi-mechanistic sweep':'FADNS',
    'Love–hate oscillator':'Love/Hate',
    'Braess routing dynamics':'Braess',
    'Braess shortcut sweep':'Braess',
    'Ziegler destabilization':'Ziegler',
    'Calvin cycle mini-model':'Calvin cycle',
    'Calvin regeneration sweep':'Calvin cycle',
    'Differential evolution':'Differential evolution'
  };
  return map[name] || name.replace(/\s+sweep$/,'').replace(/\s+model$/,'');
}
function previewExampleSelection(name){
  const ex=EXAMPLES[state.module]?.[name];
  if(!ex) return;
  safeText($('exampleNarrative'),`${ex.narrative||''} Authors: ${authorLine(name)}. Press Load model to open this example.`);
  setStatus(`Selected ${name}. Press Load model to open it.`);
}

function loadExample(name){
  if(state.worker){ state.worker.terminate(); state.worker=null; }
  const ex=deepClone(EXAMPLES[state.module][name]); if(!ex) return;
  $('exampleSelect').value=name; safeText($('exampleNarrative'),`${ex.narrative||''} Authors: ${authorLine(name)}.`);
  document.querySelectorAll('.model-card,.additional-example-card').forEach(b=>b.classList.toggle('active',b.dataset.example===name));
  state.result=null; state.sweep=null; state.opt=null; state.resultKind=state.module==='opt'?'optimization':'default';
  if(state.module==='opt') loadOpt(ex); else loadOde(ex);
  resetPlotAxes(true);
  updateMathPreview(); refreshAllSelects(); updatePlotOptions(); clearPlots(); resetStatus();
  setStatus(`Loaded ${name}. Run the model to update plots.`);
}
function loadOde(ex){
  state.model={vars:ex.vars, eqs:ex.eqs, y0:ex.y0, params:ex.params||{}, t0:ex.t0, t1:ex.t1, points:ex.points, method:ex.method||'rk45', sweep:ex.sweep||null, sectionVar:ex.sectionVar||null, sectionValue:ex.sectionValue??0};
  $('t0').value=ex.t0; $('t1').value=ex.t1; $('points').value=ex.points; $('method').value=ex.method||'rk45';
  if(ex.sweep){ $('sweepMetric').value=ex.sweep[3]||'max'; }
  renderOdeControls(); syncSummary(); refreshAllSelects();
}
function inferOptClass(ex){
  if(ex.optClass) return ex.optClass;
  if(ex.objective2) return 'multiobjective';
  const txt = `${ex.narrative||''} ${ex.objective||''}`.toLowerCase();
  if(txt.includes('rosenbrock') || txt.includes('non-convex') || txt.includes('nonconvex')) return 'nonconvex';
  if(txt.includes('secretary') || txt.includes('stopping')) return 'optimal_stopping';
  if(txt.includes('portfolio') || txt.includes('lasso') || txt.includes('quadratic')) return 'convex';
  return 'nonconvex';
}
function defaultOptAlgorithm(cls){
  return cls==='convex' ? 'projected_gradient' : cls==='metaheuristic' ? 'differential_evolution' : cls==='multiobjective' ? 'differential_evolution' : cls==='optimal_stopping' ? 'random_coord' : 'multi_start';
}
function loadOpt(ex){
  const optClass=inferOptClass(ex);
  state.model={sense:ex.sense, optClass, algorithm:ex.algorithm||defaultOptAlgorithm(optClass), variables:ex.variables.map(v=>Array.isArray(v)?{name:v[0],initial:v[1],lower:v[2],upper:v[3]}:v), objective:ex.objective, objective2:ex.objective2||'', ineq:ex.ineq||[], eq:ex.eq||[]};
  if($('optClass')) $('optClass').value=state.model.optClass;
  if($('optAlgorithm')) $('optAlgorithm').value=state.model.algorithm;
  $('optSense').value=state.model.sense; $('objective').value=state.model.objective; if($('objective2')) $('objective2').value=state.model.objective2||''; $('ineq').value=state.model.ineq.join('\\n'); $('eqcon').value=state.model.eq.join('\\n'); renderOptControls();
}
function renderOdeControls(){
  const root=$('equationRows'); root.innerHTML='';
  state.model.vars.forEach((v,i)=>{ const row=document.createElement('div'); row.className='eq-row'; row.innerHTML=`<div class="var">d${escapeHtml(v)}/dt</div><input data-eq="${i}" value="${escapeHtml(state.model.eqs[i])}" placeholder="-k*x"><button class="delete" data-del-eq="${i}" type="button">×</button>`; root.append(row); });
  renderTable('initialRows',['name','value'],state.model.vars.map((v,i)=>[v,state.model.y0[i]]),(r,c,val)=>{ if(c===0){ state.model.vars[r]=val; renderOdeControls(); } else state.model.y0[r]=num(val); });
  renderTable('paramRows',['name','value','min','max'],Object.entries(state.model.params).map(([k,a])=>[k,a[0],a[1],a[2]]),(r,c,val)=>{ const keys=Object.keys(state.model.params); const old=keys[r]; if(!old) return; if(c===0){ const arr=state.model.params[old]; delete state.model.params[old]; state.model.params[val]=arr; } else state.model.params[old][c-1]=num(val); refreshAllSelects(); },true);
  root.querySelectorAll('[data-eq]').forEach(inp=>inp.addEventListener('input',e=>{ state.model.eqs[+inp.dataset.eq]=e.target.value; updateMathPreview(); }));
  root.querySelectorAll('[data-del-eq]').forEach(btn=>btn.addEventListener('click',()=>{ const i=+btn.dataset.delEq; state.model.vars.splice(i,1); state.model.eqs.splice(i,1); state.model.y0.splice(i,1); renderOdeControls(); refreshAllSelects(); updateMathPreview(); }));
}
function renderOptControls(){
  renderTable('variableRows',['name','initial','lower','upper'],state.model.variables.map(v=>[v.name,v.initial,v.lower,v.upper]),(r,c,val)=>{ const keys=['name','initial','lower','upper']; state.model.variables[r][keys[c]]=c===0?val:num(val); updateMathPreview(); },true);
  ['optClass','optAlgorithm','optSense','objective','objective2','ineq','eqcon'].forEach(id=>{ const el=$(id); if(el) el.oninput=()=>{ readOpt(); updateMathPreview(); }; });
  if($('optClass')) $('optClass').onchange=()=>{ readOpt(); if($('optAlgorithm') && state.model.algorithm===defaultOptAlgorithm(state.model.optClass)) $('optAlgorithm').value=defaultOptAlgorithm($('optClass').value); readOpt(); updateMathPreview(); };
  updateMathPreview();
}
function renderTable(id,heads,rows,callback,deletable=false){
  const root=$(id); root.innerHTML=''; const head=document.createElement('div'); head.className='table-head'; heads.forEach(h=>{const d=document.createElement('div'); d.textContent=h; head.append(d);}); const blank=document.createElement('div'); head.append(blank); root.append(head);
  rows.forEach((row,i)=>{ const line=document.createElement('div'); line.className='table-row'; row.forEach((v,c)=>{ const inp=document.createElement('input'); inp.value=v; inp.dataset.row=i; inp.dataset.col=c; inp.addEventListener('input',e=>callback(i,c,e.target.value)); line.append(inp); }); const del=document.createElement('button'); del.className='delete'; del.textContent=deletable?'×':''; del.type='button'; if(deletable){ del.addEventListener('click',()=>deleteTableRow(id,i)); } line.append(del); root.append(line); });
}
function deleteTableRow(id,i){ if(id==='paramRows'){ const k=Object.keys(state.model.params)[i]; delete state.model.params[k]; renderOdeControls(); } if(id==='variableRows'){ state.model.variables.splice(i,1); renderOptControls(); } updateMathPreview(); refreshAllSelects(); }
function addEquation(){ const n='u'+(state.model.vars.filter(v=>v.startsWith('u')).length+1); state.model.vars.push(n); state.model.eqs.push('0'); state.model.y0.push(0); renderOdeControls(); refreshAllSelects(); updateMathPreview(); }
function addVariable(){ state.model.variables.push({name:'x'+(state.model.variables.length+1),initial:0,lower:-10,upper:10}); renderOptControls(); }
function readOde(){ compiledEquationCacheKey=''; compiledEquationCache=null; state.model.t0=num($('t0').value); state.model.t1=num($('t1').value); state.model.points=Math.max(2,+$('points').value||800); state.model.method=$('method').value; syncSummary(); }
function readOpt(){ state.model.optClass=$('optClass')?.value || state.model.optClass || 'nonconvex'; state.model.algorithm=$('optAlgorithm')?.value || state.model.algorithm || defaultOptAlgorithm(state.model.optClass); state.model.sense=$('optSense').value; state.model.objective=$('objective').value; state.model.objective2=$('objective2')?.value?.trim()||''; state.model.ineq=$('ineq').value.split('\n').map(s=>s.trim()).filter(Boolean); state.model.eq=$('eqcon').value.split('\n').map(s=>s.trim()).filter(Boolean); }
function paramValues(){ const out={}; Object.entries(state.model.params||{}).forEach(([k,a])=>out[k]=Number(a[0])); return out; }
function paramDefs(){ const out={}; Object.entries(state.model.params||{}).forEach(([k,a])=>out[k]={value:Number(a[0]),min:Number(a[1]),max:Number(a[2])}); return out; }
function syncSummary(){
  const browser=[['rk45','RK45 adaptive'],['rk5','RK5 fixed'],['rk4','RK4 fixed'],['heun_adaptive','Heun adaptive'],['heun','Heun fixed'],['euler','Euler fixed']];
  $('methodMirror').innerHTML=browser.map(([v,l])=>`<option value="${v}">${l}</option>`).join(''); $('methodMirror').value=browser.some(([v])=>v===$('method').value)?$('method').value:'rk45';
  $('t0Mirror').value=$('t0').value; $('t1Mirror').value=$('t1').value; $('pointsMirror').value=$('points').value;
}
function refreshAllSelects(){ refreshObservationVariableSelect();
  const vars = state.module==='opt' ? state.model.variables.map(v=>v.name) : state.model.vars;
  ['cfgX','cfgY','cfgZ','sweepVar'].forEach(id=>{ const el=$(id); if(!el) return; el.innerHTML=''; vars.forEach(v=>el.append(new Option(v,v))); });
  const sweepParams = Object.entries(state.model?.params||{}).filter(([k,a])=>Number(a[1])!==Number(a[2]) && k!=='N');
  ['sweepA','sweepB'].forEach(id=>{ const el=$(id); el.innerHTML=''; sweepParams.forEach(([p])=>el.append(new Option(p,p))); });
  if(state.model?.sweep){ $('sweepA').value=state.model.sweep[0]; $('sweepB').value=state.model.sweep[1]; $('sweepVar').value=state.model.sweep[2]; $('sweepMetric').value=state.model.sweep[3]; }
  resetPlotAxes();
}
function updatePlotOptions(){
  normalizePlotState();
  const kind=state.resultKind;
  const opts = (PLOTS[state.module] && PLOTS[state.module][kind]) || PLOTS.ode.default;
  for(const id of ['leftPlotType','rightPlotType']){
    const select=$(id); const current=select.value || state.plots[id.startsWith('left')?'left':'right'].type;
    select.innerHTML=opts.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
    if(opts.some(([v])=>v===current)) select.value=current;
  }
  const allowed=opts.map(o=>o[0]);
  if(!allowed.includes(state.plots.left.type)) state.plots.left.type=opts[0]?.[0]||'none';
  if(!allowed.includes(state.plots.right.type)) state.plots.right.type=opts.find(o=>o[0]!=='trajectory')?.[0] || 'none';
  // Curated defaults when the result kind changes.
  if(state.module==='ode' && state.resultKind==='default'){ const nv=state.model?.vars?.length||0; state.plots.left.type='trajectory'; state.plots.right.type=nv>=3?'phase3d':nv>=2?'phase2d':'none'; }
  if(state.module==='param' && state.resultKind==='default'){ const nv=state.model?.vars?.length||0; state.plots.left.type='trajectory'; state.plots.right.type=nv>=3?'phase3d':nv>=2?'phase2d':'none'; }
  if(state.module==='param' && state.resultKind==='sweep'){ state.plots.left.type='heatmap'; state.plots.right.type='parallel'; }
  if(state.module==='opt'){ state.plots.left.type='opt_samples'; state.plots.right.type='convergence'; }
  resetPlotAxes();
  $('leftPlotType').value=state.plots.left.type; $('rightPlotType').value=state.plots.right.type;
  setDefaultLabels('left'); setDefaultLabels('right'); renderTabs(); updatePlotHint();
}
function renderTabs(){
  const tabs = state.module==='opt' ? [['plots','Optimization plots'],['diagnostics','Diagnostics']] : state.module==='param' && state.resultKind==='sweep' ? [['plots','Sweep plots'],['diagnostics','Diagnostics']] : [['plots','Plots'],['diagnostics','Diagnostics']];
  const root=$('resultTabs'); root.innerHTML=''; tabs.forEach(([id,label])=>{ const b=document.createElement('button'); b.className='tab '+(state.activePanel===id?'active':''); b.type='button'; b.textContent=label; b.addEventListener('click',()=>setPanel(id)); root.append(b); });
}
function setPanel(id){ state.activePanel=id; $('plotsPanel').classList.toggle('active',id==='plots'); $('diagnosticsPanel').classList.toggle('active',id==='diagnostics'); renderTabs(); if(id==='plots') requestAnimationFrame(()=>renderPlots()); }

function updateMathPreview(){
  try{
    if(state.module==='opt'){
      readOpt(); const rows=[]; rows.push(`${state.model.sense==='maximize'?'\\max':'\\min'}_{x} & ${toTex(state.model.objective)}`);
      if(state.model.ineq.length||state.model.eq.length) rows.push('\\text{s.t.} &');
      state.model.ineq.forEach((g,i)=>rows.push(`g_{${i+1}}(x) &= ${toTex(g)} \\le 0`));
      state.model.eq.forEach((h,i)=>rows.push(`h_{${i+1}}(x) &= ${toTex(h)} = 0`));
      const bounds=state.model.variables.map(v=>`${v.lower} \\le ${texName(v.name)} \\le ${v.upper}`).join(',\\; '); if(bounds) rows.push(`\\text{bounds} & ${bounds}`);
      renderKatex('optPreview',`\\begin{aligned}${rows.join('\\\\')}\\end{aligned}`);
      renderKatex('mathPreview','');
    } else {
      const rows=state.model.vars.map((v,i)=>`\\frac{d${texName(v)}}{dt} &= ${toTex(state.model.eqs[i])}`);
      renderKatex('mathPreview',`\\begin{aligned}${rows.join('\\\\')}\\end{aligned}`);
    }
  }catch(e){ const target=state.module==='opt'?'optPreview':'mathPreview'; $(target).textContent='Math preview unavailable.'; }
}
function renderKatex(id,latex){ const el=$(id); if(!el) return; el.innerHTML=''; if(!latex) return; const div=document.createElement('div'); div.className='math-line'; katex.render(latex,div,{throwOnError:false,displayMode:true}); el.append(div); }
function toTex(s){ try{return math.parse(String(s||'0')).toTex({parenthesis:'keep',implicit:'show'}).replaceAll('~',' ');}catch{return escapeHtml(String(s));} }
function texName(v){ return /^[A-Za-z]$/.test(String(v))?v:`\\mathrm{${String(v).replace(/[^A-Za-z0-9_]/g,'')}}`; }

function runDefault(){ if(state.module==='param') state.resultKind='default'; state.module==='opt' ? runOpt() : runOde(); }
function runOde(){
  try{ readOde(); window.FokoSession?.save?.(sessionKeyForModule(state.module), state.model); const check=window.FokoModelValidator?.validate?.(state.model,'ode'); if(check && check.blockers.length) throw new Error(window.FokoModelValidator.message(check)); const payload={...state.model, params:paramValues(), paramDefs:paramDefs(), rtol:$('rtol').value, atol:$('atol').value, maxStep:$('maxStep').value, stepSize:$('stepSize').value, initialStep:$('initialStep').value, safety:$('safety').value}; startBusy('Solving...'); worker().postMessage({type:'solve',payload}); }catch(e){ setStatus(actionable(e.message),true); }
}
function runSweep(){
  try{ readOde(); window.FokoSession?.save?.(sessionKeyForModule(state.module), state.model); if(!$('sweepA').value || !$('sweepB').value) throw new Error('Choose two parameter ranges before sweeping.'); const payload={...state.model, params:paramValues(), paramDefs:paramDefs(), rtol:$('rtol').value, atol:$('atol').value, maxStep:$('maxStep').value, stepSize:$('stepSize').value, initialStep:$('initialStep').value, safety:$('safety').value, sweepA:$('sweepA').value, sweepB:$('sweepB').value, sweepVar:$('sweepVar').value, sweepMetric:$('sweepMetric').value, sweepN:+$('sweepN').value}; startBusy('Sweeping...'); worker().postMessage({type:'sweep',payload}); }catch(e){ setStatus(actionable(e.message),true); }
}
function runOdeFit(){
  try{
    readOde();
    if(!state.observations) loadObservationData();
    const vary=Object.entries(paramDefs()).filter(([k,d])=>Number(d.min)!==Number(d.max)).map(([k])=>k);
    if(!vary.length) throw new Error('No fitted parameters available. Give at least one parameter different min and max values.');
    if(!state.observations?.rows?.length) throw new Error('Load observed data before fitting.');
    const payload={...state.model, params:paramValues(), paramDefs:paramDefs(), rtol:$('rtol').value, atol:$('atol').value, maxStep:$('maxStep').value, stepSize:$('stepSize').value, initialStep:$('initialStep').value, safety:$('safety').value, observations:state.observations, vary, maxIter:36};
    startBusy('Fitting ODE parameters...');
    worker().postMessage({type:'fitOde',payload});
  }catch(e){ setStatus(actionable(e.message), true); }
}
function runOpt(){ try{ readOpt(); window.FokoSession?.save?.(sessionKeyForModule(state.module), state.model); const check=window.FokoModelValidator?.validate?.(state.model,'optimization'); if(check && check.blockers.length) throw new Error(window.FokoModelValidator.message(check)); const samples=+$('optSamples').value, population=+($('optPopulation')?.value||36); const budget=samples*population; const payload={...state.model, samples, penalty:$('penalty').value, refineSteps:+$('refineSteps').value, population, temperature:$('optTemperature')?.value||1, tolerance:$('optTolerance')?.value||'1e-8'}; startBusy(budget>50000?`Optimizing large browser budget (${budget.toLocaleString()} evaluations). Reduce samples/population if the tab slows down.`:'Optimizing...'); worker().postMessage({type:'opt',payload}); }catch(e){ setStatus(actionable(e.message),true); } }
function worker(){
  if(state.worker) return state.worker;
  state.worker = window.FokoComputeBus?.createLegacyHandle ? window.FokoComputeBus.createLegacyHandle({workerUrl:'src/worker.js?v=71.46.0'}) : new Worker('src/worker.js?v=71.46.0');
  state.worker.onmessage=e=>{ const d=e.data; if(d.progress!==undefined){ $('progressWrap').classList.remove('hidden'); $('progressBar').style.width=Math.round(d.progress*100)+'%'; setStatus(`${d.text||'Running'} ${Math.round(d.progress*100)}%`); return; } finishRun(d); };
  state.worker.onerror=err=>{
    // MUST null the reference first — the keep-alive guard in worker() checks
    // if(state.worker) return state.worker; a dead worker here means the next
    // run silently postMessages into a terminated thread and produces no result.
    state.worker = null;
    document.querySelector('.results-card')?.classList.remove('stale-results');
    endBusy('Worker error.');
    setStatus(actionable(err.message||'ODE worker crashed. Reload or run again to restart.'), true);
  };
  return state.worker;
}
function cancelWorker(){ if(state.worker){ state.worker.postMessage({type:'cancel'}); } document.querySelector('.results-card').classList.remove('stale-results'); endBusy('Cancelled.'); }
function startBusy(msg){ document.querySelector('.results-card').classList.add('stale-results'); $('runBtn').disabled=true; $('runSweep').disabled=true; $('runBtn').dataset.label=$('runBtn').textContent; $('runBtn').textContent=state.module==='opt'?'Optimizing...':'Solving...'; $('cancelBtn').classList.remove('hidden'); $('progressWrap').classList.remove('hidden'); $('progressBar').style.width='5%'; setStatus(msg); }
function endBusy(msg){ $('runBtn').disabled=false; $('runSweep').disabled=false; $('runBtn').textContent=$('runBtn').dataset.label || (state.module==='opt'?'Optimize':(state.module==='param'?'Run default':'Run')); $('cancelBtn').classList.add('hidden'); $('progressWrap').classList.add('hidden'); $('progressBar').style.width='0%'; setStatus(msg); }
function finishRun(d){ document.querySelector('.results-card').classList.remove('stale-results'); endBusy(d.ok?'Done.':'Error.'); if(!d.ok){ setStatus(actionable(d.error),true); return; }
  if(d.kind==='ode'){ state.result=d; state.opt=null; state.resultKind='default'; updatePlotOptions(); showDiagnostics(d.diagnostics); updateMetrics(d.diagnostics); renderPlots(); setStatus(d.diagnostics.warning||'Solved.'); }
  if(d.kind==='ode_fit'){ applyOdeFitResult(d); return; }
  if(d.kind==='sweep'){ state.sweep=d; state.resultKind='sweep'; updatePlotOptions(); showDiagnostics({method:'parameter sweep',runtime:0,accepted:'—',rejected:'—',functionEvaluations:'—'}); updateMetrics({runtime:0,accepted:'—',rejected:'—',functionEvaluations:'—'}); renderPlots(); setStatus('Sweep complete.'); }
  if(d.kind==='opt'){ state.opt=d; state.resultKind='optimization'; updatePlotOptions(); showOptDiagnostics(d); updateOptMetrics(d); renderPlots(); setStatus(d.feasible?'Optimization complete: feasible candidate found.':'Optimization complete: constraint violation remains. Export Python for serious solve.'); }
}

function applyOdeFitResult(d){
  state.fitResult=d;
  if(d.params){ Object.entries(d.params).forEach(([k,v])=>{ if(state.model.params[k]) state.model.params[k][0]=Number(v); }); renderOdeControls(); refreshAllSelects(); }
  if(d.solution){ state.result={...d.solution, ok:true, kind:'ode', diagnostics:{...(d.solution.diagnostics||{}), fitRMSE:d.rmse, fitAIC:d.aic, fitBIC:d.bic}}; state.resultKind='default'; }
  updatePlotOptions();
  showDiagnostics({method:'ODE parameter fit', rmse:d.rmse, aic:d.aic, bic:d.bic, parameters:Object.entries(d.params||{}).map(([k,v])=>`${k}=${Number(v).toPrecision(6)}`).join(', ')});
  renderFitSummary(d);
  updateMetrics(state.result?.diagnostics||{});
  renderPlots();
  setStatus(`ODE fit complete. RMSE ${Number(d.rmse||0).toPrecision(4)}.`);
}
function renderFitSummary(d){
  const el=$('fitBridgePreview'); if(!el) return;
  const ci=(d.ci||[]).map(r=>`${r.name}: ${Number(r.estimate).toPrecision(5)} [${Number(r.low).toPrecision(5)}, ${Number(r.high).toPrecision(5)}]`).join(' | ');
  el.textContent=`Fit complete. RMSE ${Number(d.rmse||0).toPrecision(4)}. 95% parameter CI: ${ci || 'not available'}.`;
}
function fitBandsForVariable(v){
  const fr=state.fitResult;
  if(!fr || !$('fitBandVisible')?.checked) return [];
  const band=fr.bands?.[v];
  if(!band || !state.result?.T?.length) return [];
  const t=state.result.T;
  return [
    {x:t,y:band.low,mode:'lines',type:'scatter',name:`${v} fit lower`,line:{width:0,color:'rgba(15,118,110,.15)'},hoverinfo:'skip',showlegend:false},
    {x:t,y:band.high,mode:'lines',type:'scatter',name:`${v} 95% fit band`,line:{width:0,color:'rgba(15,118,110,.15)'},fill:'tonexty',fillcolor:'rgba(15,118,110,.12)',hoverinfo:'skip'}
  ];
}

function actionable(m){ m=String(m||'Unknown error'); if(/diverged|stiff|Step limit/i.test(m)) return `${m} Try shorter time range, more points, or export Python with Radau/BDF/LSODA.`; if(/Unknown symbol/i.test(m)) return `${m} Check variable and parameter spelling.`; if(/parse/i.test(m)) return `${m} Use syntax like x^2, sin(t), exp(-k*t), a*x.`; return m; }
function resetStatus(){ ['runtimeValue','acceptedValue','rejectedValue','stepsMetric','evalMetric','cpuMetric','errorMetric'].forEach(id=>safeText($(id),'—')); safeText($('topStatus'),'Ready'); setStatus('Ready.'); }
function setStatus(msg,bad=false){ $('status').textContent=msg; $('status').className='status '+(bad?'bad':''); }
function updateMetrics(d){ safeText($('topStatus'),'Integration successful'); safeText($('runtimeValue'),fmtRuntime(d.runtime)); safeText($('acceptedValue'),fmt(d.accepted)); safeText($('rejectedValue'),fmt(d.rejected)); safeText($('stepsMetric'),fmt(d.accepted)); safeText($('evalMetric'),fmt(d.functionEvaluations)); safeText($('cpuMetric'),fmtRuntime(d.runtime)); safeText($('errorMetric'),$('rtol').value || '—'); }
function diagnosticsTable(obj){
  const rows=Object.entries(obj||{}).map(([k,v])=>`<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(typeof v==='number'?String(Number(v.toPrecision ? v.toPrecision(6) : v)):String(v??'—'))}</td></tr>`).join('');
  return `<table class="clean-table compact-table diagnostic-table"><tbody>${rows||'<tr><td>No diagnostics.</td></tr>'}</tbody></table>`;
}
function updateOptMetrics(d){ safeText($('topStatus'),`${d.feasible?'Feasible':'Approximate'} · ${d.diagnostics?.method||'optimizer'}`); safeText($('runtimeValue'),fmtRuntime(d.diagnostics.runtime)); safeText($('acceptedValue'),fmt(d.diagnostics.samples)); safeText($('rejectedValue'),d.feasible?'0':'violation'); safeText($('stepsMetric'),fmt(d.diagnostics.samples)); safeText($('evalMetric'),fmt(d.samples?.length||0)); safeText($('cpuMetric'),fmtRuntime(d.diagnostics.runtime)); safeText($('errorMetric'),Number(d.violation).toExponential(2)); }
function showDiagnostics(d){ $('diagnostics').innerHTML=diagnosticsTable(d); }
function showOptDiagnostics(d){ $('diagnostics').innerHTML=diagnosticsTable({status:d.feasible?'feasible':'constraint violation remains', objective:d.objective, violation:d.violation, best:(d.best||[]).map(v=>Number(v).toPrecision(5)).join(', '), ...(d.diagnostics||{})}); }


function splitCsvLine(line){
  const out=[]; let cur='', q=false;
  for(let i=0;i<String(line).length;i++){
    const ch=line[i];
    if(ch==='"' && line[i+1]==='"'){ cur+='"'; i++; continue; }
    if(ch==='"'){ q=!q; continue; }
    if((ch===',' || ch==='\t' || ch===';') && !q){ out.push(cur.trim()); cur=''; continue; }
    cur+=ch;
  }
  out.push(cur.trim());
  return out;
}
function parseObservationTable(text){
  const lines=String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length<2) throw new Error('Observed data needs a header row and at least one numeric row.');
  const header=splitCsvLine(lines[0]).map(h=>h.trim()).filter(Boolean);
  if(header.length<2) throw new Error('Observed data needs at least a time column and one variable column.');
  const rows=[];
  for(const line of lines.slice(1)){
    const cells=splitCsvLine(line);
    const row={};
    header.forEach((h,i)=>{ const v=Number(cells[i]); if(Number.isFinite(v)) row[h]=v; });
    if(Object.keys(row).length>=2) rows.push(row);
  }
  if(!rows.length) throw new Error('Observed data contains no numeric rows.');
  return {header, rows};
}
function loadObservationData(){
  const parsed=parseObservationTable($('obsData')?.value||'');
  const timeCol=($('obsTimeCol')?.value||parsed.header[0]).trim();
  if(!parsed.header.includes(timeCol)) throw new Error(`Time column "${timeCol}" was not found in observed data.`);
  const vars=currentVars();
  const columns=parsed.header.filter(h=>h!==timeCol && parsed.rows.some(r=>Number.isFinite(r[h])));
  state.observations={timeCol, columns, rows:parsed.rows, fallback:$('obsFallbackVar')?.value||vars[0]||columns[0]};
  updateObservationSummary();
  return state.observations;
}
function updateObservationSummary(){
  const el=$('fitBridgePreview'); if(!el) return;
  refreshObservationVariableSelect();
  if(!state.observations){ el.textContent='No observed data loaded.'; return; }
  const o=state.observations;
  el.textContent=`Loaded ${o.rows.length} observed rows. Columns: ${o.columns.join(', ')}. Overlay is drawn as markers when a data column matches a plotted variable.`;
}
function refreshObservationVariableSelect(){
  const sel=$('obsFallbackVar'); if(!sel) return;
  const prev=sel.value;
  sel.innerHTML='';
  currentVars().forEach(v=>sel.append(new Option(v,v)));
  if(prev && Array.from(sel.options).some(o=>o.value===prev)) sel.value=prev;
}
function observationVisible(){ return !!(state.observations && ($('overlayVisible')?.checked ?? true)); }
function observationTraceForVariable(v, colorIndex=0){
  if(!observationVisible()) return null;
  const o=state.observations;
  const col=o.columns.includes(v) ? v : (o.columns.length===1 ? o.columns[0] : null);
  if(!col) return null;
  const x=[], y=[];
  o.rows.forEach(r=>{ if(Number.isFinite(r[o.timeCol]) && Number.isFinite(r[col])){ x.push(r[o.timeCol]); y.push(r[col]); } });
  if(!x.length) return null;
  const cs=colors();
  return {x,y,mode:'markers',type:'scatter',name:`observed ${col}`,marker:{size:Math.max(5,ensurePlot('left').markerSize+1),symbol:'circle-open',line:{width:1.8,color:cs[colorIndex%cs.length]},color:cs[colorIndex%cs.length]}};
}
function observationPhaseTrace(xVar,yVar,zVar=null){
  if(!observationVisible()) return null;
  const o=state.observations;
  if(!o.columns.includes(xVar) || !o.columns.includes(yVar)) return null;
  const x=[], y=[], z=[];
  o.rows.forEach(r=>{ if(Number.isFinite(r[xVar]) && Number.isFinite(r[yVar])){ x.push(r[xVar]); y.push(r[yVar]); if(zVar && Number.isFinite(r[zVar])) z.push(r[zVar]); } });
  if(!x.length) return null;
  if(zVar && o.columns.includes(zVar)) return {x,y,z,mode:'markers',type:'scatter3d',name:'observed phase data',marker:{size:4,symbol:'circle-open',color:'#111827'}};
  return {x,y,mode:'markers',type:'scatter',name:'observed phase data',marker:{size:7,symbol:'circle-open',line:{width:1.7,color:'#111827'},color:'#ffffff'}};
}
function prepareFitBridge(silent=false){
  try{
    readOde();
    if(!state.observations && ($('obsData')?.value||'').trim()) loadObservationData();
    const cfg={
      kind:'foko-fit-bridge', version:'71.12.0', source:'ode.html', createdAt:new Date().toISOString(),
      model:currentConfig().model, params:paramValues(), paramDefinitions:paramDefs(),
      observations:state.observations,
      fit:{engine:'curve-fitting', method:'least_squares', target:'trajectory', vary:Object.keys(paramValues()), notes:'First bridge hook: generated from ODE Lab. Use Curve Fitting Lab or future dynamic fitting bridge to estimate parameters.'}
    };
    state.fitBridge=cfg;
    try{ localStorage.setItem('foko-fit-bridge-config', JSON.stringify(cfg)); }catch(_e){}
    const el=$('fitBridgePreview'); if(el) el.textContent=`Fitting bridge prepared for ${cfg.fit.vary.length} parameters and ${cfg.observations?.rows?.length||0} observed rows. Stored in local browser storage and available for export.`;
    if(!silent) setStatus('Fitting bridge config prepared.');
    return cfg;
  }catch(e){ if(!silent) setStatus(actionable(e.message), true); return null; }
}

function colors(){ return PALETTES[$('palette').value] || PALETTES.seaborn; }
function cssVar(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }

function observePlotNode(el){
  if(!el || !el.id || !('ResizeObserver' in window)) return;
  try{ plotObservers[el.id]?.disconnect(); }catch(_e){}
  const ro = new ResizeObserver(()=>{
    requestAnimationFrame(()=>forcePlotVisible(el.id));
  });
  ro.observe(el);
  plotObservers[el.id]=ro;
}
function resetPlotNode(id,h){
  const old=$(id);
  if(!old) return null;
  const fresh=document.createElement('div');
  fresh.id=id;
  fresh.className=old.className || 'plot';
  const height=Math.max(360, Number(h)||430);
  fresh.style.height=height+'px';
  fresh.style.minHeight=height+'px';
  fresh.style.width='100%';
  fresh.style.display='block';
  fresh.style.visibility='visible';
  fresh.style.opacity='1';
  fresh.classList.add('plot-ready');
  try{ Plotly.purge(old); }catch(_e){}
  old.replaceWith(fresh);
  observePlotNode(fresh);
  return fresh;
}
function forcePlotVisible(id){
  const el=$(id);
  if(!el) return;
  el.style.display='block'; el.style.visibility='visible'; el.style.opacity='1';
  const card=el.closest('.chart-card');
  if(card){ card.style.display='block'; card.style.visibility='visible'; card.style.opacity='1'; }
  el.querySelectorAll('.plotly,.plot-container,.svg-container,.main-svg,.gl-container,canvas,svg').forEach(n=>{
    n.style.visibility='visible'; n.style.opacity='1';
    if(n.classList && (n.classList.contains('svg-container') || n.classList.contains('plot-container'))) n.style.width='100%';
  });
  try{ Plotly.Plots.resize(el); }catch(_e){}
}
function drawPlot(target,traces,layout={},config={}){
  const id = typeof target === 'string' ? target : target?.id;
  let el = typeof target === 'string' ? $(target) : target;
  if(!id || !el) return Promise.reject(new Error('Missing plot target'));
  const h = Number(layout.height) || Number(el.style.height?.replace('px','')) || 430;
  el.style.height=Math.max(360,h)+'px'; el.style.minHeight=el.style.height; el.style.width='100%'; el.style.display='block'; el.style.visibility='visible'; el.style.opacity='1';
  observePlotNode(el);
  plotRenderSeq[id]=(plotRenderSeq[id]||0)+1;
  const seq=plotRenderSeq[id];
  const finalLayout = {...layout, height:Math.max(360,h), autosize:true, uirevision:`${state.module}-${state.resultKind}-${id}`};
  const finalConfig = {responsive:true, displaylogo:false, scrollZoom:false, ...config};
  const method = (el.data && typeof Plotly.react==='function') ? Plotly.react : Plotly.newPlot;
  const p = method(el,traces,finalLayout,finalConfig);
  Promise.resolve(p).then(()=>{ if(plotRenderSeq[id]!==seq) return; forcePlotVisible(id); requestAnimationFrame(()=>{ if(plotRenderSeq[id]===seq) forcePlotVisible(id); }); }).catch(err=>{ if(plotRenderSeq[id]!==seq) return; const node=$(id); if(node) node.innerHTML=`<div class="diagnostics empty">${escapeHtml(actionable(err.message||err))}</div>`; });
  return p;
}

function baseLayout(cfg){ const text=cssVar('--text')||'#111827', muted=cssVar('--muted')||'#667085', grid=cssVar('--grid')||'rgba(120,120,120,.2)', panel=cssVar('--panel')||'#ffffff', fs=Number(cfg.fontSize)||13, h=Number(cfg.height)||430; return {height:h, autosize:true,title:{text:cfg.title||'',font:{size:Math.max(fs+2,14),color:text}},paper_bgcolor:panel,plot_bgcolor:'rgba(0,0,0,0)',margin:{l:62,r:28,t:48,b:58},xaxis:{title:{text:cfg.xLabel||'',font:{color:muted,size:fs}},tickfont:{color:muted,size:Math.max(fs-1,10)},gridcolor:cfg.grid?grid:'rgba(0,0,0,0)',zeroline:false,automargin:true},yaxis:{title:{text:cfg.yLabel||'',font:{color:muted,size:fs}},tickfont:{color:muted,size:Math.max(fs-1,10)},gridcolor:cfg.grid?grid:'rgba(0,0,0,0)',zeroline:false,automargin:true},legend:{orientation:'h',font:{color:text,size:Math.max(fs-1,10)}},font:{family:'Inter, system-ui',color:text,size:fs},showlegend:cfg.legend!==false}; }
function plotConfig(side){ return ensurePlot(side); }
function setDefaultLabels(side){
  const p=state.plots[side]; const vars=currentVars();
  if(!p.x) p.x=vars[0]||'x'; if(!p.y) p.y=vars[1]||vars[0]||'y'; if(!p.z) p.z=vars[2]||vars[0]||'z';
  const map={
    trajectory:['Trajectory','t','state','', ''],
    phase2d:['2D phase portrait',p.x,p.y,'',''],
    phase3d:['3D phase portrait',p.x,p.y,p.z,''],
    vector:['2D vector field',p.x,p.y,'', 'direction'],
    poincare:['Poincaré section',p.x,p.y,'',''],
    matrix:['Trajectory matrix','state','state','','time'],
    heatmap:['Parameter sweep heatmap',state.sweep?.sweepA||'parameter A',state.sweep?.sweepB||'parameter B','',`${state.sweep?.sweepVar||'output'} ${state.sweep?.sweepMetric||'metric'}`],
    contour:['Parameter sweep contour',state.sweep?.sweepA||'parameter A',state.sweep?.sweepB||'parameter B','',`${state.sweep?.sweepVar||'output'} ${state.sweep?.sweepMetric||'metric'}`],
    bifurcation:['Bifurcation-style diagram',state.sweep?.sweepA||'parameter',state.sweep?.sweepVar||'output','','output'],
    envelope:['Envelope / fan plot','t','state','',''],
    parallel:['Parallel coordinates','run','scaled value','','sweep metric'],
    opt_samples:['Optimization samples',currentOptVars()[0]||'x',currentOptVars()[1]||'objective','','feasibility'],
    opt_path:['Optimization path',currentOptVars()[0]||'x',currentOptVars()[1]||'objective','','feasibility'],
    convergence:['Convergence','iteration','best objective','',''],
    tradeoff:['Objective–constraint trade-off','objective','constraint violation','','feasibility'],
    pareto:['Pareto frontier','objective f1','objective f2','','non-dominated set'],
    feasibility:['Feasibility map',currentOptVars()[0]||'x',currentOptVars()[1]||'objective','','constraint violation'],
    none:['None','','','','']
  };
  const m=map[p.type]||map.trajectory;
  p.title=m[0]; p.xLabel=m[1]; p.yLabel=m[2]; p.zLabel=m[3]; p.colorLabel=m[4];
}
function currentVars(){ return state.module==='opt'?currentOptVars():state.model?.vars||[]; }
function currentOptVars(){ return state.model?.variables?.map(v=>v.name)||[]; }
function indexOfVar(v,f=0){ const vars=currentVars(); const i=vars.indexOf(v); return i>=0?i:Math.min(f,Math.max(0,vars.length-1)); }
function renderPlots(){ normalizePlotState(); renderPlot('left'); renderPlot('right'); }
function renderPlot(side){
  normalizePlotState();
  const p=plotConfig(side);
  const target=side==='left'?'leftPlot':'rightPlot';
  const titleEl=$(side+'PlotTitle'); if(titleEl) titleEl.textContent=p.title||PLOT_LABEL(p.type);
  const el=$(target);
  el.style.height=(p.height||430)+'px';
  if(p.type==='none'){
    Plotly.purge(target);
    el.innerHTML='<div class="diagnostics empty">No plot selected.</div>';
    return;
  }
  try{
    if(!plotAllowed(p.type)) throw new Error(`${PLOT_LABEL(p.type)} is not available for the current module/result. Choose another view.`);
    // Remove stale fallback text/HTML before Plotly draws. Chrome can otherwise keep old helper
    // messages visually over the new canvas after plot-type switches.
    el.innerHTML='';
    if(['trajectory','phase2d','phase3d','vector','poincare','matrix'].includes(p.type)) renderOdePlot(target,p);
    else if(['heatmap','contour','bifurcation','envelope','parallel'].includes(p.type)) renderSweepPlot(target,p);
    else if(['opt_samples','opt_path','convergence','tradeoff','pareto','feasibility'].includes(p.type)) renderOptPlot(target,p);
  }catch(e){
    Plotly.purge(target);
    el.innerHTML=`<div class="diagnostics empty">${escapeHtml(actionable(e.message))}</div>`;
  }
}
function PLOT_LABEL(t){ const all=[...PLOTS.ode.default,...PLOTS.param.default,...PLOTS.param.sweep,...PLOTS.opt.optimization]; return (all.find(x=>x[0]===t)||['',t])[1]; }
function plotAllowed(type){ const opts=((PLOTS[state.module]||{})[state.resultKind]||[]).map(o=>o[0]); return opts.includes(type); }
function updatePlotHint(){ const hint = state.module==='param' && state.resultKind==='sweep' ? 'Sweep views use parameter ranges. Use Run default to return to trajectory/phase plots.' : state.module==='opt' ? 'Optimization Lab plots show search samples, convergence, feasibility, Pareto/frontier views, and objective/constraint trade-offs.' : 'For stiff systems, export Python to use BDF, Radau, or LSODA locally.'; safeText($('plotHint'), 'ⓘ '+hint); }
function renderOdePlot(target,p){ if(!state.result) throw new Error('Run the model first.'); if(p.type==='trajectory') return plotTrajectory(target,p); if(p.type==='phase2d') return plotPhase2D(target,p); if(p.type==='phase3d') return plotPhase3D(target,p); if(p.type==='vector') return plotVectorField(target,p); if(p.type==='poincare') return plotPoincare(target,p); if(p.type==='matrix') return plotMatrix(target,p); }
function plotTrajectory(target,p){ const cs=colors(); const idxs=visibleSeriesIndices(); const traces=[]; idxs.forEach((i,k)=>{ const v=state.result.vars[i]; traces.push(...fitBandsForVariable(v)); traces.push({x:state.result.T,y:state.result.Y[i],mode:'lines',name:`${v}(t)`,line:{color:cs[k%cs.length],width:p.lineWidth}}); }); idxs.forEach((i,k)=>{ const obs=observationTraceForVariable(state.result.vars[i],k); if(obs) traces.push(obs); }); const layout=baseLayout({...p,xLabel:p.xLabel||'t',yLabel:p.yLabel||'state'}); if((state.result.vars||[]).length>idxs.length){ layout.annotations=[{text:`Showing ${idxs.length} key variables of ${state.result.vars.length}. Export CSV/Python for all states.`,xref:'paper',yref:'paper',x:1,y:1.12,showarrow:false,font:{size:11,color:cssVar('--muted')||'#667085'},xanchor:'right'}]; } drawPlot(target,traces,layout,{responsive:true,displaylogo:false}); }
function plotPhase2D(target,p){ const cs=colors(), vars=state.result.vars, ix=indexOfVar(p.x,0), iy=indexOfVar(p.y,1); if(ix===iy){ drawPlot(target,[],{...baseLayout({...p,title:'Phase portrait requires 2 different variables',xLabel:p.xLabel||vars[ix],yLabel:p.yLabel||vars[iy]}),annotations:[{text:'Select different X and Y variables in Figure settings.',xref:'paper',yref:'paper',x:.5,y:.5,showarrow:false,font:{size:14}}]},{responsive:true,displaylogo:false}); return; } const trace={x:state.result.Y[ix],y:state.result.Y[iy],mode:'lines',type:'scatter',name:`${vars[ix]} vs ${vars[iy]}`,line:{color:cs[1]||cs[0],width:p.lineWidth}}; const obs=observationPhaseTrace(vars[ix],vars[iy]); drawPlot(target,obs?[trace,obs]:[trace],baseLayout({...p,xLabel:p.xLabel||vars[ix],yLabel:p.yLabel||vars[iy]}),{responsive:true,displaylogo:false}); }
function plotPhase3D(target,p){ const cs=colors(), vars=state.result.vars, ix=indexOfVar(p.x,0), iy=indexOfVar(p.y,1), iz=indexOfVar(p.z,2); if(vars.length<3) throw new Error('3D phase portrait requires at least three variables.'); const trace={x:state.result.Y[ix],y:state.result.Y[iy],z:state.result.Y[iz],mode:'lines',type:'scatter3d',name:`${vars[ix]}-${vars[iy]}-${vars[iz]}`,line:{color:cs[0],width:p.lineWidth*1.6}}; const obs=observationPhaseTrace(vars[ix],vars[iy],vars[iz]); drawPlot(target,obs?[trace,obs]:[trace],{...baseLayout(p),scene:{xaxis:{title:p.xLabel||vars[ix]},yaxis:{title:p.yLabel||vars[iy]},zaxis:{title:p.zLabel||vars[iz]}},margin:{l:0,r:0,t:45,b:0},showlegend:false},{responsive:true,displaylogo:false}); }
let compiledEquationCacheKey='', compiledEquationCache=null;
function compileMainEquations(){ const key=JSON.stringify({vars:state.model.vars, params:Object.keys(state.model.params||{}), eqs:state.model.eqs}); if(compiledEquationCache && compiledEquationCacheKey===key) return compiledEquationCache; const allowed=new Set(['t',...state.model.vars,...Object.keys(state.model.params||{}),'sin','cos','tan','exp','log','sqrt','abs','min','max','pow','pi','e']); compiledEquationCache=state.model.eqs.map(e=>{ const n=math.parse(e); const symbols=[]; n.traverse(node=>{if(node.isSymbolNode)symbols.push(node.name);}); symbols.forEach(s=>{if(!allowed.has(s)) throw new Error(`Unknown symbol ${s}`);}); return n.compile(); }); compiledEquationCacheKey=key; return compiledEquationCache; }
function evalRhsAt(x,y,p){ const comps=compileMainEquations(), vars=state.model.vars, params=paramValues(); const scope={t:0,...params}; vars.forEach((v,i)=>scope[v]=state.model.y0[i]||0); scope[p.x]=x; scope[p.y]=y; if(p.z && vars.includes(p.z)) scope[p.z]=num(p.plane); return comps.map(c=>c.evaluate(scope)); }
function plotVectorField(target,p){
  const vars=state.result.vars, ix=indexOfVar(p.x,0), iy=indexOfVar(p.y,1);
  const xs=state.result.Y[ix], ys=state.result.Y[iy];
  const xmin=Math.min(...xs), xmax=Math.max(...xs), ymin=Math.min(...ys), ymax=Math.max(...ys);
  const nx=8, ny=8, arrowX=[], arrowY=[];
  const cs=colors();
  const cell=Math.min((xmax-xmin)/(nx-1 || 1),(ymax-ymin)/(ny-1 || 1));
  const headAngle=.62, headLen=.34;
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){
    const x=xmin+(xmax-xmin)*i/(nx-1), y=ymin+(ymax-ymin)*j/(ny-1);
    const dy=evalRhsAt(x,y,p);
    let u=dy[ix]||0, v=dy[iy]||0;
    const n=Math.hypot(u,v)||1;
    const len=.46*cell;
    u=u/n*len; v=v/n*len;
    const ex=x+u, ey=y+v, a=Math.atan2(v,u);
    const h=len*headLen;
    const hx1=ex-h*Math.cos(a-headAngle), hy1=ey-h*Math.sin(a-headAngle);
    const hx2=ex-h*Math.cos(a+headAngle), hy2=ey-h*Math.sin(a+headAngle);
    arrowX.push(x,ex,null,ex,hx1,null,ex,hx2,null);
    arrowY.push(y,ey,null,ey,hy1,null,ey,hy2,null);
  }
  const field={x:arrowX,y:arrowY,mode:'lines',type:'scatter',name:'field arrows',line:{color:cs[0],width:1.35},hoverinfo:'skip'};
  const traj={x:xs,y:ys,mode:'lines',type:'scatter',name:'trajectory',line:{color:cs[2]||cs[1]||cs[0],width:Math.max(1.4,p.lineWidth*.75)}};
  drawPlot(target,[field,traj],baseLayout({...p,title:p.title||'2D vector field',xLabel:p.xLabel||vars[ix],yLabel:p.yLabel||vars[iy]}),{responsive:true,displaylogo:false});
}
function plotPoincare(target,p){ const vars=state.result.vars, ix=indexOfVar(p.x,0), iy=indexOfVar(p.y,1), sectionVarName=state.model?.sectionVar || p.z, iz=indexOfVar(sectionVarName,2), plane=state.model?.sectionValue ?? num(p.plane); const X=[],Y=[]; const Z=state.result.Y[iz]; for(let i=1;i<Z.length;i++){ const a=Z[i-1]-plane,b=Z[i]-plane; if(a===0 || a*b<0){ const r=Math.abs(a)/(Math.abs(a)+Math.abs(b)); X.push(state.result.Y[ix][i-1]*(1-r)+state.result.Y[ix][i]*r); Y.push(state.result.Y[iy][i-1]*(1-r)+state.result.Y[iy][i]*r); } } if(!X.length){ drawPlot(target,[],{...baseLayout({...p,title:'Poincaré section: no crossings found',xLabel:vars[ix],yLabel:vars[iy]}),annotations:[{text:`No crossings found. Try ${sectionVarName || vars[0]} = ${plane} or change the plane value.`,xref:'paper',yref:'paper',x:.5,y:.5,showarrow:false,font:{size:14}}]},{responsive:true,displaylogo:false}); return; } drawPlot(target,[{x:X,y:Y,mode:'markers',type:'scatter',name:`${vars[iz]}=${plane}`,marker:{size:p.markerSize,color:colors()[0]}}],baseLayout({...p,title:p.title||'Poincaré section',xLabel:p.xLabel||vars[ix],yLabel:p.yLabel||vars[iy]}),{responsive:true,displaylogo:false}); }
function plotMatrix(target,p){
  const vars=state.result.vars;
  const n=vars.length;
  if(n<2) throw new Error('Trajectory matrix requires at least two variables.');
  if(n>6){
    const keep=visibleSeriesIndices().slice(0,6);
    const oldVars=state.result.vars, oldY=state.result.Y;
    state.result.vars=keep.map(i=>oldVars[i]); state.result.Y=keep.map(i=>oldY[i]);
    try{ return plotMatrix(target,{...p,title:(p.title||'Trajectory matrix')+' — key variables'}); } finally { state.result.vars=oldVars; state.result.Y=oldY; }
  }
  // For two-state systems, a full pair grid adds noise without information; show the clean phase portrait.
  if(n===2) return plotPhase2D(target,{...p,title:p.title||'Trajectory matrix',x:vars[0],y:vars[1],xLabel:p.xLabel||vars[0],yLabel:p.yLabel||vars[1]});
  const traces=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
    if(i===j) continue;
    traces.push({
      x:state.result.Y[j],y:state.result.Y[i],mode:'markers',type:'scattergl',
      marker:{size:Math.max(2,Math.min(4,p.markerSize*.55)),color:state.result.T,colorscale:'Viridis',showscale:i===0&&j===n-1,colorbar:{title:p.colorLabel||'t',len:.72,thickness:12}},
      xaxis:'x'+(i*n+j+1),yaxis:'y'+(i*n+j+1),name:`${vars[j]} vs ${vars[i]}`,showlegend:false
    });
  }
  const layout=baseLayout({...p,title:p.title||'Trajectory matrix'});
  layout.grid={rows:n,columns:n,pattern:'independent'};
  layout.margin={l:38,r:38,t:45,b:35};
  layout.showlegend=false;
  drawPlot(target,traces,layout,{responsive:true,displaylogo:false});
}
function renderSweepPlot(target,p){ if(!state.sweep) throw new Error('Run a parameter sweep first.'); if(p.type==='heatmap') return plotHeatmap(target,p,false); if(p.type==='contour') return plotHeatmap(target,p,true); if(p.type==='bifurcation') return plotBifurcation(target,p); if(p.type==='envelope') return plotEnvelope(target,p); if(p.type==='parallel') return plotParallel(target,p); }
function plotHeatmap(target,p,contour=false){ const d=state.sweep; const trace=contour?{x:d.x,y:d.y,z:d.z,type:'contour',colorscale:'Viridis',colorbar:{title:p.colorLabel||`${d.sweepVar} ${d.sweepMetric}`}}:{x:d.x,y:d.y,z:d.z,type:'heatmap',colorscale:'Viridis',colorbar:{title:p.colorLabel||`${d.sweepVar} ${d.sweepMetric}`}}; drawPlot(target,[trace],baseLayout({...p,title:p.title||`${d.sweepVar} ${d.sweepMetric}`,xLabel:p.xLabel||d.sweepA,yLabel:p.yLabel||d.sweepB}),{responsive:true,displaylogo:false}); }
function plotBifurcation(target,p){ const d=state.sweep, X=[],Y=[]; d.x.forEach((x,i)=>d.y.forEach((y,j)=>{X.push(x);Y.push(d.z[j][i]);})); drawPlot(target,[{x:X,y:Y,mode:'markers',type:'scatter',marker:{size:p.markerSize,color:Y,colorscale:'Viridis',colorbar:{title:p.colorLabel||`${d.sweepVar}`}}}],baseLayout({...p,title:p.title||'Bifurcation-style diagram',xLabel:p.xLabel||d.sweepA,yLabel:p.yLabel||`${d.sweepVar} ${d.sweepMetric}`}),{responsive:true,displaylogo:false}); }
function plotEnvelope(target,p){ const d=state.sweep; const xs=d.x, lows=[], highs=[], med=[]; for(let i=0;i<xs.length;i++){ const col=d.z.map(row=>row[i]).sort((a,b)=>a-b); lows.push(col[0]); highs.push(col[col.length-1]); med.push(col[Math.floor(col.length/2)]); } const tr=[{x:xs,y:highs,mode:'lines',line:{width:0},showlegend:false,name:'upper'},{x:xs,y:lows,mode:'lines',fill:'tonexty',fillcolor:'rgba(20,184,166,.20)',line:{width:0},name:'range'},{x:xs,y:med,mode:'lines',line:{color:colors()[2],width:p.lineWidth},name:'median'}]; drawPlot(target,tr,baseLayout({...p,title:p.title||'Envelope / fan plot',xLabel:p.xLabel||d.sweepA,yLabel:p.yLabel||`${d.sweepVar} ${d.sweepMetric}`}),{responsive:true,displaylogo:false}); }
function plotParallel(target,p){ const d=state.sweep, dims=[{label:d.sweepA,values:[]},{label:d.sweepB,values:[]},{label:`${d.sweepVar} ${d.sweepMetric}`,values:[]}]; d.x.forEach((x,i)=>d.y.forEach((y,j)=>{dims[0].values.push(x); dims[1].values.push(y); dims[2].values.push(d.z[j][i]);})); drawPlot(target,[{type:'parcoords',line:{color:dims[2].values,colorscale:'Viridis',showscale:true,colorbar:{title:p.colorLabel||dims[2].label}},dimensions:dims}],{...baseLayout({...p,title:p.title||'Parallel coordinates'}),margin:{l:50,r:40,t:45,b:35}},{responsive:true,displaylogo:false}); }
function renderOptPlot(target,p){ if(!state.opt) throw new Error('Run optimization first.'); if(p.type==='opt_samples') return plotOptSamples(target,p); if(p.type==='opt_path') return plotOptSamples(target,{...p,title:'Optimization path / samples'}); if(p.type==='convergence') return plotConvergence(target,p); if(p.type==='tradeoff') return plotTradeoff(target,p); if(p.type==='pareto') return plotPareto(target,p); if(p.type==='feasibility') return plotFeasibility(target,p); }
function plotOptSamples(target,p){
  const d=state.opt, vars=d.variables||[];
  const feasible=d.samples.filter(s=>s.feasible), infeasible=d.samples.filter(s=>!s.feasible);
  const yVal=s=>vars.length>1 ? s.x[1] : s.obj;
  const makeTrace=(arr,name,color)=>({x:arr.map(s=>s.x[0]),y:arr.map(yVal),mode:'markers',type:'scattergl',name,marker:{size:p.markerSize,color,opacity:.72}});
  const tr=[makeTrace(feasible,'feasible samples','#16a34a'),makeTrace(infeasible,'infeasible samples','#dc2626'),{x:[d.best[0]],y:[vars.length>1?(d.best[1]??d.objective):d.objective],mode:'markers',name:'best candidate',marker:{size:Math.max(12,p.markerSize*2),color:'#f59e0b',symbol:'star'}}];
  drawPlot(target,tr,baseLayout({...p,title:p.title||'Optimization samples',xLabel:p.xLabel||vars[0]||'x',yLabel:p.yLabel||vars[1]||'objective'}),{responsive:true,displaylogo:false});
}
function plotConvergence(target,p){
  const y=state.opt.samples.map(s=>s.obj);
  const best=[];
  if(state.model.sense==='maximize') y.reduce((m,v,i)=>{best[i]=Math.max(m,v); return best[i];},-Infinity);
  else y.reduce((m,v,i)=>{best[i]=Math.min(m,v); return best[i];},Infinity);
  const positive = best.every(v=>Number.isFinite(v) && v>0);
  const yaxis = {...baseLayout(p).yaxis}; if(positive) yaxis.type='log';
  drawPlot(target,[{x:best.map((_,i)=>i+1),y:best,mode:'lines',name:'best objective',line:{color:colors()[0],width:p.lineWidth}}],{...baseLayout({...p,title:p.title||'Convergence',xLabel:p.xLabel||'sample',yLabel:p.yLabel||'best objective'}),yaxis},{responsive:true,displaylogo:false});
}
function plotTradeoff(target,p){
  const samples=state.opt.samples;
  const feasible=samples.filter(s=>s.feasible), infeasible=samples.filter(s=>!s.feasible);
  const trace=(arr,name,color)=>({x:arr.map(s=>s.obj),y:arr.map(s=>Math.sqrt(Math.max(0,s.violation))),mode:'markers',type:'scatter',name,marker:{size:p.markerSize,color,opacity:.75}});
  drawPlot(target,[trace(feasible,'feasible','#16a34a'),trace(infeasible,'infeasible','#dc2626')],baseLayout({...p,title:p.title||'Objective–constraint trade-off',xLabel:p.xLabel||'objective',yLabel:p.yLabel||'constraint residual'}),{responsive:true,displaylogo:false});
}
function nondominated(points){
  const out=[];
  for(const a of points){
    let dom=false;
    for(const b of points){ if(b===a) continue; if(b.f1<=a.f1 && b.f2<=a.f2 && (b.f1<a.f1 || b.f2<a.f2)){ dom=true; break; } }
    if(!dom) out.push(a);
  }
  return out.sort((a,b)=>a.f1-b.f1);
}
function plotPareto(target,p){
  const samples=state.opt.samples.filter(s=>Number.isFinite(s.obj));
  const pts=samples.map(s=>({f1:s.obj, f2:Number.isFinite(s.obj2)?s.obj2:s.violation, feasible:s.feasible})).filter(s=>Number.isFinite(s.f2));
  if(!pts.length) throw new Error('No two-objective samples available for a Pareto plot. Add a secondary objective or run the optimizer again.');
  const front=nondominated(pts.filter(s=>s.feasible));
  const tr=[
    {x:pts.map(s=>s.f1),y:pts.map(s=>s.f2),mode:'markers',type:'scattergl',name:'sampled designs',marker:{size:Math.max(3,p.markerSize-1),color:pts.map(s=>s.feasible?0:1),colorscale:[[0,'#16a34a'],[1,'#dc2626']],showscale:true,colorbar:{title:'feasible'}}},
    {x:front.map(s=>s.f1),y:front.map(s=>s.f2),mode:'lines+markers',type:'scatter',name:'non-dominated frontier',line:{color:'#f59e0b',width:Math.max(2.5,p.lineWidth)},marker:{size:Math.max(6,p.markerSize+1),color:'#f59e0b'}}
  ];
  drawPlot(target,tr,baseLayout({...p,title:p.title||'Pareto frontier',xLabel:p.xLabel||'objective f1',yLabel:p.yLabel||'objective f2'}),{responsive:true,displaylogo:false});
}
function plotFeasibility(target,p){
  const d=state.opt, vars=d.variables||[];
  const x = d.samples.map(s=>s.x[0]);
  const y = d.samples.map(s=>vars.length>1?s.x[1]:s.obj);
  const v = d.samples.map(s=>Math.sqrt(Math.max(0,s.violation)));
  const tr=[{x,y,mode:'markers',type:'scattergl',name:'constraint residual',marker:{size:p.markerSize,color:v,colorscale:'Viridis',showscale:true,colorbar:{title:p.colorLabel||'residual'},opacity:.8}},{x:[d.best[0]],y:[vars.length>1?(d.best[1]??d.objective):d.objective],mode:'markers',name:'best candidate',marker:{size:Math.max(12,p.markerSize*2),color:'#f59e0b',symbol:'star'}}];
  drawPlot(target,tr,baseLayout({...p,title:p.title||'Feasibility map',xLabel:p.xLabel||vars[0]||'x',yLabel:p.yLabel||vars[1]||'objective'}),{responsive:true,displaylogo:false});
}
function clearPlots(){ ['leftPlot','rightPlot'].forEach(id=>{ const el=resetPlotNode(id,430); if(!el) return; el.innerHTML='<div class="diagnostics empty">Run a model to plot results.</div>'; el.style.display='block'; el.style.minHeight='360px'; }); $('diagnostics').textContent='Run a model to see diagnostics.'; }
function openPlotConfig(side='left'){
  state.plotSide=(side==='right'?'right':'left'); const p=ensurePlot(state.plotSide);
  $('cfgTarget').value=side;
  $('configTitle').textContent=`Figure settings: ${side==='left'?'primary view':'secondary view'}`;
  toggle('plotConfig',true); refreshAllSelects();
  ['cfgX','cfgY','cfgZ'].forEach(id=>{ const el=$(id); el.innerHTML=''; currentVars().forEach(v=>el.append(new Option(v,v))); });
  $('cfgTitle').value=p.title||''; $('cfgX').value=p.x||currentVars()[0]||''; $('cfgY').value=p.y||currentVars()[1]||currentVars()[0]||''; $('cfgZ').value=p.z||currentVars()[2]||currentVars()[0]||'';
  $('cfgPlane').value=p.plane??0; $('cfgXLabel').value=p.xLabel||''; $('cfgYLabel').value=p.yLabel||''; $('cfgZLabel').value=p.zLabel||''; $('cfgColorLabel').value=p.colorLabel||'';
  $('cfgWidth').value=p.width||760; $('cfgHeight').value=p.height||430; $('cfgFontSize').value=p.fontSize||13; $('cfgLineWidth').value=p.lineWidth||2.4; $('cfgMarkerSize').value=p.markerSize||5; $('cfgLegend').checked=p.legend!==false; $('cfgGrid').checked=p.grid!==false;
}
function applyPlotConfig(){
  const targetSide=$('cfgTarget')?.value==='right'?'right':'left';
  state.plotSide=targetSide;
  const p=ensurePlot(targetSide);
  Object.assign(p,{title:$('cfgTitle').value,x:$('cfgX').value,y:$('cfgY').value,z:$('cfgZ').value,plane:$('cfgPlane').value,xLabel:$('cfgXLabel').value,yLabel:$('cfgYLabel').value,zLabel:$('cfgZLabel').value,colorLabel:$('cfgColorLabel').value,width:+$('cfgWidth').value,height:+$('cfgHeight').value,fontSize:+$('cfgFontSize').value,lineWidth:+$('cfgLineWidth').value,markerSize:+$('cfgMarkerSize').value,legend:$('cfgLegend').checked,grid:$('cfgGrid').checked});
  renderPlot(targetSide);
  setStatus(`Updated ${targetSide==='left'?'primary':'secondary'} figure settings.`);
}
function plotFileName(side,format){
  const p=ensurePlot(side); const raw=(p.title||PLOT_LABEL(p.type)||'foko_lab_plot').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'') || 'foko_lab_plot';
  return `${raw}.${format}`;
}
function exportConfiguredPlot(format){ applyPlotConfig(); exportPlot(state.plotSide==='left'?'leftPlot':'rightPlot', plotFileName(state.plotSide,format), format); }
function exportPlot(id,name,format){ const side=id==='leftPlot'?'left':'right'; const p=ensurePlot(side); Plotly.downloadImage(id,{format:format==='svg'?'svg':'png',filename:name.replace(/\.(png|svg)$/,''),width:Number(p.width)||1100,height:Number(p.height)||760,scale:format==='svg'?1:2}); }

function updatePythonTargets(){ const py=$('pythonTarget'); py.innerHTML=''; if(state.module==='opt'){ [['scipy_opt','SciPy minimize'],['scipy_de','SciPy differential_evolution'],['casadi','CasADi Opti'],['pyomo','Pyomo'],['julia_opt','Julia Optim/BlackBoxOptim starter']].forEach(([v,l])=>py.append(new Option(l,v))); } else { [['scipy_ode','SciPy solve_ivp'],['julia_ode','Julia SciML starter'],['sundials_note','SUNDIALS/CVODE export notes']].forEach(([v,l])=>py.append(new Option(l,v))); } }
function pythonExport(){ return state.module==='opt'?pythonOptExport():pythonOdeExport(); }
function pythonHeader(){ return `# Foko Lab export\n# Setup examples for Python exports:\n#   Linux/macOS:\n#     python3 -m venv .venv\n#     source .venv/bin/activate\n#     pip install numpy scipy matplotlib casadi pyomo\n#   Windows PowerShell:\n#     py -m venv .venv\n#     .\\.venv\\Scripts\\Activate.ps1\n#     pip install numpy scipy matplotlib casadi pyomo\n\n`; }
function pythonOdeExport(){ const target=$('pythonTarget')?.value || 'scipy_ode'; const vars=state.model.vars, params=paramValues(); if(target==='julia_ode') return `# Foko Lab Julia/SciML starter
using DifferentialEquations

const p = ${JSON.stringify(params,null,2)}
function f!(du,u,p,t)
    ${vars.map((v,i)=>`${v}=u[${i+1}]`).join('; ')}
    ${Object.keys(params).map(k=>`${k}=p["${k}"]`).join('; ')}
${state.model.eqs.map((e,i)=>`    du[${i+1}] = ${pyExpr(e,'julia')}`).join('\n')}
end

u0 = ${JSON.stringify(state.model.y0)}
tspan = (${state.model.t0}, ${state.model.t1})
prob = ODEProblem(f!, u0, tspan, p)
sol = solve(prob, Tsit5(); reltol=1e-6, abstol=1e-9)
# For stiff systems: solve(prob, Rodas5()) or use Sundials.CVODE_BDF() when available.
`; if(target==='sundials_note') return `# Foko Lab SUNDIALS/CVODE notes
# Browser native CVODE is not bundled in this build.
# Professional target mapping:
# - nonstiff IVP: CVODE Adams / Tsit5 / DOP853
# - stiff IVP: CVODE BDF, Radau, BDF, LSODA
# - sensitivities: CVODES / adjoint sensitivity
# - DAE: IDA/IDAS
# - steady state: KINSOL or scipy.optimize.root

MODEL = ${JSON.stringify({vars:state.model.vars,eqs:state.model.eqs,y0:state.model.y0,params},null,2)}
`; return pythonHeader()+`import numpy as np\nimport matplotlib.pyplot as plt\nfrom scipy.integrate import solve_ivp\n\nparams = ${JSON.stringify(params,null,2)}\n\ndef rhs(t, y):\n    ${vars.map((v,i)=>`${v}=y[${i}]`).join('; ')}\n    ${Object.keys(params).map(k=>`${k}=params["${k}"]`).join('; ')}\n    return [\n${state.model.eqs.map(e=>'        '+pyExpr(e,'np')+',').join('\n')}\n    ]\n\nsol = solve_ivp(rhs, (${state.model.t0}, ${state.model.t1}), ${JSON.stringify(state.model.y0)}, method="RK45", rtol=${$('rtol').value}, atol=${$('atol').value}, dense_output=True)\nt = np.linspace(${state.model.t0}, ${state.model.t1}, ${state.model.points})\nY = sol.sol(t)\nfor i, name in enumerate(${JSON.stringify(vars)}):\n    plt.plot(t, Y[i], label=name)\nplt.xlabel('t'); plt.ylabel('state'); plt.legend(); plt.grid(True); plt.show()\n`; }
function pythonOptExport(){ const target=$('pythonTarget').value; if(target==='julia_opt') return `# Foko Lab Julia optimization starter
# Suggested packages: Optim.jl for local smooth problems, BlackBoxOptim.jl or Evolutionary.jl for metaheuristics, JuMP.jl for structured convex/nonlinear programs.

# Variables: ${state.model.variables.map(v=>v.name).join(', ')}
# Objective: ${state.model.objective}
# Inequality constraints g(x) <= 0:
${state.model.ineq.map(g=>'#   '+g).join('\n')}
`; if(target==='scipy_de') return pythonHeader()+`import numpy as np
from scipy.optimize import differential_evolution

def objective(v):
    ${state.model.variables.map((v,i)=>`${v.name}=v[${i}]`).join('; ')}
    obj = ${state.model.sense==='maximize'?'-(':''}${pyExpr(state.model.objective,'np')}${state.model.sense==='maximize'?')':''}
    penalty = ${$('penalty').value || '1e6'}
    viol = 0.0
${state.model.ineq.map(g=>`    viol += max(0.0, ${pyExpr(g,'np')})**2`).join('\n') || '    pass'}
${state.model.eq.map(h=>`    viol += (${pyExpr(h,'np')})**2`).join('\n') || ''}
    return obj + penalty*viol

bounds = ${JSON.stringify(state.model.variables.map(v=>[v.lower,v.upper]))}
res = differential_evolution(objective, bounds, polish=True, tol=1e-8)
print(res)
`; if(target==='casadi') return pythonHeader()+`import casadi as ca\n\nopti = ca.Opti()\n${state.model.variables.map(v=>`${v.name}=opti.variable(); opti.set_initial(${v.name}, ${v.initial}); opti.subject_to(${v.lower} <= ${v.name}); opti.subject_to(${v.name} <= ${v.upper})`).join('\n')}\n${state.model.sense==='maximize'?'opti.maximize':'opti.minimize'}(${pyExpr(state.model.objective,'ca')})\n${state.model.ineq.map(g=>`opti.subject_to(${pyExpr(g,'ca')} <= 0)`).join('\n')}\n${state.model.eq.map(h=>`opti.subject_to(${pyExpr(h,'ca')} == 0)`).join('\n')}\nopti.solver('ipopt')\nsol=opti.solve()\nprint(${JSON.stringify(state.model.variables.map(v=>v.name))})\n`; if(target==='pyomo') return pythonHeader()+`import pyomo.environ as pyo\nfrom math import sin, cos, tan, exp, log, sqrt, pi\n\nm=pyo.ConcreteModel()\n${state.model.variables.map(v=>`m.${v.name}=pyo.Var(bounds=(${v.lower},${v.upper}), initialize=${v.initial})`).join('\n')}\ndef obj_rule(m):\n    ${state.model.variables.map(v=>`${v.name}=m.${v.name}`).join('; ')}\n    return ${pyExpr(state.model.objective,'math')}\nm.obj=pyo.Objective(rule=obj_rule, sense=${state.model.sense==='maximize'?'pyo.maximize':'pyo.minimize'})\n# Add constraints manually or extend generated rules below.\n`; return pythonHeader()+`import numpy as np\nfrom scipy.optimize import minimize\n\ndef objective(v):\n    ${state.model.variables.map((v,i)=>`${v.name}=v[${i}]`).join('; ')}\n    return ${state.model.sense==='maximize'?'-(':''}${pyExpr(state.model.objective,'np')}${state.model.sense==='maximize'?')':''}\n\nconstraints = [\n${state.model.ineq.map(g=>`    {'type':'ineq', 'fun': lambda v: -(${pyExpr(g,'np')})},`).join('\n')}\n${state.model.eq.map(h=>`    {'type':'eq', 'fun': lambda v: ${pyExpr(h,'np')}},`).join('\n')}\n]\nbounds = ${JSON.stringify(state.model.variables.map(v=>[v.lower,v.upper]))}\nx0 = ${JSON.stringify(state.model.variables.map(v=>v.initial))}\nres = minimize(objective, x0, method='SLSQP', bounds=bounds, constraints=constraints, options={'maxiter':1000,'ftol':1e-9})\nprint(res)\n`; }
function pyExpr(s,lib='np'){
  let out=String(s);
  if(lib!=='julia') out = out.replace(/\^/g,'**');
  const funcs=['sin','cos','tan','exp','log','sqrt','abs','min','max','pow'];
  if(lib==='np'){
    out=out.replace(/\bpi\b/g,'np.pi');
    for(const f of funcs) out=out.replace(new RegExp('\\b'+f+'\\s*\\(','g'),`np.${f}(`);
  } else if(lib==='ca'){
    out=out.replace(/\bpi\b/g,'3.141592653589793');
    for(const f of funcs) out=out.replace(new RegExp('\\b'+f+'\\s*\\(','g'),`ca.${f}(`);
  } else if(lib==='julia'){
    out=out.replace(/\bpi\b/g,'pi');
  } else {
    out=out.replace(/\bpi\b/g,'pi');
  }
  return out;
}
function csvEscapeCell(v){ const s=String(v ?? ''); return /[,\n"]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }
function csvExport(){
  if(state.module==='param' && state.resultKind==='sweep' && state.sweep) return ['x,y,z',...state.sweep.z.flatMap((row,j)=>row.map((v,i)=>[state.sweep.x[i],state.sweep.y[j],v].map(csvEscapeCell).join(',')))].join('\n');
  if(state.opt) return [['sample','objective','violation','feasible',...state.model.variables.map(v=>v.name)].join(','),...state.opt.samples.map((p,i)=>[i,p.obj,p.violation,p.feasible,...p.x].map(csvEscapeCell).join(','))].join('\n');
  if(!state.result) return '';
  const rows=['t,'+state.result.vars.map(csvEscapeCell).join(',')];
  state.result.T.forEach((t,i)=>rows.push([t,...state.result.Y.map(y=>y[i])].map(csvEscapeCell).join(',')));
  return rows.join('\n');
}
function longCsvExport(){
  const rows=[['dataset','sample','x','y','variable','value','extra'].join(',')];
  if(state.module==='param' && state.resultKind==='sweep' && state.sweep){
    state.sweep.z.forEach((row,j)=>row.forEach((v,i)=>rows.push(['sweep','',state.sweep.x[i],state.sweep.y[j],'z',v,''].map(csvEscapeCell).join(','))));
    return rows.join('\n');
  }
  if(state.opt){
    state.opt.samples.forEach((pt,i)=>{
      rows.push(['optimization',i,'','', 'objective', pt.obj, `violation=${pt.violation}; feasible=${pt.feasible}`].map(csvEscapeCell).join(','));
      (pt.x||[]).forEach((val,j)=>rows.push(['optimization',i,'','', state.model.variables[j]?.name || `x${j+1}`, val, 'decision variable'].map(csvEscapeCell).join(',')));
    });
    return rows.join('\n');
  }
  if(state.result){
    state.result.T.forEach((t,i)=>state.result.vars.forEach((name,j)=>rows.push(['ode','',t,'',name,state.result.Y[j][i],'trajectory'].map(csvEscapeCell).join(','))));
  }
  return rows.join('\n');
}
function resultDataExport(){
  return {module:state.module, model:state.model, plots:state.plots, result:state.result||null, sweep:state.sweep||null, optimization:state.opt||null, diagnostics:$('diagnostics')?.textContent||null, exportedAt:new Date().toISOString()};
}
function plotlyDataExport(){
  const pack={exportedAt:new Date().toISOString(), plots:{}};
  ['leftPlot','rightPlot'].forEach(id=>{ const el=$(id); if(el && el.data) pack.plots[id]={data:el.data, layout:el.layout}; });
  return pack;
}

function openCurrentInSymbolic(){ try{ readOde(); const model={name:state.model.name||'ODE import', variables:state.model.vars, parameters:Object.keys(state.model.params||{}), rhs:state.model.eqs, numericScope:{...paramValues(), ...Object.fromEntries(state.model.vars.map((v,i)=>[v,state.model.y0[i]||0]))}}; sessionStorage.setItem('foko-symbolic-import', JSON.stringify(model)); window.location.href='symbolic.html?import=session'; }catch(e){ setStatus(actionable(e.message),true); } }
function openCurrentInSteady(){ try{ readOde(); const steady={name:state.model.name||'ODE steady import', family:'Imported from ODE Lab', narrative:'Imported ODE right-hand sides as f(x,p)=0 equations.', vars:state.model.vars.map((v,i)=>[v,state.model.y0[i]||0]), equations:state.model.eqs, params:paramValues()}; sessionStorage.setItem('foko-steady-import', JSON.stringify(steady)); window.location.href='steady.html?import=session'; }catch(e){ setStatus(actionable(e.message),true); } }

function currentConfig(){ ensurePlot('left'); ensurePlot('right'); return {module:state.module,model:state.model,plots:state.plots}; }
function copyInstall(){ const text=`# Linux/macOS\npython3 -m venv .venv\nsource .venv/bin/activate\npip install numpy scipy matplotlib casadi pyomo\n\n# Windows PowerShell\npy -m venv .venv\n.\\.venv\\Scripts\\Activate.ps1\npip install numpy scipy matplotlib casadi pyomo`; navigator.clipboard?.writeText(text); setStatus('Install block copied.'); }

function setupDragDrop(){ const zone=$('uploadDrop'); ['dragenter','dragover'].forEach(ev=>zone.addEventListener(ev,e=>{ e.preventDefault(); zone.classList.add('drag'); })); ['dragleave','drop'].forEach(ev=>zone.addEventListener(ev,e=>{ e.preventDefault(); zone.classList.remove('drag'); })); zone.addEventListener('drop',e=>handleFiles(e.dataTransfer.files)); }
function handleFiles(files){ const file=files&&files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const parsed=parseImport(String(reader.result),file.name); applyImported(parsed,file.name); } catch(e){ setStatus(actionable(e.message),true); } }; reader.readAsText(file); }
function parseImport(text,name){ const ext=(name.split('.').pop()||'').toLowerCase(); if(ext==='json') return normalizeImported(JSON.parse(text)); if(ext==='csv') return parseCsvModel(text); if(['xml','sbml'].includes(ext)) return parseSbmlModel(text,name); if(['txt','ode','eqn'].includes(ext)) return parseTextModel(text); if(['yml','yaml'].includes(ext)) return parseYamlLikeModel(text); if(ext==='py'){ const m=text.match(/DYNAMICS_LAB_CONFIG\s*=\s*({[\s\S]*?})\s*(?:#\s*END_DYNAMICS_LAB_CONFIG|$)/); if(!m) throw new Error('Python import requires DYNAMICS_LAB_CONFIG = {...}.'); return normalizeImported(JSON.parse(m[1])); } throw new Error('Unsupported file type.'); }

function parseSbmlModel(text,name='model.sbml'){
  const doc=new DOMParser().parseFromString(text,'application/xml');
  if(doc.querySelector('parsererror')) throw new Error('SBML/XML parse error. Check that the file is valid XML.');
  if(doc.getElementsByTagName('piecewise').length) throw new Error('SBML import does not yet support piecewise/conditional MathML kinetics. Simplify the model or export a version without conditional laws.');
  const warnings=[];
  if(doc.querySelector('assignmentRule, rateRule')) warnings.push('rules');
  if(doc.querySelector('event')) warnings.push('events');
  if(doc.querySelector('functionDefinition')) warnings.push('function definitions');
  if(doc.querySelector('compartment')) warnings.push('compartment scaling is treated as volume 1');
  const speciesNodes=[...doc.getElementsByTagName('species')];
  if(!speciesNodes.length) throw new Error('No species found in SBML file.');
  const species=speciesNodes.filter(sp=>sp.getAttribute('boundaryCondition')!=='true' && sp.getAttribute('constant')!=='true');
  const vars=species.map(sp=>cleanId(sp.getAttribute('id')||sp.getAttribute('name')));
  const y0=species.map(sp=>Number(sp.getAttribute('initialConcentration') ?? sp.getAttribute('initialAmount') ?? 0));
  const params={};
  [...doc.getElementsByTagName('parameter')].forEach(pa=>{ const id=cleanId(pa.getAttribute('id')||pa.getAttribute('name')); if(id) params[id]=[Number(pa.getAttribute('value')??0),Number(pa.getAttribute('value')??0),Number(pa.getAttribute('value')??0)]; });
  const eqs=Object.fromEntries(vars.map(v=>[v,'0']));
  const varSet=new Set(vars);
  [...doc.getElementsByTagName('reaction')].forEach((rxn,ri)=>{
    const rid=cleanId(rxn.getAttribute('id')||`reaction_${ri+1}`);
    const mathNode=rxn.getElementsByTagName('kineticLaw')[0]?.getElementsByTagName('math')[0];
    if(!mathNode) return;
    const rate=mathmlToInfix(mathNode.firstElementChild || mathNode).replace(/\s+/g,' ');
    [...rxn.getElementsByTagName('listOfReactants')[0]?.getElementsByTagName('speciesReference')||[]].forEach(sr=>{
      const sp=cleanId(sr.getAttribute('species')); if(!varSet.has(sp)) return;
      const st=Number(sr.getAttribute('stoichiometry')||1); eqs[sp]=`(${eqs[sp]}) - (${st})*(${rate})`;
    });
    [...rxn.getElementsByTagName('listOfProducts')[0]?.getElementsByTagName('speciesReference')||[]].forEach(sr=>{
      const sp=cleanId(sr.getAttribute('species')); if(!varSet.has(sp)) return;
      const st=Number(sr.getAttribute('stoichiometry')||1); eqs[sp]=`(${eqs[sp]}) + (${st})*(${rate})`;
    });
    [...rxn.getElementsByTagName('kineticLaw')[0]?.getElementsByTagName('parameter')||[]].forEach(pa=>{ const id=cleanId(pa.getAttribute('id')); if(id && !params[id]) params[id]=[Number(pa.getAttribute('value')??0),Number(pa.getAttribute('value')??0),Number(pa.getAttribute('value')??0)]; });
  });
  if(!Object.values(eqs).some(e=>e!=='0')) throw new Error('SBML import found no kinetic laws. Events, rules-only models, and algebraic SBML are not yet supported.');
  const warn = warnings.length ? ` Warning: unsupported SBML features detected (${warnings.join(', ')}). Results may be incomplete.` : '';
  return normalizeImported({module:'ode',model:{vars,eqs:vars.map(v=>eqs[v]),y0,params,t0:0,t1:50,points:800,method:'rk45',narrative:`Imported SBML model: ${name}. Browser support covers species, reactions, stoichiometry, parameters, and basic MathML kinetic laws.${warn}`}});
}
function cleanId(x){ return String(x||'').trim().replace(/[^A-Za-z0-9_]/g,'_').replace(/^([0-9])/,'_$1'); }
function mathmlToInfix(node){
  const tag=(node.localName||node.nodeName||'').toLowerCase();
  if(tag==='math') return mathmlToInfix(node.firstElementChild);
  if(tag==='ci') return cleanId(node.textContent.trim());
  if(tag==='cn') return node.textContent.trim();
  if(tag==='apply'){
    const kids=[...node.children]; const op=(kids.shift()?.localName||'').toLowerCase(); const args=kids.map(mathmlToInfix);
    if(op==='plus') return '('+args.join(' + ')+')';
    if(op==='times') return '('+args.join(' * ')+')';
    if(op==='minus') return args.length===1?`(-${args[0]})`:'('+args.join(' - ')+')';
    if(op==='divide') return `(${args[0]} / ${args[1]})`;
    if(op==='power') return `(${args[0]}^${args[1]})`;
    if(['exp','ln','log','sin','cos','tan','sqrt','abs'].includes(op)) return `${op==='ln'?'log':op}(${args[0]||''})`;
    if(op==='piecewise') throw new Error('Piecewise MathML is not supported by the browser SBML importer.');
    return args.join(' ');
  }
  if(tag==='true') return '1'; if(tag==='false') return '0';
  return node.textContent?.trim() || '0';
}
function normalizeImported(raw){ const module=(raw.module||raw.type||'ode').toLowerCase().replace('optimization','opt'); const model=raw.model||raw; if(module==='opt'){ return {module:'opt',model:{sense:model.sense||'minimize',variables:normalizeVariables(model.variables||[]),optClass:model.optClass||model.class||'nonconvex',algorithm:model.algorithm||'',objective:model.objective||'0',objective2:model.objective2||model.secondaryObjective||'',ineq:arr(model.ineq||model.constraints||model.g||[]),eq:arr(model.eq||model.h||[])}}; } const vars=arr(model.vars||model.variables||[]), eqs=arr(model.eqs||model.equations||[]); if(vars.length!==eqs.length) throw new Error('ODE import needs matching vars and equations arrays.'); return {module:module==='param'?'param':'ode',model:{vars,eqs,y0:arr(model.y0||model.initial||[]).map(Number),params:normalizeParams(model.params||model.parameters||{}),t0:Number(model.t0??0),t1:Number(model.t1??20),points:Number(model.points??800),method:model.method||'rk45',sweep:model.sweep||null,narrative:model.narrative||'Imported model.'}}; }
function normalizeParams(params){ const out={}; if(Array.isArray(params)){ params.forEach(p=>Array.isArray(p)?out[p[0]]=[Number(p[1]),Number(p[2]??p[1]),Number(p[3]??p[1])]:out[p.name]=[Number(p.value),Number(p.min??p.value),Number(p.max??p.value)]); } else Object.entries(params).forEach(([k,v])=>{ if(Array.isArray(v)) out[k]=[Number(v[0]),Number(v[1]??v[0]),Number(v[2]??v[0])]; else if(typeof v==='object') out[k]=[Number(v.value),Number(v.min??v.value),Number(v.max??v.value)]; else out[k]=[Number(v),Number(v),Number(v)]; }); return out; }
function normalizeVariables(vs){ if(!vs.length) throw new Error('Optimization import needs at least one decision variable.'); return vs.map(v=>Array.isArray(v)?{name:String(v[0]),initial:Number(v[1]??0),lower:Number(v[2]??-10),upper:Number(v[3]??10)}:{name:String(v.name),initial:Number(v.initial??v.value??0),lower:Number(v.lower??v.min??-10),upper:Number(v.upper??v.max??10)}); }
function arr(x){ return Array.isArray(x)?x:String(x||'').split(/\n|;/).map(s=>s.trim()).filter(Boolean); }
function parseCsvRows(text){ const lines=text.split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('#')); const header=lines.shift().split(',').map(s=>s.trim()); return lines.map(l=>{ const vals=l.split(',').map(s=>s.trim()); const o={}; header.forEach((h,i)=>o[h]=vals[i]??''); return o; }); }
function parseCsvModel(text){ const rows=parseCsvRows(text); const vars=[],eqs=[],y0=[],params={}; rows.filter(r=>r.kind==='equation').forEach(r=>{vars.push(r.name); eqs.push(r.equation||r.expression||r.value); y0.push(Number(r.initial||0));}); rows.filter(r=>r.kind==='parameter').forEach(r=>params[r.name]=[Number(r.value),Number(r.min||r.value),Number(r.max||r.value)]); const get=(k,d)=>rows.find(r=>r.kind==='time'&&r.name===k)?.value??d; return normalizeImported({module:'ode',model:{vars,eqs,y0,params,t0:get('t0',0),t1:get('t1',20),points:get('points',800),method:rows.find(r=>r.kind==='solver')?.value||'rk45'}}); }
function parseTextModel(text){ const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean); let module='ode',vars=[],eqs=[],y0=[],params={},variables=[],objective='',objective2='',ineq=[],eq=[],t0=0,t1=20,points=800,method='rk45'; for(const line of lines){ let m;if(m=line.match(/^module\s*:\s*(.+)$/i)){module=m[1].toLowerCase().replace('optimization','opt');continue;} if(m=line.match(/^d([A-Za-z_]\w*)\/dt\s*=\s*(.+)$/i)){vars.push(m[1]);eqs.push(m[2]);y0.push(0);continue;} if(m=line.match(/^param\s+([A-Za-z_]\w*)\s*=\s*([^\[,]+)(?:\s*\[\s*([^,]+),\s*([^\]]+)\])?/i)){params[m[1]]=[Number(m[2]),Number(m[3]??m[2]),Number(m[4]??m[2])];continue;} if(m=line.match(/^initial\s+([A-Za-z_]\w*)\s*=\s*(.+)$/i)){const i=vars.indexOf(m[1]); if(i>=0)y0[i]=Number(m[2]);continue;} if(m=line.match(/^time\s+([^\s]+)\s+([^\s]+)(?:\s+([^\s]+))?/i)){t0=Number(m[1]);t1=Number(m[2]);points=Number(m[3]||points);continue;} if(m=line.match(/^var\s+([A-Za-z_]\w*)\s*=\s*([^\[,]+)(?:\s*\[\s*([^,]+),\s*([^\]]+)\])?/i)){variables.push({name:m[1],initial:Number(m[2]),lower:Number(m[3]??-10),upper:Number(m[4]??10)});continue;} if(m=line.match(/^objective2\s*:\s*(.+)$/i)){objective2=m[1];continue;} if(m=line.match(/^secondary objective\s*:\s*(.+)$/i)){objective2=m[1];continue;} if(m=line.match(/^objective\s*:\s*(.+)$/i)){objective=m[1];continue;} if(m=line.match(/^ineq\s*:\s*(.+)$/i)){ineq.push(m[1]);continue;} if(m=line.match(/^eq\s*:\s*(.+)$/i)){eq.push(m[1]);continue;} } return normalizeImported(module==='opt'?{module:'opt',model:{variables,objective,objective2,ineq,eq}}:{module,model:{vars,eqs,y0,params,t0,t1,points,method}}); }
function parseYamlLikeModel(text){ const obj={module:'ode',model:{}}; text.split(/\r?\n/).forEach(line=>{ const m=line.match(/^\s*([A-Za-z_]\w*)\s*:\s*(.+)$/); if(!m)return; let v=m[2].trim(); try{ if(v.startsWith('[')||v.startsWith('{')) v=JSON.parse(v.replaceAll("'",'"')); }catch{} if(m[1]==='module') obj.module=String(v); else obj.model[m[1]]=v; }); return normalizeImported(obj); }
function applyImported(parsed,filename){ setModule(parsed.module); state.model=parsed.model; if(parsed.module==='opt'){ if($('optClass')) $('optClass').value=state.model.optClass||'nonconvex'; if($('optAlgorithm')) $('optAlgorithm').value=state.model.algorithm||defaultOptAlgorithm(state.model.optClass||'nonconvex'); $('optSense').value=state.model.sense; $('objective').value=state.model.objective; if($('objective2')) $('objective2').value=state.model.objective2||''; $('ineq').value=state.model.ineq.join('\\n'); $('eqcon').value=state.model.eq.join('\\n'); renderOptControls(); } else { $('t0').value=state.model.t0; $('t1').value=state.model.t1; $('points').value=state.model.points; $('method').value=state.model.method||'rk45'; renderOdeControls(); } safeText($('exampleNarrative'),`Imported: ${filename}`); refreshAllSelects(); updatePlotOptions(); clearPlots(); updateMathPreview(); setStatus('Model imported. Review it, then run.'); }
const TEMPLATE_CONTENT={ode_json:{name:'foko_lab_ode_lorenz_template.json',type:'application/json',body:()=>JSON.stringify({module:'ode',model:EXAMPLES.ode.Lorenz},null,2)},param_json:{name:'foko_lab_parametric_sir_template.json',type:'application/json',body:()=>JSON.stringify({module:'param',model:EXAMPLES.param['SIR beta–gamma']},null,2)},opt_json:{name:'foko_lab_optimization_template.json',type:'application/json',body:()=>JSON.stringify({module:'opt',model:EXAMPLES.opt['Pareto design trade-off']},null,2)},ode_csv:{name:'foko_lab_ode_template.csv',type:'text/csv',body:()=>`kind,name,value,min,max,equation,initial\nmodule,,ode,,,,\nequation,x,,,,sigma*(y-x),1\nequation,y,,,,x*(rho-z)-y,1\nequation,z,,,,x*y-beta*z,1\nparameter,sigma,10,6,16,,\nparameter,rho,28,12,40,,\nparameter,beta,2.6666666666666665,2,3,,\ntime,t0,0,,,,\ntime,t1,35,,,,\ntime,points,2500,,,,\nsolver,method,rk45,,,,\n`},opt_txt:{name:'foko_lab_optimization_template.txt',type:'text/plain',body:()=>`module: opt\nvar x = 1 [0, 10]\nvar y = 1 [0, 10]\nobjective: (x-3)^2 + (y-2)^2\nobjective2: (x+1)^2 + (y-4)^2\nineq: x + y - 4\n`},py_embed:{name:'foko_lab_python_embedded_config.py',type:'text/x-python',body:()=>`DYNAMICS_LAB_CONFIG = ${JSON.stringify({module:'ode',model:EXAMPLES.ode.Lorenz},null,2)}\n# END_DYNAMICS_LAB_CONFIG\n`}};
function downloadSelectedTemplate(){ const t=TEMPLATE_CONTENT[$('templateSelect').value]||TEMPLATE_CONTENT.ode_json; download(t.name,t.body(),t.type); }

function download(name,text,type='text/plain'){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function safeText(el,text){ if(el) el.textContent=String(text); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function fmt(v){ return v===undefined||v===null||v==='—'?'—':Number(v).toLocaleString(); }
function fmtRuntime(ms){ return ms===undefined||ms===null||ms==='—'?'—':(Number(ms)/1000).toFixed(3)+' s'; }
function num(x){ const v=Number(x); return Number.isFinite(v)?v:0; }
function toggle(id,show){ $(id)?.classList.toggle('hidden',!show); }

window.addEventListener('load',init);
