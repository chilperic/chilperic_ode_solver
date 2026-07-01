from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel):
    return (ROOT / rel).read_text(encoding='utf-8')


def test_v48_public_pages_do_not_expose_internal_architecture_noise():
    public = '\n'.join(read(p) for p in ['index.html','docs.html','tutorial.html','platform.html','research.html','beauty.html','contact.html'])
    forbidden = [
        'noisy museum',
        'Teaching and benchmark models only',
        'One Workbench layer',
        'One Legacy layer',
        'as a fourth research project',
        'Platform engineering moved out of Research Hub',
        'Computational biologist and applied mathematician building browser-native scientific modeling tools',
    ]
    for phrase in forbidden:
        assert phrase not in public


def test_v48_workbench_dropdown_is_model_symbolic_agent_atlas_only():
    html = read('index.html')
    panel = html.split('data-nav-menu="workbench"', 1)[1].split('</details>', 1)[0]
    for label in ['Model','Symbolic','Agent','Model Atlas']:
        assert f'<b>{label}</b>' in panel
    for legacy in ['ODE','Optimization','Steady-State','Stochastic']:
        assert f'<b>{legacy}</b>' not in panel


def test_v48_legacy_dropdown_remains_specialist_shortcut():
    html = read('index.html')
    panel = html.split('data-nav-menu="legacy"', 1)[1].split('</details>', 1)[0]
    for label in ['ODE','Optimization','Steady-State','Stochastic']:
        assert f'<b>{label}</b>' in panel


def test_v48_identity_color_tokens_and_action_consistency_exist():
    css = read('styles/style.css') + read('styles/model-workbench-v3.css')
    for token in ['--foko-teal', '--foko-cyan', '--foko-magenta', '--foko-action-gradient']:
        assert token in css
    assert 'a.primary,a.secondary,.primary,.secondary,.big-cta,.open-link,.doc-actions a' in css
    assert 'max-width:100%;overflow-x:hidden' in css
