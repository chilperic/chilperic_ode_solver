from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]


def text(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_home_is_a_project_first_modelling_surface_not_a_demo_reel():
    page = BeautifulSoup(text('index.html'), 'html.parser')
    assert len(page.find_all('h1')) == 1
    assert page.select_one('.foko-model-console #v76HomeRun') is not None
    assert len(page.select('.foko-route-grid > .foko-route-card')) == 3
    assert len(page.select('.foko-subject-grid > .foko-subject-card')) == 6
    assert len(page.select('.foko-subject-links [data-lab-target]')) >= 20
    assert page.select_one('script[src^="src/home-demo-reel.js"]') is None


def test_home_runtime_calls_real_core_and_has_no_decorative_random_curve():
    source = text('src/v76/home-workspace.js')
    research = text('src/home-live-research.js')
    assert 'FokoODECore.solveWithRhs' in source
    assert 'core.solveWithRhs' in research
    for forbidden in ('Math.random(', 'Math.sin(', 'hardcodedSeries', 'cachedTrajectory'):
        assert forbidden not in source
        assert forbidden not in research


def test_home_claim_labels_are_user_facing_and_link_to_trust():
    page = BeautifulSoup(text('index.html'), 'html.parser')
    labels = [node.get_text(' ', strip=True) for node in page.select('.foko-evidence-row a')]
    assert any(value.startswith('Computed here') for value in labels)
    assert any(value.startswith('Limited') for value in labels)
    assert any(value.startswith('Export workflow') for value in labels)
    assert any(value.startswith('Not available') for value in labels)
    assert all((node.get('href') or '').startswith('trust.html') for node in page.select('.foko-evidence-row a'))


def test_home_preserves_strong_models_without_misrepresenting_examples_as_the_product():
    page = text('index.html')
    for label in ('Reduced fatty-acid metabolism', 'Population genetics', 'CMA-ES', 'Sobol and Morris', 'Live fitness landscapes', 'Surrogate-assisted model exploration'):
        assert label in page
    assert 'Examples are templates, not the product.' in page
    assert 'Computed on page load' not in page
