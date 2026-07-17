from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUTHORED_PAGES = [
    "ode.html", "steady.html", "stochastic.html", "optimization.html",
    "statistics.html", "fitting.html", "linear-algebra.html", "networks.html",
    "ml.html", "sciml.html", "agent.html", "symbolic.html", "sensitivity.html", "workbench.html",
]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_central_registry_is_loaded_by_all_authored_labs():
    for page in AUTHORED_PAGES:
        source = text(page)
        assert "src/v72/scientific-registry.js?v=72.47.0" in source, page


def test_central_registry_keeps_plot_selection_separate_from_layout_ownership():
    source = text("src/v72/scientific-registry.js")
    assert "chooseDistinctSelections" in source
    assert "resolveLayout" in source
    assert "focused workspace is the sole owner" in source
    assert "metadata-only" in source
    assert "select.addEventListener('change'" not in source
    assert "MutationObserver" not in source
    assert "grid.dataset.layout =" not in source
    assert "grid.dataset.preferredLayout =" not in source
    assert "[data-layout-mode]" not in source
    assert "appendChild" not in source
    assert "new ResizeObserver" not in source


def test_agent_uses_one_animated_lattice_with_controls():
    source = text("src/v72/agent-workspace.js")
    html = text("agent.html")
    assert "renderAnimatedSpatial" in source
    assert "agent-animation-slider" in source
    assert "agent-animation-play" in source
    assert "prefers-reduced-motion" in source
    assert "startLivePreview" in source
    assert "agent-live-lattice" in source
    assert "agent-live-population" in source
    assert "not a replay of a completed run" in source
    assert "Live updates / replay frames" in html
    assert "agentLiveSpeed" in html
    assert "leftAgentPlotLegend" in html
    assert html.index("leftAgentPlotLegend") > html.index("leftAgentPlot")


def test_agent_animation_frame_count_is_bounded_and_reproducible():
    core = text("src/core/agent-reference.js")
    presets = text("src/models/agent-presets.js")
    assert "snapshotCount == null ? 24" in core
    assert "'snapshot count', 3, 80" in core
    assert "snapshotCount: 24" in presets
    assert "Math.random" not in text("src/v72/agent-workspace.js")


def test_release_exposes_only_two_or_focus_layout_controls():
    for page in AUTHORED_PAGES:
        source = text(page)
        assert 'data-layout-mode="three"' not in source, page
