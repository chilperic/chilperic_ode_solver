# v77.4.1 — command-palette dismissal patch

- Gives the corrected shell and stylesheet a new `77.4.1` cache token so an older localhost session cannot reuse the broken v77.4.0 modal CSS.
- Makes command-palette dismissal redundant by design: closing sets both the semantic `hidden` state and inline `display:none`; the stylesheet also enforces `[hidden]` with `!important`.
- Keeps three independent dismissal paths: **Esc**, outside/backdrop click, and a visible **Esc ×** button.
- Extends the navigation browser regression to open and dismiss the palette repeatedly instead of checking only menu hitboxes.
- Local verification uses `./test-v77.4.1-local.sh --browser`; every invocation asks the OS for a fresh free localhost port. `--full` adds Chromium/Playwright certification.

# v77.4.0 — State Observatory identity

- Replaces the rejected Model Space cube with the **State Observatory**: a continuous response manifold, inference/uncertainty contours, a discrete population/agent lattice, one observable-state axis and an evolutionary branch.
- Gives the display lockup an explicit platform descriptor: **MODELING · SIMULATION · VALIDATION**, with evidence/challenge language that prevents “validation” from reading as automatic certification.
- Introduces a genuinely responsive logo system: rich flagship emblem, simplified adaptive header mark, dedicated monochrome mark, and a purpose-built micro favicon rather than one drawing scaled indiscriminately.
- Hides a restrained creator signature in the scientific geometry: the state axis and upper planes imply `F`, while the evolutionary split suggests `K` for Foko Kuate.
- Keeps subject and exact-lab colours adaptive in navigation while quantitative plots remain scientifically semantic and independent.
- Regenerates 16/32 px favicons, touch icon and 512 px application icon and adds brand regression contracts for every vector scale.
- Preserves the model-first workbench, resizable authoring panel, 259-entry Model Atlas, LaTeX, population genetics, CMA-ES, multi-output Sobol/Morris, bifurcation, Bayesian/advanced methods, AI/SciML, statistics, evolution and contextual 3D.
- Local verification uses `./test-v77.4.0-local.sh --browser`; every invocation asks the OS for a fresh free localhost port. `--full` adds Chromium/Playwright certification.

# v77.3.0 — Model Space identity

- Replaces the Woven State tessellation with the **Model Space Mark**: an open isometric model/state volume, a structural `F`, and one highlighted computed state.
- Keeps one recognizable silhouette while the runtime shell assigns subject and exact-lab colors to separate model-space edges; scientific plot palettes remain semantic and independent.
- Rejects AI-only visual clichés such as brains, gears, neural spheres, particle vortices and “quantum” cubes because Foko Lab is a general scientific modeling platform.
- Regenerates the static mark, monochrome mark, compact/display lockups, favicon, touch icon and 512 px application icon from the new geometry.
- Preserves the model-first workbench, resizable authoring panel, 259-entry Atlas, examples, LaTeX, population genetics, CMA-ES, multi-output Sobol/Morris, bifurcation, Bayesian/advanced methods, AI/SciML, statistics, evolution and contextual 3D.
- Local verification uses `./test-v77.3.0-local.sh --browser`; every invocation selects a fresh free localhost port. `--full` adds Chromium/Playwright certification.

# v77.2.0 — Woven State identity

- Replaces the Confluence trajectory/node mark with the **Woven State Mark**, a completely different faceted tessellation with no curves, paths, dots or enclosing badge.
- Uses a stable indigo facet plus subject- and exact-lab-aware facets in the runtime shell; scientific plot palettes remain independent.
- Introduces a restrained personal reference through indigo and modular negative-space construction without copying a named Grassfields ceremonial motif.
- Regenerates the compact/display/monochrome SVG lockups, favicon, touch icon and application icon from one geometry.
- Preserves the model-first home, Model Studio, 259-model Atlas, resizable authoring workspace, LaTeX, multi-output Sobol/Morris, CMA-ES, population genetics, bifurcation, Bayesian/advanced methods, AI/SciML, statistics and contextual 3D.
- Local verification uses `./test-v77.2.0-local.sh --browser`; every invocation selects a fresh free localhost port. `--full` adds Chromium/Playwright certification.

# v77.1.0 — Confluence identity

- Replaces the previous contour/path logo concept entirely with the **Confluence Mark**: three interdisciplinary strands meet at an explicit model state and open into multiple evidence directions. The static identity uses ink, biological teal, mathematical violet, computational blue and evidence amber; the runtime mark adapts to subject and exact lab without recoloring scientific data.
- Rebuilds the wordmark in mixed-case editorial typography and carries the same Confluence geometry through the header, monochrome mark, favicon, touch icon and application icon.
- Rebuilds the home around a runnable user-owned model and the Define → Configure → Simulate → Analyze → Verify workflow; the Model Atlas remains a 259-entry editable starting library rather than the product's center.
- Simplifies desktop navigation to Home, Model Studio, Simulate, Analyze, Atlas and Evidence while retaining complete mobile navigation, creator access, command search and direct Run behavior.
- Reworks the scientific shell with six subject families, twenty distinct AA lab accents, the requested vertical desktop task rail, a resizable authoring panel, plot-first results canvas and responsive evidence inspector.
- Preserves LaTeX equation rendering, multi-output Sobol/Morris, CMA-ES, population genetics, system-dynamics bifurcation, Bayesian/advanced methods, AI/SciML, statistics, evolution landscapes and contextual live 3D agent/state simulations.
- Local verification uses `./test-v77.1.0-local.sh --browser`; every invocation selects a fresh free localhost port. `--full` additionally requires Chromium for browser certification.

# v76.2.0 — Phase identity and model-first visual rebuild

- Replaces the rejected dark-teal badge system with the free-standing Phase Monogram, carbon/ultramarine/coral/warm-paper palette, light application bar and regenerated favicon family.
- Rebuilds Home from a blank document structure around one editable canonical-engine model, three problem-structure routes, all 20 labs, six strong models, the evidence contract and creator access.
- Removes the legacy demonstration reel from the runtime while preserving the 259-model Atlas and research-derived starting points.
- Rebuilds desktop lab presentation with a 64 px vertical workflow rail, resizable authoring panel, lab-coloured active state, large evidence canvas and compact inspector; compact layouts use a horizontal rail.
- Keeps subject/lab colour strictly presentational and scientific plots semantic.
- Updates browser contracts to validate editable-model recomputation rather than retired home-card animations.
- Baseline verification covers 129 JavaScript files, 322 active Python contracts, 101 workspace checks, 221 shell checks, 32 independent references and 2,351 Atlas assertions.
- Local verification: `./test-v76.2.0-local.sh --browser` validates, chooses a fresh port, serves and opens localhost; add `--full` on a Chromium-capable host.

# v76.1.0 — Model Field identity and two-level scientific orientation

- Replaced the static logo with the sophisticated Model Field SVG system: scientific inputs converge on a model kernel, a computed path exits it and an evidence point closes the mark.
- Added an adaptive runtime logo whose field follows the current subject and whose output/evidence geometry follows the exact lab.
- Established six subject families and twenty unique scientific lab accents in one authoritative taxonomy.
- Propagated identity into desktop and mobile navigation, command search, workflow rails, run actions, home routes, result frames and every Model Atlas card.
- Removed the competing legacy palette; `styles/lab-identity.css` is now a compatibility bridge only.
- Corrected scientific plotting so semantic categorical colors are the default and lab color is explicitly presentation-only.
- Added automated WCAG AA contrast, taxonomy, SVG accessibility, Atlas, home, semantic-plot and release-evidence checks.
- Reconciled validation documentation and added a release-specific professional audit, platform benchmark and limitations record.
- Local verification: `./test-v76.1.0-local.sh --browser` baseline-validates, selects a fresh free port and opens localhost; add `--full` when Chromium certification is required.

# v76.0.7 — restored laboratory rail and per-lab visual identity

- Restores the desktop workflow rail as a 54 px vertical column with readable
  88 px controls, matching the authored Examples/Model/Simulation/Export
  structure instead of clipping a horizontal bar inside a narrow grid track.
- Preserves authored “Examples” and “Atlas” labels rather than silently
  replacing them with generic shell terminology.
- Gives each of the 20 scientific laboratories its own accessible accent and
  applies it to the active rail control, primary run actions and result frame.
- Keeps plot colours data-driven: laboratory identity never changes the
  scientific meaning of a series, category, uncertainty interval or heat map.
- Keeps the rail horizontal and scrollable at tablet/phone widths and verifies
  that it does not create document-level horizontal overflow.
- Adds source, WCAG contrast, desktop geometry, representative-lab and phone
  regressions so older horizontal-rail styles cannot silently override the fix.
- Local verification: `./test-v76.0.7-local.sh --browser` selects a fresh free
  localhost port on every run; `--full --browser` performs release certification
  before opening the platform.
- Certified with 324 active Python contracts, 32 independent numerical
  references, 152 Playwright browser scenarios, seven offline Chromium gates,
  a 100/100 platform benchmark, and 2,351 Atlas checks across 259 entries.

# v76.0.6 — user-owned model interchange and adjustable scientific workspace

