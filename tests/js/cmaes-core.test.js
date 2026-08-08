const assert = require('assert');
const CMA = require('../../src/core/cmaes.js');
const Optimization = require('../../src/core/optimization.js');

let checks = 0;
function check(condition, message) { checks += 1; assert.ok(condition, message); }

function runAskTell(seed) {
  const strategy = CMA.createStrategy({ mean: [3, -2], lower: [-5, -5], upper: [5, 5], sigma: 0.3, populationSize: 12, seed, maxGenerations: 60, stallGenerations: 30 });
  while (!strategy.terminated) {
    const population = strategy.ask();
    strategy.tell(population.map(sample => ({ id: sample.id, score: sample.x[0] ** 2 + sample.x[1] ** 2, metadata: { feasible: true } })));
  }
  return strategy;
}

const first = runAskTell(2026);
const second = runAskTell(2026);
check(first.history.length > 2, 'ask/tell records multiple generations');
check(first.history[0].population.length === 12, 'population size is retained');
check(first.best.score < 1e-4, 'CMA-ES converges on the sphere benchmark');
check(JSON.stringify(first.getState()) === JSON.stringify(second.getState()), 'seeded ask/tell runs are deterministic');
check(first.history.every(row => row.covariance.length === 2 && row.eigenvalues.length === 2), 'covariance diagnostics are retained');
check(first.history.every(row => Number.isFinite(row.sigma) && row.sigma > 0), 'step size remains finite and positive');
check(first.history.every(row => Number.isFinite(row.entropy)), 'Gaussian entropy is defined');
check(first.history.every(row => row.bestX.length === 2 && row.covarianceDiagonal.length === 2), 'best coordinates and covariance diagonal are retained');
check(first.history.every(row => row.selectedCount > 0 && row.selectedFraction > 0 && row.selectedFraction < 1), 'rank-mu selection diagnostics are retained');
check(first.history.every((row, index) => row.evaluations === (index + 1) * 12), 'cumulative objective evaluations are retained');
check(first.history.every(row => row.population.filter(item => item.selected).length === row.selectedCount), 'selected population members are marked');

const jacobi = CMA.jacobiEigen([[4, 1], [1, 3]]);
check(Math.abs(jacobi.values[0] - 2.38196601125) < 1e-8, 'Jacobi eigensolver recovers the small eigenvalue');
check(Math.abs(jacobi.values[1] - 4.61803398875) < 1e-8, 'Jacobi eigensolver recovers the large eigenvalue');

const result = Optimization.optimise({
  variables: [{ name: 'x', start: -3, lower: -5, upper: 5 }, { name: 'y', start: 3, lower: -5, upper: 5 }],
  objective: x => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
  inequalities: [], equalities: [], sense: 'minimize',
}, { algorithm: 'cma_es', seed: 77, populationSize: 24, maxIterations: 140, stallIterations: 45, cmaSigma: 0.35, stepTolerance: 1e-10 });
check(result.status === 'success', 'optimization integration reports a feasible candidate');
check(result.candidate.objective < 1e-4, 'optimization integration solves bounded Rosenbrock');
check(result.cmaes && result.cmaes.generations.length > 0, 'optimization result includes CMA-ES generation state');
check(result.cmaes.generations.every(row => Number.isFinite(row.runtimeMs)), 'generation runtime is retained');
check(result.methodEvidence.includes('CMA-ES'), 'method evidence identifies CMA-ES');

const constrained = Optimization.optimise({
  variables: [{ name: 'x', start: 0, lower: 0, upper: 4 }, { name: 'y', start: 0, lower: 0, upper: 4 }],
  objective: x => (x[0] - 3) ** 2 + (x[1] - 2) ** 2,
  inequalities: [x => x[0] + x[1] - 4], equalities: [], sense: 'minimize',
}, { algorithm: 'cma_es', seed: 11, populationSize: 20, maxIterations: 100, penalty: 1e5, feasibilityTolerance: 1e-4 });
check(constrained.candidate.feasible, 'CMA-ES integration respects the independent feasibility gate');
check(constrained.cmaes.generations.some(row => row.feasibleFraction > 0), 'feasible population fraction is recorded');

console.log(`${checks}/${checks} CMA-ES checks passed`);
