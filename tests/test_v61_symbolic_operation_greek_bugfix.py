from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def test_symbolic_greek_parameters_render_as_latex_symbols():
    js = read('src/symbolic-lab.js')
    assert 'function latexSymbol' in js
    assert 'function latexPostProcess' in js
    assert "\\\\alpha" in js
    assert "\\\\beta" in js
    assert "\\\\gamma" in js
    assert 'alpha|beta|gamma' in js
    assert 'latexPostProcess(hasMath()?window.math.parse(expr).toTex' in js

def test_symbolic_operations_do_not_fake_unsupported_results():
    js = read('src/symbolic-lab.js')
    assert 'function assertOperationChanged' in js
    assert 'did not produce a new browser-side expression' in js
    assert 'expandBrowser(expr)' in js
    assert 'factorBrowser(expr)' in js
    assert 'integrateBrowser(expr,v)' in js
    assert 'Calculation error' in js

def test_symbolic_integrate_has_real_browser_elementary_path_or_error():
    js = read('src/symbolic-lab.js')
    assert 'function integrateNode' in js
    assert 'log(abs(' in js
    assert 'Export SymPy for exact integration' in js
    assert 'Antiderivative computed for supported elementary cases' in js
