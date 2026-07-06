# V71.34 — Dashboard ratio and LaTeX visibility hotfix

Purpose: repair the V71.33 Data/Analysis dashboard where the three-panel workspace was horizontally clipped inside the old `analysis-page` max-width and where model/LaTeX input was placed too low in the left rail.

Changes:
- Force analysis cockpit pages to use the full viewport width.
- Hide the old compact analysis hero on cockpit pages.
- Rebalance the dashboard ratio: left input rail plus wider plot workspace.
- Make the three-panel plot grid responsive: three columns on wide desktop, two columns on medium screens, one column on small screens.
- Move Model / Data Input above legacy analysis controls in the left rail.
- Seed a useful default formula per lab so the LaTeX preview is visible on load.
- Preserve upload, paste input, formula input, plot palette controls and reproducibility actions.

Limit: this is a layout/input visibility repair. It does not implement the next scientific-honesty engine upgrades.
