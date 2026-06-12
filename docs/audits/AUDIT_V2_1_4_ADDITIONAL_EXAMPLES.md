# Chilperic ODE v2.1.4 — Additional examples patch

## Scope
Adds a dedicated additional examples panel and expands the model library without saturating the core example row.

## Added models
- FA metabolism bistability, based on the user's PhD coarse-grained fatty-acid metabolism equations.
- FA metabolism parameter sweep.
- Love-hate oscillator, a simple Strogatz-style Romeo-Juliet oscillator.
- Braess-inspired route-choice dynamics and shortcut sweep.
- Ziegler-inspired destabilization model.
- Calvin cycle mini-model and regeneration sweep.

## UI decision
Core examples remain visible as compact chips. Research and paradox examples are kept in a collapsible panel labelled Additional examples.

## Scientific boundary
The PhD model is implemented as a browser-explorable educational parameterization of the published/defended structure, not as a calibrated reproduction of every thesis analysis. Braess and Ziegler are pedagogical reduced models, not engineering-grade traffic or structural simulators.
