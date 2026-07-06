from pathlib import Path
from bs4 import BeautifulSoup
import re

ROOT = Path(__file__).resolve().parents[1]

def read(page):
    return (ROOT / page).read_text(encoding='utf-8')

def soup(page):
    return BeautifulSoup(read(page), 'html.parser')


def test_homepage_creator_photo_restored_from_identity_lineage():
    s = soup('index.html')
    card = s.select_one('[data-v7110-photo-card="true"]')
    assert card is not None
    photo = card.select_one('img[src*="assets/profile-chilperic.webp"]')
    assert photo is not None
    assert 'assets/profile-chilperic.webp?v=71.46.0' in photo.get('src', '')
    assert card.select_one('img.creator-platform-mark') is None


def test_homepage_and_docs_explain_standalone_labs_as_focused_power_surfaces():
    home = read('index.html')
    docs = read('docs.html')
    assert 'data-v7110-focused-home="true"' in home
    assert 'Why the standalone labs remain more powerful' not in home
    assert 'data-v719-standalone-docs="true"' in docs
    assert 'Focused Labs: scope and depth roadmap' in docs
    for phrase in ['event handling', 'tau-leaping', 'method families', 'two-parameter continuation']:
        assert phrase in docs


def test_each_standalone_page_has_no_homepage_style_power_brief_and_keeps_core_controls():
    required = {
        'ode.html': ['runBtn', 'runSweep', 'sweepVar'],
        'stochastic.html': ['runModel', 'modelLibrary', 'exportsBlock'],
        'optimization.html': ['runOpt', 'exportsBlock'],
        'steady.html': ['solveSteady', 'runContinuation', 'exportsBlock'],
    }
    for page, ids in required.items():
        html = read(page)
        key = page.replace('.html', '')
        assert f'data-v719-standalone-power="{key}"' not in html
        assert 'Focused standalone workspace with direct domain controls' not in html
        assert 'standalone-route-notice' not in html
        assert 'location.replace(' not in html
        s = BeautifulSoup(html, 'html.parser')
        for element_id in ids:
            assert s.select_one(f'#{element_id}') is not None, f'{page} lost #{element_id}'


def test_v71_9_cache_token_normalized():
    tokens = set()
    for p in ROOT.rglob('*.html'):
        tokens.update(re.findall(r'\?v=([0-9]+\.[0-9]+\.[0-9]+)', p.read_text(encoding='utf-8')))
    assert tokens == {'71.46.0'}


def test_v71_9_audit_exists_and_states_no_engine_changes():
    audit = read('release-audits/AUDIT-v71-9-unified-identity-standalone-depth.md')
    assert 'No solver engine was modified' in audit
    assert 'standalone labs are not redirects' in audit or 'not redirects' in audit
