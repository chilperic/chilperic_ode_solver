'use strict';
const fs = require('fs');
const path = require('path');
const ODE = require('../../src/core/ode.js');
const Steady = require('../../src/core/steady.js');
const Fitting = require('../../src/core/fitting.js');
const Models = require('../../src/models/home-research-models.js');
const Agent = require('../../src/core/agent-reference.js');
const AgentPresets = require('../../src/models/agent-presets.js');
let checks = 0;
function check(condition, message) { checks += 1; if (!condition) throw new Error(message); }

(function researchModelsRemainCoreComputed() {
  const fatty = Models.fattyAcidMetabolism;
  const fattyResult = ODE.solveWithRhs(Object.assign({}, fatty.config, { params: fatty.parameters }), fatty.rhs);
  check(fattyResult.ok, 'fatty-acid home research result is computed by FokoODECore');
  const fadns = Models.fadnsReduced;
  const fadnsResult = ODE.solveWithRhs(Object.assign({}, fadns.config, { params: fadns.parameters }), fadns.rhs);
  check(fadnsResult.ok, 'FADNS home research result is computed by FokoODECore');
  check(fadnsResult.Y.length === 10, 'FADNS reduced result exposes ten declared states');
  check(fadnsResult.Y.every(row => row.every(Number.isFinite)), 'FADNS reduced result is finite');
})();

(function steadyDemoFindsThreeCubicRoots() {
  const a = 0.35;
  const residual = x => [x[0] * (1 - x[0]) * (x[0] - a)];
  const result = Steady.solveMultiStart({ residual, starts: [[-0.1],[0.1],[0.5],[0.9],[1.15]], tolerance: 1e-10, maxIterations: 80 });
  check(result.uniqueSolutions.length === 3, 'steady home demo finds three distinct cubic roots');
})();

(function misleadingFitTriggersIdentifiabilityWarning() {
  const pairs = [[0.05,0.020],[0.10,0.039],[0.18,0.068],[0.28,0.101],[0.40,0.139],[0.55,0.181],[0.72,0.224],[0.90,0.266]];
  const result = Fitting.fit(pairs, 'michaelis', { initialParams: [1,2], computeProfile: true, profilePoints: 25, profileSpanSE: 4, bootstrapReplicates: 0 });
  check(result.r2 > 0.99, 'misleading fitting demo has a visually strong R²');
  check(result.identifiability.practicalVerdict === 'practical non-identifiability likely', 'misleading fitting demo triggers the intended identifiability warning');
  check(result.parameterCorrelation.pairs[0].absolute > 0.99, 'Vmax and Km are strongly correlated in the bundled demo');
})();

(function homeOdeDemoIsRobustAndRoutable() {
  const source = fs.readFileSync(path.join(__dirname, '../../src/home-demo-reel.js'), 'utf8');
  const home = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
  check(source.includes("root.FokoODECore || await loadScript('src/core/ode.js', 'FokoODECore')"), 'home ODE demo can lazy-load the canonical core');
  check(source.includes('ODE demo did not produce a valid trajectory'), 'home ODE demo validates the returned trajectory');
  check(home.includes('ode.html?module=ode&amp;example=Lorenz&amp;autorun=1'), 'home ODE card opens a runnable Lorenz example');
})();

(function homeStochasticDemoCompilesPresetIntoCoreContract() {
  const worker = fs.readFileSync(path.join(__dirname, '../../src/home-demo-worker.js'), 'utf8');
  check(worker.includes('compileStochasticPreset'), 'home stochastic worker compiles preset expressions before calling the core');
  check(worker.includes('model: compileStochasticPreset(preset)'), 'home stochastic demo passes the compiled model contract');
  check(worker.includes("math-15.2.0.js"), 'home stochastic worker loads the local expression compiler');
})();

(function tcellRerunsAreVisibleReproducibleRealizations() {
  const source = fs.readFileSync(path.join(__dirname, '../../src/home-demo-reel.js'), 'utf8');
  check(source.includes('const demoTokens = new Map()'), 'home reruns retain a per-card stale-run token');
  check(source.includes('cancelActiveWorker(runKey)'), 'home reruns cancel a superseded worker');
  check(source.includes('cancelAnimation(canvasId)'), 'home reruns cancel a superseded canvas animation');
  check(source.includes('const seed = baseSeed + attempt'), 'Agent reruns advance through a deterministic seed sequence');
  check(source.includes("force ? 'Recomputing…' : 'Computing…'"), 'reruns expose visible recomputation state');

  function reduced(seed) {
    const config = Object.assign({}, AgentPresets.tcell_baseline, {
      size: 14, steps: 28, runs: 1, seed, recordEvery: 2,
      snapshotCount: 7, captureSnapshots: true
    });
    return Agent.simulate(config, seed);
  }
  const first = reduced(202611);
  const second = reduced(202612);
  check(first.seed === 202611 && second.seed === 202612, 'T-cell rerun seeds are explicit');
  check(first.snapshots.length === 7 && second.snapshots.length === 7, 'T-cell reruns retain visible snapshot sequences');
  check(JSON.stringify(first.finalGrid) !== JSON.stringify(second.finalGrid), 'successive deterministic seeds produce distinct visible T-cell realizations');
})();

(function noDecorativeHomeCurves() {
  const source = fs.readFileSync(path.join(__dirname, '../../src/home-demo-reel.js'), 'utf8');
  const worker = fs.readFileSync(path.join(__dirname, '../../src/home-demo-worker.js'), 'utf8');
  ['Math.random(', 'Math.sin(', 'hardcodedSeries', 'cachedTrajectory'].forEach(token => {
    check(!source.includes(token), 'home demo source excludes ' + token);
    check(!worker.includes(token), 'home worker source excludes ' + token);
  });
})();

console.log(`home-demo-reel.test.js: ${checks} assertions passed`);
