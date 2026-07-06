/* =====================================================================
 * Unit test — ML engine (src/core/ml-lite.js)
 * Run: node tests/js/ml-core.test.js
 *
 * (1) CORRECTNESS: linear regression on an exact line, k-means on well
 *     separated blobs, confusion-matrix arithmetic.
 * (2) PRECONDITIONS: entry points reject empty data, X/y count mismatch,
 *     and a cluster count k outside 1..n. RED first.
 * ===================================================================== */
'use strict';
var ML = require('../../src/core/ml-lite.js');

var checks = 0, fails = 0;
function close(g, w, t, m) { checks++; if (Math.abs(g - w) > (t || 1e-6)) { fails++; console.error('FAIL: ' + m + '  got=' + g + ' want=' + w); } else console.log('ok  : ' + m); }
function truthy(c, m) { checks++; if (!c) { fails++; console.error('FAIL: ' + m); } else console.log('ok  : ' + m); }
function throws(fn, m) { checks++; try { fn(); fails++; console.error('FAIL (no throw): ' + m); } catch (e) { console.log('ok  : throws — ' + m); } }

// -------------------------------------------------------------- CORRECTNESS
// Exact line y = 2x  ->  slope 2, R^2 = 1.
var lr = ML.linearRegression([[0], [1], [2], [3]], [0, 2, 4, 6]);
close(lr.coefficients[1], 2, 1e-6, 'linear regression slope = 2');
close(lr.r2, 1, 1e-9, 'linear regression R^2 = 1');

// Two well-separated blobs -> k-means inertia ~ 0.
var km = ML.kmeans([[0, 0], [0.1, 0], [5, 5], [5.1, 5]], 2);
truthy(km.inertia < 0.1, 'k-means inertia small for separated blobs');
truthy(km.labels[0] === km.labels[1] && km.labels[2] === km.labels[3] && km.labels[0] !== km.labels[2], 'k-means separates the two blobs');

// Confusion matrix arithmetic:  y=[1,1,0,0], pred=[1,0,0,0] -> acc 0.75.
var c = ML.confusion([1, 1, 0, 0], [1, 0, 0, 0]);
truthy(c.tp === 1 && c.fn === 1 && c.tn === 2 && c.fp === 0, 'confusion counts correct');
close(c.accuracy, 0.75, 1e-9, 'accuracy = 0.75');

// -------------------------------------------------------------- PRECONDITIONS
throws(function () { ML.linearRegression([], []); }, 'linearRegression rejects empty data');
throws(function () { ML.linearRegression([[1], [2]], [1]); }, 'linearRegression rejects X/y count mismatch');
throws(function () { ML.kmeans([[1, 1]], 3); }, 'kmeans rejects k > n');
throws(function () { ML.kmeans([[1, 1], [2, 2]], 0); }, 'kmeans rejects k < 1');

console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
if (fails) { console.error(fails + ' FAILED'); process.exit(1); }
