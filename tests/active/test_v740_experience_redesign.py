from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_scientific_palette_has_one_brand_and_one_action_signal():
    css = text("styles/v72-tokens.css")
    assert "--brand: #0b7285" in css
    assert "--nav: #0b1d2a" in css
    assert "--canvas: #f1f4f4" in css
    assert "--signal: #c75d3e" in css
    assert "linear-gradient(110deg, var(--nav), var(--nav-2))" in css


def test_lab_shell_is_a_three_zone_workspace_with_a_context_rail():
    css = text("styles/v72-lab-shell.css")
    assert "v75 SCIENTIFIC WORKSPACE" in css
    assert "grid-template-columns: minmax(272px, 292px) minmax(0, 1fr) minmax(236px, 254px)" in css
    assert '"modes modes modes"' in css
    assert '"inputs workspace inspector"' in css
    assert "writing-mode: initial" in css


def test_v76_desktop_columns_and_named_areas_have_the_same_cardinality():
    css = text("styles/v76-system.css")
    desktop = css.split("/* Scientific workbench:", 1)[1].split("/* Home:", 1)[0]
    assert "grid-template-columns: 64px minmax(268px, var(--v76-input-width)) 8px minmax(460px, 1fr) minmax(236px, 276px)" in desktop
    assert 'grid-template-areas: "modes inputs splitter workspace inspector"' in desktop
    assert '.v76-workspace-splitter' in desktop


def test_model_catalogues_are_bounded_single_column_and_overlap_safe():
    css = text("styles/v72-lab-shell.css")
    marker = css.split("v75 SCIENTIFIC WORKSPACE", 1)[1]
    assert ".model-deck," in marker
    assert "grid-template-columns: minmax(0, 1fr)" in marker
    assert "max-height: 232px" in marker
    assert "overflow-y: auto" in marker
    assert "min-height: 54px" in marker


def test_results_canvas_and_plot_controls_are_visually_primary():
    css = text("styles/v72-lab-shell.css")
    marker = css.split("v75 SCIENTIFIC WORKSPACE", 1)[1]
    assert ".results-card" in marker and "border-radius: 12px" in marker
    assert '"plot-title plot-title plot-title"' in marker
    assert '"plot-select plot-focus plot-export"' in marker
    assert ".plot { min-height: 460px" in marker
    assert '.chart-grid[data-layout="focus"] .plot { min-height: 570px' in marker


def test_phone_layout_is_single_task_and_plot_safe():
    css = text("styles/v72-lab-shell.css")
    marker = css.split("v75 SCIENTIFIC WORKSPACE", 1)[1]
    assert "@media (max-width: 720px)" in marker
    assert "grid-template-columns: minmax(0, 1fr)" in marker
    assert '"plot-select plot-select"' in marker
    assert "min-height: 338px" in marker
    assert ".actionbar { bottom: 61px; }" in marker


def test_home_has_a_quiet_scientific_instrument_opening():
    css = text("styles/v72-public-shell.css")
    marker = css.split("v75 SCIENTIFIC INSTRUMENT HOME", 1)[1]
    assert "background: transparent" in marker
    assert "border-radius: 0" in marker
    assert "font-size: clamp(2.05rem, 3.15vw, 3.25rem)" in marker
    assert ".home-platform-answer" in marker


def test_home_research_cards_are_content_driven_and_equalized_by_grid():
    css = text("styles/v72-public-shell.css")
    marker = css.split("v75 SCIENTIFIC INSTRUMENT HOME", 1)[1]
    assert ".home-research-card" in marker
    assert "grid-template-rows: 168px minmax(175px, auto) 205px auto" in marker
    assert "grid-auto-rows: 1fr" in marker
    assert "height: 100%" in marker
    assert "border-radius: 11px" in marker
    assert "box-shadow: none" in marker


def test_mobile_lab_docks_do_not_overlap_and_keep_touch_targets_usable():
    css = text("styles/v76-system.css")
    mobile = css.split("@media (max-width: 720px)", 1)[1]
    assert '.v76-bottom-nav' in mobile
    assert "padding-bottom: env(safe-area-inset-bottom)" in mobile
    assert "min-height: 60px" in mobile
    assert '.v72-inspector { grid-template-columns: 1fr !important; }' in mobile
    assert '.foko-console-body { grid-template-columns: 1fr; }' in mobile


def test_home_keeps_model_atlas_creator_and_live_modelling_paths():
    page = text("index.html")
    for fragment in (
        "Model Atlas · 259 curated models",
        "Create a model",
        "Creator",
        "lattice · contextual 3D",
        "Sobol and Morris · one or many outputs",
        "Population genetics",
        "Surrogate-assisted model exploration",
    ):
        assert fragment in page


def test_lab_identity_has_one_two_level_taxonomy_without_fragmenting_the_shell():
    compatibility = text("styles/lab-identity.css")
    system = text("styles/v76-system.css")
    shell = text("src/v76/app-shell.js")
    assert 'body[data-lab="ode"]' not in compatibility
    assert "authoritative subject and per-lab palette lives in v76-system.css" in compatibility
    assert 'body[data-subject="dynamical-systems"]' in system
    assert 'body[data-lab="ode"], [data-lab-target="ode"]' in system
    assert "--subject-accent-on-dark" in system
    assert "--lab-accent-on-dark" in system
    assert "foko-brand-observe-top" in shell
    assert "foko-brand-observe-bottom" in shell
    assert "foko-brand-state-axis" in shell
