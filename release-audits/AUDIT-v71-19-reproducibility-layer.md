# V71.19 — Reproducibility layer

## Scope
This release groups one platform concern: session persistence, URL-state persistence and bundle import/export.

## Implemented
- Compact reproducibility controls on pages that load the V71 platform layer.
- Save session to localStorage and sessionStorage.
- Restore session from saved browser state.
- Debounced auto-persistence on input/change events.
- Shareable URL state using the existing FokoKit encoder.
- Full JSON bundle export with schema, release, page, form state, visible outputs and timestamp.
- Bundle import with schema validation and field restoration.
- Public `window.FokoRepro` API for tests and future shell integration.
- Documentation/tutorial section explaining how to use the layer.

## Preserved
- Focused Labs remain real pages: ODE, Stochastic, Optimization and Steady-State.
- Descriptor-shell analysis labs remain intact.
- No solver algorithms were changed in this release.

## Known limits
- The bundle records form state and visible textual outputs, not large binary files or complete Plotly internal state.
- URL state can become long for very large pasted datasets; bundle export is the safer archival route.
- This is browser-local reproducibility, not a server-backed collaborative history.
