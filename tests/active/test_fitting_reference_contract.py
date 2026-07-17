from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "fitting.html").read_text(encoding="utf-8")
SOUP = BeautifulSoup(HTML, "html.parser")
CORE = (ROOT / "src/core/fitting.js").read_text(encoding="utf-8")
CONTROLLER = (ROOT / "src/v72/fitting-workspace.js").read_text(encoding="utf-8")
PRESETS = (ROOT / "src/models/fitting-presets.js").read_text(encoding="utf-8")


def test_fitting_uses_authored_v72_reference_shell():
    body = SOUP.body
    assert body is not None
    assert body.get("data-v72-shell") == "true"
    assert body.get("data-lab") == "fitting"
    assert body.get("data-version") == "72.47.0"
    local_styles = [
        tag.get("href", "")
        for tag in SOUP.find_all("link", rel="stylesheet")
        if not tag.get("href", "").startswith("http")
    ]
    assert local_styles == [
        "styles/v72-tokens.css?v=72.47.0",
        "styles/v72-lab-shell.css?v=72.47.0",
        "styles/v72-accessibility-performance.css?v=72.47.0",
    ]
    assert SOUP.select_one("main.layout")
    assert SOUP.select_one(".v72-workspace")
    assert SOUP.select_one(".v72-inspector")


def test_fitting_reuses_data_contract_and_pure_numerical_core():
    assert "FokoDataCore" in CONTROLLER
    assert "FokoFitting" in CORE
    for forbidden in ["document.", "querySelector", "Plotly", "localStorage", "sessionStorage"]:
        assert forbidden not in CORE
    for required in [
        "fit",
        "lmOptimize",
        "weightedPolynomialFit",
        "normaliseWeights",
        "parameterSummary",
        "predictionBands",
        "influenceDiagnostics",
        "profileLikelihood",
        "bootstrapFit",
        "terminationReason",
        "conditionIndicator",
    ]:
        assert required in CORE
    assert "FokoDataCore + FokoFitting" in CONTROLLER


def test_error_model_convergence_and_uncertainty_claims_are_bounded():
    text = SOUP.get_text(" ", strip=True).lower()
    assert "nonlinear least squares is a local numerical search" in text
    assert "does not prove a global optimum" in text
    assert "mean imputation is exposed only as a sensitivity option" in text
    assert "known, strictly positive observation standard deviations" in CONTROLLER
    assert "convergence does not prove" in text
    assert "local covariance approximation" in CONTROLLER
    assert "pairs bootstrap" in CONTROLLER.lower()
    assert "not out-of-sample validation" in CONTROLLER.lower()


def test_two_three_and_focus_layouts_are_explicit():
    buttons = {button.get("data-layout-mode") for button in SOUP.select("[data-layout-mode]")}
    assert buttons == {"two", "focus"}
    assert "effectiveLayout" in CONTROLLER
    assert "FokoLayoutStability.apply" in CONTROLLER
    assert "breakpoint: 1024" in CONTROLLER
    assert "clientWidth" not in CONTROLLER


def test_two_plot_cards_have_independent_computed_selectors():
    cards = SOUP.select('[data-plot-card]')
    assert [card.get('data-plot-card') for card in cards] == ['left', 'right']
    for side in ("left", "right"):
        card = SOUP.select_one(f'[data-plot-card="{side}"]')
        assert card.find(id=f"{side}Plot")
        assert card.find(id=f"{side}PlotType")
        header = card.select_one(".chart-title")
        assert header.find(id=f"{side}PlotType")
        assert card.find(id=f"{side}Plot").find(id=f"{side}PlotType") is None
    assert 'thirdPlot' not in CONTROLLER
    assert "availablePlotTypes" in CONTROLLER
    assert "fit-bands" in CONTROLLER
    assert "parameter-ci" in CONTROLLER
    assert "No computed fit" in HTML


def test_data_model_diagnostics_and_exports_are_first_class():
    required_ids = [
        "fittingFile",
        "fittingData",
        "fittingDelimiter",
        "fittingMissingPolicy",
        "fittingModel",
        "fittingX",
        "fittingY",
        "fittingWeighting",
        "fittingSigma",
        "fittingInitial",
        "fittingBootstrapReps",
        "fittingSeed",
        "fittingProfile",
        "fittingTopStatus",
        "fittingTermination",
        "fittingDiagnostics",
        "provenanceStatus",
        "provenanceMethod",
        "provenanceData",
        "provenanceAssumptions",
        "provenanceWarning",
        "saveFittingSession",
        "restoreFittingSession",
        "copyFittingShareUrl",
        "exportFittingSummary",
        "exportFittingData",
        "exportFittingJson",
        "exportFittingPython",
    ]
    missing = [element_id for element_id in required_ids if SOUP.find(id=element_id) is None]
    assert not missing
    assert "configuration only" in SOUP.get_text(" ", strip=True).lower()
    assert "Computed parameters and diagnostics were not restored" in CONTROLLER


def test_curated_presets_cover_linear_nonlinear_weighted_and_diagnostic_cases():
    assert PRESETS.count("scientificNote:") >= 6
    assert "Michaelis–Menten kinetics" in PRESETS
    assert "Weighted calibration curve" in PRESETS
    assert "Logistic population growth" in PRESETS
    assert "Influential observation stress test" in PRESETS
    assert "weighting: 'known-sigma'" in PRESETS


def test_controller_does_not_restructure_dom_after_load():
    for forbidden in ["MutationObserver", "ResizeObserver", "appendChild(", "insertBefore(", "replaceChildren("]:
        assert forbidden not in CONTROLLER


def test_no_duplicate_ids_on_fitting_page():
    ids = [node["id"] for node in SOUP.find_all(id=True)]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    assert not duplicates


def test_fitting_is_reference_in_capability_matrix_and_contract():
    capabilities = (ROOT / "CAPABILITIES.json").read_text(encoding="utf-8")
    contract = (ROOT / "SCIENTIFIC_CONTRACT.md").read_text(encoding="utf-8")
    fitting_block = capabilities.split('"fitting"', 1)[1].split('"linear_algebra"', 1)[0]
    assert '"interface": "reference"' in fitting_block
    assert "global optimum" in contract.lower()
    assert "pairs bootstrap" in contract.lower()
    assert "inverse-variance" in contract.lower()
