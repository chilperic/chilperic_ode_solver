const assert = require('assert');
const PopulationGenetics = require('../../src/core/population-genetics.js');
const Presets = require('../../src/models/population-genetics-presets.js');

let checks = 0;
function check(condition, message) { checks += 1; assert.ok(condition, message); }

const base = {
  populationSize: 80, generations: 45, replicates: 50,
  initialP1: 0.2, initialP2: 0.8, selection: 0,
  dominance: 0.5, mutationForward: 0, mutationReverse: 0,
  migration: 0.03, seed: 2026
};
const first = PopulationGenetics.simulate(base);
const second = PopulationGenetics.simulate(base);
check(first.history.length === 46, 'history includes generation zero');
check(first.finalStates.length === 50, 'one final state is retained per replicate');
check(JSON.stringify(first.history) === JSON.stringify(second.history), 'seeded simulations are deterministic');
check(first.history.every(row => row.meanFrequency >= 0 && row.meanFrequency <= 1), 'mean frequencies remain bounded');
check(first.history.every(row => row.q025 <= row.median && row.median <= row.q975), 'empirical quantiles remain ordered');
check(first.history.every(row => row.fst >= 0 && Number.isFinite(row.fst)), 'elementary FST remains finite and non-negative');
check(first.history.every(row => row.meanP1 >= 0 && row.meanP1 <= 1 && row.meanP2 >= 0 && row.meanP2 <= 1), 'deme-specific mean frequencies remain bounded');
check(first.history.every(row => row.meanAbsoluteDifference >= 0 && row.meanAbsoluteDifference <= 1), 'deme divergence summary remains bounded');
check(first.sampleTrajectories.length === 12 && first.sampleTrajectories.every(path => path.p1.length === 46 && path.p2.length === 46), 'a bounded subset of replicate trajectories is retained for plots');
check(first.absorption.length === 50, 'per-replicate absorption timing is retained');
check(first.config.bernoulliDraws === 4 * 80 * 45 * 50, 'exact-drift compute budget is reported');

const noMigration = PopulationGenetics.simulate({ ...base, migration: 0, generations: 35, seed: 91 });
const migration = PopulationGenetics.simulate({ ...base, migration: 0.15, generations: 35, seed: 91 });
check(migration.history.at(-1).fst < noMigration.history.at(-1).fst, 'migration reduces differentiation in the benchmark ensemble');

const neutral = PopulationGenetics.simulate({ ...base, populationSize: 150, generations: 25, replicates: 60, initialP1: 0.2, initialP2: 0.2, migration: 0, seed: 44 });
const selected = PopulationGenetics.simulate({ ...base, populationSize: 150, generations: 25, replicates: 60, initialP1: 0.2, initialP2: 0.2, selection: 0.25, migration: 0, seed: 44 });
check(selected.history.at(-1).meanFrequency > neutral.history.at(-1).meanFrequency, 'positive viability selection increases the favored allele benchmark');
check(neutral.reference.neutralReferenceApplicable, 'neutral fixation reference is explicitly applicable only for the force-free model');
check(Math.abs(neutral.reference.neutralFixationProbability - 0.2) < 1e-12, 'neutral reference uses initial pooled frequency');
check(!selected.reference.neutralReferenceApplicable, 'selection disables the neutral fixation reference');

const randomA = PopulationGenetics.seededRandom(7);
const randomB = PopulationGenetics.seededRandom(7);
check(PopulationGenetics.binomial(100, 0.4, randomA) === PopulationGenetics.binomial(100, 0.4, randomB), 'exact binomial drift is seeded');
assert.throws(() => PopulationGenetics.normaliseConfig({ populationSize: 10000, generations: 5000, replicates: 1000 }), /30 million/);
checks += 1;
assert.throws(() => PopulationGenetics.normaliseConfig({ migration: 0.8 }), /migration/i);
checks += 1;

check(Object.keys(Presets).length >= 12, 'population-genetics lab exposes a substantive preset library');
for (const [key, preset] of Object.entries(Presets)) {
  check(Boolean(preset.title && preset.family && preset.summary && preset.scientificNote), `${key}: discoverability metadata is complete`);
  const normalized = PopulationGenetics.normaliseConfig(preset.config);
  check(normalized.bernoulliDraws <= 30000000, `${key}: exact-drift workload stays inside the browser budget`);
}

console.log(`${checks}/${checks} population-genetics checks passed`);
