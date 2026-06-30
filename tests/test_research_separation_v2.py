from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def text(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def soup(rel):
    return BeautifulSoup(text(rel), 'html.parser')


def test_model_atlas_contains_no_personal_research_cards():
    html = text('examples.html')
    forbidden = [
        'Fatty-acid metabolism bistability',
        'FADNS with CoA sequestration',
        'T-cell proliferation',
        'Leaf gas-exchange operating point',
        'Research ODE',
        'Research stochastic biology',
        'workbench.html?model=fa-metabolism',
        'workbench.html?model=fadns-coa',
        'workbench.html?model=tcell',
        'workbench.html?model=leaf-gas-steady',
    ]
    for item in forbidden:
        assert item not in html
    assert 'Open Research Hub' in html
    assert 'Teaching and benchmark models only' in html


def test_research_hub_contains_all_research_projects():
    html = text('research.html')
    for item in [
        'Photosynthesis climate adaptation',
        'Fatty-acid metabolism and FADNS',
        'T-cell proliferation dynamics',
        'Research portfolio, separated from examples',
    ]:
        assert item in html
    for rel in [
        'research/photosynthesis.html',
        'research/fatty-acid-metabolism.html',
        'research/tcell-proliferation.html',
    ]:
        assert (ROOT / rel).exists(), rel


def test_unpublished_plant_page_has_no_download_links_or_source_links():
    doc = soup('research/photosynthesis.html')
    html = str(doc)
    assert 'unpublished' in html.lower()
    assert 'does not distribute source code' in html
    for name in ['Chilperic Armel Foko Kuate', 'Yvonne Danisch', 'Jérémie Muller-Prokob', 'Martin Lercher', 'Antonio Rigueiro']:
        assert name in html
    bad_hrefs = []
    for a in doc.find_all('a', href=True):
        href = a['href'].lower()
        if href.startswith(('http://', 'https://')) or href.endswith(('.zip', '.py', '.ipynb', '.json', '.csv')):
            bad_hrefs.append(a['href'])
    assert not bad_hrefs


def test_unpublished_plant_workbench_exports_are_disabled():
    js = text('src/model-workbench-v3.js')
    for mid in ['leaf-gas-steady','leaf-thermal-steady','leaf-thermal-opt','hydraulic-carbon-opt','c3c4-trait-opt']:
        assert mid in js
    for token in [
        'UNPUBLISHED_PLANT_MODEL_IDS',
        'Protected unpublished plant research surrogate',
        'Export disabled for unpublished plant research surrogate',
        'No source code, parameter files, Python/SALib scripts, JSON reports, PNG exports or full-model downloads',
    ]:
        assert token in js


def test_research_models_hidden_from_generic_workbench_dropdown_logic():
    js = text('src/model-workbench-v3.js')
    assert 'const visible=models.filter(m=>!RESEARCH_MODEL_IDS.has(m.id));' in js
    assert "Research surrogates · opened from Research Hub" in js


def test_photosynthesis_uses_sellable_figures():
    html = text('research/photosynthesis.html')
    for fig in [
        'c3c4_3d_evolution_sudan.png',
        'c3c4_local_sensitivity.png',
        'c3c4_sobol_indices.png',
        'c3c4_sobol_interactions.png',
        'c3c4_pareto_sudan.png',
    ]:
        assert fig in html
        assert (ROOT / 'assets' / 'research' / 'photosynthesis' / fig).exists()
