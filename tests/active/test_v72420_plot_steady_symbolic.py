from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_one_plot_geometry_normalizer_owns_all_plotly_calls():
    shared = text("src/v72/accessibility-performance.js")
    assert "root.FokoPlotLayout = Object.freeze" in shared
    assert "args[2] = root.FokoPlotLayout.normalize(host, args[1], args[2])" in shared
    assert "next.title = { text: '' }" in shared
    assert "yanchor: 'bottom'" in shared
    assert "margin.b = Math.max(72" in shared
    assert "next.automargin = true" in shared


def test_action_controls_expand_instead_of_clipping_text():
    css = text("styles/v72-lab-shell.css")
    system = text("styles/v76-system.css")
    assert ".actionbar > button" in css
    assert "min-height: 46px" in css
    assert "white-space: normal" in css
    assert "overflow: visible" in css
    assert ".actionbar > .file-label" in system
    assert "min-height: 44px !important" in system


def test_steady_examples_are_visible_searchable_and_compute_on_selection():
    html = text("steady.html")
    controller = text("src/v72/steady-workspace.js")
    presets = text("src/models/steady-presets.js")
    for control in ("steadyExampleSearch", "steadyFamilyFilter", "steadyExampleCount"):
        assert f'id="{control}"' in html
    assert '<details class="example-browser" open="">' in html or '<details class="example-browser" open>' in html
    assert "root.setTimeout(runSolve, 0)" in controller
    for name in ("FitzHugh–Nagumo resting equilibrium", "MAPK two-tier activation equilibrium", "Repressilator symmetric equilibrium", "Goodwin feedback equilibrium", "Autocatalytic activation switch"):
        assert name in presets


def test_symbolic_examples_are_searchable_and_analyze_on_selection():
    html = text("symbolic.html")
    controller = text("src/v72/symbolic-workspace.js")
    presets = text("src/models/symbolic-presets.js")
    for control in ("symbolicExampleSearch", "symbolicFamilyFilter", "symbolicExampleCount"):
        assert f'id="{control}"' in html
    assert "loadPreset(this.value, true)" in controller
    for key in ("repressilator", "goodwin", "mapk", "cstr"):
        assert f"    {key}: {{" in presets


def test_offline_visual_gate_is_release_blocking():
    package = text("package.json")
    build = text("scripts/build-release.py")
    assert '"test:visual-contracts-offline"' in package
    assert 'test:visual-contracts-offline' in build


def test_optimization_and_stochastic_coalesce_overlapping_plot_requests():
    for controller in (
        "src/v72/optimization-workspace.js",
        "src/v72/stochastic-workspace.js",
    ):
        source = text(controller)
        assert "let plotRenderRevision = 0" in source
        assert "const revision = ++plotRenderRevision" in source
        assert "root.FokoPlotLifecycle.afterLayout()" in source
        assert "revision !== plotRenderRevision" in source
        assert "Promise.all" in source


def test_visual_gate_reports_the_exact_lab_and_terminal_plot_state():
    gate = text("scripts/check-plot-steady-symbolic-offline.js")
    assert "async function waitForRenderedPair" in gate
    assert "plot rendering failed" in gate
    assert "plots did not reach the rendered state" in gate
    assert "${spec.label} (${spec.file}) contract failed" in gate
    assert "runtimeErrors" in gate
