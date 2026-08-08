from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def text(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def test_local_sensitivity_depth_is_computed_and_bounded():
    html = text('sensitivity.html')
    assert '<details class="example-browser" open="">' in html or '<details class="example-browser" open>' in html
    workspace = text('src/v72/sensitivity-workspace.js')
    worker = text('src/v72/sensitivity-worker.js')
    core = text('src/core/sensitivity.js')
    for control in [
        'sensitivityOfatPoints', 'sensitivityDirection', 'sensitivityDirectionalSpan',
        'sensitivityDirectionPoints', 'sensitivityResponseSurface',
        'sensitivitySurfaceFirst', 'sensitivitySurfaceSecond', 'sensitivitySurfacePoints'
    ]:
        assert f'id="{control}"' in html
    for plot in ['parameter-jacobian', 'state-jacobian', 'influence-map', 'ofat', 'tornado', 'directional', 'response-surface']:
        assert plot in workspace
    for function in ['function ofat(', 'function directionalProfile(', 'function responseSurface(']:
        assert function in core
    for computation in ['localJacobians(', 'localTrajectory(', 'parseDirection(']:
        assert computation in worker
    assert 'adjoint sensitivities' in html
    assert 'not a complete global sensitivity decomposition' in core


def test_global_sensitivity_depth_reuses_real_sample_design():
    html = text('sensitivity.html')
    workspace = text('src/v72/sensitivity-workspace.js')
    worker = text('src/v72/sensitivity-worker.js')
    core = text('src/core/sensitivity.js')
    for control in ['sensitivityDependence', 'sensitivityDependencePermutations']:
        assert f'id="{control}"' in html
    for plot in ['sobol-time', 'variance-contribution', 'global-scatter', 'dependence-mi', 'dependence-hsic']:
        assert plot in workspace
    assert 'sampleObserver' in core
    assert 'computeTimeSobol' in worker
    assert 'dependenceDiagnostics' in core
    assert 'normalizedMutualInformation' in core
    assert 'normalizedHsic' in core
    assert 'not a variance fraction' in html
    assert 'independent uniform' in core
    for control in ['sensitivityOutputMode', 'sensitivityOutputVars', 'sensitivityResultOutput']:
        assert f'id="{control}"' in html
    assert 'analysesByOutput' in worker
    assert 'computeSobolForOutput' in worker
    assert 'activateResultOutput' in workspace


def test_new_diagnostics_remain_inside_browser_capacity_contract():
    inputs = text('src/core/numerical-inputs.js')
    workspace = text('src/v72/sensitivity-workspace.js')
    worker = text('src/v72/sensitivity-worker.js')
    assert 'ofatPoints * parameterCount' in inputs
    assert 'surfacePoints * surfacePoints' in inputs
    assert 'dependencePermutations' in inputs
    assert 'capacity.blocked' in worker
    assert 'checkedAnalysis.capacity && checkedAnalysis.capacity.blocked' in workspace
    assert 'No worker should be started' in inputs
