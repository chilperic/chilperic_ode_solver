# V71.24 — Analysis workspace two-plot repair

## Problem
The descriptor-driven analysis pages still displayed user-facing scope-limit text such as "What is feasible in-browser" and "What still belongs outside the browser." That text is useful for internal audit documentation, but it is noise in the working interface. It also occupied exactly the area that should be used for plots and immediate examples.

The shared shell CSS was also not loaded by the descriptor pages, which made the shell action buttons look like unstyled browser defaults on some pages.

## Changes
- Removed feasibility / outside-browser note grids from Statistics, Curve Fitting, Linear Algebra, Networks, and ML pages.
- Added `src/platform/shell.css` to descriptor-driven analysis pages.
- Updated the shared shell to render two plot surfaces:
  - primary plot: selected diagnostic;
  - secondary plot: complementary diagnostic chosen by the lab descriptor.
- Added `PlotSecondary` support to:
  - Statistics;
  - Curve Fitting;
  - Linear Algebra;
  - Networks;
  - ML Toolkit.
- Kept examples plottable and auto-running on load or example change.
- Kept all focused modeling labs unchanged.
- Normalized cache token to `?v=71.46.0`.

## Risk
The change touches the shared descriptor shell and all analysis descriptors. Regression risk is layout-related rather than numerical. The scientific engines are unchanged.

## Validation
- `python3 -m pytest -q tests` → 372 passed, 271 skipped.
- Node numeric suites passed.
- JavaScript syntax checks passed.
