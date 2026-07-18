#!/usr/bin/env python3
"""Generate trust.html directly from CAPABILITIES.json and reference validation."""
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / "VERSION.json").read_text(encoding="utf-8"))["version"]
STATUS_ORDER = ["browser-computed", "derived-browser", "limited-browser", "export-only", "unavailable"]
STATUS_LABELS = {
    "browser-computed": "Browser-computed",
    "derived-browser": "Derived in browser",
    "limited-browser": "Limited",
    "export-only": "Export-only",
    "unavailable": "Unavailable",
    "reference": "Reference shell",
    "legacy-migration": "Legacy migration",
}
LAB_LABELS = {
    "ode": "ODE", "steady_state": "Steady-State", "stochastic": "Stochastic",
    "optimization": "Optimization", "statistics": "Statistics", "fitting": "Curve Fitting",
    "linear_algebra": "Linear Algebra", "networks": "Networks", "ml": "Machine Learning",
    "sciml": "SciML", "symbolic": "Symbolic", "agent": "Agent", "workbench": "Workbench",
    "sensitivity": "Sensitivity Analysis",
}


def human(key: str) -> str:
    acronyms = {
        "ode": "ODE", "ctmc": "CTMC", "ssa": "SSA", "sse": "SSE",
        "pca": "PCA", "scipy": "SciPy", "sindy": "SINDy", "kkt": "KKT",
        "fim": "FIM", "hsic": "HSIC", "mi": "MI", "pde": "PDE",
        "pinn": "PINN", "efast": "eFAST", "json": "JSON", "rk45": "RK45",
    }
    words = [acronyms.get(word, word) for word in key.split("_")]
    if words and words[0] not in acronyms.values():
        words[0] = words[0].capitalize()
    return " ".join(words)


