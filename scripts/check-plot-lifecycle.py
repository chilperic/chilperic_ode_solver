#!/usr/bin/env python3
"""Fail on duplicate plot ownership or unsupported multi-panel state."""
from __future__ import annotations

import re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PAGES = {
    "studio.html": "src/v73/model-studio.js",
    "ode.html": "src/app.js",
    "steady.html": "src/v72/steady-workspace.js",
    "stochastic.html": "src/v72/stochastic-workspace.js",
    "optimization.html": "src/v72/optimization-workspace.js",
    "population-genetics.html": "src/v72/population-genetics-workspace.js",
    "advanced-methods.html": "src/v72/advanced-methods-workspace.js",
    "statistics.html": "src/v72/statistics-workspace.js",
    "fitting.html": "src/v72/fitting-workspace.js",
    "linear-algebra.html": "src/v72/linalg-workspace.js",
    "networks.html": "src/v72/networks-workspace.js",
    "ml.html": "src/v72/ml-workspace.js",
    "sciml.html": "src/sciml-lab.js",
    "agent.html": "src/v72/agent-workspace.js",
    "symbolic.html": "src/v72/symbolic-workspace.js",
    "workbench.html": "src/v72/workbench-workspace.js",
    "sensitivity.html": "src/v72/sensitivity-workspace.js",
    "bifurcation.html": "src/v72/bifurcation-workspace.js",
    "evolution.html": "src/v72/evolution-landscape-workspace.js",
    "ai-modeling.html": "src/v72/ai-modeling-workspace.js",
}
DIRECT_PLOTLY = re.compile(r"(?:root\.|window\.)?Plotly\.(?:newPlot|react|purge|Plots\.resize)\s*\(")


def fail(message: str, failures: list[str]) -> None:
    failures.append(message)


def main() -> int:
    failures: list[str] = []
    lifecycle = (ROOT / "src/v72/accessibility-performance.js").read_text(encoding="utf-8")
    required = [
        "function setLifecycleState(node, state, busy)",
        "node.setAttribute('aria-busy', busy ? 'true' : 'false')",
        "setLifecycleState(node, 'rendering', true)",
        "setLifecycleState(node, 'rendered', false)",
        "setLifecycleState(node, 'failed', false)",
        "setLifecycleState(node, 'empty', false)",
        "state.queue = state.queue",
        "takeover: takeover",
    ]
    for marker in required:
        if marker not in lifecycle:
            fail(f"shared lifecycle missing: {marker}", failures)
    if "removeAttribute('aria-busy')" in lifecycle or 'removeAttribute("aria-busy")' in lifecycle:
        fail("shared lifecycle removes aria-busy instead of finalizing it as false", failures)

    for page_name, controller_name in PAGES.items():
        page_text = (ROOT / page_name).read_text(encoding="utf-8")
        controller = (ROOT / controller_name).read_text(encoding="utf-8")
        soup = BeautifulSoup(page_text, "html.parser")
        cards = soup.select("[data-plot-card]")
        sides = [card.get("data-plot-card") for card in cards]
        if sides != ["left", "right"]:
            fail(f"{page_name}: expected left/right plot cards, got {sides}", failures)
        if soup.select('[data-layout-mode="three"], [data-wb-layout="three"]'):
            fail(f"{page_name}: unsupported three-panel control remains", failures)
        sources = [node.get("src", "").split("?", 1)[0] for node in soup.select("script[src]")]
        lifecycle_src = "src/v72/accessibility-performance.js"
        if lifecycle_src not in sources:
            fail(f"{page_name}: shared lifecycle is not loaded", failures)
        elif controller_name not in sources:
            fail(f"{page_name}: expected controller {controller_name} is not loaded", failures)
        elif sources.index(lifecycle_src) > sources.index(controller_name):
            fail(f"{page_name}: lifecycle loads after its controller", failures)
        if DIRECT_PLOTLY.search(controller):
            hits = [f"{match.start()}" for match in DIRECT_PLOTLY.finditer(controller)]
            fail(f"{controller_name}: direct Plotly ownership remains at offsets {', '.join(hits[:4])}", failures)
        if re.search(r"thirdPlot|third[A-Z]?(?:Plot|Card|Side|PlotType)|plotTypes\.third|focusSide\s*[:=]\s*['\"]third|data-plot-card=[\"']third", controller):
            fail(f"{controller_name}: obsolete third-panel state remains", failures)
        if "Math.random" in controller:
            fail(f"{controller_name}: unseeded Math.random remains in an active scientific controller", failures)

    registry = (ROOT / "src/v72/scientific-registry.js").read_text(encoding="utf-8")
    if "metadata-only" not in registry:
        fail("scientific registry is not explicitly metadata-only", failures)
    for forbidden in ("addEventListener('change'", 'addEventListener("change"', ".dataset.layout =", "Plotly.Plots.resize"):
        if forbidden in registry:
            fail(f"scientific registry competes for render/layout ownership: {forbidden}", failures)

    if failures:
        print("Plot lifecycle contract failed:")
        for item in failures:
            print(" -", item)
        return 1
    print(f"Plot lifecycle contract passed: {len(PAGES)} workspaces, two stable hosts each, one Plotly owner.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
