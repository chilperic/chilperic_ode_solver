# AUDIT v70.15 — analysis-suite consolidation and logo redesign

## Main user criticisms addressed

1. Statistics and ML Toolkit were too basic compared with the stated platform ambition.
2. Data / Analysis needed a more coherent framework, richer plots and clearer examples.
3. The logo still carried too much noise and did not clearly encode platform identity.
4. Tutorial material needed minimal starter templates per lab.

## What changed

- Replaced the lightweight statistics engine with the stronger v70.14 inferential core.
- Rebuilt `statistics.html` around data management, inference, plots and reproducibility.
- Rebuilt `ml.html` to include: k-means, PCA, train/test linear regression, binary logistic regression, k-NN classification and anomaly detection.
- Rebuilt `networks.html` to include: connectivity, shortest paths, centrality, PageRank, adjacency heatmaps and Sankey flow visualization.
- Reframed `linear-algebra.html` with better examples, geometric plots and clearer scope statements.
- Added a new shared stylesheet `styles/v70-15-analysis-suite.css`.
- Added explicit starter templates to the tutorial and browser-scope guidance to the docs page.
- Replaced both brand SVGs with a cleaner mark: infinity loop + trajectory + network motif, with minimal text.

## Deep audit: feasible vs not feasible in-browser

### Feasible now
- Descriptive and inferential statistics on small/medium tables.
- Linear algebra on dense small/medium matrices.
- Baseline ML: clustering, PCA, linear/logistic models, k-NN, anomaly screening.
- Small/medium graph analytics: connectivity, routing, rank and adjacency views.

### Feasible with a heavier browser stack
- Pyodide / scientific-Python-backed statistics or scikit-learn workflows.
- ONNX Runtime Web / TensorFlow.js for inference with downloaded pre-trained models.
- IndexedDB persistence and Web Workers for better scaling.

### Not realistic in this release
- Deep learning training, LLM fine-tuning, computer-vision training, RL loops.
- Large graph analytics or sparse scientific computing at scale.
- Server-grade lineage tracking, collaboration, graph databases or model registries.

## Local validation checklist

```bash
python3 -m pytest -q tests
node tests/test_v70_9_numeric_cores_node.js
node tests/test_v70_11_numeric_cores_node.js
for f in src/*.js src/stochastic/*.js; do
  [ -f "$f" ] && node --check "$f"
done
```
