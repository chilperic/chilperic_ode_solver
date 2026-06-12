# Chilperic Dynamics v2.4.3 — Audit-driven fixes

## Source audit

Applied the v2.4.2 deep audit findings supplied in `v242_audit.md`.

## Fixed bugs

- Fixed GBM so the global run-setting time horizon controls the simulation; removed the duplicate `tEnd` model parameter.
- Replaced CTMC propensity execution via `new Function()` / `with(ctx)` with Math.js parsing and evaluation.
- Added expression-symbol validation for CTMC propensities and derived variables so unknown names are surfaced before interpretation.
- Added JSON dirty-state protection so unsaved manual schema edits are not overwritten by parameter or structured-editor edits.
- Hid the deterministic mean-field toggle for non-CTMC engines.

## UX changes

- Replaced raw one-line update JSON in the CTMC event editor with a per-state delta editor.
- Reduced the stochastic-resonance scan load from roughly 1.5M synchronous operations to a smaller pedagogical scan.
- Replaced the CTMC Python export stub with runnable Gillespie SSA starter code.

## Scientific/narrative fixes

- Corrected the simplified Braess model wording: the current model is a congestion-feedback illustration, not a validated paradox instance.
- Added theoretical stationary mixed-strategy drift for Parrondo's paradox.
- Labeled the stochastic-resonance quality score as a pedagogical threshold-crossing precision proxy, not a formal spectral SNR.

## Maintenance

- Updated cache-busting query strings to v2.4.3 on HTML/CSS/JS references.
- Added browser fallback styling for key stochastic workbench components when `color-mix()` is unsupported.
- Replaced hard-coded trajectory priority names with optional per-model `plotPriority`; preserved FADNS priority through model metadata.

## Remaining boundary

- Stochastic engines still run on the main thread. The reduced resonance scan mitigates the worst freeze, but Web Worker execution is the next structural improvement for very large ensembles.
