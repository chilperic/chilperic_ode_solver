/* =====================================================================
 * Unit test — Linear Algebra engine (src/core/linalg.js)
 * Run: node tests/js/linalg-core.test.js       (exit 0 = all pass)
 *
 * Two jobs, matching the lab-wide contract:
 *   (1) CORRECTNESS — every public operation is checked against an
 *       independently-known reference value (hand algebra / textbook).
 *   (2) PRECONDITIONS — every public entry point must REJECT malformed
 *       input with a thrown Error rather than returning silent garbage
 *       (NaN, wrong-shaped arrays). This mirrors the standard already set
 *       by the Statistics engine, so all labs behave the same way.
 *
 * The precondition checks are written FIRST and are expected to fail RED
 * against the current engine (which has no guards); the guards are then
 * added to src/core/linalg.js to turn them GREEN.
 * ===================================================================== */
'use strict';
var LA = require('../../src/core/linalg.js');

var checks = 0, fails = 0;
// close(): numeric assertion with tolerance.
function close(got, want, tol, msg) {
  checks++;
  if (Math.abs(got - want) > (tol || 1e-6)) { fails++; console.error('FAIL: ' + msg + '  got=' + got + ' want=' + want); }
  else console.log('ok  : ' + msg);
}
// truthy(): boolean assertion.
function truthy(cond, msg) { checks++; if (!cond) { fails++; console.error('FAIL: ' + msg); } else console.log('ok  : ' + msg); }
// throws(): asserts that calling fn() raises — this is how we pin a precondition.
function throws(fn, msg) { checks++; try { fn(); fails++; console.error('FAIL (no throw): ' + msg); } catch (e) { console.log('ok  : throws — ' + msg); } }

// ---------------------------------------------------------------- CORRECTNESS
// Solve a 2x2 system: [[2,1],[1,3]] x = [3,5]  ->  x = [0.8, 1.4].
var x = LA.solve([[2, 1], [1, 3]], [3, 5]);
close(x[0], 0.8, 1e-9, 'solve x0 = 0.8');
close(x[1], 1.4, 1e-9, 'solve x1 = 1.4');

// Determinant of [[1,2],[3,4]] = 1*4 - 2*3 = -2.
close(LA.determinant([[1, 2], [3, 4]]), -2, 1e-9, 'determinant = -2');

// Inverse of [[4,7],[2,6]] = [[0.6,-0.7],[-0.2,0.4]].
var inv = LA.inverse([[4, 7], [2, 6]]);
close(inv[0][0], 0.6, 1e-6, 'inverse[0][0] = 0.6');
close(inv[1][1], 0.4, 1e-6, 'inverse[1][1] = 0.4');

// Dominant eigenvalue of diag(2,1) is 2.
close(LA.powerIteration([[2, 0], [0, 1]]).eigenvalue, 2, 1e-3, 'dominant eigenvalue = 2');

// Least squares on an exact line y = 2x + 1 (design [1, x]) recovers [1, 2].
var coef = LA.leastSquares([[1, 0], [1, 1], [1, 2], [1, 3]], [1, 3, 5, 7]);
close(coef[0], 1, 1e-6, 'least squares intercept = 1');
close(coef[1], 2, 1e-6, 'least squares slope = 2');

// QR: Q must be orthonormal, so Q^T Q = I  (check the (0,0) entry = 1).
var qr = LA.qrDecomposition([[1, 1], [0, 1], [1, 0]]);
var QtQ00 = qr.Q.reduce(function (s, row) { return s + row[0] * row[0]; }, 0);
close(QtQ00, 1, 1e-6, 'QR: first Q column is unit length');

// Markov steady state of a valid stochastic matrix sums to 1.
var st = LA.markovSteady([[0.9, 0.1], [0.5, 0.5]]);
close(st[0] + st[1], 1, 1e-6, 'markov steady state sums to 1');

// ---------------------------------------------------------------- PRECONDITIONS
// A solver must refuse an empty matrix, a non-square matrix, and a
// right-hand side whose length does not match the matrix.
throws(function () { LA.solve([], [1]); }, 'solve rejects empty matrix');
throws(function () { LA.solve([[1, 2, 3]], [1]); }, 'solve rejects non-square matrix');
throws(function () { LA.solve([[1, 2], [3, 4]], [1]); }, 'solve rejects dimension mismatch A/b');
throws(function () { LA.determinant([[1, 2, 3], [4, 5, 6]]); }, 'determinant rejects non-square');
throws(function () { LA.inverse([]); }, 'inverse rejects empty matrix');
throws(function () { LA.powerIteration([[1, 2, 3]]); }, 'powerIteration rejects non-square');
throws(function () { LA.leastSquares([[1], [1]], [1]); }, 'leastSquares rejects dim mismatch');

console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
if (fails) { console.error(fails + ' FAILED'); process.exit(1); }
