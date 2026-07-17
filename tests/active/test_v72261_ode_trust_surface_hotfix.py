from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_ode_trust_surface_browser_contract_targets_authored_dom():
    html = read("ode.html")
    spec = read("tests/e2e/main-labs-smoke.spec.js")
    assert 'id="provenanceStatus"' in html
    assert 'id="verificationStatus"' in html
    assert "page.locator('#provenanceStatus')" in spec
    assert "page.locator('#statusText')" not in spec


def test_successful_ode_run_resets_verification_to_an_honest_pending_state():
    app = read("src/app.js")
    message = "Independent SciPy verification not run for this browser result."
    assert message in app
    assert "if(d.kind==='ode')" in app
