'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../..');
const messages = [];
const context = { console, performance, postMessage: value => messages.push(value) };
context.self = context;
context.globalThis = context;
vm.createContext(context);
context.importScripts = (...urls) => urls.forEach(url => {
  const clean = String(url).split('?')[0];
  const absolute = path.resolve(ROOT, 'src', clean);
  vm.runInContext(fs.readFileSync(absolute, 'utf8'), context, { filename: absolute });
});
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/worker.js'), 'utf8'), context, { filename: 'worker.js' });

let count = 0;
function ok(value, label) { assert.ok(value, label); count += 1; console.log('ok  : ' + label); }
function run(payload) {
  messages.length = 0;
  context.self.onmessage({ data: { type: 'solve', payload } });
  return messages[messages.length - 1];
}
const numerical = { t0:0, t1:40, points:240, method:'rk45', rtol:1e-6, atol:1e-9, maxStep:'auto', initialStep:'auto', stepSize:'auto', safety:0.9 };

const lotka = run({
  ...numerical, vars:['x','y'], eqs:['alpha*x-beta*x*y','delta*x*y-gamma*y'], y0:[10,5],
  params:{ alpha:{value:1.1,min:.6,max:1.8}, beta:{value:.4,min:.15,max:.8}, delta:{value:.1,min:.04,max:.25}, gamma:{value:.4,min:.15,max:.9} }
});
ok(lotka.ok && lotka.Y.every(row => row.every(Number.isFinite)), 'Lotka–Volterra accepts object-shaped restored parameters');

const sir = run({
  ...numerical, t1:120, vars:['S','I','R'], eqs:['-beta*S*I/N','beta*S*I/N-gamma*I','gamma*I'], y0:[990,10,0],
  params:{ beta:[.35,.15,.8], gamma:[.1,.04,.25], N:[1000,900,1100] }
});
ok(sir.ok && sir.Y.every(row => row.every(Number.isFinite)), 'SIR accepts array-shaped editor parameters at the worker boundary');

const missing = run({ ...numerical, vars:['x'], eqs:['alpha*x'], y0:[1], params:{alpha:{value:'not-a-number'}} });
ok(!missing.ok && /Parameter "alpha" must have a finite numeric value/.test(missing.error), 'invalid binding reports the exact parameter before integration');

const zeroDenominator = run({ ...numerical, vars:['x'], eqs:['x/N'], y0:[1], params:{N:0} });
ok(!zeroDenominator.ok && /division by zero/.test(zeroDenominator.error) && /x\/N/.test(zeroDenominator.error), 'finite-input domain failure reports equation and likely cause');

const sirZeroPopulation = run({
  ...numerical, vars:['S','I','R'], eqs:['-beta*S*I/N','beta*S*I/N-gamma*I','gamma*I'], y0:[990,10,0],
  params:{ beta:.35, gamma:.1, N:0 }
});
ok(
  !sirZeroPopulation.ok &&
  /Equation 1/.test(sirZeroPopulation.error) &&
  /-beta\*S\*I\/N/.test(sirZeroPopulation.error) &&
  /division by zero/.test(sirZeroPopulation.error) &&
  /N = 0/.test(sirZeroPopulation.error),
  'SIR zero-population failure identifies the exact equation, denominator, and corrective cause'
);

const divergentLotka = run({
  ...numerical, t1:1, vars:['x','y'], eqs:['alpha*x-beta*x*y','delta*x*y-gamma*y'], y0:[1e308,1e308],
  params:{ alpha:1.1, beta:.4, delta:.1, gamma:.4 }
});
ok(
  !divergentLotka.ok &&
  /Equation 1/.test(divergentLotka.error) &&
  /alpha\*x-beta\*x\*y/.test(divergentLotka.error) &&
  /state may have left the model domain|numerically stable scale/.test(divergentLotka.error),
  'divergent Lotka–Volterra failure identifies model-scale instability instead of a generic non-finite error'
);

const app = fs.readFileSync(path.join(ROOT, 'src/app.js'), 'utf8');
ok(/params:normalizeParams\(ex\.params\|\|\{\}\)/.test(app), 'ODE loader canonicalizes restored, imported and handed-off parameters');

console.log(`\n${count}/${count} checks passed`);