- Adds a dynamically resizable model/results workspace to every compatible authored lab. The separator supports pointer drag, keyboard arrows, compact/wide/reset positions, per-lab persistence and plot lifecycle resizing; phone layouts keep explicit task panels.
- Adds one non-executing deterministic model interchange core shared by Model Studio and ODE Lab: TXT/ODE, JSON/Model IR, Python and JavaScript data dictionaries, declarative YAML, model-table CSV and a strict SBML reaction subset.
- Removes the active legacy SBML route that warned and continued after unsupported semantics. Events, rules, packages, delays, non-unit compartments, piecewise expressions and unsupported MathML now reject the complete import.
- Recognizes CellML, SED-ML and COMBINE/OMEX without claiming to execute or flatten their semantics.
- Adds a visible Model Studio paste/file workflow, imported-result invalidation, an interchange tutorial, a revised input contract and a detailed scientific/UX audit.
- Reframes the 259-entry Model Atlas as editable starting points with status, provenance, scientific-use and evidence-boundary information.
- Introduces accessible lab-family orientation accents while retaining one platform identity and data-appropriate scientific plot palettes.
- Keeps the examples, Model Atlas, rendered equations, advanced visualizations and direct creator/trust routes.
- Local verification: `./test-v76.0.6-local.sh --browser` selects a fresh free localhost port on every invocation; use `--full --browser` for complete browser certification.
- Certified with 324 active Python contracts, 32 independent numerical references, 149 Playwright browser scenarios, seven offline Chromium gates, a 100/100 platform benchmark, and 2,351 Atlas checks across 259 entries.

# v76.0.5 — explicit Home navigation and refined identity

- Adds a named Home destination to the desktop application bar instead of
  relying on the logo as an undocumented shortcut.
- Adds Home to the phone navigation sheet and the persistent five-destination
  mobile dock, with a clear current-page state and a 48 px touch target.
- Refines the Convergent Field symbol into a simpler model-first story: three
  scientific trajectories converge at an editable model node and continue to a
  verified evidence point.
- Rebuilds the compact header lockup, full display lockup, monochrome mark,
  favicons, touch icon and 512 px application icon from the same accessible
  vector geometry.
- Keeps the approved v76 layout, typography, palette, model catalogue and
  scientific workspaces unchanged.
- Retains the fresh-port localhost workflow with
  `./test-v76.0.5-local.sh --browser`.
- Certified with 324 active contracts, 32 independent numerical references,
  seven offline Chromium gates, benchmark 100/100 and the complete 145-scenario
  desktop/phone Playwright inventory.

# v76.0.4 — deterministic plot startup and usable localhost workflow

- Fixes the v76.0.3 combined visual-contract timeout after all scientific,
  reference, navigation and Agent gates had already passed.
- Coalesces overlapping Optimization and Stochastic startup renders through one
  post-layout revision, eliminating duplicate fire-and-forget Plotly requests.
- Fixes the hidden layout cause: four desktop workspace columns now use four
  matching named grid areas, so neither authored plot can collapse to zero width.
- Replaces the opaque 30-second two-plot timeout with a hardware-tolerant,
  fail-fast diagnostic that identifies the exact lab, file, host render state,
  geometry and browser error.
- Keeps the phone Setup/Results/Evidence dock above the global navigation,
  reserves space for both controls, and enforces usable phone touch targets.
- Preserves the expanded scientific product contract: 13 AI plot types, seven
  supporting home tools, an open searchable Sensitivity catalogue, equal
  research cards and a runnable editable new-model scaffold.
- Persists one fresh localhost port across Playwright's server and worker
  processes, eliminating intermittent `ERR_CONNECTION_REFUSED` runs.
- Makes `./test-v76.0.4-local.sh --browser` the normal localhost route: reliable
  baseline validation, a new free port, server startup and automatic browser
  opening.
- Retains the complete offline Chromium and Playwright certification suite under
  the explicit `--full` flag, including `--browser --full` when certification
  must precede the demo.
- Certified on Chromium: 324 active Python contracts, 32 independent numerical
  references, seven offline browser gates, benchmark 100/100 and 145/145
  desktop/mobile Playwright scenarios.

# v76.0.3 — unified popover geometry and localhost hardening

- Fixes the v76.0.2 Profile-menu overflow. The positioning code assumed a
  430 px Profile panel while shared CSS rendered every popover at 620 px.
- Introduces one bounded geometry function that owns both rendered width and
  horizontal position for every menu. It guarantees 12 px left and right
  viewport gutters on desktop and phone widths.
- Adds deterministic geometry regressions for right-edge Profile and Analyze
  menus, narrow phones and left-edge triggers, in addition to the Chromium
  hitbox gate.
- Provides `./test-v76.0.3-local.sh --browser` (`--demo` alias) as the verified localhost workflow:
  full validation, a fresh port, local server startup and automatic browser
  opening.

# v76.0.2 — strict-selector gate repair and browser demo

- Fixes the v76.0.1 Chromium gate failure caused by the ambiguous selector
  `[data-v76-popover="experiment"] a:first-of-type`. The selector matched the
  first link in both authored menu sections, so Playwright strict mode rejected
  the test even though the menu itself was visible and interactive.
- The gate now selects the first actual matching link explicitly and continues
  to verify geometry, hit testing, stable app-bar layout and Escape behavior.
- Adds `./test-v76.0.2-local.sh --demo`: after all scientific and browser gates
  pass, it chooses a fresh port, starts the server and opens the verified
  platform in the default browser.
- Keeps `--serve` for serving without automatically opening a browser.

# v76.0.1 — immediate navigation hitbox repair

- Fixes the Chromium failure `project: first menu option is not visible`.
- Root cause: `visibility` was included in the popover transition. Because it is
  a discrete property, an opened menu remained temporarily hidden from hit
  testing and keyboard focus even after `data-open` and `aria-hidden` changed.
- Removes `visibility` from the animated properties. Opacity and movement remain
  animated, while menu links become interactive immediately.
- Adds a static regression contract that rejects any future attempt to animate
  menu visibility.
- Retains the v76 scientific engines, model catalogue, visual system and
  user-owned modeling workflow unchanged.

# v76.0.0 — model-first product rebuild

- Replaces duplicated page menus with one portal-based application shell:
  Project, Model, Experiment, Analyze, Evidence and Atlas.
- Introduces the Convergent Field identity, responsive phone sheet and bottom
  controls, compact scientific typography, command search, global Run and a
  populated creator/trust menu.
- Rebuilds the home page around an editable canonical-engine model and routes
  users by equations, populations/agents or data while retaining the Model Atlas.
- Preserves contextual 3D, multi-output global sensitivity, KaTeX equations,
  population genetics, Bayesian/advanced methods, AI, bifurcation, evolution,
  CMA-ES and platform-wide visualization contracts.
- Adds actionable non-finite diagnostics for zero denominators and divergent
  model scales, with executable SIR and Lotka–Volterra regressions.
- Selects a fresh localhost port on every validation and serve invocation.

# v75.0.4 — offline-gate repair and redesign groundwork

- Fixes `check-agent-layout-offline.js`, which threw `Agent Lab requires FokoLive3D` the moment v75.0.3 unblocked the gate chain. The gate rebuilds `agent.html` by hand and never injected `src/core/live-3d.js`, so `agent-workspace.js` threw on injection and tested nothing. The omission predates the v75.0.x line; it was unreachable while the hitbox gate failed first. Fix injects the module in the page's own order. No runtime file changed.
- Adds `scripts/audit-offline-gate-dependencies.py` (`npm run test:gate-deps`, and wired into `test:syntax`): maps which module defines each `Foko*` global, then verifies every gate's injected modules can satisfy their load-time guards. Turns a multi-minute Chromium failure into an instant, explanatory one. It correctly retrodicts both known outcomes — flags agent-layout for `FokoLive3D`, reports navigation-hitboxes clean — and distinguishes hardcoded gates (six, can drift) from self-maintaining ones (`check-sensitivity-offline.js`, derives its list from the page, cannot drift).
- Adds `scripts/report-dead-css.py` (`npm run report:dead-css`) as groundwork for the v76 declutter. Baseline: 1,295 of 4,106 rules (31.5%) have no referencing HTML/JS token, concentrated in `style.css` (582), `v72-public-shell.css` (310) and `v72-profile-shell.css` (278); the v72-era sheets are essentially clean. Report only — nothing fails on a high count. Zero false positives across five known-live selectors.
- Verified at 75.0.4: 320 active Python contracts, all eight Python audits, 125-file JS syntax, the new gate-dependency audit, studio and full JS core suites.
- The Chromium gates remain unrunnable in the build environment. `check-agent-layout-offline.js` has **not** been observed passing — the static check proves its guards are satisfiable, which is necessary but not sufficient. Run `./test-v75.0.4-local.sh` on a Chromium host.

# v75.0.3 — Creator navigation hitbox gate passes

- Fixes the failure that survived v75.0.0, v75.0.1 and v75.0.2: `scripts/check-navigation-hitboxes-offline.js` now passes.
- Root cause was one missing declaration in the v75.0.2 rule. The base `.labs-menu-panel` rule in `style.css` carries `transform:translateX(-50%)`, authored for a `left:50%` panel. v75.0.2 overrode `left`/`right`/`width` but not `transform`, so once the panel was pinned `position:fixed` and full-width the inherited translation shifted it half its own width off-screen. A browser probe measured `transform: matrix(1,0,0,1,-632,0)` on a 1264 px panel, first-link centre at `cx = -311`, and `document.elementFromPoint` returning `null` — which the gate reports as `covered by none`.
- Fix adds `transform:none` to the existing block in `styles/v72-profile-shell.css`, matching `v72-tokens.css` line 470, the equivalent rule the working lab pages have always used. No other file changed.
- Confirmed by running the Chromium gate on this exact CSS: `Navigation and Symbolic hitbox regression passed`. Also passes 320 active Python contracts, the platform-consistency, teaching-depth, benchmark, plot-lifecycle, accessibility, plot-control and input audits, 125-file JS syntax and the full JS core/studio/reference unit suites.
- The Chromium gate still cannot execute in the build environment (no local Chromium; Playwright browser CDN outside the network allowlist); its passing status for this release comes from the maintainer's run on identical CSS. Re-run it on a Chromium host with `./test-v75.0.3-local.sh`.
- Known cosmetic residual: the open panel's computed `left` resolves to `0px` rather than the requested `16px`, so it sits flush to the viewport edge. Appearance only — all links are on-screen and hittable. Deliberately left unchanged so the shipped CSS matches what was verified in the browser.

