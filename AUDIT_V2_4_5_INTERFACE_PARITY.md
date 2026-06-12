# Chilperic Dynamics v2.4.5 — Interface parity fix

Focus: make Stochastic Lab visibly follow the same model-building scaffold as the ODE Lab.

Applied changes:

- Stochastic model library now has always-visible core template chips, independent of the family filter.
- Additional stochastic examples are moved into a collapsed section, matching the ODE Lab pattern of visible core examples plus expanded library.
- The always-visible core set is restricted to editable CTMC/Gillespie templates and includes a blank custom CTMC chip.
- CTMC presets expose a prominent “Customize this example” action in the title card, not only inside the model editor.
- Custom CTMC restore is similarly visible from the title card.
- Cache strings bumped to v2.4.5.

Design intent:

ODE Lab: choose a close equation template, inspect the live equation, modify it.

Stochastic Lab: choose a close event-process template, inspect the reaction preview, modify states, propensities, and jumps.
