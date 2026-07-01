from pathlib import Path
from bs4 import BeautifulSoup
ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def text(rel):
    return BeautifulSoup(read(rel), 'html.parser').get_text(' ', strip=True)

def test_agent_lab_uses_compact_selector_driven_layout_not_long_method_section():
    html = read('agent.html')
    for token in ['agentModelFamily', 'agentExample', 'agentApproach', 'agentTimeMode', 'agentTopology', 'agentPlotMode', 'agent-parameter-strip', 'agent-rule-strip']:
        assert token in html
    assert 'agent-methods' not in html
    assert html.index('Rule definition') < html.index('Agent model')

def test_agent_js_has_many_new_examples_and_query_opening():
    js = read('src/agent-lab.js')
    for token in ['fadns_particle', 'vax_hesitancy', 'evacuation_panic', 'meme_stock', 'cancer_myth', 'gentrification_hype', 'deepfake_polarization', 'poaching_market', 'av_backlash', 'smart_grid_boycott', 'ancient_cult']:
        assert token in js
    for token in ['SOCIAL_MODELS', 'socialStep', 'fadnsStep', 'agentModelFamily', 'URLSearchParams(window.location.search)', 'populateExampleOptions']:
        assert token in js

def test_model_atlas_contains_agent_section_and_links_to_agent_examples():
    html = read('examples.html')
    page = text('examples.html')
    for token in ['Agent Model Atlas', 'FADNS particle-agent tracker', 'Outbreak + vaccine hesitancy', 'Wildfire evacuation + panic misinformation', 'Meme-stock cascade', 'Ancient cities + cult movement rumors']:
        assert token in page
    for query in ['agent.html?example=fadns_particle', 'agent.html?example=vax_hesitancy', 'agent.html?example=meme_stock']:
        assert query in html
    assert 'data-filter="agent"' in html
    assert ".agent-atlas-grid article" in html

def test_docs_and_platform_reflect_agent_atlas_compact_execution_boundary():
    docs = text('docs.html')
    tutorial = text('tutorial.html')
    platform = text('platform.html')
    for token in ['Model Atlas', 'Agent Lab', 'exported scripts']:
        assert token in docs or token in tutorial or token in platform
    assert 'Foko Lab' in platform and 'exported scripts' in platform
