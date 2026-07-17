'use strict';

const math = require('../../assets/vendor/mathjs/math-15.2.0.js');
const Presets = require('../../src/models/stochastic-presets.js');
const Stochastic = require('../../src/core/stochastic.js');
const ODE = require('../../src/core/ode.js');

let checks = 0;
let failures = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}

function compileExpression(expression, stateNames, params, label) {
  const allowed = new Set(stateNames.concat(Object.keys(params), ['pi', 'e']));
  const functionNames = new Set([
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp', 'log', 'sqrt',
    'abs', 'min', 'max', 'pow', 'floor', 'ceil', 'round',
  ]);
  const node = math.parse(expression);
  const unsupported = [];
  node.traverse((child) => {
    if (child.isSymbolNode && !allowed.has(child.name) && !functionNames.has(child.name)) {
      unsupported.push(child.name);
    }
  });
  if (unsupported.length) {
    throw new Error(`${label} contains unsupported symbols: ${Array.from(new Set(unsupported)).join(', ')}`);
  }
  if (/(^|[^A-Za-z0-9_])t([^A-Za-z0-9_]|$)/.test(String(expression))) {
    throw new Error(`${label} contains explicit time t`);
  }
  return math.compile(expression);
}

function compilePreset(preset) {
  const stateNames = preset.stateNames.slice();
  const params = Object.assign({}, preset.params);
  const reactions = preset.reactions.map((reaction) => {
    const expression = compileExpression(reaction.propensity, stateNames, params, `propensity ${reaction.name}`);
    return {
      name: reaction.name,
      change: stateNames.map((name) => Number(reaction.change[name]) || 0),
      propensity(x) {
        const scope = Object.assign({}, params);
        stateNames.forEach((name, index) => { scope[name] = x[index]; });
        return Number(expression.evaluate(scope));
      },
    };
  });
  return { stateNames, initial: preset.initial.slice(), params, reactions };
}

function compileMeanField(preset) {
  const stateNames = preset.stateNames.slice();
  const params = Object.assign({}, preset.params);
  const expressions = preset.meanField.map((expression, index) =>
    compileExpression(expression, stateNames, params, `mean-field equation ${index + 1}`));
  return function rhs(_time, x) {
    const scope = Object.assign({}, params);
    stateNames.forEach((name, index) => { scope[name] = x[index]; });
    return expressions.map((expression) => Number(expression.evaluate(scope)));
  };
}

(function validatePresetCollection() {
  const entries = Object.entries(Presets);
  check(entries.length >= 13, 'at least thirteen curated stochastic presets are present');

  entries.forEach(([name, preset], presetIndex) => {
    check(preset.interpretation === 'time-homogeneous CTMC', `${name}: interpretation is explicit`);
    check(Array.isArray(preset.stateNames) && preset.stateNames.length > 0, `${name}: has state names`);
    check(new Set(preset.stateNames).size === preset.stateNames.length, `${name}: state names are unique`);
    check(preset.initial.length === preset.stateNames.length, `${name}: initial state dimension matches`);
    check(preset.initial.every(Number.isInteger) && preset.initial.every((value) => value >= 0), `${name}: initial counts are non-negative integers`);
    check(Array.isArray(preset.reactions) && preset.reactions.length > 0, `${name}: has reactions`);
    check(Array.isArray(preset.meanField) && preset.meanField.length === preset.stateNames.length, `${name}: mean-field dimension matches`);
    check(preset.stateNames.includes(preset.settings.variable), `${name}: selected variable exists`);
    check(typeof preset.scientificNote === 'string' && preset.scientificNote.length > 30, `${name}: scientific limitation note is substantive`);

    let model;
    try {
      model = compilePreset(preset);
      check(true, `${name}: all propensity expressions compile`);
    } catch (error) {
      check(false, `${name}: propensity compilation failed: ${error.message}`);
      return;
    }

    model.reactions.forEach((reaction) => {
      const value = reaction.propensity(model.initial.slice());
      check(Number.isFinite(value) && value >= 0, `${name}/${reaction.name}: initial propensity is finite and non-negative`);
      check(reaction.change.length === model.stateNames.length, `${name}/${reaction.name}: stoichiometry dimension matches`);
      check(reaction.change.every(Number.isInteger), `${name}/${reaction.name}: stoichiometry is integer-valued`);
    });

    const shortHorizon = Math.min(Number(preset.settings.t1), 3);
    let ensemble;
    try {
      ensemble = Stochastic.simulateEnsemble({
        model,
        t0: Number(preset.settings.t0),
        t1: shortHorizon,
        points: 25,
        runs: 6,
        seed: Number(preset.settings.seed) + presetIndex,
        maxEvents: 100000,
      });
      check(true, `${name}: seeded direct-SSA smoke run completes`);
    } catch (error) {
      check(false, `${name}: direct-SSA smoke run failed: ${error.message}`);
      return;
    }

    check(ensemble.algorithm === 'Gillespie direct SSA', `${name}: algorithm provenance is direct SSA`);
    check(ensemble.scope.includes('Time-homogeneous CTMC'), `${name}: scope is explicit`);
    check(ensemble.truncatedRuns === 0, `${name}: smoke trajectories are not event-censored`);
    check(ensemble.trajectories.length === 6, `${name}: requested run count is retained`);
    check(ensemble.summaries.length === preset.stateNames.length, `${name}: one summary per state`);
    check(ensemble.trajectories.every((trajectory) => trajectory.length === preset.stateNames.length), `${name}: trajectory state dimension matches`);
    check(
      ensemble.trajectories.every((trajectory) => trajectory.every((series) => series.every((value) => Number.isInteger(value) && value >= 0))),
      `${name}: sampled SSA states remain non-negative integers`,
    );

    let deterministic;
    try {
      deterministic = ODE.solveWithRhs({
        t0: Number(preset.settings.t0),
        t1: shortHorizon,
        points: 25,
        y0: preset.initial.slice(),
        vars: preset.stateNames.slice(),
        params: Object.assign({}, preset.params),
        method: 'rk45',
        rtol: 1e-7,
        atol: 1e-9,
      }, compileMeanField(preset));
      check(Boolean(deterministic && deterministic.ok), `${name}: curated mean-field ODE computes`);
    } catch (error) {
      check(false, `${name}: mean-field ODE failed: ${error.message}`);
      return;
    }

    check(deterministic.vars.length === preset.stateNames.length, `${name}: mean-field variable dimension matches`);
    check(deterministic.T.length === 25, `${name}: mean-field output has requested sampling grid`);
    check(deterministic.Y.every((series) => series.every(Number.isFinite)), `${name}: mean-field output is finite`);
  });
})();

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exitCode = 1;
