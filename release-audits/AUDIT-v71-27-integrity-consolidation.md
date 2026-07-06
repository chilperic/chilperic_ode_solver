# Foko Lab — V71.27 integrity consolidation

Scope: stop the analysis labs from bypassing the tested numeric cores.

Implemented changes:

- Deleted the dead flat engine copies:
  - `src/statistics.js`
  - `src/fitting.js`
  - `src/linalg.js`
  - `src/networks.js`
  - `src/ml-lite.js`
- Retargeted Node/Python tests to `src/core/*`.
- Wired shell analysis labs to the tested core APIs:
  - Statistics → `root.FokoStatistics`
  - Curve fitting → `root.FokoFitting`
  - Linear algebra → `root.FokoLinearAlgebra`
  - Networks → `root.FokoNetworks`
  - ML Toolkit → `root.FokoMLLite`
- Replaced the broken statistics ROC branch with a monotone threshold sweep and AUC calculation.
- Replaced residual-squared labelled as Cook's distance with a simple OLS Cook's distance calculation.
- Fixed the network Sankey branch that referenced the `nodes` function instead of the live node array.
- Added regression tests that prevent dead flat engines, broken ROC syntax, and the Sankey variable bug from returning.

Notes:

- This release is an integrity release, not a new-feature release.
- Some advanced analysis plot modes remain lightweight browser diagnostics. Scientific deepening should proceed one lab at a time after the delivery layer is consolidated.
