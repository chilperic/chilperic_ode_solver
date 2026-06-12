# v2.4.1 interface cleanup audit

## Problem found
The stochastic page still contained defensive implementation copy left over from earlier additive builds. Examples included phrases such as “legacy ODE Lab is untouched”, “atlas-only gallery”, and “compatibility rule”. These are internal development constraints, not user-facing product language.

## Changes made
- Removed the bottom “Implementation rule” card from `stochastic.html`.
- Rewrote the Stochastic Lab hero text to describe the user task directly.
- Rewrote the Stochastic Lab documentation section without defensive compatibility language.
- Updated the README to describe the current two-lab architecture cleanly.
- Removed stale CSS comments and unused roadmap styling.
- Removed obsolete v2.3.1 stochastic layout CSS that was no longer used by the v2.4 workbench.
- Moved historical audit files to `docs/audits/` so the project root is cleaner.
- Bumped stylesheet/script cache query strings to v2.4.1.

## Product language rule
User-facing pages should describe capabilities, workflows, and boundaries. They should not describe internal migration safety, legacy-preservation decisions, or roadmap history unless the user is reading an audit or changelog.

## Remaining boundary
Scientific uses of “noise” remain where technically meaningful, for example stochastic resonance, multiplicative noise, and finite-population fluctuation. Those are model concepts, not interface clutter.
