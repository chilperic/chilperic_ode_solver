# Chilperic ODE v2.1.8 — Plot/theme stability audit

## Problem
Chrome could keep Plotly graph containers visually blank even when `downloadImage()` exported a correct image. This indicates a rendering/layout synchronization issue, not missing numerical data.

## Fixes
- Added a `drawPlot()` wrapper around all Plotly rendering.
- Forces plot height and minimum height before drawing.
- Calls `Plotly.Plots.resize()` after render using `requestAnimationFrame` and delayed retries.
- Adds CSS hardening for Plotly SVG/canvas containers in Chrome.
- Keeps plot export dimensions independent from display dimensions.
- Expanded themes from 4 to 8 and softened the default background/panel contrast.
- Updated SBML upload microcopy with BioModels/BiGG guidance.

## Boundary
SBML import remains a lightweight browser converter, not libSBML. Heavy/high-dimensional SBML models should be reduced or exported to Python for serious simulation.
