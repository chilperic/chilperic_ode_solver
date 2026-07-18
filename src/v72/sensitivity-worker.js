/* Worker-backed sensitivity analysis. One worker owns one request; cancellation
 * is implemented by terminating the worker from the workspace controller.
 */
'use strict';
importScripts('../../assets/vendor/mathjs/math-15.2.0.js?v=72.48.0');
importScripts('../core/ode.js?v=72.48.0');
importScripts('../core/sensitivity.js?v=72.48.0');
importScripts('../core/numerical-inputs.js?v=72.48.0');

function stableParameterKey(params) {
  return Object.keys(params).sort().map(name => `${name}:${Number(params[name]).toPrecision(17)}`).join('|');
}
function compileModel(model, progress) {
  const checked = self.FokoNumericalInputs.validateOde(model);
  const compiled = checked.eqs.map(expression => self.math.compile(expression));
  const cache = new Map();
  const aggregate = { odeSolves: 0, acceptedSteps: 0, rejectedSteps: 0, functionEvaluations: 0, maxRejectionRatio: 0, minStep: Infinity, maxTimescaleRatio: 0, warnings: new Set(), methods: new Set() };
  function rhs(t, y, params) {
    const scope = Object.assign({ t }, params);
    checked.vars.forEach((name, index) => { scope[name] = y[index]; });
    const values = compiled.map(expression => Number(expression.evaluate(scope)));
    if (!values.every(Number.isFinite)) throw new Error('A differential equation returned a non-finite derivative.');
    return values;
  }
  function solve(params) {
    const key = stableParameterKey(params);
    if (cache.has(key)) return cache.get(key);
    const result = self.FokoODECore.solveWithRhs({
      vars: checked.vars, y0: checked.y0, params, t0: checked.t0, t1: checked.t1, points: checked.points,
      method: checked.method, rtol: checked.rtol, atol: checked.atol, maxStep: checked.maxStep,
      initialStep: checked.initialStep, stepSize: checked.stepSize, safety: checked.safety
    }, rhs);
    cache.set(key, result);
    aggregate.odeSolves += 1;
    const d = result.diagnostics || {};
    aggregate.acceptedSteps += Number(d.accepted || 0); aggregate.rejectedSteps += Number(d.rejected || 0);
    aggregate.functionEvaluations += Number(d.functionEvaluations || 0);
    aggregate.maxRejectionRatio = Math.max(aggregate.maxRejectionRatio, Number(d.rejectionRatio || 0));
    if (Number.isFinite(d.minStep) && d.minStep > 0) aggregate.minStep = Math.min(aggregate.minStep, d.minStep);
    if (Number.isFinite(d.localTimescaleRatio)) aggregate.maxTimescaleRatio = Math.max(aggregate.maxTimescaleRatio, d.localTimescaleRatio);
    if (d.warning) aggregate.warnings.add(d.warning); if (d.method) aggregate.methods.add(d.method);
    progress(aggregate.odeSolves);
    return result;
  }
  function summary() {
    return {
      odeSolves: aggregate.odeSolves, acceptedSteps: aggregate.acceptedSteps, rejectedSteps: aggregate.rejectedSteps,
      functionEvaluations: aggregate.functionEvaluations, maxRejectionRatio: aggregate.maxRejectionRatio,
      minStep: Number.isFinite(aggregate.minStep) ? aggregate.minStep : 0, maxTimescaleRatio: aggregate.maxTimescaleRatio,
      warnings: Array.from(aggregate.warnings), methods: Array.from(aggregate.methods), cachedTrajectories: cache.size
    };
  }
  return { checked, solve, rhs, summary };
}
function series(result, varName) {
  const index = result.vars.indexOf(varName);
  if (index < 0) throw new Error(`Output variable ${varName} is not part of the model.`);
  return result.Y[index].map(Number);
}
function metricFromSeries(values, time, kind) {
  if (kind === 'final') return values[values.length - 1];
  if (kind === 'max') return Math.max.apply(null, values);
  if (kind === 'min') return Math.min.apply(null, values);
  if (kind === 'mean') return values.reduce((a, b) => a + b, 0) / values.length;
  if (kind === 'range') return Math.max.apply(null, values) - Math.min.apply(null, values);
  if (kind === 'integral') {
    let area = 0; for (let i = 1; i < values.length; i += 1) area += (time[i] - time[i - 1]) * (values[i] + values[i - 1]) / 2; return area;
  }
  if (kind === 'time_of_max') {
    let index = 0; for (let i = 1; i < values.length; i += 1) if (values[i] > values[index]) index = i; return time[index];
  }
  throw new Error(`Unsupported output metric: ${kind}.`);
}
function metric(result, varName, kind) { return metricFromSeries(series(result, varName), result.T, kind); }
function downsampleIndices(length, maxPoints) {
  const count = Math.min(Math.max(2, maxPoints || 48), length);
  return Array.from({ length: count }, (_, i) => Math.round(i * (length - 1) / Math.max(1, count - 1)));
}
function downsampleVector(result, varName, maxPoints) {
  const values = series(result, varName); return downsampleIndices(values.length, maxPoints).map(index => values[index]);
}
function parameterValues(parameters) { return Object.fromEntries(Object.entries(parameters).map(([name, values]) => [name, Number(values[0])])); }
function perturbation(value, min, max, relativeStep) {
  const scale = Math.max(Math.abs(value), Math.abs(max - min), 1);
  const h = Math.max(relativeStep * scale, Math.sqrt(Number.EPSILON) * scale);
  const plus = Math.min(max, value + h), minus = Math.max(min, value - h);
  if (!(plus > minus)) throw new Error('A parameter cannot be perturbed inside its declared range.');
  return { plus, minus, actual: plus - minus };
}
function localTrajectory(compiled, parameters, selectedVar, relativeStep) {
  const names = Object.keys(parameters); const baseValues = parameterValues(parameters);
  const base = compiled.solve(baseValues); const selectedIndex = base.vars.indexOf(selectedVar);
  const selectedRows = []; const all = {};
  names.forEach(function (name) {
    const value = Number(parameters[name][0]), min = Number(parameters[name][1]), max = Number(parameters[name][2]);
    const h = perturbation(value, min, max, relativeStep);
    const plus = Object.assign({}, baseValues, { [name]: h.plus });
    const minus = Object.assign({}, baseValues, { [name]: h.minus });
    const yp = compiled.solve(plus), ym = compiled.solve(minus);
    all[name] = base.vars.map((state, stateIndex) => yp.Y[stateIndex].map((v, i) => (v - ym.Y[stateIndex][i]) / h.actual));
    selectedRows.push({ name, values: all[name][selectedIndex] });
  });
  const influenceMatrix = base.vars.map((state, stateIndex) => names.map(name => {
    const values = all[name][stateIndex]; return values.reduce((sum, value) => sum + Math.abs(value), 0) / values.length;
  }));
  return { time: base.T, base: base.Y[selectedIndex], rows: selectedRows, stateNames: base.vars, parameterNames: names, influenceMatrix };
}
function localConvergence(compiled, parameters, varName, metricName, relativeStep) {
  return [1, 0.5, 0.25, 0.125].map(function (factor) {
    const result = self.FokoSensitivityCore.localFiniteDifference({ parameters, relativeStep: relativeStep * factor, evaluate: params => metric(compiled.solve(params), varName, metricName) });
    return { step: relativeStep * factor, rows: result.rows.map(row => ({ name: row.name, derivative: row.derivative, elasticity: row.elasticity, rangeScaled: row.rangeScaled })) };
  });
}
function localJacobians(compiled, parameters, relativeStep) {
  const baseParams = parameterValues(parameters); const baseline = compiled.solve(baseParams);
  const indices = downsampleIndices(baseline.T.length, 32); const states = baseline.vars.slice(); const params = Object.keys(parameters);
  const stateAccum = states.map(() => states.map(() => 0)); const parameterAccum = states.map(() => params.map(() => 0));
  indices.forEach(function (timeIndex) {
    const t = baseline.T[timeIndex], y = baseline.Y.map(row => row[timeIndex]);
    states.forEach(function (_state, column) {
      const scale = Math.max(Math.abs(y[column]), 1); const h = Math.max(relativeStep * scale, Math.sqrt(Number.EPSILON) * scale);
      const yp = y.slice(), ym = y.slice(); yp[column] += h; ym[column] -= h;
      const fp = compiled.rhs(t, yp, baseParams), fm = compiled.rhs(t, ym, baseParams);
      states.forEach((_, row) => { stateAccum[row][column] += Math.abs((fp[row] - fm[row]) / (2 * h)); });
    });
    params.forEach(function (name, column) {
      const value = Number(parameters[name][0]), min = Number(parameters[name][1]), max = Number(parameters[name][2]);
      const h = perturbation(value, min, max, relativeStep);
      const pp = Object.assign({}, baseParams, { [name]: h.plus }), pm = Object.assign({}, baseParams, { [name]: h.minus });
      const fp = compiled.rhs(t, y, pp), fm = compiled.rhs(t, y, pm);
      states.forEach((_, row) => { parameterAccum[row][column] += Math.abs((fp[row] - fm[row]) / h.actual); });
    });
  });
  return {
    states, parameters: params, sampledTimes: indices.map(index => baseline.T[index]),
    stateMeanAbsolute: stateAccum.map(row => row.map(value => value / indices.length)),
    parameterMeanAbsolute: parameterAccum.map(row => row.map(value => value / indices.length)),
    warning: 'Jacobians are finite-difference derivatives of the ODE right-hand side along the nominal trajectory, averaged in absolute value over a downsampled time grid. They are not trajectory sensitivities or adjoints.'
  };
}
function parseDirection(text, names) {
  const raw = String(text || '').trim();
  if (!raw) return Object.fromEntries(names.map(name => [name, 1]));
  const direction = Object.fromEntries(names.map(name => [name, 0]));
  raw.split(',').map(part => part.trim()).filter(Boolean).forEach(function (part) {
    const match = part.match(/^([A-Za-z_]\w*)\s*[:=]\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)$/);
    if (!match || !names.includes(match[1])) throw new Error(`Directional vector entry "${part}" is invalid. Use parameter:value, for example beta:1,gamma:-1.`);
    direction[match[1]] = Number(match[2]);
  });
  return direction;
}
function computeTimeSobol(samples, names) {
  if (!samples.A.length || !samples.B.length) return null;
  const time = samples.time; const totalMatrix = names.map(() => Array(time.length).fill(NaN)); const firstMatrix = names.map(() => Array(time.length).fill(NaN));
  for (let t = 0; t < time.length; t += 1) {
    const a = samples.A.map(row => row[t]), b = samples.B.map(row => row[t]);
    const varY = self.FokoSensitivityCore.variance(a.concat(b));
    if (!(varY > 1e-30)) continue;
    names.forEach(function (name, p) {
      const ab = samples.AB[name].map(row => row[t]);
      totalMatrix[p][t] = 0.5 * self.FokoSensitivityCore.mean(a.map((value, i) => (value - ab[i]) ** 2)) / varY;
      firstMatrix[p][t] = 1 - 0.5 * self.FokoSensitivityCore.mean(b.map((value, i) => (value - ab[i]) ** 2)) / varY;
    });
  }
  return { time, names, totalMatrix, firstMatrix, warning: 'Time-resolved indices reuse the same seeded Jansen design and selected-state trajectories. Each time point has its own output variance; near-zero-variance times are left unresolved.' };
}

