from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(path):
    return (ROOT / path).read_text(encoding='utf-8')

def test_home_mathematical_beauty_has_no_special_click_signs():
    css = read('styles/style.css') + read('styles/v70-10-modeling-logic.css') + read('styles/v70-11-modeling-platform.css') + read('styles/v70-7-unified.css')
    assert 'Visible in header as ∞ Beauty' not in css
    assert "content:'  ↗'" not in css
    assert 'content:none!important' in css


def test_ode_overlay_and_fitting_bridge_controls_exist():
    html = read('ode.html')
    for element_id in ['odeDataTools','obsData','obsTimeCol','obsFallbackVar','overlayVisible','overlayData','clearOverlay','prepareFitBridge','downloadFitBridge','fitBridgePreview']:
        assert f'id="{element_id}"' in html
    assert 'Data overlay and fitting bridge' in html


def test_ode_overlay_and_bridge_logic_is_optional_and_present():
    app = read('src/app.js')
    for fn in ['parseObservationTable','loadObservationData','observationTraceForVariable','observationPhaseTrace','prepareFitBridge']:
        assert f'function {fn}' in app
    assert "$('overlayData')?.addEventListener" in app
    assert "$('prepareFitBridge')?.addEventListener" in app
    assert 'foko-fit-bridge-config' in app


def test_focused_labs_stay_preserved_and_not_redirected():
    for page in ['ode.html','stochastic.html','optimization.html','steady.html']:
        html = read(page)
        assert 'http-equiv="refresh"' not in html.lower()
        assert 'data-lab=' in html
