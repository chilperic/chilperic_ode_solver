const assert = require('assert');

delete global.FokoComputeBus;
require('../../src/platform/compute-bus.js');
const bus = global.FokoComputeBus;

assert.strictEqual(bus._normalizeJob({ type: 'ode', timeoutMs: 0 }).timeoutMs, 0, 'zero disables timeout');
assert.strictEqual(bus._normalizeJob({ type: 'ode' }).timeoutMs, 0, 'omitted timeout stays disabled');
assert.strictEqual(bus._normalizeJob({ type: 'ode', timeoutMs: -5 }).timeoutMs, 0, 'negative timeout stays disabled');
assert.strictEqual(bus._normalizeJob({ type: 'ode', timeoutMs: 250 }).timeoutMs, 1000, 'positive timeouts use safety floor');
assert.strictEqual(bus._normalizeJob({ type: 'ode', timeoutMs: 2500 }).timeoutMs, 2500, 'declared long timeout is preserved');

console.log('5/5 compute-bus timeout checks passed');
