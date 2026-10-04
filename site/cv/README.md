# CV editions — Dr. Chilperic Armel Foko Kuate

**CV content updated: 4 October 2026. README updated: 5 October 2026.**

| Edition | Without photo | With photo | Length |
| --- | --- | --- | --- |
| Industry CV, English | [PDF](industry_cv.pdf) | [PDF](industry_cv_with_photo.pdf) | 2 pages |
| Academic CV, English | [PDF](academic_cv.pdf) | [PDF](academic_cv_with_photo.pdf) | 3 pages |
| Industry Lebenslauf, German | [PDF](industry_cv_german.pdf) | [PDF](industry_cv_german_with_photo.pdf) | 2 pages |

These PDFs are ready to read or send; no document-building software is required. Each photo/no-photo pair has the same substantive content. The industry edition foregrounds modelling, scientific software and data analysis; the academic edition includes a fuller research and publication record.

The existing supplied portrait is included without retouching or cropping. Its PNG conversion is lossless and its proportions are retained in the PDF. Education is reverse chronological; both master's degrees are labelled MSc; Baccalauréat 2009 is included. The Dr. title, resumed CCB appointment and visible update date are retained. Ongoing training is not described as a completed qualification.

## Editable sources

Matching `.tex` files and `profile_photo.png` are in [sources/](sources/). To rebuild, use XeLaTeX with the Lato font and packages named in the source installed locally. Font binaries are not distributed.

```bash
cd sources
xelatex -interaction=nonstopmode -halt-on-error industry_cv_with_photo.tex
xelatex -interaction=nonstopmode -halt-on-error industry_cv_with_photo.tex
```

Substitute the matching source filename for another edition. Compile from this directory so that the portrait path resolves.

## Verification

[downloads.json](downloads.json) records all six filenames, PDF and source SHA-256 hashes, portrait provenance and page counts. The CV build checked source integrity, compilation, expected page counts, qualification labels, text overflow and presence/absence of the photograph. These document checks do not independently verify every biographical claim.

The platform update preserves these verified PDFs and sources byte-for-byte. The website catalog is [../cv.html](../cv.html). Updating a CV or a README is not, by itself, evidence that the complete scientific application was deployed.
