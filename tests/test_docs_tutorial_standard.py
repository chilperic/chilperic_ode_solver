from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

WORKBENCH = ['ODE', 'Stochastic CTMC', 'Steady-State', 'Optimization', 'Symbolic', 'Agent', 'Model Atlas']
LEARN = ['Docs', 'Tutorial', 'Platform']
ABOUT = ['Research', 'Mathematical Beauty', 'Acknowledgement', 'Contact']

def soup(name): return BeautifulSoup((ROOT/name).read_text(encoding='utf-8'),'html.parser')

def menu_labels(s, cls):
    return [a.find('b').get_text(strip=True) for a in s.select(f'.{cls} .labs-menu-panel a')]

def test_docs_and_tutorial_keep_clean_header():
    for name in ['docs.html','tutorial.html']:
        s = soup(name)
        labels=[a.get_text(strip=True) for a in s.select('.topnav > a')]
        assert labels == ['Home']
        assert menu_labels(s, 'workbench-menu') == WORKBENCH
        assert [a.get_text(strip=True) for a in s.select('.topnav details.legacy-menu .labs-menu-panel a')] == ['ODE','Optimization','Steady-State','Stochastic']
        assert menu_labels(s, 'learn-menu') == LEARN
        assert menu_labels(s, 'about-menu') == ABOUT

def test_docs_standard_content_remains():
    html=(ROOT/'docs.html').read_text(encoding='utf-8')
    for term in ['Core workflow','Custom models','Scientific limits','Agent Lab','Symbolic Lab','Steady-State Lab']:
        assert term in html

def test_tutorial_standard_content_remains():
    html=(ROOT/'tutorial.html').read_text(encoding='utf-8')
    for term in ['Equation model','Symbolic route','Agent route','Workbench route','Failure checks']:
        assert term in html


def test_workbench_suite_tabs_are_explicit_modeling_approaches():
    doc = soup('workbench.html')
    labels = [a.get_text(strip=True) for a in doc.select('.mw-suite-tabs a')]
    assert labels == WORKBENCH
    assert 'Model' not in labels
    for menu in doc.select('.workbench-menu .labs-menu-panel a'):
        assert not menu.find('span')
