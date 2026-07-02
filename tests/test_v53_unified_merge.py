from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_release_tree_is_git_ready_no_runtime_cache_or_dev_notes():
    assert not (ROOT / '.pytest_cache').exists()
    assert '__pycache__/' in (ROOT / '.gitignore').read_text(encoding='utf-8')
    assert not (ROOT / 'dev').exists()
    assert (ROOT / '.gitignore').exists()


def test_agent_import_accepts_runtime_fraction_or_slider_percent_parameters():
    js = read('src/agent-lab.js')
    assert 'function sliderPercentFromParameter' in js
    assert 'n<=1 ? n*100 : n' in js
    assert 'clamp(sliderPercentFromParameter(cfg.parameters.A),0,100)' in js
    assert 'clamp(sliderPercentFromParameter(cfg.parameters.D),0,100)' in js


def test_agent_parameter_and_initial_condition_changes_mark_run_stale():
    js = read('src/agent-lab.js')
    assert "markStale(); status('Reset needed.'" in js
    assert 'function clearStale' in js and "draw(); metrics(); clearStale(); status('Reset.')" in js


def test_agent_ui_supports_absolute_initial_population():
    html = read('agent.html')
    assert 'initial population' in html.lower()
    assert 'agentInitialCount' in html


def test_agent_and_symbolic_dark_theme_surfaces_use_theme_variables():
    for rel in ['styles/agent-lab.css', 'styles/symbolic-beauty.css']:
        css = read(rel)
        assert 'background:#fff' not in css
        assert 'background:rgba(255,255,255' not in css
        assert '#f8fafc' not in css
        assert 'var(--panel)' in css
        assert 'var(--panel2)' in css


def test_lab_specific_css_does_not_assign_primary_by_child_position():
    agent_css = read('styles/agent-lab.css')
    symbolic_css = read('styles/symbolic-beauty.css')
    assert not re.search(r'agent-buttons[^{}]*first-child[^{}]*background', agent_css)
    assert not re.search(r'symbolic-buttons[^{}]*first-child[^{}]*background', symbolic_css)
    assert not re.search(r'agent-buttons[^{}]*nth-child\(n\+2\)[^{}]*background', agent_css)


def test_optimization_budget_warning_exists_in_both_optimization_surfaces():
    for rel in ['src/app.js', 'src/optimization-lab.js']:
        js = read(rel)
        assert 'budget>50000' in js
        assert 'large browser budget' in js
        assert 'Reduce samples/population' in js


def test_v53_cache_tokens_are_intentional_and_no_stale_v51_agent_export():
    assert 'foko-agent-model-v54.json' in read('src/agent-lab.js')
    html = read('agent.html')
    assert 'src/agent-lab.js?v=v54' in html
    assert 'src/navigation.js?v=53' in html
    sym = read('symbolic.html')
    assert ('src/symbolic-lab.js?v=54' in sym) or ('src/symbolic-lab.js?v=58' in sym) or ('src/symbolic-lab.js?v=59' in sym) or ('src/symbolic-lab.js?v=60' in sym)
    assert 'src/navigation.js?v=53' in sym
