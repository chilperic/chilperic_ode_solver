from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AGENT = (ROOT / "src/v72/agent-workspace.js").read_text()
ODE = (ROOT / "src/v72/ode-workspace.js").read_text()
WORKSPACES = [
    ROOT / "src/sciml-lab.js",
    ROOT / "src/v72/agent-workspace.js",
    ROOT / "src/v72/fitting-workspace.js",
    ROOT / "src/v72/linalg-workspace.js",
    ROOT / "src/v72/ml-workspace.js",
    ROOT / "src/v72/networks-workspace.js",
    ROOT / "src/v72/optimization-workspace.js",
    ROOT / "src/v72/statistics-workspace.js",
    ROOT / "src/v72/steady-workspace.js",
    ROOT / "src/v72/stochastic-workspace.js",
    ROOT / "src/v72/symbolic-workspace.js",
    ROOT / "src/v72/sensitivity-workspace.js",
    ROOT / "src/v72/bifurcation-workspace.js",
    ROOT / "src/v72/evolution-landscape-workspace.js",
    ROOT / "src/v72/ai-modeling-workspace.js",
]

def test_agent_uses_ode_preferred_effective_layout_contract():
    assert "FokoLayoutStability.effectiveLayout(state.layout" in AGENT
    assert "FokoLayoutStability.apply" in AGENT
    assert "focusButtons:'.focus-card[data-focus-side]'" in AGENT
    assert "function chooseLayout(layout)" in AGENT
    assert "function chooseFocus(side)" in AGENT

def test_agent_plot_selection_never_invokes_layout_transition():
    selector_block = AGENT.split("SIDES.forEach(function(side){$(side+'AgentPlotType')", 1)[1].split("document.querySelectorAll('[data-layout-mode]')", 1)[0]
    assert "chooseLayout" not in selector_block
    assert "chooseFocus" not in selector_block
    assert "renderLayout" not in selector_block
    assert "state.layout=" not in selector_block

def test_only_explicit_focus_buttons_receive_focus_click_handlers():
    forbidden = "querySelectorAll('[data-focus-side]').forEach"
    for path in WORKSPACES:
        source = path.read_text()
        assert forbidden not in source, path.name
        assert ".focus-card[data-focus-side]" in source, path.name

def test_agent_layout_is_persisted_only_by_explicit_layout_actions():
    assert "const LAYOUT_STORAGE_KEY = 'fokolab:v72:agent-layout'" in AGENT
    assert "persistLayout();\n    return renderLayout(true);" in AGENT
    assert "safeStoredLayout();renderLayout(false)" in AGENT

def test_route_browser_contract_clicks_selectors_before_changing_values():
    spec = (ROOT / "tests/e2e/registry-agent-animation.spec.js").read_text()
    assert "opening a plot selector must not enter Focus" in spec
    assert "opening the second selector must not enter Focus" in spec
