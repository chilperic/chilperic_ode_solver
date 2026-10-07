# 80.10 — leaf appearance and growth in all three plant panels

## Faults reproduced and corrected

The previous default counted consecutive fixed-size biomass units as leaves. A partly built unit had to finish before the next began. That display convention produced four maize units in the 45-day reference run; it was not a biological four-leaf limit. The default now uses the existing thermal appearance model, with simultaneous resource-limited expansion. The former allocation mode remains explicitly labelled as legacy biomass units.

Established CAM plants were incorrectly initialized before emergence when a development-time multiplier exceeded one. This disabled assimilation and depleted existing tissue in the warm example. Every established pathway now starts emerged on its own clock. Sown plants still start from seed reserves. Existing leaves no longer create an additional appearance opportunity immediately at time zero.

The reported formed count now excludes empty leaf positions. Both views and the panel readouts use the same threshold for drawable tissue. Appearance opportunities, living organs and organs reaching 99% of target size are distinguished. Biomass, change since the start, recent change and the current construction limitation are shown in every panel. A stopped growth trajectory is not replaced with artificial biomass.

2D stem elongation now follows stem mass, with leaf insertion points on the shoot and fixed leaf ranks across the run. 3D leaf dimensions respond to the configured target area, and early shoots end above their existing leaves instead of extending through future empty positions. The numbering control works in both views, allowing overlapping organs to be inspected. Three-dimensional view remains the default; two-dimensional view remains available. The warm example preserves the user's species selections.

## Verified example

For the warm, supplied 90-day example opened from the Düsseldorf default setup: mean temperature 25 °C, 12-hour light period, initial soil nitrogen 3,000 mg, 300 mg nitrogen every seven days, threshold irrigation, and ten grams of initial structural dry mass. These are exploratory settings, not cultivation advice or fitted species predictions.

| Panel | Initial organs | Final living organs | Final dry mass |
|---|---:|---:|---:|
| C3 sunflower | 2 | 16 | 202.74 g |
| C4 maize | 2 | 16 | 162.01 g |
| CAM agave | 4 | 6 | 15.90 g |

The default cool 45-day experiment can still remain small because its initial nitrogen is finite and development is slow. The panel explicitly identifies limited construction. CAM's editable multiplier of 15 slows appearance; it is not a universal property of CAM plants. Flowering stops further appearance in this simplified model, even when the numeric leaf ceiling is disabled.

## Evidence and verification

Temperature-dependent leaf appearance is supported by field observations, with appearance distinct from initiation and expansion: https://pmc.ncbi.nlm.nih.gov/articles/PMC4247088/ . These observations motivate the model structure; they do not calibrate all 15 species.

The growth regression suite covers established and sown initial states, the supported development multipliers, appearance intervals, concurrent expansion, more than ten maize leaves, increasing tissue and rendered area in the warm example, 2D/3D organ counts, stem attachments, numbered organs and playback interpolation. Nitrogen-free runs cannot gain structural biomass. Carbon, water and nitrogen residuals stay below 1e-8 in the tested default, supplied, limited and sown scenarios. These are numerical and implementation checks, not biological validation.

The architecture suite retains all 15 forms, 120-organ stress cases, connected prickly-pear pads and soil availability cues. The integration check compares the service with the current engine; it is not an independent historical-baseline validation. Public assets contain presentation code; scientific implementation remains in the private service.

## Continuing scientific queue

Enzyme-specific nitrogen allocation remains the next separate task: enzyme molecular nitrogen costs, abundance-to-capacity conversion and temperature-dependent kinetics require explicit parameters and evidence. Species-specific leaf initiation, expansion, senescence, tillering and reproductive set remain calibration work. The broader evolution objective, intermediates, feasible regions and replicate/mean-trajectory requirements are retained; this release addresses the plant growth complaint.
