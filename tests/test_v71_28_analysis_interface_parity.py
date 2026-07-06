from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PAGES = ["statistics.html", "fitting.html", "linear-algebra.html", "networks.html", "ml.html"]

def test_analysis_pages_do_not_ship_noisy_hero_copy():
    banned = [
        "Fit empirical curves and mechanistic response models",
        "Clean tables, compare groups",
        "Analyze graphs with shortest paths",
        "Train browser-scale baselines",
    ]
    for page in PAGES:
        text = (ROOT / page).read_text()
        assert "analysis-hero compact" in text
        for phrase in banned:
            assert phrase not in text

def test_descriptor_shell_uses_focused_lab_cockpit_terms():
    text = (ROOT / "src/platform/shell.js").read_text()
    assert "work-panel controls" in text
    assert "workspace" in text
    assert "status-strip" in text
    assert "Primary plot" in text
    assert "Diagnostic plot" in text
    assert "Concrete example" in text

def test_analysis_shell_css_contains_parity_layout():
    css = (ROOT / "src/platform/shell.css").read_text()
    assert "focused-lab style" in css
    assert "foko-shell-plot-grid" in css
    assert "foko-shell-status-strip" in css
    assert "analysis-cockpit-page" in css

def test_release_token_is_current():
    for page in PAGES:
        text = (ROOT / page).read_text()
        assert "?v=71.46.0" in text
