from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def test_ode_page_exposes_optional_independent_referee():
    html=(ROOT/'ode.html').read_text(encoding='utf-8')
    assert 'Verify against SciPy' in html
    assert 'optional online verification' in html.lower()
    assert 'src/v72/ode-workspace.js' in html

def test_reference_path_is_not_silent_backend_substitution():
    source=(ROOT/'src/v72/scipy-verifier.js').read_text(encoding='utf-8')
    assert "method=payload['referenceMethod']" in source
    assert 'solve_ivp' in source
    assert 'first verification requires network access' in source
    assert "root.FokoSciPyVerifier={verify" in source
