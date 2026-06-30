# v23 · Upload readiness audit

This release is a corrective upload-readiness pass after the v22 declutter/FADNS update.

## Corrections

- Symbolic Lab now uses a three-panel wide-screen layout: model editor, plot preview and analysis panels appear together instead of hiding the analysis output below the fold.
- The Symbolic Lab control panel and analysis panel have bounded internal scrolling on desktop, reducing full-page scrolling and missing-panel behavior.
- Plot fallback support is loaded on Symbolic Lab and Agent Lab, so Plotly CDN failure no longer leaves blank plot panels.
- The Plotly fallback now exposes a safe `Plots.resize` no-op to avoid runtime errors after fallback rendering.
- Agent Model Atlas cards now include compact SVG illustrations for all Agent Lab examples.
- FADNS remains represented as Acetyl-CoA, Malonyl-CoA, chain intermediate, C14, C16, C18 and CoA state tracking.

## Remaining limits

- Agent Lab custom code is still prototype-grade and should eventually run inside a Web Worker with timeout control.
- Graph/network agent behavior is not yet a full multilayer social-network engine.
- Symbolic Lab remains browser-light and exports exact symbolic work to SymPy.
- Full visual QA still requires a browser click-through on the deployment target.
