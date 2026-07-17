/* Foko Lab v72 — ODE numerical core contract. */
'use strict';
const ODE = require('../../src/core/ode.js');
let checks = 0, fails = 0;
function truthy(value, message) { checks += 1; if (!value) { fails += 1; console.error('FAIL:', message); } else console.log('ok  :', message); }
function close(got, expected, tol, message) { truthy(Math.abs(got - expected) <= tol, `${message} (got ${got}, expected ${expected})`); }
function throws(fn, message) { checks += 1; try { fn(); fails += 1; console.error('FAIL (no throw):', message); } catch (error) { console.log('ok  : throws —', message); } }

(function exponentialGrowth() {
  const result = ODE.solveWithRhs({ t0: 0, t1: 1, y0: [1], vars: ['x'], method: 'rk45', points: 101, rtol: 1e-8, atol: 1e-10 }, (_t, y) => [y[0]]);
  truthy(result.ok && result.status === 'success', 'RK45 exponential solve succeeds');
  close(result.Y[0].at(-1), Math.E, 2e-6, 'RK45 matches exp(1)');
  truthy(result.diagnostics.accepted > 0 && result.diagnostics.functionEvaluations >= 6, 'diagnostics report real work');
  truthy(result.provenance.browserComputed === true && result.provenance.engine === 'FokoODECore', 'provenance identifies browser computation');
})();

(function rk4Convergence() {
  const rhs = (_t, y) => [y[0]];
  const coarse = ODE.solveWithRhs({ t0: 0, t1: 1, y0: [1], method: 'rk4', points: 11 }, rhs);
  const fine = ODE.solveWithRhs({ t0: 0, t1: 1, y0: [1], method: 'rk4', points: 21 }, rhs);
  const ec = Math.abs(coarse.Y[0].at(-1) - Math.E);
  const ef = Math.abs(fine.Y[0].at(-1) - Math.E);
  truthy(ef < ec / 8, 'RK4 error falls under step refinement');
})();

(function harmonicOscillator() {
  const result = ODE.solveWithRhs({ t0: 0, t1: 20, y0: [1, 0], vars: ['x', 'v'], method: 'rk4', points: 4001 }, (_t, y) => [y[1], -y[0]]);
  const energy = result.T.map((_, i) => 0.5 * (result.Y[0][i] ** 2 + result.Y[1][i] ** 2));
  const drift = Math.max(...energy.map(v => Math.abs(v - energy[0])));
  truthy(drift < 1e-7, 'RK4 approximately conserves harmonic-oscillator energy at fine resolution');
})();

(function conservationDiagnostic() {
  const result = ODE.solveWithRhs({ t0: 0, t1: 10, y0: [0.9, 0.1], method: 'rk45', points: 301 }, (_t, y) => [-0.3 * y[0], 0.3 * y[0]]);
  const drift = ODE.conservationDrift(result, [1, 1]);
  truthy(drift.relative < 1e-10, 'conservationDrift detects conserved total mass');
})();

(function preconditions() {
  throws(() => ODE.solveWithRhs(null, () => [0]), 'rejects null configuration');
  throws(() => ODE.solveWithRhs({ t0: 0, t1: 0, y0: [1] }, () => [0]), 'rejects zero time span');
  throws(() => ODE.solveWithRhs({ t0: 0, t1: 1, y0: [1], method: 'bdf' }, () => [0]), 'rejects export-only BDF in browser core');
  throws(() => ODE.solveWithRhs({ t0: 0, t1: 1, y0: [1], rtol: 0 }, () => [0]), 'rejects non-positive tolerance');
  throws(() => ODE.solveWithRhs({ t0: 0, t1: 1, y0: [1, 2] }, () => [0]), 'rejects derivative dimension mismatch');
})();

console.log(`\n${checks - fails}/${checks} checks passed`);
if (fails) process.exitCode = 1;
