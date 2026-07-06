# Foko Lab v70.11 — Modeling-platform correction

## Diagnosis
The v70.10 release added useful analytical modules, but the product integration was poor. The Analysis dropdown exposed icons without visible labels because older CSS hid nested spans inside `.nav-menu .labs-menu-panel a span`. The public grouping also used the implementation language of tiers instead of the modeling workflow. ML was placed under model-output analysis even though it belongs conceptually under SciML.

## Corrections applied

### Navigation and visibility
- Rebuilt static navigation panels so the Workbench, SciML and Data / Model Analysis menus contain real menu content before JavaScript runs.
- Added `styles/v70-11-modeling-platform.css` to override the old span-hiding rule and force text labels, descriptions and active states to remain visible.
- Added a first-class `∞ Beauty` header route so Mathematical Beauty is discoverable from every page.
- Moved the ML Toolkit under SciML. Data / Model Analysis now contains Statistics, Curve fitting, Linear algebra and Networks only.
- Kept active-state coloring separate from hover/open states.

### Statistics Lab
Extended the Statistics Lab from a small demo into a more credible exploratory statistics workspace:
- data naming and variable labels
- missing-data policy: drop, zero-fill, mean-impute
- descriptive statistics
- correlation matrix
- OLS regression
- Welch t-test
- one-way ANOVA
- bootstrap mean confidence interval
- outlier detection
- A/B proportion test
- random simulation
- quality-control chart
- plot modes: scatter, line, bar, histogram, box, violin, heatmap, bubble, Pareto, residual
- reproducibility macro output

### Linear Algebra Lab
Extended the Linear Algebra Lab beyond matrix summary:
- solve Ax=b
- inverse
- dominant eigenpair
- least-squares solve
- projection
- Gram-Schmidt
- Markov steady state
- AᵀA
- plot modes: heatmap, vector arrows, transformation grid, eigenline, projection plot, least-squares line, Markov steady-state bar plot

### Tutorial templates
The tutorial now contains upload-ready minimal model structures by lab:
- ODE JSON
- CTMC/stochastic JSON
- optimization JSON
- steady-state residual JSON
- symbolic JSON
- agent-based model JSON
- SciML inverse/surrogate JSON
- statistics CSV
- curve fitting CSV
- linear algebra matrix/vector template
- graph edge-list CSV
- small-data ML table

### Logo
The logo and icon were cleaned again around a state-space / trajectory / node identity. No magenta is used. The mark is simpler and closer to a modeling platform than a toy app.

## What is still not solved
- The duplicated static header remains the deeper architectural debt. v70.11 reduces the damage by making the static nav content coherent, but the next real consolidation should generate or inject one shared header.
- The browser modules remain exploratory. Heavy ML, PINNs, UDEs, large sparse linear algebra, high-dimensional optimization, large ABM, and serious UQ still require exported Python/HPC workflows.

## Validation
- `python -m pytest -q tests` → 248 passed, 271 skipped
- `node tests/test_v70_9_numeric_cores_node.js` → ok
- `node tests/test_v70_11_numeric_cores_node.js` → ok
- `node --check src/*.js src/stochastic/*.js` → passed
