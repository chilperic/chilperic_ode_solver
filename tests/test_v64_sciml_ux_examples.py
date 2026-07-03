
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def soup(path):
    return BeautifulSoup(read(path), 'html.parser')

def test_diagnostic_plot_selector_is_in_plot_card_header_not_left_controls():
    s = soup('sciml.html')
    controls = s.select_one('.sciml-controls')
    plot_card = s.select_one('.sciml-grid article:nth-of-type(2)')
    assert controls is not None and plot_card is not None
    assert controls.select_one('#sciPlotType') is None
    assert plot_card.select_one('#sciPlotType') is not None
    assert plot_card.select_one('.sciml-plot-select') is not None
    assert 'Generate trajectory' not in read('sciml.html')
    assert 'Run selected workflow' not in read('sciml.html')

def test_sciml_has_more_atlas_examples_and_not_just_four_demos():
    html = read('sciml.html')
    for value in ['michaelis','toggle','lorenz','heat1d','chemostat','allee']:
        assert f'value="{value}"' in html
    js = read('src/sciml-lab.js')
    for token in ['Michaelis–Menten inverse kinetics','Genetic toggle switch','Lorenz surrogate stress test','1D heat-equation surrogate','Chemostat growth calibration','Allee-effect population model']:
        assert token in js

def test_sciml_atlas_cards_cover_new_examples_and_filter_tags():
    html = read('examples.html')
    for href in [
        'sciml.html?example=michaelis&approach=inverse',
        'sciml.html?example=toggle&approach=network',
        'sciml.html?example=lorenz&approach=surrogate',
        'sciml.html?example=heat1d&approach=operator',
        'sciml.html?example=chemostat&approach=inverse',
        'sciml.html?example=allee&approach=sindy',
    ]:
        assert href in html
    assert 'data-category="sciml biology chemistry inverse teaching"' in html
    assert 'data-category="sciml physics engineering surrogate simulation"' in html

def test_sciml_data_and_export_are_collapsible_to_reduce_noise():
    s = soup('sciml.html')
    assert s.select_one('.sciml-compact-data details') is not None
    assert s.select_one('.sciml-compact-export details') is not None
    assert s.select_one('#sciCsv') is not None
    assert s.select_one('#sciExport') is not None

def test_v64_assets_are_versioned():
    html = read('sciml.html')
    assert 'styles/sciml-lab.css?v=70.7.0' in html
    # sciml-lab.js changed in v66 (cutover to the shared SINDy engine); its cache
    # token moved with it, and the engine script must load ahead of the lab.
    assert 'src/sciml-lab.js?v=70.7.0' in html
    assert 'src/sindy.js?v=70.7.0' in html
