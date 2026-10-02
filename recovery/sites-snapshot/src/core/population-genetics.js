/* Foko Lab population-genetics core — seeded, DOM-free Wright–Fisher model.
 *
 * Two equal-sized diploid demes evolve under viability selection, bidirectional
 * mutation, symmetric migration and exact binomial genetic drift. The output is
 * finite-ensemble evidence; FST is the elementary variance ratio across two
 * demes, not a Weir–Cockerham estimate from sampled genotypes.
 *
 * Browser: window.FokoPopulationGeneticsCore. Node: require(...).
 */
(function (root) {
  'use strict';

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function number(value, name) {
    const parsed = Number(value);
    assert(Number.isFinite(parsed), name + ' must be finite.');
    return parsed;
  }

  function integer(value, name, minimum, maximum) {
    const parsed = number(value, name);
    assert(Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum,
      name + ' must be an integer from ' + minimum + ' to ' + maximum + '.');
    return parsed;
  }

  function probability(value, name) {
    const parsed = number(value, name);
    assert(parsed >= 0 && parsed <= 1, name + ' must lie in [0, 1].');
    return parsed;
  }

  function seededRandom(seed) {
    let state = (Number(seed) >>> 0) || 0x6d2b79f5;
    return function random() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function binomial(trials, p, random) {
    if (p <= 0) return 0;
    if (p >= 1) return trials;
    let successes = 0;
    // Exact Bernoulli summation is intentionally used. The workload validator
    // keeps the browser budget finite instead of silently changing algorithms.
    for (let i = 0; i < trials; i += 1) if (random() < p) successes += 1;
    return successes;
  }

  function selectedFrequency(p, s, h) {
    const q = 1 - p;
    const wAA = 1 + s;
    const wAa = 1 + h * s;
    const waa = 1;
    const meanFitness = p * p * wAA + 2 * p * q * wAa + q * q * waa;
    if (meanFitness <= 0) return p;
    return (p * p * wAA + p * q * wAa) / meanFitness;
  }

  function mutate(p, forward, reverse) {
    return p * (1 - reverse) + (1 - p) * forward;
  }

  function quantile(sorted, q) {
    if (!sorted.length) return NaN;
    const index = (sorted.length - 1) * q;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  function normaliseConfig(input) {
    const source = input || {};
    const config = {
      populationSize: integer(source.populationSize == null ? 100 : source.populationSize, 'Population size', 2, 10000),
      generations: integer(source.generations == null ? 150 : source.generations, 'Generations', 1, 5000),
      replicates: integer(source.replicates == null ? 120 : source.replicates, 'Replicates', 2, 1000),
      initialP1: probability(source.initialP1 == null ? 0.2 : source.initialP1, 'Initial frequency in deme 1'),
      initialP2: probability(source.initialP2 == null ? 0.8 : source.initialP2, 'Initial frequency in deme 2'),
      selection: number(source.selection == null ? 0 : source.selection, 'Selection coefficient'),
      dominance: number(source.dominance == null ? 0.5 : source.dominance, 'Dominance coefficient'),
      mutationForward: probability(source.mutationForward == null ? 0 : source.mutationForward, 'Forward mutation rate'),
      mutationReverse: probability(source.mutationReverse == null ? 0 : source.mutationReverse, 'Reverse mutation rate'),
      migration: probability(source.migration == null ? 0.02 : source.migration, 'Migration rate'),
      seed: integer(source.seed == null ? 1729 : source.seed, 'Seed', 0, 4294967295)
    };
    assert(config.selection >= -1 && config.selection <= 10, 'Selection coefficient must lie in [-1, 10].');
    assert(config.dominance >= -10 && config.dominance <= 10, 'Dominance coefficient must lie in [-10, 10].');
    assert(1 + config.selection >= 0 && 1 + config.dominance * config.selection >= 0,
      'Selection and dominance produce a negative genotype fitness.');
    assert(config.migration <= 0.5, 'Symmetric migration must lie in [0, 0.5].');
    const bernoulliDraws = 4 * config.populationSize * config.generations * config.replicates;
    assert(bernoulliDraws <= 30000000,
      'Requested run exceeds the 30 million exact-drift draw budget. Reduce population size, generations, or replicates.');
    config.bernoulliDraws = bernoulliDraws;
    return config;
  }

  function summarise(generation, states) {
    const frequencies = [];
    const deme1 = [];
    const deme2 = [];
    let mean = 0;
    let meanP1 = 0;
    let meanP2 = 0;
    let meanAbsoluteDifference = 0;
    let heterozygosity = 0;
    let fst = 0;
    let fixed = 0;
    let lost = 0;
    states.forEach(function (state) {
      const p1 = state[0];
      const p2 = state[1];
      const pooled = (p1 + p2) / 2;
      frequencies.push(p1, p2);
      deme1.push(p1);
      deme2.push(p2);
      mean += pooled;
      meanP1 += p1;
      meanP2 += p2;
      meanAbsoluteDifference += Math.abs(p1 - p2);
      heterozygosity += (2 * p1 * (1 - p1) + 2 * p2 * (1 - p2)) / 2;
      const denominator = pooled * (1 - pooled);
      const variance = ((p1 - pooled) ** 2 + (p2 - pooled) ** 2) / 2;
      fst += denominator > 0 ? variance / denominator : 0;
      if (p1 === 1 && p2 === 1) fixed += 1;
      else if (p1 === 0 && p2 === 0) lost += 1;
    });
    frequencies.sort(function (a, b) { return a - b; });
    deme1.sort(function (a, b) { return a - b; });
    deme2.sort(function (a, b) { return a - b; });
    const count = states.length;
    return {
      generation: generation,
      meanFrequency: mean / count,
      meanP1: meanP1 / count,
      meanP2: meanP2 / count,
      meanAbsoluteDifference: meanAbsoluteDifference / count,
      deme1Q025: quantile(deme1, 0.025),
      deme1Q975: quantile(deme1, 0.975),
      deme2Q025: quantile(deme2, 0.025),
      deme2Q975: quantile(deme2, 0.975),
      q025: quantile(frequencies, 0.025),
      q25: quantile(frequencies, 0.25),
      median: quantile(frequencies, 0.5),
      q75: quantile(frequencies, 0.75),
      q975: quantile(frequencies, 0.975),
      heterozygosity: heterozygosity / count,
      fst: fst / count,
      fixedFraction: fixed / count,
      lostFraction: lost / count,
      polymorphicFraction: 1 - (fixed + lost) / count
    };
  }

  function simulate(input) {
    const config = normaliseConfig(input);
    const random = seededRandom(config.seed);
    const chromosomes = 2 * config.populationSize;
    const states = Array.from({ length: config.replicates }, function () {
      return [config.initialP1, config.initialP2];
    });
    const retainedPathCount = Math.min(12, config.replicates);
    const sampleTrajectories = Array.from({ length: retainedPathCount }, function (_, replicate) {
      return { replicate: replicate + 1, p1: [states[replicate][0]], p2: [states[replicate][1]] };
    });
    const absorption = Array.from({ length: config.replicates }, function () {
      return { fixationGeneration: null, lossGeneration: null };
    });
    const history = [summarise(0, states)];
    const started = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    for (let generation = 1; generation <= config.generations; generation += 1) {
      states.forEach(function (state) {
        let p1 = mutate(selectedFrequency(state[0], config.selection, config.dominance), config.mutationForward, config.mutationReverse);
        let p2 = mutate(selectedFrequency(state[1], config.selection, config.dominance), config.mutationForward, config.mutationReverse);
        const migrated1 = (1 - config.migration) * p1 + config.migration * p2;
        const migrated2 = (1 - config.migration) * p2 + config.migration * p1;
        state[0] = binomial(chromosomes, migrated1, random) / chromosomes;
        state[1] = binomial(chromosomes, migrated2, random) / chromosomes;
      });
      for (let replicate = 0; replicate < retainedPathCount; replicate += 1) {
        sampleTrajectories[replicate].p1.push(states[replicate][0]);
        sampleTrajectories[replicate].p2.push(states[replicate][1]);
      }
      states.forEach(function (state, replicate) {
        if (state[0] === 1 && state[1] === 1 && absorption[replicate].fixationGeneration == null) absorption[replicate].fixationGeneration = generation;
        if (state[0] === 0 && state[1] === 0 && absorption[replicate].lossGeneration == null) absorption[replicate].lossGeneration = generation;
      });
      history.push(summarise(generation, states));
    }

    const ended = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const neutral = config.selection === 0 && config.mutationForward === 0 && config.mutationReverse === 0 && config.migration === 0;
    return {
      schema: 'foko.population-genetics-result/1',
      config: config,
      history: history,
      finalStates: states.map(function (state) { return state.slice(); }),
      sampleTrajectories: sampleTrajectories,
      absorption: absorption,
      runtimeMs: Math.max(0, ended - started),
      reference: {
        neutralFixationProbability: neutral ? (config.initialP1 + config.initialP2) / 2 : null,
        neutralReferenceApplicable: neutral
      },
      methodEvidence: 'Seeded two-deme diploid Wright–Fisher ensemble with viability selection, bidirectional mutation, symmetric migration, and exact binomial drift.',
      limitations: [
        'Finite replicates estimate a distribution; they do not produce exact fixation probabilities.',
        'FST is the elementary two-deme frequency-variance ratio, not a sampling-corrected estimator.',
        'Population size is constant; generations do not overlap; selection acts at one biallelic locus.',
        'Linkage, recombination, genotype likelihoods, pedigrees, spatial demography, and coalescent inference are outside this browser model.'
      ]
    };
  }

  const api = Object.freeze({
    binomial: binomial,
    normaliseConfig: normaliseConfig,
    seededRandom: seededRandom,
    selectedFrequency: selectedFrequency,
    simulate: simulate
  });
  root.FokoPopulationGeneticsCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
