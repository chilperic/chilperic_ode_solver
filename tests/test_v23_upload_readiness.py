from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def soup(name: str) -> BeautifulSoup:
    return BeautifulSoup((ROOT / name).read_text(), "html.parser")


def test_symbolic_uses_compact_three_panel_layout_and_plot_fallback():
    html = soup("symbolic.html")
    main = html.find("main")
    assert "symbolic-page-v23" in main.get("class", [])
    assert html.find("script", src=lambda s: s and "plot-fallback.js" in s)
    results = html.find("section", class_=lambda c: c and "symbolic-analysis-panel" in c)
    assert results is not None
    assert results.find("h2", class_="analysis-panel-title")
    css = (ROOT / "styles" / "symbolic-beauty.css").read_text()
    assert 'grid-template-areas:"controls plot results"' in css
    assert "max-height:calc(100vh - 106px)" in css
    assert "overflow:auto" in css


def test_symbolic_plot_backend_is_guarded_against_blank_panels():
    js = (ROOT / "src" / "symbolic-lab.js").read_text()
    fallback = (ROOT / "src" / "plot-fallback.js").read_text()
    assert "typeof window.Plotly.react !== 'function'" in js
    assert "Plotly.Plots && typeof Plotly.Plots.resize==='function'" in js
    assert "Plots:{resize:()=>{}}" in fallback


def test_agent_page_uses_plot_fallback_for_online_resilience():
    html = soup("agent.html")
    assert html.find("script", src=lambda s: s and "plotly" in s.lower())
    assert html.find("script", src=lambda s: s and "plot-fallback.js" in s)


def test_agent_atlas_has_visual_illustration_for_every_agent_example():
    html = soup("examples.html")
    section = html.find(id="agent-atlas")
    articles = section.select(".agent-atlas-grid article")
    assert len(articles) >= 16
    for article in articles:
        title = article.find("h3").get_text(strip=True)
        fig = article.find("figure", class_="agent-atlas-thumb")
        assert fig is not None, title
        img = fig.find("img")
        assert img is not None, title
        src = img.get("src")
        assert src and (ROOT / src).exists(), f"missing image for {title}: {src}"
        assert img.get("alt") and "illustration" in img.get("alt").lower()


def test_fadns_agent_atlas_uses_correct_tracked_species():
    text = (ROOT / "examples.html").read_text()
    for token in ["Acetyl-CoA", "Malonyl-CoA", "chain intermediate", "C14", "C16", "C18", "CoA"]:
        assert token in text


def test_upload_audit_release_notes_present():
    assert (ROOT / "UPLOAD-AUDIT-v23.md").exists()
    assert (ROOT / "RELEASE-NOTES-v23-upload-readiness.md").exists()
