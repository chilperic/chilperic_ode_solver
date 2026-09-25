# FokoLab 79.2.0 — Integrated Update

This is the actual runnable application and editable source. It extends the supplied **79.1 Pages application**, rather than replacing its scientific tools with Reconstruction 1.0.0. It is not a recovered build of the inaccessible newer hosted website. That hosted website has not been modified.

## Start the application

Extract the entire ZIP first. Do not run it from inside the ZIP viewer.

On Linux or macOS, open a terminal in this extracted folder and run:

```bash
python3 serve.py
```

On Windows, double-click `START-FOKOLAB.bat`, or run:

```powershell
py -3 serve.py
```

The server opens `http://127.0.0.1:8765/`. Only the `site/` folder is served. Keep the terminal open while using FokoLab. Stop it with Ctrl+C. When that port is occupied, run `python3 serve.py --port 8766`. `START-FOKOLAB.sh` and `START-FOKOLAB.command` provide equivalent launchers.

**No Node, npm, source editor, account, or internet connection is required for browser calculations.** Python 3 is used only as a local static-file server. Opening `site/index.html` directly with `file://` is not the supported launch path: browser module and worker restrictions may prevent calculations. External research-reference links naturally need internet access.

After starting, open **Release & method scope → Check this installation**, or visit `verify.html`. Its checks execute in your own browser and can be downloaded. They do not upload your data.

## What is preserved

The original laboratory pages and direct routes remain. Original optimization retains six algorithms, including CMA-ES, differential evolution and multistart, with editable objectives, variable bounds and constraints. Original sensitivity retains local differences, Morris, Sobol and Fisher information, including output/metric choices and parameter ranges. The structured Model Studio and its eight import-format choices are retained, not reduced to a JSON-only editor.

The original statistics, weighted fitting, confidence/profile/bootstrap diagnostics, regression/classification/clustering/PCA, cross-validation, AI surrogates, Scientific ML, agents, diploid two-deme population genetics, reaction/network, symbolic and linear-algebra tools remain available. The connected research workspace retains observation operators, CSV mapping, condition/replicate identity, holdout choices, fitting, sensitivity, ensembles and surrogate workflows.

The original model definitions in `site/src/app.js` are unchanged. The **18-state FADNS** and separate **four-state fatty-acid metabolism** models can be opened directly in the Lipids laboratory or through the two added original-model starters in Studio. They are not replaced by a three-pool chain. Studio now has 23 starters: the previous 21 plus these two explicit adapters.

The original 259 catalogue records / 249 distinct destinations are retained. Thirty-seven additive configurations bring the catalogue to **296 records / 286 distinct destinations**. Records, destinations, starters and independent scientific models are different counting units.

All 85 checked identity-related files, including original branding/laboratory assets and the favicon, match the source archive byte-for-byte. The numerical-core directory retains 38 of 39 original files byte-for-byte; the one targeted change fixes ROC tie handling and average precision, with failing-before and passing-after tests. No whole numerical laboratory was substituted.

## What was added and changed

Nine integrated laboratory entry points add seasonal plant resource budgets; C3 leaf physiology and a separate thermal experiment; seasonal evolutionary landscapes; direct original lipid mechanisms; generation-resolved T-cell teaching; dice and stochastic trajectories; branching; conservative spatial diffusion; and iterated fractal systems. They are available through the ordinary navigation, directory and catalogue.

Plant growth exposes simulation duration separately from active season and environmental-year length. Carbon, water and nitrogen are finite stocks with explicit inflows/outflows. Rain, irrigation, evapotranspiration, drainage, nutrient input, leaching, turnover and mineralization enter recorded budgets. Single-season, annual seed-bank carry-over and perennial options do not create free annual water or biomass. Location presets are explicitly illustrative; ordered weather CSV permits user-supplied forcing. Drought and zero-water-input cases are included.

The newer laboratories distinguish **Run** (compute), **Cancel** (terminate the worker), **Play** (reveal stored results) and **Pin comparison** (retain an explicit alternative). Input changes invalidate current-result status and disable current-result exports. Each side of Two-up has its own plot selector; changing a plot does not change the layout. Tables paginate, optional settings expand, and mobile save/restore controls collapse. Three-dimensional plot types remain selectable; where WebGL is unavailable, the newer laboratories display an explicitly identified two-dimensional projection rather than an overflowing error panel.

