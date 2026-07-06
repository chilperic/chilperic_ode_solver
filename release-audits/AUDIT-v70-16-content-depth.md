# AUDIT v70.16 — content-depth pass for analysis and ML labs

## Goal

The previous release improved structure, but several labs still risked feeling like decorated demos rather than modeling tools. This pass focuses on depth, interpretability, and lab-specific templates.

## What changed

### Statistics Lab

Added richer visualization depth:

- Histogram with KDE overlay.
- Scatter plot matrix / SPLOM for multivariable structure.
- Existing inference core retained: t-tests, ANOVA, chi-square, non-parametric tests, regression, bootstrap, A/B testing, SPC.

### ML Toolkit

Expanded diagnostic coverage:

- Logistic regression now records training loss.
- Added precision-recall curve support.
- Added k-means silhouette diagnostics.
- Added k-means elbow curve.
- Added UI plot modes: precision-recall, loss, elbow, silhouette.

This keeps ML under SciML, where it belongs, but makes it less toy-like.

### Curve Fitting Lab

Rebuilt the fitting layer as a better model-calibration bridge:

- Added cubic polynomial model.
- Added Michaelis-Menten model for biological saturation examples.
- Added AIC and BIC for model comparison.
- Added residuals, residual plot and residual Q-Q plot.
- Added parameter summaries for fitted coefficients.

### Linear Algebra / Network / Tutorial / Docs

- Linear Algebra already had the v70.15 reframing, preserved here.
- Network Lab keeps connectivity, shortest path, centrality, PageRank, adjacency heatmap and Sankey flow.
- Tutorial now contains minimal upload-ready schemas by lab.
- Documentation now explicitly separates what is browser-feasible, what needs a heavier browser engine, and what requires external compute.

## What is still not solved

### Statistics

Still not a full R/JASP/SPSS replacement. Missing: survival analysis, mixed-effects models, Bayesian workflows, power analysis and robust publication pipelines.

### ML

Still not a full ML platform. Missing: trees/forests, SVMs, hyperparameter search, calibration curves, SHAP, real model persistence, ONNX/WebGPU inference and deep learning.

### Fitting

Still not publication-grade calibration for stiff ODE models. Missing: weighted residuals, parameter bounds, profile likelihood, bootstrap parameter intervals, ODE-constrained fitting and global optimization.

### Architecture

The main systemic debt remains duplicated static headers and version-token drift. A real platform should have one route registry, one nav renderer and one release token.

## Validation

```bash
python3 -m pytest -q tests
# 259 passed, 271 skipped

node tests/test_v70_9_numeric_cores_node.js
# v70.9 numeric cores: ok

node tests/test_v70_11_numeric_cores_node.js
# v70.11 numeric cores: ok

node tests/test_v70_16_numeric_depth_node.js
# v70.16 numeric depth: ok

for f in src/*.js src/stochastic/*.js; do
  [ -f "$f" ] && node --check "$f"
done
# passed
```
