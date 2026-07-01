from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

def read(path): return (ROOT/path).read_text(encoding='utf-8')

def soup(path): return BeautifulSoup(read(path), 'html.parser')

def test_model_contract_modules_present():
    assert (ROOT/'src/model-validator.js').exists()
    assert (ROOT/'src/model-session.js').exists()
    js=read('src/model-validator.js')
    assert 'browser-runnable' in js or 'browserRunnable' in js

def test_steady_state_python_export_and_side_nav():
    html=read('steady.html')
    js=read('src/steady-state-lab.js')
    assert 'exportSteadyPython' in html
    assert 'scipy.optimize' in js and 'fsolve' in js
    assert 'data-jump' in html

def test_plotly_preload_and_agent_dpi():
    for page in ['ode.html','optimization.html','steady.html','stochastic.html','symbolic.html','agent.html','workbench.html']:
        tags=soup(page).select('link[rel="preload"][as="script"]')
        hrefs=[t.get('href','') for t in tags]
        assert 'https://cdn.plot.ly/plotly-2.35.2.min.js' in hrefs, page
    agent=read('src/agent-lab.js')
    assert 'devicePixelRatio' in agent and 'setTransform' in agent

def test_v26_clean_header_contract_survives():
    for page in ['index.html','workbench.html','ode.html','steady.html','symbolic.html','agent.html','docs.html','tutorial.html']:
        s=soup(page)
        assert s.select_one('.topnav details.labs-menu') is not None
        assert 'Acknowledgement' in s.select_one('.topnav').get_text(' ', strip=True)
