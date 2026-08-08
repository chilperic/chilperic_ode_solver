from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "steady.html").read_text()
SOUP = BeautifulSoup(HTML, "html.parser")
CORE = (ROOT / "src/core/steady.js").read_text()
CONTROLLER = (ROOT / "src/v72/steady-workspace.js").read_text()


def test_steady_is_an_authored_v72_reference_shell():
    body = SOUP.body
    assert body["data-v72-shell"] == "true"
    assert body.get("data-version") is None
    local_styles = [
        tag.get("href", "")
        for tag in SOUP.find_all("link", rel="stylesheet")
        if not tag.get("href", "").startswith("http")
    ]
    assert local_styles == [
        "assets/vendor/katex/katex-0.16.47.min.css?v=77.4.1",
        "styles/v72-tokens.css?v=77.4.1",
            "styles/v72-lab-shell.css?v=77.4.1",
            "styles/v72-accessibility-performance.css?v=77.4.1",
            "styles/v76-system.css?v=77.4.1",
        ]
    assert SOUP.select_one("main.layout")
    assert SOUP.select_one(".v72-workspace")
    assert SOUP.select_one(".v72-inspector")


def test_steady_uses_the_pure_numerical_core():
    assert "FokoSteadyCore" in CORE
    for forbidden in ["document.", "querySelector", "Plotly", "localStorage", "sessionStorage"]:
        assert forbidden not in CORE
    for required in [
        "solveNewton",
        "finiteDifferenceJacobian",
        "classifyDynamicStability",
        "solveMultiStart",
        "scanParameter",
        "terminationReason",
        "residualNorm",
    ]:
        assert required in CORE
    assert "FokoSteadyCore" in CONTROLLER


def test_convergence_and_stability_claims_are_separated():
    text = SOUP.get_text(" ", strip=True).lower()
    assert "root convergence and dynamical stability are distinct claims" in text
    assert "algebraic constraints only" in text
    assert "equilibrium of dx/dt = f(x,p)" in text
    assert "stabilityfor" in CONTROLLER.lower()
    assert "solution.converged" in CONTROLLER
    assert "classifyDynamicStability" in CONTROLLER


def test_parameter_workflow_is_not_overclaimed_as_continuation():
    text = SOUP.get_text(" ", strip=True).lower()
    assert "not pseudo-arclength continuation" in text
    assert "do not prove folds or hopf bifurcations" in text
    assert "sequential parameter scan" in text
    assert "confirmed: false" in CORE
    assert "turning-point-grid-heuristic" in CORE
    assert "stability-crossing" in CORE


def test_two_three_and_focus_layouts_are_explicit():
    buttons = {button.get("data-layout-mode") for button in SOUP.select("[data-layout-mode]")}
    assert buttons == {"two", "focus"}
    assert "effectiveLayout" in CONTROLLER
    assert "innerWidth < 1024" in CONTROLLER
    assert "state.preferredLayout" in CONTROLLER
    assert "three" not in {button.get("data-layout-mode") for button in SOUP.select("[data-layout-mode]")}


def test_two_plot_cards_have_independent_computed_selectors():
    for side in ("left", "right"):
        card = SOUP.select_one(f'[data-plot-card="{side}"]')
        assert card
        assert card.find(id=f"{side}Plot")
        assert card.find(id=f"{side}PlotType")
        header = card.select_one(".chart-title")
        assert header.find(id=f"{side}PlotType")
        assert card.find(id=f"{side}Plot").find(id=f"{side}PlotType") is None
    assert not SOUP.select_one('[data-plot-card="third"]')
    assert "availablePlotTypes" in CONTROLLER
    assert "No compatible computed data exist" in CONTROLLER


def test_provenance_diagnostics_and_reproducibility_controls_are_first_class():
    for element_id in [
        "steadyTopStatus",
        "steadyRuntime",
        "steadyIterations",
        "steadyResidual",
        "steadyTermination",
        "steadyDiagnostics",
        "provenanceStatus",
        "provenanceMethod",
        "provenanceScope",
        "provenanceInterpretation",
        "provenanceWarning",
        "saveSteadySession",
        "restoreSteadySession",
        "copySteadyShareUrl",
        "exportsBlock",
    ]:
        assert SOUP.find(id=element_id), element_id
    assert "configuration only" in SOUP.get_text(" ", strip=True).lower()
    assert "Computed evidence was not restored" in CONTROLLER


def test_controller_does_not_restructure_dom_after_load():
    for forbidden in ["MutationObserver", "ResizeObserver", "appendChild(", "insertBefore(", "replaceChildren("]:
        assert forbidden not in CONTROLLER


def test_no_duplicate_ids_on_steady_page():
    ids = [node["id"] for node in SOUP.find_all(id=True)]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    assert not duplicates
