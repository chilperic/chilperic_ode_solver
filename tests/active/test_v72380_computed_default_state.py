from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_home_demo_controller_is_self_contained():
    source = text("src/home-demo-reel.js")
    for declaration in [
        "function byId(id)",
        "function setText(id, value)",
        "function finite(value, digits)",
        "function loadScript(source, globalName)",
    ]:
        assert declaration in source
    assert "document.head.appendChild(script)" in source
    assert "root.setTimeout(startComputeAct, 0)" in source


def test_curated_primary_labs_open_with_computed_evidence():
    ode = text("src/app.js")
    assert "if(params.get('autorun') !== '0') window.setTimeout(function () { runDefault(); }, 0);" in ode

    steady = text("src/v72/steady-workspace.js")
    assert "if (!query.get('state') && query.get('autorun') !== '0') root.setTimeout(runSolve, 0);" in steady

    stochastic = text("src/v72/stochastic-workspace.js")
    assert "if (!hasSharedState && query.get('autorun') !== '0') root.setTimeout(runEnsemble, 0);" in stochastic

    optimization = text("src/v72/optimization-workspace.js")
    assert "if (!shared && url.searchParams.get('autorun') !== '0') root.setTimeout(runOptimization, 0);" in optimization

    statistics = text("src/v72/statistics-workspace.js")
    assert "if (!shared && url.searchParams.get('autorun') !== '0') root.setTimeout(runStatistics, 0);" in statistics


def test_shared_configs_never_auto_execute_by_default():
    assert "!query.get('state')" in text("src/v72/steady-workspace.js")
    assert "!hasSharedState" in text("src/v72/stochastic-workspace.js")
    assert "!shared" in text("src/v72/optimization-workspace.js")
    assert "!shared" in text("src/v72/statistics-workspace.js")
