# V71.7 legacy standalone layout repair

## Problem
The V71.6 preservation release kept the standalone pages but did not repair their layout drift. On `stochastic.html`, and by the same shell pattern on `optimization.html` and `steady.html`, the result/export area could collapse into a narrow left column after scrolling or running a model. The page was technically present but not usable.

## Cause
The preserved pages still used the old three-column `.lab-mirror-layout` plus later CSS layers from the platform redesign. Several responsive overrides competed for ownership of `.workspace`, `.side-nav`, `.chart-grid`, `.plot-toolbar-v2`, and `.exports-card`. The result was a layout fatigue crack: controls and results existed, but the right result column could collapse or be displaced.

## Repair
V71.7 adds a scoped CSS repair only for:

- `body[data-lab="stochastic"]`
- `body[data-lab="optimization"]`
- `body[data-lab="steady"]`

The fix:

- hides the fragile side rail on these standalone pages;
- forces a stable two-column layout: controls left, results right;
- stacks the layout below 1180px;
- keeps result cards, plots, toolbars and export panels at full available width;
- removes the confusing compatibility warning and replaces it with a neutral standalone notice.

## What was not changed
The numerical engines and lab JavaScript were not rewritten. This is a layout preservation repair, not a descriptor migration.

## Regression risk
Low. The override is scoped to three standalone pages and does not affect Statistics, Linear Algebra, Workbench, Model Atlas, or the homepage.
