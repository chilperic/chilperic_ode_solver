from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_v71_platform_exposes_reproducibility_api_and_bundle_schema():
    js = (ROOT / 'src' / 'v71-platform.js').read_text()
    required = [
        "const RELEASE='71.46.0'",
        "const BUNDLE_SCHEMA='foko.lab.bundle.v1'",
        'function collectState()',
        'function applyState(state)',
        'function createBundle',
        'function applyBundle',
        'function exportBundle',
        'function importBundleFile',
        'root.FokoRepro',
    ]
    for token in required:
        assert token in js, f'missing reproducibility primitive: {token}'


def test_reproducibility_bar_has_required_controls():
    js = (ROOT / 'src' / 'v71-platform.js').read_text()
    for label in ['Save session', 'Restore session', 'Copy share URL', 'Export bundle', 'Import bundle']:
        assert label in js
    for action in ['data-v71="save"', 'data-v71="load"', 'data-v71="url"', 'data-v71="export"', 'data-v71="import"']:
        assert action in js
    assert 'v71BundleImport' in js


def test_url_session_and_bundle_persistence_are_all_present():
    js = (ROOT / 'src' / 'v71-platform.js').read_text()
    for token in [
        'history.replaceState',
        '#state=',
        'localStorage',
        'sessionStorage',
        'pageKey()',
        'lastBundleKey()',
        'safeSet(sessionStorage',
        'safeSet(localStorage',
        'Kit.downloadJSON',
        'accept=".json"',
    ]:
        assert token in js


def test_reproducibility_controls_are_compact_not_workspace_blocking():
    css = (ROOT / 'styles' / 'style.css').read_text()
    assert 'v71.19 reproducibility layer' in css
    assert '.v71-session-bar' in css
    assert 'justify-content:flex-end' in css
    assert 'padding:4px 0' in css
    assert 'min-height:30px' in css


def test_docs_and_tutorial_explain_reproducibility_layer():
    for fname in ['docs.html', 'tutorial.html']:
        text = (ROOT / fname).read_text()
        assert 'V71.19 reproducibility' in text
        assert 'Session, share URL and bundle export/import' in text
        assert 'save the current session' in text
        assert 'export a full JSON bundle' in text


def test_cache_token_normalized_to_71_19():
    for path in ROOT.rglob('*'):
        if path.is_file() and path.suffix in {'.html', '.js', '.css', '.json', '.md'}:
            try:
                text = path.read_text()
            except UnicodeDecodeError:
                continue
            for stale in ['71.18.0','71.17.0','71.16.0','71.15.0','71.14.0']:
                assert ('?v=' + stale) not in text, f'stale token {stale} in {path.relative_to(ROOT)}'
