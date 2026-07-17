'use strict';
const ML = require('../../src/core/ml-reference.js');
let checks = 0, fails = 0;
function ok(cond, msg) { checks += 1; if (!cond) { fails += 1; console.error('FAIL:', msg); } else console.log('ok  :', msg); }
function close(got, want, tol, msg) { ok(Math.abs(got - want) <= tol, msg + ' got=' + got + ' want=' + want); }
function throws(fn, msg) { checks += 1; try { fn(); fails += 1; console.error('FAIL (no throw):', msg); } catch (_) { console.log('ok  : throws —', msg); } }

const Xr = Array.from({length: 30}, (_, i) => [i / 3, (i % 5) - 2]);
const yr = Xr.map(r => 1.5 + 2 * r[0] - 0.7 * r[1]);
const cvR = ML.crossValidate(Xr, yr, {task:'regression', model:'ridge', folds:5, seed:17, standardize:true, lambda:1e-8});
ok(cvR.predictions.length === yr.length, 'regression cross-validation returns one out-of-fold prediction per row');
ok(cvR.aggregate.rmse < 1e-4, 'ridge regression recovers an exact linear relation out of fold');
ok(cvR.folds.length === 5, 'five regression folds are evaluated');

const Xc = [];
const yc = [];
for (let i = 0; i < 20; i++) { Xc.push([0.2 + i * 0.04, 0.8 + (i % 3) * 0.05]); yc.push(0); }
for (let i = 0; i < 20; i++) { Xc.push([2.2 + i * 0.04, 2.7 + (i % 3) * 0.05]); yc.push(1); }
const cvC = ML.crossValidate(Xc, yc, {task:'classification', model:'logistic', folds:5, seed:21, standardize:true, lambda:0.01});
ok(cvC.aggregate.balancedAccuracy > 0.95, 'binary logistic regression separates the synthetic classes out of fold');
ok(cvC.aggregate.roc.auc > 0.95, 'ROC AUC is high for separated classes');
ok(cvC.aggregate.calibration.length > 0, 'classification returns calibration bins');

const cmp = ML.compareModels(Xc, yc, {task:'classification', folds:4, seed:22, standardize:true, lambda:0.01, neighbors:3});
ok(cmp.filter(r => r.status === 'ok').length === 3, 'classification comparison evaluates three browser baselines on shared folds');
const imp = ML.permutationImportance(Xc, yc, {task:'classification', model:'logistic', folds:4, seed:22, standardize:true, lambda:0.01});
ok(imp.values.length === 2 && imp.values.every(v => Number.isFinite(v.importance)), 'permutation importance is finite for every feature');

const blobs = [[0,0],[0.1,0.2],[-0.2,0.1],[5,5],[5.2,4.9],[4.8,5.1],[9,0],[9.1,0.2],[8.8,-0.1]];
const km = ML.kmeans(blobs, 3, 7);
const sil = ML.silhouette(blobs, km.labels);
ok(km.centroids.length === 3, 'seeded k-means returns three centroids');
ok(sil.mean > 0.8, 'well-separated blobs have strong mean silhouette');

const pca = ML.pca2([[1,1.1,2],[2,2.1,4],[3,3.2,6],[4,4.1,8],[5,5.2,10],[6,6.1,12]]);
ok(pca.scores.length === 6 && pca.components.length === 2, 'PCA returns two component score vectors');
ok(pca.explained[0] > 0.95, 'first PC explains most variance for collinear data');

const deterministicA = ML.crossValidate(Xc, yc, {task:'classification', model:'knn', folds:5, seed:55, standardize:true, neighbors:3});
const deterministicB = ML.crossValidate(Xc, yc, {task:'classification', model:'knn', folds:5, seed:55, standardize:true, neighbors:3});
ok(JSON.stringify(deterministicA.predictions) === JSON.stringify(deterministicB.predictions), 'seeded folds are deterministic');

throws(() => ML.crossValidate([[1],[2],[3],[4]],[0,2,0,1],{task:'classification',model:'logistic'}), 'classification rejects labels outside 0/1');
throws(() => ML.kmeans([[1],[2],[3]], 5, 1), 'k-means rejects k larger than row count');

console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
if (fails) process.exit(1);
