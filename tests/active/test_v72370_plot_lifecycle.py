from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")

def test_shared_plot_lifecycle_serializes_plotly_per_host():
    source = text("src/v72/accessibility-performance.js")
    assert "state.queue = state.queue" in source
    assert "await afterLayout()" in source
    assert "root.Plotly.react" in source
    assert "root.Plotly.newPlot" in source
    assert "node.replaceChildren()" in source
    assert "node.innerHTML" not in source

def test_primary_workspaces_have_exactly_two_plot_cards():
    for page in ["ode.html", "steady.html", "stochastic.html", "optimization.html", "statistics.html"]:
        html = text(page)
        assert html.count('data-plot-card="left"') == 1, page
        assert html.count('data-plot-card="right"') == 1, page
        assert 'data-plot-card="third"' not in html, page
        assert 'id="thirdPlot"' not in html, page
        assert 'id="thirdPlotType"' not in html, page
        assert "src/v72/accessibility-performance.js" in html, page
        assert "src/v72/plot-lifecycle.js" not in html, page

def test_primary_controllers_do_not_clear_plotly_dom_before_react():
    for path in ["src/app.js", "src/v72/steady-workspace.js", "src/v72/stochastic-workspace.js", "src/v72/optimization-workspace.js", "src/v72/statistics-workspace.js"]:
        source = text(path)
        assert "thirdPlot" not in source, path
        assert "thirdPlotType" not in source, path
    assert "host.innerHTML = ''" not in text("src/v72/statistics-workspace.js")
    ode_render = text("src/app.js").split("function renderPlot(side)", 1)[1].split("function PLOT_LABEL", 1)[0]
    assert "el.innerHTML=''" not in ode_render

def test_home_worker_tasks_are_isolated_and_bounded():
    source = text("src/home-demo-reel.js")
    assert "const taskWorker = new Worker" in source
    assert "taskWorker.terminate()" in source
    assert "Home demonstration exceeded its bounded runtime" in source
    assert "root.setTimeout(startComputeAct, 0)" in source
