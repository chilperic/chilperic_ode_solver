# Foko Lab v72.45.0 Validation Record

## Completed release gates

- 108 JavaScript files passed syntax validation.
- One deterministic ODE integration engine boundary was retained.
- Sensitivity core: 36/36 advanced local, Morris, Jansen/Saltelli, bootstrap, rank and FIM checks passed.
- Numerical-input core: 15/15 checks passed, including second-order solve budgets and oversized-browser refusal.
- 298/298 active Python contracts passed.
- User-input reliability audit passed.
- Platform consistency audit passed.
- 14/14 authored workspaces passed the shared plot/computation and lifecycle contracts.
- 15/15 authored pages passed accessibility/performance budgets.
- Platform benchmark: 100/100, 12/12 measurable criteria.
- 32/32 independent differential reference checks passed.
- Offline Chromium navigation, Agent layout, shared plot, taxonomy, T-cell rerun and advanced Sensitivity gates passed.
- Playwright discovered 123 tests in 3 files.
- Release manifest contains 521 controlled files; clean extraction had zero missing, extra or mismatched entries.
- Two independent release builds were byte-identical.

## Sensitivity paths explicitly validated

- SIR initializes with three parameter rows; Logistic exposes two after loading.
- Equations, initial conditions, parameter values/ranges, time span, output points, solver controls and tolerances reach the worker payload.
- Morris retains effect distributions, convergence and bootstrap rank stability.
- Jansen first/total estimates, Saltelli pairwise second-order effects, bootstrap intervals, convergence, rank stability and output distributions are finite on bounded reference problems.
- Second-order accounting uses `N(2p+2)` ODE solves.
- Unsafe requests are refused before worker launch and the worker repeats the capacity validation.
- Changing a scientific input marks evidence stale and blocks result export until recomputation.
- Two-up remains stable while advanced plots are changed.

## Browser-suite boundary

The managed validation environment blocks localhost Playwright navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore the complete 123-test localhost suite is not claimed as passed here. The local runner executes both Sensitivity tests repeatedly and then all 123 tests before starting the server.

Passing these gates validates the tested implementation paths. It does not validate an arbitrary user model, certify Monte Carlo convergence, prove identifiability or make a result publication-ready.
