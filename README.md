# FokoLab

**Scientific modelling, analysis and visualisation**  
Developed by **Dr. Chilperic Armel Foko Kuate**. Release **80.2.0**. Last updated **5 October 2026**.

[Open FokoLab](https://chilperic.github.io/chilperic_ode_solver/) · [Analysis studio](site/analysis-studio.html) · [Laboratories](site/labs.html) · [CV editions](site/cv.html) · [Scientific contributions](site/contributors.html)

FokoLab connects mechanistic modelling, numerical methods, statistical investigation and explanatory visualisation in a browser. The original numerical and biological laboratories are retained; the analysis studio is an addition, not a replacement.

## Run locally

From the repository root:

```bash
python3 -m http.server 8765 --bind 127.0.0.1 --directory site
```

Open **http://127.0.0.1:8765/** in a browser. The analysis studio is at `/analysis-studio.html`. On Windows, replace `python3` with `py`. Keep the terminal open; Ctrl+C stops the server. Change `8765` to an unused port when necessary.

Python 3 is needed only for this local server. Running the browser application does not require installing NumPy, SciPy or Node. Those are needed for the corresponding exported Python scripts or developer tests. Use HTTP rather than opening individual HTML pages with `file://`, because the application uses modules and workers.

## Modelling and analysis

The retained workspaces include dynamical systems, stochastic processes, steady states, optimisation, sensitivity, fitting, symbolic methods and scientific computing. Plant physiology and adaptation, fatty-acid metabolism and T-cell populations remain accessible through the laboratory selectors.

The analysis studio contains **17 workflows and 30 plot views**, organised by the scientific question and compatible sampling design. It includes descriptive summaries, one- and two-group inference, matched pairs, unequal-variance multiple-group comparisons, rank comparisons, resampling, association, regression diagnostics, categorical outcomes, survival, time-series diagnostics, independent-run summaries and prospective design calculations.

Figures share the computed result but have independent view selectors. Recorded-observation, resampling and residual-geometry playback change the presentation, not the calculation. Supported exports include CSV, analysis JSON, SVG, PNG, self-contained interactive figure HTML and independent Python reproduction.

## CV downloads

CV content was updated **4 October 2026**. Each edition has a separate photo and no-photo PDF.

| Edition | Without photo | With photo |
| --- | --- | --- |
| Industry CV — English, 2 pages | [PDF](site/cv/industry_cv.pdf) | [PDF](site/cv/industry_cv_with_photo.pdf) |
| Academic CV — English, 3 pages | [PDF](site/cv/academic_cv.pdf) | [PDF](site/cv/academic_cv_with_photo.pdf) |
| Industry Lebenslauf — German, 2 pages | [PDF](site/cv/industry_cv_german.pdf) | [PDF](site/cv/industry_cv_german_with_photo.pdf) |

The supplied portrait is not retouched or cropped. Education is newest first, both master's degrees use **MSc**, and **Baccalauréat 2009** is included. See the [CV README](site/cv/README.md), [editable sources](site/cv/sources/) and [verified download manifest](site/cv/downloads.json).

## Scientific boundaries

Record model assumptions, units, parameters, initial conditions, simulation interval, sampling design and independent observational unit. Saved timepoints, cells within one culture and technical replicates are not automatically independent experiments. A parameter-response sweep is not physical time. Synthetic examples are not biological measurements or calibration evidence.

Missing or infeasible states remain distinguishable from evaluated states. A changed-conductance comparison is a separate calculation, not a replacement for a rejected leaf sample. Numerical non-convergence does not establish physical nonexistence. The leaf diagnostic separates a converged thermal candidate that violates hydraulic supply from a solver failure.

HC3 covariance is not cluster-robust inference. Moving-block bootstrap requires an explicitly stochastic, plausibly stationary series. A non-significant p-value is not proof of equivalence. Review each workflow's assumptions and missing-data policy before inference. General mixed-effects models, Cox regression and a cinematic redesign of every biological scene are not claimed as additions in this release.

## Verification and preservation

[Deployment source manifest](site/deployment-source-manifest.json) records the authored-source hashes, baseline and preserved CVs. [Release acceptance report](site/deployment-verification.json) records the numerical, Python-export, real module-worker, mobile-emulation, selected-route and download checks. These checks are not biological validation, full WCAG conformance or testing on every physical device.

The dated [pre-publication report](site/analysis-studio-verification.json) remains a historical record with its original scope; it must not be presented as a fresh hosted-website test. A source commit, a passed acceptance job and a completed Pages deployment are separate states. Use the workflow results and actual served version to establish publication.

The approved baseline is preserved on [legacy/80.1.0-user-approved](https://github.com/chilperic/chilperic_ode_solver/tree/legacy/80.1.0-user-approved), commit `39810f18526ea7eed1b02c3a30fffaddad490b57`.

For developer acceptance checks after assembly:

```bash
node deployment/802/smoke.mjs
python3 deployment/802/verify.py
```

The release workflow records dependency versions and installs Chromium. `--native-only` runs the Python numerical comparisons without browser checks. The guarded assembly script is a one-time migration from its specified baseline; it deliberately refuses an already modified baseline rather than overwriting newer work.

## Repository layout

`site/` is the public application. `docs/` mirrors its publication files for the retained hosting layout. `deployment/802/` contains the guarded source assembly and acceptance scripts. `site/cv/` contains six PDFs, editable LaTeX and the download manifest. Do not publish private author/recovery archives as website content.

## Attribution and citation

[Contributor records](site/contributors.json) distinguish research collaboration, supervision, institutions, publication authorship, cited model lineage and browser implementation. The plant work acknowledges Jérémie Muller-Prokob, Yvonne Danisch, Antonio Rigueiro, Jonas Brass, Martin J. Lercher, CCB and CEPLAS. Doctoral work acknowledges Oliver Ebenhöh, Adélaïde Raguin and Barbara M. Bakker. T-cell records preserve the thesis-based acknowledgments, including Wilfred Ndifon and Gisèle Mophou. No credit implies endorsement of every browser result.

Use [CITATION.cff](site/CITATION.cff), the relevant model references and the actual software version when citing work. Software licence: [MIT](site/LICENSE). Preserve third-party notices; do not infer permission to reuse personal CV or portrait material from a software licence.

For a reproducible issue, provide the laboratory URL, browser, model, configuration, expected and actual outcome, and diagnostic or console output. Remove private data before opening a public issue.
