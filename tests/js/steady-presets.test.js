'use strict';
const math = require('../../assets/vendor/mathjs/math-15.2.0.js');
const Core = require('../../src/core/steady.js');
const Presets = require('../../src/models/steady-presets.js');
let checks = 0;
let failures = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) { failures += 1; console.error(`FAIL: ${message}`); }
}
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

for (const [name, model] of Object.entries(Presets)) {
  check(model.vars.length === model.equations.length, `${name}: equation count matches unknown count`);
  const x0 = model.vars.map(entry => Number(entry[1]));
  const values = compiledResidual(model)(x0);
  check(values.length === x0.length && values.every(Number.isFinite), `${name}: expressions compile and evaluate finitely with mathjs 15`);
}

for (const [name, model] of Object.entries(Presets)) {
  const result = Core.solveNewton({ residual: compiledResidual(model), x0: model.vars.map(entry => Number(entry[1])), tolerance: 1e-9, maxIterations: 120 });
  check(result.converged, `${name}: default example meets residual tolerance`);
  check(Number.isFinite(result.residualNorm) && result.residualNorm <= 1e-9, `${name}: default example reports a finite residual within tolerance`);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exitCode = 1;
