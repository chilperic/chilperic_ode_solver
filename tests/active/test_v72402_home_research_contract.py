from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_home_research_collection_is_four_equal_semantic_cards():
    page = BeautifulSoup(text("index.html"), "html.parser")
    ledger = page.select_one(".home-research-ledger.home-research-grid")
    assert ledger is not None
    entries = ledger.select(":scope > .home-research-card")
    assert len(entries) == 4
    assert all(entry.select_one('.home-research-card-figure') for entry in entries)
    assert all(entry.select_one('.home-research-card-visual') for entry in entries)
    assert ledger.select_one('[data-research-card="thermoplants"]') is not None
    assert ledger.select_one('.home-thermoplants-hero') is None


def test_browser_contract_matches_equal_card_structure():
    spec = text("tests/e2e/main-labs-smoke.spec.js")
    assert "page.locator('.home-research-grid > .home-research-card')).toHaveCount(4)" in spec
    assert "page.locator('.home-research-row')).toHaveCount(3)" not in spec
    assert "page.locator('.home-thermoplants-hero')).toHaveCount(1)" not in spec
