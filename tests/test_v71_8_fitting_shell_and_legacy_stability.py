from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')

def test_fitting_is_descriptor_driven_third_reference_analysis_lab():
    html=read('fitting.html')
    assert 'data-v718-fitting-port="true"' in html
    assert 'id="fittingShellApp"' in html
    assert 'src/core/fitting.js?v=71.46.0' in html
    assert 'src/platform/shell.js?v=71.46.0' in html
    assert 'src/labs/fitting.js?v=71.46.0' in html
    descriptor=read('src/labs/fitting.js')
    assert "registerLab({id:'fitting'" in descriptor
    assert 'FokoFitting' in descriptor

def test_fitting_runtime_controls_and_depth_are_preserved_without_hidden_contracts():
    html=read('fitting.html')
    js=read('src/labs/fitting.js')
    assert 'fittingContracts' not in html
    for token in ['fitPreset','fitModel','fitPlotMode','fitData','fitRun']:
        assert token in js
    for required in ['linear','quadratic','cubic','exponential','logistic','michaelis']:
        assert required in js
    for term in ['Residual time-series chronogram','Autocorrelation lag plot','Bootstrap parameter histograms']:
        assert term in js

def test_fitting_page_no_longer_owns_ad_hoc_analysis_grid_layout():
    html=read('fitting.html')
    assert '<section class="analysis-grid" data-fitting-lab="true">' not in html
    assert 'fittingShellApp' in html

def test_legacy_stochastic_optimization_steady_remain_real_pages_not_redirects():
    for page in ['stochastic.html','optimization.html','steady.html']:
        html=read(page)
        assert 'data-v713-compat-redirect="true"' not in html
        assert 'window.location.replace' not in html
        assert 'standalone-route-notice' not in html
        assert 'Focused standalone workspace with direct domain controls' not in html
        assert 'descriptor-shell migration proceeds' not in html
    assert 'id="runModel"' in read('stochastic.html')
    assert 'id="runOpt"' in read('optimization.html')
    assert 'id="solveSteady"' in read('steady.html')

def test_cache_token_normalized_to_v71_29():
    import re
    tokens=set()
    for p in ROOT.rglob('*.html'):
        tokens.update(re.findall(r'\?v=([0-9]+\.[0-9]+\.[0-9]+)', p.read_text(encoding='utf-8')))
    assert tokens == {'71.46.0'}
