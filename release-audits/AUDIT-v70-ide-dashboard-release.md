# Foko Lab v70 — IDE dashboard and navigation release

## Implemented

- Rebuilt the public header into a dark scientific IDE-style navigation bar.
- Removed the visible Legacy dropdown from the user-facing navigation.
- Kept Workbench as the modeling gateway: ODE, stochastic, optimization, steady-state, symbolic and agent labs.
- Moved SciML, Model Atlas, Documentation, Tutorial and About to direct top-level routes.
- Added a top-right profile avatar as the About entry point.
- Rebuilt the home page as a scientific modeling dashboard: workbench rail, code/model panel, parameter table and diagnostics/plot panel.
- Removed magenta color usage from visible interface palettes and shifted the brand to teal, dark teal and scientific blue.
- Replaced the old header logo with a dark-header-compatible scientific wordmark.

## UX rationale

The application now reads as a modeling platform rather than a personal landing page. The homepage previews the actual workflow: choose a modeling paradigm, inspect/edit a model, adjust parameters and review diagnostics before export.
