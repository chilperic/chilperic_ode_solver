# Foko Lab v19 — Agent/Symbolic functional upgrade

## Why this release exists

v18 introduced Agent Lab and improved Symbolic Lab, but both still felt too decorative. This release moves them toward actual modeling surfaces.

## Agent Lab

- Exposes the rule definition before the visual grid.
- Adds named A/B/C/D parameter meanings per model.
- Adds custom local JavaScript rule editing.
- Adds Apply custom rule, rule templates, JSON import and JSON copy/export.
- Adds diagnostic plot modes: population, composition, phase portrait, events and trait distribution.
- Adds state legends, KPI cards and event counters.
- Keeps the custom-code boundary explicit: local browser prototype only.

## Symbolic Lab

- Promotes plotting to the main surface.
- Adds plot modes for expression curves, 1D phase/RHS, 1D and 2D time courses, vector fields, nullcline scans and 1D parameter sweeps.
- Adds numeric equilibrium scanning and stability cues.
- Adds time controls, sweep parameter selector and resolution control.
- Keeps exact CAS work in exported SymPy.

## Docs and tutorial

- Rewritten around current platform behavior.
- Added clear docs for Symbolic Lab plotting, Agent Lab rules, custom local code and failure checks.
- Removed vague/decorative wording.

## Audit

- Python tests: 88 passed.
- JavaScript syntax checks passed for core modules.
- Local link/image audit passed.
- ZIP integrity passed.
