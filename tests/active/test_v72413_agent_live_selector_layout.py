from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (ROOT / "src/v72/agent-workspace.js").read_text()
E2E = (ROOT / "tests/e2e/registry-agent-animation.spec.js").read_text()


def test_agent_exposes_live_views_as_explicit_dropdown_options():
    assert "label: 'Live spatial simulation'" in SOURCE
    assert "label: 'Population time curves'" in SOURCE
    assert "Agent dropdown exposes live simulation and time curves without collapsing two-up" in E2E


def test_agent_focus_binding_targets_only_real_focus_buttons():
    assert "querySelectorAll('.focus-card[data-focus-side]')" in SOURCE
    assert "querySelectorAll('[data-focus-side]').forEach(function(b){b.addEventListener('click'" not in SOURCE
    assert "event.stopPropagation()" in SOURCE


def test_live_preview_follows_selected_panel_instead_of_hardcoded_sides():
    assert "function mountLivePanel(side)" in SOURCE
    assert "refreshLivePanels(SIDES)" in SOURCE
    assert "#agentPlotGrid canvas.agent-live-lattice" in SOURCE
    assert "#agentPlotGrid canvas.agent-live-population" in SOURCE
    assert "liveCanvas($('leftAgentPlot')" not in SOURCE
    assert "liveCanvas($('rightAgentPlot')" not in SOURCE


def test_selector_transition_preserves_layout_intent_and_refreshes_live_panels():
    assert "layoutBefore=state.layout" not in SOURCE
    selector_block = SOURCE.split("SIDES.forEach(function(side){$(side+'AgentPlotType')", 1)[1].split("document.querySelectorAll('[data-layout-mode]')", 1)[0]
    assert "state.layout=" not in selector_block
    assert "renderLayout" not in selector_block
    assert "chooseLayout" not in selector_block
    assert "chooseFocus" not in selector_block
    assert "if(state.live.active&&!state.result)refreshLivePanels(changed)" in SOURCE
    assert "opening the dropdown must not trigger Focus through event bubbling" in E2E
    assert "selecting a plot must not bubble into the grid Focus action" in E2E
