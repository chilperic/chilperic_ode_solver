from pathlib import Path
from bs4 import BeautifulSoup
import re
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def soup(p): return BeautifulSoup(read(p),'html.parser')

def test_standalone_labs_are_in_separate_focused_dropdown_not_modeling():
    for page in ['index.html','docs.html','tutorial.html','workbench.html','statistics.html','linear-algebra.html','fitting.html','networks.html','ode.html','stochastic.html','optimization.html','steady.html']:
        s=soup(page); modeling=s.select_one('[data-nav-menu="modeling"]'); focused=s.select_one('[data-nav-menu="standalone"]')
        assert modeling is not None and focused is not None, page
        assert focused.select_one('summary').get_text(' ',strip=True)=='Focused Labs'
        assert [b.get_text(' ',strip=True) for b in focused.select('a b')] == ['ODE + Parametric ODE','Stochastic CTMC','Optimization','Steady-State']

def test_home_uses_compact_focused_lab_summary_and_photo_first_creator_card():
    html=read('index.html'); s=soup('index.html')
    assert 'Why the standalone labs remain more powerful' not in html
    assert s.select_one('[data-v7110-focused-home="true"]') is not None
    card=s.select_one('[data-v7110-photo-card="true"]'); assert card is not None
    assert card.select_one('img[src*="assets/profile-chilperic.webp"]') is not None

def test_networks_is_fourth_descriptor_shell_analysis_lab():
    html=read('networks.html')
    assert 'data-v7110-networks-port="true"' in html
    assert 'id="networkShellApp"' in html
    assert 'src/core/networks.js?v=71.46.0' in html
    assert 'src/platform/shell.js?v=71.46.0' in html
    assert 'src/labs/networks.js?v=71.46.0' in html
    descriptor=read('src/labs/networks.js')
    assert "registerLab({id:'networks'" in descriptor
    assert 'FokoNetworks' in descriptor

def test_network_runtime_controls_and_methods_are_preserved_without_hidden_contracts():
    html=read('networks.html'); js=read('src/labs/networks.js')
    assert 'networkContracts' not in html
    for token in ['netPreset','netMode','netPlotMode','netDirected','netEdges','netStart','netEnd','netFocus','netRun']:
        assert token in js
    for mode in ['summary','shortest','pagerank','centrality','betweenness','mst','community','resilience']:
        assert mode in js
    for plot in ['force','adjacency','sankey','resilience']:
        assert plot in js

def test_cache_token_v7110_normalized():
    tokens=set()
    for p in ROOT.rglob('*.html'):
        tokens.update(re.findall(r'\?v=([0-9]+\.[0-9]+\.[0-9]+)', p.read_text(encoding='utf-8')))
    assert tokens == {'71.46.0'}
