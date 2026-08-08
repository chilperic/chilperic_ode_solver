from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_home_run_button_and_browser_locator_match():
    html = text("index.html")
    e2e = text("tests/e2e/main-labs-smoke.spec.js")
    assert '>Run experiment</button>' in html
    assert "page.locator('#v76HomeRun')" in e2e


def test_release_script_checks_current_release_and_browser_inventory():
    script = text("test-v77.4.1-local.sh")
    assert 'EXPECTED_VERSION="77.4.1"' in script
    assert 'PREVIOUS_VERSION="76.2.0"' in script
    assert 'npm run test:e2e' in script
    assert 'FOKOLAB_PORT' in script
    assert '--browser|--demo) SERVE=1; OPEN_DEMO=1' in script
    assert 'xdg-open "$DEMO_URL"' in script
    assert 'FULL=0' in script
    assert '--full|--certify) FULL=1' in script
    assert 'if [[ "$FULL" -eq 1 ]]; then' in script
    assert 'Validation mode: reliable local baseline.' in script


def test_home_heading_and_browser_contract_match():
    html = text("index.html")
    e2e = text("tests/e2e/main-labs-smoke.spec.js")
    assert '<h1 id="homeTitle">From model definition to <span>numerical evidence.</span></h1>' in html
    assert "page.locator('#homeTitle')" in e2e
    assert "toContainText('From model definition to numerical evidence.')" in e2e
    assert "Thirteen scientific engines" not in html
    assert "Thirteen scientific engines" not in e2e
    assert '<h2 id="routesTitle">Start with the system, not a menu of methods.</h2>' in html
    assert "page.locator('#routesTitle')" in e2e
    assert "toHaveText('Start with the system, not a menu of methods.')" in e2e
    assert 'modeling platform rather than a toy tool' not in e2e.lower()
