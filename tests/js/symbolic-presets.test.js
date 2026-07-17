'use strict';
const S = require('../../src/core/symbolic-reference.js');
const Steady = require('../../src/core/steady.js');
const presets = require('../../src/models/symbolic-presets.js');
let checks = 0, fails = 0;
function truthy(value, message) { checks += 1; if (!value) { fails += 1; console.error('FAIL:', message); } }
function noThrow(fn, message) { checks += 1; try { fn(); } catch (error) { fails += 1; console.error('FAIL:', message, error.message); } }

const keys = Object.keys(presets);
truthy(keys.length >= 12, 'at least twelve curated symbolic examples');
for (const key of keys) {
  const p = presets[key];
  noThrow(() => {
    const expressions = S.parseExpressions(p.expressions.join('\n'));
    const scope = S.parseScope(p.scope);
    const analysis = S.analyze(expressions, p.variables, p.selectedExpression || 0, p.derivativeVariable || p.variables[0], scope);
    truthy(expressions.length >= 1, key + ' expression count');
    truthy(analysis.jacobian.length === expressions.length, key + ' Jacobian rows');
    truthy(analysis.jacobian[0].length === p.variables.length, key + ' Jacobian columns');
    truthy(analysis.evaluation.every(Number.isFinite), key + ' finite scope evaluation');
    if (expressions.length === p.variables.length && p.variables.length <= 3) {
      const residual = x => {
        const local = Object.assign({}, scope);
        p.variables.forEach((name, index) => { local[name] = x[index]; });
        return expressions.map(expr => S.evaluate(expr, local));
      };
      const x0 = p.variables.map(name => scope[name]);
      const result = Steady.solveNewton({ residual, x0, tolerance: 1e-8, maxIterations: 120 });
      truthy(Array.isArray(result.x) && result.x.length === p.variables.length, key + ' numeric root result shape');
      truthy(Number.isFinite(result.residualNorm), key + ' finite root residual evidence');
    }
  }, key + ' parses and evaluates');
}
console.log((checks - fails) + '/' + checks + ' symbolic preset checks passed');
if (fails) process.exit(1);
