from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def text(rel):
    return BeautifulSoup(read(rel), 'html.parser').get_text(' ', strip=True)

def test_agent_lab_exposes_rules_parameters_custom_code_and_import():
    html = read('agent.html')
    for token in [
        'Rule definition', 'Custom rule editor', 'agentRuleMode', 'agentCustomCode',
        'agentApplyRule', 'agentImport', 'agentCopyJson', 'agentParamGrid',
        'agentPlotMode', 'population time series', 'current composition', 'phase portrait',
        'event rates', 'trait distribution'
    ]:
        assert token in html
    assert html.index('Rule definition') < html.index('Agent model')


def test_agent_js_supports_custom_local_rule_and_richer_diagnostics():
    js = read('src/agent-lab.js')
    for token in [
        'new Function', 'customStep', 'compiledCustom', 'applyCustomRule',
        'function exportConfig', 'importJson', 'eventBag', 'customChanges',
        'mode===\'composition\'', 'mode===\'phase\'', 'mode===\'events\'', 'mode===\'trait\'',
        'countNeighbors', 'params()'
    ]:
        assert token in js


def test_symbolic_lab_has_real_plot_modes_and_numeric_equilibrium_surface():
    html = read('symbolic.html')
    for token in [
        'Symbolic plot preview', 'Numeric equilibria scan', 'symSweepParam', 'symTimeEnd',
        'symTimeStep', 'time1d', 'time2d', 'sweep1d', '2D vector field + nullcline scan',
        'parameter sweep'
    ]:
        assert token in html
    assert html.index('Symbolic plot preview') < html.index('LaTeX preview')


def test_symbolic_js_has_timecourse_root_scan_sweep_and_vector_field():
    js = read('src/symbolic-lab.js')
    for token in [
        'function rootScan1D', 'function numericEquilibria', 'function rk4Step',
        'function timeCourse', 'function sweep1D', 'function vectorField',
        'Plotly.react', 'symTimeEnd', 'symSweepParam', '1D parameter sweep / root scan'
    ]:
        assert token in js


def test_docs_and_tutorial_explain_v19_controls_without_overclaiming():
    docs = text('docs.html')
    tutorial = text('tutorial.html')
    for term in ['custom local JavaScript rule', 'cell neighbors counts params rand x y and t', 'Parameter sweep', 'Plot standard']:
        assert term in docs
    for term in ['custom local rule', 'Rule definition', 'Symbolic plot blank', 'Agent result unclear']:
        assert term in tutorial
    assert 'not a full in-browser CAS' in read('symbolic.html')
