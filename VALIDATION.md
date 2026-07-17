# Foko Lab v72.47.0 Validation Record

## Completed release gates

- 108 JavaScript files passed syntax validation.
- One deterministic ODE integration engine boundary was retained.
- Sensitivity core: 46/46 checks passed, including OFAT, directional profiles, response surfaces, MI/HSIC screening and existing Morris/Jansen/Saltelli/FIM evidence.
- Numerical-input core: 19/19 checks passed, including local diagnostic budgets, second-order budgets and oversized-browser refusal.
- 301/301 active Python contracts passed.
- User-input reliability audit passed.
- Platform consistency audit passed.
- 14/14 authored workspaces passed shared plot/computation and lifecycle contracts.
- 15/15 authored pages passed accessibility/performance budgets.
- Platform benchmark: 100/100, 12/12 measurable criteria.
- 32/32 independent differential reference checks passed.
- Offline Chromium navigation, Agent layout, shared plot, taxonomy, T-cell rerun and expanded Sensitivity gates passed.
- Playwright discovered 123 tests in 3 files.
- Release manifest contains 527 controlled files; a clean extraction had zero missing, extra or mismatched entries.
- Two independent final release builds were byte-identical.

## Sensitivity paths explicitly validated

- Editable equations, initial conditions, parameter values/ranges, time span, output grid, solver settings and tolerances reach the worker.
- State Jacobian, parameter Jacobian and propagated trajectory sensitivity remain separate quantities.
- OFAT, tornado and directional diagnostics use declared parameter ranges and explicit finite budgets.
- Optional response surfaces are bounded and fix all nonselected parameters nominal.
- Time-resolved Jansen first/total effects reuse the actual seeded global sample design and cached trajectories.
- Variance accounting retains raw first-order, pairwise and unresolved values without forced closure.
- MI and HSIC use explicit bounded estimators and coarse permutation screening and are not labelled variance fractions.
- Browser-capacity refusal includes all new local and global work and is repeated inside the worker.
- Changing a scientific input marks evidence stale and blocks result export.
- Two-up and explicit Focus intent remain stable while plot selectors change.

## Browser-suite boundary

The managed validation environment blocks localhost Playwright navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore the complete 123-test localhost suite is not claimed as passed here. Equivalent offline Chromium Sensitivity paths passed, and the local runner executes both Sensitivity tests repeatedly and then all 123 tests before starting the server.

Passing these gates validates the tested implementation paths. It does not certify arbitrary user equations or large/stiff external studies.
