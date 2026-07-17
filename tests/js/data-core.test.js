'use strict';
const D = require('../../src/core/data.js');
let checks = 0;
let failures = 0;
function ok(condition, label) { checks += 1; if (!condition) { failures += 1; console.error('FAIL:', label); } }
function eq(actual, expected, label) { ok(JSON.stringify(actual) === JSON.stringify(expected), `${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`); }
function throws(fn, label) { let hit = false; try { fn(); } catch (_) { hit = true; } ok(hit, label); }

ok(D.detectDelimiter('a,b\n1,2') === ',', 'comma detection');
ok(D.detectDelimiter('a\tb\n1\t2') === '\t', 'tab detection');
ok(D.detectDelimiter('a;b\n1;2') === ';', 'semicolon detection');

const ds = D.parseDataset('name,value,group\n"alpha, one",1,A\nbeta,NA,B\ngamma,3,A');
eq(ds.names, ['name', 'value', 'group'], 'header names');
ok(ds.rowCount === 3 && ds.columnCount === 3, 'dataset shape');
ok(ds.rows[0].cells[0] === 'alpha, one', 'quoted comma');
ok(ds.columns[1].type === 'numeric', 'numeric type');
ok(ds.columns[0].type === 'categorical', 'categorical type');
ok(ds.missingCells === 1, 'missing count');

const complete = D.prepareRows(ds, [{ index: 1, type: 'numeric' }], 'analysis-complete');
ok(complete.usableRows === 2 && complete.dropped === 1 && complete.imputed === 0, 'complete-case preparation');
const imputed = D.prepareRows(ds, [{ index: 1, type: 'numeric' }], 'mean-impute');
ok(imputed.usableRows === 3 && imputed.imputed === 1, 'mean imputation');
ok(Math.abs(imputed.rows[1].cells[1] - 2) < 1e-12, 'mean imputation value');

const pair = D.pairedNumeric(D.parseDataset('x,y\n1,2\n3,4\n5,NA'), 0, 1, 'analysis-complete');
eq(pair.x, [1, 3], 'paired x');
eq(pair.y, [2, 4], 'paired y');

const grouped = D.groupedNumeric(ds, 2, 1, 'mean-impute');
ok(Object.keys(grouped.groups).length === 2, 'group extraction');
ok(grouped.groups.A.length === 2 && grouped.groups.B.length === 1, 'group sizes');

const corr = D.pairwiseCorrelationMatrix(D.parseDataset('a,b\n1,1\n2,NA\n3,3'), [0, 1], function (a, b) { return a.length === b.length && a.length === 2 ? 1 : 0; });
ok(corr[0][1] === 1, 'pairwise correlation preserves row alignment');

const miss = D.missingnessMatrix(ds, 2);
ok(miss.z.length === 2 && miss.truncated, 'missingness truncation');
throws(() => D.parseDataset('"a,b\n1,2'), 'unclosed quote rejected');
throws(() => D.requireColumn(ds, 9, 'X'), 'invalid column rejected');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
