# Chilperic Dynamics v2.4.8 — ODE Lab UI/plot fix

Fixes applied after manual UI testing:

1. Figure settings no longer keep stale duplicate axes such as `x, x, x` after loading Lorenz or other 3-variable systems.
2. `sectionVar` is kept separate from the 3D z-axis. It is only used for Poincare section crossings.
3. Loading a new ODE example forcibly resets figure axes to the model's natural variable order: x, y, z for Lorenz.
4. The Apply button in figure settings now reads the target side directly from the selector before applying changes.
5. The example dropdown is passive. It updates narrative/status only; Load model performs the actual model load.
6. Load model now gives a visible status message so the action is not silent.
