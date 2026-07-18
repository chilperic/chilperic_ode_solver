'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const Agent = require('../../src/core/agent-reference.js');
const Presets = require('../../src/models/agent-presets.js');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function equal(a, b, message) { assert.deepStrictEqual(a, b, message); checks += 1; }
function text(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

ok(Object.keys(Presets).length >= 10, 'Agent includes at least ten curated stress-test presets');
for (const schedule of ['random-with-replacement', 'shuffled-sweep']) {
  const config = Object.assign({}, Presets.voter_consensus, { size: 12, steps: 24, runs: 5, recordEvery: 4, updateSchedule: schedule });
  const a = Agent.simulate(config, 913);
  const b = Agent.simulate(config, 913);
  equal(a.finalGrid, b.finalGrid, schedule + ' is deterministic for a fixed seed');
  ok(a.metrics.clusterCount >= 1, schedule + ' reports connected clusters');
  ok(a.metrics.largestClusterFraction >= 0 && a.metrics.largestClusterFraction <= 1, schedule + ' largest cluster fraction is bounded');
  const intervalEvents = {};
  a.eventSeries.forEach(row => Object.entries(row.counts).forEach(([name, value]) => { intervalEvents[name] = (intervalEvents[name] || 0) + value; }));
  equal(intervalEvents, a.eventTotals, schedule + ' recorded interval events reconcile with run totals');
}
for (const initialization of ['random', 'split', 'central-patch']) {
  const config = Object.assign({}, Presets.sir_local, { size: 12, steps: 4, runs: 2, initialization });
  const run = Agent.simulate(config, 77);
  equal(run.initialCounts.reduce((a,b)=>a+b,0), 144, initialization + ' preserves exact lattice occupancy');
}
const ensemble = Agent.simulateEnsemble(Object.assign({}, Presets.voter_consensus, {size:12,steps:80,runs:8,recordEvery:4}));
ok(typeof ensemble.provenance.configHash === 'string' && ensemble.provenance.configHash.length === 8, 'Agent exports a stable configuration hash');
ok(ensemble.ensemble.absorption.fraction >= 0 && ensemble.ensemble.absorption.fraction <= 1, 'absorption fraction is bounded');
ok(ensemble.ensemble.finalProportions.every(s => Number.isFinite(s.mcse)), 'final-state proportions report Monte Carlo standard errors');
ok(ensemble.runs.every(run => run.terminal && typeof run.terminal.label === 'string'), 'every run has an explicit finite-horizon terminal classification');


const normalized = Agent.validateConfig(Object.assign({}, Presets.voter_consensus, {initialFractions:[52,48]}));
ok(normalized.initialFractionsWereNormalized === true && normalized.initialFractionInputSum === 100, 'Agent records explicit initial-fraction normalization');
equal(Agent.configHash(normalized), Agent.configHash(Agent.validateConfig(Object.assign({}, Presets.voter_consensus, {initialFractions:[0.52,0.48]}))), 'configuration hash reflects the canonical simulated fractions');
assert.throws(() => Agent.validateConfig(Object.assign({}, Presets.voter_consensus, {updateSchedule:'typo'})), /update schedule/); checks += 1;
assert.throws(() => Agent.validateConfig(Object.assign({}, Presets.voter_consensus, {runs:3.5})), /integer/); checks += 1;
assert.throws(() => Agent.validateConfig(Object.assign({}, Presets.tcell_baseline, {params:Object.assign({}, Presets.tcell_baseline.params, {activation:0.8,qDeath:0.4})})), /competing/); checks += 1;
const segregation = Agent.simulate(Object.assign({}, Presets.segregation_threshold, {size:12,steps:20,runs:2}), 112);
equal(segregation.finalCounts[0], segregation.initialCounts[0], 'segregation relocation preserves the exact vacancy count');
const immediate = Agent.simulate(Object.assign({}, Presets.voter_consensus, {size:12,steps:4,runs:2,initialFractions:[1,0]}), 19);
equal(immediate.absorptionStep, 0, 'initially absorbed configurations report terminal step zero');
const terminalEvidence = ensemble.ensemble.absorption.terminalOutcomes;
ok(terminalEvidence.length >= 1 && terminalEvidence.every(o => o.wilson95.low >= 0 && o.wilson95.high <= 1), 'terminal outcomes include bounded Wilson intervals');

const worker = text('src/v72/agent-worker.js');
const workspace = text('src/v72/agent-workspace.js');
const agentHtml = text('agent.html');
const sciml = text('src/sciml-lab.js');
const scimlHtml = text('sciml.html');
const navigation = text('src/navigation.js');
const css = text('styles/v72-lab-shell.css');
ok(worker.includes("importScripts('../core/agent-reference.js?v=72.48.0')"), 'Agent worker loads the pure reference core');
ok(worker.includes("post(job, 'progress'") && worker.includes("post(job, 'complete'"), 'Agent worker reports progress and complete results');
ok(workspace.includes("new Worker('src/v72/agent-worker.js?v=72.48.0')"), 'Agent workspace runs ensembles in a Web Worker');
ok(workspace.includes('cancelRun') && workspace.includes('Run cancelled. No partial ensemble was published.'), 'Agent has explicit cancellation without partial publication');
ok(workspace.includes('hasVisibleEvidence') && workspace.includes('Plotly returned no visible evidence.'), 'Agent verifies visible rendered evidence');
ok(workspace.includes('failRender') && workspace.includes('Computed numerical result retained'), 'Agent retains numerical output when presentation fails');
ok(workspace.includes('plotSerial') && workspace.includes('ticket!==state.plotSerial[side]') && workspace.includes('const ticket=++state.plotSerial[side]'), 'Agent prevents concurrent stale plot renders without coupling selectors to layout state');
ok(agentHtml.includes('agentUpdateSchedule') && agentHtml.includes('agentInitialization'), 'Agent exposes update schedule and initialization');
ok(agentHtml.includes('cancelAgent') && agentHtml.includes('pauseAgent') && agentHtml.includes('agentLiveSpeed'), 'Agent exposes cancel, pause and live-speed controls');
ok(agentHtml.includes('agentAbsorbed') && agentHtml.includes('agentLargestCluster'), 'Agent exposes absorption and spatial-cluster evidence');
ok(!sciml.includes('Math.random()'), 'SciML noise generation no longer uses unseeded Math.random');
ok(sciml.includes('seededRandom') && sciml.includes('noiseSeed'), 'SciML records deterministic noise seed provenance');
ok(scimlHtml.includes('id="sciSeed"'), 'SciML exposes the noise seed control');
ok(navigation.includes('wireCanvasMode') && navigation.includes('fokolab:layout-change'), 'authored labs provide an explicit canvas expansion mode');
ok(css.includes('container-type: inline-size') && css.includes('body.v72-canvas-mode'), 'workspace responsiveness is based on central canvas width');
ok(!fs.existsSync(path.join(ROOT, 'src/app.js.bak-v7146')), 'legacy app backup is excluded from the active release');
console.log(`${checks}/${checks} v72.14 trust and Agent checks passed`);
