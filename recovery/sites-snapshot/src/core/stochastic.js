/* Foko Lab stochastic numerical core — pure, DOM-free, testable.
 * Scope: finite-state, time-homogeneous continuous-time Markov chains
 * simulated with Gillespie's direct stochastic simulation algorithm (SSA).
 * Browser: window.FokoStochasticCore. Node: require('./src/core/stochastic.js').
 */
(function (root) {
  'use strict';

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function finiteNumber(value, name) {
    const number = Number(value);
    assert(Number.isFinite(number), `${name} must be finite (got ${value}).`);
    return number;
  }

  function positiveInteger(value, name, maximum) {
    const number = Number(value);
    assert(Number.isInteger(number) && number > 0, `${name} must be a positive integer.`);
    if (maximum != null) assert(number <= maximum, `${name} must be <= ${maximum}.`);
    return number;
  }

  function nonnegativeInteger(value, name) {
    const number = Number(value);
    assert(Number.isInteger(number) && number >= 0, `${name} must be a non-negative integer.`);
    return number;
  }

  function seededRandom(seed) {
    let x = (Number(seed) >>> 0) || 0x9e3779b9;
    return function nextRandom() {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  function deriveSeed(baseSeed, trajectoryIndex) {
    let value = ((Number(baseSeed) >>> 0) + Math.imul((trajectoryIndex + 1) >>> 0, 0x9e3779b1)) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x85ebca6b) >>> 0;
    value ^= value >>> 13;
    value = Math.imul(value, 0xc2b2ae35) >>> 0;
    value ^= value >>> 16;
    return value || 0xa341316c;
  }

  function observationTimes(t0, t1, points) {
    const start = finiteNumber(t0, 't0');
    const end = finiteNumber(t1, 't1');
    assert(end > start, 't1 must be greater than t0.');
    const count = positiveInteger(points, 'points', 5000);
    assert(count >= 2, 'points must be at least 2.');
    return Array.from({ length: count }, function (_, index) {
      return start + (end - start) * index / (count - 1);
    });
  }

  function validateModel(model) {
    assert(model && typeof model === 'object', 'A CTMC model object is required.');
    assert(Array.isArray(model.stateNames) && model.stateNames.length > 0, 'stateNames must be a non-empty array.');
    const stateNames = model.stateNames.map(function (name, index) {
      const clean = String(name || '').trim();
      assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(clean), `stateNames[${index}] is not a valid symbol.`);
      return clean;
    });
    assert(new Set(stateNames).size === stateNames.length, 'State names must be unique.');
    assert(Array.isArray(model.initial) && model.initial.length === stateNames.length, 'initial must match stateNames length.');
    const initial = model.initial.map(function (value, index) {
      return nonnegativeInteger(value, `initial[${index}]`);
    });
    const params = Object.assign({}, model.params || {});
    Object.keys(params).forEach(function (name) {
      assert(/^[A-Za-z_][A-Za-z0-9_]*$/.test(name), `Parameter ${name} is not a valid symbol.`);
      params[name] = finiteNumber(params[name], `parameter ${name}`);
    });
    assert(Array.isArray(model.reactions) && model.reactions.length > 0, 'At least one reaction is required.');
    const reactions = model.reactions.map(function (reaction, index) {
      assert(reaction && typeof reaction === 'object', `reaction[${index}] must be an object.`);
      assert(typeof reaction.propensity === 'function', `reaction[${index}] requires a propensity function.`);
      assert(Array.isArray(reaction.change) && reaction.change.length === stateNames.length, `reaction[${index}].change must match state dimension.`);
      const change = reaction.change.map(function (value, stateIndex) {
        const number = Number(value);
        assert(Number.isInteger(number), `reaction[${index}].change[${stateIndex}] must be an integer.`);
        return number;
      });
      return {
        name: String(reaction.name || `reaction_${index + 1}`),
        propensity: reaction.propensity,
        change,
      };
    });
    return { stateNames, initial, params, reactions };
  }

  function evaluatePropensities(model, state, time) {
    return model.reactions.map(function (reaction, index) {
      const raw = Number(reaction.propensity(state.slice(), time, Object.assign({}, model.params)));
      assert(Number.isFinite(raw), `Propensity ${reaction.name || index + 1} returned a non-finite value.`);
      assert(raw >= -1e-12, `Propensity ${reaction.name || index + 1} returned a negative value (${raw}).`);
      return Math.max(0, raw);
    });
  }

  function selectReaction(propensities, total, random) {
    const threshold = random() * total;
    let cumulative = 0;
    for (let index = 0; index < propensities.length; index += 1) {
      cumulative += propensities[index];
      if (threshold < cumulative || index === propensities.length - 1) return index;
    }
    return propensities.length - 1;
  }

  function simulateSSA(config) {
    assert(config && typeof config === 'object', 'simulateSSA needs a configuration object.');
    const model = validateModel(config.model);
    const times = Array.isArray(config.times)
      ? config.times.map(function (value, index) { return finiteNumber(value, `times[${index}]`); })
      : observationTimes(config.t0 == null ? 0 : config.t0, config.t1 == null ? 10 : config.t1, config.points == null ? 200 : config.points);
    assert(times.length >= 2, 'At least two observation times are required.');
    for (let index = 1; index < times.length; index += 1) assert(times[index] > times[index - 1], 'Observation times must be strictly increasing.');
    const seed = Number(config.seed) >>> 0;
    const random = seededRandom(seed);
    const maxEvents = positiveInteger(config.maxEvents == null ? 1000000 : config.maxEvents, 'maxEvents', 10000000);
    const states = model.stateNames.map(function () { return Array(times.length).fill(null); });
    let state = model.initial.slice();
    let time = times[0];
    let eventCount = 0;
    let absorbing = false;
    let truncated = false;
    let minimumTotalPropensity = Infinity;
    let maximumTotalPropensity = 0;

    state.forEach(function (value, stateIndex) { states[stateIndex][0] = value; });

    for (let observationIndex = 1; observationIndex < times.length; observationIndex += 1) {
      const target = times[observationIndex];
      while (time < target) {
        if (eventCount >= maxEvents) {
          truncated = true;
          time = target;
          break;
        }
        const propensities = evaluatePropensities(model, state, time);
        const total = propensities.reduce(function (sum, value) { return sum + value; }, 0);
        minimumTotalPropensity = Math.min(minimumTotalPropensity, total);
        maximumTotalPropensity = Math.max(maximumTotalPropensity, total);
        if (!(total > 0)) {
          absorbing = true;
          time = target;
          break;
        }
        const waiting = -Math.log(Math.max(Number.MIN_VALUE, 1 - random())) / total;
        if (time + waiting > target) {
          time = target;
          break;
        }
        time += waiting;
        const reactionIndex = selectReaction(propensities, total, random);
        const next = state.map(function (value, stateIndex) {
          return value + model.reactions[reactionIndex].change[stateIndex];
        });
        next.forEach(function (value, stateIndex) {
          assert(Number.isInteger(value), `Reaction ${model.reactions[reactionIndex].name} produced a non-integer state at index ${stateIndex}.`);
          assert(value >= 0, `Reaction ${model.reactions[reactionIndex].name} produced a negative state ${model.stateNames[stateIndex]}=${value}. Check the propensity guard.`);
        });
        state = next;
        eventCount += 1;
      }
      state.forEach(function (value, stateIndex) { states[stateIndex][observationIndex] = value; });
      if (truncated) {
        for (let remaining = observationIndex + 1; remaining < times.length; remaining += 1) {
          state.forEach(function (value, stateIndex) { states[stateIndex][remaining] = value; });
        }
        break;
      }
      if (absorbing) {
        for (let remaining = observationIndex + 1; remaining < times.length; remaining += 1) {
          state.forEach(function (value, stateIndex) { states[stateIndex][remaining] = value; });
        }
        break;
      }
    }

    if (!Number.isFinite(minimumTotalPropensity)) minimumTotalPropensity = 0;
    return {
      times,
      states,
      final: state.slice(),
      eventCount,
      absorbing,
      truncated,
      seed,
      propensityRange: [minimumTotalPropensity, maximumTotalPropensity],
    };
  }

  function quantile(values, probability) {
    assert(Array.isArray(values) && values.length > 0, 'quantile requires a non-empty array.');
    const p = Math.max(0, Math.min(1, finiteNumber(probability, 'probability')));
    const sorted = values.map(Number).sort(function (a, b) { return a - b; });
    const position = (sorted.length - 1) * p;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return sorted[lower];
    const fraction = position - lower;
    return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
  }

  function sampleMoments(values) {
    assert(Array.isArray(values) && values.length > 0, 'sampleMoments requires a non-empty array.');
    const count = values.length;
    const mean = values.reduce(function (sum, value) { return sum + Number(value); }, 0) / count;
    const variance = count > 1
      ? values.reduce(function (sum, value) { const delta = Number(value) - mean; return sum + delta * delta; }, 0) / (count - 1)
      : 0;
    const sd = Math.sqrt(Math.max(0, variance));
    const standardError = sd / Math.sqrt(count);
    return {
      count,
      mean,
      variance,
      sd,
      standardError,
      mc95: [mean - 1.96 * standardError, mean + 1.96 * standardError],
      min: Math.min.apply(null, values),
      max: Math.max.apply(null, values),
      median: quantile(values, 0.5),
      q05: quantile(values, 0.05),
      q95: quantile(values, 0.95),
    };
  }

  function summarizeTrajectories(paths, stateNames, times) {
    return stateNames.map(function (name, stateIndex) {
      const mean = [];
      const variance = [];
      const low = [];
      const median = [];
      const high = [];
      for (let timeIndex = 0; timeIndex < times.length; timeIndex += 1) {
        const values = paths.map(function (trajectory) { return trajectory[stateIndex][timeIndex]; });
        const moments = sampleMoments(values);
        mean.push(moments.mean);
        variance.push(moments.variance);
        low.push(moments.q05);
        median.push(moments.median);
        high.push(moments.q95);
      }
      const finalValues = paths.map(function (trajectory) { return trajectory[stateIndex][times.length - 1]; });
      return {
        name,
        mean,
        variance,
        low,
        median,
        high,
        finalValues,
        final: sampleMoments(finalValues),
      };
    });
  }

  function nowMilliseconds() {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }

  function simulateEnsemble(config) {
    assert(config && typeof config === 'object', 'simulateEnsemble needs a configuration object.');
    const model = validateModel(config.model);
    const runs = positiveInteger(config.runs == null ? 100 : config.runs, 'runs', 2000);
    const seed = Number(config.seed == null ? 12345 : config.seed) >>> 0;
    const maxEvents = positiveInteger(config.maxEvents == null ? 1000000 : config.maxEvents, 'maxEvents', 10000000);
    const times = observationTimes(config.t0 == null ? 0 : config.t0, config.t1 == null ? 10 : config.t1, config.points == null ? 200 : config.points);
    const started = nowMilliseconds();
    const trajectories = [];
    const eventCounts = [];
    const finalStates = [];
    let absorbingRuns = 0;
    let truncatedRuns = 0;
    let minimumTotalPropensity = Infinity;
    let maximumTotalPropensity = 0;

    for (let runIndex = 0; runIndex < runs; runIndex += 1) {
      const trajectory = simulateSSA({
        model,
        times,
        seed: deriveSeed(seed, runIndex),
        maxEvents,
      });
      trajectories.push(trajectory.states);
      eventCounts.push(trajectory.eventCount);
      finalStates.push(trajectory.final);
      if (trajectory.absorbing) absorbingRuns += 1;
      if (trajectory.truncated) truncatedRuns += 1;
      minimumTotalPropensity = Math.min(minimumTotalPropensity, trajectory.propensityRange[0]);
      maximumTotalPropensity = Math.max(maximumTotalPropensity, trajectory.propensityRange[1]);
      if (typeof config.onProgress === 'function' && (runIndex + 1) % Math.max(1, Math.ceil(runs / 20)) === 0) {
        config.onProgress((runIndex + 1) / runs, `Simulated ${runIndex + 1}/${runs} trajectories`);
      }
    }

    const summaries = summarizeTrajectories(trajectories, model.stateNames, times);
    const eventMoments = sampleMoments(eventCounts);
    const warnings = [];
    if (runs < 100) warnings.push('Fewer than 100 trajectories were simulated; empirical quantiles and Monte Carlo standard errors may be unstable.');
    if (truncatedRuns > 0) warnings.push(`${truncatedRuns}/${runs} trajectories reached the per-trajectory event cap; their tails are censored and must not be interpreted as complete simulations.`);
    if (maxEvents < 10000) warnings.push('The configured event cap is low for general use. Check the truncated-run count.');
    const runtimeMs = nowMilliseconds() - started;

    return {
      ok: truncatedRuns === 0,
      status: truncatedRuns === 0 ? (warnings.length ? 'warning' : 'success') : 'warning',
      algorithm: 'Gillespie direct SSA',
      scope: 'Time-homogeneous CTMC with integer, non-negative states',
      exactness: 'Exact event-time simulation for the declared time-homogeneous propensity model; summaries are Monte Carlo estimates.',
      seed,
      runs,
      times,
      stateNames: model.stateNames.slice(),
      trajectories,
      summaries,
      finalStates,
      eventCounts,
      eventMoments,
      absorbingRuns,
      truncatedRuns,
      maxEvents,
      propensityRange: [Number.isFinite(minimumTotalPropensity) ? minimumTotalPropensity : 0, maximumTotalPropensity],
      runtimeMs,
      warnings,
      uncertainty: {
        band: 'Empirical 5th–95th percentiles across independent seeded trajectories',
        finalMean: 'Normal-approximation Monte Carlo interval: sample mean ± 1.96 × sample SD / sqrt(runs)',
      },
    };
  }

  const api = {
    seededRandom,
    deriveSeed,
    observationTimes,
    validateModel,
    evaluatePropensities,
    simulateSSA,
    simulateEnsemble,
    quantile,
    sampleMoments,
    summarizeTrajectories,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.FokoStochasticCore = api;
}(typeof window !== 'undefined' ? window : globalThis));
