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
        assert modern == ['ODE','Stochastic CTMC','Steady-State','Optimization','Symbolic','Agent','Model Atlas'], page
        assert [a.get_text(strip=True) for a in s.select('.legacy-menu .labs-menu-panel a')] == ['ODE','Optimization','Steady-State','Stochastic'], page

def test_homepage_explains_legacy_by_control_surface():
    html = (ROOT/'index.html').read_text(encoding='utf-8')
    assert 'Modeling approaches' in html
    assert 'ODE · stochastic · optimization · symbolic · agent-based' in html
    assert 'Mathematical Beauty' in html

def test_dynamic_dropdown_closed_state_is_explicit():
    css = (ROOT/'styles/style.css').read_text(encoding='utf-8').replace(' ', '')
    js = (ROOT/'src/navigation.js').read_text(encoding='utf-8')
    assert '.labs-menu:not([open])>.labs-menu-panel{display:none!important;' in css
    assert 'pointerleave' in js and 'mouseleave' in js
    assert 'event.preventDefault()' in js
    assert 'aria-expanded' in js
