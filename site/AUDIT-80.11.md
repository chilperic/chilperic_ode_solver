# 80.11 — shared 2D/3D evolution landscape

The default mechanism map now uses a rectangle: the horizontal coordinate is the share of total Rubisco capacity located in the bundle sheath, and the vertical coordinate is the PEPC capacity allocation. This separates pump allocation from Rubisco location without requiring readers to interpret an oblique triangle. It is a coordinate transformation, not a new biological domain or an enlargement of C3 probabilities. At 100% PEPC there is no Rubisco, so its location is undefined; that boundary is marked explicitly. The classic allocation triangle and allocation plane remain optional.

The 2D map and rotatable 3D surface share the current origin–fixation experiment records. Dimension switches, camera movement, color selection and height selection do not rerun the experiment or change its biological clock. Height can show mean assimilation, daylight assimilation, objective score, carbon, water or heat. Colors can show a separate metric or mechanism class. Axis labels, units, numeric scales, directional arrows and infeasible-region hatching accompany the display. The camera supports dragging, arrow keys and Home/reset.

All current observed replicate residents appear simultaneously. Individual trails end at the selected biological time, and no future accepted substitutions are shown. The dashed mean trajectory and diamond summarize replicate values. Mean performance is averaged after evaluating individual physiology; it is not physiology evaluated at mean traits. Coincident dots use short leader lines. Runs censored by the substitution cap are excluded after their last observation. The selected run and playback time persist across dimension changes.

## Scientific interpretation

The background is conditional on the displayed stomatal conductance and GDC localization. Each trajectory retains its own recorded trait and performance values, so it need not lie on that fixed slice. Surface values use barycentric interpolation within the original feasible allocation grid; cells touching unavailable samples remain masked. Mechanism colors use the nearest contributing classified sample. This is a display approximation whose precision depends on the physiological grid, not an additional physiology solve. Local arrows indicate increasing conditional objective score, not mutation probabilities or predicted evolutionary paths. Region area on the transformed map is not an evolutionary probability.

No physiology, objective, classification thresholds, mutation sampling or fixation calculations changed in this release. Allocation still denotes catalytic capacity, not enzyme abundance or nitrogen share. Equations remain out of the interface, and the scientific implementation remains in the private service.

## Verification

The new regression suite renders 24 combinations of dimension, coordinate view, coloring and canvas width from real simulated data. It verifies allocation-coordinate round trips, interpolation and feasibility holes, unchanged records across dimensions, all 40 test residents, exact mean output, event-time filtering, censor exclusion and keyboard camera controls. The existing science suite checks 400 replicates across warm and cool conditions. Browser verification runs the default 200-replicate experiment through the service and checks playback, dimension switches, metric and height selection, and camera controls.

## Continuing queue

The enzyme-specific nitrogen budget remains a separate scientific task, requiring molecular nitrogen costs, abundance-to-capacity conversion and temperature-dependent kinetics. Species-specific growth calibration remains on the existing queue. The earlier 3D plant view, optional 2D plant view, leaf-appearance fixes, connected prickly-pear architecture and soil availability animations are retained.
