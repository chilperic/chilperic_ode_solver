import pytest
pytestmark = pytest.mark.skip(reason='Superseded by the v70 IDE dashboard/navigation contract.')
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html','workbench.html','ode.html','optimization.html','steady.html','stochastic.html','symbolic.html','agent.html','beauty.html','examples.html','research.html','platform.html','docs.html','tutorial.html','acknowledgement.html','contact.html']
WORKBENCH_LINKS = ['ODE','Stochastic CTMC','Steady-State','Optimization','Symbolic','Agent','SciML','Model Atlas']
LEARN_LINKS = ['Docs','Tutorial','Platform']
ABOUT_LINKS = ['Research','Mathematical Beauty','Acknowledgement','Contact']

def soup(page):
    return BeautifulSoup((ROOT/page).read_text(encoding='utf-8'),'html.parser')

def labels(s, cls):
    return [a.find('b').get_text(strip=True) for a in s.select(f'.{cls} .labs-menu-panel a')]

def test_clean_header_and_dropdown_available_on_all_pages():
    for page in PAGES:
        s=soup(page)
        top=[a.get_text(strip=True) for a in s.select('.topnav > a')]
        assert top == ['Home'], page
        assert s.select_one('.topnav details.workbench-menu summary').get_text(strip=True) == 'Workbench', page
        assert [a.get_text(strip=True) for a in s.select('.topnav details.legacy-menu .labs-menu-panel a')] == ['ODE','Optimization','Steady-State','Stochastic'], page
        assert s.select_one('.topnav details.learn-menu summary').get_text(strip=True) == 'Learn', page
        assert s.select_one('.topnav details.about-menu summary').get_text(strip=True) == 'About', page
        assert labels(s, 'workbench-menu') == WORKBENCH_LINKS
        assert labels(s, 'learn-menu') == LEARN_LINKS
        assert labels(s, 'about-menu') == ABOUT_LINKS

def test_no_old_noisy_nav_terms_in_header():
    for page in PAGES:
        text=' '.join(soup(page).select_one('.topnav').stripped_strings)
        assert 'Explore / portfolio' not in text
        assert 'Specialist labs' not in text
        assert 'WorkbenchWorkbench' not in text
