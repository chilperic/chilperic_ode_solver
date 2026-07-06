# V71.17 — Analysis examples and plot coverage

## Purpose
The descriptor-driven analysis pages were structurally correct but still looked thin: users could not immediately see enough examples or plot options. The release adds explicit plot and example coverage to Statistics, Curve Fitting, Linear Algebra and Networks.

## Changes
- Statistics: eight example datasets in the selector and more than eight plot modes.
- Curve Fitting: eight example datasets and nine plot modes.
- Linear Algebra: eight examples and nine plot modes.
- Networks: eight examples and ten plot modes.
- Docs/Tutorial now document the examples and plots without exposing implementation internals.

## Non-goals
No Focused Lab structure changes. No solver changes. No descriptor migration of Workbench.

## Risk
Dropdown expansion can break page contracts if IDs change. Regression tests preserve IDs and count example/plot options.
