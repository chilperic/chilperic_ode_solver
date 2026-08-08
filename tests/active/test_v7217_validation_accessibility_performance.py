from __future__ import annotations

import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = "77.4.1"
V72_PAGES = [
    path for path in ROOT.glob("*.html")
    if 'data-v72-shell="true"' in path.read_text(encoding="utf-8", errors="ignore")
]


def soup(path: Path) -> BeautifulSoup:
    return BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")


def test_validation_release_metadata_and_artifacts_exist():
    assert json.loads((ROOT / "VERSION.json").read_text()) == {"version": EXPECTED, "token": EXPECTED}
    for name in [
        "VALIDATION_MATRIX.json",
        "PERFORMANCE_BUDGETS.json",
        "ACCESSIBILITY_CONTRACT.md",
        "REFERENCE_VALIDATION.md",
        "src/v72/accessibility-performance.js",
        "styles/v72-accessibility-performance.css",
        "scripts/audit-accessibility-performance.py",
        "scripts/run-reference-validation.py",
        "scripts/reference-probe.js",
    ]:
        assert (ROOT / name).is_file(), name


def test_authored_pages_have_landmarks_skip_links_and_one_h1():
    assert len(V72_PAGES) >= 14
    for page in V72_PAGES:
        doc = soup(page)
        main = doc.find("main")
        assert main and main.get("id") and main.get("tabindex") == "-1", page.name
        skip = doc.find("a", class_="skip-link")
        assert skip and skip.get("href") == f"#{main['id']}", page.name
        assert len(doc.find_all("h1")) == 1, page.name
        assert doc.find("header", attrs={"data-v76-appbar": "true"}), page.name
        assert doc.find("script", src=lambda value: value and "v76/app-shell.js" in value), page.name


def test_authored_pages_do_not_parser_block_or_preload_plotly():
    for page in V72_PAGES:
        doc = soup(page)
        for script in doc.find_all("script", src=True):
            assert script.has_attr("defer") or script.has_attr("async"), (page.name, script.get("src"))
        assert not doc.find("link", rel=lambda value: value and "preload" in value, href=lambda value: value and "plotly" in value), page.name
        assert doc.find("script", src=lambda value: value and "v72/accessibility-performance.js" in value), page.name
        assert doc.find("link", href=lambda value: value and "v72-accessibility-performance.css" in value), page.name


def test_unused_math_dependencies_are_removed_from_non_symbolic_pages():
    pages = ["fitting.html", "linear-algebra.html", "ml.html", "networks.html", "statistics.html"]
    for name in pages:
        text = (ROOT / name).read_text()
        assert "assets/vendor/mathjs/" not in text, name
        assert "assets/vendor/katex/" not in text, name
    agent = (ROOT / "agent.html").read_text()
    assert "agentEquationPreview" in agent
    assert "assets/vendor/katex/katex-0.16.47.min.js" in agent


def test_accessibility_runtime_wraps_plot_rendering_and_exposes_telemetry():
    text = (ROOT / "src/v72/accessibility-performance.js").read_text()
    assert "aria-busy" in text
    assert "aria-label" in text
    assert "foko:plot-rendered" in text
    assert "FokoPerformance" in text
    assert "PerformanceObserver" in text
    assert "Plotly[method]" in text
    assert "MutationObserver" not in text
    assert "ResizeObserver" not in text


def test_accessibility_css_has_focus_reduced_motion_and_no_override_escalation():
    text = (ROOT / "styles/v72-accessibility-performance.css").read_text()
    assert ".skip-link" in text
    assert ":focus-visible" in text
    assert "prefers-reduced-motion" in text
    assert "prefers-contrast" in text
    assert "forced-colors" in text
    assert "container-type: inline-size" in text
    assert "!important" not in text


def test_reliability_first_shell_has_no_public_three_panel_controls():
    for page in V72_PAGES:
        doc = soup(page)
        assert not doc.find(attrs={"data-layout-mode": "three"}), page.name
        assert not doc.find(attrs={"data-wb-layout": "three"}), page.name


def test_version_tokens_are_current_in_new_assets():
    paths = [
        ROOT / "styles/v72-accessibility-performance.css",
        ROOT / "src/v72/accessibility-performance.js",
        ROOT / "scripts/audit-accessibility-performance.py",
    ]
    stale = re.compile(r"72\.(?:1[0-6]|[0-9])\.0")
    for path in paths:
        assert not stale.search(path.read_text()), path.name


def test_layout_switch_arrow_navigation_moves_focus_without_owning_layout():
    source = (ROOT / 'src/v72/accessibility-performance.js').read_text(encoding='utf-8')
    assert "wireArrowNavigation('.v72-layout-switch', 'button')" in source
    assert "items[next].focus()" in source
