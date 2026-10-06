# Mechanistic evolution across the C3–C4 continuum

This directory describes the public FokoLab interface for the plant research project.

## Scientific question

Starting from plausible C3-like populations, which combinations and sequences of anatomical, photorespiratory, biochemical, hydraulic and resource-allocation changes are physiologically viable and evolutionarily accessible under different environments?

The project deliberately separates three layers:

1. **Physiology** — carbon, heat, water, resource and anatomical constraints determine whether a phenotype is physically and biologically admissible.
2. **Landscape analysis** — grids, CMA-ES, NSGA-II and sensitivity methods identify high-performing regions and trade-offs.
3. **Evolution** — only a finite-population model with inheritance, heritable variation, selection and drift is interpreted as biological evolution.

C2 photosynthesis is not forced as a mandatory stage. It is included when the glycine/GDC photorespiratory pump is represented and its carbon/nitrogen consequences can be evaluated.

## Hydraulics

Water temperature is part of the hydraulic model because ideal conduit conductance depends on water viscosity. That physical correction is kept separate from pit resistance, conduit connectivity, outside-xylem resistance, aquaporins and vulnerability/embolism. A viscosity correction alone is not a whole-plant hydraulic model.

## Parameter provenance

Every public parameter should carry one status: measured, literature anchor, calibrated, derived, assumed, scenario, or missing. Missing values are not silently replaced by defaults for quantitative claims.

## Collaboration

- **Dr. Chilperic Armel Foko Kuate** — project leadership, research integration and core modelling architecture.
- **Jérémie Muller-Prokob** — main scientific and technical collaborator.
- **Yvonne Danisch** — main collaborator; substantial bachelor-thesis implementation, model execution, validation and analysis.
- **Antonio Rigueiro** — research collaborator and paper-level contributor.
- **Jonas Brass** — research collaborator; hydraulic-model discussions including water-temperature effects.
- **Martin J. Lercher** — PI supervision and research environment.

Specific publication authorship and software ownership are stated with the corresponding output.

## Public boundary

The browser presentation is not the unpublished scientific source repository. Historical figures are retained only with their method/provenance labels. Optimizer paths must not be called evolutionary trajectories, and assimilation must not be called reproductive fitness without an explicit mapping.
