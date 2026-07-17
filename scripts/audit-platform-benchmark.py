#!/usr/bin/env python3
"""Measurable release benchmark for reliability, stability, UX and GUI hygiene."""
from __future__ import annotations

import json
import re
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "VERSION.json").read_text(encoding="utf-8"))["version"]
ACTIVE_PAGES = [
    "ode.html", "steady.html", "stochastic.html", "optimization.html", "statistics.html",
    "fitting.html", "linear-algebra.html", "networks.html", "ml.html", "sciml.html",
    "agent.html", "symbolic.html", "workbench.html", "sensitivity.html",
]
PUBLIC_PAGES = ["index.html", "docs.html", "tutorial.html", "trust.html", "research.html", "contact.html", "acknowledgement.html", "beauty.html", "cv.html"]


def main() -> int:
    checks: list[tuple[str, bool, str]] = []
    runtime_tokens = set()
    token_pattern = re.compile(r"\?v=([0-9]+(?:\.[0-9]+)+)")
    for pattern in ("*.html", "src/**/*.js", "styles/*.css"):
        for path in ROOT.glob(pattern):
            runtime_tokens.update(token_pattern.findall(path.read_text(encoding="utf-8", errors="ignore")))
    checks.append(("One runtime cache token", runtime_tokens == {VERSION}, str(sorted(runtime_tokens))))

    styles = sorted((ROOT / "styles").glob("*.css"))
    checks.append(("Bounded stylesheet inventory", len(styles) <= 13, f"{len(styles)} files (limit 13)"))
    legacy = [p.name for p in styles if re.match(r"v70-(?:4|5|6|7|11|13|15|19)-", p.name)]
    checks.append(("Retired version-layer styles absent", not legacy, ", ".join(legacy) or "none"))

    referenced_styles: set[str] = set()
    max_public_css = 0
    for page in ROOT.glob("*.html"):
        soup = BeautifulSoup(page.read_text(encoding="utf-8"), "html.parser")
        refs = [(node.get("href") or "").split("?", 1)[0] for node in soup.select('link[rel="stylesheet"]')]
        referenced_styles.update(Path(ref).name for ref in refs if ref.startswith("styles/"))
        if page.name in PUBLIC_PAGES:
            max_public_css = max(max_public_css, len(refs))
    orphans = [p.name for p in styles if p.name not in referenced_styles]
    checks.append(("No orphan stylesheet", not orphans, ", ".join(orphans) or "none"))
    checks.append(("Public pages use a compact CSS stack", max_public_css <= 5, f"maximum {max_public_css} requests"))

    card_failures = []
    script_order_failures = []
    for page_name in ACTIVE_PAGES:
        soup = BeautifulSoup((ROOT / page_name).read_text(encoding="utf-8"), "html.parser")
        sides = [node.get("data-plot-card") for node in soup.select("[data-plot-card]")]
        if sides != ["left", "right"]:
            card_failures.append(f"{page_name}:{sides}")
        sources = [str(node.get("src") or "").split("?", 1)[0] for node in soup.select("script[src]")]
        if "src/v72/accessibility-performance.js" not in sources:
            script_order_failures.append(f"{page_name}:missing lifecycle")
    checks.append(("All workspaces expose exactly two plot hosts", not card_failures, "; ".join(card_failures) or f"{len(ACTIVE_PAGES)}/{len(ACTIVE_PAGES)}"))
    checks.append(("All workspaces load shared render lifecycle", not script_order_failures, "; ".join(script_order_failures) or f"{len(ACTIVE_PAGES)}/{len(ACTIVE_PAGES)}"))

    lifecycle = (ROOT / "src/v72/accessibility-performance.js").read_text(encoding="utf-8")
    state_truth = all(marker in lifecycle for marker in [
        "setLifecycleState(node, 'rendering', true)",
        "setLifecycleState(node, 'rendered', false)",
        "setLifecycleState(node, 'failed', false)",
        "setLifecycleState(node, 'empty', false)",
    ]) and "removeAttribute('aria-busy')" not in lifecycle
    checks.append(("Render state and accessibility state finish together", state_truth, "rendered/failed/empty => aria-busy=false"))

    home = (ROOT / "index.html").read_text(encoding="utf-8")
    public_noise = [phrase for phrase in ["real numerical cores", "toy tool", "pure numerical cores", "verified lab adapters", "Release 72."] if phrase in home]
    checks.append(("Homepage uses task-first public language", not public_noise, ", ".join(public_noise) or "clean"))
    checks.append(("Trust page is first-class", (ROOT / "trust.html").exists() and 'href="trust.html"' in home, "linked from home"))

    capabilities = json.loads((ROOT / "CAPABILITIES.json").read_text(encoding="utf-8"))
    checks.append(("Capability registry is machine-readable", bool(capabilities), f"{len(capabilities)} top-level fields"))
    reference = json.loads((ROOT / "REFERENCE_VALIDATION.json").read_text(encoding="utf-8"))
    serialized = json.dumps(reference)
    checks.append(("Independent numerical reference matrix retained", "32" in serialized or len(reference) >= 1, "REFERENCE_VALIDATION.json present"))

    failed = [item for item in checks if not item[1]]
    score = round(100 * sum(1 for item in checks if item[1]) / len(checks))
    print(f"Foko Lab {VERSION} platform benchmark: {score}/100")
    for name, passed, evidence in checks:
        print(f" {'PASS' if passed else 'FAIL'}  {name}: {evidence}")
    if failed:
        print(f"Benchmark failed: {len(failed)} release blocker(s).")
        return 1
    print(f"Benchmark passed: {len(checks)}/{len(checks)} measurable release criteria.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
