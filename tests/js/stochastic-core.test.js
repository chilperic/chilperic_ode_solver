'use strict';
const Core = require('../../src/core/stochastic.js');
let checks = 0;
let failures = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}
function close(actual, expected, tolerance, message) {
  check(Math.abs(actual - expected) <= tolerance, `${message}: got ${actual}, expected ${expected}`);
}
function throws(fn, message) {
  let didThrow = false;
  try { fn(); } catch (_) { didThrow = true; }
  check(didThrow, message);
}

function birthDeathModel() {
  return {
    stateNames: ['X'],
    initial: [40],
    params: { lambda: 0.18, mu: 0.14 },
    reactions: [
      { name: 'birth', propensity: (x, _t, p) => p.lambda * x[0], change: [1] },
      { name: 'death', propensity: (x, _t, p) => p.mu * x[0], change: [-1] },
    ],
  };
}

(function reproducibleStreams() {
  const config = { model: birthDeathModel(), t0: 0, t1: 4, points: 20, runs: 20, seed: 1729, maxEvents: 10000 };
  const first = Core.simulateEnsemble(config);
  const second = Core.simulateEnsemble(config);
  check(JSON.stringify(first.trajectories) === JSON.stringify(second.trajectories), 'same seed reproduces every trajectory');
  check(JSON.stringify(first.eventCounts) === JSON.stringify(second.eventCounts), 'same seed reproduces event counts');
  const different = Core.simulateEnsemble(Object.assign({}, config, { seed: 1730 }));
  check(JSON.stringify(first.trajectories) !== JSON.stringify(different.trajectories), 'different seed changes the ensemble');
  check(Core.deriveSeed(1729, 0) !== Core.deriveSeed(1729, 1), 'trajectory seeds are distinct');
})();

(function absorbingState() {
  const model = {
    stateNames: ['X'], initial: [0], params: { mu: 1 },
    reactions: [{ name: 'death', propensity: (x, _t, p) => p.mu * x[0], change: [-1] }],
  };
  const result = Core.simulateSSA({ model, t0: 0, t1: 10, points: 8, seed: 2, maxEvents: 100 });
  check(result.absorbing, 'zero-population pure death state is detected as absorbing');
  check(result.eventCount === 0, 'absorbing state executes no events');
  check(result.states[0].every(value => value === 0), 'absorbing trajectory remains at zero');
})();

(function conservationLaw() {
  const model = {
    stateNames: ['S', 'I', 'R'], initial: [90, 10, 0], params: { beta: 0.4, gamma: 0.2, N: 100 },
    reactions: [
      { name: 'infection', propensity: (x, _t, p) => p.beta * x[0] * x[1] / p.N, change: [-1, 1, 0] },
      { name: 'recovery', propensity: (x, _t, p) => p.gamma * x[1], change: [0, -1, 1] },
    ],
  };
  const result = Core.simulateSSA({ model, t0: 0, t1: 50, points: 100, seed: 99, maxEvents: 10000 });
  for (let index = 0; index < result.times.length; index += 1) {
    check(result.states[0][index] + result.states[1][index] + result.states[2][index] === 100, `SIR population is conserved at sample ${index}`);
  }
  check(result.final.every(Number.isInteger), 'SSA final states remain integer valued');
})();

(function momentSanityCheck() {
  const result = Core.simulateEnsemble({ model: birthDeathModel(), t0: 0, t1: 5, points: 21, runs: 1200, seed: 777, maxEvents: 100000 });
  const analyticalMean = 40 * Math.exp((0.18 - 0.14) * 5);
  close(result.summaries[0].final.mean, analyticalMean, 1.7, 'birth-death Monte Carlo mean agrees with analytical first moment');
  check(result.summaries[0].final.sd > 0, 'ensemble final-state dispersion is positive');
  check(result.summaries[0].final.standardError < result.summaries[0].final.sd, 'Monte Carlo standard error is smaller than sample SD');
  check(result.truncatedRuns === 0, 'sanity-check ensemble is not censored');
  check(result.algorithm === 'Gillespie direct SSA', 'algorithm provenance is explicit');
  check(result.uncertainty.band.includes('Empirical'), 'uncertainty band is labelled empirical');
})();

(function eventCapIsVisible() {
  const model = {
    stateNames: ['X'], initial: [1], params: { rate: 100 },
    reactions: [{ name: 'birth', propensity: (_x, _t, p) => p.rate, change: [1] }],
  };
  const result = Core.simulateEnsemble({ model, t0: 0, t1: 5, points: 10, runs: 8, seed: 11, maxEvents: 3 });
  check(result.truncatedRuns === 8, 'every high-rate path reaching the cap is counted as truncated');
  check(result.status === 'warning', 'censored ensemble cannot report clean success');
  check(result.warnings.some(text => text.includes('censored')), 'censoring warning is explicit');
})();

(function summariesAndQuantiles() {
  close(Core.quantile([0, 10], 0.25), 2.5, 1e-12, 'quantile uses linear interpolation');
  const moments = Core.sampleMoments([1, 2, 3, 4]);
  close(moments.mean, 2.5, 1e-12, 'sample mean');
  close(moments.variance, 5 / 3, 1e-12, 'unbiased sample variance');
  check(moments.mc95[0] < moments.mean && moments.mc95[1] > moments.mean, 'Monte Carlo interval brackets mean');
})();

(function invalidModelsFailLoudly() {
  throws(() => Core.validateModel({ stateNames: ['X'], initial: [-1], reactions: [] }), 'negative initial counts are rejected');
  throws(() => Core.validateModel({ stateNames: ['X'], initial: [1.2], reactions: [] }), 'non-integer initial counts are rejected');
  throws(() => Core.simulateSSA({ model: { stateNames: ['X'], initial: [1], params: {}, reactions: [{ name: 'bad', propensity: () => -1, change: [0] }] }, t0: 0, t1: 1, points: 3 }), 'negative propensity is rejected');
  throws(() => Core.simulateSSA({ model: { stateNames: ['X'], initial: [0], params: {}, reactions: [{ name: 'bad decrement', propensity: () => 1, change: [-1] }] }, t0: 0, t1: 10, points: 3, seed: 1 }), 'reaction producing a negative state is rejected');
  throws(() => Core.simulateEnsemble({ model: birthDeathModel(), t0: 1, t1: 0, points: 10, runs: 2 }), 'reversed observation interval is rejected');
})();

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exitCode = 1;
