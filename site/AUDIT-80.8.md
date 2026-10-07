# Plant architecture audit · 80.8

Maize commonly forms about 18 leaves; four visible collars describe an early stage. Multiple harvestable ears are possible, depending on genotype and growing conditions. An ear contains many kernel fruits. Total initiated, emerged, collared and currently living leaf counts are distinct.

## Findings and changes

- The model has no four-leaf cap. A deterministic default 45-day maize check ended with four computational leaf units and effectively exhausted soil nitrogen; supplying water and nitrogen under the same climate produced nine. A warm supplied 90-day thermal-development check produced 17. These are simulation diagnostics, not empirical validation.
- Both views now use the same explicit reproductive-site count. Removed the 2D threshold that drew a second maize ear above 4 g of generic fruit tissue and the 3D one-ear constant. Generic mass compartments are never interpreted as biological ears.
- A selectable 2D organ view draws every modeled leaf or pad unit, with optional unit numbers. Six presets distinguish alternate maize leaves and lateral ears, wheat spikes, sorghum panicles, sunflower heads/branches, agave rosettes/flower clusters, and prickly-pear stem pads/fruit sites. The 3D overview remains available.
- Reproductive-site settings are display assumptions (1–50 for practical drawing), not biological limits or predictions. Existing mass is divided equally among sites, and no reproductive structure appears before its tissue exists. There is no sink competition, pollination, ear-set or tiller-survival model.
- The supplied example now runs 90 days with thermal development, rather than forcing reproduction on day 7. CAM development remains slow and illustrative.
- Corrected the public client's five stage names to the private model's exact stage codes. Previously vegetative growth was labeled emergence and reproductive filling was labeled flowering.
- No change to photosynthesis, growth allocation, carbon, nitrogen or water calculations. Prior continuum classification, assimilation objectives and replicate animation remain intact. Enzyme-specific nitrogen allocation remains queued.

## Verification

Real Canvas checks cover all six forms, multiple reproductive sites in 2D/3D, no 80-unit aggregation, empty vegetative states, stage gating, equal division without input mutation, and removal of the hidden maize mass threshold. Stage labels are checked against the model. Browser checks cover the 90-day run, 17 maize units, two illustrated ears, 2D/3D switching and view controls. Static checks validate local links, unique IDs and JavaScript syntax; private-service parity and resource conservation checks remain in place.

## Sources and limits

- University of Minnesota Extension: https://extension.umn.edu/agriculture/crop-production/corn/growth-and-development
- Purdue University, ear development: https://agry.purdue.edu/ext/corn/news/timeless/Earsize.html
- University of Minnesota Extension, wheat development and tillering: https://extension.umn.edu/agriculture/crop-production/small-grains/spring-wheat-growth-and-development-guide
- Kansas State University, sorghum yield components: https://eupdate.agronomy.ksu.edu/article/grain-sorghum-yield-potential-understanding-the-main-yield-components-406
- NDSU Sunflower Production Guide: https://www.ndsu.edu/agriculture/sites/default/files/2023-12/a1995.pdf
- Kew, agave: https://www.kew.org/plants/mountain-agave
- Kew, prickly pear: https://www.kew.org/plants/prickly-pear

Geometry, equal mass division and site counts are illustrative. Predictive architecture requires calibrated organ initiation, survival and reproductive-sink dynamics; these remain in the scientific work queue.
