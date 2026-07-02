from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def visible_text(path):
    soup = BeautifulSoup(read(path), 'html.parser')
    for node in soup(['script', 'style']):
        node.decompose()
    return soup.get_text(' ', strip=True)


def test_symbolic_plot_placeholder_noise_removed_from_visible_ui():
    html = read('symbolic.html')
    visible = visible_text('symbolic.html')
    assert 'No numeric plot yet' not in visible
    assert 'Select a plot mode and press Plot now' not in visible
    assert 'Auto-plot' in visible
    assert '<div class="sym-plot" id="symPlotBox"></div>' in html


def test_symbolic_plot_clears_placeholder_before_plotly_render():
    js = read('src/symbolic-lab.js')
    assert "box.innerHTML=''" in js
    assert 'Plot error' in js
    assert 'Plot updated:' not in js


def test_symbolic_plot_settings_do_not_auto_draw_without_autoplot():
    js = read('src/symbolic-lab.js')
    assert "['symPlotMode','change',()=>{updatePlotMeaning(); if($('symAutoPlot')?.checked)drawPlot();" in js
    assert "['symPlotVar','change',()=>{updatePlotMeaning(); if($('symAutoPlot')?.checked)drawPlot();}]" in js


def test_symbolic_additional_examples_from_research_and_symbolic_computation():
    js = read('src/symbolic-lab.js')
    for token in [
        'Van der Pol oscillator',
        'Brusselator reaction oscillator',
        'SIR epidemic system',
        'Calvin-cycle mini skeleton',
        'FADNS / CoA sequestration skeleton',
        'Kaltofen approximate factorization surface',
        'Zolotarev / Chebyshev minimax expression',
        'Lazard nonlinear system / Groebner benchmark',
        'Risch integration continuity toy',
    ]:
        assert token in js


def test_symbolic_calculation_errors_are_rendered_in_result_panel():
    js = read('src/symbolic-lab.js')
    assert 'Calculation error' in js
    assert 'Operation failed' in js
    assert 'op.error' in js
