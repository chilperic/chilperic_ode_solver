# Foko Lab v72.46.0 — Known Limitations

## General numerical boundary

- Browser computations are bounded exploratory analyses, not scientific certification.
- Explicit browser ODE methods may be unsuitable for stiff, discontinuous, delayed, hybrid, DAE or PDE systems.
- Solver tolerances control integration error, not model-form, biological, parameter or observation uncertainty.
- Every result is conditional on equations, initial conditions, baseline parameters, ranges, time window, selected state/output, solver and tolerances.

## Local sensitivity

- Central finite differences depend on step size and can fail near discontinuities, event thresholds, active bounds or poorly scaled parameters.
- The state Jacobian `∂f/∂x` and parameter Jacobian `∂f/∂p` are local right-hand-side derivatives along the nominal trajectory. They are not propagated sensitivities or stability certificates.
- Trajectory sensitivity is computed by finite perturbations, not by analytic sensitivity equations or adjoints.
- OFAT and tornado plots vary one parameter at a time and omit interactions.
- Tornado endpoints use the full declared parameter ranges; they are not automatically symmetric percentage perturbations.
- Directional profiles depend on the user direction and range-based normalization.
- Two-parameter response surfaces fix all remaining parameters nominal and do not provide a global variance decomposition.
- Initial conditions influence trajectories but are not selectable as sensitivity factors in this release.
- Generic residual-component sensitivity is unavailable because an ODE trajectory has no canonical residual decomposition.

## Global sensitivity

- Jansen/Saltelli indices assume independent uniform parameter ranges.
- Correlated, constrained or empirically distributed inputs are unsupported.
- Pairwise second-order estimates do not recover arbitrary higher-order interactions.
- Finite-sample indices may be negative or exceed one and are intentionally not clipped.
- Time-resolved indices reuse one finite seeded design; near-zero-variance time points can be unresolved.
- Variance-contribution accounting reports raw finite-sample sums and an unresolved remainder. It is not forced to close to one.
- Parameter-output relationship plots show sampled associations, not causality.
- Histogram MI depends on quantile bins and sample size.
- HSIC depends on the RBF kernel and median-distance bandwidth.
- MI and HSIC permutation p-values are coarse screening diagnostics and are not effect sizes or variance fractions.
- Bootstrap intervals resample an existing design and do not replace independent replicated studies.
- Morris `sigma` combines nonlinearity and interaction and cannot separate them.
- FAST/eFAST, Shapley effects, dependent-input Sobol analysis and Bayesian sensitivity are unavailable in the browser.

## Browser capacity

- Oversized requests are refused before worker launch; no partial result is published.
- Local costs include perturbation refinement, OFAT, directional profiles and optional surface grids.
- Global costs include base samples, mixed matrices, optional second-order matrices and stored state-time values.
- Accepted requests can still be slow or fail for difficult equations.
- Large, stiff, high-dimensional or publication-scale studies should use the Python/SALib export or a server/HPC workflow.

## Other platform limits

- FIM evidence is local, scale-, design- and noise-dependent; alignment is not posterior correlation or proof of identifiability.
- Steady-State searches do not certify root completeness or bifurcations.
- Stochastic bands are finite-ensemble pointwise summaries.
- Optimization candidates and sampled Pareto sets are not global-optimality certificates.
- Unsupported methods remain export-only or unavailable rather than being approximated decoratively.
