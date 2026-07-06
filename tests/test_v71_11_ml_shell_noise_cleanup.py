from pathlib import Path
from bs4 import BeautifulSoup
import re
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def soup(p): return BeautifulSoup(read(p),'html.parser')

def test_focused_labs_are_navigation_only_not_page_noise():
    for page in ['ode.html','stochastic.html','optimization.html','steady.html']:
        html=read(page)
        for bad in ['Focused standalone workspace with direct domain controls','descriptor-shell migration proceeds','standalone-route-notice','standalone-power-brief','focused power surface','location.replace(']:
            assert bad not in html

def test_focused_labs_still_have_separate_dropdown():
    for page in ['index.html','docs.html','tutorial.html','workbench.html','ml.html','networks.html','ode.html','stochastic.html','optimization.html','steady.html']:
        s=soup(page); focused=s.select_one('[data-nav-menu="standalone"]')
        assert focused is not None, page
        assert focused.select_one('summary').get_text(' ',strip=True)=='Focused Labs'
        assert [b.get_text(' ',strip=True) for b in focused.select('a b')] == ['ODE + Parametric ODE','Stochastic CTMC','Optimization','Steady-State']

def test_ml_is_fifth_descriptor_shell_analysis_lab():
    html=read('ml.html')
    assert 'data-v7111-ml-port="true"' in html
    assert 'id="mlShellApp"' in html
    assert 'src/core/ml-lite.js?v=71.46.0' in html
    assert 'src/platform/shell.js?v=71.46.0' in html
    assert 'src/labs/ml.js?v=71.46.0' in html
    descriptor=read('src/labs/ml.js')
    assert "registerLab({id:'ml'" in descriptor
    assert 'FokoMLLite' in descriptor

def test_ml_runtime_controls_and_diagnostics_are_preserved_without_hidden_contracts():
    html=read('ml.html'); js=read('src/labs/ml.js')
    assert 'mlContracts' not in html
    for token in ['mlPreset','mlMode','mlPlotMode','mlData','mlFeatureCols','mlTargetCol','mlTrainShare','mlK','mlThreshold','mlRun']:
        assert token in js
    for mode in ['logistic','knn','linear','kmeans','pca','validation','anomaly']:
        assert mode in js
    for plot in ['roc','pr','confusion','loss','residual','elbow','silhouette','decision']:
        assert plot in js

def test_docs_and_tutorial_keep_details_without_homepage_noise():
    home=read('index.html'); docs=read('docs.html'); tutorial=read('tutorial.html')
    assert 'Why the standalone labs remain more powerful' not in home
    assert 'Focused Labs: scope and depth roadmap' in docs
    assert 'event handling' in docs and 'tau-leaping' in docs and 'two-parameter continuation' in docs
    assert 'Focused Lab workflows' in tutorial

def test_cache_token_v7111_normalized():
    tokens=set()
    for p in ROOT.rglob('*.html'):
        tokens.update(re.findall(r'\?v=([0-9]+\.[0-9]+\.[0-9]+)', p.read_text(encoding='utf-8')))
    assert tokens == {'71.46.0'}