CSV/experiment JSON, SVG, PNG, interactive figure HTML and **native Python reference scripts** are exportable from the additive laboratories. The Python scripts do not invoke Node or a JavaScript kernel. Original laboratories retain their original exports. Some retained export schemas identify the unchanged older engine version; `VERSION.json` and the preservation hashes identify this 79.2.0 application distribution. The additive records identify 79.2.0 explicitly. Experimental overlays are explicitly overlays, not automatically fitted or unit-validated observations. Input URLs use URL fragments and have a size limit; large models should use JSON.

The home page and new laboratory layout are changed while retaining the approved identity. The home trajectory is a numerical Lorenz calculation, not decorative fabricated data. Creator and collaborator materials remain grounded in the supplied source; no private health, residence or financial information was added to the public site.

## Book and programme

V6.17 was already part of 79.1; it is **not presented as a newly written book**. The update retains **27 chapters, 255 section destinations, 54 worked-practice destinations, five appendices and source-text search**. Twelve additional worked companions supplement rather than replace the original Learn and Programme workflows. Local SVG mathematics rendering is bundled.

The public companion keeps all 439 physical page positions. Private author-planning pages 6–9 are replaced by explicit omission notices; the other 435 pages have unchanged extracted text. Four representative source pages also passed exact raster comparisons. The complete author PDF remains byte-identical in `private-reference/` and is **not served or included in the public-site ZIP**. See `site/materials/publication-status.json`.

The book refers to a separate notebook/source ecosystem. Those missing notebook files have not been fabricated. Existing open-investigation guidance is not labelled as a completed empirical investigation.

## Scientific interpretation

The seasonal plant and adaptation modules are explicitly new teaching reductions, not recovered full calibrated research implementations. Root hydraulics, coupled C3/C4/CAM biochemistry, stomatal optimization and empirical yield validation are not implied. C3/intermediate/C4 colors indicate declared illustrative trait landmarks, not inferred physiological boundaries. The original genetics and evolution tools are still available separately.

The original public FADNS and metabolism equations have been preserved and numerically checked; that does not establish experimental adequacy or settle the original research bistability versus browser-uniqueness discrepancy. Neither equations nor tolerances were adjusted merely to force a desired conclusion. T-cell generation teaching does not claim to reconstruct full Smith–Martin delay or Cyton lifetime models.

## Verification and reproduction

`evidence/` contains current executed results, scripts, screenshots, hashes and limits. `site/release-evidence.json` is the public summary. Tests address actual preserved capabilities, not only the newly reduced demonstrations.

For the JavaScript numerical suites, install Node 22 or later, then run from this folder:

```bash
node tests/preservation-regression.mjs
node tests/additive-smoke.mjs
```

For independent Python references, optionally install `requirements-reference.txt`, then run:

```bash
python3 tests/python_comparison.py
python3 python/fokolab_reference.py experiment.json --output results/reference
```

The main Python runner accepts an exported experiment record or request. Browser-downloaded Python scripts already contain their request. Plotting is optional; CSV and JSON are the principal reference outputs. Record actual dependency versions for your environment rather than assuming a range constraint is a frozen lockfile.

`tests/browser_regression.py` requires Python Playwright and Chromium. The release’s browser evidence uses controlled local-source HTML, explicit in-memory storage, real Blob workers for new labs, and the original Studio’s bounded no-worker fallback. Native address navigation is blocked in this authoring environment. These checks do **not** certify normal address-based worker loading, browser-restart persistence, Safari/Firefox, physical mobile devices, accessibility conformance or a live deployment. Use `verify.html` for initial checks of an actual installation.

## Hosting and private material

The complete package is an **author package**. Do not publish it wholesale. Publish **only `site/`**, or use the separate public-site ZIP. The supplied `.github/workflows/pages.yml` uploads only `site/`; select GitHub Actions as the Pages build source in repository settings. A public repository should not contain `private-reference/` or `rollback/`, even though they are outside the Pages deployment artifact. They are excluded in `.gitignore`.

The old `rollback/FokoLab-79.1-original.zip` contains the original source distribution, including its original publication choices. It is retained for reversal and comparison, not public deployment. Current author-only history remains in `docs/`.

## Editing and rollback

`site/` is the canonical, directly editable, already-built application. There is no compilation step for use. Original cores, model specifications, UI modules and added modules remain separately inspectable. Start with `site/src/upgrade/registry.js`, `physiology.mjs`, `lab-ui.mjs`, and `styles/upgrade.css` for the new areas.

`evidence/preservation.json` records each source file’s before/after hash. The original archive provides an exact rollback point. Development-history scripts are historical implementation recipes, not an idempotent rebuild pipeline; do not replay them on the final tree. Rerun tests after edits. Test totals never certify unseen changes.
