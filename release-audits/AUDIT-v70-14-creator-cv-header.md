# AUDIT v70.14 — Creator profile, CVs and header logic

## Problem addressed

The previous header still treated the Research Hub like another product route. That was conceptually wrong: Research Hub is not a modeling tool, a data-analysis tool, or a tutorial. It belongs under the creator/profile layer together with CVs, contact, acknowledgements and the external personal website.

## Source used

The uploaded `chilperic_website_cv_old_odelab_link(1).zip` was inspected for profile and CV material. Relevant extracted material included:

- Academic CV PDF and LaTeX source.
- Scientific Developer / Industry CV PDF and LaTeX source.
- German industry CV PDF.
- Profile text describing the creator as an academic researcher, scientific developer and computational tool developer.
- Research themes: mechanistic modeling, systems biology, hepatic metabolism, photosynthesis/plant adaptation, quantitative immunology and T-cell dynamics.
- Technical stack: Python, Julia, R, MATLAB, JavaScript, CasADi, IPOPT, CMA-ES, JuMP, Pyomo, SciPy, NumPy, CVODE, SUNDIALS, lmfit, Plotly and Bokeh.
- Languages and profile details: French native, English fluent, German B1+.

## Header correction

The public header is now:

Home | Modeling | SciML | Data / Analysis | Explore | Learn | Creator

### Modeling
Workbench and model-building laboratories.

### SciML
Scientific machine learning and ML diagnostics.

### Data / Analysis
Statistics, curve fitting, linear algebra and networks.

### Explore
Model Atlas and Mathematical Beauty.

### Learn
Documentation and tutorials.

### Creator
CVs and profile, Research Hub, external personal website, contact and acknowledgement.

## New page

`cv.html` was added as a platform-native page with:

- Creator profile summary.
- Download cards for academic, scientific-developer/industry and German industry CVs.
- Research areas and methods.
- Scientific computing stack.
- Education.
- Languages and awards.
- Experience distilled for Foko Lab.

## Files copied from uploaded portfolio package

- `assets/cv/academic_cv.pdf`
- `assets/cv/industry_cv.pdf`
- `assets/cv/industry_cv_german.pdf`
- `assets/cv/academic_cv.tex`
- `assets/cv/industry_cv.tex`

## Tests added

- `tests/test_v70_14_creator_cv_nav.py`

The older v70.13 navigation contract was also updated because the new user-facing requirement adds a Creator grouping and moves Research Hub out of Explore.

## Validation

- `python3 -m pytest -q tests` → 255 passed, 271 skipped
- `node tests/test_v70_9_numeric_cores_node.js` → ok
- `node tests/test_v70_11_numeric_cores_node.js` → ok
- `node --check src/*.js src/stochastic/*.js` → passed

## Remaining architectural weakness

The header is still static HTML repeated across pages, although the visible structure is now coherent. The durable next step remains a generated or injected shared header source with one route registry.
