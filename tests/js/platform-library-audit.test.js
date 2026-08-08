'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const ROOT = path.resolve(__dirname, '../..');

function extractPlotKeys(relative, variable) {
  const text = fs.readFileSync(path.join(ROOT, relative), 'utf8');
  const marker = `const ${variable} = {`;
  const start = text.indexOf(marker);
  assert.ok(start >= 0, `${relative}: ${variable} not found`);
  let index = text.indexOf('{', start) + 1;
  let depth = 1, quote = null, escaped = false;
  for (; index < text.length && depth; index += 1) {
    const ch = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
  }
  const body = text.slice(text.indexOf('{', start) + 1, index - 1);
  const keys = [];
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(/^\s{4}(?:'([^']+)'|"([^"]+)"|([A-Za-z0-9_-]+))\s*:\s*\{/);
    if (match) keys.push(match[1] || match[2] || match[3]);
  }
  return keys;
}

const plots = {
  optimization: extractPlotKeys('src/v72/optimization-workspace.js', 'PLOT_META'),
  steady: extractPlotKeys('src/v72/steady-workspace.js', 'PLOT_META'),
  stochastic: extractPlotKeys('src/v72/stochastic-workspace.js', 'PLOT_META'),
  linearAlgebra: extractPlotKeys('src/v72/linalg-workspace.js', 'PLOTS'),
  machineLearning: extractPlotKeys('src/v72/ml-workspace.js', 'PLOTS'),
  sensitivity: extractPlotKeys('src/v72/sensitivity-workspace.js', 'PLOTS'),
  fitting: extractPlotKeys('src/v72/fitting-workspace.js', 'PLOTS'),
  networks: extractPlotKeys('src/v72/networks-workspace.js', 'PLOTS')
};
const expected = { optimization:39, steady:18, stochastic:12, linearAlgebra:11, machineLearning:18, sensitivity:35, fitting:14, networks:12 };
for (const [lab, count] of Object.entries(expected)) {
  assert.equal(plots[lab].length, count, `${lab}: plot registry depth changed unexpectedly`);
  assert.equal(new Set(plots[lab]).size, plots[lab].length, `${lab}: duplicate plot identifiers`);
}
for (const required of ['parameter-jacobian','state-jacobian','influence-map','ofat','tornado','directional','response-surface','morris-design','sobol-second','sobol-time','sobol-state-total','dependence-mi','dependence-hsic']) {
  assert.ok(plots.sensitivity.includes(required), `Sensitivity plot ${required} is missing`);
}
for (const required of ['pareto','dominance-heatmap','crowding-distance','hypervolume-convergence','objective-correlation','knee-point']) {
  assert.ok(plots.optimization.includes(required), `Optimization multi-objective plot ${required} is missing`);
}
for (const required of ['cma-fitness','cma-distance','cma-mean','cma-sigma','cma-stddev','cma-condition','cma-eigen','cma-diagonal','cma-covariance','cma-paths','cma-population','cma-selection','cma-feasibility','cma-entropy','cma-runtime','cma-evaluations']) {
  assert.ok(plots.optimization.includes(required), `Optimization CMA-ES plot ${required} is missing`);
}
for (const required of ['residual-surface','nullclines','branch','jacobian-sign','stiffness-indicator','implicit-sensitivity']) {
  assert.ok(plots.steady.includes(required), `Steady-State plot ${required} is missing`);
}
const docs = fs.readFileSync(path.join(ROOT, 'USER_GUIDE.md'), 'utf8');
assert.match(docs, /Heatmaps\*\* are a cross-cutting visual form/);
assert.match(docs, /Multi-objective analysis.*inside Optimization/s);
assert.match(docs, /Names without these four parts remain in the Trust roadmap/);
console.log('Platform library audit passed:', Object.entries(plots).map(([name, ids]) => `${name}=${ids.length}`).join(', '), 'with status-aware documentation instead of unsupported plot names.');
