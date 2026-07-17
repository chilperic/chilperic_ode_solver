# Foko Lab v72.29.0 migration status

## Authored reference labs

ODE, Steady-State, Stochastic, Optimization, Statistics, Curve Fitting, Linear Algebra, Networks, Machine Learning, SciML, Agent, Symbolic and Workbench use the v72 authored architecture.

## Current reliability focus

- stable two-panel and Focus layouts;
- central plot compatibility;
- actual live Agent computation in both evidence panels;
- deterministic seed and population contracts;
- user-defined validated model input routes;
- physical-admissibility reporting for constrained steady-state research models;
- reduced research-derived fatty-acid ODE and steady-state examples;
- mandatory local browser gate.

## Remaining blockers

- the local Playwright suite must pass after the v72.18.0 29-failure report;
- the complete calibrated fatty-acid repositories are not embedded in this browser release;
- general 4D non-symmetric stability, pseudo-arclength continuation and certified bistability remain external workflows;
- performance and rendering must be checked on the target deployment browsers.
