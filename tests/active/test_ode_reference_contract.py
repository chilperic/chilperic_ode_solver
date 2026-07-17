from __future__ import annotations

import re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / "ode.html").read_text()
SOUP = BeautifulSoup(HTML, "html.parser")
APP = (ROOT / "src/app.js").read_text()
CORE = (ROOT / "src/core/ode.js").read_text()
WORKER = (ROOT / "src/worker.js").read_text()
CONTROLLER = (ROOT / "src/v72/ode-workspace.js").read_text()


def test_ode_is_the_authored_v72_reference_shell():
    body = SOUP.body
    assert body["data-v72-shell"] == "true"
    assert body["data-version"] == "72.47.0"
    local_styles = [x.get("href", "") for x in SOUP.find_all("link", rel="stylesheet") if not x.get("href", "").startswith("http")]
    assert local_styles == [
        "assets/vendor/katex/katex-0.16.47.min.css?v=72.47.0",
        "styles/v72-tokens.css?v=72.47.0",
        "styles/v72-lab-shell.css?v=72.47.0",
        "styles/v72-accessibility-performance.css?v=72.47.0",
    ]
    assert SOUP.select_one('main.layout')
    assert SOUP.select_one(".v72-workspace")
    assert SOUP.select_one(".v72-inspector")


def test_two_up_and_focus_layouts_are_explicit():
    buttons = {b.get("data-layout-mode") for b in SOUP.select("[data-layout-mode]")}
    assert buttons == {"two", "focus"}
    assert "effectiveLayout" in CONTROLLER
    assert "innerWidth < 1024" in CONTROLLER
    assert "new Set(['two', 'focus'])" in CONTROLLER
    assert "new Set(['left', 'right'])" in CONTROLLER


def test_two_plot_cards_have_independent_computed_selectors():
    for side in ("left", "right"):
        assert SOUP.find(id=f"{side}Plot")
        assert SOUP.find(id=f"{side}PlotType")
        assert SOUP.find(id=f"{side}Menu")
    assert "scheduleVisiblePlots(['left'])" in APP
    assert "scheduleVisiblePlots(['right'])" in APP
    assert "thirdPlotType" not in HTML
    assert "data-plot-card=\"third\"" not in HTML


def test_plot_controls_are_inside_headers_not_over_plot_canvases():
    for side in ("left", "right"):
        card = SOUP.select_one(f'[data-plot-card="{side}"]')
        header = card.select_one(".chart-title")
        canvas = card.find(id=f"{side}Plot")
        assert header and canvas
        assert header.find(id=f"{side}PlotType")
        assert canvas.find(id=f"{side}PlotType") is None


def test_provenance_and_diagnostics_are_first_class_regions():
    for element_id in [
        "topStatus", "runtimeValue", "acceptedValue", "rejectedValue", "stepsMetric", "evalMetric",
        "diagnostics", "provenanceStatus", "provenanceWarning", "exportsBlock",
    ]:
        assert SOUP.find(id=element_id), element_id
    assert "foko:provenance" in APP
    assert "foko:provenance" in CONTROLLER


def test_worker_uses_the_pure_ode_core():
    assert "FokoODECore" in CORE
    assert "document." not in CORE
    assert "querySelector" not in CORE
    assert "Plotly" not in CORE
    assert "importScripts('core/ode.js?v=72.47.0')" in WORKER
    assert "FokoODECore.solveWithRhs" in WORKER
    assert "accepted" in CORE
    assert "rejected" in CORE
    assert "rtol" in CORE and "atol" in CORE


def test_critical_app_ids_exist_in_authored_markup():
    required = {
        "runBtn", "runSweep", "exampleSelect", "loadExample", "resetBtn",
        "equationRows", "paramRows", "t0", "t1", "points", "method", "rtol", "atol",
        "leftPlot", "rightPlot", "leftPlotType", "rightPlotType",
        "figureSettings", "plotConfig", "cfgTarget", "applyPlotConfig",
    }
    missing = sorted(element_id for element_id in required if SOUP.find(id=element_id) is None)
    assert not missing


def test_no_duplicate_ids_on_ode_page():
    ids = [node["id"] for node in SOUP.find_all(id=True)]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    assert not duplicates


def test_explicit_session_and_share_controls_store_configuration_not_results():
    for element_id in ["saveSessionBtn", "restoreSessionBtn", "copyShareUrlBtn"]:
        assert SOUP.find(id=element_id)
    assert "saveExplicitSession" in APP
    assert "restoreExplicitSession" in APP
    assert "encodeSharedState(currentConfig())" in APP
    assert "params.get('state')" in APP
    assert "not computed evidence" in APP.lower()
