# Foko Lab v70.7 Unified Strengths Audit

## Objective
Unify the strengths of three branches without treating any branch as automatically correct:

- v70.6 interface rationalization: latest optimization controls, SciML controls, cache-token discipline, reduced slogans, improved homepage restraint.
- v70.5 home/navigation correction: real product landing page, clear start routes, visible Workbench/Standalone split.
- legacy ODE solver branch: preserved full classic labs, curated model atlas assets, research examples, mature standalone ODE/Stochastic/Optimization/Steady-State workflows.

## Diagnosis
The three branches are not three alternatives with equal scope. v70.6 is the functional base. v70.5 contains the better product-entry logic. The legacy branch is mainly a preservation/reference baseline for mature solver workflows and assets. The right merge is therefore:

1. Use v70.6 as the base.
2. Keep the v70.5 product-home structure, but reduce the oversized hero ratio.
3. Preserve standalone/classic labs from the legacy line under “Standalone labs”, not “legacy”.
4. Normalize the Workbench dropdown from JavaScript so copied stale HTML cannot hide menu items again.
5. Add a final CSS layer for visual-state discipline, theme selector neutrality, and SciML diagnostic toolbar cleanup.

## Applied corrections

### Home
- Replaced poster-scale hero proportions with a smaller landing-page ratio.
- Kept three useful entry routes: Workbench, SIR example, Model Atlas.
- Kept the creator block but reduced its dominance.
- Kept research provenance below the start flow rather than making it interrupt the first action.

### Navigation
- Added `normalizeWorkbenchMenuPanel()` in `src/navigation.js`.
- The Workbench menu content is now regenerated from one source at runtime.
- The menu uses two clear groups: Workbench and Standalone labs.
- Hover/open/selected states are separated.

### Theme selector
- Reduced visual weight so it no longer reads as a selected navigation tab.
- Preserved all theme options.

### SciML diagnostics
- Removed the duplicated “Diagnostic view / Trajectory / Plot” title stack.
- Plot selection now behaves as a single toolbar directly above the plot.

### Preservation from legacy
- Standalone ODE, Stochastic, Optimization, and Steady-State pages remain accessible.
- Research examples and model atlas assets remain intact.
- Existing numerical engines were not stripped or redesigned cosmetically.

## Tests
- Python tests: 224 passed, 271 skipped.
- Node syntax checks: all `src/*.js` and `src/stochastic/*.js` passed.

## Remaining hard problem
The true architectural correction remains a generated/injected header and footer for all static pages. v70.7 reduces duplicated-menu damage by normalizing the Workbench panel at runtime, but it does not yet replace all copied headers with one build-time template.
