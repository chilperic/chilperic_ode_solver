from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

def text(page):
    return (ROOT / page).read_text(encoding='utf-8')

def soup(page):
    return BeautifulSoup(text(page), 'html.parser')

def test_v706_stylesheet_loaded_on_public_pages():
    for page in ['index.html','workbench.html','docs.html','tutorial.html','sciml.html']:
        assert 'styles/v70-6-polish.css?v=71.46.0' in text(page), page

def test_home_no_giant_slogan_copy():
    h = soup('index.html').find(id='homeTitle')
    assert h and h.get_text(strip=True) == 'Foko Lab scientific modeling platform'
    assert 'Choose a model. Change assumptions. Run diagnostics. Export serious code.' not in text('index.html')

def test_docs_and_tutorial_plain_titles():
    assert soup('docs.html').find('h1').get_text(strip=True) == 'Documentation'
    assert soup('tutorial.html').find('h1').get_text(strip=True) == 'Tutorials'
    banned = ['Model first. Controls second.', 'Use the platform like a modeling IDE.', 'Do not start by clicking every plot']
    joined = text('docs.html') + text('tutorial.html')
    for phrase in banned:
        assert phrase not in joined

def test_workbench_menu_contains_visible_items_and_standalone_not_legacy_label():
    s = soup('workbench.html')
    panel = s.select_one('.v70-workbench-panel')
    assert panel is not None
    labels = [a.get_text(' ', strip=True) for a in panel.select('a')]
    assert any('ODE Lab' in x for x in labels)
    focused = [a.get_text(' ',strip=True) for a in s.select('.standalone-menu .labs-menu-panel a')]
    assert any('ODE + Parametric ODE' in x for x in focused)
    assert 'Classic / legacy labs' not in panel.get_text(' ', strip=True)
    assert 'Standalone scientific labs' in s.select_one('.standalone-menu .labs-menu-panel').get_text(' ', strip=True)
