# Chilperic ODE v2.0-stable audit

## Scope

This release stabilizes the module and plot workflow after regressions in the plot workbench layer.

## Key corrections

- Rebuilt plot state around module + result kind + left/right plot slots.
- Separated ODE default runs, Parametric default runs, Parametric sweeps, and Optimization results.
- Added left and right plot selectors with module-aware options.
- Removed generic plot toolbar ambiguity.
- Added per-plot configuration: title, axes, labels, size, line width, marker size, legend, grid.
- Restored compact examples and Load button.
- Run and Sweep are next to each other in Parametric mode.
- Added optimization-specific LaTeX preview.
- Added vector-field arrows with arrowheads.
- Added labeled objective–constraint trade-off plot.
- Added documentation page and MIT/license section.

## Static checks run

- `node --check src/app.js`
- `node --check src/worker.js`
- DOM ID reference check: all `$('<id>')` references in `app.js` exist in `index.html`.

## Known boundaries

- Browser stiff solving remains exploratory. Use Python export for Radau, BDF, or LSODA.
- Browser optimization is approximate. Use exported SciPy/CasADi/Pyomo code for serious constrained nonlinear programs.
