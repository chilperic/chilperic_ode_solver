# v32 — clean dropdown rebuild from v26

Rebuilt the public navigation from the v26 code line, removing the noisy v27/v28/v30/v31 navigation experiments.

## Navigation

- Public header is now: Home, Labs, Docs, Tutorial, Acknowledgement, Contact.
- Labs is a real dropdown in the header, not a floating bottom bar and not an expanded text strip.
- Labs contains Workbench, ODE Lab, Optimization Lab, Steady-State Lab, Stochastic Lab, Symbolic Lab, Agent Lab, Model Atlas, Math Beauty, Research Hub and Platform.

## Noise removal

- Removed duplicated Workbench/lab-strip presentation from the header layer.
- Removed concatenated model-label blocks from navigation-facing UI.
- Kept Workbench as the main modelling surface and Model Atlas as the discovery surface.

## v26 fixes preserved

- Model contract and validation helpers.
- ODE worker recovery patch.
- Symbolic Lab session-import receiver patch.
- Steady-State fixes and Python export.
