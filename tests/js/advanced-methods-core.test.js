'use strict';
const assert = require('assert');
const Core = require('../../src/core/advanced-methods.js');
let checks = 0;
function check(condition, message) { checks += 1; assert.ok(condition, message); }

check(Core.presets.length >= 12, 'advanced lab exposes at least 12 runnable examples');
check(new Set(Core.presets.map(preset => preset.module)).size === 8, 'all eight advanced-method families are runnable');
for (const preset of Core.presets) {
  const first = Core.run(preset.module, preset.params);
  const second = Core.run(preset.module, preset.params);
  check(first && first.metrics && Object.keys(first.metrics).length > 0, `${preset.id}: metrics are computed`);
  check(Array.isArray(first.plots) && first.plots.length >= 2, `${preset.id}: at least two distinct plots are computed`);
  check(first.plots.every(plot => Array.isArray(plot.traces) && plot.layout && plot.evidence), `${preset.id}: plot evidence contract is complete`);
  check(typeof first.limitations === 'string' && first.limitations.length > 40, `${preset.id}: scientific boundary is explicit`);
  check(JSON.stringify(first) === JSON.stringify(second), `${preset.id}: seeded/deterministic rerun is reproducible`);
}
const genomic = Core.run('genomic', Core.presets.find(p => p.module === 'genomic').params);
check(genomic.table.length >= 20 && Number.isFinite(genomic.metrics.mean_fst), 'genomic reference computes per-locus FST evidence');
const pde = Core.run('spatial-pde', Core.presets.find(p => p.module === 'spatial-pde').params);
check(pde.metrics.cfl_ratio < 0.5, 'explicit PDE reference enforces its CFL stability bound');
const bayes = Core.run('bayesian', Core.presets[0].params);
check(bayes.metrics.posterior_mean > 0 && bayes.metrics.posterior_mean < 1, 'Bayesian reference returns a valid posterior mean');
check(bayes.plots.length >= 5, 'Bayesian reference exposes posterior, likelihood, predictive, CDF, and log-geometry views');
check(Core.presets.filter(p => p.module === 'bayesian').length >= 4, 'Bayesian catalogue includes prior conflict and rare-event examples');
for (const module of ['design','standards','continuation','spatial-pde','sde','genomic','study']) check(Core.run(module, Core.presets.find(p => p.module === module).params).plots.length >= 3, `${module}: advanced visualization depth is at least three plots`);
console.log(`${checks}/${checks} advanced-methods checks passed`);
