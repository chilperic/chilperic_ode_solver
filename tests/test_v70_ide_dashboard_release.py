from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(ROOT.glob('*.html')) + sorted((ROOT / 'research').glob('*.html'))
WORKBENCH_IDE = ['ODE Lab','Stochastic Lab','Optimization Lab','Steady-State Lab','Symbolic Lab','Agent Lab']
CLASSIC = ['Standalone ODE Lab','Standalone Stochastic Lab','Standalone Optimization Lab','Standalone Steady-State Lab']
TOP_LEVEL = ['Home','Workbench','SciML','Model Atlas','Research Hub','Documentation','Tutorial']


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def soup_path(path):
    return BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')


def test_v70_all_pages_use_dark_ide_header_with_research_hub():
    for path in PAGES:
        s = soup_path(path)
        header = s.select_one('.foko-ide-topbar[data-v70-nav="true"]')
        assert header is not None, path
        assert s.select_one('.topnav details.workbench-menu') is not None, path
        assert not s.select('.topnav details.legacy-menu'), path
        assert not s.select('.topnav details.learn-menu'), path
        assert not s.select('.topnav details.about-menu'), path
        text = s.select_one('.topnav').get_text(' ', strip=True)
        for label in TOP_LEVEL:
            assert label in text, (path, label)
        assert ' About' not in text, path


def test_v70_workbench_dropdown_contains_ide_and_classic_labs():
    for path in PAGES:
        s = soup_path(path)
        labels = [a.find('b').get_text(strip=True) for a in s.select('.workbench-menu .labs-menu-panel a')]
        assert labels[:6] == WORKBENCH_IDE, path
        assert labels[6:] == CLASSIC, path
        text = s.select_one('.workbench-menu .labs-menu-panel').get_text(' ', strip=True)
        assert 'Workbench IDE' in text, path
        assert 'Standalone labs' in text, path
        small = [a.find('small').get_text(strip=True) for a in s.select('.workbench-menu .labs-menu-panel a')]
        assert 'Deterministic ODEs' in small
        assert 'CTMC & Gillespie' in small
        assert 'Agent-based models' in small
        assert 'Focused deterministic solver' in small


def test_v70_home_is_product_landing_page_not_workbench_mock():
    s = BeautifulSoup(read('index.html'), 'html.parser')
    assert s.select_one('.home-v705') is not None
    assert s.select_one('.home-v705-hero') is not None
    assert s.select_one('.home-v705-profile') is not None
    assert s.select_one('.home-v705-route-grid') is not None
    assert s.select_one('.home-v705-card-grid') is not None
    assert s.select_one('.v70-dashboard') is None
    assert s.select_one('.v70-codebox') is None
    text = s.get_text(' ', strip=True)
    assert 'Foko Lab scientific modeling platform' in text
    assert 'Open Workbench' in text
    assert 'Foko Lab creator' not in read('index.html')
    assert 'Model. Simulate. Export.' not in read('index.html')


def test_v70_avatar_is_clickable_about_entry_point():
    for rel in ['index.html','workbench.html','docs.html','tutorial.html','research/photosynthesis.html']:
        s = BeautifulSoup(read(rel), 'html.parser')
        avatar = s.select_one('.profile-avatar-link img')
        assert avatar is not None, rel
        href = s.select_one('.profile-avatar-link').get('href')
        assert href.endswith('research.html'), (rel, href)


def test_v70_dropdown_contrast_and_layout_are_explicitly_hardened():
    css = read('styles/v70-5-home-nav.css')
    assert '.labs-menu-panel.v70-workbench-panel' in css
    assert 'background:#ffffff!important' in css
    assert 'display:flex!important' in css
    assert 'visibility:visible!important' in css
    assert '.menu-section-title' in css
    assert 'Standalone labs' in read('index.html')


def test_v70_visible_palette_uses_teal_blue_not_removed_magenta_tokens():
    corpus = read('styles/style.css') + read('styles/model-workbench-v3.css') + read('src/sciml-lab.js') + read('assets/brand/foko-lab-logo.svg')
    for bad in ['#E6007E', '#e6007e', '#d946ef', '#D946EF', '#c026d3', '#C026D3', '#e11d8f', '#E11D8F']:
        assert bad not in corpus
    assert '#00a7a7' in corpus or '#00A7A7' in corpus
    assert '#155EEF' in corpus
