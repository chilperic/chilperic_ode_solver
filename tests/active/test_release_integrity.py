from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPECTED = "72.46.0"


def iter_release_sources():
    excluded = {"tests", "release-audits", "dist", "node_modules", ".venv", ".git"}
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in excluded for part in path.relative_to(ROOT).parts):
            continue
        if path.suffix.lower() in {".html", ".js", ".css", ".json"}:
            yield path


def test_version_sources_are_consistent():
    version = json.loads((ROOT / "VERSION.json").read_text())
    package = json.loads((ROOT / "package.json").read_text())
    capabilities = json.loads((ROOT / "CAPABILITIES.json").read_text())
    assert version == {"version": EXPECTED, "token": EXPECTED}
    assert package["version"] == EXPECTED
    assert capabilities["release"] == EXPECTED


def test_all_static_cache_tokens_are_current():
    found = set()
    locations = []
    token_re = re.compile(r"\?v=([0-9]+(?:\.[0-9]+){1,3})")
    for path in iter_release_sources():
        for match in token_re.finditer(path.read_text(encoding="utf-8", errors="ignore")):
            found.add(match.group(1))
            locations.append((path, match.group(1)))
    assert found, "No release cache tokens found"
    assert found == {EXPECTED}, locations[:20]


def test_runtime_release_constants_are_current():
    versioned_runtime_files = [
        ROOT / "src/platform/compute-bus.js",
        ROOT / "src/v71-platform.js",
        ROOT / "src/fokokit.js",
        ROOT / "src/worker.js",
    ]
    controller_files = [
        ROOT / "src/v72/ode-workspace.js",
        ROOT / "src/v72/steady-workspace.js",
        ROOT / "src/v72/stochastic-workspace.js",
        ROOT / "src/v72/optimization-workspace.js",
        ROOT / "src/v72/statistics-workspace.js",
        ROOT / "src/v72/fitting-workspace.js",
        ROOT / "src/v72/linalg-workspace.js",
        ROOT / "src/v72/networks-workspace.js",
        ROOT / "src/v72/ml-workspace.js",
        ROOT / "src/v72/agent-workspace.js",
        ROOT / "src/v72/workbench-workspace.js",
        ROOT / "src/v72/symbolic-workspace.js",
        ROOT / "src/v72/sensitivity-workspace.js",
    ]
    stale_release = re.compile(r"release\s*:\s*['\"](?!" + re.escape(EXPECTED) + r")[0-9]+(?:\.[0-9]+){2,3}['\"]")
    for path in versioned_runtime_files:
        text = path.read_text()
        assert EXPECTED in text
        assert "71.46.0" not in text
        assert stale_release.search(text) is None, path
    for path in controller_files:
        assert stale_release.search(path.read_text()) is None, path


def test_generated_and_environment_files_are_absent():
    forbidden_dirs = {".venv", "venv", "__pycache__", ".pytest_cache"}
    bad = []
    for path in ROOT.rglob("*"):
        rel = path.relative_to(ROOT)
        if "tests" not in rel.parts and (any(part in forbidden_dirs for part in rel.parts) or path.suffix in {".pyc", ".pyo"}):
            bad.append(rel.as_posix())
    assert not bad, bad[:20]


def test_v72_css_is_authored_without_override_escalation():
    css_paths = [ROOT / "styles/v72-tokens.css", ROOT / "styles/v72-lab-shell.css"]
    for path in css_paths:
        text = path.read_text()
        assert "!important" not in text


def test_v72_controller_does_not_restructure_the_dom_after_load():
    controllers = [ROOT / "src/v72/ode-workspace.js", ROOT / "src/v72/steady-workspace.js", ROOT / "src/v72/stochastic-workspace.js", ROOT / "src/v72/optimization-workspace.js", ROOT / "src/v72/statistics-workspace.js", ROOT / "src/v72/fitting-workspace.js", ROOT / "src/v72/linalg-workspace.js", ROOT / "src/v72/networks-workspace.js", ROOT / "src/v72/ml-workspace.js", ROOT / "src/v72/agent-workspace.js", ROOT / "src/v72/workbench-workspace.js", ROOT / "src/v72/symbolic-workspace.js", ROOT / "src/v72/sensitivity-workspace.js"]
    forbidden = ["MutationObserver", "ResizeObserver", "insertBefore(", "replaceChildren("]
    for path in controllers:
        text = path.read_text()
        for token in forbidden:
            assert token not in text, (path.name, token)
        # A controller may attach a renderer-owned canvas inside an existing plot host,
        # but it must never rebuild the page shell or append arbitrary nodes to body.
        assert "document.body.appendChild" not in text, path.name
        assert "document.querySelector('.v72-shell').appendChild" not in text, path.name
        assert 'document.querySelector(".v72-shell").appendChild' not in text, path.name


def test_scientific_runtime_dependencies_are_vendored():
    required = [
        ROOT / "assets/vendor/plotly/plotly-2.35.2.min.js",
        ROOT / "assets/vendor/mathjs/math-15.2.0.js",
        ROOT / "assets/vendor/katex/katex-0.16.47.min.js",
        ROOT / "assets/vendor/katex/katex-0.16.47.min.css",
    ]
    assert all(path.is_file() and path.stat().st_size > 1000 for path in required)
    html = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in ROOT.glob("*.html"))
    assert "cdn.plot.ly" not in html
    assert "cdn.jsdelivr.net/npm/katex" not in html
    assert "cdn.jsdelivr.net/npm/mathjs" not in html
    worker = (ROOT / "src/worker.js").read_text()
    assert "cdn.jsdelivr.net" not in worker
    assert "../assets/vendor/mathjs/math-15.2.0.js?v=72.46.0" in worker


def test_v72_dropdown_is_opaque_and_not_overridden_by_legacy_runtime_css():
    css = (ROOT / "styles/v72-tokens.css").read_text()
    nav = (ROOT / "src/navigation.js").read_text()
    assert "--panel: var(--surface);" in css
    assert "--text: var(--ink);" in css
    assert "background: #ffffff;" in css
    assert "z-index: 1010;" in css
    assert ".nav-menu:not([open]) > .labs-menu-panel { display: none; }" in css
    assert 'Runtime style injection previously created another override layer' in nav
    assert 'injectUnifiedNavStyles()' in nav
    body = nav[nav.index('function injectUnifiedNavStyles()'):nav.index('function injectThemeControl()')]
    assert 'return;' in body
    assert 'createElement' not in body
