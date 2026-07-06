# V71.21 — Web Worker compute bus consolidation

## What changed

This release adds a shared compute bus at `src/platform/compute-bus.js`. The bus centralizes worker creation, progress forwarding, cancellation, timeout cleanup and future descriptor-shell dispatch.

## Why this was needed

Before this release, ODE, Optimization, Agent rules and earlier V71 helpers created Web Workers independently. That made progress, cancel and crash handling drift between labs. The bus introduces one platform-level execution API without rewriting the science engines.

## Scope

Implemented now:

- `window.FokoComputeBus.run(job)`
- `window.FokoComputeBus.cancel(id)`
- `window.FokoComputeBus.createLegacyHandle(...)`
- `window.FokoComputeBus.platformRun(...)`
- ODE / Parametric ODE worker calls routed through the bus-compatible handle.
- Optimization worker calls routed through the bus-compatible handle.
- All pages load the bus for future shell integration.

Not implemented in this release:

- Full migration of Stochastic, Steady-State, Agent and SciML execution to the bus.
- Worker-side chunk streaming for every plot.
- Descriptor migration of Focused Labs.

## Regression risks

The main risk was breaking the existing `src/worker.js` protocol. This was avoided by implementing a legacy handle that presents the same `postMessage`, `onmessage`, `onerror`, and `terminate` surface used by existing pages.

## Validation

- Full pytest suite.
- Existing Node engine tests.
- JavaScript syntax checks for `src/platform/compute-bus.js` and all existing source files.
