from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CORE_PAGES = ['index.html', 'workbench.html', 'statistics.html', 'beauty.html', 'docs.html', 'tutorial.html']
EXPECTED_TOP = ['Home', 'Modeling', 'Data / Analysis', 'Explore', 'Learn', 'Creator']


def soup(page):
    return BeautifulSoup((ROOT / page).read_text(encoding='utf-8'), 'html.parser')


def test_v70_13_header_is_not_flat_lab_accumulation():
    for page in CORE_PAGES:
        nav = soup(page).select_one('.topnav.foko-main-nav')
        assert nav is not None, page
        direct = [a.get_text(' ', strip=True) for a in nav.select(':scope > a')]
        summaries = [s.get_text(' ', strip=True) for s in nav.select(':scope > details > summary')]
        assert direct == ['Home'], (page, direct)
        assert summaries == ['Modeling', 'Focused Labs', 'SciML', 'Data / Analysis', 'Explore', 'Learn', 'Creator'], (page, summaries)
        assert 'Model Atlas' not in direct
        assert 'Research Hub' not in direct
        assert 'Documentation' not in direct
        assert 'Tutorial' not in direct


def test_v70_13_modeling_dropdown_groups_workflow_and_standalone_pages():
    nav = soup('index.html').select_one('.workbench-menu')
    primary = [b.get_text(strip=True) for b in nav.select('.menu-section-primary a b')]
    assert primary == ['ODE Lab', 'Stochastic Lab', 'Optimization Lab', 'Steady-State Lab', 'Symbolic Lab', 'Agent Lab']
    standalone_nav = soup('index.html').select_one('.standalone-menu')
    standalone = [b.get_text(strip=True) for b in standalone_nav.select('a b')]
    assert standalone == ['ODE + Parametric ODE', 'Stochastic CTMC', 'Optimization', 'Steady-State']


def test_v70_13_explore_makes_beauty_discoverable():
    explore = soup('index.html').select_one('[data-nav-menu="resources"]')
    labels = [b.get_text(strip=True) for b in explore.select('a b')]
    assert labels == ['Model Atlas', 'Mathematical Beauty']


def test_v70_14_creator_menu_contains_research_and_cvs():
    creator = soup('index.html').select_one('[data-nav-menu="creator"]')
    assert creator is not None
    labels = [b.get_text(strip=True) for b in creator.select('a b')]
    assert labels == ['CVs and profile', 'Research Hub', 'Personal website', 'Contact', 'Acknowledgement']
    assert creator.select_one('a[href="cv.html"]') is not None
    assert creator.select_one('a[href="research.html"]') is not None
