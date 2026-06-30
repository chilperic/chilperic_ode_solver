
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def test_research_hub_v7_cards_are_not_cramped_side_by_side_layout():
    html = read('research.html')
    css = read('styles/style.css')
    soup = BeautifulSoup(html, 'html.parser')
    assert len(soup.select('.research-project-panel')) == 3
    assert 'research-panel-list' in css
    assert 'research-project-panel' in css
    assert 'grid-template-columns:minmax(280px,38%) minmax(0,1fr)' in css


def test_project_hero_titles_are_capped_for_readability():
    css = read('styles/style.css')
    assert 'font-size:clamp(1.65rem,2.4vw,2.65rem)' in css
    assert 'project-subtitle' in css


def test_workbench_has_plot_palette_selector_and_plotly_color_scales():
    html = read('workbench.html')
    js = read('src/model-workbench-v3.js')
    soup = BeautifulSoup(html, 'html.parser')
    selector = soup.select_one('#plotPalette')
    assert selector is not None
    values = {o.get('value') for o in selector.select('option')}
    assert {'scientific','colorblind','viridis','plasma','plant','metabolic','mono'}.issubset(values)
    for token in ['PLOT_PALETTES','paletteColors','plotColorscale','colorway:paletteColors()','colorscale:plotColorscale()']:
        assert token in js
    assert "state.palette=e.target.value" in js
