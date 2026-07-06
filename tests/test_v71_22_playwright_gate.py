from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def test_v71_22_playwright_project_files_exist():
    assert (ROOT / 'package.json').exists(), 'package.json is required for the e2e deploy gate'
    assert (ROOT / 'playwright.config.js').exists(), 'playwright.config.js must define the browser gate'
    assert (ROOT / 'tests/e2e/main-labs-smoke.spec.js').exists(), 'main-labs-smoke.spec.js must cover the deploy smoke path'


def test_v71_22_package_scripts_define_e2e_gate():
    pkg = json.loads((ROOT / 'package.json').read_text())
    assert pkg['scripts']['test:e2e'] == 'playwright test'
    assert '@playwright/test' in pkg['devDependencies']
    assert pkg['version'] == '71.46.0'


def test_v71_22_playwright_gate_covers_key_pages_and_workflows():
    spec = (ROOT / 'tests/e2e/main-labs-smoke.spec.js').read_text()
    required_pages = [
        '/ode.html', '/stochastic.html', '/steady.html', '/optimization.html',
        '/statistics.html', '/fitting.html', '/linear-algebra.html', '/networks.html', '/ml.html'
    ]
    for page in required_pages:
        assert page in spec, f'{page} must be covered by the e2e smoke gate'
    for marker in ['Save session', 'Export bundle', 'Copy share URL', 'Tau-leaping', 'Euler', 'Continuation']:
        assert marker in spec


def test_v71_22_no_user_facing_architecture_noise_reintroduced():
    html = ''.join(p.read_text(errors='ignore') for p in ROOT.glob('*.html'))
    forbidden = [
        'descriptor-driven statistics workspace',
        'engine is loaded from src/core',
        'layout is owned by the shared shell',
        'descriptor-shell migration proceeds',
    ]
    low = html.lower()
    for phrase in forbidden:
        assert phrase.lower() not in low
