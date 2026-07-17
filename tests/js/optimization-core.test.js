'use strict';
const Core = require('../../src/core/optimization.js');
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

function bowl() {
  return {
    variables: [
      { name: 'x', start: 0, lower: -5, upper: 5 },
      { name: 'y', start: 0, lower: -5, upper: 5 },
    ],
    sense: 'minimize',
    objective: x => (x[0] - 2) ** 2 + (x[1] + 1) ** 2,
    inequalities: [],
    equalities: [],
  };
}

(function coordinateKnownSolution() {
  const result = Core.optimise(bowl(), { algorithm: 'coordinate', maxIterations: 200, stepTolerance: 1e-9 });
  check(result.status === 'success', 'unconstrained bowl returns a feasible candidate');
  close(result.candidate.x[0], 2, 1e-6, 'coordinate search recovers x optimum');
  close(result.candidate.x[1], -1, 1e-6, 'coordinate search recovers y optimum');
  close(result.candidate.objective, 0, 1e-10, 'coordinate search reaches near-zero objective');
  check(result.globalOptimality === 'not established', 'core never asserts global optimality');
  check(result.localOptimality === 'not certified', 'core never asserts local optimality certification');
})();

(function projectedGradientKnownSolution() {
  const result = Core.optimise(bowl(), { algorithm: 'projected_gradient', maxIterations: 100, gradientTolerance: 1e-8 });
  close(result.candidate.x[0], 2, 1e-5, 'projected gradient recovers x optimum');
  close(result.candidate.x[1], -1, 1e-5, 'projected gradient recovers y optimum');
  check(result.terminationReason.includes('tolerance'), 'gradient search exposes its termination condition');
})();

(function seededPopulationReproducibility() {
  const options = { algorithm: 'differential_evolution', maxIterations: 80, populationSize: 28, seed: 914, stallIterations: 20 };
  const first = Core.optimise(bowl(), options);
  const second = Core.optimise(bowl(), options);
  check(JSON.stringify(first.candidate.x) === JSON.stringify(second.candidate.x), 'same seed reproduces differential-evolution candidate');
  check(JSON.stringify(first.history) === JSON.stringify(second.history), 'same seed reproduces differential-evolution history');
  const different = Core.optimise(bowl(), Object.assign({}, options, { seed: 915 }));
  check(JSON.stringify(first.records.slice(0, 10)) !== JSON.stringify(different.records.slice(0, 10)), 'different seed changes sampled candidates');
})();

(function inequalityFeasibilityGate() {
  const problem = {
    variables: [
      { name: 'x', start: 1, lower: 0, upper: 10 },
      { name: 'y', start: 1, lower: 0, upper: 10 },
    ],
    sense: 'minimize',
    objective: x => (x[0] - 3) ** 2 + (x[1] - 2) ** 2,
    inequalities: [x => x[0] + x[1] - 4],
    equalities: [],
  };
  const result = Core.optimise(problem, { algorithm: 'differential_evolution', maxIterations: 140, populationSize: 44, penalty: 1e6, feasibilityTolerance: 2e-4, seed: 17 });
  check(result.candidate.feasible, 'reported constrained candidate passes the independent feasibility gate');
  check(result.candidate.maxViolation <= result.options.feasibilityTolerance, 'maximum violation is below declared tolerance');
  close(result.candidate.x[0], 2.5, 0.05, 'constrained quadratic x is near active-boundary solution');
  close(result.candidate.x[1], 1.5, 0.05, 'constrained quadratic y is near active-boundary solution');
  check(result.feasibleEvaluations > 0, 'feasible evaluation count is reported');
})();

