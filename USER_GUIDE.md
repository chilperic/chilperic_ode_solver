# Foko Lab modelling handbook

Foko Lab is a browser-native scientific modelling platform. It is designed for four connected activities:

1. translating a scientific question into an explicit mathematical model;
2. computing a result with visible numerical settings;
3. challenging that result with diagnostics, alternative views, and sensitivity analysis;
4. exporting enough information for another person or external tool to reproduce the work.

The platform is not a substitute for domain validation, experimental design, specialist continuation software, large-scale optimization, finite-element simulation, or a production machine-learning stack. Its role is to make small and medium scientific workflows inspectable before they are scaled up.

## A complete modelling workflow

A defensible model is not produced by pressing **Run**. Use the following sequence.

| Stage | Question | Evidence to retain |
|---|---|---|
| 1. Purpose | What decision, mechanism, or hypothesis is the model meant to examine? | One primary question and one measurable output. |
| 2. Boundary | What is inside and outside the system? | Included states, excluded processes, forcing assumptions. |
| 3. Variables | What quantities change with time or iteration? | Names, meanings, units, admissible ranges. |
| 4. Parameters | What controls rates, scales, or constraints? | Nominal values, units, plausible ranges, provenance. |
| 5. Initial or boundary conditions | Where does the computation begin? | Values, units, uncertainty, and why they are appropriate. |
| 6. Equations or rules | How do mechanisms change the states? | Explicit equations, reactions, residuals, objective, or transition rules. |
| 7. Numerical method | How will the mathematical problem be approximated? | Solver, tolerances, step controls, seed, sample count. |
| 8. Verification | Is the implementation numerically consistent? | Refinement, independent reference, conservation, residual or feasibility checks. |
| 9. Validation | Is the model adequate for the scientific purpose? | Data comparison, withheld observations, known limiting cases. |
| 10. Sensitivity and uncertainty | Which assumptions control the conclusion? | Ranges, perturbations, sampling design, rank stability, confidence evidence. |
| 11. Reproducibility | Can the run be recreated? | Model file, settings, version, seed, exported result and limitations. |
| 12. Claim boundary | What has not been established? | Explicit non-claims and external work still required. |

Do not skip directly from equations to a plot. The intermediate numerical and scientific checks are part of the result.

## Choose the right lab

Start from the mathematical task rather than from the plot you hope to obtain.

| Scientific task | Primary lab | Typical evidence | Important boundary |
|---|---|---|---|
| Time evolution governed by differential equations | **ODE** | trajectories, phase views, solver work, conservation, stiffness evidence | explicit browser solvers are not a general stiff/DAE/PDE solution |
| Parameter influence in an ODE model | **Sensitivity** | local derivatives, Morris, Jansen/Saltelli, FIM, convergence | rankings depend on output, ranges, initial conditions, time window and estimator |
| Solve nonlinear equations or equilibria | **Steady-State** | residual history, roots, Jacobian, local eigenvalues, scans | finite searches do not prove completeness; scans are not certified continuation |
| Random reaction or jump dynamics | **Stochastic** | seeded SSA paths, empirical intervals, extinction and event evidence | only time-homogeneous CTMC/Gillespie direct SSA is maintained |
| Minimize or maximize an explicit function | **Optimization** | objective history, feasibility, candidates, finite Pareto evidence | heuristic candidates are not certificates of global optimality |
| Estimate parameters from data | **Curve Fitting** | residuals, uncertainty, bootstrap, correlation, profiles | a good fit does not imply identifiable parameters or valid model structure |
| Describe, compare, or test tabular data | **Statistics** | distributions, tests, effect sizes, PCA, ROC/PR, survival | assumptions, missingness and multiplicity remain the user's responsibility |
| Build small predictive baselines | **Machine Learning** | fold-safe predictions, CV, calibration, importance, clustering, PCA | not a deep-learning or deployment platform; leakage checks remain essential |
| Analyse a matrix problem | **Linear Algebra** | structure, singular values, eigenvalues, residuals, conditioning | small dense educational workflows, not sparse/HPC linear algebra |
| Analyse graph structure | **Networks** | paths, components, centrality and spanning-tree evidence | graph measures do not imply causal or biological importance |
| Discover or compare compact scientific ML representations | **SciML** | SINDy, inverse and surrogate diagnostics where computed | PINN, neural-operator and Neural ODE examples are export-only unless a real engine is shown |
| Simulate individual or lattice rules | **Agent** | live realization, ensemble summaries, reproducibility | an animation is one realization, not a calibrated biological movie |
| Apply several tools to one configuration | **Workbench** | shared model, multiple lab adapters | each adapter retains the limitations of its underlying lab |

