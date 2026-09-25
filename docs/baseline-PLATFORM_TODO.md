# Maintainer roadmap

This file is for repository maintenance. It is not part of the public User Guide or Tutorials.

## Current priorities

1. Observe at least five external users completing a modelling task without assistance.
2. Record where users hesitate, misinterpret evidence, or leave the workflow.
3. Build one complete GUTS/TKTD ecotoxicology workflow only after the user study confirms the need.
4. Decide which secondary labs justify continued maintenance from observed usage.
5. Prepare a JOSS submission after the platform has a clear statement of need and external users.

## Reliability rules

- Keep deterministic ODE integration inside the canonical core.
- Add a failing contract before correcting a numerical or evidence-boundary defect.
- Plot selection must never change the user’s layout preference.
- A computed status requires rendered evidence and current provenance.
- Do not market a limited, export-only, or unavailable capability as browser-computed.
- Public documentation must address scientists using the platform; implementation notes belong here or in `ARCHITECTURE.md`.

## Open capability decisions

- Solver auto-selection with an explicit justification.
- Optional implicit browser method for mild stiffness.
- SBML read-only import.
- Post-hoc statistical comparisons.
- Multiclass classification.
- General non-symmetric eigensystems.
- Complete share-link round trips and a `.fokolab` project file.
- Offline packaging of the optional SciPy verification runtime.
- Structural-identifiability integration through an external workflow.

## Product boundary

Foko Lab should remain strongest where browser execution provides a real advantage: mechanistic modelling, diagnostics, identifiability, provenance, reproducibility, and zero-install collaboration. New features should be added only when they support an observed scientific workflow.
