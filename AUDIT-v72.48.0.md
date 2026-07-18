# Foko Lab v72.48.0 — Professional Depth and Stability Audit

## Scope

This audit uses v72.47.0 as the stable baseline. It evaluates four reported weaknesses:

1. the public Docs and Tutorial did not teach scientific modelling deeply enough;
2. the Sensitivity Analysis library and plot presentation were too weak relative to the declared scope;
3. the large historical feature list mixed implemented functions, roadmap concepts and methods requiring absent engines;
4. every maintained model family needed to remain operational after the changes.

The audit does not convert the historical wish list into unsupported buttons. A feature is exposed as computed only when the platform has a real estimator, a defined input contract, a bounded workload, a plot derived from the computed result, and a regression test.

## Finding 1 — the learning layer was structurally insufficient

The previous public guide mainly described controls and capability boundaries. It did not provide a full path from scientific question to model, nor enough exercises to teach model construction, numerical verification and defensible interpretation.

### Correction

`USER_GUIDE.md` was rebuilt as a 696-line modelling handbook and rendered as a searchable public page. It now teaches:

- defining one scientific question and measurable output;
- declaring system boundaries and forcing assumptions;
- distinguishing states, parameters, initial conditions and observations;
- assigning units and checking dimensions;
- deriving equations from mechanisms and limiting cases;
- selecting time spans, output grids, tolerances and numerical methods;
- diagnosing stiffness and solver disagreement;
- separating verification, validation and uncertainty;
- interpreting each maintained lab without overstating its evidence;
- saving enough provenance for reproducible reporting.

`TUTORIALS.md` was rebuilt as twenty practical investigations. Each tutorial contains a goal, question, implementation sequence, deliberate challenge, interpretation checkpoint and reportable outcome. The rendered curriculum is searchable and stores completion progress locally.

## Finding 2 — Sensitivity needed model breadth and interpretive control

The underlying local, Morris, Jansen/Saltelli and FIM estimators were substantive, but the curated model library was narrow and the plot layer did not provide enough control for different parameter scales or crowded rankings.

### Correction

The maintained Sensitivity library now contains 17 editable ODE models across 13 families:

- epidemiology;
- ecology;
- nonlinear dynamics;
- mechanics;
- chemical kinetics;
- enzyme kinetics;
- bioprocess engineering;
- gene regulation;
- synthetic biology;
- excitable systems;
- signalling;
- physiology;
- population growth.

The release test executes every preset through the canonical worker-backed ODE path. Across the library this covers 37 states and 57 varied parameters.

The existing 35 computed/derived Sensitivity plots remain method-dependent. Presentation was strengthened with:

- raw values;
- range-scaled values;
- dimensionless elasticities where defined;
- top-parameter filtering;
- uncertainty visibility controls;
- contour or 3D response-surface presentation;
- sorted horizontal ranking plots;
- clearer evidence text and conditional availability.

These controls change presentation only. They do not fabricate new estimates.

## Finding 3 — the historical master list required capability triage

The supplied list contains valuable directions, but it combines:

- implemented browser methods;
- diagnostic plot names;
- sampling designs;
- complete disciplines requiring dedicated solvers;
- examples that cannot be honestly reduced to browser demonstrations.

### Safe retained or integrated capabilities

- Optimization contains finite bounded single- and multi-objective diagnostics, including Pareto, dominance, crowding, hypervolume, knee and objective-correlation views.
- Steady-State contains residual, Jacobian, scan, nullcline and limited branch diagnostics without claiming certified continuation.
- Heatmaps remain a cross-cutting visual form rather than a separate lab with duplicated computations.
- Statistics, ML, Linear Algebra, Networks, Fitting and Stochastic retain their maintained browser cores and plot registries.
- SciML computes only the supported reduced SINDy/surrogate evidence and labels PINN, neural-operator and Neural ODE examples export-only where no training engine exists.
- Sensitivity exposes real local/global/FIM evidence and explicitly refuses unsupported adjoints, FAST/eFAST, Shapley and dependent-input decomposition.

### Features not promoted to computed status

The release does not claim production support for CFD drag minimization, topology optimization, Bayesian optimization, certified bifurcation continuation, pseudospectra/GMRES, full Bayesian hierarchical inference, SHAP, t-SNE/UMAP training, reinforcement learning, SDE/SPDE simulation, stochastic Lyapunov analysis, PINN/DeepONet/Neural ODE training or adjoint sensitivity. These require engines, convergence evidence and validation references that are not present.

## Finding 4 — regression coverage had to include all maintained labs

The audit added release-blocking checks for:

- every Sensitivity preset through a canonical worker-backed smoke run;
- exact maintained plot-registry depth for Optimization, Steady-State, Stochastic, Linear Algebra, ML, Sensitivity, Fitting and Networks;
- exact curated-library counts for maintained labs;
- searchable guide and tutorial behavior;
- capability-language consistency;
- all existing numerical core suites and 301 active contracts;
- two-panel layout and shared plot lifecycle across 14 workspaces.

No stable numerical core was replaced. The changes are additive around teaching, example breadth, presentation and release auditing.

## Current maintained depth

| Area | Curated examples verified by the teaching audit | Registered plots verified where centrally enumerable |
|---|---:|---:|
| Optimization | 17 | 23 |
| Steady-State | 26 | 18 |
| Stochastic | 13 | 12 |
| Linear Algebra | 8 | 11 |
| Statistics | 22 | maintained workspace suite |
| Machine Learning | 14 | 18 |
| Sensitivity | 17 | 35 |
| Curve Fitting | 7 | 14 |
| Networks | 7 | 12 |
| Symbolic | 20 | maintained limited workspace |

Counts describe maintained browser examples and registered views, not parity with desktop scientific platforms.

## Reliability verdict

v72.48.0 is materially stronger as a modelling and teaching platform. It provides a deeper Sensitivity library, clearer plots and a usable learning path while retaining stable computation and explicit non-claims. It remains appropriate for bounded exploratory analysis, teaching, screening, comparison and reproducible export—not for arbitrary large, stiff, high-dimensional or production-scale studies.
