from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_creator_identity_uses_requested_short_title():
    html = (ROOT / 'index.html').read_text()
    assert 'Multiscale Modeller | Applied Mathematician | Computational Biology' in html
    assert 'Computational systems biologist and applied mathematician building browser-native tools' not in html


def test_audit_refuses_high_risk_all_in_one_bundle():
    audit = (ROOT / 'release-audits' / 'AUDIT-v71-14-scope-and-identity.md').read_text()
    assert 'These should not be merged in one release' in audit
    assert 'V71.15: real ODE fitting execution' in audit
