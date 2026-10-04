# CV editions — Dr. Chilperic Armel Foko Kuate

**CV content updated: 4 October 2026. README updated: 5 October 2026.**

Six ready-to-use PDFs are included. No software installation is required to read or send them.

| Edition | Without photo | With photo | Length |
| --- | --- | --- | --- |
| Industry CV, English | [PDF](industry_cv.pdf) | [PDF](industry_cv_with_photo.pdf) | 2 pages |
| Academic CV, English | [PDF](academic_cv.pdf) | [PDF](academic_cv_with_photo.pdf) | 3 pages |
| Industry Lebenslauf, German | [PDF](industry_cv_german.pdf) | [PDF](industry_cv_german_with_photo.pdf) | 2 pages |

The industry edition foregrounds multiscale modelling, scientific software, numerical methods and data analysis. The academic edition includes a fuller research, publication and teaching record. Each photo/no-photo pair has the same substantive content.

## Content and portrait

The CVs include the research appointment resumed at CCB on 1 October 2026. Education is newest first, both master's degrees use **MSc**, and **Baccalauréat 2009** is included. The **Dr.** title and visible last-update date are retained. AI/ML and German-language training are described as ongoing, not completed qualifications.

The existing supplied portrait is included without retouching or cropping. WebP-to-PNG conversion is lossless and PDF placement preserves its proportions. `sources/profile_photo.png` is provided for compiling the photo editions.

## Editable sources

Each PDF has a matching `.tex` file in [sources/](sources/). Rebuilding requires XeLaTeX, the locally installed Lato font and the packages named in the source preamble. Font files are not distributed in the bundle.

```bash
cd sources
xelatex -interaction=nonstopmode -halt-on-error industry_cv_with_photo.tex
xelatex -interaction=nonstopmode -halt-on-error industry_cv_with_photo.tex
```

Substitute the matching source filename for another edition. Build from the `sources` directory so that the portrait path resolves.

## Verification

[downloads.json](downloads.json) records SHA-256 hashes for all six PDFs and sources, page counts and the portrait provenance. The [CV build workflow](https://github.com/chilperic/chilperic_ode_solver/actions/runs/37241009008) checked expected source hashes, compilation success, text overflow, page counts, required qualification labels and portrait presence/absence. Document checks do not independently verify every biographical assertion.

[Return to the website CV catalog](../cv.html). A CV/documentation publication is separate from deployment or scientific certification of the complete FokoLab 80.2 application.
