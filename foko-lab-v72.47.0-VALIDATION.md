# Foko Lab v72.47.0 Validation Record

## Completed source and browser-independent gates

- 108 JavaScript files passed syntax validation.
- One deterministic ODE integration engine boundary was retained.
- Sensitivity core: 47/47 checks passed, including normalized Morris designs, state/time Jansen effects, Local/Global response surfaces and existing local, second-order, dependence and FIM evidence.
- Numerical-input core: 21/21 checks passed, including Local/Global surface budgets and oversized-browser refusal.
- 301/301 active Python contracts passed.
- User-input reliability audit passed.
- Documentation/runtime/platform consistency audit passed.
- 14/14 authored workspaces passed shared plot/computation and lifecycle contracts.
- 15/15 authored pages passed accessibility/performance budgets.
- Platform benchmark: 100/100, 12/12 measurable criteria.
- 32/32 independent differential reference checks passed.
- Offline Chromium navigation, Agent layout, shared plot, taxonomy, T-cell rerun and expanded Sensitivity gates passed.
- Playwright discovered 123 tests in 3 files.
- Release manifest contains 528 controlled files; a clean extraction had zero missing, extra or mismatched entries.
- Two independent final release builds were byte-identical.

## Sensitivity paths explicitly validated

- Editable equations, initial conditions, parameter values/ranges, time span, output grid, solver settings and tolerances reach the worker.
- State Jacobian, parameter Jacobian and propagated trajectory sensitivity remain separate quantities.
- OFAT, tornado, directional and Local/Global response-surface diagnostics use declared ranges and finite budgets.
- Morris retains normalized parameter coordinates and displays design paths separately from output paths.
- Time-resolved and state-resolved Jansen first/total effects reuse the actual seeded global sample design and cached trajectories.
- Variance accounting retains raw first-order, pairwise and unresolved values without forced closure.
- MI and HSIC use explicit bounded estimators and coarse permutation screening and are not labelled variance fractions.
- Browser-capacity refusal includes all local and global work and is repeated inside the worker.
- Changing a scientific input marks evidence stale and blocks result export.
- Two-up and explicit Focus intent remain stable while plot selectors change.

## Documentation and release coherence

- Docs, Tutorial 10, Trust, the capability registry and the analysis taxonomy describe the same feature set and boundaries.
- Trust contains the canonical six-destination static navigation, a reader-facing “Derived in browser” label and preserved scientific acronyms.
- The local runner uses v72.46.0 as the immediate predecessor in both shell and embedded Python preflight checks.

## Browser-suite boundary

The managed validation environment blocks localhost Playwright navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore the complete 123-test localhost suite is not claimed as passed here. Equivalent expanded offline Chromium paths passed, and the local runner executes both maintained Sensitivity tests repeatedly and then all 123 tests before starting the server.

Passing these gates validates the tested implementation paths. It does not certify arbitrary user equations or large/stiff external studies.
