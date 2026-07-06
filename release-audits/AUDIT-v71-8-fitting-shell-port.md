# AUDIT v71.8 — Curve Fitting descriptor-shell port

## Reason
The shell migration should continue through analysis labs without touching preserved standalone modeling pages. After Statistics and Linear Algebra, Curve Fitting is the next safe reference lab because it is the bridge toward ODE/data calibration.

## Changes
- Added `src/labs/fitting.js` as a descriptor-driven Curve Fitting Lab.
- Rewrote `fitting.html` as a shell-hosted page with static hidden contract IDs for older regression tests.
- Kept the scientific core in `src/core/fitting.js` unchanged.
- Kept compatibility `src/fitting.js` unchanged for older tests and external references.
- Preserved standalone ODE, Stochastic, Optimization and Steady-State pages.
- Normalized cache token to `?v=71.46.0`.

## What must not regress
- `ode.html`, `stochastic.html`, `optimization.html`, and `steady.html` must remain real pages, not redirects.
- Statistics and Linear Algebra must remain descriptor-shell labs.
- Fitting must preserve the existing control IDs: `fitPreset`, `fitModel`, `fitPlotMode`, `fitData`, `fitRun`, `fitOutput`, `fitPlot`.

## Limits
This is a shell migration, not the full dynamical fitting bridge. It does not yet fit arbitrary ODE trajectories to experimental data with confidence intervals. That remains a separate science-depth release.
