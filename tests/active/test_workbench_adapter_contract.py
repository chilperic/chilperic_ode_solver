from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def test_workbench_is_authored_v72_and_not_legacy_runtime():
    page = ROOT / "workbench.html"
    soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
    assert soup.body.get("data-v72-shell") == "true"
    assert soup.body.get("data-lab") == "workbench"
    styles = [node.get("href", "") for node in soup.find_all("link", rel="stylesheet")]
    scripts = [node.get("src", "") for node in soup.find_all("script")]
    assert any("styles/v72-workbench.css" in item for item in styles)
    assert any("src/workbench/adapters.js" in item for item in scripts)
    assert any("src/v72/workbench-workspace.js" in item for item in scripts)
    assert not any("model-workbench-v3" in item for item in styles + scripts)
    assert not any("v71-workbench-science" in item for item in scripts)


def test_workbench_has_stable_adapter_and_plot_contract():
    text = (ROOT / "workbench.html").read_text(encoding="utf-8")
    adapters = (ROOT / "src/workbench/adapters.js").read_text(encoding="utf-8")
    controller = (ROOT / "src/v72/workbench-workspace.js").read_text(encoding="utf-8")
    css = (ROOT / "styles/v72-workbench.css").read_text(encoding="utf-8")
    for phrase in [
        "Compare analyses in one workspace.",
        "Choose a worked example, adjust its settings",
        "Use this workspace to compare views quickly.",
        "Open the dedicated lab when you need full model editing",
    ]:
        assert phrase in text
    for internal_phrase in ["same pure numerical cores", "Empty cards are not used", "does not maintain a second ODE solver"]:
        assert internal_phrase not in text
    for adapter_id in ["ode", "steady", "stochastic", "optimization", "agent", "statistics", "fitting", "linalg", "networks", "ml", "sciml"]:
        assert f"{adapter_id}:{{" in adapters
    assert "FokoWorkbenchAdapters" in adapters
    assert "legacyModelMap" in adapters
    assert "adapter().run(clone(state.config))" in controller
    assert "result.plots.length < 2" in controller
    assert "Registry.swapDistinctSelection" in controller
    assert "swapDistinctSelection" in adapters
    assert "selectedElsewhere" not in controller
    assert "No distinct compatible output" in controller
    assert "grid-template-rows: auto auto" in css
    assert "overflow-wrap: normal" in css
    assert "word-break: normal" in css


def test_workbench_does_not_use_dom_repair_observers_or_legacy_relocation():
    controller = (ROOT / "src/v72/workbench-workspace.js").read_text(encoding="utf-8")
    for forbidden in ["MutationObserver", "ResizeObserver", "insertBefore(", "replaceChildren("]:
        assert forbidden not in controller
    adapters = (ROOT / "src/workbench/adapters.js").read_text(encoding="utf-8")
    for core_name in ["FokoODECore", "FokoSteadyCore", "FokoStochasticCore", "FokoOptimizationCore", "FokoAgentReference", "FokoLinalgReference", "FokoNetworksReference", "FokoMLReference", "FokoSINDy"]:
        assert core_name in adapters


def test_workbench_css_is_authored_without_override_escalation():
    css = (ROOT / "styles/v72-workbench.css").read_text(encoding="utf-8")
    assert "!important" not in css
    assert "position: fixed" not in css or ".wb-toast" in css
