from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_v71_13_beauty_card_has_final_neutral_override():
    css = (ROOT / 'styles' / 'v70-7-unified.css').read_text(encoding='utf-8')
    marker = 'v71.13: home Mathematical Beauty card must not look pre-selected'
    assert marker in css
    tail = css.split(marker, 1)[1]
    assert "a[href='beauty.html']" in tail
    assert 'background-image:none!important' in tail
    assert 'border:1px solid var(--line' in tail
    assert 'border-color:var(--accent' in tail  # hover only remains explicit


def test_v71_13_old_forced_beauty_styles_are_overridden_later():
    css = (ROOT / 'styles' / 'v70-7-unified.css').read_text(encoding='utf-8')
    old_forced = "home-v705-card-grid a[href='beauty.html']{border-color:#8bdde4"
    assert old_forced in css  # historical layer still exists
    assert css.rfind('v71.13: home Mathematical Beauty card must not look pre-selected') > css.find(old_forced)


def test_v71_13_audit_states_not_everything_is_finished():
    audit = (ROOT / 'release-audits' / 'AUDIT-v71-13-beauty-card-state-and-roadmap.md').read_text(encoding='utf-8')
    assert 'Not finished yet' in audit
    assert 'real direct fitting execution inside ODE' in audit
    assert 'Web Worker compute bus' in audit
