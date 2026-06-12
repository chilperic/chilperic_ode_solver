# Chilperic Dynamics v2.4.4 — Stochastic Lab symmetry fixes

## Scope

This patch responds to the v2.4.3 audit focused on model-building symmetry between the ODE Lab and Stochastic Lab.

## Applied fixes

- Fixed the remaining GBM time-horizon bug: GBM now uses the global Run settings `tEnd` before any model-level fallback.
- Added propagation of state renames into CTMC propensity strings and derived expressions.
- Added propagation of parameter renames into CTMC propensity strings and derived expressions.
- Added a reaction-preview panel for CTMC models: each event is rendered as state changes plus its rate expression.
- Added live validation while editing propensity fields.
- Reworked the stochastic model library into core CTMC templates plus an additional examples section, mirroring the ODE Lab's core examples + full library logic.
- Added `Customize this CTMC example`, allowing users to clone any CTMC preset into an editable custom model.
- Added custom-model overwrite protection with localStorage backup for the last custom CTMC model.
- Added `Restore last custom` in the custom CTMC editor.
- Changed `New blank CTMC` inside the editor so it no longer pushes repeated identical browser-history states.
- Improved wording for specialized stochastic engines so the distinction between editable CTMC models and algorithm-specific models is clearer.
- Added targeted CSS for the new stochastic library deck and CTMC reaction preview.
- Bumped cache strings to `v2.4.4`.
- Included the supplied v2.4.3 audit in `docs/audits/`.

## Remaining boundary

The custom stochastic editor remains CTMC/Gillespie-specific. Specialized engines such as GBM, Wright-Fisher, Parrondo, bandits, resonance, and secretary use their own model structures and are still edited through parameters and JSON rather than the event-builder UI.
