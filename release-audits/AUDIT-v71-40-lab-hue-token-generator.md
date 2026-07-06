# V71.40 — Lab hue propagation + plot identity palette + token generator

Scope: grouped low-risk fixes after V71.39 runtime active navigation.

## Implemented

- Restored the requested lab colour family mapping.
- Added cockpit propagation so the lab hue affects functional surfaces, not only decorative headings:
  - active cockpit tab,
  - run button,
  - plot-card top accents,
  - plot-card titles,
  - model/data input headings.
- Added `Lab identity` as a plot-palette option.
- Plot panels now default to the current lab identity palette.
- Added `VERSION.json`.
- Added `scripts/stamp-version.js` for build-time asset-token stamping.
- Added `npm run stamp:version`.
- Stamped the release to `71.43.0`.

## Guardrails

- No global chrome rewrite.
- No header/nav/footer single-source migration.
- No SciML cockpit migration.
- No new scientific labels or fake algorithms.

## Remaining

- CSS is still layered and should be reduced later.
- Single-source chrome remains valid, but only component by component.
- Scientific-honesty upgrades should resume after layout/chrome stability.
