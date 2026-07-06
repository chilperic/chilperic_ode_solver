from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def test_wide_workspace_has_three_plot_slots_and_per_panel_selectors():
    shell = (ROOT / 'src/platform/shell.js').read_text()
    assert 'analysis-wide-workspace' in shell
    assert 'data-analysis-primary-plot' in shell
    assert 'data-analysis-secondary-plot' in shell
    assert 'data-analysis-tertiary-plot' in shell
    assert "plotHost3.dataset.plotSlot='tertiary'" in shell
    assert 'Computing third panel' in shell


def test_user_upload_and_formula_latex_support_present():
    shell = (ROOT / 'src/platform/shell.js').read_text()
    assert 'data-analysis-upload' in shell
    assert 'CSV / TSV / JSON / TXT / YAML' in shell
    assert 'applyUploadedPayload' in shell
    assert 'data-analysis-formula' in shell
    assert 'data-analysis-latex-preview' in shell
    assert 'renderLatexPreview' in shell


def test_analysis_pages_load_katex_for_model_rendering():
    for page in ['statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html']:
        html = (ROOT / page).read_text()
        assert 'katex.min.css' in html
        assert 'katex.min.js' in html


def test_v71_31_css_wide_three_panel_rules():
    css = (ROOT / 'src/platform/shell.css').read_text()
    for token in ['analysis-plot-grid-three','analysis-plot-tertiary','analysis-user-input-card','analysis-latex-preview','analysis-plot-wide']:
        assert token in css
