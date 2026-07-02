from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def soup(path):
    return BeautifulSoup(read(path), 'html.parser')


def test_symbolic_has_explicit_calculate_button_not_ambiguous_analyze_label():
    html = soup('symbolic.html')
    btn = html.select_one('#symAnalyze')
    assert btn is not None
    assert 'primary' in (btn.get('class') or [])
    assert 'run-button' in (btn.get('class') or [])
    assert 'Calculate result' in btn.get_text(' ', strip=True)
    assert 'Analyze</button>' not in read('symbolic.html')


def test_symbolic_operation_menu_is_broad_enough_for_real_symbolic_work():
    html = soup('symbolic.html')
    values = [o.get('value') for o in html.select('#symOperation option')]
    assert len(values) >= 12
    for op in [
        'simplify', 'expand', 'factor', 'differentiate', 'second_derivative',
        'gradient', 'jacobian', 'numeric_equilibria', 'linearization',
        'substitute', 'evaluate_numeric', 'integrate', 'system_latex'
    ]:
        assert op in values


def test_symbolic_selected_operation_waits_for_calculate_button():
    js = read('src/symbolic-lab.js')
    assert "['symAnalyze','click',analyze]" in js
    assert "['symOperation','change',markNeedsCalculation]" in js
    assert "['symOperation','change',analyze]" not in js
    assert 'Changed. Press Calculate result.' in js


def test_symbolic_result_renderer_handles_operation_outputs_without_operatorname_noise():
    js = read('src/symbolic-lab.js')
    assert 'operatorname{simplify}' not in js
    assert 'operatornamesimplify' not in js
    assert "op==='jacobian'" in js
    assert "op==='numeric_equilibria'" in js
    assert "op==='gradient'" in js
    assert "renderMath($('symResult'),evaluationLatex(op))" in js
    assert "${left} = ${resultTex}" in js


def test_symbolic_sympy_export_knows_the_new_operation_values():
    js = read('src/symbolic-lab.js')
    for token in [
        "'second_derivative'", "'gradient'", "'jacobian'", "'numeric_equilibria'",
        "'linearization'", "'substitute'", "'evaluate_numeric'", "'system_latex'"
    ]:
        assert token in js