## Current platform depth and the master feature list

The long feature catalogue is a useful roadmap, but it mixes working browser computations, derived plots, external workflows and research topics. Foko Lab therefore exposes a smaller verified core rather than displaying every requested name in a dropdown.

| Workspace | Maintained example library | Maintained computed plot library | What is deliberately not claimed |
|---|---:|---:|---|
| Optimization, including finite multi-objective evidence | 17 problems | 23 views | no Bayesian optimization, topology/CFD solver, nonlinear MPC certificate or complete ZDT/DTLZ MOEA |
| Steady-State / Algebraic | 26 systems | 18 views | no certified continuation, complete root proof or generic limit-cycle computation |
| Stochastic | 13 jump-process models | 12 views | no generic SDE/SPDE engine, stochastic bifurcation certificate or Lyapunov analysis |
| Linear Algebra | 8 curated tasks | 11 views | no sparse large-scale GMRES/Krylov suite, pseudospectrum or general Schur/Sylvester/Lyapunov solver |
| Statistics | 22 curated datasets | analysis-dependent views | no general Bayesian engine, automatic causal inference or unrestricted time-series forecasting |
| Machine Learning | 14 small-data tasks | 18 views | no SHAP, UMAP/t-SNE, deep training, reinforcement learning or production monitoring |
| Sensitivity | 17 editable ODE models across 13 families | 35 method-dependent views | no adjoints, FAST/eFAST, Shapley effects or dependent-input Sobol analysis |
| Curve Fitting | 7 datasets | 14 views | no structural-identifiability proof or Bayesian posterior sampler |
| Networks | 7 graphs | 12 views | no large distributed graph engine or exact community ground truth |
| Symbolic | 20 systems | exact/derived views | no unrestricted computer algebra system |

### Why some requested labs are integrated rather than separate

- **Multi-objective analysis** belongs inside Optimization because it reuses the same decision variables, objectives, feasibility rules and finite candidate set.
- **Heatmaps** are a cross-cutting visual form. Objective landscapes, violation maps, Jacobians, residuals, state sensitivity, adjacency matrices and confusion matrices remain in the scientific lab that defines their meaning. A generic Heatmap Lab would encourage plotting numbers without their computational context.
- **Stochastic sensitivity** should be derived from a declared jump-process observable and repeated seeded ensembles, not attached generically to deterministic ODE inputs.
- **SciML sensitivity** is only meaningful when an actual trained or discovered model exists. Export templates are not labelled as computed neural sensitivity.

### Capability decision rule

A requested item enters the working interface only when Foko Lab has all four parts:

1. a defined mathematical object;
2. a real browser or external computation path;
3. numerical and failure tests;
4. an interpretation boundary beside the result.

Names without these four parts remain in the Trust roadmap rather than becoming decorative controls.

## Formulate a model before entering it

### Define the question and output

A model can have many states but should begin with one precise question. Examples:

- “How does the transmission rate affect peak infected population?”
- “Which kinetic parameters determine final product yield?”
- “Does this nonlinear system have more than one admissible equilibrium?”
- “Can these data distinguish `Vmax` from `Km`?”

Then define the output used to answer it. In Sensitivity, for example, the same trajectory can be summarized by final value, maximum, minimum, mean, range, integral, or time of maximum. These summaries answer different questions and can produce different rankings.

### Define the system boundary

State explicitly what the equations omit. A closed SIR model, for example, excludes births, deaths, migration, age structure, spatial mixing, interventions, reporting delay, and stochastic transmission unless those mechanisms are added. Omissions are not automatically errors; they become errors when the scientific claim requires them.

### Choose states rather than merely labels

A state variable should represent a quantity whose future value depends on its current value and the model rules. For every state, record:

- meaning;
- units;
- physically admissible range;
- initial value;
- whether it is measured, latent, or derived.

