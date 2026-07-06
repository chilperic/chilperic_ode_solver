/* =====================================================================
 * Unit test — Curve Fitting engine (src/core/fitting.js)
 * Run: node tests/js/fitting-core.test.js
 *
 * Same two-part contract as every Foko engine:
 *   (1) CORRECTNESS against reference values (exact fits must be exact).
 *   (2) PRECONDITIONS: entry points reject empty data, mismatched x/y and
 *       under-determined fits (fewer points than parameters) instead of
 *       returning garbage. Written first; RED until guards are added.
 * ===================================================================== */
'use strict';
var F = require('../../src/core/fitting.js');

var checks = 0, fails = 0;
function close(g, w, t, m) { checks++; if (Math.abs(g - w) > (t || 1e-6)) { fails++; console.error('FAIL: ' + m + '  got=' + g + ' want=' + w); } else console.log('ok  : ' + m); }
function truthy(c, m) { checks++; if (!c) { fails++; console.error('FAIL: ' + m); } else console.log('ok  : ' + m); }
function throws(fn, m) { checks++; try { fn(); fails++; console.error('FAIL (no throw): ' + m); } catch (e) { console.log('ok  : throws — ' + m); } }

// -------------------------------------------------------------- CORRECTNESS
// Exact line y = 2x + 1  ->  intercept 1, slope 2, R^2 = 1.
var lin = F.fit([[0, 1], [1, 3], [2, 5], [3, 7]], 'linear');
close(lin.coef[0], 1, 1e-9, 'linear intercept = 1');
close(lin.coef[1], 2, 1e-9, 'linear slope = 2');
close(lin.r2, 1, 1e-12, 'linear R^2 = 1');
truthy(Array.isArray(lin.parameterSummary), 'linear reports parameterSummary (SE)');

// Exact parabola y = x^2  ->  quadratic recovers [0,0,1], R^2 = 1.
var quad = F.fit([[0, 0], [1, 1], [2, 4], [3, 9], [4, 16]], 'quadratic');
close(quad.coef[2], 1, 1e-6, 'quadratic leading coef = 1');
close(quad.r2, 1, 1e-9, 'quadratic R^2 = 1');

// Exponential y = 2 e^{0.5 x} recovered by log-linear fit.
var ex = F.fit([0, 1, 2, 3, 4].map(function (v) { return [v, 2 * Math.exp(0.5 * v)]; }), 'exponential');
close(ex.a, 2, 1e-4, 'exponential a = 2');
close(ex.b, 0.5, 1e-4, 'exponential b = 0.5');

// -------------------------------------------------------------- PRECONDITIONS
throws(function () { F.fit([], 'linear'); }, 'fit rejects empty data');
throws(function () { F.polyFit([1, 2, 3], [1, 2], 1); }, 'polyFit rejects x/y length mismatch');
throws(function () { F.polyFit([1, 2], [1, 2], 5); }, 'polyFit rejects under-determined fit (n <= degree)');

console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
if (fails) { console.error(fails + ' FAILED'); process.exit(1); }
