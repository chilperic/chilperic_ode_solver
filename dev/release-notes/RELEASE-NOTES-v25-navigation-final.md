# v25 navigation final

Purpose: fix the public/main navigation so every lab is visible from the main site link, not only the older core labs.

Changes:
- Primary navigation retained the full lab list on every top-level page.
- Mobile/smaller viewport behavior no longer hides `.topnav`; it becomes a horizontal scrollable nav instead.
- Home module grid now includes Workbench Beta and Model Atlas in addition to ODE, Optimization, Steady-State, Stochastic, Symbolic, Agent and Math Beauty.
- CSS cache version bumped to `platform-v25-nav`.

Manual check before upload:
1. Open `index.html`.
2. Confirm top navigation shows: Home, Workbench Beta, ODE Lab, Optimization Lab, Steady-State Lab, Stochastic Lab, Symbolic Lab, Agent Lab, Math Beauty, Model Atlas, Research Hub, Platform, Docs, Tutorial.
3. Resize the browser below 900 px and confirm the same nav is horizontally scrollable, not removed.
