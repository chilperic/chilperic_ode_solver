/* Foko Lab v72.47.0 Agent ensemble worker.
 * The representative run is computed incrementally. Each published lattice
 * frame is the current state of the numerical runner at that moment; frames
 * are deliberately paced so the browser can paint them instead of receiving
 * a post-hoc burst after the calculation has already finished.
 */
'use strict';
importScripts('../core/agent-reference.js?v=72.47.0');

let activeJob = null;

function clearJob() {
  if (activeJob && activeJob.timer) clearTimeout(activeJob.timer);
  activeJob = null;
}

function post(job, type, payload) {
  self.postMessage(Object.assign({
    type: type,
    requestId: job.requestId
  }, payload || {}));
}

function schedule(job, callback, delay) {
  if (activeJob !== job || job.cancelled || job.paused) return;
  if (job.timer) clearTimeout(job.timer);
  job.timer = setTimeout(function () {
    job.timer = 0;
    if (activeJob === job && !job.cancelled && !job.paused) callback();
  }, Math.max(0, delay || 0));
}

function liveFrame(job) {
  const frame = job.runner.frame();
  job.frameSequence += 1;
  post(job, 'live-frame', {
    seed: job.firstSeed,
    frameSequence: job.frameSequence,
    computedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    frame: frame
  });
}

function finishEnsemble(job) {
  if (activeJob !== job || job.cancelled) return;
  try {
    const result = job.core.summarizeRuns(job.config, job.runs);
    post(job, 'complete', { result: result });
    clearJob();
  } catch (error) {
    post(job, 'error', { error: error && error.message ? error.message : String(error) });
    clearJob();
  }
}

function computeNextEnsembleRun(job) {
  if (activeJob !== job || job.cancelled || job.paused) return;
  if (job.nextRunIndex >= job.config.runs) {
    finishEnsemble(job);
    return;
  }
  try {
    const index = job.nextRunIndex;
    const seed = job.core.deriveSeed(job.config.seed, index);
    job.runs.push(job.core.simulate(Object.assign({}, job.config, { captureSnapshots: false }), seed));
    job.nextRunIndex += 1;
    post(job, 'progress', {
      completed: job.nextRunIndex,
      total: job.config.runs,
      fraction: job.nextRunIndex / job.config.runs,
      seed: seed
    });
    schedule(job, function () { computeNextEnsembleRun(job); }, 0);
  } catch (error) {
    post(job, 'error', { error: error && error.message ? error.message : String(error) });
    clearJob();
  }
}

function finishRepresentative(job) {
  if (activeJob !== job || job.cancelled) return;
  try {
    const representative = job.runner.result();
    job.runs.push(representative);
    job.nextRunIndex = 1;
    post(job, 'representative-complete', {
      completed: 1,
      total: job.config.runs,
      seed: job.firstSeed
    });
    post(job, 'progress', {
      completed: 1,
      total: job.config.runs,
      fraction: 1 / job.config.runs,
      seed: job.firstSeed
    });
    schedule(job, function () { computeNextEnsembleRun(job); }, 0);
  } catch (error) {
    post(job, 'error', { error: error && error.message ? error.message : String(error) });
    clearJob();
  }
}

function computeNextLiveChunk(job) {
  if (activeJob !== job || job.cancelled || job.paused) return;
  try {
    job.runner.advance(job.stepsPerFrame);
    liveFrame(job);
    if (job.runner.done) finishRepresentative(job);
    else schedule(job, function () { computeNextLiveChunk(job); }, job.liveDelayMs);
  } catch (error) {
    post(job, 'error', { error: error && error.message ? error.message : String(error) });
    clearJob();
  }
}

function startRun(message) {
  clearJob();
  const requestId = message.requestId;
  try {
    const core = self.FokoAgentReference;
    if (!core || typeof core.createSimulationRunner !== 'function') {
      throw new Error('Agent incremental numerical runner failed to load in the worker.');
    }
    const config = core.validateConfig(message.config || {});
    const firstSeed = core.deriveSeed(config.seed, 0);
    const requestedFrames = Math.max(4, Math.min(80, Number(config.snapshotCount) || 24));
    const liveDelayMs = Math.max(24, Math.min(500, Number(message.liveDelayMs) || 90));
    const job = {
      core: core,
      requestId: requestId,
      config: config,
      firstSeed: firstSeed,
      runner: core.createSimulationRunner(Object.assign({}, config, { captureSnapshots: true }), firstSeed),
      stepsPerFrame: Math.max(1, Math.ceil(config.steps / requestedFrames)),
      liveDelayMs: liveDelayMs,
      frameSequence: 0,
      runs: [],
      nextRunIndex: 0,
      paused: false,
      cancelled: false,
      timer: 0
    };
    activeJob = job;
    post(job, 'started', {
      total: config.runs,
      configHash: core.configHash(config),
      states: job.runner.states,
      size: config.size,
      totalSteps: config.steps,
      representativeSeed: firstSeed,
      liveDelayMs: liveDelayMs,
      stepsPerFrame: job.stepsPerFrame
    });
    liveFrame(job);
    schedule(job, function () { computeNextLiveChunk(job); }, liveDelayMs);
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId: requestId,
      error: error && error.message ? error.message : String(error)
    });
  }
}

self.onmessage = function (event) {
  const message = event.data || {};
  if (message.type === 'run') {
    startRun(message);
    return;
  }
  if (!activeJob || message.requestId !== activeJob.requestId) return;
  if (message.type === 'pause') {
    activeJob.paused = true;
    if (activeJob.timer) clearTimeout(activeJob.timer);
    activeJob.timer = 0;
    post(activeJob, 'paused', { step: activeJob.runner.step, totalSteps: activeJob.config.steps });
    return;
  }
  if (message.type === 'resume') {
    if (!activeJob.paused) return;
    activeJob.paused = false;
    post(activeJob, 'resumed', { step: activeJob.runner.step, totalSteps: activeJob.config.steps });
    if (activeJob.runner.done) schedule(activeJob, function () { computeNextEnsembleRun(activeJob); }, 0);
    else schedule(activeJob, function () { computeNextLiveChunk(activeJob); }, 0);
    return;
  }
  if (message.type === 'cancel') {
    activeJob.cancelled = true;
    post(activeJob, 'cancelled', {});
    clearJob();
    return;
  }
  post(activeJob, 'error', { error: 'Unknown Agent worker request.' });
};
