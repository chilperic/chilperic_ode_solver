
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCIENCE=['statistics.js','linalg.js','fitting.js','networks.js','ml-lite.js','sindy.js','inverse.js','surrogate.js','dynamical-fitting.js','continuation-analysis.js','basin-analysis.js','stochastic-advanced.js']

def test_science_files_have_core_boundary():
    for name in SCIENCE:
        assert (ROOT/'src/core'/name).exists(), f'{name} must live under src/core/'
    assert (ROOT/'src/core/index.js').exists()

def test_html_loads_core_science_not_old_paths():
    text='\n'.join(p.read_text(encoding='utf-8') for p in ROOT.glob('*.html'))
    for name in SCIENCE[:5]:
        assert f'src/{name}?v=' not in text, f'HTML should not load old src/{name}'

def test_shell_exists_and_is_not_page_specific():
    shell=(ROOT/'src/platform/shell.js').read_text(encoding='utf-8')
    assert 'registerLab' in shell and 'mount' in shell
    assert 'statistics.html' not in shell and 'workbench.html' not in shell

def test_legacy_wording_removed_from_nav():
    text='\n'.join(p.read_text(encoding='utf-8') for p in ROOT.glob('*.html'))
    assert 'ODE + Parametric ODE' in text
    assert 'Standalone ODE Lab' not in text
    assert 'Modeling workspaces' in text
