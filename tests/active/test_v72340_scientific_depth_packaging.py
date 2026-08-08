from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_release_identity_is_v72340():
    version = json.loads(text('VERSION.json'))
    assert version == {'version': '77.4.1', 'token': '77.4.1'}
    assert '"version": "77.4.1"' in text('package.json')


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
    assert '<h2 id="routesTitle">Start with the system, not a menu of methods.</h2>' in page


def test_local_script_uses_new_port_and_preflight():
    script = text('test-v77.4.1-local.sh')
    assert 'FOKOLAB_PORT' in script
    assert "sock.bind(('127.0.0.1', 0))" in script
    assert 'EXPECTED_VERSION="77.4.1"' in script
    assert "node -e \"const v=require('./VERSION.json')" in script
    assert 'test:sensitivity-offline' in script
    assert 'All requested validation gates passed.' in script
    assert 'exec python3 -m http.server "$FOKOLAB_PORT"' in script


def test_stale_token_preflight_uses_exact_previous_release():
    script = text('test-v77.4.1-local.sh')
    assert 'PREVIOUS_VERSION="76.2.0"' in script
    assert "previous='76.2.0'" in script
    assert 'EXPECTED_VERSION' in script


def test_local_runner_owns_writable_dependency_caches():
    script = text('test-v77.4.1-local.sh')
    assert 'NPM_CACHE="${FOKOLAB_NPM_CACHE:-${TMPDIR:-/tmp}/fokolab-v77.4.1-npm-cache}"' in script
    assert 'export NPM_CONFIG_CACHE="$NPM_CACHE"' in script
    assert 'mkdir -p "$NPM_CACHE" "$PLAYWRIGHT_BROWSERS_PATH"' in script
    assert "require('@playwright/test')" in script


def test_failed_runner_keeps_terminal_open_and_does_not_start_server():
    script = text('test-v77.4.1-local.sh')
    assert 'set -euo pipefail' in script
    assert script.index('All requested validation gates passed.') < script.index('exec python3 -m http.server "$FOKOLAB_PORT"')


def test_atlas_browser_contract_tracks_quality_not_historical_count():
    suite = text('tests/e2e/main-labs-smoke.spec.js')
    block = suite[suite.index("test('Model Atlas exposes a large provenance-classified catalog'"):suite.index("test('Model Atlas deep links", suite.index("test('Model Atlas exposes a large provenance-classified catalog'"))]
    assert '124 of 124' not in block
    assert 'toBeGreaterThanOrEqual(180)' in block
    assert '.v72-atlas-badge.provenance' in block
    assert '.v72-atlas-badge.status' in block
    assert "fill('Hilbert')" in block
