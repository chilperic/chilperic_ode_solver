# Foko Lab v72.44.0 — Known Limitations

- Browser computations are bounded exploratory analyses, not scientific certification.
- ODE explicit methods may be unsuitable for stiff, discontinuous, delayed, hybrid, DAE, or PDE systems.
- Solver tolerances control local numerical error, not biological/model uncertainty.
- Sensitivity results are conditional on output, baseline, initial conditions, time window, ranges, solver, tolerances, and estimator settings.
- Local finite differences are perturbation-dependent and can fail near thresholds or nonsmooth behavior.
- Morris is screening; sigma does not separate interaction from nonlinearity.
- Jansen indices assume independent uniform factors; finite-sample estimates may lie outside [0,1].
- FIM evidence is local and scale/noise/design dependent; alignment is not posterior correlation.
- Steady-State multi-start and scans do not certify root completeness or bifurcations.
- Stochastic bands are finite-ensemble, pointwise summaries.
- Optimization candidates and Pareto samples are not optimality certificates.
- Unsupported methods are marked export-only or unavailable rather than approximated decoratively.
