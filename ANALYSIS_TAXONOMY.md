# Foko Lab analysis taxonomy

This reference separates browser-computed evidence from limited, export-only, and unavailable methods. A listed method is not automatically implemented.

## Status definitions
- **browser-computed** — Computed directly in the browser by a maintained Foko Lab numerical core.
- **derived-browser** — Derived in the browser from a computed finite result; interpretation remains conditional on that result.
- **limited-browser** — Available with explicit finite-sample, finite-difference, reduced-model, or dimensionality limits.
- **export-only** — Represented in the taxonomy and export guidance, but not computed by the browser core.
- **unavailable** — Not offered because the required numerical method is absent; no substitute result is shown.

## Optimization plot types
1. **Loss Contour Map** — `browser-computed`. Two-variable raw-objective contour on a finite grid.
2. **Convergence Curve** — `browser-computed`. Recorded best penalized and feasible objective history.
3. **Gradient Norm Plot** — `limited-browser`. Finite-difference gradient of the raw objective.
4. **Hessian Spectrum Plot** — `limited-browser`. Central finite-difference Hessian; at most eight variables.
5. **Parameter Trajectory Plot** — `browser-computed`. Recorded best-candidate decision variables.
6. **Constraint Violation Plot** — `browser-computed`. Maximum numerical violation against the declared tolerance.
7. **Learning Rate Schedule Plot** — `unavailable`. The current algorithms do not expose or adapt a learning-rate schedule.
8. **Hyperparameter Sensitivity Map** — `export-only`. A validated repeated-run design over algorithm settings is not implemented.
9. **Multi-Start Basin Plot** — `limited-browser`. Candidate projection and finite deterministic starts; not an exhaustive basin decomposition.
10. **Pareto Frontier** — `limited-browser`. Seeded finite candidate sample; not an exact frontier.
11. **Step Size Evolution Plot** — `browser-computed`. Euclidean distance between recorded best candidates.
12. **Trust-Region Radius Plot** — `unavailable`. No trust-region algorithm is implemented.
13. **Momentum Evolution Plot** — `unavailable`. No momentum-based optimizer is implemented.
14. **Line Search Diagnostics Plot** — `unavailable`. Backtracking internals are not retained as a published diagnostic series.
15. **Optimization Landscape Heatmap** — `browser-computed`. Finite two-variable objective landscape.

## Optimization problems
1. **Rosenbrock Valley** — `limited-browser`. Bounded constrained Rosenbrock teaching benchmark.
2. **Rastrigin Function** — `browser-computed`
3. **Ackley Function** — `browser-computed`
4. **Beale Function** — `browser-computed`
5. **Himmelblau Function** — `browser-computed`
6. **Booth Function** — `browser-computed`
7. **LASSO Regression** — `limited-browser`. Two-coefficient analytic geometry; not a full regression workflow.
8. **Logistic Regression (BFGS)** — `unavailable`. BFGS and a data-backed logistic objective are not implemented in Optimization Lab.
9. **Markowitz Portfolio** — `limited-browser`. Educational equality-constrained risk-return model; not financial advice.
10. **Structural Buckling Optimization** — `export-only`. Validated structural mechanics and buckling constraints require an external solver.
11. **CFD Drag Minimization** — `export-only`. The browser does not solve Navier–Stokes or shape derivatives.
12. **Neural Network Loss Surface** — `limited-browser`. Analytic reduced loss surface; no network is trained.
13. **Bayesian Optimization** — `unavailable`. No Gaussian-process surrogate or acquisition optimizer is implemented.
14. **Nonlinear MPC** — `export-only`. Dynamic constraints and receding-horizon transcription require an external NLP stack.
15. **Topology Optimization** — `export-only`. Finite-element analysis and topology derivatives are outside the browser core.

## Multi-objective plot types
1. **Pareto Frontier** — `limited-browser`
2. **Dominance Heatmap** — `derived-browser`
3. **Crowding Distance Plot** — `derived-browser`
4. **Hypervolume Convergence Plot** — `limited-browser`. Two-objective prefix hypervolume relative to a finite-sample reference point.
5. **Parallel Coordinates Plot** — `browser-computed`
6. **Radar Chart** — `export-only`. No stable many-objective normalization contract is implemented.
7. **Trade-off Surface (3D)** — `unavailable`. The browser core currently supports one primary and one secondary objective.
8. **Objective Correlation Heatmap** — `derived-browser`
9. **Knee Point Detection Plot** — `limited-browser`. Geometric knee candidate on a normalized finite 2D front.
10. **Evolutionary Path Plot** — `unavailable`. No multi-objective evolutionary population history is implemented.
11. **Pareto Set Clustering Plot** — `export-only`. Cluster validity and selection are not implemented.
12. **Trade-off Gradient Plot** — `export-only`. Objective-gradient trade-off analysis is not implemented.
13. **Hypervolume Sensitivity Plot** — `export-only`. Repeated-run hypervolume sensitivity is not implemented.
14. **Multi-Objective Stability Plot** — `export-only`. Stability across seeds and budgets requires an explicit replicated design.
15. **Preference Region Plot** — `unavailable`. No preference articulation or reference-point optimizer is implemented.

