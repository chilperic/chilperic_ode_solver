# Foko Lab v72.43.1 — analysis taxonomy and scientific capability audit

## Executive finding

The supplied plot/problem catalogue is valuable as a product taxonomy but cannot be exposed as a flat list of working tools. The audit therefore separates names from computational claims. Runtime menus contain only views backed by current results; absent algorithms remain visible only as reference boundaries.

## Implemented, computed or finite-derived evidence

- Optimization: landscapes, convergence, gradient/Hessian diagnostics, candidate trajectories, feasibility history, finite Pareto sets, dominance, crowding distance, hypervolume prefixes, objective correlation, knee points, and local finite-difference sensitivity.
- Steady-State: residual evidence, Jacobian spectra/sign structure, local stability interpretation, local stiffness ratio, finite parameter scans, and sequential branch sensitivity.
- Documentation: one source taxonomy rendered in Optimization, Steady-State, and Docs.

## Explicit non-claims

No browser result is fabricated for Bayesian optimization, CFD drag/lift solvers, topology optimization, neural-network training, nonlinear MPC, adjoint methods, Sobol/eFAST/Morris/Shapley engines, profile likelihood, structural-identifiability proof, pseudo-arclength continuation, certified bifurcation diagrams, or periodic-orbit continuation.

## Release blockers

- taxonomy sections with missing or duplicate requested entries;
- runtime menus exposing entries marked unavailable or export-only;
- multi-objective diagnostics without a computed finite Pareto sample;
- sensitivity labels that omit finite-difference or finite-scan limitations;
- disagreement between JSON, Markdown, Docs, and lab capability cards.


## Executive finding

The repeated Two-up failures were not isolated Plotly defects. They were symptoms of duplicated render ownership, obsolete three-panel state, inconsistent completion markers, and public/static asset archaeology. The release therefore applies one platform-wide contract rather than another page-specific patch.

## Implemented changes

### Render lifecycle

- One shared lifecycle owns Plotly `newPlot`, `react`, `purge` and resize.
- Thirteen authored workspaces delegate to that lifecycle.
- Direct Plotly lifecycle calls in workspace controllers are forbidden by CI.
- Plot hosts are stable DOM nodes.
- Render requests are serialized per host; stale requests cannot publish state.
- Canvas and animation renderers use explicit lifecycle takeover rather than competing with Plotly.
- `data-render-state` and `aria-busy` are finalized together for rendered, fallback, failed, pending and empty states.

### Layout surface

- Every authored workspace has exactly two plot cards: left and right.
- All third-card DOM, state, export and layout branches remain removed.
- The shared event-driven guard records explicit layout intent before plot changes and reasserts it after plot completion and bounded delayed checkpoints.
- No MutationObserver or ResizeObserver is used as a layout-repair mechanism.
- All scientific plot types remain selectable.
- Focus remains explicit; selector changes, example loads, and asynchronous results cannot select Focus.

### Asset and CSS hygiene

- Six historical public CSS layers were consolidated into one stable public shell.
- A separate compact profile shell preserves the CV cascade.
- Four unreferenced stylesheets were deleted.
- The stylesheet inventory fell from 21 to 13.
- Public pages now request at most five stylesheets.
- No referenced stylesheet is missing or orphaned.

### Public UX and research presentation

- The homepage leads with building, testing and comparing models.
- The creator profile occupies the right rail and carries the audited professional title.
- Thermoplants is a visual research hero based on the supplied graphical abstract rather than a small text card.
- “real cores,” “toy tool,” visible release-number promotion and similar implementation language remain excluded.
- Workbench examples are deeper and their plot menus expose distinct views derived from one result contract.
- Mathematical Beauty is restored to Explore and includes interactive topology/manifold surfaces.
- The Trust route remains linked as “Methods and limits.”

### Critical review of the supplied plot blueprint

