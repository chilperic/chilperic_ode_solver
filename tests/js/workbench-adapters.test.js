'use strict';
const assert = require('assert');
const Workbench = require('../../src/workbench/adapters.js');
let checks = 0;
function ok(condition, message) { assert.ok(condition, message); checks += 1; }
function deterministicView(value) {
  if (Array.isArray(value)) return value.map(deterministicView);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  Object.keys(value).sort().forEach(key => {
    if (['runtimeMs', 'startedAt', 'finishedAt'].includes(key)) return;
    out[key] = deterministicView(value[key]);
  });
  return out;
}

ok(Workbench.VERSION === '77.4.1', 'adapter registry version is current');
ok(Workbench.ids.length >= 11, 'all migrated reference labs are registered');
const expected = ['ode','steady','stochastic','optimization','agent','statistics','fitting','linalg','networks','ml','sciml'];
expected.forEach(id => ok(Workbench.ids.includes(id), id + ' adapter exists'));

for (const id of expected) {
  const adapter = Workbench.get(id);
  ok(typeof adapter.run === 'function', id + ' exposes run');
  ok(typeof adapter.createConfig === 'function', id + ' exposes createConfig');
  ok(typeof adapter.runPreset === 'function', id + ' exposes runPreset');
  ok(adapter.focusedHref.endsWith('.html'), id + ' links to a focused lab');
  const first = adapter.runPreset(adapter.defaultPreset);
  const second = adapter.runPreset(adapter.defaultPreset);
  ok(first && ['success','warning'].includes(first.status), id + ' returns an explicit status');
  ok(Array.isArray(first.plots) && first.plots.length >= 2, id + ' returns at least two compatible plots');
  ok(new Set(first.plots.map(p => p.id)).size === first.plots.length, id + ' plot ids are distinct');
  ok(first.plots.every(p => p.title && p.meaning && Array.isArray(p.data)), id + ' plots declare title, meaning and computed traces');
  ok(Array.isArray(first.metrics) && first.metrics.length >= 4, id + ' returns numerical evidence');
  ok(Array.isArray(first.provenance) && first.provenance.length >= 3, id + ' returns provenance');
  if (['stochastic','agent','ml'].includes(id)) {
    const a = JSON.stringify(deterministicView(first.raw));
    const b = JSON.stringify(deterministicView(second.raw));
    ok(a === b, id + ' is reproducible for a fixed seed');
  }
}

ok(Workbench.legacyModelMap.sir[0] === 'ode', 'legacy SIR route maps to ODE adapter');
ok(Workbench.legacyModelMap['stoch-sir'][0] === 'stochastic', 'legacy stochastic route maps to stochastic adapter');
console.log(checks + '/' + checks + ' Workbench adapter assertions passed');
