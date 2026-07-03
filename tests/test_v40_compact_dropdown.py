import pytest
pytestmark = pytest.mark.skip(reason='Superseded by the v70 IDE dashboard/navigation contract.')
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html','workbench.html','ode.html','optimization.html','steady.html','stochastic.html','symbolic.html','agent.html','beauty.html','examples.html','research.html','platform.html','docs.html','tutorial.html','acknowledgement.html','contact.html']

def soup(page):
    return BeautifulSoup((ROOT/page).read_text(encoding='utf-8'), 'html.parser')

def labels(page, cls):
    return [a.find('b').get_text(strip=True) for a in soup(page).select(f'.{cls} .labs-menu-panel a')]

def test_dropdowns_are_labels_only_no_explanatory_spans():
    for page in PAGES:
        doc = soup(page)
        for panel in doc.select('.nav-menu .labs-menu-panel'):
            assert not panel.select('span'), page
            for a in panel.select('a'):
                assert a.find('b') is not None, page
                assert len(a.get_text(' ', strip=True).split()) <= 2, (page, a.get_text(' ', strip=True))

def test_compact_navigation_labels():
    assert labels('index.html', 'workbench-menu') == ['ODE','Stochastic CTMC','Steady-State','Optimization','Symbolic','Agent','SciML','Model Atlas']
    assert labels('index.html', 'legacy-menu') == ['ODE','Optimization','Steady-State','Stochastic']
    assert labels('index.html', 'learn-menu') == ['Docs', 'Tutorial', 'Platform']
    assert labels('index.html', 'about-menu') == ['Research', 'Mathematical Beauty', 'Acknowledgement', 'Contact']

def test_compact_menu_css_contract():
    css = (ROOT/'styles/style.css').read_text(encoding='utf-8')
    assert 'v40 compact dropdown contract' in css
    assert 'grid-template-columns:1fr!important' in css.replace(' ', '')
    assert '.nav-menu .labs-menu-panel a span' in css and 'display:none!important' in css.replace(' ', '')
