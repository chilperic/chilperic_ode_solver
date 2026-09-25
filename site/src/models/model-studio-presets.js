/* Model Studio adds high-dimensional dynamics to the shared sensitivity starter library. */
(function (root) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const out = {};
  Object.entries(root.FokoSensitivityPresets || {}).forEach(([id, preset]) => { out[id] = clone(preset); });
  Object.assign(out, {
    lorenz: { title: 'Lorenz chaotic attractor', family: 'Nonlinear dynamics', difficulty: 'advanced', question: 'How does a deterministic three-state flow generate sensitive aperiodic trajectories?', note: 'Chaotic trajectories separate under tiny perturbations. Compare geometric structure, not pointwise long-horizon agreement.', vars: ['x','y','z'], eqs: ['sigma*(y-x)','x*(rho-z)-y','x*y-beta*z'], y0: [1,1,1], params: { sigma:[10,5,20], rho:[28,10,45], beta:[2.6666667,1,5] }, t0:0,t1:40,points:1600,method:'rk45',rtol:1e-7,atol:1e-9,outputVar:'z',outputMetric:'mean' },
    rossler: { title: 'Rössler attractor', family: 'Nonlinear dynamics', difficulty: 'advanced', question: 'How do spiral motion and reinjection create a chaotic attractor?', note: 'Finite-time geometry depends on the initial condition and tolerances; positive Lyapunov exponents are not estimated here.', vars:['x','y','z'],eqs:['-y-z','x+a*y','b+z*(x-c)'],y0:[0.1,0,0],params:{a:[0.2,0.1,0.35],b:[0.2,0.1,0.4],c:[5.7,3.5,8]},t0:0,t1:120,points:1800,method:'rk45',rtol:1e-7,atol:1e-9,outputVar:'z',outputMetric:'max' },
    lorenz96: { title: 'Lorenz–96 five-state circulation', family: 'Climate dynamics', difficulty: 'advanced', question: 'How does cyclic nonlinear advection distribute perturbations across coupled states?', note: 'A five-state reduced chaos benchmark, not a climate prediction model.', vars:['x1','x2','x3','x4','x5'],eqs:['(x2-x4)*x5-x1+F','(x3-x5)*x1-x2+F','(x4-x1)*x2-x3+F','(x5-x2)*x3-x4+F','(x1-x3)*x4-x5+F'],y0:[8.01,8,8,8,8],params:{F:[8,4,12]},t0:0,t1:35,points:1200,method:'rk45',rtol:1e-7,atol:1e-9,outputVar:'x1',outputMetric:'range' },
    sir_vaccination: { title:'SIR with vaccination flow', family:'Epidemiology', difficulty:'intermediate', question:'How do transmission, recovery, and vaccination reshape the epidemic trajectory?', note:'Closed, homogeneous deterministic compartments; the example is not calibrated for policy use.', vars:['S','I','R','V'],eqs:['-beta*S*I/N-nu*S','beta*S*I/N-gamma*I','gamma*I','nu*S'],y0:[990,10,0,0],params:{beta:[0.35,0.15,0.8],gamma:[0.1,0.04,0.25],nu:[0.015,0,0.06],N:[1000,900,1100]},t0:0,t1:160,points:500,method:'rk45',rtol:1e-7,atol:1e-9,outputVar:'I',outputMetric:'max' }
  });
  root.FokoModelStudioPresets = Object.freeze(out);
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
}(typeof self !== 'undefined' ? self : globalThis));
