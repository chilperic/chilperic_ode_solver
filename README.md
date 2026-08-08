# Foko Lab v77.4.1

Foko Lab is a browser-native scientific modeling workbench. v77 rebuilds the visual identity and information architecture around a user's own model: define or import a system, configure inputs and numerics, simulate it, analyze it, inspect evidence, and export it. The 259-entry Model Atlas and research-derived examples remain strong editable starting points, but they no longer define the product hierarchy.

The **State Observatory** identity represents the platform as several scientific views of one model state: a continuous dynamics/fitness manifold, an inference and uncertainty plane, and a discrete population/agent lattice. A warm observable-state axis joins the layers and an evolutionary branch emerges from the population level. The display identity now states the platform's full workflow explicitly: **MODELING · SIMULATION · VALIDATION**, paired with **Define systems · compute evidence · challenge assumptions** so that validation is not confused with automatic scientific certification. The full emblem carries the richer visual story; the header intentionally simplifies it; the favicon keeps only the structural planes and shared state. The axis/layer structure hides an abstract `F` and the evolutionary split suggests `K`, a restrained Foko Kuate signature rather than an overt monogram. Subject and exact-lab colors adapt in the application shell while quantitative plots retain independent semantic palettes. Scientific labs keep the requested vertical desktop task rail, a pointer/keyboard-resizable model-authoring column, a large results canvas, and a compact evidence inspector. On smaller screens the task rail becomes horizontal and the workspace collapses to a safe single-task stack.

## v76 experience architecture

- Desktop labs use a three-zone modeling layout with a compact vertical workflow rail, sticky build and evidence rails, and a central results canvas.
- Model catalogues are single-column, scroll-bounded and overlap-safe; examples and the full Model Atlas are retained.
- The home page opens as a project-first workspace with an editable, genuinely computed model preview; worked examples, research models and the Atlas remain available below the primary modeling routes.
- Tablet and phone breakpoints preserve Setup, Results and Evidence as explicit tasks, with contained tables and bounded 3D plots.
- Plot headers, selectors and exports follow one consistent visual grammar across the platform.

## Model Studio and model-first navigation

- **21 editable ODE starters** span epidemiology, ecology, kinetics, regulation, physiology, oscillators and chaotic benchmarks; a blank project is always available.
- **15 scientific plot families** include trajectories, heatmaps, live 2D/3D phase geometry, multivariate views, solver diagnostics, and bounded two-parameter heatmap/contour/3D response surfaces.
- **Rendered equations** update from the editable model through vendored KaTeX, with readable plain-text error feedback when an expression cannot be rendered.
- A resizable desktop model/results split gives long equations up to 560 px, supports pointer and keyboard operation, remembers width by lab, and resizes computed plots safely. Phone layouts retain task-based Setup, Results and Evidence views.
- TXT/ODE, project/model JSON, `foko.model-ir/1`, Python/JavaScript data dictionaries, declarative YAML, model-table CSV and a strict SBML reaction subset import into the same editable model. User code is never executed.
- CellML, SED-ML and COMBINE/OMEX are recognized but not executed; unsupported SBML semantics reject the entire import instead of producing a partial model.
- The current model transfers directly into Sensitivity or Steady-State without retyping equations.
- The six top-level destinations are Project, Model, Experiment, Analyze, Evidence and Atlas. Search, Run and creator/trust controls remain globally available.

## New modeling workspaces

- **Bifurcation Lab** accepts an editable scalar dynamical system `dx/dt=f(x, μ)` and computes six synchronized views: equilibrium branches, local stability eigenvalues, equilibrium count, vector field, potential, and residuals.
- **Evolution Landscape Lab** accepts 12 documented starters or complete user-defined genotype–fitness tables and runs seeded finite-population selection, mutation and drift with heatmaps, contours, a rotatable 3D fitness surface, and a live population path with play, pause, generation, speed and trail controls.
- **Agent Lab** adds a rotatable live 3D lattice-time view of the same paced representative realization while retaining the categorical spatial canvas and ensemble evidence.
- **AI Modeling Lab** now provides 12 editable scientific datasets across dynamics, pharmacology, population models, kinetics, evolution, climate and sensing. It fits user-pasted `x,y` data with a Gaussian process or seeded random-feature surrogate and exposes 13 fit, uncertainty, residual, Q–Q, ACF, derivative, coverage and cumulative-error views.

## Modeling handbook and curriculum

- `docs.html` is now a searchable modeling handbook covering question formulation, system boundaries, variables, parameters, units, equations, limiting cases, solver choice, verification, validation, uncertainty, interpretation and reporting.
- `tutorial.html` contains twenty-one practical investigations with a scientific goal, implementation task, deliberate challenge, interpretation checkpoint and reporting outcome, including a model-interchange round trip.
- Tutorial progress is stored locally in the browser.
- Both pages link directly to the relevant scientific workspaces and retain a clear capability boundary between browser-computed, derived, limited, export-only and unavailable methods.

