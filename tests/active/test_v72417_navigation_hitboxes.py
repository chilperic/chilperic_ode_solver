from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def test_navigation_is_click_or_keyboard_only():
    nav = text("src/navigation.js")
    assert "openMenu(menu, 'hover')" not in nav
    assert "pointerenter" not in nav
    assert "panel.setAttribute('inert', '')" in nav
    assert "panel.removeAttribute('inert')" in nav


def test_closed_navigation_panels_are_non_interactive_even_if_state_drifts():
    css = text("styles/v72-tokens.css")
    nav = text("src/navigation.js")
    assert '.nav-menu[data-menu-open="false"] > .labs-menu-panel' in css
    assert 'pointer-events: none;' in css
    assert '.labs-menu-panel[hidden]' in css
    assert "panel.hidden = true;" in nav
    assert "panel.hidden = false;" in nav
    assert 'visibility: hidden;' in css


def test_chart_grid_areas_apply_only_to_direct_title_children():
    css = text("styles/v72-lab-shell.css")
    assert ".chart-title > select" in css
    assert ".chart-title > .focus-card" in css
    assert ".chart-title > .kebab" in css
    assert ".chart-title .focus-card" not in css


def test_offline_navigation_hitbox_gate_is_release_gated():
    pkg = text("package.json")
    script = text("scripts/check-navigation-hitboxes-offline.js")
    assert "test:navigation-hitboxes-offline" in pkg
    assert "pointer travel opened the menu" in script
    assert "#leftPlotType" in script and "#rightPlotType" in script
