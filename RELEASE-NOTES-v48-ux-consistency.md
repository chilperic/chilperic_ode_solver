# Release notes v48 — UX consistency pass

## Changed

- Removed public-facing internal rationale/noise from Research, Docs, Tutorial, Platform, Contact and Home.
- Standardized clickable CTA colors around teal/cyan/magenta identity.
- Kept non-clickable chips neutral to improve affordance.
- Tightened Docs/Tutorial/Platform hero proportions and fixed visible border/overflow issues.
- Hid lower homepage panels that created scroll without adding decision value.
- Preserved Workbench dropdown as Model / Symbolic / Agent / Model Atlas.
- Preserved Legacy dropdown as ODE / Optimization / Steady-State / Stochastic.
- Updated Workbench CSS for selector containment, action consistency and overflow control.
- Added v48 regression tests for public-copy noise, Workbench/Legacy menu contract and color/action tokens.

## Tests

- `326 passed`
- JavaScript syntax checks passed for navigation, app, symbolic, validator, session, agent, agent worker, model workbench, stochastic, optimization and steady-state scripts.
