# V71.18 — Steady-State scientific upgrade

## Scope
This release upgrades the preserved Focused Steady-State Lab without descriptor-migrating it.

## Implemented
- Added second continuation parameter controls.
- Added a `2D map` action for two-parameter continuation scans.
- Added numerical Jacobian summaries for 1D/2D systems.
- Added candidate Hopf/fold classification from determinant/trace and branch sign changes.
- Added 2D continuation heatmap plot mode.
- Added bifurcation marker plot mode.
- Added class-count diagnostic plot mode.
- Added export coverage for `continuation2D`.
- Added docs/tutorial guidance for interpreting candidate bifurcations.

## Limits
Classification is numerical screening, not a rigorous bifurcation proof. Finite-difference Jacobians, Newton convergence, branch step size and parameter scaling can all produce false positives or missed events. Results must be validated externally for publication-grade bifurcation analysis.

## Regression protections
- Tests assert the new controls exist.
- Tests assert Hopf/fold and 2D continuation code paths exist.
- Tests assert docs/tutorial explain the new workflow.
- Tests assert cache-token normalization.
