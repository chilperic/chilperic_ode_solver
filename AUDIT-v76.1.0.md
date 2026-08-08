# Foko Lab v76.1.0 — professional scientific, product and UX audit

## Executive decision

The previous interface contained many of the requested scientific methods, examples and color variables, but it did not communicate a coherent modelling platform. The logo was a static ornament, subject grouping was not visible, individual lab colors did not propagate consistently, and one shared plotting control made GUI identity the default data palette. That last defect was scientifically inappropriate: navigation color and quantitative meaning are different systems.

v76.1.0 corrects those defects without replacing the validated numerical cores. The release is suitable for exploratory and reproducible browser-scale modelling within the published limits. It is not a production stiff/DAE solver, a general Bayesian engine, a certified continuation package, a genome-scale pipeline or a substitute for independent scientific validation.

## Scope and method

The audit covered the shared application shell, all twenty scientific labs, Model Studio, home, Model Atlas, public/creator routes, import/export, plotting defaults, responsive layout, accessibility tokens, documentation, release evidence and local runner. Evidence was obtained from source inspection, executable core tests, active Python contracts, independent numerical comparisons, catalog integrity checks, static browser contracts and official modelling-platform documentation.

External comparisons are design references, not parity claims. COMSOL coordinates Model Builder, Settings and Graphics in adjustable layouts; Simulink connects live controls and displays to the model; AnyLogic combines modelling methods with 2D/3D visualization; Wolfram System Modeler connects modelling, simulation and analysis. Foko Lab applies those product principles at browser scale. See [BENCHMARK-v76.1.0.md](BENCHMARK-v76.1.0.md).

## Findings and remediation

| Severity | Finding | Professional risk | Remediation in v76.1.0 | Verification |
|---|---|---|---|---|
| High | The shared plot control defaulted to “Lab identity.” | Interface branding could override the semantic meaning of categorical or analytical data. | Default changed to **Scientific categorical**; sequential, diverging and uncertainty scales remain semantic; **Lab accent · presentation only** is last and explicit. | Source gate verifies option order and fallback. |
| High | Subject and lab colors existed mainly as hidden variables. | Users could not build spatial memory or distinguish related methods from exact tools. | Six subject families and twenty unique lab identities now propagate into the adaptive mark, menus, rails, run action, home routes, results and Atlas. | Taxonomy and contrast audit plus shell contracts. |
| Medium | A fixed SVG image could not reflect context and the mark did not explain the platform. | Weak brand recognition; no relationship between modelling, computation and evidence. | New **Model Field** SVG system: scientific inputs converge on a model kernel, a computed path exits it and an evidence point closes the mark. Runtime geometry adapts to subject and lab. | SVG XML/accessibility checks and runtime brand contracts. |
| Medium | Two stylesheets declared different lab palettes. | Cascade order could change identity between pages. | `v76-system.css` is authoritative; `lab-identity.css` is now a token-consuming compatibility bridge with no palette declarations. | Professional experience audit rejects a second palette. |
| Medium | Menu, home and Atlas cards used nearly uniform blue styling. | Navigation felt like a list of examples rather than one modelling environment. | Routes carry `data-subject-target` and `data-lab-target`; exact colors appear as compact keylines, icons and action cues while labels remain primary. | Home and Atlas source contracts; responsive shell checks. |
| Medium | Validation evidence was stale and referenced a missing limitations file. | Users could mistake historical counts for current certification. | Validation record updated, release-specific limitations added and browser claims explicitly conditioned on an executed Chromium gate. | Release evidence audit. |
| Low | Some public/research pages lacked an explicit lab identity. | Header context could fall back inconsistently. | Shell infers the maintained route identity and attaches it to the page before rendering. | Route taxonomy contract. |

## Identity architecture

The visual system has two deliberately separate levels:

| Subject family | Included scientific labs | Orientation cue |
|---|---|---|
| Model engineering | Model Studio, Workbench | Cyan / slate |
| Dynamical systems | ODE, Stochastic, Steady State, Bifurcation | Marine / teal / blue |
| Populations and evolution | Agent, Population Genetics, Evolution Landscape | Forest / olive |
| Inference and uncertainty | Sensitivity, Optimization, Fitting, Statistics, Advanced Methods | Ochre / copper / plum / analytical blue |
| Scientific intelligence | AI Modeling, SciML, Machine Learning | Violet family with distinct lab accents |
| Mathematical structure | Linear Algebra, Networks, Symbolic | Cobalt / marine / purple |

The subject hue groups related workflows. The lab hue identifies the exact tool. Labels, icons, location and headings still communicate the same meaning, so color is never the only cue. All maintained subject and scientific-lab accents pass WCAG AA against white, their paired soft surface and the dark header.

The logo is not a collection of twenty separate marks. One sophisticated mark adapts its field orbit to the subject and its result/evidence path to the lab. This retains brand recognition while making context visible.

## Scientific reliability review

### Execution and finite values

