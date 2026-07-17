'use strict';
global.FokoDataCore = require('../../src/core/data.js');
global.FokoStatistics = require('../../src/core/statistics.js');
global.FokoPCA = require('../../src/core/pca.js');
require('../../src/models/statistics-presets.js');
const W = require('../../src/v72/statistics-workspace.js');
const D = global.FokoDataCore;
const P = global.FokoStatisticsPresets;
let checks = 0;
let failures = 0;
function ok(condition, label) { checks += 1; if (!condition) { failures += 1; console.error('FAIL:', label); } }
function close(actual, expected, tolerance, label) { ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`); }
function throws(fn, label) { let hit = false; try { fn(); } catch (_) { hit = true; } ok(hit, label); }
function config(mode, indices, policy) {
  return Object.assign({ mode, x: 0, y: 1, group: 2, event: 1, alpha: 0.05, bootstrapReps: 500, seed: 1234, bins: 15, missingPolicy: policy || 'analysis-complete' }, indices || {});
}

let ds = D.parseDataset(P.regression.data, { delimiter: 'auto', header: 'auto' });
let result = W.computeResult(ds, config('regression'));
ok(result.usableRows === 19 && result.dropped === 1, 'regression reports excluded row');
ok(Number.isFinite(result.regression.slope) && result.regression.slope > 1.8, 'regression slope computed');
ok(result.regression.pSlope < 0.001, 'regression p-value computed');
ok(result.bands.length === 19, 'regression bands correspond to usable rows');

result = W.computeResult(ds, config('regression', {}, 'mean-impute'));
ok(result.usableRows === 20 && result.imputed === 1, 'mean imputation is explicit');
ok(result.warnings.some(v => v.includes('understated')), 'mean-imputation warning recorded');

ds = D.parseDataset(P.anova.data, { delimiter: 'auto', header: 'auto' });
result = W.computeResult(ds, config('anova'));
ok(result.groupNames.length === 3, 'ANOVA groups computed');
ok(result.anova.p < 0.001 && result.kruskal.p < 0.01, 'ANOVA and Kruskal evidence computed');
ok(result.warnings.some(v => v.includes('post-hoc')), 'omnibus limitation recorded');

ds = D.parseDataset(P.classification.data, { delimiter: 'auto', header: 'auto' });
result = W.computeResult(ds, config('classification'));
ok(result.classification.auc > 0.8, 'classification AUC computed');
ok(result.classification.positive === 10 && result.classification.negative === 10, 'class counts exposed');
const badClass = D.parseDataset('score,label\n0.1,0\n0.8,2\n0.4,0\n0.9,2');
throws(() => W.computeResult(badClass, config('classification', { x: 0, y: 1, group: 1 })), 'non-binary labels rejected');

ds = D.parseDataset(P.fdr.data, { delimiter: 'auto', header: 'auto' });
result = W.computeResult(ds, config('fdr', { x: 1, y: 2, group: 0 }));
ok(result.qValues.length === 12, 'FDR q-values computed');
ok(result.discoveries > 0 && result.discoveries < 12, 'FDR discoveries bounded');

ds = D.parseDataset(P.survival.data, { delimiter: 'auto', header: 'auto' });
result = W.computeResult(ds, config('survival', { x: 0, y: 1, event: 1, group: 2 }));
ok(result.groupNames.length === 2 && result.logRank, 'two-group survival evidence computed');
ok(result.primary.value + result.effect.value === result.usableRows, 'events plus censored equals usable rows');
const badEvent = D.parseDataset('time,event,group\n1,0,A\n2,2,A\n3,1,B');
throws(() => W.computeResult(badEvent, config('survival', { x: 0, y: 1, event: 1, group: 2 })), 'non-binary event indicator rejected');

ds = D.parseDataset(P.bootstrap.data, { delimiter: 'auto', header: 'auto' });
result = W.computeResult(ds, config('bootstrap', { x: 0, y: 0, group: 1 }, 'analysis-complete'));
ok(result.bootstrapMeans.length === 500, 'bootstrap replicate count honored');
close(result.bootstrap.mean, global.FokoStatistics.mean(D.numericValues(ds, 0)), 1e-12, 'bootstrap sample mean');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
