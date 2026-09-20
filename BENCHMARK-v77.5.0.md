# FokoLab v77.5.0 — release criteria, not a product score

The former 100/100 aggregation is removed from the executable structural report. Presence of files, tokens or source strings is not evidence of public usability or scientific validity.

| Dimension | Appropriate evidence | Current boundary |
|---|---|---|
| Scientific reliability | Counterexamples, invariant tests and independent numerical references | Selected tested algorithms only; no universal physiological/model validation |
| Platform stability | Core contracts, revision-aware result ownership, storage-failure and cancellation probes | Full browser/native-worker lifecycle not certified here |
| UX | Actual search, new-project, edit/run/restore, mobile hitbox and keyboard sequences | In-memory fixtures; live deployment and real-device acceptance pending |
| Modern GUI | Readable shared layout, responsive evidence cards, consistent appearance and plot controls | Selected rendered screenshots; not complete accessibility certification |
| Reproducibility | Immutable per-run configuration and explicit interchange boundaries | Legacy runs may lack snapshots; fingerprints are not cryptographic signatures |
| Hosting | Versioned static artifact and CI-gated repository-subpath smoke tests | Workflow supplied, not executed in this environment |

VCell, SimBiology, COPASI, Tellurium, Cell Collective and BioUML remain historical specialist reference context from earlier design documents, not newly benchmarked comparators. FokoLab does **not** claim numerical or feature parity with those packages or with SciPy, SALib, Stan/PyMC, dedicated HPC solvers or full modeling-standard implementations.

The twelve checks in `audit-platform-benchmark.py` are explicitly **structural repository criteria**. See VALIDATION.md for executed behavior and numerical evidence and for unexecuted acceptance checks.
