from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_release_identity_is_v72340():
    version = json.loads(text('VERSION.json'))
    assert version == {'version': '72.46.0', 'token': '72.46.0'}
    assert '"version": "72.46.0"' in text('package.json')


def test_layout_arrow_navigation_is_capture_phase_focus_only():
    source = text('src/v72/accessibility-performance.js')
    assert "group.addEventListener('keydown'" in source
    assert '}, true);' in source
    assert 'items[next].focus()' in source
    assert 'event.stopPropagation()' in source
    assert '.click()' not in source[source.index('function wireArrowNavigation'):source.index('function enhanceStaticSemantics')]


def test_home_stochastic_worker_compiles_propensities_before_core_call():
    worker = text('src/home-demo-worker.js')
    assert 'function compileStochasticPreset' in worker
    assert 'propensity: function (state)' in worker
    assert 'model: compileStochasticPreset(preset)' in worker
    assert 'FokoStochasticCore.simulateEnsemble' in worker


def test_home_platform_statement_is_semantic_heading():
    page = text('index.html')
    assert '<h2 id="homePlatformAnswerTitle">From model to evidence</h2>' in page


def test_local_script_uses_new_port_and_preflight():
    script = text('test-v72.46.0-local.sh')
    assert 'PORT=8100' in script
    assert 'EXPECTED_VERSION="72.46.0"' in script
    assert 'Release identity and manifest preflight' in script
    assert 'test:sensitivity-offline' in script
    assert 'Complete 123-test browser suite' in script
    assert 'exec python3 -m http.server "$PORT"' in script


def test_stale_token_preflight_uses_exact_previous_release():
    script = text('test-v72.46.0-local.sh')
    assert 'PREVIOUS_VERSION="72.45.0"' in script
    assert "assert f'?v={previous}' not in text" in script
    assert 'stale runtime token' in script


def test_failed_runner_keeps_terminal_open_and_does_not_start_server():
    script = text('test-v72.46.0-local.sh')
    assert 'keep_terminal_open()' in script
    assert 'exec "${SHELL:-/bin/bash}" -i' in script
    assert 'No server was started' in script
    assert script.index('Complete 123-test browser suite') < script.index('exec python3 -m http.server "$PORT"')


def test_atlas_browser_contract_tracks_quality_not_historical_count():
    suite = text('tests/e2e/main-labs-smoke.spec.js')
    block = suite[suite.index("test('Model Atlas exposes a large provenance-classified catalog'"):suite.index("test('Model Atlas deep links", suite.index("test('Model Atlas exposes a large provenance-classified catalog'"))]
    assert '124 of 124' not in block
    assert 'toBeGreaterThanOrEqual(180)' in block
    assert '.v72-atlas-badge.provenance' in block
    assert '.v72-atlas-badge.status' in block
    assert "fill('Hilbert')" in block
