from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]

def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')

def soup(rel):
    return BeautifulSoup(read(rel), 'html.parser')


def test_research_hub_contains_only_scientific_research_projects():
    doc = soup('research.html')
    panels = doc.select('.research-project-panel')
    assert len(panels) == 3
    txt = doc.get_text(' ', strip=True)
    for title in ['Photosynthesis climate adaptation','Fatty-acid metabolism and FADNS','T-cell proliferation dynamics']:
        assert title in txt
    assert 'Foko Lab platform' not in txt
    assert 'platform.html' in str(doc)
    assert 'research-panel-list' in str(doc)


def test_project_ownership_blocks_are_correct_and_high_in_pages():
    checks = {
        'research/photosynthesis.html': ['Project ownership', 'Chilperic Armel Foko Kuate', 'Yvonne Danisch', 'Jérémie Muller-Prokob', 'Martin Lercher', 'Antonio Rigueiro'],
        'research/fatty-acid-metabolism.html': ['Project ownership', 'Lead contributor / project owner', 'Chilperic Armel Foko Kuate', 'Prof. Dr. Oliver Ebenhöh', 'Dr. Adélaïde Raguin'],
        'research/tcell-proliferation.html': ['Project ownership', 'Lead contributor / project owner', 'Prof. Wilfred Ndifon', 'Prof. Gisèle Mophou', 'Dr. Maseim Bassis Kenmoe']
    }
    for rel, terms in checks.items():
        html = read(rel)
        assert 'class="card project-ownership"' in html, rel
        for term in terms:
            assert term in html, (rel, term)
    assert 'Ayissi' not in read('research/tcell-proliferation.html')


def test_project_titles_are_short_with_subtitles():
    expected = {
        'research/photosynthesis.html': ('Plant thermo-hydraulic adaptation', 'First-principles modeling across the C3–C4 continuum'),
        'research/fatty-acid-metabolism.html': ('Fatty-acid metabolism and de novo synthesis', 'Dynamic computational modeling of hepatic lipid regulation'),
        'research/tcell-proliferation.html': ('Mathematical models of T cell proliferation', 'Mathematical models of T cell proliferation, with potential applications to data'),
    }
    for rel, (h1, subtitle) in expected.items():
        doc = soup(rel)
        assert doc.select_one('.project-launch-copy h1').get_text(' ', strip=True) == h1
        assert subtitle in doc.select_one('.project-subtitle').get_text(' ', strip=True)


def test_platform_page_exists_outside_research_hub():
    assert (ROOT / 'platform.html').exists()
    assert 'Foko Lab' in read('platform.html') and 'exported scripts' in read('platform.html')
    assert 'Open Platform page' in read('research.html')


def test_workbench_has_explicit_plot_states_slow_warning_and_explanations():
    js = read('src/model-workbench-v3.js')
    for token in ['function plotState', 'estimatedEvaluations', 'Slow computation warning', 'Estimated cost:', 'Ranked sensitivity bar chart', 'Signed sensitivity heatmap', 'This is not full variance-based GSA']:
        assert token in js
    for token in ['Parallel coordinates not available', 'ECDF not available', 'Radar chart not applicable', 'Trajectory not available']:
        assert token in js
    css = read('styles/model-workbench-v3.css')
    for token in ['mw-run-warning', 'mw-estimate']:
        assert token in css


def test_sensitivity_heatmap_uses_diverging_zero_centered_scale_by_default():
    js = read('src/model-workbench-v3.js')
    assert 'sensitivityColorscale' in js
    assert "zmid:0" in js
    assert 'diverging around zero' in js
    assert 'For a cleaner first view, use the ranked sensitivity bar chart' in js