# v75.0.2 — Creator navigation dropdown fix (correct CSS target)

- Fixes the Creator Profile (`cv.html`) Simulate / Analyze / Explore dropdowns, which the v75.0.0 and v75.0.1 "navigation repair" work never reached: those rules targeted `.v70-workbench-panel` and `.analysis-menu-panel`, but the authored panels carry `.labs-menu-panel.menu-panel-wide`, so no rule applied and both defects survived.
- Re-shows hidden link content. `style.css` blanks every `<span>` inside `.nav-menu .labs-menu-panel a` — the icon and the `<b>`/`<small>` text wrapper alike; a higher-specificity rule scoped to `.menu-panel-wide` restores it.
- Stops the panel being clipped off-screen. At the 1280 px gate width `style.css` makes `.foko-main-nav` a scroll container while the panel is `position:absolute` inside it; the open `.menu-panel-wide` panel is now pinned `position:fixed` so it escapes the clip, mirroring the lab-page escape used by `v72-tokens.css`.
- Change is isolated to `styles/v72-profile-shell.css`, the only non-lab sheet `cv.html` loads; no other page or lab is touched. Closed panels stay `display:none`, so only the open menu is affected.
- Passes 320 active Python contracts, the platform-consistency, benchmark, plot-lifecycle, accessibility, plot-control and input audits, 125-file JS syntax and the full JS core/studio/reference unit suites. The Chromium navigation-hitbox gate was not runnable in the build environment (no local Chromium; Playwright browser CDN outside the network allowlist) and must be run on a Chromium host via `./test-v75.0.2-local.sh`.

# v75.0.1 — release-runner consistency patch

- Replaced the brittle v75.0.0 predecessor assertion with a self-consistent v75.0.1 runner contract.
- Issued a uniquely named archive to prevent browsers from reusing the superseded v75.0.0 download.
- Retains the complete v75 scientific-instrument redesign, model atlas, contextual 3D policy, and validated numerical engines.

# v75.0.0 — scientific-instrument redesign and contextual spatial visualization

- Replaces the oversized dark-green home hero with a quiet, grid-based scientific instrument overview, compact typography, task routes and a live evidence console.
- Consolidates every lab into a compact build rail, dominant evidence canvas and divided provenance ledger; nested cards, oversized radii and competing shadows are removed.
- Changes Agent Lab’s default to the computed live lattice. The optional 3D space-time cube is now exposed only by curated front, invasion, coarsening and wave presets that declare a scientific rationale.
- Repairs the Creator Profile’s empty Simulate, Analyze and Explore menus by enforcing visible menu-link contrast, multi-column layout and direct hitboxes on `cv.html`.
- Retains the 259-entry Model Atlas, strong examples, editable equations with LaTeX, initial conditions, time spans, parameter values/ranges, multi-output Sobol/Morris sensitivity, CMA-ES, Population Genetics, bifurcation, Bayesian/advanced, AI, statistics and reproducible exports.
- Uses Deep Ocean Blue as the product identity, restrained cyan for scientific orientation, and terracotta only for exceptional actions or warnings.
- Passes 320 active contracts, 32 differential numerical references, the 100/100 platform benchmark and all 20 plot-lifecycle workspaces.

# v74.0.2 — navigation hitbox taxonomy repair

- Synchronizes the navigation hitbox regression with the shipped `Simulate / Analyze / Explore` taxonomy.
- Removes stale `modeling` and `sciml` selectors from the offline hitbox gate, full browser suites and menu-positioning CSS.
- Makes the offline gate assert the complete authored primary-menu inventory before testing pointer travel, click, Escape, inert panels and Symbolic plot-selector hitboxes.
- Includes the injected Theme menu in the same interaction check.
- Adds a release-blocking cross-file taxonomy contract; the active suite now contains 320 Python contracts.

# v74.0.1 — clean-install acceptance repair

- Makes the local validation runner own writable, release-scoped npm and Playwright caches instead of inheriting an unusable global cache.
- Verifies the Playwright module itself rather than trusting the presence of a partial `node_modules` directory.
- Creates dependency-cache directories before installation and keeps caller overrides explicit through `FOKOLAB_NPM_CACHE` and `PLAYWRIGHT_BROWSERS_PATH`.
- Adds a release-blocking clean-install cache contract; the active suite now contains 319 Python contracts.
- Retains the complete v74 experience architecture, 259-entry Model Atlas, scientific engines, examples, plots and modeling inputs unchanged.

# v74.0.0 — experience architecture and responsive scientific workspace

- Replaces the historical four-column cockpit and rotated lab labels with a three-zone workspace: horizontal context rail, bounded build/model column, large results canvas and compact evidence rail.
- Makes every model catalogue single-column, scroll-bounded and overlap-safe while retaining the full 259-entry Model Atlas, strong starters and research-derived models.
- Rebuilds the home page as an editorial modeling entry with a dark live-evidence hero, four clear starting paths, independent experiment cards, unclipped research cards and direct creator access.
- Introduces the Abyssal Teal product shell, quiet mineral canvas and restrained Solar Coral primary-action signal; per-lab hues remain orientation accents rather than competing page themes.
- Enlarges and regularizes plot surfaces, plot selectors and two-up/Focus controls; removes duplicated ODE export actions from the build rail while retaining exports in Evidence.
- Adds 1450 px, 1080 px and 720 px layout contracts so tablet and phone browsers remain single-task, scroll-contained and plot-safe.
- Retains editable equations with KaTeX, initial conditions, parameter values/ranges, time spans, solver settings, multi-output sensitivity, CMA-ES, Population Genetics, Bayesian/advanced methods, AI plots and live 3D Agent/Evolution/Studio simulations.
- Adds nine release-blocking experience contracts; the active suite now contains 318 Python contracts.

# v73.1.1 — unified identity and reliable equation binding

- Replaces the mismatched header, icon and favicon symbols with one responsive Scientific Teal identity: an `F` coordinate frame crossed by a mint simulation trajectory.
- Uses `#006D77` as the primary brand color with a deep teal navigation surface, a high-contrast compact header lockup and a readable display lockup.
- Regenerates the 512 px app icon, Apple touch icon, 16/32 px favicons and multi-size ICO from the same vector mark.
- Canonicalizes scalar, array and `{value,min,max}` parameter representations whenever ODE models are loaded from examples, imports, sessions or lab handoffs.
- Normalizes and validates parameters again at the worker boundary, so Lotka–Volterra and SIR/SEIR equations no longer receive `NaN` from representation mismatches.
- Replaces generic non-finite failures with equation, time and input/domain context, and adds executable Lotka–Volterra, SIR and invalid-binding regressions.

# v73.1.0 — visualization-rich modeling workflows

- Refactors the home page around four modeler intentions—build a system, load the 259-entry Atlas, simulate, or analyze—while retaining all worked and research-derived examples.
- Adds live rotatable 3D Studio phase replay, Agent lattice-time simulation and Evolution population paths with play, pause, generation, speed and trail controls.
- Renders editable Studio, Agent, Evolution and AI method equations with vendored KaTeX.
- Adds single- or multiple-output global Sobol analysis; selected outputs share one seeded Saltelli design and cached ODE trajectories while retaining separate rankings, plots and exports.
- Expands AI Modeling to 12 scientific starters and 13 diagnostic plots, including standardized residuals, residual Q–Q/ACF, derivatives, coverage and cumulative error.
- Expands Advanced Methods to 14 starters, five Bayesian views and at least three computed plots for every non-Bayesian module, including 3D PDE and scenario surfaces.
- Expands Statistics with ECDF, violin, density contour, scale/location, leverage, residual distribution, bootstrap convergence, moving range and process ACF plots.
- Reworks narrow-screen workspaces into one-column tasks with Setup/Results/Evidence navigation, contained tables and bounded 3D canvases.

# v73.0.0 — central Model Studio and model-first platform

- Adds the `foko.project/1` project contract and a central Model Studio for editable ODEs, experiments, run metadata, import/export and analysis handoff.
- Retains 21 strong Studio starters, the full 251-entry Model Atlas, every specialist lab and every existing computed plot selector.
- Adds 15 Studio plots, including state/time and derivative heatmaps, phase/time/3D/multivariate views, adaptive-solver evidence, and two-parameter heatmap, contour and 3D response surfaces.
- Reorganizes navigation as Home, Model Studio, Simulate, Analyze, Explore and GitHub while preserving upper-right creator access.
- Extends lifecycle, accessibility, input, consistency, benchmark, active-contract and browser specifications to the twentieth authored workspace.

# v72.51.0 — modelling-first UX, dynamics, evolution and transparent AI

