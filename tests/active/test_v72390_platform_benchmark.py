from __future__ import annotations

import re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
PAGES = {
    "ode.html": "src/app.js",
    "steady.html": "src/v72/steady-workspace.js",
    "stochastic.html": "src/v72/stochastic-workspace.js",
    "optimization.html": "src/v72/optimization-workspace.js",
    "statistics.html": "src/v72/statistics-workspace.js",
    "sensitivity.html": "src/v72/sensitivity-workspace.js",
    "fitting.html": "src/v72/fitting-workspace.js",
    "linear-algebra.html": "src/v72/linalg-workspace.js",
    "networks.html": "src/v72/networks-workspace.js",
    "ml.html": "src/v72/ml-workspace.js",
    "sciml.html": "src/sciml-lab.js",
    "agent.html": "src/v72/agent-workspace.js",
    "symbolic.html": "src/v72/symbolic-workspace.js",
    "workbench.html": "src/v72/workbench-workspace.js",
}


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_release_identity_and_port():
    assert '"version": "72.46.0"' in text("package.json")
    assert '"version": "72.46.0"' in text("VERSION.json")
    assert "8100" in text("package.json")
    assert "8100" in text("playwright.config.js")
    script = text("test-v72.46.0-local.sh")
    assert 'EXPECTED_VERSION="72.46.0"' in script
    assert "PORT=8100" in script
    assert "--repeat-each=3" in script
    assert "Complete 123-test browser suite" in script


def test_all_authored_workspaces_have_two_stable_plot_hosts():
    for page in PAGES:
        soup = BeautifulSoup(text(page), "html.parser")
        assert [node.get("data-plot-card") for node in soup.select("[data-plot-card]")] == ["left", "right"], page
        assert not soup.select('[data-layout-mode="three"], [data-wb-layout="three"]'), page


def test_shared_lifecycle_is_the_only_plotly_owner():
    direct = re.compile(r"(?:root\.|window\.)?Plotly\.(?:newPlot|react|purge|Plots\.resize)\s*\(")
    for controller in PAGES.values():
        assert not direct.search(text(controller)), controller
    lifecycle = text("src/v72/accessibility-performance.js")
    assert "root.Plotly.newPlot" in lifecycle
    assert "root.Plotly.react" in lifecycle
    assert "root.Plotly.purge" in lifecycle
    assert "root.Plotly.Plots.resize" in lifecycle
    assert "state.queue = state.queue" in lifecycle


def test_render_state_and_accessibility_state_are_atomic():
    lifecycle = text("src/v72/accessibility-performance.js")
    assert "function setLifecycleState(node, state, busy)" in lifecycle
    assert "node.setAttribute('aria-busy', busy ? 'true' : 'false')" in lifecycle
    for marker in (
        "setLifecycleState(node, 'rendering', true)",
        "setLifecycleState(node, 'rendered', false)",
        "setLifecycleState(node, 'failed', false)",
        "setLifecycleState(node, 'empty', false)",
    ):
        assert marker in lifecycle
    assert "removeAttribute('aria-busy')" not in lifecycle


def test_public_css_layers_are_consolidated_without_orphans():
    styles = sorted(path.name for path in (ROOT / "styles").glob("*.css"))
    assert len(styles) <= 13
    for retired in (
        "v70-4-consistency.css", "v70-5-home-nav.css", "v70-6-polish.css",
        "v70-7-unified.css", "v70-11-modeling-platform.css", "v70-19-platform-system.css",
        "agent-lab.css", "sciml-lab.css", "v70-13-header-logic.css", "v70-15-analysis-suite.css",
    ):
        assert retired not in styles
    assert "v72-public-shell.css" in styles
    assert "v72-profile-shell.css" in styles
    referenced = set()
    for page in list(ROOT.glob("*.html")) + list((ROOT / "research").glob("*.html")):
        soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
        for node in soup.select('link[rel="stylesheet"]'):
            href=(node.get("href") or "").split("?",1)[0]
            if "styles/" in href:
                referenced.add(Path(href).name)
    assert set(styles) <= referenced


def test_homepage_is_task_first_and_links_to_trust():
    home = text("index.html")
    assert "Build, test, and compare scientific models in your browser." in home
    assert "From model to evidence" in home
    assert "View methods and limitations" in home
    for phrase in ("real numerical cores", "toy tool", "verified lab adapters", "Release 72."):
        assert phrase not in home


def test_external_benchmark_covers_relevant_scientific_platforms():
    benchmark = text("BENCHMARK-v72.46.0.md")
    for product in ("VCell", "SimBiology", "COPASI", "Tellurium", "Cell Collective", "BioUML"):
        assert product in benchmark
    for dimension in ("Scientific reliability", "Platform stability", "UX", "Modern GUI"):
        assert dimension in benchmark
    assert "does **not** claim numerical or feature parity" in benchmark


def test_release_scripts_enforce_lifecycle_and_benchmark_gates():
    package = text("package.json")
    assert '"test:lifecycle": "python3 scripts/check-plot-lifecycle.py"' in package
    assert '"test:benchmark": "python3 scripts/audit-platform-benchmark.py"' in package
    assert "npm run test:lifecycle" in package
    assert "npm run test:benchmark" in package
