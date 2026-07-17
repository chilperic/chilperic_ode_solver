from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def test_plot_registry_does_not_compete_with_focused_layout_controllers():
    source = (ROOT / 'src/v72/scientific-registry.js').read_text(encoding='utf-8')
    assert 'focused workspace is the sole owner' in source
    assert 'metadata-only' in source
    assert "select.addEventListener('change'" not in source
    assert 'MutationObserver' not in source
    assert 'grid.dataset.layout =' not in source
    assert 'grid.dataset.preferredLayout =' not in source


def test_navigation_uses_split_authored_panels_without_runtime_css_injection():
    test = (ROOT / 'tests/e2e/main-labs-smoke.spec.js').read_text(encoding='utf-8')
    navigation = (ROOT / 'src/navigation.js').read_text(encoding='utf-8')
    css = (ROOT / 'styles/v72-tokens.css').read_text(encoding='utf-8')
    for key in ('modeling', 'analysis', 'sciml', 'explore'):
        assert f'details[data-nav-menu="{key}"]' in test or f'data-nav-menu="{key}"' in (ROOT/'index.html').read_text(encoding='utf-8')
    assert 'Runtime style injection previously created another override layer' in navigation
    assert 'z-index: 1010' in css


def test_home_leads_with_a_core_computed_research_model():
    page = BeautifulSoup((ROOT / 'index.html').read_text(encoding='utf-8'), 'html.parser')
    assert page.select_one('#homeResearchPlot') is not None
    assert page.select_one('#homeResearchEvidence') is not None
    assert page.select_one('script[src^="src/core/ode.js"]') is not None
    assert page.select_one('script[src^="src/models/home-research-models.js"]') is not None
    assert page.select_one('script[src^="src/home-live-research.js"]') is not None
    assert len(page.select('.home-research-list > a')) == 4
    assert page.find(string=lambda value: value and 'Run the SIR example' in value) is None
    text = page.get_text(' ', strip=True).lower()
    assert 'not calibrated' in text
    assert 'does not establish bistability' in text
