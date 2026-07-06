# V71.27 — Concrete analysis scenarios and twelve-plot registry

## Purpose
Replace generic analysis examples with concrete scientific/business scenarios and expand the analysis plot registry to twelve plot types per lab.

## Scope
- Statistics, Curve Fitting, Linear Algebra, Networks.
- User-facing labels only; no focused-lab structural migration.
- Preserve ready-to-run examples and two-plot workspace from V71.24/V71.25.

## Changes
- `src/analysis-plot-registry.js` now stores concrete scenario metadata for ten examples per lab.
- Each of the four analysis labs exposes at least twelve plot modes.
- Removed remaining visible “proxy” wording from plot labels where possible.
- Added additional plot aliases: violin/control/statistical bands; component-plus-residual and prediction-envelope fitting plots; SVD variance and power-iteration traces; ego network and Sankey views.

## Limits
Some advanced diagnostics remain lightweight browser implementations. The UI now names the scientific workflow clearly, but full production-grade methods such as full bootstrap profile likelihood, Louvain/Leiden, and large sparse network analytics still need deeper engine work.
