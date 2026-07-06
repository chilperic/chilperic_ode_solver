# Foko Lab v70.10 — Modeling-logic interface correction

## Objective diagnosis
v70.9 added the requested analysis tools, but the product logic was wrong: the UI exposed implementation tiers, the Data/Analysis menu had unreadable/hidden links under the current theme stack, and the new analysis pages looked like raw forms rather than first-class labs. Mathematical Beauty was technically present, but still not visible enough in the first route flow. The tutorial also described workflows without giving concrete lab templates.

## Applied corrections

### Navigation and active state
- Renamed the dropdown from generic `Analysis`/tier framing to **Data & Analysis**.
- Replaced public labels `Tier 1 analysis` and `Tier 2 browser-scale ML` with:
  - **Model output analysis**
  - **Machine-learning diagnostics**
- Added robust menu CSS for `.analysis-menu-panel`, matching the Workbench menu grammar.
- Added active link highlighting inside Workbench/Data & Analysis dropdowns.
- Separated selected page, open menu, and hover states.

### Analysis tools
- Restyled Statistics, Curve Fitting, Linear Algebra, Networks and ML Toolkit as product-level analysis pages.
- Added `styles/v70-10-modeling-logic.css` and also appended its rules into the final v70.7 stylesheet layer so older stylesheet-order contracts remain green.
- Expanded Statistics with additional modes:
  - descriptive statistics
  - correlation matrix
  - OLS regression
  - Welch t-test
  - one-way ANOVA
  - bootstrap mean confidence interval

### Mathematical Beauty
- Added Mathematical Beauty to the hero action row.
- Added Mathematical Beauty to the “Choose how to begin” route grid.
- Kept Mathematical Beauty in the modeling-approach card grid and footer.

### Tutorial
- Added concrete templates for each lab family:
  - ODE
  - Stochastic
  - Optimization
  - Steady-State
  - Symbolic
  - Agent
  - SciML
  - Statistics
  - Fitting
  - Linear algebra
  - Networks
  - ML Toolkit

### Logo
- Reworked the mark and full logo into a cleaner scientific identity: state-space hexagon, trajectory curve, model nodes, teal/blue palette, no magenta.
- Regenerated favicon/app icon files.

## Still possible in-browser
- Better statistics: more tests, confidence intervals, residual diagnostics, bootstrap/permutation.
- Better fitting: parameter bounds, confidence intervals from Jacobian, AIC/BIC, residual plots.
- Better linear algebra: QR, SVD approximation, PCA, condition number.
- Better networks: weighted shortest paths, modularity heuristics, network import/export.
- Better ML: small-data classifiers/regressors, train/test diagnostics, clustering validation.

## Not realistic browser-native without export/backend
- Heavy PDE simulation.
- Large sparse eigensolvers.
- Large MCMC or probabilistic programming.
- Production deep learning / GPU workflows.
- Secure LLM API integration without a backend.
- Million-agent ABM or massive stochastic ensembles.

## Validation
```bash
python3 -m pytest -q tests
# 242 passed, 271 skipped

node tests/test_v70_9_numeric_cores_node.js
# v70.9 numeric cores: ok

for f in src/*.js src/stochastic/*.js; do
  [ -f "$f" ] && node --check "$f"
done
# passed
```
