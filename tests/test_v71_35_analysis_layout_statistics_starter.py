from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def read(p):
    return (ROOT/p).read_text(encoding='utf-8')

def test_v71_35_css_prevents_plot_clipping():
    css = read('src/platform/shell.css')
    assert 'V71.35 — analysis dashboard unclipping' in css
    assert 'grid-template-columns:repeat(2,minmax(0,1fr))!important' in css
    assert '@media(min-width:1840px)' in css
    assert '.analysis-v33-plot-grid .analysis-plot-tertiary' in css
    assert 'flex-wrap:wrap!important' in css
    assert 'overflow:hidden!important' in css

def test_v71_35_runtime_no_static_blank_plots():
    js = read('src/platform/shell.js')
    assert 'Run analysis to render this panel.' in js
    assert 'Loading Plotly…' in js
    assert 'setTimeout(renderPlots,250)' in js
    assert 'setTimeout(()=>{try{runOnce();}catch(e){}},160)' in js

def test_v71_35_keeps_user_input_and_latex():
    js = read('src/platform/shell.js')
    assert 'Paste data / model input' in js
    assert 'Type your model / formula' in js
    assert 'data-analysis-latex-preview' in js
    assert 'CSV · TSV · JSON · TXT · YAML · DAT · EDGES · MATRIX' in js
