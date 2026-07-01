# v42 stability tests

Focused stabilization release built on v41.

## Fixed
- navigation.js: passive global mousemove listener to avoid scroll jank.
- navigation.js: avoid duplicate pointerenter/mouseenter menu-open handling on modern browsers.
- model-validator.js: block null models.
- model-validator.js: avoid stiff false positives from narrative text.
- model-validator.js: block delay call notation such as `x(t-tau)`.
- app.js: restore last saved ODE/optimization session on page load when no explicit `?example=` is provided.
- app.js: align session restore keys with existing save keys (`opt` → `optimization`, `param` → `ode`).
- app.js: use `window.FokoSession?.save?.(...)` so the app degrades safely if session storage script is unavailable.

## Verified
- `python3 -m pytest -q tests` → 328 passed.
- Syntax checks passed for navigation, app, symbolic, validator, session, agent, and agent worker JavaScript files.
