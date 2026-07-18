'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ROOT = path.resolve(__dirname, '../..');

const context = vm.createContext({
  console,
  performance: { now: (() => { let value = 0; return () => (value += 1); })() },
  postMessages: [], setTimeout, clearTimeout
});
context.self = context;
context.globalThis = context;
context.postMessage = message => context.postMessages.push(message);
context.importScripts = (...urls) => {
  for (const url of urls) {
    const clean = url.split('?', 1)[0];
    const absolute = path.resolve(ROOT, 'src/v72', clean);
    vm.runInContext(fs.readFileSync(absolute, 'utf8'), context, { filename: absolute });
  }
};
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/models/sensitivity-presets.js'), 'utf8'), context, { filename: 'sensitivity-presets.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/v72/sensitivity-worker.js'), 'utf8'), context, { filename: 'sensitivity-worker.js' });

const presets = context.FokoSensitivityPresets;
assert.equal(Object.keys(presets).length, 17, 'Sensitivity library must expose 17 curated models');
const families = new Set();
const difficulties = new Set();
let totalStates = 0;
let totalParameters = 0;

for (const [id, preset] of Object.entries(presets)) {
  assert.ok(preset.title && preset.family && preset.difficulty && preset.question && preset.note, `${id}: missing teaching metadata`);
  assert.ok(Array.isArray(preset.vars) && preset.vars.length > 0, `${id}: missing states`);
  assert.equal(preset.eqs.length, preset.vars.length, `${id}: equation/state mismatch`);
  assert.equal(preset.y0.length, preset.vars.length, `${id}: initial-condition/state mismatch`);
  assert.ok(preset.params && Object.keys(preset.params).length > 0, `${id}: missing parameters`);
  assert.ok(preset.t1 > preset.t0 && preset.points >= 40, `${id}: invalid time grid`);
  assert.ok(preset.vars.includes(preset.outputVar), `${id}: selected output state is absent`);
  families.add(preset.family); difficulties.add(preset.difficulty);
  totalStates += preset.vars.length; totalParameters += Object.keys(preset.params).length;

  const model = {
    vars: Array.from(preset.vars), eqs: Array.from(preset.eqs), y0: Array.from(preset.y0),
    params: JSON.parse(JSON.stringify(preset.params)), paramDefs: JSON.parse(JSON.stringify(preset.params)),
    t0: preset.t0, t1: preset.t1, points: preset.points, method: preset.method || 'rk45',
    rtol: preset.rtol || 1e-6, atol: preset.atol || 1e-9,
    stepSize: 'auto', initialStep: 'auto', maxStep: 'auto', safety: 0.9
  };
  context.postMessages.length = 0;
  context.onmessage({ data: {
    type: 'run', model, outputVar: preset.outputVar, outputMetric: preset.outputMetric || 'final',
    analysis: { method: 'fim', relativeStep: 1e-3, sigma: 1, parameterCount: Object.keys(preset.params).length }
  }});
  const result = context.postMessages.find(message => message.type === 'result');
  assert.ok(result, `${id}: worker published no terminal result`);
  assert.equal(result.ok, true, `${id}: ${result.error || 'worker failed'}`);
  assert.ok(result.solverSummary.odeSolves >= 3, `${id}: no genuine ODE work was recorded`);
  assert.ok(result.analysis.eigenvalues.every(Number.isFinite), `${id}: non-finite FIM spectrum`);
}

assert.ok(families.size >= 8, `Expected broad scientific coverage, received ${families.size} families`);
assert.ok(difficulties.size >= 2, 'Difficulty labels must distinguish introductory and advanced examples');
console.log(`Sensitivity preset audit passed: ${Object.keys(presets).length} models, ${families.size} families, ${totalStates} states and ${totalParameters} varied parameters all completed a canonical worker-backed trajectory/FIM smoke run.`);
