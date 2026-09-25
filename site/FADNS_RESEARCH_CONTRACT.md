# Fatty-acid research model contract — v72.29.0

## Provenance classes

The ODE and Steady-State examples are public reductions of the creator's fatty-acid metabolism and fatty-acid de novo synthesis work. They are not identical to the complete research repositories or to every calibrated dataset-specific parameterization.

The Agent fatty-acid presets remain qualitative lattice abstractions. They must not be used to infer kinetic constants, product ratios or metabolic steady states.

## ODE scope

### Fatty-acid metabolism bistability

The four-state system represents acetyl-CoA, malonyl-CoA, fatty acids and triglycerides with saturating fluxes, inhibition and loss terms. The browser provides trajectories and finite parameter sweeps.

A model name or successful trajectory does not prove that the selected parameter set is bistable. Bistability requires at least two physically admissible stable equilibria separated by an unstable equilibrium under the same parameterization. The browser does not claim this without explicit root and stability evidence.

### Semi-mechanistic FADNS

The reduced public ODE preserves substrate pools, FAS-bound elongation states, CoA sequestration and C14/C16/C18 products. The bundled parameter values are an auditable browser example, not a claim to reproduce every calibrated thesis fit.

The closed product-forming ODE is not automatically a steady-state model because products accumulate unless an experimental or open-system removal boundary is declared.

## Steady-State scope

### Four-state branch exploration

The browser reports:

- residual-gated local roots;
- deterministic finite multi-start results;
- declared non-negativity admissibility;
- finite one- and two-parameter scans;
- finite-difference Jacobians.

The browser does not report a general 4×4 non-symmetric eigenspectrum. It therefore does not certify full-model local stability or a bifurcation.

### Conditional MalCoA–FA slice

Acetyl-CoA and triglycerides are held fixed. This yields a two-variable conditional subsystem for which the browser computes the exact analytic 2×2 Jacobian spectrum. The result is local stability of the conditional slice only, not the full four-state model.

### FADNS enzyme occupancy

This is an algebraic operating-point system at fixed substrate pools. It enforces the declared total FAS pool and checks non-negativity. Dynamical stability is not applicable because the page is solving flux-balance constraints, not a declared time-domain occupancy model.

## Publication boundary

Publication use requires the complete source model, parameter provenance, experimental-data mapping, unit checks, solver convergence studies, sensitivity or identifiability analysis and independent reproduction outside the browser.
