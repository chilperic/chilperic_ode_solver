from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(page):
    return (ROOT / page).read_text(encoding="utf-8")

def test_v71_6_legacy_pages_are_real_pages_not_redirects():
    for page in ["ode.html", "stochastic.html", "optimization.html", "steady.html"]:
        html = read(page)
        assert "data-v713-compat-redirect" not in html
        assert "location.replace(" not in html
        assert "<main" in html

def test_v71_6_secondary_nav_points_to_standalone_pages():
    soup = BeautifulSoup(read("index.html"), "html.parser")
    menu = soup.select_one(".workbench-menu .labs-menu-panel")
    assert menu is not None
    text = menu.get_text(" ", strip=True)
    focused = soup.select_one('.standalone-menu .labs-menu-panel')
    assert focused is not None
    text = focused.get_text(' ', strip=True)
    assert "Standalone scientific labs" in text
    assert "ODE + Parametric ODE" in text
    assert "Stochastic CTMC" in text
    assert "Optimization" in text
    assert "Steady-State" in text
    menu_html = str(focused)
    assert 'href="ode.html?module=ode"' in menu_html or 'href="ode.html"' in menu_html
    assert 'href="stochastic.html"' in menu_html
    assert 'href="optimization.html"' in menu_html
    assert 'href="steady.html"' in menu_html
