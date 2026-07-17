# Foko Lab v72.44.0 — external platform benchmark

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

**Foko Lab action:**

- one canonical browser core per method;
- independent differential reference checks;
- computed, limited-browser, export-only and unavailable claim boundaries;
- method, tolerances, seeds, residuals, feasibility and termination evidence remain attached to results;
- all active plot controllers use one shared render lifecycle;
- public scientific examples remain derived from current computation rather than decorative arrays.

**Remaining gap:** Foko Lab does not yet provide complete SBML/SED-ML/COMBINE round-trip support, a certified stiff ODE solver, or the solver breadth of COPASI/VCell/SimBiology.

### 2. Platform stability

**Benchmark pattern:** mature tools separate model state, analysis task, result state and view state. A plot selector does not own the workspace layout.

**Foko Lab action:**

- exactly two stable plot hosts in every authored workspace;
- Two-up and Focus are explicit layout states;
- changing a plot cannot silently change layout;
- Plotly operations are serialized per stable host;
- custom canvas/animation renderers take over through the same lifecycle contract;
- rendered, failed, pending and empty states finish with explicit accessibility state;
- metadata registries cannot resize plots or listen to plot selectors;
- direct Plotly lifecycle calls in workspace controllers are CI blockers.

### 3. UX

**Benchmark pattern:** SimBiology and COPASI lead with the user’s task—build, simulate, estimate, scan, inspect—not internal architecture. VCell separates biological model, application and simulation. Cell Collective minimizes programming requirements for model construction.

**Foko Lab action:**

- homepage language now starts with model/data tasks and evidence;
- worked examples compute by default where bounded and safe;
- developer terminology is kept out of the public interface;
- Workbench is framed as comparing analyses rather than composing adapters;
- every retained workspace exposes the same Two-up/Focus interaction model;
- the Trust page remains a first-class route for methods and limitations.

### 4. Modern GUI and performance

**Benchmark pattern:** modern scientific platforms use persistent task navigation, clear workspace hierarchy, bounded side panels, stable canvases, and progressive disclosure of diagnostics.

**Foko Lab action:**

- third simultaneous plot cards were removed from every workspace;
- all plot types remain available through two selectors;
- public stylesheet requests were consolidated from seven legacy layers into one public shell;
- unused CSS files were removed;
- plot cards and diagnostics use a calmer, consistent hierarchy;
- mobile mode retains a single focused plot without page overflow;
- static and browser accessibility/performance budgets remain release blockers.

## Positioning after v72.44.0

Foko Lab is not positioned as a replacement for COPASI, VCell, SimBiology, Tellurium, Cell Collective or BioUML. It is positioned as a zero-install, local-first scientific workspace for rapid model construction, bounded computation, diagnostic inspection, comparison and export.

Its strongest differentiators are:

1. local/private computation with no account;
2. explicit evidence and non-claim boundaries beside each result;
3. rapid worked examples and shareable configurations;
4. a broad cross-method teaching and exploration surface;
5. a Trust page and machine-readable capability registry.

Its most important future interoperability work is SBML import and standards-based experiment packaging. Its most important numerical boundary remains stiff systems, which require independent implicit-solver verification.

## v72.44.0 taxonomy positioning

The integrated taxonomy improves discoverability without claiming parity with the comparator platforms. Foko Lab now distinguishes working browser computations from finite derived diagnostics, limited reduced analyses, export-only workflows, and unavailable algorithms. This is deliberately stricter than presenting every recognized method as an active button.

The immediate capability gaps remain advanced optimization solvers, standards-based model/experiment exchange, certified continuation and bifurcation analysis, and mature global/structural sensitivity engines.
