'use strict';
const fs = require('fs');
const path = require('path');
require(path.join(__dirname, '../../src/v72/scientific-registry.js'));
const registry = globalThis.FokoScientificRegistry;
let assertions = 0;
function ok(condition, message) {
  assertions += 1;
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  assertions += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

ok(registry && typeof registry.registerLab === 'function', 'central registry is exported');
equal(registry.chooseDistinctSelections(['a','b','c'], ['a','b'], 0), ['a','b'], 'valid distinct selection is preserved');
equal(registry.chooseDistinctSelections(['a','b','c'], ['b','b'], 0), ['b','a'], 'duplicate selection deterministically repairs the other panel');
equal(registry.chooseDistinctSelections(['a'], ['a','a'], 1), ['a','a'], 'single compatible plot is represented without fabrication');
let layout = registry.resolveLayout('two', 1100, 2, 720);
ok(layout.effective === 'two' && layout.reason === 'two-compatible-plots', 'two-up remains active with two compatible plots');
layout = registry.resolveLayout('two', 620, 2, 720);
ok(layout.effective === 'focus' && layout.preferred === 'two' && layout.reason === 'narrow-viewport', 'genuinely narrow viewport retains two-up preference while presenting focus');
layout = registry.resolveLayout('two', 980, 2, 720);
ok(layout.effective === 'two', 'two-up is not collapsed because an internal plot container rerenders narrowly');
layout = registry.resolveLayout('focus', 1400, 5, 720);
ok(layout.effective === 'focus' && layout.reason === 'user-focus', 'explicit focus remains explicit');
registry.registerLab('demo', {
  plots: { trajectory: { label: 'Trajectory' }, residual: { label: 'Residual' } },
  examples: { one: { title: 'One', provenance: 'synthetic teaching' } },
  compatiblePlotIds: ['trajectory', 'residual']
});
const demo = registry.getLab('demo');
ok(demo.plots.trajectory.label === 'Trajectory', 'plot metadata is centrally registered');
ok(demo.examples[0].provenance === 'synthetic teaching', 'example provenance is centrally registered');
equal(demo.compatiblePlotIds, ['trajectory','residual'], 'compatible plot set is stored');

const root = path.join(__dirname, '../..');
const agent = fs.readFileSync(path.join(root, 'src/v72/agent-workspace.js'), 'utf8');
ok(agent.includes('renderAnimatedSpatial'), 'Agent has a dedicated recorded-frame renderer');
ok(agent.includes('startLivePreview') && agent.includes('queueLiveFrame'), 'Agent streams actual worker frames to both live panels');
ok(agent.includes('agent-animation-slider'), 'Agent animation exposes a frame slider');
ok(agent.includes("animation.playButton.textContent=animation.playing?'Pause'"), 'Agent replay exposes explicit play/pause state');
ok(agent.includes('prefers-reduced-motion'), 'Agent animation respects reduced-motion preference');
const agentCore = fs.readFileSync(path.join(root, 'src/core/agent-reference.js'), 'utf8');
ok(agentCore.includes("snapshotCount == null ? 24"), 'Agent core defaults to a useful animation frame count');
const core = require(path.join(root, 'src/core/agent-reference.js'));
const presets = require(path.join(root, 'src/models/agent-presets.js'));
const animationConfig = Object.assign({}, presets.tcell_baseline, {
  size: 8, steps: 23, runs: 2, recordEvery: 1, snapshotCount: 24, initialMode: 'fractions'
});
const animationRunA = core.simulateEnsemble(animationConfig);
const animationRunB = core.simulateEnsemble(animationConfig);
equal(animationRunA.representative.snapshots.length, 24, 'Agent representative run records every requested animation frame');
equal(animationRunA.representative.snapshots.map((frame) => frame.step), animationRunB.representative.snapshots.map((frame) => frame.step), 'animation frame steps are deterministic');
equal(animationRunA.representative.snapshots.map((frame) => frame.grid), animationRunB.representative.snapshots.map((frame) => frame.grid), 'animation lattice frames are deterministic for a fixed seed');
ok(animationRunA.representative.snapshots.every((frame) => frame.grid.length === 64), 'every animation frame preserves lattice size');
ok(animationRunA.representative.snapshots.every((frame) => frame.grid.length === animationConfig.size * animationConfig.size), 'animation frames preserve population capacity');

const pages = ['ode.html','steady.html','stochastic.html','optimization.html','statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html','sciml.html','agent.html','symbolic.html','sensitivity.html','workbench.html'];
pages.forEach((page) => {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  ok(html.includes('src/v72/scientific-registry.js'), `${page} loads central registry`);
});
console.log(`${assertions}/${assertions} v72.18 central registry and Agent animation assertions passed`);
