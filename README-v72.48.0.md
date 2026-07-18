# Foko Lab v72.48.0

This release responds to a platform-depth review rather than adding unsupported names to menus. It rebuilds the learning layer, expands the maintained Sensitivity model library, improves plot presentation controls, and executes every maintained preset suite through the release gate while preserving the stable numerical engines and two-panel layout contract.

## Modelling handbook and curriculum

- `docs.html` is now a searchable modelling handbook covering question formulation, system boundaries, variables, parameters, units, equations, limiting cases, solver choice, verification, validation, uncertainty, interpretation and reporting.
- `tutorial.html` contains twenty practical investigations with a scientific goal, implementation task, deliberate challenge, interpretation checkpoint and reporting outcome.
- Tutorial progress is stored locally in the browser.
- Both pages link directly to the relevant scientific workspaces and retain a clear capability boundary between browser-computed, derived, limited, export-only and unavailable methods.

## Sensitivity Analysis depth

- The curated library now contains 17 editable ODE models across 13 scientific families.
- Every model exposes equations, initial conditions, parameter values and ranges, time span, output metric, solver controls and tolerances.
- Local, Morris, Jansen/Saltelli and FIM workflows retain their existing numerical estimators.
- The 35-plot registry includes Jacobians, propagated influence, perturbation convergence, OFAT, tornado, directional profiles, Morris design paths and elementary effects, first/total/second-order variance diagnostics, time/state effects, response surfaces, sampled relationships, MI/HSIC screening and FIM evidence.
- Presentation controls add raw, range-scaled and elasticity views, top-parameter filtering, uncertainty visibility and contour/3D response-surface selection without altering the underlying estimates.
- Oversized browser workloads are refused before a worker starts.

## Platform-wide stability

The release gate runs the maintained libraries for ODE, Steady-State, Stochastic, Optimization, Statistics, Curve Fitting, Linear Algebra, Networks, Machine Learning, SciML, Agent, Symbolic, Workbench and Sensitivity. Unsupported items from the historical master wish list remain documented as limited, export-only or unavailable rather than being represented by decorative plots.

## Scientific boundaries

Foko Lab still does not claim production Bayesian optimization, CFD or topology optimization, certified continuation/bifurcation analysis, full Bayesian inference, SHAP/UMAP training stacks, SDE/SPDE solvers, PINN/Neural ODE training or adjoint sensitivity. See `LIMITATIONS-v72.48.0.md`.

## Local validation

Run `test-v72.48.0-local.sh`. It uses port `8102`, starts the server only after every gate passes, and leaves an interactive shell open after failure.
