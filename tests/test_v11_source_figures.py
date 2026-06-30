from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT/rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')

def test_research_pages_do_not_use_generated_summary_svgs_as_scientific_figures():
    # Generated summary SVGs may remain as legacy assets, but research pages must not use them as scientific figures.
    forbidden = [
        'assets/research/schemes/tcell_pipeline.svg',
        'assets/research/schemes/tcell_smith_martin.svg',
        'assets/research/schemes/tcell_cyton.svg',
        'assets/research/schemes/fa_fitting_pipeline.svg',
        'assets/research/schemes/plant_architecture.svg',
    ]
    for rel in ['research/photosynthesis.html','research/fatty-acid-metabolism.html','research/tcell-proliferation.html']:
        html = read(rel)
        for item in forbidden:
            assert item not in html, (rel, item)

def test_research_pages_use_source_derived_primary_figures():
    expected = {
        'research/photosynthesis.html': ['plant_abstract_figure.png','plant_project_hero.webp'],
        'research/fatty-acid-metabolism.html': ['denovo_scheme.webp','coarse_grained.webp'],
        'research/tcell-proliferation.html': ['tcell_scheme.webp','branching_process.webp'],
    }
    for rel, assets in expected.items():
        html = read(rel)
        assert 'source-derived' in html, rel
        for asset in assets:
            assert asset in html, (rel, asset)
            matches = list((ROOT/'assets').rglob(asset))
            assert matches, asset

def test_source_figure_policy_is_visible_to_reader():
    for rel in ['research/photosynthesis.html','research/fatty-acid-metabolism.html','research/tcell-proliferation.html']:
        txt = soup(rel).get_text(' ', strip=True)
        assert 'source-derived' in txt or 'Scientific figure' in txt or 'Scientific figures' in txt, rel
        assert 'decorative' in txt or 'invented schematic' in txt or 'source graphical abstract' in txt.lower(), rel

def test_source_figure_css_gives_safe_containment():
    css = read('styles/style.css')
    assert 'v11 source-derived research figure policy' in css
    assert '.source-figure-split' in css
    assert 'max-height:520px' in css
    assert 'object-fit:contain' in css
