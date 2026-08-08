'use strict';
const assert = require('assert');
const Project = require('../../src/core/project.js');
const IR = require('../../src/core/model-ir.js');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
const project = Project.create({ name: 'Growth study', model: { name:'Logistic',vars:['x'],eqs:['r*x*(1-x/K)'],y0:[2],params:{r:[0.6,0.1,1.2],K:[100,40,180]},t0:0,t1:15,points:180 } });
ok(project.schema === 'foko.project/1', 'project schema is explicit');
ok(project.model.params.r[0] === 0.6, 'nominal parameter is retained');
const ir = Project.toModelIR(project);
ok(ir.schema === 'foko.model-ir/1' && ir.states[0].initial === 2, 'project exports Model IR');
const roundTrip = Project.fromModelIR(ir, IR);
ok(roundTrip.model.eqs[0] === project.model.eqs[0], 'Model IR round trip preserves equation');
ok(Project.appendRun(project, { kind:'simulation', diagnostics:{accepted:10} }).runs.length === 1, 'run records append immutably');
assert.throws(() => Project.normalizeModel({vars:['x'],eqs:['a*x'],y0:[],params:{a:[1,0,2]}}), /initial value/); checks += 1;
assert.throws(() => Project.normalizeModel({vars:['x'],eqs:['a*x'],y0:[1],params:{a:[3,0,2]}}), /minimum/); checks += 1;
console.log(`${checks}/${checks} project-core checks passed`);
