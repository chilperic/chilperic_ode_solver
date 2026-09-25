# FokoLab 79.1 — fresh validation record

Source baseline: recoverable core-access recovery; numerical release 78.2.0. Prior v79.0 archive unavailable. All outcomes below are from this revision; older folders and early iteration failures do not certify it.

| Executed check | Outcome | Scope |
|---|---:|---|
| Complete `npm test` | Exit 0 | `validation-79.1/release-tests.log` |
| Active Python contracts | 323 passed | Included in npm pipeline |
| Book integration contracts | 17 passed | Exact edition, links, disclosure and fail-closed publication gate |
| New identity/preservation test groups | 15 passed | 20 native selector inventories; 259 catalogue records; source hashes; contrast; 54 solution links |
| Original-source rendered checks | 145/145 | 44 routes; 42 UI pages and two compatibility aliases |
| Measured viewport records | 165 | Root and visible-control overflow checked; not a complete WCAG evaluation |
| Independent numerical references | 32/32 | Fresh `reference-validation.log` |
| Focused printed-book checks | 6/6 | Reviewed CG listing with helper scaffolding; independent derivative check |
| Existing source JS unchanged | 139 | Includes 64 core/model/worker files; no numerical algorithm change |
| Original native lab selectors | 20/20 inventories unchanged | Values, names, labels and disabled states |
| Original catalogue | 259 records, identical bytes | No removal, substitution or shortened catalogue |
| Static structure and JS payload budgets | 44 authored pages passed | Existing JavaScript bytes/request allowances unchanged |

## What was intentionally updated in tests

Old literal typography, SVG geometry, stylesheet lists and edition/page-count snapshots were reconciled with the requested identity and V6.17 source. The declared CSS inventory is now 16 rather than 15 files, with two sheets on connected research pages and a maximum of seven on legacy native pages. This is an explicit presentation change. Existing JavaScript payload limits were not increased. Numerical tolerances and scientific assertions were not relaxed.

`tests/recovery/core-baseline-hashes.json` was explicitly revised only for reviewed book-facing UI files and the optional advanced-methods URL guard. The portable `tests/design/preservation.json` retains original hashes and separately names every reviewed change. A blanket assertion that every source file is unchanged would be false.

## Important fixture limitations

The fresh native HTTP attempt produced `net::ERR_BLOCKED_BY_ADMINISTRATOR`; see `native-environment.json`. No bypass was attempted. The rendered suite uses actual HTML/CSS/JS with in-memory resource fulfillment. Positive local storage is simulated. Workers are disabled; computation screenshots show the existing bounded fallback. Compatibility aliases are checked statically, not treated as successful native redirects. Source-PDF search uses the actual latest text-index bytes, but native PDF viewing was not certified.

The recorded run covers initial pages, selected interactions and responsive widths, not every method-by-example combination or biological claim. Full native E2E, persistence across reloads, screen-reader behavior, real phones and public performance remain required. No third-party user study was performed.

## Publication-gate test output

The book test intentionally approves a temporary synthetic edition in its positive case. Its printed message is not approval of the delivered PDF. The delivered approval flag remains false and is independently asserted by the new identity contract suite.
