from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def text(path):
    return (ROOT / path).read_text(encoding="utf-8")

def test_sensitivity_browser_contract_tracks_loaded_preset_schema():
    presets = text("src/models/sensitivity-presets.js")
    browser = text("tests/e2e/main-labs-smoke.spec.js")
    offline = text("scripts/check-sensitivity-offline.js")
    assert "const PRESETS = {\n    sir:" in presets
    assert "toHaveValue('sir')" in browser
    assert "toHaveCount(3)" in browser
    assert "selectOption('logistic')" in browser
    assert "toHaveCount(2)" in browser
    assert "inputValue(), 'sir'" in offline
    assert "count(), 3" in offline
    assert "count(), 2" in offline
