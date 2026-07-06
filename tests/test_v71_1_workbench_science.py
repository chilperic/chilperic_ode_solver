from pathlib import Path
from bs4 import BeautifulSoup
import re

ROOT = Path(__file__).resolve().parents[1]

def text(path):
    return (ROOT / path).read_text(encoding='utf-8')

def soup(path):
    return BeautifulSoup(text(path), 'html.parser')

def test_v71_1_workbench_science_assets_and_script_order():
    html = soup('workbench.html')
    scripts = [s.get('src','') for s in html.select('script[src]')]
    required = [
        'src/core/stochastic-advanced.js?v=71.46.0',
        'src/core/dynamical-fitting.js?v=71.46.0',
        'src/core/basin-analysis.js?v=71.46.0',
        'src/v71-workbench-science.js?v=71.46.0',
    ]
    for src in required:
        assert any(src in s for s in scripts), src
    assert scripts.index(next(s for s in scripts if 'src/v71-workbench-science.js' in s)) < scripts.index(next(s for s in scripts if 'src/v71-platform.js' in s))

def test_v71_1_workbench_science_panel_contract():
    js = text('src/v71-workbench-science.js')
    for token in ['v711SciencePanel','v711ObsData','v711RunFit','v711RunStoch','v711RunBasin','uncertaintyBand','sirTauEnsemble','cubicBasin']:
        assert token in js
    css = text('styles/v70-15-analysis-suite.css')
    assert 'V71.1 workbench scientific integration' in css
    assert '.v711-science-panel' in css

def test_v71_1_single_token():
    found = set()
    for path in ROOT.rglob('*'):
        if path.is_file() and path.suffix.lower() in {'.html','.css','.js','.md','.py','.json','.svg','.txt','.yml','.yaml','.cff'}:
            found.update(re.findall(r'\?v=([A-Za-z0-9._-]+)', path.read_text(encoding='utf-8', errors='ignore')))
    assert found == {'71.46.0'}

def test_v71_1_audit_exists():
    audit = ROOT / 'release-audits' / 'AUDIT-v71-1-workbench-science.md'
    assert audit.exists()
