'use strict';
const math = require('../../assets/vendor/mathjs/math-15.2.0.js');
const Core = require('../../src/core/optimization.js');
const Presets = require('../../src/models/optimization-presets.js');
let checks = 0;
let failures = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  }
}
function compilePreset(preset) {
  const names = preset.variables.map(variable => variable.name);
  function compiled(expression) {
    const node = math.compile(expression);
    return x => {
      const scope = {};
      names.forEach((name, index) => { scope[name] = x[index]; });
      return Number(node.evaluate(scope));
    };
  }
  return {
    variables: preset.variables.map(variable => Object.assign({}, variable)),
    sense: preset.sense,
    objective: compiled(preset.objective),
    secondaryObjective: preset.objective2 ? compiled(preset.objective2) : null,
    inequalities: (preset.inequalities || []).map(compiled),
    equalities: (preset.equalities || []).map(compiled),
  };
}

for (const [name, preset] of Object.entries(Presets)) {
  check(Array.isArray(preset.variables) && preset.variables.length > 0, `${name}: variables declared`);
  check(typeof preset.objective === 'string' && preset.objective.length > 0, `${name}: objective declared`);
  check(typeof preset.scientificNote === 'string' && preset.scientificNote.length > 20, `${name}: scientific limitation note declared`);
  try {
    const problem = compilePreset(preset);
    const initial = problem.variables.map(variable => variable.start);
    check(Number.isFinite(problem.objective(initial)), `${name}: objective is finite at start`);
    check(problem.inequalities.every(fn => Number.isFinite(fn(initial))), `${name}: inequalities are finite at start`);
    check(problem.equalities.every(fn => Number.isFinite(fn(initial))), `${name}: equalities are finite at start`);
    const result = Core.optimise(problem, {
      algorithm: preset.algorithm || 'coordinate',
      maxIterations: 35,
      populationSize: 18,
      starts: 6,
      seed: 1729,
      penalty: 1000,
      feasibilityTolerance: 1e-4,
      recordLimit: 4000,
    });
    check(Number.isFinite(result.candidate.objective), `${name}: smoke run returns finite objective`);
    check(result.evaluations > 0, `${name}: smoke run records evaluations`);
    check(result.globalOptimality === 'not established', `${name}: smoke run preserves optimality boundary`);
  } catch (error) {
    check(false, `${name}: compilation/smoke run failed — ${error.message}`);
  }
}

const cmaApplications = Object.values(Presets).filter(preset => preset.algorithm === 'cma_es' && String(preset.family).startsWith('CMA-ES application'));
check(cmaApplications.length === 15, 'exactly 15 visible CMA-ES application surrogates are included');
check(cmaApplications.every(preset => preset.title.startsWith('CMA-ES · ')), 'CMA-ES application titles are searchable and consistently named');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exitCode = 1;
