from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')

def test_plot_cards_have_panel_local_controls_and_palettes():
    js=read('src/platform/shell.js')
    assert 'data-analysis-palette' in js
    assert 'makePlotPanel' in js
    assert 'Scientific' in js and 'Viridis' in js and 'Cividis' in js and 'Plasma' in js
    assert 'applyPlotPalette' in js
    assert 'analysis-plot-card-head' in js

def test_tabs_are_real_buttons_not_decorative_spans():
    js=read('src/platform/shell.js')
    assert 'data-analysis-tab="setup"' in js
    assert '<button type="button" class="mode-tab active"' in js
    assert 'mode.addEventListener' in js
    assert 'flashSection' in js
    assert '<span class="mode-tab' not in js

def test_status_strip_no_longer_renders_four_decorative_cards():
    js=read('src/platform/shell.js')
    assert 'analysis-live-status' in js
    assert 'Workspace: <b>3 panels</b>' in js
    assert '<div><span>Lab</span><b>' not in js
    assert 'grid-template-columns:repeat(4' not in read('src/platform/shell.css').split('v71.32')[1]

def test_plot_ids_are_slot_specific_to_avoid_duplicate_ids():
    files=['src/labs/statistics.js','src/labs/fitting.js','src/labs/linalg.js','src/labs/networks.js','src/labs/ml.js']
    for f in files:
        s=read(f)
        assert "dataset.plotSlot" in s
        assert "_'+slot" in s or "+slot" in s
        assert "?'" not in s[s.find('function plot'):s.find('function plot')+220]

def test_release_token_normalized_to_71_32():
    offenders=[]
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.html','.js','.css','.md','.json'}:
            try: txt=p.read_text(encoding='utf-8')
            except UnicodeDecodeError: continue
            if '?v=' in txt and '?v=71.46.0' not in txt:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders
