# Chilperic ODE v2.2.2 — Model Atlas image integration

## Scope
This patch integrates visual images into the Model Atlas instead of relying only on inline SVG sketches.

## Changes
- Added atlas image assets under `assets/model-atlas/`.
- Replaced the main atlas schematics for key examples with image previews.
- Used extracted PhD defense slide schemes for the two PhD research models:
  - minimal fatty-acid metabolism model
  - refined FADNS model with CoA sequestration
- Used designed visual cards for the main teaching/core models:
  - Lotka–Volterra
  - Lorenz
  - SIR/SEIR
  - Michaelis–Menten
  - Van der Pol
  - Calvin cycle
  - Romeo–Juliet love/hate oscillator
  - Braess routing
- Kept non-image optimization/paradox cards as clean inline schematics where image generation would add visual noise.

## Design decision
The generated images are used only as visual previews inside the Model Atlas. They are not used inside the workbench itself, so solver performance and Plotly rendering are unaffected.

## Performance
Images were converted to compressed WebP files and lazy-loaded.

## Manual caution
Generated images may contain decorative text. For equations and authoritative model definitions, the workbench equations and documentation remain the source of truth.
