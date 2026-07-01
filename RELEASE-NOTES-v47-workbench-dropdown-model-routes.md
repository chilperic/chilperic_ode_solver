# v47 — Workbench dropdown and model-route correction

## Corrections
- Workbench top navigation now exposes the Workbench suite directly: Model, Symbolic, Agent, Model Atlas.
- Legacy remains unchanged: ODE, Optimization, Steady-State, Stochastic.
- Removed the redundant modeling-approach card block from the Workbench page.
- Added Symbolic, Agent and Model Atlas route entries to the Workbench model selector. These entries navigate to the correct lab instead of pretending to be legacy numerical models.
- Updated cache tokens to v47 for navigation, Agent Lab and Model Workbench scripts.

## UX rule
The Workbench dropdown is the modern gateway. Legacy is the compatibility shortcut. The Model selector contains numerical model examples plus route entries for non-numerical modeling approaches.
