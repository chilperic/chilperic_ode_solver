from pathlib import Path
import json
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
AUTHORED = [
    'ode.html','steady.html','stochastic.html','optimization.html','statistics.html',
    'fitting.html','linear-algebra.html','networks.html','ml.html','sciml.html',
    'agent.html','symbolic.html','sensitivity.html','workbench.html'
]


def soup(name: str) -> BeautifulSoup:
    return BeautifulSoup((ROOT / name).read_text(encoding='utf-8'), 'html.parser')


def test_home_has_compact_product_hierarchy_and_visible_authorship():
    page = soup('index.html')
    assert len(page.find_all('h1')) == 1
    primary = page.select('.trust-home-primary')
    assert len(primary) == 1
    assert 'example=FA%20metabolism%20bistability' in primary[0].get('href', '')
    assert 'autorun=1' in primary[0].get('href', '')
    assert page.select_one('.home-author-profile img[src="assets/profile-chilperic.webp"]') is not None
    assert 'Dr. Chilperic Armel Foko Kuate' in page.get_text(' ', strip=True)
    assert 'From model to evidence' in page.get_text(' ', strip=True)
    claims = page.select('.home-evidence-key > a')
    assert len(claims) == 4
    rendered = ' '.join(node.get_text(' ', strip=True) for node in claims)
    for label in ('Computed here', 'Limited', 'Export workflow', 'Not available'):
        assert label in rendered
    labels = {node.get_text(' ', strip=True) for node in page.select('.home-engine-row h3, .home-analysis-row h3, .home-supporting-index b')}
    for required in ('ODE', 'Steady-State', 'Stochastic', 'Agent', 'Curve fitting', 'Statistical analysis', 'Machine learning', 'Equation discovery', 'Constrained optimization', 'Symbolic', 'Linear Algebra', 'Networks', 'Workbench'):
        assert required in labels, (required, labels)


def test_global_navigation_has_six_clear_top_level_destinations():
    for name in ['index.html','docs.html','tutorial.html','trust.html',*AUTHORED]:
        page = soup(name)
        nav = page.select_one('nav.foko-main-nav')
        assert nav is not None, name
        top = [node for node in nav.find_all(recursive=False) if getattr(node, 'name', None)]
        assert len(top) == 6, (name, [node.name for node in top])
        labels = [node.find('summary').get_text(' ', strip=True) if node.name == 'details' else node.get_text(' ', strip=True) for node in top]
        assert labels == ['Home','Modeling','Data / Analysis','SciML','Explore','GitHub'], (name, labels)
        assert top[0].name == 'a' and top[0].get('href', '').endswith('index.html')


def test_guides_are_distinct_user_facing_continuous_surfaces():
    docs = soup('docs.html')
    tutorial = soup('tutorial.html')
    assert docs.find('h1').get_text(' ', strip=True) == 'Using Foko Lab'
    assert tutorial.find('h1').get_text(' ', strip=True) == 'Practical tutorials'
    docs_text = docs.get_text(' ', strip=True)
    tutorial_text = tutorial.get_text(' ', strip=True)
    assert 'Understand the four capability labels' in docs_text
    assert 'Tutorial 1 — Read a result before the plot' in tutorial_text
    assert docs.select_one('.guide-layout .guide-toc') is not None
    assert tutorial.select_one('.guide-layout .guide-toc') is not None
    for page in (docs, tutorial):
        assert page.select_one('.guide-source-links') is None
        assert page.find('a', href='PLATFORM_TODO.md') is None
        assert page.find('a', href='USER_GUIDE.md') is None
        assert page.find('a', href='TUTORIALS.md') is None



def test_model_atlas_restores_visual_previews_and_compact_copy():
    page = soup('examples.html')
    assert page.find('p', class_='eyebrow').get_text(' ', strip=True) == 'Runnable examples'
    script = (ROOT/'src/v72/example-atlas.js').read_text(encoding='utf-8')
    assert 'v72-atlas-media' in script
    assert 'imageFor(item)' in script
    assert 'assets/model-atlas/phd-fa-metabolism-extracted.webp' in script
    assert 'LEGACY_ALIASES' in script
    assert 'Thermoplants' in (ROOT/'src/models/scientific-example-catalog.js').read_text(encoding='utf-8')

def test_trust_page_is_generated_from_capability_definitions():
    page = soup('trust.html')
    text = page.get_text(' ', strip=True)
    definitions = json.loads((ROOT/'CAPABILITIES.json').read_text(encoding='utf-8'))['statusDefinitions']
    for key in ('browser-computed','limited-browser','export-only','unavailable'):
        assert definitions[key] in text
    assert '32/32' in text
    assert 'Hard limits that remain' in text


def test_architecture_and_contract_make_layout_and_core_ownership_explicit():
    architecture = (ROOT/'ARCHITECTURE.md').read_text(encoding='utf-8')
    contract = (ROOT/'SCIENTIFIC_CONTRACT.md').read_text(encoding='utf-8')
    registry = (ROOT/'src/v72/scientific-registry.js').read_text(encoding='utf-8')
    assert 'never reimplement' in architecture.lower()
    assert 'Plot selector changes never select a layout' in architecture
    assert 'Plot selection and layout selection are orthogonal' in contract
    assert 'each focused workspace is the sole owner' in registry
    assert 'metadata-only' in registry
    assert 'MutationObserver' not in registry
    assert 'grid.dataset.layout =' not in registry
    assert 'grid.dataset.preferredLayout =' not in registry


def test_legacy_model_route_redirects_to_the_canonical_ode_surface():
    text = (ROOT/'model.html').read_text(encoding='utf-8')
    assert 'ode.html?module=ode' in text
    assert 'model-workbench-v3' not in text
