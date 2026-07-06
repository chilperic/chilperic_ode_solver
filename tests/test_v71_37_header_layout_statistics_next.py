from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
ANALYSIS = ['statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html']

def read(p):
    return (ROOT/p).read_text(encoding='utf-8')

def test_analysis_pages_keep_static_header():
    for page in ANALYSIS:
        txt = read(page)
        assert 'class="topbar public-topbar foko-ide-topbar"' in txt
        assert '<header' in txt
        assert 'src/platform/shell.css?v=71.46.0' in txt

def test_header_restore_css_and_no_platform_ribbon_on_analysis():
    css = read(Path('src/platform/shell.css'))
    assert 'V71.37 — stable header restore' in css
    assert 'body[data-lab="analysis"] .foko-ide-topbar' in css
    assert 'display:flex!important' in css
    assert 'body[data-lab="analysis"] .platform-ribbon' in css
    assert 'display:none!important' in css

def test_analysis_plot_grid_not_three_columns_by_default():
    css = read(Path('src/platform/shell.css'))
    assert 'grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important' in css
    assert '.analysis-plot-tertiary' in css
    assert 'grid-column:1 / -1!important' in css
    assert '@media (min-width:1900px)' in css

def test_no_stale_7135_tokens_in_runtime_assets():
    offenders=[]
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.html','.js','.css'}:
            txt=p.read_text(encoding='utf-8', errors='ignore')
            if '71.35.0' in txt or '71.36.0' in txt:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders
