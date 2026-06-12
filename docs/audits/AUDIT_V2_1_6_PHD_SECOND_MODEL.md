# Chilperic ODE v2.1.6 — PhD second model and plot-state hotfix

## Fixes

- Added a defensive plot-state normalizer so primary/secondary plot configurations are always present.
- Reset plot axes when switching models, preventing stale `z` values from the previously loaded example.
- Terminated any active worker when a new example is loaded, preventing old runs from returning into the UI after the model has changed.
- Added the second PhD-inspired model: a reduced semi-mechanistic FADNS channeling model with acetyl-CoA, malonyl-CoA, NADPH, FAS-bound intermediates, and C14/C16/C18 products.
- Added a parametric sweep version for the second PhD model.
- Updated Examples page and documentation references.

## Boundary

The FADNS example is a browser-explorable reduction of the thesis model architecture, not a calibrated reproduction of every parameter/result.
