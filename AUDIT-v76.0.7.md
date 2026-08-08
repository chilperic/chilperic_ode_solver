# Foko Lab v76.0.7 — scientific reliability, model interchange and UX audit

## Executive decision

Foko Lab has a credible browser-scale scientific core and unusually explicit claim boundaries, but v76.0.5 did not fully satisfy the product brief because model authoring was still constrained by a fixed desktop control rail and Model Studio accepted only JSON through its visible import workflow. The v76.0.7 remediation makes model ownership the center of the platform without removing the examples or the 259-entry Model Atlas.

The release is suitable for exploratory, educational and reproducible browser-scale modeling when users respect each lab's stated boundary. It is not a substitute for a production stiff/DAE solver, a general systems-biology standards engine, a certified continuation package, a large Bayesian sampler, a genomic inference pipeline, or an external scientific validation process.

The most important changes are:

1. Model and results panels are dynamically resizable on desktop, with mouse, pen and keyboard operation, a remembered per-lab width, compact/wide/reset controls, and automatic plot resizing.
2. Model Studio and ODE Lab now share one non-executing interchange parser for TXT/ODE, JSON/Model IR, Python and JavaScript data dictionaries, YAML, model-table CSV, and a strict SBML reaction subset.
3. Unsupported SBML semantics fail closed. Events, rules, packages, non-unit compartments, delays, piecewise expressions and unsupported MathML no longer produce a knowingly partial model.
4. CellML, SED-ML and COMBINE/OMEX are recognized and rejected with a useful boundary message rather than misclassified as generic XML.
5. The Model Atlas is presented as a searchable set of validated starting points rather than the product itself. Model status and provenance filters are visible.
6. Twenty distinct, accessible lab accents help orientation while preserving a single platform identity and scientifically meaningful plot palettes.
7. The desktop workflow rail is again a readable vertical control stack; authored “Examples” and “Atlas” labels are preserved, while tablet and phone rails remain horizontal and scrollable.
8. The handbook, practical curriculum, trust matrix and input contract document interchange, validity boundaries and the difference between a model definition and a simulation experiment.

## Audit scope and method

The audit covered the 20 authored modeling/analysis workspaces, the public home page, Model Atlas, handbook, tutorials, trust matrix, creator route, shared navigation, scientific cores, worker boundaries, import/export paths, plotting lifecycle, mobile layout and release runner.

Evidence came from:

- source inspection of every browser numerical core and shared worker boundary;
- deterministic JavaScript core tests and Python contract tests;
- 32 independent numerical comparisons recorded in `REFERENCE_VALIDATION.json`;
- static checks for labels, landmarks, duplicate IDs, script budgets, render ownership and stale-result safety;
- catalog integrity checks over all 259 Atlas entries;
- desktop/mobile interaction scenarios for authoring, plotting, import and navigation;
- comparison with official modeling-standard and platform documentation.

