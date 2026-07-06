# V71.23 — Plottable analysis examples

## Problem
The analysis labs listed examples, but the user experience still implied that examples were textual presets rather than plotted, visible workflows. A scientific user should select an example and immediately see data, result, and plot.

## Change
Statistics, Curve Fitting, Linear Algebra, and Networks now label their selector as `Plottable example`, auto-run the selected example on page load, and re-run automatically when the example changes. Each example loads actual input data and renders the corresponding Plotly diagnostic.

## Scope
No scientific engines were rewritten. No focused lab was migrated or redirected. The change is limited to descriptor-lab controls, docs/tutorial wording, and a small CSS microcopy rule.

## Validation
Static tests assert the four analysis descriptors contain plottable example selectors, auto-run helper code, preset-change run dispatch, and the minimum example/plot coverage contracts.
