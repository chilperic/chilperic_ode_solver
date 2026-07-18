# Foko Lab v72.48.0 — external platform benchmark

## Scope

This benchmark evaluates Foko Lab against established scientific modeling software in four dimensions: scientific reliability, platform stability, task-oriented UX, and modern GUI structure. It does **not** claim numerical or feature parity with larger desktop/server platforms.

## Comparator set

| Platform | Relevant benchmark strength | Official source |
|---|---|---|
| VCell | Web-accessible cellular modeling environment, central model database, multiple physical approximations and simulation technologies | https://vcell.org/ |
| SimBiology | Integrated model building and analysis apps; model structure/equation verification; simulation, parameter estimation, sensitivity and parameter sweeps | https://www.mathworks.com/products/simbiology.html |
| COPASI | Mature biochemical-network simulation and analysis; ODE/SDE/Gillespie, SBML, parameter estimation and task-specific workflows | https://copasi.org/ |
| Tellurium | Reproducible systems-biology workflows using SBML, SED-ML and COMBINE archives | https://tellurium.readthedocs.io/ |
| Cell Collective | Browser-based, open and collaborative biological-network construction and simulation | https://cellcollective.org/ |
| BioUML | Web-based systems-biology and data-analysis platform with visual workflows and server execution | https://www.biouml.org/ |

## Benchmark findings

### 1. Scientific reliability

**Benchmark pattern:** COPASI and SimBiology organize computation as named scientific tasks and expose model verification or task-specific evidence before interpretation. Tellurium treats exchangeable model and experiment specifications as first-class reproducibility artifacts.

**Foko Lab action in v72.48.0:**

- one canonical browser core per method;
- independent differential reference checks;
- browser-computed, derived, limited, export-only and unavailable claim boundaries;
- method, tolerances, seeds, residuals, feasibility and termination evidence remain attached to results;
- every maintained Sensitivity preset is executed through the same worker and ODE core in release tests;
- large browser workloads are refused before computation rather than partially rendered;
- unsupported adjoint, FAST/eFAST, Shapley, PINN, SPDE and certified-continuation claims remain unavailable or export-only.

**Remaining gap:** Foko Lab does not provide complete SBML/SED-ML/COMBINE round-trip support, a certified stiff ODE solver, or the solver breadth of COPASI, VCell and SimBiology.

### 2. Platform stability

**Benchmark pattern:** mature tools separate model state, analysis task, result state and view state. A plot selector does not own the workspace layout.

**Foko Lab action:**

- exactly two stable plot hosts in every authored workspace;
- Two-up and Focus remain explicit layout states;
- changing a plot cannot silently change layout;
- Plotly operations are serialized per stable host;
- custom canvas and animation renderers use the same lifecycle contract;
- rendered, failed, pending and empty states expose explicit accessibility state;
- all maintained preset suites remain release blockers;
- documentation, tutorial, Trust and capability metadata are checked against runtime capabilities.

### 3. UX

**Benchmark pattern:** SimBiology and COPASI lead with the user’s task—build, simulate, estimate, scan and inspect—not internal architecture. VCell separates biological model, application and simulation. Cell Collective minimizes programming requirements for model construction.

**Foko Lab action:**

- the public guide is now a searchable modelling handbook rather than a feature inventory;
- a twenty-investigation curriculum teaches question formulation, equations, units, solver choice, validation, uncertainty and reporting;
- Sensitivity examples can be searched and filtered by scientific family;
- method-dependent plots explain why a view is conditional or unavailable;
- presentation controls improve scientific readability without altering the underlying estimates;
- developer terminology stays outside the public workflow.

### 4. Modern GUI and performance

**Benchmark pattern:** modern scientific platforms use persistent task navigation, clear workspace hierarchy, bounded side panels, stable canvases and progressive disclosure of diagnostics.

**Foko Lab action:**

- all scientific workspaces retain stable two-panel geometry;
- Sensitivity rankings support top-parameter filtering and explicit raw, range-scaled and elasticity views;
- searchable model cards and method maps reduce dropdown ambiguity;
- mobile layouts remain bounded;
- browser workload estimation includes global samples, pairwise interactions, OFAT, convergence and response-surface grids;
- accessibility, performance and plot-lifecycle budgets remain release blockers.

## Positioning after v72.48.0

Foko Lab is not positioned as a replacement for COPASI, VCell, SimBiology, Tellurium, Cell Collective or BioUML. It is a zero-install, local-first scientific workspace for rapid model construction, bounded computation, diagnostic inspection, comparison, teaching and export.

Its strongest differentiators are:

1. local/private computation without an account;
2. explicit evidence and non-claim boundaries beside each result;
3. rapid worked examples and editable scientific configurations;
4. a modelling handbook and practical curriculum tied to the live labs;
5. a machine-readable capability registry and first-class Trust page.

Its most important future interoperability work remains SBML import and standards-based experiment packaging. Its most important numerical boundary remains stiff systems, high-dimensional optimization and large global-sensitivity workloads, which require independent implicit-solver and server/HPC verification.

## v72.48.0 taxonomy positioning

The platform distinguishes implemented browser computation from finite derived diagnostics, bounded reduced analyses, export workflows and unavailable methods. The extensive historical wish list is treated as a roadmap, not as a set of automatically enabled buttons.

Current gaps include advanced optimization solvers, certified continuation and bifurcation analysis, correlated-input sensitivity, Shapley/eFAST workflows, full Bayesian inference, production deep-learning training, SDE/SPDE solvers and server-backed large-model studies.
