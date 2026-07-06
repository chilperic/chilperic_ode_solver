/* =====================================================================
 * Unit test — Honest scientific diagnostics (SciML + Linear Algebra)
 * Run: node tests/js/honest-diagnostics.test.js
 *
 * CONTEXT
 * -------
 * Several plots in the SciML and Linear Algebra labs were DECORATIVE:
 * they drew hardcoded arrays or Math.sin/Math.random curves under labels
 * that claim a real computation ("SINDy Pareto", "cumulative variance",
 * "power-iteration trace"). This test defines the contract for the three
 * pure functions that replace those fabrications with REAL computation,
 * so the plots become truthful:
 *
 *   1) FokoSINDy.paretoSweep        — real sparsity/accuracy trade-off:
 *      refit STLSQ across a threshold (lambda) grid and record, per lambda,
 *      the number of ACTIVE terms and the fit RMSE. This is the standard
 *      SINDy model-selection diagnostic. It replaces the hardcoded
 *      exp(-k/2) "Pareto" curve.
 *
 *   2) FokoLinearAlgebra.symmetricEigenvalues — full real spectrum of a
 *      symmetric matrix via cyclic Jacobi rotations. Feeds a TRUE
 *      eigenvalue-spectrum bar chart and a TRUE singular-value cumulative
 *      variance line (variance_i = sigma_i^2 = eig_i(A^T A)). Replaces
 *      the diagonal-entries "spectrum" and the [55,74,86,94,100] fake.
 *
 *   3) FokoLinearAlgebra.powerIterationTrace — the Rayleigh-quotient
 *      estimate at EACH power-iteration step, which genuinely converges to
 *      the dominant eigenvalue. Replaces the hardcoded [0.8,0.55,...] fake.
 *
 * CONTRACTS
 * ---------
 *  (A) paretoSweep correctness: as lambda increases, active terms are
 *      NON-INCREASING (thresholding only ever removes terms), every point
 *      carries a finite rmse >= 0, and the recovered model at small lambda
 *      is at least as rich as at large lambda.
 *  (B) symmetricEigenvalues correctness: matches known spectra to tight
 *      tolerance (diagonal, 2x2, 3x3), returns values sorted descending,
 *      and the sum of eigenvalues equals the trace (an invariant).
 *  (C) powerIterationTrace correctness: converges to the known dominant
 *      eigenvalue; returns exactly `iters` estimates.
 *  (D) PRECONDITIONS: each function rejects malformed input (non-object
 *      cfg, non-square / non-symmetric matrices, non-positive iters,
 *      non-positive or non-finite lambdas) by throwing, not by returning
 *      silent NaN.
 * ===================================================================== */
'use strict';

// FokoKit provides requireSquare etc. used by linalg; load it into the
// global the same way the browser does before requiring the core modules.
global.FokoKit = require('../../src/fokokit.js');
var SINDy = require('../../src/core/sindy.js');
var LA = require('../../src/core/linalg.js');

var checks = 0, fails = 0;
function close(g, w, t, m) { checks++; if (!(Math.abs(g - w) <= (t || 1e-6))) { fails++; console.error('FAIL: ' + m + '  got=' + g + ' want=' + w); } else console.log('ok  : ' + m); }
function truthy(c, m) { checks++; if (!c) { fails++; console.error('FAIL: ' + m); } else console.log('ok  : ' + m); }
function throws(fn, m) { checks++; try { fn(); fails++; console.error('FAIL (no throw): ' + m); } catch (e) { console.log('ok  : throws — ' + m); } }

/* ---------------------------------------------------------------------
 * Reference data: clean Lotka-Volterra trajectory sampled on a grid.
 * dx/dt = a x - b x y ; dy/dt = -c y + d x y   (a=1.1,b=0.4,c=0.4,d=0.1)
 * Generated here with RK4 so the test is self-contained and the true
 * sparse structure (a few active terms per equation) is known.
 * ------------------------------------------------------------------- */
function lotkaVolterra() {
  var a = 1.1, b = 0.4, c = 0.4, d = 0.1, dt = 0.02, N = 400;
  function f(s) { return [a * s[0] - b * s[0] * s[1], -c * s[1] + d * s[0] * s[1]]; }
  var s = [10, 5], X = [], t = [];
  for (var i = 0; i < N; i++) {
    X.push(s.slice()); t.push(i * dt);
    var k1 = f(s);
    var k2 = f([s[0] + dt / 2 * k1[0], s[1] + dt / 2 * k1[1]]);
    var k3 = f([s[0] + dt / 2 * k2[0], s[1] + dt / 2 * k2[1]]);
    var k4 = f([s[0] + dt * k3[0], s[1] + dt * k3[1]]);
    s = [s[0] + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
         s[1] + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])];
  }
  return { X: X, t: t };
}

