from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[2]

def test_model_route_is_redirect_only_and_legacy_engine_is_removed():
    html=(ROOT/'model.html').read_text(encoding='utf-8')
    assert "location.replace('ode.html?module=ode'+location.hash)" in html
    assert 'model-workbench-v3.js' not in html
    assert 'model-workbench-v3.css' not in html
    assert not (ROOT/'src/model-workbench-v3.js').exists()
    assert not (ROOT/'styles/model-workbench-v3.css').exists()

def test_active_sciml_and_worker_delegate_to_canonical_ode_core():
    worker=(ROOT/'src/worker.js').read_text(encoding='utf-8')
    sciml=(ROOT/'src/sciml-lab.js').read_text(encoding='utf-8')
    inverse=(ROOT/'src/inverse.js').read_text(encoding='utf-8')
    assert 'FokoODECore.solveWithRhs' in worker
    assert 'FokoODECore.fixedStep' in sciml
    assert 'ODE.fixedStep' in inverse
    assert 'function rk45Step' not in worker
    assert 'function rk4(' not in sciml
    assert 'function rk4Step' not in inverse

def test_engine_boundary_ci_gate_passes():
    result=subprocess.run(['python3','scripts/check-engine-boundaries.py'],cwd=ROOT,text=True,capture_output=True)
    assert result.returncode==0, result.stdout+result.stderr
