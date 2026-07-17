from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def test_statistics_uses_authored_v72_reference_shell():
    html = (ROOT / "statistics.html").read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    body = soup.body
    assert body is not None
    assert body.get("data-v72-shell") == "true"
    assert body.get("data-lab") == "statistics"
    assert soup.select_one("#runStatistics")
    assert soup.select_one("#statisticsData")
    assert soup.select_one("#statisticsFile")
    assert soup.select_one("#statisticsMissingPolicy")
    assert soup.select_one("#plotGrid[data-layout='two']")
    assert len(soup.select("[data-layout-mode]")) == 2
    assert len(soup.select("[data-plot-card]")) == 2
    assert not soup.select_one('[data-plot-card="third"]')
    assert soup.select_one("#provenanceAssumptions")
    assert soup.select_one("#saveStatisticsSession")
    assert soup.select_one("#copyStatisticsShareUrl")


def test_statistics_uses_pure_data_and_statistics_cores():
    data_core = (ROOT / "src/core/data.js").read_text(encoding="utf-8")
    stats_core = (ROOT / "src/core/statistics.js").read_text(encoding="utf-8")
    controller = (ROOT / "src/v72/statistics-workspace.js").read_text(encoding="utf-8")
    presets = (ROOT / "src/models/statistics-presets.js").read_text(encoding="utf-8")
    assert "FokoDataCore" in data_core
    assert "parseDataset" in data_core
    assert "prepareRows" in data_core
    assert "FokoStatistics" in stats_core
    assert "olsInfluence" in stats_core
    assert "rocPrCurve" in stats_core
    assert "kaplanMeier" in stats_core
    assert "benjaminiHochberg" in stats_core
    assert "FokoDataCore + FokoStatistics" in controller
    assert "Mean imputation" in controller or "mean-imputed" in controller
    assert "caus" in controller.lower()
    assert "post-hoc" in controller.lower()
    assert "Uploaded data" in controller
    assert presets.count("mode:") >= 8


def test_statistics_has_no_runtime_shell_reconstruction():
    controller = (ROOT / "src/v72/statistics-workspace.js").read_text(encoding="utf-8")
    for forbidden in ("MutationObserver", "ResizeObserver", "appendChild(", "insertBefore(", "replaceChildren("):
        assert forbidden not in controller


def test_statistics_claims_are_bounded_in_capability_matrix_and_contract():
    capabilities = (ROOT / "CAPABILITIES.json").read_text(encoding="utf-8")
    contract = (ROOT / "SCIENTIFIC_CONTRACT.md").read_text(encoding="utf-8")
    assert '"statistics"' in capabilities
    assert '"interface": "reference"' in capabilities.split('"statistics"', 1)[1].split('"fitting"', 1)[0]
    assert "does not establish causality" in contract
    assert "Mean imputation" in contract
    assert "post-hoc" in contract
