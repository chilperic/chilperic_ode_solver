from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
HTML = list(ROOT.glob('*.html')) + list((ROOT / 'research').glob('*.html'))

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')

def test_home_is_not_an_ide_mock():
    s = soup('index.html')
    text = s.get_text(' ', strip=True)
    assert s.select_one('.home-v705')
    assert not s.select_one('.v70-dashboard')
    assert not s.select_one('.v70-codebox')
    assert 'Open Workbench' in text
    assert 'Run SIR example' in text
    assert 'Browse Model Atlas' in text

def test_dropdown_links_are_actual_visible_menu_items():
    for path in HTML:
        s = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
        panel = s.select_one('.workbench-menu .labs-menu-panel')
        assert panel is not None, path
        items = panel.select('a[role="menuitem"]')
        assert len(items) == 6, path
        focused = s.select_one('.standalone-menu .labs-menu-panel')
        assert focused is not None, path
        assert len(focused.select('a[role="menuitem"]')) == 4, path
        labels = [item.get_text(' ', strip=True) for item in items]
        focused_labels = [item.get_text(' ', strip=True) for item in focused.select('a[role="menuitem"]')]
        for expected in ['ODE Lab', 'Stochastic Lab', 'Optimization Lab', 'Steady-State Lab', 'Symbolic Lab', 'Agent Lab']:
            assert any(expected in label for label in labels), (path, expected, labels)
        assert any('ODE + Parametric ODE' in label for label in focused_labels), (path, focused_labels)

def test_dropdown_css_forces_non_blank_content():
    css = read('styles/v70-5-home-nav.css')
    for token in ['display:flex!important', 'visibility:visible!important', 'opacity:1!important', 'grid-template-columns:34px minmax(0,1fr)!important']:
        assert token in css

def test_release_token_is_v70_5_for_html_assets():
    for path in HTML:
        html = path.read_text(encoding='utf-8')
        assert '?v=71.46.0' in html, path
        for old in ['70.13.0','70.19.0','70.11.0','70.10.0','70.15.0','2.7.5','3.2.0']:
            assert ('?v=' + old) not in html, path