(function infeasibleProblemIsWarning() {
  const impossible = {
    variables: [{ name: 'x', start: 0.5, lower: 0, upper: 1 }],
    sense: 'minimize',
    objective: x => x[0] ** 2,
    inequalities: [x => x[0] + 1],
    equalities: [],
  };
  const result = Core.optimise(impossible, { algorithm: 'random_search', maxIterations: 100, penalty: 1000, feasibilityTolerance: 1e-8, seed: 2 });
  check(result.status === 'warning', 'infeasible problem cannot report success');
  check(!result.candidate.feasible, 'least-violating candidate remains labelled infeasible');
  check(result.message.includes('No candidate satisfied'), 'infeasibility warning is explicit');
})();

(function equalityViolationIsAbsolute() {
  const problem = {
    variables: [{ name: 'x', start: 0, lower: -2, upper: 2 }],
    sense: 'minimize',
    objective: x => x[0] ** 2,
    inequalities: [],
    equalities: [x => x[0] - 1],
  };
  const result = Core.optimise(problem, { algorithm: 'coordinate', maxIterations: 200, penalty: 1e8, feasibilityTolerance: 1e-4 });
  check(result.candidate.feasible, 'equality-constrained candidate passes tolerance');
  close(result.candidate.x[0], 1, 2e-4, 'equality penalty drives candidate toward h(x)=0');
})();

(function maximizationSenseIsPreserved() {
  const problem = {
    variables: [{ name: 'x', start: 0, lower: -2, upper: 2 }],
    sense: 'maximize',
    objective: x => -((x[0] - 1) ** 2) + 5,
    inequalities: [],
    equalities: [],
  };
  const result = Core.optimise(problem, { algorithm: 'coordinate', maxIterations: 150 });
  close(result.candidate.x[0], 1, 1e-5, 'maximize sense finds the peak location');
  close(result.candidate.objective, 5, 1e-8, 'maximize sense reports raw objective rather than negated search score');
})();

(function landscapeIsRawAndFinite() {
  const grid = Core.landscape(bowl(), { resolution: 21, algorithm: 'coordinate' });
  check(grid.xs.length === 21 && grid.ys.length === 21, 'landscape respects requested resolution');
  check(grid.objective.length === 21 && grid.objective[0].length === 21, 'landscape returns a rectangular raw-objective grid');
  check(grid.objective.flat().every(Number.isFinite), 'landscape objective values are finite');
  check(grid.evaluations === 441, 'landscape reports actual grid evaluations');
})();

(function paretoSamplingIsFiniteAndSeeded() {
  const problem = bowl();
  problem.secondaryObjective = x => (x[0] + 1) ** 2 + (x[1] - 4) ** 2;
  const first = Core.paretoSample(problem, { samples: 500, seed: 123, algorithm: 'random_search' });
  const second = Core.paretoSample(problem, { samples: 500, seed: 123, algorithm: 'random_search' });
  check(first.front.length > 1, 'finite sample produces a nondominated trade-off set');
  check(first.claim.includes('not an exact Pareto frontier'), 'Pareto scope is explicitly limited');
  check(JSON.stringify(first.front) === JSON.stringify(second.front), 'same seed reproduces finite Pareto sample');
  check(first.front.every(point => point.feasible), 'nondominated set contains feasible points only');
})();

(function invalidProblemsFailLoudly() {
  throws(() => Core.optimise({ variables: [], objective: () => 0 }), 'empty variable list is rejected');
  throws(() => Core.optimise({ variables: [{ name: 'x', start: 0, lower: 1, upper: 0 }], objective: () => 0 }), 'reversed bounds are rejected');
  throws(() => Core.optimise({ variables: [{ name: 'x', start: 0, lower: -1, upper: 1 }], objective: () => NaN }), 'non-finite objective is rejected');
  throws(() => Core.optimise(bowl(), { algorithm: 'imaginary_method' }), 'unsupported algorithm is rejected');
  throws(() => Core.landscape({ variables: [{ name: 'x', start: 0, lower: -1, upper: 1 }], objective: x => x[0] ** 2 }), 'landscape rejects non-two-dimensional problems');
})();

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exitCode = 1;
