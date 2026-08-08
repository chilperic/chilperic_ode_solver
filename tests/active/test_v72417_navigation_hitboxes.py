from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def text(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def test_v76_navigation_is_click_or_keyboard_only():
    shell = text("src/v76/app-shell.js")
    assert "pointerenter" not in shell
    assert "mouseover" not in shell
    assert "trigger.addEventListener('click'" in shell
    assert "event.key === 'Escape'" in shell
    assert "event.metaKey || event.ctrlKey" in shell
    assert "aria-hidden" in shell


def test_closed_portal_panels_are_non_interactive_and_cannot_reflow_pages():
    css = text("styles/v76-system.css")
    shell = text("src/v76/app-shell.js")
    assert ".v76-popover" in css
    assert "position: fixed" in css
    assert '.v76-popover[data-open="true"]' in css
    assert "pointer-events: none" in css
    assert "pointer-events: auto" in css
    assert "doc.body.appendChild(portal)" in shell
    assert "positionPopover" in shell
    assert "boundedPopoverGeometry" in shell
    assert "box-sizing: border-box" in css


def test_v76_shell_has_complete_model_simulation_analysis_taxonomy():
    shell = text("src/v76/app-shell.js")
    for trigger in ("experiment", "analyze", "profile"):
        assert f'data-v76-trigger="{trigger}"' in shell
    assert 'data-v76-trigger="project"' not in shell
    assert "GROUPS.project.sections[0].items" in shell
    assert 'data-v76-popover="${key}"' in shell
    for destination in (
        "studio.html?new=1", "ode.html?module=ode", "population-genetics.html",
        "evolution.html", "sensitivity.html", "advanced-methods.html",
        "ai-modeling.html", "examples.html", "cv.html"
    ):
        assert destination in shell
    assert "Morris, Sobol and multi-output GSA" in shell
    assert "contextual 3D" in shell


def test_offline_navigation_hitbox_gate_covers_creator_mobile_and_plot_controls():
    pkg = text("package.json")
    script = text("scripts/check-navigation-hitboxes-offline.js")
    assert "test:navigation-hitboxes-offline" in pkg
    assert "pointer travel opened the menu" in script
    assert "#leftPlotType" in script and "#rightPlotType" in script
    assert "read('cv.html')" not in script  # helper receives the page name directly
    assert "'cv.html'" in script
    assert "Creator menu is missing" in script
    assert "Mobile navigation sheet did not open" in script
    assert "opening the portal reflowed the app bar" in script
    assert "Escape did not visually dismiss the command palette" in script
    assert "Backdrop click did not dismiss the command palette" in script
    assert "page.locator(selector).first().evaluate" in script
    assert 'a:first-of-type' not in script


def test_command_palette_hidden_state_cannot_be_overridden_by_layout_css():
    css = text("styles/v76-system.css")
    shell = text("src/v76/app-shell.js")
    assert ".v76-command-dialog[hidden] { display: none !important; }" in css
    assert "querySelectorAll('[data-v76-command-close]')" in shell
    assert "dialog.style.display = open ? '' : 'none'" in shell


def test_all_pages_load_one_central_shell_without_legacy_menu_copies():
    pages = [*ROOT.glob("*.html"), *(ROOT / "research").glob("*.html")]
    assert len(pages) >= 32
    for page in pages:
        html = page.read_text(encoding="utf-8")
        assert "src/v76/app-shell.js?v=77.4.1" in html, page.name
        assert "styles/v76-system.css?v=77.4.1" in html, page.name
        assert "data-nav-menu=" not in html, page.name
        assert 'data-v76-appbar="true"' in html, page.name
