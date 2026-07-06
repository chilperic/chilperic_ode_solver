# V71.10 audit — Networks shell port and focused-lab navigation

## What changed

- Ported Network Lab as the fourth descriptor-driven analysis lab.
- Added `src/labs/networks.js`, keeping the scientific engine in `src/core/networks.js` unchanged.
- Rewrote `networks.html` as a shell-hosted descriptor page while preserving static regression IDs.
- Moved standalone ODE/Stochastic/Optimization/Steady-State links out of the Modeling dropdown into a separate `Focused Labs` dropdown.
- Removed the long standalone-lab explanation from the homepage. The homepage now has a compact focused-lab summary; details remain in Docs and Tutorial.
- Restored the creator card to a photo-first layout drawn from the stronger v70.21 identity version, removing the platform-mark overlay that covered the portrait.

## What was deliberately not changed

- No standalone modeling lab was redirected or descriptor-ported in this release.
- No ODE, stochastic, optimization or steady-state engine was modified.
- Network algorithms were not rewritten; only the page shell and descriptor wiring changed.

## Risk

- Main risk: duplicated static headers can drift again. This release adds a regression test requiring the separate `Focused Labs` dropdown across the major public and lab pages.
- Network Lab remains browser-scale: suitable for small/medium graphs, not million-edge production networks.

## Validation

- Pytest suite passed.
- Node engine tests passed.
- JavaScript syntax checks passed for `src/*.js`, `src/core/*.js`, `src/platform/*.js`, `src/labs/*.js`, and `src/stochastic/*.js`.
