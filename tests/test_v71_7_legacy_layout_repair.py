from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(page):
    return (ROOT / page).read_text(encoding="utf-8")


def test_v71_7_legacy_pages_do_not_show_migration_noise_or_redirects():
    for page in ["stochastic.html", "optimization.html", "steady.html", "ode.html"]:
        html = read(page)
        assert "standalone-route-notice" not in html
        assert "Focused standalone workspace with direct domain controls" not in html
        assert "descriptor-shell migration proceeds" not in html
        assert "focused power surface" not in html
        assert "Compatibility route" not in html
        assert "location.replace(" not in html


def test_v71_7_legacy_pages_keep_real_controls_and_results():
    required = {
        "stochastic.html": ["runModel", "modelLibrary", "leftPlot", "rightPlot", "exportsBlock"],
        "optimization.html": ["runOpt", "optResults", "exportsBlock"],
        "steady.html": ["solveSteady", "steadyEquations", "exportsBlock"],
    }
    for page, ids in required.items():
        soup = BeautifulSoup(read(page), "html.parser")
        assert soup.select_one("main.lab-mirror-layout") is not None
        assert soup.select_one(".work-panel.controls") is not None
        assert soup.select_one(".workspace") is not None
        for element_id in ids:
            assert soup.select_one(f"#{element_id}") is not None, f"{page} missing #{element_id}"


def test_v71_7_css_scopes_legacy_layout_repair_to_three_pages():
    css = read("styles/style.css")
    assert "v71.7 legacy standalone layout repair" in css
    for lab in ["stochastic", "optimization", "steady"]:
        assert f'body[data-lab="{lab}"] main.lab-mirror-layout' in css
        assert f'body[data-lab="{lab}"] main.lab-mirror-layout > .side-nav' in css
    assert ".layout .side-nav{display:none!important" not in css.replace(" ", "")
