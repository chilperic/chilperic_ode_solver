# Foko Lab v76.2.0 — scientific, product and experience audit

## Release decision

v76.2.0 is a visual-system and information-architecture rebuild over the validated v76 scientific cores. It replaces the rejected dark-teal identity, duplicated home-page layers and catalogue-first presentation. Numerical engines, editable model inputs, the 259-model Atlas, research examples and explicit capability boundaries remain intact.

The release is appropriate for transparent browser-scale modelling within [the documented limits](LIMITATIONS-v76.2.0.md). It is not a production stiff/DAE solver, certified continuation package, general Bayesian engine, genome-scale genetics pipeline or substitute for independent scientific validation.

## What was audited

- all 36 authored pages and the shared desktop/phone application shell;
- Model Studio, all 20 scientific labs, project interchange and Model Atlas routing;
- ODE, stochastic, steady-state, bifurcation, agent, population-genetic and evolution paths;
- global sensitivity, CMA-ES, fitting, Bayesian-reference, statistics and AI/SciML paths;
- plot ownership, diagnostics, non-finite handling, semantic colour, LaTeX and 3D boundaries;
- responsive layout, keyboard/touch navigation, panel resizing, creator access and public copy;
- release scripts, fresh-port localhost startup, validation evidence and packaging.

## Major findings and remediation

| Severity | Finding | Risk | v76.2.0 remediation | Evidence |
|---|---|---|---|---|
| High | Home mixed a modelling workspace with a long demo/teaching reel. | The product looked like a list of examples rather than a tool for a user’s model. | Home was rebuilt from a blank document structure: editable live model, three problem routes, complete workspace map, strong starting models, evidence contract and creator path. | Product-shell, home runtime and active Python contracts. |
| High | GUI identity and plot colour could become conceptually entangled. | Branding could change the scientific meaning of series, heat maps or uncertainty. | Six subject colours and 20 lab accents orient only the shell; scientific plots retain categorical, sequential, diverging and uncertainty palettes. | Professional experience audit and plot-control audit. |
| High | Long equations competed with plots in a fixed layout. | Input text clipped while evidence was squeezed. | A keyboard/pointer resizable authoring panel persists per lab and requests plot reflow; the rail collapses to a horizontal task strip below 900 px. | 101 workspace and import contracts. |
| Medium | The prior mark used a familiar badge/grid metaphor and did not survive the rejected palette. | Weak differentiation and visual dependence on one dark header. | New free-standing **Phase Monogram**: an evolving trajectory, a model state and a coral evidence endpoint. Compact, display, mono, favicon and adaptive runtime forms share the geometry. | SVG accessibility, geometry and raster-size tests. |
| Medium | Large fonts, decorative boxes and deep card stacks created visual noise. | Low information density and mobile fatigue. | Warm paper canvas, carbon typography, light application bar, restrained borders, smaller type scale, flatter panels and limited shadow hierarchy. | Responsive product contracts and accessibility audit. |
| Medium | Lab colours existed but were not systematic across routes. | Users could not build spatial memory across related methods. | Subject and exact-lab identity now propagate through menus, home, workspace rail, run action, result keyline and Atlas cards. | Six-family/20-lab token audit with unique AA accents. |
| Medium | Retired home demos still owned regression tests. | Tests encouraged preservation of rejected UI rather than product behaviour. | Tests now assert editable-model recomputation, canonical engine provenance, strong-model availability and project-first structure. | 322 active contracts and updated browser scenarios. |

## New visual system

The platform identity uses four stable colours:

- carbon `#1B1B1F` for scientific text and model structure;
- ultramarine `#3146D3` for platform identity and primary orientation;
- coral `#E85D3F` for a computed endpoint or decisive action;
- warm paper `#F6F4EF` for the modelling canvas.

Subject and lab accents are intentionally subordinate to this identity. Colour is never the only label. Every maintained subject/lab accent passes WCAG AA on white and on its paired tint; the interface also includes forced-colour and reduced-motion fallbacks.

