# FokoLab v77.5.0 — implemented changes and remaining risks

This is an implementation report, not a restatement of the v77.4.1 audit. Application files and numerical paths were changed. No live site was modified.

## Scientific repairs

* Reject blank/null/non-finite initial conditions before JSON cloning or numeric coercion; preserve legitimate zero-valued options.
* RK45 no longer accepts excessive scaled error merely because the step is small. Unrepresentable progress and bounded capacity fail explicitly.
* Fixed-step integration separates requested output sampling from internal steps; maxStep/stepSize constraints are not silently coarsened.
* Correct ROC origin/ties, singleton silhouette handling, lambda=0 regularization, and zero-variance Welch failure reporting.
* Reject unsupported SBML conversion factors, stoichiometryMath and unit semantics; honor XML true/1 and false/0 consistently. This is a strict importer subset.

## Experiment integrity

Studio executes through one shared compute module, with a dedicated local worker when available and a bounded main-thread fallback with explicit notice. Run revisions and immutable input snapshots prevent edits, cancellation or older completions from publishing as current results. Run history stores configurations and supports restore/recompute. The optional Foko experiment envelope preserves settings across Model IR export/import; model-only interchange remains distinct from experiment reproduction. Hashes use a documented noncryptographic configuration fingerprint.

A further defect discovered during implementation was fixed: normalization/autosave replaced project objects while old edit handlers retained references to previous objects. Handlers now operate on the current model. Parameter renaming preserves order. Sweep grid editing and Two-up/Focus controls no longer trigger unrelated state changes.

## Public interface

* Blank/new, imported, selected-example and restored startup paths are distinct. Home does not automatically compute.
* Horizontal workflow navigation replaces the vertical rail on desktop. The resizable model editor and rich plot controls remain.
* One mobile bar owns Home / Setup / Results / Evidence / Run inside a lab.
* Search indexes 280 model/example destinations plus navigation; unmatched entries are actually hidden; no-result status is explicit.
* Shared modal behavior contains keyboard focus, makes the background inert and restores focus on close.
* Safe storage adapters preserve usability when persistence is unavailable and explain the limitation.
* Revised shared typography, spacing, evidence layout, touch targets and documentation reflow; light, dark and high-contrast appearance controls.
* Model Studio exposes a paginated native result table, units/axis labels, plot summaries and full-precision CSV exports.
* Documentation provides an explicit five-step model/run/inspect/save path. All 36 authored pages participate in the static quality inventory.

## Files that own the changes

`src/core/project.js`, `src/core/ode.js`, statistics/ML cores, `src/core/model-import.js`, new `src/core/studio-compute.js`, `src/v73/model-studio.js`, new `src/v73/studio-worker.js` and `studio-executor.js`, new `src/platform/storage.js`, `src/v76/app-shell.js`, `src/v76/home-workspace.js`, `src/v72/accessibility-performance.js`, `styles/v76-system.css`, shared HTML integration, tests and build/deployment scripts.

## Preservation

All maintained scientific labs, 259 catalogue entries, 21 Studio starters, user equations/rules, parameters, initial conditions, solver controls, Two-up/Focus and scientific plot families remain. Research examples include fatty-acid/FADNS, T-cell and plant pathways. The protected C3–C4 integration boundary remains explicitly unavailable rather than presenting a fabricated runnable model.

## Evidence and limits

See [VALIDATION.md](VALIDATION.md) and [LIMITATIONS-v77.5.0.md](LIMITATIONS-v77.5.0.md). Existing core/reference gates plus new regressions pass as recorded in the delivered logs. Normal HTTP browser navigation and npm browser installation were blocked in this environment; original-source in-memory fixtures are not end-to-end deployment certification. No full WCAG, real-device, screen-reader, every-theme/every-lab, security, physiological or arbitrary-model validation is claimed.
