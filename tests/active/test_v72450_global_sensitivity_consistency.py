from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]

def text(path):
    return (ROOT / path).read_text(encoding='utf-8')

def test_advanced_global_sensitivity_is_real_and_capacity_guarded():
    html = text('sensitivity.html')
    workspace = text('src/v72/sensitivity-workspace.js')
    core = text('src/core/sensitivity.js')
    inputs = text('src/core/numerical-inputs.js')
    assert 'id="sensitivitySecondOrder"' in html
    assert 'id="sensitivityBootstrap"' in html
    for plot in ('morris-effects','morris-convergence','morris-rank','sobol-second','sobol-gap','sobol-uncertainty','sobol-rank','sobol-output'):
        assert plot in workspace
    assert 'secondOrderMatrix' in core
    assert 'bootstrapSobol' in core
    assert 'function sensitivityCapacity' in inputs
    assert 'too large for reliable in-browser sensitivity analysis' in inputs
    assert 'No worker should be started' in inputs

def test_platform_consistency_gate_is_in_release_test_chain():
    package = json.loads(text('package.json'))
    assert 'test:consistency' in package['scripts']
    assert 'test:consistency' in package['scripts']['test']
    assert 'audit-platform-consistency.py' in package['scripts']['test:consistency']
