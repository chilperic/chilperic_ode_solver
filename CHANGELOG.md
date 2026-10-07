## 80.4.2 — Restore the complete 80.3 experience

Restores the native organ-growth, transport and evolution animation renderers, controls, parameter panels, examples, plots and data exports from 80.3. The Research Hub and corrected acknowledgements remain. Model equation sections and source downloads are excluded; original scientific calculations run on a separate private server. The newer private C3–C4 research core remains separately preserved and is not silently substituted into these legacy simulations.

# 80.4.1 — 7 October 2026

Regression correction after the platform-wide 80.4.0 redesign.

- Restores the previous 80.3.2 home, laboratory, experiment, contact, acknowledgement, trust and non-plant research-page logic.
- Retains the redesigned Research Hub as the targeted interface improvement.
- Restores a visible plant-growth animation driven only by reduced archived simulation outputs; the public replay does not ship the unpublished scientific engine.
- Restores a visible C3–C4 evolution trajectory replay using archived research figures.
- Keeps plant/evolution public pages minimal and equation-free.
- Keeps protected plant/leaf engine files and parameter presets out of the public tree.
- Preserves the curated collaborator acknowledgements and scientific claim boundaries.

# 80.4.0 — 7 October 2026

Major public-interface redesign focused on research navigation, scientific visualisation and animation visibility.

- Rebuilt the FokoLab home and Research Hub with a shared modern visual system.
- Added sticky research navigation, responsive layout, scroll progress, restrained motion and consistent page hierarchy.
- Made archived scientific simulations and animations prominent rather than burying them behind text-heavy legacy layouts.
- Added auto-playing, pausable result reels using existing research outputs; no unpublished equations are shipped to the browser.
- Rebuilt the public C3–C4 continuum, evolution-journey and evolution-versus-optimisation pages around scientific interpretation and animated result replay.
- Aligned plant, leaf, fatty-acid, T-cell, acknowledgements, trust, laboratory directory, experiment catalogue and contact pages with the same design language.
- Preserved the protected plant research boundary: complete equations, detailed parameterisation, calibration files and private scientific development remain outside the public tree.
- Preserved the approved FokoLab brand assets.
- Added static and Playwright browser smoke tests for the redesigned public experience.

# 80.3.2 — 6 October 2026

Restores the public plant simulation outputs and scientific plots while keeping the unpublished research core protected.

- Restored an interactive public result explorer across Sudan, Niger, Germany, Canada and Brazil scenarios.
- Restored public Pareto, local sensitivity, Sobol, isotope-diagnostic, landscape and ecological-context figures.
- Kept the detailed equations, calibration files, raw parameterization and model-development record out of the public website.
- Retained the corrected distinction between landscape-search traces and biological evolutionary trajectories.
- Retained the curated collaborator acknowledgements with Jérémie Muller-Prokob and Yvonne Danisch as main collaborators.

# 80.3.1 — 6 October 2026

Scientific-hardening and publication-boundary release for the unpublished plant programme.

- Reframed the plant project around mechanistic evolution across the C3–C4 continuum rather than a C2-centred narrative.
- Separated physiological feasibility, landscape optimization and finite-population evolution in the public scientific description.
- Removed the unpublished plant/leaf executable engines, detailed equations and parameter presets from the current public site tree and replaced those routes with non-reconstructive research overviews.
- Removed plant/leaf parameter presets from public example registries and redacted serialized plant configurations from public recovery evidence.
- Curated acknowledgements: Jérémie Muller-Prokob and Yvonne Danisch are identified as main collaborators; the previous long thesis/programme qualification text was removed.
- Clarified the browser computation timeout: a timeout accepts no partial result.
- Public descriptions retain explicit uncertainty/provenance classes and the distinction between water-viscosity effects and other hydraulic resistances.

Note: prior public Git history can still contain earlier versions. This release removes them from the current published tree; repository-history cleanup is a separate operation.

# 80.3.0 — 6 October 2026

Persistent native actions, automatic example preparation with Undo, full-record evolutionary and multi-objective analysis, Contact portrait, discoverable institutional acknowledgements and cross-page visual/accessibility corrections. See site/AUDIT-80.3.md for scope and evidence.

# 79.2.0 — source-preserving integrated update

## Compared with the supplied 79.1 application

Retained all original scientific routes and catalogue records, original model equations, six optimization methods, four sensitivity methods, weighted fitting, broad statistics/ML/AI tools, original agent/genetics models, structured Model Studio imports and independent plot selectors. Added the exact original FADNS and fatty-acid models as Studio starters and direct Lipids experiments. Preserved original research/CV/contact/attribution and connected experimental workflow.

Integrated nine new laboratory entry points, 37 configurations, seasonal finite-resource plant bookkeeping, explicit lifetime/environment duration, weather forcing, seasonal trait selection, colored pathway landmarks and references, stochastic/branching/spatial/fractal demonstrations, distinct run/cancel/replay/comparison state, local saves, shareable input URLs, scientific exports and independently executed native Python references. Retained original general laboratories rather than routing users through compulsory book workflows.

Updated the home page and additive laboratory layouts, mobile disclosures, plotting styles, two-pane selection and WebGL-unavailable behavior. Bundled local SVG mathematics rendering while retaining the exact approved identity assets. Kept V6.17 chapter/section/practice/appendix navigation and search; added worked companions; excluded private author-planning pages from the public PDF and search index.

## Targeted original numerical correction

`src/core/statistics.js`: the prior ROC/PR function treated tied scores sequentially and omitted the first recall interval from average precision. New tests failed on perfect ranking (AP 0.5 rather than 1) and on a tied positive/negative pair (order-dependent AUC). The correction groups equal scores into a single threshold, includes every recall increment and rejects invalid/single-class input. It does not replace the statistics laboratory. The remaining 38 original core files are byte-identical.

## Source limits

This is not the inaccessible newer hosted website and does not claim recovery of its 374 advertised examples. Newly authored teaching reductions do not stand in for missing calibrated research code. The fatty-acid interpretation discrepancy remains explicitly unresolved. The original website has not been deployed over or modified.


### Constrained Python export correction — 6 October 2026

Python exports use parsed expressions with vector-indexed variables in every objective and constraint function. This fixes unbound constraint variables and the collision between a variable named `x` and the parameter vector. Six actual browser-generated scripts were independently executed against analytic constrained optima, and the 85-browser-check regression suite was rerun. See `site/optimization-export-verification.json`. These scripts independently solve the exported configuration with SciPy SLSQP; they do not claim to replay the browser algorithm. Unsupported translation semantics are refused explicitly.
