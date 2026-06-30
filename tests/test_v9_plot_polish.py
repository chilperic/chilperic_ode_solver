from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def test_v9_release_notes_and_cache_bust_exist():
    assert (ROOT / 'RELEASE-NOTES-platform-stability-v9.md').exists()
    workbench_html = (ROOT / 'workbench.html').read_text(encoding='utf-8')
    research_html = (ROOT / 'research.html').read_text(encoding='utf-8')
    assert ('platform-v9' in workbench_html) or ('platform-v10' in workbench_html)
    assert ('platform-v9' in research_html) or ('platform-v10' in research_html) or ('platform-v11' in research_html)


def test_plot_layout_has_legend_axis_collision_policy():
    js = (ROOT / 'src' / 'model-workbench-v3.js').read_text(encoding='utf-8')
    for token in [
        'function axisTitle',
        'function layoutWithLegend',
        'automargin:true',
        'Legend is hidden to avoid covering the axis',
        'function paddedRange',
        'cliponaxis:false',
    ]:
        assert token in js


def test_objective_landscape_and_slice_expand_ranges():
    js = (ROOT / 'src' / 'model-workbench-v3.js').read_text(encoding='utf-8')
    assert ('layout.xaxis.range=paddedRange([...xs,...(res.series.x||[]),res.best.x],bounds.x)' in js) or ('layout.xaxis.range=xrange' in js)
    assert ('layout.yaxis.range=paddedRange([...ys,...(res.series.y||[]),res.best.y],bounds.y)' in js) or ('layout.yaxis.range=yrange' in js)
    assert 'sliceLayout.xaxis.range=paddedRange([...xs,bestv],bounds[axis])' in js


def test_workbench_css_has_v9_plot_polish_rules():
    css = (ROOT / 'styles' / 'model-workbench-v3.css').read_text(encoding='utf-8')
    for token in ['v9 plot polish', '.mw-plot', 'overflow:visible', 'height:360px']:
        assert token in css


def test_research_schematics_are_constrained():
    css = (ROOT / 'styles' / 'style.css').read_text(encoding='utf-8')
    for token in ['v9 research schematic', '.research-project-page .research-figure', 'object-fit:contain', 'max-height:380px']:
        assert token in css
