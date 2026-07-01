from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')


def soup(rel: str) -> BeautifulSoup:
    return BeautifulSoup(read(rel), 'html.parser')


def test_agent_lab_has_palette_selector_and_expanded_plot_modes():
    doc = soup('agent.html')
    palette = doc.select_one('#agentPalette')
    assert palette is not None
    assert [o.get('value') for o in palette.select('option')] == [
        'model', 'scientific', 'aurora', 'viridis', 'magma', 'mono'
    ]
    assert doc.select_one('#agentPlotMode') is not None
    assert not doc.select('#agentPlotMode option')
    js = read('src/agent-lab.js')
    for value in [
        'population_stacked', 'state_rank', 'cumulative_events',
        'diversity', 'spatial_heatmap', 'fadns_species', 'layers'
    ]:
        assert value in js


def test_agent_js_applies_palette_to_canvas_legend_and_plotly():
    js = read('src/agent-lab.js')
    for token in [
        'AGENT_PALETTES', 'function activePalette', 'function stateColor',
        'function plotColor', 'ctx.fillStyle=stateColor(v)',
        'background:${stateColor(i)}', 'marker:{color:names.map((_,i)=>stateColor(i))}',
        'colorscale:pal.map'
    ]:
        assert token in js


def test_agent_js_has_new_simulation_diagnostics_not_only_counts():
    js = read('src/agent-lab.js')
    for token in [
        "mode==='population_stacked'", "mode==='state_rank'",
        "mode==='cumulative_events'", "mode==='diversity'",
        "mode==='spatial_heatmap'", 'function entropyFromCounts',
        'function cumulative', 'function heatmapRows'
    ]:
        assert token in js


def test_homepage_is_compact_entry_point_not_long_scroll_page():
    html = read('index.html')
    css = read('styles/style.css')
    assert 'A compact browser workspace' in html
    assert 'identity-lower clean-home-panels' in html
    assert '.identity-lower.clean-home-panels{display:none;}' in css
    assert '.identity-hero{grid-template-columns:minmax(0,1.08fr) minmax(280px,.56fr);' in css
    assert 'min-height:360px' in css
    assert 'Modeling approaches' in html
    assert 'ODE · stochastic · optimization · symbolic · agent-based' in html
