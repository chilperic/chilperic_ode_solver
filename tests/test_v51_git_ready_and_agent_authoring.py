from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def text(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def test_agent_initial_conditions_are_exposed_in_ui():
    html = text('agent.html')
    assert 'agentInitialGrid' in html
    assert 'Initial conditions' in html
    assert 'density seed' in html


def test_agent_initial_conditions_are_used_by_reset_logic():
    js = text('src/agent-lab.js')
    assert 'function populateInitialConditions' in js
    assert 'function initialFractions' in js
    assert 'pickInitialState(rand,fractions)' in js
    assert "initial:{1:32,2:3,3:0}" in js
    assert 'initialFractions:initialFractions()' in js


def test_agent_custom_model_preserves_initial_distribution():
    js = text('src/agent-lab.js')
    assert 'initial:cfg.initial||null' in js
    assert 'cfg.initialFractions' in js
    # The download filename is now constructed from the FOKO_BUILD constant
    # (single source of truth) rather than a hard-coded literal. Assert the
    # construction and that the build resolves to the current version.
    assert "'foko-agent-model-'+FOKO_BUILD+'.json'" in js
    assert "FOKO_BUILD='v60'" in js.replace(" ", "")


def test_git_ready_noise_removed_from_root():
    noisy_patterns = [
        'UX-AUDIT-v43.md',
        'UX-AUDIT-v50.md',
        'RELEASE-NOTES-v42-stability-tests.md',
        'RELEASE-NOTES-v50-symbolic-evaluation-result.md',
        'LEGACY_CORE_SHA256_MANIFEST.txt',
    ]
    root_names = {p.name for p in ROOT.iterdir()}
    for name in noisy_patterns:
        assert name not in root_names


def test_gitignore_exists_for_generated_local_artifacts():
    gitignore = text('.gitignore')
    for pattern in ['.venv/', '.pytest_cache/', 'node_modules/', '*.zip']:
        assert pattern in gitignore


def test_readme_states_custom_model_support_across_labs():
    readme = text('README.md')
    for phrase in [
        'ODE Lab: editable equations',
        'Optimization Lab: editable variables',
        'Steady-State Lab: editable variables',
        'Stochastic Lab: editable JSON schema',
        'Symbolic Lab: editable expressions',
        'Agent Lab: editable parameters, initial state distribution',
    ]:
        assert phrase in readme
