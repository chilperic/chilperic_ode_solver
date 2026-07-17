'use strict';
const fs = require('fs');
const path = require('path');
const Taxonomy = require('../../src/models/analysis-taxonomy.js');
const Presets = require('../../src/models/optimization-presets.js');
let checks = 0;
let failures = 0;
function check(condition, message) {
  checks += 1;
  if (!condition) { failures += 1; console.error(`FAIL: ${message}`); }
}
const allowedStatuses = new Set(['browser-computed', 'derived-browser', 'limited-browser', 'export-only', 'unavailable']);
const exact15 = [
  ['optimization plots', Taxonomy.optimization.plots],
  ['optimization problems', Taxonomy.optimization.problems],
  ['multi-objective plots', Taxonomy.multiObjective.plots],
  ['multi-objective problems', Taxonomy.multiObjective.problems],
  ['steady-state plots', Taxonomy.steadyState.plots],
  ['steady-state problems', Taxonomy.steadyState.problems],
];
exact15.forEach(([label, entries]) => check(entries.length === 15, `${label} contains exactly 15 entries`));
const ids = [];
exact15.forEach(([label, entries]) => entries.forEach(entry => {
  ids.push(`${label}:${entry.id}`);
  check(Boolean(entry.id && entry.label), `${label}: every entry has id and label`);
  check(allowedStatuses.has(entry.status), `${label}: ${entry.label} has a supported status`);
  if (['export-only', 'unavailable'].includes(entry.status)) check(Boolean(entry.reason || entry.scope), `${label}: ${entry.label} explains its boundary`);
}));
check(new Set(ids).size === ids.length, 'taxonomy ids are unique within their section namespace');
check(Object.keys(Presets).length >= 15, 'Optimization Lab exposes at least 15 runnable curated presets');
['Beale function', 'Booth function', 'Bi-objective Rosenbrock–Rastrigin', 'Tracking vs control effort'].forEach(name => check(Boolean(Presets[name]), `${name} preset is present`));
const multiObjectivePresets = Object.values(Presets).filter(preset => Boolean(preset.objective2));
check(multiObjectivePresets.length >= 7, 'Optimization Lab retains a representative multi-objective preset set');
Taxonomy.optimization.problems.concat(Taxonomy.multiObjective.problems).forEach(entry => {
  if (entry.preset) check(Boolean(Presets[entry.preset]), `${entry.label} maps to an existing preset`);
});
const source = fs.readFileSync(path.join(__dirname, '../../src/v72/optimization-workspace.js'), 'utf8');
['dominance-heatmap', 'crowding-distance', 'hypervolume-convergence', 'objective-correlation', 'knee-point', 'local-sensitivity'].forEach(id => check(source.includes(`'${id}'`), `Optimization runtime implements ${id}`));
const steady = fs.readFileSync(path.join(__dirname, '../../src/v72/steady-workspace.js'), 'utf8');
['jacobian-sign', 'stiffness-indicator', 'implicit-sensitivity'].forEach(id => check(steady.includes(`'${id}'`), `Steady-State runtime implements ${id}`));
const json = JSON.parse(fs.readFileSync(path.join(__dirname, '../../ANALYSIS_TAXONOMY.json'), 'utf8'));
check(JSON.stringify(json) === JSON.stringify(Taxonomy), 'JSON and JavaScript taxonomy representations are identical');
const docs = fs.readFileSync(path.join(__dirname, '../../docs.html'), 'utf8');
check(docs.includes('analysisTaxonomyDocs') && docs.includes('ANALYSIS_TAXONOMY.json'), 'Documentation renders and links the taxonomy');
console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) process.exitCode = 1;
