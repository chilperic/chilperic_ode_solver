# V71.33 — faithful analysis dashboard implementation

Scope: implement the approved Data/Analysis dashboard concept inside the latest V71.32 package without changing the focused modeling labs.

Changes:
- Rebuilt the analysis shell around a practical model/data input rail and a wide three-panel workspace.
- Added a visible paste area for user data/model input.
- Added a functional upload drop zone accepting CSV, TSV, JSON, TXT, YAML/YML, DAT, EDGES and MATRIX text-like files.
- Added a visible model/formula editor with live LaTeX preview.
- Kept plot selectors, palette selectors and panel size controls in each plot header.
- Added compact top status/action chips with functional session controls wired to the reproducibility layer.
- Moved generic raw output under the results area instead of dominating the workspace.
- Preserved core-engine wiring and all focused modeling labs.

Limits:
- XLSX is not advertised as parsed because the browser package has no spreadsheet parser dependency.
- User-defined formulas are rendered and stored; full custom nonlinear estimation remains a separate fitting-engine task.
