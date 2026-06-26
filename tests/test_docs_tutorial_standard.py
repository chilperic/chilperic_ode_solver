from pathlib import Path
from bs4 import BeautifulSoup
import hashlib

ROOT = Path(__file__).resolve().parents[1]
NAV = [
    'Home', 'ODE Lab', 'Optimization Lab', 'Steady-State Lab',
    'Stochastic Lab', 'Model Atlas', 'Docs', 'Tutorial'
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
    for term in ['Model Atlas routing standard', 'Workbench standard', 'Analysis card catalogue', 'GSA and sensitivity standard', 'Legacy labs']:
        assert term in text

def test_tutorial_has_action_based_routes():
    html = (ROOT/'tutorial.html').read_text(encoding='utf-8')
    for route in ['examples.html', 'workbench.html?model=sir', 'workbench.html?model=stoch-sir', 'workbench.html?model=enzyme-steady', 'workbench.html?model=rosenbrock']:
        assert route in html

def test_model_atlas_has_workbench_links_for_representative_models():
    html = (ROOT/'examples.html').read_text(encoding='utf-8')
    for mid in ['sir','lotka','seir','robertson','fa-metabolism','fadns-coa','calvin','quadratic','rosenbrock','enzyme-steady','birth-death','galton','tcell']:
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
