/* Curated browser-scale sensitivity examples.
 * Every preset is an editable deterministic ODE model with explicit parameter ranges.
 * These are teaching/reference models, not calibrated application models.
 */
(function(root){
  'use strict';
  const PRESETS = {
    sir: {
      title: 'SIR epidemic peak', family: 'Epidemiology', difficulty: 'introductory',
      question: 'Which parameters control the epidemic peak over the declared 120-day window?',
      note: 'Ranks transmission, recovery and population-scale assumptions for peak infected population in a deterministic closed-population SIR model.',
      vars: ['S','I','R'], eqs: ['-beta*S*I/N','beta*S*I/N-gamma*I','gamma*I'], y0: [990,10,0],
      params: { beta:[0.35,0.15,0.8], gamma:[0.1,0.04,0.25], N:[1000,900,1100] },
      t0:0, t1:120, points:280, method:'rk45', rtol:1e-6, atol:1e-9,
      outputVar:'I', outputMetric:'max'
    },
    seir: {
      title: 'SEIR outbreak peak', family: 'Epidemiology', difficulty: 'intermediate',
      question: 'How do transmission, latency and recovery affect the peak infectious burden?',
      note: 'Adds an exposed compartment. Peak timing and height can respond differently, so repeat the analysis with max and time-of-maximum metrics.',
      vars:['S','E','I','R'], eqs:['-beta*S*I/N','beta*S*I/N-sigma*E','sigma*E-gamma*I','gamma*I'], y0:[9980,10,10,0],
      params:{beta:[0.42,0.18,0.9],sigma:[0.2,0.08,0.5],gamma:[0.1,0.04,0.25],N:[10000,9500,10500]},
      t0:0,t1:180,points:360,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'I',outputMetric:'max'
    },
    lotka: {
      title: 'Lotka–Volterra predator peak', family: 'Ecology', difficulty: 'intermediate',
      question: 'Which interaction and growth rates control the predator maximum?',
      note: 'Oscillatory phase shifts make rankings strongly dependent on the selected time window and scalar metric.',
      vars:['x','y'], eqs:['alpha*x-beta*x*y','delta*x*y-gamma*y'], y0:[10,5],
      params:{alpha:[1.1,0.6,1.8],beta:[0.4,0.15,0.8],delta:[0.1,0.04,0.25],gamma:[0.4,0.15,0.9]},
      t0:0,t1:35,points:240,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'y',outputMetric:'max'
    },
    vanderpol: {
      title:'Van der Pol amplitude', family:'Nonlinear dynamics', difficulty:'advanced',
      question:'How does the nonlinear damping parameter change the late-time oscillation range?',
      note:'Large mu can create stiffness. Browser explicit-solver evidence must be checked with an external implicit solver before strong conclusions.',
      vars:['x','v'],eqs:['v','mu*(1-x^2)*v-x'],y0:[2,0],params:{mu:[2,0.5,12]},
      t0:0,t1:40,points:320,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'x',outputMetric:'range'
    },
    damped_oscillator: {
      title:'Damped oscillator decay', family:'Mechanics', difficulty:'introductory',
      question:'How do natural frequency and damping ratio control the remaining oscillation amplitude?',
      note:'A smooth two-parameter reference model for directional derivatives, OFAT curves and response surfaces.',
      vars:['x','v'],eqs:['v','-2*zeta*omega*v-omega^2*x'],y0:[1,0],
      params:{omega:[2,0.8,4],zeta:[0.15,0.02,0.6]},
      t0:0,t1:12,points:300,method:'rk45',rtol:1e-7,atol:1e-10,outputVar:'x',outputMetric:'range'
    },
    brusselator: {
      title:'Brusselator mean state', family:'Chemical kinetics', difficulty:'intermediate',
      question:'How do feed parameters alter the time-averaged activator state?',
      note:'Near oscillatory transitions, finite differences can be non-smooth over a finite time window.',
      vars:['x','y'],eqs:['A-(B+1)*x+x^2*y','B*x-x^2*y'],y0:[1.2,2.8],params:{A:[1,0.5,2],B:[3,1.2,5]},
      t0:0,t1:50,points:300,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'x',outputMetric:'mean'
    },
    michaelis: {
      title:'Michaelis–Menten substrate depletion', family:'Enzyme kinetics', difficulty:'introductory',
      question:'Which kinetic parameter controls remaining substrate at the final observation time?',
      note:'A monotone saturation model. Vmax and Km can be hard to distinguish when the substrate range does not probe saturation.',
      vars:['S','P'],eqs:['-Vmax*S/(Km+S)','Vmax*S/(Km+S)'],y0:[10,0],
      params:{Vmax:[1.2,0.3,2.5],Km:[2,0.2,8]},
      t0:0,t1:20,points:220,method:'rk45',rtol:1e-7,atol:1e-10,outputVar:'S',outputMetric:'final'
    },
    chemostat: {
      title:'Chemostat final biomass', family:'Bioprocess', difficulty:'intermediate',
      question:'Which operating and kinetic parameters govern final biomass?',
      note:'Washout boundaries can cause abrupt ranking changes. Inspect the response surface and failed-run regions rather than relying on one derivative.',
      vars:['S','X'],eqs:['D*(Sin-S)-(mumax*S/(Ks+S))*X/Y','((mumax*S/(Ks+S))-D)*X'],y0:[5,1],
      params:{D:[0.3,0.08,0.8],Sin:[10,4,20],mumax:[1,0.5,1.8],Ks:[1,0.2,4],Y:[0.5,0.25,0.8]},
      t0:0,t1:50,points:260,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'X',outputMetric:'final'
    },
    goodwin: {
      title:'Goodwin oscillation range', family:'Gene regulation', difficulty:'advanced',
      question:'Which feedback and degradation parameters determine oscillation range?',
      note:'The result depends on the Hill-exponent range, transient duration and selected scalar summary.',
      vars:['x','y','z'],eqs:['a/(1+z^n)-b*x','c*x-d*y','e*y-f*z'],y0:[1,0.5,0.5],
      params:{a:[1,0.4,2],b:[1,0.5,1.8],c:[1,0.5,1.8],d:[1,0.5,1.8],e:[1,0.5,1.8],f:[1,0.5,1.8],n:[8,4,12]},
      t0:0,t1:80,points:360,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'x',outputMetric:'range'
    },
    repressilator: {
      title:'Repressilator expression range', family:'Gene regulation', difficulty:'intermediate',
      question:'How do production, repression and degradation control the expression range?',
      note:'A symmetric reduced repressilator. Symmetry can produce similar parameter effects; perturbing one shared parameter is not equivalent to perturbing one gene only.',
      vars:['x1','x2','x3'],eqs:['alpha/(1+x3^n)-delta*x1','alpha/(1+x1^n)-delta*x2','alpha/(1+x2^n)-delta*x3'],y0:[0.2,1.5,0.7],
      params:{alpha:[10,3,25],n:[3,1.5,6],delta:[1,0.4,2]},
      t0:0,t1:60,points:320,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'x1',outputMetric:'range'
    },
    toggle: {
      title:'Genetic toggle final state', family:'Gene regulation', difficulty:'advanced',
      question:'Which repression and production parameters determine the selected final branch?',
      note:'Bistable regions can create discontinuous outputs. Local derivatives are unreliable near switching boundaries; use OFAT and global samples.',
      vars:['u','v'],eqs:['alpha1/(1+v^beta)-u','alpha2/(1+u^gamma)-v'],y0:[0.2,2],
      params:{alpha1:[3,1,8],alpha2:[3,1,8],beta:[2,1.2,4],gamma:[2,1.2,4]},
      t0:0,t1:40,points:260,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'u',outputMetric:'final'
    },
    fitzhugh: {
      title:'FitzHugh–Nagumo peak voltage', family:'Neuroscience', difficulty:'advanced',
      question:'Which excitability and timescale parameters control the voltage peak?',
      note:'Threshold behavior can make local derivatives unstable. Compare perturbation convergence and global samples.',
      vars:['v','w'],eqs:['v-v^3/3-w+I','(v+a-b*w)/tau'],y0:[-1,1],
      params:{a:[0.7,0.3,1.1],b:[0.8,0.4,1.3],tau:[12.5,5,25],I:[0.5,0.1,1]},
      t0:0,t1:80,points:320,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'v',outputMetric:'max'
    },
    mapk: {
      title:'Three-tier activation cascade', family:'Cell signalling', difficulty:'intermediate',
      question:'Which activation and deactivation rates govern final downstream activation?',
      note:'A reduced bounded signalling cascade. It illustrates parameter-by-state influence and correlated downstream effects without claiming a calibrated MAPK model.',
      vars:['x1','x2','x3'],eqs:['k1*(1-x1)-k2*x1','k3*x1*(1-x2)-k4*x2','k5*x2*(1-x3)-k6*x3'],y0:[0,0,0],
      params:{k1:[1,0.2,3],k2:[0.4,0.1,1.2],k3:[1.2,0.3,3],k4:[0.5,0.1,1.4],k5:[1.1,0.3,3],k6:[0.45,0.1,1.3]},
      t0:0,t1:20,points:240,method:'rk45',rtol:1e-7,atol:1e-10,outputVar:'x3',outputMetric:'final'
    },
    glucose_insulin: {
      title:'Glucose–insulin recovery', family:'Physiology', difficulty:'intermediate',
      question:'Which clearance and feedback rates control recovery of glucose toward baseline?',
      note:'A reduced teaching model, not a clinical glucose-insulin model. Parameter ranges are illustrative and outputs must not be interpreted medically.',
      vars:['G','I'],eqs:['-kG*(G-Gb)-SI*I*(G-Gb)','-kI*I+beta*max(G-Gb,0)'],y0:[180,5],
      params:{kG:[0.015,0.005,0.04],Gb:[90,75,110],SI:[0.0008,0.0001,0.002],kI:[0.12,0.04,0.3],beta:[0.08,0.01,0.2]},
      t0:0,t1:180,points:300,method:'rk45',rtol:1e-6,atol:1e-8,outputVar:'G',outputMetric:'final'
    },
    logistic: {
      title:'Logistic final population', family:'Population dynamics', difficulty:'introductory',
      question:'How do growth rate and carrying capacity control final population?',
      note:'A smooth reference case for checking local, Morris and Sobol rankings against a bounded monotone model.',
      vars:['x'],eqs:['r*x*(1-x/K)'],y0:[2],params:{r:[0.6,0.1,1.2],K:[100,40,180]},
      t0:0,t1:15,points:180,method:'rk45',rtol:1e-7,atol:1e-10,outputVar:'x',outputMetric:'final'
    },
    gompertz: {
      title:'Gompertz growth', family:'Population dynamics', difficulty:'introductory',
      question:'How do growth rate and carrying level affect the final state and inflection timing?',
      note:'A monotone nonlinear-growth reference that differs from logistic growth in early and late response geometry.',
      vars:['x'],eqs:['r*x*log(K/x)'],y0:[2],params:{r:[0.35,0.08,0.9],K:[100,40,200]},
      t0:0,t1:18,points:200,method:'rk45',rtol:1e-7,atol:1e-10,outputVar:'x',outputMetric:'final'
    },
    exponential: {
      title:'Exponential decay verification', family:'Verification', difficulty:'introductory',
      question:'Does the numerical sensitivity recover the known decay-rate derivative?',
      note:'Analytically transparent verification case. Use it to check perturbation convergence before analysing nonlinear models.',
      vars:['x'],eqs:['-k*x'],y0:[10],params:{k:[0.4,0.1,1]},
      t0:0,t1:10,points:160,method:'rk45',rtol:1e-8,atol:1e-11,outputVar:'x',outputMetric:'final'
    }
  };
  if(typeof module!=='undefined' && module.exports) module.exports=PRESETS;
  root.FokoSensitivityPresets=Object.freeze(PRESETS);
}(typeof self!=='undefined'?self:globalThis));
