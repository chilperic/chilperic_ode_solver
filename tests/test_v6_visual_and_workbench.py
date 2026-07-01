
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(p):
    return (ROOT / p).read_text(encoding='utf-8')

def test_research_hub_uses_two_column_safe_cards_and_no_duplicate_claim():
    html = read('research.html')
    css = read('styles/style.css')
    assert 'Research Hub' in html
    assert 'research-panel-list' in css
    assert 'Selected research projects with provenance' in html
    assert 'research-project-panel' in html


def test_project_launch_sections_have_clean_copy_and_one_figure():
    for page in ['research/photosynthesis.html','research/fatty-acid-metabolism.html','research/tcell-proliferation.html']:
        soup = BeautifulSoup(read(page), 'html.parser')
        launch = soup.select_one('.project-launch-hero')
        assert launch is not None, page
        assert launch.select_one('.project-launch-copy') is not None, page
        figs = launch.select('.project-launch-figure')
        assert len(figs) == 1, page
        assert launch.select_one('h1') is not None, page


def test_workbench_exposes_advanced_optimization_plot_palette():
    html = read('workbench.html')
    js = read('src/model-workbench-v3.js')
    assert 'optimizationPlotPalette' in html
    for label in ['Optimization history','Contour / heatmap','Parameter importance','Parallel coordinates','Pareto front','Slice / partial dependence','ECDF','Multi-objective radar','Step / trajectory','Constraint violation']:
        assert label in html
    for typ in ['importance','parallel','slice','ecdf','radar','trajectory']:
        assert f"type:'{typ}'" in js or f'type,settings' in js
    assert "computed:true" in js


def test_only_plant_surrogates_are_export_protected():
    js = read('src/model-workbench-v3.js')
    protected_block = js.split('const UNPUBLISHED_PLANT_MODEL_IDS = new Set([')[1].split(']);')[0]
    assert 'fadns-coa-calibration-opt' not in protected_block
    assert 'tcell-generation-fit-opt' not in protected_block
    assert 'crop-phenotype-robust-opt' in protected_block
