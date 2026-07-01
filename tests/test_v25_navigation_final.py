from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
TOP = ['Home']
WORKBENCH = ['Model','Symbolic','Agent','Model Atlas']
LEARN = ['Docs','Tutorial','Platform']
ABOUT = ['Research','Mathematical Beauty','Acknowledgement','Contact']
PAGES = ['index.html','workbench.html','ode.html','optimization.html','steady.html','stochastic.html','symbolic.html','agent.html','beauty.html','examples.html','research.html','platform.html','docs.html','tutorial.html','acknowledgement.html','contact.html']

def soup(page): return BeautifulSoup((ROOT/page).read_text(encoding='utf-8'),'html.parser')
def labels(s, cls): return [a.find('b').get_text(strip=True) for a in s.select(f'.{cls} .labs-menu-panel a')]

def test_v40_compact_dropdown_navigation_contract():
    for page in PAGES:
        s=soup(page)
        assert [a.get_text(strip=True) for a in s.select('.topnav > a')] == TOP
        for cls in ['workbench-menu','learn-menu','about-menu']:
            assert s.select_one(f'details.{cls} summary') is not None, page
        assert labels(s, 'workbench-menu') == WORKBENCH
        assert labels(s, 'learn-menu') == LEARN
        assert labels(s, 'about-menu') == ABOUT

def test_labs_menu_is_dropdown_not_floating_bottom_bar():
    css=' '.join(p.read_text(encoding='utf-8') for p in (ROOT/'styles').glob('*.css'))
    assert '.labs-menu-panel{position:absolute' in css.replace(' ','') or '.labs-menu-panel {position:absolute' in css.replace(' ','')
    assert 'position:fixed' not in css[css.find('v32 clean dropdown navigation'):css.find('v32 clean dropdown navigation')+2000]
