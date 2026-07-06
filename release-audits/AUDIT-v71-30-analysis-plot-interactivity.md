# AUDIT v71.30 — Analysis plot interactivity repair

Scope: Data/Analysis cockpit behavior after the v71.29 rebuild.

Findings from user screenshots:
- The cockpit was visually closer to the focused labs, but still felt static.
- Plot selection lived in the left control panel instead of directly above the plot area.
- Changing a plot mode did not clearly redraw the primary and diagnostic plots.
- The UI did not show an explicit running state, so slow or delayed work looked like a dead page.

Changes:
- Added primary and diagnostic plot dropdowns directly above the two plot cards.
- Hid the duplicate left-panel plot selector after cloning its options into the plot toolbar.
- Added automatic recompute/redraw on control and plot changes.
- Added explicit Running / Computed / Error state handling.
- Added temporary plot placeholders while computation is running.

Limits:
- This is a cockpit interactivity repair, not a scientific-depth release.
- Some advanced plot modes remain lightweight browser diagnostics until their dedicated engine upgrades.
- Site-wide delivery-layer issues remain separate: single-source navigation, generated cache tokens, theme reduction and CSS consolidation.
