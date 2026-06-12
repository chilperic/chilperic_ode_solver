# Chilperic Dynamics v2.4.7 — App plot and loading fixes

## Scope
Targeted `src/app.js` fixes after the internal v2.4.6 bug audit.

## Fixed

### BUG-1 — Lorenz 3D phase portrait collapsed by `sectionVar`
`resetPlotAxes()` no longer uses `state.model.sectionVar` to initialise the z-axis. The z-axis now defaults to the third state variable. `plotPoincare()` now reads `state.model.sectionVar` independently for section crossings.

Result: Lorenz and Lorenz rho-sigma plot `x-y-z` in 3D while keeping the Poincare section at the declared crossing variable.

### BUG-2 — One-variable systems defaulted to `x` vs `x`
The right plot now defaults to:

- `phase3d` for 3 or more variables
- `phase2d` for 2 variables
- `none` for 1 variable

`plotPhase2D()` also guards against identical X/Y selections and shows an explanatory empty plot instead of drawing a meaningless diagonal.

### BUG-3 — Load button appeared non-functional
The dropdown no longer auto-loads examples on `change`. Example loading is explicit through the Load button or the visible model chips.

## Checks

```bash
node --check src/app.js
node --check src/worker.js
node --check src/stochastic/stochastic-lab.js
unzip -t chilperic-ode-v2-4-7-app-plot-fixes.zip
```
