# Foko Lab v72.43.3 validation record

## Scope

Patch release for the single remaining v72.43.0 local browser failure: Optimization mobile mode widened a 390 px viewport to 428 px because the horizontal side-navigation tabs used visible overflow.

## Correction

- The mobile side-navigation strip is now width-bounded and internally scrollable.
- Navigation tabs remain full-size and horizontally accessible without widening the document.
- Added an offline Chromium contract at 390 × 844 that verifies Focus projection, document width, body width, and side-navigation containment.
- The local runner executes the exact Optimization mobile test five consecutive times before broader gates.

## Completed validation

- 101 JavaScript files passed syntax validation.
- One deterministic ODE engine boundary passed.
- 286/286 active Python contracts passed.
- Plot/control/computation audit passed for all 13 workspaces.
- 14/14 page quality audits passed.
- 13/13 plot lifecycle audits passed.
- Platform benchmark: 100/100.
- 32/32 independent differential reference checks passed.
- Navigation/Symbolic offline Chromium regression passed.
- Agent two-up and render-root offline Chromium regression passed.
- Shared plot, ODE, controls, Steady-State and Symbolic offline Chromium regression passed.
- Optimization/multi-objective/Steady-State taxonomy offline Chromium regression passed, including the 390 px mobile containment contract.
- Playwright inventory: 119 tests in 3 files.

## Managed-environment limitation

The managed Chromium environment blocks localhost navigation. Therefore the complete localhost Playwright suite is not claimed as passed here. The supplied local runner is the final browser gate and starts the server only after all tests pass.

## Local port

8095