/* ============================ (A) paretoSweep ======================== */
(function () {
  var d = lotkaVolterra();
  var lib = { constant: true, linear: true, quadratic: true, interactions: true };
  var sweep = SINDy.paretoSweep({ X: d.X, t: d.t, varNames: ['x', 'y'], library: lib,
                                  lambdas: [0.001, 0.01, 0.05, 0.2, 0.6, 1.5] });

  truthy(Array.isArray(sweep.points) && sweep.points.length === 6, 'paretoSweep returns one point per lambda');
  truthy(sweep.points.every(function (p) { return Number.isFinite(p.rmse) && p.rmse >= 0; }), 'every point has finite rmse >= 0');
  truthy(sweep.points.every(function (p) { return Number.isInteger(p.activeTerms) && p.activeTerms >= 0; }), 'activeTerms are non-negative integers');

  // MONOTONICITY: thresholding can only remove terms as lambda grows.
  var mono = true;
  for (var i = 1; i < sweep.points.length; i++) {
    if (sweep.points[i].activeTerms > sweep.points[i - 1].activeTerms) mono = false;
  }
  truthy(mono, 'active terms are non-increasing as lambda increases');

  // The richest model (smallest lambda) must have at least as many terms
  // as the sparsest (largest lambda), and the sparsest should be sparse.
  truthy(sweep.points[0].activeTerms >= sweep.points[sweep.points.length - 1].activeTerms,
    'small-lambda model is at least as rich as large-lambda model');

  // Points are returned in ascending lambda order (stable for plotting).
  var asc = true;
  for (var j = 1; j < sweep.points.length; j++) if (sweep.points[j].lambda < sweep.points[j - 1].lambda) asc = false;
  truthy(asc, 'points sorted by ascending lambda');

  // PRECONDITIONS.
  throws(function () { SINDy.paretoSweep(null); }, 'paretoSweep rejects null cfg');
  throws(function () { SINDy.paretoSweep({ X: d.X, t: d.t, lambdas: [] }); }, 'paretoSweep rejects empty lambda grid');
  throws(function () { SINDy.paretoSweep({ X: d.X, t: d.t, lambdas: [-1] }); }, 'paretoSweep rejects non-positive lambda');
  throws(function () { SINDy.paretoSweep({ X: d.X, t: d.t, lambdas: [NaN] }); }, 'paretoSweep rejects non-finite lambda');
})();

/* ==================== (B) symmetricEigenvalues ======================= */
(function () {
  // Diagonal matrix: eigenvalues are the diagonal, sorted descending.
  var diag = LA.symmetricEigenvalues([[3, 0, 0], [0, 1, 0], [0, 0, 2]]);
  close(diag[0], 3, 1e-8, 'diag eig[0] = 3');
  close(diag[1], 2, 1e-8, 'diag eig[1] = 2');
  close(diag[2], 1, 1e-8, 'diag eig[2] = 1');

  // 2x2 symmetric [[2,1],[1,2]] -> eigenvalues 3 and 1.
  var e2 = LA.symmetricEigenvalues([[2, 1], [1, 2]]);
  close(e2[0], 3, 1e-8, '2x2 dominant eig = 3');
  close(e2[1], 1, 1e-8, '2x2 minor eig = 1');

  // 3x3 symmetric — invariant: sum(eig) == trace.
  var S = [[4, 1, 2], [1, 5, 3], [2, 3, 6]];
  var e3 = LA.symmetricEigenvalues(S);
  var sum = e3.reduce(function (a, b) { return a + b; }, 0);
  close(sum, 15, 1e-6, 'sum of eigenvalues equals trace (4+5+6)');
  truthy(e3[0] >= e3[1] && e3[1] >= e3[2], 'eigenvalues sorted descending');

  // Cumulative-variance use case: variance_i = sigma_i^2 = eig_i(A^T A).
  // For A^T A the eigenvalues are non-negative; cumulative sum is monotone.
  var A = [[4, 4, 3], [4, 5, 3], [1, 1, 6]];
  var At = LA.transpose(A), AtA = LA.matmul(At, A);
  var sv2 = LA.symmetricEigenvalues(AtA);
  truthy(sv2.every(function (v) { return v >= -1e-8; }), 'A^T A eigenvalues non-negative (squared singular values)');

  // PRECONDITIONS.
  throws(function () { LA.symmetricEigenvalues([[1, 2, 3], [4, 5, 6]]); }, 'symmetricEigenvalues rejects non-square');
  throws(function () { LA.symmetricEigenvalues([[1, 2], [3, 4]]); }, 'symmetricEigenvalues rejects asymmetric');
})();

/* ==================== (C) powerIterationTrace ======================== */
(function () {
  var trace = LA.powerIterationTrace([[2, 0], [0, 1]], 30);
  truthy(Array.isArray(trace) && trace.length === 30, 'trace has exactly `iters` estimates');
  close(trace[trace.length - 1], 2, 1e-4, 'trace converges to dominant eigenvalue 2 (diagonal case)');

  var trace2 = LA.powerIterationTrace([[2, 1], [1, 2]], 40);
  close(trace2[trace2.length - 1], 3, 1e-4, 'trace converges to dominant eigenvalue 3 (coupled case)');

  // PRECONDITIONS.
  throws(function () { LA.powerIterationTrace([[1, 2, 3]], 10); }, 'powerIterationTrace rejects non-square');
  throws(function () { LA.powerIterationTrace([[1, 0], [0, 1]], 0); }, 'powerIterationTrace rejects iters < 1');
})();

console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
if (fails) process.exitCode = 1;
