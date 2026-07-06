# Foko Lab v71.42 — Statistics scientific honesty

Scope: Statistics Lab only. No global chrome/navigation rewrite. No analysis-cockpit layout rewrite.

## Changes

- Reworked `src/labs/statistics.js` so claimed Statistics tasks compute real diagnostics rather than only exposing labels.
- Added core statistical helpers to `src/core/statistics.js`:
  - ROC + precision-recall with AUC / average precision,
  - monotone Benjamini-Hochberg q-values,
  - OLS influence diagnostics and Cook distance,
  - OLS confidence and prediction bands,
  - Kaplan-Meier estimator,
  - two-group log-rank test.
- Corrected A/B test handling: grouped successes and totals are summed and passed to the two-proportion z-test.
- Corrected FDR handling: q-values are monotone adjusted values, not raw `p*m/rank` without backward correction.
- Corrected survival handling: event/censoring is explicit and log-rank is returned when at least two groups exist.
- Corrected classification handling: ROC and precision-recall are both computed from score and binary label columns.
- Corrected regression diagnostics: Cook distance and confidence/prediction bands are computed from OLS residual variance/leverage.
- Result payload now includes interpretation and warnings, especially for small demo datasets.

## Limits

- This is still browser-side exploratory statistics, not a replacement for R, Python statsmodels, survival, or scikit-learn workflows.
- Demo datasets remain deliberately small for responsiveness. They validate workflow and methods, not production statistical power.
- Multiple regression and advanced survival models remain outside this release.

## Validation

- `python3 -m pytest -q tests`
- Node syntax validation for `src/core/statistics.js` and `src/labs/statistics.js`.
- New regression tests in `tests/test_v71_42_statistics_scientific_honesty.py`.
