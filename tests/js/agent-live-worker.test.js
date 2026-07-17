'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Agent = require('../../src/core/agent-reference.js');
const Presets = require('../../src/models/agent-presets.js');

const source = fs.readFileSync(path.resolve(__dirname, '../../src/v72/agent-worker.js'), 'utf8');
const messages = [];
const startedAt = Date.now();
const context = {
  console,
  setTimeout,
  clearTimeout,
  performance: { now: () => Date.now() - startedAt },
  importScripts() {},
  self: {
    FokoAgentReference: Agent,
    postMessage(message) {
      messages.push({ message, at: Date.now() - startedAt });
    }
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'agent-worker.js' });

const config = {
  ...Presets.fadns_particle_baseline,
  size: 10,
  steps: 20,
  runs: 2,
  recordEvery: 2,
  snapshotCount: 5
};
const requestId = 'paced-worker-test';
context.self.onmessage({ data: { type: 'run', requestId, config, liveDelayMs: 24 } });

function waitFor(predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    (function poll() {
      const value = predicate();
      if (value) return resolve(value);
      if (Date.now() >= deadline) return reject(new Error('Timed out waiting for worker result.'));
      setTimeout(poll, 5);
    }());
  });
}

(async () => {
  await waitFor(() => messages.filter(entry => entry.message.type === 'live-frame').length >= 2);
  context.self.onmessage({ data: { type: 'pause', requestId } });
  await waitFor(() => messages.find(entry => entry.message.type === 'paused'));
  const pausedFrameCount = messages.filter(entry => entry.message.type === 'live-frame').length;
  await new Promise(resolve => setTimeout(resolve, 90));
  assert.strictEqual(messages.filter(entry => entry.message.type === 'live-frame').length, pausedFrameCount, 'pause stops numerical frame advancement');
  context.self.onmessage({ data: { type: 'resume', requestId } });
  await waitFor(() => messages.find(entry => entry.message.type === 'resumed'));
  await waitFor(() => messages.find(entry => entry.message.type === 'complete'));
  const live = messages.filter(entry => entry.message.type === 'live-frame');
  assert.ok(live.length >= 5, `expected at least five live frames, received ${live.length}`);
  assert.strictEqual(live[0].message.frame.step, 0, 'first live frame is the initialized lattice');
  assert.strictEqual(live.at(-1).message.frame.step, config.steps, 'last live frame is the terminal lattice');
  assert.ok(live.every((entry, index) => index === 0 || entry.message.frame.step > live[index - 1].message.frame.step), 'live frame steps increase strictly');
  assert.ok(live.every((entry, index) => entry.message.frameSequence === index + 1), 'live frame sequence is explicit and monotone');
  assert.ok(live.at(-1).at - live[0].at >= 70, 'frames are paced across browser paint opportunities rather than posted as one burst');
  const complete = messages.find(entry => entry.message.type === 'complete');
  const direct = Agent.simulateEnsemble(config);
  assert.deepStrictEqual(complete.message.result.representative.finalGrid, direct.representative.finalGrid, 'incremental worker result matches direct fixed-seed simulation');
  assert.deepStrictEqual(complete.message.result.ensemble.mean, direct.ensemble.mean, 'incremental worker ensemble summary matches direct simulation');
  console.log(`${live.length} paced live frames verified; pause/resume is stable and terminal result is deterministic.`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
