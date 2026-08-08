# Foko Lab v77.2.0 — scientific and platform limits

Foko Lab is a transparent browser-scale modeling workbench. A successful calculation means the implemented method completed under its stated assumptions; it does not certify the scientific adequacy of a user's model.

## Numerical scope

- The deterministic ODE path is intended for supported non-stiff and moderately challenging systems. It is not a general-purpose DAE, stiff BDF/Radau, delay-equation, PDE/FEM, or continuation package.
- Algebraic, stochastic, optimization, bifurcation, population-genetics, AI, Bayesian/advanced, and sensitivity modules expose bounded reference implementations. They do not claim breadth or performance parity with specialist desktop/HPC packages.
- Browser memory and execution time bound practical state dimension, ensemble size, Sobol/Morris sample count, CMA-ES population/evaluations, agent population, and visualization density.
- Seeded stochastic results are reproducible for the implemented pseudo-random stream; they are not a substitute for convergence studies or independent inference.

## Statistical and inferential scope

- Sensitivity rankings depend on declared parameter ranges, output variables/metrics, model validity, and sample budget. Multi-output support does not make incomparable outputs scientifically equivalent.
- Bayesian reference modules are not a production MCMC/NUTS platform and do not establish posterior convergence for arbitrary models.
- AI/ML modules are model-analysis tools. Surrogates, active sampling, feature attribution, and equation discovery require validation against held-out or independently generated evidence.
- Identifiability, local stability, and uncertainty diagnostics are evidence about the configured numerical problem, not proof of mechanistic truth.

## Modeling and interchange

- User equations are validated for finite numerical execution, but Foko Lab cannot infer whether units, signs, boundary assumptions, biological mechanisms, causal claims, or parameter ranges are scientifically correct.
- TXT/ODE, JSON, dictionary/object, YAML, CSV and the documented standards subsets are intentionally bounded. Unsupported SBML/CellML/SED-ML/OMEX semantics must fail explicitly or use an export workflow rather than silently changing the model.
- LaTeX rendering is presentation of the interpreted equation, not a separate symbolic proof of equivalence.

## Visualization

- 3D is used when state/phenotype/spatial geometry carries scientific meaning. Agent models default to the live lattice when a third spatial or phenotype dimension would be decorative.
- Lab colors are navigation identity. They do not automatically recolor scientific series; quantitative plots use semantic palettes and legends.
- Dense traces, surfaces, heat maps, contours, and interaction matrices can obscure uncertainty or overplot small effects. Interpretation remains the user's responsibility.

## Validation boundary

The release gates cover implemented contracts, known reference problems, integrity, accessibility, layout rules, and independent numerical probes. They cannot validate an arbitrary user-defined scientific model. Results intended for publication, clinical, regulatory, financial, or safety-critical use require independent validation with appropriate domain tools and evidence.
