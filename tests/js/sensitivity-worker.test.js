'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ROOT = path.resolve(__dirname, '../..');
const context = vm.createContext({
  console,
  performance: { now: (() => { let t = 0; return () => (t += 1); })() },
  postMessages: [],
  setTimeout,
  clearTimeout
});
context.self = context;
context.globalThis = context;
context.postMessage = (message) => context.postMessages.push(message);
context.importScripts = (...urls) => {
  for (const url of urls) {
    const clean = url.split('?', 1)[0];
    const absolute = path.resolve(ROOT, 'src/v72', clean);
    vm.runInContext(fs.readFileSync(absolute, 'utf8'), context, { filename: absolute });
  }
};
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/v72/sensitivity-worker.js'), 'utf8'), context, { filename: 'sensitivity-worker.js' });

const model = {
  vars: ['x'], eqs: ['r*x*(1-x/K)'], y0: [0.2],
  params: { r: [0.7, 0.4, 1.0], K: [2, 1.5, 2.5] },
  paramDefs: { r: [0.7, 0.4, 1.0], K: [2, 1.5, 2.5] },
  t0: 0, t1: 4, points: 60, method: 'rk45', rtol: 1e-7, atol: 1e-10,
  stepSize: 'auto', initialStep: 'auto', maxStep: 'auto', safety: 0.9
};

function run(analysis, outputMetric = 'final') {
  context.postMessages.length = 0;
  context.onmessage({ data: { type: 'run', model, analysis, outputVar: 'x', outputMetric } });
  const result = context.postMessages.find((message) => message.type === 'result');
  assert.ok(result, `${analysis.method}: worker did not publish a terminal result`);
  assert.equal(result.ok, true, result.error || `${analysis.method}: worker failed`);
  assert.equal(result.method, analysis.method);
  assert.equal(result.outputVar, 'x');
  assert.ok(result.solverSummary.odeSolves > 0);
  assert.ok(result.solverSummary.functionEvaluations > 0);
  assert.ok(result.configuration.model.rtol === 1e-7);
  return result;
}

const local = run({ method: 'local', relativeStep: 1e-3, ofatPoints: 7, directionPoints: 7, directionalSpan: 0.2, direction: 'r:1,K:-1', responseSurface: true, surfaceFirst: 'r', surfaceSecond: 'K', surfacePoints: 5, parameterCount: 2 });
assert.equal(local.outputMetric, 'final');
assert.equal(local.analysis.rows.length, 2);
assert.ok(local.analysis.trajectory.rows.every((row) => row.values.every(Number.isFinite)));
assert.equal(local.analysis.convergence.length, 4);
assert.equal(local.analysis.jacobians.stateMeanAbsolute.length, 1);
assert.equal(local.analysis.jacobians.parameterMeanAbsolute[0].length, 2);
assert.equal(local.analysis.trajectory.influenceMatrix.length, 1);
assert.equal(local.analysis.ofat.rows.length, 2);
assert.equal(local.analysis.ofat.rows[0].values.length, 7);
assert.equal(local.analysis.directional.available, true);
assert.equal(local.analysis.responseSurface.z.length, 5);
assert.ok(local.solverSummary.cachedTrajectories === local.solverSummary.odeSolves);

const morris = run({ method: 'morris', trajectories: 4, levels: 6, seed: 1729, bootstrapReplicates: 40, parameterCount: 2 });
assert.equal(morris.analysis.rows.length, 2);
assert.ok(morris.analysis.rows.every((row) => Number.isFinite(row.muStar) && Number.isFinite(row.sigma)));
assert.equal(morris.analysis.traces.length, 4);
assert.equal(morris.analysis.rankStability.length, 2);
assert.ok(morris.analysis.convergence.length >= 1);

const sobol = run({ method: 'sobol', samples: 32, seed: 1729, secondOrder: true, bootstrapReplicates: 40, dependence: true, dependencePermutations: 19, parameterCount: 2 });
assert.equal(sobol.analysis.rows.length, 2);
assert.ok(sobol.analysis.rows.every((row) => Number.isFinite(row.first) && Number.isFinite(row.total)));
assert.ok(sobol.analysis.convergence.length >= 1);
assert.equal(sobol.analysis.secondOrderEnabled, true);
assert.equal(sobol.analysis.secondOrder.length, 1);
assert.equal(sobol.analysis.secondOrderMatrix.length, 2);
assert.ok(sobol.analysis.rows.every((row) => Number.isFinite(row.medianRank)));
assert.equal(sobol.estimatedOdeSolves, 32 * 6);
assert.equal(sobol.analysis.timeSensitivity.names.length, 2);
assert.equal(sobol.analysis.timeSensitivity.totalMatrix.length, 2);
assert.equal(sobol.analysis.sampleRows.length, 64);
assert.equal(sobol.analysis.dependence.rows.length, 2);
assert.ok(sobol.analysis.dependence.rows.every(row => row.mutualInformationP > 0 && row.hsicP > 0));

const fim = run({ method: 'fim', relativeStep: 1e-3, sigma: 1, parameterCount: 2 });
assert.equal(fim.outputMetric, 'trajectory');
assert.equal(fim.analysis.matrix.length, 2);
assert.ok(fim.analysis.matrix.flat().every(Number.isFinite));
assert.ok(fim.analysis.eigenvalues.every(Number.isFinite));
assert.equal(fim.analysis.observationPoints, 48);


const largeModel = {
  vars: Array.from({length:33},(_,i)=>`x${i+1}`),
  eqs: Array.from({length:33},()=> '0'),
  y0: Array.from({length:33},()=>0),
  params: { k: [1,0.5,1.5] }, paramDefs: { k: [1,0.5,1.5] },
  t0:0,t1:1,points:100,method:'rk45',rtol:1e-6,atol:1e-9,stepSize:'auto',initialStep:'auto',maxStep:'auto',safety:0.9
};
context.postMessages.length=0;
context.onmessage({data:{type:'run',model:largeModel,analysis:{method:'sobol',samples:128,secondOrder:false,bootstrapReplicates:100},outputVar:'x1',outputMetric:'final'}});
const blocked=context.postMessages.find(message=>message.type==='result');
assert.ok(blocked && blocked.ok===false);
assert.match(blocked.error,/too large for reliable in-browser sensitivity analysis/i);
assert.match(blocked.error,/No worker should be started/i);

console.log('Sensitivity worker end-to-end contracts passed: local Jacobians/OFAT/direction/surface, advanced Morris, Jansen/Saltelli time/dependence diagnostics and FIM use editable ODE inputs and the canonical ODE core.');
