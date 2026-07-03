import pytest
pytestmark = pytest.mark.skip(reason='Superseded by the v70 IDE dashboard/navigation contract.')
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_LABELS = ['ODE', 'Stochastic CTMC', 'Steady-State', 'Optimization', 'Symbolic', 'Agent', 'SciML', 'Model Atlas']
EXPECTED_ROOT_HREFS = ['workbench.html?model=sir', 'workbench.html?model=stoch-sir', 'workbench.html?model=enzyme-steady', 'workbench.html?model=quadratic', 'symbolic.html', 'agent.html', 'sciml.html', 'examples.html']


def soup(rel):
    return BeautifulSoup((ROOT / rel).read_text(encoding='utf-8'), 'html.parser')


def test_workbench_global_dropdown_shortcuts_target_workbench_models_not_legacy_labs():
    for path in sorted(ROOT.glob('*.html')) + sorted((ROOT / 'research').glob('*.html')):
        s = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
        links = s.select('details.workbench-menu .labs-menu-panel a[role="menuitem"]')
        labels = [a.get_text(strip=True) for a in links]
        hrefs = [a.get('href', '') for a in links]
        prefix = '../' if path.parent.name == 'research' else ''
        assert labels == EXPECTED_LABELS, path
        assert hrefs == [prefix + h for h in EXPECTED_ROOT_HREFS], path
        assert 'ode.html#workbench' not in hrefs
        assert 'optimization.html' not in hrefs[:4]
        assert 'steady.html' not in hrefs[:4]
        assert 'stochastic.html' not in hrefs[:4]


def test_workbench_suite_tabs_shortcuts_target_workbench_model_selection_not_legacy_pages():
    for rel in ['workbench.html', 'symbolic.html', 'agent.html', 'sciml.html']:
        links = soup(rel).select('nav.workbench-suite-tabs a')
        assert [a.get_text(strip=True) for a in links] == EXPECTED_LABELS
        assert [a.get('href') for a in links] == EXPECTED_ROOT_HREFS


def test_legacy_dropdown_still_links_to_legacy_labs():
    s = soup('workbench.html')
    hrefs = [a.get('href') for a in s.select('details.legacy-menu .labs-menu-panel a[role="menuitem"]')]
    assert hrefs == ['ode.html#workbench', 'optimization.html', 'steady.html', 'stochastic.html']
