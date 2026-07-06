from pathlib import Path
import json
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def text(path):
    return (ROOT / path).read_text(encoding='utf-8')

def soup(path):
    return BeautifulSoup(text(path), 'html.parser')

def test_v71_fokokit_and_platform_assets_present():
    for rel in ['src/fokokit.js','src/v71-platform.js','src/v71-worker.js','src/stochastic-advanced.js','src/dynamical-fitting.js','src/continuation-analysis.js','src/basin-analysis.js','CITATION.cff']:
        assert (ROOT / rel).exists(), rel
    kit = text('src/fokokit.js')
    for token in ['requireMatrix','requireSquare','formatResult','seededRandom','encodeState','downloadJSON','createCommandPalette']:
        assert token in kit

def test_v71_single_cache_token_tree_wide():
    import re
    found = set()
    for path in ROOT.rglob('*'):
        if path.is_file() and path.suffix.lower() in {'.html','.css','.js','.md','.py','.json','.svg','.txt','.yml','.yaml','.cff'}:
            found.update(re.findall(r'\?v=([A-Za-z0-9._-]+)', path.read_text(encoding='utf-8', errors='ignore')))
    assert found == {'71.46.0'}

def test_v71_scripts_are_loaded_on_public_pages():
    for page in ['index.html','workbench.html','statistics.html','fitting.html','ml.html','networks.html','linear-algebra.html']:
        s = soup(page)
        srcs = [x.get('src','') for x in s.select('script[src]')]
        assert any('src/fokokit.js?v=71.46.0' in x for x in srcs), page
        assert any('src/v71-platform.js?v=71.46.0' in x for x in srcs), page

def test_v71_model_registry_is_versioned_and_curated():
    reg = json.loads(text('models/registry.json'))
    assert reg['schemaVersion'] == '1.0'
    ids = {m['id'] for m in reg['models']}
    for mid in ['lorenz','van_der_pol','sir','lotka_volterra','fitzhugh_nagumo','goodwin','repressilator','chemostat']:
        assert mid in ids
    for m in reg['models']:
        model = json.loads(text(m['file']))
        assert model['schemaVersion'] == '1.0'
        assert model['kind'] == 'ode'
        assert 'vars' in model and 'params' in model and 'eqs' in model

def test_v71_docs_explain_platform_foundation():
    for page in ['docs.html','platform.html']:
        t = text(page)
        assert 'v71-platform-foundation' in t
        assert 'Shareable URL state' in t
        assert 'Curated JSON model registry' in t

def test_v71_release_audit_exists():
    t = text('release-audits/AUDIT-v71-0-platform-foundation.md')
    for token in ['FokoKit', 'tau-leaping', 'Web Worker', 'model registry', 'CITATION.cff']:
        assert token in t