- Makes **Create model** the first modelling action and opens an editable runnable ODE scaffold with user-owned equations, initial conditions, parameters, ranges, time span and numerical settings.
- Keeps strong example catalogues and modelling notes in optional, collapsible browsers so they remain discoverable without crowding the control rail.
- Makes Local, Morris, Sobol and FIM sensitivity methods immediately visible and retains the full method-dependent 35-plot registry.
- Expands Population Genetics to 10 selectable frequency, deme, path, phase, diversity, absorption and endpoint plots.
- Ensures every Advanced Methods starter produces at least two computed plots.
- Adds an editable Bifurcation Lab with six normal-form/mechanistic starters and six branch, stability, count, vector-field, potential and residual views.
- Adds an Evolution Landscape Lab with 12 documented starters, custom genotype–fitness tables, editable population/initial genotype/generations/selection/mutation/seeds, and 10 plots including heatmaps, contours, 3D and live time/frequency landscape views.
- Adds a transparent AI Modeling Lab with user-pasted data, Gaussian-process uncertainty/active sampling, a seeded random-feature neural surrogate, and six diagnostic plot families.
- Expands the provenance-classified Model Atlas to 251 routes and applies no-overlap card/layout contracts across 19 scientific workspaces.

# v72.50.0 — reliability, CMA-ES and responsive workflow remediation

- Fixes the compute-bus zero-timeout defect that silently converted disabled timeouts into one-second cancellations.
- Retains the last successful ODE evidence when a later run fails and marks it stale.
- Adds a seeded bounded ask/tell CMA-ES core with covariance, evolution paths, entropy, feasibility and runtime diagnostics.
- Adds CMA-ES-specific Optimization controls, exports and conditional diagnostic plots.
- Adds a seeded finite two-deme Wright–Fisher Population Genetics Lab with selection, dominance, mutation, migration, drift, heterozygosity, elementary FST and fixation/loss summaries.
- Reorganizes navigation by scientific purpose and every authored lab around Choose → Configure → Run → Inspect → Export.
- Adds responsive task navigation, compact mobile headers, mobile result/evidence panels and paginated Model Atlas rendering.
- Replaces maintainer-facing and repetitive interface phrases with concise user-facing language and removes the legacy CSS override layer.
- Adds release-identity, timeout, CMA-ES and responsive-density regression gates.
- Uses an automatically selected fresh local validation port.

# v72.48.0 — Sensitivity discoverability and documentation closure

- Adds genuine normalized Morris parameter-design trajectories, distinct from scalar output paths.
- Adds state-resolved Jansen first- and total-effect heatmaps using the existing finite seeded design.
- Makes the bounded two-parameter response surface available in both Local and Global variance modes.
- Adds an in-lab conditional plot catalogue so option-dependent evidence no longer appears silently missing.
- Synchronizes Docs, Tutorial 10, Trust, capability metadata, taxonomy and navigation copy with the runtime.
- Repairs generated Trust static navigation, reader-facing derived-result labels and scientific acronym formatting.
- Corrects the local runner predecessor preflight and adds release-blocking documentation/runtime consistency checks.
- Uses isolated validation port 8102.

# v72.46.0 — local and global Sensitivity depth

- Separates parameter Jacobian, state Jacobian and propagated trajectory sensitivity.
- Adds OFAT curves, tornado summaries, directional profiles and bounded two-parameter response surfaces.
- Adds time-resolved Jansen effects, raw variance accounting, sampled relationship views and limited MI/HSIC permutation screening.
- Reuses existing global sample designs and cached trajectories rather than adding hidden simulations for derived plots.
- Extends browser-capacity accounting to every new local and global computation.
- Corrects the capability taxonomy so generic residual-component sensitivity is no longer falsely marked computed.
- Retains adjoints, FAST/eFAST and Shapley effects as export-only.
- Uses isolated validation port 8100.

## v72.45.0 — advanced Global Sensitivity and capacity guard

- Extends Morris screening with elementary-effect distributions, convergence and bootstrap rank stability.
- Adds Jansen first/total indices, optional symmetrized Saltelli pairwise second-order interactions, bootstrap intervals, rank stability, output distributions and total-minus-first diagnostics.
- Refuses oversized browser workloads before worker launch and provides a Python/SALib or server-workflow boundary.
- Fixes the missing shared field-grid layout contract and synchronizes Sensitivity navigation copy across static and runtime menus.
- Adds a platform-wide consistency gate and uses isolated validation port 8099.

## v72.44.0 — numerical-input reliability and Sensitivity Analysis Lab

- Added a first-class Sensitivity Analysis Lab with editable ODE definitions, initial conditions, parameter values/ranges, time span, solver, step controls, tolerances, local finite differences, Morris screening, independent-uniform Jansen indices, and a local FIM approximation.
- Preserved all ODE numerical controls in sessions, share URLs, and model JSON.
- Added stale-result ownership and export guards after scientific input changes.
- Added professional limitations and audit records.
- Changed the local runner so a failed validation leaves a readable terminal instead of disappearing.

# v72.43.0 — Optimization, multi-objective, Steady-State and sensitivity taxonomy

- Integrates six exact 15-item catalogues for Optimization, multi-objective optimization, and Steady-State/algebraic plots and problems.
- Adds local, global, structural, multi-objective, and steady-state sensitivity method/plot catalogues.
- Publishes one machine-readable taxonomy with browser-computed, derived-browser, limited-browser, export-only, and unavailable boundaries.
- Expands Optimization to 17 runnable presets and adds finite dominance, crowding, hypervolume, correlation, knee-point, and local-sensitivity diagnostics.
- Adds Jacobian-sign, local stiffness, and sequential-scan sensitivity views to the 26-system Steady-State library.
- Renders the same taxonomy in Docs and validates it in offline Chromium.
- Uses isolated validation port 8093.

# v72.42.1 — shared plot geometry and Steady/Symbolic depth

- Centralizes Plotly title, legend, axis-margin and annotation geometry across all 13 authored workspaces. Card headings own titles; Plotly owns axes, traces and legends.
- Prevents the Optimization, Stochastic and ODE stiffness legend/title/axis collisions shown in the visual audit.
- Standardizes action controls with a 46 px minimum height, multiline centering and no vertical clipping.
- Expands Steady-State to 26 searchable, family-filtered systems. Every default is solver-validated; selecting a system loads and solves it immediately.
- Expands Symbolic to 20 searchable systems. Selecting a system automatically parses, differentiates, evaluates and renders its evidence.
- Adds a named platform audit, an offline Chromium visual/computation gate and three maintained Playwright regressions.
- Uses isolated validation port 8092.

# v72.41.7 — navigation hitbox and Symbolic selector closure

- Removes hover-activated primary navigation; menus now open only through explicit click or keyboard actions.
- Makes every closed dropdown panel inert, aria-hidden, invisible, and unable to receive pointer events even if native `details` state and runtime state temporarily diverge.
- Restricts shared chart grid-area rules to direct `.chart-title` children, preventing Symbolic's nested Focus and export controls from covering its plot selector.
- Strengthens the canonical two-panel browser contract with pointer-travel and direct-hitbox assertions before plot changes.
- Adds an offline Chromium regression that verifies closed navigation panels, explicit menu opening/closing, and unobstructed Symbolic selectors.
- Retains the v72.41.6 Agent layout and render-root behavior unchanged.
- Uses isolated validation port 8090.

# v72.41.7 — validation contract coherence

- Keeps the validated v72.41.4 canonical ODE layout implementation unchanged.
- Replaces the runner’s regex-based Focus scan with a semantic JavaScript binding scan that ignores unrelated selectors and rejects only generic `[data-focus-side]` click bindings.
- Uses fixed-string stale-token detection for the immediately previous release.
- Updates the active packaging contracts to verify behavior rather than demand obsolete runner source text.
- Adds a negative contract proving the discarded broad grep implementation cannot return.
- Uses isolated validation port 8088.

# v72.41.4 — canonical two-panel ownership

- Uses ODE as the behavioral reference: preferred Two-up/Focus state is changed only by explicit layout controls.
- Removes the unsafe broad Focus click binding from every authored workspace; plot-grid state attributes are no longer treated as controls.
- Agent delegates effective layout projection to the shared `FokoLayoutStability` controller while keeping its preferred mode in an independent persisted record.
- Agent plot-selector handlers no longer call, restore, or mutate layout state. They update only panel selections and render the affected evidence.
- Retains selectable live spatial simulation, population time curves, deterministic panel swapping, render-token rejection, and the single-active-render-root invariant.
- Extends the browser contract to click both selectors before value changes on every authored route, catching event-bubbling regressions that `selectOption` alone misses.
- Uses isolated validation port 8088.

# v72.41.2 — Agent single-render-root closure

- Fixes the Agent panel contamination visible when the live canvas preview was followed by a Plotly population or lattice view.
- Every Agent transition now invalidates the previous render, purges Plotly, removes all children, mounts exactly one active render root, and verifies the invariant before publishing rendered state.
- Live preview, static canvas fallback, replay animation, Plotly population plots, and Plotly lattice heatmaps all use the same ownership contract.
- Adds a browser regression that cycles live preview → population → final lattice → population → replay animation → population and rejects surviving canvases, traces, or duplicate roots.
- Runs Agent plot-switch tests before the repeated platform layout gate and the complete browser suite.
- Uses isolated validation port 8084.

# v72.41.1 — stable two-panel contract, equal research gallery, rendered Mathematical Beauty

