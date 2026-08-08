from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_sensitivity_is_a_first_class_workspace():
    page = BeautifulSoup(text('sensitivity.html'), 'html.parser')
    assert page.body.get('data-lab') == 'sensitivity'
    assert [node.get('data-plot-card') for node in page.select('[data-plot-card]')] == ['left', 'right']
    scripts = [node.get('src', '').split('?', 1)[0] for node in page.select('script[src]')]
    for source in (
        'src/core/numerical-inputs.js', 'src/models/sensitivity-presets.js',
        'src/core/sensitivity.js', 'src/v72/sensitivity-workspace.js',
        'src/v72/scientific-registry.js', 'src/v76/app-shell.js'
    ):
        assert source in scripts
    assert scripts.index('src/v72/accessibility-performance.js') < scripts.index('src/v72/sensitivity-workspace.js')


def test_sensitivity_exposes_user_owned_model_and_numerical_inputs():
    page = text('sensitivity.html')
    for element_id in (
        'sensitivityEquationRows', 'sensitivityInitialRows', 'sensitivityParameterRows',
        'sensitivityT0', 'sensitivityT1', 'sensitivityPoints', 'sensitivitySolver',
        'sensitivityRtol', 'sensitivityAtol', 'sensitivityStepSize',
        'sensitivityInitialStep', 'sensitivityMaxStep', 'sensitivitySafety',
        'sensitivityRelativeStep', 'sensitivitySamples', 'sensitivityTrajectories',
        'sensitivityLevels', 'sensitivitySeed', 'sensitivitySigma',
        'sensitivitySecondOrder', 'sensitivityBootstrap', 'sensitivityBudget'
    ):
        assert f'id="{element_id}"' in page
    workspace = text('src/v72/sensitivity-workspace.js')
    assert 'validateOde' in workspace and 'validateSensitivity' in workspace
    assert 'markDirty' in workspace and 'Result and image exports are disabled until recomputation' in workspace
    assert 'configuration only' in workspace
    assert 'capacityBlocked' in workspace
    assert 'checkedAnalysis.capacity && checkedAnalysis.capacity.blocked' in workspace


def test_sensitivity_methods_and_limits_are_honest():
    page = text('sensitivity.html')
    for method in ('local', 'morris', 'sobol', 'fim'):
        assert f'value="{method}"' in page
    for limitation in (
        'adjoint sensitivities', 'eFAST', 'Shapley effects', 'correlated-input Sobol indices',
        'symbolic identifiability', 'profile likelihood', 'certified bifurcation sensitivity',
        'PDE/PINN adjoints', 'posterior uncertainty'
    ):
        assert limitation in page
    core = text('src/core/sensitivity.js')
    assert 'intentionally not clipped to [0,1]' in core
    assert 'normalized independent ranges' in core
    assert 'not parameter posterior correlation' in core
    assert 'secondOrderMatrix' in core
    assert 'bootstrapSobol' in core
    for plot in ('morris-effects','morris-convergence','morris-rank','sobol-second','sobol-gap','sobol-uncertainty','sobol-rank','sobol-output'):
        assert plot in text('src/v72/sensitivity-workspace.js')
    validator = text('src/core/numerical-inputs.js')
    assert 'too large for reliable in-browser sensitivity analysis' in validator
    assert 'No worker should be started' in validator


def test_sensitivity_worker_uses_the_canonical_ode_api_and_reports_work():
    worker = text('src/v72/sensitivity-worker.js')
    assert 'FokoODECore.solveWithRhs({' in worker
    assert '}, rhs);' in worker
    assert 'solverSummary' in worker
    assert 'functionEvaluations' in worker
    assert 'estimatedOdeSolves' in worker


def test_ode_numerical_controls_are_persisted_and_stale_safe():
    app = text('src/app.js')
    for setting in ('stepSize', 'initialStep', 'maxStep', 'rtol', 'atol', 'safety'):
        assert setting in app
    assert 'numerics:state.module' in app
    assert 'resultIsStale' in app
    assert 'markScientificInputsStale' in app
    assert 'validateOde(raw)' in app


def test_navigation_exposes_sensitivity_statically():
    shell = text('src/v76/app-shell.js')
    assert "'Sensitivity'" in shell
    assert "'sensitivity.html'" in shell
    pages = ['index.html', 'ode.html', 'statistics.html', 'sensitivity.html', 'docs.html']
    for page_name in pages:
        soup = BeautifulSoup(text(page_name), 'html.parser')
        assert soup.select_one('script[src^="src/v76/app-shell.js"]') is not None, page_name
