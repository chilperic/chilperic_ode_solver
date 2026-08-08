from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
AUTHORED = [
    'studio.html', 'ode.html', 'steady.html', 'stochastic.html', 'optimization.html',
    'statistics.html', 'fitting.html', 'linear-algebra.html', 'networks.html',
    'ml.html', 'sciml.html', 'agent.html', 'symbolic.html', 'sensitivity.html', 'workbench.html'
]
NON_ODE_CONTROLLERS = [
    'src/v73/model-studio.js',
    'src/v72/steady-workspace.js', 'src/v72/stochastic-workspace.js',
    'src/v72/optimization-workspace.js', 'src/v72/statistics-workspace.js',
    'src/v72/fitting-workspace.js', 'src/v72/linalg-workspace.js',
    'src/v72/networks-workspace.js', 'src/v72/ml-workspace.js',
    'src/sciml-lab.js', 'src/v72/agent-workspace.js',
    'src/v72/symbolic-workspace.js', 'src/v72/sensitivity-workspace.js', 'src/v72/workbench-workspace.js'
]


def text(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_shared_layout_contract_is_declarative_and_loaded_everywhere():
    shared = text('src/v72/accessibility-performance.js')
    assert 'shared plot-layout stability controller' in shared
    assert 'MutationObserver' not in shared
    assert 'guardUntil' not in shared
    assert 'setTimeout(function () { restore' not in shared
    assert "document.addEventListener('foko:plot-rendered'" in shared
    assert 'effectiveLayout' in shared
    assert 'compatibleCount' in shared
    assert 'grid.dataset.preferredLayout = record.preferred' in shared
    assert 'grid.dataset.layout = effective' in shared
    for page in AUTHORED:
        html = text(page)
        assert 'src/v72/accessibility-performance.js?v=77.4.1' in html
        assert 'layout-stability.js' not in html
    for controller in NON_ODE_CONTROLLERS:
        source = text(controller)
        assert 'FokoLayoutStability.apply' in source, controller
        assert 'breakpoint: 1024' in source, controller


def test_home_uses_equal_model_cards_and_a_compact_creator_path():
    page = BeautifulSoup(text('index.html'), 'html.parser')
    creator = page.select_one('.foko-creator-strip')
    assert creator is not None
    assert 'Dr. Chilperic Armel Foko Kuate' in creator.get_text(' ', strip=True)
    assert creator.select_one('img[src="assets/profile-chilperic.webp"]') is not None
    assert creator.select_one('a[href="cv.html"]') is not None
    cards = page.select('.foko-feature-grid > .foko-feature-card')
    assert len(cards) == 6
    for card in cards:
        assert card.select_one('.foko-feature-visual') is not None
        assert card.select_one('.foko-feature-body h3') is not None
        assert card.get('data-subject-target')
        assert card.get('data-lab-target')


def test_mathematical_beauty_uses_rendered_preview_canvases_and_interactive_manifolds():
    shell = text('src/v76/app-shell.js')
    assert shell.count("'beauty.html'") == 1
    assert "'Mathematical beauty'" in shell
    page = BeautifulSoup(text('beauty.html'), 'html.parser')
    assert page.select_one('#beautyPreviewGrid') is not None
    assert page.select_one('.beauty-sections') is None
    script = text('src/math-beauty.js')
    for key in ['mobius', 'torus', 'klein', 'projective', 'helicoid', 'catenoid', 'enneper', 'sphere', 'saddle']:
        assert f"function {key}()" in script
    for key in ['epicycloid', 'continued', 'rsa']:
        assert f"function {key}()" in script
    assert "canvas.addEventListener('pointermove'" in script
    assert 'drawSurface' in script
    assert 'beauty-preview-card' in script
    assert "['Topology and manifolds'" in script
    assert "['Number theory'" in script
    assert 'renderPreview' in script


def test_workbench_has_deeper_examples_and_shared_result_views():
    script = text('src/workbench/adapters.js')
    for preset in ['lorenz', 'fitzhugh', 'brusselator', 'stiff_relaxation', 'gene_expression', 'rastrigin']:
        assert preset in script
    for plot in ['phase-3d', 'derivative-norm', 'fano', 'joint-final', 'landscape', 'objective-distribution']:
        assert plot in script
    assert 'all views share one result' in script
    assert 'all views share one ensemble' in script
    assert 'all views share one search record' in script


def test_workbench_plot_choice_swaps_panels_instead_of_disabling_options():
    workspace = text('src/v72/workbench-workspace.js')
    assert 'function choosePlot(card, index)' in workspace
    assert 'Registry.swapDistinctSelection' in workspace
    assert "selectedElsewhere ? 'disabled'" not in workspace
    assert "choosePlot(card,this.value)" in workspace
