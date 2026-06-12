# Chilperic Dynamics v2.4.1

Browser-only scientific workbench for deterministic ODE modeling, stochastic simulation, parameter sweeps, phase portraits, heatmaps, nonlinear optimization, model-atlas exploration, import templates, and reproducibility export.

## Local run

```bash
python3 -m http.server 3000
```

Open `http://localhost:3000`.

## GitHub Pages

Serve from the repository root on the `main` branch.

## Modules

- **ODE Lab**: trajectories, 2D/3D phase portraits, vector fields, Poincaré sections, trajectory matrix, parametric sweeps, and optimization.
- **Stochastic Lab**: CTMC/Gillespie-style event models, branching processes, random walks, SDE examples, finite-population simulations, ensemble diagnostics, and exports.
- **Model Atlas**: curated deterministic and stochastic model cards with schematics, concepts, variables, and links into the appropriate lab.
- **Docs**: usage notes, import formats, export workflow, and modeling boundaries.

## Stochastic Lab models

- Birth-death process
- Stochastic SIR
- Stochastic gene expression
- Stochastic Michaelis-Menten
- Reduced T-cell proliferation event model
- Galton-Watson branching process
- Gambler’s ruin
- Ehrenfest urn
- Wright-Fisher drift
- Geometric Brownian motion
- Parrondo’s paradox
- Stochastic resonance
- Flashing ratchet / Brownian motor
- Multi-armed bandit
- Secretary / optimal stopping

## Import and export

Use JSON for reliable model interchange. CSV, TXT/ODE, YAML-like files, Python files with embedded `ODE_LAB_CONFIG`, and basic SBML/XML reaction models are supported. Export options include figures, CSV/JSON data, model schemas, and starter Python workflows.

## Boundary

Browser solvers are for exploration, teaching, and rapid model inspection. For stiff ODEs, large stochastic ensembles, calibrated inference, or serious constrained nonlinear optimization, export and run locally with SciPy, CasADi, Pyomo, or a specialist stochastic-simulation workflow.

## License

MIT License.
