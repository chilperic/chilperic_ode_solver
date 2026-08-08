from pathlib import Path
import json
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]
AUTHORED = [
    'studio.html','ode.html','steady.html','stochastic.html','optimization.html','statistics.html',
    'fitting.html','linear-algebra.html','networks.html','ml.html','sciml.html',
    'agent.html','symbolic.html','sensitivity.html','workbench.html','population-genetics.html',
    'advanced-methods.html','bifurcation.html','evolution.html','ai-modeling.html'
]


def soup(name: str) -> BeautifulSoup:
    return BeautifulSoup((ROOT / name).read_text(encoding='utf-8'), 'html.parser')


def test_home_has_compact_product_hierarchy_and_visible_authorship():
    page = soup('index.html')
    assert len(page.find_all('h1')) == 1
    primary = page.select('.foko-home-actions .primary')
    assert len(primary) == 1
    assert primary[0].get('href', '') == 'studio.html?new=1'
    assert page.select_one('.foko-creator-strip img[src="assets/profile-chilperic.webp"]') is not None
    assert 'Dr. Chilperic Armel Foko Kuate' in page.get_text(' ', strip=True)
    assert 'Start with the system, not a menu of methods.' in page.get_text(' ', strip=True)
    claims = page.select('.foko-evidence-row > a')
    assert len(claims) == 4
    rendered = ' '.join(node.get_text(' ', strip=True) for node in claims)
    for label in ('Computed here', 'Limited', 'Export workflow', 'Not available'):
        assert label in rendered
    labels = page.get_text(' ', strip=True)
    for required in ('ODE dynamics', 'Steady state', 'Stochastic dynamics', 'Agent models', 'Model fitting', 'Statistics', 'Machine learning', 'Scientific ML', 'Optimization', 'Symbolic mathematics', 'Linear algebra', 'Networks', 'Workbench', 'Bifurcation', 'Evolution landscapes', 'AI modeling'):
        assert required in labels, required


def test_global_navigation_uses_one_compact_modeling_shell():
    shell = (ROOT / 'src/v76/app-shell.js').read_text(encoding='utf-8')
    for label in ('Home', 'Model Studio', 'Simulate', 'Analyze', 'Evidence', 'Atlas'):
        assert f'>{label}' in shell or f'>{label} ' in shell
    assert shell.count('class="v76-primary-nav"') == 1
    for name in ['index.html','docs.html','tutorial.html','trust.html',*AUTHORED]:
        page = soup(name)
        header = page.select_one('header[data-v76-appbar="true"]')
        assert header is not None, name
        assert page.select_one('script[src^="src/v76/app-shell.js"]') is not None, name
        assert page.select_one('link[href^="styles/v76-system.css"]') is not None, name
        assert page.select_one('[data-nav-menu]') is None, name


def test_guides_are_distinct_user_facing_continuous_surfaces():
    docs = soup('docs.html')
    tutorial = soup('tutorial.html')
    assert docs.find('h1').get_text(' ', strip=True) == 'Foko Lab modeling handbook'
    assert tutorial.find('h1').get_text(' ', strip=True) == 'Practical modeling curriculum'
    docs_text = docs.get_text(' ', strip=True)
    tutorial_text = tutorial.get_text(' ', strip=True)
    assert 'A complete modeling workflow' in docs_text and 'Capability labels' in docs_text
    assert 'Tutorial 1 — Turn a question into a model' in tutorial_text and 'Tutorial 20 — Produce a reproducible report' in tutorial_text
    assert docs.select_one('.guide-layout .guide-toc') is not None
    assert tutorial.select_one('.guide-layout .guide-toc') is not None
    for page in (docs, tutorial):
        assert page.select_one('.guide-source-links') is None
        assert page.find('a', href='PLATFORM_TODO.md') is None
        assert page.find('a', href='USER_GUIDE.md') is None
        assert page.find('a', href='TUTORIALS.md') is None



def test_model_atlas_restores_visual_previews_and_compact_copy():
    page = soup('examples.html')
    assert page.find('p', class_='eyebrow').get_text(' ', strip=True) == 'Validated starting points'
    assert page.select_one('#atlasStatus') is not None
    assert 'Open as editable starting point' in (ROOT/'src/v72/example-atlas.js').read_text(encoding='utf-8')
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
