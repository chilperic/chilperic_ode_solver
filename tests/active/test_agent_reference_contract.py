from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def test_agent_page_uses_authored_v72_shell_and_local_core():
    page = ROOT / "agent.html"
    soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
    assert soup.body.get("data-v72-shell") == "true"
    assert soup.body.get("data-lab") == "agent"
    scripts = [node.get("src", "") for node in soup.find_all("script")]
    styles = [node.get("href", "") for node in soup.find_all("link", rel="stylesheet")]
    assert any("src/core/agent-reference.js" in value for value in scripts)
    assert any("src/models/agent-presets.js" in value for value in scripts)
    assert any("src/v72/agent-workspace.js" in value for value in scripts)
    assert any("styles/v72-lab-shell.css" in value for value in styles)
    assert not any("styles/agent-lab.css" in value for value in styles)


def test_agent_workspace_contains_provenance_and_distinct_plot_controls():
    text = (ROOT / "agent.html").read_text(encoding="utf-8")
    controller = (ROOT / "src/v72/agent-workspace.js").read_text(encoding="utf-8")
    required = [
        "Random-sequential lattice updates",
        "Master seed",
        "Independent runs",
        "Neighbourhood",
        "Boundary",
        "Simulation contract",
    ]
    for phrase in required:
        assert phrase in text
    for phrase in ["Population time curves", "Live spatial simulation", "Representative final lattice", "Final-state distributions"]:
        assert phrase in controller
    soup = BeautifulSoup(text, "html.parser")
    assert len(soup.select(".chart-card")) == 2
    assert len(soup.select("[data-layout-mode]")) == 2
    assert len(soup.select(".focus-card[data-focus-side]")) == 2
    assert len(soup.select(".agent-state-legend")) == 2
    assert "Spatial dynamics" in text


def test_agent_core_is_seeded_pure_and_scientifically_bounded():
    core = (ROOT / "src/core/agent-reference.js").read_text(encoding="utf-8")
    presets = (ROOT / "src/models/agent-presets.js").read_text(encoding="utf-8")
    controller = (ROOT / "src/v72/agent-workspace.js").read_text(encoding="utf-8")
    assert "mulberry32" in core
    assert "deriveSeed" in core
    assert "simulateEnsemble" in core
    assert "random-sequential lattice updates" in core
    assert "browser safety budget" in core
    assert "T-cell activation and proliferation" in presets
    assert "Spatial SIR contact process" in presets
    assert "Schelling relocation threshold" in presets
    assert "not calibrated" in presets.lower()
    assert "finite stochastic ensemble" in (ROOT / "agent.html").read_text(encoding="utf-8")
    assert "causal interpretation" in controller
    # The authored shell must not be restructured after load. A canvas may be
    # attached inside an existing plot host as a deterministic renderer fallback.
    for forbidden in ["MutationObserver", "ResizeObserver", "insertBefore(", "replaceChildren("]:
        assert forbidden not in controller
    assert "document.body.appendChild" not in controller
    assert "document.querySelector('.v72-shell').appendChild" not in controller


def test_v7210_plot_header_and_sciml_placeholder_repairs_are_present():
    css = (ROOT / "styles/v72-lab-shell.css").read_text(encoding="utf-8")
    sciml = (ROOT / "src/sciml-lab.js").read_text(encoding="utf-8")
    linalg = (ROOT / "src/v72/linalg-workspace.js").read_text(encoding="utf-8")
    assert 'grid-template-areas:' in css
    assert '"plot-title plot-title plot-title"' in css
    assert "overflow-wrap: normal" in css
    assert "word-break: normal" in css
    assert "box.querySelector('.diagnostics.empty')" in sciml
    assert "box.innerHTML=''" in sciml
    assert "setTimeout(run, 40)" in linalg
    assert "compatibleCount" in linalg
    assert "['left', 'right'].forEach" in linalg
    assert "thirdPlot" not in linalg
