'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const math = require('../../assets/vendor/mathjs/math-15.2.0.js');
const ODE = require('../../src/core/ode.js');
const stochasticPresets = require('../../src/models/stochastic-presets.js');
const optimizationPresets = require('../../src/models/optimization-presets.js');

let checks = 0;
function ok(condition, message) { checks += 1; assert.ok(condition, message); }
function text(relative) { return fs.readFileSync(path.join(__dirname, '../..', relative), 'utf8'); }

let appSource = text('src/app.js') + '\n;globalThis.__DEPTH_EXAMPLES__=EXAMPLES.ode;globalThis.__DEPTH_CORE__=CORE_EXAMPLES.ode;';
const context = {
  window: { addEventListener() {}, FokoModelIR: null }, document: {}, console,
  URL, Blob: function Blob() {}, setTimeout, clearTimeout,
  performance: { now: () => 0 }, navigator: {}
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(appSource, context);

const requiredOde = [
  'Rössler', 'FitzHugh–Nagumo', 'Hodgkin–Huxley lite', 'Duffing oscillator',
  'Brusselator', 'Oregonator', 'Double pendulum', 'Chemostat',
  'Glucose–insulin minimal model', 'Kuramoto network', 'Goodwin oscillator', 'Repressilator',
  'FA metabolism bistability', 'FADNS semi-mechanistic'
];
requiredOde.forEach((name) => ok(Boolean(context.__DEPTH_EXAMPLES__[name]), `ODE preset exists: ${name}`));
ok(context.__DEPTH_CORE__.includes('FA metabolism bistability'), 'research fatty-acid model remains in the core deck');
ok(context.__DEPTH_CORE__.includes('FADNS semi-mechanistic'), 'research FADNS model remains in the core deck');

for (const name of requiredOde.slice(0, 12)) {
  const preset = context.__DEPTH_EXAMPLES__[name];
  const params = Object.fromEntries(Object.entries(preset.params).map(([key, range]) => [key, Number(range[0])]));
  const compiled = preset.eqs.map((expression) => math.compile(expression));
  const rhs = (t, y) => {
    const scope = Object.assign({ t }, params);
    preset.vars.forEach((variable, index) => { scope[variable] = y[index]; });
    return compiled.map((expression) => Number(expression.evaluate(scope)));
  };
  const result = ODE.solveWithRhs({
    t0: Number(preset.t0), t1: Math.min(Number(preset.t1), 12), y0: preset.y0.slice(),
    vars: preset.vars.slice(), method: 'rk45', points: 120, rtol: 1e-6, atol: 1e-9
  }, rhs);
  ok(result.ok, `${name}: short RK45 smoke run succeeds`);
  ok(result.Y.every((series) => series.every(Number.isFinite)), `${name}: short trajectory is finite`);
}

const traceResult = ODE.solveWithRhs({ t0: 0, t1: 8, y0: [1], vars: ['x'], method: 'rk45', points: 100, rtol: 1e-7, atol: 1e-9 }, (_t, y) => [-2 * y[0]]);
ok(traceResult.diagnostics.stepTrace.time.length > 10, 'RK45 exposes a real attempted-step trace');
ok(traceResult.diagnostics.stepTrace.step.length === traceResult.diagnostics.stepTrace.time.length, 'step trace is row aligned');
ok(traceResult.diagnostics.stepTrace.error.some(Number.isFinite), 'adaptive local-error estimates are retained');

const app = text('src/app.js');
['state_norm','extrema','step_size','local_error','stiffness','eigen_locus'].forEach((id) => ok(app.includes(`['${id}'`) || app.includes(`type==='${id}'`) || app.includes(`type === '${id}'`), `ODE analysis view exists: ${id}`));
ok(!app.includes('function forcePlotVisible'), 'ODE renderer no longer uses visibility-repair code');
ok(!app.includes('function resetPlotNode'), 'ODE renderer keeps stable plot hosts instead of replacing DOM nodes');

ok(Object.keys(stochasticPresets).length >= 13, 'Stochastic lab retains at least thirteen curated CTMC presets');
const stochastic = text('src/v72/stochastic-workspace.js');
['fano','autocorrelation','zero-risk','zero-passage','deviation-matrix'].forEach((id) => ok(stochastic.includes(`${id}:`) || stochastic.includes(`'${id}'`), `Stochastic analysis view exists: ${id}`));

ok(Object.keys(optimizationPresets).length >= 13, 'Optimization lab retains at least thirteen curated presets');
const optimization = text('src/v72/optimization-workspace.js');
['penalized-landscape','violation-map','feasible-region','step-length','gradient-norm','bound-distance','objective-distribution','parallel-coordinates','hessian-spectrum','constraint-profile'].forEach((id) => ok(optimization.includes(id), `Optimization analysis view exists: ${id}`));
ok(!optimization.includes('\\qquad'), 'Optimization KaTeX preview does not use the problematic qquad spacing command');
ok(!/function renderAllPlots\(\)[\s\S]{0,400}applyLayout\(\)/.test(optimization), 'Optimization rendering does not recurse through applyLayout');

const steadyPresets = require('../../src/models/steady-presets.js');
const symbolicPresets = require('../../src/models/symbolic-presets.js');
const steady = text('src/v72/steady-workspace.js');
ok(Object.keys(steadyPresets).length >= 26, 'Steady-State retains at least twenty-six curated algebraic, biological and bifurcation examples');
['Saddle-node normal form','Supercritical pitchfork','Transcritical exchange','Hopf normal-form equilibrium','CSTR thermal runaway','Brusselator equilibrium'].forEach((name) => ok(Boolean(steadyPresets[name]), `Steady-State preset exists: ${name}`));
ok(steady.includes("'residual-surface'"), 'Steady-State exposes a real residual surface');
ok(steady.includes('nullclines'), 'Steady-State exposes a real two-equation nullcline overlay');
ok(Object.keys(symbolicPresets).length >= 20, 'Symbolic retains at least twenty curated expression systems');
['lorenz','rosenbrock','massaction','circuit'].forEach((name) => ok(Boolean(symbolicPresets[name]), `Symbolic preset exists: ${name}`));

const registry = text('src/v72/scientific-registry.js');
ok(!registry.includes('dispatchProgrammaticChange'), 'central registry does not dispatch synthetic plot changes');
ok(!registry.includes("dispatchEvent(new Event('change'"), 'central registry cannot race focused workspace plot rendering');

[
  'src/v72/stochastic-workspace.js', 'src/v72/optimization-workspace.js', 'src/v72/steady-workspace.js',
  'src/v72/statistics-workspace.js', 'src/v72/fitting-workspace.js', 'src/v72/linalg-workspace.js',
  'src/v72/networks-workspace.js', 'src/v72/ml-workspace.js', 'src/sciml-lab.js',
  'src/v72/symbolic-workspace.js'
].forEach((file) => {
  const source = text(file);
  ok(source.includes('offsetParent === null') || source.includes('offsetParent===null') || source.includes('FokoPlotLifecycle.render'), `${file}: hidden plot hosts are not rendered`);
  ok(source.includes('requestAnimationFrame') || source.includes('FokoPlotLifecycle.afterLayout'), `${file}: visible plots wait for layout geometry`);
});
const agentWorkspace = text('src/v72/agent-workspace.js');
ok(agentWorkspace.includes("if (!host) throw new Error('Agent plot host is unavailable"), 'Agent reports a missing plot host instead of throwing appendChild on null');
ok(agentWorkspace.includes('requestAnimationFrame(function(){requestAnimationFrame'), 'Agent visible panels render after layout settles');
const scimlWorkspace = text('src/sciml-lab.js');
ok(scimlWorkspace.includes("if(!box) throw new Error('SciML equation output host is unavailable."), 'SciML reports a missing equation host explicitly');
const workbench = text('src/v72/workbench-workspace.js');
ok(workbench.includes("const cards=grid.dataset.layout==='focus'?[state.focus]:[0,1]"), 'Workbench renders only visible Focus/Two-up panels');

console.log(`${checks}/${checks} scientific-depth restoration checks passed`);
