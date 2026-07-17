# Foko Lab v72.44.0 — Professional Scientific and Reliability Audit

## Audit verdict

The v72.43.3 baseline was operationally stable, but it had two material gaps: numerical-control persistence in ODE workflows was incomplete, and sensitivity analysis existed only as scattered diagnostics and taxonomy. v72.44.0 resolves both gaps with validated numerical-input round trips and a first-class Sensitivity Analysis Lab.

The platform is suitable for browser-scale exploration, teaching, model debugging, preliminary numerical analysis, and reproducible handoff. It is not a certification system, a replacement for specialist continuation/DAE/PDE software, or a publication-grade uncertainty engine without independent reproduction.

## Scope

The audit covered:

- editable scientific inputs and whether they reach the numerical payload;
- validation of initial conditions, parameters, ranges, time span, solver settings, step controls, tolerances, sample sizes, seeds, and feasibility thresholds;
- session, share-URL, model-JSON, result-JSON, CSV, and image boundaries;
- stale-result ownership after scientific inputs change;
- worker cancellation and latest-run ownership;
- plot provenance and interpretation limits;
- numerical failure reporting;
- mobile and two-panel layout invariants;
- release runner behavior on failure and success.

## User-controlled numerical inputs

| Workspace | User-controlled inputs | Audit status |
|---|---|---|
| ODE | equations/reactions, state names, initial conditions, parameter values and ranges, `t0`, `t1`, output points, method, fixed/initial/maximum step, `rtol`, `atol`, safety | **Hardened** — validated before worker launch; numerical controls now survive session, share URL, and model JSON round trips; changes mark results stale |
| Sensitivity | editable ODE definition, initial conditions, parameter values/ranges, time span, points, solver and all ODE tolerances/step controls, output state/metric, perturbation, samples, trajectories, levels, seed, FIM noise scale | **Implemented** — first-class workspace with worker cancellation, budget estimate, method-specific validation, stale export guard, reproducible configuration export |
| Steady-State | equations, guesses, parameters, bounds/admissibility, root tolerance, iteration and scan settings | **Available with limits** — local root finding and finite scans; not complete root enumeration or continuation |
| Stochastic | reaction network, initial integer populations, parameters, time span, run count, seed, event cap/method settings | **Available with limits** — direct SSA for time-homogeneous propensities; finite Monte Carlo only |
| Optimization | variables/bounds, objective/constraints, method, budget/iterations, seed, feasibility and step tolerances | **Available with limits** — finite-budget candidate search, no optimality certificate |
| Curve Fitting | data, model, initial parameters, bounds, weighting, bootstrap seed/count, iteration settings | **Available with limits** — practical diagnostics, not structural-identifiability proof |
| Statistics / ML / Linear Algebra / Networks / Symbolic / SciML | domain-specific editable tables, matrices, graphs, equations, options, seeds or method controls where supported | **Audited** — capability matrix remains the authority; controls do not imply unavailable algorithms |

## ODE numerical-control correction

Previously, solver tolerance and step controls affected the current run but were not all retained by saved sessions, share URLs, or model JSON. That could create a scientifically different restored run while appearing to preserve the model.

v72.44.0 now round-trips:

- start and end time;
- output-point count;
- solver method;
- fixed step;
- adaptive initial and maximum step;
- relative and absolute tolerances;
- adaptive safety factor.

Invalid or inconsistent settings are rejected before worker launch. Any scientific or numerical edit marks prior evidence stale and disables result/image export until rerun.

## Sensitivity Analysis Lab

### Browser-computed

- central finite-difference local derivatives;
- elasticity or declared-range-scaled derivatives;
- state-trajectory finite-difference heatmaps;
- perturbation-step convergence checks;
- seeded Morris elementary effects on normalized independent ranges;
- seeded Jansen first-order and total-order estimates for independent uniform ranges;
- range-scaled local trajectory Fisher-information approximation;
- information spectrum, rank estimate, condition evidence, and normalized sensitivity-column alignment;
- solver-work aggregation and reproducible configuration/result exports.

### Explicitly not computed

- adjoint or forward sensitivity-equation solvers;
- eFAST;
- Shapley effects;
- correlated-input Sobol indices;
- symbolic structural identifiability;
- profile likelihood inside the Sensitivity Lab;
- certified continuation or bifurcation sensitivity;
- posterior parameter uncertainty;
- PDE, PINN, neural-ODE, or neural-operator adjoints.

## Plot reliability review

