#!/usr/bin/env python3
"""Static accessibility and performance gate for authored v72 pages."""
from __future__ import annotations

import json
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "VERSION.json").read_text(encoding="utf-8"))["version"]
PAGES = sorted(
    path for path in ROOT.glob("*.html")
    if 'data-v72-shell="true"' in path.read_text(encoding="utf-8", errors="ignore")
)
UNUSED_MATH_PAGES = {
    "fitting.html", "linear-algebra.html", "ml.html",
    "networks.html", "statistics.html",
}
PLOTLY = ROOT / "assets/vendor/plotly/plotly-2.35.2.min.js"


def accessible_name(node) -> bool:
    if node.get("aria-label") or node.get("aria-labelledby") or node.get("title"):
        return True
    return bool(" ".join(node.get_text(" ", strip=True).split()))


def input_is_labelled(soup: BeautifulSoup, node) -> bool:
    if node.get("type") == "hidden":
        return True
    if node.get("aria-label") or node.get("aria-labelledby"):
        return True
    if node.find_parent("label") is not None:
        return True
    node_id = node.get("id")
    return bool(node_id and soup.find("label", attrs={"for": node_id}))


def local_asset_size(src: str) -> int:
    if not src or "://" in src:
        return 0
    path = ROOT / src.split("?", 1)[0].lstrip("/")
    return path.stat().st_size if path.is_file() else 0


def audit_page(path: Path) -> list[str]:
    failures: list[str] = []
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    ids: dict[str, int] = {}
    for node in soup.find_all(id=True):
        ids[node["id"]] = ids.get(node["id"], 0) + 1
    duplicates = sorted(key for key, count in ids.items() if count > 1)
    if duplicates:
        failures.append(f"duplicate IDs: {duplicates[:8]}")

    if len(soup.find_all("h1")) != 1:
        failures.append(f"expected exactly one h1; found {len(soup.find_all('h1'))}")
    main = soup.find("main")
    if not main or not main.get("id") or main.get("tabindex") != "-1":
        failures.append("main landmark must have stable id and tabindex=-1")
    skip = soup.find("a", class_="skip-link")
    if not skip or not main or skip.get("href") != f"#{main.get('id')}":
        failures.append("skip link does not target the main landmark")
    nav = soup.find("nav", attrs={"aria-label": True})
    central_shell = (
        soup.find("header", attrs={"data-v76-appbar": "true"}) is not None
        and soup.find("script", src=lambda value: value and "v76/app-shell.js" in value) is not None
    )
    if nav is None and not central_shell:
        failures.append("primary navigation lacks an accessible label")

    unlabeled = [
        node.get("id") or node.name
        for node in soup.find_all(["input", "select", "textarea"])
        if not input_is_labelled(soup, node)
    ]
    if unlabeled:
        failures.append(f"unlabelled controls: {unlabeled[:10]}")
    unnamed_buttons = [
        node.get("id") or "button"
        for node in soup.find_all("button")
        if not accessible_name(node)
    ]
    if unnamed_buttons:
        failures.append(f"unnamed buttons: {unnamed_buttons[:10]}")
    missing_alt = [node.get("src", "img") for node in soup.find_all("img") if node.get("alt") is None]
    if missing_alt:
        failures.append(f"images without alt: {missing_alt[:8]}")

    external_scripts = soup.find_all("script", src=True)
    blocking = [node.get("src") for node in external_scripts if not (node.has_attr("defer") or node.has_attr("async"))]
    if blocking:
        failures.append(f"parser-blocking scripts: {blocking[:8]}")
    if soup.find("link", rel=lambda value: value and "preload" in value, href=lambda value: value and "plotly" in value):
        failures.append("Plotly must not be eagerly preloaded")
    if not soup.find("link", href=lambda value: value and "v72-accessibility-performance.css" in value):
        failures.append("shared accessibility stylesheet missing")
    if not soup.find("script", src=lambda value: value and "v72/accessibility-performance.js" in value):
        failures.append("shared accessibility runtime missing")
    if soup.find(attrs={"data-layout-mode": "three"}):
        failures.append("3-up plot mode is not permitted in the reliability-first shell")

    references = [(node.get("src") or "") for node in external_scripts]
    if path.name in UNUSED_MATH_PAGES and any("vendor/mathjs" in ref or "vendor/katex" in ref for ref in references):
        failures.append("page loads unused math rendering dependencies")

    # Plot pages may load the 4.4 MB vendored Plotly build, but all other page-specific
    # JavaScript must remain below a bounded budget. This prevents silent payload growth.
    js_bytes = sum(local_asset_size(ref) for ref in references)
    plotly_bytes = PLOTLY.stat().st_size if any("vendor/plotly" in ref for ref in references) else 0
    page_specific = js_bytes - plotly_bytes
    math_pages = {"ode.html", "steady.html", "stochastic.html", "optimization.html", "sensitivity.html", "sciml.html", "symbolic.html", "bifurcation.html", "agent.html", "evolution.html", "studio.html"}
    budget = 1_250_000 if path.name == "workbench.html" else (1_200_000 if path.name in math_pages else 900_000)
    if page_specific > budget:
        failures.append(f"page-specific JavaScript {page_specific} bytes exceeds {budget}")
    script_limit = 21 if path.name == "workbench.html" else (14 if path.name in {"ode.html", "sensitivity.html", "studio.html"} else 13)
    if len(external_scripts) > script_limit:
        failures.append(f"script count {len(external_scripts)} exceeds page budget {script_limit}")
    return failures


def main() -> int:
    failures: list[str] = []
    for page in PAGES:
        page_failures = audit_page(page)
        failures.extend(f"{page.name}: {message}" for message in page_failures)
    if failures:
        print("Accessibility/performance audit failed:")
        for failure in failures:
            print(" -", failure)
        return 1
    print(f"{len(PAGES)} authored v72 pages passed accessibility and performance budgets for {VERSION}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
