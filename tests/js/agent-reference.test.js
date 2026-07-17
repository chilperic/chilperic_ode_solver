'use strict';
const assert = require('assert');
const Agent = require('../../src/core/agent-reference.js');
const Presets = require('../../src/models/agent-presets.js');
let checks = 0;
function ok(condition, message) { assert.ok(condition, message); checks += 1; }
function equal(a,b,message){assert.deepStrictEqual(a,b,message);checks+=1;}

ok(Object.keys(Presets).length >= 5, 'five curated agent presets');
ok(Object.keys(Agent.MODEL_META).length >= 5, 'five model families');

for (const [name, preset] of Object.entries(Presets)) {
  const config = Object.assign({}, preset, { size: 12, steps: 12, runs: 4, recordEvery: 3 });
  const validated = Agent.validateConfig(config);
  equal(validated.model, preset.model, name + ' model preserved');
  ok(Math.abs(validated.initialFractions.reduce((a,b)=>a+b,0)-1) < 1e-12, name + ' fractions normalize');
  const first = Agent.simulate(validated, 42);
  const repeat = Agent.simulate(validated, 42);
  equal(first.finalGrid, repeat.finalGrid, name + ' deterministic for same seed');
  equal(first.finalCounts, repeat.finalCounts, name + ' counts deterministic');
  equal(first.finalCounts.reduce((a,b)=>a+b,0), validated.size * validated.size, name + ' state count conserved');
  ok(first.times[0] === 0 && first.times[first.times.length - 1] === validated.steps, name + ' time range recorded');
  ok(first.finalGrid.every(v => Number.isInteger(v) && v >= 0 && v < first.states.length), name + ' states remain valid');
  ok(first.metrics.normalizedDiversity >= 0 && first.metrics.normalizedDiversity <= 1 + 1e-12, name + ' diversity bounded');
  if (first.metrics.spatialAgreement != null) ok(first.metrics.spatialAgreement >= 0 && first.metrics.spatialAgreement <= 1, name + ' agreement bounded');
  const ensemble = Agent.simulateEnsemble(validated);
  equal(ensemble.runs.length, validated.runs, name + ' requested runs returned');
  equal(ensemble.ensemble.mean.length, first.times.length, name + ' ensemble time alignment');
  equal(ensemble.provenance.seeds.length, validated.runs, name + ' derived seeds reported');
  ok(new Set(ensemble.provenance.seeds).size === validated.runs, name + ' derived seeds distinct');
  ensemble.ensemble.mean.forEach(row => ok(Math.abs(row.reduce((a,b)=>a+b,0) - validated.size*validated.size) < 1e-8, name + ' ensemble means conserve grid size'));
}

assert.throws(() => Agent.validateConfig(Object.assign({}, Presets.tcell_baseline, {size: 200})), /grid size/); checks += 1;
assert.throws(() => Agent.validateConfig(Object.assign({}, Presets.tcell_baseline, {params:{activation:2,division:.1,qDeath:.1,aDeath:.1,clearance:.1}})), /activation/); checks += 1;
assert.throws(() => Agent.validateConfig(Object.assign({}, Presets.tcell_baseline, {size:80,steps:1200,runs:200})), /safety budget/); checks += 1;


const incrementalConfig = Object.assign({}, Presets.tcell_baseline, {
  size: 12, steps: 18, runs: 2, recordEvery: 3, snapshotCount: 7, captureSnapshots: true
});
const directIncrementalReference = Agent.simulate(incrementalConfig, 98765);
const incrementalRunner = Agent.createSimulationRunner(incrementalConfig, 98765);
equal(incrementalRunner.step, 0, 'incremental runner starts at step zero');
const observedSteps = [incrementalRunner.frame().step];
while (!incrementalRunner.done) {
  incrementalRunner.advance(4);
  observedSteps.push(incrementalRunner.frame().step);
}
ok(observedSteps.length >= 5, 'incremental runner exposes several genuine computed frames');
ok(observedSteps.every((value, index) => index === 0 || value > observedSteps[index - 1]), 'incremental frame steps increase monotonically');
equal(incrementalRunner.result(), directIncrementalReference, 'chunked incremental execution is bit-identical to direct simulation');
assert.throws(() => Agent.createSimulationRunner(incrementalConfig, 3).result(), /incomplete/); checks += 1;

equal(Agent.deriveSeed(123, 0), Agent.deriveSeed(123, 0), 'seed derivation deterministic');
ok(Agent.deriveSeed(123, 0) !== Agent.deriveSeed(123, 1), 'seed derivation changes by run');
console.log(`${checks}/${checks} Agent reference assertions passed`);
