'use strict';

const F = require('../../src/core/fitting.js');
const presets = (() => {
  globalThis.FokoFittingPresets = {};
  require('../../src/models/fitting-presets.js');
  return globalThis.FokoFittingPresets;
})();

let checks = 0;
let fails = 0;
function truthy(condition, message) {
  checks += 1;
  if (!condition) { fails += 1; console.error(`FAIL: ${message}`); }
  else console.log(`ok  : ${message}`);
}
function close(got, expected, tolerance, message) {
  checks += 1;
  if (!Number.isFinite(got) || Math.abs(got - expected) > tolerance) {
    fails += 1;
    console.error(`FAIL: ${message} got=${got} expected=${expected}`);
  } else console.log(`ok  : ${message}`);
}
function throws(fn, message) {
  checks += 1;
  try { fn(); fails += 1; console.error(`FAIL (no throw): ${message}`); }
  catch (error) { console.log(`ok  : throws — ${message}`); }
}

const exactLine = [[0, 1], [1, 3], [2, 5], [3, 7], [4, 9]];
const ordinary = F.fit(exactLine, 'linear', { bootstrapReplicates: 40, bootstrapSeed: 21 });
close(ordinary.coef[0], 1, 1e-10, 'ordinary linear intercept');
close(ordinary.coef[1], 2, 1e-10, 'ordinary linear slope');
close(ordinary.r2, 1, 1e-12, 'ordinary linear R²');
truthy(ordinary.converged, 'closed-form linear fit reports convergence');
truthy(ordinary.terminationReason.includes('normal equations'), 'closed-form termination is explicit');
truthy(ordinary.parameterSummary.length === 2, 'linear parameter table has two rows');
truthy(ordinary.influence.leverage.length === exactLine.length, 'leverage is row aligned');
truthy(ordinary.influence.cooksDistance.length === exactLine.length, 'Cook-style distance is row aligned');
truthy(ordinary.predictionBands.length === 120, 'prediction grid is explicit');
truthy(ordinary.bootstrap.replicates > 0, 'seeded pairs bootstrap returns successful resamples');
truthy(ordinary.bootstrap.seed === 21, 'bootstrap seed is reported');

const contaminated = [[0, 1], [1, 3], [2, 5], [3, 7], [4, 20]];
const unweighted = F.fit(contaminated, 'linear', { bootstrapReplicates: 0 });
const weighted = F.fit(contaminated, 'linear', { sigmas: [0.1, 0.1, 0.1, 0.1, 10], bootstrapReplicates: 0 });
truthy(Math.abs(weighted.coef[1] - 2) < Math.abs(unweighted.coef[1] - 2), 'known-sigma weighting downweights noisy outlier');
truthy(weighted.weighting === 'known-sigma', 'weighting mode is preserved');
truthy(weighted.absoluteSigma === true, 'known sigma is marked absolute');
truthy(weighted.weightedObjective < unweighted.sse * 100, 'weighted objective is finite and distinct');
throws(() => F.fit(contaminated, 'linear', { sigmas: [1, 1, 1, 1, 0] }), 'zero sigma is rejected');
throws(() => F.fit(contaminated, 'linear', { weights: [1, 1] }), 'weight length mismatch is rejected');

const exponentialPairs = [0, 0.5, 1, 1.5, 2, 2.5, 3].map(x => [x, 1.7 * Math.exp(0.42 * x)]);
const exponential = F.fit(exponentialPairs, 'exponential', { initialParams: [1.5, 0.3], maxIterations: 400, bootstrapReplicates: 0, computeProfile: true });
truthy(exponential.converged, 'exponential nonlinear fit converges');
close(exponential.a, 1.7, 1e-5, 'exponential amplitude');
close(exponential.b, 0.42, 1e-5, 'exponential rate');
truthy(exponential.iterations > 0, 'nonlinear iteration count is recorded');
truthy(exponential.evaluations > exponentialPairs.length, 'nonlinear evaluation count is recorded');
truthy(exponential.acceptedSteps > 0, 'accepted nonlinear steps are recorded');
truthy(exponential.objectiveHistory.length > 1, 'objective history is retained');
truthy(exponential.profileLikelihood.length === 2, 'profile SSE exists for both parameters');
truthy(exponential.confidenceEllipse && exponential.confidenceEllipse.points.length === 121, 'joint local ellipse exists');
truthy(exponential.sensitivity.length === 2, 'parameter sensitivities exist');

