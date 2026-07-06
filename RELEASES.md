
## V71.46 — SciML spotlight layout

- Reworked SciML cockpit into a less crowded spotlight layout.
- Primary plot is now the large stage; diagnostic and third-analysis plots form a right-side diagnostic rail on wide screens.
- Model artifact moves below plots as an evidence strip.
- No global chrome, navigation, Data/Analysis, or focused-lab changes.


## V71.45 — SciML cockpit adaptation
- Adapted SciML to the Data/Analysis cockpit language.
- Added ten concrete SciML scenarios and twelve diagnostic plot modes.
- Added visible typed model, upload and LaTeX preview areas.
- Preserved global chrome and focused labs.


## V71.43 — Statistics scientific honesty

- Upgraded Statistics Lab diagnostics from label-level displays to computed browser-side methods.
- Added ROC/PR AUC, monotone Benjamini-Hochberg FDR, OLS Cook distance, confidence and prediction bands, Kaplan-Meier curves, and log-rank test helpers.
- Corrected A/B grouped-proportion handling and Statistics result interpretation/warnings.
- Preserved global chrome, Data/Analysis cockpit layout, upload, formula input, LaTeX preview, and focused modeling labs.

# V71.40 — Lab hue propagation + token generator

- Restored requested family-based lab colour mapping.
- Added Lab identity as a plot-palette option.
- Propagated lab hue to functional cockpit surfaces.
- Added VERSION.json and scripts/stamp-version.js for build-time asset token stamping.


## V71.40 — Runtime navigation active-state

- Added a data-driven active-state resolver in `src/navigation.js`.
- Navigation active state now follows `body[data-lab]`, `body[data-module]` and the current page filename.
- Preserved the static header/nav structure; no generated chrome rewrite.
- Preserved the V71.38 lab color identity baseline.
- Added regression tests for analysis, focused, SciML and creator/learn/explore active-state mappings.
- Cache token normalized to `?v=71.46.0`.


## V71.32 — Functional cockpit boxes and plot palettes

- Made cockpit tabs functional instead of decorative.
- Replaced decorative status cards with compact live status text.
- Moved plot selectors into each plot card header.
- Added per-panel plot palette selectors: Scientific, Viridis, Cividis, Plasma, Turbo, Mono.
- Applied palettes after each Plotly render.
- Removed duplicate plot target IDs by using slot-specific plot IDs.
- Added regression tests for functional controls, palettes and cache token normalization.


## v71.31 — Wide analysis workspace + third diagnostic slot + user input

- Expanded Data/Analysis pages to use wide desktop workspace.
- Added a third plot/analysis panel.
- Added independent primary, diagnostic and third-analysis plot selectors.
- Added generic user data/model upload path for CSV, TSV, JSON, TXT and YAML/YML-like text.
- Added live formula/model preview with KaTeX fallback.
- Preserved focused ODE/Stochastic/Optimization/Steady-State labs.


## v71.30 — Analysis plot interactivity repair

- Added primary and diagnostic plot dropdowns above the analysis plot panels.
- Added automatic recompute/redraw when users change examples, methods, data or plot selections.
- Added explicit Running / Computed / Error cockpit state.
- Hid duplicate plot selectors from the left panel so plotting is controlled from the workspace.
- Added audit and regression tests.


## V71.29 — Data/Analysis cockpit rebuild

- Rebuilt the public Data/Analysis shell into a focused-lab cockpit.
- Removed static hidden contract DOM from Statistics, Fitting, Linear Algebra, Networks and ML pages.
- Removed generic browser-style shell button leakage.
- Replaced raw JSON-first outputs with result cards plus an export/raw drawer.
- Preserved v71.27 core-engine wiring.
- Validation: `390 passed, 271 skipped`; Node/core checks and JS syntax checks passed.

## V71.29 — Analysis interface parity

- Removed noisy Data / Analysis hero paragraphs.
- Reworked the descriptor shell into a focused-lab cockpit layout matching the ODE/Stochastic/Optimization visual grammar.
- Preserved V71.27 core-engine wiring.
- Added primary + diagnostic plot labels, status strip and concrete-example controls.


## V71.27 — Integrity consolidation for analysis labs

- Removed dead flat engine copies under `src/` and kept the tested engines under `src/core/` as the only numeric core source.
- Routed Statistics, Curve Fitting, Linear Algebra, Networks and ML shell labs through their tested core APIs.
- Fixed the broken Statistics ROC branch and replaced the residual-squared Cook label with a simple OLS Cook-distance calculation.
- Fixed the Networks Sankey branch to use the live node array.
- Added integrity regression tests.


## V71.22 — Playwright end-to-end deploy gate

- Added Playwright browser smoke tests for home, focused labs, descriptor analysis labs, and reproducibility controls.
- Added `package.json`, `playwright.config.js`, and `tests/e2e/main-labs-smoke.spec.js`.
- Added pytest structural checks so the e2e gate itself is protected.
- Cache token normalized to `?v=71.46.0`.

