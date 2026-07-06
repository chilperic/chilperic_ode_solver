from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return (ROOT / name).read_text(encoding='utf-8')

def test_v70_3_docs_are_workbench_first_and_cover_modeling_pillars():
    docs = read('docs.html')
    for token in ['Documentation', 'ODE Lab', 'Optimization Lab', 'Steady-State Lab', 'Stochastic Lab', 'Symbolic Lab', 'Agent Lab', 'SciML Lab', 'Custom models', 'Plot standard']:
        assert token in docs
    assert 'agent-rule-worker.js' in docs
    assert 'multilayer spatial/social/transport contacts' in docs.lower()


def test_v70_3_workbench_optimization_exposes_method_bounds_and_budget_controls():
    js = read('src/model-workbench-v3.js')
    for token in ['mwOptMethod', 'Gradient-based / numerical', 'simulated_annealing', 'particle_swarm', 'genetic', 'initial guess', 'data-opt-bound', 'data-opt-param', 'population / starts', 'tolerance']:
        assert token in js
    assert "toast('Model workbench RC ready')" not in js


def test_v70_3_css_fixes_dark_docs_plot_toolbar_and_optimization_editor():
    css = read('styles/style.css')
    for token in ['v70.4 technical consolidation', "body[data-lab='docs']", '.plot-toolbar-v2', '.mw-opt-method-grid', '.mw-opt-editor-table']:
        assert token in css


def test_v70_3_release_token_is_consistent_for_local_assets():
    for path in ROOT.glob('*.html'):
        html = path.read_text(encoding='utf-8')
        assert '?v=71.46.0' in html
        for old in ['70.13.0','70.19.0','70.11.0','70.10.0','70.15.0','2.7.5','3.2.0']:
            assert ('?v=' + old) not in html