The external benchmark is design guidance, not a parity claim. SBML Level 3 separates a core language from packages, which is why package semantics must not be silently flattened ([SBML specifications](https://sbml.org/documents/specifications/level-3/)). SED-ML represents simulation experiments rather than only model equations ([SED-ML](https://sed-ml.org/)). CellML 2.0 defines a distinct model representation ([CellML 2.0](https://www.cellml.org/cellml/2.0)). OpenCOR exposes simulation settings in a dedicated experiment view ([OpenCOR Simulation Experiment view](https://opencor.ws/user/plugins/simulation/simulationExperimentView.html)), while NetLogo separates interactive model controls from code editing ([NetLogo Interface tab](https://docs.netlogo.org/7.0.3/interfacetab), [NetLogo Code tab](https://docs.netlogo.org/7.0.3/codetab)). SimBiology explicitly distinguishes supported SBML content during import ([SimBiology and SBML](https://www.mathworks.com/help/simbio/gs/simbiology-and-sbml.html)). These patterns support Foko Lab's project/model/experiment distinction and fail-closed standards policy.

## Scientific reliability findings

### Numerical execution and finite-value safety

The deterministic ODE path validates initial states, parameter bindings, time settings and derivative values. Non-finite derivatives stop the computation with the equation, time, state, source scope and likely denominator cause. This directly addresses failures such as `alpha*x - beta*x*y` and `-beta*S*I/N`: a scalar, array or `{value,min,max}` parameter representation is normalized before expression evaluation, and a zero or missing denominator is diagnosed rather than allowed to contaminate later plots.

Adaptive ODE runs expose accepted/rejected steps, function evaluations, minimum/maximum steps and tolerance settings. Fixed-step methods remain intentionally simple browser references. Radau, BDF, LSODA and DOP853 are presented as export routes, not falsely executed browser options. This boundary is scientifically appropriate because the local explicit engine does not claim stiff or DAE capability.

The stochastic core uses seeded direct SSA for time-homogeneous propensities and refuses invalid negative/non-finite hazards. Ensemble summaries are empirical finite-sample quantities, not exact laws. Agent, population-genetic, evolution and randomized optimization paths retain explicit seeds and bounded workloads.

### Independent numerical evidence

`REFERENCE_VALIDATION.json` records 32/32 representative comparisons against independently maintained numerical libraries. These include ODE trajectories, roots, stochastic summaries, fitting/statistics, algebra, networks, optimization and symbolic/reference cases. This is valuable regression evidence, but it does not validate an arbitrary user model, its units, data, structural assumptions or empirical conclusions.

The platform correctly distinguishes:

- execution validity: the configured algorithm ran without invalid numerical state;
- numerical verification: a result is stable to relevant tolerances, grids, seeds or an independent implementation;
- model validation: the model reproduces independent observations for its intended use;
- scientific claim validity: interpretation is supported by design, assumptions and domain evidence.

Only the first two can be partially automated by this browser platform. The interface and trust matrix should continue to prevent users from reading a successful run as a calibration or predictive-validity certificate.

### Sensitivity and inference

Local finite-difference sensitivity, Morris screening, Jansen/Saltelli global variance analysis, pairwise effects, response surfaces, information diagnostics and dependence screening are present. Global analysis supports one or multiple output states while reusing the same seeded design and cached trajectories. This is a sound reproducibility choice: output rankings are comparable because they use the same input sample, but they are not independent replications.

Key limitations remain correctly stated:

- Jansen/Saltelli indices assume independent input ranges as configured;
- Morris sigma mixes nonlinearity and interaction;
- local derivatives are perturbation- and scale-dependent;
- the Fisher information matrix is a local approximation, not an identifiability proof;
- OFAT, tornado and two-parameter response surfaces hold other inputs nominal;
- finite bootstrap intervals and permutation screens are diagnostic, not causal evidence;
- adjoints, eFAST, Shapley effects for correlated inputs, profile likelihood and certified continuation remain unavailable or export-only.

### Optimization, Bayesian and AI methods

CMA-ES uses a real bounded ask/tell path with covariance, eigenvalue, condition, step-size, path, selection, population, evaluation, timing and entropy evidence. Application examples are analytic surrogates; they do not run CFD, finite elements, quantum hardware, molecular dynamics or power-flow engines. The UI must preserve that distinction.

Advanced Methods provides bounded Bayesian conjugate inference, local design, PDE/SDE references, normal forms and reproducible scenarios. AI Modeling provides browser-scale one-input Gaussian-process and seeded random-feature surrogates with residual, uncertainty and diagnostic plots. Neither workspace should be described as general Bayesian computation or deep learning. General MCMC/HMC/NUTS, hierarchical Bayesian models, multi-input kernels, PINNs, neural operators, GPU training and externally validated AI workflows remain important future labs.

### Population genetics, evolution and agents

Population Genetics implements a seeded two-deme, one-locus diploid Wright–Fisher ensemble with selection, dominance, mutation, migration and drift. Its elementary FST is a teaching-scale summary, not a Weir–Cockerham estimator. VCF/PLINK ingestion, linkage, recombination, coalescent/demographic inference, relatedness, ancestry and GWAS are not present.

Evolution Landscape implements finite haploid asexual genotype landscapes with selection, mutation and drift. The live 3D view is relevant because fitness is an explicit landscape and the population path has a meaningful third dimension. Agent Lab conditionally uses live 3D lattice-time visualization; categorical lattice animation remains the default when 3D adds no scientific variable. This is the correct relevance rule—3D is an analytical view, not decoration.

## Model interchange audit

### What users can enter

Model Studio and ODE Lab now accept the following deterministic model definitions:

| Format | Behavior | Safety and scientific boundary |
|---|---|---|
| Plain TXT/ODE | Equations, initials, parameters/ranges, time and method become editable controls | Unknown statements and non-finite values are rejected |
| Foko JSON/project | Full project or model object | Validated and normalized; prior computed arrays are not trusted |
| `foko.model-ir/1` | Direct ODE or reaction network | Smaller than SBML; no events, units, rules, delays or DAEs |
| Python dictionary | Parsed as data only | No Python execution, imports, calls or expressions |
| JavaScript object | Parsed as data only | No JavaScript execution, functions or expressions |
| YAML subset | Nested maps and inline collections | Deliberately dependency-free; not the complete YAML language |
| Model-table CSV | Typed equation/parameter/time rows | Distinct from trajectory-data CSV |
| SBML subset | Reaction species, numeric stoichiometry, parameters and supported MathML | Unsupported semantics reject the complete import |

CellML, SED-ML and COMBINE/OMEX are recognized but not executed. This is not merely a missing feature: each carries semantics that cannot safely be guessed. A future standards lab should use mature libraries and conformance models before enabling them.

### Consistency defect corrected

Before this remediation, Model Studio used the new strict parser while ODE Lab retained a legacy SBML parser that warned and continued after detecting rules, events or compartment scaling. That was a high-severity scientific inconsistency because the same file could produce different semantics depending on entry route. v76.0.7 removes the active legacy path; both workspaces now share `src/core/model-import.js`.

### Recommended future standards roadmap

1. Add SBML Level/version detection, unit diagnostics and official conformance cases.
2. Add SED-ML only when model references, tasks, repeated tasks, ranges, data generators and outputs can be preserved.
3. Add COMBINE/OMEX only with secure local archive inspection and cross-document reference validation.
4. Add CellML through an established parser/converter and explicit component/unit mapping.
5. Keep Model IR as the platform's small internal contract rather than presenting it as a replacement for community standards.

## UX and information architecture findings

### Resizable authoring workspace

The prior fixed left rail made long equations and parameter dictionaries uncomfortable while allocating unused width to plots on some screens. v76.0.7 inserts a true vertical separator between the model panel and results:

- pointer drag from 268–560 px;
- `Left`/`Right` adjustment, `Shift` for larger steps, `Home` compact, `End` wide and `Enter` reset;
- compact, reset and wide buttons inside the model panel;
- per-lab persistence in local storage;
- Plotly/shared lifecycle resize notification after every change;
- hidden below the tablet breakpoint, where explicit Setup/Results/Evidence task panels are clearer than a tiny draggable target.

This pattern is more appropriate than an overlay drawer because equation editing and results comparison remain simultaneously visible on desktop. The separator uses the correct accessible role, orientation, value range, current value and controlled-panel references.

### Navigation and model ownership

The shell retains seven stable destinations: Home, Project, Model, Experiment, Analyze, Evidence and Atlas. Home remains explicit. Project import copy now names the supported formats rather than saying “project JSON.” The Model Atlas is optional and the blank-model path is primary.

Top navigation popovers are generated once by the shared shell, constrained to the viewport and populated on creator/public pages. Mobile uses a modal navigation sheet plus compact bottom routes. Versions and internal migration language remain absent from user-facing navigation.

### Visual hierarchy and color

The platform keeps the dark Abyss header, quiet paper surfaces and cyan/verdigris identity. Each of the 20 scientific labs now has a distinct dark accent rather than sharing one family colour. The full set spans deep cyan, marine blue, forest, olive, ochre, copper, plum, violet and cobalt while retaining a restrained product identity.

Every lab accent passes WCAG AA on white and on its paired soft active-state background; measured contrast ranges from 5.26:1 to 8.06:1. Accents appear on the active workflow control, primary run action, result frame and small orientation labels. Labels and structure still carry meaning, so colour is never the only cue. Scientific plot palettes remain data-driven rather than being recoloured by laboratory identity.

### Plotting and responsive layout

Every authored workspace retains two stable plot hosts and one shared render lifecycle. This prevents duplicated Plotly ownership and inconsistent busy/error state. Desktop supports 2-up and Focus. Phone defaults to a focused result task, contains wide tables, hides the desktop splitter and avoids horizontal document overflow. Live 3D remains available only for mathematically relevant three-state/landscape/lattice-time data.

The platform should continue to resist “fancy plot” inflation. A view belongs only when it exposes a real relationship, uncertainty, numerical diagnostic or decision boundary with explicit axes and provenance.

## Documentation, tutorial and Atlas audit

The handbook contains 770 source lines covering model question, boundary, variables, units, equations, limiting cases, initial conditions, parameter domains, solver choice, verification, validation, sensitivity, reproducibility and claim limits. The practical curriculum contains 21 investigations. Tutorial 21 performs a TXT → run → JSON roundtrip → dictionary import workflow and intentionally tests unsafe/rejected formats.

The 259-entry Atlas passes 2,351 integrity assertions. Cards now expose scientific use and evidence boundary, plus family, lab, status and provenance filters. “Open as editable starting point” is more accurate than treating cards as immutable lessons.

Remaining documentation improvements:

- add downloadable interchange fixtures for every supported format;
- add a standards/conversion troubleshooting table with external tools;
- add unit and dimensional-analysis examples;
- add a publication checklist covering solver convergence, seed convergence, calibration split, uncertainty and provenance;
- generate documentation examples directly from tested fixtures to prevent drift.

## Risk register after v76.0.7

| Risk | Severity | Current control | Next improvement |
|---|---:|---|---|
| Explicit browser ODE solver used on stiff model | High | diagnostics, method boundary, export-only stiff options | stiffness preflight and automatic external workflow bundle |
| User confuses successful execution with model validity | High | trust labels, limitations, stale-result guard | validation-plan panel and data/model discrepancy workflow |
| SBML subset mistaken for general SBML support | High | strict rejection and visible subset wording | conformance suite and per-feature import report |
| Parameter/units inconsistency | High | finite/range checks | declared units and dimensional consistency engine |
| Global sensitivity interpreted outside assumptions | Medium–high | method-specific warnings and range assumptions | correlated-input and dependence-aware workflow |
| Browser workload freezes on large model | Medium | capacity refusal in expensive labs and workers | unified memory/time estimator and cancellation contract |
| Mobile equation editing remains dense | Medium | task panels and vertical textarea resize | full-screen equation editor with live LaTeX preview |
| Laboratory colour becomes decorative or ambiguous | Low | accents limited to orientation surfaces and every lab keeps explicit labels | automated uniqueness, contrast and non-colour-cue regression tests |

## State-of-the-art gaps and recommended next labs

The most scientifically valuable additions are not more presets; they are capabilities that connect a user-owned model to stronger evidence:

1. **Calibration and identifiability Lab** — multi-output likelihoods, observation models, profile likelihood, bootstrap, practical identifiability, train/validation split and posterior predictive checks.
2. **General Bayesian Lab** — MCMC/HMC/NUTS through an external reproducible backend, hierarchical models, diagnostics (R-hat, ESS, divergences), prior/posterior predictive checks and model comparison.
3. **Standards and Units Lab** — SBML conformance, SED-ML experiment mapping, OMEX inspection, CellML conversion, unit declarations and dimensional analysis.
4. **Continuation Lab** — pseudo-arclength continuation, folds, Hopf points, periodic orbits, branch switching and validated links to AUTO-07p/PyDSTool/MatCont-style workflows.
5. **Genomics and Population Inference Lab** — VCF/PLINK import, QC, multi-locus diversity, linkage, PCA/structure, coalescent simulation/inference and explicit privacy boundaries.
6. **Spatial/PDE Lab** — method-of-lines, finite differences/elements, mesh/time convergence, boundary conditions and conservative diagnostics.
7. **Experiment Design and Decision Lab** — multi-output optimal design, uncertainty-aware acquisition, costs/constraints and robust decisions.
8. **Model Comparison Lab** — synchronized runs across alternatives, residual structure, information criteria, predictive validation and reproducible reports.

## Release acceptance criteria

v76.0.7 is acceptable only when all of the following are true:

- active syntax, scientific-core, contract, input, consistency, plot, quality, lifecycle and benchmark gates pass;
- 32 independent numerical reference comparisons pass;
- Model Studio import tests pass for TXT, JSON, dictionaries, YAML and CSV;
- unsafe dictionaries and unsupported standards fail closed;
- desktop splitter and phone task layout pass browser interaction tests;
- all authored labs load, run their representative method and preserve stable plot hosts;
- documentation, tutorials, Atlas and trust content agree with runtime behavior;
- the release archive contains v76.0.7, not v76.0.5, and the local runner selects a fresh port on every invocation.

### Final certification result

- 324/324 active Python contracts passed;
- 32/32 independent differential-reference checks passed;
- 152/152 Playwright browser scenarios passed in a clean one-worker run;
- all seven offline Chromium gates passed, including navigation hitboxes and populated creator menus;
- 129 JavaScript files passed syntax validation;
- 20/20 authored workspaces passed plot geometry and lifecycle checks;
- 21 authored pages passed accessibility/performance budgets;
- the measurable platform benchmark scored 100/100;
- all 2,351 Atlas integrity checks passed across 259 entries.

The test report and archive checksum are the release evidence. Any future unexecuted browser gate must be reported as unverified rather than inferred from static tests.
