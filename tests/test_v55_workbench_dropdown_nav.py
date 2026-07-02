from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = [
    'ODE',
    'Stochastic CTMC',
    'Steady-State',
    'Optimization',
    'Symbolic',
    'Agent',
    'SciML',
    'Model Atlas',
]
LEGACY = ['ODE', 'Optimization', 'Steady-State', 'Stochastic']


def html_pages():
    return sorted(ROOT.glob('*.html')) + sorted((ROOT / 'research').glob('*.html'))


def menu_labels(path, selector):
    soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
    panel = soup.select_one(selector)
    assert panel is not None, f'{path} lacks {selector}'
    return [b.get_text(strip=True) for b in panel.select('a[role="menuitem"] b')]


def menu_hrefs(path, selector):
    soup = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
    panel = soup.select_one(selector)
    assert panel is not None, f'{path} lacks {selector}'
    return [a.get('href', '') for a in panel.select('a[role="menuitem"]')]


def test_workbench_dropdown_exposes_explicit_modeling_approaches_on_every_page():
    for path in html_pages():
        labels = menu_labels(path, 'details.workbench-menu .labs-menu-panel')
        assert labels == EXPECTED, f'{path} exposes {labels}'
        assert 'Model' not in labels
        assert 'Workbench' not in labels


def test_legacy_dropdown_remains_compatibility_layer_on_every_page():
    for path in html_pages():
        assert menu_labels(path, 'details.legacy-menu .labs-menu-panel') == LEGACY


def test_research_pages_use_parent_relative_workbench_links():
    for path in sorted((ROOT / 'research').glob('*.html')):
        hrefs = menu_hrefs(path, 'details.workbench-menu .labs-menu-panel')
        assert hrefs == [
            '../workbench.html?model=sir',
            '../workbench.html?model=stoch-sir',
            '../workbench.html?model=enzyme-steady',
            '../workbench.html?model=quadratic',
            '../symbolic.html',
            '../agent.html',
            '../sciml.html',
            '../examples.html',
        ]
