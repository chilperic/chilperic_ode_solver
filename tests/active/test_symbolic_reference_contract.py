from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / 'symbolic.html').read_text(encoding='utf-8')
SOUP = BeautifulSoup(HTML, 'html.parser')
CORE = (ROOT / 'src/core/symbolic-reference.js').read_text(encoding='utf-8')
CONTROLLER = (ROOT / 'src/v72/symbolic-workspace.js').read_text(encoding='utf-8')
PRESETS = (ROOT / 'src/models/symbolic-presets.js').read_text(encoding='utf-8')
CSS = (ROOT / 'styles/v72-symbolic.css').read_text(encoding='utf-8')


def test_symbolic_uses_authored_v72_shell():
    body = SOUP.body
    assert body is not None
    assert body.get('data-v72-shell') == 'true'
    assert body.get('data-lab') == 'symbolic'
    assert body.get('data-version') == '72.47.0'
    styles = [tag.get('href', '') for tag in SOUP.find_all('link', rel='stylesheet') if not tag.get('href', '').startswith('http')]
    assert styles == [
        'assets/vendor/katex/katex-0.16.47.min.css?v=72.47.0',
        'styles/v72-tokens.css?v=72.47.0',
        'styles/v72-lab-shell.css?v=72.47.0',
        'styles/v72-symbolic.css?v=72.47.0',
        'styles/v72-accessibility-performance.css?v=72.47.0',
    ]
    assert SOUP.select_one('main.layout')
    assert SOUP.select_one('.v72-workspace')
    assert SOUP.select_one('.v72-inspector')


def test_symbolic_core_is_pure_and_avoids_dynamic_code_execution():
    for forbidden in ['document.', 'querySelector', 'Plotly', 'localStorage', 'sessionStorage', 'eval(', 'new Function']:
        assert forbidden not in CORE
    for required in ['tokenize', 'parse', 'simplify', 'differentiate', 'jacobian', 'evaluateJacobian', 'findRoots1D', 'generateSympyScript']:
        assert required in CORE
    assert 'FokoSymbolicReference' in CORE
    assert 'FokoSteadyCore' in CONTROLLER


def test_scope_is_explicitly_limited_and_scientifically_bounded():
    text = SOUP.get_text(' ', strip=True).lower()
    for phrase in [
        'deliberately narrow browser grammar',
        'not a general computer algebra system',
        'general integration',
        'exact solving',
        'finite range',
        'do not prove that all roots or equilibria were found',
    ]:
        assert phrase in text
    assert 'domain-changing cancellation' in CORE
    assert 'not proof of non-existence' in CONTROLLER
    assert 'repeated tangent roots can be missed' in CONTROLLER


def test_interface_exposes_two_focus_and_distinct_plot_contract():
    modes = {node.get('data-layout-mode') for node in SOUP.select('[data-layout-mode]')}
    assert modes == {'two', 'focus'}
    assert [node.get('data-plot-card') for node in SOUP.select('[data-plot-card]')] == ['left', 'right']
    for side in ('left', 'right'):
        card = SOUP.select_one(f'[data-plot-card="{side}"]')
        assert card
        assert card.find(id=f'{side}Plot')
        assert card.find(id=f'{side}PlotType')
        assert card.select_one('.chart-controls')
    assert 'ensureDistinctPlots' in CONTROLLER
    assert 'thirdPlot' not in CONTROLLER
    assert "const VALID_SIDES = new Set(['left', 'right'])" in CONTROLLER


def test_plot_headers_keep_titles_separate_from_controls():
    assert '.chart-title h3' in CSS
    assert '.chart-controls' in CSS
    assert 'display: block' in CSS
    for card in SOUP.select('.chart-card'):
        title = card.select_one('.chart-title > h3')
        controls = card.select_one('.chart-title > .chart-controls')
        assert title is not None and controls is not None
        assert controls.find('select') is not None


def test_required_inputs_diagnostics_and_exports_exist():
    required_ids = [
        'symbolicVariables', 'symbolicParameters', 'symbolicExpressions', 'symbolicScope',
        'symbolicSelectedExpression', 'symbolicDerivativeVariable', 'symbolicOperation',
        'symbolicXMin', 'symbolicXMax', 'symbolicSamples', 'symbolicRootTolerance',
        'symbolicEquations', 'symbolicDiagnostics', 'symbolicTopStatus', 'symbolicRuntime',
        'provenanceStatus', 'provenanceMethod', 'provenanceData', 'provenanceAssumptions',
        'saveSymbolicSession', 'restoreSymbolicSession', 'copySymbolicShareUrl',
        'exportSymbolicCsv', 'exportSymbolicJson', 'exportSymbolicPython',
    ]
    assert not [element_id for element_id in required_ids if SOUP.find(id=element_id) is None]
    assert 'configuration only' in SOUP.get_text(' ', strip=True).lower()
    assert 'Computed evidence was not restored' in CONTROLLER


def test_presets_cover_expression_system_root_and_elementary_function_cases():
    assert PRESETS.count('note:') >= 12
    for title in [
        'Logistic growth', 'Cubic multistability residual', 'Linear harmonic oscillator',
        'Lotka–Volterra predator–prey', 'Mutual repression toggle',
        'FitzHugh–Nagumo system', 'SIR epidemic vector field', 'Nonlinear pendulum',
        'Enzyme–complex balances',
    ]:
        assert title in PRESETS


def test_controller_does_not_restructure_dom_after_load():
    for forbidden in ['MutationObserver', 'ResizeObserver', 'appendChild(', 'insertBefore(', 'replaceChildren(']:
        assert forbidden not in CONTROLLER


def test_page_loads_only_reference_symbolic_runtime():
    scripts = [node.get('src', '') for node in SOUP.find_all('script') if node.get('src')]
    assert 'src/core/symbolic-reference.js?v=72.47.0' in scripts
    assert 'src/v72/symbolic-workspace.js?v=72.47.0' in scripts
    assert not any('symbolic-lab.js' in src for src in scripts)
    assert not (ROOT / 'src/symbolic-lab.js').exists()


def test_no_duplicate_ids():
    ids = [node['id'] for node in SOUP.find_all(id=True)]
    assert len(ids) == len(set(ids))
