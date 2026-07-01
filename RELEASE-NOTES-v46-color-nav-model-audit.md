# Release notes v46 — color identity and Workbench/Model navigation cleanup

## Changed

- Replaced redundant Workbench dropdown entries with a compact gateway:
  - Workbench
  - Model
  - Model Atlas
- Kept the Legacy dropdown unchanged:
  - ODE
  - Optimization
  - Steady-State
  - Stochastic
- Added Symbolic and Agent under the Model section inside Workbench/Model pages.
- Added a shared teal / cyan / magenta identity layer across public pages, Workbench, Agent Lab and legacy pages.
- Removed noisy public-facing rationale about page separation and protected boundaries.
- Updated static tests for the new navigation contract.

## Verified

- Python static/test suite passes.
- JavaScript syntax checks pass for navigation, app, symbolic, validator, session, agent, worker, workbench, stochastic, optimization and steady-state modules.

## Remaining

- Convert Workbench into a pure dashboard and keep Model as the execution page to fully remove conceptual duplication.
