from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')


def test_home_is_now_platform_standard_not_tool_collection():
    s = soup('index.html')
    assert s.select_one('main.home-v705') is not None
    assert s.select_one('.platform-home-hero') is not None
    assert s.select_one('.platform-map') is not None
    text = s.get_text(' ', strip=True)
    for term in ['Formulate', 'Compute', 'Diagnose', 'Export']:
        assert term in text
    for href in ['statistics.html', 'fitting.html', 'linear-algebra.html', 'networks.html', 'ml.html', 'beauty.html']:
        assert s.select_one(f'main a[href="{href}"]') is not None


def test_v70_19_css_and_shell_loaded_on_core_pages():
    for page in ['index.html', 'workbench.html', 'statistics.html', 'ml.html', 'networks.html', 'docs.html']:
        html = read(page)
        assert 'styles/v70-19-platform-system.css?v=71.46.0' in html, page
        assert 'src/platform-data-engine.js?v=71.46.0' in html, page
        assert 'src/platform-shell.js?v=71.46.0' in html, page


def test_platform_data_engine_has_import_export_contract():
    js = read('src/platform-data-engine.js')
    for token in ['parseTable', 'inferSchema', 'projectSnapshot', 'downloadJSON', 'fillPrimaryTextarea', 'throw new Error']:
        assert token in js
    shell = read('src/platform-shell.js')
    for token in ['platform-ribbon', 'Import table', 'Export project JSON', 'Question', 'Diagnose']:
        assert token in shell


def test_logo_is_dark_header_ready_and_has_display_asset():
    logo = read('assets/brand/foko-lab-logo.svg')
    mark = read('assets/brand/foko-lab-mark.svg')
    display = read('assets/brand/foko-lab-logo-display.svg')
    assert '#061B2A' in logo and '#061B2A' in mark
    assert '#2DD4BF' in logo and '#155EEF' in logo
    assert 'MODELING · DATA · SCIML' in logo
    assert 'DYNAMICS · OPTIMIZATION · EQUILIBRIA · STOCHASTICITY · DATA' in display
    assert 'magenta' not in (logo + mark + display).lower()


def test_platform_architecture_page_documents_limits():
    s = soup('platform.html')
    text = s.get_text(' ', strip=True)
    for term in ['Foko Lab operating model', 'Capability parity audit', 'Known hard limitations', 'Web Worker', 'Pyodide']:
        assert term in text
