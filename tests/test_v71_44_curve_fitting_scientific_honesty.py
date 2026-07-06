from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')

def test_curve_fitting_core_exposes_honest_diagnostics():
    txt=read('src/core/fitting.js')
    for needle in ['lmOptimize','covarianceFromJacobian','predictionBands','confidenceEllipse','profileLikelihood','bootstrapFit','influenceDiagnostics','sensitivityCoefficients']:
        assert needle in txt

def test_curve_fitting_lab_uses_real_core_diagnostics_not_old_proxies():
    txt=read('src/labs/fitting.js')
    assert 'f.confidenceEllipse' in txt
    assert 'f.profileLikelihood' in txt
    assert 'f.bootstrap' in txt
    assert 'f.predictionBands' in txt
    assert 'f.influence' in txt
    assert 'Leverage vs residual squared' not in txt
    assert 'Influence: leverage vs standardized residual' in txt

def test_release_token_current_7144():
    offenders=[]
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.html','.js','.css','.json'}:
            try: txt=p.read_text(encoding='utf-8')
            except UnicodeDecodeError: continue
            if '?v=' in txt and '?v=71.46.0' not in txt:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders[:20]
