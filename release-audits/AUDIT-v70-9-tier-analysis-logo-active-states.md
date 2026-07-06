# Foko Lab v70.9 — Tier analysis, logo redesign, active-state correction

## Objective
Unify the strongest v70.8 platform state with browser-native Tier 1 and Tier 2 analysis tools, while fixing three product-level issues:

1. Mathematical Beauty must remain visible from the home body.
2. Current-page and selected controls must be visibly distinguishable from hover/open states.
3. The logo must fit the scientific modeling platform better than a decorative personal mark.

## Implemented Tier 1 modules

### Statistics Lab — `statistics.html`, `src/statistics.js`
Browser-native descriptive statistics, correlation, OLS regression, Welch t-test and diagnostic plots. This is intended for model outputs, small experimental tables and quick residual checks.

### Curve Fitting Lab — `fitting.html`, `src/fitting.js`
Linear, quadratic, exponential and logistic fitting with RMSE, SSE and R². This is the bridge between raw data and model calibration.

### Linear Algebra Lab — `linear-algebra.html`, `src/linalg.js`
Matrix parsing, determinant, trace, Ax=b solving, AᵀA and dominant eigenpair by power iteration. It is suitable for small/medium dense matrices in browser.

### Graph and Network Lab — `networks.html`, `src/networks.js`
Edge-list parsing, degree, components, BFS distances, PageRank and a simple Plotly network layout. This supports interaction graphs and agent/network model diagnostics.

## Implemented Tier 2 module

### ML Toolkit — `ml.html`, `src/ml-lite.js`
Browser-scale machine-learning diagnostics: k-means, PCA and train/test linear baseline. This is explicitly not a deep-learning/HPC replacement.

## Logo redesign
The mark and wordmark were replaced with a cleaner scientific modeling identity:

- hexagon retained for brand continuity;
- phase-curve / trajectory motif for dynamical systems;
- node-line structure for model states and inference;
- teal/blue only, no magenta;
- PNG favicons regenerated to match the SVG mark.

Changed assets:

- `assets/brand/foko-lab-mark.svg`
- `assets/brand/foko-lab-logo.svg`
- `assets/brand/foko-lab-icon-512.png`
- `assets/brand/apple-touch-icon.png`
- `assets/brand/favicon-32.png`
- `assets/brand/favicon-16.png`
- `favicon.ico`

## Navigation and active-state correction

A new Analysis dropdown was added to the primary navigation and injected consistently across top-level and research pages. It contains Tier 1 and Tier 2 tools.

Active/current-page states were strengthened so the user can distinguish:

- current page / active dropdown;
- hover state;
- merely open dropdown;
- ordinary clickable button.

This is implemented in `styles/v70-7-unified.css` to preserve the existing stylesheet ordering contracts.

## Mathematical Beauty
The home page still exposes `beauty.html` as a visible modeling/exploration card. Its card receives a subtle teal highlight so it is less likely to disappear visually among the platform cards.

If a deployed GitHub Pages version still does not show it, the likely cause is cached HTML/CSS. A hard refresh or cache-busted redeployment is required.

## Tests added

- `tests/test_v70_9_analysis_modules.py`
- `tests/test_v70_9_numeric_cores_node.js`

## Validation

```bash
python3 -m pytest -q tests
# 235 passed, 271 skipped

node tests/test_v70_9_numeric_cores_node.js
# v70.9 numeric cores: ok

for f in src/*.js src/stochastic/*.js; do
  [ -f "$f" ] && node --check "$f"
done
# all passed
```

## Remaining limits

The Tier 2 ML module is intentionally browser-scale. It does not claim to replace PyTorch, JAX, Julia SciML, scikit-learn or HPC workflows. Heavy deep learning, large sparse eigensolvers, large MCMC, high-dimensional PDE solving and secure LLM/API integrations require exported workflows or a backend.
