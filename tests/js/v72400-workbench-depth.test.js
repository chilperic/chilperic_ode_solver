'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Workbench = require('../../src/workbench/adapters.js');
let checks = 0;
function ok(value, label) { assert.ok(value, label); checks += 1; }

const ode = Workbench.get('ode');
['lorenz','fitzhugh','brusselator','stiff_relaxation'].forEach(id => {
  const result = ode.runPreset(id);
  ok(result.plots.length >= 5, 'ODE ' + id + ' exposes at least five distinct views');
  ok(new Set(result.plots.map(plot => plot.id)).size === result.plots.length, 'ODE ' + id + ' plot ids remain distinct');
  ok(result.provenance.some(line => /one result/i.test(line)), 'ODE ' + id + ' states that views share one result');
});
const lorenz = ode.runPreset('lorenz');
ok(lorenz.plots.some(plot => plot.id === 'phase-3d' && plot.data[0].type === 'scatter3d'), 'Lorenz exposes a real 3D phase trajectory');
ok(lorenz.plots.some(plot => plot.id === 'derivative-norm'), 'Lorenz exposes derivative magnitude');

const stochastic = Workbench.get('stochastic').runPreset('gene_expression');
ok(stochastic.plots.length >= 5, 'gene expression exposes five stochastic views');
ok(stochastic.plots.some(plot => plot.id === 'fano'), 'gene expression exposes Fano-factor evidence');
ok(stochastic.plots.some(plot => plot.id === 'joint-final'), 'gene expression exposes joint final-state evidence');

const optimization = Workbench.get('optimization').runPreset('rastrigin');
ok(optimization.plots.some(plot => plot.id === 'landscape' && plot.data[0].type === 'contour'), 'Rastrigin exposes an objective landscape');
ok(optimization.plots.some(plot => plot.id === 'objective-distribution'), 'Rastrigin exposes the evaluated objective distribution');



const workspace = fs.readFileSync(path.join(__dirname, '../../src/v72/workbench-workspace.js'), 'utf8');
ok(workspace.includes('Registry.swapDistinctSelection'), 'Workbench controller delegates plot selection to the tested transition');
let selection = Workbench.swapDistinctSelection([0, 1], 0, 1, 5);
ok(selection[0] === 1 && selection[1] === 0, 'selecting the opposite panel view swaps the two selections');
selection = Workbench.swapDistinctSelection(selection, 1, 4, 5);
ok(selection[0] === 1 && selection[1] === 4, 'selecting an unused view updates only the requested panel');
selection = Workbench.swapDistinctSelection(selection, 0, 4, 5);
ok(selection[0] === 4 && selection[1] === 1, 'repeated cross-panel selection remains a stable swap');
ok(!workspace.includes("selectedElsewhere ? 'disabled'"), 'Workbench does not disable a plot merely because the other panel shows it');

console.log(checks + '/' + checks + ' v72.40 Workbench-depth checks passed');
