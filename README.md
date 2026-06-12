# Chilperic ODE v2.0-stable

Browser-only scientific workbench for ODE solving, parametric sweeps, phase portraits, heatmaps, nonlinear optimization, import templates, and Python export.

## Local run

```bash
python3 -m http.server 3000
```

Open `http://localhost:3000`.

## GitHub Pages

Serve from the repository root on the `main` branch.

## Modules

- ODE solver: trajectories, 2D/3D phase portraits, vector fields, Poincaré sections, trajectory matrix.
- Parametric ODE: default run plus parameter sweep plots.
- Optimization: constrained nonlinear optimization exploration with SciPy/CasADi/Pyomo export.

## Boundary

Browser solvers are for exploration. For stiff ODEs or serious constrained nonlinear optimization, export Python and run locally.


## Example guide

The app includes a dedicated `examples.html` page with model descriptions, author attributions, and notes on how each example should be explored.


## v2.1.8 notes

- Added experimental lightweight SBML/XML import for reaction-network models with MathML kinetic laws.
- Replaced the FADNS PhD example with the refined CoA-sequestration model.
- Added Lasso, Runge, and Secretary problem teaching examples in the optimization/example guide.
- Added plot safeguards for high-dimensional models so heavy plots show key variables rather than overwhelming the browser.

## v2.1.9 stability and identity patch

- Run / Sweep / Cancel controls are now sticky in the left work panel so users do not need to scroll to execute the model.
- Plot rendering now recreates the Plotly node before each draw, which prevents Chrome from keeping invisible zero-size SVG containers after model switches.
- Plot containers receive repeated resize passes after rendering and after window/theme changes.
- The logo was redesigned to represent dynamical systems, molecular/metabolic modeling, and optimization as a single scientific identity.


## Model Atlas

The app includes a dedicated `examples.html` Model Atlas with visual schematics, author/inspiration notes, variables, and guided exploration suggestions for each built-in model.
