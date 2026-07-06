# V71.43 — Plot header overlap and lab hue repair

Scope: analysis cockpit only. No global chrome rewrite, no navigation rewrite, no scientific-engine rewrite.

## Fixes

- Plot titles no longer collide with plot and palette dropdowns.
- Plot headers now use a two-line grid:
  - row 1: panel title
  - row 2: plot selector, palette selector, expand button
- The duplicate visual label inside each `<label>` is hidden accessibly so it does not overlap with the visible panel title.
- `Lab identity` palette now applies real Plotly colours, not only UI accent borders.
- Heatmaps now receive a valid lab-identity colour scale.
- Scatter, bar, histogram, box and violin traces inherit the lab/module hue when `Lab identity` is selected.
- Functional controls such as download buttons and plot-card shadows pick up the lab hue softly.

## Preserved

- V71.42 Statistics scientific honesty.
- V71.40 lab hue mapping.
- Existing static header/nav.
- Focused ODE, Stochastic, Optimization and Steady-State labs.

## Limit

This is a cockpit rendering repair. It does not add new statistical methods or alter global chrome.
