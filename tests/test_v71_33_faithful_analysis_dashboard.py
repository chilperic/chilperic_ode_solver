from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding='utf-8')


def test_v71_33_token_normalized():
    offenders = []
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.html', '.js', '.css', '.md', '.json', '.cff'}:
            try:
                s = p.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                continue
            if '?v=' in s and '?v=71.46.0' not in s:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders


def test_shell_has_visible_model_data_input_and_upload():
    s = text('src/platform/shell.js')
    assert 'Model / Data Input' in s
    assert 'Paste data / model input' in s
    assert 'data-analysis-paste' in s
    assert 'Type your model / formula' in s
    assert 'data-analysis-formula' in s
    assert 'data-analysis-upload' in s
    assert 'CSV · TSV · JSON · TXT · YAML · DAT · EDGES · MATRIX' in s
    assert 'renderLatexPreview' in s


def test_shell_has_functional_session_actions_and_no_instruction_banner():
    s = text('src/platform/shell.js')
    assert 'data-shell-v71="save"' in s
    assert 'data-shell-v71="load"' in s
    assert 'data-shell-v71="url"' in s
    assert 'data-shell-v71="export"' in s
    assert 'data-shell-v71="import"' in s
    assert 'Each panel is interactive' not in s


def test_three_plot_panels_keep_dropdowns_palette_size_and_downloads():
    s = text('src/platform/shell.js')
    assert 'data-analysis-primary-plot' in s
    assert 'data-analysis-secondary-plot' in s
    assert 'data-analysis-tertiary-plot' in s
    assert 'data-analysis-palette' in s
    assert 'data-analysis-size' in s
    assert 'data-analysis-download' in s
    css = text('src/platform/shell.css')
    assert 'analysis-v33-plot-grid' in css
    assert 'grid-template-columns:repeat(3' in css


def test_analysis_pages_load_v7133_shell():
    for page in ['statistics.html','fitting.html','linear-algebra.html','networks.html','ml.html']:
        h = text(page)
        assert 'src/platform/shell.js?v=71.46.0' in h
        assert 'src/platform/shell.css?v=71.46.0' in h
        assert 'src/labs/' in h
