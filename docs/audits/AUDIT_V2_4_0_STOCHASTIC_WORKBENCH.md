# Audit v2.4.0 — Stochastic Lab workbench implementation

## Verdict

v2.4.0 converts the stochastic side from a demo-gallery page into a parallel workbench. The legacy ODE Lab remains intact. The top-level architecture is now:

- ODE Lab: differential-equation workflow, legacy solver preserved.
- Stochastic Lab: random-event and stochastic-process workflow.
- Model Atlas: conceptual navigation layer.
- Docs: method notes and usage guidance.

## Main structural changes

1. Renamed the visible navigation from “Deterministic Workbench” to “ODE Lab”.
2. Rebuilt `stochastic.html` as a workbench shell instead of a vertical demo list.
3. Moved stochastic implementation into `src/stochastic/stochastic-lab.js`.
4. Removed obsolete duplicate `stochastic.js` and `stochastic_core.js` files.
5. Added workflow tabs: Model, Simulation, Results, Compare, Export.
6. Added an editable JSON schema for every stochastic model.
7. Added a structured CTMC editor for states, propensities, and state updates.
8. Added reusable stochastic engines and specialized engines where appropriate.
9. Added deterministic mean-field comparison for CTMC models.
10. Added reproducibility exports: model JSON, trajectory CSV, summary JSON, and Python starter text.

## Implemented model families

### CTMC / Gillespie

- Birth-death process
- Stochastic SIR epidemic
- Stochastic gene expression
- Stochastic Michaelis-Menten
- Reduced T-cell proliferation event model

The Gillespie logic is now infrastructure, not just a card.

### Branching and finite Markov chains

- Galton-Watson branching process
- Gambler’s ruin
- Ehrenfest urn
- Wright-Fisher drift

### SDE / noise-assisted / stochastic decision examples

- Geometric Brownian motion
- Parrondo’s paradox
- Stochastic resonance
- Flashing ratchet / Brownian motor
- Multi-armed bandit
- Secretary / optimal stopping problem

## Deterministic vs stochastic separation

The ODE Lab and Stochastic Lab now use different modeling grammars:

- ODE Lab: equations, variables, parameters, numerical integration.
- Stochastic Lab: states, events, propensities, transition updates, path ensembles, final distributions, extinction/fixation diagnostics.

For CTMC models, the lab automatically constructs a deterministic mean-field drift from stoichiometry and propensities:

`dx/dt = sum(event_update * propensity)`

This gives a visible dashed mean-field overlay when available.

## UX improvements

- The page now has a workbench layout with library sidebar and main editor/results area.
- Users can filter model families.
- The run workflow is explicit; large simulations no longer auto-run unless the user enables auto-run.
- Result diagnostics are model-specific.
- Plots separate ensemble trajectories from distribution/diagnostic views.
- Export controls are grouped in a reproducibility tab.
- Mobile layout collapses safely into one column.

## Known boundaries

- The reduced T-cell model is not the full stochastic master-equation solver. It is a browser-scale event simulator for quiescent/activated generation states.
- The stochastic-control examples are pedagogical simulators, not full HJB solvers.
- Plot rendering still uses Plotly from CDN, consistent with the legacy app pattern.
- CTMC propensity expressions are evaluated in-browser from user-editable strings. This is acceptable for a local educational workbench, but not for hostile multi-user input.

## Smoke tests performed

- JavaScript syntax checked with `node --check`.
- Every preset engine was executed in a Node VM smoke test with small run counts.
- Navigation labels were checked across `index.html`, `examples.html`, `docs.html`, and `stochastic.html`.

## Recommended next phase

v2.4.1 should add:

1. Add-row / delete-row buttons for CTMC states and events.
2. Parameter sweep mode for stochastic models.
3. Monte Carlo convergence plots.
4. Python export with fully runnable SSA code, not only starter code.
5. Optional local Plotly fallback or vendored plotting library for offline use.
