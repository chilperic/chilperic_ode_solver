# Foko Lab v72.48.0 Validation Record

## Completed source and browser-independent gates

- 109 JavaScript files passed syntax validation.
- One deterministic ODE integration engine boundary was retained.
- Sensitivity core: 47/47 checks passed.
- Numerical-input and capacity core: 21/21 checks passed.
- The 17-model Sensitivity library completed canonical worker-backed trajectory/FIM smoke runs across 13 families, 37 states and 57 varied parameters.
- Platform plot-registry audit passed: Optimization 23, Steady-State 18, Stochastic 12, Linear Algebra 11, Machine Learning 18, Sensitivity 35, Fitting 14 and Networks 12.
- 301/301 active Python contracts passed.
- User-input reliability audit passed.
- Platform and teaching-depth consistency audits passed.
- The modelling handbook contains 696 source lines and the curriculum contains 20 practical tutorials.
- 14/14 authored workspaces passed shared plot/computation and lifecycle contracts.
- 15/15 authored pages passed accessibility/performance budgets.
- Platform benchmark: 100/100, 12/12 measurable criteria.
- 32/32 independent differential reference checks passed.
- Offline Chromium navigation, Agent layout, shared plot, taxonomy, T-cell rerun, expanded Sensitivity and guide/tutorial gates passed.
- Playwright discovered 123 tests in 3 files.
- Release manifest contains 537 controlled files; a clean extraction had zero membership, size or hash mismatches.
- Two independent final release builds were byte-identical.

## Maintained library checks

The teaching audit verifies current curated-library counts:

- Optimization 17;
- Steady-State 26;
- Stochastic 13;
- Linear Algebra 8;
- Statistics 22;
- Machine Learning 14;
- Sensitivity 17;
- Curve Fitting 7;
- Networks 7;
- Symbolic 20.

Existing ODE, Optimization, Steady-State, Stochastic, Statistics, Fitting, Linear Algebra, Networks, ML, SciML, Agent, Workbench and Symbolic core/reference suites all passed during the release gate.

## Learning-surface checks

- `docs.html` exposes a searchable modelling handbook with 27 high-level sections and nested topic navigation.
- `tutorial.html` exposes 20 completion controls, persistent local progress and searchable investigations.
- Both surfaces use the canonical six-destination public navigation.
- Capability labels and unsupported boundaries are synchronized with Trust and the analysis taxonomy.

## Sensitivity paths explicitly validated

- Search and family filtering expose all 17 models.
- Editable equations, initial conditions, parameters/ranges, time span, output metric, solver settings and tolerances reach the worker.
- Local Jacobian, trajectory influence, perturbation convergence, OFAT, tornado, directional and response-surface paths render through stable two-panel hosts.
- Morris retains normalized parameter-design trajectories separately from output trajectories.
- Jansen/Saltelli first, total, second-order, bootstrap, time/state, variance-accounting and sampled-relationship paths remain available under the correct options.
- MI and HSIC remain labelled limited dependence screens.
- Raw, range-scaled and elasticity presentation, top-N filtering, uncertainty visibility and contour/3D surface controls do not alter the stored numerical result.
- Oversized requests are refused before worker launch and revalidated inside the worker.
- Changing a scientific input marks evidence stale and disables export until rerun.

## Browser-suite boundary

The managed validation environment does not provide a trustworthy complete localhost Playwright run. Therefore the full 123-test localhost suite is not claimed as passed here. Equivalent browser-independent Chromium paths passed, and the local runner executes the two maintained Sensitivity tests repeatedly and then all 123 tests before starting the server.

Passing these gates validates the tested implementation paths. It does not certify arbitrary user equations, large/stiff systems or unsupported roadmap algorithms.
