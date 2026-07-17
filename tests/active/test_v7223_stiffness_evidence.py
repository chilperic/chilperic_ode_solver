from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def test_ode_core_exports_first_class_stiffness_evidence():
    source=(ROOT/'src/core/ode.js').read_text(encoding='utf-8')
    for token in ('finiteDifferenceJacobian','localTimescaleEvidence','localTimescaleRatio','stiffnessAssessment','stiffnessEvidence'):
        assert token in source
    assert 'heuristic, not a stiffness certificate' in source

def test_fixed_step_warning_is_explicit_about_missing_error_control():
    source=(ROOT/'src/core/ode.js').read_text(encoding='utf-8')
    assert 'A fixed-step explicit method cannot estimate or control its local error here' in source
