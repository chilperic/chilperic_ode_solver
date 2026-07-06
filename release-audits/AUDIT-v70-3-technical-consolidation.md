# Foko Lab v70.4 Technical Consolidation Audit

## Summary
v70.2 improved the visual direction, but the platform still had technical inconsistencies: weak dark-theme documentation contrast, stacked plot controls in classic diagnostic views, stale release tokens, and Workbench optimization controls that did not expose enough scientific setup. v70.4 is a consolidation release, not a feature-expansion release.

## Fixed in v70.4

### 1. Documentation contrast and readability
- Reworked the documentation and tutorial pages around the Workbench-first scientific workflow.
- Added dark-theme contrast hardening for documentation cards, hero blocks, tables, lists and links.
- Removed low-contrast panel behavior visible in dark modes.

### 2. Workbench optimization authoring
Optimization models now expose the minimum controls expected by a modeler:
- method family,
- projected gradient / gradient descent / Adam-style descent,
- coordinate descent / multi-start local search,
- simulated annealing / particle swarm / genetic algorithm,
- population or number of starts,
- tolerance,
- seed,
- initial guesses for x and y,
- editable x/y bounds,
- parameter values,
- parameter min/max ranges.

The browser implementation remains exploratory; export is still required for publication-grade or large-scale optimization.

### 3. Plot-toolbar and diagnostic layout hygiene
- Plot controls are forced into a stable horizontal grid above plots where space allows.
- Plot titles no longer stack vertically or collide with dropdown controls.
- Mobile behavior falls back to one-column controls.

### 4. Version-token cleanup
- Local HTML references now use `?v=71.46.0` consistently for release-controlled assets.
- Legacy tests were updated to match the v70.4 release contract.

### 5. Developer-facing UI noise
- Removed the visible `Model workbench RC ready` toast from the Workbench.
- Documentation now distinguishes exploratory browser runs from rigorous external validation.

## Remaining technical weaknesses

### A. Navigation is still duplicated in static HTML
The header markup remains duplicated across top-level pages. The next architecture pass should move navigation into a single injected source or a build-time template.

### B. CSS is still too large and override-heavy
The stylesheet still contains historical layers and too many `!important` rules. v70.4 adds targeted stabilization; it does not fully split the design system into base, components, labs and theme files.

### C. Custom model import is still incomplete
Workbench import is strongest for ODE and 2D optimization. CTMC, steady-state, symbolic and agent authoring still need a unified import contract.

### D. Skipped tests remain high
The suite now passes, but 271 tests remain skipped. These should not be ignored indefinitely; they need replacement v70 contracts or deletion with rationale.

## Validation

```bash
python3 -m pytest -q tests
# 205 passed, 271 skipped

for f in src/*.js src/stochastic/*.js; do
  node --check "$f"
done
# all passed
```
