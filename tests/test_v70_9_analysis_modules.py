from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
PAGES=['statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html']
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def soup(p): return BeautifulSoup(read(p),'html.parser')

def test_tier1_tier2_pages_exist_and_have_tools():
    shell=read('src/platform/shell.js')
    assert 'analysis-run-main' in shell
    assert 'analysis-data-preview' in shell
    for page in PAGES:
        s=soup(page)
        assert s.select_one('.foko-ide-topbar[data-v70-nav="true"]') is not None, page
        assert s.select_one('main.analysis-page') is not None, page
        assert s.select_one('[id$="ShellApp"]') is not None, page

def test_analysis_navigation_is_available_everywhere():
    for page in ['index.html','workbench.html','docs.html','tutorial.html','research.html']+PAGES:
        s=soup(page); menu=s.select_one('.topnav details.analysis-menu')
        assert menu is not None, page
        labels=[b.get_text(strip=True) for b in menu.select('a b')]
        assert labels == ['Statistics','Curve fitting','Linear algebra','Networks'], (page, labels)

def test_home_promotes_analysis_and_beauty():
    s=soup('index.html'); main=s.select_one('main')
    assert main.select_one('a[href="beauty.html"]') is not None
    for href in ['statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html']:
        assert main.select_one(f'a[href="{href}"]') is not None

def test_logo_assets_are_teal_blue_no_magenta():
    corpus=read('assets/brand/foko-lab-logo.svg')+read('assets/brand/foko-lab-mark.svg')
    for bad in ['#E6007E','#e6007e','#d946ef','#D946EF','#c026d3','#C026D3']:
        assert bad not in corpus
    assert '#2DD4BF' in corpus and '#155EEF' in corpus

def test_active_state_css_is_stronger_than_hover_only():
    css=read('styles/v70-7-unified.css')
    assert "details > summary[aria-current='page']" in css
    assert 'inset 0 -4px 0 #8ff4ef' in css
    assert '.analysis-menu-panel' in css

def test_v70_11_ml_toolkit_is_under_sciml_not_analysis():
    s=soup('index.html')
    assert 'ML Toolkit' not in [b.get_text(strip=True) for b in s.select('.analysis-menu a b')]
    assert 'ML Toolkit' in [b.get_text(strip=True) for b in s.select('.sciml-menu a b')]
