# AUDIT v71.31 — Wide analysis workspace, third diagnostic slot, user input

Scope:
- Data/Analysis cockpit only.
- Focused ODE, Stochastic, Optimization and Steady-State pages preserved.

Changes:
- Expanded analysis workspace to use wide desktop screens.
- Added a third plot / analysis slot.
- Added independent dropdowns for primary, diagnostic and third analysis panels.
- Added per-panel wide toggles.
- Added generic user input card for upload and formula/model preview.
- Supported upload entry path for CSV, TSV, JSON, TXT, YAML/YML-like text payloads.
- Added JSON payload routing to the appropriate lab field when keys match `data`, `matrix`, `vector`, `edges`, `x`, `y`, `formula`, `model`, etc.
- Added live model/formula preview with KaTeX when available, graceful text fallback otherwise.

Validation focus:
- Controls must not be decorative.
- Uploads must populate visible analysis inputs and schedule a rerun.
- Plot selectors must redraw panels.
- Running state must be visible.

Limits:
- YAML support is treated as text-compatible input in browser; full YAML parsing is not bundled.
- Custom formulas are rendered and carried with the session/config; full nonlinear custom-model fitting is a later engine-depth task.
- Advanced plots remain lightweight diagnostics unless backed by a specific scientific engine.
