# AUDIT v70.17 — consistency depth and logo correction

## Critical finding

The Data / Analysis and SciML additions were no longer empty, but they were still unbalanced relative to the rest of the modeling platform. The Workbench, ODE, stochastic, optimization and symbolic areas have a clearer modeling grammar: choose a model, adjust controls, inspect diagnostics, export. The newer Statistics / ML / Graph / Linear Algebra modules still felt like isolated calculators.

The correction target is therefore not "more buttons." The target is a consistent computational depth standard:

1. every module must expose a real mathematical object,
2. every module must have meaningful diagnostics,
3. every module must state the browser boundary,
4. every module must use the same model → compute → diagnose → export logic.

## Logo audit

The previous v70.16 logo was too generic and too visually weak. The earlier reference was stronger because it encoded phase space, trajectories, networks and dynamical structure. The new logo restores that identity while removing excess text.

### New mark

- dark header-ready mark,
- infinity / phase trajectory,
- central state node,
- axis/grid cue,
- local network motif,
- teal–cyan–blue palette,
- no magenta,
- minimal wordmark text.

Updated assets:

- `assets/brand/foko-lab-logo.svg`
- `assets/brand/foko-lab-mark.svg`
- `assets/brand/favicon-16.png`
- `assets/brand/favicon-32.png`
- `assets/brand/apple-touch-icon.png`
- `assets/brand/foko-lab-icon-512.png`

## Data / Analysis upgrades

### Network Lab

Added real graph-theory depth:

- betweenness centrality,
- eigenvector centrality,
- minimum spanning tree,
- label-propagation community detection,
- network vulnerability / resilience by node removal,
- richer centrality summary in `summary()`.

This makes the module closer to graph theory rather than only edge-list display.

### Linear Algebra Lab

Added structural matrix operations:

- LU decomposition,
- QR decomposition,
- RREF,
- null-space basis,
- PCA from a data matrix.

This reduces the imbalance with the modeling side, where Jacobians, least-squares problems and stability analysis require more than matrix summary / solve / inverse.

### ML Toolkit

Added consistency-oriented diagnostics:

- feature normalization,
- k-NN cross-validation,
- logistic threshold sweep,
- validation-report mode,
- linear feature-importance helper.

This still remains browser-scale ML. It is not pretending to be PyTorch, JAX, scikit-learn or an MLOps system.

## Remaining limitations

### Still not enough for a full research-grade data platform

The platform still lacks:

- Web Worker compute isolation,
- Pyodide / Wasm-backed SciPy / scikit-learn,
- model/data persistence with IndexedDB,
- large graph layout acceleration,
- reusable dataset manager shared across all analysis labs,
- true model registry / lineage tracking,
- batch project files across Workbench + Analysis.

### Why this matters

Without these, browser sessions remain good for small/medium interactive diagnostics, not large-scale data science. The correct next release should be architectural: a shared Data Engine and a shared Plot Engine, not another isolated module.

## Validation

- `python3 -m pytest -q tests` → 261 passed, 271 skipped
- `node tests/test_v70_9_numeric_cores_node.js` → ok
- `node tests/test_v70_11_numeric_cores_node.js` → ok
- `node tests/test_v70_16_numeric_depth_node.js` → ok
- `node tests/test_v70_17_consistency_depth_node.js` → ok
- `node --check src/*.js src/stochastic/*.js` → ok
