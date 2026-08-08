from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def soup(path: str) -> BeautifulSoup:
    return BeautifulSoup(text(path), "html.parser")


def test_agent_is_two_panel_and_dynamic():
    doc = soup("agent.html")
    assert not doc.select('[data-plot-card="third"]')
    assert doc.select_one("#agentSnapshotCount")
    assert doc.select_one("#leftAgentPlotLegend")
    assert doc.select_one("#rightAgentPlotLegend")
    controller = text("src/v72/agent-workspace.js")
    assert "const SIDES = ['left', 'right']" in controller
    assert "'spatial-dynamics'" in controller
    assert "'spatial-metrics'" in controller
    assert "endpoint-spatial" in controller


def test_agent_examples_include_research_inspired_fatty_acid_models():
    presets = text("src/models/agent-presets.js")
    assert "fadns_particle_baseline" in presets
    assert "fadns_coa_inhibition" in presets
    assert "Foko Kuate" in presets
    assert "not the published semi-mechanistic ODE model" in presets


def test_model_ir_is_loaded_before_ode_application():
    doc = soup("ode.html")
    sources = [tag.get("src") for tag in doc.find_all("script") if tag.get("src")]
    assert any(source.startswith("src/core/model-ir.js") for source in sources)
    ir_index = next(i for i, source in enumerate(sources) if source.startswith("src/core/model-ir.js"))
    app_index = next(i for i, source in enumerate(sources) if source.startswith("src/app.js"))
    assert ir_index < app_index
    assert "Reaction-network Model IR JSON" in text("ode.html")
    assert "window.FokoModelIR.isModelIR" in text("src/app.js")


def test_atlas_is_compact_searchable_and_provenance_aware():
    doc = soup("examples.html")
    assert doc.select_one("#atlasSearch")
    assert doc.select_one("#atlasLab")
    assert doc.select_one("#atlasProvenance")
    assert doc.select_one("#atlasStatus")
    assert doc.select_one("#atlasGridV72")
    assert not doc.select(".agent-atlas-section")
    styles = [tag.get("href", "") for tag in doc.find_all("link", rel="stylesheet")]
    assert any("styles/v72-lab-shell.css" in href for href in styles)
    assert not any("styles/v70-" in href or "styles/style.css" in href for href in styles)
    catalog = text("src/models/scientific-example-catalog.js")
    assert catalog.count("title:") >= 45
    assert "FADNS semi-mechanistic kinetics" in catalog
    assert "Research-derived" in catalog
    assert "Synthetic teaching" in catalog
    assert "Export-only" in catalog


def test_uploaded_friend_architecture_is_documented_without_redistribution():
    review = text("MXLWEB_REVIEW.md")
    assert "Stable model intermediate representation" in review
    assert "dx/dt = N·v" in review
    assert "was not copied wholesale" in review
    assert not (ROOT / "mxlweb-core-main").exists()

def test_package_lock_is_portable_and_uses_public_registry():
    lock = text("package-lock.json")
    assert "packages.applied-caas-gateway" not in lock
    assert "https://registry.npmjs.org/" in lock
    package = text("package.json")
    assert '"@playwright/test": "1.61.1"' in package

def test_model_atlas_deep_links_are_consumed_by_authored_workspaces():
    for path in [
        "src/v72/fitting-workspace.js",
        "src/v72/linalg-workspace.js",
        "src/v72/networks-workspace.js",
        "src/v72/ml-workspace.js",
        "src/v72/symbolic-workspace.js",
    ]:
        controller = text(path)
        assert "get('example')" in controller or 'get("example")' in controller
