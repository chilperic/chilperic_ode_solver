# V71.12 — ODE data overlay and fitting bridge hooks

## Purpose

Improve the focused ODE / Parametric ODE lab without changing its legacy standalone structure. This release also removes the homepage Mathematical Beauty click-sign treatment, which made one route look different from the others.

## Changes

- Removed public-facing Mathematical Beauty callout signs from the homepage.
- Added compact observed-data overlay controls to `ode.html`.
- Added CSV/TSV/semicolon time-series parsing in `src/app.js`.
- Added observation marker overlays on trajectory and phase plots when columns match model variables.
- Added first fitting-bridge hook that prepares and exports a JSON configuration for parameter-fitting workflows.
- Compact CSS pass for ODE plot/export controls so the workspace is not pushed down.

## Non-changes

- No redirect was added.
- No Focused Lab was descriptor-ported.
- ODE, Stochastic, Optimization and Steady-State standalone pages remain standalone pages.
- Numerical solvers were not changed.

## Risk

Low-to-moderate. The new overlay code is optional and guarded by DOM checks. If no observed data is loaded, plots behave as before.