## Sensitivity Analysis depth

- The curated library now contains 17 editable ODE models across 13 scientific families.
- Every model exposes equations, initial conditions, parameter values and ranges, time span, output metric, solver controls and tolerances.
- Local, Morris, Jansen/Saltelli and FIM workflows retain their existing numerical estimators.
- The 35-plot registry includes Jacobians, propagated influence, perturbation convergence, OFAT, tornado, directional profiles, Morris design paths and elementary effects, first/total/second-order variance diagnostics, time/state effects, response surfaces, sampled relationships, MI/HSIC screening and FIM evidence.
- Presentation controls add raw, range-scaled and elasticity views, top-parameter filtering, uncertainty visibility and contour/3D response-surface selection without altering the underlying estimates.
- Oversized browser workloads are refused before a worker starts.
- Global Sobol analysis can target one state or several output states. All selected outputs reuse the same seeded Saltelli design and cached ODE trajectories; each output retains its own ranking, uncertainty, plots and exports.

## Platform-wide stability

The primary navigation follows a model-first path—Project, Model, Experiment, Analyze, Evidence and Atlas—implemented once in a portal shell rather than copied into every page. Authored labs retain a visible configure → run → inspect → export sequence. The release gate covers Model Studio plus ODE, Steady-State, Stochastic, Optimization, Statistics, Curve Fitting, Population Genetics, Advanced Methods, Linear Algebra, Networks, Machine Learning, SciML, Agent, Symbolic, Workbench, Sensitivity, Bifurcation, Evolution and AI Modeling. The creator portrait opens a populated help, trust, research and biography menu. Unsupported items remain explicit rather than appearing as decorative controls.

The v77.4.1 baseline passes 323 active Python contracts, 32/32 independent numerical-reference checks, the 100/100 platform benchmark, model-interchange security checks, and 2,351/2,351 integrity checks over 259 Atlas entries. The complete Playwright route is deliberately separate and must be executed with `--full` on a machine with Chromium; the release does not infer a fresh browser result from static tests.

## Population Genetics and CMA-ES

- Population Genetics provides 13 searchable, deep-linkable examples and 10 plot choices over a seeded, finite two-deme diploid Wright–Fisher ensemble with viability selection, dominance, bidirectional mutation, migration, binomial drift, allele-frequency bands, deme paths, heterozygosity, elementary two-deme FST, fixation/loss and endpoint summaries.
- Optimization provides 15 searchable CMA-ES application surrogates and a real bounded ask/tell CMA-ES path with fitness, mean, σ, coordinate dispersion, covariance diagonal/heatmap/eigenvalues/condition, evolution paths, selection/feasibility ratios, population, distance-to-declared-reference, evaluations/time, runtime and entropy evidence.

## Advanced Methods

The Advanced Methods Lab provides 14 runnable examples across Bayesian conjugate inference, local experiment design, reproducibility manifests, analytic normal-form branches, a CFL-guarded 1D diffusion PDE, a seeded Ornstein–Uhlenbeck SDE ensemble, synthetic genomic population summaries and reproducible scenario sweeps. Bayesian examples expose five posterior, CDF, likelihood, predictive and log-geometry views; every other module exposes at least three computed views, including 3D surfaces where the mathematical object supports them.

## Visualization and phone workflow

- Statistics adds empirical CDF, violin, density-contour, regression scale/location and leverage, residual distribution, group ECDF, bootstrap convergence, moving-range and process-ACF views.
- Phone layouts collapse editable fields and actions to one column, keep tables horizontally contained, use compact 3D canvases and expose Setup, Results and Evidence through a task bar.
- Two-up and Focus plot ownership remains stable across desktop and mobile; presentation controls do not recompute or silently change the scientific estimate.

## Scientific boundaries

Foko Lab still does not claim production Bayesian optimization, certified or multidimensional continuation, Hopf/periodic-orbit analysis, general Bayesian sampling, genomic-file pipelines, linkage/coalescent inference, general SDE/SPDE solvers, PINN/neural-operator training or adjoint sensitivity. The AI workspace is a transparent browser-scale surrogate lab, not a foundation-model or GPU training system.

## Local validation

Run `./test-v77.4.1-local.sh --browser`. It chooses a new free localhost port
on every invocation, runs the reliable scientific, contract, reference and
static-quality baseline, starts the server only after that baseline passes, and
opens the platform in the default browser. `--demo` is an alias. Add `--full`
only when you intentionally want every offline Chromium regression and the
complete Playwright release-certification suite before startup. Use `--serve`
to start without opening a browser or `--skip-install` when dependencies are
already present.
