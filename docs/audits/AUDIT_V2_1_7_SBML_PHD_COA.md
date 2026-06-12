# Chilperic ODE v2.1.7 audit — SBML, plot stability, and refined PhD model

## Implemented

- Added basic SBML/XML import for reaction-network models.
- Replaced the second PhD example with the refined CoA-sequestration FADNS model.
- Added Lasso, Runge, and Secretary problem examples as optimization/teaching examples.
- Hardened plot-state normalization to reduce disappearing plots after example switches.
- Added high-dimensional plot safeguards: trajectories show key variables and trajectory matrices cap to a readable subset.

## SBML limitations

The browser importer handles species, reactions, stoichiometry, parameters, and MathML kinetic laws. It does not fully validate SBML and does not execute events, assignment rules, algebraic rules, units, compartments, or SBML packages.

## Scientific boundary

The refined FADNS model is an exploratory browser implementation of the thesis architecture with CoA sequestration. It is not a full calibrated reproduction of the dissertation fitting workflow.
