# AUDIT v71.1 — Workbench scientific integration

## Objective

V71.0 created the platform substrate. V71.1 wires the most important scientific pieces into the Workbench UI instead of leaving them as helper modules.

## Implemented

### Experimental-data overlay and fitting

Added `src/v71-workbench-science.js`, injected into `workbench.html`.

The Workbench now receives a scientific integration panel with:

- observation data input,
- model choice: logistic, linear, exponential, exponential decay, Michaelis-Menten,
- nonlinear parameter fit using `src/dynamical-fitting.js`,
- parameter confidence intervals,
- AIC / BIC,
- residuals,
- observation + fitted curve + confidence-envelope plot.

This is not yet arbitrary ODE model fitting, but it is the first direct Workbench-level model-data bridge.

### Stochastic uncertainty bands

Added a seeded SIR tau-leaping ensemble directly in the Workbench panel:

- seed input,
- ensemble size,
- tau step,
- median infected trajectory,
- 5–95% quantile envelope.

This demonstrates the stochastic uncertainty standard expected for the rest of the stochastic lab.

### Initial-condition basin map

Added a basin-map panel for a bistable cubic proxy system:

- control parameter,
- grid resolution,
- heatmap over initial conditions.

This establishes the UI/plot contract for real initial-condition sweeps in dynamical models.

### Shared figure export

The new plots use the FokoKit plot-export hook.

## Files

- `src/v71-workbench-science.js`
- `tests/test_v71_1_workbench_science.py`
- `tests/test_v71_1_workbench_science_node.js`
- CSS extension in `styles/v70-15-analysis-suite.css`
- audit: `release-audits/AUDIT-v71-1-workbench-science.md`

## Honest limitations

This release does not yet fit arbitrary Workbench ODE models by introspecting their equations and parameters. That requires a deeper interface between `model-workbench-v3.js`, the model registry, solver state and `dynamical-fitting.js`.

The next scientific release should expose:

1. current Workbench model state as a formal object,
2. selected fit parameters,
3. selected observed variable,
4. forward sensitivities / finite-difference Jacobian,
5. CI propagation into the existing trajectory plot.