## Multi-objective problems
1. **Bi-objective Rosenbrock–Rastrigin** — `limited-browser`
2. **ZDT1** — `export-only`. The browser core is not a benchmark-complete MOEA implementation.
3. **ZDT2** — `export-only`. The browser core is not a benchmark-complete MOEA implementation.
4. **ZDT3** — `export-only`. Disconnected-front coverage requires a dedicated MOEA and quality assessment.
5. **DTLZ1** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
6. **DTLZ2** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
7. **DTLZ7** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
8. **Portfolio Risk–Return** — `limited-browser`
9. **Energy vs Cost Optimization** — `limited-browser`
10. **CFD Lift–Drag Optimization** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
11. **Structural Weight–Stiffness** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
12. **Accuracy vs FLOPs** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
13. **Scheduling (Makespan vs Energy)** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
14. **Tracking vs Control Effort** — `limited-browser`
15. **Yield vs Purity** — `limited-browser`

## Steady-state / algebraic plot types
1. **Residual Surface Plot** — `browser-computed`
2. **Newton Convergence Map** — `limited-browser`. Parameter-grid convergence, not an initial-condition basin map.
3. **Jacobian Spectrum Plot** — `limited-browser`. Dynamic interpretation; analytic 1×1 or 2×2 eigenspectrum.
4. **Continuation Curve** — `limited-browser`. Sequential parameter scan; not pseudo-arclength continuation.
5. **Bifurcation Diagram** — `limited-browser`. Sampled branch with unconfirmed grid-dependent candidates.
6. **Stability Basin Plot** — `limited-browser`. Parameter-grid stability margin, not state-space basin certification.
7. **Residual vs Iteration Plot** — `browser-computed`
8. **Jacobian Sign Structure Plot** — `derived-browser`
9. **Sensitivity Plot** — `limited-browser`. Finite-difference slope along a sequential parameter scan.
10. **Limit Cycle Emergence Plot** — `unavailable`. Steady-State Lab does not integrate trajectories or certify periodic orbits.
11. **Phase Plane Plot** — `limited-browser`. Two residual nullclines and reported root; no trajectory integration.
12. **Nullcline Plot** — `browser-computed`
13. **Continuation Branch Plot** — `limited-browser`
14. **Stiffness Indicator Plot** — `limited-browser`. Magnitude ratio of supported local eigenvalues.
15. **Solver Basin Map** — `limited-browser`. Finite deterministic multi-start roots; not a dense basin partition.

## Steady-state / algebraic problems
1. **CSTR Thermal Runaway** — `browser-computed`
2. **Digester Methane Production** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
3. **Saddle-Node Bifurcation** — `limited-browser`
4. **Hopf Bifurcation in PLL** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
5. **Van der Pol Steady States** — `limited-browser`. Use ODE Lab for Van der Pol trajectories; Steady-State provides analogous fixed-point diagnostics only.
6. **Brusselator Equilibrium** — `browser-computed`
7. **Lotka–Volterra Fixed Points** — `browser-computed`
8. **Hydraulic Jump** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
9. **Flux Balance Analysis** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
10. **Buckling Load Equilibrium** — `limited-browser`
11. **AC Power Flow** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
12. **Mass Action Equilibrium** — `browser-computed`
13. **Reaction–Diffusion Steady States** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
14. **KKT Algebraic System** — `limited-browser`
15. **Phase Equilibrium** — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.

## Sensitivity analysis

### Local
**Methods**
- Finite Difference Sensitivity — `browser-computed`. Central finite differences for scalar metrics and propagated trajectories, with perturbation-step convergence evidence.
- Local Jacobian Sensitivity — `browser-computed`. State Jacobian ∂f/∂x, parameter Jacobian ∂f/∂p, and parameter-to-state trajectory influence along the nominal solution.
- One-Factor-at-a-Time Sensitivity — `browser-computed`. Bounded sweeps with all nonselected parameters fixed; interactions are excluded.
- Directional Sensitivity — `limited-browser`. A user direction is normalized in declared parameter-range coordinates and evaluated over a bounded profile.
- Two-Parameter Response Surface — `limited-browser`. Optional bounded grid with all remaining parameters nominal and a guarded browser workload.
- Adjoint Sensitivity — `export-only`. No objective-specific backward adjoint, checkpointing, event handling, or finite-difference verification contract is implemented.

**Plots**
- Local Sensitivity Ranking — `browser-computed` (`ranking`).
- Parameter Jacobian Heatmap — `browser-computed` (`parameter-jacobian`). Right-hand-side derivative, not propagated trajectory sensitivity.
- State Jacobian Heatmap — `browser-computed` (`state-jacobian`). Local vector-field derivative, not a stability certificate.
- Trajectory Sensitivity Heatmap — `browser-computed` (`heatmap`).
- Parameter × State Influence Map — `derived-browser` (`influence-map`).
- OFAT Response Curves — `browser-computed` (`ofat`).
- Tornado Plot — `derived-browser` (`tornado`). Full declared-range endpoint changes, not a global variance decomposition.
- Directional Response Plot — `limited-browser` (`directional`).
- Perturbation-Size Convergence — `derived-browser` (`convergence`).
- Two-Parameter Response Surface — `limited-browser` (`response-surface`).
- Residual Component Sensitivity — `unavailable` in generic ODE sensitivity. It is only meaningful in residual-defined fitting, algebraic, or future PINN workflows.

