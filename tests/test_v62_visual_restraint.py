"""
test_v62_visual_restraint.py
============================

Protocol step 1: test before the change. Pins the second half of the v62 pass:
make the home hero right-sized and make the platform less loud.

Two problems, measured
----------------------
1. Hero proportion still off: after v61 the tagline clamp upper is 4.4rem and
   the photo is 168px. The request is: photo bigger still, tagline smaller
   still. More importantly, the tagline's apparent size is driven by a THREE
   colour text gradient (teal -> magenta -> orange), which is the loudest
   element on the page. Shrinking the font alone will not fix "too big"; the
   rainbow has to go.

2. The platform is too colourful, and it is not even a coherent palette:
     * --foko-magenta is DEFINED TWICE with different hex (#e11d8f and #d946ef)
     * --foko-teal is DEFINED TWICE (#00a7a7 and #14b8a6)
   so the same token resolves differently by cascade position. That is a defect,
   not a palette. And the tagline uses a 3-colour gradient where at most one
   accent belongs.

Contract the change must satisfy
--------------------------------
  A. Tagline clamp upper bound <= 4.0rem (down from 4.4).
  B. Profile image >= 190px (up from 168), grid track matches.
  C. The tagline <h1> span must NOT use a 3-colour gradient. Either a single
     accent colour, or a 2-stop gradient at most. We assert the 3-colour
     teal->magenta->orange rainbow is removed from the h1 span rule.
  D. No accent token (--foko-magenta, --foko-teal) is defined with two
     conflicting hex values across the stylesheet. One definition each.

These are static-CSS assertions reading the LAST effective declaration, matching
how the cascade resolves.

Run:
    python -m pytest tests/test_v62_visual_restraint.py -v
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSS = "styles/style.css"

H1_MAX_REM = 4.0     # tagline clamp upper bound must be <= this (was 4.4)
PROFILE_MIN_PX = 190  # profile img must be >= this (was 168)


def read(rel: str) -> str:
    p = ROOT / rel
    assert p.exists(), f"[test-env] missing: {rel}"
    t = p.read_text(encoding="utf-8")
    assert t.strip(), f"[test-env] empty: {rel}"
    return t


def _last_clamp_upper(css: str, selector: str) -> float:
    """Upper rem bound of the LAST font-size clamp for `selector`. Pre: exists."""
    blocks = re.findall(re.escape(selector) + r"\s*\{([^}]*)\}", css)
    assert blocks, f"[test-env] no rule for {selector!r}"
    upper = None
    for b in blocks:
        m = re.search(r"font-size:\s*clamp\([^,]+,[^,]+,\s*([\d.]+)rem\)", b)
        if m:
            upper = float(m.group(1))
    assert upper is not None, f"[test-env] no clamp font-size for {selector!r}"
    return upper


def _last_px(css: str, selector_regex: str, prop: str) -> int:
    blocks = re.findall(selector_regex + r"\s*\{([^}]*)\}", css)
    assert blocks, f"[test-env] no rule matched /{selector_regex}/"
    val = None
    for b in blocks:
        m = re.search(prop + r"\s*:\s*(?:min\([^)]*?,\s*)?(\d+)px", b)
        if m:
            val = int(m.group(1))
    assert val is not None, f"[test-env] no px {prop} for /{selector_regex}/"
    return val


# ── A. tagline smaller ───────────────────────────────────────────────────────

def test_tagline_clamp_upper_reduced() -> None:
    """A — tagline clamp upper bound must drop to <= 4.0rem."""
    upper = _last_clamp_upper(read(CSS), ".identity-copy h1")
    assert upper <= H1_MAX_REM, (
        f"tagline clamp upper is {upper}rem; must be <= {H1_MAX_REM}rem. Append "
        "a later !important rule: .identity-copy h1{font-size:"
        "clamp(2rem,3.6vw,4rem)!important;}"
    )


# ── B. photo bigger ──────────────────────────────────────────────────────────

def test_profile_image_enlarged_again() -> None:
    """B — profile image must be >= 190px."""
    w = _last_px(read(CSS), r"\.identity-profile\.large-profile img", "width")
    assert w >= PROFILE_MIN_PX, (
        f"profile image width is {w}px; must be >= {PROFILE_MIN_PX}px."
    )


def test_profile_grid_track_matches() -> None:
    """B — the grid track holding the image must be >= 190px so it is not clipped."""
    css = read(CSS)
    blocks = re.findall(r"\.identity-profile\.large-profile\s*\{([^}]*)\}", css)
    assert blocks, "[test-env] no large-profile container rule"
    col = None
    for b in blocks:
        m = re.search(r"grid-template-columns:\s*(\d+)px", b)
        if m:
            col = int(m.group(1))
    assert col is not None, "[test-env] no px grid track for large-profile"
    assert col >= PROFILE_MIN_PX, (
        f"large-profile grid track is {col}px; must be >= {PROFILE_MIN_PX}px."
    )


# ── C. de-rainbow the tagline ────────────────────────────────────────────────

def test_tagline_span_not_three_colour_gradient() -> None:
    """
    C — the <h1> span must not use the 3-colour teal->magenta->orange rainbow.
    We take the LAST '.identity-copy h1 span' rule (the effective one) and assert
    it does not contain all three accent stops.
    """
    css = read(CSS)
    blocks = re.findall(r"\.identity-copy h1 span\s*\{([^}]*)\}", css)
    assert blocks, "[test-env] no '.identity-copy h1 span' rule found"
    last = blocks[-1]
    stops = sum(t in last for t in ("--foko-teal", "--foko-magenta", "--foko-orange"))
    assert stops < 3, (
        "tagline span still uses a 3-colour gradient (teal+magenta+orange): "
        f"{last.strip()!r}. Reduce to a single accent or a 2-stop gradient — "
        "the rainbow is the loudest element on the page."
    )


# ── D. one hex per accent token ──────────────────────────────────────────────

def test_no_conflicting_accent_token_definitions() -> None:
    """
    D — each accent token must resolve to ONE hex. --foko-magenta and
    --foko-teal are each currently defined twice with different values, so the
    same variable renders differently by cascade position. After the fix, each
    token has a single definition (or, if redefined, the same hex).
    """
    css = read(CSS)
    for token in ("--foko-magenta", "--foko-teal"):
        hexes = set(re.findall(re.escape(token) + r"\s*:\s*(#[0-9a-fA-F]{3,6})", css))
        assert len(hexes) <= 1, (
            f"{token} is defined with conflicting values {sorted(hexes)}. "
            "Collapse to a single hex so the token is a real palette entry, not "
            "a cascade accident."
        )


def test_gradient_count_reduced() -> None:
    """
    D (softer) — overall gradient usage should come down. This is a coarse
    'less loud' guard: the main stylesheet had 47 linear-gradients; after the
    restraint pass it must be at most 42 (we remove the loudest chrome gradients,
    not the functional plot/scheme ones).
    """
    css = read(CSS)
    n = css.count("linear-gradient")
    assert n <= 42, (
        f"style.css still has {n} linear-gradients; restraint pass should bring "
        "this to <= 42 by removing decorative chrome gradients (tagline rainbow, "
        "duplicate accent fills). Functional plot/scheme gradients may remain."
    )
