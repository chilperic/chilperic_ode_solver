# v43 — Agent UX, plots and homepage compression

## Added

- Agent Lab palette selector:
  - model colors
  - scientific
  - aurora
  - viridis
  - magma
  - mono
- New Agent diagnostic plot modes:
  - stacked population area
  - state ranking
  - cumulative events
  - state diversity / entropy
  - spatial state heatmap

## Changed

- Agent canvas, legend and Plotly diagnostics now share the active palette.
- Agent simulation layout uses more balanced plot/simulation proportions.
- Homepage is more compact:
  - smaller hero height
  - tighter route cards
  - shorter route descriptions
  - lower Model/Inspect/Export panels hidden

## Validation

```bash
python3 -m pytest -q tests
# 332 passed

node --check src/navigation.js
node --check src/app.js
node --check src/symbolic-lab.js
node --check src/model-validator.js
node --check src/model-session.js
node --check src/agent-lab.js
node --check src/agent-rule-worker.js
```
