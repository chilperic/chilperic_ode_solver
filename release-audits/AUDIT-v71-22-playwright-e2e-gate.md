# V71.22 — Playwright end-to-end deploy gate

## Purpose

Add a browser-level deployment gate so regressions that static pytest cannot see are caught before release: pages loading, buttons visible, focused labs preserved, descriptor labs usable, and reproducibility controls present.

## What changed

- Added `package.json` with `@playwright/test` and `npm run test:e2e`.
- Added `playwright.config.js` with a static web server on port 8010.
- Added `tests/e2e/main-labs-smoke.spec.js`.
- Added pytest structural checks in `tests/test_v71_22_playwright_gate.py`.
- Normalized cache token to `?v=71.46.0`.

## Covered browser workflows

- Home page route families load.
- Mathematical Beauty is visible without relying on a pre-selected card state.
- ODE focused lab loads and exposes a run surface.
- Stochastic focused lab exposes Gillespie, tau-leaping, and Euler-Maruyama methods.
- Steady-State focused lab exposes continuation and 2D map controls.
- Optimization focused lab loads without collapsing layout.
- Statistics, Fitting, Linear Algebra, Networks, and ML descriptor labs expose run controls.
- Reproducibility controls appear on representative focused and descriptor labs.

## Risk

The Playwright files are new and do not change scientific engines. The main risk is dependency availability: browser execution requires `npm install` and `npx playwright install chromium` on a development or CI machine. The structural pytest gate still verifies that the browser gate is present and covers the intended workflows.

## Validation

- `python3 -m pytest -q tests`
- Node engine tests
- `node --check` over JavaScript files
- Optional browser gate: `npm install && npx playwright install chromium && npm run test:e2e`
