#!/usr/bin/env python3
"""Generate the stable public navigation, theme host, and footer.

The shell is organized by user intent rather than by implementation history:
Home, Modeling, Data / Analysis, SciML, Explore, and GitHub.
"""
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
VERSION = "72.47.0"


def menu_link(prefix: str, href: str, icon: str, title: str, description: str) -> str:
    target = href if href.startswith(("http://", "https://")) else f"{prefix}{href}"
    return (
        f'<a href="{target}" role="menuitem"><span class="menu-icon">{icon}</span>'
        f'<span><b>{title}</b><small>{description}</small></span></a>'
    )


def nav_html(prefix: str) -> str:
    p = prefix
    return f'''<nav aria-label="Primary navigation" class="topnav public-nav foko-main-nav foko-unified-nav">
<a class="nav-home-link" href="{p}index.html">Home</a>
<details class="labs-menu nav-menu" data-nav-menu="modeling">
<summary class="labs-summary">Modeling</summary>
<div class="labs-menu-panel menu-panel-wide" aria-label="Modeling workspaces" role="menu">
<div class="menu-section"><p class="menu-section-title">Build and simulate</p>
{menu_link(p, 'workbench.html', '▦', 'Workbench', 'One configuration across compatible scientific workflows.')}
{menu_link(p, 'ode.html?module=ode', '∿', 'ODE Lab', 'Trajectories, sweeps, stiffness evidence and verification.')}
{menu_link(p, 'steady.html', '⇌', 'Steady-State', 'Roots, admissibility and local stability.')}
{menu_link(p, 'stochastic.html', '∴', 'Stochastic', 'Gillespie ensembles, seeds and censoring evidence.')}
</div>
<div class="menu-section"><p class="menu-section-title">Rules and search</p>
{menu_link(p, 'agent.html', '◎', 'Agent Lab', 'Spatial realizations and finite-ensemble evidence.')}
{menu_link(p, 'optimization.html', '◇', 'Optimization', 'Bounds, feasibility and algorithm diagnostics.')}
{menu_link(p, 'symbolic.html', 'Σ', 'Symbolic', 'Exact derivatives, Jacobians and export boundaries.')}
</div>
</div>
</details>
<details class="labs-menu nav-menu" data-nav-menu="analysis">
<summary class="labs-summary">Data / Analysis</summary>
<div class="labs-menu-panel menu-panel-compact" aria-label="Data and analysis labs" role="menu">
<div class="menu-section"><p class="menu-section-title">Analyse observations</p>
{menu_link(p, 'fitting.html', 'ƒ', 'Curve Fitting', 'Residuals, profiles and practical identifiability.')}
{menu_link(p, 'statistics.html', 'σ', 'Statistics', 'Missingness, tests, regression and uncertainty.')}
{menu_link(p, 'sensitivity.html', '∂S', 'Sensitivity', 'Local, Morris, Sobol/Jansen and local information diagnostics.')}
{menu_link(p, 'linear-algebra.html', 'A', 'Linear Algebra', 'Solves, spectra, conditioning and PCA.')}
{menu_link(p, 'networks.html', '⟠', 'Networks', 'Graph structure, paths, communities and resilience.')}
</div>
</div>
</details>
<details class="labs-menu nav-menu" data-nav-menu="sciml">
<summary class="labs-summary">SciML</summary>
<div class="labs-menu-panel menu-panel-compact" aria-label="Scientific machine learning" role="menu">
<div class="menu-section"><p class="menu-section-title">Learn from models and data</p>
{menu_link(p, 'sciml.html', '∂', 'SciML Lab', 'SINDy, inverse diagnostics, surrogates and export limits.')}
{menu_link(p, 'ml.html', 'μ', 'Machine Learning', 'Fold-safe validation, calibration, leakage audit and PCA.')}
{menu_link(p, 'docs.html#sciml-export', '⇥', 'External workflows', 'Know when the browser is not the right compute boundary.')}
</div>
</div>
</details>
<details class="labs-menu nav-menu" data-nav-menu="explore">
<summary class="labs-summary">Explore</summary>
<div class="labs-menu-panel menu-panel-wide explore-menu-panel" aria-label="Examples, learning and provenance" role="menu">
<div class="menu-section"><p class="menu-section-title">Find and learn</p>
{menu_link(p, 'examples.html', '▦', 'Model Atlas', 'Search runnable and export-only examples.')}
{menu_link(p, 'beauty.html', '∞', 'Mathematical Beauty', 'Interactive fractals, topology, manifolds and geometric structure.')}
{menu_link(p, 'docs.html', '▤', 'Documentation', 'Inputs, outputs, diagnostics and boundaries.')}
{menu_link(p, 'tutorial.html', '▣', 'Tutorials', 'Practical failure-driven exercises.')}
</div>
<div class="menu-section"><p class="menu-section-title">Trust and provenance</p>
{menu_link(p, 'trust.html', '✓', 'Trust', 'Capability matrix, validation and known limits.')}
{menu_link(p, 'research.html', '⌁', 'Research', 'Fatty-acid metabolism, Thermoplants and T-cell models.')}
{menu_link(p, 'cv.html', 'CV', 'Creator profile', 'Academic and industry background.')}
</div>
</div>
</details>
<a href="https://github.com/chilperic/FokoLab" rel="noopener" target="_blank">GitHub</a>
</nav>'''