Do not encode the same conserved material in several independent states unless the equations maintain the conservation law.

### Separate parameters from states

Parameters describe rates, capacities, coupling strengths, thresholds, or other fixed assumptions during one run. A quantity that changes over time should normally be a state or an explicit forcing function, not a parameter.

For sensitivity analysis, a parameter needs three values:

```text
current value, minimum, maximum
```

The interval is part of the scientific hypothesis. It is not just a plotting range.

### Check dimensions

Every additive term in an equation must have the same units. If `x` has units of concentration and time is hours, then every term in `dx/dt` must have concentration per hour.

For a mass-action term:

```text
rate = k*A*B
```

`k` must carry the units needed to make the rate dimensionally correct. Foko Lab evaluates numbers and expressions; it does not certify units automatically.

## Author equations safely

Use explicit multiplication:

```text
beta*S*I/N
```

Do not write:

```text
beta SI/N
2x
```

State and parameter names must be valid symbols and must not conflict. Expressions should use only declared states, parameters, `t`, arithmetic operators, and supported mathematical functions.

### Build equations from mechanisms

For a two-step conversion:

```text
S --k1--> M --k2--> P
```

with rates:

```text
v1 = k1*S
v2 = k2*M
```

the state balances are:

```text
dS/dt = -v1
dM/dt =  v1 - v2
dP/dt =       v2
```

This construction makes signs and conservation easier to inspect. The reaction-network Model IR can generate the same balances from stoichiometry.

### Check limiting cases

Before running the full model, ask what should happen when:

- a rate is zero;
- a coupling parameter is very small;
- two rates are equal;
- the initial population is zero;
- time approaches zero;
- the system approaches a known equilibrium.

A model that fails an analytically obvious limiting case should not be trusted because its plot looks plausible.

## Numerical controls and solver choice

### Time span

Choose a time window long enough to contain the phenomenon of interest but not so long that irrelevant late-time behavior dominates the output metric.

For oscillatory models, changing the end time can change maxima, means, ranges, phase relations, and sensitivity rankings. Report the exact interval.

### Reported points

Reported points control the output and plot grid. They do not set the internal step size of an adaptive solver. Increasing reported points can make a curve look smoother without improving integration accuracy.

### Adaptive tolerances

`rtol` controls relative local error and `atol` protects variables close to zero. A tolerance is not a statement of model uncertainty.

Use a refinement test:

1. run at the initial tolerances;
2. tighten `rtol` and `atol` by one or two orders of magnitude;
3. compare the quantity of interest, not only the picture;
4. retain the cheaper run only when the result is stable enough for the intended claim.

### Fixed-step methods

A fixed-step method is useful for teaching, controlled comparisons, and some smooth problems. It does not estimate its own local error. Repeat the run with a smaller step and check convergence.

### Stiffness

Stiffness can cause explicit methods to take very small steps or produce unstable results. Warning signs include:

- many rejected steps;
- extremely small accepted steps;
- large local timescale separation;
- a fixed-step result that changes dramatically under refinement;
- disagreement with an implicit reference solver.

Use the SciPy verification export or an external Radau/BDF/LSODA workflow for important stiff problems.

## Read every result in the same order

### 1. Status

- **Ready**: inputs exist but no current result has been computed.
- **Computed**: the displayed evidence belongs to the current inputs.
- **Computed with warning**: a result exists but a numerical or interpretation condition needs attention.
- **Stale**: inputs changed after the displayed result was computed.
- **Failed**: no valid result was published.

### 2. Diagnostics

Read method, tolerances, step work, convergence reason, residual, feasibility, sample count, seed, censored runs, missing rows, or other lab-specific evidence.

### 3. Plot

Ask what mathematical quantity is on each axis, what transformations were applied, which observations or samples were omitted, and whether uncertainty is displayed.

### 4. Provenance

Retain model equations, parameter values and ranges, initial conditions, time span, method, tolerances, random seed, sample budget, platform version, and external verification status.

### 5. Non-claims

State what the computation did not establish. Examples:

- “The finite multi-start search did not prove that all roots were found.”
- “The Pareto front is a finite sampled approximation.”
- “The Sobol estimates assume independent uniform ranges.”
- “The PINN example was exported but not trained in the browser.”

## Capability labels

