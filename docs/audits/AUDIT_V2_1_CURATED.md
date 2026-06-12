# Chilperic ODE v2.1 curated stabilization audit

## Scope
This release focuses on product coherence rather than more features: feature ordering, module-specific plot semantics, figure labeling/export, and reduced interface noise.

## Changes implemented

### 1. Feature ordering
The visible workflow now prioritizes the scientific path:

1. Mode selection: ODE, Parametric, Optimization
2. Short product description and documentation link
3. Examples + selected-model narrative
4. Model definition: equations/variables, parameters, initial conditions or bounds, time range
5. Run actions
6. Advanced numerical settings and import/templates behind disclosure controls
7. Results, figure settings, and exports

Top-level navigation was reduced to Workbench, Library, and Docs. Export remains contextual in the results/export area rather than a competing top-level destination.

### 2. Parametric workflow separation
Parametric ODE mode now treats **Run default** and **Sweep parameters** as different result types:

- Run default: solves the current/default parameter values and enables trajectory/phase plots.
- Sweep parameters: uses parameter ranges and enables heatmap, contour, bifurcation, envelope/fan, and parallel-coordinate plots.

This prevents sweep plots from overwriting the default trajectory workflow.

### 3. Plot-state registry
Plots are constrained by module and result type:

- ODE: trajectory, 2D/3D phase, vector field, Poincaré section, trajectory matrix.
- Parametric default: trajectory and phase views.
- Parametric sweep: heatmap, contour, bifurcation, envelope/fan, parallel coordinates.
- Optimization: samples, optimization path, convergence, objective-constraint trade-off.

The app now blocks invalid plot/module combinations instead of silently drawing the wrong plot under the wrong label.

### 4. Figure settings and export labels
A new figure settings workflow supports per-plot export metadata:

- target plot: primary or secondary
- title
- x/y/z labels
- colorbar label
- width and height
- font size
- line width
- marker size
- legend toggle
- grid toggle
- selected PNG/SVG export

Exported plot dimensions now use the configured figure width and height.

### 5. Optimization plot semantics
Optimization plots now avoid ODE/phase-portrait language. Trade-off plots use explicit feasible/infeasible legends rather than unlabeled colors.

### 6. Reduced noise
Removed duplicated navigation, moved import/templates below primary actions, reduced always-visible plot controls, and made advanced settings a secondary layer.

## Checks run

- `node --check src/app.js`
- `node --check src/worker.js`
- Static DOM wiring check: all `$('<id>')` references in `src/app.js` are present in `index.html`.

## Known boundary
Browser solvers are still exploratory for stiff systems and browser optimization remains educational. Stiff systems and serious constrained optimization should use Python export with SciPy/CasADi/Pyomo.
