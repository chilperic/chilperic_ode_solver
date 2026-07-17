# Using Foko Lab

Foko Lab is a browser-based scientific modelling workspace. It lets you build and run models, inspect numerical evidence, fit data, compare alternatives, and export work for independent reproduction.

The platform is designed for exploration and communication. It helps you see what was computed, how it was computed, and where the browser result stops being enough.

## Start in one minute

1. Choose a lab from the **Labs** menu.
2. Begin with the example already loaded.
3. Press **Run**.
4. Read the status and diagnostics before interpreting the plot.
5. Change one parameter, method, or plot and run again.

You can replace every example with your own equations, reactions, parameters, matrix, graph, or data table.

## Read every result in this order

### 1. Status

- **Computed** means the current input produced a numerical result and the evidence panel rendered.
- **Computed with warning** means a result exists, but a diagnostic needs attention.
- **Not computed** means the visible configuration has not produced a current result.

### 2. Diagnostics

Check the method, tolerances or step size, accepted and rejected steps, seed, sample size, convergence reason, feasibility, censoring, missingness, or other lab-specific evidence.

For an ODE result, repeat the run with tighter tolerances. If the trajectory or quantity of interest changes materially, the first result was not numerically converged.

### 3. Plot

Use the plot to understand the computed result only after checking how it was produced. A smooth curve can still come from an unsuitable method.

### 4. Provenance

Record the model, parameters, method, tolerances, seed, version, and any independent verification. These are the details needed to reproduce the run.

## Understand the four capability labels

| Label | Meaning |
|---|---|
| **Browser-computed** | The visible result was computed locally from the current input. |
| **Limited** | A genuine but bounded, heuristic, or small-scale browser method was used. |
| **Export-only** | Foko Lab prepares a reproducible external workflow but does not claim to run it in the browser. |
| **Unavailable** | The capability is not offered and no substitute result is shown. |

A capability label describes the computation boundary. It does not certify the scientific model, data, assumptions, or interpretation.

## Use the workspace

Most labs have three areas:

- **Inputs** — model, data, parameters, method, tolerances, seed, and options.
- **Evidence** — one large plot or two plots shown together.
- **Diagnostics** — status, warnings, numerical checks, uncertainty, and provenance.

### Two-up and Focus

**Two-up** keeps two evidence panels visible. Changing either plot changes only the content of that panel; it does not change the layout. On a narrow screen the panels may stack vertically while Two-up remains selected.

**Focus** shows one evidence panel at a time. Focus changes only when you choose it.

## Core modelling workflows

### ODE Lab

Use ODE Lab for systems of differential equations and reaction networks. You can inspect trajectories, phase portraits, vector fields, parameter sweeps, conservation, stiffness evidence, and solver diagnostics.

Use **Verify against SciPy** when you need an independent numerical comparison. Suspected stiff systems should be compared with an implicit method such as Radau or BDF.

### Sensitivity Analysis Lab

Use Sensitivity Analysis Lab to vary parameters of an editable ODE model while retaining direct control over equations, initial conditions, parameter values and ranges, time span, reported points, solver, step controls, `rtol`, and `atol`.

Available browser methods are local central finite differences, Morris screening, independent-uniform Jansen first/total indices, and a local range-scaled Fisher-information approximation. Changing any model or numerical input marks the existing evidence **Stale** and disables result and image exports until the analysis is rerun.

Interpret the methods within their boundaries:

- local derivatives are local and perturbation-dependent;
- Morris is screening, not variance decomposition;
- Jansen estimates assume independent uniform ranges and may be negative or exceed one at finite sample sizes;
- the Fisher-information view is local, scaling-dependent, and based on a declared constant noise scale; it is not posterior uncertainty or structural identifiability.

Use several perturbation sizes or sample budgets and independently repeat important analyses with SciPy and SALib.

### Steady-State Lab

Use Steady-State Lab to search for roots of `f(x)=0`, inspect residuals, reject physically inadmissible candidates, and assess local stability where supported.

A finite multi-start search can find several roots but cannot prove that all roots were found. A parameter scan is not a bifurcation continuation.

### Stochastic Lab

Use Stochastic Lab for time-homogeneous continuous-time Markov chains simulated with Gillespie’s direct method. Results include seeded trajectories, empirical bands, Monte Carlo error, and censoring counts.

Record the seed, number of runs, and censoring count. The deterministic mean-field trajectory is not guaranteed to equal the stochastic mean.

### Curve Fitting

Use Curve Fitting for linear and nonlinear regression, residual analysis, uncertainty bands, bootstrap checks, parameter correlations, and finite profile scans.

A high R² does not establish parameter identifiability. Check profile shape and parameter correlation before reporting nonlinear parameters.

### Agent Lab