| Label | Meaning |
|---|---|
| **Browser-computed** | The maintained browser core computed the visible result from the current input. |
| **Derived in browser** | The plot or metric was derived from a computed finite result. |
| **Limited** | A genuine bounded, heuristic, reduced, or finite-sample method was used. |
| **Export-only** | Foko Lab prepares a configuration or external workflow but does not claim browser computation. |
| **Unavailable** | The numerical method is absent and no substitute result is displayed. |

These labels describe the computation boundary, not the truth of the scientific model.

## ODE Lab in detail

### Use it for

- autonomous or time-dependent ordinary differential equations;
- reaction networks converted to ODE balances;
- trajectory and phase-space exploration;
- solver comparison, conservation checks and parameter sweeps.

### Enter a model

1. Give every state a unique name.
2. Enter one right-hand side per state in the same order.
3. Enter one initial condition per state.
4. Declare parameter names and values.
5. Set start time, end time and reported points.
6. Select the numerical method and error controls.
7. Load the model, then press **Run**. Loading does not compute.

### Interpret common plots

- **Trajectory**: state values on the declared output grid.
- **Phase portrait**: geometric relation between selected states; time is implicit.
- **Vector field**: local direction of the ODE in a selected two-state plane.
- **Conservation**: drift in a declared conserved combination.
- **Stiffness evidence**: heuristic local timescale separation, not a formal stiffness proof.
- **Solver work**: accepted and rejected steps, function evaluations and step sizes.

### Do not claim

- that an explicit browser solver is suitable for every system;
- that agreement between two explicit methods validates the mechanism;
- that a visually smooth trajectory is accurate;
- that a parameter sweep is a probability distribution.

## Sensitivity Analysis Lab in detail

Sensitivity analysis asks how a declared model output changes when assumptions change. The answer is conditional on the model, initial conditions, time window, output definition, parameter domain, numerical solver, and estimator.

### Curated library

The library contains smooth verification models, growth models, epidemic systems, ecological oscillators, enzyme kinetics, gene circuits, signalling, physiology, mechanics, and nonlinear dynamics. Use the search and family filters. Each card states the scientific question, model family, difficulty, and main caution.

### Editable scientific inputs

You can change:

- equations and state names;
- initial conditions;
- parameter values and ranges;
- start and end time;
- output grid;
- solver, tolerances and step controls;
- output variable and scalar metric;
- perturbation size, sample budget, seed and method settings.

Changing a scientific input marks previous evidence **Stale**. Plot-presentation controls do not invalidate the computation.

### Local finite differences

Use Local analysis when the question concerns a neighbourhood of the nominal point.

Available evidence:

- influence ranking on raw, range-scaled, or elasticity scales;
- signed sensitivity;
- selected-state sensitivity through time;
- parameter Jacobian `∂f/∂p`;
- state Jacobian `∂f/∂x`;
- parameter-by-state trajectory influence;
- OFAT response curves;
- tornado plot;
- directional profile;
- perturbation-size convergence;
- optional two-parameter response surface.

A local derivative is not a global importance measure. Always inspect step convergence and use OFAT or a response surface when thresholds or branch changes are possible.

### Morris screening

Morris uses seeded one-at-a-time paths in the normalized parameter domain.

- `μ*` measures average absolute elementary effect;
- `μ` retains direction;
- `σ` reflects interaction and/or nonlinearity;
- path and effect distributions reveal heterogeneity;
- prefix convergence and bootstrap rank stability show whether the finite design is adequate.

Morris is a screening method. It does not partition variance.

### Global variance analysis

The Jansen/Saltelli workflow estimates first-order and total-order effects for independent uniform parameter ranges. Optional pairwise second-order indices use a larger mixed-matrix design.

Available evidence includes:

- first and total indices with bootstrap uncertainty;
- pairwise second-order heatmap;
- total-minus-first interaction gap;
- convergence with base sample size;
- rank stability;
- parameter-by-time first and total effects;
- parameter-by-state first and total effects;
- output distribution;
- variance-accounting summary;
- sampled parameter-output relationships;
- optional response surface;
- limited MI and HSIC dependence screening.

Finite-sample indices are intentionally not clipped to `[0,1]`. Negative or greater-than-one estimates can reveal sampling error or estimator instability.

