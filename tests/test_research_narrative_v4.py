from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

def text(rel): return (ROOT/rel).read_text(encoding='utf-8')
def soup(rel): return BeautifulSoup(text(rel), 'html.parser')

PROJECTS = ['research/photosynthesis.html','research/fatty-acid-metabolism.html','research/tcell-proliferation.html']

def test_every_research_project_has_navigation_and_simulation_callout():
    for rel in PROJECTS:
        doc = soup(rel)
        assert doc.select_one('.project-nav-bar a[href="../research.html"]'), rel
        assert doc.select_one('.project-bottom-nav'), rel
        assert doc.select_one('.simulation-callout'), rel
        for phrase in ['Scientific problem', 'Limitations']:
            assert phrase in doc.get_text(' '), (rel, phrase)

def test_project_pages_are_not_minimal_cards():
    checks = {
        'research/photosynthesis.html': ['Model architecture','Methods and computational layer','Results narrative','Leadership and contributors','mesophyll','bundle sheath','hydraulics','heat transfer','CMA-ES','Sobol','Pareto'],
        'research/fatty-acid-metabolism.html': ['Two-layer contribution','coarse-grained','semi-mechanistic','FADNS','acetyl-CoA','malonyl-CoA','NADPH','CoA','bistability','C14:0'],
        'research/tcell-proliferation.html': ['Model-family map','Smith–Martin','Cyton','CFSE','individual-based simulation','stochastic master','branching','A phase','B phase']
    }
    for rel, terms in checks.items():
        page = text(rel)
        assert len(BeautifulSoup(page, 'html.parser').get_text(' ').split()) > 450, rel
        for term in terms:
            assert term in page, (rel, term)

def test_plant_page_has_user_abstract_image_and_no_download_exposure():
    rel='research/photosynthesis.html'
    doc=soup(rel)
    html=str(doc).lower()
    assert 'plant_abstract_figure.png' in str(doc)
    assert (ROOT/'assets/research/photosynthesis/plant_abstract_figure.png').exists()
    for phrase in ['does not expose source code','no source code','parameter files','full-model downloads','unpublished']:
        assert phrase in html
    bad=[]
    for a in doc.find_all('a', href=True):
        href=a['href'].lower()
        if href.startswith(('http://','https://')) or href.endswith(('.zip','.py','.ipynb','.json','.csv','.yml','.yaml')):
            bad.append(a['href'])
    assert not bad

def test_research_scheme_assets_exist():
    expected = [
        'assets/research/schemes/plant_architecture.svg',
        'assets/research/schemes/tcell_pipeline.svg',
        'assets/research/schemes/tcell_smith_martin.svg',
        'assets/research/schemes/tcell_cyton.svg',
        'assets/research/schemes/fa_bistability.svg',
        'assets/research/schemes/fa_fadns_cycle.svg',
        'assets/research/schemes/fa_fitting_pipeline.svg',
    ]
    for rel in expected:
        assert (ROOT/rel).exists(), rel

def test_model_atlas_no_research_category_and_uses_polished_images():
    doc=soup('examples.html')
    for card in doc.select('.atlas-card'):
        assert 'research' not in card.get('data-category','').split(), card.find('h3').get_text(' ', strip=True) if card.find('h3') else 'unknown'
    used = [img['src'] for img in doc.select('img[src^="assets/model-atlas/"]')]
    assert used, 'no atlas images found'
    preferred = [src for src in used if src.endswith('.webp')]
    assert len(preferred) >= 6, preferred
    for src in used:
        assert (ROOT/src).exists(), src

def test_no_personal_research_cards_in_model_atlas_text():
    html = text('examples.html')
    forbidden = ['Fatty-acid metabolism bistability','FADNS with CoA sequestration','T-cell proliferation','Leaf gas-exchange operating point','workbench.html?model=leaf-gas-steady']
    for item in forbidden:
        assert item not in html
    assert 'Research projects' in html


def test_research_hub_has_graphical_abstract_cards_and_no_overflow_prone_first_view():
    html = text('research.html')
    for asset in ['assets/research/thumbs/photosynthesis.webp','assets/research/thumbs/fatty-acid.webp','assets/research/thumbs/tcell.webp']:
        assert asset in html
        assert (ROOT/asset).exists(), asset
    assert 'research-project-panel' in html


def test_advanced_optimization_examples_and_legacy_plot_options_exist():
    opt_html = text('optimization.html')
    opt_js = text('src/optimization-lab.js')
    for name in ['Bundle-sheath thermal controller tuning','Robust C3-C4 crop phenotype design','FADNS CoA inhibition calibration','T-cell generation-structure calibration']:
        assert name in opt_js
    for label in ['Hyperparameter importance','Parallel coordinate','Slice / partial dependence','ECDF','Multi-objective radar','Step-response / simulation trajectory','Constraint violation history']:
        assert label in opt_html
    for fn in ['plotImportance','plotParallel','plotSlice','plotECDF','plotRadar','plotStepResponse']:
        assert fn in opt_js


def test_workbench_has_stronger_optimization_surrogates_and_protected_plant_exports():
    js = text('src/model-workbench-v3.js')
    for mid in ['thermal-controller-opt','crop-phenotype-robust-opt','fadns-coa-calibration-opt','tcell-generation-fit-opt']:
        assert mid in js
    for mid in ['thermal-controller-opt','crop-phenotype-robust-opt']:
        assert mid in js.split('const UNPUBLISHED_PLANT_MODEL_IDS')[1].split(']);')[0]
    assert 'response:(x,y,p)' in js
    assert "{id:'c_parallel',type:'parallel'" in js
