# FokoLab v78.2.0 — model and measurement workflow

Release candidate. No live repository or site has been changed. This release implements the structured model/data, scenario and programme-evidence portion of the approved improvement plan. Independent real-user evaluation and original-research transfer are still separate work, not implied by an improved interface.

## Implemented

- One canonical model with a transactional structured editor: state meanings, symbols, units, equations and initials; parameter values/ranges/provenance; explicit measurement operators; numerical settings and scope. Native MathML previews, field-level errors, a reviewed before/after difference, optional expert JSON, undo and redo.
- Explicit `foko.observations/2` data contract: condition/replicate/observable/time identities, preserved repeated measurements, exact unit labels, all-known or all-unspecified sigma, constant condition inputs, retained metadata, located errors, explicit missing-value exclusion with source rows, and a mandatory preview/confirmation step.
- Bounded joint measurement-space fitting across conditions and observables. Fixed-sigma weighted objective, three starts with stopping reasons, training-only regression/normalization, explicit complete-time/condition/condition-replicate holdouts, per-observable metrics and residuals. Different-unit observations require noise scaling; meaningless combined raw RMSE is not reported.
- Persistent task action, named input scenarios, exact field differences, baseline computation that cannot be published as a current-input result, and atomic import/recovery behavior.
- Actual calculation attachments to Verify, Infer, Compare and Release. Snapshots, data, settings, results and interpretation travel together. Imported evidence remains unverified; a calculation is not a qualification or a passed scientific gate.
- Separate eight-color scientific palettes, redundant line/marker styles, known-SD bars, readable ticks and substantive graph descriptions. Numerical work counters and general assumptions are disclosed on demand; relevant detected warnings remain visible. Narrow-screen completed results now use bounded grid tracks rather than overflowing off the phone.
- A complete synthetic fluorescence case with 52 measurements, known calibration, two initial-state conditions, independent measurement-noise replicates, generation code, worked lesson and independent SciPy/NumPy reproduction. This adapts the book's observation-model reasoning; it does not reproduce an empirical thesis dataset.
- Deterministic generated browser entry assets. Workspace search retains 259 model destinations and 13 lessons without downloading all lesson bodies or the unused book map. Existing payload budgets were not increased.

## Preserved

All twenty specialist workspaces, 259 catalog entries, 21 Studio starting models, advanced plot families, protected-model restrictions, thirteen worked browser lessons and the supplied book's 27-chapter/seven-part programme map remain. The previous identity/logo is stabilized rather than replaced again. The private PDF is not bundled.

## Not claimed

No full PEtab implementation, correlated-error/random-effects inference, event/pre-equilibration protocol, fitted noise distribution, Bayesian posterior, confidence interval, global-optimum certificate, neural ODE, deployed LLM assistant or fully rebuilt specialist GUI is added. Explicit observation operators currently apply to joint fitting; the other connected numerical investigations still use the selected state output.

Native HTTP navigation was blocked by the release-building environment. Pinned npm browser installation failed on DNS. Original-source rendered Chromium fixtures are not native-worker, physical-device, screen-reader, live-hosting or external-usability certification. See VALIDATION.md for the exact executed checks and LIMITATIONS-v78.2.0.md for scientific boundaries. A practical external-user protocol is supplied in research/PUBLIC_USABILITY_PROTOCOL.md and is explicitly marked unexecuted.

## Start

From the extracted source directory:

```bash
python3 scripts/serve-fresh.py
```

Open the printed address, then `workspace.html?case=fluorescence` for the complete new investigation. Visitors to the hosted static site do not need to install Python or Node. Source development uses the included requirements and npm lockfile; the Pages workflow gates deployment on tests against the actual static artifact.