### Global
**Methods**
- Jansen / Saltelli Variance Indices — `limited-browser`. First- and total-order Jansen estimates plus optional symmetrized Saltelli pairwise second-order interactions for independent uniform parameter ranges.
- Morris Screening — `limited-browser`. Seeded OAT trajectories with μ, μ*, σ, elementary-effect distributions, convergence and bootstrap rank stability.
- Mutual Information Screening — `limited-browser`. Quantile-bin normalized MI on a bounded subset of the actual global sample design with coarse permutation screening; not a variance fraction.
- HSIC Screening — `limited-browser`. Normalized RBF-kernel HSIC with median-distance bandwidth and coarse permutation screening; not a Sobol index.
- FAST / eFAST — `export-only`. No validated frequency assignment, spectral estimator, or eFAST design is implemented.
- Shapley Effects — `export-only`. No validated conditional-expectation engine for dependent inputs is implemented.

**Plots**
- First / Total Index Plot — `limited-browser` (`sobol`).
- Second-Order Interaction Heatmap — `limited-browser` (`sobol-second`).
- Total-minus-First Interaction Gap — `derived-browser` (`sobol-gap`).
- Bootstrap Uncertainty Plot — `derived-browser` (`sobol-uncertainty`).
- Global Rank Stability Plot — `derived-browser` (`sobol-rank`).
- Sampled Output Distribution — `derived-browser` (`sobol-output`).
- Global Sampling Convergence Plot — `derived-browser` (`sobol-convergence`).
- Time-Resolved Total-Effect Heatmap — `derived-browser` (`sobol-time`). Uses the same seeded A/B/mixed design and adds no ODE solves.
- Variance-Contribution Accounting — `derived-browser` (`variance-contribution`). Raw finite-sample first-order, optional pairwise, and unresolved remainder; no forced closure.
- Parameter–Output Relationship Matrix — `derived-browser` (`global-scatter`).
- Mutual Information Screening Plot — `limited-browser` (`dependence-mi`).
- HSIC Screening Plot — `limited-browser` (`dependence-hsic`).
- Morris μ*–σ Map — `limited-browser` (`morris`).
- Morris Elementary-Effect Distribution — `derived-browser` (`morris-effects`).
- Morris Trajectory Convergence — `derived-browser` (`morris-convergence`).
- Morris Rank Stability Plot — `derived-browser` (`morris-rank`).
- Morris Trajectory Plot — `limited-browser` (`trajectories`).
- FAST Spectrum — `export-only`. A Fourier transform without a valid FAST/eFAST sampling design is not a sensitivity spectrum.
- Shapley Value Plot — `export-only`.

Browser capacity is guarded before computation. Oversized state, parameter, sample, pair-count, surface-grid, or state-time requests are refused before a worker starts and should be exported to Python/SALib or a server/HPC workflow.

### Structural
**Methods**
- Profile Likelihood — `limited-browser`. Curve Fitting finite profile SSE scans.
- Fisher Information Matrix — `limited-browser`. Local covariance/FIM-style diagnostics where supported.
- Symbolic Identifiability — `export-only`. Symbolic Lab provides derivatives and export, not a structural identifiability solver.
**Plots**
- Profile Likelihood Curve — `limited-browser`.
- FIM Eigenvalue Spectrum — `limited-browser`.
- Identifiability Tree Plot — `unavailable`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.

### Multi-objective
**Methods**
- Trade-off Sensitivity — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
- Knee Point Sensitivity — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
- Hypervolume Sensitivity — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
**Plots**
- Pareto Frontier Sensitivity Overlay — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
- Hypervolume Sensitivity Curve — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
- Objective Correlation Heatmap — `derived-browser`.

### Steady-state
**Methods**
- Implicit Function Sensitivity — `limited-browser`. Finite scan slope, not an analytic implicit-function solve.
- Continuation Sensitivity — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
- Bifurcation Sensitivity — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
**Plots**
- Continuation Curve with Sensitivity Bands — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
- Bifurcation Diagram Sensitivity Overlay — `export-only`. Requires a dedicated external numerical workflow; the browser does not present a substitute computation.
- Jacobian Spectrum Sensitivity Plot — `limited-browser`.


## v72.48.0 Sensitivity runtime additions

- Morris normalized parameter-design trajectories (`morris-design`) are distinct from Morris output paths.
- Global variance mode exposes first- and total-order effects through time and across every model state using the selected scalar metric.
- The bounded two-parameter response surface is available in both Local and Global variance modes and is charged to the browser workload estimate.
- Plot availability remains conditional on the selected method and enabled options; missing dropdown entries are not implementation failures when their prerequisite is disabled.
- Adjoint sensitivity, FAST/eFAST, Shapley effects and correlated-input decompositions remain export-only or unavailable.
