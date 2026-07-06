# V71.11 audit — ML descriptor shell and focused-lab noise cleanup

## Purpose
Port the ML Toolkit as the fifth descriptor-driven analysis lab while keeping all Focused Labs unchanged and removing migration/noise text from user-facing focused workspaces.

## Changes
- Added `src/labs/ml.js` as a descriptor around the existing `src/core/ml-lite.js` engine.
- Rewrote `ml.html` as a shared-shell page with preserved static contract IDs.
- Removed standalone route notices and oversized power-brief panels from ODE, Stochastic, Optimization and Steady-State.
- Kept Focused Labs as a separate top-level dropdown.
- Moved depth explanations to Docs and Tutorial rather than forcing them above the working controls.
- Bumped visible cache token to `71.11.0`.

## Non-changes
- No Focused Lab solver was changed.
- No standalone page was redirected or hidden.
- ODE, Stochastic, Optimization and Steady-State remain real pages.

## Risk
The ML descriptor could diverge from the previous ad-hoc ML page. The regression contract preserves the expected ML controls and modes while Node tests preserve the numeric core.

## Validation
`python3 -m pytest -q tests`

Node validation should include all existing JS numeric suites plus syntax checks for `src/labs/ml.js`.