function computeStateSobol(samples, parameterNames, stateNames) {
  if (!stateNames.length) return null;
  const totalMatrix = parameterNames.map(() => stateNames.map(() => NaN));
  const firstMatrix = parameterNames.map(() => stateNames.map(() => NaN));
  stateNames.forEach(function (stateName, stateIndex) {
    const a = samples.A[stateName] || [], b = samples.B[stateName] || [];
    const varY = self.FokoSensitivityCore.variance(a.concat(b));
    if (!(varY > 1e-30)) return;
    parameterNames.forEach(function (parameterName, parameterIndex) {
      const ab = samples.AB[parameterName][stateName] || [];
      totalMatrix[parameterIndex][stateIndex] = 0.5 * self.FokoSensitivityCore.mean(a.map((value, i) => (value - ab[i]) ** 2)) / varY;
      firstMatrix[parameterIndex][stateIndex] = 1 - 0.5 * self.FokoSensitivityCore.mean(b.map((value, i) => (value - ab[i]) ** 2)) / varY;
    });
  });
  return { states: stateNames, names: parameterNames, totalMatrix, firstMatrix, warning: 'State-summary indices reuse the same seeded Jansen design and apply the selected scalar metric separately to every state. States with near-zero sampled variance are left unresolved.' };
}

self.onmessage = function (event) {
  const request = event.data || {};
  if (request.type !== 'run') return;
  const started = performance.now(); let expectedSolves = 1; let lastProgress = -1;
  function progress(done, text) {
    const fraction = Math.max(0.05, Math.min(0.92, 0.1 + 0.82 * done / Math.max(1, expectedSolves)));
    const percent = Math.floor(fraction * 100);
    if (percent !== lastProgress) { lastProgress = percent; self.postMessage({ type: 'progress', progress: fraction, text: text || `Computing ODE solve ${done} of about ${expectedSolves}` }); }
  }
  try {
    self.postMessage({ type: 'progress', progress: 0.04, text: 'Validating model, ranges and numerical settings' });
    const compiled = compileModel(request.model, done => progress(done));
    const parameters = compiled.checked.paramDefs; const parameterNames = Object.keys(parameters); const parameterCount = parameterNames.length;
    const methodConfig = self.FokoNumericalInputs.validateSensitivity(Object.assign({}, request.analysis || {}, { parameterCount, stateCount: compiled.checked.vars.length, outputPoints: compiled.checked.points }));
    if (methodConfig.capacity && methodConfig.capacity.blocked) throw new Error(methodConfig.capacity.message);
    expectedSolves = methodConfig.expectedEvaluations;
    const outputVar = request.outputVar || compiled.checked.vars[0];
    const outputMetric = methodConfig.method === 'fim' ? 'trajectory' : (request.outputMetric || 'final');
    const scalar = params => metric(compiled.solve(params), outputVar, outputMetric);
    self.postMessage({ type: 'progress', progress: 0.1, text: `Computing about ${expectedSolves} guarded browser ODE solves in a worker` });
    let analysis;
    if (methodConfig.method === 'local') {
      analysis = self.FokoSensitivityCore.localFiniteDifference({ parameters, relativeStep: methodConfig.relativeStep, evaluate: scalar });
      analysis.trajectory = localTrajectory(compiled, parameters, outputVar, methodConfig.relativeStep);
      analysis.convergence = localConvergence(compiled, parameters, outputVar, outputMetric, methodConfig.relativeStep);
      analysis.jacobians = localJacobians(compiled, parameters, methodConfig.relativeStep);
      analysis.ofat = self.FokoSensitivityCore.ofat({ parameters, points: methodConfig.ofatPoints, evaluate: scalar });
      try {
        analysis.directional = self.FokoSensitivityCore.directionalProfile({ parameters, points: methodConfig.directionPoints, span: methodConfig.directionalSpan, direction: parseDirection(request.analysis && request.analysis.direction, parameterNames), evaluate: scalar });
        analysis.directional.available = true;
      } catch (error) {
        analysis.directional = { available: false, warning: `Directional profile was not computed: ${error.message}` };
      }
      if (methodConfig.responseSurface) analysis.responseSurface = self.FokoSensitivityCore.responseSurface({ parameters, first: request.analysis.surfaceFirst, second: request.analysis.surfaceSecond, points: methodConfig.surfacePoints, evaluate: scalar });
      analysis.evaluations = compiled.summary().odeSolves;
      analysis.warning += ` ${analysis.ofat.warning} ${analysis.directional.warning} ${analysis.jacobians.warning}${analysis.responseSurface ? ` ${analysis.responseSurface.warning}` : ''}`;
    } else if (methodConfig.method === 'morris') {
      analysis = self.FokoSensitivityCore.morris({ parameters, trajectories: methodConfig.trajectories, levels: methodConfig.levels, seed: methodConfig.seed, bootstrapReplicates: methodConfig.bootstrapReplicates, evaluate: scalar });
    } else if (methodConfig.method === 'sobol') {
      const timeSamples = { A: [], B: [], AB: Object.fromEntries(parameterNames.map(name => [name, []])), time: null };
      const stateNames = compiled.checked.vars.slice();
      const stateSamples = {
        A: Object.fromEntries(stateNames.map(name => [name, []])),
        B: Object.fromEntries(stateNames.map(name => [name, []])),
        AB: Object.fromEntries(parameterNames.map(parameter => [parameter, Object.fromEntries(stateNames.map(name => [name, []]))]))
      };
      const sampleObserver = function (context, params) {
        if (!['A', 'B', 'AB'].includes(context.role)) return;
        const result = compiled.solve(params); const values = series(result, outputVar); const indices = downsampleIndices(values.length, 32); const row = indices.map(index => values[index]);
        if (!timeSamples.time) timeSamples.time = indices.map(index => result.T[index]);
        if (context.role === 'A') timeSamples.A[context.index] = row;
        else if (context.role === 'B') timeSamples.B[context.index] = row;
        else timeSamples.AB[context.name][context.index] = row;
        stateNames.forEach(function (stateName) {
          const stateMetric = metric(result, stateName, outputMetric);
          if (context.role === 'A') stateSamples.A[stateName][context.index] = stateMetric;
          else if (context.role === 'B') stateSamples.B[stateName][context.index] = stateMetric;
          else stateSamples.AB[context.name][stateName][context.index] = stateMetric;
        });
      };
      analysis = self.FokoSensitivityCore.sobolJansen({
        parameters, samples: methodConfig.samples, seed: methodConfig.seed, secondOrder: methodConfig.secondOrder,
        bootstrapReplicates: methodConfig.bootstrapReplicates, dependence: methodConfig.dependence,
        dependencePermutations: methodConfig.dependencePermutations, evaluate: scalar, sampleObserver
      });
      analysis.timeSensitivity = computeTimeSobol(timeSamples, parameterNames);
      analysis.stateSensitivity = computeStateSobol(stateSamples, parameterNames, stateNames);
      if (methodConfig.responseSurface) analysis.responseSurface = self.FokoSensitivityCore.responseSurface({ parameters, first: request.analysis.surfaceFirst, second: request.analysis.surfaceSecond, points: methodConfig.surfacePoints, evaluate: scalar });
      if (analysis.timeSensitivity) analysis.warning += ` ${analysis.timeSensitivity.warning}`;
      if (analysis.stateSensitivity) analysis.warning += ` ${analysis.stateSensitivity.warning}`;
      if (analysis.responseSurface) analysis.warning += ` ${analysis.responseSurface.warning}`;
      if (analysis.dependence) analysis.warning += ` ${analysis.dependence.warning}`;
    } else {
      analysis = self.FokoSensitivityCore.fim({ parameters, relativeStep: methodConfig.relativeStep, sigma: methodConfig.sigma, evaluateVector: params => downsampleVector(compiled.solve(params), outputVar, 48) });
      analysis.observationPoints = Math.min(48, compiled.checked.points);
    }
    const solverSummary = compiled.summary();
    self.postMessage({ type: 'progress', progress: 0.96, text: 'Preparing diagnostics and plots' });
    self.postMessage({
      type: 'result', ok: true, release: '72.48.0', method: methodConfig.method, outputVar, outputMetric,
      model: compiled.checked, analysis, solverSummary, estimatedOdeSolves: expectedSolves,
      runtime: performance.now() - started, warnings: (compiled.checked.warnings || []).concat(methodConfig.warnings || []),
      configuration: { model: request.model, analysis: request.analysis, outputVar, outputMetric }
    });
  } catch (error) { self.postMessage({ type: 'result', ok: false, error: String(error && error.message || error), runtime: performance.now() - started }); }
};
