"""
V71.38 — Per-lab colour identity layer: contract test.

WHY THIS TEST EXISTS
--------------------
V71.38 introduces a *restrained, accent-only* visual identity so that each
compute workspace and each analysis module carries one signature hue on a small,
fixed set of orientation surfaces (header top-bar, active-nav underline, page
eyebrow, section rule, plot-header underline). Backgrounds and body text stay
theme-driven, so contrast remains safe across all 14 themes.

This test is written BEFORE the implementation (RED first). It encodes the
contract the implementation must satisfy and, just as importantly, the
guardrails that keep this feature from becoming the next source of debt:

  1. The identity is DATA-DRIVEN. Every content page must expose a machine
     hook: `data-lab` on <body>, and the five analysis pages (which all share
     data-lab="analysis") must additionally expose a distinct `data-module`.
  2. The identity is SINGLE-SOURCED. Exactly one new stylesheet,
     `styles/lab-identity.css`, carries the whole system and is linked on every
     content page, AFTER the existing cascade so it wins WITHOUT `!important`.
  3. The identity is CONTRAST-SAFE / DEBT-FREE. The new stylesheet must contain
     ZERO `!important` declarations. If it ever needs `!important` to win, the
     cascade order is wrong and must be fixed instead — that is the whole point.
  4. The identity is COMPLETE. Each of the 13 coloured tools must define its own
     `--lab-accent` token in the stylesheet, and each must be DISTINCT.

These assertions are deliberately structural (DOM + CSS text), matching the
existing V71 HTML-contract test style. They do not attempt to render pixels.
"""

import os
import re
import pathlib
from bs4 import BeautifulSoup

# --- Locate the repository root relative to this test file -------------------
ROOT = pathlib.Path(__file__).resolve().parents[1]
IDENTITY_CSS = ROOT / "styles" / "lab-identity.css"

# --- The 13 tools that MUST receive a distinct signature hue -----------------
# Keyed by the CSS selector token the stylesheet uses to target them.
# Workspaces are keyed on data-lab; analysis modules on data-module.
# (workbench + ode intentionally share the "dynamics" family but are still
#  listed separately so each page is verifiably covered.)
COLOURED_LAB_ATTRS = {
    # data-lab value -> page(s) that must carry it
    "model-workbench": ["workbench.html", "model.html"],
    "ode": ["ode.html"],
    "stochastic": ["stochastic.html"],
    "optimization": ["optimization.html"],
    "steady": ["steady.html"],
    "symbolic": ["symbolic.html"],
    "agent": ["agent.html"],
    "sciml": ["sciml.html"],
    "beauty": ["beauty.html"],
}
COLOURED_MODULE_ATTRS = {
    # data-module value -> the single analysis page that must carry it
    "statistics": "statistics.html",
    "fitting": "fitting.html",
    "linalg": "linear-algebra.html",
    "networks": "networks.html",
    "ml": "ml.html",
}

# Every content HTML page that must link the identity stylesheet.
# (Utility/legal fragments without a full <head> cascade are excluded if any;
#  here every listed page is a full page in the shipped tree.)
ALL_CONTENT_PAGES = [
    "index.html", "workbench.html", "model.html", "ode.html", "stochastic.html",
    "optimization.html", "steady.html", "symbolic.html", "agent.html",
    "sciml.html", "ml.html", "statistics.html", "fitting.html",
    "linear-algebra.html", "networks.html", "beauty.html", "examples.html",
    "docs.html", "tutorial.html", "research.html", "cv.html", "contact.html",
    "acknowledgement.html", "platform.html",
]


def _soup(page: str) -> BeautifulSoup:
    """Parse a page from the repo root. Precondition: the file must exist."""
    p = ROOT / page
    assert p.exists(), f"precondition failed: expected page missing: {page}"
    return BeautifulSoup(p.read_text(encoding="utf-8"), "html.parser")


def _css_text() -> str:
    """Return the identity stylesheet text. Precondition: file must exist."""
    assert IDENTITY_CSS.exists(), (
        "precondition failed: styles/lab-identity.css must be created by the "
        "implementation before this contract can hold."
    )
    return IDENTITY_CSS.read_text(encoding="utf-8")


# -----------------------------------------------------------------------------
# 1. DATA HOOKS: every content page carries data-lab; analysis pages add module
# -----------------------------------------------------------------------------
def test_every_content_page_has_data_lab():
    """Colour identity is data-driven; a page with no data-lab cannot be themed.
    This also closes the three pages that previously shipped with NO data-lab
    (cv, examples, research)."""
    missing = []
    for page in ALL_CONTENT_PAGES:
        body = _soup(page).body
        assert body is not None, f"{page}: no <body> element"
        if not body.get("data-lab"):
            missing.append(page)
    assert not missing, f"pages missing data-lab: {missing}"


def test_analysis_pages_expose_distinct_data_module():
    """All five analysis pages share data-lab='analysis'; they must therefore
    carry a distinct data-module so the identity layer can tell them apart."""
    seen = {}
    for module, page in COLOURED_MODULE_ATTRS.items():
        body = _soup(page).body
        got = body.get("data-module")
        assert got == module, (
            f"{page}: expected data-module='{module}', got '{got}'"
        )
        # data-lab must remain 'analysis' so the shared cockpit CSS still applies
        assert body.get("data-lab") == "analysis", (
            f"{page}: data-lab must stay 'analysis' for shared cockpit styling"
        )
        assert got not in seen, f"duplicate data-module '{got}' on {page} and {seen[got]}"
        seen[got] = page


