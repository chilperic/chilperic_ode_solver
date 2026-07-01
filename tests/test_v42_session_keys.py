from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')


def test_session_key_helper_maps_opt_to_existing_storage_key():
    app = read('src/app.js')
    assert 'function sessionKeyForModule' in app
    assert "moduleName === 'opt'" in app
    assert "return 'optimization'" in app


def test_session_restore_uses_mapped_storage_key_not_raw_module_name():
    app = read('src/app.js')
    init = app[app.find('function init(){'):app.find('function wire(){')]
    assert 'FokoSession?.load?.(sessionKeyForModule(state.module))' in init
    assert 'FokoSession?.load?.(state.module)' not in init


def test_run_paths_use_window_scoped_session_guard():
    app = read('src/app.js')
    assert 'window.FokoSession?.save?.(sessionKeyForModule(state.module), state.model)' in app
    assert 'FokoSession?.save?.(' not in app.replace('window.FokoSession?.save?.(', '')
