> **Book companion preview (base v78.2.0).** Start with [Book companion validation](BOOK_COMPANION_VALIDATION.md) and [Publication review](PUBLICATION_REVIEW.md). The complete author PDF is included; do not push it or its index publicly before reviewing the personal front matter. Serve the app and open `book.html`. The underlying application release notes below remain the v78.2.0 record.

# FokoLab · v78.2.0

A connected scientific experiment workspace: **model → data and fitting → robustness → scientific ML → evidence**. Static browser software, editable equations, explicit assumptions, worked lessons and reproducible records. No account, AI subscription or server-side computation is required for the connected workflow.

**Release candidate, not production certification.** Native HTTP/Worker, full E2E, real-device, screen-reader and live Pages tests remain to run in a suitable environment. Executed tests are recorded in [VALIDATION.md](VALIDATION.md); scientific limits in [LIMITATIONS-v78.2.0.md](LIMITATIONS-v78.2.0.md). The older specialist tools remain available; their independent formats have not all been unified.

## Start

Serve this directory over HTTP rather than opening index.html with file://:

```bash
python3 scripts/serve-fresh.py
```

Open the printed address. Visitors to a hosted site do not need Python or npm. `workspace.html?new=1` starts a deliberately blank editable ODE. `workspace.html?resume=last` resumes the last saved project. The homepage offers an explicit create/import flow and four research investigations; merely opening a page does not run a calculation.

## New in v78.2.0: model and measurement authoring

**Edit model** now opens synchronized structured views for states/equations, parameters, measurement operators and numerical settings. Native equation previews and field-specific validation lead to a reviewed before/after change. JSON remains an expert representation. Undo/redo and named scenarios preserve model/data inputs; baseline runs never masquerade as current-model calculations.

**Data & fit** previews column mappings and retains condition, replicate, observable, known sigma, unit and extra metadata columns. Distinct replicate measurements at the same time are not aggregated. Explicit exclusion of missing observations retains source cells and reasons. Constant condition-specific parameter/initial-state overrides are checked before use. Exact unit labels are validated; there is no automatic dimensional conversion.

The joint fit uses declared measurement equations, fixed known standard deviations when supplied, and one to three shared parameters. Choose chronological, complete-condition or condition/replicate-group holdout. Compare a constant baseline, mechanism, pooled time-polynomial model and additive output-residual hybrid on the same held-out rows. Inspect sigma bars, per-observable errors and individual residuals. No result claims identifiability or neural training.

Open the complete **synthetic** measurement case at `workspace.html?case=fluorescence`; its [worked protocol](research/measurement-case/README.md), data generator and independent SciPy/NumPy reproduction are included. This is a verification case, not new empirical research.

The scientific palette is now separate from the brand palette: eight distinct colors, redundant line/marker styles, readable ticks, and substantive accessible plot descriptions. Irrelevant continuous-maximum warnings no longer appear for final-value results. Scientific assumptions remain accessible while detected failures remain visible.

### Programme: attach calculations, not only links

**Programme** follows the supplied *Scientific Modelling, AI & Research Software Engineering*, V6.16: the same 27 chapters, seven parts and Verify → Infer → Compare → Release gates. The private PDF and companion notebooks are not included in the public website. You may select your own local PDF for edition-specific chapter links; this does not upload it.

A run can now be explicitly attached from **Evidence**, together with an interpretation. The attachment contains the actual immutable model/data/settings/result snapshot and can be downloaded as a replayable experiment. Imported records are unverified; execution does not certify competence, biological validity or independent review. Programme exports include attached observations: review confidentiality before sharing. Personal notes are not published automatically.

The existing ink/copper/sage identity and logo are retained; this release changes the working interaction and scientific data contract, not just the color theme.

## Retained connected scientific workflow

The connected workspace holds one canonical model and observations across five stages. A result belongs to its captured inputs, not whatever happens to be in the editor when it finishes. Editing invalidates current results; older input snapshots stay in Evidence. Fit parameters are reviewed before applying. Data drafts must be validated, JSON edits reviewed, and imported results recomputed. Save a copy for backup: browser autosave is not durable archival storage.

The computation engine uses the existing strict Project/Compute/ODE core. Supported connected tasks: deterministic trajectory; explicitly synthetic observations; bounded 1–3 parameter fitting; common-holdout comparisons against constant, time-polynomial and additive residual-hybrid baselines; local finite differences; seeded independent-uniform parameter ensembles; and a one-parameter conditional surrogate with independent test samples and outside-range challenges. These are bounded methods, not neural-network training or Bayesian inference.

### Research pathways

| Path | Running model | Investigation | Boundary |
|---|---|---|---|
| Lipid flux | Preserved public four-pool reduced lipid equations | Flux response, parameter recovery and sensitivity | Not the full FADNS thesis model or a proof of bistability. |
| T-cell division | Four generation-resolved states | Division/death confounding and informative observables | Not a complete Cyton or Smith–Martin implementation. |
| Plant productivity | Five-state leaf/root/fruit allocation, water and cumulative gross carbon | Environment → assimilation → retained biomass; water/production trade-offs | Illustrative response functions, constant conditions, no calibrated crop forecast or protected C3–C4 implementation. |
| Growth benchmark | Logistic equation with analytic solution | Solver checks, fitting, surrogate evaluation and extrapolation | A numerical benchmark, not discovery of a biological law. |

