from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    'index.html','workbench.html','ode.html','optimization.html','steady.html','stochastic.html',
    'symbolic.html','agent.html','beauty.html','examples.html','research.html','platform.html',
    'docs.html','tutorial.html','acknowledgement.html','contact.html'
]
WORKBENCH = ['ODE','Stochastic CTMC','Steady-State','Optimization','Symbolic','Agent','SciML','Model Atlas']


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')


def soup(rel: str) -> BeautifulSoup:
    return BeautifulSoup(read(rel), 'html.parser')


def labels(doc: BeautifulSoup, cls: str) -> list[str]:
    return [a.find('b').get_text(strip=True) for a in doc.select(f'.{cls} .labs-menu-panel a')]


def test_workbench_dropdown_is_complete_modeling_gateway_on_all_pages():
    for page in PAGES:
        doc = soup(page)
        assert labels(doc, 'workbench-menu') == WORKBENCH, page
        assert labels(doc, 'legacy-menu') == ['ODE','Optimization','Steady-State','Stochastic'], page
        assert labels(doc, 'learn-menu') == ['Docs','Tutorial','Platform'], page
        assert labels(doc, 'about-menu') == ['Research','Mathematical Beauty','Acknowledgement','Contact'], page


def test_home_exposes_all_major_modeling_routes_without_legacy_cluster():
    doc = soup('index.html')
    cards = [a.get_text(' ', strip=True) for a in doc.select('.identity-lab-grid.primary-routes a')]
    assert len(cards) == 9
    for term in ['Workbench', 'ODE', 'Optimization', 'Steady-State', 'Stochastic', 'Symbolic Lab', 'Agent Lab', 'SciML Lab', 'Model Atlas']:
        assert any(term in card for card in cards), term
    assert not doc.select('.legacy-lab-cluster')


def test_workbench_model_dropdown_contains_non_legacy_routes():
    doc = soup('workbench.html')
    assert doc.select_one('.mw-approach-map') is None
    js = read('src/model-workbench-v3.js')
    for token in ['route:symbolic', 'Open Symbolic Lab', 'route:agent', 'Open Agent Lab', 'route:atlas', 'Open Model Atlas']:
        assert token in js
    assert 'dataset?.href' in js and 'window.location.href=href' in js


def test_agent_plot_controls_live_inside_diagnostic_card_not_global_setup():
    doc = soup('agent.html')
    assert doc.select_one('.agent-plot-card #agentPlotMode') is not None
    assert doc.select_one('.agent-plot-card #agentPalette') is not None
    assert doc.select_one('.agent-selector-grid #agentPlotMode') is None
    assert doc.select_one('.agent-selector-grid #agentPalette') is None
    assert doc.select_one('#agentPlotContext') is not None


def test_agent_js_uses_model_aware_plot_modes_to_prevent_fadns_tcell_mismatch():
    js = read('src/agent-lab.js')
    for token in [
        'function allowedPlotModes', 'function defaultPlotMode', 'populatePlotModes(null,true)',
        "function isFadnsPlotModel", "kind==='fadns_particle'", "behavior==='fadns'", "return 'fadns_species'",
        'if(!allowedPlotModes(state.kind,ex).includes(mode))'
    ]:
        assert token in js


def test_agent_plot_surface_has_no_trace_fallback_and_resizes_plotly():
    js = read('src/agent-lab.js')
    css = read('styles/agent-lab.css')
    assert 'agent-empty-plot' in js
    assert 'Plotly.Plots.resize(box)' in js
    assert '.agent-plot-controls' in css
    assert '.agent-empty-plot' in css
