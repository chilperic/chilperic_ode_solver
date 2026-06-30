# Photosynthesis Climate Adaptation Model

This folder documents the Foko Lab browser-facing layer for the photosynthesis climate-adaptation project.

## Project positioning

This is the flagship research model in the portfolio. It should be presented as a project designed and led by Chilperic Armel Foko Kuate, with core code architecture, major implementation and research integration attributed to him.

Yvonne Danisch's bachelor thesis contribution should be acknowledged clearly and respectfully: implementation, model execution, validation and analysis contribution within the bachelor thesis work. Jérémie Muller-Prokob contributed scientific guidance and technical discussion. Martin Lercher provided PI supervision, research environment and funding. Antonio Rigueiro is retained as an additional paper-level contributor where relevant.

## Browser boundary

The browser models are deliberately reduced surrogates. They are meant to communicate the model architecture and make the scientific logic inspectable in a portfolio/demo setting.

Use the full Python project for scientific runs:

- coupled C3/C4 biochemical model
- hydraulic model
- heat-balance model
- CasADi optimization
- sensitivity analysis
- CMA-ES evolutionary trait exploration

## Visual priority

The strongest portfolio figures are not generic objective landscapes. The primary figures are:

- 3D evolutionary trajectories
- local sensitivity ranking
- Sobol first-order and total-order indices
- second-order Sobol interactions
- Pareto fronts of mesophyll and bundle-sheath assimilation

Workbench entries:

- `leaf-thermal-steady`
- `leaf-thermal-opt`
- `hydraulic-carbon-opt`
- `c3c4-trait-opt`

Legacy Optimization Lab presets:

- `Leaf heat-balance optimal control`
- `Hydraulic-carbon trade-off`
- `C3-C4 trait allocation`

Scientific boundary: the platform can demonstrate modeling skill and mechanism coupling, but it must not claim calibrated physiological prediction from browser surrogates.