# Foko Lab release history
## V71.11 — ML Toolkit descriptor shell and focused-lab noise cleanup

- Ported ML Toolkit as the fifth descriptor-driven analysis lab.
- Removed migration/noise panels from Focused Lab pages.
- Kept Focused Labs as a separate navigation dropdown.
- Preserved ODE, Stochastic, Optimization and Steady-State as real standalone labs.
- Audit: `release-audits/AUDIT-v71-11-ml-shell-focused-noise-cleanup.md`.


## v70.20 — Cache-token normalization

- One cache token across the whole tree: `?v=71.46.0`.
- Legacy asset tokens removed.
- Added `tests/test_v70_20_token_normalization.py`.
- Audit: `release-audits/AUDIT-v70-20-token-normalization.md`.

## v71.0 — Platform-standard foundation

- Added `src/fokokit.js` as shared guard/format/state/seed/export kit.
- Added session save/load and shareable URL state.
- Added command palette, plot export hooks, accessibility hooks, and upload validation helpers.
- Added Workbench experimental-data overlay and Fitting Lab handoff.
- Added stochastic tau-leaping / SDE helper module, dynamical fitting helper, basin map helper, continuation classification helper.
- Added versioned model registry under `models/registry/`.
- Added `CITATION.cff`.
- Audit: `release-audits/AUDIT-v71-0-platform-foundation.md`.

## v71.1 — Workbench scientific integration

- Added Workbench scientific panel for observation overlay, nonlinear fitting, uncertainty envelopes, seeded stochastic ensembles and basin maps.
- Added `src/v71-workbench-science.js`.
- Added tests: `tests/test_v71_1_workbench_science.py` and `tests/test_v71_1_workbench_science_node.js`.
- Audit: `release-audits/AUDIT-v71-1-workbench-science.md`.
## V71.9 — unified identity and standalone lab depth framing

- Restored the creator photo on the homepage creator card while keeping the platform mark as a secondary badge.
- Added homepage and documentation sections explaining why standalone labs remain powerful focused workspaces.
- Added per-page scientific depth briefs to ODE, Stochastic, Optimization and Steady-State standalone labs.
- Preserved all legacy controls, scripts and non-redirect standalone behavior.
- Validation: 309 passed, 271 skipped; Node science tests and syntax checks passed.

## V71.15 — ODE fitting, CI, and trajectory bands

- Added real focused-ODE parameter fitting through the worker.
- Added parameter confidence intervals from the local covariance approximation.
- Added optional fit uncertainty bands on trajectory plots.
- Preserved Focused Labs and descriptor-shell analysis labs.

## V71.19 — Reproducibility layer

- Added compact reproducibility controls across pages that load the V71 platform layer.
- Added session save/restore, shareable URL state, JSON bundle export and JSON bundle import.
- Added `window.FokoRepro` for future shell integration and tests.
- Added documentation/tutorial guidance for browser-local reproducibility.
- Preserved all focused labs and descriptor-driven analysis labs.

## V71.21 — Web Worker compute bus consolidation

- Added `src/platform/compute-bus.js` as the shared browser API for worker-backed computation.
- Added `window.FokoComputeBus.run(...)`, `cancel(...)`, `createLegacyHandle(...)`, and `platformRun(...)`.
- Routed ODE / Parametric ODE and Optimization worker calls through the bus-compatible legacy handle.
- Preserved all existing worker protocols and lab behaviour.
- Kept direct lab pages usable while preparing later descriptor-shell migration.

## V71.21 — Stochastic and Steady-State compute-bus migration

Stochastic ensemble runs and Steady-State solve/continuation workflows now execute through the shared compute-bus lifecycle while preserving the focused-lab pages and scientific engines.

## V71.24 — Analysis workspace two-plot repair
- Removed in-interface feasibility/noise text from analysis labs.
- Loaded shared shell CSS on descriptor pages.
- Added two-plot workspace support with secondary diagnostics for Statistics, Fitting, Linear Algebra, Networks and ML.
- Preserved focused modeling labs unchanged.

## V71.36 stable rollback

Restores the V71.35 stable interface after the aggressive chrome/token cleanup proved too disruptive. This is the safe baseline for future incremental refactoring.

## V71.43 — Plot header and lab hue rendering repair

- Fixed analysis cockpit plot-header overlap by moving plot titles onto their own row.
- Hid duplicate label text accessibly to prevent title/dropdown collisions.
- Made `Lab identity` palette apply to Plotly traces, histogram bars, box/violin fill, and heatmap color scales.
- Preserved Statistics scientific honesty work from V71.42 and all focused labs.

## V71.44 — Curve Fitting scientific honesty
- Upgraded Curve Fitting Lab numerical diagnostics: nonlinear least squares, covariance, confidence/prediction bands, bootstrap, profile scans and influence diagnostics.
