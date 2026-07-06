from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def soup(page):
    return BeautifulSoup((ROOT/page).read_text(encoding='utf-8'), 'html.parser')

def test_creator_menu_is_separate_from_explore_and_contains_cvs():
    s = soup('index.html')
    summaries = [x.get_text(' ', strip=True) for x in s.select('.topnav > details > summary')]
    assert summaries == ['Modeling', 'Focused Labs', 'SciML', 'Data / Analysis', 'Explore', 'Learn', 'Creator']
    explore = [b.get_text(strip=True) for b in s.select('[data-nav-menu="resources"] a b')]
    creator = [b.get_text(strip=True) for b in s.select('[data-nav-menu="creator"] a b')]
    assert explore == ['Model Atlas', 'Mathematical Beauty']
    assert creator == ['CVs and profile', 'Research Hub', 'Personal website', 'Contact', 'Acknowledgement']

def test_cv_page_exists_and_downloads_all_versions():
    s = soup('cv.html')
    text = s.get_text(' ', strip=True)
    for term in ['Multiscale Modeller', 'Applied Mathematician', 'Computational Biology', 'German B1+']:
        assert term.lower() in text.lower()
    for href in ['assets/cv/academic_cv.pdf','assets/cv/industry_cv.pdf','assets/cv/industry_cv_german.pdf']:
        assert s.select_one(f'a[href="{href}"]') is not None
        assert (ROOT / href).exists()

def test_research_hub_is_no_longer_in_explore_menu():
    s = soup('index.html')
    explore_text = s.select_one('[data-nav-menu="resources"]').get_text(' ', strip=True)
    creator_text = s.select_one('[data-nav-menu="creator"]').get_text(' ', strip=True)
    assert 'Research Hub' not in explore_text
    assert 'Research Hub' in creator_text
