from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]
ANALYSIS_PAGES=['statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html']
def read(p): return (ROOT/p).read_text(encoding='utf-8')
def soup(p): return BeautifulSoup(read(p),'html.parser')

def test_no_public_tier_language_in_pages_or_navigation():
    for page in ['index.html','docs.html','tutorial.html']+ANALYSIS_PAGES:
        text=soup(page).get_text(' ',strip=True)
        assert 'Tier 1' not in text and 'Tier 2' not in text, page

def test_analysis_navigation_uses_modeling_names_and_visible_links():
    for page in ['index.html','workbench.html','docs.html','tutorial.html']+ANALYSIS_PAGES:
        s=soup(page)
        summary=s.select_one('.topnav details.analysis-menu > summary')
        assert summary is not None, page
        assert 'Data' in summary.get_text(' ',strip=True) and 'Analysis' in summary.get_text(' ',strip=True)
        labels=[b.get_text(strip=True) for b in s.select('.analysis-menu-panel a b')]
        assert labels == ['Statistics','Curve fitting','Linear algebra','Networks'], (page, labels)

def test_analysis_pages_use_cockpit_shell_not_static_contract_forms():
    shell=read('src/platform/shell.js')
    css=read('src/platform/shell.css')
    for token in ['analysis-cockpit','analysis-cockpit-controls','analysis-cockpit-workspace','analysis-result-cards','analysis-data-preview']:
        assert token in shell or token in css
    for page in ANALYSIS_PAGES:
        html=read(page)
        s=soup(page)
        assert s.select_one('main.analysis-page') is not None, page
        assert s.select_one('[id$="ShellApp"]') is not None, page
        assert 'Contracts' not in html, page
        assert 'Load template' not in html and 'Download config' not in html, page

def test_home_surfaces_mathematical_beauty_in_first_route_flow():
    s=soup('index.html')
    main=s.select_one('main')
    assert main is not None
    assert main.select_one('.home-v705-actions a[href="beauty.html"]') is not None
    assert main.select_one('.home-v705-route-grid a[href="beauty.html"]') is not None
    assert main.select_one('.home-v705-card-grid a[href="beauty.html"]') is not None

def test_tutorial_has_templates_for_each_lab_family():
    s=soup('tutorial.html')
    cards=[h.get_text(' ',strip=True).lower() for h in s.select('#lab-templates .lab-template-card h3')]
    required=['ode','stochastic','optimization','steady-state','symbolic','agent','sciml','statistics','fitting','linear algebra','network','ml toolkit']
    for term in required:
        assert any(term in card for card in cards), (term,cards)

def test_statistics_modes_live_in_descriptor_not_hidden_static_dom():
    js=read('src/labs/statistics.js')
    for term in ['Regression','A/B test','ANOVA','Bootstrap','Survival','Classification','FDR']:
        assert term in js
    assert "registerLab({id:'statistics'" in js