The Phase Monogram is not a literal microscope, atom, hexagon or generic technology badge. Its upper trajectory represents the question/subject, the state point represents the editable model and the lower trajectory ends at evidence. The runtime form can inherit subject colour without changing the mark’s silhouette.

## Model-first information architecture

Home now answers four questions in order:

1. Can I create and run my own model? — an editable logistic model computes immediately with the canonical ODE engine.
2. Where do I begin? — equations/reactions, populations/agents or observations/hybrid models.
3. Which connected workspace fits next? — six scientific subjects expose all 20 labs without hiding them in an empty menu.
4. What can I trust? — computed, limited, export-only and unavailable states are explicit.

Examples remain scientifically important, but are presented as editable starting points. The strong-model section keeps fatty-acid metabolism, population genetics, CMA-ES, multi-output Sobol/Morris, evolution landscapes and scientific AI, with a direct route to the complete 259-entry Atlas.

## Scientific reliability findings

### Finite values and model inputs

The ODE boundary normalizes scalar, array and `{value,min,max}` parameters before expression evaluation. Domain failures report the equation, time, state and likely cause. The known failures `alpha*x - beta*x*y` and `-beta*S*I/N` therefore stop at the model boundary instead of silently painting a non-finite curve.

Users can edit states, equations, initial conditions, parameter values/ranges, time span, tolerances, method and selected outputs. Model Studio accepts TXT/ODE, JSON/Model IR, safe dictionary-shaped Python/JavaScript text, declarative YAML, model-table CSV and a strict SBML reaction subset. Imported code is data and is never executed.

### Sensitivity and uncertainty

Global sensitivity supports one or multiple output variables on a shared seeded design. Local finite differences, Morris and Jansen/Saltelli remain bounded estimators with convergence, uncertainty and evaluation-budget evidence. Dependent-input Shapley effects, adjoint sensitivities and validated FAST/eFAST remain unavailable rather than cosmetically imitated.

### Optimisation, Bayesian and AI methods

CMA-ES retains real ask/tell evolution with fitness, step size, covariance, eigenvalue, coordinate-dispersion, diversity and runtime evidence. Advanced Methods remains a bounded collection of executable references, not a claim of general MCMC/SMC/VI. AI workspaces use transparent browser-scale surrogates and diagnostics; they do not train foundation models, PINNs, neural operators or distributed GPU systems.

### Agents, genetics and evolution

Agent 3D is contextual: a lattice or 2D state view remains default unless a third axis represents space, time, state or fitness. Population Genetics remains a documented finite two-deme, one-locus diploid Wright–Fisher ensemble. It does not claim VCF/PLINK, linkage, coalescent, pedigree, demographic-history or GWAS capability.

## Residual risks

| Risk | Severity | Current control | Recommended next investment |
|---|---:|---|---|
| Stiff, DAE, delay or event-rich user model | High | explicit solver scope and finite diagnostics | stiffness preflight and external solver bundle |
| Successful execution mistaken for scientific validity | High | evidence states and limitations | validation-plan and model-discrepancy workflow |
| Unit or dimension inconsistency | High | documented values and export | unit-aware expression and dimensional-analysis engine |
| General Bayesian/genomic request exceeds browser references | Medium | explicit unavailable/export boundary | validated backend integrations |
| Dense phone equation authoring | Medium | single-task layout and horizontal rail | full-screen equation editor with split LaTeX preview |
| External assistive-technology coverage | Medium | source, keyboard, contrast and responsive gates | user study with screen readers and switch access |

## Verification boundary

The baseline requires syntax/engine, identity, studio/import, scientific core, active contract, user-input, consistency, plot, accessibility, lifecycle, benchmark and independent-reference gates. Chromium-only scenarios remain under `./test-v76.2.0-local.sh --full`.

This build environment had no Chromium executable. The browser download endpoint returned a certificate-timing 502, so no fresh Playwright result is claimed here. The tests remain packaged for execution on the user’s browser-capable machine. See [VALIDATION.md](VALIDATION.md).
