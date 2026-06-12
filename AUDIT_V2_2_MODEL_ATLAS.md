# Chilperic ODE v2.2.0 — Model Atlas and plot-stability pass

## Scope
This pass converts the example guide into a visual Model Atlas and hardens the plot renderer against disappearing Plotly panels during model switches.

## Changes
- Added a dedicated visual Model Atlas (`examples.html`) with hand-designed SVG schematics for the main models.
- Added model cards with author/inspiration, model type, variables, and a suggested exploration.
- Added filter chips: Biology, Physics, Chemistry, Optimization, Paradoxes, Your research, Teaching.
- Added Open in workbench links using `index.html?module=...&example=...`.
- Added URL parameter loading to the workbench.
- Replaced static plot ResizeObserver wiring with dynamic observer reattachment after each plot node recreation.
- Removed the repeated long timeout cascade after plot rendering; retained a bounded immediate/RAF/short-delay visibility pass.
- Added render sequence guards so stale asynchronous Plotly callbacks cannot mutate a newer plot.
- Hardened SBML import against unsupported piecewise MathML by failing loudly instead of silently producing wrong equations.
- Added visible warnings for unsupported SBML features such as rules, events, function definitions, and compartment simplifications.
- Updated docs and navigation naming from Examples to Model Atlas.

## Validation
- `node --check src/app.js`
- `node --check src/worker.js`
- DOM wiring check: 99 `$('<id>')` references, 0 missing IDs.
- Model Atlas card count: 17 cards.

## Boundary
The schematics are curated explanatory diagrams, not automatic equation renderings. This is intentional: automatic extraction from arbitrary ODEs/SBML often produces noisy diagrams. The workbench remains the place for equations and numerical configuration.
