from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def test_bounded_optimization_projects_candidates_inside_bounds():
    js = read('src/model-workbench-v3.js')
    assert 'const projectPoint=(px,py)=>' in js
    assert 'clamp(px,bounds.x[0],bounds.x[1])' in js
    assert 'clamp(py,bounds.y[0],bounds.y[1])' in js
    assert 'accepted bounded search path' in js

def test_objective_landscape_evaluates_visible_range_not_only_problem_bounds():
    js = read('src/model-workbench-v3.js')
    assert 'const xrange=paddedRange' in js
    assert 'const yrange=paddedRange' in js
    assert 'xs.push(xrange[0]+(xrange[1]-xrange[0])' in js
    assert 'ys.push(yrange[0]+(yrange[1]-yrange[0])' in js

def test_research_schematics_have_compact_viewboxes_and_not_old_wide_versions():
    checks = {
        'assets/research/schemes/plant_architecture.svg': 'viewBox="0 0 760 430"',
        'assets/research/schemes/tcell_pipeline.svg': 'viewBox="0 0 780 390"',
        'assets/research/schemes/fa_fitting_pipeline.svg': 'viewBox="0 0 820 280"',
    }
    for rel, viewbox in checks.items():
        text = read(rel)
        assert viewbox in text, rel
        assert 'x="807"' not in text
        assert 'viewBox="0 0 920 420"' not in text

def test_research_svg_containers_are_not_clipped_by_css():
    css = read('styles/style.css')
    assert 'v10 hard visual correction' in css
    assert '.research-project-page .research-figure{' in css
    assert 'overflow:visible!important' in css
    assert 'grid-template-columns:minmax(0,0.86fr) minmax(360px,1.14fr)' in css
