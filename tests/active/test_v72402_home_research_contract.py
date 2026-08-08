from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_home_model_collection_is_six_equal_semantic_cards():
    page = BeautifulSoup(text("index.html"), "html.parser")
    ledger = page.select_one(".foko-feature-grid")
    assert ledger is not None
    entries = ledger.select(":scope > .foko-feature-card")
    assert len(entries) == 6
    assert all(entry.select_one('.foko-feature-visual') for entry in entries)
    assert all(entry.select_one('.foko-feature-body') for entry in entries)
    assert ledger.select_one('#homeResearchEvidence') is not None


def test_browser_contract_matches_project_first_structure():
    spec = text("tests/e2e/main-labs-smoke.spec.js")
    assert "page.locator('.foko-feature-grid > .foko-feature-card')).toHaveCount(6)" in spec
    assert "page.locator('.foko-route-grid > .foko-route-card')).toHaveCount(3)" in spec
