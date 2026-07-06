from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PAGES=['statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html']
LABS=['statistics.js','fitting.js','linalg.js','networks.js','ml.js']
def text(p): return (ROOT/p).read_text(encoding='utf-8')

def test_analysis_pages_do_not_show_browser_limit_noise():
    forbidden=['What is feasible in-browser','What still belongs outside the browser','Publication-grade profile likelihood','NetworkX, igraph, graph-tool','RStudio / SPSS / Stata']
    for page in PAGES:
        html=text(page)
        for phrase in forbidden:
            assert phrase not in html

def test_descriptor_pages_load_shell_css():
    for page in PAGES:
        assert 'src/platform/shell.css?v=71.46.0' in text(page)

def test_shell_renders_two_plot_surfaces_when_lab_supports_secondary_plot():
    shell=text('src/platform/shell.js')
    for token in ['analysis-plot-grid','analysis-plot-primary','analysis-plot-secondary',"typeof lab.PlotSecondary==='function'"]:
        assert token in shell

def test_analysis_labs_provide_secondary_diagnostics():
    for lab in LABS:
        js=text(f'src/labs/{lab}')
        assert 'function secondaryPlot' in js
        assert 'PlotSecondary:secondaryPlot' in js

def test_shell_css_styles_two_plot_workspace():
    css=text('src/platform/shell.css')
    assert '.analysis-plot-grid' in css
    assert 'grid-template-columns:minmax(0,1fr) minmax(0,1fr)' in css
    assert '.analysis-plot-card .analysis-plot' in css
