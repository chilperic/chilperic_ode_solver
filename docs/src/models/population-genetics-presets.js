/* Curated, runnable configurations for the bounded two-deme Wright–Fisher lab. */
(function (root) {
  'use strict';

  const defaults = {
    populationSize: 100, generations: 180, replicates: 160,
    initialP1: 0.5, initialP2: 0.5, selection: 0, dominance: 0.5,
    mutationForward: 0, mutationReverse: 0, migration: 0, seed: 1729
  };
  function config(overrides) { return Object.assign({}, defaults, overrides || {}); }

  const presets = {
    'neutral-drift': {
      title: 'Neutral genetic drift', family: 'Genetic drift',
      summary: 'Identical demes begin at p = 0.5 and diverge through finite binomial sampling alone.',
      scientificNote: 'A reference finite-population experiment. The ensemble is not a demographic inference.',
      config: config({})
    },
    'small-population-fixation': {
      title: 'Small population · rapid fixation', family: 'Genetic drift',
      summary: 'Reducing each deme to 20 diploid individuals makes fixation and loss common over 120 generations.',
      scientificNote: 'Contrasts drift strength with the neutral reference while keeping the generation cycle unchanged.',
      config: config({ populationSize: 20, generations: 120, replicates: 240, seed: 31415 })
    },
    'large-population-drift': {
      title: 'Large population · slow drift', family: 'Genetic drift',
      summary: 'One thousand diploid individuals per deme retain substantially more neutral polymorphism.',
      scientificNote: 'The smaller replicate count keeps the exact browser draw budget bounded.',
      config: config({ populationSize: 1000, generations: 180, replicates: 40, seed: 27182 })
    },
    'founder-contrast': {
      title: 'Founder-frequency contrast', family: 'Population structure',
      summary: 'Two isolated demes start at p = 0.05 and p = 0.80 to expose persistent differentiation.',
      scientificNote: 'Initial frequencies are declared, not estimated from founder genotypes.',
      config: config({ populationSize: 80, initialP1: 0.05, initialP2: 0.8, generations: 160, seed: 4401 })
    },
    'migration-homogenization': {
      title: 'Migration homogenizes demes', family: 'Migration',
      summary: 'Strong symmetric migration pulls initially separated allele frequencies together.',
      scientificNote: 'Migration is a fixed per-generation mixing fraction and has no spatial distance model.',
      config: config({ initialP1: 0.1, initialP2: 0.9, migration: 0.1, generations: 100, seed: 90210 })
    },
    'migration-drift-balance': {
      title: 'Migration–drift balance', family: 'Migration',
      summary: 'Weak migration counteracts, but does not eliminate, stochastic divergence in small demes.',
      scientificNote: 'The displayed FST is an elementary two-deme frequency ratio, not a sampling-corrected estimator.',
      config: config({ populationSize: 50, initialP1: 0.2, initialP2: 0.8, migration: 0.01, generations: 220, seed: 8080 })
    },
    'additive-beneficial': {
      title: 'Additive beneficial allele', family: 'Natural selection',
      summary: 'A rare beneficial A allele rises with s = 0.08 and additive dominance h = 0.5.',
      scientificNote: 'Fitness is constant across demes and generations; environmental variation is absent.',
      config: config({ initialP1: 0.05, initialP2: 0.05, selection: 0.08, dominance: 0.5, generations: 180, seed: 7301 })
    },
    'dominant-beneficial': {
      title: 'Dominant beneficial allele', family: 'Natural selection',
      summary: 'The heterozygote receives the full beneficial effect (h = 1), accelerating early response.',
      scientificNote: 'Compare with the additive and recessive presets using the same one-locus viability model.',
      config: config({ initialP1: 0.03, initialP2: 0.03, selection: 0.08, dominance: 1, generations: 160, seed: 7302 })
    },
    'recessive-beneficial': {
      title: 'Recessive beneficial allele', family: 'Natural selection',
      summary: 'A rare beneficial allele is initially hidden in heterozygotes when h = 0.',
      scientificNote: 'Finite loss remains possible before homozygotes become common.',
      config: config({ initialP1: 0.08, initialP2: 0.08, selection: 0.15, dominance: 0, generations: 240, seed: 7303 })
    },
    'purifying-selection': {
      title: 'Purifying selection', family: 'Natural selection',
      summary: 'A deleterious A allele declines under s = −0.20 while drift creates replicate variation.',
      scientificNote: 'No new deleterious mutation is supplied in this preset.',
      config: config({ initialP1: 0.8, initialP2: 0.8, selection: -0.2, dominance: 0.5, generations: 100, seed: 6104 })
    },
    'heterozygote-advantage': {
      title: 'Heterozygote advantage', family: 'Balancing selection',
      summary: 'AA has fitness 0.8, Aa has fitness 1.2 and aa has fitness 1 under s = −0.2, h = −1.',
      scientificNote: 'This parameterization produces overdominance within the lab’s relative-fitness convention.',
      config: config({ initialP1: 0.15, initialP2: 0.85, selection: -0.2, dominance: -1, migration: 0.01, generations: 240, seed: 5115 })
    },
    'reversible-mutation': {
      title: 'Reversible mutation', family: 'Mutation',
      summary: 'Elevated symmetric mutation keeps boundary states non-absorbing and restores polymorphism.',
      scientificNote: 'Rates are intentionally high for a visible teaching experiment, not a genomic calibration.',
      config: config({ populationSize: 60, initialP1: 0, initialP2: 1, mutationForward: 0.01, mutationReverse: 0.01, generations: 180, seed: 12012 })
    },
    'mutation-selection-drift': {
      title: 'Mutation–selection–drift balance', family: 'Combined forces',
      summary: 'Forward mutation reintroduces a mildly deleterious A allele while selection and drift remove it.',
      scientificNote: 'This is a finite ensemble with recurrent mutation, not an equilibrium estimator.',
      config: config({ populationSize: 120, initialP1: 0, initialP2: 0, selection: -0.1, dominance: 0.5, mutationForward: 0.002, mutationReverse: 0.0002, migration: 0.005, generations: 300, seed: 42195 })
    }
  };

  root.FokoPopulationGeneticsPresets = presets;
  if (typeof module !== 'undefined' && module.exports) module.exports = presets;
}(typeof window !== 'undefined' ? window : globalThis));
