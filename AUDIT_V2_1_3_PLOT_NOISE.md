# Chilperic ODE v2.1.3 — plot-noise audit and patch

## Problem observed

Chrome displayed stale helper text and old plot-warning text directly on top of active Plotly figures after switching plot types. The most visible case was the trajectory matrix showing "Run a model to plot results" over real data and the vector-field panel retaining an unrelated 3D phase portrait warning.

## Root cause

The plot container kept fallback HTML from previous states while `Plotly.react()` drew into the same element. Firefox tolerated the transition better; Chrome visually preserved stale text in some cases.

## Changes

- Clear each plot container before calling `Plotly.react()`.
- Replace vector-field rendering with explicit line-segment arrows, including visible arrowheads.
- Reduce vector-field density from 12 x 12 to 8 x 8 to remove visual clutter.
- Remove annotation-based vector arrows because they rendered inconsistently across browsers.
- Simplify trajectory matrix for two-variable systems: it now renders a clean phase portrait instead of a noisy 2 x 2 pair grid.
- Reduce trajectory-matrix colorbar thickness and marker size for higher-dimensional systems.
- Bumped cache-busting query strings to v2.1.3.

## Status

This patch targets plot readability and Chrome rendering consistency without changing solver logic.
