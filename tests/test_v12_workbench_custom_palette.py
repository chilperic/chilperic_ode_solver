from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')


def test_workbench_has_custom_model_import_ui():
    doc = soup('workbench.html')
    assert doc.select_one('#customModelImport') is not None
    assert doc.select_one('#customModelJson') is not None
    assert doc.select_one('#importCustomModel') is not None
    assert doc.select_one('#loadCustomOdeExample') is not None
    assert doc.select_one('#loadCustomOptExample') is not None
    assert 'Import your own model' in doc.get_text(' ', strip=True)


def test_custom_model_import_logic_supports_ode_and_optimization():
    js = read('src/model-workbench-v3.js')
    for token in [
        'CUSTOM_MODEL_IDS',
        'CUSTOM_ODE_EXAMPLE',
        'CUSTOM_OPT_EXAMPLE',
        'normalizeCustomModel',
        'compileExpression',
        'importCustomModelFromTextarea',
        'Custom imported models',
        'Custom import currently supports ODE and 2D OPT models',
    ]:
        assert token in js


def test_cividis_and_continuous_palettes_are_available_and_used():
    doc = soup('workbench.html')
    values = {o.get('value') for o in doc.select('#plotPalette option')}
    assert {'cividis','turbo','viridis','plasma'}.issubset(values)
    js = read('src/model-workbench-v3.js')
    for token in ['CONTINUOUS_SCALES', 'continuousColorscale', 'cividis', 'turbo', "palette:'cividis'"]:
        assert token in js
    assert 'colorscale:continuousColorscale()' in js


def test_v12_css_fixes_math_overflow_and_custom_import_layout():
    css = read('styles/model-workbench-v3.css')
    for token in ['v12: custom import panel', '.mw-custom-import', '#customModelJson', '.mw-equation-card .katex-display', 'overflow-x:auto']:
        assert token in css
    style = read('styles/style.css')
    assert 'v12: prevent long LaTeX objective definitions' in style
