# FokoLab v77.5.0 — explicit limitations

This candidate is an implemented improvement, not a certified public production release.

## Deployment and browser

The GitHub Pages workflow and repository-subpath test are supplied but unexecuted here. Normal HTTP navigation was administratively blocked; npm browser dependency installation failed with DNS resolution. Native worker loading, real persistence, browser downloads, real devices and full E2E await a normal local/CI run. In-memory fixtures demonstrate particular DOM/state behaviors, not origin/security/network behavior. No bypass was used.

## Accessibility and appearance

Keyboard/modal/mobile/doc-reflow behaviors were repaired and selected paths tested. Token-level contrast and static page checks are not WCAG 2.2 AA certification. Real screen-reader use, zoom, every plot/theme/lab and long scientific content still require human testing. Native accessible tables are implemented for Studio results, not promised for all labs. Plotly and mathjs remain large first-load dependencies; no field Core Web Vitals measurements were obtained.

## Computation

Worker cancellation can terminate native Studio work; fallback execution checks cancellation between bounded solves and cannot interrupt the middle of a synchronous solve. Step and run budgets deliberately reject excessive workloads. RK45 is not a universal stiff or high-dimensional solver. Solver tolerances are local error controls, not global accuracy guarantees. Dimensions/units are labels, not automatically verified dimensional analysis.

## Interchange and provenance

SBML is a strict documented subset and rejects unimplemented semantics; full SBML/SED-ML/COMBINE conformance is not provided. Model IR can include a Foko experiment envelope; external model-only tools may drop it. Historical runs imported from old projects may lack replayable snapshots and are labelled legacy. The FNV1a64 configuration fingerprint is noncryptographic and not tamper-proof. Native export artifacts were inspected through captured content in fixtures; actual browser downloading must be checked in E2E.

## Storage and privacy

Local saving is device/browser-specific and not a backup or account synchronization. Storage-denied mode uses memory only. Export projects before leaving or clearing browser data. Core computations are browser-side; optional SciPy/Pyodide verification fetches runtime/packages, so first-use offline completeness is not claimed. Hosting may create access logs. No authentication backend, collaboration database, secure cloud vault or universal offline guarantee was added.

## Scientific scope

Catalogue integrity and numerical references do not validate the empirical appropriateness of every model. FADNS, T-cell and plant examples retain their stated scope. The protected photosynthesis C3–C4 integration remains non-runnable until its documented scientific prerequisites are met. No clinical predictions, full scientific validity of arbitrary equations, or feature parity with specialist research packages is claimed.

### Studio equation grammar

The shared Studio executor accepts scalar mathematical expressions and a bounded function allowlist (trigonometric functions, exp/log/sqrt/abs/min/max/pow/floor/ceil/round). Assignment, object access and arbitrary code are rejected. Expression text is limited to 5,000 characters per equation. This is not the full mathjs language. A rejected user expression must be rewritten within the supported subset rather than silently approximated.