The deterministic ODE boundary normalizes scalar, array and `{value,min,max}` parameters before evaluating equations. Invalid derivatives stop with equation, time, state and likely-cause context. This directly covers failures such as `alpha*x - beta*x*y` and `-beta*S*I/N`; missing or zero denominators do not silently propagate into plots.

Expensive workflows retain explicit browser budgets. Stochastic, population, evolution, AI and optimization paths retain seeds where reproducibility depends on randomized computation. A completed browser run demonstrates execution of the implemented path, not validity of a user’s assumptions, units or intended claim.

### Sensitivity and inference

Local finite differences, Morris and Jansen/Saltelli workflows remain bounded estimators with documented assumptions. Global sensitivity accepts one or several output variables and reuses one seeded design; each output retains its own estimates and evidence. Adjoint methods, dependent-input Shapley effects and validated FAST/eFAST remain unavailable rather than represented by cosmetic plots.

Fitting, FIM and Bayesian-reference diagnostics remain conditional on model structure, observations and finite samples. They do not establish structural identifiability, causal validity or posterior convergence for general models.

### Optimization, AI, agents and evolution

CMA-ES exposes a real bounded ask/tell computation and its covariance, step-size, path, population, runtime and diversity evidence. Application cards are modelling surrogates; they do not execute external CFD, finite-element, quantum or molecular engines.

AI Modeling uses transparent browser-scale surrogates and diagnostic plots. It does not train foundation models, PINNs, neural operators or large GPU systems. Agent and Evolution 3D are contextual: landscape/state/lattice-time views appear where the axes represent a scientific object; the live lattice remains the appropriate default elsewhere.

### Population genetics

The Population Genetics core remains a finite two-deme, one-locus diploid Wright–Fisher ensemble with documented selection, dominance, mutation, migration and drift. It is not a VCF/PLINK, linkage, coalescent, demographic-history, relatedness or GWAS pipeline. Those gaps are explicit in [LIMITATIONS-v76.1.0.md](LIMITATIONS-v76.1.0.md).

## Model ownership and interchange

Foko Lab remains a modelling platform, not a teaching catalogue. The user can start blank or import TXT/ODE, JSON/project, `foko.model-ir/1`, safe Python/JavaScript dictionary-like data, declarative YAML, model-table CSV or a strict SBML reaction subset. Inputs become editable states, equations, initial conditions, parameters/ranges, time span and solver controls. Imported code is never executed.

Examples and the 259-entry Atlas remain valuable starting points. They are secondary to model creation and route into editable workspaces. CellML, SED-ML and OMEX are recognized but not executed because silently guessing their semantics would reduce scientific reliability.

## UX and responsive review

- Desktop labs retain a readable vertical Examples → Model → Simulation → Export rail.
- The model/results split supports pointer and keyboard resizing for long equations and parameter dictionaries, remembers width and requests plot resize after adjustment.
- At compact breakpoints, the rail becomes horizontal and scrollable; phone layouts expose explicit Setup, Results and Evidence tasks rather than squeezing desktop panels.
- Home remains a visible primary destination in desktop, mobile sheet and bottom navigation.
- Creator, help and provenance menus are populated by the shared shell and constrained to the viewport.
- Plot hosts retain stable ownership, 2-up and Focus modes, bounded tables and contextual 3D canvases.
- Internal version text is kept out of normal navigation and product copy; it remains only in validation/export provenance where it is scientifically useful.

## Documentation and evidence review

The handbook, tutorial, Atlas and input contract remain aligned with the editable workflow. Documentation distinguishes model definitions, simulation experiments, numerical verification and empirical model validation. The release limitations now collect method boundaries in one auditable file.

The release record does not infer a browser pass from source inspection. `./test-v76.1.0-local.sh --full` is the complete Chromium route; the reliable baseline and independent references run before the optional localhost server starts.

## Residual risk register

| Risk | Severity | Current control | Recommended next investment |
|---|---:|---|---|
| Explicit ODE method applied to a stiff/DAE system | High | finite diagnostics and explicit scope | stiffness preflight and external solver bundle |
| Successful run interpreted as model validity | High | evidence states and limitations | validation-plan and model-discrepancy workflow |
| Units or parameter dimensions inconsistent | High | finite/range validation | units and dimensional-analysis engine |
| Browser workload exceeds device capacity | Medium | preflight refusal and workers | unified memory/time estimator and cancellation contract |
| General Bayesian or genomic need exceeds examples | Medium | honest unavailable/export boundary | dedicated validated backend integrations |
| Dense mobile equation authoring | Medium | task panels and vertical resize | full-screen equation editor with live LaTeX preview |
| Accessibility gaps outside static contracts | Medium | keyboard, contrast and responsive gates | external assistive-technology and user study |

## Acceptance criteria

The release is acceptable when syntax, identity, scientific-core, active contract, input, consistency, plot, quality, lifecycle, benchmark and independent-reference gates pass; the archive contains v76.1.0; an extracted archive starts on a fresh localhost port; and any unexecuted browser gate is reported as unverified rather than inferred.

Current measured results are recorded in [VALIDATION.md](VALIDATION.md). The limitations file remains part of the scientific contract, not optional release notes.
