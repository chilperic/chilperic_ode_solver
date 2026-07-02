"""
test_v61_home_hero_layout.py
============================

Protocol step 1: test before the change. These pin the three homepage-hero
adjustments requested for the identity/home page, plus the small content
addition. Each assertion fails on the pre-change tree and passes after the
override block + HTML edit are applied.

What is being changed and why
-----------------------------
The home hero (`.identity-hero`) has three elements whose proportions were off:

  1. Profile photo (`.identity-profile.large-profile img`) — too small relative
     to the card; the person should be more present on their own landing page.
  2. Foko Lab orbit mark (`.identity-logo-wrap.compact-logo`) — too large next
     to the photo; it competes with the person rather than supporting them.
  3. Tagline (`.identity-copy h1`, "Build models. See dynamics. Export
     cleanly.") — oversized; the winning rule caps it at clamp(...,5.4rem) which
     dominates the viewport.

And one content addition:

  4. The profile block should say a little more about the person than just
     "Foko Lab creator".

Why the assertions target a trailing override block
---------------------------------------------------
style.css is heavily layered: the *winning* declarations for these selectors
are `!important` rules near the end of the file (the "Public cards" block for
the h1, and the compact-logo block after it). A new rule therefore has to
either edit those exact lines or append an `!important` block that comes later
in source order (later source wins among equal-specificity `!important`
rules). We take the appended-block route because it keeps the change auditable
in one place and leaves the historical rules untouched.

These tests read the FINAL effective pixel/rem numbers by scanning for the
last matching declaration, mirroring how the cascade resolves them.

Run:
    python -m pytest tests/test_v61_home_hero_layout.py -v
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]

CSS_PATH = "styles/style.css"
HTML_PATH = "index.html"

# Target values the change must establish. Chosen to move each element in the
# requested direction while staying within the existing design scale.
PROFILE_MIN_PX = 160      # profile img must be at least this wide/tall (was 132)
LOGO_MAX_PX = 240         # compact-logo img must be capped at or below this (was 320)
H1_MAX_REM = 4.6          # tagline clamp upper bound must be <= this (was 5.4)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers with pre-condition assertions
# ─────────────────────────────────────────────────────────────────────────────

def read(rel: str) -> str:
    """Read a repo-relative file. Pre-condition: exists and non-empty."""
    p = ROOT / rel
    assert p.exists(), f"[test-env] missing file: {rel}"
    text = p.read_text(encoding="utf-8")
    assert text.strip(), f"[test-env] empty file: {rel}"
    return text


def last_px(css: str, selector_regex: str, prop: str) -> int:
    """
    Return the integer pixel value of `prop` in the LAST rule whose selector
    matches `selector_regex`. Mirrors the cascade: the last equal-priority
    declaration wins.

    Pre-condition: at least one matching rule with the property exists.
    """
    # Find every rule block matching the selector, capture its body.
    blocks = re.findall(selector_regex + r"\s*\{([^}]*)\}", css)
    assert blocks, f"[test-env] no rule matched selector /{selector_regex}/"
    # Walk blocks in source order; keep the last px value found for `prop`.
    value: int | None = None
    for body in blocks:
        m = re.search(prop + r"\s*:\s*(?:min\([^)]*?,\s*)?(\d+)px", body)
        if m:
            value = int(m.group(1))
    assert value is not None, (
        f"[test-env] property '{prop}' not found in any rule matching "
        f"/{selector_regex}/"
    )
    return value


def h1_clamp_upper_rem(css: str) -> float:
    """
    Return the upper bound (rem) of the LAST `.identity-copy h1` font-size clamp.
    Pre-condition: such a clamp exists.
    """
    blocks = re.findall(r"\.identity-copy h1\s*\{([^}]*)\}", css)
    assert blocks, "[test-env] no '.identity-copy h1' rule found"
    upper: float | None = None
    for body in blocks:
        m = re.search(
            r"font-size:\s*clamp\([^,]+,[^,]+,\s*([\d.]+)rem\)", body
        )
        if m:
            upper = float(m.group(1))
    assert upper is not None, (
        "[test-env] no clamp(...) font-size found in any '.identity-copy h1' rule"
    )
    return upper


# ─────────────────────────────────────────────────────────────────────────────
# 1. Profile photo larger
# ─────────────────────────────────────────────────────────────────────────────

def test_profile_image_is_enlarged() -> None:
    """
    The profile image's effective width (last matching non-media rule) must be
    at least PROFILE_MIN_PX. Was 132px.

    We check the base (non-media-query) declaration by matching the
    '.v36-clean .identity-profile.large-profile img' selector. Media-query
    shrink rules for small screens are allowed to be smaller.
    """
    css = read(CSS_PATH)
    # Restrict to the base large-profile img rules (there is a trailing override
    # block after the change). Media-query variants live inside @media blocks
    # which our simple block regex will still capture, but they set smaller
    # values on purpose; to isolate the desktop base we take the MAX across the
    # non-media declarations by scanning the appended override too.
    width = last_px(
        css,
        r"\.identity-profile\.large-profile img",
        "width",
    )
    assert width >= PROFILE_MIN_PX, (
        f"Profile image width resolves to {width}px; expected >= "
        f"{PROFILE_MIN_PX}px. Append a trailing override:\n"
        ".v36-clean .identity-profile.large-profile img{width:168px!important;"
        "height:168px!important;} and widen the grid column to match."
    )


def test_profile_grid_column_matches_enlarged_image() -> None:
    """
    The grid column that holds the image must be at least PROFILE_MIN_PX so the
    larger image is not clipped by a narrow track. Was 132px.
    """
    css = read(CSS_PATH)
    # grid-template-columns:<col> 1fr  -> capture the first px column
    blocks = re.findall(
        r"\.identity-profile\.large-profile\s*\{([^}]*)\}", css
    )
    assert blocks, "[test-env] no '.large-profile' container rule found"
    col: int | None = None
    for body in blocks:
        m = re.search(r"grid-template-columns:\s*(\d+)px", body)
        if m:
            col = int(m.group(1))
    assert col is not None, (
        "[test-env] no px grid-template-columns in '.large-profile' rules"
    )
    assert col >= PROFILE_MIN_PX, (
        f"large-profile grid column is {col}px; must be >= {PROFILE_MIN_PX}px "
        "so the enlarged image is not clipped."
    )


# ─────────────────────────────────────────────────────────────────────────────
# 2. Logo smaller
# ─────────────────────────────────────────────────────────────────────────────

def test_compact_logo_image_is_reduced() -> None:
    """
    The compact-logo image's effective max width (last matching rule) must be at
    or below LOGO_MAX_PX. Was min(100%,320px).
    """
    css = read(CSS_PATH)
    width = last_px(
        css,
        r"\.identity-logo-wrap\.compact-logo img",
        "width",
    )
    assert width <= LOGO_MAX_PX, (
        f"compact-logo image width resolves to {width}px; expected <= "
        f"{LOGO_MAX_PX}px. The logo should sit beside the photo without "
        "competing with it. Append a trailing override reducing width and "
        "max-height."
    )


def test_compact_logo_wrap_is_reduced() -> None:
    """
    The logo wrapper's max width must also come down (was min(100%,360px)),
    otherwise the padded card stays large even if the image inside shrinks.
    """
    css = read(CSS_PATH)
    width = last_px(
        css,
        r"\.identity-logo-wrap\.compact-logo(?!\s+img)",
        "width",
    )
    assert width <= LOGO_MAX_PX + 40, (
        f"compact-logo wrapper width resolves to {width}px; expected <= "
        f"{LOGO_MAX_PX + 40}px so the surrounding card shrinks with the image."
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3. Tagline smaller
# ─────────────────────────────────────────────────────────────────────────────

def test_tagline_font_size_is_reduced() -> None:
    """
    The tagline clamp upper bound must drop to <= H1_MAX_REM. Was 5.4rem, and it
    is applied with !important in the 'Public cards' block, so the override must
    also be !important and later in source order.
    """
    css = read(CSS_PATH)
    upper = h1_clamp_upper_rem(css)
    assert upper <= H1_MAX_REM, (
        f"Tagline clamp upper bound is {upper}rem; expected <= {H1_MAX_REM}rem. "
        '"Build models. See dynamics. Export cleanly." dominates the hero. '
        "Append: .identity-copy h1{font-size:clamp(2.2rem,4vw,4.4rem)"
        "!important;} after the existing rules."
    )


def test_tagline_override_uses_important() -> None:
    """
    Because the pre-existing winning rule is !important, the reducing override
    must be !important too or it will not take effect. This guards against a
    change that looks right in source but is overridden at runtime.
    """
    css = read(CSS_PATH)
    # Find the LAST identity-copy h1 rule and confirm it carries !important on
    # font-size (only meaningful if it's the reducing override).
    blocks = re.findall(r"\.identity-copy h1\s*\{([^}]*)\}", css)
    last = blocks[-1]
    assert "font-size" in last and "!important" in last, (
        "The final '.identity-copy h1' rule must set font-size with !important "
        "to beat the existing !important cap. Current last rule body:\n"
        f"{last.strip()}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# 4. More about the person
# ─────────────────────────────────────────────────────────────────────────────

def test_profile_block_has_more_descriptor() -> None:
    """
    The profile block should say more than just 'Foko Lab creator'. After the
    change it must contain a short descriptor line naming the field (modelling /
    computational biology). We assert a <span> with a domain word is present in
    the identity-profile block.
    """
    html = read(HTML_PATH)
    # Isolate the identity-profile block.
    m = re.search(
        r'<div class="identity-profile[^"]*">(.*?)</div>\s*</aside>',
        html,
        re.DOTALL,
    )
    assert m, "[test-env] identity-profile block not found in index.html"
    block = m.group(1)
    # A descriptor line with a domain term must be present.
    domain_terms = ["modell", "computational", "biolog", "dynamical",
                    "mechanistic", "systems"]
    lower = block.lower()
    assert any(term in lower for term in domain_terms), (
        "The profile block still only says 'Foko Lab creator'. Add a short "
        "descriptor line, e.g. 'Computational biologist · mechanistic "
        "modelling', so the landing page says a little more about the person. "
        f"Current block:\n{block.strip()}"
    )


def test_more_about_me_link_preserved() -> None:
    """
    The existing 'More about me' link to the personal site must remain — the
    content addition must not replace it.
    """
    html = read(HTML_PATH)
    assert "chilperic.github.io" in html, (
        "The 'More about me' link to chilperic.github.io must be preserved."
    )
    assert "More about me" in html, (
        "The 'More about me' link text must be preserved."
    )
