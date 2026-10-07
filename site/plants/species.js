/* Literature-backed identities and illustrative form; no fitted species kinetics. */
(function(root){'use strict';
const catalog={
  "wheat": {
    "pathway": "C3",
    "name": "Wheat",
    "scientificName": "Triticum aestivum",
    "physiologyReference": "wheat",
    "layout": "tillers",
    "sites": "spikes",
    "note": "Narrow blades on shoots and tillers; a fertile shoot ends in a spike.",
    "source": "https://pubmed.ncbi.nlm.nih.gov/22734462/",
    "unit": "leaf units"
  },
  "sunflower": {
    "pathway": "C3",
    "name": "Sunflower",
    "scientificName": "Helianthus annuus",
    "physiologyReference": "sunflower",
    "layout": "branches",
    "sites": "heads",
    "note": "Broad leaves and composite flower heads; branching varies among forms.",
    "source": "https://www.ndsu.edu/agriculture/sites/default/files/2023-12/a1995.pdf",
    "unit": "leaf units"
  },
  "rice": {
    "pathway": "C3",
    "name": "Rice",
    "scientificName": "Oryza sativa",
    "physiologyReference": "wheat",
    "layout": "tillers",
    "sites": "panicles",
    "note": "Narrow leaves on tillers with branching, drooping grain panicles.",
    "source": "https://pubmed.ncbi.nlm.nih.gov/22734462/",
    "unit": "leaf units"
  },
  "soybean": {
    "pathway": "C3",
    "name": "Soybean",
    "scientificName": "Glycine max",
    "physiologyReference": "sunflower",
    "layout": "trifoliate",
    "sites": "pod sites",
    "note": "A mature compound leaf has three leaflets; one simulated unit is drawn as a leaflet group. Biological nitrogen fixation is not represented.",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10655586/",
    "unit": "compound-leaf units"
  },
  "arabidopsis": {
    "pathway": "C3",
    "name": "Arabidopsis",
    "scientificName": "Arabidopsis thaliana",
    "physiologyReference": "sunflower",
    "layout": "basal",
    "sites": "silique sites",
    "note": "Basal leaf rosette and a bolting flowering stalk with slender seed pods (siliques).",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12897691/",
    "unit": "leaf units"
  },
  "maize": {
    "pathway": "C4",
    "name": "Maize",
    "scientificName": "Zea mays",
    "physiologyReference": "maize",
    "layout": "alternate",
    "sites": "ears",
    "note": "Alternate blades, a terminal male tassel and lateral ears. An ear contains many kernels.",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9291162/",
    "unit": "leaf units"
  },
  "sorghum": {
    "pathway": "C4",
    "name": "Sorghum",
    "scientificName": "Sorghum bicolor",
    "physiologyReference": "sorghum",
    "layout": "tillers",
    "sites": "panicles",
    "note": "Alternate blades and terminal panicles; tillering depends on genotype and conditions.",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9291162/",
    "unit": "leaf units"
  },
  "sugarcane": {
    "pathway": "C4",
    "name": "Sugarcane",
    "scientificName": "Saccharum spp. hybrids",
    "physiologyReference": "maize",
    "layout": "cane",
    "sites": "plumes",
    "note": "Jointed cane stems with long arching leaves and a terminal flowering plume. Harvestable cane is stem tissue.",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9291162/",
    "unit": "leaf units"
  },
  "flaveria": {
    "pathway": "C4",
    "name": "Flaveria bidentis",
    "scientificName": "Flaveria bidentis",
    "physiologyReference": "sorghum",
    "layout": "opposite",
    "sites": "flower clusters",
    "note": "Opposite leaves on branched stems and small yellow flower heads. Other Flaveria species can be C3 or intermediate.",
    "source": "https://elifesciences.org/articles/02478",
    "unit": "leaf units"
  },
  "millet": {
    "pathway": "C4",
    "name": "Pearl millet",
    "scientificName": "Cenchrus americanus (syn. Pennisetum glaucum)",
    "physiologyReference": "sorghum",
    "layout": "tillers",
    "sites": "panicles",
    "note": "Long blades on tillers and dense, cylindrical terminal panicles.",
    "source": "https://doi.org/10.1016/0168-9452(88)90190-2",
    "unit": "leaf units"
  },
  "agave": {
    "pathway": "CAM",
    "name": "Agave",
    "scientificName": "Agave americana",
    "physiologyReference": "agave",
    "layout": "rosette",
    "sites": "flower clusters",
    "note": "Thick pointed leaves in a basal rosette; a tall flowering stalk appears late in life. Flowering age is not calibrated.",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6883261/",
    "unit": "leaf units"
  },
  "opuntia": {
    "pathway": "CAM",
    "name": "Prickly pear",
    "scientificName": "Opuntia ficus-indica",
    "physiologyReference": "opuntia",
    "layout": "pads",
    "sites": "fruit sites",
    "note": "Pads are flattened stems (cladodes), not leaves. Daughter pads join parent pads; fruit forms at pad areoles.",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10799983/",
    "unit": "pad units"
  },
  "pineapple": {
    "pathway": "CAM",
    "name": "Pineapple",
    "scientificName": "Ananas comosus",
    "physiologyReference": "agave",
    "layout": "rosette",
    "sites": "fruiting shoots",
    "note": "Narrow rosette leaves and a crowned multiple fruit on each illustrated shoot. Extra sites represent additional shoots.",
    "source": "https://www.nature.com/articles/ng.3435",
    "unit": "leaf units"
  },
  "aloe": {
    "pathway": "CAM",
    "name": "Aloe vera",
    "scientificName": "Aloe vera",
    "physiologyReference": "agave",
    "layout": "rosette",
    "sites": "flower clusters",
    "note": "Tapered succulent leaves with toothed margins and tubular flowers on an upright stalk.",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC166772/",
    "unit": "leaf units"
  },
  "kalanchoe": {
    "pathway": "CAM",
    "name": "Kalanchoe",
    "scientificName": "Kalanchoe fedtschenkoi",
    "physiologyReference": "opuntia",
    "layout": "opposite",
    "sites": "flower clusters",
    "note": "Opposite fleshy, scalloped leaves and hanging tubular flowers.",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12897691/",
    "unit": "leaf units"
  }
};
const api={catalog,get:key=>catalog[key],list:pathway=>Object.entries(catalog).filter(([,s])=>s.pathway===pathway).map(([id,s])=>({id,...s}))};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PlantSpecies=api;
})(globalThis);