- Uses the stable ODE behavior as the reference contract and moves every other authored workspace to one declarative `FokoLayoutStability` state transition.
- Separates preferred layout from effective responsive layout: plot changes and delayed renders cannot silently replace an explicit Two-up or Focus choice.
- Removes non-ODE workspace-width heuristics and the CSS rule that visually collapsed a requested Two-up grid at intermediate desktop widths.
- Rebuilds “Research behind Foko Lab” as four equal-size visual cards for fatty-acid metabolism, FADNS, T-cell proliferation, and Thermoplants.
- Uses the supplied full FADNS reaction scheme, coarse-grained lipid network, T-cell generation diagram, and Thermoplants graphical abstract as scientific visual anchors.
- Moves the creator profile out of the crowded hero rail and places it beside the research grid with the professional title “Multiscale Modeller | Applied Mathematician | Computational Biology | Scientific Software”.
- Replaces the lower Mathematical Beauty catalogue prose with 34 rendered preview canvases. Selecting a preview opens the actual interactive object in the main canvas.
- Repairs theme switching at the canonical token layer, reapplies persisted themes on every page, and recolors already-rendered Plotly evidence without recomputation.
- Routes ODE, Steady-State, Stochastic, Optimization, SciML, and Symbolic mathematical output through one strict KaTeX boundary with MathML, readable fallback, semantic Greek/subscript identifiers, and bounded horizontal scrolling.
- Retains the Workbench atomic panel-swap rule, one Plotly lifecycle owner, unchanged numerical engines, and explicit scientific claim boundaries.
- Uses isolated validation port 8088.

# v72.40.0 — layout stability, research hero and manifold audit

- Added one shared layout-stability controller across all 13 authored two-panel workspaces. Plot selectors and delayed rerenders preserve explicit 2-up or Focus intent; responsive focus remains allowed only on genuinely narrow workspaces.
- Rebuilt the homepage right rail with the creator profile and the professional title “Multiscale Modeller | Applied Mathematician | Computational Biology | Scientific Software”.
- Rebuilt Thermoplants as a visual hero research card using the supplied graphical abstract, three research-analysis previews, and an explicit protected-research boundary.
- Added Mathematical Beauty to every Explore dropdown.
- Expanded Mathematical Beauty with interactive Möbius strip, torus, Klein-bottle immersion, projective-plane cross-cap, helicoid, catenoid, Enneper surface, sphere and saddle surface visualizations.
- Expanded Workbench curation with Lorenz, FitzHugh–Nagumo, Brusselator, a stiffness stress test, two-stage gene expression and Rastrigin; added derivative, dispersion, landscape and finite-window evidence views.
- Advanced the isolated local validation port from 8076 to 8078.

# v72.39.2 — complete homepage browser-contract correction

- Corrected the remaining stale Playwright assertion at `main-labs-smoke.spec.js:658`.
- The public-UX gate now targets the authored `#homePlatformAnswerTitle` heading and its current copy, “From model to evidence.”
- Added static and Python regression contracts that reject the removed “toy tool” heading from the browser suite.
- Advanced the isolated local validation port from 8075 to 8076.
- No public UI, numerical engine, model, tolerance, plot lifecycle, or scientific claim changed.

# v72.39.1 — homepage contract correction

- Corrected the two obsolete Playwright assertions that still expected the removed slogan “Thirteen scientific engines.”
- The browser gate now verifies the audited model-first heading through the stable `#homeTitle` contract.
- Added a release preflight that rejects reintroduction of the obsolete slogan into the test suite.
- Changed the local validation port from 8074 to 8075 to isolate this release from the previous run.
- No public UI, numerical engine, model, tolerance, lifecycle, accessibility behavior, or scientific claim changed.

# v72.32.3 — accessibility and live-demo contract hotfix

- Restored ArrowLeft/ArrowRight/Home/End focus navigation for layout controls without restoring central layout-state ownership.
- Compiled bundled stochastic propensity expressions inside the home worker before calling `FokoStochasticCore`.
- Kept the stochastic demonstration bounded, seeded, and executed with Gillespie direct SSA.
- Promoted “What makes this a modeling platform rather than a toy tool?” to a compact semantic heading for accessibility and stable public-UX testing.
- Added regression contracts for the worker compilation path and focus-only keyboard navigation.
- No numerical solver, tolerance, model parameter, claim class, or Two-up/Focus state transition changed.

# v72.29.0 — User-facing UX consolidation

- Rewrote Docs and Tutorials for scientists using the platform; maintainer roadmaps, source filenames, release commentary, and developer instructions are no longer public help.
- Consolidated each help page into one continuous reading surface with a restrained table of contents.
- Reduced the home-page headline and repeated proof blocks while retaining the real core-computed fatty-acid demonstration.
- Added concise creator and research-provenance information to the home page.
- Added a direct explanation of why Foko Lab is a modeling platform rather than a toy: user-defined input, attached diagnostics, independent checks, and reproducible hand-off.
- Restored visual previews throughout the searchable Model Atlas using existing scientific assets.
- Preserved the 72.28.1 Two-up/Focus invariant and numerical/scientific contracts.
- Passed 94 Chromium browser contracts in fresh processes, 187 active Python contracts, 2,244 JavaScript assertions, 14 page-quality budgets, and 32 differential references.

# v72.28.1 — Workbench Two-up ownership and diagnostic browser contracts

- Confirmed the sole v72.28.0 browser failure was Workbench-specific: the grid remained Two-up, but the shared test could not find its legacy `data-card` elements.
- Standardized Workbench evidence cards as `data-plot-card="left"` and `data-plot-card="right"`.
- Removed Workbench from generic plot-selector reconciliation; its adapter state machine is now the single owner of Workbench selections.
- Added the shared `data-layout`, `data-preferred-layout`, `data-layout-mode`, and focus-side contract to Workbench.
- Kept the preferred layout separate from the narrow-viewport effective layout, so changing plot selectors cannot choose Focus.
- Split the former all-routes Two-up loop into separately named per-lab Playwright tests; future failures identify the exact route.
- No numerical engine, tolerance, model, diagnostic threshold, or scientific claim changed.

# v72.28.0 — Persistent Two-up invariant and live research proof

- Replaced finite delayed Two-up restoration with a scoped attribute invariant on `data-layout` and `data-preferred-layout`.
- Captures plot-selector changes before lab-specific handlers and rejects later unauthorized Focus mutations while Two-up is explicitly selected.
- Keeps explicit Focus, genuinely narrow viewports and single-compatible-output cases valid.
- Corrected the browser contract to target the current `Labs` menu instead of the deleted `analysis` menu.
- Raised the dropdown panel to the intended navigation layer and retained an opaque background and pointer ownership.
- Added per-route Playwright steps so future cross-lab layout failures identify the exact page.
- Rebuilt the home hero around a four-state fatty-acid metabolism reduction solved on page load by `FokoODECore`.
- Generates the hero SVG and all displayed diagnostics from the returned numerical result; no cached trajectory is shipped.
- Adds explicit non-claims beside the hero result and three research-model routes with provenance classes.
- Adds a deliberately low-substrate Michaelis–Menten identifiability example for the “bad fit” route.
- Keeps the protected photosynthesis project out of public runnable demos.
- Uses port 8048.

# v72.26.1 — ODE trust-surface browser hotfix

- Corrected the final Playwright contract to assert the authored ODE provenance status rather than the nonexistent `#statusText` locator.
- Reset the independent-verification panel after every successful browser solve so it no longer remains stuck on “run in progress.”
- Added a static regression contract tying the browser locator, authored DOM and post-run verification state together.
- No numerical engine, tolerance, capability class or scientific verdict changed.
- Uses port 8048.

# v72.26.0 — Scientific trust pipeline

- Accepted genuine-live Agent execution and corrected the local acceptance script to install differential-validation dependencies before the reference gate.
- Deleted the dormant legacy model-workbench numerical implementation and kept `model.html` as a redirect to the core-backed Workbench.
- Enforced one deterministic ODE engine with a release-blocking source scanner.
- Routed SciML, inverse workflows and workers through `FokoODECore`.
- Added local Jacobian timescale evidence at multiple trajectory locations and explicit fixed-step warnings for severe scale separation.
- Added optional independent SciPy verification using Radau when stiffness evidence is present and DOP853 otherwise, with same-grid deviation localization and provenance.
- Added a self-contained Model Report Card with equations, parameters, diagnostics, model/run hashes, optional verifier evidence and explicit non-claims.
- Added identifiability-first nonlinear fitting: local parameter correlations, finite profile-based practical verdicts, and conditional experimental-design advice.
- Kept optional verifier/report modules off the initial-page critical path through local lazy loading.
- Uses port 8048.

# v72.20.0 — Genuine live Agent simulation

- Replaced burst-style representative streaming with a stateful incremental numerical runner shared with the synchronous Agent core.
- Advanced the representative lattice in paced chunks so each displayed frame is computed before the browser paints it.
- Added a visible LIVE badge, live-speed control, and pause/resume during computation.
- Kept cancellation atomic: no partial ensemble is published.
- Added a paced-worker regression test proving that live frames span multiple event-loop turns and remain bit-identical to the direct seeded simulation.
- Added a chunk-equivalence contract for the incremental runner.
- Added a paced main-thread fallback for browsers where Web Workers fail or are unavailable.
- Integrated `USER_GUIDE.md`, `TUTORIALS.md`, and `PLATFORM_TODO.md` into the release and linked them from Documentation.
- Preserved the scientific boundary: the moving lattice is one representative realization; ensemble uncertainty remains in independent-run summaries.
- Uses port 8042.

# v72.19.1 — Browser runtime stabilization

