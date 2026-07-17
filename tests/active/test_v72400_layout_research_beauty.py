from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
AUTHORED = [
    'ode.html', 'steady.html', 'stochastic.html', 'optimization.html',
    'statistics.html', 'fitting.html', 'linear-algebra.html', 'networks.html',
    'ml.html', 'sciml.html', 'agent.html', 'symbolic.html', 'sensitivity.html', 'workbench.html'
]
NON_ODE_CONTROLLERS = [
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
        assert 'src/v72/accessibility-performance.js?v=72.47.0' in html
        assert 'layout-stability.js' not in html
    for controller in NON_ODE_CONTROLLERS:
        source = text(controller)
        assert 'FokoLayoutStability.apply' in source, controller
        assert 'breakpoint: 1024' in source, controller


def test_home_uses_equal_research_cards_and_places_creator_beside_research():
    page = BeautifulSoup(text('index.html'), 'html.parser')
    rail = page.select_one('.home-reel-hero-rail')
    assert rail is not None
    assert rail.select_one('.home-author-profile') is None
    layout = page.select_one('.home-research-layout')
    assert layout is not None
    creator = layout.select_one('.home-author-profile-home')
    assert creator is not None
    assert 'Dr. Chilperic Armel Foko Kuate' in creator.get_text(' ', strip=True)
    assert 'Multiscale Modeller | Applied Mathematician | Computational Biology | Scientific Software' in creator.get_text(' ', strip=True)
    cards = layout.select('.home-research-grid > .home-research-card')
    assert len(cards) == 4
    assert {card.get('data-research-card') for card in cards} == {
        'fatty-acid-metabolism', 'fadns', 'tcell-proliferation', 'thermoplants'
    }
    for card in cards:
        assert card.select_one('.home-research-card-figure img') is not None
        assert card.select_one('.home-research-card-body h3') is not None
        assert card.select_one('.home-research-card-visual') is not None
        assert card.select_one('.home-research-card-evidence') is not None
    thermo = layout.select_one('[data-research-card="thermoplants"]')
    assert thermo is not None
    assert len(thermo.select('.home-research-card-gallery figure')) == 3
    assert 'Protected unpublished research' in thermo.get_text(' ', strip=True)
    assert thermo.select('[data-run-demo]') == []


def test_mathematical_beauty_uses_rendered_preview_canvases_and_interactive_manifolds():
    for page_name in [p.name for p in ROOT.glob('*.html')]:
        page = BeautifulSoup(text(page_name), 'html.parser')
        explore = page.select_one('details[data-nav-menu="explore"]')
        if explore is not None:
            assert len(explore.select('a[href="beauty.html"]')) == 1, page_name
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
