from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_optimization_aligned_preview_preserves_latex_backslashes():
    source = text("src/v72/optimization-workspace.js")
    assert "`\\\\begin{aligned}${" in source
    assert ".join('\\\\\\\\[4pt]')" in source
    assert "}\\\\end{aligned}`" in source
    assert "const source = `\\begin{aligned}" not in source


def test_home_research_cards_have_one_exact_desktop_height_contract():
    css = text("styles/v72-public-shell.css")
    assert "grid-auto-rows: 727px" in css
    assert "grid-template-rows: 190px 200px 205px 130px" in css
    assert "height: 727px" in css
    assert "min-height: 727px" in css
    assert "max-height: 727px" in css
    assert "@media (max-width: 820px)" in css
    assert "grid-auto-rows: auto" in css
