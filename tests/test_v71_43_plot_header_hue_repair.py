from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHELL = (ROOT / 'src/platform/shell.js').read_text(encoding='utf-8')
CSS = (ROOT / 'src/platform/shell.css').read_text(encoding='utf-8')
LABCSS = (ROOT / 'styles/lab-identity.css').read_text(encoding='utf-8')


def test_plot_header_uses_non_overlapping_grid():
    assert 'V71.43 · Analysis plot header repair' in CSS
    assert 'grid-template-areas:' in CSS
    assert '"title title title"' in CSS
    assert '"plot palette size"' in CSS
    assert '.analysis-plot-card-head label>span' in CSS
    assert 'clip:rect(0,0,0,0)' in CSS


def test_lab_identity_palette_restyles_real_plotly_traces():
    assert 'function paletteScale' in SHELL
    assert "name==='lab-identity'" in SHELL
    assert "update['marker.color']" in SHELL
    assert "update['line.color']" in SHELL
    assert 'update.fillcolor' in SHELL
    assert 'update.colorscale=paletteScale(name,colors)' in SHELL
    assert 'Plotly.relayout(gd,{colorway:colors})' in SHELL


def test_lab_hues_still_present():
    expected = ['#b45309', '#c2410c', '#166534', '#0f766e', '#be185d']
    for hue in expected:
        assert hue in LABCSS


def test_version_bumped_to_71_43():
    offenders = []
    for p in ROOT.rglob('*'):
        if p.is_file() and p.suffix.lower() in {'.html','.js','.css','.md','.json'}:
            try:
                txt = p.read_text(encoding='utf-8')
            except UnicodeDecodeError:
                continue
            if '?v=' in txt and '?v=71.46.0' not in txt:
                offenders.append(str(p.relative_to(ROOT)))
    assert not offenders
