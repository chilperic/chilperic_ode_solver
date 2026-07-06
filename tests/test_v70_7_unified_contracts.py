from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')


def test_v707_unified_stylesheet_loaded_last_on_core_pages():
    for page in ['index.html','workbench.html','docs.html','tutorial.html','sciml.html','ode.html']:
        links = [l.get('href','') for l in soup(page).find_all('link', rel=lambda v: v and 'stylesheet' in v)]
        assert any('styles/v70-7-unified.css?v=71.46.0' in href for href in links), page
        # V71.38: the per-lab identity layer intentionally loads AFTER the v70
        # override stack (identity must win). v70-7-unified must therefore be the
        # last sheet of the override stack, i.e. last among non-identity sheets.
        non_identity = [h for h in links if 'lab-identity.css' not in h]
        assert non_identity[-1].startswith('styles/v70-7-unified.css'), (page, non_identity[-1])


def test_v707_navigation_panel_is_normalized_in_js():
    nav = read('src/navigation.js')
    assert 'function normalizeWorkbenchMenuPanel' in nav
    assert 'Standalone labs' in nav
    assert 'Workbench' in nav
    assert 'Bounds, starts & algorithms' in nav


def test_v707_home_is_product_landing_not_oversized_mock():
    h = soup('index.html').find(id='homeTitle')
    assert h and h.get_text(strip=True) == 'Foko Lab scientific modeling platform'
    css = read('styles/v70-7-unified.css')
    assert 'grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr)' in css
    assert 'font-size:clamp(2.25rem,4.2vw,3.65rem)' in css
    assert '.v70-dashboard' not in read('index.html')


def test_v707_sciml_diagnostic_toolbar_removes_duplicate_title_stack():
    css = read('styles/v70-7-unified.css')
    assert '.sciml-card-head.sciml-plot-head > div:first-child{display:none!important;}' in css
    assert 'grid-template-columns:46px minmax(0,1fr)' in css


def test_v707_theme_selector_is_utility_not_selected_tab():
    css = read('styles/v70-7-unified.css')
    assert 'background:rgba(255,255,255,.035)!important' in css
    assert 'box-shadow:none!important' in css
