from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def test_analysis_shell_exposes_plot_dropdowns_above_plots():
    shell = (ROOT / 'src/platform/shell.js').read_text()
    assert 'data-analysis-primary-plot' in shell
    assert 'data-analysis-secondary-plot' in shell
    assert 'Interactive: changing a plot recomputes or redraws immediately.' in shell
    assert 'analysis-left-plot-hidden' in shell
    assert 'renderPlots()' in shell


def test_analysis_shell_shows_running_state_and_schedules_recompute():
    shell = (ROOT / 'src/platform/shell.js').read_text()
    assert "setStatus('Running…','running')" in shell
    assert 'Computing primary plot' in shell
    assert 'controlHost.addEventListener(\'change\'' in shell
    assert 'plotToolbar.addEventListener(\'change\'' in shell
    assert 'scheduleRun()' in shell


def test_analysis_plot_repair_css_present():
    css = (ROOT / 'styles/style.css').read_text()
    for token in ['analysis-plot-picker', 'analysis-left-plot-hidden', 'analysis-plot-wait', 'data-state="running"']:
        assert token in css


def test_release_token_normalized_to_71_31():
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
