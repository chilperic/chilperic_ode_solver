# Foko Lab v70.13 — Header logic audit and correction

## Diagnosis
The v70.11/v70.12 header still behaved like a chronological accumulation of features. At desktop width it exposed too many peer-level objects:
Home, Workbench, SciML, Model Atlas, Beauty, Data / Model Analysis, Research Hub, Documentation and Tutorial.
The result was predictable: wrapping, ambiguous hierarchy, and the impression that new modules were merely appended.

## Product logic used for the correction
The header is now organized by user intent, not by implementation history:

1. **Home** — landing page.
2. **Modeling** — build and run mechanistic / stochastic / optimization / symbolic / agent models.
3. **SciML** — inverse problems, SINDy, surrogates and small-data ML.
4. **Data / Analysis** — statistics, fitting, linear algebra and networks.
5. **Explore** — Model Atlas, Mathematical Beauty and Research Hub.
6. **Learn** — documentation, tutorial, contact and acknowledgement.

## Correction applied
- Replaced the static header markup across all top-level HTML pages, not only runtime JS injection.
- Kept `navigation.js` as a normalizer, but the first rendered HTML is now coherent even before JS finishes.
- Preserved the existing test contracts where they still reflect needed behavior: Workbench content, analysis content, visible dropdown links, SciML grouping and active-state sync.
- Added a v70.13 regression test checking that the header is no longer a flat list of labs.

## Remaining architectural issue
The platform still uses static HTML page shells. A stronger v71 architecture should generate the header/footer from a single template during build time, instead of copying the header into each HTML file.
