# Foko Lab Agent model specification — v72.16.0

## Scope

The Agent Lab implements finite seeded lattice experiments for qualitative mechanism exploration, reproducible teaching and numerical stress testing. It is not an empirical calibration system. A biological or social name does not establish realism, causality or predictive validity.

## Execution contract

- Square lattice `N × N`, with `8 ≤ N ≤ 80`.
- von Neumann or Moore neighbourhood.
- Toroidal or fixed boundary.
- In-place asynchronous updates.
- One algorithmic step is `N²` site-update attempts.
- `random-with-replacement`: sites are sampled independently and may be selected repeatedly or not at all in one step.
- `shuffled-sweep`: each site is visited exactly once in a newly shuffled order.
- One master seed deterministically generates independent run seeds.
- Agent ensembles run in a Web Worker when available; cancellation publishes no partial result.

## Initial populations

Two explicit contracts are supported:

- `counts`: non-negative integer counts for every state, summing exactly to `N²`;
- `fractions`: non-negative fractions converted to exact integer counts by deterministic largest-remainder allocation.

The exact simulated counts are displayed, hashed and exported. Spatial initialization may be random, split or central-patch. Fraction normalization is recorded rather than hidden.

## Dynamic spatial evidence

The representative run records a configurable set of time snapshots. The default primary plot is a 2×2 temporal lattice view rather than a single final image. State labels are rendered in a dedicated legend below the plot.

Every recorded time point also contains:

- nearest-neighbour agreement;
- normalized state diversity;
- occupied fraction when an empty state exists.

The ensemble reports means and pointwise 5th–95th percentiles for these spatial summaries. These are descriptive finite-lattice statistics, not confidence intervals for real-world parameters.

## Declarative custom models

A custom model can define 2–8 named states, hexadecimal colors, probability parameters, default populations, an optional empty-state index and ordered local rules.

Supported rules:

- `spontaneous`;
- `neighbor-contact`;
- `neighbor-threshold`.

Rules use ordered first-success semantics. Unknown parameters, invalid states, unsupported rules, self-transitions and executable code are rejected.

## Built-in model families

### T-cell activation and proliferation

States: empty, quiescent, activated, dead. Local activation, division into empty neighbours, death and clearance are represented. The model omits clone identity, motility, cytokines, observation error and explicit cell-cycle stages.

### Cell-cycle generation cascade

States represent quiescence and successive activated generations with death/empty states. The model is a coarse branching-process-inspired lattice abstraction. It is not a CFSE observation model and is not fitted to generation-distribution data.

### Fatty-acid synthesis particle abstraction

States represent substrate pools, chain intermediates, C14:0/C16:0/C18:0 products and CoA-bound sequestration. Local transitions encode supply, condensation, elongation, chain termination, product release, CoA inhibition and release.

This is **research-inspired**, not the published semi-mechanistic FADNS ODE. It is not calibrated and must not be used to infer kinetic constants or cellular product ratios. The mechanistic fatty-acid models belong in the ODE and steady-state workflows.

### Spatial SIR contact process

A susceptible site with `k` infectious neighbours is infected with probability `1-(1-beta)^k`; infectious sites recover with probability `gamma`. A sweep is not continuous epidemiological time, and the parameters are not automatically rates.

### Voter dynamics

A selected site copies a randomly selected neighbour with a configured probability. Opinion labels are abstract. Consensus depends on finite size, topology, schedule, initialization and seed.

### Schelling-style relocation

An occupied site evaluates local same-group agreement and may relocate uniformly from the current empty-site pool. This is a stylized sorting mechanism, not a causal model of human segregation.

### Lattice predator–prey process

Prey reproduce locally; predators may die, consume neighbouring prey and move or reproduce. Energy budgets, age, continuous movement and calibrated encounter rates are omitted.

### Forest-fire process

States represent empty, tree, burning and recovering sites. Local spread, burnout, regrowth, lightning and recovery generate transient fronts. Wind, moisture, terrain, fuel heterogeneity and physical time are omitted.

## Plot contract

The public workspace supports two simultaneous plots or one Focus plot. Compatible plot families include:

- temporal lattice snapshots;
- initial, final and change lattices;
- representative and ensemble population dynamics;
- population phase paths;
- spatial metric trajectories;
- endpoint–spatial relationships;
- transition-event histories and distributions;
- final-state composition;
- diversity, agreement and cluster diagnostics;
- terminal outcomes and model-specific endpoints.

A plot is selectable only when its required result fields exist. The interface must not show an empty third panel for symmetry.

## Reported provenance

Exports include release, validated configuration, exact initial counts, master and derived seeds, update schedule, topology, boundary, model family, snapshot schedule, run count, event reconciliation, configuration hash, warnings and rendering path.

## Interpretation boundary

The browser output alone does not establish:

- parameter calibration or identifiability;
- biological, ecological, epidemiological or social time units;
- causal mechanism identification;
- stationary distributions or asymptotic limits;
- finite-size robustness;
- external predictive validity;
- measurement uncertainty or model discrepancy.

Publication use requires an observation model, parameter provenance, sensitivity analysis, finite-size/schedule checks, independent implementation and domain-specific validation.

## v72.20 genuine live rendering contract

During computation, the representative worker uses the same stateful numerical runner as the synchronous reference core and advances it by a bounded number of algorithmic steps per visible update. The worker yields between updates so the browser can paint each newly computed lattice and matching population counts. The pacing delay controls presentation latency only; changing it cannot change the seeded numerical result. Pause stops the runner before the next chunk. Cancellation publishes no partial ensemble.

After completion, stored frames may be replayed manually once. Replay is a view of already computed frames and is labelled separately from live computation. The live stream and replay both remain one representative realization, never ensemble spatial uncertainty.
