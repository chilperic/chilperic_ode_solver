from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def test_symbolic_plot_is_explicit_numeric_preview_not_silent_decoration():
    html = read('symbolic.html')
    assert 'id="symPlotMeaning"' in html
    assert 'No numeric plot yet.' not in html
    assert 'press Plot now' not in html
    assert 'id="symAutoPlot" type="checkbox"' in html
    assert 'checked="" id="symAutoPlot"' not in html


def test_symbolic_plot_modes_explain_what_is_plotted():
    html = read('symbolic.html')
    for token in [
        'Selected expression vs x',
        '1D RHS + zero crossings',
        'ODE time course',
        '2D state-space trajectory',
        '2D vector field',
        '2D vector field + nullcline scan',
        'parameter sweep / root scan',
    ]:
        assert token in html


def test_symbolic_plot_errors_are_actionable():
    js = read('src/symbolic-lab.js')
    for token in [
        'Invalid numeric scope line',
        'Expression cannot be parsed',
        'Missing numeric value for symbol',
        'No finite numeric values were produced',
        'Vector field has no finite arrows',
        'No roots found in the selected sweep',
        'function plotErrorMessage',
        'function updatePlotMeaning',
    ]:
        assert token in js
