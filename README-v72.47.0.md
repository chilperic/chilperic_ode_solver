# Foko Lab v72.47.0

This release closes the remaining discoverability and documentation gaps in the first-class Sensitivity Analysis Lab while retaining the stable numerical engines and two-panel workspace contract.

## Corrected missing features

- Morris now exposes the actual normalized parameter-design trajectories, distinct from the scalar output along each path.
- Jansen/Saltelli global analysis now reports first- and total-effect summaries across every model state, in addition to the selected-state time-resolved heatmaps.
- The bounded two-parameter response surface is available in both Local and Global variance modes.
- The lab contains an explicit plot-availability catalogue explaining which views are conditional on the selected method, second-order option, dependence option, or response-surface option.

## Existing Sensitivity depth retained

- parameter and state right-hand-side Jacobian heatmaps;
- propagated parameter-to-state trajectory influence;
- perturbation refinement, OFAT curves, tornado summaries and normalized directional profiles;
- Morris elementary-effect distributions, convergence and rank stability;
- Jansen first/total indices, Saltelli pairwise second-order interactions, bootstrap uncertainty and rank stability;
- time- and state-resolved global effects;
- variance accounting, sampled relationships and bounded MI/HSIC permutation screening;
- explicit browser-capacity refusal before worker launch.

## Public guidance synchronized

`docs.html`, `tutorial.html`, `trust.html`, `USER_GUIDE.md`, `TUTORIALS.md`, `CAPABILITIES.json` and the analysis taxonomy now describe the same implemented, conditional, limited, export-only and unavailable features. Tutorial 10 provides a complete Sensitivity workflow.

## Scientific boundaries

Adjoints, FAST/eFAST, Shapley effects, correlated-input variance decomposition and generic residual-component sensitivity are not presented as computed features. See `LIMITATIONS-v72.47.0.md`.

## Local validation

Run `test-v72.47.0-local.sh`. It uses port `8101`, starts the server only after every gate passes, and leaves an interactive shell open after failure.
