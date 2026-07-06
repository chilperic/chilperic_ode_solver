import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
CSS = ROOT / 'styles' / 'lab-identity.css'
SHELL = ROOT / 'src' / 'platform' / 'shell.js'
VERSION = ROOT / 'VERSION.json'
STAMP = ROOT / 'scripts' / 'stamp-version.js'

EXPECTED_ACCENTS = {
    'body[data-lab="ode"]': '#0e7c86',
    'body[data-lab="model-workbench"]': '#0e7c86',
    'body[data-lab="stochastic"]': '#4338ca',
    'body[data-lab="optimization"]': '#1d4ed8',
    'body[data-lab="steady"]': '#0e7490',
    'body[data-lab="symbolic"]': '#7c3aed',
    'body[data-lab="agent"]': '#4f46e5',
    'body[data-lab="sciml"]': '#7e22ce',
    'body[data-module="ml"]': '#be185d',
    'body[data-module="statistics"]': '#b45309',
    'body[data-module="fitting"]': '#c2410c',
    'body[data-module="linalg"]': '#166534',
    'body[data-module="networks"]': '#0f766e',
    'body[data-lab="examples"]': '#a16207',
    'body[data-lab="beauty"]': '#a21caf',
    'body[data-lab="docs"]': '#475569',
    'body[data-lab="tutorial"]': '#0284c7',
}


def _rule_body(css, selector):
    pattern = re.compile(re.escape(selector) + r'\s*\{([^}]*)\}', re.S)
    m = pattern.search(css)
    assert m, f'missing selector {selector}'
    return m.group(1)


def test_lab_hue_mapping_matches_requested_family_palette():
    css = CSS.read_text(encoding='utf-8')
    for selector, expected in EXPECTED_ACCENTS.items():
        body = _rule_body(css, selector)
        assert f'--lab-accent: {expected}' in body, f'{selector} should use {expected}'


def test_lab_identity_palette_is_available_and_default_for_analysis_panels():
    js = SHELL.read_text(encoding='utf-8')
    assert '<option value="lab-identity">Lab identity</option>' in js
    assert "function labIdentityColors()" in js
    assert "paletteColors(name){return name==='lab-identity'?labIdentityColors()" in js
    assert "||'lab-identity'" in js


def test_lab_identity_propagates_to_functional_cockpit_surfaces():
    css = CSS.read_text(encoding='utf-8')
    required = [
        '.mode-tab.active',
        '.analysis-run-main',
        '.analysis-plot-card',
        '.analysis-plot-card-head strong',
    ]
    for token in required:
        assert token in css
    assert css.count('var(--lab-accent') >= 8


def test_version_metadata_and_stamp_script_exist():
    data = json.loads(VERSION.read_text(encoding='utf-8'))
    assert data['version'] == '71.46.0'
    assert data['token'] == '71.46.0'
    script = STAMP.read_text(encoding='utf-8')
    assert "new RegExp" in script
    assert "VERSION.json" in script
    assert "return '?' + 'v=' + version" in script


def test_package_has_stamp_version_script():
    pkg = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
    assert pkg['version'] == '71.46.0'
    assert pkg['scripts']['stamp:version'] == 'node scripts/stamp-version.js'


def test_release_tokens_stamped_to_7140():
    offenders = []
    for p in ROOT.rglob('*'):
        if 'tests' in p.parts or '.venv' in p.parts or 'node_modules' in p.parts:
            continue
        if p.is_file() and p.suffix.lower() in {'.html', '.js', '.css', '.md', '.json', '.cff'}:
            try:
                text = p.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                continue
            for m in re.findall(r'\?v=([0-9]+(?:\.[0-9]+){1,3})', text):
                if m != '71.46.0':
                    offenders.append(f'{p.relative_to(ROOT)} -> {m}')
    assert not offenders
