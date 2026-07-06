# AUDIT v71.29 — Data/Analysis cockpit rebuild

Scope: repair the failed v71.28 analysis-shell visual layer. The screenshots showed raw JSON, generic browser-style buttons, empty/oversized control areas and leakage from the generic descriptor shell. This release rebuilds the public Data/Analysis runtime shell as a focused-lab cockpit while preserving the v71.27 core-engine wiring.

## Changed

- Replaced the public analysis shell layout with a focused-lab cockpit:
  - left control panel,
  - concrete example card,
  - data preview,
  - method card,
  - single main run action,
  - right workspace,
  - status strip,
  - primary plot,
  - diagnostic plot,
  - result cards.
- Removed static hidden contract DOM from Statistics, Fitting, Linear Algebra, Networks and ML pages.
- Removed generic visible shell button leakage (`Run`, `Load template`, `Download config`) from the analysis pages.
- Replaced raw JSON-first output with compact result cards and an `Export / raw result` drawer.
- Preserved the v71.27 integrity consolidation: analysis labs continue to use the tested `src/core/*` engines.
- Retargeted legacy tests away from hidden DOM stubs and toward runtime descriptors / cockpit behavior.

## Validation

- Python tests: `390 passed, 271 skipped`.
- Node core checks: passed.
- JavaScript syntax checks: passed.

## Remaining limits

- Site-wide duplicated navigation is still not single-sourced.
- Manual cache-token stamping remains.
- The analysis labs now have a better cockpit shell, but the deeper scientific honesty pass should still be done lab-by-lab.
- The home page and global navigation simplification remain separate delivery-layer releases.

## Hotfix after runtime audit
- Fixed stale audit note that broke the release-token regression test.
- Fixed cockpit controls becoming non-responsive after legacy action rows were removed before their delayed control initialization.
- Added guarded legacy-control bindings so the public cockpit main action is the active action.
- Marked primary and diagnostic plot slots explicitly to prevent duplicate Plotly target IDs.
- Collapsed raw textareas into edit drawers so concrete examples, previews, plots and result cards dominate the workspace.
