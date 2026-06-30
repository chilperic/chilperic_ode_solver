from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')


def test_agent_lab_is_execution_first_not_explanation_first():
    doc = soup('agent.html')
    text = doc.get_text(' ', strip=True)
    assert doc.select_one('#agentModelFamily')
    assert doc.select_one('#agentExample')
    assert doc.select_one('#agentApproach')
    assert doc.select_one('#agentTimeMode')
    assert doc.select_one('#agentTopology')
    assert doc.select_one('#agentPlotMode')
    assert doc.select_one('.agent-run-settings')
    rule = doc.find('summary', string=lambda s: s and 'Rule definition' in s).parent
    assert rule.name == 'details'
    assert not rule.has_attr('open')
    assert 'Agent Model Atlas' in text
    assert 'Browser prototypes only. Use it to test rule logic' not in text


def test_fadns_agent_tracks_correct_species_and_products():
    js = read('src/agent-lab.js')
    for token in ['FADNS particle-agent tracker', 'Acetyl-CoA', 'Malonyl-CoA', 'chain intermediate', 'C14 product', 'C16 product', 'C18 product', 'CoA released']:
        assert token in js
    for token in ['productsC14', 'productsC16', 'productsC18', 'fadns_species', 'FADNS tracked species']:
        assert token in js
    assert 'product / CoA released' not in js
    assert 'acetyl/malonyl pool' not in js


def test_agent_custom_rules_allow_model_state_range_not_only_four_states():
    js = read('src/agent-lab.js')
    assert 'function maxStateIndex' in js
    assert "((model().states||[]).length-1)" in js
    assert 'clamp(Number(res.state' in js
    tutorial = read('tutorial.html')
    assert 'return only 0, 1, 2 or 3' not in tutorial
    assert 'valid state index for the selected model' in tutorial


def test_agent_model_atlas_carries_fadns_explanation_not_agent_page():
    atlas = soup('examples.html').get_text(' ', strip=True)
    assert 'FADNS particle-agent tracker' in atlas
    assert 'Acetyl-CoA, Malonyl-CoA, chain intermediates, C14/C16/C18 products and CoA' in atlas
    docs = soup('docs.html').get_text(' ', strip=True)
    assert 'The Agent Lab page should stay compact' in docs
    assert 'The FADNS agent example tracks Acetyl-CoA, Malonyl-CoA, chain intermediates, C14, C16, C18 and CoA' in docs
