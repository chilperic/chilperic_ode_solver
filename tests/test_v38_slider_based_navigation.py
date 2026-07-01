from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]
PAGES = ['index.html','workbench.html','ode.html','optimization.html','steady.html','stochastic.html','symbolic.html','agent.html','beauty.html','examples.html','research.html','platform.html','docs.html','tutorial.html','acknowledgement.html','contact.html']

def soup(page):
    return BeautifulSoup((ROOT/page).read_text(encoding='utf-8'), 'html.parser')

def test_slider_first_navigation_contract():
    for page in PAGES:
        s = soup(page)
        modern = [a.find('b').get_text(strip=True) for a in s.select('.workbench-menu .labs-menu-panel a')]
        legacy = [a.find('b').get_text(strip=True) for a in s.select('.legacy-menu .labs-menu-panel a')]
        assert modern == ['Main', 'Model Atlas', 'Symbolic', 'Agent'], page
        assert legacy == ['ODE', 'Optimization', 'Steady-State', 'Stochastic'], page
        assert 'Agent' not in legacy and 'Symbolic' not in legacy

def test_homepage_explains_legacy_by_control_surface():
    html = (ROOT/'index.html').read_text(encoding='utf-8')
    assert 'One Workbench layer for modern slider-first use' in html
    assert 'Legacy form-based labs' in html
    assert 'parameter control surface is still form/table based' in html
    assert 'Mathematical Beauty' in html

def test_dynamic_dropdown_closed_state_is_explicit():
    css = (ROOT/'styles/style.css').read_text(encoding='utf-8').replace(' ', '')
    js = (ROOT/'src/navigation.js').read_text(encoding='utf-8')
    assert '.labs-menu:not([open])>.labs-menu-panel{display:none!important;' in css
    assert 'pointerleave' in js and 'mouseleave' in js
    assert 'event.preventDefault()' in js
    assert 'aria-expanded' in js
