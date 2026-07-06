# AUDIT v71.0 — platform-standard foundation

## Scope

The user asked to implement the full V71 set of leverage points. Implementing all 20 points as fully mature scientific features in one pass would be unsafe: some require substantial solvers, browser workers, data persistence, and new UI contracts. This release therefore implements the platform-wide foundation and browser-feasible pieces while marking heavyweight algorithms as next-stage work.

## Implemented foundation

1. Cache token normalized to `?v=71.46.0`.
2. `src/fokokit.js` introduced as shared platform kit.
3. Shared guards exposed: `requireMatrix`, `requireSquare`, `requireVector`, `requireSameLength`, `requirePositiveInt`, `requireInRange`, `requireEdges`, `requirePairs`.
4. Shared result formatter: `FokoKit.formatResult`.
5. Seeded PRNG: `FokoKit.seededRandom`.
6. URL hash state encode/decode.
7. Local session save/load controls.
8. Run bundle export through `FokoKit.toReproConfig`.
9. Plot export hooks for SVG/PNG.
10. Command palette with `/`.
11. Accessibility hooks: focus-visible and aria-live for result panels.
12. Upload/validation helper for data-oriented labs.
13. Experimental-data overlay panel on Workbench with handoff to Fitting Lab.
14. Live range-slider rerun hook.
15. Shared Web Worker skeleton: `src/v71-worker.js`.
16. Versioned model registry in `models/registry/`.
17. `CITATION.cff`.
18. Release history entry.
19. Scientific helper modules for stochastic tau-leaping/SDE, basin maps, continuation classification and dynamical fitting.
20. Tests for the V71 contracts.

## Scientific modules added

- `src/stochastic-advanced.js`: tau-leaping, Euler–Maruyama, ensemble quantile bands.
- `src/dynamical-fitting.js`: Levenberg–Marquardt-style nonlinear least squares and parameter confidence intervals.
- `src/continuation-analysis.js`: simple fold/Hopf classification from eigenvalue crossings.
- `src/basin-analysis.js`: initial-condition basin-map core.
- `models/registry.json` and curated ODE JSON examples.

## Not fully complete

These are not honestly "done" as research-grade features:

- Full Web Worker migration for every heavy solver.
- Real DAE/DDE/event root-finding solvers.
- Full ODE-parameter fitting integrated into the Workbench plot pipeline.
- Full Pyodide / ONNX / TensorFlow.js stack.
- Large-scale graph analytics.
- Real SBML parser.
- Full Playwright end-to-end CI.

## Rationale

The release turns the platform from a set of pages into a platform substrate: state, reproducibility, shared kit, registry, command palette, plot export, seeded randomness and extension modules. The next release should wire these foundations deeper into Workbench internals rather than adding more surface UI.
