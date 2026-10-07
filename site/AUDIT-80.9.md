# 80.9 — connected plant forms and soil availability

## Corrected

- Replaced independent prickly-pear pad grids with one persistent parent–daughter graph shared by both renderers. Daughter bases lie on parent pad surfaces. A visible neck joins each attachment. Unequal growth and loss do not detach daughters; depleted ancestors have brown structural supports, not invented green biomass. Branch order and modest form variation are deterministic.
- Restored soil water and available nitrogen in 2D and 3D. Blue water drops and amber nitrogen dots change density with the current resource pools and move within the soil during playback. These are availability cues, not molecular trajectories, spatial concentrations, a water table or estimated uptake fluxes. Gauges retain the actual mm and mg values. Water bars use configured soil capacity; nitrogen bars use initial available nitrogen (bars saturate above that reference; numeric values remain uncapped). At zero availability there are no symbols for that resource.
- Expanded to five explicit species/forms per pathway, with in-page references: C3 wheat, sunflower, rice, soybean and Arabidopsis; C4 maize, sorghum, sugarcane, Flaveria bidentis and pearl millet; CAM Agave americana, Opuntia ficus-indica, pineapple, Aloe vera and Kalanchoe fedtschenkoi.
- Added compound-leaf, basal-rosette, cane, opposite-leaf and succulent forms; panicle, plume, pod, silique and crowned pineapple illustrations. Fixed the circulation demonstration override leaking into the selected growth species.
- Species are validated against their pathway on the server. Existing six preset coefficients remain unchanged. New forms reference an existing illustrative numerical preset and disclose that reference beside the plant. Species identity is evidence-backed; species-specific growth kinetics, flowering age and yield are not calibrated. Soybean nitrogen fixation is not implemented.

## Evidence and limits

Opuntia developmental CAM and cladodes: https://pmc.ncbi.nlm.nih.gov/articles/PMC10799983/ . Flaveria pathway diversity: https://elifesciences.org/articles/02478 . Maize/sorghum/sugarcane photosynthesis: https://pmc.ncbi.nlm.nih.gov/articles/PMC9291162/ . Pearl millet: https://doi.org/10.1016/0168-9452(88)90190-2 . Rice/wheat: https://pubmed.ncbi.nlm.nih.gov/22734462/ . Soybean: https://pmc.ncbi.nlm.nih.gov/articles/PMC10655586/ . Pineapple: https://www.nature.com/articles/ng.3435 . Agave: https://pmc.ncbi.nlm.nih.gov/articles/PMC6883261/ . Aloe: https://pmc.ncbi.nlm.nih.gov/articles/PMC166772/ . Kalanchoe and the Arabidopsis contrast: https://pmc.ncbi.nlm.nih.gov/articles/PMC12897691/ . Botanical descriptions and existing sunflower references are linked in the interface.

Geometry, leaf-unit counts and user-selected reproductive-site counts remain illustrations. Reproductive mass is divided equally, not generated or interpreted as measured fruit counts. Multi-site pineapple denotes several fruiting shoots. The numerical model does not predict a detailed branch graph, nitrogen fixation, organ abortion or cultivar phenology.

## Verification

The architecture gate covers all 15 species in both renderers, 120-unit cases, reproductive mass preservation, stage gating, invalid pathway/species rejection, persistent pad attachments under unequal and zero mass, and soil symbols under high, low and exhausted pools. Availability animation is reproducible at a fixed simulation time. Integration and production-build gates protect lab wiring and the public/private implementation boundary.
