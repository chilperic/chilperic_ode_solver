# Foko Lab scientific contract

This contract states what every release must preserve. It is organized by principle, not by release number. Historical changes belong in `RELEASES.md`.

## 1. Claim classes

Every public capability has one class, defined in `CAPABILITIES.json`:

- **Browser-computed** — the visible result was computed locally from the current input by the stated browser method.
- **Limited-browser** — a bounded, heuristic, local, or small-scale computation was performed; stronger claims require external validation.
- **Export-only** — the platform generated a reproducible external workflow and did not claim to execute it.
- **Unavailable** — the capability is not presented as computed.

A release must not upgrade a claim class without a test, an independent reference comparison where one exists, and a matching `CAPABILITIES.json` change.

## 2. Computed status means evidence exists

A page may report **Computed** only when:

1. the current input was validated;
2. the declared method completed;
3. numerical or statistical diagnostics were produced;
4. the current visible evidence was rendered; and
5. stale evidence from a previous configuration was not reused.

A blank, stale, decorative, or incompatible plot under a computed status is a release blocker. **Empty visual symmetry is not a result.**

## 3. One scientific engine per method

Scientific algorithms live in `src/core/`. Pages, workers, Workbench adapters, and SciML workflows delegate to those cores.

Independent copies of a deterministic ODE integrator, optimizer, root solver, regression method, eigensolver, random generator, or statistical test outside an approved core are release blockers unless the code is explicitly isolated as an independently tested reference implementation.

## 4. Numerical evidence

### ODEs

A deterministic trajectory reports the method, tolerances or fixed step, accepted and rejected steps where available, function evaluations, minimum and maximum step, termination reason, and warnings. Fixed-step methods must not imply that zero rejected steps establishes accuracy.

Local Jacobian timescale ratios and rejection patterns are **stiffness evidence**, not stiffness certificates. Suspected stiff systems must direct the user to an implicit external method or the independent SciPy verification path.

### Steady states

A root requires a residual norm and termination reason. Multi-start establishes roots found from a finite set of initial guesses; it does not establish completeness. Stability claims require an admissible root and an applicable Jacobian eigenspectrum. Sequential parameter scans are not continuation certificates.

### Optimization

Raw objective, penalized search score, constraint violation, feasibility tolerance, and termination reason remain distinct. A best sampled candidate is not a proof of global optimality and is not a certified global optimum. An infeasible candidate is never labelled a solution.

### Linear algebra

Residuals, rank decisions, conditioning, and algorithmic scope are reported separately. Small residuals do not erase ill-conditioning. Tolerance-dependent rank is not presented as an exact fact.

## 5. Stochastic and Agent evidence

Random computations require explicit master seeds and reproducible derived seeds. Ensemble size, censoring or event caps, Monte Carlo uncertainty, and terminal classification are reported.

An Agent animation is one representative seeded realization. It is not an ensemble-average spatial field, calibrated biological time, causal evidence, or uncertainty surface. Pause stops numerical advancement; cancellation publishes no partial ensemble.

## 6. Fitting and identifiability

A converged fit is not an identifiable model. Nonlinear fitting reports residual diagnostics, local parameter correlation, finite profile-SSE evidence, and the limits of those diagnostics. Practical-identifiability screening is not structural-identifiability proof.

Pairs bootstrap results report the seed, requested resamples, successful resamples, and failures. Known-sigma inverse-variance weighting is accepted only for finite, strictly positive supplied standard deviations. Experimental-design suggestions are finite local heuristics, not optimal-design certificates.

## 7. Statistics, ML, and SciML

Missing-data handling and usable row counts are explicit. A statistical association or predictive result does not establish causality. Mean imputation is labelled as a sensitivity analysis. Omnibus group tests do not identify specific group differences without an applicable post-hoc procedure. Cross-validation preprocessing is fitted inside each training fold. Leakage, duplication, imbalance, and calibration are not hidden behind one score.

SINDy results depend on derivative estimation, scaling, library choice, noise, and sparsity. A sparse equation is a data description, not established mechanism. Neural workflows marked export-only do not display fabricated training diagnostics.

## 8. Plot and layout integrity

Plots must be compatible with the current result and dimension. Duplicate left/right selections are repaired deterministically.

**Plot selection and layout selection are orthogonal.** Changing either plot in Two-up must preserve Two-up after all asynchronous rendering completes. Changing either plot in Focus must preserve Focus. Only explicit user action, fewer than two compatible outputs, or a genuinely narrow viewport may change the effective layout.

Titles, selectors, legends, and evidence captions remain separate. A legend must describe the visible encoding. Hidden or unavailable panels do not count as evidence.

Every plot host has one render owner. A completed interactive or fallback plot must expose a non-anonymous accessible name, `data-render-state` matching the visible evidence, and `aria-busy="false"`. Pending, empty and failed states must also finish with `aria-busy="false"`; only active rendering may use `aria-busy="true"`.

Analysis depth is restored only through outputs derived from the current result. Step-size traces, local-error estimates, residual surfaces, Hessian spectra, first-passage summaries, autocorrelation, nullclines, PCA, or sparsity sweeps must come from the stated core computation. A requested advanced view without an implemented core is labelled limited, export-only, or unavailable; it is never approximated with a decorative curve.

## 9. Provenance, verification, and reports

Every reproducible result records the release, configuration, method, tolerances, seeds where applicable, and a stable configuration hash.

Independent SciPy verification is an optional referee. It does not silently replace the browser result and it does not validate the scientific model. A Model Report Card states both established evidence and claims not established.

## 10. Privacy and export boundary

Local browser workflows do not upload user data. Network-dependent optional components must be disclosed before use. Export-only capabilities generate scripts or artifacts and never imply that external computation already occurred.

## 11. Release blockers

A release is blocked by any of the following:

- success without numerical or statistical evidence;
- a scientific engine reimplemented outside its canonical core;
- stale or incompatible visible evidence;
- silent data deletion, imputation, leakage, censoring, or infeasibility;
- a plot change that silently changes the selected layout;
- a claim class inconsistent with the implementation;
- a failed active contract, differential reference, page-quality gate, or required browser gate;
- documentation that claims a capability the current release does not provide.