Use Agent Lab for seeded lattice-based, individual-level dynamics. The live animation is one representative computed realization. Population bands and endpoint summaries describe the finite ensemble.

A simulation step is not automatically a biological unit of time, and simulation intervals do not include parameter, measurement, or model uncertainty.

### SciML Lab

Use SciML for bounded scientific machine-learning workflows such as SINDy equation discovery, inverse diagnostics, surrogate checks, and trajectory PCA where the dimensions permit it.

A recovered equation is conditional on sampling, noise, derivative estimation, scaling, candidate terms, and the sparsity threshold. Treat it as a data-supported representation, not a discovered mechanism.

## Additional analysis tools

- **Statistics** — missingness audit, descriptive statistics, regression, tests, survival analysis, ROC/PR, FDR, and PCA.
- **Machine Learning** — fold-safe preprocessing, cross-validation, regression, binary classification, calibration, clustering, PCA, and leakage checks.
- **Optimization** — bounded and heuristic search with a separate feasibility check.
- **Linear Algebra** — small dense systems, least squares, eigensystems where supported, rank, null space, and conditioning evidence.
- **Networks** — small directed and undirected graphs, paths, components, spanning trees, and exploratory centrality.
- **Symbolic** — restricted parsing, exact differentiation, Jacobians, numerical evaluation, and SymPy export.
- **Workbench** — several labs applied to one shared configuration without introducing a second numerical engine.

## Bring your own model or data

| Workflow | Input |
|---|---|
| ODE | Equations or reaction-network Model IR |
| Steady state | Residual equations and initial guesses |
| Stochastic | States, reactions, propensities, and stoichiometry |
| Fitting, Statistics, ML | CSV, TSV, semicolon-separated data, or editable tables |
| Optimization | Variables, bounds, objective, and constraints |
| Linear algebra | Matrix and vector input |
| Networks | Edge list |
| SciML | Trajectory data and workflow configuration |
| Agent | Preset or custom lattice rules and initial populations |

Malformed input is rejected rather than silently repaired. Use explicit multiplication such as `beta*S*I`; implicit multiplication is not guessed.

## Verify, save, share, and report

- **Verification** compares a browser ODE result with an independent SciPy method on the same output grid.
- **Report Card** creates a self-contained evidence report containing equations, parameters, diagnostics, hashes, verification status, and explicit non-claims.
- **Share links** preserve configuration. Re-run after opening a shared link so the evidence matches the current environment.
- **Export** provides a route to external tools when the browser method is limited or unsuitable.

For publication or regulatory use, reproduce the result independently and document where the two implementations agree or disagree.

<section id="analysisTaxonomyDocs">

## Analysis taxonomy and capability catalogue

The full machine-readable catalogue is available in [ANALYSIS_TAXONOMY.json](ANALYSIS_TAXONOMY.json). It includes implemented, limited, export-only, and unavailable Optimization, Multi-Objective, Steady-State, and Sensitivity methods and plots. A catalogue entry is not an implementation claim; runtime menus show only methods supported by the current computed result.

</section>

## When to leave the browser

Use an external tool when you need:

- robust stiff integration beyond browser exploration;
- certified continuation or bifurcation analysis;
- large sparse linear algebra or graph computation;
- structural-identifiability analysis;
- deep neural training or GPU computation;
- causal inference;
- calibrated empirical agent models;
- formal optimality certificates.

Foko Lab should make that transition explicit rather than replacing it with a decorative approximation.

## Troubleshooting

### A plot is blank

Confirm that the status is current, the selected plot is compatible with the result dimensions, and no input error is shown. Re-run after changing the configuration.

### Two-up changed unexpectedly

At desktop width, changing a plot should not change Two-up. Reload the page and repeat the action. If it happens again, record the lab, selected plots, viewport width, and browser.

### Verification cannot start

The SciPy comparison is loaded only when requested and may require network access on first use. The browser result remains available even when the independent runtime cannot load.

### A stochastic or Agent run is slow

Reduce the lattice size, run count, steps, or event cap. Larger ensembles improve Monte Carlo precision but increase computation time.

### The result looks convincing but diagnostics warn

Treat the warning as part of the result. Change the method, tighten tolerances, increase the sample, inspect assumptions, or export for independent validation before interpreting the figure.

## Research provenance

Some examples are reduced public versions of models from fatty-acid metabolism, de novo fatty-acid synthesis, and T-cell proliferation research. They are provided for transparent exploration and teaching. A successful run does not make them calibrated reproductions of the complete research repositories.

See **Model provenance** for the scientific background and **Trust** for the exact computation boundary of each capability.

The Symbolic Lab is deliberately restricted and is **not a complete computer algebra system**. Use the generated SymPy workflow when you need broader algebraic manipulation.
