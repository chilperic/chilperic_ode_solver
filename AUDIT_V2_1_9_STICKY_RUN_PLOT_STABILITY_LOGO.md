# Chilperic ODE v2.1.9 — Sticky Run, Plot Stability, Logo Refresh

## Scope
This release focuses on three high-friction issues reported after v2.1.8:

1. The Run action was too low in the left panel and required scrolling.
2. Chrome could show blank plot panels even when the exported image contained the correct plot.
3. The visual identity/logo did not yet match the intended scientific personality of the project.

## Changes

### Run accessibility
The action bar is now positioned immediately after the introductory card and made sticky on desktop layouts. This keeps Run / Sweep / Cancel visible while the user edits equations, parameters, and initial conditions.

### Plot stability
The plot renderer no longer relies on Plotly.react() across model switches. Before each plot draw, it now purges and recreates the plot node, then calls Plotly.newPlot(). Multiple resize/visibility passes are scheduled after rendering. This directly targets the Chrome-specific issue where the Plotly data existed but the displayed SVG/canvas was invisible.

### Logo
The logo was redesigned as an SVG combining:
- phase-space orbit lines,
- molecular/metabolic nodes,
- a rising trajectory/polyline,
- the Chilperic ODE wordmark,
- a scientific subtitle.

## Boundary
This patch does not add new model classes. It stabilizes interaction and presentation.
