from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def test_steady_state_has_two_parameter_continuation_controls():
    html = (ROOT / 'steady.html').read_text()
    required_ids = [
        'runContinuation2D',
        'steadyContParam2',
        'steadyCont2Min',
        'steadyCont2Max',
        'steadyCont2N',
    ]
    for id_ in required_ids:
        assert f'id="{id_}"' in html, f'{id_} must be exposed in the Steady-State UI'


def test_steady_state_plot_modes_include_bifurcation_and_2d_maps():
    html = (ROOT / 'steady.html').read_text()
    for value in ['bifurcation', 'classification', 'continuation-2d']:
        assert f'value="{value}"' in html
    assert 'Hopf/fold markers' in html
    assert '2D continuation map' in html


def test_steady_state_engine_classifies_hopf_fold_and_2d_continuation():
    js = (ROOT / 'src' / 'steady-state-lab.js').read_text()
    for symbol in [
        'function runContinuation2D',
        'function classifyBifurcation',
        'function eigenSummary',
        'fold candidate',
        'Hopf candidate',
        'fold crossing',
        'Hopf crossing',
        'continuation2D',
        'param1',
        'param2',
    ]:
        assert symbol in js
    assert re.search(r'trace\s*=|const tr=', js), '2D Jacobian trace must be computed'
    assert re.search(r'det\s*=|const .*det=', js), '2D Jacobian determinant must be computed'


def test_steady_state_exports_and_docs_describe_upgrade():
    steady = (ROOT / 'steady.html').read_text()
    assert '2D continuation maps' in steady
    assert 'Hopf/fold candidates' in steady
    docs = (ROOT / 'docs.html').read_text()
    tutorial = (ROOT / 'tutorial.html').read_text()
    for text in [docs, tutorial]:
        assert '2-parameter continuation' in text
        assert 'Hopf' in text
        assert 'fold' in text
        assert 'Steady-State' in text


def test_cache_token_normalized_to_71_18():
    for path in ROOT.rglob('*'):
        if path.is_file() and path.suffix in {'.html', '.js', '.css', '.json', '.md'}:
            try:
                text = path.read_text()
            except UnicodeDecodeError:
                continue
            stale = '?v=' + '71.17.0'
            assert stale not in text, f'stale v71.17 token in {path.relative_to(ROOT)}'
