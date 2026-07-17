from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding="utf-8")


def test_shared_pca_core_is_loaded_by_all_analysis_surfaces():
    for page in ("ml.html", "statistics.html", "sciml.html"):
        soup = BeautifulSoup(read(page), "html.parser")
        scripts = [node.get("src", "") for node in soup.select("script[src]")]
        assert any(value.startswith("src/core/pca.js") for value in scripts), page
    stats = BeautifulSoup(read("statistics.html"), "html.parser")
    assert stats.select_one('#statisticsMode option[value="pca"]')


def test_sciml_plot_registry_rejects_dimension_incompatible_outputs():
    source = read("src/sciml-lab.js")
    assert "kind!=='phase2d'||vars.length>=2" in source
    assert "kind!=='phase3d'||vars.length>=3" in source
    assert "vars.length>=2 && ANALYSIS && ANALYSIS.pca" in source
    assert all(key in source for key in ("pca_scores", "pca_explained", "pca_loadings"))
    assert "used.has(desired)" in source


def test_agent_rendering_has_a_nonblank_fallback_and_stale_run_guard():
    source = read("src/v72/agent-workspace.js")
    assert "fallbackCanvas" in source
    assert "await PLOT.render" in source
    assert "PLOT.setState(host, 'fallback', false)" in source
    assert "Plotly.newPlot" not in source
    assert "runSerial" in source
    assert "$('agentTopStatus').textContent='Rendering'" in source
    assert "Computed and rendered" in source
    assert "Plotly.react" not in source


def test_theme_selector_is_one_visible_control_without_the_wrapping_glyph():
    nav = read("src/navigation.js")
    css = read("styles/v72-tokens.css")
    assert "label.textContent = '◑'" not in nav
    assert "Choose interface theme" in nav
    assert ".theme-icon {\n  display: none;" in css
    assert "white-space: nowrap" in css
    assert "appearance: auto" in css


def test_statistics_library_contains_nontrivial_pca_stress_tests():
    source = read("src/models/statistics-presets.js")
    assert source.count("mode: 'pca'") >= 2
    assert "Multivariate physiological gradient" in source
    assert "Collinear biomarkers with missing values" in source
    assert "PCA summarizes standardized covariance" in source
    assert "neither identifies a biological factor" in source


def test_plot_cards_have_a_visible_rendering_state_contract():
    css = read("styles/v72-lab-shell.css")
    assert '.plot[data-render-state="rendering"]' in css
    assert "Rendering computed evidence" in css
    assert '.plot[data-render-state="fallback"]' in css
    for controller in ("src/v72/ml-workspace.js", "src/v72/statistics-workspace.js", "src/sciml-lab.js"):
        source = read(controller)
        assert "PLOT.render" in source or "FokoPlotLifecycle.render" in source
        assert "Plot rendering failed" in source or "sciml-error" in source or "PLOT.render" in source or "FokoPlotLifecycle.render" in source


def test_pca_core_is_pure_and_does_not_touch_the_dom():
    source = read("src/core/pca.js")
    assert "root.FokoPCA" in source
    assert "document." not in source
    assert "window." not in source
    assert "Jacobi symmetric eigendecomposition" in source
    assert "near-zero variance" in source
