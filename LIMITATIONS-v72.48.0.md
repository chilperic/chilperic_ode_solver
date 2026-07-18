# Foko Lab v72.48.0 — Known Limitations

## General numerical boundary

- Browser computations are bounded exploratory analyses, not scientific certification.
- Passing a preset test does not validate a modified user model.
- Explicit browser ODE methods may be unsuitable for stiff, discontinuous, delayed, hybrid, DAE or PDE systems.
- Solver tolerances constrain numerical integration error; they do not quantify model-form, parameter, biological or observation uncertainty.
- Results remain conditional on equations, initial conditions, parameter values/ranges, time window, output metric, solver and tolerances.

## Sensitivity Analysis

- Local finite differences depend on perturbation size and can fail near discontinuities, thresholds, active bounds or poorly scaled parameters.
- State and parameter Jacobians are local right-hand-side derivatives; they are not propagated sensitivities or stability certificates.
- OFAT and tornado views omit interactions.
- Directional profiles depend on the declared direction and normalization.
- Response surfaces vary two parameters and keep all others nominal.
- Morris `σ` combines nonlinearity and interaction.
- Jansen/Saltelli indices assume independent uniform parameter ranges.
- Pairwise second-order indices do not recover arbitrary higher-order interactions.
- Finite-sample indices may be negative or exceed one and are not clipped.
- Time/state summaries reuse one seeded design and are not independent replications.
- Histogram MI and RBF-HSIC are limited dependence screens; their permutation p-values are not variance fractions or causal evidence.
- FIM evidence is local, scale-, observation- and noise-dependent; it is not posterior uncertainty or proof of identifiability.
- Initial conditions are not yet selectable as sensitivity factors.
- Adjoint sensitivity, FAST/eFAST, Shapley effects, dependent-input Sobol analysis and Bayesian sensitivity are unavailable in browser computation.

## Browser capacity

- Large requests are refused before worker launch when projected ODE solves, state-time storage, parameter count or second-order cost exceed conservative limits.
- Accepted requests can still be slow or fail for difficult or stiff models.
- Publication-scale global studies should be independently repeated with larger samples and an external implementation such as Python/SALib or an HPC/server workflow.

## Optimization and multi-objective analysis

- Browser optimizers return finite candidates, not global-optimality certificates.
- Sampled Pareto fronts are finite approximations.
- Hypervolume, knee, crowding and dominance diagnostics depend on the sampled front and declared scaling.
- CFD, topology optimization, production Bayesian optimization and full nonlinear MPC are not browser-computed engines.

## Steady-State and algebraic analysis

- Root searches do not certify that all roots were found.
- Parameter scans are not pseudo-arclength continuation.
- Branch-like plots do not certify saddle-node, Hopf or other bifurcations.
- Limit cycles require dynamical integration and are not inferred from an algebraic root alone.
- AC power-flow, flux-balance and PDE steady-state examples remain outside the generic browser root solver unless a validated reduced formulation is explicitly supplied.

## Statistics, ML and Linear Algebra

- Statistical tests rely on their stated assumptions and do not automate domain validation.
- Mean imputation and other limited preprocessing remain explicitly disclosed.
- Browser ML is a small-data educational toolkit, not a production training or monitoring stack.
- SHAP, UMAP/t-SNE training, federated learning, reinforcement learning and neural architecture search are not implemented as production workflows.
- Advanced pseudospectra, GMRES/Krylov, matrix completion and large sparse factorizations require dedicated numerical libraries and remain unavailable or external.

## Stochastic and SciML

- The maintained Stochastic engine is a bounded direct-SSA/jump-process workflow, not a general SDE or SPDE solver.
- Finite ensembles provide pointwise empirical summaries and can be censored.
- Stochastic bifurcation, Lyapunov, resonance, potential-landscape and entropy-production analyses are not generic computed features.
- SciML does not train PINNs, DeepONets, neural operators or Neural ODEs in the browser.
- SINDy and surrogate evidence applies only to the supported reduced computations and does not validate a discovered mechanism.

## Documentation boundary

The handbook and tutorials teach modelling practice but cannot replace domain expertise, experimental design, peer review or specialist software. Capability labels and Trust remain authoritative when a roadmap item appears in historical planning material.
