/* Curated browser-scale sensitivity examples. These are small reference models,
 * not calibrated application models or substitutes for domain validation.
 */
(function(root){
  'use strict';
  const PRESETS = {
    sir: {
      title: 'SIR epidemic peak', family: 'Epidemiology', note: 'Ranks transmission and recovery parameters for peak infected population in a deterministic closed-population SIR model.',
      vars: ['S','I','R'], eqs: ['-beta*S*I/N','beta*S*I/N-gamma*I','gamma*I'], y0: [990,10,0],
      params: { beta:[0.35,0.15,0.8], gamma:[0.1,0.04,0.25], N:[1000,900,1100] },
      t0:0, t1:120, points:280, method:'rk45', rtol:1e-6, atol:1e-9,
      outputVar:'I', outputMetric:'max'
    },
    lotka: {
      title: 'Lotka–Volterra predator peak', family: 'Ecology', note: 'Screens local and global influence on the predator maximum; oscillatory phase shifts can make rankings time-window dependent.',
      vars:['x','y'], eqs:['alpha*x-beta*x*y','delta*x*y-gamma*y'], y0:[10,5],
      params:{alpha:[1.1,0.6,1.8],beta:[0.4,0.15,0.8],delta:[0.1,0.04,0.25],gamma:[0.4,0.15,0.9]},
      t0:0,t1:35,points:240,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'y',outputMetric:'max'
    },
    vanderpol: {
      title:'Van der Pol amplitude', family:'Nonlinear dynamics', note:'Sensitivity of late-time oscillation amplitude. Large μ can create stiffness; browser explicit RK evidence must be checked externally.',
      vars:['x','v'],eqs:['v','mu*(1-x^2)*v-x'],y0:[2,0],params:{mu:[2,0.5,12]},
      t0:0,t1:40,points:320,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'x',outputMetric:'range'
    },
    brusselator: {
      title:'Brusselator mean state', family:'Chemical kinetics', note:'Ranks A and B for the time-averaged x state. Near oscillatory transitions, finite differences can be non-smooth over a finite time window.',
      vars:['x','y'],eqs:['A-(B+1)*x+x^2*y','B*x-x^2*y'],y0:[1.2,2.8],params:{A:[1,0.5,2],B:[3,1.2,5]},
      t0:0,t1:50,points:300,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'x',outputMetric:'mean'
    },
    chemostat: {
      title:'Chemostat final biomass', family:'Bioprocess', note:'Sensitivity of final biomass to dilution, feed and kinetic parameters. Washout boundaries can cause discontinuous ranking changes.',
      vars:['S','X'],eqs:['D*(Sin-S)-(mumax*S/(Ks+S))*X/Y','((mumax*S/(Ks+S))-D)*X'],y0:[5,1],
      params:{D:[0.3,0.08,0.8],Sin:[10,4,20],mumax:[1,0.5,1.8],Ks:[1,0.2,4],Y:[0.5,0.25,0.8]},
      t0:0,t1:50,points:260,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'X',outputMetric:'final'
    },
    goodwin: {
      title:'Goodwin oscillation range', family:'Gene regulation', note:'Ranks feedback and degradation parameters for x-range. The result depends on the declared Hill exponent range and transient removal.',
      vars:['x','y','z'],eqs:['a/(1+z^n)-b*x','c*x-d*y','e*y-f*z'],y0:[1,0.5,0.5],
      params:{a:[1,0.4,2],b:[1,0.5,1.8],c:[1,0.5,1.8],d:[1,0.5,1.8],e:[1,0.5,1.8],f:[1,0.5,1.8],n:[8,4,12]},
      t0:0,t1:80,points:360,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'x',outputMetric:'range'
    },
    fitzhugh: {
      title:'FitzHugh–Nagumo peak voltage', family:'Neuroscience', note:'Sensitivity of peak voltage to excitability and timescale parameters. Threshold behavior can make local derivatives unstable.',
      vars:['v','w'],eqs:['v-v^3/3-w+I','(v+a-b*w)/tau'],y0:[-1,1],
      params:{a:[0.7,0.3,1.1],b:[0.8,0.4,1.3],tau:[12.5,5,25],I:[0.5,0.1,1]},
      t0:0,t1:80,points:320,method:'rk45',rtol:1e-6,atol:1e-9,outputVar:'v',outputMetric:'max'
    },
    logistic: {
      title:'Logistic final population', family:'Population dynamics', note:'A smooth reference case for checking local, Morris and Sobol rankings against a bounded monotone model.',
      vars:['x'],eqs:['r*x*(1-x/K)'],y0:[2],params:{r:[0.6,0.1,1.2],K:[100,40,180]},
      t0:0,t1:15,points:180,method:'rk45',rtol:1e-7,atol:1e-10,outputVar:'x',outputMetric:'final'
    }
  };
  if(typeof module!=='undefined' && module.exports) module.exports=PRESETS;
  root.FokoSensitivityPresets=Object.freeze(PRESETS);
}(typeof self!=='undefined'?self:globalThis));
