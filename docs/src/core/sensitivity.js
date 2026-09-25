/* Foko Lab browser-scale sensitivity core.
 * Pure, DOM-free estimators around deterministic scalar/vector evaluators.
 * Browser: window.FokoSensitivityCore. Node: require(...).
 */
(function (root) {
  'use strict';

  function assert(condition, message) { if (!condition) throw new Error(message); }
  function finite(value, label) { const n = Number(value); assert(Number.isFinite(n), `${label} must be finite.`); return n; }
  function mulberry32(seed) {
    let a = (Number(seed) >>> 0) || 1;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function mean(values) { return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length); }
  function variance(values) { if (values.length < 2) return 0; const m = mean(values); return values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1); }
  function std(values) { return Math.sqrt(Math.max(0, variance(values))); }
  function standardError(values) { return values.length > 1 ? std(values) / Math.sqrt(values.length) : NaN; }
  function quantile(values, p) {
    if (!values.length) return NaN;
    const sorted = values.slice().sort((a, b) => a - b);
    const at = (sorted.length - 1) * p;
    const lo = Math.floor(at); const hi = Math.ceil(at); const w = at - lo;
    return sorted[lo] * (1 - w) + sorted[hi] * w;
  }
  function shuffle(values, rng) {
    const out = values.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }
  function parameterSpec(config) {
    const names = Object.keys(config.parameters || {});
    assert(names.length > 0, 'Sensitivity analysis requires at least one parameter.');
    const values = {}; const ranges = {}; const spans = {};
    names.forEach(function (name) {
      const raw = config.parameters[name];
      const triple = Array.isArray(raw) ? raw : [raw.value, raw.min, raw.max];
      const value = finite(triple[0], `Parameter ${name}`);
      const min = finite(triple[1], `Parameter ${name} minimum`);
      const max = finite(triple[2], `Parameter ${name} maximum`);
      assert(max > min, `Parameter ${name} requires a non-zero [min,max] range.`);
      assert(value >= min && value <= max, `Parameter ${name} current value must lie inside its declared sensitivity range.`);
      values[name] = value; ranges[name] = [min, max]; spans[name] = max - min;
    });
    return { names, values, ranges, spans };
  }
  function evaluateChecked(evaluate, params, counter, observer, context) {
    const copied = Object.assign({}, params);
    const value = Number(evaluate(copied));
    counter.count += 1;
    assert(Number.isFinite(value), 'Model output became non-finite during sensitivity analysis.');
    if (typeof observer === 'function') observer(context || {}, copied, value);
    return value;
  }
  function stepFor(value, range, relativeStep) {
    const scale = Math.max(Math.abs(value), Math.abs(range[1] - range[0]), 1);
    return Math.max(scale * relativeStep, Math.sqrt(Number.EPSILON) * scale);
  }
  function estimateEvaluations(method, parameterCount, options) {
    const p = Math.max(1, Number(parameterCount) || 1); const cfg = options || {};
    if (method === 'local') {
      const ofat = Math.max(5, Number(cfg.ofatPoints) || 9) * p;
      const directional = Math.max(5, Number(cfg.directionPoints) || 9);
      const surface = cfg.responseSurface ? Math.max(5, Number(cfg.surfacePoints) || 7) ** 2 : 0;
      return 1 + 8 * p + ofat + directional + surface; // cached baseline, four finite-difference levels, OFAT, direction and optional surface
    }
    if (method === 'morris') return Math.max(2, Number(cfg.trajectories) || 12) * (p + 1);
    if (method === 'sobol') return Math.max(16, Number(cfg.samples) || 128) * ((cfg.secondOrder === true || cfg.secondOrder === 'true') ? (2 * p + 2) : (p + 2));
    if (method === 'fim') return 1 + 2 * p;
    throw new Error(`Unknown sensitivity method: ${method}.`);
  }

  function localFiniteDifference(config) {
    const spec = parameterSpec(config); const counter = { count: 0 };
    const evaluate = config.evaluate; assert(typeof evaluate === 'function', 'Sensitivity analysis requires an evaluate(params) function.');
    const relativeStep = finite(config.relativeStep == null ? 1e-3 : config.relativeStep, 'Relative perturbation');
    assert(relativeStep > 0 && relativeStep <= 0.25, 'Relative perturbation must be in (0,0.25].');
    const base = evaluateChecked(evaluate, spec.values, counter);
    const rows = spec.names.map(function (name) {
      const range = spec.ranges[name]; const h = stepFor(spec.values[name], range, relativeStep);
      const plusParams = Object.assign({}, spec.values); const minusParams = Object.assign({}, spec.values);
      plusParams[name] = Math.min(range[1], spec.values[name] + h);
      minusParams[name] = Math.max(range[0], spec.values[name] - h);
      const actual = plusParams[name] - minusParams[name];
      assert(actual > 0, `Parameter ${name} cannot be perturbed inside its declared range.`);
      const plus = evaluateChecked(evaluate, plusParams, counter);
      const minus = evaluateChecked(evaluate, minusParams, counter);
      const derivative = (plus - minus) / actual;
      const elasticity = Math.abs(base) > 1e-15 ? derivative * spec.values[name] / base : NaN;
      const rangeScaled = derivative * spec.spans[name];
      return { name, value: spec.values[name], min: range[0], max: range[1], step: actual / 2, base, plus, minus, derivative, elasticity, rangeScaled, magnitude: Math.abs(derivative) };
    });
    return {
      method: 'local', base, rows, evaluations: counter.count, relativeStep,
      warning: 'Central finite differences are local and perturbation-dependent. Elasticities are undefined when the selected base output is near zero; range-scaled derivatives depend on the declared parameter ranges.'
    };
  }

  function bootstrapRanks(rowValues, replicates, rng) {
    const names = Object.keys(rowValues);
    const count = rowValues[names[0]] ? rowValues[names[0]].length : 0;
    const rankSamples = Object.fromEntries(names.map(name => [name, []]));
    if (!count || replicates <= 0) return names.map((name, index) => ({ name, medianRank: index + 1, rankLow: index + 1, rankHigh: index + 1, topProbability: index === 0 ? 1 : 0 }));
    for (let b = 0; b < replicates; b += 1) {
      const indices = Array.from({ length: count }, () => Math.floor(rng() * count));
      const ranked = names.map(name => ({ name, value: mean(indices.map(i => Math.abs(rowValues[name][i]))) })).sort((a, b2) => b2.value - a.value);
      ranked.forEach((row, index) => rankSamples[row.name].push(index + 1));
    }
    return names.map(name => ({
      name,
      medianRank: quantile(rankSamples[name], 0.5),
      rankLow: quantile(rankSamples[name], 0.025),
      rankHigh: quantile(rankSamples[name], 0.975),
      topProbability: rankSamples[name].filter(rank => rank === 1).length / replicates
    }));
  }

  function morris(config) {
    const spec = parameterSpec(config); const evaluate = config.evaluate;
    assert(typeof evaluate === 'function', 'Morris analysis requires an evaluate(params) function.');
    const trajectories = Math.max(2, Math.floor(finite(config.trajectories == null ? 12 : config.trajectories, 'Morris trajectories')));
    const levels = Math.max(4, Math.floor(finite(config.levels == null ? 6 : config.levels, 'Morris levels')));
    const bootstrapReplicates = Math.max(0, Math.floor(finite(config.bootstrapReplicates == null ? 200 : config.bootstrapReplicates, 'Bootstrap replicates')));
    assert(levels % 2 === 0, 'Morris grid levels must be even for the implemented one-at-a-time design.');
    const seed = config.seed == null ? 1729 : config.seed;
    const rng = mulberry32(seed); const counter = { count: 0 };
    const effects = Object.fromEntries(spec.names.map(name => [name, []])); const traces = [];
    const gridStep = 1 / (levels - 1); const delta = levels / (2 * (levels - 1));
    const maxBaseIndex = Math.floor((1 - delta) / gridStep + 1e-12);
    for (let trajectory = 0; trajectory < trajectories; trajectory += 1) {
      const normalized = {}; const direction = {};
      spec.names.forEach(function (name) {
        const base = Math.floor(rng() * (maxBaseIndex + 1)) * gridStep;
        direction[name] = rng() < 0.5 ? -1 : 1;
        normalized[name] = direction[name] > 0 ? base : base + delta;
      });
      const toPhysical = function () {
        const row = {};
        spec.names.forEach(function (name) { row[name] = spec.ranges[name][0] + normalized[name] * spec.spans[name]; });
        return row;
      };
      let current = evaluateChecked(evaluate, toPhysical(), counter);
      const order = shuffle(spec.names, rng); const points = [{ step: 0, output: current, normalized: Object.assign({}, normalized) }];
      order.forEach(function (name, index) {
        normalized[name] += direction[name] * delta;
        const nextOutput = evaluateChecked(evaluate, toPhysical(), counter);
        const effect = (nextOutput - current) / (direction[name] * delta);
        effects[name].push(effect); current = nextOutput;
        points.push({ step: index + 1, output: current, parameter: name, normalized: Object.assign({}, normalized) });
      });
      traces.push(points);
    }
    const rows = spec.names.map(function (name) {
      const values = effects[name]; const absolute = values.map(Math.abs);
      return { name, mu: mean(values), muStar: mean(absolute), sigma: std(values), muStarSe: standardError(absolute), effects: values,
        q05: quantile(values, 0.05), q25: quantile(values, 0.25), median: quantile(values, 0.5), q75: quantile(values, 0.75), q95: quantile(values, 0.95) };
    });
    const prefixes = [];
    for (let n = Math.min(4, trajectories); n < trajectories; n *= 2) prefixes.push(n);
    if (!prefixes.includes(trajectories)) prefixes.push(trajectories);
    const convergence = prefixes.map(n => ({ trajectories: n, rows: spec.names.map(name => ({ name, muStar: mean(effects[name].slice(0, n).map(Math.abs)), sigma: std(effects[name].slice(0, n)) })) }));
    const rankStability = bootstrapRanks(effects, bootstrapReplicates, mulberry32((Number(seed) + 104729) >>> 0));
    return {
      method: 'morris', rows, traces, convergence, rankStability, evaluations: counter.count, trajectories, levels, delta,
      seed, bootstrapReplicates,
      warning: 'This is a seeded random Morris one-at-a-time screening design on normalized independent ranges, not an optimized trajectory design. μ* is comparable across the declared ranges; σ combines nonlinearity and interactions and is not an interaction decomposition. Bootstrap ranks resample the computed trajectories and do not add model evaluations.'
    };
  }

  function sampleMatrix(names, ranges, n, rng) {
    return Array.from({ length: n }, function () {
      const row = {};
      names.forEach(function (name) { const range = ranges[name]; row[name] = range[0] + rng() * (range[1] - range[0]); });
      return row;
    });
  }
  function sobolRow(name, yA, yB, yAB, varY) {
    const totalTerms = []; const firstTerms = []; const saltelliTerms = [];
    for (let i = 0; i < yA.length; i += 1) {
      totalTerms.push((yA[i] - yAB[i]) ** 2 / (2 * varY));
      firstTerms.push((yB[i] - yAB[i]) ** 2 / (2 * varY));
      saltelliTerms.push(yB[i] * (yAB[i] - yA[i]) / varY);
    }
    const total = mean(totalTerms); const first = 1 - mean(firstTerms); const saltelliFirst = mean(saltelliTerms);
    return { name, first, total, saltelliFirst, gap: total - first, firstSe: standardError(firstTerms), totalSe: standardError(totalTerms) };
  }
  function sampled(values, indices) { return indices.map(i => values[i]); }
  function bootstrapSobol(spec, yA, yB, mixedAB, mixedBA, replicates, seed, secondOrder) {
    const rng = mulberry32(seed); const n = yA.length;
    const firstSamples = Object.fromEntries(spec.names.map(name => [name, []]));
    const totalSamples = Object.fromEntries(spec.names.map(name => [name, []]));
    const pairSamples = {};
    if (secondOrder) for (let i = 0; i < spec.names.length; i += 1) for (let j = i + 1; j < spec.names.length; j += 1) pairSamples[`${spec.names[i]}::${spec.names[j]}`] = [];
    const rankSamples = Object.fromEntries(spec.names.map(name => [name, []]));
    for (let b = 0; b < replicates; b += 1) {
      const indices = Array.from({ length: n }, () => Math.floor(rng() * n));
      const a = sampled(yA, indices); const bb = sampled(yB, indices); const varY = variance(a.concat(bb));
      if (!(varY > 1e-30)) continue;
      const rows = spec.names.map(name => sobolRow(name, a, bb, sampled(mixedAB[name], indices), varY));
      rows.forEach(row => { firstSamples[row.name].push(row.first); totalSamples[row.name].push(row.total); });
      rows.slice().sort((x, y) => y.total - x.total).forEach((row, index) => rankSamples[row.name].push(index + 1));
      if (secondOrder) {
        for (let i = 0; i < spec.names.length; i += 1) for (let j = i + 1; j < spec.names.length; j += 1) {
          const ni = spec.names[i], nj = spec.names[j];
          const abi = sampled(mixedAB[ni], indices), abj = sampled(mixedAB[nj], indices);
          const bai = sampled(mixedBA[ni], indices), baj = sampled(mixedBA[nj], indices);
          const closed1 = mean(a.map((value, k) => bai[k] * abj[k] - value * bb[k])) / varY;
          const closed2 = mean(a.map((value, k) => baj[k] * abi[k] - value * bb[k])) / varY;
          const si = rows.find(row => row.name === ni).saltelliFirst;
          const sj = rows.find(row => row.name === nj).saltelliFirst;
          pairSamples[`${ni}::${nj}`].push(0.5 * (closed1 + closed2) - si - sj);
        }
      }
    }
    const intervals = spec.names.map(name => ({
      name,
      firstLow: quantile(firstSamples[name], 0.025), firstHigh: quantile(firstSamples[name], 0.975),
      totalLow: quantile(totalSamples[name], 0.025), totalHigh: quantile(totalSamples[name], 0.975),
      medianRank: quantile(rankSamples[name], 0.5), rankLow: quantile(rankSamples[name], 0.025), rankHigh: quantile(rankSamples[name], 0.975),
      topProbability: rankSamples[name].length ? rankSamples[name].filter(rank => rank === 1).length / rankSamples[name].length : NaN
    }));
    return { intervals, pairSamples };
  }
  function secondOrderRows(spec, yA, yB, mixedAB, mixedBA, varY, pairSamples) {
    const firstRows = Object.fromEntries(spec.names.map(name => [name, sobolRow(name, yA, yB, mixedAB[name], varY)]));
    const rows = [];
    for (let i = 0; i < spec.names.length; i += 1) for (let j = i + 1; j < spec.names.length; j += 1) {
      const ni = spec.names[i], nj = spec.names[j];
      const closed1 = mean(yA.map((value, k) => mixedBA[ni][k] * mixedAB[nj][k] - value * yB[k])) / varY;
      const closed2 = mean(yA.map((value, k) => mixedBA[nj][k] * mixedAB[ni][k] - value * yB[k])) / varY;
      const value = 0.5 * (closed1 + closed2) - firstRows[ni].saltelliFirst - firstRows[nj].saltelliFirst;
      const samples = pairSamples[`${ni}::${nj}`] || [];
      rows.push({ first: ni, second: nj, value, se: samples.length > 1 ? std(samples) : NaN, ciLow: quantile(samples, 0.025), ciHigh: quantile(samples, 0.975) });
    }
    return rows;
  }
  function outputHistogram(values, bins) {
    const min = Math.min(...values), max = Math.max(...values); const count = Math.max(5, bins || 20);
    if (!(max > min)) return [{ center: min, count: values.length }];
    const width = (max - min) / count; const out = Array.from({ length: count }, (_, i) => ({ center: min + (i + 0.5) * width, count: 0 }));
    values.forEach(value => { const index = Math.min(count - 1, Math.floor((value - min) / width)); out[index].count += 1; });
    return out;
  }

  function linspace(start, end, count) {
    if (count <= 1) return [start];
    return Array.from({ length: count }, (_, index) => start + (end - start) * index / (count - 1));
  }
  function ofat(config) {
    const spec = parameterSpec(config); const evaluate = config.evaluate;
    assert(typeof evaluate === 'function', 'OFAT analysis requires an evaluate(params) function.');
    const points = Math.max(5, Math.min(21, Math.floor(finite(config.points == null ? 9 : config.points, 'OFAT points'))));
    const counter = { count: 0 }; const base = evaluateChecked(evaluate, spec.values, counter);
    const rows = spec.names.map(function (name) {
      const range = spec.ranges[name];
      const values = linspace(range[0], range[1], points);
      const outputs = values.map(function (value) {
        const params = Object.assign({}, spec.values, { [name]: value });
        return evaluateChecked(evaluate, params, counter);
      });
      const nominalFraction = (spec.values[name] - range[0]) / spec.spans[name];
      return {
        name, values, outputs,
        normalized: values.map(value => (value - spec.values[name]) / spec.spans[name]),
        nominal: spec.values[name], nominalFraction,
        lowChange: outputs[0] - base, highChange: outputs[outputs.length - 1] - base
      };
    });
    return { base, rows, points, evaluations: counter.count, warning: 'OFAT curves vary one parameter at a time while all others remain at the nominal point. They do not include interactions and are not a replacement for global sensitivity analysis.' };
  }
  function directionalProfile(config) {
    const spec = parameterSpec(config); const evaluate = config.evaluate;
    assert(typeof evaluate === 'function', 'Directional sensitivity requires an evaluate(params) function.');
    const points = Math.max(5, Math.min(21, Math.floor(finite(config.points == null ? 9 : config.points, 'Directional profile points'))));
    const span = Math.max(1e-6, Math.min(1, finite(config.span == null ? 0.25 : config.span, 'Directional span')));
    const raw = config.direction || {};
    const vector = spec.names.map(name => Number(raw[name] == null ? 0 : raw[name]));
    assert(vector.every(Number.isFinite), 'Directional coefficients must be finite.');
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    assert(norm > 0, 'At least one directional coefficient must be non-zero.');
    const direction = vector.map(value => value / norm);
    const normalizedBase = spec.names.map(name => (spec.values[name] - spec.ranges[name][0]) / spec.spans[name]);
    let positive = span; let negative = span;
    direction.forEach(function (value, index) {
      if (value > 0) { positive = Math.min(positive, (1 - normalizedBase[index]) / value); negative = Math.min(negative, normalizedBase[index] / value); }
      if (value < 0) { positive = Math.min(positive, normalizedBase[index] / -value); negative = Math.min(negative, (1 - normalizedBase[index]) / -value); }
    });
    const radius = Math.min(positive, negative, span);
    assert(radius > 1e-8, 'The declared direction cannot be perturbed symmetrically inside the parameter ranges. Move the nominal values away from a boundary or choose another direction.');
    const steps = linspace(-radius, radius, points); const counter = { count: 0 };
    const outputs = steps.map(function (step) {
      const params = {};
      spec.names.forEach(function (name, index) {
        const u = normalizedBase[index] + step * direction[index];
        params[name] = spec.ranges[name][0] + u * spec.spans[name];
      });
      return evaluateChecked(evaluate, params, counter);
    });
    const middle = Math.floor(points / 2); const left = Math.max(0, middle - 1); const right = Math.min(points - 1, middle + 1);
    const derivative = (outputs[right] - outputs[left]) / (steps[right] - steps[left]);
    return { names: spec.names, direction: Object.fromEntries(spec.names.map((name, index) => [name, direction[index]])), steps, outputs, derivative, radius, evaluations: counter.count, warning: 'The direction is normalized in parameter-range coordinates. The derivative is local to the nominal point and depends on the declared direction and range scaling.' };
  }
  function responseSurface(config) {
    const spec = parameterSpec(config); const evaluate = config.evaluate;
    assert(typeof evaluate === 'function', 'Response-surface analysis requires an evaluate(params) function.');
    const first = String(config.first || ''); const second = String(config.second || '');
    assert(spec.names.includes(first) && spec.names.includes(second) && first !== second, 'Response surface requires two distinct declared parameters.');
    const points = Math.max(5, Math.min(15, Math.floor(finite(config.points == null ? 7 : config.points, 'Response-surface grid points'))));
    const x = linspace(spec.ranges[first][0], spec.ranges[first][1], points);
    const y = linspace(spec.ranges[second][0], spec.ranges[second][1], points);
    const counter = { count: 0 };
    const z = y.map(function (yv) {
      return x.map(function (xv) {
        const params = Object.assign({}, spec.values, { [first]: xv, [second]: yv });
        return evaluateChecked(evaluate, params, counter);
      });
    });
    return { first, second, x, y, z, points, evaluations: counter.count, warning: 'This is a bounded two-parameter response surface with all other parameters fixed at their nominal values. It is not a complete global sensitivity decomposition.' };
  }
  function binIndices(values, bins) {
    const thresholds = Array.from({ length: bins - 1 }, (_, index) => quantile(values, (index + 1) / bins));
    return values.map(value => { let index = 0; while (index < thresholds.length && value > thresholds[index]) index += 1; return index; });
  }
  function normalizedMutualInformation(x, y, bins) {
    const bx = binIndices(x, bins), by = binIndices(y, bins), n = x.length;
    const joint = Array.from({ length: bins }, () => Array(bins).fill(0));
    const px = Array(bins).fill(0), py = Array(bins).fill(0);
    for (let i = 0; i < n; i += 1) { joint[bx[i]][by[i]] += 1; px[bx[i]] += 1; py[by[i]] += 1; }
    let mi = 0, hx = 0, hy = 0;
    px.forEach(count => { if (count) { const p = count / n; hx -= p * Math.log(p); } });
    py.forEach(count => { if (count) { const p = count / n; hy -= p * Math.log(p); } });
    for (let i = 0; i < bins; i += 1) for (let j = 0; j < bins; j += 1) if (joint[i][j]) {
      const pxy = joint[i][j] / n; mi += pxy * Math.log(pxy / ((px[i] / n) * (py[j] / n)));
    }
    return { raw: mi, normalized: hx > 0 && hy > 0 ? mi / Math.sqrt(hx * hy) : 0 };
  }
  function pairwiseMedianSquared(values) {
    const distances = [];
    for (let i = 0; i < values.length; i += 1) for (let j = i + 1; j < values.length; j += 1) {
      const d = values[i] - values[j]; if (d !== 0) distances.push(d * d);
    }
    return distances.length ? quantile(distances, 0.5) : 1;
  }
  function centeredRbf(values) {
    const n = values.length; const median = Math.max(1e-12, pairwiseMedianSquared(values));
    const kernel = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => Math.exp(-((values[i] - values[j]) ** 2) / (2 * median))));
    const rowMeans = kernel.map(row => mean(row)); const grand = mean(rowMeans);
    return kernel.map((row, i) => row.map((value, j) => value - rowMeans[i] - rowMeans[j] + grand));
  }
  function matrixInner(a, b, permutation) {
    let sum = 0; const n = a.length;
    for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) sum += a[i][j] * b[permutation ? permutation[i] : i][permutation ? permutation[j] : j];
    return sum;
  }
  function normalizedHsic(x, y) {
    const k = centeredRbf(x), l = centeredRbf(y);
    const numerator = matrixInner(k, l); const denominator = Math.sqrt(Math.max(1e-30, matrixInner(k, k) * matrixInner(l, l)));
    return { value: numerator / denominator, inputKernel: k, outputKernel: l };
  }
  function dependenceDiagnostics(sampleRows, names, options) {
    const cfg = options || {}; const maxSamples = Math.max(32, Math.min(128, Math.floor(Number(cfg.maxSamples) || 128)));
    const permutations = Math.max(19, Math.min(49, Math.floor(Number(cfg.permutations) || 29)));
    const bins = Math.max(4, Math.min(12, Math.floor(Number(cfg.bins) || 8)));
    const rows = sampleRows.slice(0, maxSamples); assert(rows.length >= 32, 'Dependence diagnostics require at least 32 sampled outputs.');
    const y = rows.map(row => Number(row.__output != null ? row.__output : row.output)); assert(y.every(Number.isFinite), 'Dependence diagnostic outputs must be finite.');
    const rng = mulberry32(Number(cfg.seed) || 918273);
    const results = names.map(function (name) {
      const x = rows.map(row => Number(row[name])); assert(x.every(Number.isFinite), `Dependence samples for ${name} must be finite.`);
      const mi = normalizedMutualInformation(x, y, bins); const hsic = normalizedHsic(x, y);
      let miExtreme = 0, hsicExtreme = 0;
      for (let b = 0; b < permutations; b += 1) {
        const order = shuffle(Array.from({ length: rows.length }, (_, index) => index), rng);
        const permuted = order.map(index => y[index]);
        if (normalizedMutualInformation(x, permuted, bins).normalized >= mi.normalized) miExtreme += 1;
        if (matrixInner(hsic.inputKernel, hsic.outputKernel, order) / Math.sqrt(Math.max(1e-30, matrixInner(hsic.inputKernel, hsic.inputKernel) * matrixInner(hsic.outputKernel, hsic.outputKernel))) >= hsic.value) hsicExtreme += 1;
      }
      return { name, mutualInformation: mi.normalized, mutualInformationRaw: mi.raw, mutualInformationP: (miExtreme + 1) / (permutations + 1), hsic: hsic.value, hsicP: (hsicExtreme + 1) / (permutations + 1) };
    });
    return { rows: results, sampleCount: rows.length, permutations, bins, warning: 'Mutual information uses quantile-bin discretization and HSIC uses RBF kernels with a median-distance bandwidth. Permutation p-values are coarse screening diagnostics, not calibrated effect sizes or variance fractions.' };
  }

  function sobolJansen(config) {
    const spec = parameterSpec(config); const evaluate = config.evaluate;
    assert(typeof evaluate === 'function', 'Sobol analysis requires an evaluate(params) function.');
    const samples = Math.max(16, Math.floor(finite(config.samples == null ? 128 : config.samples, 'Sobol base samples')));
    const secondOrder = config.secondOrder === true || config.secondOrder === 'true';
    const bootstrapReplicates = Math.max(0, Math.floor(finite(config.bootstrapReplicates == null ? 200 : config.bootstrapReplicates, 'Bootstrap replicates')));
    const seed = config.seed == null ? 1729 : config.seed;
    const observer = typeof config.sampleObserver === 'function' ? config.sampleObserver : null;
    const rng = mulberry32(seed); const counter = { count: 0 };
    const A = sampleMatrix(spec.names, spec.ranges, samples, rng); const B = sampleMatrix(spec.names, spec.ranges, samples, rng);
    const yA = A.map((row, index) => evaluateChecked(evaluate, row, counter, observer, { role: 'A', index }));
    const yB = B.map((row, index) => evaluateChecked(evaluate, row, counter, observer, { role: 'B', index }));
    const pooled = yA.concat(yB); const varY = variance(pooled);
    assert(varY > 1e-30, 'Model output variance is effectively zero over the declared parameter ranges.');
    const mixedAB = {}; const mixedBA = {};
    spec.names.forEach(function (name) {
      mixedAB[name] = A.map(function (row, i) { return evaluateChecked(evaluate, Object.assign({}, row, { [name]: B[i][name] }), counter, observer, { role: 'AB', name, index: i }); });
      if (secondOrder) mixedBA[name] = B.map(function (row, i) { return evaluateChecked(evaluate, Object.assign({}, row, { [name]: A[i][name] }), counter, observer, { role: 'BA', name, index: i }); });
    });
    const rows = spec.names.map(name => sobolRow(name, yA, yB, mixedAB[name], varY));
    const bootstrap = bootstrapSobol(spec, yA, yB, mixedAB, mixedBA, bootstrapReplicates, (Number(seed) + 130363) >>> 0, secondOrder);
    rows.forEach(row => Object.assign(row, bootstrap.intervals.find(item => item.name === row.name) || {}));
    const secondOrderRowsValue = secondOrder ? secondOrderRows(spec, yA, yB, mixedAB, mixedBA, varY, bootstrap.pairSamples) : [];
    const secondOrderMatrix = spec.names.map((name, i) => spec.names.map((other, j) => {
      if (i === j) return 0;
      const found = secondOrderRowsValue.find(row => (row.first === name && row.second === other) || (row.first === other && row.second === name));
      return found ? found.value : 0;
    }));
    const sampleSizes = [];
    for (let n = 16; n < samples; n *= 2) sampleSizes.push(n);
    if (!sampleSizes.includes(samples)) sampleSizes.push(samples);
    const convergence = sampleSizes.map(function (n) {
      const prefixVariance = variance(yA.slice(0, n).concat(yB.slice(0, n)));
      return { samples: n, rows: spec.names.map(name => sobolRow(name, yA.slice(0, n), yB.slice(0, n), mixedAB[name].slice(0, n), prefixVariance)) };
    });
    const unresolved = rows.some(row => row.first < -0.05 || row.total > 1.05 || row.total < row.first - 0.05);
    const pooledRows = A.map((row, index) => Object.assign({}, row, { __output: yA[index] })).concat(B.map((row, index) => Object.assign({}, row, { __output: yB[index] })));
    const sampleLimit = Math.min(256, pooledRows.length);
    const sampleRows = Array.from({ length: sampleLimit }, (_, index) => pooledRows[Math.floor(index * pooledRows.length / sampleLimit)]);
    const firstOrderSum = rows.reduce((sum, row) => sum + row.first, 0);
    const pairwiseSum = secondOrderRowsValue.reduce((sum, row) => sum + row.value, 0);
    const varianceContribution = { firstOrder: firstOrderSum, pairwise: pairwiseSum, unresolved: 1 - firstOrderSum - pairwiseSum };
    const dependence = config.dependence ? dependenceDiagnostics(sampleRows, spec.names, { permutations: config.dependencePermutations, bins: config.dependenceBins, seed: Number(seed) + 7331 }) : null;
    return {
      method: 'sobol', rows, convergence, secondOrder: secondOrderRowsValue, secondOrderMatrix, names: spec.names,
      outputHistogram: outputHistogram(pooled, Math.min(32, Math.max(10, Math.round(Math.sqrt(pooled.length))))),
      sampleRows, varianceContribution, dependence,
      samples, evaluations: counter.count, outputMean: mean(pooled), outputVariance: varY, seed, bootstrapReplicates,
      secondOrderEnabled: secondOrder,
      warning: `Jansen first- and total-order indices are finite-sample estimates over independent uniform parameter ranges. Values are intentionally not clipped to [0,1].${secondOrder ? ' Pairwise interactions use a symmetrized Saltelli second-order estimator and require both A_B(i) and B_A(i) matrices.' : ''} Bootstrap intervals resample the existing Monte Carlo rows and do not replace independent replicated designs.${dependence ? ' MI and HSIC are limited dependence-screening diagnostics with explicit estimators and permutation tests.' : ''}${unresolved ? ' This run contains unresolved out-of-range or order-inconsistent estimates.' : ''}`
    };
  }

  function jacobiEigenSymmetric(matrix, tolerance, maxSweeps) {
    const A = matrix.map(row => row.slice()); const n = A.length;
    if (n === 1) return [A[0][0]];
    for (let sweep = 0; sweep < maxSweeps; sweep += 1) {
      let p = 0; let q = 1; let max = 0;
      for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) if (Math.abs(A[i][j]) > max) { max = Math.abs(A[i][j]); p = i; q = j; }
      if (max < tolerance) break;
      const phi = 0.5 * Math.atan2(2 * A[p][q], A[q][q] - A[p][p]); const c = Math.cos(phi); const s = Math.sin(phi);
      for (let k = 0; k < n; k += 1) {
        if (k === p || k === q) continue;
        const akp = A[k][p]; const akq = A[k][q];
        A[k][p] = A[p][k] = c * akp - s * akq;
        A[k][q] = A[q][k] = s * akp + c * akq;
      }
      const app = A[p][p]; const aqq = A[q][q]; const apq = A[p][q];
      A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
      A[p][q] = A[q][p] = 0;
    }
    return A.map((row, i) => row[i]).sort((a, b) => b - a);
  }
  function fim(config) {
    const spec = parameterSpec(config); const evaluateVector = config.evaluateVector;
    assert(typeof evaluateVector === 'function', 'FIM analysis requires evaluateVector(params).');
    const relativeStep = finite(config.relativeStep == null ? 1e-3 : config.relativeStep, 'Relative perturbation');
    assert(relativeStep > 0 && relativeStep <= 0.25, 'Relative perturbation must be in (0,0.25].');
    const sigma = finite(config.sigma == null ? 1 : config.sigma, 'Observation noise scale');
    assert(sigma > 0, 'Observation noise scale must be positive.');
    const counter = { count: 0 }; const base = evaluateVector(Object.assign({}, spec.values)).map(Number); counter.count += 1;
    assert(base.length > 0 && base.every(Number.isFinite), 'FIM output vector must be finite and non-empty.');
    const rawSensitivity = base.map(() => Array(spec.names.length).fill(0));
    const parameterScales = spec.names.map(name => Math.max(Math.abs(spec.values[name]), spec.spans[name], 1e-12));
    spec.names.forEach(function (name, column) {
      const range = spec.ranges[name]; const h = stepFor(spec.values[name], range, relativeStep);
      const plusParams = Object.assign({}, spec.values); const minusParams = Object.assign({}, spec.values);
      plusParams[name] = Math.min(range[1], spec.values[name] + h); minusParams[name] = Math.max(range[0], spec.values[name] - h);
      const actual = plusParams[name] - minusParams[name]; assert(actual > 0, `Parameter ${name} cannot be perturbed inside its range.`);
      const plus = evaluateVector(plusParams).map(Number); const minus = evaluateVector(minusParams).map(Number); counter.count += 2;
      assert(plus.length === base.length && minus.length === base.length && plus.every(Number.isFinite) && minus.every(Number.isFinite), 'FIM perturbation output vectors must match the base output length and remain finite.');
      for (let row = 0; row < base.length; row += 1) rawSensitivity[row][column] = (plus[row] - minus[row]) / actual / sigma;
    });
    const scaledSensitivity = rawSensitivity.map(row => row.map((value, j) => value * parameterScales[j]));
    const matrix = Array.from({ length: spec.names.length }, (_, i) => Array.from({ length: spec.names.length }, (_, j) => scaledSensitivity.reduce((sum, row) => sum + row[i] * row[j], 0)));
    const rawMatrix = Array.from({ length: spec.names.length }, (_, i) => Array.from({ length: spec.names.length }, (_, j) => rawSensitivity.reduce((sum, row) => sum + row[i] * row[j], 0)));
    const eigenvalues = jacobiEigenSymmetric(matrix, 1e-12, 300);
    const maxEigen = Math.max(0, eigenvalues[0] || 0); const threshold = Math.max(1e-14, maxEigen * 1e-10);
    const rank = eigenvalues.filter(value => value > threshold).length;
    const condition = rank === spec.names.length && rank > 0 ? maxEigen / eigenvalues[rank - 1] : Infinity;
    const diagonal = matrix.map((row, i) => row[i]);
    const alignment = matrix.map(function (row, i) {
      return row.map(function (value, j) {
        const scale = Math.sqrt(Math.max(0, diagonal[i] * diagonal[j]));
        return scale > 0 ? value / scale : 0;
      });
    });
    return {
      method: 'fim', names: spec.names, matrix, rawMatrix, alignment, eigenvalues,
      sensitivities: scaledSensitivity, rawSensitivities: rawSensitivity, base,
      evaluations: counter.count, condition, rank, threshold, sigma, parameterScales,
      warning: 'This is a local, range-scaled finite-difference information matrix from a downsampled trajectory under independent equal-variance errors. Its normalized matrix is sensitivity-column alignment, not parameter posterior correlation. Rank and conditioning are scale-, output-, time-grid-, perturbation-, and noise-model-dependent.'
    };
  }

  const api = Object.freeze({ localFiniteDifference, ofat, directionalProfile, responseSurface, dependenceDiagnostics, morris, sobolJansen, fim, estimateEvaluations, mulberry32, mean, variance, std, quantile });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoSensitivityCore = api;
}(typeof self !== 'undefined' ? self : globalThis));