- Fixed temporal-dead-zone initialization failures in six authored scientific workspaces.
- Fixed SciML registry notification and Workbench central-registry recursion.
- Preserved two-up layout during selector initialization and plot changes.
- Added accessible names to generated ODE controls and enforced 36 px mobile control targets.
- Repaired navigation click/hover/keyboard state ownership.
- Made Stochastic explicit-time rejection state the time-homogeneous direct-SSA boundary.
- Kept Agent result publication atomic and cancellation-safe.
- Updated browser contracts for the 22-example Statistics library, 124-entry Model Atlas and mathematically valid supplementary PCA.
- Passed all 76 Chromium contracts in isolated browser processes plus the complete core, contract, quality and reference gates.

# v72.19.0 — Live Agent and fatty-acid research models

- Rebased on the v72.18 central compatibility registry and its stable two-panel workspace contract.
- Streamed actual representative worker states to the Agent lattice and synchronized population trajectory during computation.
- Kept post-run replay manual and one-pass; removed decorative timer-driven repetition.
- Added reduced fatty-acid metabolism and semi-mechanistic FADNS ODE examples with finite parameter sweeps.
- Added full four-state fatty-acid root exploration with residual and physical-admissibility evidence.
- Added a conditional MalCoA–FA two-state slice with exact local 2×2 spectrum only; no full-model stability claim.
- Added algebraic FADNS occupancy and CoA-sequestration operating points without dynamical-stability claims.
- Retained explicit distinctions between representative realization, ensemble evidence, local finite scans, and calibrated research repositories.
- Uses port 8039.

# v72.18.0 — Central registry and Agent animation

- Added one runtime registry for examples, compatible plots and stable left/right selections across all authored labs.
- Preserved the requested 2-up layout across plot changes and temporary narrow-width collapse.
- Removed public 3-up controls and blocked duplicate plot selections.
- Replaced Agent's four static lattice snapshots with one deterministic animated representative trajectory.
- Added play/pause, frame slider, playback speed, reduced-motion support and a state legend below the Agent lattice.
- Increased Agent representative recording to 24 validated frames by default.
- Added regression tests for cross-lab 2-up stability, Agent animation controls and deterministic frame generation.
- Uses port 8037.

# v72.8.0 — SciML and Statistics trust release

- Rebuilt SciML on the authored v72 shell.
- Restricted plot choices to workflow-compatible computed evidence.
- Removed decorative/blank neural diagnostics from browser workflows.
- Added configuration-only save, restore and share controls for SciML.
- Expanded Statistics to 20 curated examples with family filters and metadata.
- Repaired the theme selector contrast and selected-option visibility.
- Uses port 8027.

# v72.7.0 — Curve Fitting reference migration

- Reused the v72 data-ingestion contract for local fitting datasets.
- Added pure weighted linear and damped nonlinear least-squares computation.
- Added explicit convergence, termination, local covariance, residual, influence, bootstrap, sensitivity and profile evidence.
- Rebuilt Curve Fitting on the authored 2-up, 3-up and focus shell.
- Added explicit non-certification of global optimality, identifiability, mechanistic validity and out-of-sample performance.

# v72.4.0 — Statistics reference migration

- Added pure `FokoDataCore` parsing and preparation for quoted CSV, TSV, semicolon and whitespace-delimited input.
- Added explicit data shape, inferred types, missingness, row exclusion and mean-imputation evidence.
- Rebuilt `statistics.html` on the authored v72 shell with 2-up, 3-up and focus layouts.
- Added tested OLS, Pearson, Welch, ANOVA/Kruskal, bootstrap, ROC/PR, Kaplan–Meier/log-rank, Benjamini–Hochberg and sample-estimated Shewhart workflows.
- Added effect/fit summaries, assumptions, warnings and per-plot scientific meaning.
- Added local-file ingestion and configuration/input-text session/share controls.
- Removed the Statistics route from the retained legacy-shell gate.
- Added pure data-core and Statistics workspace computation tests.
- Core tests now use vendored math.js, so `npm test` does not require `npm ci`.

# v72.2.0 — Stochastic CTMC reference migration

- Added the pure, DOM-free `FokoStochasticCore` for Gillespie direct SSA.
- Restricted the reference browser scope to time-homogeneous CTMCs with non-negative integer states and integer stoichiometry.
- Added deterministic master-seed and per-trajectory seed provenance.
- Added explicit event-cap censoring, absorbing-state, event-count and propensity-range diagnostics.
- Added empirical means, unbiased variances, 5th/50th/95th percentiles, final distributions and Monte Carlo standard errors.
- Added five curated reaction-network presets with expression-compilation, SSA and mean-field smoke tests.
- Added separately computed, explicitly labeled deterministic mean-field overlays through `FokoODECore`.
- Rebuilt `stochastic.html` on the authored v72 shell with 2-up, 3-up and focus modes.
- Added independent selectors for ensemble paths, empirical bands, single paths, mean-field comparison, final histograms, variance and event-count diagnostics.
- Added configuration-only save, restore and share controls that invalidate stale trajectory evidence.
- Marked tau-leaping and SDE workflows export-only and rejected explicit time-dependent hazards in the reference editor.
- Added active numerical, structural and browser-test contracts for the Stochastic reference lab.

# v72.1.0 — scientific foundation

- Rebased implementation work on v71.46, the last supplied advanced integration with a fully green historical Python suite before migration.
- Added a pure ODE numerical core and routed worker computations through it.
- Rebuilt the ODE route as the authored reference shell with 2-up, 3-up and focus layouts.
- Added computed third-plot support with explicit availability; removed the requirement for decorative third panels.
- Added solver diagnostics, provenance and browser/export boundaries.
- Retained verified symmetric-eigenvalue, power-iteration and SINDy Pareto diagnostics from later supplied releases.
- Normalized release metadata and cache tokens to 72.1.0.
- Added active numerical and integrity gates, deterministic packaging, capability metadata and a scientific contract.
- Classified all non-ODE interfaces as retained migration work rather than falsely presenting them as completed v72 migrations.

## 72.43.3 — Optimization mobile containment

- Contains the mobile side-navigation strip as an internal horizontal scroller.
- Prevents the 390 px Optimization workspace from widening to 428 px.
- Adds an offline Chromium regression for document width, Focus projection, and side-navigation containment.
- Retains the v72.43.0 Optimization, multi-objective, Steady-State, Symbolic, and sensitivity taxonomy integration.

## V71.46 — SciML spotlight layout

- Reworked SciML cockpit into a less crowded spotlight layout.
- Primary plot is now the large stage; diagnostic and third-analysis plots form a right-side diagnostic rail on wide screens.
- Model artifact moves below plots as an evidence strip.
- No global chrome, navigation, Data/Analysis, or focused-lab changes.


## V71.45 — SciML cockpit adaptation
- Adapted SciML to the Data/Analysis cockpit language.
- Added ten concrete SciML scenarios and twelve diagnostic plot modes.
- Added visible typed model, upload and LaTeX preview areas.
- Preserved global chrome and focused labs.


## V71.43 — Statistics scientific honesty

- Upgraded Statistics Lab diagnostics from label-level displays to computed browser-side methods.
- Added ROC/PR AUC, monotone Benjamini-Hochberg FDR, OLS Cook distance, confidence and prediction bands, Kaplan-Meier curves, and log-rank test helpers.
- Corrected A/B grouped-proportion handling and Statistics result interpretation/warnings.
- Preserved global chrome, Data/Analysis cockpit layout, upload, formula input, LaTeX preview, and focused modeling labs.

# V71.40 — Lab hue propagation + token generator

- Restored requested family-based lab colour mapping.
- Added Lab identity as a plot-palette option.
- Propagated lab hue to functional cockpit surfaces.
- Added VERSION.json and scripts/stamp-version.js for build-time asset token stamping.


## V71.40 — Runtime navigation active-state

- Added a data-driven active-state resolver in `src/navigation.js`.
- Navigation active state now follows `body[data-lab]`, `body[data-module]` and the current page filename.
- Preserved the static header/nav structure; no generated chrome rewrite.
- Preserved the V71.38 lab color identity baseline.
- Added regression tests for analysis, focused, SciML and creator/learn/explore active-state mappings.
- Cache token normalized to `?v=77.4.1`.


## V71.32 — Functional cockpit boxes and plot palettes

- Made cockpit tabs functional instead of decorative.
- Replaced decorative status cards with compact live status text.
- Moved plot selectors into each plot card header.
- Added per-panel plot palette selectors: Scientific, Viridis, Cividis, Plasma, Turbo, Mono.
- Applied palettes after each Plotly render.
- Removed duplicate plot target IDs by using slot-specific plot IDs.
- Added regression tests for functional controls, palettes and cache token normalization.


## v71.31 — Wide analysis workspace + third diagnostic slot + user input

- Expanded Data/Analysis pages to use wide desktop workspace.
- Added a third plot/analysis panel.
- Added independent primary, diagnostic and third-analysis plot selectors.
- Added generic user data/model upload path for CSV, TSV, JSON, TXT and YAML/YML-like text.
- Added live formula/model preview with KaTeX fallback.
- Preserved focused ODE/Stochastic/Optimization/Steady-State labs.


## v71.30 — Analysis plot interactivity repair

- Added primary and diagnostic plot dropdowns above the analysis plot panels.
- Added automatic recompute/redraw when users change examples, methods, data or plot selections.
- Added explicit Running / Computed / Error cockpit state.
- Hid duplicate plot selectors from the left panel so plotting is controlled from the workspace.
- Added audit and regression tests.


## V71.29 — Data/Analysis cockpit rebuild

