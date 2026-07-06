from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def test_compute_bus_exists_and_exposes_required_api():
    src = read('src/platform/compute-bus.js')
    for token in ['FokoComputeBus', 'run,', 'cancel,', 'createLegacyHandle', 'platformRun', 'activeCount']:
        assert token in src
    assert 'src/worker.js?v=71.46.0' in src
    assert 'src/v71-worker.js?v=71.46.0' in src


def test_pages_load_compute_bus_with_current_token():
    html_pages = list(ROOT.glob('*.html'))
    assert html_pages
    missing = [p.name for p in html_pages if 'src/platform/compute-bus.js?v=71.46.0' not in p.read_text(encoding='utf-8')]
    assert not missing


def test_ode_and_optimization_use_bus_compatible_worker_handle():
    app = read('src/app.js')
    opt = read('src/optimization-lab.js')
    assert 'FokoComputeBus?.createLegacyHandle' in app
    assert 'FokoComputeBus?.createLegacyHandle' in opt
    assert "new Worker('src/worker.js')" not in app
    assert "new Worker('src/worker.js')" not in opt


def test_release_token_normalized_to_71_20():
    offenders = []
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.html','.js','.css','.md','.json'}:
            try:
                txt = p.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                continue
            if '?v=' in txt and '?v=71.46.0' not in txt:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders


def test_docs_explain_compute_bus_without_promising_full_migration():
    docs = read('docs.html') + read('tutorial.html') + read('platform.html')
    assert 'Shared worker execution' in docs
    assert 'ODE, Parametric ODE and Optimization use the bus-compatible worker handle first' in docs
    assert 'other labs can be migrated' in docs
