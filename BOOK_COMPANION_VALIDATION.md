# FokoLab book companion preview — validation and scope

Checked 20 September 2026. Base application: **v78.2.0**.
Companion identifier: **78.2.1-book-preview**, not a new scientific-engine release.

## What changed

The full, unchanged **Scientific Modelling, AI & Research Software Engineering,
V6.16**, by Chilperic Armel Foko Kuate, is now bundled as material. Visitors do not
need an account or their own copy to open/download the PDF. The reader provides the
original seven parts, 27 chapters, four appendices, source-page links, on-demand
text search over all 366 pages, and selected-page bookmarks. Chapter links connect
to existing lessons/experiments where the relationship is declared.

`book-observations.html` provides one checked source excerpt (section 1.5 and its
fluorescence example) in reflowable HTML with native MathML. Companion activities
are separately labelled. This is not a full HTML conversion or the original
notebook archive. Search snippets locate text; they are not trustworthy substitutes
for the typeset equations. The original PDF is 30,498,662 bytes and is not fetched
until opened, downloaded, or explicitly embedded. The text index is fetched on
first search.

Two visible errata identify Figure 4.1's derivative error and the printed conjugate-
gradient listing's initial-zero-residual failure. The PDF itself is **unchanged**.
See the exact source pages and `validation-book-preview/book-example-checks.json`.

## Fresh checks in this preview

| Check | Outcome | Scope |
|---|---|---|
| `npm test` | Exit 0, including 323 active Python contracts, 61 connected research assertions and 65 structured experiment contracts | Existing configured repository suite; not native E2E |
| `npm run test:book` | 17/17 passed | Source identity, chapter/index bounds, no-JS links, excerpt structure, edition-bound publication gate and existing lesson targets |
| `python tests/research/book_browser.py` | 49/49 passed | Original-source Chromium fixtures; positive storage simulated; real text-index bytes fulfilled through a test route |
| `python scripts/check-book-examples.py` | Reproduced the documented CG failure and nonzero control; checked derivative against central difference | Two known source issues only; not full book verification |
| `python scripts/build-pages.py` | See latest `validation-book-preview/pages-build.log` and generated `PAGES_MANIFEST.json` | Static artifact and local-reference checks |

The publication-gate test approves a **temporary test edition only** for its positive
case. The delivered `publication/book-approval.json` remains unapproved.

New native-browser Playwright tests are supplied in `tests/e2e/book-materials.spec.js`,
but were **not run** here. A current native HTTP navigation attempt failed with
`net::ERR_BLOCKED_BY_ADMINISTRATOR`. The bounded rendered fixtures do not certify
native workers, native PDF rendering, true persistent storage, screen readers,
physical devices, or live GitHub Pages. The inline-PDF check verifies frame creation
and source routing only. Reflow was measured at 320, 390, 768, 1024 and 1440 CSS px;
this is not complete accessibility conformance. The original PDF does not have a
verified accessible tagging structure.

Historical validation folders are retained as historical records. They do not
certify this companion. Initial failing preview logs remain separate from the final
passing records: old fixed page inventories needed updating for the two new authored
pages. No scientific solver tolerance or numerical algorithm was relaxed.

## Public distribution is a separate author decision

The complete author PDF includes personal planning front matter on physical pages
6–9. Read `PUBLICATION_REVIEW.md` before placing this tree or its full-text index in
a public repository. The included Pages workflow refuses upload until an explicit
approval identifies this exact PDF hash. **This gate does not protect a public source
repository, and manual deployment of the static ZIP bypasses it.** No online site or
repository was changed. No new licence is assigned to the book or its figures.

## Reproduce locally

```bash
python3 scripts/serve-fresh.py
# Open /book.html on the address printed by the server.
npm test
npm run test:book
python3 tests/research/book_browser.py  # needs Playwright and /usr/bin/chromium
python3 scripts/check-book-examples.py # needs NumPy and pdftotext
python3 scripts/build-pages.py
```

The source PDF fingerprint and chapter mapping are in `materials/book-manifest.json`.
A different teaching edition requires a regenerated index, outline, citation/page
mapping and fingerprint; deleting pages without updating those links is not a valid
publication process.
