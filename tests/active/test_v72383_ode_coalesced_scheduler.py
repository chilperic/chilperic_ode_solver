from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_ode_plot_scheduler_coalesces_sides_instead_of_cancelling_other_panel():
    app = text('src/app.js')
    assert 'const pendingPlotSides = new Set();' in app
    assert 'let plotScheduleQueued = false;' in app
    assert "const requested=Array.isArray(requestedSides)?requestedSides:['left','right'];" in app
    assert "pendingPlotSides.add(side)" in app
    assert 'const sides=Array.from(pendingPlotSides);' in app
    assert 'pendingPlotSides.clear();' in app
    assert "sides.filter(side=>visible.includes(side)).forEach(renderPlot);" in app
    assert 'plotScheduleToken' not in app
    assert 'token!==plotScheduleToken' not in app


def test_single_selector_updates_remain_panel_local_without_dropping_pending_sibling():
    app = text('src/app.js')
    assert "scheduleVisiblePlots(['left'])" in app
    assert "scheduleVisiblePlots(['right'])" in app
    # The coalescing queue must return early without clearing already pending sides.
    scheduler = app.split('function scheduleVisiblePlots(requestedSides){', 1)[1].split('function renderPlots()', 1)[0]
    assert 'if(plotScheduleQueued) return;' in scheduler
    assert scheduler.index('pendingPlotSides.add(side)') < scheduler.index('if(plotScheduleQueued) return;')
