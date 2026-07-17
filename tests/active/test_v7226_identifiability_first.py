from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[2]

def test_fitting_core_exposes_identifiability_first_outputs():
    source=(ROOT/'src/core/fitting.js').read_text(encoding='utf-8')
    for token in ('parameterCorrelationMatrix','profileIdentifiability','identifiabilityAssessment','experimentalDesignAdvice'):
        assert token in source
    assert 'Structural identifiability was not assessed' in source
    assert 'does not guarantee identifiability or optimal experimental design' in source

def test_workspace_surfaces_verdict_and_correlation_plot():
    source=(ROOT/'src/v72/fitting-workspace.js').read_text(encoding='utf-8')
    html=(ROOT/'fitting.html').read_text(encoding='utf-8')
    assert 'Identifiability verdict' in source
    assert 'Parameter correlation matrix' in source
    assert 'Experimental-design heuristic' in source
    soup = BeautifulSoup(html, 'html.parser')
    profile = soup.select_one('#fittingProfile')
    assert profile is not None
    assert profile.has_attr('checked')
