const assert = require('assert');
global.FokoKit = require('../src/fokokit.js');
global.FokoDynamicalFitting = require('../src/dynamical-fitting.js');
global.FokoStochasticAdvanced = require('../src/stochastic-advanced.js');
global.FokoBasin = require('../src/basin-analysis.js');
const sci = require('../src/v71-workbench-science.js');

{
  const obs = sci.parseObservations(`time,value
0,1
1,3
2,5
3,7`);
  assert.strictEqual(obs.length, 4);
  const fit = sci.runFitCore(`time,value
0,1
1,3
2,5
3,7`, 'linear', '0,1');
  assert(Math.abs(fit.theta[0] - 1) < 1e-5);
  assert(Math.abs(fit.theta[1] - 2) < 1e-5);
  const band = sci.uncertaintyBand(fit, 20);
  assert.strictEqual(band.x.length, 20);
  assert.strictEqual(band.low.length, 20);
}
{
  const sir = sci.sirTauEnsemble({runs:12, seed:7, t1:4, tau:1});
  assert.strictEqual(sir.infected.length, 5);
  assert.strictEqual(sir.runs, 12);
  const sir2 = sci.sirTauEnsemble({runs:12, seed:7, t1:4, tau:1});
  assert.deepStrictEqual(sir.infected, sir2.infected);
}
{
  const bm = sci.cubicBasin({nx:8, ny:7, steps:4});
  assert.strictEqual(bm.grid.length, 7);
  assert.strictEqual(bm.grid[0].length, 8);
}

console.log('v71.1 workbench science: ok');