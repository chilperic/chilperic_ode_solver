# V71.16 — Stochastic scientific upgrade and analysis-copy cleanup

## Scope

This release changes two bounded areas:

1. The stochastic focused lab gains browser-side method choice for exact SSA, tau-leaping and Euler–Maruyama approximation, plus 5–95% ensemble ribbons.
2. Analysis-lab public descriptions are rewritten as user-facing plots/examples descriptions rather than internal architecture notes.

## Changed

- `stochastic.html` exposes method, tau/dt and noise-scale controls.
- `src/stochastic/stochastic-lab.js` adds tau-leaping and Euler–Maruyama CTMC approximations.
- CTMC ensemble plots now expose median and 5–95% uncertainty bands.
- Stochastic diagnostics warn when approximate methods are selected.
- Statistics, Linear Algebra, Fitting, Networks and ML hero text now describes analyses, plots and examples, not descriptor-shell internals.

## Not changed

- Focused Labs remain focused pages; no redirects.
- No descriptor migration of stochastic, optimization, steady-state or ODE.
- No Web Worker consolidation in this release.
- No Steady-State continuation changes in this release.

## Risk

Tau-leaping and Euler–Maruyama are approximations. They must not be presented as exact replacements for Gillespie. The UI states this through method labels and diagnostics warnings.

## Validation

- Python test suite passed.
- Node science tests passed.
- JavaScript syntax checks passed.
