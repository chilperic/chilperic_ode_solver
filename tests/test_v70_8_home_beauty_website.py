"""
v70.8 — Home restoration: Mathematical Beauty + personal website + git hygiene.
=============================================================================

Three defects, each pinned here before the fix (test-first):

  1. MATHEMATICAL BEAUTY WAS DROPPED FROM THE HOME BODY.
     The v70.6/v70.7 "rationalization" rebuilt <main class="home-v705"> and left
     Mathematical Beauty only as a small footer link. It must be a visible entry
     in the home body (the paradigm/explore grid), not footer-only.

  2. THE CREATOR'S PERSONAL WEBSITE IS NOT LINKED FROM THE HOME.
     https://chilperic.github.io/index.html existed only inside contact.html.
     The home creator profile is the natural, discoverable place for it.

  3. THE RELEASE TREE SHIPPED WITHOUT .gitignore.
     Two existing contracts (test_v51, test_v53) already require it; the v70.7
     package dropped it, so the suite was red on arrival. Restore it.

These are INVARIANTS: a future rebuild that again demotes Beauty to footer-only,
or drops the site link or the .gitignore, fails here.
"""

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
PERSONAL_SITE = "https://chilperic.github.io/index.html"
GITIGNORE_REQUIRED = [".venv/", ".pytest_cache/", "node_modules/", "*.zip", "__pycache__/"]


def _raw():
    return INDEX.read_text(encoding="utf-8")


def _soup():
    return BeautifulSoup(_raw(), "html.parser")


# ---------------------------------------------------------------------------
# 1) Mathematical Beauty must be a visible entry in the HOME BODY, not footer-only.
# ---------------------------------------------------------------------------

def test_home_body_features_mathematical_beauty():
    s = _soup()
    main = s.select_one("main")
    assert main is not None, "index.html has no <main>"

    # A link to beauty.html must live inside <main> (the body), with a label a
    # human reads as Mathematical Beauty. Footer links do not count.
    beauty_links = [
        a for a in main.select('a[href="beauty.html"]')
        if "beaut" in a.get_text(" ", strip=True).lower()
    ]
    assert beauty_links, (
        "no Mathematical Beauty entry in the home <main> "
        "(it must not live only in the footer)"
    )


def test_home_beauty_entry_sits_in_the_explore_or_paradigm_grid():
    # Placement sanity: the Beauty entry should be part of the home's card/route
    # grid family, so it renders as a real navigational card, not an orphan link.
    s = _soup()
    grid_beauty = s.select(
        'main .home-v705-card-grid a[href="beauty.html"], '
        'main .home-v705-route-grid a[href="beauty.html"], '
        'main .home-v705-explore a[href="beauty.html"]'
    )
    assert grid_beauty, "Beauty link is not inside a home card/route grid"


# ---------------------------------------------------------------------------
# 2) Personal website must be linked from the home, in the creator profile.
# ---------------------------------------------------------------------------

def test_home_links_personal_website():
    assert PERSONAL_SITE in _raw(), f"home does not link {PERSONAL_SITE}"


def test_personal_website_link_lives_in_creator_profile():
    s = _soup()
    profile = s.select_one(".home-v705-profile")
    assert profile is not None, "no creator-profile block on the home page"
    hrefs = [a.get("href") for a in profile.select("a[href]")]
    assert PERSONAL_SITE in hrefs, (
        "personal website is not linked from the creator profile: " + str(hrefs)
    )


def test_personal_website_link_opens_safely_in_new_tab():
    # External links must be rel-safe (no reverse-tabnabbing) and open in a new
    # tab, matching how the existing GitHub/GitLab links are declared.
    s = _soup()
    a = s.select_one(f'a[href="{PERSONAL_SITE}"]')
    assert a is not None
    assert a.get("target") == "_blank"
    rel = (a.get("rel") or [])
    rel = rel if isinstance(rel, list) else [rel]
    assert "noopener" in rel, "external link missing rel=noopener"


# ---------------------------------------------------------------------------
# 3) .gitignore must exist with the patterns the release contracts require.
# ---------------------------------------------------------------------------

def test_gitignore_exists_with_required_patterns():
    gi = ROOT / ".gitignore"
    assert gi.exists(), ".gitignore is missing from the release tree"
    text = gi.read_text(encoding="utf-8")
    missing = [p for p in GITIGNORE_REQUIRED if p not in text]
    assert not missing, f".gitignore missing required patterns: {missing}"