### ODE trajectory plots

A trajectory is evidence of one numerical solve under the displayed equations, inputs, method, and tolerances. It is not evidence that the model is biologically correct. Reliability should be checked by tolerance or step refinement and, for important results, an independent solver.

### Phase portraits, vector fields, and Poincaré views

These are dimension- and sampling-dependent projections. A missing Poincaré crossing does not prove absence of recurrent dynamics. Vector fields are local samples rather than exhaustive phase-space characterization.

### Stiffness evidence

The local Jacobian timescale ratio, rejection history, and characteristic-root evidence are heuristics. They can flag an explicit-method risk but do not constitute a stiffness certificate. Suspected stiff systems should be checked with Radau, BDF, or LSODA externally.

### Local sensitivity plots

Finite-difference rankings are local to the baseline and depend on perturbation size and parameter scaling. Thresholds, clipping, events, discontinuities, and solver noise can make derivatives misleading. A stable ranking across several perturbation sizes is necessary, not sufficient.

### Morris plots

Morris `mu*` is a screening statistic. `sigma` combines nonlinearity and interactions and cannot distinguish them. Rankings can change with trajectory count, levels, ranges, and seed.

### Jansen/Sobol plots

The implementation assumes independent uniform parameter ranges. Estimates remain raw: negative or greater-than-one values are retained because clipping would hide Monte Carlo error. Small browser budgets are diagnostic only; important results require larger independent runs and replicate seeds.

### Fisher-information plots

The FIM view is a local approximation using finite-difference trajectory sensitivities, declared parameter scaling, the selected time grid/output, and a constant independent noise scale. Its normalized alignment matrix is not a posterior correlation matrix. Rank and condition can change materially with units and experimental design.

### Steady-State plots

A converged residual proves only that one local numerical root was found. Multi-start and basin plots sample finite starts. Parameter scans are not pseudo-arclength continuation and cannot certify folds, Hopf points, branch completeness, or limit cycles.

### Stochastic plots

Trajectory bands and final distributions represent a finite seeded ensemble. Pointwise quantile bands are not simultaneous confidence bands; censored event-cap runs must be considered. Mean-field overlays are approximations and need not equal finite-population means.

### Optimization plots

Landscapes and Pareto views display evaluated candidates, not exact optima or exact fronts. A low penalized objective is separate from feasibility. No KKT, convexity, uniqueness, robustness, or global-optimality certificate is produced.

## Reliability findings

### Resolved blockers

1. **Missing first-class sensitivity workspace** — resolved.
2. **ODE numerical controls omitted from reproducibility round trips** — resolved.
3. **Old results remained exportable after inputs changed** — resolved for ODE and Sensitivity.
4. **Sensitivity two-panel layout retained an obsolete one-compatible-plot record after computation** — resolved by reapplying the shared layout contract after method-specific plot options are created.
5. **Runner window could disappear on failure** — resolved in the v72.44.0 runner by retaining an interactive shell when launched from a terminal or desktop terminal wrapper.

### Open scientific limitations

- No general implicit browser solver for stiff ODE/DAE systems.
- No event, delay, hybrid, DAE, PDE, or spatial discretization engine in the ODE/Sensitivity route.
- No certified continuation or general nonsymmetric stability spectrum in Steady-State.
- No correlated-input or dependent-parameter global sensitivity.
- No structural-identifiability solver or posterior Bayesian inference engine.
- Browser compute and memory limits constrain large ensembles and global-sensitivity sample sizes.

## Feasible improvements

1. Add an external SciPy verification export for sensitivity baselines using `solve_ivp` with RK45 and Radau/BDF comparisons.
2. Add SALib validation templates for Morris and Jansen/Sobol with larger `N`, multiple seeds, and convergence tables.
3. Add automatic perturbation-refinement warnings when local derivatives fail to stabilize.
4. Add sample-budget escalation guidance based on parameter count and ranking uncertainty.
5. Add initial-condition factors only after the data model can distinguish state uncertainty from parameter uncertainty clearly.
6. Add fit-linked profile likelihood by reusing the Curve Fitting objective; do not fabricate it for arbitrary ODE outputs.
7. Add sensitivity equations or adjoints only after a real, tested engine exists and can be independently benchmarked.

## Professional use boundary

For a report or publication, export the exact model and numerical configuration, rerun with an independent scientific stack, document convergence across tolerances/steps/sample budgets, and separate numerical uncertainty from parameter, measurement, and model-form uncertainty.