### Fisher information approximation

The FIM workflow uses finite-difference trajectory sensitivities, declared parameter scaling, and a constant independent observation-noise scale.

It can diagnose weak local directions and aligned parameter effects. It is not:

- posterior uncertainty;
- structural identifiability;
- a profile likelihood;
- proof that parameters can be estimated from a real experiment.

### Browser capacity

The lab estimates ODE solves and state-time storage before starting. Large state dimension, many varied parameters, second-order interactions, long output grids, or dense response surfaces may be refused.

Do not bypass the guard. Export the model and use Python/SALib, a server workflow, or HPC.

### Not implemented

Adjoint sensitivities, FAST/eFAST, Shapley effects, dependent-input Sobol analysis, Bayesian sensitivity, symbolic identifiability, generic residual-component sensitivity, certified bifurcation sensitivity, and PDE/PINN adjoints remain unavailable or export-only.

## Optimization and multi-objective analysis

### What is computed

Optimization Lab supports bounded coordinate search, projected finite-difference penalty descent, seeded differential evolution, deterministic multi-start search, and random search. The plot library includes objective and penalized landscapes, violation maps, feasible regions, convergence, variable paths, step lengths, finite-difference gradient and Hessian diagnostics, candidate distributions, parallel coordinates, feasibility evidence, and finite-sample Pareto diagnostics.

### How to formulate a problem

1. Define decision variables and finite bounds.
2. Define the objective and whether it is minimized or maximized.
3. Add inequality or equality constraints explicitly.
4. Choose a feasible initial point when possible.
5. Select an algorithm appropriate for smoothness and dimension.
6. Run more than one seed or start for non-convex problems.
7. inspect feasibility separately from objective value.

### Multi-objective evidence

For problems with two objectives, Foko Lab can derive a finite sampled Pareto front, dominance matrix, crowding distance, hypervolume progression, objective correlation and a geometric knee candidate.

These plots describe the sampled candidate set. They are not an exact Pareto set and are not a replacement for a validated MOEA.

### Unavailable optimization claims

Trust-region radius, momentum evolution, Bayesian optimization, topology optimization, CFD shape optimization, full nonlinear MPC, and benchmark-complete ZDT/DTLZ evolutionary optimization are not computed by the browser core.

## Steady-State / Algebraic Lab

### Formulate residuals

Enter equations in the form:

```text
f1(x,p) = 0
f2(x,p) = 0
```

Provide an initial guess and finite bounds or scan ranges where available.

### Evidence

- equilibrium values;
- Newton residual history;
- finite-difference Jacobian;
- local eigenvalues for supported dynamical interpretations;
- deterministic multi-start roots;
- residual surfaces and nullclines;
- sequential parameter branches;
- scan residual and stability margin;
- 2D convergence, residual, stability and variable maps;
- Jacobian sign structure, stiffness indicator and implicit local sensitivity.

### Boundaries

A multi-start search is finite. A sequential branch scan is not pseudo-arclength continuation. A sign crossing on a finite grid is a candidate, not a certified bifurcation. Limit cycles require trajectory analysis and are not inferred from a fixed-point solve alone.

## Stochastic Lab

### Maintained model class

The maintained computation is Gillespie’s direct stochastic simulation algorithm for time-homogeneous continuous-time Markov chains with explicit states, stoichiometry and propensities.

### Inputs

- initial integer populations;
- reaction channels and stoichiometry;
- nonnegative propensities;
- final time;
- output grid;
- number of trajectories;
- seed and event cap.

### Evidence

- individual sample paths;
- representative path;
- ensemble mean and empirical band;
- deterministic mean-field comparison where defined;
- endpoint histogram;
- variance and Fano factor through time;
- autocorrelation;
- zero-state risk and first-passage evidence;
- event counts and path-deviation heatmaps.

### Boundaries

The empirical interval represents a finite ensemble. It is not parameter uncertainty or a confidence interval for model truth. Censored trajectories must be reported. Tau-leaping, generic SDE integration, stochastic PDEs, stochastic bifurcations and stochastic Lyapunov analysis are not maintained browser computations.

## Curve Fitting

### Workflow

