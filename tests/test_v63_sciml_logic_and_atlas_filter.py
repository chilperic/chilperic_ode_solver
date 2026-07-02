
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
WORKBENCH = ['ODE','Stochastic CTMC','Steady-State','Optimization','Symbolic','Agent','SciML','Model Atlas']

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def soup(path):
    return BeautifulSoup(read(path), 'html.parser')

def test_sciml_lab_has_coherent_modeling_setup_not_bizarre_buttons():
    html = read('sciml.html')
    assert 'Modeling setup' in html
    assert 'Model Atlas example' in html
    assert 'Modeling problem' in html
    assert 'Reset atlas data' in html
    assert 'Run analysis' in html
    assert 'Generate trajectory' not in html
    assert 'Run selected workflow' not in html

def test_sciml_modeling_problems_are_selectable_and_exported():
    html = read('sciml.html')
    for value in ['sindy','surrogate','inverse','assimilation','pinn','operator','network']:
        assert f'value="{value}"' in html
    js = read('src/sciml-lab.js')
    for token in ['exportScript', 'Equation discovery / SINDy', 'Surrogate modeling / acceleration', 'Inverse problem', 'Data assimilation', 'PINN', 'Neural operator', 'Biological network ML']:
        assert token in js

def test_sciml_has_modeler_grade_diagnostic_plots():
    html = read('sciml.html')
    for value in ['trajectory','loss','derivative','predicted','error_heatmap','residual_time','residual_hist','cv_residuals','coefficients','library_heatmap','phase2d','phase3d']:
        assert f'value="{value}"' in html
    js = read('src/sciml-lab.js')
    for token in ['Training / validation / physics loss template', 'Predicted vs reference derivative', 'Spatial / temporal absolute error heatmap', 'Pointwise error distribution', 'Cross-validation residuals', 'Sparse coefficient spectrum', 'Candidate-library heatmap']:
        assert token in js

def test_sciml_is_connected_to_model_atlas_and_filter_categories():
    html = read('examples.html')
    assert 'id="sciml-atlas"' in html
    assert 'data-filter="sciml"' in html
    assert 'sciml.html?example=lotka&approach=sindy' in html
    assert 'sciml.html?example=sir&approach=inverse' in html
    assert 'agent-atlas-grid sciml-atlas-grid' in html

def test_model_atlas_filter_uses_tokens_and_aliases():
    html = read('examples.html')
    assert 'function applyFilter' in html
    assert 'const alias' in html
    assert ".atlas-card, .agent-atlas-grid article" in html
    assert "key === 'all'" in html
    assert "steady-state" in html
    assert "scientific-machine-learning" in html

def test_global_workbench_navigation_includes_sciml():
    for page in ['index.html','workbench.html','symbolic.html','agent.html','sciml.html','examples.html']:
        labels = [a.get_text(strip=True) for a in soup(page).select('.workbench-menu .labs-menu-panel a')]
        assert labels == WORKBENCH, page