const michaelisPairs = [0.1, 0.2, 0.5, 1, 2, 4, 8].map(x => [x, 1.2 * x / (0.8 + x)]);
const michaelis = F.fit(michaelisPairs, 'michaelis', { initialParams: [1, 1], maxIterations: 500, bootstrapReplicates: 0 });
truthy(michaelis.converged, 'Michaelis–Menten fit converges');
close(michaelis.Vmax, 1.2, 1e-5, 'Michaelis–Menten Vmax');
close(michaelis.Km, 0.8, 1e-5, 'Michaelis–Menten Km');
truthy(michaelis.model === 'michaelis-menten', 'Michaelis–Menten model label is explicit');

const logisticPairs = [0, 1, 2, 3, 4, 5, 6].map(x => [x, 10 / (1 + Math.exp(-1.1 * (x - 3)))]);
const logistic = F.fit(logisticPairs, 'logistic', { initialParams: [9, 0.8, 2.8], maxIterations: 600, bootstrapReplicates: 0 });
truthy(logistic.converged, 'logistic fit converges');
close(logistic.K, 10, 1e-4, 'logistic carrying level');
close(logistic.r, 1.1, 1e-4, 'logistic rate');
close(logistic.x0, 3, 1e-4, 'logistic midpoint');

const deterministicA = F.bootstrapFit(exactLine, 'linear', 60, { seed: 404 });
const deterministicB = F.bootstrapFit(exactLine, 'linear', 60, { seed: 404 });
truthy(JSON.stringify(deterministicA.summary) === JSON.stringify(deterministicB.summary), 'bootstrap is deterministic for a fixed seed');
truthy(deterministicA.requested === 60, 'requested bootstrap count is reported');
truthy(deterministicA.replicates + deterministicA.failed === 60, 'successful and failed bootstrap counts reconcile');

const qq = F.qqData([-2, -1, 0, 1, 2]);
truthy(qq.theory.length === 5 && qq.sample.length === 5, 'Q-Q data are row aligned');
truthy(qq.sample.every((value, index, array) => index === 0 || value >= array[index - 1]), 'Q-Q sample is ordered');

truthy(Object.keys(presets).length >= 6, 'at least six curated fitting presets are defined');
truthy(Object.values(presets).every(p => p.data.includes(',') && p.model && p.scientificNote), 'every fitting preset declares data, model and scientific note');
truthy(Object.values(presets).some(p => p.weighting === 'known-sigma'), 'preset library includes known-sigma weighting');
truthy(Object.values(presets).some(p => p.model === 'michaelis'), 'preset library includes biochemical saturation');
truthy(Object.values(presets).some(p => p.model === 'logistic'), 'preset library includes logistic growth');

throws(() => F.fit([[0, 1], [0, 2], [0, 3]], 'linear'), 'constant x is rejected');
throws(() => F.fit([[0, 1], [1, 2]], 'quadratic'), 'underidentified polynomial is rejected');
throws(() => F.fit([[0, 1], [1, 2], [2, 3], [3, 4]], 'unknown'), 'unknown model is rejected');
throws(() => F.fitNoBootstrap([], 'linear'), 'empty fitNoBootstrap input is rejected');
throws(() => F.solve([[1, 2], [2, 4]], [1, 2]), 'singular linear system is rejected');

console.log(`\n${checks - fails}/${checks} checks passed`);
if (fails) {
  console.error(`${fails} FAILED`);
  process.exit(1);
}