- Rebuilt the public Data/Analysis shell into a focused-lab cockpit.
- Removed static hidden contract DOM from Statistics, Fitting, Linear Algebra, Networks and ML pages.
- Removed generic browser-style shell button leakage.
- Replaced raw JSON-first outputs with result cards plus an export/raw drawer.
- Preserved v71.27 core-engine wiring.
- Validation: `390 passed, 271 skipped`; Node/core checks and JS syntax checks passed.

## V71.29 — Analysis interface parity

- Removed noisy Data / Analysis hero paragraphs.
- Reworked the descriptor shell into a focused-lab cockpit layout matching the ODE/Stochastic/Optimization visual grammar.
- Preserved V71.27 core-engine wiring.
- Added primary + diagnostic plot labels, status strip and concrete-example controls.


## V71.27 — Integrity consolidation for analysis labs

- Removed dead flat engine copies under `src/` and kept the tested engines under `src/core/` as the only numeric core source.
- Routed Statistics, Curve Fitting, Linear Algebra, Networks and ML shell labs through their tested core APIs.
- Fixed the broken Statistics ROC branch and replaced the residual-squared Cook label with a simple OLS Cook-distance calculation.
- Fixed the Networks Sankey branch to use the live node array.
- Added integrity regression tests.


## V71.22 — Playwright end-to-end deploy gate

- Added Playwright browser smoke tests for home, focused labs, descriptor analysis labs, and reproducibility controls.
- Added `package.json`, `playwright.config.js`, and `tests/e2e/main-labs-smoke.spec.js`.
- Added pytest structural checks so the e2e gate itself is protected.
- Cache token normalized to `?v=77.4.1`.

# Foko Lab release history
## V71.11 — ML Toolkit descriptor shell and focused-lab noise cleanup

- Ported ML Toolkit as the fifth descriptor-driven analysis lab.
- Removed migration/noise panels from Focused Lab pages.
- Kept Focused Labs as a separate navigation dropdown.
- Preserved ODE, Stochastic, Optimization and Steady-State as real standalone labs.
- Audit: `release-audits/AUDIT-v71-11-ml-shell-focused-noise-cleanup.md`.


## v70.20 — Cache-token normalization

- One cache token across the whole tree: `?v=77.4.1`.
- Legacy asset tokens removed.
- Added `tests/test_v70_20_token_normalization.py`.
- Audit: `release-audits/AUDIT-v70-20-token-normalization.md`.

## v71.0 — Platform-standard foundation

- Added `src/fokokit.js` as shared guard/format/state/seed/export kit.
- Added session save/load and shareable URL state.
- Added command palette, plot export hooks, accessibility hooks, and upload validation helpers.
- Added Workbench experimental-data overlay and Fitting Lab handoff.
- Added stochastic tau-leaping / SDE helper module, dynamical fitting helper, basin map helper, continuation classification helper.
- Added versioned model registry under `models/registry/`.
- Added `CITATION.cff`.
- Audit: `release-audits/AUDIT-v71-0-platform-foundation.md`.

## v71.1 — Workbench scientific integration

- Added Workbench scientific panel for observation overlay, nonlinear fitting, uncertainty envelopes, seeded stochastic ensembles and basin maps.
- Added `src/v71-workbench-science.js`.
- Added tests: `tests/test_v71_1_workbench_science.py` and `tests/test_v71_1_workbench_science_node.js`.
- Audit: `release-audits/AUDIT-v71-1-workbench-science.md`.
## V71.9 — unified identity and standalone lab depth framing

- Restored the creator photo on the homepage creator card while keeping the platform mark as a secondary badge.
- Added homepage and documentation sections explaining why standalone labs remain powerful focused workspaces.
- Added per-page scientific depth briefs to ODE, Stochastic, Optimization and Steady-State standalone labs.
- Preserved all legacy controls, scripts and non-redirect standalone behavior.
- Validation: 309 passed, 271 skipped; Node science tests and syntax checks passed.

## V71.15 — ODE fitting, CI, and trajectory bands

- Added real focused-ODE parameter fitting through the worker.
- Added parameter confidence intervals from the local covariance approximation.
- Added optional fit uncertainty bands on trajectory plots.
- Preserved Focused Labs and descriptor-shell analysis labs.

## V71.19 — Reproducibility layer

- Added compact reproducibility controls across pages that load the V71 platform layer.
- Added session save/restore, shareable URL state, JSON bundle export and JSON bundle import.
- Added `window.FokoRepro` for future shell integration and tests.
- Added documentation/tutorial guidance for browser-local reproducibility.
- Preserved all focused labs and descriptor-driven analysis labs.

## V71.21 — Web Worker compute bus consolidation

- Added `src/platform/compute-bus.js` as the shared browser API for worker-backed computation.
- Added `window.FokoComputeBus.run(...)`, `cancel(...)`, `createLegacyHandle(...)`, and `platformRun(...)`.
- Routed ODE / Parametric ODE and Optimization worker calls through the bus-compatible legacy handle.
- Preserved all existing worker protocols and lab behaviour.
- Kept direct lab pages usable while preparing later descriptor-shell migration.

## V71.21 — Stochastic and Steady-State compute-bus migration

Stochastic ensemble runs and Steady-State solve/continuation workflows now execute through the shared compute-bus lifecycle while preserving the focused-lab pages and scientific engines.

## V71.24 — Analysis workspace two-plot repair
- Removed in-interface feasibility/noise text from analysis labs.
- Loaded shared shell CSS on descriptor pages.
- Added two-plot workspace support with secondary diagnostics for Statistics, Fitting, Linear Algebra, Networks and ML.
- Preserved focused modeling labs unchanged.

## V71.36 stable rollback

Restores the V71.35 stable interface after the aggressive chrome/token cleanup proved too disruptive. This is the safe baseline for future incremental refactoring.

## V71.43 — Plot header and lab hue rendering repair

- Fixed analysis cockpit plot-header overlap by moving plot titles onto their own row.
- Hid duplicate label text accessibly to prevent title/dropdown collisions.
- Made `Lab identity` palette apply to Plotly traces, histogram bars, box/violin fill, and heatmap color scales.
- Preserved Statistics scientific honesty work from V71.42 and all focused labs.

## V71.44 — Curve Fitting scientific honesty
- Upgraded Curve Fitting Lab numerical diagnostics: nonlinear least squares, covariance, confidence/prediction bands, bootstrap, profile scans and influence diagnostics.

## v72.0.0 — Authored scientific foundation

- Rebased the active platform gate on the last fully green advanced integration.
- Added a pure ODE numerical core and an authored ODE reference interface.
- Separated browser-computed explicit solvers from export-only stiff solvers.
- Added deterministic release packaging, capability metadata and active scientific contracts.

## v72.1.0 — Steady-State reference migration

- Added the pure, DOM-free `FokoSteadyCore`.
- Added damped Newton root solving with central finite-difference Jacobians, partial-pivot elimination, backtracking, residual histories and explicit termination reasons.
- Added deterministic multi-start while explicitly rejecting exhaustive-root claims.
- Rebuilt `steady.html` on the authored v72 shell with 2-up, 3-up and focus plot modes.
- Separated algebraic root convergence from dynamical stability.
- Limited browser stability claims to declared dynamical systems with 1×1 or 2×2 Jacobians.
- Renamed legacy continuation claims as sequential 1D and 2D parameter scans.
- Marked all sampled crossing and turning diagnostics as unconfirmed, grid-dependent candidates.
- Added configuration-only session, restore and share controls that invalidate stale numerical evidence.
- Added core, structural and browser-test contracts for the Steady-State reference lab.

## v72.2.0 — Stochastic CTMC reference migration

- Added a pure Gillespie direct-SSA core for time-homogeneous CTMCs.
- Added seeded ensembles, empirical uncertainty, event-cap censoring and absorbing-state evidence.
- Rebuilt the Stochastic page on the authored v72 shell.
- Kept mean-field overlays distinct from stochastic ensemble results.

## v72.3.0 — Optimization reference migration

- Added a pure bounded continuous-optimization core.
- Added coordinate, projected penalty descent, differential evolution, multi-start and random-search methods.
- Separated penalized search from the independent feasibility-tolerance gate.
- Added objective, candidate, convergence, violation and finite-sample Pareto views.
- Rebuilt the Optimization page on the authored v72 shell with 2-up, 3-up and focus modes.
- Added explicit non-certification of KKT conditions, local optimality and global optimality.
- Added numerical, preset, structural and browser contracts.


## v72.4.0 — Statistics reference migration

- Added the pure data-ingestion core and authored Statistics workspace.
- Added explicit missingness, assumptions, uncertainty and provenance evidence.


## v72.10.0 — Machine Learning reference migration

- Rebuilt the ML Toolkit on the authored v72 shell.
- Added fold-safe standardization, seeded cross-validation and out-of-fold diagnostics.
- Added linear/ridge regression, logistic regression, Gaussian naive Bayes, k-NN, k-means and PCA reference computations.
- Added model comparison, calibration, learning curves and permutation-importance evidence.
- Added 14 synthetic teaching and stress-test datasets with explicit scientific limitations.
- Corrected SciML to load the SINDy core that implements the real Pareto refit sweep.
- Local validation port: 8028.

## v72.11.0 — Workbench adapter integration

- Replaced the legacy v3 Workbench and historical DOM/CSS stack with an authored v72 interface.
- Added `src/workbench/adapters.js`, a stable adapter registry over the migrated pure numerical cores.
- Integrated ODE, steady-state, stochastic, optimization, agent, statistics, fitting, linear algebra, networks, machine learning and SINDy routes.
- Added one-result contracts with metrics, warnings, provenance and distinct plot registries.
- Blocked duplicate plot selections and empty symmetry panels.
- Preserved legacy `?model=` links through explicit compatibility mappings.
- Added Workbench numerical, structural and scientific-honesty tests.


