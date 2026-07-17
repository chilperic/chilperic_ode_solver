# Foko Lab v72.45.0

Major Global Sensitivity and platform-consistency release over v72.44.1.

- Extends Morris screening with elementary-effect distributions, prefix convergence and bootstrap rank stability.
- Extends independent-uniform variance decomposition with Jansen first/total indices, optional pairwise Saltelli second-order interactions, bootstrap intervals, convergence, rank stability and output-distribution diagnostics.
- Adds a pre-worker browser-capacity guard that refuses models whose projected state dimension, parameter dimension, sample budget or state-time workload is unsafe for a browser tab.
- Keeps raw finite-sample estimates visible rather than clipping them into reassuring ranges.
- Fixes the missing shared `field-grid` layout contract and synchronizes Sensitivity navigation copy across every public page.
- Preserves editable initial conditions, parameter values/ranges, time span, solver controls and tolerances.

See `AUDIT-v72.45.0.md`, `LIMITATIONS-v72.45.0.md`, and `foko-lab-v72.45.0-VALIDATION.md`.
