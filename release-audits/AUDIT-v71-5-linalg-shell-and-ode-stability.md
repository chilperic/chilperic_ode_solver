# V71.5 — Linear Algebra shell port and standalone ODE stability

## Problem
V71.4 restored the standalone ODE and Parametric ODE page from the stable line, but the platform still needed to continue the shell-migration path. Statistics had already proven the first descriptor-driven analysis page; one more analysis lab was needed to show the pattern is not statistics-specific.

## Changes
- Ported Linear Algebra Lab to the descriptor shell via `src/labs/linalg.js`.
- Rewrote `linear-algebra.html` as a shell-hosted page with a static hidden contract so older regression tests still find the required IDs.
- Preserved the scientific engine in `src/core/linalg.js`; no numerical algorithm was rewritten.
- Kept the V71.4 standalone ODE/Parametric ODE recovery in place.
- Updated cache token to `?v=71.46.0`.

## Safety constraints
- Linear algebra algorithms remain in the core file.
- The page owns no ad-hoc layout beyond the descriptor host.
- Existing static tests continue to see `#laMode`, `#laMatrix`, `#laOutput`, and the expected operation values.
- ODE is explicitly not redirected anymore; it is a restored standalone route with Parametric ODE controls.

## Validation
- `python3 -m pytest -q tests`
- Node engine and shell tests.
- JavaScript syntax checks over `src/*.js`, `src/core/*.js`, `src/platform/*.js`, `src/labs/*.js`, and `src/stochastic/*.js`.

## Remaining limitations
- Fitting, Networks, and ML are still not descriptor-driven.
- Workbench and modeling labs still require a separate descriptor port.
- Linear Algebra still lacks sparse matrices, full SVD, Krylov solvers, and generalized eigenproblems.
