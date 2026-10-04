# FokoLab

**Scientific modelling, analysis and visualisation — Dr. Chilperic Armel Foko Kuate**

README updated: **5 October 2026**. CV content updated: **4 October 2026**.

FokoLab is a browser-based scientific workbench connecting mechanistic models, numerical analysis, data and visualisation. The recovered modelling laboratories and animations are retained; additional analysis tools should extend them, not replace them.

[Website](https://chilperic.github.io/chilperic_ode_solver/site/) · [Laboratories](site/labs.html) · [Documentation](site/docs.html) · [CV catalog](site/cv.html)

## What this revision contains

This revision adds the six verified CV editions, explicit **With photo** and **Without photo** download choices, corrected education chronology and this README to the existing 80.1 application baseline. **It does not publish the complete 80.2 scientific-analysis application.** That application remains in the separately prepared 80.2 package; a successful document build or a deployment-branch name is not evidence that all its source files have been published.

The approved legacy baseline remains at [legacy/80.1.0-user-approved](https://github.com/chilperic/chilperic_ode_solver/tree/legacy/80.1.0-user-approved), commit `39810f18526ea7eed1b02c3a30fffaddad490b57`. Do not overwrite that branch when publishing subsequent revisions.

## Run a local checkout

From the repository root:

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open **http://127.0.0.1:8765/site/** in a browser. On Windows, use `py -m http.server 8765 --bind 127.0.0.1`. Keep the terminal open; Ctrl+C stops the server. Use another port when 8765 is occupied.

Python 3 is needed for this server. The static application itself does not require installing NumPy, SciPy, Node or npm. Exported Python analyses and developer checks have their own dependencies. Use HTTP rather than double-clicking individual HTML files, because the full application uses modules and simulation workers.

The complete 80.2 development ZIP also has its own `serve.py`, which exposes its `site/` directory directly at `http://127.0.0.1:8765/`. Follow the README belonging to the package being used; do not mix those two URL roots.

## CV downloads

| Edition | Without photo | With photo | Length |
| --- | --- | --- | --- |
| Industry CV, English | [PDF](site/cv/industry_cv.pdf) | [PDF](site/cv/industry_cv_with_photo.pdf) | 2 pages |
| Academic CV, English | [PDF](site/cv/academic_cv.pdf) | [PDF](site/cv/academic_cv_with_photo.pdf) | 3 pages |
| Industry Lebenslauf, German | [PDF](site/cv/industry_cv_german.pdf) | [PDF](site/cv/industry_cv_german_with_photo.pdf) | 2 pages |

The industry edition foregrounds multiscale modelling, scientific software, numerical methods and data analysis. Education is newest first, both master's degrees use **MSc**, and **Baccalauréat 2009** is included. The **Dr.** title and visible update date are retained. Ongoing training is not presented as a completed qualification.

The supplied portrait is not retouched or cropped. The photo and no-photo variants have the same substantive content. See [the CV README](site/cv/README.md), [editable LaTeX sources](site/cv/sources/) and [the verification manifest](site/cv/downloads.json).

## Scientific use

Start with the [laboratory selector](site/labs.html) and the documentation for the chosen model. Existing workspaces include dynamical systems, stochastic models, optimisation, fitting, sensitivity and statistical methods. Research applications include [plant physiology](site/research/photosynthesis.html), [fatty-acid metabolism](site/research/fatty-acid-metabolism.html) and [T-cell populations](site/research/tcell-proliferation.html).

Record model equations, units, parameter values, initial conditions, simulation interval, seed where applicable, method and software version with a result. A numerically converged solution is not by itself a biologically calibrated prediction. Synthetic demonstrations are not measurements. Saved timepoints are not independent experimental replicates, and a temperature-response sweep is not a physical-time trajectory.

Unresolved or infeasible samples must remain distinguishable from evaluated states. A comparison obtained by changing a parameter is a new calculation, not a silent replacement of the original failed sample. Interpret the specific model diagnostics rather than treating a generic solver message as a biological conclusion.

## Verification and contribution

The [CV build](https://github.com/chilperic/chilperic_ode_solver/actions/runs/37241009008) checked all six reviewed source hashes, compilation, text overflow, page counts, qualification labels and portrait presence or absence. [The manifest](site/cv/downloads.json) records PDF/source SHA-256 hashes. These document checks do not independently verify every biographical assertion and do not certify the numerical laboratories.

Keep numerical-reference tests, browser interaction tests, HTTP asset checks, scientific calibration and accessibility audits separate. Historical recovery reports are evidence about their recorded version, not certification of every later update. Do not advertise roadmap items as implemented capabilities.

Plant research acknowledges Jérémie Muller-Prokob and Yvonne Danisch as main collaborators, Antonio Rigueiro, Jonas Brass, Martin J. Lercher, CCB and CEPLAS. Doctoral work acknowledges Oliver Ebenhöh, Adélaïde Raguin and Barbara M. Bakker. T-cell research acknowledgments include Wilfred Ndifon and Gisèle Mophou; the project documentation preserves further thesis-based credits. Research collaboration, publication authorship, cited model families and browser implementation are different contributions and do not imply endorsement of every platform result.

## Publication and troubleshooting

The public application is under `site/`; `docs/` also carries the corresponding website material. Preserve the configured Pages source and existing paths when updating the site. Do not publish the full author/development archive wholesale: publish the intended public website files only.

A local archive, a staged commit, a successful document build and a successful Pages deployment are separate states. After publishing, verify the served version, a selection of laboratories and all six CV links. Do not replace a failed upload by merely changing a version label.

For a 404, check the publishing directory, exact path/capitalisation and `index.html`. For module/worker errors, use HTTP and inspect the browser console. For an unresolved simulation, retain its original settings and diagnostics. For a CV download failure, verify the six files under `site/cv/` and the links on `site/cv.html`.

Report reproducible problems with the page, browser, model, settings, expected and actual result, and relevant diagnostic output. Remove private data before posting to the [issue tracker](https://github.com/chilperic/chilperic_ode_solver/issues).

## Licence and citation

See [site/LICENSE](site/LICENSE) for the included software licence and [site/CITATION.cff](site/CITATION.cff) for citation metadata. Preserve third-party notices and cite the applicable scientific models and the actual version used. Do not infer permission to reuse personal CV or portrait material from a software licence.