1. Inspect data, units, missingness and experimental design.
2. Choose a model for scientific reasons, not because it gives the highest R².
3. Set initial values and physically meaningful bounds.
4. Fit and inspect termination evidence.
5. Examine residuals, leverage and influential observations.
6. Inspect parameter uncertainty, bootstrap results, correlation and profile scans.
7. test predictions on withheld or new data where possible.

### Identifiability

Strong parameter correlation, flat profile curves, broad bootstrap distributions or dependence on starting values indicate practical non-identifiability. More optimizer iterations do not create information absent from the data.

## Statistics Lab

The Statistics Lab provides descriptive summaries, PCA, OLS regression, correlation, Welch comparison, one-way ANOVA with nonparametric evidence, bootstrap mean intervals, ROC/precision-recall analysis, Kaplan–Meier/log-rank analysis, Benjamini–Hochberg FDR, and Shewhart process charts.

Before running:

- inspect variable types and units;
- choose the analysis from the scientific question;
- define the missing-data policy;
- check sample size and dependence;
- decide whether multiplicity correction is needed.

Mean imputation is displayed as a warning because it can distort variance and correlation.

## Machine Learning Toolkit

The maintained scope is small-data baseline modelling:

- linear and ridge-style regression baselines;
- binary logistic classification;
- fold-safe cross-validation;
- ROC, precision-recall, confusion and calibration evidence;
- permutation importance;
- k-means clustering with silhouette and elbow evidence;
- PCA scores, variance and loadings;
- leakage and extrapolation warnings.

SHAP, UMAP, t-SNE, deep neural networks, transfer learning, federated learning, reinforcement learning, architecture search and production monitoring are not computed. Do not label permutation importance as SHAP.

## Linear Algebra Lab

Use the lab for small dense matrices. Available operations include matrix diagnostics, solving `Ax=b`, inverse with reconstruction residual, QR least squares, symmetric eigensystems, RREF/null space, PCA and a stationary-distribution candidate.

Common evidence includes matrix heatmaps, singular and eigenvalue spectra, residuals, solution vectors, transformations, PCA scores/loadings and reconstruction checks.

A large condition number means small input errors may be strongly amplified. A small residual does not guarantee a small solution error in an ill-conditioned system.

Pseudospectra, sparse direct solvers, GMRES, full Krylov tooling, Schur decomposition, Sylvester equations and Lyapunov equations remain external workflows.

## Symbolic Lab

Use Symbolic Lab to inspect explicit expressions, compute supported exact derivatives, Jacobians, Hessians, equilibria and local linearizations, and export bounded algebraic results. Enter explicit multiplication rather than relying on ambiguous implicit notation.

The maintained parser and algebra routines cover a controlled expression subset. Symbolic Lab is **not a complete computer algebra system**: it does not promise unrestricted simplification, arbitrary special functions, differential algebra, theorem proving or structural-identifiability analysis. Verify exported expressions in a specialist CAS when the research claim depends on them.

## SciML Lab

SciML combines computed and export-only workflows. Read the capability label before interpreting any example.

### Browser-computed or limited workflows

- SINDy-style sparse equation discovery for supported trajectory data;
- coefficient and library-term evidence;
- model-complexity versus error sweeps;
- inverse parameter diagnostics for reduced models;
- small surrogate comparisons;
- trajectory phase and PCA views where dimensions permit.

### Export-only examples

PINNs, neural operators, DeepONet, Neural ODE training, large inverse PDE problems and high-dimensional hybrid models require external training and validation. Their cards are templates and scientific problem statements, not fabricated neural results.

## Agent Lab

Specify initial populations, grid or network structure, rules, seed, step count and ensemble size. The live plot displays one representative computed realization; the population and endpoint panels summarize the finite ensemble.

Check that the visible lattice, step counter and population curves advance consistently. Pause/resume and repeated-seed behavior are part of the reproducibility evidence.

## Workbench

Workbench lets several lab adapters use one model configuration. Switching adapters must not create a second hidden ODE engine. A successful adapter run retains the limitations of the underlying lab; Workbench does not convert a limited method into a certified one.

## Plot interpretation reference