def main() -> None:
    caps = json.loads((ROOT / "CAPABILITIES.json").read_text(encoding="utf-8"))
    ref = json.loads((ROOT / "REFERENCE_VALIDATION.json").read_text(encoding="utf-8"))
    definitions = caps["statusDefinitions"]
    claim_cards = []
    for status in STATUS_ORDER:
        claim_cards.append(f'<article class="trust-claim {status}" id="{status}"><h2>{STATUS_LABELS[status]}</h2><p>{html.escape(definitions[status])}</p></article>')

    lab_sections = []
    for lab_key, lab in caps["labs"].items():
        rows = []
        for capability, status in lab.get("capabilities", {}).items():
            rows.append(f'<tr><td>{html.escape(human(capability))}</td><td><span class="claim-pill {html.escape(status)}">{html.escape(STATUS_LABELS.get(status, status))}</span></td></tr>')
        limits = "".join(f'<li>{html.escape(item)}</li>' for item in lab.get("limitations", [])) or '<li>No additional limitation text is recorded.</li>'
        lab_sections.append(f'''<section class="trust-lab" id="lab-{html.escape(lab_key)}"><h2>{html.escape(LAB_LABELS.get(lab_key, human(lab_key)))}</h2><table><thead><tr><th>Capability</th><th>Claim class</th></tr></thead><tbody>{''.join(rows)}</tbody></table><details><summary>Known limitations</summary><ul>{limits}</ul></details></section>''')

    summary = ref.get("summary", {})
    libraries = ref.get("libraries", {})
    library_text = " · ".join(f'{html.escape(k)} {html.escape(str(v))}' for k, v in libraries.items())

    # Reuse the canonical static navigation markup rather than emitting an empty
    # placeholder that only becomes usable after JavaScript runs. This keeps
    # Trust aligned with every other public surface for accessibility, no-JS
    # navigation, and the six-destination information-architecture contract.
    docs_text = (ROOT / "docs.html").read_text(encoding="utf-8")
    nav_match = re.search(r'<nav\b[^>]*class="[^"]*foko-main-nav[^"]*"[^>]*>.*?</nav>', docs_text, re.S)
    if nav_match is None:
        raise RuntimeError("Canonical public navigation not found in docs.html")
    canonical_nav = nav_match.group(0)

    page = f'''<!DOCTYPE html>
<html data-theme="aurora" lang="en"><head><meta charset="utf-8"/><meta content="width=device-width,initial-scale=1" name="viewport"/><meta content="Foko Lab capability classes, limitations, architecture boundaries and differential validation." name="description"/><title>Trust · Foko Lab</title>
<link href="assets/brand/foko-lab-mark.svg?v={VERSION}" rel="icon" type="image/svg+xml"/><link href="styles/style.css?v={VERSION}" rel="stylesheet"/><link href="styles/v72-tokens.css?v={VERSION}" rel="stylesheet"/><link href="styles/v72-public-shell.css?v={VERSION}" rel="stylesheet"/></head>
<body data-lab="trust"><div class="app-shell"><header class="topbar public-topbar foko-ide-topbar" data-v70-nav="true"><a aria-label="Foko Lab home" class="brand foko-wordmark" href="index.html"><img alt="Foko Lab" class="logo" src="assets/brand/foko-lab-logo.svg?v={VERSION}"/></a>{canonical_nav}</header>
<main class="trust-page" id="main-content"><section class="trust-page-hero"><p class="trust-home-eyebrow">How to interpret a result</p><h1>What Foko Lab computed — and where the claim stops.</h1><p>Every capability carries a label that tells you whether the result was computed in the browser, produced by a bounded method, prepared for an external tool, or not offered.</p><div class="guide-sibling-links"><a href="docs.html">Modelling handbook</a><a href="tutorial.html">20-part curriculum</a><a href="examples.html">Model Atlas</a></div></section>
<section class="trust-claims" aria-label="Claim classes">{''.join(claim_cards)}</section>
<section class="trust-validation" aria-labelledby="validationTitle"><h2 id="validationTitle">Independent reference comparisons</h2><p><b>{summary.get('passed', 0)}/{summary.get('total', 0)} representative comparisons passed</b> against independently maintained numerical libraries. This is regression evidence for the tested cases, not certification of every model or conclusion.</p><p class="trust-library-line">{library_text}</p></section>
<section class="trust-learning" aria-labelledby="learningTitle"><h2 id="learningTitle">Learning and modelling support</h2><p>The public handbook follows a twelve-stage modelling workflow from question and system boundary through equations, solver verification, sensitivity, reproducibility and claim limits. The practical curriculum contains twenty model-building and diagnostic investigations rather than a button-by-button feature tour.</p><p><a href="docs.html">Open the modelling handbook</a> · <a href="tutorial.html">Open the practical curriculum</a></p></section>
<section class="trust-matrix-intro"><p class="trust-home-eyebrow">Capability reference</p><h2>What each lab can and cannot claim</h2><p>Read the limitation together with the label. “Browser-computed” describes execution; it does not establish calibration, causality, external validity, or publication readiness.</p></section>
<div class="trust-lab-grid">{''.join(lab_sections)}</div>
<section class="trust-hard-limits"><h2>Hard limits that remain</h2><ul><li>The browser is not a substitute for production stiff integration, large sparse algebra, large graph infrastructure, GPU training, structural-identifiability proof, causal inference, or empirical calibration.</li><li>Optional SciPy verification is a numerical referee and may require a network-loaded Pyodide runtime on first use.</li><li>Share URLs preserve configuration, not old computed evidence. Recipients must rerun.</li><li>Representative differential checks are regression evidence, not universal certification.</li></ul></section></main><footer></footer></div><script>(function(){{document.documentElement.dataset.theme=localStorage.getItem('chilperic-theme')||'aurora';}})();</script><script defer src="src/navigation.js?v={VERSION}"></script></body></html>'''
    (ROOT / "trust.html").write_text(page, encoding="utf-8")
    print("Generated trust.html")


if __name__ == "__main__":
    main()
