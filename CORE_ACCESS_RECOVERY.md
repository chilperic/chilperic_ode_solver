# FokoLab core-access recovery

UI patch `core-access-1`, based on numerical application v78.2.0 and the
78.2.1 book-companion preview. This is a recovery candidate, not a new solver
release, a rollback of scientific fixes, or a live deployment.

## What went wrong

The redesign changed the product hierarchy. The home page prioritized four guided
research pathways and the connected workflow. Library defaulted to those four paths,
not the complete catalogue. The original Model Studio, labs and Atlas became
secondary destinations. File presence was incorrectly used as a substitute for
preserving the user's working interface.

A separate runtime defect reinforced this: `src/v76/app-shell.js` appended the
Studio catalogue to the end of the controls panel. Moving its HTML alone did not
fix where users found their example selector. The shared script now keeps it after
the project-identity block and before model equations.

Comparison with the original uploaded archive found no missing JavaScript or HTML
among 241 original paths. The catalogue still contains the original 259 records;
all static selector options across 20 native lab pages are preserved. That does
not negate the usability regression: a capability buried behind an unrelated
workflow is not adequately preserved for a user.

## Restored access without crowded pages

- Home starts with the original Model Studio, import, four direct core-lab routes,
  the full Model Atlas and a link to all labs. Guided workflows are an optional,
  initially closed section. The book is supplementary material.
- A Labs & methods directory exposes all 20 native workspaces. Search and area
  filters act on the entire collection; the page shows at most eight short entries.
  Actual selector method labels are searchable, including their qualifications.
- The original Model Atlas is primary navigation. It searches all 259 examples,
  shows twelve per page by default, and retains original deep links and execution
  scope. Preview illustrations and provenance expand on demand; Gallery remains
  an explicit alternative, not a different catalogue.
- The existing Library URL also defaults to the full catalogue. Guided pathways
  and tool collections remain selectable. No previous route is repurposed into
  a book-only page.
- Model Studio exposes its 21-example selector near the top and leaves the solver
  selector outside the closed advanced-tolerance disclosure. Search/filter,
  example cards, long model descriptions and scientific questions can expand.
- The 15 registered Studio plot families remain. Twelve trajectory-compatible
  choices are available after a trajectory; response-surface choices still require
  a sweep. Two-up and Focus remain independent of plot selection.
- Shared native-lab navigation leads directly to Studio, Atlas, simulation labs
  and analysis labs. Mobile menus use grouped disclosures rather than stacked
  competing navigation bars. The Atlas action says Open Studio, not a misleading
  Run button on a non-computational page.

This patch does not completely redesign every control inside every native lab.
There is no assertion of ideal density on every device. The aim is a usable
hierarchy with fewer simultaneously displayed items, not fewer capabilities.

## What did not change

The original catalogue content and native selectors are preserved. 142 existing
JavaScript files outside the three intentionally changed UI components remain
byte-identical to the book-preview baseline, including the numerical cores,
workers, research engines, models and lab controllers. The exception UI files are
`src/research/shell.js`, `src/v76/app-shell.js` and `src/v72/example-atlas.js`.
Two directory-only presentation scripts were added. They do not implement methods.

The structured model/data workflow, fitting, programme attachments, lessons,
advanced Studio, native labs, original illustrations and full book remain.
No algorithm, numerical tolerance, scientific model or observation contract was
changed for this repair. Previously fixed numerical defects were not reintroduced
by reverting to the old application.

## Fresh validation

| Check | Outcome | Meaning |
|---|---|---|
| Full bundled `npm test` | Exit 0, including 323 active Python contracts | Configured repository suite; not full native browser execution |
| `npm run test:core-access` | 166/166 | Snapshot preservation and entry-point regression guards |
| `python tests/recovery/check-core-access.py` | 73/73 | Original-source in-memory Chromium fixtures |
| `npm run test:book` | 17/17 | Existing book identity/integration/publication-boundary contracts |
| Original JS/HTML availability | 241/241 paths present | File availability only |
| Native lab selector comparison | All 20 unchanged | Values, labels and disabled attributes retained |
| Catalogue comparison | 259/259 identical to original | Content and deep-link identity |
| Protected existing JavaScript | 142/142 byte-identical to preview | No silent scientific-code replacement |
| Static accessibility/payload check | 44 authored pages passed | Static structure and unchanged payload budgets; not WCAG certification |

The rendered recovery suite traversed every Atlas page and reconstructed the
complete sequence of 259 titles/destinations. It paged through all 20 lab links,
searched method names and FADNS examples, verified filter/reset/no-result behavior,
loaded and computed the original Lorenz Studio model using the declared bounded
fallback, and tested Two-up/Focus independently of plot changes. It checked root
reflow at 320, 390, 768, 1024 and 1440 CSS pixels for Home, Labs, Atlas, Studio and
ODE. Root-width checks alone do not prove all text, graphics or controls are usable.

Old UI assertions were updated where they required the four-path-first home,
24 large Atlas cards, or a fixed page/shell inventory. Scientific acceptance
criteria were not loosened. An initial payload failure was repaired by loading
lab-directory logic only on the directory, not by increasing the workspace's
950,000-byte budget. The current workspace falls within that existing budget.
The numerical suite writes generated JSON to its older versioned output paths;
fresh copies are retained under `validation-core-recovery/suite-generated`, while
the original historical files were restored unchanged. Early failing iteration
logs are retained and named as failures; they do not
supersede the final logs. Historical validation folders refer to earlier releases.

## Unexecuted and environment-limited checks

An actual HTTP navigation attempt returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`.
No attempt was made to bypass that restriction. Native HTTP Playwright tests are
supplied, including `tests/e2e/core-access-recovery.spec.js`, but were not run here.
They remain required before public certification.

Rendered tests and screenshots load the actual source in bounded Chromium fixtures.
Positive storage is simulated; unavailable workers cause the explicitly documented
inline fallback. Local illustration bytes are fulfilled from this source tree;
external resource requests are blocked. A screenshot of “Saved in this browser”
is not a real persistence test. The computed Lorenz screenshot is an actual
fallback calculation, not an invented curve.

Native workers, real browser storage across reloads, native PDF rendering,
screen readers, physical devices and live GitHub Pages remain unverified. No
biological validation is claimed for any model by this interface repair.

## Book and publication

The complete V6.16 book remains unchanged and accessible through Book & learning.
It is not the application's home or a prerequisite for using the scientific labs.
Its author-edition personal planning pages remain, as does the unapproved
`publication/book-approval.json` gate. Read `PUBLICATION_REVIEW.md` before public
upload. Publishing a public source repository or manually deploying the static ZIP
would bypass that workflow gate. No live repository or website was changed.

## Run locally

```bash
cd fokolab-core-access-recovery
python3 scripts/serve-fresh.py
```

Open the printed address at its root. Home exposes Model Studio, Labs & methods,
Model Atlas and the book. The directory and Atlas do not require an account.
Keep browser-storage exports backed up before replacing an existing installation.

## Re-run checks

```bash
npm test
npm run test:book
python3 tests/recovery/check-core-access.py
python3 scripts/build-pages.py
# In an environment permitting native HTTP browser navigation:
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
npm run test:e2e
npm run test:pages
```

The recovery-only source-identity manifest prevents accidental replacement during
this repair. A future intentional scientific change requires explicit review and
an updated manifest; this snapshot is not a prohibition on future development.
