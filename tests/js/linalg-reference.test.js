'use strict';
const L = require('../../src/core/linalg-reference.js');
let checks = 0, fails = 0;
function close(got, want, tol, message) { checks += 1; if (Math.abs(got - want) > tol) { fails += 1; console.error('FAIL:', message, 'got=', got, 'want=', want); } }
function truthy(value, message) { checks += 1; if (!value) { fails += 1; console.error('FAIL:', message); } }
function throws(fn, message) { checks += 1; try { fn(); fails += 1; console.error('FAIL no throw:', message); } catch (_) {} }

const A = L.parseMatrix('4 1 0\n1 3 1\n0 1 2');
truthy(A.length === 3 && A[0].length === 3, 'strict matrix parser');
throws(() => L.parseMatrix('1 2\n3'), 'ragged matrices rejected');
const solved = L.solveLinear(A, [1,2,3]);
truthy(solved.residualNorm < 1e-10, 'linear solve residual');
const inv = L.inverse([[2,0],[0,4]]);
close(inv.inverse[0][0], 0.5, 1e-12, 'inverse entry');
truthy(inv.residualNorm < 1e-12, 'inverse reconstruction');
close(L.determinant([[1,2],[3,4]]), -2, 1e-10, 'determinant');
throws(() => L.solveLinear([[1,2],[2,4]], [1,2]), 'singular solve rejected');
const ls = L.leastSquares([[1,0],[1,1],[1,2],[1,3]], [1,3,5,7]);
close(ls.coefficients[0], 1, 1e-10, 'least-squares intercept');
close(ls.coefficients[1], 2, 1e-10, 'least-squares slope');
const eig = L.symmetricEigenDecomposition([[2,1],[1,2]]);
close(eig.values[0], 3, 1e-9, 'largest symmetric eigenvalue');
close(eig.values[1], 1, 1e-9, 'smallest symmetric eigenvalue');
truthy(Math.max(...eig.residuals) < 1e-8, 'eigen residuals');
throws(() => L.symmetricEigenDecomposition([[1,2],[0,1]]), 'nonsymmetric eigen request rejected');
const svd = L.singularValueDiagnostics([[3,0],[0,1]]);
close(svd.singularValues[0], 3, 1e-9, 'largest singular value');
close(svd.conditionEstimate, 3, 1e-8, 'condition estimate');
const ns = L.nullSpace([[1,2,3],[2,4,6]]);
truthy(ns.nullity === 2, 'nullity');
truthy(Math.max(...ns.residualNorms) < 1e-8, 'null-space residuals');
const pca = L.pca([[1,1],[2,2],[3,3],[4,4]]);
truthy(pca.explainedVarianceRatio[0] > 0.999999, 'PCA dominant component');
const markov = L.stationaryDistribution([[0.8,0.2],[0.1,0.9]], { tolerance: 1e-13, maxIterations: 10000 });
close(markov.distribution[0], 1/3, 1e-8, 'stationary probability 1');
close(markov.distribution[1], 2/3, 1e-8, 'stationary probability 2');
truthy(markov.residualNorm < 1e-10, 'stationary residual');
throws(() => L.stationaryDistribution([[0.8,0.3],[0.1,0.9]]), 'non-stochastic rows rejected');
const summary = L.matrixSummary([[1,0,0],[0,1,0]]);
truthy(summary.rank === 2 && summary.rows === 2 && summary.columns === 3, 'rectangular summary');

console.log((checks - fails) + '/' + checks + ' linear algebra reference checks passed');
if (fails) process.exit(1);
