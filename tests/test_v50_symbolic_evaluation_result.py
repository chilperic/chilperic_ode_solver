from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def visible_text(path):
    return BeautifulSoup(read(path), 'html.parser').get_text(' ', strip=True)

def test_symbolic_primary_output_is_mathematical_result_not_label_noise():
    text = visible_text('symbolic.html')
    html = read('symbolic.html')
    assert 'Computed LaTeX' not in text
    assert 'Result' in text
    assert 'id="symResult"' in html
    assert 'id="symComputed"' not in html

def test_symbolic_operation_result_renders_evaluated_expression_equation():
    js = read('src/symbolic-lab.js')
    assert 'function evaluationLatex(op)' in js
    assert 'return op.tex' in js
    assert '${left} = ${resultTex}' in js
    assert 'operatorname{simplify}' not in js
    assert '\\\\frac{\\\\partial}{\\\\partial' in js
    assert "renderMath($('symResult'),evaluationLatex(op))" in js
