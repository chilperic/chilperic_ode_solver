from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

LABS = {
    'statistics': ('src/labs/statistics.js', 'statsPreset', 'statsPlotMode'),
    'fitting': ('src/labs/fitting.js', 'fitPreset', 'fitPlotMode'),
    'linear algebra': ('src/labs/linalg.js', 'laPreset', 'laPlotMode'),
    'networks': ('src/labs/networks.js', 'netPreset', 'netPlotMode'),
}

def _options(src, select_id):
    m = re.search(rf'<select id="{select_id}">(.*?)</select>', src, re.S)
    assert m, f'{select_id} select must exist'
    return re.findall(r'<option value="([^"]+)">', m.group(1))

def test_each_analysis_lab_has_at_least_eight_examples_and_eight_plot_modes():
    for label, (path, preset_id, plot_id) in LABS.items():
        src = (ROOT / path).read_text()
        presets = _options(src, preset_id)
        plots = _options(src, plot_id)
        assert len(set(presets)) >= 8, f'{label} needs at least 8 embedded examples, got {presets}'
        assert len(set(plots)) >= 8, f'{label} needs at least 8 plot modes, got {plots}'

def test_docs_and_tutorial_explain_examples_and_plots_without_engine_noise():
    for name in ['docs.html', 'tutorial.html']:
        html = (ROOT / name).read_text()
        assert 'analysis-plot-example-standard' in html
        for phrase in ['Statistics', 'Curve fitting', 'Linear algebra', 'Networks']:
            assert phrase in html
        for phrase in ['src/core/statistics.js', 'descriptor-driven', 'layout is owned by the shared shell']:
            assert phrase not in html

def test_existing_static_contract_ids_remain_present():
    contracts = {
        'statistics.html': ['statsMode', 'statsOutput', 'statsPlot'],
        'fitting.html': ['fitModel', 'fitOutput', 'fitPlot'],
        'linear-algebra.html': ['laMode', 'laOutput', 'laPlot'],
        'networks.html': ['netMode', 'netOutput', 'netPlot'],
    }
    for page, ids in contracts.items():
        html = (ROOT / page).read_text()
        for id_ in ids:
            assert id_ in html or id_ in (ROOT / 'src/labs' / ({'statistics.html':'statistics.js','fitting.html':'fitting.js','linear-algebra.html':'linalg.js','networks.html':'networks.js'}[page])).read_text()
