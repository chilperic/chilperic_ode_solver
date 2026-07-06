from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read(p): return (ROOT/p).read_text(encoding='utf-8')

def test_ode_page_has_real_fit_controls():
    html=read('ode.html')
    assert 'id="runOdeFit"' in html
    assert 'Fit ODE' in html
    assert 'id="fitBandVisible"' in html
    assert 'Show fit uncertainty' in html

def test_app_wires_fit_and_draws_bands():
    js=read('src/app.js')
    assert "runOdeFit" in js
    assert "function runOdeFit" in js
    assert "type:'fitOde'" in js
    assert "function applyOdeFitResult" in js
    assert "function fitBandsForVariable" in js
    assert "state.fitResult" in js

def test_worker_implements_fit_job_with_ci_and_bands():
    js=read('src/worker.js')
    assert "msg.type === 'fitOde'" in js
    assert "function fitOdeJob" in js
    assert "kind:'ode_fit'" in js
    assert "sigma2" in js
    assert "ci.push" in js
    assert "bands" in js


def test_no_focused_lab_redirect_noise_returned():
    for page in ['ode.html','stochastic.html','optimization.html','steady.html']:
        html=read(page)
        assert 'descriptor-shell migration proceeds' not in html
        assert 'Compatibility route' not in html
