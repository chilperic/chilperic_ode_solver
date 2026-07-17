# Review of the supplied `mxlweb-core` package

The uploaded package was inspected as an architectural reference. It was not copied wholesale into Foko Lab.

## Useful ideas adopted

1. **Stable model intermediate representation.** Direct ODE definitions and reaction/stoichiometric definitions should lower to the same numerical structure before simulation. Foko Lab v72.16 adds `src/core/model-ir.js` with a small documented `foko.model-ir/1` schema.
2. **Reaction-network authoring.** A kinetic model can be written as reactions with rates and stoichiometry and lowered to `dx/dt = N·v`. The ODE Lab now accepts this declarative JSON form.
3. **Separation of model definition, lowering and compute.** User input is validated before it reaches the solver.
4. **Worker computation.** Heavy browser computation belongs outside the UI thread. Foko Lab already applies this principle to Agent ensembles and retains it as the preferred direction for expensive scans.
5. **Explicit backend boundaries.** Browser-scale reference solvers and export-oriented stiff/large workflows must remain visibly distinct.

## Not adopted

- The Svelte-specific builder layer.
- Pyodide and compiled WASM backends.
- The package's complete MathML and SBML implementation.
- Its runtime dependency graph.

Those components would materially enlarge the release and require a separate security, licensing, numerical-equivalence and browser-performance audit. Foko Lab retains its smaller dependency-free browser core and adopts only the architecture that can be tested locally.

## Licensing boundary

The supplied package declares ISC licensing in `package.json`. Foko Lab v72.16 reimplements general architectural concepts and does not redistribute its source or binaries.
