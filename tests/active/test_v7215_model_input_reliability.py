from pathlib import Path
import json
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[2]

def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')

def soup(path: str):
    return BeautifulSoup(read(path), 'html.parser')

def test_agent_exposes_exact_initial_population_and_custom_model_contract():
    page = soup('agent.html')
    for selector in ['#agentInitialMode','#agentCountGrid','#agentFractionGrid','#agentPopulationSummary','#agentCustomModelFile','#agentCustomModelJson','#importAgentConfig']:
        assert page.select_one(selector), selector
    source = read('src/core/agent-reference.js')
    for token in ['initialMode', 'initialCounts', 'must sum exactly', 'validateCustomModel', 'neighbor-contact', 'neighbor-threshold']:
        assert token in source

def test_each_scientific_lab_has_user_input_or_import_route():
    selectors = {
        'studio.html':'#studioImport',
        'ode.html':'#modelFile','steady.html':'#steadyImport','stochastic.html':'#stochasticImport','optimization.html':'#optimizationImport',
        'statistics.html':'#statisticsFile','fitting.html':'#fittingFile','linear-algebra.html':'#linalgImport','networks.html':'#networksImport',
        'ml.html':'#mlUpload','sciml.html':'#sciUploadDataFile','agent.html':'#agentCustomModelFile','symbolic.html':'#symbolicImport','sensitivity.html':'#sensitivityImport','workbench.html':'#wbImportJson'
    }
    for page, selector in selectors.items():
        assert soup(page).select_one(selector), f'{page}: {selector}'

def test_reliability_first_layout_removes_visible_three_panel_controls():
    pages = ['studio.html','ode.html','steady.html','stochastic.html','optimization.html','statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html','sciml.html','agent.html','symbolic.html','sensitivity.html','workbench.html']
    for page in pages:
        doc=soup(page)
        assert not doc.select('[data-layout-mode="three"]'), page
        assert not doc.select('[data-wb-layout="three"]'), page

def test_machine_learning_exposes_repeated_nested_validation_and_audit():
    page=soup('ml.html')
    for selector in ['#mlRepeats','#mlImportanceRepeats','#mlNestedTune','#mlConfigUpload']:
        assert page.select_one(selector), selector
    source=read('src/core/ml-reference.js')
    for token in ['repeatedCrossValidate','nestedCrossValidate','permutationImportanceRepeated','datasetAudit','directLeakage','highCorrelation']:
        assert token in source

def test_npm_install_is_small_and_browser_only():
    package=json.loads(read('package.json'))
    assert package['version']=='77.4.1'
    assert package.get('dependencies')=={}
    cmd=package['scripts']['install:browser-tests']
    assert 'npm ci' in cmd and '--no-audit' in cmd and '--no-fund' in cmd and '--omit=optional' in cmd
