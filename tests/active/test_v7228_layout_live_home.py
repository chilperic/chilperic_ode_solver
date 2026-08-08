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


def test_navigation_uses_a_portal_shell_without_runtime_style_injection():
    test = (ROOT / 'tests/e2e/main-labs-smoke.spec.js').read_text(encoding='utf-8')
    navigation = (ROOT / 'src/v76/app-shell.js').read_text(encoding='utf-8')
    css = (ROOT / 'styles/v76-system.css').read_text(encoding='utf-8')
    for key in ('experiment', 'analyze', 'profile'):
        assert f'data-v76-trigger="{key}"' in navigation
    assert 'data-v76-trigger="project"' not in navigation
    assert "GROUPS.project.sections[0].items" in navigation
    assert 'data-v76-trigger="experiment"' in test
    assert "doc.body.appendChild(portal)" in navigation
    assert "positionPopover" in navigation
    assert ".v76-popover" in css and "position: fixed" in css


def test_home_leads_with_a_core_computed_research_model():
    page = BeautifulSoup((ROOT / 'index.html').read_text(encoding='utf-8'), 'html.parser')
    assert page.select_one('#homeResearchPlot') is not None
    assert page.select_one('#homeResearchEvidence') is not None
    assert page.select_one('script[src^="src/core/ode.js"]') is not None
    assert page.select_one('script[src^="src/models/home-research-models.js"]') is not None
    assert page.select_one('script[src^="src/home-live-research.js"]') is not None
    assert len(page.select('.foko-feature-grid > .foko-feature-card')) == 6
    assert page.find(string=lambda value: value and 'Run the SIR example' in value) is None
    text = page.get_text(' ', strip=True).lower()
    assert 'research-derived ode' in text
    assert 'research boundary' in text
