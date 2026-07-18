from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_home_identifiability_button_and_browser_locator_match():
    html = text("index.html")
    e2e = text("tests/e2e/main-labs-smoke.spec.js")
    assert '>Run identifiability check</button>' in html
    assert "name: 'Run identifiability check'" in e2e
    assert "Demolish this fit" not in e2e


def test_release_script_checks_current_release_and_browser_inventory():
    script = text("test-v72.48.0-local.sh")
    assert 'EXPECTED_VERSION="72.48.0"' in script
    assert 'PREVIOUS_VERSION="72.47.0"' in script
    assert 'Total: 123 tests in 3 files' in script
    assert 'PORT=8102' in script


def test_home_heading_and_browser_contract_match():
    html = text("index.html")
    e2e = text("tests/e2e/main-labs-smoke.spec.js")
    heading = "Build, test, and compare scientific models in your browser."
    assert f'<h1 id="homeTitle">{heading}</h1>' in html
    assert "page.locator('#homeTitle')" in e2e
    assert f"toHaveText('{heading}')" in e2e
    assert "Thirteen scientific engines" not in html
    assert "Thirteen scientific engines" not in e2e
    assert '<h2 id="homePlatformAnswerTitle">From model to evidence</h2>' in html
    assert "page.locator('#homePlatformAnswerTitle')" in e2e
    assert "toHaveText('From model to evidence')" in e2e
    assert 'modeling platform rather than a toy tool' not in e2e.lower()
