from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "optimization.html").read_text()
SOUP = BeautifulSoup(HTML, "html.parser")
CORE = (ROOT / "src/core/optimization.js").read_text()
CONTROLLER = (ROOT / "src/v72/optimization-workspace.js").read_text()
PRESETS = (ROOT / "src/models/optimization-presets.js").read_text()


def test_optimization_is_an_authored_v72_reference_shell():
    body = SOUP.body
    assert body["data-v72-shell"] == "true"
    assert body["data-lab"] == "optimization"
    assert body["data-version"] == "72.48.0"
    local_styles = [
        tag.get("href", "")
        for tag in SOUP.find_all("link", rel="stylesheet")
        if not tag.get("href", "").startswith("http")
    ]
    assert local_styles == [
        "assets/vendor/katex/katex-0.16.47.min.css?v=72.48.0",
        "styles/v72-tokens.css?v=72.48.0",
        "styles/v72-lab-shell.css?v=72.48.0",
        "styles/v72-accessibility-performance.css?v=72.48.0",
    ]
    assert SOUP.select_one("main.layout")
    assert SOUP.select_one(".v72-workspace")
    assert SOUP.select_one(".v72-inspector")
    scripts = [tag.get("src", "") for tag in SOUP.find_all("script")]
    assert "src/core/optimization.js?v=72.48.0" in scripts
    assert "src/models/optimization-presets.js?v=72.48.0" in scripts
    assert "src/v72/optimization-workspace.js?v=72.48.0" in scripts
    assert not any("src/optimization-lab.js" in src for src in scripts)


def test_optimization_uses_a_pure_dom_free_core():
    assert "FokoOptimizationCore" in CORE
    for forbidden in ["document.", "querySelector", "Plotly", "localStorage", "sessionStorage", "math.compile"]:
        assert forbidden not in CORE
    for required in [
        "optimise",
        "coordinateSearch",
        "projectedGradient",
        "differentialEvolution",
        "multiStart",
        "paretoSample",
        "feasibilityTolerance",
        "globalOptimality: 'not established'",
        "localOptimality: 'not certified'",
    ]:
        assert required in CORE
    assert "FokoOptimizationCore" in CONTROLLER


def test_feasibility_and_optimality_scope_are_not_overclaimed():
    text = SOUP.get_text(" ", strip=True).lower()
    assert "feasible candidate is not a certified local optimum" in text
    assert "not a proof of global optimality" in text
    assert "kkt conditions" in text
    assert "quadratic penalty" in text
    assert "checks constraints independently" in text
    assert "global optimality not established" in CONTROLLER.lower()
    assert "local optimality not certified" in CONTROLLER.lower()
    assert "least-violating candidate" in CONTROLLER.lower()
    assert "not an exact pareto frontier" in CORE.lower()


def test_two_three_and_focus_layouts_are_explicit():
    buttons = {button.get("data-layout-mode") for button in SOUP.select("[data-layout-mode]")}
    assert buttons == {"two", "focus"}
    assert "applyLayout" in CONTROLLER
    assert "FokoLayoutStability.apply" in CONTROLLER
    assert "breakpoint: 1024" in CONTROLLER
    assert "data-focus-side" in HTML


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
    for plot_type in ["landscape", "convergence", "constraint-history", "variables", "feasibility", "samples", "pareto"]:
        assert plot_type in CONTROLLER


def test_constraint_evidence_is_first_class():
    for element_id in [
        "optimizationTopStatus",
        "optimizationRuntime",
        "optimizationEvaluations",
        "optimizationAlgorithmMetric",
        "optimizationBestObjective",
        "optimizationMaxViolation",
        "optimizationFeasibleRate",
        "optimizationTermination",
        "optimizationCandidateStatus",
        "optimizationDiagnostics",
        "provenanceStatus",
        "provenanceEngine",
        "provenanceMethod",
        "provenanceConstraints",
        "provenanceOptimality",
        "provenanceReproducibility",
        "provenanceWarning",
    ]:
        assert SOUP.find(id=element_id), element_id
    assert "maximum violation" in CONTROLLER.lower()
    assert "feasibility tolerance" in CONTROLLER.lower()
    assert "penalty minimization and feasibility checking are separate" in CONTROLLER.lower()


def test_custom_model_and_configuration_only_reproducibility_are_explicit():
    for element_id in [
        "optimizationVariables",
        "addOptimizationVariable",
        "optimizationObjective",
        "optimizationObjective2",
        "optimizationInequalities",
        "optimizationEqualities",
        "optimizationAlgorithm",
        "optimizationSeed",
        "optimizationPenalty",
        "optimizationFeasibilityTolerance",
        "saveOptimizationSession",
        "restoreOptimizationSession",
        "copyOptimizationShareUrl",
        "exportOptimizationSummary",
        "exportOptimizationHistory",
        "exportOptimizationJson",
        "exportOptimizationModel",
        "exportOptimizationPython",
    ]:
        assert SOUP.find(id=element_id), element_id
    assert "Configuration only" in CONTROLLER
    assert "Computed candidates, feasibility evidence, and plots must be regenerated" in SOUP.get_text(" ", strip=True)


def test_curated_presets_cover_reference_problem_classes():
    for name in [
        "Convex bowl",
        "Constrained quadratic",
        "Rosenbrock on disk",
        "Rugged Rastrigin",
        "Cylinder material design",
        "Portfolio equality toy",
        "Pareto design trade-off",
    ]:
        assert name in PRESETS
    assert PRESETS.count("scientificNote:") >= 7
    assert "not a proof of global optimality" in PRESETS.lower()
    assert "not an exact Pareto frontier" in PRESETS


def test_controller_does_not_restructure_dom_after_load():
    for forbidden in ["MutationObserver", "ResizeObserver", "appendChild(", "insertBefore(", "replaceChildren("]:
        assert forbidden not in CONTROLLER


def test_no_duplicate_ids_on_optimization_page():
    ids = [node["id"] for node in SOUP.find_all(id=True)]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    assert not duplicates
