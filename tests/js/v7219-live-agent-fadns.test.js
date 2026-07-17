'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const math = require('../../assets/vendor/mathjs/math-15.2.0.js');
const Agent = require('../../src/core/agent-reference.js');
const AgentPresets = require('../../src/models/agent-presets.js');
const Steady = require('../../src/core/steady.js');
const SteadyPresets = require('../../src/models/steady-presets.js');
const ODE = require('../../src/core/ode.js');
let checks = 0;
function ok(condition, message) { checks += 1; assert.ok(condition, message); }
function equal(a, b, message) { checks += 1; assert.deepStrictEqual(a, b, message); }
function close(a, b, tol, message) { checks += 1; assert.ok(Math.abs(a - b) <= tol, `${message}: ${a} vs ${b}`); }
function text(file) { return fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8'); }
function compiledResidual(model, override = {}) {
  const names = model.vars.map(entry => entry[0]);
  const params = { ...model.params, ...override };
  const compiled = model.equations.map(expression => math.compile(expression));
  return x => {
    const scope = { ...params };
    names.forEach((name, index) => { scope[name] = x[index]; });
    return compiled.map(expression => Number(expression.evaluate(scope)));
  };
}

// Actual numerical live frames from the representative seeded run.
const preset = { ...AgentPresets.fadns_particle_baseline, size: 12, steps: 18, runs: 3, snapshotCount: 7, recordEvery: 2 };
const frames = [];
const runA = Agent.simulate({ ...preset, captureSnapshots: true }, 12345, {
  liveEvery: 2,
  onFrame: frame => frames.push(frame),
});
ok(frames.length >= 3, 'Agent emits live numerical lattice/population frames during simulation');
equal(frames[0].step, 0, 'live stream starts at step zero');
equal(frames.at(-1).step, preset.steps, 'live stream includes terminal step');
for (const frame of frames) {
  equal(frame.grid.length, preset.size ** 2, `lattice dimensions preserved at frame ${frame.step}`);
  equal(frame.counts.reduce((a, b) => a + b, 0), preset.size ** 2, `population conserved at frame ${frame.step}`);
}
const runB = Agent.simulate({ ...preset, captureSnapshots: true }, 12345);
equal(runA.finalGrid, runB.finalGrid, 'live observer does not alter fixed-seed terminal state');
equal(runA.counts, runB.counts, 'live observer preserves recorded population history');

for (const [name, model] of Object.entries(AgentPresets)) {
  const cfg = { ...model, size: 10, steps: 4, runs: 2, snapshotCount: 3, recordEvery: 1 };
  const first = Agent.simulate(cfg, 77);
  const second = Agent.simulate(cfg, 77);
  equal(first.finalGrid, second.finalGrid, `${name}: fixed seed is reproducible`);
  equal(first.finalCounts.reduce((a, b) => a + b, 0), 100, `${name}: population is conserved`);
  ok(Number.isFinite(first.metrics.spatialAgreement), `${name}: spatial agreement is finite`);
  ok(Number.isFinite(first.metrics.clusterCount), `${name}: cluster count is finite`);
}

const worker = text('src/v72/agent-worker.js');
const workspace = text('src/v72/agent-workspace.js');
ok(worker.includes("post(job, 'live-frame'") && worker.includes('createSimulationRunner') && worker.includes('liveDelayMs'), 'Agent worker paces actual incremental representative frames');
ok(workspace.includes('agent-live-lattice') && workspace.includes('agent-live-population') && workspace.includes('Live · computed step'), 'both visible Agent panels render labelled live numerical evidence');
ok(workspace.includes("'Replay'") && !workspace.includes('current.index = (current.index + 1) %'), 'stored replay is manual and non-looping');

// FADNS enzyme occupancy: algebraic balance and FAS-pool conservation.
const occupancy = SteadyPresets['FADNS enzyme occupancy and CoA sequestration'];
ok(Boolean(occupancy) && occupancy.interpretation === 'algebraic', 'FADNS occupancy is explicitly algebraic');
const occupancyResult = Steady.solveNewton({ residual: compiledResidual(occupancy), x0: occupancy.vars.map(entry => Number(entry[1])), tolerance: 1e-10, maxIterations: 150 });
ok(occupancyResult.converged, 'FADNS occupancy operating point converges');
ok(occupancyResult.residualNorm < 1e-9, 'FADNS occupancy residual meets tolerance');
close(occupancyResult.x.reduce((a, b) => a + b, 0), occupancy.params.Etot, 1e-8, 'FAS occupancy conservation is satisfied');
ok(occupancyResult.x.every(value => value >= -1e-10), 'FADNS occupancy solution is non-negative');

// Full reduced metabolism model: residual evidence, physical declaration, no unsupported 4D spectrum.
const branch = SteadyPresets['Fatty-acid metabolism branch exploration'];
ok(Boolean(branch) && /does not certify root completeness or bistability/.test(branch.narrative), 'full branch example states non-certification boundary');
ok(Boolean(branch.physicalConstraints && branch.physicalConstraints.nonnegative), 'full branch example declares physical constraints');
const branchResult = Steady.solveNewton({ residual: compiledResidual(branch), x0: branch.vars.map(entry => Number(entry[1])), tolerance: 1e-10, maxIterations: 150 });
ok(branchResult.converged && branchResult.residualNorm < 1e-9, 'full fatty-acid equilibrium meets residual tolerance');
ok(branchResult.x.every(value => value >= 0), 'default full-model equilibrium is physically non-negative');
equal(Steady.classifyDynamicStability(branchResult.jacobian).status, 'not-computed', '4D stability is not fabricated');

// Conditional 2D slice: exact local spectrum with an explicit scope boundary.
const slice = SteadyPresets['Fatty-acid conditional MalCoA–FA slice'];
ok(Boolean(slice) && /not the stability of the full four-state model/.test(slice.narrative), 'conditional slice states its stability boundary');
const sliceResult = Steady.solveNewton({ residual: compiledResidual(slice), x0: slice.vars.map(entry => Number(entry[1])), tolerance: 1e-10, maxIterations: 150 });
ok(sliceResult.converged && sliceResult.residualNorm < 1e-8, 'conditional fatty-acid slice converges');
const sliceStability = Steady.classifyDynamicStability(sliceResult.jacobian);
ok(sliceStability.status === 'computed' && sliceStability.eigenvalues.length === 2, 'conditional slice has exact 2x2 local spectrum');
const scanRows = Steady.scanParameter({
  values: Steady.linspace(0.1, 4, 20),
  x0: slice.vars.map(entry => Number(entry[1])),
  variableNames: slice.vars.map(entry => entry[0]),
  residualForParameter: q1 => compiledResidual(slice, { q1 }),
  dynamicInterpretation: true,
  tolerance: 1e-9,
  maxIterations: 150,
});
ok(scanRows.every(row => row.converged && row.residualNorm < 1e-7), 'conditional slice parameter scan retains residual evidence');
ok(scanRows.every(row => row.stability.status === 'computed'), 'conditional slice scan retains sampled local stability evidence');

// Extract authored ODE examples without executing browser initialization.
let appSource = text('src/app.js') + '\n;globalThis.__FOKO_EXAMPLES__ = EXAMPLES; globalThis.__FOKO_CORE_EXAMPLES__ = CORE_EXAMPLES;';
const context = {
  window: { addEventListener() {}, FokoModelIR: null }, document: {}, console,
  URL, Blob: function Blob() {}, setTimeout, clearTimeout, performance: { now: () => 0 }, navigator: {}
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(appSource, context);
const odeExamples = context.__FOKO_EXAMPLES__.ode;
ok(context.__FOKO_CORE_EXAMPLES__.ode.includes('FA metabolism bistability'), 'fatty-acid metabolism is a core ODE example');
ok(context.__FOKO_CORE_EXAMPLES__.ode.includes('FADNS semi-mechanistic'), 'FADNS is a core ODE example');
ok(/not the complete calibrated thesis implementation/.test(odeExamples['FADNS semi-mechanistic'].narrative), 'FADNS ODE states public-reduction boundary');
const fadns = odeExamples['FADNS semi-mechanistic'];
const fadnsCompiled = fadns.eqs.map(expression => math.compile(expression));
const fadnsParams = Object.fromEntries(Object.entries(fadns.params).map(([name, range]) => [name, Number(range[0])]));
const fadnsRhs = (t, y) => {
  const scope = { ...fadnsParams, t };
  fadns.vars.forEach((name, index) => { scope[name] = y[index]; });
  return fadnsCompiled.map(expression => Number(expression.evaluate(scope)));
};
const fadnsResult = ODE.solveWithRhs({ t0: 0, t1: 20, y0: fadns.y0, vars: fadns.vars, method: 'rk45', points: 150, rtol: 1e-6, atol: 1e-9 }, fadnsRhs);
ok(fadnsResult.ok && fadnsResult.Y.every(series => series.every(Number.isFinite)), 'reduced FADNS ODE produces finite browser trajectories');
ok(fadnsResult.Y.slice(-3).every(series => series.at(-1) >= -1e-10), 'terminal C14/C16/C18 products remain non-negative');

console.log(`${checks}/${checks} v72.19 live Agent and FADNS checks passed`);
