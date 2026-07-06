# AUDIT v70.19 — Professional platform redesign

## Objective
The previous versions improved individual pieces but still felt assembled from separate labs. A professional modeling platform needs one operating model, one visual system, and a shared workflow across mechanistic modeling, data analysis, SciML and graph structure.

## Main changes

### 1. Platform-level visual system
Added `styles/v70-19-platform-system.css` to create a consistent product-level interface:

- dark scientific header with stronger brand contrast,
- platform workflow ribbon on non-home pages,
- consistent card system for home, analysis pages and architecture pages,
- stronger buttons and active states,
- improved panel spacing and plot area sizing,
- a professional home page based on workflow rather than slogans.

### 2. Logo redesign
Rebuilt the logo around a cleaner version of the stronger old identity:

- phase trajectory,
- infinity/dynamical-system structure,
- central model state,
- axis/grid cue,
- network motif,
- teal/cyan/blue palette,
- no magenta,
- no decorative noise.

Updated assets:

- `assets/brand/foko-lab-logo.svg`
- `assets/brand/foko-lab-mark.svg`
- `assets/brand/foko-lab-logo-display.svg`
- favicon and app icons.

### 3. Shared platform workflow
Added `src/platform-shell.js`:

- injects a workflow ribbon: Question → Model/Data → Compute → Diagnose → Export,
- labels the current page domain,
- adds project controls on analysis/workbench pages.

### 4. Shared local data/project engine
Added `src/platform-data-engine.js`:

- `parseTable()` for CSV/TSV/space-delimited data,
- `inferSchema()` for numeric/category/missingness checks,
- `projectSnapshot()` for local reproducibility,
- `downloadJSON()` for browser-side project export,
- `fillPrimaryTextarea()` for local data import into the first editor.

This is still lightweight, but it establishes the correct platform architecture.

### 5. Home page redesign
The home page now presents the platform as a serious scientific product:

- platform workflow map,
- modeling/data/SciML/graph routes,
- creator profile and research entry,
- large display logo,
- direct access to Statistics, Fitting, Linear Algebra, Networks and ML.

### 6. Platform architecture page
`platform.html` now documents the operating model, parity audit, hard limitations and external-compute boundary.

## Hard limitations still present

This release improves coherence and architecture, but it is still not a full backendless scientific computing platform. Missing pieces remain:

- Web Workers for all heavy engines,
- IndexedDB persistent project storage,
- Pyodide/SciPy/scikit-learn integration,
- ONNX Runtime Web / TensorFlow.js inference,
- shared dataset manager across all labs,
- large graph layout engine,
- single generated header/template source,
- full model registry and lineage tracking.

The next serious release should attack these architectural gaps rather than adding more isolated features.

## Validation

- `python3 -m pytest -q tests` → 270 passed, 271 skipped
- all `tests/js/*.test.js` passed
- legacy numeric node tests passed
- `node --check src/*.js src/stochastic/*.js` passed
- `node tests/test_v70_19_data_engine_node.js` passed
