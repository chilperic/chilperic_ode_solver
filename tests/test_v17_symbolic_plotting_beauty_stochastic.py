from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')

def test_symbolic_lab_exposes_plotting_controls_and_plotly():
    html = read('symbolic.html')
    for token in ['plotly-2.35.2.min.js', 'symPlotMode', 'symPlotVar', 'symPlotYVar', 'symPlotScope', 'symPlotBox', 'Symbolic plot preview']:
        assert token in html
    s = soup('symbolic.html')
    assert s.select_one('#symPlot') is not None
    assert s.select_one('#symPlotMode option[value="vector2d"]') is not None


def test_symbolic_js_has_numeric_plotting_and_vector_field():
    js = read('src/symbolic-lab.js')
    for token in ['function parseAssignments', 'function plotExpression', 'function plotVectorField', 'colorscale:\'Cividis\'', 'Plotly.react', 'plotScope', 'sp.dsolve']:
        assert token in js


def test_math_beauty_has_extended_gallery_and_user_controls():
    html = read('beauty.html')
    for token in ['beautyPalette', 'beautySeed', 'beautySteps', 'trees / ferns / leaves', 'physical patterns']:
        assert token in html
    js = read('src/math-beauty.js')
    for token in ['chladni', 'gameLife', 'lichtenberg', 'voronoi', 'loxodrome', 'lorenz', 'apollonian', 'langton', 'tsp', 'logisticchaos', 'function tree', 'function leaves', 'function snowflake']:
        assert token in js


def test_stochastic_lab_has_pi_and_fibonacci_examples():
    js = read('src/stochastic/stochastic-lab.js')
    for token in ['monte-carlo-pi', 'fibonacci-rabbits', 'runMonteCarloPi', 'runFibonacciRabbits', "engine: 'pi'", "engine: 'fibonacci'"]:
        assert token in js
    assert "if (e === 'pi')" in js
    assert "if (e === 'fibonacci')" in js
