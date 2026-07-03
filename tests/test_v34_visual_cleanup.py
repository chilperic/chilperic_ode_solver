import pytest
pytestmark = pytest.mark.skip(reason='Superseded by the v70 IDE dashboard/navigation contract.')
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
PAGES=['index.html','workbench.html','ode.html','optimization.html','steady.html','stochastic.html','symbolic.html','agent.html','beauty.html','examples.html','research.html','platform.html','docs.html','tutorial.html','acknowledgement.html','contact.html']

def soup(p): return BeautifulSoup((ROOT/p).read_text(encoding='utf-8'),'html.parser')

def test_public_header_is_quiet_and_dropdown_based():
    for page in PAGES:
        s=soup(page)
        labels=[a.get_text(strip=True) for a in s.select('.topnav > a')]
        assert labels == ['Home'], page
        assert len(s.select('.topnav details.workbench-menu')) == 1, page
        assert [a.get_text(strip=True) for a in s.select('.topnav details.legacy-menu .labs-menu-panel a')] == ['ODE','Optimization','Steady-State','Stochastic'], page
        assert len(s.select('.topnav details.learn-menu')) == 1, page
        assert len(s.select('.topnav details.about-menu')) == 1, page
        modern=[a.get_text(' ', strip=True) for a in s.select('.workbench-menu .labs-menu-panel a')]
        assert modern == ['ODE', 'Stochastic CTMC', 'Steady-State', 'Optimization', 'Symbolic', 'Agent', 'SciML', 'Model Atlas'], page

def test_removed_noisy_public_blocks():
    forbidden=['Labs Model Workbench ODE Optimization', 'SIR epidemicodedeterministic epidemiology', 'SectionsProjectsInstitutionsPlatform', 'Browser-native scientific modeling Foko Lab platform']
    for page in PAGES:
        text=soup(page).get_text('', strip=True)
        for bad in forbidden:
            assert bad not in text, (page,bad)

def test_home_restores_visual_identity_without_noisy_legacy_cards():
    s=soup('index.html')
    assert not s.select('.home-lab-card')
    assert len(s.select('.identity-lab-grid.primary-routes a')) == 9
    assert not s.select('.legacy-lab-cluster')
    text=s.get_text(' ', strip=True)
    assert 'Dr. Chilperic Armel Foko Kuate' in text
    assert 'Math Beauty' in text or 'Mathematical Beauty' in text

def test_visual_cleanup_css_present():
    css=(ROOT/'styles/style.css').read_text(encoding='utf-8')
    for token in ['v34 visual audit cleanup','v35 identity restoration','labs-menu-panel{position:absolute','identity-hero','credit-cards','institution-band']:
        assert token in css.replace(' ', '') or token in css
