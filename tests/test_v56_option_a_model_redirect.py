from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SUITE_EXPECTED = [
    'ODE',
    'Stochastic CTMC',
    'Steady-State',
    'Optimization',
    'Symbolic',
    'Agent',
    'SciML',
    'Model Atlas',
]


def soup(rel: str):
    return BeautifulSoup((ROOT / rel).read_text(encoding='utf-8'), 'html.parser')


def suite_labels(rel: str):
    nav = soup(rel).select_one('nav.workbench-suite-tabs')
    assert nav is not None, f'{rel} lacks Workbench suite tabs'
    return [a.get_text(strip=True) for a in nav.select('a')]


def test_workbench_suite_tabs_do_not_expose_generic_model_tab():
    for rel in ['workbench.html', 'symbolic.html', 'agent.html', 'sciml.html']:
        labels = suite_labels(rel)
        assert labels == SUITE_EXPECTED
        assert 'Model' not in labels


def test_model_html_is_redirect_only_not_a_visible_suite_route():
    html = (ROOT / 'model.html').read_text(encoding='utf-8')
    s = BeautifulSoup(html, 'html.parser')
    assert 'url=workbench.html' in html
    assert "window.location.replace('workbench.html')" in html
    assert s.select_one('nav.workbench-suite-tabs') is None
    assert s.select_one('a[href="workbench.html"]') is not None


def test_symbolic_and_agent_keep_correct_active_suite_tab():
    symbolic_active = soup('symbolic.html').select_one('nav.workbench-suite-tabs a.active')
    agent_active = soup('agent.html').select_one('nav.workbench-suite-tabs a.active')
    assert symbolic_active.get_text(strip=True) == 'Symbolic'
    assert symbolic_active.get('aria-current') == 'page'
    assert agent_active.get_text(strip=True) == 'Agent'
    assert agent_active.get('aria-current') == 'page'
