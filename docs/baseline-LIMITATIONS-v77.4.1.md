# Foko Lab v77.4.1 — scientific and platform limits

Foko Lab is a transparent browser-scale modeling workbench. A successful calculation means the implemented method completed under its stated assumptions; it does not certify the scientific adequacy of a user's model.

## Numerical scope

- The deterministic ODE path targets supported non-stiff and moderately challenging systems; it is not a general DAE, stiff BDF/Radau, delay-equation, PDE/FEM, or continuation package.
- Algebraic, stochastic, optimization, bifurcation, population-genetics, AI, Bayesian/advanced, and sensitivity modules expose bounded implementations rather than specialist desktop/HPC parity.
- Browser memory and execution time bound state dimension, ensemble size, global-sensitivity sample count, CMA-ES evaluations, agent population, and visualization density.
- Seeded stochastic results support reproducibility of implemented runs, not convergence or inferential validity by themselves.

## Statistical and modeling scope

- Sensitivity rankings depend on parameter ranges, chosen outputs/metrics, model validity, and sample budget; multi-output support does not make outputs scientifically interchangeable.
- Bayesian examples are not a production MCMC/NUTS platform. AI/ML surrogates, active sampling and equation discovery require independent validation.
- User equations are checked for supported finite execution, but Foko Lab cannot infer whether units, mechanisms, signs, causal assumptions, parameter ranges or boundary conditions are scientifically correct.
- TXT/ODE, JSON, dictionary/object, YAML, CSV and documented standards subsets are bounded. Unsupported SBML/CellML/SED-ML/OMEX semantics must fail explicitly or route to an external workflow.
- LaTeX rendering presents the interpreted equation; it is not a symbolic proof of equivalence.

## Visualization and validation

- 3D is used only when state, phenotype or spatial geometry carries scientific meaning; agent models otherwise prefer live lattice/2D views.
- Lab colours identify navigation context. Quantitative plots use separate scientific palettes and legends.
- Dense traces, surfaces, heat maps and interaction matrices can hide uncertainty or overplot effects; interpretation remains the user's responsibility.
- Release gates cover implemented contracts, reference problems, integrity, accessibility and layout rules. Publication, clinical, regulatory, financial or safety-critical use requires independent domain validation.
