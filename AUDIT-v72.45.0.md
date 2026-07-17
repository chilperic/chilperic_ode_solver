# Foko Lab v72.45.0 — Professional Platform Audit

## Scope

The audit covers the complete platform with emphasis on Sensitivity Analysis, numerical-input ownership, browser workload safety, plot provenance, cross-page consistency and release behavior. It does not certify arbitrary user models or establish parity with desktop/server sensitivity packages.

## Global Sensitivity implementation

### Morris screening

The browser now computes and retains:

- signed elementary effects for every trajectory;
- mean, absolute mean (`mu*`) and standard deviation;
- 5%, 25%, median, 75% and 95% empirical effect quantiles;
- prefix-convergence traces as trajectories accumulate;
- bootstrap rank intervals and top-rank probability;
- seeded reproducibility and explicit evaluation counts.

The `sigma` statistic remains labelled as mixed nonlinearity/interaction evidence. It is not interpreted as a unique interaction measure.

### Variance decomposition

For independent uniform parameter ranges the browser now computes:

- Jansen first-order indices;
- Jansen total-order indices;
- the total-minus-first interaction/nonlinearity gap;
- optional symmetrized Saltelli pairwise second-order estimates;
- a complete second-order interaction matrix;
- prefix convergence;
- bootstrap intervals for first and total indices;
- bootstrap rank stability;
- output-distribution diagnostics;
- raw Monte Carlo standard-error evidence.

Second-order analysis uses both mixed-matrix directions and changes the ODE solve budget from `N(p+2)` to `N(2p+2)`. Estimates are not cosmetically clipped to `[0,1]`; finite-sample instability remains visible.

## Browser-capacity boundary

A workload estimate is evaluated before starting a worker. A run is refused when any conservative hard boundary is exceeded, including:

- more than 32 state variables;
- more than 20 varied parameters;
- second-order analysis with more than 10 varied parameters;
- more than 25,000 projected ODE solves;
- more than 80 million projected state-time values.

Warnings begin below the hard refusal boundary for workloads likely to be slow. The refusal message identifies the dominant reasons and directs the user to reduce the problem or export it to a Python/SALib or server workflow. The worker repeats the same validation, so bypassing the UI cannot launch an unsafe computation.

These thresholds are operational safety limits, not mathematical limits. Fast simple models can sometimes exceed them, and difficult stiff models can fail below them.

## Numerical-input audit

Sensitivity computations receive the current:

- equations and state names;
- initial conditions;
- parameter values and independent ranges;
- start/end time and output grid;
- solver method, fixed/adaptive step controls, relative tolerance and absolute tolerance;
- perturbation size, Morris trajectories/levels, variance sample count, bootstrap count and second-order switch;
- seed and FIM noise scale.

Invalid values are rejected before computation. Changing any scientific input marks evidence stale and prevents exporting a result that no longer corresponds to the visible configuration.

## Plot audit

The Sensitivity workspace retains two stable plot hosts and exposes computed plots only when compatible data exist. Newly validated plot families include:

- Morris `mu*`–`sigma`, elementary-effect distributions, convergence and rank stability;
- first/total grouped indices, total-first gap, second-order heatmap, convergence, uncertainty intervals, rank stability and output histogram;
- existing local sensitivity and FIM diagnostics.

Plot headings remain outside Plotly, shared geometry owns legend and margin behavior, and changing a selector does not change Two-up/Focus intent.

## Platform-wide consistency findings and corrections

Two reproducible cross-platform inconsistencies were found and fixed:

1. Sensitivity HTML used `field-grid cols-2`, but the shared stylesheet did not define those classes. The layout is now explicit, bounded and mobile-safe.
2. Sensitivity navigation descriptions differed between static pages and runtime-injected menus. One capability-accurate description is now used everywhere.

A new release-blocking audit checks those contracts, the advanced global controls and plots, browser-capacity messaging and all 14 authored two-panel workspaces.

No evidence was found that justified rewriting the stable ODE, Steady-State, Stochastic, Optimization, Statistics, Fitting, Linear Algebra, Networks, ML, SciML, Agent, Symbolic or Workbench numerical cores in this release.

## Reliability verdict

The new diagnostics are suitable for bounded exploratory analysis, method comparison, teaching, model screening and configuration export. They are not a substitute for high-budget convergence studies, correlated-input decomposition, calibrated uncertainty propagation or publication-grade verification on large/stiff systems.
