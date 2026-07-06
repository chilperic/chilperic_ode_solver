from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
REG = (ROOT / 'src' / 'analysis-plot-registry.js').read_text(encoding='utf-8')

LABS = ['statistics', 'fitting', 'linalg', 'networks']

def section(lab):
    m = re.search(rf"{lab}:\{{(.*?)(?=\n  [a-z]+:\{{|\n\}};)", REG, re.S)
    assert m, f'{lab} registry section missing'
    return m.group(1)

def test_each_analysis_lab_has_ten_concrete_scenarios():
    for lab in LABS:
        sec = section(lab)
        assert sec.count("label:") >= 10, lab
        assert sec.count("scenario:") >= 10, lab


def test_each_analysis_lab_has_twelve_plot_modes_in_registry():
    for lab in LABS:
        sec = section(lab)
        plots = re.search(r"plots:\[(.*?)\]", sec, re.S)
        assert plots, lab
        count = plots.group(1).count("'") // 2
        assert count >= 12, f'{lab}: {count}'


def test_required_scientific_plot_names_are_present():
    required = [
        'Kaplan-Meier survival curves', 'Shewhart X-bar / R control chart',
        'Prediction error expansion envelope', 'Component-plus-residual plot',
        'Gerschgorin complex disks', 'Matrix power-iteration convergence vector trace',
        'Ego network radar target', 'Sankey flow diagram'
    ]
    for phrase in required:
        assert phrase in REG


def test_analysis_pages_use_v71_26_token():
    for page in ['statistics.html','fitting.html','linear-algebra.html','networks.html']:
        text = (ROOT / page).read_text(encoding='utf-8')
        assert '?v=71.46.0' in text
        assert '71.25.0' not in text


def test_no_user_facing_proxy_plot_labels_in_analysis_labs():
    for js in ['statistics.js','fitting.js','linalg.js','networks.js']:
        text = (ROOT / 'src' / 'labs' / js).read_text(encoding='utf-8').lower()
        assert 'proxy' not in text