| Plot | Useful question | Common misuse |
|---|---|---|
| Trajectory | How do states evolve on the output grid? | Treating smoothness as accuracy. |
| Phase portrait | What geometric relation exists between states? | Ignoring time direction or projection loss. |
| Heatmap | Where are large or structured values? | Comparing cells with incompatible scales. |
| Contour or response surface | How does an output vary over two selected inputs? | Calling a conditional slice a full global analysis. |
| Histogram/KDE | What is the observed or sampled distribution? | Inferring probability outside the sampled design. |
| Convergence curve | Does the numerical procedure stabilize? | Assuming a flat curve proves global optimality or estimator convergence. |
| Jacobian spectrum | What local linear directions exist? | Claiming global stability from local evidence. |
| Pareto front | What sampled trade-offs are nondominated? | Claiming exact or complete frontier coverage. |
| Sensitivity bar | Which inputs appear influential for the chosen output? | Ignoring ranges, uncertainty, interactions and estimator assumptions. |
| Correlation heatmap | Which sampled variables co-vary? | Inferring causality. |

## Verification, validation and uncertainty

### Verification

Verification asks whether the equations were solved correctly enough. Use:

- step or tolerance refinement;
- independent solver comparison;
- analytic reference cases;
- residual and conservation checks;
- reproducible seeds;
- convergence under larger sample budgets.

### Validation

Validation asks whether the model is adequate for the scientific purpose. It normally requires external observations, held-out data, experiments, domain constraints or expert review.

### Uncertainty

Distinguish:

- numerical error;
- Monte Carlo error;
- parameter uncertainty;
- measurement uncertainty;
- model-form uncertainty;
- scenario uncertainty.

A solver tolerance addresses only numerical integration error. A bootstrap addresses only the resampling design that produced it. A sensitivity range is not automatically a probability distribution.

## Save, share and export

- **Save session** stores configuration locally. Computed evidence must be rerun.
- **Share URL** stores a bounded configuration in the URL. Recompute after opening it.
- **Model JSON** preserves model and numerical settings.
- **Result JSON/CSV** preserves computed evidence when the result is current.
- **Python validation** provides an external scaffold. It must recompute rather than treating the browser result as ground truth.
- **Plot export** is disabled when evidence is stale.

For publication, regulatory work, clinical decisions, safety-critical engineering, or expensive decisions, use an independent validated workflow and retain software environment information.

## Troubleshooting

### Run is disabled

Read the capacity or validation message. Common causes are invalid parameter ranges, nonpositive tolerances, incompatible settings, or an oversized sensitivity workload.

### A plot option is absent

Plot availability is method-dependent. Run the compatible method and enable required options such as second-order indices, response surfaces, or dependence screening. The plot catalogue in Sensitivity explains conditional views.

### A plot is blank

Check status, console errors, finite data, compatible state dimension, and whether the current result is stale. A failed computation should not publish a partial plot.

### The result changes when tolerances tighten

The first run was not numerically stable for the chosen quantity of interest. Continue refinement or move to an external solver.

### A sensitivity ranking changes with the range

This is expected. Global sensitivity describes the declared domain. Report the domain and justify it scientifically.

### The browser refuses a large model

Reduce states, parameters, output points, samples, pairwise interactions, or response-surface resolution. Otherwise export to a server/HPC workflow. Do not remove the guard.

### A stochastic run is censored

Increase the event cap only after checking why event counts are large. Report the censored fraction; do not silently discard those trajectories.

### An optimization candidate is infeasible

Do not label it an optimum. Inspect constraint violation, penalty settings, bounds and alternative starts or algorithms.

## Reporting checklist

A complete report should include:

- scientific question and output;
- model boundary and assumptions;
- equations or rules;
- state and parameter definitions with units;
- initial and boundary conditions;
- parameter values and ranges with provenance;
- numerical method, tolerances, steps, seed and sample budget;
- diagnostics and verification;
- sensitivity or uncertainty evidence;
- software version and exported configuration;
- explicit limitations and non-claims.

## Research provenance

Some public examples are reduced teaching versions inspired by research on fatty-acid metabolism, de novo fatty-acid synthesis, T-cell proliferation, photosynthesis and plant adaptation. They are not complete calibrated reproductions of the research repositories.

Use **Trust and limitations** for the authoritative capability boundary. Use the Model Atlas and research pages for provenance. A successful run demonstrates that the declared reduced model was computed; it does not transfer validation from a publication to an edited browser configuration.
