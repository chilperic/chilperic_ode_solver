from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html','workbench.html','ode.html','optimization.html','steady.html','stochastic.html','symbolic.html','agent.html','beauty.html','examples.html','research.html','platform.html','docs.html','tutorial.html','acknowledgement.html','contact.html']

def soup(page): return BeautifulSoup((ROOT/page).read_text(encoding='utf-8'),'html.parser')

def test_no_noisy_visible_lab_strip_or_concatenated_model_labels():
    forbidden = ['WorkbenchWorkbench', 'SIR epidemicodedeterministic epidemiology', 'Labs Model Workbench ODE Optimization', 'Explore / portfolio']
    for page in PAGES:
        text=soup(page).get_text(' ', strip=True)
        for bad in forbidden:
            assert bad not in text, (page,bad)

def test_labs_dropdown_is_single_clean_access_point():
    for page in PAGES:
        s=soup(page)
        assert len(s.select('.topnav details.workbench-menu')) == 1, page
        assert len(s.select('.topnav details.legacy-menu')) == 1, page
        assert len(s.select('.topnav details.learn-menu')) == 1, page
        assert len(s.select('.topnav details.about-menu')) == 1, page
        assert not s.select('.floating-labs, .floating-labs-toggle, .labs-strip'), page
