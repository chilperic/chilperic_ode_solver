'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'src/models/scientific-example-catalog.js'), 'utf8');
const context = { globalThis: null, window: null };
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(source, context);
const data = context.FokoScientificExampleCatalog;
assert.ok(Array.isArray(data), 'catalog is an array');
assert.ok(data.length >= 180, `catalog retains broad scientific coverage (got ${data.length})`);

const requiredFields = ['title', 'lab', 'family', 'provenance', 'status', 'href', 'summary'];
const titles = new Set();
let checks = 2;
for (const item of data) {
  for (const field of requiredFields) {
    checks += 1;
    assert.ok(String(item[field] || '').trim(), `${item.title || 'unnamed'}: ${field} is present`);
  }
  checks += 1;
  assert.ok(!titles.has(item.title), `catalog title is unique: ${item.title}`);
  titles.add(item.title);
  const page = item.href.split(/[?#]/, 1)[0];
  checks += 1;
  assert.ok(fs.existsSync(path.join(root, page)), `${item.title}: target page exists (${page})`);
  if (/thermoplant|photosynthesis|c3.?c4/i.test(`${item.title} ${item.summary}`)) {
    checks += 1;
    assert.ok(!/(?:ode|optimization|workbench|sciml)\.html/.test(item.href), `${item.title}: protected plant research is not exposed as a runnable public demo`);
  }
}

const byLab = data.reduce((out, item) => { out[item.lab] = (out[item.lab] || 0) + 1; return out; }, {});
for (const [lab, minimum] of Object.entries({
  ODE: 20, Stochastic: 12, 'Steady State': 18, Optimization: 12,
  Agent: 15, SciML: 18, Symbolic: 10, Statistics: 12,
  'Machine Learning': 10, Fitting: 6, 'Linear Algebra': 7, Networks: 7,
  'Population Genetics': 13, 'Advanced Methods': 12, Bifurcation: 6,
  'Evolution Landscapes': 12, 'AI Modeling': 12
})) {
  checks += 1;
  assert.ok((byLab[lab] || 0) >= minimum, `${lab}: catalog retains at least ${minimum} examples/views`);
}

console.log(`${checks}/${checks} example-catalog integrity checks passed (${data.length} entries)`);
