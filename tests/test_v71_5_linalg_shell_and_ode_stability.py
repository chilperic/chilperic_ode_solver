from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')

def test_linalg_is_descriptor_driven_second_reference_lab():
    html=read('linear-algebra.html')
    assert 'data-v715-linalg-port="true"' in html
    assert 'id="linalgShellApp"' in html
    assert 'src/labs/linalg.js?v=71.46.0' in html
    descriptor=read('src/labs/linalg.js')
    assert "registerLab({id:'linalg'" in descriptor
    assert 'FokoLinearAlgebra' in descriptor

def test_linalg_runtime_controls_are_preserved_without_hidden_contracts():
    html=read('linear-algebra.html'); js=read('src/labs/linalg.js')
    assert 'linalgContracts' not in html
    for id_ in ['laPreset','laMode','laPlotMode','laMatrix','laVector','laRun']:
        assert id_ in js
    for required in ['solve','eigen','leastSquares','markov','nullspace','pca']:
        assert required in js

def test_standalone_ode_and_parametric_ode_are_restored_not_redirected():
    html=read('ode.html')
    assert 'data-v714-standalone-ode-recovery="true"' in html
    assert 'data-v713-compat-redirect="true"' not in html
    for id_ in ['resetBtn','runBtn','runSweep','sweepA','sweepB','sweepVar','sweepMetric','sweepN']:
        assert f'id="{id_}"' in html
    app=read('src/app.js')
    assert "$('resetBtn')?.addEventListener" in app

def test_core_boundary_keeps_linalg_under_src_core():
    assert (ROOT/'src/core/linalg.js').exists()
    assert (ROOT/'src/labs/linalg.js').exists()
    assert 'src/core/linalg.js?v=' in read('linear-algebra.html')
