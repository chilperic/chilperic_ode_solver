from __future__ import annotations

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
REQUIRED = {
    "index.html", "workbench.html", "ode.html", "steady.html", "stochastic.html",
    "optimization.html", "symbolic.html", "agent.html", "sciml.html", "statistics.html",
    "fitting.html", "linear-algebra.html", "networks.html", "ml.html", "examples.html",
    "docs.html", "tutorial.html", "research.html", "platform.html",
}


def test_required_public_routes_exist():
    missing = sorted(name for name in REQUIRED if not (ROOT / name).is_file())
    assert not missing


def test_public_pages_have_unique_ids_and_basic_document_structure():
    failures = []
    for path in sorted(ROOT.glob("*.html")):
        soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        ids = [node["id"] for node in soup.find_all(id=True)]
        duplicates = sorted({value for value in ids if ids.count(value) > 1})
        if not soup.title or not soup.body or duplicates:
            failures.append((path.name, bool(soup.title), bool(soup.body), duplicates))
    assert not failures


def test_all_public_navigation_uses_limited_symbolic_description():
    pages = list(ROOT.glob("*.html")) + list((ROOT / "research").glob("*.html"))
    stale = []
    for path in pages:
        text = path.read_text(encoding="utf-8", errors="ignore")
        if "Exact algebra, Jacobians and expression inspection." in text:
            stale.append(path.relative_to(ROOT).as_posix())
    assert not stale


def test_local_script_style_and_image_references_exist():
    missing = []
    pages = list(ROOT.glob("*.html")) + list((ROOT / "research").glob("*.html"))
    for path in pages:
        soup = BeautifulSoup(path.read_text(encoding="utf-8", errors="ignore"), "html.parser")
        for tag, attribute in (("script", "src"), ("link", "href"), ("img", "src")):
            for node in soup.find_all(tag):
                value = node.get(attribute)
                if not value or value.startswith(("http:", "https:", "data:", "mailto:", "#")):
                    continue
                clean = value.split("?", 1)[0].split("#", 1)[0]
                if not clean:
                    continue
                target = (path.parent / clean).resolve()
                try:
                    target.relative_to(ROOT.resolve())
                except ValueError:
                    continue
                if not target.exists():
                    missing.append((path.relative_to(ROOT).as_posix(), value))
    assert not missing
