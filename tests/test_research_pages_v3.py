
from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

def text(rel): return (ROOT/rel).read_text(encoding='utf-8')
def soup(rel): return BeautifulSoup(text(rel), 'html.parser')

def test_research_pages_have_real_project_narrative():
    required = {
        'research/photosynthesis.html': ['Research question','What I built','Leadership and contributors','Most sellable outputs','Limitations','First-principles thermo-hydraulic','CMA-ES','Sobol','Pareto'],
        'research/fatty-acid-metabolism.html': ['Research question','What I built','Modeling pipeline','What this sells','Limitations','bistability','semi-mechanistic','fatty-acid synthase'],
        'research/tcell-proliferation.html': ['Research question','What I built','Modeling pipeline','What this sells','Limitations','CFSE','Smith–Martin','Cyton','branching'],
    }
    for rel, terms in required.items():
        page = text(rel)
        for term in terms:
            assert term in page, (rel, term)

def test_research_index_is_a_portfolio_not_a_gallery():
    html = text('research.html')
    for term in ['Project map','Positioning claim','Boundary rules','Core question','Methods','Portfolio signal']:
        assert term in html
    assert 'The Model Atlas is for teaching and benchmark examples' in html
    assert 'Foko Lab platform' not in html
    assert 'platform.html' in html

def test_plant_project_remains_protected_from_downloads():
    doc = soup('research/photosynthesis.html')
    html = str(doc)
    for phrase in ['unpublished', 'does not distribute source code', 'no source code', 'parameter files', 'full-model downloads']:
        assert phrase in html.lower()
    bad = []
    for a in doc.find_all('a', href=True):
        href = a['href'].lower()
        if href.startswith(('http://','https://')) or href.endswith(('.zip','.py','.ipynb','.json','.csv','.yml','.yaml')):
            bad.append(a['href'])
    assert not bad

def test_expanded_plant_assets_exist():
    figures = ['plant_project_hero.webp','c3c4_3d_evolution_sudan.png','c3c4_3d_evolution_niger.png','c3c4_3d_evolution_canada.png','c3c4_local_sensitivity.png','c3c4_sobol_indices.png','c3c4_sobol_interactions.png','c3c4_pareto_sudan.png','c3c4_delta13c_sudan.png']
    html = text('research/photosynthesis.html')
    for fig in figures:
        assert fig in html
        assert (ROOT/'assets'/'research'/'photosynthesis'/fig).exists(), fig