## v72.12.0 — Symbolic reference and scope decision

- Replaced the legacy Symbolic Lab with an authored v72 reference interface.
- Added a pure explicit expression parser, conservative simplifier, rule differentiator and symbolic Jacobian core.
- Added numerical scope evaluation, finite one-dimensional root scans and finite multi-start equilibrium candidates for small square systems.
- Added compatible expression, derivative, Jacobian, vector-field, nullcline, equilibrium and local-spectrum plots.
- Removed the historical symbolic runtime from the active release.
- Marked general integration, exact solving, factorization, complex branch analysis, broad special functions and general ODE solving as SymPy export-only.
- Added numerical, structural and scientific-honesty contracts.
- Local validation port: 8031.

## v72.13.0 — Platform hardening

- Added the shared pure `FokoPCA` core for deterministic small-dataset principal-component diagnostics.
- Added standardized PCA to Statistics/Data Analysis and expanded the curated Statistics library to 22 examples.
- Added PCA scores, variance and loading diagnostics beside Machine Learning regression, classification and clustering results.
- Added multistate trajectory PCA to SciML and removed state-dimension-incompatible phase/PCA selectors.
- Repaired Agent blank-output failures by awaiting Plotly, rejecting stale runs and providing a deterministic Canvas rendering fallback.
- Replaced the malformed theme icon and selector assembly with one accessible non-wrapping native control.
- Added distinct-plot and 3-up availability gates across the hardened analysis workspaces.
- Added active Python, JavaScript and Playwright regression contracts for the reported failures.
- Local validation port: 8032.

## v72.14.0 — Trust and Agent hardening

- Moved Agent ensembles into a dedicated Web Worker with progress, cancellation and stale-result rejection.
- Added strict integer and categorical validation and rejected incomplete or internally inconsistent Agent configurations.
- Added random-with-replacement and shuffled site sweeps plus random, split and central-patch initialization.
- Replaced approximate segregation relocation search with uniform sampling from the current empty-site pool.
- Added exact initial occupancy, normalization provenance, model-specific endpoints, connected-cluster summaries, terminal classifications, Monte Carlo standard errors and Wilson intervals.
- Added presentation-state protection: no concurrent duplicate plot render, visible-evidence checks, deterministic Canvas fallback, and retained numerical exports after render failure.
- Made synthetic SciML noise deterministic through an explicit exported seed.
- Added a cross-lab Canvas mode and central-workspace container breakpoints.
- Removed obsolete backup application code from the active release.
- Local validation port: 8033.

## v72.16.0 — Model input and reliability

- Added exact Agent initial-population counts and deterministic fraction allocation evidence.
- Added restricted declarative custom Agent models and configuration import.
- Added repeated/nested ML validation, repeated permutation importance and data leakage/quality audits.
- Added local model/configuration import routes to Stochastic, Optimization, Linear Algebra, Networks, Symbolic and Workbench, completing the active lab input contract.
- Removed visible 3-up layouts in favor of readable 2-up/Focus workspaces.
- Removed vendored scientific libraries from npm dependencies; npm installs only Playwright browser-test tooling.

## v72.19.0 — Validation, accessibility and performance

- Added 32 deterministic differential comparisons against NumPy, SciPy, scikit-learn, NetworkX and SymPy.
- Added a module-level validation matrix separating unit, invariant, differential, browser and visual evidence.
- Added skip links, stable main landmarks, one-H1 enforcement, labelled controls, visible keyboard focus, reduced-motion and forced-colour support across 14 authored scientific pages.
- Added explicit Plotly busy/rendered states and accessible plot labels.
- Deferred all external scripts, removed Plotly preload and removed unused math.js/KaTeX from six labs.
- Added page-specific JavaScript/script-count budgets, central-workspace container breakpoints and session-local performance telemetry.
- Added Chromium/Firefox/WebKit/mobile Playwright projects; no browser pass is claimed from the restricted development environment.
- Local validation port: 8037.

## 72.19.0 — Live Agent and fatty-acid research models

- retains the v72.18.1 browser-gate repair after the reported 29-failure local run;
- streams actual representative Agent lattice and population evidence to both visible panels;
- keeps post-run frame navigation manual and non-looping;
- promotes the reduced fatty-acid metabolism and FADNS models into the ODE core library;
- adds full-model residual/branch exploration, a conditional 2×2 stability slice and algebraic FADNS enzyme occupancy to Steady-State;
- filters roots that violate declared physical constraints from physical interpretation;
- uses port 8039.

## 72.32.0 — Scientific-canvas density and layout ownership

- Removed layout writes and layout-button listeners from the central scientific registry.
- Restored one layout owner per focused lab.
- Added per-lab Two-up and Focus persistence browser tests.
- Made the home ODE demo lazy-load and validate the canonical core.
- Routed the home ODE link to a concrete Lorenz autorun example.
- Reduced oversized public and workspace titles.
- Narrowed the controls and evidence rails to return width to scientific plots.
- Increased desktop plot height and reduced plot-card header overhead.
- Added a critical hardening audit covering 1,981 `!important` declarations, duplicated layout implementations, and timing-based rendering glue.
- Local validation port: 8056.

## 72.34.0 — Scientific depth restoration

- Restored broad, core-derived plot palettes after the density pass removed too much analysis.
- Added real adaptive-step and local-error traces to the ODE core and expanded the curated ODE model library.
- Expanded Stochastic, Optimization, Steady-State and Symbolic examples and diagnostics.
- Audited 189 Atlas entries for required metadata, unique titles, valid target pages and protected-research boundaries.
- Standardized maintained workspaces on layout-first, visible-plot-only rendering after browser geometry settles.
- Removed synthetic selector changes from the central registry.
- Retained compact headings, explicit Home, split task navigation, themes, and the full research identity including protected Thermoplants context.
- Local validation port: 8060.

## 72.36.0 — Home demo section trigger

- Starts the four bounded Act 1 demonstrations when the act enters view, rather than waiting for each full-width row independently.
- Prevents the lower Stochastic and Agent demonstrations from remaining uncomputed when the visitor scrolls to the section heading.
- Keeps all four demonstrations routed through the canonical ODE, steady-state, stochastic and Agent cores.
- Local validation port: 8064.

## 72.38.2 — computed defaults and Two-up stability
- Fixed missing helper functions that prevented the home demo reel from leaving `Ready`.
- Made curated ODE, Steady-State, Stochastic, Optimization, and Statistics examples compute on initial load.
- Preserved `autorun=0` and kept shared/imported configurations non-executing.
- Removed stale standalone plot-lifecycle references and normalized the release token.

## 72.38.2 — homepage browser-contract alignment
- Updated the final homepage Playwright locator to the current `Run identifiability check` button label.
- Added active and preflight checks preventing public copy and browser assertions from drifting apart.
- Kept all runtime, numerical, Two-up, catalog, and research behavior unchanged.
- Local validation port: 8072.

## 72.38.2 — Browser truth alignment

- Preserved successful Two-up and Focus stabilization.
- Corrected successful plot state from `ready` to `rendered`.
- Replaced a stale public-provenance assertion with a direct adapter-registry contract.

## v72.38.3 — ODE sibling-render race correction

- Replaced the global ODE plot-schedule cancellation token with a coalescing per-side queue.
- A left-selector update no longer cancels an already pending right-panel render.
- Kept the existing repeated Two-up and Focus browser stress contracts unchanged.
- No numerical or scientific surface changes.
- Local validation port: 8073.

## v72.39.1 — platform benchmark hardening

- Applied one render lifecycle to all 13 authored scientific workspaces.
- Enforced exactly two stable plot hosts per workspace and removed all remaining third-panel branches.
- Made visual render state and accessibility state atomic, including explicit `aria-busy="false"` after completion.
- Consolidated the public stylesheet request stack and reduced the CSS inventory from 21 files to 13 without relaxing page budgets.
- Reframed public language around scientific tasks, diagnostics and limits rather than implementation details.
- Added measurable platform, lifecycle and external-comparator benchmark gates covering scientific reliability, stability, UX and GUI structure.
- Preserved all numerical cores, 189 Atlas entries and explicit non-claim boundaries.
- Local validation port: 8074.
## v72.42.1 — ODE Load/Run browser-contract correction

- Retains the v72.42.0 application implementation.
- Corrects the shared-geometry browser test to press Run after loading Van der Pol.
- Explicitly verifies that Load leaves the ODE workspace at Ready.
- Adds an offline Chromium ODE Load/Run and stiffness-geometry regression.
- Local validation port: 8092.


## v72.48.0 — modelling handbook, Sensitivity library and platform stability

- Rebuilt Docs as a searchable modelling handbook covering question formulation, boundaries, equations, units, solver choice, verification, validation, uncertainty and reporting.
- Rebuilt Tutorials as twenty practical investigations with persistent local progress.
- Expanded the Sensitivity library to 17 editable ODE models across 13 scientific families.
- Added raw/range/elasticity presentation, top-parameter filtering, uncertainty controls and contour/3D response-surface selection to the existing 35-plot Sensitivity registry.
- Added release-blocking tests that run every Sensitivity preset and audit maintained plot registries and curated-library counts across the platform.
- Preserved all stable numerical cores, explicit two-panel layout ownership and browser-capacity refusal.
- Kept unsupported roadmap methods explicitly limited, export-only or unavailable.
- Local validation port: 8102.