### Learn by performing an investigation

Thirteen lessons contain worked reasoning, goals, two exercises with hints/solutions, a reasoning checkpoint, a runnable experiment and exportable research notes. A new measurement-contract lesson follows predict → derive → compute → diagnose → transfer. Topics: scientific questions and observables; balances/units; solver verification; identifiability; sensitivity; uncertainty semantics; validation/leakage; conditional surrogates; residual hybrids versus equation-level learning; sparse equation discovery; informative experiments; and reproducible evidence. Four pathways become cumulative portfolio investigations. Self-reported completion is not a qualification, and generated datasets are not empirical validation.

The focus is scientific judgment: write a mechanism, choose observables, establish baselines, test what learned corrections change, and state what the data cannot establish. Introductory chatbot/API tutorials are not duplicated here. An optional AI review **text export** asks an external assistant to criticize assumptions and propose tests; it makes no network call and excludes raw observations. Review model details for confidentiality before sharing.

## Scientific breadth retained

The 20 specialist workspaces, 259 catalogue entries, 21 advanced Studio starting models, documentation, 21-part older practical curriculum, Research Hub, protected-project boundaries and mathematical visualizations remain. Two-up/Focus and advanced Studio plot families remain independent of the connected workspace. Use **Advanced plots** to transfer the current ODE project to Studio; other formats use their own import/export workflows. The six primary research pages have one canonical stylesheet rather than another layer over the specialist interfaces.

## Reproduce, not just screenshot

Download **Save a copy** for the full `foko.research/1` bundle, containing model, observations, notes, per-run snapshots, settings, numerical results and version. Imported historical results are unverified; recompute them.

```bash
# Recompute the current model using the bundled canonical engine:
node scripts/replay-research.js my-experiment.json
# Recompute a historical calculation by its zero-based index:
node scripts/replay-research.js my-experiment.json 2
```

Evidence also exports Markdown notes, per-run JSON and full-precision CSV. **Export Python** produces a restricted-AST SciPy RK45 script for the current model trajectory only, not the complete fitting/ensemble/ML workflow. This is an independent solver comparison; exact floating-point identity is not promised. A model fingerprint identifies a configuration but is not a cryptographic authenticity signature. Bundle size, run count and browser execution budgets are deliberately bounded.

## Generated browser assets

Readable modules remain the canonical source. After editing the observation, authoring or lesson/catalogue modules, run `npm run build:research-assets`. `npm test` rejects stale generated assets. The workspace loads only lesson search metadata, not the full lesson bodies or unused book chapter map. Bundling preserves all 259 model and 13 lesson search destinations without raising the existing payload budget.

## Developer validation and publication

Node 22+ and Python 3.11+ are development requirements. Use the pinned dependencies:

```bash
npm ci
python3 -m pip install -r requirements-validation.txt
npm test
npm run test:reference
npx playwright install --with-deps chromium
npm run test:e2e
npm run build:pages
npm run test:pages
```

The additional Python rendered fixtures require Python Playwright and Chromium; see `tests/research/README.md`. They explicitly simulate storage and disable Workers to test bounded fallback; they are not substitutes for native browser tests. Historical homepage-copy assertions were migrated to the new routes; numerical correctness expectations were retained, not relaxed to publish.

`.github/workflows/pages.yml` checks the source, native browser workflows and repository-subpath artifact before deployment. In GitHub select Settings → Pages → Source: GitHub Actions, and put the **contents** of this source directory at the repository root, including `.github`. The workflow listens to `main` and manual runs. No live repository or website was changed in this delivery.

## Navigation

- `index.html`: enter a scientific question, create/import, or choose a research path.
- `workspace.html`: connected model, data and experiment workflow.
- `library.html`: research pathways, complete catalogue and specialist tools.
- `learn.html`: thirteen worked scientific-modeling/AI lessons.
- `programme.html`: source-ordered career curriculum, evidence gates and research transfer.
- `identity.html`: the production logo and palette reference (not part of the main workflow).
- `trust.html`: capability classes and declared limitations.

## Attribution

Public creator: **Dr. Chilperic Armel Foko Kuate**. Existing research attribution, acknowledgements and licences are retained. Reduced teaching models must not be relabelled as fully validated published implementations. Optional older features may load external runtimes; local computation is not a claim of zero network traffic or guaranteed offline caching. No telemetry or AI provider was added to the connected workspace.

## Network and typography

The primary research interface uses native fonts. The legacy KaTeX renderer uses local JavaScript and CSS, but its mathematical typefaces are version-pinned external dependencies. No font binaries are distributed in these archives. Equation rendering on first use therefore needs network access, and those downloads were not verified in this environment. Optional SciPy/Pyodide verification also needs external runtime assets. Local computation does not imply complete first-use offline operation.
