'use strict';
const PCA = require('../../src/core/pca.js');
let checks = 0, fails = 0;
function ok(cond, msg) { checks += 1; if (!cond) { fails += 1; console.error('FAIL:', msg); } else console.log('ok  :', msg); }
function close(got, want, tol, msg) { ok(Math.abs(got - want) <= tol, `${msg} got=${got} want=${want}`); }
function throws(fn, msg) { checks += 1; try { fn(); fails += 1; console.error('FAIL (no throw):', msg); } catch (_) { console.log('ok  : throws —', msg); } }

const X = Array.from({length: 30}, (_, i) => {
  const t = (i - 14.5) / 5;
  return [t, 2 * t + (i % 3 - 1) * 0.02, -0.7 * t + (i % 5 - 2) * 0.015];
});
const result = PCA.compute(X, {standardize: true, featureNames: ['a','b','c']});
ok(result.rows === 30 && result.columns === 3, 'PCA reports matrix dimensions');
ok(result.scores.length === 30 && result.scores[0].length === 3, 'PCA returns one score per row and component');
ok(result.components.length === 3 && result.components[0].length === 3, 'PCA returns a complete component basis');
ok(result.explainedVarianceRatio[0] > 0.98, 'dominant correlated direction explains most standardized variance');
close(result.explainedVarianceRatio.reduce((a,b) => a + b, 0), 1, 1e-10, 'variance fractions sum to one');
close(result.cumulativeExplained[result.cumulativeExplained.length - 1], 1, 1e-10, 'cumulative explained variance ends at one');
result.components.forEach((u, i) => {
  close(u.reduce((s,v) => s + v*v, 0), 1, 1e-9, `component ${i + 1} is unit length`);
  result.components.slice(i + 1).forEach((v, j) => close(u.reduce((s,x,k) => s + x*v[k], 0), 0, 1e-8, `components ${i + 1} and ${i + j + 2} are orthogonal`));
});
for (let j = 0; j < 3; j += 1) close(result.scores.reduce((s,row) => s + row[j], 0) / result.scores.length, 0, 1e-10, `score column ${j + 1} is centered`);
ok(result.solver.method.includes('Jacobi') && result.solver.converged, 'symmetric eigensolver reports convergence evidence');

const repeated = PCA.compute(X, {standardize: true, featureNames: ['a','b','c']});
ok(JSON.stringify(result.eigenvalues) === JSON.stringify(repeated.eigenvalues), 'PCA is deterministic for fixed input');
const constant = PCA.compute([[1,2,4],[1,3,5],[1,4,6],[1,5,7]], {featureNames:['constant','x','y']});
ok(constant.warnings.some(w => w.includes('near-zero variance')), 'near-zero feature variance is reported');
throws(() => PCA.compute([[1],[2],[3]]), 'PCA rejects fewer than two columns');
throws(() => PCA.compute([[1,2],[3,4]]), 'PCA rejects fewer than three rows');
throws(() => PCA.compute([[1,2],[3,4],[5,Infinity]]), 'PCA rejects non-finite cells');

console.log(`\n${checks - fails}/${checks} checks passed`);
if (fails) process.exit(1);
