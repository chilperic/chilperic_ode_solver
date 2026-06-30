# Foko Lab v2.7.4

Foko Lab is a browser-native modeling environment for interactive scientific exploration across four labs:

- **ODE Lab** — deterministic ODEs, trajectories, phase portraits, parameter sweeps and reproducible exports.
- **Optimization Lab** — educational constrained and unconstrained optimization with diagnostics and export.
- **Steady-State / Algebraic Lab** — systems of equations, residuals, local Jacobian classification and continuation.
- **Stochastic Lab** — CTMC/Gillespie simulation, ensembles, mean-field overlays and stochastic examples.

The root page is now a product homepage. The ODE lab is available at `ode.html`.

## Local use

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/index.html?v=271
http://localhost:8000/ode.html?v=271
http://localhost:8000/optimization.html?v=271
http://localhost:8000/steady.html?v=271
http://localhost:8000/stochastic.html?v=271
http://localhost:8000/examples.html?v=271
http://localhost:8000/docs.html?v=271
http://localhost:8000/tutorial.html?v=271
```

## Notes

Foko Lab is intended for education, exploration and rapid prototyping. For stiff ODEs, large Monte Carlo studies, rigorous optimization or publication-grade validation, export the model and validate externally in Python, Julia, CasADi, Pyomo, SciPy or another production workflow.

MIT License.


Update in this package: replaced the main top-left Foko Lab logo with the corrected user-approved logo asset.


v2.7.4: replaced the main header logo with the compact 560x150 SVG and fixed the header render size.


## Research atlas and optimization plot grammar

This package includes a portfolio-oriented research layer: `research.html`, new Model Atlas cards, improved Optimization Lab plots, and reduced Workbench surrogates for the photosynthesis climate-adaptation model. The browser models are deliberately reduced; use the Python repository for full CasADi/CMA-ES/SALib workflows.


## Local test dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pytest -q tests
```
