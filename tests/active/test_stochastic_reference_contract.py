from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "stochastic.html").read_text()
SOUP = BeautifulSoup(HTML, "html.parser")
CORE = (ROOT / "src/core/stochastic.js").read_text()
CONTROLLER = (ROOT / "src/v72/stochastic-workspace.js").read_text()
PRESETS = (ROOT / "src/models/stochastic-presets.js").read_text()


def test_stochastic_is_an_authored_v72_reference_shell():
    body = SOUP.body
    assert body["data-v72-shell"] == "true"
    assert body["data-lab"] == "stochastic"
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
    assert "src/core/stochastic.js?v=72.48.0" in scripts
    assert "src/v72/stochastic-workspace.js?v=72.48.0" in scripts
    assert not any("src/stochastic/stochastic-lab.js" in src for src in scripts)


def test_stochastic_uses_a_pure_direct_ssa_core():
    assert "FokoStochasticCore" in CORE
    for forbidden in ["document.", "querySelector", "Plotly", "localStorage", "sessionStorage", "math.compile"]:
        assert forbidden not in CORE
    for required in [
        "simulateSSA",
        "simulateEnsemble",
        "seededRandom",
        "deriveSeed",
        "eventCount",
        "truncatedRuns",
        "absorbingRuns",
        "Monte Carlo",
        "Gillespie direct SSA",
    ]:
        assert required in CORE
    assert "FokoStochasticCore" in CONTROLLER


def test_algorithm_scope_and_uncertainty_are_not_overclaimed():
    text = SOUP.get_text(" ", strip=True).lower()
    assert "time-homogeneous ctmc" in text
    assert "explicit time dependence is rejected" in text
    assert "finite-sample estimates" in text
    assert "not analytical distributions" in text
    assert "not a parameter confidence interval" in CONTROLLER.lower()
    assert "not an analytical stationary distribution" in CONTROLLER.lower()
    assert "event cap" in text
    assert "censored" in CONTROLLER.lower()
    assert "tau-leaping — not in reference gate" in text
    assert "sde integration — migration pending" in text


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
    assert "final-hist" in CONTROLLER
    assert "event-counts" in CONTROLLER


def test_seed_event_cap_and_monte_carlo_evidence_are_first_class():
    for element_id in [
        "stochasticTopStatus",
        "stochasticRuntime",
        "stochasticRunsMetric",
        "stochasticEvents",
        "stochasticTruncated",
        "stochasticFinalMean",
        "stochasticFinalSd",
        "stochasticAbsorbing",
        "stochasticSeedMetric",
        "stochasticDiagnostics",
        "provenanceStatus",
        "provenanceMethod",
        "provenanceScope",
        "provenanceRandomness",
        "provenanceUncertainty",
        "provenanceWarning",
    ]:
        assert SOUP.find(id=element_id), element_id
    assert "Base seed" in CONTROLLER
    assert "Monte Carlo SE" in CONTROLLER
    assert "truncatedRuns" in CONTROLLER


def test_custom_model_and_configuration_only_reproducibility_are_explicit():
    for element_id in [
        "stochasticStates",
        "stochasticParams",
        "stochasticReactions",
        "addStochasticState",
        "addStochasticParam",
        "addStochasticReaction",
        "saveStochasticSession",
        "restoreStochasticSession",
        "copyStochasticShareUrl",
        "exportStochasticSummary",
        "exportStochasticFinal",
        "exportStochasticJson",
        "exportStochasticModel",
        "exportStochasticPython",
    ]:
        assert SOUP.find(id=element_id), element_id
    assert "Configuration only" in CONTROLLER
    assert "Computed trajectories and uncertainty evidence must be regenerated" in SOUP.get_text(" ", strip=True)


def test_curated_presets_have_reactions_and_declared_mean_field_scope():
    assert PRESETS.count("interpretation: 'time-homogeneous CTMC'") >= 5
    assert PRESETS.count("meanField:") >= 5
    assert "Stochastic SIR epidemic" in PRESETS
    assert "Stochastic Michaelis–Menten" in PRESETS
    assert "Two-stage gene expression" in PRESETS


def test_controller_does_not_restructure_dom_after_load():
    for forbidden in ["MutationObserver", "ResizeObserver", "appendChild(", "insertBefore(", "replaceChildren("]:
        assert forbidden not in CONTROLLER


def test_no_duplicate_ids_on_stochastic_page():
    ids = [node["id"] for node in SOUP.find_all(id=True)]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    assert not duplicates