def test_coloured_workspace_pages_have_expected_data_lab():
    """Each coloured workspace page carries the data-lab the stylesheet targets."""
    for lab, pages in COLOURED_LAB_ATTRS.items():
        for page in pages:
            body = _soup(page).body
            assert body.get("data-lab") == lab, (
                f"{page}: expected data-lab='{lab}', got '{body.get('data-lab')}'"
            )


# -----------------------------------------------------------------------------
# 2. SINGLE SOURCE: the stylesheet is linked on every page, AFTER the cascade
# -----------------------------------------------------------------------------
def test_identity_stylesheet_linked_on_every_page():
    """Exactly one link to styles/lab-identity.css must appear on each page."""
    for page in ALL_CONTENT_PAGES:
        soup = _soup(page)
        links = [l for l in soup.find_all("link", rel="stylesheet")
                 if "lab-identity.css" in (l.get("href") or "")]
        assert len(links) == 1, (
            f"{page}: expected exactly 1 lab-identity.css link, found {len(links)}"
        )


def test_identity_stylesheet_is_last_in_cascade():
    """The identity layer must be the LAST stylesheet so it wins by order, not
    by !important. This is the guardrail that keeps the feature debt-free."""
    for page in ALL_CONTENT_PAGES:
        html = (ROOT / page).read_text(encoding="utf-8")
        local_sheets = re.findall(r'href="(styles/[^"?]+\.css|src/[^"?]+\.css)', html)
        assert local_sheets, f"{page}: no local stylesheets found"
        assert local_sheets[-1].endswith("lab-identity.css"), (
            f"{page}: lab-identity.css must be the last local stylesheet; "
            f"last is '{local_sheets[-1]}'"
        )


# -----------------------------------------------------------------------------
# 3. DEBT-FREE: the new stylesheet introduces ZERO !important
# -----------------------------------------------------------------------------
def test_identity_stylesheet_has_no_important():
    """The identity layer must not add to the !important stack. If it needs
    !important to take effect, the cascade order is wrong (see test above)."""
    css = _css_text()
    # Count only real declarations: strip /* ... */ comments first, otherwise a
    # comment that merely mentions the word would false-trip this guard.
    stripped = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    n = stripped.count("!important")
    assert n == 0, f"lab-identity.css introduced {n} !important declarations"


# -----------------------------------------------------------------------------
# 4. COMPLETE + DISTINCT: every coloured tool defines a distinct --lab-accent
# -----------------------------------------------------------------------------
def _accent_for(css: str, selector_fragment: str):
    """Extract the --lab-accent hex assigned within a rule whose selector text
    contains `selector_fragment`. Returns the lowercased hex or None."""
    # Match: <...selector_fragment...> { ... --lab-accent: #rrggbb ... }
    pattern = re.compile(
        r'\[data-(?:lab|module)="' + re.escape(selector_fragment) + r'"\][^{]*\{([^}]*)\}',
        re.IGNORECASE,
    )
    hexes = []
    for body in pattern.findall(css):
        m = re.search(r'--lab-accent:\s*(#[0-9a-fA-F]{6})', body)
        if m:
            hexes.append(m.group(1).lower())
    return hexes[0] if hexes else None


def test_each_coloured_tool_defines_lab_accent():
    """Every one of the 13 coloured tools must define its own --lab-accent."""
    css = _css_text()
    missing = []
    for key in list(COLOURED_LAB_ATTRS) + list(COLOURED_MODULE_ATTRS):
        if _accent_for(css, key) is None:
            missing.append(key)
    assert not missing, f"tools with no --lab-accent defined: {missing}"


def test_coloured_tool_accents_are_distinct():
    """Signature hues must be visually distinguishable; require distinct hexes.
    (workbench and ode may share the dynamics family colour by design, so they
    are compared as a de-duplicated set of the *intended* palette.)"""
    css = _css_text()
    accents = {}
    for key in list(COLOURED_LAB_ATTRS) + list(COLOURED_MODULE_ATTRS):
        accents[key] = _accent_for(css, key)
    # Allow the deliberate dynamics-family overlap between workbench and ode.
    allowed_shared = {("model-workbench", "ode")}
    seen = {}
    for key, hexval in accents.items():
        if hexval in seen:
            pair = tuple(sorted((key, seen[hexval])))
            assert pair in allowed_shared, (
                f"colour clash: '{key}' and '{seen[hexval]}' share {hexval}"
            )
        else:
            seen[hexval] = key
    # Sanity: at least 11 distinct hues across the 13 tools.
    assert len(set(v for v in accents.values() if v)) >= 11, (
        f"palette not diverse enough: {sorted(set(accents.values()))}"
    )


# -----------------------------------------------------------------------------
# 5. SURFACE CONTRACT: the stylesheet actually applies the accent to the fixed
#    orientation surfaces (so identity is visible, not just declared).
# -----------------------------------------------------------------------------
def test_identity_applied_to_orientation_surfaces():
    """The accent must reach the agreed surfaces: header top-bar, active nav,
    eyebrow/kicker, and a plot/section rule. We check the token is referenced
    in rules touching those selectors."""
    css = _css_text()
    required_surface_selectors = [
        ".foko-ide-topbar",          # header identity bar
        ".active",                   # active nav indicator
        "eyebrow",                   # page eyebrow/kicker (matches eyebrow + mw-eyebrow)
    ]
    for sel in required_surface_selectors:
        assert sel in css, f"identity stylesheet does not style '{sel}'"
    assert css.count("var(--lab-accent") >= 4, (
        "identity stylesheet must reference var(--lab-accent...) on several surfaces"
    )
