from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def soup(p): return BeautifulSoup(read(p),'html.parser')

def test_statistics_is_descriptor_driven_reference_lab():
    html=read('statistics.html')
    assert 'data-v713-statistics-port="true"' in html
    assert 'id="statisticsShellApp"' in html
    assert 'src/labs/statistics.js?v=71.46.0' in html
    descriptor=read('src/labs/statistics.js')
    assert "registerLab({id:'statistics'" in descriptor
    assert 'FokoStatistics' in descriptor

def test_statistics_runtime_contract_ids_are_preserved_without_hidden_dom():
    html=read('statistics.html'); js=read('src/labs/statistics.js')
    assert 'statisticsContracts' not in html
    for id_ in ['statsMode','statsPlotMode','statsRun','statsData','statsPreset']:
        assert id_ in js
    assert 'analysis-cockpit' in read('src/platform/shell.js')

def test_standalone_routes_are_preserved_in_navigation():
    for page in ['index.html','workbench.html','statistics.html','docs.html','tutorial.html']:
        html=read(page); s=soup(page)
        assert 'Focused Labs' in html
        menu=str(s.select_one('.standalone-menu .labs-menu-panel'))
        assert 'Stochastic CTMC' in menu and 'Optimization' in menu and 'Steady-State' in menu
        assert 'href="stochastic.html"' in menu and 'href="optimization.html"' in menu and 'href="steady.html"' in menu

def test_legacy_non_ode_standalone_pages_do_not_redirect():
    for page in ['stochastic.html','optimization.html','steady.html']:
        html=read(page)
        assert 'data-v713-compat-redirect="true"' not in html
        assert 'location.replace(' not in html
        assert '<main' in html
