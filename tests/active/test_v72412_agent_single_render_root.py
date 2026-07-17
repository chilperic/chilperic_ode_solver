from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = (ROOT / "src/v72/agent-workspace.js").read_text()
E2E = (ROOT / "tests/e2e/registry-agent-animation.spec.js").read_text()
CSS = (ROOT / "styles/v72-lab-shell.css").read_text()


def test_agent_tears_down_host_before_every_final_render():
    render = SOURCE[SOURCE.index("async function renderPlot(side)"):SOURCE.index("function effectiveLayout", SOURCE.index("async function renderPlot(side)"))]
    assert "teardownPanel(side,'rendering')" in render
    assert render.index("teardownPanel(side,'rendering')") < render.index("PLOT.render(host")


def test_agent_exposes_one_explicit_render_root_contract():
    assert "function activeRenderRoots(host)" in SOURCE
    assert "function markSingleActiveRenderRoot(host, kind)" in SOURCE
    assert "agentRenderRootCount" in SOURCE
    assert "agent-panel-render-root" in SOURCE
    assert "expected one active render root" in SOURCE


def test_live_animation_and_fallback_use_custom_root_wrapper():
    assert "customRenderRoot(host, 'live-preview')" in SOURCE
    assert "customRenderRoot(host,'spatial-animation')" in SOURCE
    assert "customRenderRoot(host,'fallback-'" in SOURCE
    assert '.agent-panel-render-root[data-agent-render-kind="spatial-animation"]' in CSS


def test_browser_regression_covers_plot_lattice_and_live_transitions():
    assert "Agent replaces the previous render root across live, Plotly and lattice transitions" in E2E
    assert "expectSingleAgentRenderRoot" in E2E
    assert "spatialTypes).toEqual(['heatmap'])" in E2E
    assert "populationTypes).not.toContain('heatmap')" in E2E
    assert "data-agent-render-root-count" in E2E
