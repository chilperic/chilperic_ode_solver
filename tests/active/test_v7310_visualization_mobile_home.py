from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def text(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def test_home_is_model_first_without_losing_atlas_or_worked_results():
    page = text("index.html")
    for claim in [
        "From model definition to",
        "numerical evidence.",
        "Create a model",
        "Model Atlas · 259 curated models",
        "Start with the system, not a menu of methods.",
        "Continuous and stochastic dynamics",
        "Agents, space, inheritance, and evolution",
        "Data and hybrid models",
    ]:
        assert claim in page
    for retained_example in ["Reduced fatty-acid metabolism", "Population genetics", "CMA-ES", "Sobol and Morris"]:
        assert retained_example in page


def test_visualization_depth_spans_ai_statistics_and_advanced_methods():
    ai_html = text("ai-modeling.html")
    ai = text("src/v72/ai-modeling-workspace.js")
    statistics = text("src/v72/statistics-workspace.js")
    advanced = text("src/core/advanced-methods.js")
    assert "aiEquationPreview" in ai_html
    assert "katex.render" in ai
    for plot in [
        "uncertainty", "standardized", "residual-histogram", "residual-qq",
        "residual-acf", "coverage-gap", "cumulative-error", "['data', 'Input data structure']",
    ]:
        assert plot in ai
    for plot in [
        "ecdf-x", "violin-columns", "scale-location", "residual-leverage",
        "density-correlation", "group-ecdf", "bootstrap-convergence", "moving-range", "process-acf",
    ]:
        assert plot in statistics
    assert "posterior predictive" in advanced.lower()
    assert "scene:" in advanced
    assert "surface" in advanced


def test_phone_layout_exposes_tasks_and_prevents_control_overflow():
    behavior = text("src/v72/accessibility-performance.js")
    css = text("styles/v72-lab-shell.css")
    for workspace in [".v72-workspace", ".workspace-area", ".workspace"]:
        assert workspace in behavior
    assert "@media (max-width: 560px)" in css
    for contract in [
        ".advanced-grid", ".actionbar", ".plot-toolbar-v2", ".table-wrap",
        "grid-template-columns: minmax(0,1fr)", "min-height: 360px",
    ]:
        assert contract in css


def test_live_three_dimensional_and_equation_contracts_remain_platform_wide():
    for page in ["studio.html", "agent.html", "evolution.html"]:
        source = text(page)
        assert "live3d" in source.lower() or "3D" in source
        assert "katex" in source.lower()
    core = text("src/core/live-3d.js")
    assert "window.FokoLive3D" in core or "root.FokoLive3D" in core
