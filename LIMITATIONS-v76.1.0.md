# Foko Lab v76.1.0 — capability boundaries and known limitations

Foko Lab is a browser-native modelling workbench. It is designed for transparent, bounded scientific experiments, model authoring, diagnostics and reproducible export. It is not a substitute for a domain-certified solver, a high-performance computing environment, or an independently validated decision system.

## General numerical scope

- Computations are limited by browser memory, execution time and single-device resources. Capacity guards deliberately refuse oversized requests.
- A successful run establishes that the implemented numerical path completed for the declared inputs; it does not prove that an arbitrary user model is scientifically valid, identifiable, well posed or globally converged.
- Floating-point results may vary slightly across browser engines and hardware. Seeded stochastic paths are reproducible within the stated JavaScript implementation, not necessarily bitwise identical to external packages.
- Units are documented and exported but are not yet enforced by a dimensional-analysis engine.

## Dynamic, stochastic and bifurcation models

- ODE simulation uses explicit browser-scale integration. Difficult stiff, discontinuous, delay, differential-algebraic and event-rich systems require an external solver.
- Steady-state and bifurcation views use finite scans, local Jacobians and bounded root searches. They do not provide certified pseudo-arclength continuation, branch switching, Hopf continuation or periodic-orbit certification.
- Stochastic simulation supports the declared finite reaction and ensemble contracts. It is not a general SDE, SPDE, tau-leaping or hybrid stochastic solver.
- Agent results are rule-based finite simulations. The 3D view is shown only when space, topology or time geometry benefits from it; it is not evidence of physical three-dimensional fidelity.

## Sensitivity, inference and uncertainty

- Local sensitivity uses finite differences and is conditional on perturbation size, solver error and output definition.
- Morris and Sobol/Jansen workflows are bounded, seeded estimators for declared independent input ranges. Confidence intervals are finite resampling diagnostics, not universal guarantees.
- Multi-output Sobol analysis reuses one design and reports separate output estimates; it does not make different outputs statistically independent.
- Adjoint sensitivities, dependent-input Shapley effects and validated FAST/eFAST estimators remain unavailable.
- Curve fitting is browser-scale and model conditional. Local covariance, profile and residual diagnostics do not establish structural identifiability or causal validity.
- Advanced Bayesian examples are bounded reference implementations. General MCMC, SMC, variational inference, hierarchical modelling and production Bayesian optimization are not implemented.

## Optimization, AI and scientific machine learning

- CMA-ES and the other exposed optimizers return finite numerical candidates, not global-optimality, robustness or constraint-sufficiency certificates.
- AI Modeling and machine-learning workspaces use transparent browser-scale surrogates and small-data methods. They do not train foundation models, large neural networks, PINNs or neural operators, and they do not use GPU/distributed training.
- Internal cross-validation and residual diagnostics are not external validation. Users remain responsible for data provenance, leakage control, distribution shift and domain-specific performance criteria.

## Population genetics and evolution

- Population Genetics implements finite two-deme diploid Wright–Fisher experiments with the documented selection, mutation, migration and drift assumptions.
- VCF/BCF, PLINK, pedigree and sequencing-quality pipelines are not implemented. Linkage, recombination maps, coalescent inference, demographic-history inference and genome-scale association analysis require specialist software.
- Evolution Landscape experiments operate on explicit finite genotype/fitness representations. Their 3D surfaces are model visualizations, not measured biological fitness landscapes unless the user supplies and validates such data.

## Symbolic mathematics and interchange

- The symbolic grammar covers the documented expression subset. It is not a general computer-algebra system and does not prove equivalence, singularity absence or global stability.
- TXT/ODE, JSON, Model IR, safe dictionary-like text, YAML, CSV model tables and a strict SBML reaction subset can enter the editable model workflow. Imported code is parsed as data and is never executed.
- CellML, SED-ML and COMBINE/OMEX filenames are recognized for routing but are not executed. Unsupported SBML rules, events, algebraic equations, delays or compartment semantics are rejected rather than partially simulated.

## Visual and product validation

- Lab and subject colors are navigation identity only. Quantitative plots default to semantic scientific palettes; an optional lab-accent palette is explicitly labelled presentation-only.
- Contrast checks cover the maintained shell tokens. User-supplied labels, very dense datasets and third-party browser extensions can still affect readability.
- Responsive contracts cover supported breakpoints, keyboard operation and bounded overflow. They are not a substitute for a diverse external usability study or assistive-technology certification.

For consequential research, clinical, financial, engineering or policy use, export the model and evidence, reproduce the result with an appropriate independent toolchain, and document the validation decision.
