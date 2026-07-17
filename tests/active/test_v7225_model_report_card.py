from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def test_report_card_is_exposed_from_ode_lab():
    html=(ROOT/'ode.html').read_text(encoding='utf-8')
    assert 'Model report card' in html
    assert 'src/v72/ode-workspace.js' in html

def test_report_card_contains_explicit_non_claims_and_hashes():
    source=(ROOT/'src/core/model-report-card.js').read_text(encoding='utf-8')
    assert 'What this run does not establish' in source
    assert 'Model SHA-256' in source and 'Run SHA-256' in source
    assert 'It is not a scientific certificate' in source
