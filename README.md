# Foko Lab v2.7.4

Foko Lab is a browser-native modeling environment for interactive scientific exploration. The GUI now separates tools by interaction surface, not by mathematical topic.

- **Workbench** — modern slider-first layer: Unified Workbench, Model Atlas, Symbolic Lab and Agent Lab.
- **Legacy** — older form/table layer: ODE Lab, Optimization Lab, Steady-State Lab and Stochastic Lab.
- **Learn** — Docs, Tutorial and Platform.
- **About** — Research Hub, Mathematical Beauty, Acknowledgement and Contact.

The root page is the product homepage. The recommended entry point is `workbench.html`.

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


## Navigation rule

The public GUI distinguishes modern slider-first workspaces from legacy form-based labs.

- Workbench menu: Unified Workbench, Model Atlas, Symbolic Lab, Agent Lab.
- Legacy menu: ODE Lab, Optimization Lab, Steady-State Lab, Stochastic Lab.
- Learn menu: Docs, Tutorial, Platform.
- About menu: Research Hub, Mathematical Beauty, Acknowledgement, Contact.

The dropdowns are dynamic: hover opens on desktop; mouse-leave closes them; outside click, Escape, focus loss and link click also close them.
