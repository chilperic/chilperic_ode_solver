from __future__ import annotations

import json
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def test_sciml_uses_authored_v72_shell_without_legacy_layout_layers():
    html = (ROOT / "sciml.html").read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    assert soup.body is not None
    assert soup.body.get("data-v72-shell") == "true"
    assert soup.body.get("data-lab") == "sciml"
    styles = [node.get("href", "") for node in soup.select("link[rel='stylesheet']")]
    assert any("v72-sciml.css" in value for value in styles)
    assert not any("sciml-lab.css" in value for value in styles)
    assert not any("v70-7-unified.css" in value for value in styles)
    assert len(soup.select("[data-layout-mode]")) == 2
    assert [node.get('data-plot-card') for node in soup.select("[data-plot-card]")] == ['left', 'right']
    assert soup.select_one("#sciPhaseControls")
    assert soup.select_one("#sciDiagnostics")
    assert soup.select_one("#saveSciSession")
    assert soup.select_one("#copySciShareUrl")


def test_sciml_plot_registry_only_exposes_workflow_compatible_evidence():
    source = (ROOT / "src/sciml-lab.js").read_text(encoding="utf-8")
    assert "const PLOT_META" in source
    assert "const WORKFLOW_PLOTS" in source
    assert "assimilation:['reference_trajectory']" in source
    assert "pinn:['reference_trajectory']" in source
    assert "operator:['reference_trajectory']" in source
    assert "network:['reference_trajectory']" in source
    assert "No training loss, residual field, operator accuracy or speedup is shown" in source
    assert "FokoSINDy.paretoSweep" in source
    assert "FokoHonesty" not in source
    assert "MutationObserver" not in source
    assert "ResizeObserver" not in source
    for fake in ("pde_residual", "pinn_loss", "fno_spectrum", "deeponet_basis", "speedup"):
        assert f"'{fake}'" not in source


def test_statistics_example_library_is_broad_and_filterable():
    html = BeautifulSoup((ROOT / "statistics.html").read_text(encoding="utf-8"), "html.parser")
    source = (ROOT / "src/models/statistics-presets.js").read_text(encoding="utf-8")
    controller = (ROOT / "src/v72/statistics-workspace.js").read_text(encoding="utf-8")
    assert html.select_one("#statisticsFamilyFilter")
    assert html.select_one("#statisticsExampleCount")
    assert "exampleFamily" in controller
    assert "preset-meta" in controller
    assert source.count("mode:") >= 18
    for scenario in (
        "Simpson reversal warning",
        "Regression with leverage and influence",
        "Rare-event classifier evaluation",
        "Crossing survival curves",
        "Process shift and drift detection",
        "Bimodal measurement distribution",
    ):
        assert scenario in source


def test_theme_selector_has_an_explicit_high_contrast_contract():
    css = (ROOT / "styles/v72-tokens.css").read_text(encoding="utf-8")
    nav = (ROOT / "src/navigation.js").read_text(encoding="utf-8")
    assert "body[data-v72-shell=\"true\"] .foko-top-actions .foko-theme-picker" in css
    assert "background-color: #0a4350" in css
    assert "-webkit-text-fill-color: #fff" in css
    assert ".theme-select option" in css
    assert "Choose interface theme" in nav
    assert "!important" not in css


def test_v728_capability_matrix_marks_sciml_as_bounded_reference():
    data = json.loads((ROOT / "CAPABILITIES.json").read_text(encoding="utf-8"))
    assert data["release"] == "72.47.0"
    sciml = data["labs"]["sciml"]
    assert sciml["interface"] == "reference"
    assert sciml["capabilities"]["sindy_sparse_regression_and_pareto_sweep"] == "browser-computed"
    assert sciml["capabilities"]["small_inverse_and_surrogate_diagnostics"] == "limited-browser"
    assert sciml["capabilities"]["pinn_fno_deeponet_and_large_neural_training"] == "export-only"
    assert any("compatible" in item.lower() for item in sciml["limitations"])
