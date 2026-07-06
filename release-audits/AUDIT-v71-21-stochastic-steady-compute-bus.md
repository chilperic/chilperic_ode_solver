# V71.21 — Stochastic and Steady-State compute-bus migration

## Scope
This release migrates the preserved focused Stochastic and Steady-State labs onto the shared compute-bus lifecycle without descriptor-migrating them and without changing their scientific engines.

## What changed
- Added `FokoComputeBus.runLocal(...)` for preserved legacy labs whose scientific engines currently live in page scripts rather than worker modules.
- Extended compute-bus cancellation to understand local bus records.
- Routed Stochastic `Run ensemble` through a bus job named `stochastic-ensemble`.
- Routed Steady-State solve, 1-parameter continuation, and 2-parameter continuation through bus jobs named `steady-solve`, `steady-continuation`, and `steady-continuation-2d`.
- Preserved all existing stochastic algorithms, including Gillespie, tau-leaping, Euler-Maruyama, ensemble ribbons, and diagnostics.
- Preserved Steady-State Hopf/fold screening and 2D continuation map behavior.

## Why this is not a full worker migration
The stochastic and steady-state focused labs still contain substantial browser-page engines. Moving those engines into a true worker module is possible, but it is a larger extraction. This release creates the shared progress/cancel/error lifecycle first, so the later worker extraction has a stable interface.

## Regression risks
- A bad migration could freeze the run buttons in a disabled state.
- Continuation text could fail after asynchronous completion.
- Stochastic plotting could lose the active result object.

## Validation
- Pytest suite passes.
- Node syntax checks pass for platform, stochastic, and steady-state scripts.
- New tests assert compute-bus routing for both labs.
