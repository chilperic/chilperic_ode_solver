#!/usr/bin/env python3
"""Audit the shared plot geometry, control sizing, and Steady/Symbolic depth contract."""
from __future__ import annotations

import re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "studio.html",
    "ode.html", "steady.html", "stochastic.html", "optimization.html", "population-genetics.html", "advanced-methods.html",
    "statistics.html", "fitting.html", "linear-algebra.html", "networks.html",
    "ml.html", "sciml.html", "agent.html", "symbolic.html", "workbench.html",
    "sensitivity.html", "bifurcation.html", "evolution.html", "ai-modeling.html",
]


def main() -> int:
    failures: list[str] = []
    lifecycle = (ROOT / "src/v72/accessibility-performance.js").read_text(encoding="utf-8")
    css = (ROOT / "styles/v72-lab-shell.css").read_text(encoding="utf-8")
    steady_html = (ROOT / "steady.html").read_text(encoding="utf-8")
    symbolic_html = (ROOT / "symbolic.html").read_text(encoding="utf-8")
    steady_controller = (ROOT / "src/v72/steady-workspace.js").read_text(encoding="utf-8")
    symbolic_controller = (ROOT / "src/v72/symbolic-workspace.js").read_text(encoding="utf-8")
    steady_presets = (ROOT / "src/models/steady-presets.js").read_text(encoding="utf-8")
    symbolic_presets = (ROOT / "src/models/symbolic-presets.js").read_text(encoding="utf-8")

    normalizer_markers = [
        "function normalisePlotLayout(host, traces, layout)",
        "root.FokoPlotLayout = Object.freeze",
        "args[2] = root.FokoPlotLayout.normalize(host, args[1], args[2])",
        "fokoPlotTitle",
        "next.automargin = true",
    ]
    for marker in normalizer_markers:
        if marker not in lifecycle:
            failures.append(f"shared Plotly normalizer missing: {marker}")

    css_markers = [
        ".actionbar > button",
        "min-height: 46px",
        "align-items: center",
        "white-space: normal",
        ".chart-card .plot .gtitle",
    ]
    for marker in css_markers:
        if marker not in css:
            failures.append(f"shared control/plot CSS missing: {marker}")

    for page_name in PAGES:
        soup = BeautifulSoup((ROOT / page_name).read_text(encoding="utf-8"), "html.parser")
        sources = [node.get("src", "").split("?", 1)[0] for node in soup.select("script[src]")]
        if "src/v72/accessibility-performance.js" not in sources:
            failures.append(f"{page_name}: shared plot normalizer/lifecycle is not loaded")
        cards = soup.select("[data-plot-card]")
        if len(cards) != 2:
            failures.append(f"{page_name}: expected two plot cards, found {len(cards)}")

    steady_required_ids = ["steadyExampleSearch", "steadyFamilyFilter", "steadyExampleCount"]
    symbolic_required_ids = ["symbolicExampleSearch", "symbolicFamilyFilter", "symbolicExampleCount"]
    for element_id in steady_required_ids:
        if f'id="{element_id}"' not in steady_html:
            failures.append(f"steady.html missing example-browser control #{element_id}")
    for element_id in symbolic_required_ids:
        if f'id="{element_id}"' not in symbolic_html:
            failures.append(f"symbolic.html missing example-browser control #{element_id}")

    if "root.setTimeout(runSolve, 0)" not in steady_controller:
        failures.append("Steady-State example selection does not auto-solve")
    if "loadPreset(this.value, true)" not in symbolic_controller:
        failures.append("Symbolic example selection does not auto-analyze")

    steady_count = len(re.findall(r"^\s{4}'[^']+':\s*\{", steady_presets, flags=re.MULTILINE))
    symbolic_count = len(re.findall(r"^\s{4}[a-zA-Z0-9_-]+:\s*\{", symbolic_presets, flags=re.MULTILINE))
    if steady_count < 26:
        failures.append(f"Steady-State library too small: {steady_count} examples")
    if symbolic_count < 20:
        failures.append(f"Symbolic library too small: {symbolic_count} examples")

    visual_script = ROOT / "scripts/check-plot-steady-symbolic-offline.js"
    if not visual_script.exists():
        failures.append("offline Chromium visual/computation contract is missing")
    else:
        visual_text = visual_script.read_text(encoding="utf-8")
        for marker in ("assertPlotGeometry", "steadyContract", "symbolicContract", "assertActionButtonsNotClipped"):
            if marker not in visual_text:
                failures.append(f"offline Chromium contract missing: {marker}")

    if failures:
        print("Plot/control/computation audit failed:")
        for failure in failures:
            print(" -", failure)
        return 1

    print(
        "Plot/control/computation audit passed: "
        f"{len(PAGES)} workspaces use the shared geometry contract; "
        f"Steady-State exposes {steady_count} examples and Symbolic exposes {symbolic_count}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
