# Foko Lab

Browser-native scientific modeling platform for defining, running, inspecting and exporting custom models.

## Main routes

- `index.html` — homepage
- `workbench.html` — model workbench
- `ode.html` — ODE Lab
- `optimization.html` — Optimization Lab
- `steady.html` — Steady-State Lab
- `stochastic.html` — Stochastic Lab
- `symbolic.html` — Symbolic Lab
- `agent.html` — Agent Lab
- `examples.html` — Model Atlas
- `docs.html` — documentation
- `tutorial.html` — guided use

## Custom model support

- ODE Lab: editable equations, states, parameters and JSON/CSV/TXT/YAML/Python/SBML import.
- Workbench: editable model JSON and export scripts.
- Optimization Lab: editable variables, objectives and constraints.
- Steady-State Lab: editable variables, parameters and algebraic equations.
- Stochastic Lab: editable JSON schema for CTMC/SDE-style models.
- Symbolic Lab: editable expressions/equations with rendered symbolic results.
- Agent Lab: editable parameters, initial state distribution, absolute initial population, initial composition, custom JSON models and sandboxed custom rules.

## Local run

```bash
python3 -m http.server 8010
```

Open:

```text
http://localhost:8010
```

## Local test

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pytest -q tests
```

Optional JavaScript syntax checks:

```bash
node --check src/navigation.js
node --check src/app.js
node --check src/symbolic-lab.js
node --check src/model-validator.js
node --check src/model-session.js
node --check src/agent-lab.js
node --check src/agent-rule-worker.js
node --check src/model-workbench-v3.js
node --check src/stochastic/stochastic-lab.js
node --check src/optimization-lab.js
node --check src/steady-state-lab.js
```

## Scope

Foko Lab is for education, exploration and rapid prototyping. For stiff systems, large stochastic ensembles, rigorous optimization or publication-grade analysis, export and validate in Python, Julia, SciPy, CasADi, Pyomo or domain-specific tools.

## License

MIT.

## Branding

Final Foko Lab brand assets are stored in `assets/brand/`:
- `foko-lab-logo.svg` — primary header/logo lockup
- `foko-lab-mark.svg` — icon-only scientific mark
- `favicon-32.png`, `apple-touch-icon.png`, `favicon.ico` — browser/app icons


## Foko SciML Lab

Built from the v60 symbolic/branding legacy baseline. The SciML layer is Atlas-linked and uses machine learning as a modeling instrument, not as a decorative chatbot.

Browser features:
- Atlas-linked examples for equation discovery, surrogate modeling, inverse problems, data assimilation, PINN diagnostics and biological network ML.
- Additional modeling examples: Michaelis–Menten kinetics, genetic toggle switch, Lorenz surrogate stress test, 1D heat-equation surrogate, chemostat growth calibration and Allee-effect population dynamics.
- SINDy-style sparse equation discovery from trajectory data.
- Plot selection placed directly above the diagnostic plot for faster visual iteration.
- User-selectable modeling problems, not static labels.
- Modeler-grade diagnostics: trajectory/observations, training and validation loss template, derivative fit, predicted-vs-reference, x-t error heatmap, residuals over time, pointwise error distribution, cross-validation residuals, coefficient spectrum, candidate-library heatmap and phase portrait.
- JSON model artifact export.

Export-tier workflows:
- PySINDy equation discovery.
- scikit-learn surrogate validation.
- scipy inverse-problem calibration.
- data-assimilation scaffold.
- PyTorch/PINN scaffold.
- neural-operator scaffold.
- biological network ML scaffold.

The rule is explicit: browser ML returns readable equations, diagnostics or model artifacts; heavy neural training is exported.


### v65 SciML example expansion
- Added richer SciML examples: SEIR, de novo protein design, signaling networks, metabolic stress, gene knockout screening, tumor microenvironment, tissue drug penetration, multi-drug scheduling, virtual patients, allostery and microbial communities.
- Added user-selectable 2D and 3D phase portraits with X/Y/Z variable selection directly above the diagnostic plot.
- Added designed SciML Atlas thumbnails for the new examples.
