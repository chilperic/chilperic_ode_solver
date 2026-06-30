from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html','workbench.html','ode.html','optimization.html','steady.html','stochastic.html','examples.html','research.html','platform.html','docs.html','tutorial.html','symbolic.html','agent.html','beauty.html']
EXPECTED = ['Home','Workbench Beta','ODE Lab','Optimization Lab','Steady-State Lab','Stochastic Lab','Symbolic Lab','Math Beauty','Model Atlas','Research Hub','Platform','Docs','Tutorial']

def labels(page):
    soup = BeautifulSoup((ROOT/page).read_text(encoding='utf-8'), 'html.parser')
    nav = soup.find('nav', attrs={'aria-label':'Primary navigation'})
    assert nav is not None, page
    return [a.get_text(' ', strip=True) for a in nav.find_all('a')]

def test_primary_navigation_exposes_symbolic_and_beauty_everywhere():
    for page in PAGES:
        labs = labels(page)
        for expected in EXPECTED:
            assert expected in labs, (page, expected, labs)
        assert labs.count('Symbolic Lab') == 1, page
        assert labs.count('Math Beauty') == 1, page

def test_primary_navigation_has_no_duplicate_labels():
    for page in PAGES:
        labs = labels(page)
        assert len(labs) == len(set(labs)), (page, labs)

def test_symbolic_and_beauty_pages_are_reachable_from_non_home_labs():
    for page in ['workbench.html','ode.html','optimization.html','steady.html','stochastic.html','examples.html','research.html','docs.html','tutorial.html']:
        html = (ROOT/page).read_text(encoding='utf-8')
        assert 'href="symbolic.html"' in html, page
        assert 'href="beauty.html"' in html, page
        assert 'href="agent.html"' in html, page
