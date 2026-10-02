/* Foko Lab shared numerical-input contract.
 * Pure, DOM-free validators used before browser computation.
 * Browser: window.FokoNumericalInputs. Node: require(...).
 */
(function (root) {
  'use strict';

  function fail(message) { throw new Error(message); }
  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) fail(`${label} must be a finite number.`);
    return number;
  }
  function positive(value, label, options) {
    const opts = options || {};
    const number = finite(value, label);
    if (!(number > 0)) fail(`${label} must be greater than zero.`);
    if (opts.min != null && number < opts.min) fail(`${label} must be at least ${opts.min}.`);
    if (opts.max != null && number > opts.max) fail(`${label} must be at most ${opts.max}.`);
    return number;
  }
  function integer(value, label, options) {
    const opts = options || {};
    const number = finite(value, label);
    if (!Number.isInteger(number)) fail(`${label} must be an integer.`);
    if (opts.min != null && number < opts.min) fail(`${label} must be at least ${opts.min}.`);
    if (opts.max != null && number > opts.max) fail(`${label} must be at most ${opts.max}.`);
    return number;
  }
  function probability(value, label, allowOne) {
    const number = finite(value, label);
    const upperOk = allowOne ? number <= 1 : number < 1;
    if (!(number > 0 && upperOk)) fail(`${label} must be in (0, ${allowOne ? '1]' : '1'}).`);
    return number;
  }
  function optionalPositive(value, label, options) {
    const text = String(value == null ? '' : value).trim().toLowerCase();
    if (!text || text === 'auto') return 'auto';
    return positive(value, label, options);
  }
  function orderedRange(start, end, label) {
    const a = finite(start, `${label} start`);
    const b = finite(end, `${label} end`);
    if (!(b > a)) fail(`${label} end must be greater than its start.`);
    return [a, b];
  }
  function namesUnique(names, label) {
    const clean = names.map(function (name) { return String(name || '').trim(); });
    if (clean.some(function (name) { return !/^[A-Za-z_]\w*$/.test(name); })) fail(`${label} names must use letters, digits and underscores and may not start with a digit.`);
    if (new Set(clean).size !== clean.length) fail(`${label} names must be unique.`);
    return clean;
  }
  function finiteArray(values, label) {
    if (!Array.isArray(values)) fail(`${label} must be an array.`);
    return values.map(function (value, index) { return finite(value, `${label} ${index + 1}`); });
  }
  function parameterDefinitions(parameters) {
    const defs = {};
    Object.entries(parameters || {}).forEach(function (entry) {
      const name = entry[0]; const raw = entry[1];
      const values = Array.isArray(raw) ? raw : [raw && raw.value, raw && raw.min, raw && raw.max];
      const value = finite(values[0], `Parameter ${name}`);
      const min = values[1] == null || values[1] === '' ? value : finite(values[1], `Parameter ${name} minimum`);
      const max = values[2] == null || values[2] === '' ? value : finite(values[2], `Parameter ${name} maximum`);
      if (max < min) fail(`Parameter ${name} maximum must be greater than or equal to its minimum.`);
      defs[name] = { value: value, min: min, max: max };
    });
    namesUnique(Object.keys(defs), 'Parameter');
    return defs;
  }
  function warning(code, message) { return { code: code, message: message }; }

  function validateOde(config) {
    if (!config || typeof config !== 'object') fail('ODE configuration is missing.');
    const vars = namesUnique(config.vars || [], 'State variable');
    if (!vars.length) fail('At least one state variable is required.');
    if (!Array.isArray(config.eqs) || config.eqs.length !== vars.length) fail('Each state variable requires exactly one differential equation.');
    if (config.eqs.some(function (eq) { return !String(eq || '').trim(); })) fail('Differential equations may not be empty.');
    const y0 = finiteArray(config.y0 || [], 'Initial condition');
    if (y0.length !== vars.length) fail('Initial conditions must match the number of state variables.');
    const time = orderedRange(config.t0, config.t1, 'Time span');
    const points = integer(config.points, 'Reported output points', { min: 2, max: 200000 });
    const rtol = positive(config.rtol == null ? 1e-6 : config.rtol, 'Relative tolerance', { min: 1e-14, max: 0.1 });
    const atol = positive(config.atol == null ? 1e-9 : config.atol, 'Absolute tolerance', { min: 1e-16, max: 0.1 });
    const safety = probability(config.safety == null ? 0.9 : config.safety, 'Adaptive-step safety factor', false);
    const maxStep = optionalPositive(config.maxStep, 'Maximum step', { max: time[1] - time[0] });
    const initialStep = optionalPositive(config.initialStep, 'Initial step', { max: time[1] - time[0] });
    const stepSize = optionalPositive(config.stepSize, 'Fixed step', { max: time[1] - time[0] });
    const method = String(config.method || 'rk45').toLowerCase();
    const browser = new Set(['rk45', 'rk45_adaptive', 'rk5', 'rk5_fixed', 'rk4', 'heun_adaptive', 'heun', 'heun_fixed', 'euler']);
    const exportOnly = new Set(['radau', 'bdf', 'lsoda', 'dop853']);
    if (!browser.has(method) && !exportOnly.has(method)) fail(`Unknown ODE method: ${method}.`);
    if (exportOnly.has(method)) fail(`${method.toUpperCase()} is export-only. Choose a browser RK method or export the model to Python.`);
    const parameters = parameterDefinitions(config.paramDefs || config.params || {});
    const warnings = [];
    Object.entries(parameters).forEach(function (entry) {
      const name = entry[0]; const def = entry[1];
      if (def.value < def.min || def.value > def.max) warnings.push(warning('parameter-outside-range', `Parameter ${name} is outside its declared exploration range; the run is allowed but sweeps and fitting bounds will not contain the current value.`));
    });
    if (points > 20000) warnings.push(warning('large-output-grid', 'More than 20,000 reported points can make plots and exports slow without increasing solver accuracy.'));
    if (vars.length > 20) warnings.push(warning('high-dimension', 'More than 20 states is browser-scale only; validate performance and stiffness externally.'));
    if (rtol < 1e-10 || atol < 1e-12) warnings.push(warning('tight-tolerance', 'Very tight tolerances may increase runtime without improving trustworthy digits in a browser double-precision solve.'));
    if (['rk4', 'rk5', 'rk5_fixed', 'heun', 'heun_fixed', 'euler'].includes(method) && stepSize === 'auto') warnings.push(warning('automatic-fixed-step', 'A fixed-step method with automatic step selection uses a convenience grid, not an error-controlled step.'));
    return {
      vars: vars, eqs: config.eqs.map(String), y0: y0,
      t0: time[0], t1: time[1], points: points, method: method,
      rtol: rtol, atol: atol, safety: safety, maxStep: maxStep,
      initialStep: initialStep, stepSize: stepSize,
      params: Object.fromEntries(Object.entries(parameters).map(function (entry) { return [entry[0], entry[1].value]; })),
      paramDefs: Object.fromEntries(Object.entries(parameters).map(function (entry) { return [entry[0], [entry[1].value, entry[1].min, entry[1].max]]; })),
      warnings: warnings
    };
  }

  function validateSteady(config) {
    if (!config || typeof config !== 'object') fail('Steady-State configuration is missing.');
    const tolerance = positive(config.tolerance, 'Root tolerance', { min: 1e-14, max: 1e-2 });
    const maxIterations = integer(config.maxIterations, 'Maximum Newton iterations', { min: 1, max: 10000 });
    const damping = probability(config.damping, 'Damping factor', true);
    const startScale = positive(config.startScale, 'Multi-start scale', { max: 1e6 });
    return { tolerance: tolerance, maxIterations: maxIterations, damping: damping, startScale: startScale, warnings: tolerance < 1e-11 ? [warning('tight-root-tolerance', 'A very tight residual tolerance does not imply a correspondingly accurate or unique root.')] : [] };
  }

  function validateStochastic(config) {
    const time = orderedRange(config.t0, config.t1, 'Simulation time span');
    const points = integer(config.points, 'Reported time points', { min: 2, max: 100000 });
    const runs = integer(config.runs, 'Ensemble runs', { min: 1, max: 100000 });
    const seed = integer(config.seed, 'Random seed', { min: 0, max: 2147483647 });
    const maxEvents = integer(config.maxEvents, 'Maximum events per run', { min: 1, max: 100000000 });
    const warnings = [];
    if (runs < 30) warnings.push(warning('small-ensemble', 'Fewer than 30 runs gives unstable empirical quantiles and Monte Carlo summaries.'));
    if (runs * points > 2e7) warnings.push(warning('large-ensemble-output', 'The requested ensemble/output grid may exceed comfortable browser memory.'));
    return { t0: time[0], t1: time[1], points: points, runs: runs, seed: seed, maxEvents: maxEvents, warnings: warnings };
  }

  function validateOptimization(config) {
    const iterations = integer(config.iterations, 'Optimization iterations', { min: 1, max: 1000000 });
    const population = integer(config.population, 'Population size', { min: 2, max: 100000 });
    const starts = integer(config.starts, 'Multi-start count', { min: 1, max: 100000 });
    const seed = integer(config.seed, 'Random seed', { min: 0, max: 2147483647 });
    const feasibilityTolerance = positive(config.feasibilityTolerance, 'Feasibility tolerance', { min: 1e-14, max: 1 });
    const stepTolerance = positive(config.stepTolerance, 'Step tolerance', { min: 1e-14, max: 1 });
    const penalty = positive(config.penalty, 'Constraint penalty', { min: 1e-12, max: 1e20 });
    const warnings = [];
    if (iterations * population > 2e6) warnings.push(warning('large-search-budget', 'The requested search budget is large for a browser and may freeze the page.'));
    return { iterations: iterations, population: population, starts: starts, seed: seed, feasibilityTolerance: feasibilityTolerance, stepTolerance: stepTolerance, penalty: penalty, warnings: warnings };
  }

  function sensitivityCapacity(config) {
    const method = String(config.method || 'local');
    const parameterCount = Math.max(1, Number(config.parameterCount) || 1);
    const stateCount = Math.max(1, Number(config.stateCount) || 1);
    const outputPoints = Math.max(2, Number(config.outputPoints) || 2);
    const samples = Math.max(16, Number(config.samples) || 64);
    const trajectories = Math.max(2, Number(config.trajectories) || 12);
    const secondOrder = config.secondOrder === true || config.secondOrder === 'true';
    const ofatPoints = Math.max(5, Number(config.ofatPoints) || 9);
    const directionPoints = Math.max(5, Number(config.directionPoints) || 9);
    const responseSurfaceRequested = config.responseSurface === true || config.responseSurface === 'true';
    const responseSurface = responseSurfaceRequested && (method === 'local' || method === 'sobol');
    const surfacePoints = Math.max(5, Number(config.surfacePoints) || 7);
    const surfaceEvaluations = responseSurface ? surfacePoints * surfacePoints : 0;
    const expectedEvaluations = method === 'local' ? 1 + 8 * parameterCount + ofatPoints * parameterCount + directionPoints + surfaceEvaluations
      : method === 'morris' ? trajectories * (parameterCount + 1)
      : method === 'sobol' ? samples * (secondOrder ? (2 * parameterCount + 2) : (parameterCount + 2)) + surfaceEvaluations
      : 1 + 2 * parameterCount;
    const stateTimeValues = expectedEvaluations * outputPoints * stateCount;
    const pairCount = secondOrder ? parameterCount * (parameterCount - 1) / 2 : 0;
    const reasons = [];
    if (stateCount > 32) reasons.push(`${stateCount} state variables exceed the browser sensitivity limit of 32`);
    if (parameterCount > 20) reasons.push(`${parameterCount} varied parameters exceed the browser sensitivity limit of 20`);
    if (method === 'sobol' && secondOrder && parameterCount > 10) reasons.push(`${pairCount} second-order pairs exceed the browser interaction limit of 45`);
    if (expectedEvaluations > 25000) reasons.push(`${expectedEvaluations.toLocaleString()} projected ODE solves exceed the safe browser budget of 25,000`);
    if (stateTimeValues > 80000000) reasons.push(`${stateTimeValues.toLocaleString()} projected state-time values exceed the safe browser workload envelope`);
    const blocked = reasons.length > 0;
    const warningLevel = !blocked && (expectedEvaluations > 8000 || stateTimeValues > 25000000 || parameterCount > 12 || stateCount > 16);
    const message = blocked
      ? `This model is too large for reliable in-browser sensitivity analysis: ${reasons.join('; ')}. Reduce states, varied parameters, output points, samples or second-order analysis, or export the configuration to Python/SALib. No worker should be started.`
      : warningLevel
        ? `This is a heavy browser request (${expectedEvaluations.toLocaleString()} ODE solves; about ${stateTimeValues.toLocaleString()} state-time values). Keep this tab active, expect a long run, and confirm close rankings with an external workflow.`
        : `Browser workload is within the guarded envelope (${expectedEvaluations.toLocaleString()} ODE solves; about ${stateTimeValues.toLocaleString()} state-time values).`;
    return { blocked, warningLevel, reasons, message, expectedEvaluations, stateTimeValues, pairCount, stateCount, parameterCount, outputPoints, secondOrder, ofatPoints, directionPoints, responseSurface, surfacePoints };
  }

  function validateSensitivity(config) {
    const method = String(config.method || 'local');
    if (!['local', 'morris', 'sobol', 'fim'].includes(method)) fail(`Unsupported sensitivity method: ${method}.`);
    const relativeStep = positive(config.relativeStep == null ? 1e-3 : config.relativeStep, 'Relative perturbation', { min: 1e-8, max: 0.25 });
    const samples = integer(config.samples == null ? 64 : config.samples, 'Global-sensitivity samples', { min: 16, max: 4096 });
    const trajectories = integer(config.trajectories == null ? 12 : config.trajectories, 'Morris trajectories', { min: 2, max: 512 });
    const levels = integer(config.levels == null ? 6 : config.levels, 'Morris grid levels', { min: 4, max: 50 });
    if (method === 'morris' && levels % 2 !== 0) fail('Morris grid levels must be even for the implemented one-at-a-time design.');
    const seed = integer(config.seed == null ? 1729 : config.seed, 'Random seed', { min: 0, max: 2147483647 });
    const sigma = positive(config.sigma == null ? 1 : config.sigma, 'FIM observation-noise scale', { min: 1e-12, max: 1e12 });
    const parameterCount = integer(config.parameterCount == null ? 1 : config.parameterCount, 'Sensitivity parameter count', { min: 1, max: 100 });
    const stateCount = integer(config.stateCount == null ? 1 : config.stateCount, 'Sensitivity state count', { min: 1, max: 1000 });
    const outputPoints = integer(config.outputPoints == null ? 100 : config.outputPoints, 'Sensitivity output points', { min: 2, max: 200000 });
    const bootstrapReplicates = integer(config.bootstrapReplicates == null ? 200 : config.bootstrapReplicates, 'Bootstrap replicates', { min: 0, max: 1000 });
    const secondOrder = config.secondOrder === true || config.secondOrder === 'true';
    const ofatPoints = integer(config.ofatPoints == null ? 9 : config.ofatPoints, 'OFAT points', { min: 5, max: 21 });
    const directionPoints = integer(config.directionPoints == null ? 9 : config.directionPoints, 'Directional profile points', { min: 5, max: 21 });
    const directionalSpan = positive(config.directionalSpan == null ? 0.25 : config.directionalSpan, 'Directional span', { min: 1e-6, max: 1 });
    const responseSurface = config.responseSurface === true || config.responseSurface === 'true';
    const surfacePoints = integer(config.surfacePoints == null ? 7 : config.surfacePoints, 'Response-surface grid points', { min: 5, max: 15 });
    const dependence = config.dependence === true || config.dependence === 'true';
    const dependencePermutations = integer(config.dependencePermutations == null ? 29 : config.dependencePermutations, 'Dependence permutations', { min: 19, max: 49 });
    const capacity = sensitivityCapacity({ method, parameterCount, stateCount, outputPoints, samples, trajectories, secondOrder, ofatPoints, directionPoints, responseSurface, surfacePoints });
    const warnings = [];
    if (method === 'sobol' && samples < 128) warnings.push(warning('low-sobol-samples', 'Global variance estimates below 128 base samples are usually too noisy for close rankings.'));
    if (method === 'sobol' && secondOrder && samples < 512) warnings.push(warning('low-second-order-samples', 'Second-order Sobol interactions below 512 base samples are usually unstable and should be treated as screening evidence only.'));
    if (method === 'morris' && trajectories < 10) warnings.push(warning('low-morris-trajectories', 'Fewer than 10 Morris trajectories gives unstable screening statistics.'));
    if (method === 'sobol' && dependence && samples < 64) warnings.push(warning('low-dependence-samples', 'MI and HSIC screening below 64 base samples is usually unstable.'));
    if ((method === 'local' || method === 'sobol') && responseSurface && surfacePoints > 11) warnings.push(warning('dense-response-surface', 'A dense two-parameter response surface can dominate the local-analysis workload.'));
    if (bootstrapReplicates > 0 && bootstrapReplicates < 100) warnings.push(warning('low-bootstrap-replicates', 'Fewer than 100 bootstrap replicates gives coarse uncertainty intervals and rank-stability estimates.'));
    if (capacity.warningLevel) warnings.push(warning('large-sensitivity-budget', capacity.message));
    return { method, relativeStep, samples, trajectories, levels, seed, sigma, parameterCount, stateCount, outputPoints, bootstrapReplicates, secondOrder, ofatPoints, directionPoints, directionalSpan, responseSurface, surfacePoints, dependence, dependencePermutations, expectedEvaluations: capacity.expectedEvaluations, capacity, warnings };
  }


  const api = Object.freeze({ finite, positive, integer, probability, optionalPositive, orderedRange, namesUnique, finiteArray, parameterDefinitions, validateOde, validateSteady, validateStochastic, validateOptimization, sensitivityCapacity, validateSensitivity });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoNumericalInputs = api;
}(typeof self !== 'undefined' ? self : globalThis));
