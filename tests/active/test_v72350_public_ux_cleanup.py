from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def text(name):
    return (ROOT / name).read_text(encoding='utf-8')

def test_home_removes_developer_facing_marketing_noise():
    home = text('index.html')
    forbidden = [
        'real browser core', 'pure numerical cores', 'verified lab adapters',
        'Empty cards are not used', 'permanent honesty label',
        'Act 1', 'Act 2', 'Act 3', 'Act 4', 'Act 5',
        'Computed on page load'
    ]
    for phrase in forbidden:
        assert phrase not in home

def test_thermoplants_uses_graphical_abstract():
    home = text('index.html')
    assert 'assets/research/photosynthesis/thermoplants-graphical-abstract.png' in home
    assert (ROOT / 'assets/research/photosynthesis/thermoplants-graphical-abstract.png').exists()

def test_scientific_images_are_not_fill_cropped():
    home_css = text('styles/v72-public-shell.css')
    atlas_css = text('styles/v72-atlas.css')
    assert '.home-research-card-figure img' in home_css
    assert 'object-fit:contain' in home_css.replace(' ', '')
    assert '.v72-atlas-media img' in atlas_css
    assert 'object-fit:contain' in atlas_css.replace(' ', '')

def test_workbench_public_copy_avoids_implementation_architecture():
    page = text('workbench.html')
    assert 'same pure numerical cores' not in page
    assert 'does not maintain a second ODE solver' not in page
    assert 'Empty cards are not used' not in page
    assert 'Compare analyses in one workspace.' in page

def test_new_release_and_port():
    assert '72.48.0' in text('VERSION.json')
    assert '8102' in text('package.json')
    assert 'PORT=8102' in text('test-v72.48.0-local.sh')
