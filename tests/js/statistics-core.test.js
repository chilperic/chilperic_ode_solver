/* =====================================================================
 * Unit test — Statistics engine (src/core/statistics.js)
 * Run: node tests/js/statistics-core.test.js
 *
 * Restored and aligned to the lab-wide contract used by every engine:
 *   (1) CORRECTNESS of the inferential core against reference values
 *       (normal / Student-t / chi-square tables, exact algebra);
 *   (2) PRECONDITIONS: entry tests reject too-small / mismatched inputs
 *       instead of returning silent NaN.
 * ===================================================================== */
'use strict';
var S = require('../../src/core/statistics.js');

var checks = 0, fails = 0;
function close(g, w, t, m) { checks++; if (Math.abs(g - w) > (t || 1e-6)) { fails++; console.error('FAIL: ' + m + '  got=' + g + ' want=' + w); } else console.log('ok  : ' + m); }
function truthy(c, m) { checks++; if (!c) { fails++; console.error('FAIL: ' + m); } else console.log('ok  : ' + m); }
function throws(fn, m) { checks++; try { fn(); fails++; console.error('FAIL (no throw): ' + m); } catch (e) { console.log('ok  : throws — ' + m); } }

// ---- distributions ----
close(S.normalCdf(1.959963985), 0.975, 1e-4, 'Phi(1.96) ~ 0.975');
close(S.studentTCdf(2.570582, 5), 0.975, 1e-3, 'T-cdf(t.975,5) ~ 0.975');
close(S.chiSqCdf(3.841459, 1), 0.95, 2e-3, 'ChiSq-cdf(3.841,1) ~ 0.95');

// ---- tests carry p-values ----
var w = S.welchT([1, 2, 3, 4, 5], [2, 3, 4, 5, 6]);
close(w.t, -1, 1e-9, 'Welch t = -1');
truthy(w.p > 0.3 && w.p < 0.4, 'Welch p present ~0.35');
var a = S.anovaOneWay([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
close(a.F, 27, 1e-6, 'ANOVA F = 27');
truthy(a.p < 0.01, 'ANOVA p < 0.01');
var chi = S.chiSquareTest([[10, 20], [20, 10]]);
close(chi.chi2, 6.6667, 1e-3, 'chi-square = 6.667');
truthy(chi.df === 1 && chi.p < 0.02, 'chi-square df=1, p<0.02');

// ---- preconditions ----
throws(function () { S.tTestOne([1], 0); }, 'one-sample t rejects n<2');
throws(function () { S.corTest([1, 2], [1, 2]); }, 'corTest rejects n<3');

console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
if (fails) { console.error(fails + ' FAILED'); process.exit(1); }
