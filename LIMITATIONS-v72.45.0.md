# Foko Lab v72.45.0 — Known Limitations

## General

- Browser computations are bounded exploratory analyses, not scientific certification.
- Explicit browser ODE solvers may be unsuitable for stiff, discontinuous, delayed, hybrid, DAE or PDE systems.
- Solver tolerances control numerical integration error, not biological, structural or observation uncertainty.
- Results remain conditional on equations, baseline, initial conditions, time window, parameter ranges, selected output, solver and tolerances.

## Global Sensitivity

- Jansen and Saltelli calculations currently assume independent uniform parameter ranges.
- Correlated or constrained input distributions are not supported.
- Pairwise second-order estimates do not recover arbitrary higher-order interactions.
- Finite-sample first, total and second-order estimates may be negative or exceed one; values are intentionally not clipped.
- Bootstrap intervals resample the existing design. They do not replace independent replicated designs or convergence studies.
- Morris `sigma` combines interaction and nonlinearity and cannot separate them.
- Rank stability can be poor when parameters have similar effects or sample budgets are small.
- Output metrics compress trajectories; a parameter can be important at specific times yet appear weak for the selected scalar summary.
- Initial conditions influence trajectories but are not yet selectable as global sensitivity factors.
- eFAST, Shapley effects, dependent-input Sobol analysis, derivative-based global measures and Bayesian global sensitivity are unavailable.

## Browser capacity

- The browser refuses conservative large-model workloads before launching a worker.
- Current hard boundaries include 32 states, 20 varied parameters, 10 parameters for second-order analysis, 25,000 projected ODE solves and 80 million projected state-time values.
- These thresholds protect responsiveness but do not guarantee that every accepted model will finish quickly or converge.
- Large, stiff or high-order studies should be exported to Python/SALib, an HPC workflow or a server-backed analysis.
- A blocked run produces no partial sensitivity result.

## Other platform limits

- FIM evidence is local and scale/noise/design dependent; alignment is not posterior correlation or proof of identifiability.
- Steady-State multi-start and scans do not certify root completeness or bifurcations.
- Stochastic bands are finite-ensemble, pointwise summaries.
- Optimization candidates and sampled Pareto fronts are not global-optimality certificates.
- Unsupported methods remain export-only or unavailable rather than being approximated decoratively.
