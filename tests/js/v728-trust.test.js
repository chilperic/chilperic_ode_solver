'use strict';
const fs = require('fs');
global.FokoDataCore = require('../../src/core/data.js');
require('../../src/models/statistics-presets.js');
const D = global.FokoDataCore;
const presets = global.FokoStatisticsPresets;
let checks = 0;
let failures = 0;
function ok(condition, label) {
  checks += 1;
  if (!condition) { failures += 1; console.error('FAIL:', label); }
}
const names = Object.keys(presets);
ok(names.length >= 18, 'at least 18 curated Statistics examples');
const categories = new Set();
names.forEach((name) => {
  const preset = presets[name];
  categories.add(preset.category || preset.family);
  ok(typeof preset.title === 'string' && preset.title.length > 5, `${name}: title`);
  ok(typeof preset.narrative === 'string' && preset.narrative.length > 20, `${name}: narrative`);
  ok(typeof preset.scientificNote === 'string' && preset.scientificNote.length > 30, `${name}: scientific boundary`);
  const dataset = D.parseDataset(preset.data, { delimiter: 'auto', header: 'auto' });
  ok(dataset.rows.length >= 8, `${name}: non-trivial row count`);
  ok(dataset.columns.length >= 2, `${name}: at least two columns`);
});
ok(categories.size >= 8, 'Statistics library covers at least eight question families');

const sciml = fs.readFileSync(require.resolve('../../src/sciml-lab.js'), 'utf8');
ok(sciml.includes("pinn:['reference_trajectory']"), 'PINN browser plot registry is reference-only');
ok(sciml.includes("operator:['reference_trajectory']"), 'operator browser plot registry is reference-only');
ok(sciml.includes('FokoSINDy.paretoSweep'), 'SINDy Pareto plot uses the real core');
ok(!sciml.includes('FokoHonesty'), 'SciML no longer depends on an absent honesty registry');
ok(!sciml.includes("'pde_residual'"), 'no decorative PDE residual plot key');
ok(!sciml.includes("'speedup'"), 'no fabricated speedup plot key');

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
