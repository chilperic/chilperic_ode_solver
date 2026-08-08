/* Foko Lab v72.16 curated Agent presets.
 * All presets are synthetic teaching or numerical stress-test mechanisms.
 * Research-inspired examples are explicitly distinguished from published,
 * calibrated or validated models.
 */
(function (root, factory) {
  const presets = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = presets;
  root.FokoAgentPresets = presets;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  return {
    tcell_baseline: {
      title: 'T-cell activation and proliferation', model: 'tcell', family: 'cell-state dynamics', difficulty: 'intermediate', provenance: 'research-inspired teaching model',
      question: 'How do local activation, division, death and clearance rules shape population composition?',
      note: 'A qualitative lattice state-transition model inspired by the creator’s T-cell modeling work. It is not calibrated to a specific experiment and omits clone identity, motility, cytokines and cell-cycle phases.',
      size: 34, steps: 120, runs: 24, seed: 202610, recordEvery: 2, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { activation: 0.030, division: 0.080, qDeath: 0.004, aDeath: 0.020, clearance: 0.080 }, initialFractions: [0.10, 0.78, 0.12, 0]
    },
    tcell_activation_stress: {
      title: 'T-cell activation stress test', model: 'tcell', family: 'cell-state dynamics', difficulty: 'advanced', provenance: 'synthetic stress test',
      question: 'Does increased activation produce sustained expansion, crowding limitation or rapid activated-cell turnover?',
      note: 'Rule-sensitivity stress test, not a dose-response experiment. Probabilities are algorithmic transition probabilities, not fitted biological rates.',
      size: 36, steps: 150, runs: 28, seed: 202614, recordEvery: 2, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'shuffled-sweep', initialization: 'central-patch',
      params: { activation: 0.075, division: 0.110, qDeath: 0.003, aDeath: 0.032, clearance: 0.060 }, initialFractions: [0.12, 0.80, 0.08, 0]
    },
    cell_cycle_generations: {
      title: 'T-cell generation cascade', model: 'cell_cycle', family: 'cell proliferation', difficulty: 'intermediate', provenance: 'research-inspired teaching model',
      question: 'How do generation-specific division and attrition shape a finite population trajectory?',
      note: 'A coarse generation-state abstraction related to branching-process intuition. It is not a CFSE observation model and is not fitted to experimental generation distributions.',
      size: 34, steps: 150, runs: 28, seed: 201601, recordEvery: 2, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'shuffled-sweep', initialization: 'random',
      params: { activation: 0.035, division0: 0.055, divisionLater: 0.085, death: 0.018, clearance: 0.08 }, initialFractions: [0.12, 0.80, 0.06, 0.02, 0]
    },
    cell_cycle_attrition: {
      title: 'Generation attrition stress test', model: 'cell_cycle', family: 'cell proliferation', difficulty: 'advanced', provenance: 'synthetic stress test',
      question: 'When can later-generation attrition suppress apparent clonal expansion?',
      note: 'A controlled numerical stress test. It does not identify death or division rates from data.',
      size: 36, steps: 180, runs: 32, seed: 201602, recordEvery: 3, snapshotCount: 24, neighborhood: 'moore', boundary: 'fixed', updateSchedule: 'random-with-replacement', initialization: 'central-patch',
      params: { activation: 0.025, division0: 0.045, divisionLater: 0.055, death: 0.042, clearance: 0.10 }, initialFractions: [0.18, 0.73, 0.07, 0.02, 0]
    },
    fadns_particle_baseline: {
      title: 'Fatty-acid synthesis particle abstraction', model: 'fadns_particle', family: 'metabolic dynamics', difficulty: 'advanced', provenance: 'research-inspired teaching model',
      question: 'How can local substrate encounters, elongation, chain termination and CoA inhibition alter C14:0/C16:0/C18:0 product composition?',
      note: 'Inspired by Foko Kuate’s fatty-acid de novo synthesis research. This lattice abstraction is not the published semi-mechanistic ODE model and is not calibrated. Use the ODE Lab for the mechanistic FADNS model.',
      size: 38, steps: 180, runs: 30, seed: 20222496, recordEvery: 3, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'shuffled-sweep', initialization: 'random',
      params: { substrateSupply: 0.055, condensation: 0.26, elongation: 0.72, terminate14: 0.025, terminate16: 0.080, terminate18: 0.025, productRelease: 0.10, coaInhibition: 0.018, coaRelease: 0.055 }, initialFractions: [0.55, 0.16, 0.16, 0.06, 0.02, 0.025, 0.015, 0.01]
    },
    fadns_coa_inhibition: {
      title: 'FADNS CoA-inhibition stress test', model: 'fadns_particle', family: 'metabolic dynamics', difficulty: 'advanced', provenance: 'research-inspired stress test',
      question: 'How does stronger CoA-bound sequestration change product yield and chain-length composition?',
      note: 'A qualitative mechanism stress test motivated by enzyme-inhibition questions. It is not evidence for a specific inhibition constant or cellular phenotype.',
      size: 38, steps: 220, runs: 34, seed: 20222497, recordEvery: 4, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { substrateSupply: 0.050, condensation: 0.24, elongation: 0.68, terminate14: 0.020, terminate16: 0.070, terminate18: 0.025, productRelease: 0.085, coaInhibition: 0.090, coaRelease: 0.018 }, initialFractions: [0.52, 0.17, 0.17, 0.055, 0.02, 0.025, 0.015, 0.02]
    },
    fadns_chain_termination: {
      title: 'FADNS chain-termination shift', model: 'fadns_particle', family: 'metabolic dynamics', difficulty: 'advanced', provenance: 'research-inspired stress test',
      question: 'How does shifting release toward C14:0 or C18:0 alter the terminal product mixture?',
      note: 'A finite-particle illustration of chain-length termination. Quantitative conclusions must come from the mechanistic ODE and kinetic data, not this lattice model.',
      size: 36, steps: 180, runs: 30, seed: 20222498, recordEvery: 3, snapshotCount: 24, neighborhood: 'von-neumann', boundary: 'fixed', updateSchedule: 'shuffled-sweep', initialization: 'split',
      params: { substrateSupply: 0.060, condensation: 0.28, elongation: 0.76, terminate14: 0.060, terminate16: 0.045, terminate18: 0.045, productRelease: 0.11, coaInhibition: 0.015, coaRelease: 0.060 }, initialFractions: [0.55, 0.18, 0.18, 0.045, 0.012, 0.018, 0.010, 0.015]
    },
    sir_local: {
      title: 'Spatial SIR contact process', model: 'sir', family: 'epidemiology', difficulty: 'intermediate', provenance: 'synthetic teaching model',
      question: 'How does local contact structure alter outbreak trajectories relative to well-mixed intuition?',
      note: 'Infection occurs through lattice neighbours with a per-neighbour sweep probability. One sweep is not a calibrated unit of physical time.',
      size: 38, steps: 150, runs: 30, seed: 314159, recordEvery: 2, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { beta: 0.075, gamma: 0.045 }, initialFractions: [0.90, 0.035, 0, 0.065]
    },
    sir_clustered_seed: {
      title: 'Spatial SIR clustered introduction', model: 'sir', family: 'epidemiology', difficulty: 'advanced', provenance: 'synthetic stress test',
      visualization: { spaceTime3D: true, rationale: 'A localized infectious seed creates an interpretable invasion front through lattice space and algorithmic time.' },
      question: 'How does a localized infectious seed change outbreak timing and finite-horizon attack fraction?',
      note: 'Central-patch initialization is a controlled scenario, not reconstruction of a real introduction event.',
      size: 40, steps: 180, runs: 32, seed: 314160, recordEvery: 3, snapshotCount: 24, neighborhood: 'von-neumann', boundary: 'fixed', updateSchedule: 'shuffled-sweep', initialization: 'central-patch',
      params: { beta: 0.095, gamma: 0.050 }, initialFractions: [0.91, 0.025, 0, 0.065]
    },
    sir_subcritical: {
      title: 'Spatial SIR fade-out regime', model: 'sir', family: 'epidemiology', difficulty: 'intermediate', provenance: 'synthetic stress test',
      question: 'How frequently does a weakly transmitting local outbreak fade out across independent seeds?',
      note: 'The fade-out proportion is conditional on this finite lattice, horizon and update rule, not an epidemiological risk estimate.',
      size: 34, steps: 140, runs: 48, seed: 314161, recordEvery: 2, snapshotCount: 24, neighborhood: 'von-neumann', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'central-patch',
      params: { beta: 0.035, gamma: 0.060 }, initialFractions: [0.92, 0.018, 0, 0.062]
    },
    voter_consensus: {
      title: 'Voter consensus and finite-size fluctuations', model: 'voter', family: 'collective dynamics', difficulty: 'foundation', provenance: 'synthetic teaching model',
      question: 'How does local copying produce drift toward consensus in a finite system?',
      note: 'Opinion labels are abstract states. Consensus time and direction depend on finite size, topology, schedule and seed.',
      size: 34, steps: 180, runs: 32, seed: 271828, recordEvery: 3, snapshotCount: 24, neighborhood: 'von-neumann', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { copyProbability: 1.0 }, initialFractions: [0.52, 0.48]
    },
    voter_interface: {
      title: 'Voter interface erosion', model: 'voter', family: 'collective dynamics', difficulty: 'intermediate', provenance: 'synthetic teaching model',
      visualization: { spaceTime3D: true, rationale: 'The evolving interface is a genuine coarsening surface in lattice space and algorithmic time.' },
      question: 'How does a sharp initial interface erode under local copying?',
      note: 'The split state isolates coarsening. It is not a model of persuasion, media exposure or institutions.',
      size: 38, steps: 220, runs: 28, seed: 271829, recordEvery: 4, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'shuffled-sweep', initialization: 'split',
      params: { copyProbability: 0.85 }, initialFractions: [0.50, 0.50]
    },
    voter_biased_start: {
      title: 'Voter initial-bias sensitivity', model: 'voter', family: 'collective dynamics', difficulty: 'intermediate', provenance: 'synthetic stress test',
      question: 'How strongly does finite-horizon consensus depend on a modest initial composition bias?',
      note: 'This illustrates initial-condition dependence. It does not identify social influence or preference.',
      size: 32, steps: 160, runs: 44, seed: 271830, recordEvery: 2, snapshotCount: 24, neighborhood: 'von-neumann', boundary: 'fixed', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { copyProbability: 0.80 }, initialFractions: [0.62, 0.38]
    },
    segregation_threshold: {
      title: 'Schelling relocation threshold', model: 'segregation', family: 'spatial sorting', difficulty: 'intermediate', provenance: 'synthetic teaching model',
      question: 'Can mild local similarity preferences create strong spatial sorting?',
      note: 'Stylized relocation model, not a causal model of human segregation. Institutions and structural constraints are absent.',
      size: 36, steps: 140, runs: 20, seed: 161803, recordEvery: 2, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { similarityThreshold: 0.42, moveProbability: 0.90 }, initialFractions: [0.18, 0.41, 0.41]
    },
    segregation_initial_blocks: {
      title: 'Segregation initial-condition sensitivity', model: 'segregation', family: 'spatial sorting', difficulty: 'advanced', provenance: 'synthetic stress test',
      visualization: { spaceTime3D: true, rationale: 'The model asks how structured spatial blocks reorganize through time.' },
      question: 'How much final sorting is inherited from an already structured initial condition?',
      note: 'Initialization dependence is explicit. Final patterns cannot identify preferences by themselves.',
      size: 36, steps: 100, runs: 20, seed: 161804, recordEvery: 2, snapshotCount: 24, neighborhood: 'moore', boundary: 'fixed', updateSchedule: 'shuffled-sweep', initialization: 'split',
      params: { similarityThreshold: 0.35, moveProbability: 0.75 }, initialFractions: [0.18, 0.41, 0.41]
    },
    segregation_vacancy_limit: {
      title: 'Segregation vacancy-limit stress test', model: 'segregation', family: 'spatial sorting', difficulty: 'advanced', provenance: 'synthetic stress test',
      question: 'How does limited vacancy constrain relocation and apparent sorting?',
      note: 'A numerical mechanism check. Vacancy availability is part of the algorithm, not measured residential mobility.',
      size: 38, steps: 180, runs: 24, seed: 161805, recordEvery: 3, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { similarityThreshold: 0.48, moveProbability: 0.85 }, initialFractions: [0.06, 0.47, 0.47]
    },
    predator_prey_cycles: {
      title: 'Lattice predator–prey cycles', model: 'predator_prey', family: 'ecology', difficulty: 'advanced', provenance: 'synthetic teaching model',
      visualization: { spaceTime3D: true, rationale: 'Local predator and prey waves produce interpretable moving spatial structures.' },
      question: 'How can local birth, predation and death produce irregular population oscillations?',
      note: 'Qualitative interacting-particle model; no energetic budgets, age structure, movement kernels or calibrated encounter rates.',
      size: 40, steps: 180, runs: 24, seed: 424242, recordEvery: 2, snapshotCount: 24, neighborhood: 'von-neumann', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { preyBirth: 0.090, predatorBirth: 0.34, predatorDeath: 0.035 }, initialFractions: [0.18, 0.67, 0.15]
    },
    predator_prey_extinction: {
      title: 'Predator extinction-risk stress test', model: 'predator_prey', family: 'ecology', difficulty: 'advanced', provenance: 'synthetic stress test',
      question: 'How often does a small predator population disappear within the finite horizon?',
      note: 'The extinction fraction is conditional on grid, horizon and rules. It is not a calibrated ecological probability.',
      size: 38, steps: 220, runs: 36, seed: 424243, recordEvery: 4, snapshotCount: 24, neighborhood: 'von-neumann', boundary: 'toroidal', updateSchedule: 'shuffled-sweep', initialization: 'central-patch',
      params: { preyBirth: 0.075, predatorBirth: 0.24, predatorDeath: 0.060 }, initialFractions: [0.18, 0.75, 0.07]
    },
    forest_fire_spread: {
      title: 'Forest-fire spread and burnout', model: 'forest_fire', family: 'disturbance ecology', difficulty: 'intermediate', provenance: 'synthetic teaching model',
      visualization: { spaceTime3D: true, rationale: 'The curated central ignition generates a propagating fire front.' },
      question: 'How do local spread, burnout and recovery generate transient fire fronts?',
      note: 'A stylized cellular process. It omits wind, fuel heterogeneity, moisture, terrain and calibrated time.',
      size: 42, steps: 160, runs: 28, seed: 867530, recordEvery: 2, snapshotCount: 24, neighborhood: 'moore', boundary: 'fixed', updateSchedule: 'shuffled-sweep', initialization: 'central-patch',
      params: { growth: 0.010, lightning: 0.0005, spread: 0.32, burnout: 0.70, recovery: 0.035 }, initialFractions: [0.16, 0.80, 0.015, 0.025]
    },
    forest_fire_recovery: {
      title: 'Forest-fire recovery regime', model: 'forest_fire', family: 'disturbance ecology', difficulty: 'advanced', provenance: 'synthetic stress test',
      question: 'Can regrowth and recovery sustain recurrent finite-lattice burning?',
      note: 'Recurrent patterns are algorithmic. They do not establish ecological stationarity or fire-return intervals.',
      size: 40, steps: 260, runs: 30, seed: 867531, recordEvery: 4, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { growth: 0.030, lightning: 0.002, spread: 0.24, burnout: 0.62, recovery: 0.080 }, initialFractions: [0.20, 0.74, 0.010, 0.050]
    },
    prisoner_cooperation_front: {
      title: 'Spatial prisoner’s dilemma cooperation front', model: 'prisoner_dilemma', family: 'evolutionary game dynamics', difficulty: 'advanced', provenance: 'published reference abstraction',
      visualization: { spaceTime3D: true, rationale: 'The question concerns persistence and movement of a spatial cooperation front.' },
      question: 'Can spatial clustering protect cooperation when defection has a local payoff advantage?',
      note: 'A pairwise-imitation lattice abstraction using normalized payoffs R=1, P=S=0 and temptation T. It is not a calibrated social or microbial game.',
      size: 38, steps: 180, runs: 28, seed: 818181, recordEvery: 3, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'shuffled-sweep', initialization: 'central-patch',
      params: { temptation: 1.35, imitation: 0.85 }, initialFractions: [0.72, 0.28]
    },
    prisoner_defection_pressure: {
      title: 'Prisoner’s dilemma defection-pressure stress test', model: 'prisoner_dilemma', family: 'evolutionary game dynamics', difficulty: 'advanced', provenance: 'synthetic stress test',
      question: 'How does a larger temptation parameter alter finite-horizon cooperator persistence?',
      note: 'The endpoint depends on lattice size, asynchronous update order and payoff convention; it is not an equilibrium theorem.',
      size: 36, steps: 220, runs: 36, seed: 818182, recordEvery: 4, snapshotCount: 24, neighborhood: 'von-neumann', boundary: 'fixed', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { temptation: 1.75, imitation: 0.90 }, initialFractions: [0.80, 0.20]
    },
    biofilm_growth_front: {
      title: 'Biofilm nutrient-limited growth front', model: 'biofilm', family: 'microbial spatial dynamics', difficulty: 'advanced', provenance: 'research-inspired qualitative abstraction',
      visualization: { spaceTime3D: true, rationale: 'Nutrient-limited biomass expansion is explicitly modeled as a spatial growth front.' },
      question: 'How can local nutrient conversion and biomass inactivation shape a finite growth front?',
      note: 'This is a categorical cellular abstraction. It omits diffusion, biomass mechanics, extracellular matrix, flow and calibration to biofilm data.',
      size: 40, steps: 200, runs: 28, seed: 515151, recordEvery: 4, snapshotCount: 28, neighborhood: 'von-neumann', boundary: 'fixed', updateSchedule: 'shuffled-sweep', initialization: 'central-patch',
      params: { nutrientSupply: 0.018, attachment: 0.16, growth: 0.22, inactivation: 0.018, detachment: 0.010, reactivation: 0.015 }, initialFractions: [0.20, 0.67, 0.10, 0.03]
    },
    biofilm_detachment_stress: {
      title: 'Biofilm detachment stress test', model: 'biofilm', family: 'microbial spatial dynamics', difficulty: 'advanced', provenance: 'synthetic stress test',
      question: 'When does increased inactivation and detachment prevent biomass persistence?',
      note: 'The finite-horizon biomass fraction is conditional on this rule set and is not a prediction of experimental detachment rates.',
      size: 36, steps: 180, runs: 36, seed: 515152, recordEvery: 3, snapshotCount: 24, neighborhood: 'moore', boundary: 'toroidal', updateSchedule: 'random-with-replacement', initialization: 'random',
      params: { nutrientSupply: 0.012, attachment: 0.10, growth: 0.13, inactivation: 0.065, detachment: 0.080, reactivation: 0.010 }, initialFractions: [0.22, 0.64, 0.09, 0.05]
    }
  };
}));
