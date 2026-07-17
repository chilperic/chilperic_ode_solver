'use strict';
const Core = require('../../src/core/steady.js');
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

(function scalarRoot() {
  const result = Core.solveNewton({ residual: x => [x[0] * x[0] - 2], x0: [1], tolerance: 1e-12 });
  check(result.converged, 'Newton converges for x^2-2');
  close(result.x[0], Math.SQRT2, 1e-9, 'sqrt(2) root');
  check(result.residualNorm <= 1e-12, 'reported residual meets requested tolerance');
  check(result.terminationReason === 'residual_tolerance', 'termination reason records tolerance gate');
  check(result.history.length > 1, 'iteration history is retained');
  check(result.jacobian.length === 1, 'final numerical Jacobian is retained');
})();

(function linearSystem() {
  const result = Core.solveNewton({ residual: x => [2 * x[0] + x[1] - 5, x[0] - x[1] - 1], x0: [0, 0] });
  check(result.converged, 'two-dimensional linear system converges');
  close(result.x[0], 2, 1e-9, 'linear-system x root');
  close(result.x[1], 1, 1e-9, 'linear-system y root');
})();

(function failedSolveIsNotOverclaimed() {
  const result = Core.solveNewton({ residual: x => [x[0] * x[0] + 1], x0: [0], maxIterations: 10 });
  check(!result.converged, 'no real root is not reported as converged');
  check(['singular_jacobian', 'line_search_failed', 'max_iterations'].includes(result.terminationReason), 'failure has an explicit numerical termination reason');
})();

(function stabilityScope() {
  const stable = Core.classifyDynamicStability([[-1, 0], [0, -2]]);
  check(stable.status === 'computed' && stable.label === 'stable', '2x2 stable Jacobian classified exactly');
  close(stable.maxRealPart, -1, 1e-12, 'stable maximum real part');
  const unstable = Core.classifyDynamicStability([[1, 0], [0, -2]]);
  check(unstable.label === 'unstable', 'positive eigenvalue classified unstable');
  const unsupported = Core.classifyDynamicStability([[-1, 0, 0], [0, -2, 0], [0, 0, -3]]);
  check(unsupported.status === 'not-computed', 'general eigenspectrum above 2x2 is not overclaimed');
})();

(function deterministicMultiStart() {
  const multi = Core.solveMultiStart({
    residual: x => [x[0] * x[0] - 1],
    x0: [0.2],
    starts: [[-2], [-0.2], [0.2], [2]],
    tolerance: 1e-12,
    rootTolerance: 1e-7,
  });
  check(multi.uniqueSolutions.length === 2, 'finite multi-start distinguishes the two roots of x^2-1');
  const roots = multi.uniqueSolutions.map(result => result.x[0]).sort((a, b) => a - b);
  close(roots[0], -1, 1e-8, 'negative multi-start root');
  close(roots[1], 1, 1e-8, 'positive multi-start root');
})();

(function sequentialScan() {
  const rows = Core.scanParameter({
    values: [0, 0.5, 1, 1.5],
    x0: [0],
    variableNames: ['x'],
    residualForParameter: p => x => [x[0] - p],
    dynamicInterpretation: false,
    tolerance: 1e-12,
  });
  check(rows.every(row => row.converged), 'simple parameter scan converges at all sampled points');
  rows.forEach(row => close(row.values.x, row.parameter, 1e-10, 'scan root follows x=p'));
  check(rows.every(row => row.stability.status === 'not-applicable'), 'algebraic scan does not invent stability');
})();

(function scanCandidateIsExplicitlyUnconfirmed() {
  const rows = Core.scanParameter({
    values: [-1, 1],
    x0: [0],
    variableNames: ['x'],
    residualForParameter: p => x => [p * x[0]],
    dynamicInterpretation: true,
    tolerance: 1e-12,
  });
  const candidates = rows.flatMap(row => row.candidates);
  check(candidates.some(candidate => candidate.type === 'stability-crossing'), 'sampled sign crossing creates a candidate marker');
  check(candidates.every(candidate => candidate.confirmed === false), 'candidate markers are never promoted to confirmed bifurcations');
})();

(function utilitiesAndPreconditions() {
  const values = Core.linspace(-1, 1, 5);
  check(JSON.stringify(values) === JSON.stringify([-1, -0.5, 0, 0.5, 1]), 'linspace is deterministic');
  throws(() => Core.solveNewton({ x0: [1] }), 'residual function is required');
  throws(() => Core.solveNewton({ residual: () => [0], x0: [], tolerance: 1e-9 }), 'empty initial state is rejected');
  throws(() => Core.solveNewton({ residual: () => [0], x0: [1], tolerance: 0 }), 'non-positive tolerance is rejected');
  throws(() => Core.scanParameter({ values: [0], x0: [0], residualForParameter: () => x => [x[0]] }), 'one-point scan is rejected');
})();

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exitCode = 1;
