'use strict';
const assert = require('assert');
const Importer = require('../../src/core/model-import.js');
const Project = require('../../src/core/project.js');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }

const text = Importer.parse(`name: Logistic growth
dx/dt = r*x*(1-x/K)
x(0) = 2
param r = 0.6 [0.1, 1.2]
param K = 100 [40, 180]
time 0 15 400
method: rk45`, 'growth.ode');
const textProject = Project.normalize(text.raw);
ok(text.format === 'txt' && textProject.model.eqs[0] === 'r*x*(1-x/K)', 'plain-text equations import into a validated project');
ok(textProject.model.y0[0] === 2 && textProject.model.params.K[2] === 180, 'plain-text initial conditions and ranges are retained');

const python = Importer.parse(`FOKO_MODEL = {
  'name': 'Predator prey',
  'vars': ['x', 'y'],
  'eqs': ['a*x-b*x*y', 'd*x*y-c*y'],
  'y0': [10, 5],
  'params': {'a': [1, .2, 2], 'b': [.1, .01, .3], 'c': [1, .2, 2], 'd': [.1, .01, .3]},
  't0': 0, 't1': 30, 'points': 600,
  'metadata': {'reviewed': True, 'note': None}
}`, 'model.py');
ok(python.raw.metadata.reviewed === true && python.raw.metadata.note === null, 'Python data literals parse without executing Python');
ok(Project.normalize(python.raw).model.vars.length === 2, 'Python dictionary becomes an editable two-state project');

const javascript = Importer.parse(`const FOKO_MODEL = {
  name: 'Two-state exchange',
  vars: ['a', 'b'],
  eqs: ['-k*a', 'k*a'],
  y0: [3, 0],
  params: {k: [0.2, 0.05, 0.8]},
  t0: 0, t1: 12, points: 180
};`, 'exchange.js');
ok(javascript.format === 'javascript' && Project.normalize(javascript.raw).model.vars.length === 2, 'JavaScript object literal parses as data without evaluation');

const yaml = Importer.parse(`model:
  name: Damped decay
  vars: [x]
  eqs: ['-k*x']
  y0: [4]
  params: {'k': [0.3, 0.1, 0.8]}
  t0: 0
  t1: 20
  points: 300`, 'decay.yaml');
ok(Project.normalize(yaml.raw).model.params.k[0] === 0.3, 'declarative YAML subset imports inline model collections');

const csv = Importer.parse(`kind,name,value,min,max,equation,initial
equation,x,,,,r*x,2
parameter,r,0.6,0.1,1.2,,
time,t0,0,,,,
time,t1,15,,,,
time,points,180,,,,`, 'growth.csv');
ok(Project.normalize(csv.raw).model.points === 180, 'model-table CSV imports experiment settings');

const json = Importer.parse(JSON.stringify({ model: { vars:['x'], eqs:['-k*x'], y0:[1], params:{k:[1,.1,2]}, t0:0, t1:8, points:120 } }), 'model.json');
ok(Project.normalize(json.raw).model.t1 === 8, 'JSON remains a first-class project input');

ok(Importer.detect('<sedML></sedML>', 'study.sedml') === 'sedml', 'SED-ML is recognized as an experiment format');
ok(Importer.detect('<sedML></sedML>', 'pasted model') === 'sedml', 'pasted SED-ML is recognized without relying on a filename');
assert.throws(() => Importer.parse('<sedML></sedML>', 'study.sedml'), /recognized but not executed/); checks += 1;
assert.throws(() => Importer.parse('<model></model>', 'model.cellml'), /recognized but not executed/); checks += 1;
assert.throws(() => Importer.parse('FOKO_MODEL = __import__("os")', 'unsafe.py'), /dictionary\/object literal/); checks += 1;
assert.throws(() => Importer.parse('const FOKO_MODEL = fetch("https:\/\/example.com")', 'unsafe.js'), /dictionary\/object literal/); checks += 1;
assert.throws(() => Project.normalize(Importer.parse('dx/dt = k*x\nx(0) = Infinity\nparam k = 1', 'bad.ode').raw), /finite/); checks += 1;

const source = require('fs').readFileSync(require('path').resolve(__dirname, '../../src/core/model-import.js'), 'utf8');
ok(!/\beval\s*\(|\bFunction\s*\(/.test(source), 'model importer never evaluates user code');
console.log(`${checks}/${checks} model-interchange checks passed`);
