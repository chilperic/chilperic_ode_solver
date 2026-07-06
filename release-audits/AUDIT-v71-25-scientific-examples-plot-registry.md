# V71.27 — Scientific examples and plot registry for analysis labs

## Problem
The analysis labs had technically valid examples, but several were passive presets or too generic. A scientific user should be able to open a lab, choose a meaningful example, and immediately see a plot with a complementary diagnostic.

## Change
Statistics, Curve Fitting, Linear Algebra and Networks now each expose at least ten concrete scientific examples and at least ten plot modes. Each example loads real data, a matrix, or an edge list; the lab auto-runs; the shared shell renders a primary and a secondary plot.

## Scope kept intentionally narrow
No focused modeling lab was migrated or redirected. No ODE, Stochastic, Optimization or Steady-State solver was rewritten. This release only deepens the descriptor-driven analysis labs.

## Validation
- Structural pytest verifies ten examples and ten plots per lab.
- Registry loading is checked before descriptor execution.
- Existing Python and Node gates remain green.
