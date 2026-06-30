from pathlib import Path
from bs4 import BeautifulSoup
import hashlib

ROOT = Path(__file__).resolve().parents[1]
NAV = [
    'Home', 'Workbench Beta', 'ODE Lab', 'Optimization Lab', 'Steady-State Lab',
    'Stochastic Lab', 'Symbolic Lab', 'Agent Lab', 'Math Beauty', 'Model Atlas', 'Research Hub',
    'Platform', 'Docs', 'Tutorial'
]
CORE_FILES = [
    'index.html','ode.html','optimization.html','steady.html','stochastic.html',
    'styles/style.css','src/app.js','src/worker.js',
    'src/stochastic/stochastic-lab.js','src/optimization-lab.js','src/steady-state-lab.js'
]

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def soup(name: str):
    return BeautifulSoup((ROOT/name).read_text(encoding='utf-8'), 'html.parser')

def test_docs_and_tutorial_preserve_primary_navigation():
    for name in ['docs.html', 'tutorial.html']:
        labels = [a.get_text(strip=True) for a in soup(name).select('.topnav a')]
        assert labels == NAV

def test_docs_and_tutorial_have_no_duplicate_ids_and_no_missing_local_links():
    for name in ['docs.html', 'tutorial.html']:
        s = soup(name)
        ids = [tag.get('id') for tag in s.find_all(attrs={'id': True})]
        assert len(ids) == len(set(ids)), name
        missing = []
        for a in s.find_all('a', href=True):
            href = a['href'].split('#')[0].split('?')[0]
            if href and not href.startswith(('http://','https://','mailto:')):
                if not (ROOT/href).exists():
                    missing.append(a['href'])
        assert not missing, (name, missing)

def test_docs_define_the_workbench_standard():
    text = soup('docs.html').get_text(' ', strip=True)
    for term in ['Platform map', 'Workbench standard', 'Specialist labs', 'Custom models', 'Scientific limits', 'Agent Lab', 'Symbolic Lab']:
        assert term in text

def test_tutorial_has_action_based_routes():
    html = (ROOT/'tutorial.html').read_text(encoding='utf-8')
    for route in ['examples.html', 'workbench.html?model=sir', 'workbench.html?model=enzyme-steady', 'workbench.html?model=rosenbrock', 'symbolic.html', 'agent.html']:
        assert route in html

def test_model_atlas_has_workbench_links_for_representative_models():
    html = (ROOT/'examples.html').read_text(encoding='utf-8')
    for mid in ['sir','lotka','seir','robertson','calvin','quadratic','rosenbrock','enzyme-steady','birth-death','galton']:
        assert f'workbench.html?model={mid}' in html

def test_core_legacy_manifest_matches_files():
    manifest = ROOT/'LEGACY_CORE_SHA256_MANIFEST.txt'
    assert manifest.exists()
    pairs = {}
    for line in manifest.read_text().splitlines():
        digest, rel = line.split(None, 1)
        pairs[rel] = digest
    assert set(CORE_FILES).issubset(pairs)
    for rel in CORE_FILES:
        assert sha(ROOT/rel) == pairs[rel], rel

def test_research_is_separated_from_model_atlas():
    atlas = (ROOT/'examples.html').read_text(encoding='utf-8')
    assert 'data-filter="research"' not in atlas
    assert 'Foko research model' not in atlas
    assert 'Open Research Hub' in atlas or 'Open My Research Models' in atlas
    assert (ROOT/'research.html').exists()
    assert (ROOT/'research'/'photosynthesis.html').exists()


def test_photosynthesis_research_has_credit_and_selling_figures():
    html = (ROOT/'research'/'photosynthesis.html').read_text(encoding='utf-8')
    for name in ['Chilperic Armel Foko Kuate', 'Yvonne Danisch', 'Jérémie Muller-Prokob', 'Martin Lercher']:
        assert name in html
    for fig in ['c3c4_3d_evolution_sudan.png', 'c3c4_local_sensitivity.png', 'c3c4_sobol_indices.png', 'c3c4_sobol_interactions.png', 'c3c4_pareto_sudan.png']:
        assert fig in html
        assert (ROOT/'assets'/'research'/'photosynthesis'/fig).exists()


def test_workbench_optimization_plot_catalogue_is_relevant_and_modern():
    js = (ROOT/'src'/'model-workbench-v3.js').read_text(encoding='utf-8')
    for label in ['Optimization history', 'Contour / heatmap', 'Parameter importance', 'Parallel coordinates', 'Pareto front', 'Slice / partial dependence', 'ECDF', 'Multi-objective radar', 'Step / trajectory', 'Constraint violation']:
        assert label in js
    assert 'isConstrainedModel' in js
    assert 'isTradeoffModel' in js
