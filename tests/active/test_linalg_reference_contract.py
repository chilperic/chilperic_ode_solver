from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
HTML = (ROOT / 'linear-algebra.html').read_text(encoding='utf-8')
SOUP = BeautifulSoup(HTML, 'html.parser')
CORE = (ROOT / 'src/core/linalg-reference.js').read_text(encoding='utf-8')
CONTROLLER = (ROOT / 'src/v72/linalg-workspace.js').read_text(encoding='utf-8')
PRESETS = (ROOT / 'src/models/linalg-presets.js').read_text(encoding='utf-8')


def test_linalg_uses_authored_v72_shell():
    body = SOUP.body
    assert body is not None
    assert body.get('data-v72-shell') == 'true'
    assert body.get('data-lab') == 'linalg'
    assert body.get('data-version') == '72.48.0'
    styles = [tag.get('href', '') for tag in SOUP.find_all('link', rel='stylesheet') if not tag.get('href', '').startswith('http')]
    assert styles == [
        'styles/v72-tokens.css?v=72.48.0',
        'styles/v72-lab-shell.css?v=72.48.0',
        'styles/v72-accessibility-performance.css?v=72.48.0',
    ]
    assert SOUP.select_one('main.layout')
    assert SOUP.select_one('.v72-workspace')
    assert SOUP.select_one('.v72-inspector')


def test_reference_core_is_pure_and_reports_numerical_evidence():
    for forbidden in ['document.', 'querySelector', 'Plotly', 'localStorage', 'sessionStorage']:
        assert forbidden not in CORE
    for required in ['solveLinear', 'relativeResidual', 'leastSquares', 'symmetricEigenDecomposition', 'residuals', 'singularValueDiagnostics', 'conditionEstimate', 'nullSpace', 'stationaryDistribution']:
        assert required in CORE
    assert 'FokoLinalgReference' in CONTROLLER


def test_interface_exposes_two_focus_and_independent_selectors():
    modes = {node.get('data-layout-mode') for node in SOUP.select('[data-layout-mode]')}
    assert modes == {'two', 'focus'}
    assert [node.get('data-plot-card') for node in SOUP.select('[data-plot-card]')] == ['left', 'right']
    for side in ('left', 'right'):
        card = SOUP.select_one(f'[data-plot-card="{side}"]')
        assert card
        assert card.find(id=f'{side}Plot')
        assert card.find(id=f'{side}PlotType')
        assert card.find(id=f'{side}Plot').find(id=f'{side}PlotType') is None
    assert 'effectiveLayout' in CONTROLLER
    assert 'thirdPlot' not in CONTROLLER


def test_scientific_claims_are_bounded():
    text = SOUP.get_text(' ', strip=True).lower()
    assert 'small dense matrices' in text
    assert 'conditioning quantifies sensitivity' in text
    assert 'does not certify' in CONTROLLER.lower()
    assert 'not a production svd' in CORE.lower()
    assert 'uniqueness, irreducibility and mixing time are not certified' in CONTROLLER.lower()


def test_required_controls_diagnostics_and_exports_exist():
    required_ids = [
        'linalgMatrix', 'linalgVector', 'linalgOperation', 'linalgTolerance', 'linalgMaxIterations',
        'linalgTopStatus', 'linalgResidualMetric', 'linalgRank', 'linalgCondition', 'linalgDiagnostics',
        'provenanceStatus', 'provenanceMethod', 'provenanceData', 'provenanceAssumptions', 'provenanceWarning',
        'saveLinalgSession', 'restoreLinalgSession', 'copyLinalgShareUrl', 'exportLinalgCsv', 'exportLinalgJson', 'exportLinalgPython'
    ]
    assert not [element_id for element_id in required_ids if SOUP.find(id=element_id) is None]
    assert 'configuration only' in SOUP.get_text(' ', strip=True).lower()
    assert 'Computed evidence was not restored' in CONTROLLER


def test_presets_cover_core_failure_and_interpretation_cases():
    assert PRESETS.count('note:') >= 8
    for title in ['Hilbert conditioning stress test', 'Rank-deficient matrix', 'Finite Markov chain', 'Correlated observations for PCA']:
        assert title in PRESETS


def test_controller_does_not_restructure_dom_after_load():
    for forbidden in ['MutationObserver', 'ResizeObserver', 'appendChild(', 'insertBefore(', 'replaceChildren(']:
        assert forbidden not in CONTROLLER


def test_no_duplicate_ids():
    ids = [node['id'] for node in SOUP.find_all(id=True)]
    assert len(ids) == len(set(ids))
