# Validation — FokoLab v78.2.0 release candidate

## Executed against this revision

The following records were produced from the v78.2.0 source in this package. Historical release notes and validation logs do not certify this revision. Counts below refer to assertions, comparisons or rendered checks, not unique scientific phenomena and not coverage percentages.

| Gate | Recorded result | Evidence |
|---|---:|---|
| Full bundled `npm test` | Exit 0; includes 323 active Python contracts | `validation-v78.2.0/npm-test.log` |
| Structured model/data/fit contracts | 65/65 | `validation-v78.2.0/structured-contracts.json` |
| Retained connected-workflow numerical/input contracts | 61/61 | `validation-v78.2.0/research-engine.json` |
| Source-curriculum mapping | 8/8 | Full npm log |
| Original-source structured rendered workflow | 64/64 | `validation-v78.2.0/structured-browser.json` |
| Original-source existing rendered workflow | 46/46 | `validation-v78.2.0/browser-contracts.json` |
| Original-source identity/programme rendering | 43/43 | `validation-v78.2.0/identity-programme-checks.json` |
| Independent numerical algorithm comparisons | 32/32 | `REFERENCE_VALIDATION.json` |
| Independent synthetic measurement reference comparisons | 4/4 | `validation-v78.2.0/independent-measurement.json` |
| Existing export/replay checks | 6/6 (including four independent SciPy state-trajectory comparisons) | `validation-v78.2.0/export-contracts.json` |
| Browser-downloaded structured-fit/programme replays | 3/3, same-engine scientific-field equality | `validation-v78.2.0/measurement-replay.json` |
| Example-catalogue integrity | 2,351/2,351 assertions, 259 entries | Full npm log |
| Static authored-page structure and payload | 41 pages; unchanged payload budget | `validation-v78.2.0/static-quality.log` |

The assembled artifact's final page, file and local-reference counts are recorded in `dist/pages/PAGES_MANIFEST.json` (and the delivered Pages ZIP). Static checks do not prove dynamic worker routes or browser execution.

## What the new tests demonstrate

The executed checks include CSV column mapping and metadata preservation; explicit missing-row exclusion with source records; duplicate-time replicates; known-sigma validation; unit and time-unit rejection; condition-specific initial/parameter overrides; exact observation output times; prototype-safe condition names; field-linked equation errors; draft review and atomic apply; immutable scenarios and undo/redo; three-start joint fitting; two observable units; training-only fitting/transformation/time-grid use; whole-condition and condition/replicate holdouts; imported-result status; cancellation; programme attachments; and actual browser-generated downloads replayed with the Node core.

The 52-row fluorescence case has two conditions, two measurement-noise replicates per condition, and 13 time points. The chronological split retains 36 training and 16 held-out observations. The independent SciPy optimum is k=0.3478067518888018; the bounded browser algorithm returned k=0.34794921874999996. Their absolute difference is 0.0001424668611981761, within the declared 0.0002 comparison tolerance. Analytic observation agreement is below 1e-10; independent regression coefficient agreement is below 3e-15 in this case. These are numerical verification results on synthetic data, not parameter confidence intervals or biological validation.

A completed-fit mobile reflow failure was found and repaired. Before-repair measurements/screenshots are explicitly named `mobile-overflow-before.*`; only the numbered final screenshots are release previews. The final rendered suite checks 320, 390, 768 and 1440 CSS-pixel widths in light, dark and contrast appearances. Graph tables may have their own labelled horizontal scroll region; ordinary paragraphs and the result layout reflow.

## Browser and environment boundary

**Native HTTP browser E2E was not run successfully here.** Normal navigation to the local server returned `ERR_BLOCKED_BY_ADMINISTRATOR`. The pinned npm dependency installation encountered DNS `EAI_AGAIN` and was terminated after timeout. See `validation-v78.2.0/browser-environment.json`, `npm-ci.log` and `npm-ci.exit`.

The rendered tests use original-source in-memory fixtures, simulated storage except fault-injection cases, and an explicitly declared bounded computation fallback with Worker unavailable. Available Python Playwright was 1.57.0 and Chromium was 144; these are not the npm-pinned Playwright 1.61.1 browser build. Runtime package versions are recorded in `validation-v78.2.0/runtime-environment.json`.

Therefore these results do **not** certify native worker loading, real browser persistence, full native E2E, screen-reader usability, physical phones, the PDF viewer or live GitHub Pages. No independent user study was conducted. Its protocol is supplied in `research/PUBLIC_USABILITY_PROTOCOL.md`. No live repository or website was changed.

## Release gates still required

Run `npm ci`, install the pinned Chromium browser, execute `npm run test:e2e`, build with `npm run build:pages`, then execute `npm run test:pages`. The included GitHub workflow deploys the tested artifact only after required gates pass. Manual keyboard/screen-reader work and observation of unfamiliar users remain distinct requirements. Automated structure/geometry checks are not a WCAG conformance certificate.

Workspace raw JavaScript is 952,109 bytes across 15 script references; the page-specific allowance counts 946,735 bytes after the existing shared-core deduction, below the unchanged 950,000-byte budget. Estimated gzip size is 268,406 bytes. This is an inventory, not measured network transfer, LCP, INP, battery or memory behavior. Readable canonical modules and their committed generated assets are checked for byte consistency by `npm test`.

## Reproduction

See `tests/research/README.md` for the exact pure, independent-reference, rendered and export commands. Full `npm test` needs the listed Python validation dependencies; browser fixtures additionally need Python Playwright and Chromium. Keep the three evidence classes separate: numerical/reference execution, rendered fixture execution, and native deployment execution.

See `LIMITATIONS-v78.2.0.md` for bounds on conditions, noise, fitting, holdouts, measurement-space versus state-space analysis, original research transfer and AI claims.
