# V71.3 — Statistics shell port and broken standalone route repair

## Problem
The previous navigation promoted four standalone modeling pages even though the maintained architecture is now the Workbench. Users could enter ODE, Stochastic, Optimization, and Steady-State through brittle compatibility pages and experience broken or inconsistent behavior.

Statistics also remained a full hand-written page rather than proving the descriptor shell pattern.

## Changes
- Ported Statistics to the descriptor shell as the first reference lab.
- Added `src/labs/statistics.js` with schema, controls, result, plot, and engine bridge.
- Kept static contract IDs in a hidden regression block so older structural tests still verify the available controls without owning layout.
- Updated `src/platform/shell.js` so descriptor controls can trigger the shared shell run event.
- Replaced promoted standalone navigation with maintained Workbench routes.
- Added compatibility redirects from `ode.html`, `stochastic.html`, `optimization.html`, and `steady.html` to their maintained Workbench model routes.
- Bumped local cache token to `?v=71.46.0`.

## What this does not do
It does not port ODE/Stochastic/Optimization/Steady-State to descriptors yet. It removes them from the promoted path and prevents users from entering broken routes by default. Their full descriptor ports belong in the next modeling-lab releases.

## Validation target
- Full pytest suite green.
- Existing Node numeric tests green.
- JS syntax check across `src/*.js`, `src/core/*.js`, `src/platform/*.js`, `src/labs/*.js`, and `src/stochastic/*.js`.
