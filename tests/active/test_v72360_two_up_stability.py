from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_ode_has_exactly_two_stable_plot_cards():
    html = text('ode.html')
    assert html.count('data-plot-card="left"') == 1
    assert html.count('data-plot-card="right"') == 1
    assert 'data-plot-card="third"' not in html
    assert 'id="thirdPlot"' not in html
    assert 'id="thirdPlotType"' not in html


def test_ode_plot_selection_does_not_rerender_every_panel():
    app = text('src/app.js')
    assert "scheduleVisiblePlots(['left'])" in app
    assert "scheduleVisiblePlots(['right'])" in app
    assert "function visiblePlotSides()" in app
    assert "function scheduleVisiblePlots(requestedSides)" in app
    assert "function renderPlots(){ scheduleVisiblePlots(); }" in app
    assert "function resetPlotNode" not in app
    assert "function forcePlotVisible" not in app
    assert "const plotObservers" not in app


def test_ode_clear_keeps_existing_plot_hosts():
    app = text('src/app.js')
    clear = app.split('function clearPlots()', 1)[1].split('function openPlotConfig', 1)[0]
    assert 'replaceWith' not in clear
    assert "['leftPlot','rightPlot']" in clear
    assert 'FokoPlotLifecycle.clear' in clear


def test_layout_state_has_one_owner_and_no_third_mode():
    workspace = text('src/v72/ode-workspace.js')
    assert "new Set(['two', 'focus'])" in workspace
    assert "new Set(['left', 'right'])" in workspace
    assert "foko:layout-change" in workspace
    assert 'availableThird' not in workspace
    assert "focusSide = 'third'" not in workspace


def test_registry_is_metadata_only_on_plot_changes():
    registry = text('src/v72/scientific-registry.js')
    assert "select.addEventListener('change'" not in registry
    assert "addEventListener('change', onSelectChange" not in registry
    assert 'resizeVisiblePlots' not in registry
    assert 'root.Plotly.Plots.resize' not in registry
    assert 'metadata-only' in registry


def test_home_first_act_does_not_depend_only_on_intersection_observer():
    reel = text('src/home-demo-reel.js')
    assert "root.setTimeout(startComputeAct, 0)" in reel
    assert "const taskWorker = new Worker" in reel
    assert "const computeNames = ['ode', 'steady', 'stochastic', 'agent']" in reel


def test_all_focused_workspaces_render_only_visible_sides():
    paths = [
        'src/v72/steady-workspace.js',
        'src/v72/stochastic-workspace.js',
        'src/v72/optimization-workspace.js',
        'src/v72/statistics-workspace.js',
        'src/v72/fitting-workspace.js',
        'src/v72/linalg-workspace.js',
        'src/v72/networks-workspace.js',
        'src/v72/ml-workspace.js',
        'src/v72/agent-workspace.js',
        'src/v72/symbolic-workspace.js',
        'src/sciml-lab.js',
        'src/v72/workbench-workspace.js',
    ]
    for path in paths:
        source = text(path)
        assert ('requestAnimationFrame' in source or
                'FokoPlotLifecycle.afterLayout' in source), path
        assert ('visiblePlotSides' in source or 'visibleMlSides' in source or
                'visibleSciSides' in source or 'visibleSides' in source or
                "dataset.layout==='focus'" in source or "dataset.layout === 'focus'" in source), path
