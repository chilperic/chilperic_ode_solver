# Chilperic Dynamics v2.4.6

Browser-only scientific lab for deterministic ODE modeling, stochastic simulation, parameter sweeps, phase portraits, heatmaps, nonlinear optimization, model-atlas exploration, import templates, and reproducibility export.

## Local run

```bash
python3 -m http.server 3000
```

Open `http://localhost:3000`.

## GitHub Pages

Serve from the repository root on the `main` branch.

## Modules

- **ODE Lab**: trajectories, 2D/3D phase portraits, vector fields, Poincaré sections, trajectory matrix, parametric sweeps, and optimization.
- **Stochastic Lab**: blank CTMC/Gillespie model building from states, parameters, propensities, and integer updates, plus branching processes, random walks, SDE examples, finite-population simulations, ensemble diagnostics, and exports.
- **Model Atlas**: curated deterministic and stochastic model cards with schematics, concepts, variables, and links into the appropriate lab.
- **Docs**: usage notes, import formats, export workflow, and modeling boundaries.

## Stochastic Lab

The Stochastic Lab can run curated examples or user-defined CTMC/Gillespie models. For a custom model, use **Blank CTMC**, then add states, parameters, random events, propensities, and per-state integer updates. The lab automatically builds stochastic ensembles and, for CTMC models, a mean-field comparison from the event stoichiometry.

Example CTMC event schema behind the visual editor:

```json
{
  "name": "infection",
  "propensity": "beta*S*I/N",
  "updates": { "S": -1, "I": 1 }
}
```

## Included stochastic examples

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

Use JSON for reliable model interchange. CSV, TXT/ODE, YAML-like files, Python files with embedded `ODE_LAB_CONFIG`, and basic SBML/XML reaction models are supported. Export options include figures, CSV/JSON data, model schemas, and runnable CTMC/Gillespie Python starter workflows, model schemas, and numerical summaries.

## Boundary

Browser solvers are for exploration, teaching, and rapid model inspection. For stiff ODEs, large stochastic ensembles, calibrated inference, or serious constrained nonlinear optimization, export and run locally with SciPy, CasADi, Pyomo, or a specialist stochastic-simulation workflow.

## License

MIT License.
