from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def soup(p): return BeautifulSoup(read(p),'html.parser')

def test_analysis_dropdown_text_is_visible_and_ml_moved_to_sciml():
    s=soup('index.html')
    analysis=[b.get_text(strip=True) for b in s.select('.analysis-menu-panel a b')]
    sciml=[b.get_text(strip=True) for b in s.select('.sciml-menu-panel a b')]
    assert analysis == ['Statistics','Curve fitting','Linear algebra','Networks']
    assert 'ML Toolkit' not in analysis
    assert 'SciML Lab' in sciml and 'ML Toolkit' in sciml

def test_mathematical_beauty_is_a_header_route_and_home_route():
    s=soup('index.html')
    assert s.select_one('.foko-main-nav a[href="beauty.html"]') is not None
    assert s.select_one('.home-v705-route-grid a[href="beauty.html"]') is not None
    assert s.select_one('.home-v705-card-grid a[href="beauty.html"]') is not None

def test_statistics_lab_controls_are_runtime_cockpit_controls():
    js=read('src/labs/statistics.js')
    for token in ['statsPreset','statsPlotMode','statsMode','statsData','statsRun']:
        assert token in js
    for term in ['Regression','A/B test','ANOVA','Bootstrap','Survival','Classification','FDR']:
        assert term in js

def test_linear_algebra_controls_are_runtime_cockpit_controls():
    js=read('src/labs/linalg.js')
    for token in ['laPreset','laMode','laPlotMode','laMatrix','laVector','laRun']:
        assert token in js
    for term in ['Solve Ax=b','Dominant eigenpair','Least squares','Projection','Markov steady state']:
        assert term in js

def test_tutorial_contains_upload_ready_templates_by_lab():
    html=read('tutorial.html')
    for marker in ['"type": "ode"','"type": "ctmc"','"type": "optimization"','"type": "steady_state"','"type": "symbolic"','"type": "agent_based"','"type": "sciml"','time,response,group','source,target,weight']:
        assert marker in html