def footer_html(prefix: str) -> str:
    p = prefix
    return f'''<footer class="v70-footer foko-product-footer">
<div><img alt="Foko Lab" src="{p}assets/brand/foko-lab-mark.svg?v={VERSION}"/><p><b>Foko Lab</b><br/>Browser-native scientific modelling with explicit evidence boundaries.</p></div>
<nav aria-label="Footer navigation"><a href="{p}examples.html">Model Atlas</a><a href="{p}workbench.html">Workbench</a><a href="{p}tutorial.html">Tutorials</a><a href="{p}docs.html">Docs</a><a href="{p}trust.html">Trust</a><a href="{p}research.html">Research</a><a href="{p}beauty.html">Mathematical Beauty</a></nav>
<div class="foko-footer-meta"><p><a href="mailto:chilpericarmel@gmail.com">Contact</a> · <a href="https://orcid.org/0000-0002-0140-7588" rel="noopener" target="_blank">ORCID</a> · <a href="https://chilperic.github.io/" rel="noopener" target="_blank">About the author</a></p><p>HHU Düsseldorf · CEPLAS · AIMS Ghana · PoLiMeR ITN</p><p><a href="https://github.com/chilperic/FokoLab" rel="noopener" target="_blank">Source code</a></p></div>
</footer>'''


def update(path: Path) -> None:
    rel = path.relative_to(ROOT)
    prefix = "../" if len(rel.parts) > 1 else ""
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    nav = soup.select_one("nav.foko-main-nav, nav.topnav")
    if nav:
        nav.replace_with(BeautifulSoup(nav_html(prefix), "html.parser").nav)
    header = soup.select_one("header.topbar, header.public-topbar")
    if header:
        actions = header.select_one(":scope > .foko-top-actions")
        if actions is None:
            actions = soup.new_tag("div")
            actions["class"] = ["foko-top-actions"]
            header.append(actions)
        else:
            actions.clear()
        actions["aria-label"] = "Display controls"
    footer = soup.find("footer")
    if footer:
        footer.replace_with(BeautifulSoup(footer_html(prefix), "html.parser").footer)
    path.write_text(str(soup), encoding="utf-8")


def main() -> None:
    paths = sorted(ROOT.glob("*.html")) + sorted((ROOT / "research").glob("*.html"))
    for path in paths:
        update(path)
    print(f"Normalized navigation, display controls, and footer in {len(paths)} pages")


if __name__ == "__main__":
    main()
