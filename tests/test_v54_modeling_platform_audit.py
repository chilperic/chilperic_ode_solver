from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')

def soup(path: str) -> BeautifulSoup:
    return BeautifulSoup(read(path), 'html.parser')


def test_v54_workbench_dropdown_exposes_explicit_model_classes():
    expected = ['ODE', 'Stochastic CTMC', 'Steady-State', 'Optimization', 'Symbolic', 'Agent', 'SciML', 'Model Atlas']
    for page in ['index.html','workbench.html','symbolic.html','agent.html','docs.html','examples.html']:
        doc = soup(page)
        labels = [a.get_text(strip=True) for a in doc.select('.workbench-menu .labs-menu-panel a')]
        assert labels == expected, page


def test_v54_agent_uses_absolute_initial_population_and_removes_explanatory_noise():
    html = read('agent.html')
    js = read('src/agent-lab.js')
    assert 'agentInitialCount' in html
    assert 'initialPopulationCount()' in js
    assert 'initialPopulationFraction()' in js
    for noisy in [
        'Parameter sliders use 0–100%',
        'runtime rates use value/100',
        'Set the initial percentage',
        'current view is stale',
    ]:
        assert noisy not in html
        assert noisy not in js


def test_v54_symbolic_result_is_direct_latex_equation_not_renderer_label():
    js = read('src/symbolic-lab.js')
    html = read('symbolic.html')
    assert '${left} = ${resultTex}' in js
    assert 'operatorname{simplify}' not in js
    assert 'Computed LaTeX' not in html
    assert 'Result' in html


def test_v54_research_models_are_visible_in_workbench_selector():
    js = read('src/model-workbench-v3.js')
    assert "Research / portfolio models" in js
    assert 'const currentIsResearch' not in js
    for model_id in ['fa-metabolism','fadns-coa','tcell','leaf-gas-steady','tcell-generation-fit-opt']:
        assert model_id in js


def test_v54_workbench_analysis_header_is_compact():
    css = read('styles/model-workbench-v3.css')
    assert 'v54: compact analysis header' in css
    assert 'grid-template-columns:auto minmax(360px,560px)' in css
    assert 'padding:10px 14px 14px' in css
