# Foko Lab v72.46.0

This release deepens the first-class Sensitivity Analysis Lab while retaining the stable platform architecture.

## Sensitivity additions

- parameter and state right-hand-side Jacobian heatmaps;
- propagated parameter-to-state trajectory influence;
- OFAT response curves and tornado summaries;
- range-normalized directional profiles;
- optional bounded two-parameter response surfaces;
- time-resolved Jansen first/total effects;
- raw variance-contribution accounting;
- sampled parameter-output relationship views;
- limited mutual-information and HSIC permutation screening;
- capacity estimates that include all added local and global work.

## Scientific boundaries

Adjoints, FAST/eFAST, Shapley effects, correlated-input variance decomposition and generic residual-component sensitivity are not presented as computed features. See `LIMITATIONS-v72.46.0.md`.

## Local validation

Run `test-v72.46.0-local.sh`. It starts the server on port `8100` only after the complete test suite passes and leaves an interactive shell open after a failure.
