# Foko Lab architecture boundary

Read this before changing code.

Foko Lab has one non-negotiable rule: **never reimplement scientific numerics outside the canonical core.** Deterministic integration, steady-state solving, stochastic simulation, optimization, fitting, statistics, linear algebra, graph analysis, ML diagnostics, symbolic evaluation, and Agent ensemble logic live under `src/core/` or their approved worker wrappers. Pages validate input, call a core, render evidence, and export configuration. Workers schedule the same cores; they are not alternative engines.

The interface uses `styles/v72-tokens.css` and the authored lab shell. Edit existing styles before creating a stylesheet. Do not add `!important` to hide a cascade defect.

## Plot and layout contract

A workspace owns its explicit layout state:

- preferred layout: `two` or `focus`;
- effective layout: the preferred layout unless the viewport is genuinely narrow;
- focused side: `left` or `right`;
- one selected plot ID for each stable host.

**Plot selector changes never select a layout.** Changing either selector must preserve the preferred layout before, during, and after delayed rendering. Loading an example, receiving a worker result, exporting a plot, or refreshing diagnostics must not select Focus. Focus is entered only through the explicit layout or panel-focus controls.

The shared lifecycle in `src/v72/accessibility-performance.js` owns Plotly serialization and the event-driven layout-stability guard. It records user layout intent before selector changes and reasserts that intent after `foko:plot-rendered` and bounded delayed render checkpoints. It does not use DOM mutation or resize observers. Do not create page-specific layout watchdogs, synthetic selector changes, or competing Plotly owners.

Plot hosts are stable DOM nodes for the life of the page. A workspace sets layout first, waits for browser geometry, and renders only visible hosts. Clearing a result purges the plot without replacing its container. Hidden panels are not mounted as evidence, and changing one selector rerenders only that panel.

## Public and scientific contracts

`CAPABILITIES.json` is the source of truth for claim classes. Protected research may be documented but not exposed as a runnable public reduction without an explicit research contract. Visual polish cannot imply a stronger numerical or empirical claim than the underlying computation supports.

Before shipping, run syntax and engine-boundary checks, core tests, active contracts, page-quality audits, lifecycle checks, differential references, and Playwright. A valid numerical result with a blank, stale, duplicated, or layout-corrupted visible plot is a failed release.


## v78 connected research layer

`src/research/engine.js` is a pure task dispatcher over existing Project/Compute/ODE. `worker.js` runs the identical engine in a dedicated worker; `executor.js` owns timeout, cancellation and explicitly labelled fallback. `workspace.js` owns the canonical experiment state, revisions, immutable results, guarded imports and export. `charts.js` renders computed values and accessible tables; it does not simulate. `shell.js` owns the four-page navigation, native modals, themes and storage fallback. `paths.js` owns reduced model dossiers; `lessons.js` owns worked teaching content. `styles/research.css` is the only stylesheet on the four research pages. Legacy specialist lab boundaries remain in place.

Do not infer capability from a lesson or link. The connected engine supports only the task contracts in CAPABILITIES.json and LIMITATIONS-v78.0.0.md. Inputs/runs use `foko.research/1`; schema versions and configuration fingerprints are identities, not signatures. Imported results remain unverified. Historical snapshots include complete model, data, method settings and seeds. Mutable application state must not be attached to an in-flight request by reference. CLI replay uses the same engine, while the separate Python template uses SciPy RK45 for a deliberately independent trajectory check.
