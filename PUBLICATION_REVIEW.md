# Book-enabled local preview — author publication review required

This package adds the **complete, unmodified Scientific_Mastery_V6_16.pdf** to
FokoLab 78.2.0 as a book companion preview. It is not an approved public release.
The book is no longer merely a link to a file that each visitor must possess.

## Review before public upload

The original PDF's physical pages **6–9** include personal appointment, time-budget,
career and companion-course planning. The complete scientific text also refers to
research transfers and collaborators. No content was silently removed or rewritten.
Decide whether to publish this author edition or supply a separate teaching edition.

**A Pages workflow gate does not protect a public Git repository.** Do not push
this source tree, its book, or its full-text index to a public repository until that
review is complete. Neither `robots.txt` nor an unlinked URL is access control.
This package does not modify an online repository or site.

If publishing this exact edition, edit `publication/book-approval.json`:
`approvedForPublicDistribution` must be `true`, and `approvedSha256` must equal
the source fingerprint in `materials/book-manifest.json`. That explicitly unlocks
the included workflow's book-upload gate. Do not merely remove the gate.

If preparing a different teaching edition, regenerate/check the full text index,
chapter page mapping, cover, fingerprint and source citations. Original physical
page numbers cannot simply be copied into an edition with pages removed.

## Attribution and permissions

No new licence is assigned to the book, its illustrations, or code excerpts.
FokoLab's software licence does not automatically license these materials. The
author should select appropriate distribution terms and check third-party material
before public release. The PDF is retained byte-for-byte, not re-authored here.

## Scope

Included: full PDF, chapter directory, 366-page text-search locator, selected-page
bookmarking, links to related existing lessons/experiments, and one checked HTML
excerpt of section 1.5 with native MathML.

Not included: the original book's complete notebook/source archive; a full HTML
conversion; automated assessment of competence; an LLM assistant; a new numerical
method. The browser's native PDF display is not certified as fully accessible.

## Local use

Run `python3 scripts/serve-fresh.py`, then open `/book.html` on the printed local
address. The complete PDF opens without JavaScript; source-text search requires an
HTTP origin. Reading links use the PDF viewer's `#page=` support, which varies across
browsers. A direct open/download action remains available at all times.

The PDF (30,498,662 bytes) is **not fetched on the landing page**. It loads only
when a reader opens/downloads the book or expands the embedded viewer. The index is
loaded only on the first text search. Bookmarks store the selected page, not the
native viewer's private scroll position. No reading completion is inferred.

## Known scientific/source issues

The reader exposes errata for Figure 4.1 (incorrect derivative in its final takeaway)
and the printed conjugate-gradient listing (missing initial-zero-residual test).
Both were checked against the supplied file. See `validation-book-preview/book-example-checks.json`.
Publishing a draft with visible errata is different from publishing a corrected
scientific edition. Correct the author source and rebuild/verify a new edition before
claiming those defects are fixed in the PDF.
