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
