# Limitations — v78.2.0

This is a packaged release candidate, not a deployed or independently certified public service.

## Model and measurement scope
The new structured editor is a view of the existing canonical ODE model. It records units and provenance, and validates scalar mathematical expressions; it does **not** perform a full dimensional analysis. Observation operators must be scalar expressions of declared states, parameters and time. Other mathematical representations remain in the specialist workspaces, which were preserved but not all rebuilt.

The observation contract retains up to 1,000 rows, 12 conditions, replicates, observable definitions, units, positive fixed standard deviations and string metadata. Conditions use constant parameter or initial-state overrides. Time-dependent protocols, dosing events, pre-equilibration, censoring, correlated errors, random effects and fitted noise are not implemented in this joint fit. It is not full PEtab support. Unit strings must match; units are not automatically converted. Extra CSV columns remain metadata and are not numerical inputs unless modeled explicitly. If metadata names collide with canonical CSV headers, export prefixes those headings with `metadata:`; the JSON preserves original names.

Fitting estimates one to three shared parameters using three bounded coordinate-search starts. Stop reasons, boundary proximity and invalid candidate evaluations are retained. This does not certify a global optimum or identify parameters. No parameter confidence intervals are fabricated. Fixed-sigma weighted least squares assumes independent errors. Retaining replicate rows is not a hierarchical model.

Chronological, complete-condition and complete-replicate holdouts are distinct protocols. Complete-replicate grouping uses the pair (condition, replicate), not a global subject identifier: use an external subject-grouped protocol when the same biological subject spans conditions. Repeated tuning against a displayed holdout invalidates its role as a final independent test set.

Data-only and residual polynomial baselines pool training conditions per observable and use time only. They do not model a condition-response function. The residual hybrid is not a neural ODE or a learned biological mechanism. There is no live AI service, autonomous agent or cloud model training.

## Verification case and programme
The fluorescence case contains 52 explicitly synthetic observations from an analytic exponential model. Its calibrated gain/background and noise protocol are teaching assumptions. This does not reproduce an original lipid, plant or T-cell research analysis, or validate biology. Those original-research transfers still require the relevant full models, data, provenance, permissions and scientific review.

Programme attachments contain complete executed or imported run records, not competency scores. Imported evidence is labelled unverified; a successful local execution is not independent reproduction or a passed gate. Notes and raw observations are local to the browser unless the user exports them. The private V6.16 PDF and its full notebook package are not included in the public site.

## Platform and validation boundary
Normal HTTP browser navigation in this environment returned ERR_BLOCKED_BY_ADMINISTRATOR. npm dependency installation failed with DNS EAI_AGAIN. Rendered checks use original-source in-memory Chromium fixtures, simulated storage (except deliberate denial tests), and the declared bounded computation fallback. They do not certify native worker loading, real browser persistence, full HTTP E2E, screen readers, physical devices or live GitHub Pages deployment. The included native-browser checks remain release gates to run in a working environment. No live repository was modified.

SVG charts have native data tables, marker/line redundancy and descriptions, but full WCAG conformance has not been established. A formative study with unfamiliar users has not been conducted; the task protocol is supplied separately.

Primary pages use system fonts and native MathML. Legacy KaTeX typography still references a version-pinned remote font distribution; no font binaries are included. Native equation rendering and offline/network behavior require testing on the deployment target.

## Scope of observation operators

The structured measurement operators are evaluated by the joint `foko.observations/2` fitting path. Forward simulation plots, local sensitivity, independent-uniform ensembles, conditional surrogates and the older synthetic-data generator still act on the explicitly selected **state output**. The interface labels that selector accordingly. This release does not silently claim that every specialist analysis has migrated to measurement-space outputs.

## Build and performance

Readable source modules are preserved; committed generated browser entry assets are verified against them before tests. Workspace search loads the full destination list but not full lesson bodies or the book map. The unchanged static payload gate passes; it is not a measured LCP, INP, memory or battery benchmark.

The Python rendered fixtures used Playwright 1.57.0 with the available Chromium 144, not the npm-pinned Playwright 1.61.1 browser build. This version distinction is recorded in runtime-environment.json. Native E2E and GitHub Pages gates use the pinned npm dependency and remain unexecuted here.
