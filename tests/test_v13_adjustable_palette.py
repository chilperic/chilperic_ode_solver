from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')


def test_workbench_has_custom_palette_editor_controls():
    doc = soup('workbench.html')
    assert doc.select_one('#paletteEditor') is not None
    assert doc.select_one('#plotPalette option[value="custom"]') is not None
    for selector in ['#customCatColors', '#customLowColor', '#customMidColor', '#customHighColor', '#applyCustomPalette', '#resetCustomPalette', '#customPalettePreview']:
        assert doc.select_one(selector) is not None
    assert 'Adjust palette colors' in doc.get_text(' ', strip=True)


def test_custom_palette_logic_is_stateful_and_affects_plotly_palettes():
    js = read('src/model-workbench-v3.js')
    for token in [
        'customPalette',
        'normalizeHexColor',
        'parseColorList',
        'validCustomCategorical',
        'customContinuousColorscale',
        'loadCustomPalette',
        'saveCustomPalette',
        'renderCustomPaletteEditor',
        'applyCustomPaletteFromEditor',
        'resetCustomPalette',
        "state.palette==='custom' ? validCustomCategorical()",
        "state.palette==='custom' ? customContinuousColorscale()",
        "localStorage.getItem('fokoLabCustomPalette')",
        "localStorage.setItem('fokoLabCustomPalette'",
    ]:
        assert token in js


def test_custom_palette_css_is_present():
    css = read('styles/model-workbench-v3.css')
    for token in ['v13: user-adjustable Workbench color palettes', '.mw-palette-editor', '.mw-palette-editor-grid', '.mw-palette-preview']:
        assert token in css
