'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const Agent = require('../../src/core/agent-reference.js');
const ML = require('../../src/core/ml-reference.js');
const Presets = require('../../src/models/agent-presets.js');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function equal(a, b, message) { assert.deepStrictEqual(a, b, message); checks += 1; }
function text(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

const exact = Agent.validateConfig(Object.assign({}, Presets.sir_local, {
  size: 10, steps: 8, runs: 2, initialMode: 'counts', initialCounts: [84, 5, 1, 10]
}));
equal(exact.initialCounts, [84, 5, 1, 10], 'Agent preserves exact user-entered initial counts');
equal(exact.initialCounts.reduce((a,b)=>a+b,0), 100, 'exact counts fill the lattice exactly');
assert.throws(() => Agent.validateConfig(Object.assign({}, Presets.sir_local, {
  size: 10, initialMode: 'counts', initialCounts: [84, 5, 1, 9]
})), /sum exactly/); checks += 1;

const fractionalA = Agent.validateConfig(Object.assign({}, Presets.sir_local, { size: 11, initialMode: 'fractions', initialFractions: [0.8,0.05,0.05,0.1] }));
const fractionalB = Agent.validateConfig(Object.assign({}, Presets.sir_local, { size: 11, initialMode: 'fractions', initialFractions: [0.8,0.05,0.05,0.1] }));
equal(fractionalA.initialCounts, fractionalB.initialCounts, 'fraction-to-count allocation is deterministic');
equal(fractionalA.initialCounts.reduce((a,b)=>a+b,0), 121, 'fraction allocation fills the lattice exactly');

const customModel = {
  title: 'Local infection stress test',
  states: [{name:'empty',color:'#f8fbfd'},{name:'S',color:'#155eef'},{name:'I',color:'#ef4444'}],
  parameters: { infection: 0.35, recovery: 0.08 },
  defaultFractions: [0.10,0.85,0.05], emptyState: 0,
  transitions: [
    {from:1,to:2,kind:'neighbor-contact',neighborState:2,parameter:'infection',event:'infection'},
    {from:2,to:0,kind:'spontaneous',parameter:'recovery',event:'removal'}
  ]
};
const customConfig = {
  model:'custom',customModel:customModel,size:10,steps:8,runs:2,seed:313,recordEvery:2,
  neighborhood:'von-neumann',boundary:'toroidal',updateSchedule:'shuffled-sweep',initialization:'random',
  params:customModel.parameters,initialMode:'counts',initialCounts:[10,85,5]
};
const customA = Agent.simulate(customConfig, 313);
const customB = Agent.simulate(customConfig, 313);
equal(customA.finalGrid, customB.finalGrid, 'custom declarative Agent model is deterministic for a fixed seed');
equal(customA.initialCounts, [10,85,5], 'custom Agent model preserves exact initial counts');
assert.throws(() => Agent.validateCustomModel(Object.assign({}, customModel, { transitions:[{from:1,to:2,kind:'javascript',probability:1}] })), /kind/); checks += 1;

const X = Array.from({length:60}, (_,i) => [i/10, (i%7)-3, i/10]);
const y = X.map(row => 1.5 + 2*row[0] - 0.4*row[1]);
const cfg = {task:'regression',model:'ridge',folds:5,innerFolds:3,seed:77,standardize:true,lambda:0.1};
const repA = ML.repeatedCrossValidate(X,y,cfg,4);
const repB = ML.repeatedCrossValidate(X,y,cfg,4);
equal(repA, repB, 'repeated cross-validation is deterministic for fixed input and seed');
ok(repA.repeats === 4 && Number.isFinite(repA.sd), 'repeated CV reports repeat count and score dispersion');
const nested = ML.nestedCrossValidate(X,y,cfg);
equal(nested.predictions.length, y.length, 'nested CV returns one outer-fold prediction per row');
ok(nested.selections.length === 5, 'nested CV records one selected hyperparameter per outer fold');
const audit = ML.datasetAudit([[1,1,10],[1,1,10],[2,2,20],[3,3,30]], [10,10,20,30], ['a','b','leak'], 'regression');
ok(audit.duplicates === 1, 'ML data audit detects duplicate rows');
ok(audit.directLeakage.includes('leak'), 'ML data audit detects exact direct target leakage');
ok(audit.highCorrelation.length >= 1, 'ML data audit detects near-collinearity');

const packageJson = JSON.parse(text('package.json'));
equal(packageJson.dependencies, {}, 'runtime npm dependencies are empty because scientific libraries are vendored');
ok(packageJson.scripts['install:browser-tests'].includes('--no-audit') && packageJson.scripts['install:browser-tests'].includes('--no-fund') && packageJson.scripts['install:browser-tests'].includes('--omit=optional'), 'browser-test install command avoids slow audit, funding and optional dependency work');

const pages = ['studio.html','ode.html','steady.html','stochastic.html','optimization.html','population-genetics.html','advanced-methods.html','statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html','sciml.html','agent.html','symbolic.html','sensitivity.html','workbench.html','bifurcation.html','evolution.html','ai-modeling.html'];
pages.forEach(page => ok(!text(page).includes('data-layout-mode="three"') && !text(page).includes('data-wb-layout="three"'), page + ' exposes only reliability-first two/focus layouts'));
const imports = {
  'studio.html':'id="studioImport"',
  'ode.html':'id="modelFile"','steady.html':'id="steadyImport"','stochastic.html':'id="stochasticImport"','optimization.html':'id="optimizationImport"',
  'statistics.html':'id="statisticsFile"','fitting.html':'id="fittingFile"','linear-algebra.html':'id="linalgImport"','networks.html':'id="networksImport"',
  'population-genetics.html':'id="pgInitialP1"','advanced-methods.html':'id="advancedControls"',
  'ml.html':'id="mlUpload"','sciml.html':'id="sciUploadDataFile"','agent.html':'id="agentCustomModelFile"','symbolic.html':'id="symbolicImport"','sensitivity.html':'id="sensitivityImport"','workbench.html':'id="wbImportJson"',
  'bifurcation.html':'id="bfExpression"','evolution.html':'id="evCustomFitness"','ai-modeling.html':'id="aiData"'
};
Object.entries(imports).forEach(([page, marker]) => ok(text(page).includes(marker), page + ' exposes a user input or model import route'));

console.log(`${checks}/${checks} v72.16 model-input and reliability checks passed`);
