/* Foko Lab home-page worker demos.
 * Only bounded, seeded calls into existing scientific cores are allowed here.
 */
'use strict';
importScripts(
  '../assets/vendor/mathjs/math-15.2.0.js?v=72.47.0',
  'core/stochastic.js',
  'models/stochastic-presets.js',
  'core/agent-reference.js',
  'models/agent-presets.js'
);

function compileStochasticPreset(preset) {
  if (!preset || !Array.isArray(preset.stateNames) || !Array.isArray(preset.reactions)) {
    throw new Error('The bundled stochastic preset is incomplete.');
  }
  if (!self.math || typeof self.math.compile !== 'function') {
    throw new Error('The stochastic expression compiler is unavailable.');
  }
  const names = preset.stateNames.slice();
  const params = Object.assign({}, preset.params || {});
  const allowed = new Set(names.concat(Object.keys(params), ['pi', 'e']));
  const functionNames = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp', 'log', 'sqrt', 'abs', 'min', 'max', 'pow', 'floor', 'ceil', 'round']);
  const reactions = preset.reactions.map(function (reaction, reactionIndex) {
    const expressionText = String(reaction.propensity || '').trim();
    if (!expressionText) throw new Error('Reaction ' + (reaction.name || reactionIndex + 1) + ' requires a propensity expression.');
    const parsed = self.math.parse(expressionText);
    const unsupported = [];
    parsed.traverse(function (node) {
      if (node.isSymbolNode && !allowed.has(node.name) && !functionNames.has(node.name)) unsupported.push(node.name);
    });
    if (unsupported.length) throw new Error('Unsupported propensity symbol(s): ' + Array.from(new Set(unsupported)).join(', ') + '.');
    const compiled = parsed.compile();
    return {
      name: reaction.name,
      change: names.map(function (name) { return Number(reaction.change && reaction.change[name]) || 0; }),
      propensity: function (state) {
        const scope = Object.assign({}, params);
        names.forEach(function (name, index) { scope[name] = state[index]; });
        return Number(compiled.evaluate(scope));
      }
    };
  });
  return { stateNames: names, initial: preset.initial.slice(), params: params, reactions: reactions };
}

function stochasticDemo() {
  const preset = self.FokoStochasticPresets['Stochastic SIR epidemic'];
  const result = self.FokoStochasticCore.simulateEnsemble({
    model: compileStochasticPreset(preset),
    t0: 0,
    t1: 52,
    points: 96,
    runs: 3,
    seed: 2718,
    maxEvents: 10000
  });
  return {
    times: result.times,
    paths: result.trajectories.map(function (trajectory) { return trajectory[1]; }),
    algorithm: result.algorithm,
    seed: result.seed,
    runs: result.runs,
    events: result.eventCounts.reduce(function (sum, value) { return sum + value; }, 0),
    truncatedRuns: result.truncatedRuns,
    boundary: 'Three seeded paths are a qualitative demonstration, not an uncertainty estimate.'
  };
}

function reducedAgentConfig(presetName, seed) {
  const preset = self.FokoAgentPresets[presetName] || self.FokoAgentPresets.tcell_baseline;
  return Object.assign({}, preset, {
    size: 14,
    steps: 28,
    runs: 1,
    seed: seed || preset.seed,
    recordEvery: 2,
    snapshotCount: 7,
    captureSnapshots: true
  });
}

function agentDemo(presetName, seed) {
  const config = reducedAgentConfig(presetName, seed);
  const result = self.FokoAgentReference.simulate(config, config.seed);
  return {
    size: config.size,
    steps: config.steps,
    seed: result.seed,
    states: result.states,
    colors: result.colors,
    snapshots: result.snapshots,
    finalCounts: result.finalCounts,
    terminal: result.terminal,
    algorithm: 'random-sequential lattice updates',
    boundary: config.note
  };
}

self.onmessage = function (event) {
  const payload = event.data || {};
  try {
    let result;
    if (payload.task === 'stochastic') result = stochasticDemo();
    else if (payload.task === 'agent') result = agentDemo(payload.preset || 'tcell_baseline', payload.seed);
    else throw new Error('Unknown home demo worker task.');
    self.postMessage({ id: payload.id, ok: true, task: payload.task, result: result });
  } catch (error) {
    self.postMessage({ id: payload.id, ok: false, task: payload.task, error: error && error.message ? error.message : String(error) });
  }
};