The blueprint was treated as a catalogue of candidate evidence views, not as a requirement to fabricate 130 plots. This release adopts views already supported by current browser cores: ODE phase trajectories, derivative norms, final-state and range summaries; stochastic Fano and joint endpoint evidence; and optimization landscapes and objective distributions. It also adds scientifically recognizable Lorenz, FitzHugh–Nagumo, Brusselator, stiff-relaxation, two-stage gene-expression, and Rastrigin examples.

Views requiring absent algorithms remain out of scope: certified Lyapunov spectra, Poincaré sections without event detection, pseudo-arclength continuation, periodic-orbit branches, structural-identifiability proofs, trained PINN diagnostics, SHAP, Louvain convergence histories, GPU occupancy, MPI scaling, and similar outputs. They must not appear merely because they are visually attractive.

## Scientific reliability audit

Preserved:

- one deterministic ODE core boundary;
- independent differential reference validation;
- explicit method, tolerance, seed, residual, feasibility and termination evidence;
- no fabricated PINN, operator-learning, continuation or certification outputs;
- 189 Atlas entries and provenance classes;
- seeded stochastic and Agent reproducibility;
- explicit export boundaries for methods not computed in-browser.

Not claimed:

- certified stiff integration;
- complete root/bifurcation enumeration;
- global optimization certificates;
- structural identifiability proof;
- full SBML/SED-ML/COMBINE interoperability;
- server collaboration or persistent model repository;
- deep-learning training in the browser.

## Stability audit

Release blockers now include:

- more or fewer than two plot hosts in an authored workspace;
- a controller directly invoking Plotly lifecycle operations;
- a controller retaining third-panel state;
- a registry listening to plot-selector changes or writing layout;
- a rendered host without `aria-busy="false"`;
- mixed runtime cache tokens;
- orphan or missing CSS;
- failed numerical, contract, quality, lifecycle, benchmark or browser tests.

## Remaining debt

The consolidated public shell still contains historical selector debt and many `!important` declarations. Consolidating request layers removes runtime ordering conflicts, but full selector-level CSS normalization should be performed incrementally with visual regression coverage rather than by deleting declarations blindly.

Standards interoperability is the largest product gap relative to Tellurium and COPASI. Certified stiff solving is the largest numerical gap relative to COPASI, VCell and SimBiology.

## v72.43.1 Agent interaction closure

- Root cause: the Agent plot grid itself carried `data-focus-side` and received the same click handler as the two Focus buttons.
- Correction: only `.focus-card[data-focus-side]` can enter Focus.
- Live lattice and time-curve canvases are selected by plot type and may render on either side.
- Selector swaps preserve the preferred layout and remount only the affected live panels.
- New regressions cover a real dropdown click, pre-run swap, live-run swap, panel ownership and Two-up persistence.

## Agent validation closure

The local v72.41.5 gate did not reach its Agent layout assertions: it selected speed value `120`, while the rendered control exposes `180`, `90`, `45`, and `24`. v72.43.1 validates test inputs against the HTML control schema before browser execution.

A separate offline Chromium audit uses the actual release HTML, CSS, Plotly bundle and Agent runtime. It confirmed equal visible panels, preferred/effective two-up persistence, live spatial/time-curve swapping, delayed completion and exactly one active render root per panel. This supplements rather than replaces the complete localhost Playwright suite.

## v72.43.1 plot, control and computation closure

- All Plotly calls pass through `FokoPlotLayout.normalize` before rendering.
- Duplicate in-plot titles are removed when a plot already has a semantic card heading.
- Legend and axis geometry is normalized across Optimization, Stochastic, ODE, Steady-State, Symbolic and the remaining authored workspaces.
- Action controls use a shared minimum-height and overflow contract.
- Steady-State now exposes 26 curated systems and auto-solves on selection; every default converges in the numerical gate.
- Symbolic now exposes 20 curated systems and auto-analyzes on selection.
- A dedicated audit and offline Chromium gate cover plot geometry, clipping, example depth and successful computation.
