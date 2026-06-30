from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

def read(rel): return (ROOT / rel).read_text(encoding='utf-8')
def soup(rel): return BeautifulSoup(read(rel), 'html.parser')

def test_agent_reference_buttons_are_non_overlapping_and_full_width():
    html = read('agent.html')
    css = read('styles/agent-lab.css')
    assert 'agent-reference-links' in html
    assert '.agent-reference-links{display:flex;flex-direction:column' in css
    assert '.agent-shortcuts .open-link' in css
    assert 'width:100%' in css and 'white-space:normal' in css

def test_agent_custom_rule_runs_through_worker_sandbox():
    html = read('agent.html')
    js = read('src/agent-lab.js')
    worker = read('src/agent-rule-worker.js')
    assert 'agent-rule-worker.js' in js
    assert "new Worker('src/agent-rule-worker.js" in js
    assert 'workerCall' in js and 'custom rule timeout' in js
    assert 'new Function' in worker
    assert 'self.onmessage' in worker
    assert 'agent-rule-worker.js' in html

def test_agent_has_real_multilayer_network_options_and_layer_plot():
    html = read('agent.html')
    js = read('src/agent-lab.js')
    for token in ['multilayer_social', 'multilayer_transport', 'multilayer layer comparison']:
        assert token in html
    for token in ['networkLayers', 'layers.spatial', 'layers.social', 'layers.transport', "mode==='layers'", 'Mean degree by network layer']:
        assert token in js

def test_symbolic_layout_removes_sticky_overlap():
    css = read('styles/symbolic-beauty.css')
    assert 'v24 upload audit: remove sticky-panel overlap' in css
    assert 'position:static!important' in css
    assert 'grid-template-areas:"controls plot" "controls results"' in css
    assert 'overflow:visible!important' in css

def test_docs_tutorial_platform_mention_worker_and_multilayer_limits():
    docs = soup('docs.html').get_text(' ', strip=True)
    tutorial = soup('tutorial.html').get_text(' ', strip=True)
    platform = soup('platform.html').get_text(' ', strip=True)
    assert 'agent-rule-worker.js' in docs
    assert 'multilayer spatial/social/transport contacts' in docs
    assert 'worker timeout' in tutorial
    assert 'Web Worker-sandboxed custom rule code' in platform
